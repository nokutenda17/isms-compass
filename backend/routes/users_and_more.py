import uuid
import json
import logging
import requests
from flask import Blueprint, request, jsonify, g, Response, stream_with_context
from models import get_db
from services.auth_service import (
    jwt_required, roles_required, now_iso,
    hash_password, generate_invite_code
)
from services.email_service import send_invite_email
from services import audit_helper
from datetime import datetime, timezone, timedelta

users_bp = Blueprint('users', __name__)
audit_log_bp = Blueprint('audit_log', __name__)
notifications_bp = Blueprint('notifications', __name__)
ai_bp = Blueprint('ai', __name__)
logger = logging.getLogger(__name__)

# ── Users ─────────────────────────────────────────────────────────────────────

@users_bp.route('/users', methods=['GET'])
@jwt_required
@roles_required('ISMS_Owner')
def list_users():
    conn = get_db()
    try:
        rows = conn.execute(
            """SELECT user_id, name, email, role, is_active, created_at, last_login
               FROM users WHERE org_id=? ORDER BY name""",
            (g.org_id,)
        ).fetchall()
        return jsonify([dict(r) for r in rows]), 200
    finally:
        conn.close()


@users_bp.route('/users/invite', methods=['POST'])
@jwt_required
@roles_required('ISMS_Owner')
def invite_user():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    role = data.get('role', 'Contributor')

    if not email:
        return jsonify({'error': 'Email is required'}), 400
    if role not in ('ISMS_Owner', 'Contributor', 'Reviewer', 'Auditor'):
        return jsonify({'error': 'Invalid role'}), 400

    conn = get_db()
    try:
        # Only one ISMS_Owner allowed
        if role == 'ISMS_Owner':
            existing_owner = conn.execute(
                "SELECT user_id FROM users WHERE org_id=? AND role='ISMS_Owner' AND is_active=1",
                (g.org_id,)
            ).fetchone()
            if existing_owner:
                return jsonify({'error': 'An ISMS Owner already exists for this organisation'}), 400

        # Check for duplicate email
        existing = conn.execute(
            "SELECT user_id FROM users WHERE email=?", (email,)
        ).fetchone()
        if existing:
            return jsonify({'error': 'A user with this email already exists'}), 400

        invite_code = generate_invite_code(8)
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=48)).isoformat()
        user_id = str(uuid.uuid4())
        temp_password = hash_password(invite_code)  # Invite code IS the temp password

        conn.execute(
            """INSERT INTO users
               (user_id, org_id, name, email, password_hash, role,
                is_active, created_at, invite_code, invite_expires_at)
               VALUES (?,?,?,?,?,?,0,?,?,?)""",
            (user_id, g.org_id,
             data.get('name', email.split('@')[0]),
             email, temp_password, role,
             now_iso(), invite_code, expires_at)
        )
        conn.commit()

        org = conn.execute("SELECT name FROM organisations WHERE org_id=?", (g.org_id,)).fetchone()
        inviter = conn.execute("SELECT name FROM users WHERE user_id=?", (g.user_id,)).fetchone()
        send_invite_email(
            to_email=email,
            to_name=data.get('name', email.split('@')[0]),
            org_name=org['name'] if org else 'your organisation',
            invite_code=invite_code,
            invited_by_name=inviter['name'] if inviter else 'ISMS Owner',
            role=role,
        )

        audit_helper.log(g.org_id, g.user_id, '', g.role,
                         'USER_INVITED',
                         f"User invited: {email} as {role}",
                         'user', user_id)

        return jsonify({
            'user_id': user_id,
            'invite_code': invite_code,
            'expires_at': expires_at,
            'message': f'Invite code generated. Share this code with {email}: {invite_code}',
        }), 201
    finally:
        conn.close()


@users_bp.route('/users/<user_id>/role', methods=['PATCH'])
@jwt_required
@roles_required('ISMS_Owner')
def change_role(user_id):
    data = request.get_json() or {}
    new_role = data.get('role', '')

    if new_role not in ('ISMS_Owner', 'Contributor', 'Reviewer', 'Auditor'):
        return jsonify({'error': 'Invalid role'}), 400

    conn = get_db()
    try:
        user = conn.execute(
            "SELECT * FROM users WHERE user_id=? AND org_id=?",
            (user_id, g.org_id)
        ).fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        old_role = user['role']
        conn.execute(
            "UPDATE users SET role=? WHERE user_id=? AND org_id=?",
            (new_role, user_id, g.org_id)
        )
        conn.commit()

        audit_helper.log(g.org_id, g.user_id, '', g.role,
                         'ROLE_CHANGE',
                         f"Role changed: {user['name']} from {old_role} to {new_role}",
                         'user', user_id,
                         old_value=old_role, new_value=new_role)

        return jsonify({'updated': True, 'old_role': old_role, 'new_role': new_role}), 200
    finally:
        conn.close()


@users_bp.route('/users/<user_id>/deactivate', methods=['PATCH'])
@jwt_required
@roles_required('ISMS_Owner')
def deactivate_user(user_id):
    if user_id == g.user_id:
        return jsonify({'error': 'You cannot deactivate your own account'}), 400

    conn = get_db()
    try:
        user = conn.execute(
            "SELECT * FROM users WHERE user_id=? AND org_id=?",
            (user_id, g.org_id)
        ).fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Can't deactivate the only owner
        if user['role'] == 'ISMS_Owner':
            owner_count = conn.execute(
                "SELECT COUNT(*) as c FROM users WHERE org_id=? AND role='ISMS_Owner' AND is_active=1",
                (g.org_id,)
            ).fetchone()['c']
            if owner_count <= 1:
                return jsonify({'error': 'Cannot deactivate the only ISMS Owner'}), 400

        conn.execute(
            "UPDATE users SET is_active=0 WHERE user_id=? AND org_id=?",
            (user_id, g.org_id)
        )
        conn.commit()

        audit_helper.log(g.org_id, g.user_id, '', g.role,
                         'USER_DEACTIVATED',
                         f"User deactivated: {user['name']} ({user['email']})",
                         'user', user_id)

        return jsonify({'deactivated': True}), 200
    finally:
        conn.close()


# ── Audit Log ─────────────────────────────────────────────────────────────────

@audit_log_bp.route('/audit-log', methods=['GET'])
@jwt_required
def get_audit_log():
    if g.role not in ('ISMS_Owner', 'Auditor'):
        return jsonify({'error': 'Access denied'}), 403

    conn = get_db()
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        search = request.args.get('search', '')
        action_filter = request.args.get('action', '')
        actor_filter = request.args.get('actor', '')
        offset = (page - 1) * per_page

        query = "SELECT * FROM audit_log WHERE org_id=?"
        params = [g.org_id]
        if search:
            query += " AND (description LIKE ? OR user_name LIKE ?)"
            params.extend([f'%{search}%', f'%{search}%'])
        if action_filter:
            query += " AND action=?"
            params.append(action_filter)
        if actor_filter:
            query += " AND user_name=?"
            params.append(actor_filter)

        total = conn.execute(
            query.replace("SELECT *", "SELECT COUNT(*) as c"), params
        ).fetchone()['c']

        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        params.extend([per_page, offset])

        rows = conn.execute(query, params).fetchall()
        return jsonify({
            'logs': [dict(r) for r in rows],
            'total': total,
            'page': page,
        }), 200
    finally:
        conn.close()


# ── Notifications ─────────────────────────────────────────────────────────────

@notifications_bp.route('/notifications', methods=['GET'])
@jwt_required
def get_notifications():
    conn = get_db()
    try:
        rows = conn.execute(
            """SELECT * FROM notifications
               WHERE org_id=? AND (user_id=? OR user_id IS NULL)
               ORDER BY created_at DESC LIMIT 20""",
            (g.org_id, g.user_id)
        ).fetchall()
        return jsonify([dict(r) for r in rows]), 200
    finally:
        conn.close()


@notifications_bp.route('/notifications/read', methods=['PATCH'])
@jwt_required
def mark_read():
    conn = get_db()
    try:
        conn.execute(
            """UPDATE notifications SET read_at=?
               WHERE org_id=? AND user_id=? AND read_at IS NULL""",
            (now_iso(), g.org_id, g.user_id)
        )
        conn.commit()
        return jsonify({'marked_read': True}), 200
    finally:
        conn.close()


# ── AI Prompt endpoint ────────────────────────────────────────────────────────

def _enrich_ai_context(context: dict) -> dict:
    """Attach org profile and completed steps used by AI prompts."""
    conn = get_db()
    try:
        org = conn.execute(
            "SELECT * FROM organisations WHERE org_id=?", (g.org_id,)
        ).fetchone()
        if org:
            context.update({
                'org_name': org['name'],
                'sector': org['sector'],
                'size': org['size'],
                'city': org['city'],
                'risk_appetite': org['risk_appetite'],
            })

        steps_done = conn.execute(
            "SELECT step_number FROM isms_sessions WHERE org_id=? AND status='Complete'",
            (g.org_id,)
        ).fetchall()
        context['completed_steps'] = [r['step_number'] for r in steps_done]
        return context
    finally:
        conn.close()

@ai_bp.route('/ai/prompt', methods=['POST'])
@jwt_required
def ai_prompt():
    from services.ai_service import send_prompt
    data = request.get_json() or {}
    prompt = data.get('prompt', '')
    context = data.get('context', {})
    prefer_cloud = data.get('preferCloud', False)

    if not prompt:
        return jsonify({'error': 'prompt is required'}), 400

    context = _enrich_ai_context(context)

    result = send_prompt(prompt, context, prefer_cloud)
    return jsonify(result), 200


@ai_bp.route('/ai/stream', methods=['POST'])
@jwt_required
def ai_stream():
    from services import ai_service

    data = request.get_json() or {}
    prompt = data.get('prompt', '')
    context = _enrich_ai_context(data.get('context', {}))

    if not prompt:
        return jsonify({'error': 'prompt is required'}), 400

    prompt_hash, ctx_hash = ai_service._hash_prompt(prompt, context)
    cached = ai_service._get_cached(prompt_hash, ctx_hash)

    system_prompt = ai_service.SYSTEM_PROMPT_TEMPLATE.format(
        org_name=context.get('org_name', 'Unknown'),
        sector=context.get('sector', 'General'),
        size=context.get('size', 'Unknown'),
        city=context.get('city', 'Harare'),
        risk_appetite=context.get('risk_appetite', 'Standard'),
        completed_steps=context.get('completed_steps', 'none'),
    )

    def _sse(payload: dict) -> str:
        return f"data: {json.dumps(payload)}\n\n"

    def stream_cached(cached_text: str):
        yield _sse({'token': cached_text})
        yield _sse({'done': True, 'engine': 'cache', 'cached': True})

    def stream_gemini():
        full_response = []
        try:
            if not ai_service.GEMINI_API_KEY:
                raise ValueError("No Gemini API key configured")
            if ai_service.genai is None:
                raise RuntimeError("google-generativeai package is not installed")

            ai_service.genai.configure(api_key=ai_service.GEMINI_API_KEY)
            model = ai_service.genai.GenerativeModel(
                model_name=ai_service.GEMINI_MODEL,
                system_instruction=system_prompt
            )
            for chunk in model.generate_content(
                prompt,
                generation_config=ai_service.genai.GenerationConfig(
                    max_output_tokens=1200,
                    temperature=0.7,
                ),
                stream=True
            ):
                token = chunk.text or ''
                if token:
                    full_response.append(token)
                    yield _sse({'token': token})

            full_text = ''.join(full_response).strip()
            if not full_text:
                raise RuntimeError("Gemini returned empty response")

            if ai_service.is_eligible_for_ai_cache(full_text):
                ai_service._cache_response(prompt_hash, ctx_hash, full_text, 'gemini')
            yield _sse({'done': True, 'engine': 'gemini', 'cached': False})
            return
        except Exception as e:
            logger.warning("Gemini streaming failed, trying Ollama: %s", e)

        # Fall through to Ollama streaming fallback
        yield from stream_ollama()

    def stream_ollama():
        full_response = []
        payload = {
            'model': ai_service.OLLAMA_MODEL,
            'prompt': f"{system_prompt}\n\nUser: {prompt}\n\nAssistant:",
            'stream': True,
            'options': ai_service.ollama_options(),
        }
        try:
            with requests.post(
                f"{ai_service.OLLAMA_URL}/api/generate",
                json=payload,
                timeout=90,
                stream=True
            ) as resp:
                resp.raise_for_status()
                for line in resp.iter_lines(decode_unicode=True):
                    if not line:
                        continue
                    chunk = json.loads(line)
                    token = chunk.get('response', '')
                    if token:
                        full_response.append(token)
                        yield _sse({'token': token})

            full_text = ''.join(full_response).strip()
            if not full_text:
                raise RuntimeError("Ollama returned empty response")

            if ai_service.is_eligible_for_ai_cache(full_text):
                ai_service._cache_response(prompt_hash, ctx_hash, full_text, 'ollama')
            yield _sse({'done': True, 'engine': 'ollama', 'cached': False})
            return
        except Exception as e:
            logger.warning("Ollama streaming failed: %s", e)

        yield _sse({
            'token': 'AI is currently unavailable. Please complete this step manually.'
        })
        yield _sse({'done': True, 'engine': 'unavailable', 'cached': False})

    if cached:
        generator = stream_cached(cached)
    elif ai_service.GEMINI_API_KEY:
        generator = stream_gemini()
    else:
        generator = stream_ollama()

    return Response(
        stream_with_context(generator),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
        }
    )
