"""
Auth service — JWT creation/verification, password hashing (bcrypt), role checking.
"""
import jwt
import bcrypt
import os
import secrets
import string
import logging
from datetime import datetime, timezone, timedelta
from functools import wraps
from flask import request, jsonify, g

logger = logging.getLogger(__name__)

SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'isms-compass-dev-secret-change-in-production')
ACCESS_TOKEN_EXPIRY_HOURS = 24
REFRESH_TOKEN_EXPIRY_DAYS = 30


def hash_password(password: str) -> str:
    """Hash a password using bcrypt with automatic salt (work factor 12)."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
    except Exception:
        return False


def create_access_token(user_id: str, role: str, org_id: str) -> str:
    payload = {
        'sub': user_id,
        'role': role,
        'org_id': org_id,
        'type': 'access',
        'exp': datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRY_HOURS),
        'iat': datetime.now(timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')


def create_refresh_token(user_id: str) -> str:
    payload = {
        'sub': user_id,
        'type': 'refresh',
        'exp': datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRY_DAYS),
        'iat': datetime.now(timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=['HS256'])


def generate_invite_code(length: int = 8) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def jwt_required(f):
    """Decorator: requires valid JWT in Authorization: Bearer <token> header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid Authorization header'}), 401
        token = auth_header.split(' ', 1)[1]
        try:
            payload = decode_token(token)
            if payload.get('type') != 'access':
                return jsonify({'error': 'Invalid token type'}), 401
            g.user_id = payload['sub']
            g.role = payload['role']
            g.org_id = payload['org_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({'error': f'Invalid token: {e}'}), 401
        return f(*args, **kwargs)
    return decorated


def roles_required(*allowed_roles):
    """Decorator: restricts endpoint to specific roles. Apply after @jwt_required."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if g.role not in allowed_roles:
                return jsonify({'error': f'Access denied. Required roles: {list(allowed_roles)}'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
