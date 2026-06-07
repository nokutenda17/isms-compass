/**
 * useAIEngine — routes AI prompts through backend streaming endpoint.
 * The backend handles Gemini -> Ollama routing, caching, and context injection.
 * Falls back to direct Ollama if the backend is unreachable (offline mode).
 */
import { useState } from 'react';

type AIEngine = 'ollama' | 'gemini' | 'cache' | 'unavailable';
type AIEnginePreference = 'ollama' | 'gemini';
type SendPromptOptions = {
  onToken?: (token: string, fullText: string) => void;
};

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'qwen2.5:1.5b';
const OLLAMA_NUM_PREDICT = Number(import.meta.env.VITE_OLLAMA_NUM_PREDICT) || 2048;
/** Match backend: do not reuse truncated AI stubs from IndexedDB */
const MIN_ELIGIBLE_AI_CACHE_CHARS = 320;
const BACKEND_TIMEOUT_MS = 90000;
const OLLAMA_TIMEOUT_MS = 45000;

// ── IndexedDB client-side cache (offline fallback) ───────────────────────────
class FrontendAICache {
  private dbName = 'isms_compass_ai';
  private storeName = 'ai_cache';
  private db: IDBDatabase | null = null;
  private TTL_DAYS = 7;

  async init() {
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => { this.db = req.result; resolve(); };
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  key(prompt: string, context: object): string {
    // Avoid collisions from truncated base64 prefixes by using the full payload.
    // IndexedDB keys can safely store this string length.
    return `${prompt}::${JSON.stringify(context)}`;
  }

  async get(key: string): Promise<string | null> {
    if (!this.db) { try { await this.init(); } catch { return null; } }
    return new Promise((resolve) => {
      const tx = this.db!.transaction([this.storeName], 'readonly');
      const req = tx.objectStore(this.storeName).get(key);
      req.onsuccess = () => {
        const data = req.result;
        if (!data) return resolve(null);
        const ageDays = (Date.now() - data.ts) / 86400000;
        if (ageDays > this.TTL_DAYS) return resolve(null);
        const text = (data.response as string) || '';
        resolve(text.trim().length >= MIN_ELIGIBLE_AI_CACHE_CHARS ? text : null);
      };
      req.onerror = () => resolve(null);
    });
  }

  async set(key: string, response: string): Promise<void> {
    if (!this.db) { try { await this.init(); } catch { return; } }
    return new Promise((resolve) => {
      const tx = this.db!.transaction([this.storeName], 'readwrite');
      tx.objectStore(this.storeName).put({ response, ts: Date.now() }, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }
}

const frontendCache = new FrontendAICache();

async function streamOllamaResponse(
  res: Response,
  onToken?: (token: string, fullText: string) => void
): Promise<string> {
  if (!res.body) {
    const data = await res.json().catch(() => ({} as { response?: string }));
    return data.response || '';
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed) as { response?: string; done?: boolean };
        const token = parsed.response || '';
        if (token) {
          fullText += token;
          onToken?.(token, fullText);
        }
      } catch {
        // Ignore malformed chunks and continue processing.
      }
    }
  }

  const finalLine = buffer.trim();
  if (finalLine) {
    try {
      const parsed = JSON.parse(finalLine) as { response?: string };
      const token = parsed.response || '';
      if (token) {
        fullText += token;
        onToken?.(token, fullText);
      }
    } catch {
      // Ignore trailing malformed chunk.
    }
  }

  return fullText;
}

async function streamBackendSSE(
  res: Response,
  onToken?: (token: string, fullText: string) => void
): Promise<{ text: string; engine: AIEngine }> {
  if (!res.body) {
    return { text: '', engine: 'unavailable' };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let engine: AIEngine = 'unavailable';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let eventSepIdx = buffer.indexOf('\n\n');
    while (eventSepIdx !== -1) {
      const eventBlock = buffer.slice(0, eventSepIdx).trim();
      buffer = buffer.slice(eventSepIdx + 2);

      const dataLine = eventBlock
        .split('\n')
        .find((line) => line.startsWith('data:'));
      if (dataLine) {
        try {
          const payload = JSON.parse(dataLine.slice(5).trim()) as {
            token?: string;
            done?: boolean;
            engine?: AIEngine;
          };
          const token = payload.token || '';
          if (token) {
            fullText += token;
            onToken?.(token, fullText);
          }
          if (payload.engine) {
            engine = payload.engine;
          }
        } catch {
          // Ignore malformed SSE payloads and continue.
        }
      }

      eventSepIdx = buffer.indexOf('\n\n');
    }
  }

  return { text: fullText, engine };
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useAIEngine() {
  const [isLoading, setIsLoading] = useState(false);
  const [engine, setEngineState] = useState<AIEngine>('ollama');
  const [preferCloud, setPreferCloud] = useState(false);
  const [preferredEngine, setPreferredEngine] = useState<AIEnginePreference>('ollama');

  const setEngine = (next: AIEnginePreference) => {
    setPreferredEngine(next);
    setPreferCloud(next === 'gemini');
  };

  const sendPrompt = async (
    prompt: string,
    context: object = {},
    options: SendPromptOptions = {}
  ): Promise<string> => {
    setIsLoading(true);

    try {
      // 1. Check frontend IndexedDB cache first (works offline)
      const cacheKey = frontendCache.key(prompt, context);
      const cached = await frontendCache.get(cacheKey);
      if (cached && cached.trim().length >= MIN_ELIGIBLE_AI_CACHE_CHARS) {
        setEngineState('cache');
        options.onToken?.(cached, cached);
        return cached;
      }

      // 2. Try backend streaming API (cache -> gemini -> ollama)
      const token = localStorage.getItem('isms_access_token');
      if (token && navigator.onLine) {
        try {
          const res = await fetch(`${API_BASE}/ai/stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ prompt, context, preferCloud: preferredEngine === 'gemini' }),
            signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
          });

          if (res.ok) {
            const { text: response, engine: usedEngine } = await streamBackendSSE(res, options.onToken);
            setEngineState(usedEngine);
            // Cache in IndexedDB for offline use
            if (response && usedEngine !== 'unavailable' && response.trim().length >= MIN_ELIGIBLE_AI_CACHE_CHARS) {
              await frontendCache.set(cacheKey, response);
            }
            return response;
          }
        } catch (backendErr) {
          if (backendErr instanceof DOMException && backendErr.name === 'TimeoutError') {
            console.warn(`Backend AI timed out after ${BACKEND_TIMEOUT_MS}ms, trying direct Ollama…`);
          } else {
            console.warn('Backend AI unavailable, trying direct Ollama…', backendErr);
          }
        }
      }

      // 3. Direct Ollama fallback (when backend is down but Ollama is local)
      if (navigator.onLine) {
        try {
          const res = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: OLLAMA_MODEL,
              prompt: `You are an ISO 27001 compliance advisor for Zimbabwean SMEs.\n\nContext: ${JSON.stringify(context)}\n\nUser: ${prompt}\n\nAssistant:`,
              stream: true,
              options: {
                num_predict: OLLAMA_NUM_PREDICT,
                temperature: 0.7,
              },
            }),
            signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
          });
          if (res.ok) {
            const response = await streamOllamaResponse(res, options.onToken);
            setEngineState('ollama');
            if (response.trim().length >= MIN_ELIGIBLE_AI_CACHE_CHARS) {
              await frontendCache.set(cacheKey, response);
            }
            return response;
          }
        } catch (ollamaErr) {
          if (ollamaErr instanceof DOMException && ollamaErr.name === 'TimeoutError') {
            console.warn(`Direct Ollama timed out after ${OLLAMA_TIMEOUT_MS}ms:`, ollamaErr);
          } else {
            console.warn('Direct Ollama also unavailable:', ollamaErr);
          }
        }
      }

      // 4. All engines unavailable
      setEngineState('unavailable');
      return 'AI is currently unavailable — both Gemini and Ollama could not be reached. You can still complete this step manually by filling in the form fields directly.';

    } catch (err) {
      console.error('useAIEngine error:', err);
      return 'An unexpected error occurred. Please try again.';
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendPrompt,
    isLoading,
    engine,
    setEngine,
    preferCloud,
    setPreferCloud,
  };
}
