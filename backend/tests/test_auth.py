"""
Tests for authentication routes.
Covers: login validation, rate limiting, token refresh, RBAC.
"""
import pytest
from tests.conftest import login


class TestLogin:
    def test_missing_fields_returns_400(self, client):
        res = client.post('/api/auth/login', json={})
        assert res.status_code == 400
        assert 'required' in res.get_json()['error'].lower()

    def test_missing_password_returns_400(self, client):
        res = client.post('/api/auth/login', json={'email': 'x@x.com'})
        assert res.status_code == 400

    def test_invalid_credentials_returns_401(self, seeded_client):
        client, _ = seeded_client
        res = client.post('/api/auth/login', json={'email': 'owner@test.com', 'password': 'wrong'})
        assert res.status_code == 401
        assert 'Invalid' in res.get_json()['error']

    def test_nonexistent_user_returns_401(self, seeded_client):
        client, _ = seeded_client
        res = client.post('/api/auth/login', json={'email': 'ghost@test.com', 'password': 'any'})
        assert res.status_code == 401

    def test_valid_login_returns_tokens(self, seeded_client):
        client, creds = seeded_client
        res = client.post('/api/auth/login', json={'email': creds['email'], 'password': creds['password']})
        assert res.status_code == 200
        data = res.get_json()
        assert 'access_token' in data
        assert 'refresh_token' in data
        assert data['user']['role'] == 'ISMS_Owner'

    def test_email_is_case_insensitive(self, seeded_client):
        client, creds = seeded_client
        res = client.post('/api/auth/login', json={'email': creds['email'].upper(), 'password': creds['password']})
        assert res.status_code == 200

    def test_rate_limit_after_5_failures(self, seeded_client):
        client, _ = seeded_client
        for _ in range(5):
            client.post('/api/auth/login', json={'email': 'owner@test.com', 'password': 'bad'})
        res = client.post('/api/auth/login', json={'email': 'owner@test.com', 'password': 'bad'})
        assert res.status_code == 429
        assert 'Too many' in res.get_json()['error']


class TestTokenRefresh:
    def test_refresh_with_invalid_token_returns_401(self, client):
        res = client.post('/api/auth/refresh', json={'refresh_token': 'not-a-real-token'})
        assert res.status_code == 401

    def test_refresh_with_access_token_returns_401(self, seeded_client):
        client, creds = seeded_client
        access = login(client, creds['email'], creds['password'])
        res = client.post('/api/auth/refresh', json={'refresh_token': access})
        assert res.status_code == 401  # wrong type

    def test_valid_refresh_returns_new_access_token(self, seeded_client):
        client, creds = seeded_client
        login_res = client.post('/api/auth/login', json={'email': creds['email'], 'password': creds['password']})
        refresh_token = login_res.get_json()['refresh_token']
        res = client.post('/api/auth/refresh', json={'refresh_token': refresh_token})
        assert res.status_code == 200
        assert 'access_token' in res.get_json()


class TestProtectedRoutes:
    def test_risks_requires_auth(self, client):
        res = client.get('/api/risks')
        assert res.status_code == 401

    def test_steps_requires_auth(self, client):
        res = client.get('/api/steps')
        assert res.status_code == 401

    def test_users_requires_auth(self, client):
        res = client.get('/api/users')
        assert res.status_code == 401

    def test_audit_log_requires_auth(self, client):
        res = client.get('/api/audit-log')
        assert res.status_code == 401

    def test_me_requires_auth(self, client):
        res = client.get('/api/auth/me')
        assert res.status_code == 401

    def test_me_returns_user_with_valid_token(self, seeded_client):
        client, creds = seeded_client
        token = login(client, creds['email'], creds['password'])
        res = client.get('/api/auth/me', headers={'Authorization': f'Bearer {token}'})
        assert res.status_code == 200
        assert res.get_json()['email'] == creds['email']
