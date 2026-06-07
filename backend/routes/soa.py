"""
Statement of Applicability routes.
Controls definition file lives in backend/data/ (self-contained — no frontend dependency).
"""
import json
import uuid
import os
import logging
from flask import Blueprint, request, jsonify, g
from models import get_db
from services.auth_service import jwt_required, roles_required, now_iso
from services import audit_helper

soa_bp = Blueprint('soa', __name__)
logger = logging.getLogger(__name__)

# Controls file now lives inside the backend package — no cross-package path dependency
CONTROLS_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'annex-a-controls.json')


def _load_controls() -> list:
    try:
        with open(CONTROLS_PATH) as f:
            return json.load(f)
    except Exception as e:
        logger.error("Failed to load Annex A controls from %s: %s", CONTROLS_PATH, e)
        return []


def _ensure_soa_entries(conn, org_id: str) -> None:
    """
    Seed all Annex A controls for an org if not already seeded.
    Checks the row count first so no INSERT statements run on subsequent calls.
    """
    count = conn.execute(
        "SELECT COUNT(*) as c FROM soa_entries WHERE org_id=?", (org_id,)
    ).fetchone()['c']

    controls = _load_controls()
    expected = len(controls)
    if count >= expected:
        return  # Already seeded — skip all inserts

    for ctrl in controls:
        conn.execute(
            """INSERT OR IGNORE INTO soa_entries
               (soa_id, org_id, annex_a_ref, control_name, category,
                applicable, implementation_status)
               VALUES (?,?,?,?,?,1,'Not Started')""",
            (str(uuid.uuid4()), org_id, ctrl['ref'], ctrl['name'], ctrl['category'])
        )
    conn.commit()
    logger.info("Seeded %d SoA entries for org %s", expected, org_id)


@soa_bp.route('/soa', methods=['GET'])
@jwt_required
def list_soa():
    conn = get_db()
    try:
        _ensure_soa_entries(conn, g.org_id)
        category = request.args.get('category', '')
        query = "SELECT * FROM soa_entries WHERE org_id=?"
        params: list = [g.org_id]
        if category:
            query += " AND category=?"
            params.append(category)
        query += " ORDER BY annex_a_ref"
        rows = conn.execute(query, params).fetchall()
        controls_by_ref = {c['ref']: c for c in _load_controls()}
        out = []
        for r in rows:
            d = dict(r)
            meta = controls_by_ref.get(d.get('annex_a_ref'), {})
            d['description'] = meta.get('description', '')
            out.append(d)
        return jsonify(out), 200
    finally:
        conn.close()


@soa_bp.route('/soa/<control_ref>', methods=['PATCH'])
@jwt_required
def update_soa_entry(control_ref):
    """
    ISMS_Owner: may update any field.
    Reviewer: may only update the justification field (their review comment).
    """
    if g.role not in ('ISMS_Owner', 'Reviewer'):
        return jsonify({'error': 'Permission denied'}), 403

    data = request.get_json() or {}

    # Enforce Reviewer restriction to justification-only writes
    if g.role == 'Reviewer':
        allowed_keys = {'justification'}
        disallowed = set(data.keys()) - allowed_keys
        if disallowed:
            return jsonify({
                'error': f'Reviewers may only update justification. Disallowed fields: {sorted(disallowed)}'
            }), 403

    conn = get_db()
    try:
        entry = conn.execute(
            "SELECT * FROM soa_entries WHERE org_id=? AND annex_a_ref=?",
            (g.org_id, control_ref)
        ).fetchone()
        if not entry:
            return jsonify({'error': 'Control not found'}), 404

        conn.execute(
            """UPDATE soa_entries SET
               applicable=?, justification=?, ai_draft=?,
               implementation_status=?, reviewed_by=?
               WHERE org_id=? AND annex_a_ref=?""",
            (data.get('applicable',            entry['applicable']),
             data.get('justification',         entry['justification']),
             data.get('ai_draft',              entry['ai_draft']),
             data.get('implementation_status', entry['implementation_status']),
             g.user_id,
             g.org_id, control_ref)
        )
        conn.commit()

        audit_helper.log(
            g.org_id, g.user_id, '', g.role,
            'SOA_UPDATED', f"SoA {control_ref} updated", 'soa', control_ref
        )

        updated = conn.execute(
            "SELECT * FROM soa_entries WHERE org_id=? AND annex_a_ref=?",
            (g.org_id, control_ref)
        ).fetchone()
        return jsonify(dict(updated)), 200
    finally:
        conn.close()


@soa_bp.route('/approvals', methods=['POST'])
@jwt_required
@roles_required('ISMS_Owner')
def approve_entry():
    data = request.get_json() or {}
    entity    = data.get('entity', '')
    entity_id = data.get('entityId', '')

    conn = get_db()
    try:
        if entity == 'soa':
            conn.execute(
                """UPDATE soa_entries SET human_approved=1, approved_by=?, approved_at=?
                   WHERE org_id=? AND annex_a_ref=?""",
                (g.user_id, now_iso(), g.org_id, entity_id)
            )
            conn.commit()
            audit_helper.log(
                g.org_id, g.user_id, '', g.role,
                'SOA_APPROVED', f"SoA control {entity_id} approved", 'soa', entity_id
            )
        elif entity == 'step':
            conn.execute(
                "UPDATE isms_sessions SET approved_by=? WHERE org_id=? AND step_number=?",
                (g.user_id, g.org_id, int(entity_id))
            )
            conn.commit()
            audit_helper.log(
                g.org_id, g.user_id, '', g.role,
                'APPROVAL_GRANTED', f"AI draft approved for Step {entity_id}", 'step', entity_id
            )

        return jsonify({'approved': True, 'entity': entity, 'entityId': entity_id}), 200
    finally:
        conn.close()


@soa_bp.route('/soa/stats', methods=['GET'])
@jwt_required
def soa_stats():
    conn = get_db()
    try:
        _ensure_soa_entries(conn, g.org_id)
        total = conn.execute(
            "SELECT COUNT(*) as c FROM soa_entries WHERE org_id=?", (g.org_id,)
        ).fetchone()['c']
        applicable = conn.execute(
            "SELECT COUNT(*) as c FROM soa_entries WHERE org_id=? AND applicable=1", (g.org_id,)
        ).fetchone()['c']
        approved = conn.execute(
            "SELECT COUNT(*) as c FROM soa_entries WHERE org_id=? AND human_approved=1", (g.org_id,)
        ).fetchone()['c']
        implemented = conn.execute(
            "SELECT COUNT(*) as c FROM soa_entries WHERE org_id=? AND implementation_status='Implemented'",
            (g.org_id,)
        ).fetchone()['c']
        return jsonify({
            'total': total, 'applicable': applicable,
            'notApplicable': total - applicable,
            'approved': approved, 'implemented': implemented,
        }), 200
    finally:
        conn.close()
