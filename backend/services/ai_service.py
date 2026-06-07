"""
AI Service — routes prompts to Gemini first, then Ollama fallback.
Implements response caching keyed by SHA-256 hash of (prompt + org_context).
"""
import hashlib
import json
import os
import uuid
from datetime import datetime, timezone, timedelta

import logging
import requests
try:
    import google.generativeai as genai
except Exception:  # pragma: no cover - handled by runtime fallback to Ollama
    genai = None

from models import get_db

logger = logging.getLogger(__name__)

OLLAMA_URL = os.environ.get('OLLAMA_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'qwen2.5:7b')
# Ollama defaults num_predict to ~128 without this — SoA drafts stop after a title.
OLLAMA_NUM_PREDICT = int(os.environ.get('OLLAMA_NUM_PREDICT', '2048'))
OLLAMA_TEMPERATURE = float(os.environ.get('OLLAMA_TEMPERATURE', '0.7'))
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
CACHE_TTL_DAYS = 7

SYSTEM_PROMPT_TEMPLATE = """You are an ISO 27001 compliance advisor with deep expertise in helping 
Zimbabwean SMEs achieve certification. The user is working on their ISMS implementation.

Organisation context:
- Name: {org_name}
- Sector: {sector}  
- Size: {size} employees
- City: {city}, Zimbabwe
- Risk appetite: {risk_appetite}
- ISMS progress: Steps {completed_steps} completed

Applicable data protection law: Zimbabwe Cyber and Data Protection Act (Chapter 12:07).

Always:
- Use plain language suitable for non-technical business owners
- Reference Zimbabwe-specific context where relevant (Cyber & Data Protection Act Chapter 12:07, local examples)
- Keep all output concise and actionable
- Start with exactly one short line: "DRAFT — human review required." Then immediately provide substantive content for the user's request. Do not pad the answer with repeated disclaimers, legal boilerplate, or placeholder dashes; the first line is the only disclaimer.
- Do not use Markdown (no ### headings, no **bold**); use plain paragraphs so the text is readable in simple form fields.
- For Statement of Applicability / Annex A justifications: answer with (1) applicability to this organisation and scope, (2) how the control is addressed or will be, (3) concrete evidence or artefacts to collect, (4) brief implementation or maintenance notes where useful.
- Suggest affordable, locally available control implementations
- When discussing control costs, use USD denomination

For Step 4 (Risk Assessment), include load shedding (power outages of 8-12 hours daily) as a key availability threat to all digital assets."""


def ollama_options() -> dict:
    """Options passed to Ollama /api/generate so responses are not truncated at ~128 tokens."""
    return {'num_predict': OLLAMA_NUM_PREDICT, 'temperature': OLLAMA_TEMPERATURE}


def is_eligible_for_ai_cache(response_text: str) -> bool:
    """Do not cache truncated or stub outputs (common when num_predict was too low)."""
    return len((response_text or '').strip()) >= 320


def _hash_prompt(prompt: str, org_context: dict) -> tuple[str, str]:
    prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()[:32]
    ctx_hash = hashlib.sha256(json.dumps(org_context, sort_keys=True).encode()).hexdigest()[:16]
    return prompt_hash, ctx_hash


def _get_cached(prompt_hash: str, ctx_hash: str) -> str | None:
    conn = get_db()
    try:
        row = conn.execute(
            """SELECT response_text FROM ai_response_cache
               WHERE prompt_hash = ? AND org_context_hash = ?
               AND expires_at > ?""",
            (prompt_hash, ctx_hash, datetime.now(timezone.utc).isoformat())
        ).fetchone()
        if not row:
            return None
        text = row['response_text'] or ''
        if not is_eligible_for_ai_cache(text):
            return None
        return text
    finally:
        conn.close()


def _cache_response(prompt_hash: str, ctx_hash: str, response: str, engine: str, tokens: int = 0):
    conn = get_db()
    try:
        expires_at = (datetime.now(timezone.utc) + timedelta(days=CACHE_TTL_DAYS)).isoformat()
        conn.execute(
            """INSERT OR REPLACE INTO ai_response_cache
               (cache_id, prompt_hash, org_context_hash, response_text, engine, tokens_used, created_at, expires_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (str(uuid.uuid4()), prompt_hash, ctx_hash, response, engine,
             tokens, datetime.now(timezone.utc).isoformat(), expires_at)
        )
        conn.commit()
    finally:
        conn.close()


def _call_ollama(system_prompt: str, user_prompt: str) -> str:
    payload = {
        'model': OLLAMA_MODEL,
        'prompt': f"{system_prompt}\n\nUser: {user_prompt}\n\nAssistant:",
        'stream': False,
        'options': ollama_options(),
    }
    resp = requests.post(f"{OLLAMA_URL}/api/generate", json=payload, timeout=60)
    resp.raise_for_status()
    return resp.json().get('response', '')


def _call_gemini(system_prompt: str, user_prompt: str) -> str:
    if not GEMINI_API_KEY:
        raise ValueError("No Gemini API key configured")
    if genai is None:
        raise RuntimeError("google-generativeai package is not installed")

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        system_instruction=system_prompt
    )
    response = model.generate_content(
        user_prompt,
        generation_config=genai.GenerationConfig(
            max_output_tokens=1200,
            temperature=0.7,
        )
    )
    return response.text or ''


def send_prompt(user_prompt: str, org_context: dict, prefer_cloud: bool = False) -> dict:
    """
    Route a prompt to the appropriate AI engine.
    Returns: {response, engine, cached}
    """
    prompt_hash, ctx_hash = _hash_prompt(user_prompt, org_context)

    # Check cache first
    cached = _get_cached(prompt_hash, ctx_hash)
    if cached:
        return {'response': cached, 'engine': 'cache', 'cached': True}

    # Build system prompt
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        org_name=org_context.get('org_name', 'Unknown'),
        sector=org_context.get('sector', 'General'),
        size=org_context.get('size', 'Unknown'),
        city=org_context.get('city', 'Harare'),
        risk_appetite=org_context.get('risk_appetite', 'Standard'),
        completed_steps=org_context.get('completed_steps', 'none'),
    )

    response_text = ''
    engine = 'unavailable'
    tokens = 0

    # Try Gemini first (cloud-default, hardware-independent)
    if GEMINI_API_KEY:
        try:
            response_text = _call_gemini(system_prompt, user_prompt)
            engine = 'gemini'
        except Exception as e:
            logger.warning("Gemini inference failed, falling back to Ollama: %s", e)
            response_text = ''

    # Fall back to Ollama if Gemini failed/unavailable
    if not response_text:
        try:
            response_text = _call_ollama(system_prompt, user_prompt)
            engine = 'ollama'
        except Exception as e:
            logger.warning("Ollama inference failed: %s", e)
            response_text = ''

    if not response_text:
        response_text = (
            "AI is currently unavailable — both Gemini and Ollama could not be reached. "
            "Please complete this step manually."
        )
        engine = 'unavailable'

    # Cache successful responses (skip stubs / truncation)
    if engine not in ('unavailable', 'cache') and is_eligible_for_ai_cache(response_text):
        _cache_response(prompt_hash, ctx_hash, response_text, engine, tokens)

    return {'response': response_text, 'engine': engine, 'cached': False}
