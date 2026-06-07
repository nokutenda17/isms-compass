import hashlib
import re
import secrets
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from time import time

from flask import Blueprint, jsonify, request

from models import get_db
from services import audit_helper
from services.auth_service import hash_password, now_iso
from services.email_service import (
    FRONTEND_URL,
    send_password_changed_email,
    send_password_reset_email,
    send_welcome_email,
)

register_bp = Blueprint('register', __name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PASSWORD_RE = re.compile(r"^(?=.*[A-Z])(?=.*\d).{8,}$")
_forgot_password_attempts: dict[str, list[float]] = defaultdict(list)
_FORGOT_MAX_ATTEMPTS = 3
_FORGOT_WINDOW_SECS = 3600


def _clean_email(raw: str) -> str:
    return (raw or '').strip().lower()


def _password_valid(password: str) -> bool:
    return bool(PASSWORD_RE.match(password or ''))


def _is_valid_email(email: str) -> bool:
    return bool(EMAIL_RE.match(email or ''))


def _parse_iso(value: str):
    if not value:
        return None
    try:
        if value.endswith('Z'):
            value = value.replace('Z', '+00:00')
        parsed = datetime.fromisoformat(value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed
    except ValueError:
        return None


def _seed_isms_sessions(conn, org_id: str):
    for step in range(1, 11):
        status = 'In Progress' if step == 1 else 'Not Started'
        conn.execute(
            """INSERT INTO isms_sessions (session_id, org_id, step_number, status)
               VALUES (?, ?, ?, ?)""",
            (str(uuid.uuid4()), org_id, step, status)
        )


def _forgot_rate_limited(email: str) -> bool:
    now = time()
    _forgot_password_attempts[email] = [
        t for t in _forgot_password_attempts[email]
        if now - t < _FORGOT_WINDOW_SECS
    ]
    if len(_forgot_password_attempts[email]) >= _FORGOT_MAX_ATTEMPTS:
        return True
    _forgot_password_attempts[email].append(now)
    return False


@register_bp.route('/register/check-email', methods=['GET'])
def check_email():
    email = _clean_email(request.args.get('email', ''))
    if not _is_valid_email(email):
        return jsonify({'available': False}), 200

    conn = get_db()
    try:
        existing = conn.execute("SELECT user_id FROM users WHERE email=?", (email,)).fetchone()
        return jsonify({'available': existing is None}), 200
    finally:
        conn.close()


@register_bp.route('/register', methods=['POST'])
def register_organisation():
    data = request.get_json() or {}

    org_name = (data.get('orgName') or '').strip()
    sector = (data.get('sector') or '').strip()
    city = (data.get('city') or '').strip()
    size = (data.get('size') or '').strip()
    owner_name = (data.get('ownerName') or '').strip()
    email = _clean_email(data.get('email'))
    password = data.get('password') or ''
    confirm = data.get('confirmPassword') or ''

    if not all([org_name, sector, city, size, owner_name, email, password, confirm]):
        return jsonify({'error': 'All fields are required'}), 400
    if not _is_valid_email(email):
        return jsonify({'error': 'Please provide a valid email address'}), 400
    if not _password_valid(password):
        return jsonify({'error': 'Password must be at least 8 characters and include an uppercase letter and a number'}), 400
    if password != confirm:
        return jsonify({'error': 'Passwords do not match'}), 400

    conn = get_db()
    try:
        exists = conn.execute("SELECT user_id FROM users WHERE email=?", (email,)).fetchone()
        if exists:
            return jsonify({'error': 'Email is already registered'}), 400

        org_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())
        now = now_iso()

        conn.execute("BEGIN")
        conn.execute(
            """INSERT INTO organisations
               (org_id, name, sector, size, city, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (org_id, org_name, sector, size, city, now)
        )
        conn.execute(
            """INSERT INTO users
               (user_id, org_id, name, email, password_hash, role, is_active, created_at)
               VALUES (?, ?, ?, ?, ?, 'ISMS_Owner', 1, ?)""",
            (user_id, org_id, owner_name, email, hash_password(password), now)
        )
        _seed_isms_sessions(conn, org_id)
        conn.commit()

        send_welcome_email(email, owner_name, org_name)
        audit_helper.log(
            org_id, user_id, owner_name, 'ISMS_Owner',
            'REGISTRATION',
            f"Organisation registered: {org_name}",
            entity_type='organisation',
            entity_id=org_id,
            ip_address=request.remote_addr,
        )

        return jsonify({
            'message': 'Registration successful. Please log in.',
            'user': {
                'id': user_id,
                'name': owner_name,
                'email': email,
                'role': 'ISMS_Owner',
                'orgId': org_id,
                'orgName': org_name,
            }
        }), 201
    except Exception:
        conn.rollback()
        return jsonify({'error': 'Failed to register organisation'}), 500
    finally:
        conn.close()


@register_bp.route('/register/accept-invite', methods=['POST'])
def accept_invite():
    data = request.get_json() or {}
    email = _clean_email(data.get('email'))
    invite_code = (data.get('inviteCode') or '').strip().upper()
    name = (data.get('name') or '').strip()
    password = data.get('password') or ''
    confirm = data.get('confirmPassword') or ''

    if not all([email, invite_code, name, password, confirm]):
        return jsonify({'error': 'All fields are required'}), 400
    if not _password_valid(password):
        return jsonify({'error': 'Password must be at least 8 characters and include an uppercase letter and a number'}), 400
    if password != confirm:
        return jsonify({'error': 'Passwords do not match'}), 400

    conn = get_db()
    try:
        user = conn.execute(
            """SELECT user_id, org_id, email, invite_code, invite_expires_at, role
               FROM users WHERE email=?""",
            (email,)
        ).fetchone()
        if not user or not user['invite_code'] or user['invite_code'] != invite_code:
            return jsonify({'error': 'Invalid invite code or email'}), 400

        expires_at = _parse_iso(user['invite_expires_at'])
        if not expires_at or expires_at <= datetime.now(timezone.utc):
            return jsonify({'error': 'Invite code has expired'}), 400

        conn.execute(
            """UPDATE users
               SET password_hash=?, name=?, is_active=1, invite_code=NULL, invite_expires_at=NULL
               WHERE user_id=?""",
            (hash_password(password), name, user['user_id'])
        )
        conn.commit()

        org = conn.execute("SELECT name FROM organisations WHERE org_id=?", (user['org_id'],)).fetchone()
        org_name = org['name'] if org else 'your organisation'
        send_welcome_email(email, name, org_name)
        audit_helper.log(
            user['org_id'], user['user_id'], name, user['role'],
            'USER_ACTIVATED',
            f"Invited user activated account: {email}",
            entity_type='user',
            entity_id=user['user_id'],
            ip_address=request.remote_addr,
        )
        return jsonify({'message': 'Account activated. You can now log in.'}), 200
    finally:
        conn.close()


@register_bp.route('/auth/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json() or {}
    email = _clean_email(data.get('email'))
    neutral_message = {'message': 'If that email is registered you will receive a reset link'}

    if not email:
        return jsonify(neutral_message), 200
    if _forgot_rate_limited(email):
        return jsonify(neutral_message), 200

    conn = get_db()
    try:
        user = conn.execute(
            "SELECT user_id, name, email FROM users WHERE email=?",
            (email,)
        ).fetchone()
        if user:
            raw_token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
            expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
            conn.execute(
                """INSERT INTO password_reset_tokens
                   (token_id, user_id, token_hash, expires_at, used)
                   VALUES (?, ?, ?, ?, 0)""",
                (str(uuid.uuid4()), user['user_id'], token_hash, expires_at)
            )
            conn.commit()
            reset_url = f"{FRONTEND_URL}/reset-password?token={raw_token}"
            send_password_reset_email(user['email'], user['name'], reset_url)

        return jsonify(neutral_message), 200
    finally:
        conn.close()


@register_bp.route('/auth/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json() or {}
    raw_token = (data.get('token') or '').strip()
    password = data.get('password') or ''
    confirm = data.get('confirmPassword') or ''

    if not raw_token:
        return jsonify({'error': 'Reset token is required'}), 400
    if not _password_valid(password):
        return jsonify({'error': 'Password must be at least 8 characters and include an uppercase letter and a number'}), 400
    if password != confirm:
        return jsonify({'error': 'Passwords do not match'}), 400

    token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
    conn = get_db()
    try:
        row = conn.execute(
            """SELECT token_id, user_id, expires_at, used
               FROM password_reset_tokens
               WHERE token_hash=? ORDER BY expires_at DESC LIMIT 1""",
            (token_hash,)
        ).fetchone()
        if not row:
            return jsonify({'error': 'Invalid or expired reset link'}), 400

        expires_at = _parse_iso(row['expires_at'])
        if row['used'] or not expires_at or expires_at <= datetime.now(timezone.utc):
            return jsonify({'error': 'Invalid or expired reset link'}), 400

        user = conn.execute(
            "SELECT user_id, org_id, name, email, role FROM users WHERE user_id=?",
            (row['user_id'],)
        ).fetchone()
        if not user:
            return jsonify({'error': 'Invalid reset request'}), 400

        conn.execute("BEGIN")
        conn.execute(
            "UPDATE users SET password_hash=? WHERE user_id=?",
            (hash_password(password), user['user_id'])
        )
        conn.execute(
            "UPDATE password_reset_tokens SET used=1 WHERE token_id=?",
            (row['token_id'],)
        )
        conn.commit()

        send_password_changed_email(user['email'], user['name'])
        audit_helper.log(
            user['org_id'], user['user_id'], user['name'], user['role'],
            'PASSWORD_RESET',
            'User reset password via reset link',
            entity_type='user',
            entity_id=user['user_id'],
            ip_address=request.remote_addr,
        )
        return jsonify({'message': 'Password reset successful. Please log in.'}), 200
    finally:
        conn.close()


@register_bp.route('/register/invite-org', methods=['GET'])
def get_invite_org():
    email = _clean_email(request.args.get('email', ''))
    if not email:
        return jsonify({'orgName': ''}), 200

    conn = get_db()
    try:
        row = conn.execute(
            """SELECT o.name AS org_name
               FROM users u
               LEFT JOIN organisations o ON o.org_id = u.org_id
               WHERE u.email=?""",
            (email,)
        ).fetchone()
        return jsonify({'orgName': row['org_name'] if row else ''}), 200
    finally:
        conn.close()
