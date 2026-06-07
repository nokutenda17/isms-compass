"""
Tests for the risk register — CRUD, input validation, RBAC, and ID uniqueness.
"""
import pytest
import uuid
from tests.conftest import login
from models import get_db
from services.auth_service import hash_password, now_iso


def _add_contributor(org_id: str) -> dict:
    """Insert a Contributor user into the DB and return their creds."""
    user_id = str(uuid.uuid4())
    conn = get_db()
    conn.execute(
        """INSERT INTO users (user_id, org_id, name, email, password_hash, role, is_active, created_at)
           VALUES (?,?,?,?,?,?,1,?)""",
        (user_id, org_id, 'Contrib User', 'contrib@test.com',
         hash_password('Contrib123!'), 'Contributor', now_iso())
    )
    conn.commit()
    conn.close()
    return {'email': 'contrib@test.com', 'password': 'Contrib123!', 'user_id': user_id}


class TestRiskListGet:
    def test_empty_register_returns_list(self, seeded_client):
        client, creds = seeded_client
        token = login(client, creds['email'], creds['password'])
        res = client.get('/api/risks', headers={'Authorization': f'Bearer {token}'})
        assert res.status_code == 200
        data = res.get_json()
        assert 'risks' in data
        assert isinstance(data['risks'], list)

    def test_pagination_params(self, seeded_client):
        client, creds = seeded_client
        token = login(client, creds['email'], creds['password'])
        res = client.get('/api/risks?page=1&per_page=5', headers={'Authorization': f'Bearer {token}'})
        assert res.status_code == 200
        data = res.get_json()
        assert data['page'] == 1
        assert data['per_page'] == 5


class TestRiskCreate:
    def test_create_risk_returns_201(self, seeded_client):
        client, creds = seeded_client
        token = login(client, creds['email'], creds['password'])
        res = client.post('/api/risks',
            headers={'Authorization': f'Bearer {token}'},
            json={'threat': 'Phishing attack', 'asset': 'Email system', 'likelihood': 3, 'impact': 4}
        )
        assert res.status_code == 201
        data = res.get_json()
        assert data['threat'] == 'Phishing attack'
        assert data['score'] == 12  # 3 × 4

    def test_create_risk_generates_unique_ids(self, seeded_client):
        client, creds = seeded_client
        token = login(client, creds['email'], creds['password'])
        ids = set()
        for i in range(5):
            res = client.post('/api/risks',
                headers={'Authorization': f'Bearer {token}'},
                json={'threat': f'Threat {i}', 'likelihood': 1, 'impact': 1}
            )
            assert res.status_code == 201
            ids.add(res.get_json()['risk_id'])
        assert len(ids) == 5, "Risk IDs are not unique"

    def test_ids_unique_after_delete(self, seeded_client):
        """Regression: count-based IDs would collide after deletion — UUID IDs must not."""
        client, creds = seeded_client
        token = login(client, creds['email'], creds['password'])
        created_ids = []
        for i in range(3):
            res = client.post('/api/risks',
                headers={'Authorization': f'Bearer {token}'},
                json={'threat': f'T{i}', 'likelihood': 1, 'impact': 1}
            )
            created_ids.append(res.get_json()['risk_id'])
        # Delete middle risk
        client.delete(f'/api/risks/{created_ids[1]}', headers={'Authorization': f'Bearer {token}'})
        # Create a new risk — must not collide with any existing ID
        res = client.post('/api/risks',
            headers={'Authorization': f'Bearer {token}'},
            json={'threat': 'New risk after delete', 'likelihood': 2, 'impact': 2}
        )
        assert res.status_code == 201
        assert res.get_json()['risk_id'] not in created_ids

    def test_missing_threat_returns_400(self, seeded_client):
        client, creds = seeded_client
        token = login(client, creds['email'], creds['password'])
        res = client.post('/api/risks',
            headers={'Authorization': f'Bearer {token}'},
            json={'asset': 'Server', 'likelihood': 2, 'impact': 2}
        )
        assert res.status_code == 400

    def test_likelihood_out_of_bounds_returns_400(self, seeded_client):
        client, creds = seeded_client
        token = login(client, creds['email'], creds['password'])
        res = client.post('/api/risks',
            headers={'Authorization': f'Bearer {token}'},
            json={'threat': 'Test', 'likelihood': 999, 'impact': 1}
        )
        assert res.status_code == 400
        assert 'Likelihood' in res.get_json()['error']

    def test_impact_out_of_bounds_returns_400(self, seeded_client):
        client, creds = seeded_client
        token = login(client, creds['email'], creds['password'])
        res = client.post('/api/risks',
            headers={'Authorization': f'Bearer {token}'},
            json={'threat': 'Test', 'likelihood': 1, 'impact': 0}
        )
        assert res.status_code == 400

    def test_reviewer_cannot_create_risk(self, seeded_client):
        client, creds = seeded_client
        # Add reviewer
        conn = get_db()
        reviewer_id = str(uuid.uuid4())
        conn.execute(
            """INSERT INTO users (user_id, org_id, name, email, password_hash, role, is_active, created_at)
               VALUES (?,?,?,?,?,?,1,?)""",
            (reviewer_id, creds['org_id'], 'Rev', 'reviewer@test.com',
             hash_password('Rev123!'), 'Reviewer', now_iso())
        )
        conn.commit(); conn.close()
        token = login(client, 'reviewer@test.com', 'Rev123!')
        res = client.post('/api/risks',
            headers={'Authorization': f'Bearer {token}'},
            json={'threat': 'Test', 'likelihood': 1, 'impact': 1}
        )
        assert res.status_code == 403

    def test_auditor_cannot_create_risk(self, seeded_client):
        client, creds = seeded_client
        conn = get_db()
        aud_id = str(uuid.uuid4())
        conn.execute(
            """INSERT INTO users (user_id, org_id, name, email, password_hash, role, is_active, created_at)
               VALUES (?,?,?,?,?,?,1,?)""",
            (aud_id, creds['org_id'], 'Aud', 'auditor@test.com',
             hash_password('Aud123!'), 'Auditor', now_iso())
        )
        conn.commit(); conn.close()
        token = login(client, 'auditor@test.com', 'Aud123!')
        res = client.post('/api/risks',
            headers={'Authorization': f'Bearer {token}'},
            json={'threat': 'Test', 'likelihood': 1, 'impact': 1}
        )
        assert res.status_code == 403


class TestRiskUpdate:
    def _create_risk(self, client, token):
        res = client.post('/api/risks',
            headers={'Authorization': f'Bearer {token}'},
            json={'threat': 'Original', 'likelihood': 2, 'impact': 2}
        )
        assert res.status_code == 201
        return res.get_json()['risk_id']

    def test_owner_can_update_any_risk(self, seeded_client):
        client, creds = seeded_client
        token = login(client, creds['email'], creds['password'])
        risk_id = self._create_risk(client, token)
        res = client.patch(f'/api/risks/{risk_id}',
            headers={'Authorization': f'Bearer {token}'},
            json={'threat': 'Updated threat', 'likelihood': 4, 'impact': 4}
        )
        assert res.status_code == 200
        assert res.get_json()['score'] == 16

    def test_update_invalid_likelihood_returns_400(self, seeded_client):
        client, creds = seeded_client
        token = login(client, creds['email'], creds['password'])
        risk_id = self._create_risk(client, token)
        res = client.patch(f'/api/risks/{risk_id}',
            headers={'Authorization': f'Bearer {token}'},
            json={'likelihood': -1}
        )
        assert res.status_code == 400

    def test_update_nonexistent_risk_returns_404(self, seeded_client):
        client, creds = seeded_client
        token = login(client, creds['email'], creds['password'])
        res = client.patch('/api/risks/R-NOTREAL',
            headers={'Authorization': f'Bearer {token}'},
            json={'threat': 'x'}
        )
        assert res.status_code == 404


class TestRiskDelete:
    def test_only_owner_can_delete(self, seeded_client):
        client, creds = seeded_client
        owner_token = login(client, creds['email'], creds['password'])
        risk_id_res = client.post('/api/risks',
            headers={'Authorization': f'Bearer {owner_token}'},
            json={'threat': 'To delete', 'likelihood': 1, 'impact': 1}
        )
        risk_id = risk_id_res.get_json()['risk_id']

        contrib = _add_contributor(creds['org_id'])
        contrib_token = login(client, contrib['email'], contrib['password'])
        res = client.delete(f'/api/risks/{risk_id}',
            headers={'Authorization': f'Bearer {contrib_token}'}
        )
        assert res.status_code == 403

    def test_owner_can_delete(self, seeded_client):
        client, creds = seeded_client
        token = login(client, creds['email'], creds['password'])
        risk_id = client.post('/api/risks',
            headers={'Authorization': f'Bearer {token}'},
            json={'threat': 'Delete me', 'likelihood': 1, 'impact': 1}
        ).get_json()['risk_id']
        res = client.delete(f'/api/risks/{risk_id}', headers={'Authorization': f'Bearer {token}'})
        assert res.status_code == 200
        # Verify it's gone
        check = client.get(f'/api/risks?search=Delete+me', headers={'Authorization': f'Bearer {token}'})
        assert check.get_json()['total'] == 0
