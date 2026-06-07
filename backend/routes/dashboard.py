from flask import Blueprint, jsonify, g
from models import get_db
from services.auth_service import jwt_required

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/dashboard/metrics', methods=['GET'])
@jwt_required
def get_metrics():
    conn = get_db()
    try:
        org_id = g.org_id

        # Steps complete
        steps_complete = conn.execute(
            "SELECT COUNT(*) as c FROM isms_sessions WHERE org_id=? AND status='Complete'",
            (org_id,)
        ).fetchone()['c']

        # Total risks
        total_risks = conn.execute(
            "SELECT COUNT(*) as c FROM risk_register WHERE org_id=?", (org_id,)
        ).fetchone()['c']

        high_risks = conn.execute(
            "SELECT COUNT(*) as c FROM risk_register WHERE org_id=? AND risk_level IN ('High','Critical')",
            (org_id,)
        ).fetchone()['c']

        # Compliance score: % of applicable SoA controls that are Implemented
        applicable = conn.execute(
            "SELECT COUNT(*) as c FROM soa_entries WHERE org_id=? AND applicable=1", (org_id,)
        ).fetchone()['c']
        implemented = conn.execute(
            "SELECT COUNT(*) as c FROM soa_entries WHERE org_id=? AND applicable=1 AND implementation_status='Implemented'",
            (org_id,)
        ).fetchone()['c']
        compliance_score = round((implemented / applicable * 100) if applicable > 0 else 0)

        # Open corrective actions
        open_actions = conn.execute(
            "SELECT COUNT(*) as c FROM corrective_actions WHERE org_id=? AND status != 'Closed'",
            (org_id,)
        ).fetchone()['c']

        # Overdue actions
        overdue = conn.execute(
            """SELECT COUNT(*) as c FROM corrective_actions
               WHERE org_id=? AND status != 'Closed' AND due_date < date('now')""",
            (org_id,)
        ).fetchone()['c']

        # Total evaluated controls
        controls_defined = conn.execute(
            "SELECT COUNT(*) as c FROM soa_entries WHERE org_id=?", (org_id,)
        ).fetchone()['c']

        return jsonify({
            'stepsComplete': steps_complete,
            'totalSteps': 10,
            'totalRisks': total_risks,
            'highRisks': high_risks,
            'complianceScore': compliance_score,
            'openActions': open_actions,
            'overdueActions': overdue,
            'controlsDefined': controls_defined,
            'totalControls': 93,
        }), 200
    finally:
        conn.close()


@dashboard_bp.route('/dashboard/open-actions', methods=['GET'])
@jwt_required
def get_open_actions():
    conn = get_db()
    try:
        rows = conn.execute(
            """SELECT * FROM corrective_actions
               WHERE org_id=? AND status != 'Closed'
               ORDER BY due_date ASC LIMIT 5""",
            (g.org_id,)
        ).fetchall()
        return jsonify([dict(r) for r in rows]), 200
    finally:
        conn.close()


@dashboard_bp.route('/dashboard/risk-heatmap', methods=['GET'])
@jwt_required
def get_risk_heatmap():
    conn = get_db()
    try:
        risks = conn.execute(
            "SELECT likelihood, impact, score FROM risk_register WHERE org_id=?",
            (g.org_id,)
        ).fetchall()
        # Return as list of {likelihood, impact, count}
        cells: dict = {}
        for r in risks:
            key = f"{r['likelihood']}-{r['impact']}"
            cells[key] = cells.get(key, 0) + 1
        result = [{'likelihood': int(k.split('-')[0]), 'impact': int(k.split('-')[1]), 'count': v}
                  for k, v in cells.items()]
        return jsonify(result), 200
    finally:
        conn.close()


# ── Sector-specific recommendation library ────────────────────────────────────
_SECTOR_TIPS: dict[str, list[str]] = {
    'Logistics': [
        'Encrypt GPS and telematics data transmitted by your vehicle fleet',
        'Deploy mobile device management (MDM) for field and driver devices',
        'Implement load-shedding power backup for critical dispatch systems',
        'Apply route-data access controls to protect customer shipment details',
    ],
    'Finance': [
        'Enable multi-factor authentication on all payment and banking portals',
        'Segment your network to isolate cardholder and transaction data',
        'Schedule quarterly penetration tests on internet-facing systems',
        'Ensure PCI DSS controls align with your ISO 27001 Annex A mapping',
    ],
    'Healthcare': [
        'Encrypt patient records at rest and in transit (AES-256 minimum)',
        'Enforce role-based access control on all clinical information systems',
        'Maintain audit trails for all access to patient data',
        'Test your disaster-recovery plan against ransomware scenarios',
    ],
    'Government': [
        'Apply strict data classification policies for sensitive citizen data',
        'Implement privileged access management (PAM) for administrator accounts',
        'Conduct regular security awareness training for all public servants',
        'Enforce secure-by-design principles on citizen-facing portals',
    ],
    'Education': [
        'Protect student personal data with RBAC and data-minimisation policies',
        'Segment campus Wi-Fi networks to isolate administrative systems',
        'Run phishing-simulation exercises for staff and faculty',
        'Maintain an up-to-date software asset inventory to patch vulnerabilities',
    ],
    'Retail': [
        'Secure point-of-sale devices with application whitelisting',
        'Tokenise payment card data to reduce PCI DSS scope',
        'Enforce strong supplier security assessments for e-commerce integrations',
        'Monitor for skimming attacks and anomalous transaction patterns',
    ],
    'Technology': [
        'Adopt a zero-trust network architecture for remote development teams',
        'Integrate SAST and DAST scans into your CI/CD pipelines',
        'Manage open-source dependency risks with automated SCA tools',
        'Enforce secrets management (e.g. Vault) to prevent credential leaks',
    ],
    'Manufacturing': [
        'Segment OT/SCADA networks from corporate IT environments',
        'Apply firmware signing and integrity checks on industrial controllers',
        'Establish an OT-specific incident-response procedure',
        'Conduct regular physical-security audits of production-floor systems',
    ],
}

_DEFAULT_TIPS = [
    'Define and communicate a clear information security policy to all staff',
    'Conduct a full asset inventory and assign information asset owners',
    'Implement multi-factor authentication across critical systems',
    'Establish a formal incident response and escalation procedure',
]


@dashboard_bp.route('/dashboard/ai-insights', methods=['GET'])
@jwt_required
def get_ai_insights():
    """Return dynamic, context-aware AI insight bullets for the dashboard card."""
    conn = get_db()
    try:
        org_id = g.org_id

        org = conn.execute(
            "SELECT name, sector, city FROM organisations WHERE org_id=?", (org_id,)
        ).fetchone()

        applicable = conn.execute(
            "SELECT COUNT(*) as c FROM soa_entries WHERE org_id=? AND applicable=1", (org_id,)
        ).fetchone()['c']
        implemented = conn.execute(
            "SELECT COUNT(*) as c FROM soa_entries WHERE org_id=? AND applicable=1 AND implementation_status='Implemented'",
            (org_id,)
        ).fetchone()['c']
        compliance_score = round((implemented / applicable * 100) if applicable > 0 else 0)

        high_risks = conn.execute(
            "SELECT COUNT(*) as c FROM risk_register WHERE org_id=? AND risk_level IN ('High','Critical')",
            (org_id,)
        ).fetchone()['c']

        overdue = conn.execute(
            """SELECT COUNT(*) as c FROM corrective_actions
               WHERE org_id=? AND status != 'Closed' AND due_date < date('now')""",
            (org_id,)
        ).fetchone()['c']

        sector = (org['sector'] if org else '') or ''
        city    = (org['city']   if org else '') or ''
        org_name = (org['name']  if org else '') or 'Your organisation'

        # Pick sector-specific tips (first 3) or fall back to defaults
        tips = _SECTOR_TIPS.get(sector, _DEFAULT_TIPS)[:3]

        # Build the context summary sentence
        location_str = f' in {city}' if city else ''
        sector_str   = f'{sector} operations' if sector else 'operations'
        intro = (
            f'Based on {org_name}\'s {sector_str}{location_str}, '
            'consider the following priorities:'
        )

        # Append data-driven observations
        observations = []
        if compliance_score < 50:
            observations.append(
                f'Your compliance score is {compliance_score}% — focus on implementing '
                'outstanding Annex A controls to close the gap.'
            )
        if high_risks > 3:
            observations.append(
                f'You have {high_risks} High/Critical risks open — prioritise risk treatment '
                'plans and assign clear owners.'
            )
        if overdue > 0:
            observations.append(
                f'{overdue} corrective action{"s are" if overdue > 1 else " is"} overdue '
                '— review and update due dates or escalate to management.'
            )

        return jsonify({
            'intro': intro,
            'tips': tips,
            'observations': observations,
            'sector': sector,
            'city': city,
            'orgName': org_name,
            'complianceScore': compliance_score,
        }), 200
    finally:
        conn.close()
