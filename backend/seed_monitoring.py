"""
Seed monitoring data for SafeRoute Logistics demo.
Run: python seed_monitoring.py
"""
import sqlite3, uuid, json
from datetime import datetime, timezone

def now():
    return datetime.now(timezone.utc).isoformat()

conn = sqlite3.connect('isms_compass.db')
conn.row_factory = sqlite3.Row

ORG      = 'org-saferoute-001'
OWNER    = 'user-tinashe-001'
CONTRIB  = 'user-kudzai-002'
REVIEWER = 'user-chipo-003'
AUDITOR  = 'user-tatenda-004'

# ── Clear existing thin data ──────────────────────────────────────────────────
for t in ['incidents', 'corrective_actions', 'audits', 'management_reviews']:
    deleted = conn.execute(f'DELETE FROM {t} WHERE org_id=?', (ORG,)).rowcount
    print(f'  Cleared {deleted} existing rows from {t}')

# ── INCIDENTS (8) ─────────────────────────────────────────────────────────────
incidents = [
    ('INC001',
     'Phishing email targeting finance staff',
     'An employee in the Finance department received a spoofed email purporting to be from the CEO requesting an urgent EcoCash transfer of USD 2,400. The employee contacted IT before acting. Email headers confirmed external spoofing from a lookalike domain (safer0ute.co.zw).',
     'High', 'Chipo Mutasa', REVIEWER, '2025-01-14', 'Resolved',
     'Email blocked and domain reported to POTRAZ. DMARC policy tightened to p=reject. Finance staff received targeted BEC awareness refresher on 2025-01-20. Root cause: absence of DMARC enforcement.'),

    ('INC002',
     'Brute-force login attempts on fleet management system',
     'IT Admin detected 47 failed login attempts against the fleet management admin panel from an overseas IP over a 3-hour window on 2025-01-28. Account lockout triggered after 5 attempts. No breach confirmed.',
     'Medium', 'Kudzai Banda', CONTRIB, '2025-01-28', 'Resolved',
     'Brute-force blocked by account lockout policy. Source IP geo-blocked at firewall. Admin panel access restricted to VPN only. Evidence retained for 90 days. No data accessed.'),

    ('INC003',
     'Staff laptop lost in transit — Bulawayo route',
     'A company laptop was lost at Harare Roadport on 2025-02-11. The device was assigned to the Operations Supervisor and contained fleet route plans and contact data. Laptop was confirmed BitLocker-encrypted.',
     'High', 'Tinashe Moyo', OWNER, '2025-02-11', 'Resolved',
     'Remote wipe executed via Microsoft Intune within 4 hours. BitLocker encryption confirmed — data inaccessible. Incident reported to ZRP. New laptop issued. Staff reminded: laptops must travel as carry-on luggage only.'),

    ('INC004',
     'Sage Cloud accounting system — 4-hour outage',
     'Sage Cloud was inaccessible from 09:15 to 13:40 on 2025-02-19 due to a Sage-side infrastructure failure in the Johannesburg data centre. Finance was unable to process supplier payments during the outage.',
     'Medium', 'Chipo Mutasa', REVIEWER, '2025-02-19', 'Resolved',
     'Incident managed by Sage support. Payments processed on restoration. Gap identified: no manual payment approval fallback documented. SLA review with Sage initiated.'),

    ('INC005',
     'Malware detected on dispatch workstation',
     'Microsoft Defender raised a Trojan alert on workstation WS-DIS-07 at 14:32 on 2025-03-04. Workstation isolated from network within 8 minutes of detection.',
     'High', 'Kudzai Banda', CONTRIB, '2025-03-04', 'Resolved',
     'Threat quarantined and removed by Defender. Full scan confirmed no lateral movement or data exfiltration. Workstation reimaged from golden image. Root cause: employee downloaded unverified ZIP from unofficial supplier email. Application allowlisting policy enforcement accelerated.'),

    ('INC006',
     'Incorrect shipment manifest shared with wrong client',
     'An Operations Coordinator inadvertently attached the wrong client shipment manifest to an outbound email on 2025-03-17. The manifest contained consignment values and receiver addresses for 12 shipments.',
     'Medium', 'Tinashe Moyo', OWNER, '2025-03-17', 'Resolved',
     'Recipient contacted within 30 minutes and confirmed no further distribution. Affected client notified per CDPA Chapter 12:07 within 24 hours. Email recall attempted. Dual-check procedure added to dispatch SOP for all outbound client emails.'),

    ('INC007',
     'Generator fuel supply delayed — load-shedding impact',
     'Scheduled fuel delivery was delayed 6 hours on 2025-04-02. Generator exhausted fuel at 14:00; UPS sustained critical systems until graceful shutdown at 18:00. Operations disrupted for approximately 2 hours.',
     'Low', 'Kudzai Banda', CONTRIB, '2025-04-02', 'Closed',
     'Emergency fuel sourced from alternative supplier within 3 hours. Minimum fuel reserve raised from 150L to 200L. Monthly generator test now includes fuel level verification.'),

    ('INC008',
     'SharePoint document accidentally shared externally',
     'The ISMS Owner accidentally set a draft Risk Treatment Plan to "Anyone with a link" while testing sharing settings on 2025-04-21. The link was posted in an internal Teams channel before the error was identified.',
     'Low', 'Tinashe Moyo', OWNER, '2025-04-21', 'Resolved',
     'Sharing link revoked within 15 minutes. Access log confirmed no external access — link was effective for internal users only (external sharing was already disabled at tenant level). Logged as a near-miss. Staff reminder issued.'),
]

conn.executemany(
    'INSERT INTO incidents (incident_id, org_id, title, description, severity, reported_by, '
    'reported_by_id, reported_date, status, resolution, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [(i[0], ORG, i[1], i[2], i[3], i[4], i[5], i[6], i[7], i[8], now()) for i in incidents]
)
print(f'  Inserted {len(incidents)} incidents')

# ── CORRECTIVE ACTIONS (12) ───────────────────────────────────────────────────
# (id, title, description, source, assigned_to, assigned_to_id, due_date, status, priority, related_to, closed_at)
actions = [
    ('CA001', 'Enforce MFA on all cloud systems',
     'Enable multi-factor authentication for all 96 staff across Microsoft 365, Sage Cloud, and fleet management. Configure Conditional Access to block non-MFA logins.',
     'Risk', 'Kudzai Banda', CONTRIB, '2025-04-30', 'Closed', 'High', 'INC001 / R-Phishing', '2025-04-28'),

    ('CA002', 'Implement immutable daily backup with restore testing',
     'Configure daily encrypted backup to Bulawayo server with 30-day immutability lock. Establish monthly restore test with documented result. Configure automated backup success alert to IT Admin.',
     'Risk', 'Kudzai Banda', CONTRIB, '2025-04-15', 'Closed', 'High', 'Risk: Ransomware', '2025-04-12'),

    ('CA003', 'Deploy endpoint protection on all 47 devices',
     'Activate Microsoft Defender for Business on all company laptops. Configure real-time protection, weekly scheduled scans, and automatic definition updates. Verify via Intune compliance report.',
     'Risk', 'Kudzai Banda', CONTRIB, '2025-03-31', 'Closed', 'High', 'INC005 / Risk: Malware', '2025-03-29'),

    ('CA004', 'Complete BitLocker enforcement on all laptops',
     'Enrol remaining 6 unmanaged laptops into Intune MDM. Apply BitLocker Device Encryption policy. Verify compliance status. Update asset register with encryption status for all 47 devices.',
     'Risk', 'Kudzai Banda', CONTRIB, '2025-05-31', 'In Progress', 'High', 'INC003 / Risk: Laptop theft', None),

    ('CA005', 'Document BCP manual dispatch fallback procedure',
     'Write and test a manual dispatch procedure for fleet management system outages. Cover: paper manifest creation, driver comms via WhatsApp, and client notification template. Train all dispatchers.',
     'Audit', 'Tinashe Moyo', OWNER, '2025-07-31', 'In Progress', 'Medium', 'Risk: Fleet system outage', None),

    ('CA006', 'Restrict SharePoint external sharing at tenant level',
     'Configure SharePoint admin centre to disable external sharing for all site collections. Communicate to all staff. Implement quarterly audit log review to detect accidental sharing.',
     'Incident', 'Kudzai Banda', CONTRIB, '2025-05-15', 'Closed', 'Medium', 'INC008', '2025-05-02'),

    ('CA007', 'Implement DMARC p=reject on saferoute.co.zw',
     'Progress DMARC from p=quarantine to p=reject after 30-day monitoring period. Verify SPF and DKIM alignment. Configure aggregate report delivery to IT Admin mailbox.',
     'Incident', 'Kudzai Banda', CONTRIB, '2025-06-30', 'In Progress', 'High', 'INC001 / Risk: BEC', None),

    ('CA008', 'Document DSAR handling procedure (CDPA compliance)',
     'Write a formal Data Subject Access Request procedure: 30-day response target, identity verification, data extraction steps, and response template. Train HR Manager. Conduct a simulated DSAR exercise.',
     'Compliance', 'Chipo Mutasa', REVIEWER, '2025-06-30', 'In Progress', 'Medium', 'CDPA Chapter 12:07', None),

    ('CA009', 'Conduct vendor security assessment for courier API partner',
     'Send information security questionnaire to courier API partner. Assess against minimum security baseline. Add security clause to service agreement at next contract renewal (August 2025).',
     'Risk', 'Kudzai Banda', CONTRIB, '2025-07-31', 'Open', 'Medium', 'Risk: Supply chain', None),

    ('CA010', 'Document IT runbooks for all critical tasks',
     'Create procedures for: server backup, user provisioning, AD password reset, firewall changes, server restart, and Intune enrolment. Store in password-protected SharePoint. Cross-train one Operations staff member on basic recovery tasks.',
     'Risk', 'Kudzai Banda', CONTRIB, '2025-08-31', 'In Progress', 'High', 'Risk: Key-person dependency', None),

    ('CA011', 'Add caller verification procedure to dispatch SOP',
     'Update dispatch SOP to require caller identity verification before releasing shipment information. Post verification checklist at all dispatch workstations.',
     'Incident', 'Tinashe Moyo', OWNER, '2025-06-30', 'Closed', 'Medium', 'INC006 / Risk: Social engineering', '2025-07-24'),

    ('CA012', 'Establish emergency fuel supplier contact list',
     'Maintain emergency fuel contact list with at least two alternative suppliers. Negotiate priority delivery agreement. Review quarterly. Raise minimum generator fuel reserve to 200L.',
     'Incident', 'Kudzai Banda', CONTRIB, '2025-05-31', 'Closed', 'Low', 'INC007', '2025-05-10'),
]

conn.executemany(
    'INSERT INTO corrective_actions (action_id, org_id, title, description, source, assigned_to, '
    'assigned_to_id, due_date, status, priority, related_to, closed_at, created_at, created_by) '
    'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [(a[0], ORG, a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], now(), OWNER)
     for a in actions]
)
print(f'  Inserted {len(actions)} corrective actions')

# ── AUDITS (4) ────────────────────────────────────────────────────────────────
audits = [
    ('AUD001',
     'Q4 2024 Internal Audit — Access Control & Physical Security',
     'Internal',
     'Clause 9.2 audit covering Annex A controls A.5.15-A.5.18 (Identity & Access Management) and A.7.1-A.7.3 (Physical Security) at Harare HQ and Bulawayo depot.',
     '2024-11-20', 'Tatenda Chitsa', AUDITOR, 'Completed',
     'NC-1 (Minor): Server room access log not consistently maintained — 3 entries missing in October. '
     'NC-2 (Minor): 4 user accounts not disabled within SLA after staff departure. '
     'Observation: Clean desk policy compliance improved to 87% from 61% in Q2 2024. Both NCs closed.'),

    ('AUD002',
     'Q1 2025 Internal Audit — Risk Management & Incident Response',
     'Internal',
     'Clause 9.2 audit covering ISO 27001:2022 Clauses 6.1 (Risk Assessment), 8.1 (Operational Planning), and 6.2 (Risk Treatment). Scope includes risk register completeness, CA status, and incident log review.',
     '2025-03-12', 'Tatenda Chitsa', AUDITOR, 'Completed',
     'NC-1 (Minor): Risk treatment plans missing for 5 risks (now remediated). '
     'NC-2 (Minor): Incident INC003 closure documentation incomplete at time of audit. '
     'Positive finding: phishing simulation click rate reduced from 31% to 12%. '
     'Recommendation: formalise evidence collection procedure (raised as CA008).'),

    ('AUD003',
     'Q2 2025 Internal Audit — SoA Review & Supplier Management',
     'Internal',
     'Clause 9.2 audit covering SoA completeness, supplier security assessments (A.5.19-A.5.23), and corrective action closure rates.',
     '2025-06-18', 'Tatenda Chitsa', AUDITOR, 'Completed',
     'Zero major NCs. One minor NC: supplier assessment for courier API partner outstanding (CA009 extended). '
     'All mandatory documentation confirmed complete. Organisation assessed as ready for Stage 1 external audit.'),

    ('AUD004',
     'SAZ ISO 27001:2022 Stage 1 Certification Audit',
     'External',
     'Stage 1 document review by Standards Association of Zimbabwe (SAZ) accredited certification body. '
     'Covers ISMS documentation, scope statement, SoA completeness, management commitment evidence, and risk assessment methodology.',
     '2025-08-06', 'SAZ Certification Body', None, 'Scheduled', None),
]

conn.executemany(
    'INSERT INTO audits (audit_id, org_id, title, type, scope, scheduled_date, auditor, '
    'auditor_id, status, findings, created_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [(a[0], ORG, a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], now(), OWNER) for a in audits]
)
print(f'  Inserted {len(audits)} audits')

# ── MANAGEMENT REVIEWS (3) ────────────────────────────────────────────────────
reviews = [
    ('2025-01-31',
     ['Tinashe Moyo (ISMS Owner)', 'Kudzai Banda (IT Admin)', 'Chipo Mutasa (Finance / DPO)',
      'Farai Sibanda (Operations Manager)', 'Josephine Ncube (Board Representative)'],
     ['1. Q4 2024 Internal Audit findings and NC closure status',
      '2. Risk register review — 12 risks, 3 High outstanding',
      '3. ISMS implementation progress (Steps 1-5 complete)',
      '4. Budget review: USD 8,000 approved, USD 3,200 spent',
      '5. Incidents INC001, INC002 review',
      '6. Certification timeline confirmation'],
     'Decision 1: Approved risk treatment plans for all High risks with named owners. '
     'Decision 2: Confirmed ISO 27001:2022 certification target August 2025 (SAZ Stage 1). '
     'Decision 3: Additional USD 800 approved for Microsoft Defender for Business Plan 1. '
     'Decision 4: Internal audit schedule confirmed: Q1 March, Q2 June, external Stage 1 August. '
     'Decision 5: Accepted risk for A.5.7 (threat intelligence) pending Year 2 budget.',
     'MANAGEMENT REVIEW MINUTES — 31 January 2025\nVenue: Harare HQ Boardroom\n\n'
     '1. ISMS PERFORMANCE\nSteps 1-5 complete. Risk register: 12 risks, 3 High. CAs on track.\n\n'
     '2. Q4 AUDIT\nNC-1 (server room log) closed. NC-2 (deprovisioning delay) in progress, target 31 March.\n\n'
     '3. RESOURCES\nUSD 3,200 of USD 8,000 expended. Additional USD 800 approved for Defender licence.\n\n'
     '4. CERTIFICATION\nSAZ Stage 1 audit confirmed August 2025. ISMS Owner to engage SAZ by 28 February.\n\n'
     'Adjourned: 11:45. Next review: 30 April 2025.',
     'Tinashe Moyo'),

    ('2025-04-30',
     ['Tinashe Moyo (ISMS Owner)', 'Kudzai Banda (IT Admin)', 'Chipo Mutasa (Finance / DPO)',
      'Farai Sibanda (Operations Manager)', 'Josephine Ncube (Board Representative)'],
     ['1. Q1 2025 Internal Audit results and CA status',
      '2. Incident review: INC003-INC006',
      '3. Risk register update — 27 risks following asset-based expansion',
      '4. SoA progress: 48 Implemented, 23 In Progress, 20 Not Applicable',
      '5. Certification readiness assessment',
      '6. Staff training completion: 98% (94/96 staff)'],
     'Decision 1: Q1 audit NCs accepted; CA005 and CA008 created. '
     'Decision 2: INC003 remote wipe effective — CA004 BitLocker enforcement target 31 May. '
     'Decision 3: Risk register expanded to 27 risks; all High risks have treatment plans. '
     'Decision 4: SoA at 66% implemented — target 75% by August Stage 1 audit. '
     'Decision 5: Stage 1 audit date confirmed 6 August 2025. Pre-audit checklist due 31 July. '
     'Decision 6: Two outstanding training completions — HR to follow up within 7 days.',
     'MANAGEMENT REVIEW MINUTES — 30 April 2025\nVenue: Harare HQ Boardroom\n\n'
     '1. Q1 INTERNAL AUDIT\n2 minor NCs both remediated. Phishing click rate down 31% to 12%.\n\n'
     '2. INCIDENTS\nINC003 laptop loss: BitLocker prevented breach. INC005 malware contained in 8 mins. '
     'INC006 data sharing error: CDPA notification issued, no regulatory action.\n\n'
     '3. RISK REGISTER\n27 risks: 8 High, 12 Medium, 7 Low. All High risks have named owners.\n\n'
     '4. SoA\n48/73 applicable controls Implemented (66%). Target 75% by July.\n\n'
     '5. CERTIFICATION\nStage 1: 6 August 2025. Pre-audit checklist under development.\n\n'
     'Adjourned: 12:15. Next review: 31 July 2025.',
     'Tinashe Moyo'),

    ('2025-07-31',
     ['Tinashe Moyo (ISMS Owner)', 'Kudzai Banda (IT Admin)', 'Chipo Mutasa (Finance / DPO)',
      'Farai Sibanda (Operations Manager)', 'Josephine Ncube (Board Representative)',
      'Blessing Mubaiwa (External ISO 27001 Consultant)'],
     ['1. Q2 2025 Internal Audit results',
      '2. Pre-certification readiness assessment',
      '3. SoA final review and board approval',
      '4. Outstanding corrective actions — final closure review',
      '5. Stage 1 audit logistics confirmation (6 August 2025)',
      '6. Year 2 ISMS budget planning'],
     'Decision 1: Q2 audit accepted — zero major NCs. CA009 extended to 15 August. '
     'Decision 2: Organisation assessed GREEN for certification readiness by external consultant. '
     'Decision 3: SoA approved by Board Representative Josephine Ncube for submission to SAZ. '
     'Decision 4: CA011 closed at this meeting. Remaining 4 CAs on track. '
     'Decision 5: Stage 1 audit 6 August confirmed. Full documentation pack ready. '
     'Decision 6: Year 2 ISMS budget USD 12,000 agreed in principle — includes SIEM, training, Stage 2 fees.',
     'MANAGEMENT REVIEW MINUTES — 31 July 2025\nVenue: Harare HQ Boardroom\n\n'
     '1. Q2 INTERNAL AUDIT\nZero major NCs. One minor NC: CA009 supplier assessment extended to 15 August.\n\n'
     '2. CERTIFICATION READINESS\nExternal consultant Blessing Mubaiwa confirmed documentation complete and ready for Stage 1.\n\n'
     '3. SoA\n68/73 applicable controls Implemented or In Progress. 5 controls Not Started with risk acceptance rationale.\n\n'
     '4. CORRECTIVE ACTIONS\n8/12 closed. CA011 closed at this meeting following dispatcher training 24 July.\n\n'
     '5. STAGE 1 AUDIT\n6 August 2025. Documentation pack reviewed by consultant.\n\n'
     '6. YEAR 2 BUDGET\nUSD 12,000 agreed in principle. Formal board approval at AGM September 2025.\n\n'
     'Adjourned: 13:00.',
     'Tinashe Moyo'),
]

conn.executemany(
    'INSERT INTO management_reviews (review_id, org_id, review_date, attendees, agenda, '
    'decisions, ai_draft_minutes, approved_by, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    [(str(uuid.uuid4()), ORG, r[0], json.dumps(r[1]), json.dumps(r[2]), r[3], r[4], r[5], now())
     for r in reviews]
)
print(f'  Inserted {len(reviews)} management reviews')

conn.commit()
conn.close()
print()
print('Monitoring seeded successfully for SafeRoute Logistics.')
