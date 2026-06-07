"""
Risk register routes — CRUD with input validation, UUID-based IDs, RBAC enforcement.
"""
import uuid
import logging
from flask import Blueprint, request, jsonify, g
from models import get_db
from services.auth_service import jwt_required, roles_required, now_iso
from services import audit_helper

risks_bp = Blueprint('risks', __name__)
logger = logging.getLogger(__name__)

MATRIX_SIZE = 5  # Maximum value for likelihood / impact

ORG_THRESHOLDS = {
    'Conservative': {'Low': 4,  'Medium': 6},
    'Standard':     {'Low': 6,  'Medium': 12},
    'Comprehensive': {'Low': 8, 'Medium': 16},
}


def _calculate_level(score: int, methodology: str) -> str:
    thresholds = ORG_THRESHOLDS.get(methodology, ORG_THRESHOLDS['Standard'])
    if score <= thresholds['Low']:
        return 'Low'
    elif score <= thresholds['Medium']:
        return 'Medium'
    else:
        return 'High'


def _get_methodology(conn, org_id: str) -> str:
    row = conn.execute(
        "SELECT risk_appetite FROM organisations WHERE org_id=?", (org_id,)
    ).fetchone()
    return row['risk_appetite'] if row else 'Standard'


def _parse_score_inputs(data: dict, defaults: dict) -> tuple[int, int]:
    """Parse and clamp likelihood/impact. Raises ValueError on out-of-bounds input."""
    try:
        likelihood = int(data.get('likelihood', defaults.get('likelihood', 1)))
        impact     = int(data.get('impact',     defaults.get('impact',     1)))
    except (ValueError, TypeError):
        raise ValueError("Likelihood and impact must be integers")
    if not (1 <= likelihood <= MATRIX_SIZE):
        raise ValueError(f"Likelihood must be between 1 and {MATRIX_SIZE}")
    if not (1 <= impact <= MATRIX_SIZE):
        raise ValueError(f"Impact must be between 1 and {MATRIX_SIZE}")
    return likelihood, impact


@risks_bp.route('/risks', methods=['GET'])
@jwt_required
def list_risks():
    conn = get_db()
    try:
        page       = max(1, int(request.args.get('page', 1)))
        per_page   = min(100, max(1, int(request.args.get('per_page', 20))))
        search     = request.args.get('search', '').strip()
        level_f    = request.args.get('level', '')
        treatment_f = request.args.get('treatment', '')
        status_f   = request.args.get('status', '')
        offset     = (page - 1) * per_page

        query  = "SELECT * FROM risk_register WHERE org_id=?"
        params: list = [g.org_id]

        if search:
            query += " AND (threat LIKE ? OR asset LIKE ? OR vulnerability LIKE ?)"
            params.extend([f'%{search}%', f'%{search}%', f'%{search}%'])
        if level_f:
            query += " AND risk_level=?"
            params.append(level_f)
        if treatment_f:
            query += " AND treatment=?"
            params.append(treatment_f)
        if status_f:
            query += " AND status=?"
            params.append(status_f)

        total = conn.execute(
            query.replace("SELECT *", "SELECT COUNT(*) as c"), params
        ).fetchone()['c']

        query += " ORDER BY score DESC LIMIT ? OFFSET ?"
        params.extend([per_page, offset])

        rows = conn.execute(query, params).fetchall()
        return jsonify({
            'risks':    [dict(r) for r in rows],
            'total':    total,
            'page':     page,
            'per_page': per_page,
        }), 200
    finally:
        conn.close()


@risks_bp.route('/risks', methods=['POST'])
@jwt_required
def create_risk():
    if g.role not in ('ISMS_Owner', 'Contributor'):
        return jsonify({'error': 'Permission denied'}), 403

    data = request.get_json() or {}

    if not (data.get('threat') or '').strip():
        return jsonify({'error': 'Threat description is required'}), 400

    conn = get_db()
    try:
        try:
            likelihood, impact = _parse_score_inputs(data, {})
        except ValueError as e:
            return jsonify({'error': str(e)}), 400

        methodology = _get_methodology(conn, g.org_id)
        score       = likelihood * impact
        risk_level  = _calculate_level(score, methodology)
        # UUID-based ID prevents collisions when risks are deleted
        risk_id     = f"R-{str(uuid.uuid4())[:8].upper()}"

        conn.execute(
            """INSERT INTO risk_register
               (risk_id, org_id, asset_id, asset, threat, vulnerability,
                likelihood, impact, risk_level, treatment, treatment_plan,
                treatment_owner, treatment_due, owner, status, notes,
                created_at, created_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (risk_id, g.org_id,
             data.get('assetId'), data.get('asset', ''),
             data.get('threat', '').strip(), data.get('vulnerability', ''),
             likelihood, impact, risk_level,
             data.get('treatment', 'Mitigate'),
             data.get('treatmentPlan'), data.get('treatmentOwner'),
             data.get('treatmentDue'), data.get('owner', ''),
             data.get('status', 'Open'), data.get('notes', ''),
             now_iso(), g.user_id)
        )
        conn.commit()

        audit_helper.log(
            g.org_id, g.user_id, '', g.role,
            'RISK_CREATED',
            f"Risk created: {data.get('threat', '')} [{risk_level}]",
            'risk', risk_id
        )

        row = conn.execute(
            "SELECT * FROM risk_register WHERE risk_id=?", (risk_id,)
        ).fetchone()
        return jsonify(dict(row)), 201
    finally:
        conn.close()


@risks_bp.route('/risks/<risk_id>', methods=['PATCH'])
@jwt_required
def update_risk(risk_id):
    if g.role not in ('ISMS_Owner', 'Contributor'):
        return jsonify({'error': 'Permission denied'}), 403

    conn = get_db()
    try:
        risk = conn.execute(
            "SELECT * FROM risk_register WHERE risk_id=? AND org_id=?",
            (risk_id, g.org_id)
        ).fetchone()
        if not risk:
            return jsonify({'error': 'Risk not found'}), 404

        # Contributors can only edit risks they created
        if g.role == 'Contributor' and risk['created_by'] != g.user_id:
            return jsonify({'error': 'You can only edit risks you created'}), 403

        data = request.get_json() or {}
        try:
            likelihood, impact = _parse_score_inputs(
                data,
                {'likelihood': risk['likelihood'], 'impact': risk['impact']}
            )
        except ValueError as e:
            return jsonify({'error': str(e)}), 400

        methodology = _get_methodology(conn, g.org_id)
        risk_level  = _calculate_level(likelihood * impact, methodology)

        conn.execute(
            """UPDATE risk_register SET
               asset=?, threat=?, vulnerability=?, likelihood=?, impact=?,
               risk_level=?, treatment=?, treatment_plan=?, treatment_owner=?,
               treatment_due=?, owner=?, status=?, notes=?, updated_at=?
               WHERE risk_id=? AND org_id=?""",
            (data.get('asset',          risk['asset']),
             data.get('threat',         risk['threat']),
             data.get('vulnerability',  risk['vulnerability']),
             likelihood, impact, risk_level,
             data.get('treatment',      risk['treatment']),
             data.get('treatmentPlan',  risk['treatment_plan']),
             data.get('treatmentOwner', risk['treatment_owner']),
             data.get('treatmentDue',   risk['treatment_due']),
             data.get('owner',          risk['owner']),
             data.get('status',         risk['status']),
             data.get('notes',          risk['notes']),
             now_iso(), risk_id, g.org_id)
        )
        conn.commit()

        audit_helper.log(
            g.org_id, g.user_id, '', g.role,
            'RISK_UPDATED', f"Risk {risk_id} updated", 'risk', risk_id
        )

        updated = conn.execute(
            "SELECT * FROM risk_register WHERE risk_id=?", (risk_id,)
        ).fetchone()
        return jsonify(dict(updated)), 200
    finally:
        conn.close()


@risks_bp.route('/risks/<risk_id>', methods=['DELETE'])
@jwt_required
@roles_required('ISMS_Owner')
def delete_risk(risk_id):
    conn = get_db()
    try:
        risk = conn.execute(
            "SELECT * FROM risk_register WHERE risk_id=? AND org_id=?",
            (risk_id, g.org_id)
        ).fetchone()
        if not risk:
            return jsonify({'error': 'Risk not found'}), 404

        conn.execute(
            "DELETE FROM risk_register WHERE risk_id=? AND org_id=?",
            (risk_id, g.org_id)
        )
        conn.commit()

        audit_helper.log(
            g.org_id, g.user_id, '', g.role,
            'RISK_DELETED', f"Risk {risk_id} deleted: {risk['threat']}",
            'risk', risk_id
        )
        return jsonify({'deleted': True}), 200
    finally:
        conn.close()
