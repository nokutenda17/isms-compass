"""
Tests for role-based access control across the API.
Each role's permissions are verified against the matrix in the requirements doc.
"""
import pytest
import uuid
from tests.conftest import login
from models import get_db
from services.auth_service import hash_password, now_iso


def _create_user(org_id: str, role: str, email: str, password: str = 'Test123!') -> str:
    uid = str(uuid.uuid4())
    conn = get_db()
    conn.execute(
        """INSERT INTO users (user_id, org_id, name, email, password_hash, role, is_active, created_at)
           VALUES (?,?,?,?,?,?,1,?)""",
        (uid, org_id, role, email, hash_password(password), role, now_iso())
    )
    conn.commit(); conn.close()
    return uid


class TestUserManagementRBAC:
    """Only ISMS_Owner can list or manage users."""

    def test_contributor_cannot_list_users(self, seeded_client):
        client, creds = seeded_client
        _create_user(creds['org_id'], 'Contributor', 'c@test.com')
        token = login(client, 'c@test.com', 'Test123!')
        assert client.get('/api/users', headers={'Authorization': f'Bearer {token}'}).status_code == 403

    def test_reviewer_cannot_list_users(self, seeded_client):
        client, creds = seeded_client
        _create_user(creds['org_id'], 'Reviewer', 'r@test.com')
        token = login(client, 'r@test.com', 'Test123!')
        assert client.get('/api/users', headers={'Authorization': f'Bearer {token}'}).status_code == 403

    def test_auditor_cannot_list_users(self, seeded_client):
        client, creds = seeded_client
        _create_user(creds['org_id'], 'Auditor', 'a@test.com')
        token = login(client, 'a@test.com', 'Test123!')
        assert client.get('/api/users', headers={'Authorization': f'Bearer {token}'}).status_code == 403

    def test_owner_can_list_users(self, seeded_client):
        client, creds = seeded_client
        token = login(client, creds['email'], creds['password'])
        assert client.get('/api/users', headers={'Authorization': f'Bearer {token}'}).status_code == 200


class TestAuditLogRBAC:
    """Only ISMS_Owner and Auditor can view the audit log."""

    def test_contributor_cannot_view_audit_log(self, seeded_client):
        client, creds = seeded_client
        _create_user(creds['org_id'], 'Contributor', 'c2@test.com')
        token = login(client, 'c2@test.com', 'Test123!')
        assert client.get('/api/audit-log', headers={'Authorization': f'Bearer {token}'}).status_code == 403

    def test_reviewer_cannot_view_audit_log(self, seeded_client):
        client, creds = seeded_client
        _create_user(creds['org_id'], 'Reviewer', 'r2@test.com')
        token = login(client, 'r2@test.com', 'Test123!')
        assert client.get('/api/audit-log', headers={'Authorization': f'Bearer {token}'}).status_code == 403

    def test_auditor_can_view_audit_log(self, seeded_client):
        client, creds = seeded_client
        _create_user(creds['org_id'], 'Auditor', 'aud@test.com')
        token = login(client, 'aud@test.com', 'Test123!')
        assert client.get('/api/audit-log', headers={'Authorization': f'Bearer {token}'}).status_code == 200

    def test_owner_can_view_audit_log(self, seeded_client):
        client, creds = seeded_client
        token = login(client, creds['email'], creds['password'])
        assert client.get('/api/audit-log', headers={'Authorization': f'Bearer {token}'}).status_code == 200


class TestDocumentExportRBAC:
    """Only ISMS_Owner can export documents."""

    def test_contributor_cannot_export_documents(self, seeded_client):
        client, creds = seeded_client
        _create_user(creds['org_id'], 'Contributor', 'c3@test.com')
        token = login(client, 'c3@test.com', 'Test123!')
        res = client.get('/api/export/information_security_policy',
                         headers={'Authorization': f'Bearer {token}'})
        assert res.status_code == 403

    def test_auditor_cannot_export_documents(self, seeded_client):
        client, creds = seeded_client
        _create_user(creds['org_id'], 'Auditor', 'aud2@test.com')
        token = login(client, 'aud2@test.com', 'Test123!')
        res = client.get('/api/export/information_security_policy',
                         headers={'Authorization': f'Bearer {token}'})
        assert res.status_code == 403


class TestSoARBAC:
    """Reviewer can only update justification, not applicability or implementation_status."""

    def test_reviewer_cannot_change_applicability(self, seeded_client):
        client, creds = seeded_client
        _create_user(creds['org_id'], 'Reviewer', 'rev3@test.com')
        owner_token = login(client, creds['email'], creds['password'])
        rev_token = login(client, 'rev3@test.com', 'Test123!')

        # Get any control ref
        soa = client.get('/api/soa', headers={'Authorization': f'Bearer {owner_token}'}).get_json()
        control_ref = soa[0]['annex_a_ref']

        res = client.patch(f'/api/soa/{control_ref}',
            headers={'Authorization': f'Bearer {rev_token}'},
            json={'applicable': 0, 'implementation_status': 'Implemented'}
        )
        assert res.status_code == 403

    def test_reviewer_can_update_justification(self, seeded_client):
        client, creds = seeded_client
        _create_user(creds['org_id'], 'Reviewer', 'rev4@test.com')
        owner_token = login(client, creds['email'], creds['password'])
        rev_token = login(client, 'rev4@test.com', 'Test123!')

        soa = client.get('/api/soa', headers={'Authorization': f'Bearer {owner_token}'}).get_json()
        control_ref = soa[0]['annex_a_ref']

        res = client.patch(f'/api/soa/{control_ref}',
            headers={'Authorization': f'Bearer {rev_token}'},
            json={'justification': 'Reviewed and confirmed applicable.'}
        )
        assert res.status_code == 200

    def test_contributor_cannot_update_soa(self, seeded_client):
        client, creds = seeded_client
        _create_user(creds['org_id'], 'Contributor', 'c4@test.com')
        owner_token = login(client, creds['email'], creds['password'])
        contrib_token = login(client, 'c4@test.com', 'Test123!')

        soa = client.get('/api/soa', headers={'Authorization': f'Bearer {owner_token}'}).get_json()
        control_ref = soa[0]['annex_a_ref']

        res = client.patch(f'/api/soa/{control_ref}',
            headers={'Authorization': f'Bearer {contrib_token}'},
            json={'justification': 'Should not work'}
        )
        assert res.status_code == 403
