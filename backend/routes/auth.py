"""
Authentication routes — login, refresh, logout, /me.
Includes rate limiting (5 attempts / 5 min per IP+email).
"""
import uuid
import logging
from collections import defaultdict
from time import time
from flask import Blueprint, request, jsonify, g
from models import get_db
from services.auth_service import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, now_iso, jwt_required
)
from services import audit_helper

auth_bp = Blueprint('auth', __name__)
logger = logging.getLogger(__name__)

# ── In-memory rate limiter (replace with Redis in production) ─────────────────
_login_attempts: dict[str, list[float]] = defaultdict(list)
_MAX_ATTEMPTS = 5
_WINDOW_SECS = 300  # 5 minutes


def _check_rate_limit(key: str) -> bool:
    """Returns True if the caller should be blocked."""
    now = time()
    _login_attempts[key] = [t for t in _login_attempts[key] if now - t < _WINDOW_SECS]
    if len(_login_attempts[key]) >= _MAX_ATTEMPTS:
        return True
    _login_attempts[key].append(now)
    return False


@auth_bp.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    # Rate-limit by IP + email to prevent brute-force and credential stuffing
    limit_key = f"{request.remote_addr}:{email}"
    if _check_rate_limit(limit_key):
        return jsonify({'error': 'Too many login attempts. Please wait 5 minutes.'}), 429

    conn = get_db()
    try:
        user = conn.execute(
            "SELECT * FROM users WHERE email = ? AND is_active = 1", (email,)
        ).fetchone()

        if not user or not verify_password(password, user['password_hash']):
            return jsonify({'error': 'Invalid email or password'}), 401

        conn.execute(
            "UPDATE users SET last_login = ? WHERE user_id = ?",
            (now_iso(), user['user_id'])
        )
        org = conn.execute(
            "SELECT * FROM organisations WHERE org_id = ?", (user['org_id'],)
        ).fetchone()
        conn.commit()

        access_token = create_access_token(user['user_id'], user['role'], user['org_id'])
        refresh_token = create_refresh_token(user['user_id'])

        # Pass the actual user name to the audit record
        audit_helper.log(
            user['org_id'], user['user_id'], user['name'], user['role'],
            'LOGIN', f"User logged in: {user['email']}",
            ip_address=request.remote_addr
        )

        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {
                'id': user['user_id'],
                'name': user['name'],
                'email': user['email'],
                'role': user['role'],
                'orgId': user['org_id'],
                'orgName': org['name'] if org else '',
                'orgSector': org['sector'] if org else '',
                'orgSize': org['size'] if org else '',
                'city': org['city'] if org else '',
            },
            'onboarding_required': org is None,
        }), 200
    finally:
        conn.close()


@auth_bp.route('/auth/refresh', methods=['POST'])
def refresh():
    data = request.get_json() or {}
    token = data.get('refresh_token', '')
    try:
        payload = decode_token(token)
        if payload.get('type') != 'refresh':
            return jsonify({'error': 'Invalid token type'}), 401
        user_id = payload['sub']
    except Exception:
        return jsonify({'error': 'Invalid or expired refresh token'}), 401

    conn = get_db()
    try:
        user = conn.execute(
            "SELECT * FROM users WHERE user_id = ? AND is_active = 1", (user_id,)
        ).fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        access_token = create_access_token(user['user_id'], user['role'], user['org_id'])
        return jsonify({'access_token': access_token}), 200
    finally:
        conn.close()


@auth_bp.route('/auth/logout', methods=['POST'])
@jwt_required
def logout():
    # Fetch name for a complete audit record
    conn = get_db()
    try:
        user = conn.execute(
            "SELECT name FROM users WHERE user_id = ?", (g.user_id,)
        ).fetchone()
        user_name = user['name'] if user else ''
    finally:
        conn.close()

    audit_helper.log(
        g.org_id, g.user_id, user_name, g.role,
        'LOGOUT', 'User logged out', ip_address=request.remote_addr
    )
    return jsonify({'message': 'Logged out successfully'}), 200


@auth_bp.route('/auth/me', methods=['GET'])
@jwt_required
def me():
    conn = get_db()
    try:
        user = conn.execute("SELECT * FROM users WHERE user_id = ?", (g.user_id,)).fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        org = conn.execute("SELECT * FROM organisations WHERE org_id = ?", (g.org_id,)).fetchone()
        return jsonify({
            'id': user['user_id'],
            'name': user['name'],
            'email': user['email'],
            'role': user['role'],
            'orgId': user['org_id'],
            'orgName': org['name'] if org else '',
            'orgSector': org['sector'] if org else '',
            'orgSize': org['size'] if org else '',
            'city': org['city'] if org else '',
        }), 200
    finally:
        conn.close()
