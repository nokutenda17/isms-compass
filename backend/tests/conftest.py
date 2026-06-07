"""
Shared pytest fixtures for ISMS Compass backend tests.
Each test gets a fresh, isolated SQLite database via monkeypatching.
"""
import os
import sys
import uuid
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


@pytest.fixture
def tmp_db(tmp_path, monkeypatch):
    """Provide a fresh, isolated database for each test."""
    db_file = str(tmp_path / 'test.db')
    monkeypatch.setenv('DATABASE_URL', db_file)
    monkeypatch.setenv('JWT_SECRET_KEY', 'test-secret-key-for-pytest')
    monkeypatch.setenv('FLASK_DEBUG', '0')
    # Re-import models so it picks up the new DATABASE_URL
    import importlib
    import models
    importlib.reload(models)
    models.init_db()
    return db_file


@pytest.fixture
def app(tmp_db, monkeypatch):
    import importlib
    import models
    importlib.reload(models)
    # Clear Flask blueprint registrations by reimporting app fresh
    import sys
    for mod in list(sys.modules.keys()):
        if mod.startswith('routes') or mod.startswith('services') or mod == 'app':
            sys.modules.pop(mod, None)
    from app import create_app
    application = create_app()
    application.config['TESTING'] = True
    return application


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def seeded_client(client, tmp_db):
    """Client with a pre-created org + ISMS Owner ready for login."""
    import importlib, models
    importlib.reload(models)
    from models import get_db
    from services.auth_service import hash_password, now_iso

    org_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())

    conn = get_db()
    conn.execute(
        """INSERT INTO organisations (org_id, name, sector, size, country, city, created_at)
           VALUES (?,?,?,?,?,?,?)""",
        (org_id, 'Test Org', 'Technology', '10-50', 'Zimbabwe', 'Harare', now_iso())
    )
    conn.execute(
        """INSERT INTO users
           (user_id, org_id, name, email, password_hash, role, is_active, created_at)
           VALUES (?,?,?,?,?,?,1,?)""",
        (user_id, org_id, 'Test Owner', 'owner@test.com',
         hash_password('Password123!'), 'ISMS_Owner', now_iso())
    )
    for i in range(1, 11):
        conn.execute(
            """INSERT INTO isms_sessions (session_id, org_id, step_number, status)
               VALUES (?,?,?,?)""",
            (str(uuid.uuid4()), org_id, i, 'In Progress' if i == 1 else 'Not Started')
        )
    conn.commit()
    conn.close()

    return client, {
        'org_id': org_id, 'user_id': user_id,
        'email': 'owner@test.com', 'password': 'Password123!'
    }


def login(client, email: str, password: str) -> str:
    """Log in and return the access token."""
    res = client.post('/api/auth/login', json={'email': email, 'password': password})
    assert res.status_code == 200, f"Login failed ({res.status_code}): {res.get_json()}"
    return res.get_json()['access_token']
