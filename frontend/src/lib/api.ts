/**
 * Shared API fetch utility for ISMS Compass frontend.
 * Handles Authorization headers, 401 auto-refresh, and error normalisation.
 * All API calls in the app should go through apiFetch — never use raw fetch().
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/** Polyfill-safe timeout signal — works on Android Chrome < 124 */
function makeTimeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/** Attempt a silent token refresh using the stored refresh token. */
async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem('isms_refresh_token');
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
      signal: makeTimeoutSignal(10_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { access_token: string };
    localStorage.setItem('isms_access_token', data.access_token);
    return data.access_token;
  } catch {
    return null;
  }
}

function buildHeaders(token: string | null, extra?: HeadersInit): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  };
}

/**
 * Make an authenticated request to the ISMS Compass backend.
 * Automatically retries once after a silent token refresh on 401.
 * Redirects to login and clears storage if refresh also fails.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 30_000,
): Promise<T> {
  let token = localStorage.getItem('isms_access_token');

  const doRequest = (t: string | null) =>
    fetch(`${API_BASE}${path}`, {
      ...options,
      headers: buildHeaders(t, options.headers as HeadersInit),
      signal: makeTimeoutSignal(timeoutMs),
    });

  let res = await doRequest(token);

  // On 401 try a silent refresh once, then retry
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      token = newToken;
      res = await doRequest(token);
    } else {
      localStorage.clear();
      window.location.href = '/';
      throw new Error('Session expired. Please log in again.');
    }
  }

  // 204 No Content — return undefined
  if (res.status === 204) return undefined as unknown as T;

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, string>;
    throw new Error(body.error || `Request failed: HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}
