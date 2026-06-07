import json
import uuid
from flask import Blueprint, request, jsonify, g
from models import get_db
from services.auth_service import jwt_required, roles_required, now_iso
from services import audit_helper

monitoring_bp = Blueprint('monitoring', __name__)

# ── Incidents ─────────────────────────────────────────────────────────────────

@monitoring_bp.route('/incidents', methods=['GET'])
@jwt_required
def list_incidents():
    conn = get_db()
    try:
        # Contributors see only their own incidents
        if g.role == 'Contributor':
            rows = conn.execute(
                "SELECT * FROM incidents WHERE org_id=? AND reported_by_id=? ORDER BY reported_date DESC",
                (g.org_id, g.user_id)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM incidents WHERE org_id=? ORDER BY reported_date DESC",
                (g.org_id,)
            ).fetchall()
        return jsonify([dict(r) for r in rows]), 200
    finally:
        conn.close()


@monitoring_bp.route('/incidents', methods=['POST'])
@jwt_required
def create_incident():
    if g.role not in ('ISMS_Owner', 'Contributor'):
        return jsonify({'error': 'Permission denied'}), 403

    data = request.get_json() or {}
    conn = get_db()
    try:
        user = conn.execute("SELECT name FROM users WHERE user_id=?", (g.user_id,)).fetchone()
        user_name = user['name'] if user else ''

        count = conn.execute(
            "SELECT COUNT(*) as c FROM incidents WHERE org_id=?", (g.org_id,)
        ).fetchone()['c']
        incident_id = f"INC{str(count + 1).zfill(3)}"

        conn.execute(
            """INSERT INTO incidents
               (incident_id, org_id, title, description, severity,
                reported_by, reported_by_id, reported_date, status, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (incident_id, g.org_id,
             data.get('title', ''), data.get('description', ''),
             data.get('severity', 'Medium'),
             user_name, g.user_id,
             data.get('reportedDate', now_iso()[:10]),
             'Open', now_iso())
        )
        conn.commit()

        audit_helper.log(g.org_id, g.user_id, user_name, g.role,
                         'INCIDENT_CREATED', f"Incident logged: {data.get('title', '')}",
                         'incident', incident_id)

        row = conn.execute("SELECT * FROM incidents WHERE incident_id=?", (incident_id,)).fetchone()
        return jsonify(dict(row)), 201
    finally:
        conn.close()


@monitoring_bp.route('/incidents/<incident_id>', methods=['PATCH'])
@jwt_required
@roles_required('ISMS_Owner')
def update_incident(incident_id):
    data = request.get_json() or {}
    conn = get_db()
    try:
        inc = conn.execute(
            "SELECT * FROM incidents WHERE incident_id=? AND org_id=?",
            (incident_id, g.org_id)
        ).fetchone()
        if not inc:
            return jsonify({'error': 'Not found'}), 404

        conn.execute(
            """UPDATE incidents SET status=?, resolution=?
               WHERE incident_id=? AND org_id=?""",
            (data.get('status', inc['status']),
             data.get('resolution', inc['resolution']),
             incident_id, g.org_id)
        )
        conn.commit()

        audit_helper.log(g.org_id, g.user_id, '', g.role,
                         'INCIDENT_UPDATED', f"Incident {incident_id} status: {data.get('status', '')}",
                         'incident', incident_id)

        return jsonify(dict(conn.execute(
            "SELECT * FROM incidents WHERE incident_id=?", (incident_id,)
        ).fetchone())), 200
    finally:
        conn.close()


# ── Corrective Actions ────────────────────────────────────────────────────────

@monitoring_bp.route('/corrective-actions', methods=['GET'])
@jwt_required
def list_actions():
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM corrective_actions WHERE org_id=? ORDER BY due_date ASC",
            (g.org_id,)
        ).fetchall()
        return jsonify([dict(r) for r in rows]), 200
    finally:
        conn.close()


@monitoring_bp.route('/corrective-actions', methods=['POST'])
@jwt_required
@roles_required('ISMS_Owner')
def create_action():
    data = request.get_json() or {}
    conn = get_db()
    try:
        count = conn.execute(
            "SELECT COUNT(*) as c FROM corrective_actions WHERE org_id=?", (g.org_id,)
        ).fetchone()['c']
        action_id = f"CA{str(count + 1).zfill(3)}"

        conn.execute(
            """INSERT INTO corrective_actions
               (action_id, org_id, title, description, source, assigned_to, assigned_to_id,
                due_date, status, priority, related_to, created_at, created_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (action_id, g.org_id,
             data.get('title', ''), data.get('description', ''),
             data.get('source', 'Risk'),
             data.get('assignedTo', ''), data.get('assignedToId', ''),
             data.get('dueDate', ''), 'Open',
             data.get('priority', 'Medium'),
             data.get('relatedTo', ''),
             now_iso(), g.user_id)
        )
        conn.commit()

        audit_helper.log(g.org_id, g.user_id, '', g.role,
                         'ACTION_CREATED', f"Corrective action created: {data.get('title', '')}",
                         'action', action_id)

        return jsonify(dict(conn.execute(
            "SELECT * FROM corrective_actions WHERE action_id=?", (action_id,)
        ).fetchone())), 201
    finally:
        conn.close()


@monitoring_bp.route('/corrective-actions/<action_id>', methods=['PATCH'])
@jwt_required
def update_action(action_id):
    conn = get_db()
    try:
        action = conn.execute(
            "SELECT * FROM corrective_actions WHERE action_id=? AND org_id=?",
            (action_id, g.org_id)
        ).fetchone()
        if not action:
            return jsonify({'error': 'Not found'}), 404

        # Contributors can only update actions assigned to them
        if g.role == 'Contributor' and action['assigned_to_id'] != g.user_id:
            return jsonify({'error': 'Permission denied'}), 403

        data = request.get_json() or {}
        closed_at = now_iso() if data.get('status') == 'Closed' and action['status'] != 'Closed' else action['closed_at']

        conn.execute(
            """UPDATE corrective_actions
               SET status=?, closed_at=?
               WHERE action_id=? AND org_id=?""",
            (data.get('status', action['status']), closed_at, action_id, g.org_id)
        )
        conn.commit()

        audit_helper.log(g.org_id, g.user_id, '', g.role,
                         'ACTION_UPDATED', f"Action {action_id} status: {data.get('status', '')}",
                         'action', action_id)

        return jsonify(dict(conn.execute(
            "SELECT * FROM corrective_actions WHERE action_id=?", (action_id,)
        ).fetchone())), 200
    finally:
        conn.close()


# ── Internal Audits ───────────────────────────────────────────────────────────

@monitoring_bp.route('/audits', methods=['GET'])
@jwt_required
def list_audits():
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM audits WHERE org_id=? ORDER BY scheduled_date",
            (g.org_id,)
        ).fetchall()
        return jsonify([dict(r) for r in rows]), 200
    finally:
        conn.close()


@monitoring_bp.route('/audits', methods=['POST'])
@jwt_required
@roles_required('ISMS_Owner')
def create_audit():
    data = request.get_json() or {}
    conn = get_db()
    try:
        count = conn.execute(
            "SELECT COUNT(*) as c FROM audits WHERE org_id=?", (g.org_id,)
        ).fetchone()['c']
        audit_id = f"AUD{str(count + 1).zfill(3)}"

        conn.execute(
            """INSERT INTO audits
               (audit_id, org_id, title, type, scope, scheduled_date,
                auditor, auditor_id, status, created_at, created_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (audit_id, g.org_id,
             data.get('title', ''), data.get('type', 'Internal'),
             data.get('scope', ''), data.get('scheduledDate', ''),
             data.get('auditor', ''), data.get('auditorId', ''),
             'Scheduled', now_iso(), g.user_id)
        )
        conn.commit()

        audit_helper.log(g.org_id, g.user_id, '', g.role,
                         'AUDIT_SCHEDULED', f"Audit scheduled: {data.get('title', '')}",
                         'audit', audit_id)

        return jsonify(dict(conn.execute(
            "SELECT * FROM audits WHERE audit_id=?", (audit_id,)
        ).fetchone())), 201
    finally:
        conn.close()


# ── Management Reviews ────────────────────────────────────────────────────────

@monitoring_bp.route('/management-reviews', methods=['GET'])
@jwt_required
def list_reviews():
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM management_reviews WHERE org_id=? ORDER BY review_date DESC",
            (g.org_id,)
        ).fetchall()
        result = []
        for r in rows:
            item = dict(r)
            item['attendees'] = json.loads(item.get('attendees') or '[]')
            item['agenda'] = json.loads(item.get('agenda') or '[]')
            result.append(item)
        return jsonify(result), 200
    finally:
        conn.close()


@monitoring_bp.route('/management-reviews', methods=['POST'])
@jwt_required
@roles_required('ISMS_Owner')
def create_review():
    data = request.get_json() or {}
    conn = get_db()
    try:
        review_id = str(uuid.uuid4())
        conn.execute(
            """INSERT INTO management_reviews
               (review_id, org_id, review_date, attendees, agenda,
                decisions, ai_draft_minutes, approved_by, created_at)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (review_id, g.org_id,
             data.get('reviewDate', now_iso()[:10]),
             json.dumps(data.get('attendees', [])),
             json.dumps(data.get('agenda', [])),
             data.get('decisions', ''),
             data.get('aiDraftMinutes', ''),
             data.get('approvedBy', ''),
             now_iso())
        )
        conn.commit()

        audit_helper.log(g.org_id, g.user_id, '', g.role,
                         'MANAGEMENT_REVIEW_CREATED',
                         f"Management review recorded: {data.get('reviewDate', '')}",
                         'review', review_id)

        return jsonify({'review_id': review_id}), 201
    finally:
        conn.close()
