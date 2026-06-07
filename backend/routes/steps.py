"""
ISMS Compass — Steps routes
Fixes applied:
  1. POST /steps/<n>/complete now actually sets status='Complete' AND
     unlocks step N+1 by setting its status to 'In Progress'
  2. POST /steps/<n>/complete returns 400 if the previous step is not
     yet Complete (out-of-order protection)
  3. PUT /steps/<n>/draft persists form data to draft_data column
  4. GET /steps/<n> returns draft_data so frontend can restore form fields
"""
import json
import logging
from flask import Blueprint, request, jsonify, g
from models import get_db
from services.auth_service import jwt_required, roles_required, now_iso
from services import audit_helper

steps_bp = Blueprint('steps', __name__)
logger = logging.getLogger(__name__)

STEP_TITLES = {
    1: 'Organisational Context & Scope',
    2: 'Leadership & Policy',
    3: 'Risk Assessment Planning',
    4: 'Asset Inventory & Risk Assessment',
    5: 'Risk Treatment & Controls',
    6: 'Support (Resources, Competence, Communication, Documentation)',
    7: 'Operational Planning & Implementation',
    8: 'Performance Evaluation & Internal Audit',
    9: 'Improvement & Corrective Action',
    10: 'Statement of Applicability Review'
}

@steps_bp.route('/steps', methods=['GET'])
@jwt_required
def list_steps():
    """Return all 10 steps for the current org with their statuses."""
    conn = get_db()
    try:
        rows = conn.execute(
            """SELECT step_number, title, description, status,
                      progress, draft_data, approved_by, updated_at
               FROM isms_sessions
               WHERE org_id = ?
               ORDER BY step_number""",
            (g.org_id,)
        ).fetchall()
        steps = []
        for r in rows:
            s = dict(r)
            s['stepNumber'] = s.pop('step_number')
            if not s.get('title'):
                s['title'] = STEP_TITLES.get(s['stepNumber'], f"Step {s['stepNumber']}")
            # Parse draft_data JSON so frontend gets an object, not a string
            if s.get('draft_data'):
                try:
                    s['draft_data'] = json.loads(s['draft_data'])
                except (ValueError, TypeError):
                    s['draft_data'] = {}
            steps.append(s)
        return jsonify(steps), 200
    finally:
        conn.close()


@steps_bp.route('/steps/<int:step_number>', methods=['GET'])
@jwt_required
def get_step(step_number):
    """Return a single step with its draft_data."""
    conn = get_db()
    try:
        row = conn.execute(
            """SELECT step_number, title, description, status,
                      progress, draft_data, approved_by, updated_at
               FROM isms_sessions
               WHERE org_id = ? AND step_number = ?""",
            (g.org_id, step_number)
        ).fetchone()
        if not row:
            return jsonify({'error': f'Step {step_number} not found'}), 404
        step = dict(row)
        step['stepNumber'] = step.pop('step_number')
        if not step.get('title'):
            step['title'] = STEP_TITLES.get(step['stepNumber'], f"Step {step['stepNumber']}")
        
        if step.get('draft_data'):
            try:
                step['draft_data'] = json.loads(step['draft_data'])
            except (ValueError, TypeError):
                step['draft_data'] = {}
        return jsonify(step), 200
    finally:
        conn.close()


@steps_bp.route('/steps/<int:step_number>/draft', methods=['PUT'])
@jwt_required
def save_draft(step_number):
    """
    Save form field data for a step without marking it complete.
    Accessible by ISMS_Owner and Contributor.
    """
    if g.role not in ('ISMS_Owner', 'Contributor'):
        return jsonify({'error': 'Permission denied'}), 403

    if not (1 <= step_number <= 10):
        return jsonify({'error': 'Invalid step number'}), 400

    conn = get_db()
    try:
        row = conn.execute(
            "SELECT status FROM isms_sessions WHERE org_id=? AND step_number=?",
            (g.org_id, step_number)
        ).fetchone()
        if not row:
            return jsonify({'error': f'Step {step_number} not found'}), 404

        data = request.get_json() or {}
        draft_json = json.dumps(data)

        conn.execute(
            """UPDATE isms_sessions
               SET draft_data = ?, updated_at = ?
               WHERE org_id = ? AND step_number = ?""",
            (draft_json, now_iso(), g.org_id, step_number)
        )
        conn.commit()

        audit_helper.log(
            g.org_id, g.user_id, '', g.role,
            'STEP_DRAFT_SAVED',
            f'Step {step_number} draft saved',
            'step', str(step_number)
        )

        return jsonify({'saved': True, 'step_number': step_number}), 200
    finally:
        conn.close()


@steps_bp.route('/steps/<int:step_number>/complete', methods=['POST'])
@jwt_required
@roles_required('ISMS_Owner')
def complete_step(step_number):
    """
    Mark a step as Complete and unlock the next step.

    Rules enforced:
      - Step number must be 1–10
      - Step N-1 must already be Complete before step N can be completed
        (except step 1 which has no predecessor)
      - The request body is saved as draft_data before marking complete
      - Step N+1 is set to 'In Progress' after step N is completed
    """
    if not (1 <= step_number <= 10):
        return jsonify({'error': 'Invalid step number'}), 400

    conn = get_db()
    try:
        # ── Out-of-order guard ────────────────────────────────────────────────
        if step_number > 1:
            prev = conn.execute(
                """SELECT status FROM isms_sessions
                   WHERE org_id = ? AND step_number = ?""",
                (g.org_id, step_number - 1)
            ).fetchone()

            if not prev or prev['status'] != 'Complete':
                return jsonify({
                    'error': f'Step {step_number - 1} must be completed before '
                             f'you can complete step {step_number}'
                }), 400

        # ── Fetch the current step ────────────────────────────────────────────
        row = conn.execute(
            "SELECT * FROM isms_sessions WHERE org_id=? AND step_number=?",
            (g.org_id, step_number)
        ).fetchone()
        if not row:
            return jsonify({'error': f'Step {step_number} not found'}), 404

        # ── Save form data then mark Complete ─────────────────────────────────
        form_data = request.get_json() or {}
        draft_json = json.dumps(form_data)

        conn.execute(
            """UPDATE isms_sessions
               SET status = 'Complete',
                   draft_data = ?,
                   progress = 100,
                   updated_at = ?
               WHERE org_id = ? AND step_number = ?""",
            (draft_json, now_iso(), g.org_id, step_number)
        )

        # ── Unlock the next step ──────────────────────────────────────────────
        unlocked_next = None
        if step_number < 10:
            next_row = conn.execute(
                "SELECT * FROM isms_sessions WHERE org_id=? AND step_number=?",
                (g.org_id, step_number + 1)
            ).fetchone()

            if next_row and next_row['status'] in ('Not Started', 'Locked'):
                conn.execute(
                    """UPDATE isms_sessions
                       SET status = 'In Progress', updated_at = ?
                       WHERE org_id = ? AND step_number = ?""",
                    (now_iso(), g.org_id, step_number + 1)
                )
                unlocked_next = step_number + 1

        conn.commit()

        audit_helper.log(
            g.org_id, g.user_id, '', g.role,
            'STEP_COMPLETED',
            f'Step {step_number} marked complete',
            'step', str(step_number)
        )

        # Return both the completed step and the newly unlocked step
        response = {
            'completed_step': step_number,
            'status': 'Complete',
            'unlocked_step': unlocked_next,
            'message': (
                f'Step {step_number} complete. '
                f'Step {unlocked_next} is now unlocked.'
                if unlocked_next
                else f'Step {step_number} complete. All steps finished!'
            )
        }
        return jsonify(response), 200

    finally:
        conn.close()