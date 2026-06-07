"""
Security-focused tests — password hashing, token validation, audit log integrity.
"""
import pytest
from services.auth_service import hash_password, verify_password


class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        pw = 'MySecretPassword!'
        hashed = hash_password(pw)
        assert pw not in hashed

    def test_correct_password_verifies(self):
        pw = 'MySecretPassword!'
        assert verify_password(pw, hash_password(pw)) is True

    def test_wrong_password_fails(self):
        assert verify_password('wrong', hash_password('correct')) is False

    def test_two_hashes_of_same_password_differ(self):
        """bcrypt generates a unique salt each time — hashes must never be identical."""
        pw = 'SamePassword'
        h1 = hash_password(pw)
        h2 = hash_password(pw)
        assert h1 != h2, "Hashes should differ due to unique salts"

    def test_empty_password_hashes_without_error(self):
        # Edge: empty string is a valid (if terrible) password that should hash
        h = hash_password('')
        assert verify_password('', h) is True

    def test_tampered_hash_fails_verification(self):
        hashed = hash_password('secret')
        tampered = hashed[:-5] + 'XXXXX'
        assert verify_password('secret', tampered) is False


class TestJWTSecurity:
    def test_expired_token_returns_401(self, seeded_client):
        """Use a pre-expired token and verify the backend rejects it."""
        import jwt, datetime
        client, creds = seeded_client
        payload = {
            'sub': 'any-user-id',
            'role': 'ISMS_Owner',
            'org_id': 'any-org-id',
            'type': 'access',
            'exp': datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=1),
            'iat': datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=2),
        }
        expired_token = jwt.encode(payload, 'test-secret-key-for-pytest', algorithm='HS256')
        res = client.get('/api/risks', headers={'Authorization': f'Bearer {expired_token}'})
        assert res.status_code == 401
        assert 'expired' in res.get_json()['error'].lower()

    def test_malformed_token_returns_401(self, client):
        res = client.get('/api/risks', headers={'Authorization': 'Bearer this.is.garbage'})
        assert res.status_code == 401

    def test_missing_bearer_prefix_returns_401(self, client):
        res = client.get('/api/risks', headers={'Authorization': 'just-a-token'})
        assert res.status_code == 401


class TestAuditLogIntegrity:
    def test_login_creates_audit_entry(self, seeded_client):
        from tests.conftest import login
        from models import get_db
        client, creds = seeded_client
        login(client, creds['email'], creds['password'])

        conn = get_db()
        entry = conn.execute(
            "SELECT * FROM audit_log WHERE action='LOGIN' ORDER BY timestamp DESC LIMIT 1"
        ).fetchone()
        conn.close()

        assert entry is not None
        assert entry['action'] == 'LOGIN'
        assert entry['user_name'] != '', "Audit log user_name must not be empty"

    def test_risk_creation_creates_audit_entry(self, seeded_client):
        from tests.conftest import login
        from models import get_db
        client, creds = seeded_client
        token = login(client, creds['email'], creds['password'])
        client.post('/api/risks',
            headers={'Authorization': f'Bearer {token}'},
            json={'threat': 'Audit test threat', 'likelihood': 1, 'impact': 1}
        )
        conn = get_db()
        entry = conn.execute(
            "SELECT * FROM audit_log WHERE action='RISK_CREATED' ORDER BY timestamp DESC LIMIT 1"
        ).fetchone()
        conn.close()
        assert entry is not None
