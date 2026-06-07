"""
Seed the database with demo data for SafeRoute Logistics.
Run: python seed.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import uuid
import json
from datetime import datetime, timezone

from models import get_db, init_db
from services.auth_service import hash_password, now_iso


def seed():
    init_db()
    conn = get_db()

    # Check if already seeded
    existing = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()['c']
    if existing > 0:
        print("Database already seeded. Skipping.")
        conn.close()
        return

    org_id = "org-saferoute-001"
    users = [
        {
            'user_id': 'user-tinashe-001',
            'name': 'Tinashe Moyo',
            'email': 'tinashe@saferoute.co.zw',
            'role': 'ISMS_Owner',
            'password': 'password123',
        },
        {
            'user_id': 'user-kudzai-002',
            'name': 'Kudzai Mlambo',
            'email': 'kudzai@saferoute.co.zw',
            'role': 'Contributor',
            'password': 'password123',
        },
        {
            'user_id': 'user-chipo-003',
            'name': 'Chipo Ndlovu',
            'email': 'chipo@saferoute.co.zw',
            'role': 'Reviewer',
            'password': 'password123',
        },
        {
            'user_id': 'user-tatenda-004',
            'name': 'Tatenda Chitsa',
            'email': 'tatenda@saferoute.co.zw',
            'role': 'Auditor',
            'password': 'password123',
        },
    ]

    # Organisation
    scope = ['Customer & client data', 'Cloud services & SaaS', 'Employee personal data',
             'Financial records', 'Physical devices & hardware']
    conn.execute(
        """INSERT INTO organisations
           (org_id, name, sector, size, city, address, risk_appetite, scope, created_at)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        (org_id, 'SafeRoute Logistics', 'Logistics', '11-25',
         'Harare', '45 Samora Machel Ave, Harare CBD',
         'Standard', json.dumps(scope), now_iso())
    )

    # Users
    for u in users:
        conn.execute(
            """INSERT INTO users
               (user_id, org_id, name, email, password_hash, role, is_active, created_at)
               VALUES (?,?,?,?,?,?,1,?)""",
            (u['user_id'], org_id, u['name'], u['email'],
             hash_password(u['password']), u['role'], now_iso())
        )

    # ISMS Steps
    for step in range(1, 11):
        if step <= 3:
            status = 'Complete'
        elif step == 4:
            status = 'In Progress'
        else:
            status = 'Locked'
        conn.execute(
            """INSERT INTO isms_sessions (session_id, org_id, step_number, status)
               VALUES (?,?,?,?)""",
            (str(uuid.uuid4()), org_id, step, status)
        )

    # Risks
    risks_data = [
        ('R001', 'Customer database', 'Unauthorised access to customer PII', 'Weak access controls', 4, 5, 'High', 'Mitigate'),
        ('R002', 'File server', 'Ransomware encryption of business data', 'No off-site backups', 3, 5, 'High', 'Mitigate'),
        ('R003', 'Email system', 'Phishing attacks targeting staff credentials', 'Lack of MFA', 5, 3, 'High', 'Mitigate'),
        ('R004', 'Fleet management system', 'Unauthorised vehicle tracking data access', 'Default vendor passwords', 3, 4, 'High', 'Mitigate'),
        ('R005', 'Physical office', 'Tailgating into server room', 'Single door access, no badge required', 2, 4, 'Medium', 'Mitigate'),
        ('R006', 'Cloud accounting (Sage)', 'Session hijacking of financial system', 'No session timeout configured', 2, 5, 'Medium', 'Transfer'),
        ('R007', 'Employee laptops', 'Data theft from lost/stolen devices', 'No full-disk encryption', 3, 3, 'Medium', 'Mitigate'),
        ('R008', 'WhatsApp business groups', 'Sensitive client data shared on personal devices', 'No MDM policy', 4, 2, 'Medium', 'Accept'),
        ('R009', 'Generator / UPS', 'System unavailability during load-shedding', '8-12hr daily outages', 5, 2, 'Medium', 'Mitigate'),
        ('R010', 'Internet connection', 'MITM attack on unsecured Wi-Fi', 'Public Wi-Fi usage by staff', 2, 3, 'Low', 'Mitigate'),
        ('R011', 'Paper records', 'Unauthorised access to physical documents', 'No clean desk policy enforced', 2, 2, 'Low', 'Accept'),
        ('R012', 'Third-party courier API', 'Supply chain compromise via partner integration', 'No vendor security assessment', 1, 4, 'Low', 'Mitigate'),
    ]
    for r in risks_data:
        score = r[4] * r[5]
        conn.execute(
            """INSERT INTO risk_register
               (risk_id, org_id, asset, threat, vulnerability, likelihood, impact,
                risk_level, treatment, status, created_at, created_by)
               VALUES (?,?,?,?,?,?,?,?,?,'Open',?,?)""",
            (r[0], org_id, r[1], r[2], r[3], r[4], r[5], r[6], r[7], now_iso(), 'user-tinashe-001')
        )

    # Corrective Actions
    actions = [
        ('CA001', 'Implement MFA on all cloud systems', 'Enable multi-factor authentication for all staff on Google Workspace and Sage', 'R003', 'High', '2024-03-15', 'Open'),
        ('CA002', 'Deploy off-site backup solution', 'Configure automated daily backups to Cloudflare R2 or local NAS', 'R002', 'High', '2024-03-31', 'In Progress'),
        ('CA003', 'Implement clean desk policy', 'Communicate and enforce clean desk policy across all departments', 'R011', 'Low', '2024-04-15', 'Open'),
    ]
    for a in actions:
        conn.execute(
            """INSERT INTO corrective_actions
               (action_id, org_id, title, description, related_to, priority, due_date, status, created_at, created_by)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (a[0], org_id, a[1], a[2], a[3], a[4], a[5], a[6], now_iso(), 'user-tinashe-001')
        )

    # Incidents
    conn.execute(
        """INSERT INTO incidents
           (incident_id, org_id, title, description, severity, reported_by, reported_by_id, reported_date, status, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?)""",
        ('INC001', org_id, 'Suspicious login attempts detected',
         'Multiple failed login attempts from foreign IP addresses targeting admin accounts',
         'High', 'Kudzai Mlambo', 'user-kudzai-002', '2024-03-07', 'Under Investigation', now_iso())
    )
    conn.execute(
        """INSERT INTO incidents
           (incident_id, org_id, title, description, severity, reported_by, reported_by_id, reported_date, status, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?)""",
        ('INC002', org_id, 'Phishing email received',
         'Employee reported suspicious email claiming to be from CBZ Bank requesting account details',
         'Medium', 'Chipo Ndlovu', 'user-chipo-003', '2024-03-06', 'Resolved', now_iso())
    )

    # Internal Audit
    conn.execute(
        """INSERT INTO audits
           (audit_id, org_id, title, type, scope, scheduled_date, auditor, auditor_id, status, created_at, created_by)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        ('AUD001', org_id, 'Q1 2024 Internal Audit', 'Internal',
         'Access control and network security controls', '2024-03-25',
         'Tatenda Chitsa', 'user-tatenda-004', 'Scheduled', now_iso(), 'user-tinashe-001')
    )

    # Audit log entries
    log_entries = [
        ('LOGIN', 'user-tinashe-001', 'Tinashe Moyo', 'ISMS_Owner', 'User logged in successfully'),
        ('STEP_COMPLETE', 'user-tinashe-001', 'Tinashe Moyo', 'ISMS_Owner', 'Step 3: Risk Assessment Methodology marked Complete'),
        ('RISK_CREATED', 'user-kudzai-002', 'Kudzai Mlambo', 'Contributor', 'Risk R001 created: Unauthorised access to customer PII'),
        ('ROLE_CHANGE', 'user-tinashe-001', 'Tinashe Moyo', 'ISMS_Owner', 'Role changed: Tatenda Chitsa from Contributor to Auditor'),
    ]
    for action, uid, uname, urole, desc in log_entries:
        conn.execute(
            """INSERT INTO audit_log
               (log_id, org_id, user_id, user_name, user_role, action, description, timestamp)
               VALUES (?,?,?,?,?,?,?,?)""",
            (str(uuid.uuid4()), org_id, uid, uname, urole, action, desc, now_iso())
        )

    conn.commit()
    conn.close()

    print("✅ Database seeded successfully!")
    print("\n📋 Demo accounts:")
    for u in users:
        print(f"  {u['role']:15s}  {u['email']:35s}  password: {u['password']}")


if __name__ == '__main__':
    seed()
