import json
import uuid
from flask import Blueprint, request, jsonify, g
from models import get_db
from services.auth_service import jwt_required, roles_required, now_iso
from services import audit_helper

orgs_bp = Blueprint('organisations', __name__)

STEP_TITLES = {
    1: 'Define ISMS Scope', 2: 'Information Security Policy',
    3: 'Risk Assessment Methodology', 4: 'Asset Inventory & Risk Assessment',
    5: 'Risk Treatment Plan', 6: 'Statement of Applicability',
    7: 'Roles & Responsibilities', 8: 'Security Awareness & Training',
    9: 'Operational Procedures', 10: 'Monitoring & Review',
}


def _init_steps(conn, org_id):
    """Create the 10 ISMS steps for a new organisation."""
    for step_num in range(1, 11):
        status = 'Not Started' if step_num == 1 else 'Locked'
        conn.execute(
            """INSERT OR IGNORE INTO isms_sessions
               (session_id, org_id, step_number, status)
               VALUES (?, ?, ?, ?)""",
            (str(uuid.uuid4()), org_id, step_num, status)
        )


@orgs_bp.route('/organisations', methods=['POST'])
@jwt_required
@roles_required('ISMS_Owner')
def create_organisation():
    data = request.get_json() or {}
    org_id = g.org_id
    conn = get_db()
    try:
        existing = conn.execute(
            "SELECT org_id FROM organisations WHERE org_id = ?", (org_id,)
        ).fetchone()
        if existing:
            # Update existing org profile
            conn.execute(
                """UPDATE organisations SET name=?, sector=?, size=?, city=?,
                   address=?, risk_appetite=?, scope=? WHERE org_id=?""",
                (data.get('name', ''), data.get('sector', ''), data.get('size', ''),
                 data.get('city', ''), data.get('address', ''),
                 data.get('riskAppetite', 'Standard'),
                 json.dumps(data.get('scope', [])), org_id)
            )
        else:
            conn.execute(
                """INSERT INTO organisations
                   (org_id, name, sector, size, city, address, risk_appetite, scope, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (org_id, data.get('name', ''), data.get('sector', ''),
                 data.get('size', ''), data.get('city', 'Harare'),
                 data.get('address', ''), data.get('riskAppetite', 'Standard'),
                 json.dumps(data.get('scope', [])), now_iso())
            )
            _init_steps(conn, org_id)

        conn.commit()

        audit_helper.log(org_id, g.user_id, '', g.role,
                         'ORG_PROFILE_UPDATED', f"Organisation profile saved: {data.get('name', '')}")

        org = conn.execute("SELECT * FROM organisations WHERE org_id = ?", (org_id,)).fetchone()
        return jsonify(dict(org)), 200
    finally:
        conn.close()


@orgs_bp.route('/organisations/me', methods=['GET'])
@jwt_required
def get_organisation():
    conn = get_db()
    try:
        org = conn.execute(
            "SELECT * FROM organisations WHERE org_id = ?", (g.org_id,)
        ).fetchone()
        if not org:
            return jsonify({'error': 'Organisation not found'}), 404
        result = dict(org)
        result['scope'] = json.loads(result.get('scope') or '[]')
        return jsonify(result), 200
    finally:
        conn.close()
