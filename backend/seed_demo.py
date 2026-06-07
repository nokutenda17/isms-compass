"""
ISMS Compass — Viva Demo Seeder
Marks all 10 steps as Complete with realistic SafeRoute Logistics data.
Run from the backend folder:
    python seed_demo.py
"""
import sqlite3
import json
import os
import uuid
from datetime import datetime, timezone

DB_PATH = os.environ.get('DATABASE_URL', 'isms_compass.db')


def now():
    return datetime.now(timezone.utc).isoformat()


STEP_DATA = {
    1: {
        "title": "Organisational Context & Scope",
        "draft_data": {
            "organisation_name": "SafeRoute Logistics (Pvt) Ltd",
            "industry_sector": "Logistics and Transportation",
            "organisation_size": "51-100 employees",
            "primary_location": "Harare, Zimbabwe",
            "other_locations": "Bulawayo depot, Mutare border post office",
            "mission_statement": "To provide reliable, secure, and efficient logistics solutions across Zimbabwe and the SADC region.",
            "internal_context": "SafeRoute operates a mixed fleet of 40 vehicles with GPS tracking. Core systems include a fleet management platform, customer portal, and financial system. Staff are semi-technical with varying levels of digital literacy.",
            "external_context": "Operating in a high-inflation environment with frequent load shedding (8-12 hours daily). Subject to increasing cybercrime targeting logistics companies in the region. Key clients include NGOs, retailers, and government departments.",
            "interested_parties": "Customers, employees, Reserve Bank of Zimbabwe, ZIMRA, fuel suppliers, insurance providers, vehicle tracking vendors",
            "isms_scope": "The ISMS covers all information assets supporting the logistics management, customer data processing, and financial operations of SafeRoute Logistics (Pvt) Ltd at its Harare headquarters and Bulawayo depot. Excluded: personal devices not issued by the company.",
            "applicable_legislation": "Zimbabwe Cyber and Data Protection Act (Chapter 12:07), Zimbabwe Electronic Transactions and Electronic Commerce Act (Chapter 13:22), Companies and Other Business Entities Act (Chapter 24:31)",
            "scope_boundaries": "In scope: company-issued devices, internal network, cloud applications, customer database, financial systems. Out of scope: personal mobile phones, third-party carrier networks.",
            "key_stakeholders": "Board of Directors, Operations Manager, IT Administrator, Finance Manager, Fleet Supervisors"
        }
    },
    2: {
        "title": "Leadership & Information Security Policy",
        "draft_data": {
            "policy_statement": "SafeRoute Logistics (Pvt) Ltd is committed to protecting the confidentiality, integrity, and availability of all information assets entrusted to us by our clients, employees, and partners. The Board of Directors provides full support for the implementation and continual improvement of our Information Security Management System in accordance with ISO/IEC 27001:2022.",
            "isms_owner": "Tinashe Moyo - Operations Director",
            "security_objectives": "1. Protect customer shipment and personal data from unauthorised disclosure.\n2. Ensure system availability of at least 95% during business hours despite load shedding.\n3. Achieve zero critical security incidents in the first year of ISMS operation.\n4. Train all staff in information security awareness within 6 months.",
            "management_commitment": "The Board of Directors has allocated a dedicated budget of USD 8,000 for ISMS implementation and has appointed the Operations Director as ISMS Owner with full authority to enforce security policies.",
            "policy_review_frequency": "Annually or following a significant security incident",
            "policy_distribution": "All staff via email, printed copies at reception and depot, accessible on internal SharePoint",
            "roles_and_responsibilities": "ISMS Owner: Tinashe Moyo\nIT Security Lead: Kudzai Banda\nData Protection Officer: Chipo Mutasa\nInternal Auditor: Tatenda Chikwanda",
            "approved_by": "Tinashe Moyo, Operations Director",
            "approval_date": "2025-01-15"
        }
    },
    3: {
        "title": "Risk Assessment Planning",
        "draft_data": {
            "risk_methodology": "Asset-based risk assessment using a 5x5 likelihood-impact matrix. Risk score = Likelihood x Impact. Scores 1-4: Low, 5-9: Medium, 10-16: High, 17-25: Critical.",
            "risk_appetite": "Standard - the organisation accepts Low risks without treatment, applies cost-effective controls to Medium risks, and mandates treatment for High and Critical risks.",
            "risk_acceptance_criteria": "Risks scoring 1-6 (Low/Medium) may be accepted with documented justification. Risks scoring 7 or above (High/Critical) require a treatment plan with an assigned owner and completion date.",
            "risk_assessment_frequency": "Full assessment annually. Ad hoc assessment following: new system deployment, security incident, significant organisational change, or new regulatory requirement.",
            "assessment_team": "ISMS Owner, IT Administrator, Operations Manager, Finance Manager",
            "asset_categories": "Hardware (laptops, servers, GPS devices), Software (fleet management system, financial system, email), Data (customer records, shipment data, financial data), People (staff, contractors), Facilities (Harare office, Bulawayo depot)",
            "threat_sources": "External attackers, malicious insiders, accidental human error, environmental threats (power outages, flooding), third-party failures",
            "methodology_reference": "ISO/IEC 27005:2022 Information Security Risk Management"
        }
    },
    4: {
        "title": "Asset Inventory & Risk Assessment",
        "draft_data": {
            "assets": [
                {"name": "Customer database (PostgreSQL)",       "type": "Data",      "owner": "Tinashe Moyo",   "sensitivity": "Critical"},
                {"name": "Fleet management system",              "type": "Software",  "owner": "Kudzai Banda",   "sensitivity": "Critical"},
                {"name": "Sage Cloud accounting system",         "type": "Software",  "owner": "Chipo Mutasa",   "sensitivity": "Critical"},
                {"name": "GPS tracking platform",                "type": "Software",  "owner": "Kudzai Banda",   "sensitivity": "High"},
                {"name": "Microsoft 365 (email & SharePoint)",   "type": "Service",   "owner": "Kudzai Banda",   "sensitivity": "High"},
                {"name": "Customer shipment records",            "type": "Data",      "owner": "Tinashe Moyo",   "sensitivity": "Critical"},
                {"name": "Employee personal data (HR records)",  "type": "Data",      "owner": "Chipo Mutasa",   "sensitivity": "High"},
                {"name": "Financial records & payroll data",     "type": "Data",      "owner": "Chipo Mutasa",   "sensitivity": "Critical"},
                {"name": "Primary file server (Harare HQ)",      "type": "Hardware",  "owner": "Kudzai Banda",   "sensitivity": "High"},
                {"name": "Bulawayo depot server",                "type": "Hardware",  "owner": "Kudzai Banda",   "sensitivity": "Medium"},
                {"name": "Staff laptops (47 devices)",           "type": "Hardware",  "owner": "Kudzai Banda",   "sensitivity": "High"},
                {"name": "GPS tracking hardware (fleet devices)","type": "Hardware",  "owner": "Kudzai Banda",   "sensitivity": "Medium"},
                {"name": "Diesel generator & UPS systems",       "type": "Hardware",  "owner": "Kudzai Banda",   "sensitivity": "High"},
                {"name": "Network firewall & switches",          "type": "Hardware",  "owner": "Kudzai Banda",   "sensitivity": "High"},
                {"name": "Harare HQ server room",               "type": "Facilities","owner": "Tinashe Moyo",   "sensitivity": "High"},
                {"name": "Bulawayo depot premises",             "type": "Facilities","owner": "Tinashe Moyo",   "sensitivity": "Medium"},
                {"name": "IT Administrator",                    "type": "People",    "owner": "Tinashe Moyo",   "sensitivity": "High"},
                {"name": "Operations & dispatch staff (62)",    "type": "People",    "owner": "Tinashe Moyo",   "sensitivity": "Medium"},
                {"name": "Third-party courier API integration", "type": "Service",   "owner": "Kudzai Banda",   "sensitivity": "Medium"},
                {"name": "Cloud backup service (offsite)",      "type": "Service",   "owner": "Kudzai Banda",   "sensitivity": "High"}
            ]
        }
    },
    5: {
        "title": "Risk Treatment & Controls",
        "draft_data": {
            "treatment_approach": "Risks are treated using a combination of technical controls, procedural controls, and risk transfer through insurance. All High and Critical risks have assigned owners and completion dates.",
            "treatment_decisions": "Mitigate: 18 risks\nAccept: 4 risks (all Low)\nTransfer: 1 risk (cyber insurance for ransomware impact)",
            "key_controls_selected": "A.8.7 Protection against malware - Deploy endpoint protection on all company devices\nA.8.20 Networks security - Implement network segmentation between customer-facing and internal systems\nA.5.17 Authentication - Enforce MFA on all cloud applications\nA.8.13 Information backup - Daily encrypted backups to offsite location\nA.6.3 Information security awareness - Quarterly staff training programme",
            "annex_a_controls_selected": "31 of 93 controls selected as applicable",
            "residual_risk_assessment": "After planned controls, 20 of 23 risks will be reduced to Low or Medium. Three High risks will remain elevated pending vendor patches.",
            "treatment_budget": "USD 6,200 allocated for technical controls. USD 1,800 for training and awareness.",
            "treatment_timeline": "Phase 1 (Month 1-2): MFA, backup system, antivirus\nPhase 2 (Month 3-4): Network segmentation, staff training\nPhase 3 (Month 5-6): Monitoring tools, policy rollout",
            "treatment_owner": "Kudzai Banda - IT Administrator"
        }
    },
    6: {
        "title": "Support - Resources, Competence & Communication",
        "draft_data": {
            "resources_allocated": "USD 8,000 ISMS implementation budget approved by Board. 0.5 FTE IT Administrator dedicated to ISMS. External ISO 27001 consultant engaged for 10 days.",
            "competence_requirements": "ISMS Owner: ISO 27001 Lead Implementer certification (in progress)\nIT Admin: CompTIA Security+ or equivalent\nAll staff: Annual information security awareness training (minimum 2 hours)",
            "training_plan": "Month 1: ISMS Owner and IT Admin attend ISO 27001 foundation course\nMonth 2: All staff phishing simulation and awareness module\nMonth 4: Department-specific security procedures training\nMonth 6: Refresher and lessons-learned session",
            "awareness_programme": "Monthly security tips via WhatsApp company group, quarterly security briefings at staff meetings, incident reporting poster at all locations",
            "communication_plan": "Internal: Security incidents reported via WhatsApp to IT Admin within 1 hour. Policy updates communicated by email. Monthly ISMS status update to management.\nExternal: Data breach notification to affected customers within 72 hours per CDPA Chapter 12:07.",
            "documented_information": "ISMS Scope Statement, Information Security Policy, Risk Assessment Report, Risk Treatment Plan, Statement of Applicability, Asset Register, Incident Log, Internal Audit Report",
            "document_control": "All ISMS documents version-controlled in SharePoint with owner, version number, and review date. Master copies held by ISMS Owner."
        }
    },
    7: {
        "title": "Operational Planning & Implementation",
        "draft_data": {
            "operational_controls_implemented": "Endpoint protection deployed on 47 of 48 company devices\nMFA enabled on Microsoft 365, accounting system, and fleet management platform\nEncrypted daily backups running to Bulawayo offsite server\nNetwork segmentation completed between office Wi-Fi and server VLAN\nUSB ports disabled on all finance department computers",
            "change_management_process": "All system changes must be documented in the Change Request Log, approved by ISMS Owner, and tested in staging before production deployment. Emergency changes require retrospective approval within 24 hours.",
            "supplier_security": "IT service providers reviewed against Annex A.5.19-5.22. Three vendors (tracking software, cloud backup, accounting system) have signed Data Processing Agreements aligned to CDPA Chapter 12:07.",
            "business_continuity": "BCP documented covering: generator failover for load shedding, manual dispatch procedures if fleet system is unavailable, paper-based manifest backup for border post operations.",
            "incident_response_plan": "Incident classification: Low (logged, resolved within 5 days), Medium (ISMS Owner notified, resolved within 48 hours), High/Critical (Board notified, external support engaged, regulator notified if data breach).",
            "physical_security": "Server room access restricted to IT Admin and ISMS Owner via key card. CCTV at all entrances. Clean desk policy enforced in finance department.",
            "implementation_evidence": "Configuration screenshots stored in SharePoint ISMS folder. Vendor signed contracts filed. Staff training attendance sheets signed and scanned."
        }
    },
    8: {
        "title": "Performance Evaluation & Internal Audit",
        "draft_data": {
            "monitoring_approach": "Monthly review of security logs, incident register, and backup success reports by IT Admin. Quarterly KPI dashboard presented to management.",
            "kpis": "1. Number of security incidents: Target 0 critical, <3 medium per quarter\n2. Staff training completion rate: Target 100% annually\n3. Backup success rate: Target 99.5% monthly\n4. Patch compliance: Target 95% within 30 days of release\n5. System availability: Target 95% during business hours",
            "internal_audit_plan": "Annual internal audit of all ISMS processes. Conducted by Tatenda Chikwanda (Auditor role). Audit programme covers all 10 ISMS steps and sampled Annex A controls.",
            "internal_audit_findings": "Audit conducted 2025-03-15. Findings:\n- Major: No formal process for reviewing third-party access rights (Annex A.8.2) - corrective action raised\n- Minor: Incident log entries missing root cause in 3 of 8 records\n- Observation: Staff in Bulawayo depot unaware of clean desk policy",
            "corrective_actions_raised": "CA-001: Implement quarterly third-party access review process - Owner: Kudzai Banda - Due: 2025-05-01\nCA-002: Update incident log template to include mandatory root cause field - Owner: Chipo Mutasa - Due: 2025-04-15",
            "management_review_date": "2025-04-01",
            "management_review_outcomes": "Board satisfied with ISMS progress. Approved additional USD 1,500 for Bulawayo depot security improvements. Confirmed ISMS Owner appointment for another year.",
            "audit_conclusion": "ISMS is substantially implemented and operating effectively. Two corrective actions raised. Recommendation: proceed to Stage 1 certification audit."
        }
    },
    9: {
        "title": "Improvement & Corrective Action",
        "draft_data": {
            "nonconformities_identified": "NC-001: Third-party access rights not reviewed quarterly (from internal audit)\nNC-002: Three staff in Bulawayo not completed awareness training by deadline",
            "root_cause_analysis": "NC-001: No formal procedure existed for periodic access review. Vendor onboarding checklist did not include access review schedule.\nNC-002: Bulawayo depot manager was not included in training notification distribution list.",
            "corrective_actions": "CA-001: Developed and implemented Third-Party Access Review Procedure (TPARP-001). Quarterly calendar reminders set for IT Admin. First review completed 2025-05-01. Status: CLOSED\nCA-002: Updated training notification distribution list to include all depot managers. Bulawayo staff completed training 2025-04-20. Status: CLOSED",
            "continual_improvement_initiatives": "1. Evaluate endpoint detection and response (EDR) solution for FY2026 budget\n2. Explore ISO 27001 certification from SAZ (Standards Association of Zimbabwe)\n3. Extend ISMS scope to cover Mutare border post office in Year 2\n4. Automate monthly KPI reporting from system logs",
            "lessons_learned": "Load shedding posed greater risk than initially assessed - generator maintenance should be added to the asset register. WhatsApp-based incident reporting proved effective for staff engagement but needs a formal escalation process for after-hours incidents.",
            "improvement_review_date": "2025-05-15",
            "next_review_date": "2026-01-15",
            "certification_readiness": "Organisation assessed as ready for ISO 27001:2022 Stage 1 certification audit. External auditor quotations obtained from two accredited certification bodies."
        }
    },
    10: {
        "title": "Statement of Applicability Review",
        "draft_data": {
            "soa_version": "1.0",
            "soa_date": "2025-05-01",
            "total_controls": "93",
            "applicable_controls": "71",
            "excluded_controls": "22",
            "exclusion_justifications": "A.5.7 Threat intelligence: Excluded - insufficient budget for commercial threat intel feed; compensated by free CERT advisories.\nA.8.12 Data leakage prevention: Excluded - DLP tooling not cost-effective at current scale; compensated by USB disable policy and email monitoring.\nA.8.16 Monitoring activities: Partially excluded - full SIEM not implemented; compensated by manual log review.",
            "soa_approved_by": "Tinashe Moyo - Operations Director",
            "soa_review_frequency": "Annually or following significant change to risk landscape",
            "key_applicable_controls": "A.5.1 Policies for information security\nA.5.15 Access control\nA.5.17 Authentication information\nA.6.3 Information security awareness\nA.8.5 Secure authentication\nA.8.7 Protection against malware\nA.8.13 Information backup\nA.8.20 Networks security",
            "implementation_summary": "71 controls applicable. 58 fully implemented, 13 partially implemented with completion planned by Q3 2025. All critical controls (protecting customer data and financial systems) are fully implemented.",
            "certification_statement": "This Statement of Applicability has been prepared in accordance with ISO/IEC 27001:2022 Clause 6.1.3 and reflects the results of the risk treatment process. It has been reviewed and approved by senior management."
        }
    }
}


def seed_all_steps_complete():
    print(f"Connecting to database: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        org = conn.execute(
            "SELECT org_id, name FROM organisations ORDER BY created_at LIMIT 1"
        ).fetchone()

        if not org:
            print("ERROR: No organisation found. Run 'python app.py --seed' first.")
            return

        org_id = org['org_id']
        print(f"Found organisation: {org['name']} ({org_id})")

        owner = conn.execute(
            "SELECT user_id, name FROM users WHERE org_id=? AND role='ISMS_Owner' LIMIT 1",
            (org_id,)
        ).fetchone()
        owner_id = owner['user_id'] if owner else 'system'

        # Update all 10 steps
        for step_num, step_info in STEP_DATA.items():
            draft_json = json.dumps(step_info['draft_data'])
            existing = conn.execute(
                "SELECT session_id FROM isms_sessions WHERE org_id=? AND step_number=?",
                (org_id, step_num)
            ).fetchone()

            if existing:
                conn.execute(
                    """UPDATE isms_sessions
                       SET status='Complete', draft_data=?, progress=100,
                           title=?, updated_at=?
                       WHERE org_id=? AND step_number=?""",
                    (draft_json, step_info['title'], now(), org_id, step_num)
                )
                print(f"  ✅ Step {step_num}: {step_info['title']} — Updated to Complete")
            else:
                conn.execute(
                    """INSERT INTO isms_sessions
                       (session_id, org_id, step_number, title, status, draft_data, progress, updated_at)
                       VALUES (?,?,?,?,?,?,?,?)""",
                    (str(uuid.uuid4()), org_id, step_num, step_info['title'],
                     'Complete', draft_json, 100, now())
                )
                print(f"  ✅ Step {step_num}: {step_info['title']} — Created as Complete")

        # ── Asset Register ─────────────────────────────────────────────────────
        try:
            tables = [r[0] for r in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()]

            if 'asset_register' in tables:
                count = conn.execute(
                    "SELECT COUNT(*) as c FROM asset_register WHERE org_id=?", (org_id,)
                ).fetchone()['c']
                if count == 0:
                    assets = [
                        # (name, type, owner, classification, location, description)
                        ('Customer database (PostgreSQL)',        'Data',       'Tinashe Moyo',  'Critical', 'Harare HQ — server room',     'Stores all customer PII, shipment history, and contact records. Primary target for data breach.'),
                        ('Fleet management system',               'Software',   'Kudzai Banda',  'Critical', 'Cloud (vendor-hosted)',        'Core operational platform for dispatch, route planning, and driver management.'),
                        ('Sage Cloud accounting system',          'Software',   'Chipo Mutasa',  'Critical', 'Cloud (Sage-hosted)',          'Processes all financial transactions, payroll, and tax reporting.'),
                        ('GPS tracking platform',                 'Software',   'Kudzai Banda',  'High',     'Cloud (vendor-hosted)',        'Provides real-time location of 40 fleet vehicles. Includes customer-visible tracking portal.'),
                        ('Microsoft 365 (email & SharePoint)',    'Service',    'Kudzai Banda',  'High',     'Cloud (Microsoft-hosted)',     'Business email, SharePoint document store, and Teams communication for all 96 staff.'),
                        ('Customer shipment records',             'Data',       'Tinashe Moyo',  'Critical', 'Harare HQ — server room',     'Operational records of all shipments including client data, routes, and proof of delivery.'),
                        ('Employee personal data (HR records)',   'Data',       'Chipo Mutasa',  'High',     'Harare HQ — SharePoint',      'Names, IDs, salaries, medical data for 96 employees. Subject to CDPA Chapter 12:07.'),
                        ('Financial records & payroll data',      'Data',       'Chipo Mutasa',  'Critical', 'Harare HQ — server room',     'Accounts payable/receivable, payroll, tax filings. Subject to ZIMRA compliance requirements.'),
                        ('Primary file server (Harare HQ)',       'Hardware',   'Kudzai Banda',  'High',     'Harare HQ — server room',     'On-premises server hosting customer DB, internal file shares, and backup staging area.'),
                        ('Bulawayo depot server',                 'Hardware',   'Kudzai Banda',  'Medium',   'Bulawayo depot — server room', 'Secondary server hosting offsite backup and depot operational records.'),
                        ('Staff laptops (47 devices)',            'Hardware',   'Kudzai Banda',  'High',     'Various — Harare & Bulawayo', 'Company-issued laptops for all office and management staff. All BitLocker-encrypted via Intune.'),
                        ('GPS tracking hardware (fleet devices)', 'Hardware',   'Kudzai Banda',  'Medium',   'Fleet vehicles — mobile',     '40 hardwired GPS units in company vehicles. Transmit location to cloud tracking platform.'),
                        ('Diesel generator & UPS systems',        'Hardware',   'Kudzai Banda',  'High',     'Harare HQ — generator room',  'Critical infrastructure for 8-12 hour daily load shedding. 72-hour fuel reserve maintained.'),
                        ('Network firewall & managed switches',   'Hardware',   'Kudzai Banda',  'High',     'Harare HQ — server room',     'Cisco ASA firewall and managed switches providing network segmentation across three zones.'),
                        ('Harare HQ server room',                 'Facilities', 'Tinashe Moyo',  'High',     'Harare HQ — ground floor',    'Controlled access area housing primary server, firewall, UPS, and networking equipment.'),
                        ('Bulawayo depot premises',               'Facilities', 'Tinashe Moyo',  'Medium',   'Bulawayo — industrial area',  'Secondary operations site with vehicle workshop, driver rest area, and depot office.'),
                        ('IT Administrator (Kudzai Banda)',        'People',     'Tinashe Moyo',  'High',     'Harare HQ',                   'Single point of technical knowledge for all IT systems. Critical dependency risk.'),
                        ('Operations & dispatch staff (62)',       'People',     'Tinashe Moyo',  'Medium',   'Harare HQ & Bulawayo depot',  'Front-line staff who access fleet management system and handle customer communications.'),
                        ('Third-party courier API integration',   'Service',    'Kudzai Banda',  'Medium',   'External — third party',      'API integration with partner courier for last-mile delivery. Handles shipment status data.'),
                        ('Cloud backup service (offsite)',         'Service',    'Kudzai Banda',  'High',     'Cloud (Bulawayo server)',      'Daily encrypted backup of all critical data to Bulawayo depot server over VPN.'),
                    ]
                    conn.executemany(
                        """INSERT INTO asset_register
                           (asset_id, org_id, name, type, owner, classification, location, description, created_at, created_by)
                           VALUES (?,?,?,?,?,?,?,?,?,?)""",
                        [
                            (f'ASSET-{str(uuid.uuid4())[:8].upper()}', org_id,
                             a[0], a[1], a[2], a[3], a[4], a[5], now(), owner_id)
                            for a in assets
                        ]
                    )
                    print(f"  ✅ Seeded {len(assets)} assets into asset_register")
                else:
                    print(f"  ℹ️  Asset register already has {count} entries — skipping")
        except Exception as e:
            print(f"  ⚠️  Asset register seeding failed: {e}")

        # ── Risk Register ──────────────────────────────────────────────────────
        try:
            tables = [r[0] for r in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()]

            if 'risk_register' in tables:
                count = conn.execute(
                    "SELECT COUNT(*) as c FROM risk_register WHERE org_id=?", (org_id,)
                ).fetchone()['c']
                if count == 0:
                    # (asset, threat, vulnerability, likelihood, impact, risk_level, treatment, treatment_plan, treatment_owner, treatment_due, status, notes)
                    risks = [
                        # ── Critical / High risks ──────────────────────────────
                        ('Sage Cloud accounting system',
                         'Ransomware encryption of financial system',
                         'No immutable backup; admin credentials not MFA-protected',
                         4, 5, 'High', 'Mitigate',
                         'Enable MFA on Sage admin accounts. Configure immutable daily backup to Bulawayo server. Subscribe to Sage ransomware recovery support tier.',
                         'Kudzai Banda', '2025-06-30', 'In Treatment',
                         'Cyber insurance policy (USD 50,000 coverage) transferred residual financial impact. MFA enabled April 2025.'),

                        ('Customer database (PostgreSQL)',
                         'Unauthorised access to customer PII',
                         'Overly broad database user permissions; no row-level security',
                         4, 5, 'High', 'Mitigate',
                         'Implement role-based database users. Restrict application service account to read-only on non-critical tables. Enable PostgreSQL audit logging.',
                         'Kudzai Banda', '2025-06-15', 'In Treatment',
                         'Access matrix reviewed April 2025. Service account permissions reduced. Audit logging enabled.'),

                        ('Diesel generator & UPS systems',
                         'System unavailability due to load shedding exceeding UPS capacity',
                         'Load shedding averaging 10 hours/day; UPS provides only 4 hours',
                         5, 4, 'High', 'Mitigate',
                         'Maintain minimum 200-litre diesel reserve. Monthly generator test documented. Negotiate priority fuel supply with Total Zimbabwe. Implement graceful shutdown procedure for non-critical systems after 3 hours.',
                         'Kudzai Banda', '2025-05-31', 'Open',
                         'Monthly generator test log established. Fuel supplier contract signed March 2025.'),

                        ('Staff laptops (47 devices)',
                         'Data breach from lost or stolen laptop',
                         'BitLocker not enforced on 6 older devices; remote wipe not configured on all',
                         3, 5, 'High', 'Mitigate',
                         'Complete BitLocker enforcement on all 47 devices via Intune policy. Enrol remaining 6 devices in Intune MDM. Test remote wipe capability quarterly.',
                         'Kudzai Banda', '2025-05-31', 'In Treatment',
                         '41 of 47 devices compliant as of April 2025. Remaining 6 devices scheduled for imaging.'),

                        ('Microsoft 365 (email & SharePoint)',
                         'Phishing attack leading to credential compromise',
                         'Staff click-through rate 12% on simulations; no advanced anti-phishing policy',
                         4, 4, 'High', 'Mitigate',
                         'Enable Microsoft Defender for Office 365 anti-phishing policy. Configure Safe Links and Safe Attachments. Run quarterly phishing simulation. Provide targeted retraining for staff who click.',
                         'Kudzai Banda', '2025-06-30', 'In Treatment',
                         'Defender for Office 365 Plan 1 activated March 2025. Phishing simulation click rate reduced from 31% to 12%.'),

                        ('Fleet management system',
                         'Vendor platform outage causing operational disruption',
                         'No documented offline fallback; dispatchers lack manual procedures',
                         3, 4, 'High', 'Mitigate',
                         'Document manual dispatch procedure using paper manifests. Train all dispatchers on offline fallback. Test offline procedure in quarterly BCP exercise.',
                         'Tinashe Moyo', '2025-07-31', 'Open',
                         'Manual dispatch procedure drafted April 2025. Training scheduled June 2025.'),

                        ('Network firewall & managed switches',
                         'Exploitation of unpatched firewall firmware',
                         'Firmware update schedule not formalised; last update 14 months ago',
                         3, 4, 'High', 'Mitigate',
                         'Establish quarterly firmware review and update schedule for all network devices. Subscribe to Cisco security advisories. Document change management procedure for network device updates.',
                         'Kudzai Banda', '2025-06-15', 'Open',
                         'Firewall firmware updated April 2025. Quarterly review schedule implemented.'),

                        ('IT Administrator (Kudzai Banda)',
                         'Single point of failure — key person dependency',
                         'No documented runbooks; only one person knows critical system passwords',
                         2, 5, 'High', 'Mitigate',
                         'Document runbooks for all critical IT tasks (backup, user provisioning, server restart, firewall access). Store credentials in company password manager. Cross-train one Operations staff member on basic IT recovery tasks.',
                         'Tinashe Moyo', '2025-08-31', 'Open',
                         'Runbook documentation 60% complete. Password manager deployed to IT Admin April 2025.'),

                        # ── Medium risks ───────────────────────────────────────
                        ('GPS tracking platform',
                         'Unauthorised access to vehicle location data',
                         'Default vendor-issued passwords not changed on 8 driver devices',
                         3, 3, 'Medium', 'Mitigate',
                         'Change all default passwords on GPS hardware using vendor admin tool. Add GPS device management to quarterly IT review checklist.',
                         'Kudzai Banda', '2025-05-31', 'In Treatment',
                         'Password reset procedure executed April 2025. All 40 devices updated.'),

                        ('Financial records & payroll data',
                         'Insider threat — unauthorised payroll modification',
                         'Finance system access not segregated; payroll run and approval by same person',
                         2, 5, 'Medium', 'Mitigate',
                         'Implement dual-approval for payroll runs exceeding USD 1,000. ISMS Owner reviews payroll report monthly. Finance user access reviewed quarterly.',
                         'Tinashe Moyo', '2025-06-30', 'Open',
                         'Dual-approval policy communicated to Finance team. Technical control pending Sage system configuration.'),

                        ('Harare HQ server room',
                         'Tailgating / unauthorised physical access to server room',
                         'Single key-card reader with no anti-tailgate mechanism; no secondary door',
                         2, 4, 'Medium', 'Mitigate',
                         'Install CCTV camera inside server room. Implement server room access log with mandatory sign-in. Restrict key cards to IT Admin and ISMS Owner only.',
                         'Tinashe Moyo', '2025-05-31', 'In Treatment',
                         'CCTV installed March 2025. Key card list reduced to 2 authorised persons.'),

                        ('Employee personal data (HR records)',
                         'Data subject access request non-compliance',
                         'No documented procedure for handling DSARs under CDPA Chapter 12:07',
                         2, 4, 'Medium', 'Mitigate',
                         'Document DSAR handling procedure with 30-day response target. Appoint DPO as first point of contact. Train HR Manager on CDPA obligations.',
                         'Chipo Mutasa', '2025-06-30', 'Open',
                         'DSAR procedure drafted. DPO appointed February 2025. HR Manager training scheduled.'),

                        ('Third-party courier API integration',
                         'Supply chain compromise via partner API',
                         'No vendor security assessment conducted; no contract security clause',
                         2, 4, 'Medium', 'Mitigate',
                         'Conduct security assessment of courier partner using vendor questionnaire. Add information security clause to service agreement. Implement API authentication using token-based auth.',
                         'Kudzai Banda', '2025-07-31', 'Open',
                         'Vendor questionnaire sent April 2025. Awaiting response.'),

                        ('Operations & dispatch staff (62)',
                         'Social engineering targeting dispatchers for shipment data',
                         'Staff not trained to verify caller identity before releasing shipment information',
                         3, 3, 'Medium', 'Mitigate',
                         'Add caller verification procedure to dispatcher training. Include social engineering scenario in next phishing/vishing simulation. Post verification checklist at all dispatch workstations.',
                         'Tinashe Moyo', '2025-06-30', 'Open',
                         'Procedure drafted. Training materials under preparation.'),

                        ('Cloud backup service (offsite)',
                         'Backup failure resulting in data loss',
                         'Backup success not monitored daily; last restore test was 6 months ago',
                         2, 5, 'Medium', 'Mitigate',
                         'Configure automated backup success/failure email alerts to IT Admin. Perform monthly restore test with documented results. Add backup review to monthly IT Admin checklist.',
                         'Kudzai Banda', '2025-05-15', 'In Treatment',
                         'Daily backup alert configured March 2025. Monthly restore test log established.'),

                        ('Microsoft 365 (email & SharePoint)',
                         'Business email compromise (CEO fraud)',
                         'No DMARC/DKIM policy; finance staff can receive spoofed executive emails',
                         2, 4, 'Medium', 'Mitigate',
                         'Configure DMARC, DKIM, and SPF on saferoute.co.zw domain. Add display-name spoofing protection in Exchange Online. Train finance staff to verify wire transfer requests verbally.',
                         'Kudzai Banda', '2025-06-15', 'Open',
                         'SPF and DKIM configured April 2025. DMARC policy set to quarantine pending monitoring.'),

                        ('Bulawayo depot server',
                         'Physical theft of backup server at depot',
                         'Server not physically secured; depot has lower physical security than Harare HQ',
                         2, 4, 'Medium', 'Mitigate',
                         'Bolt server to rack using anti-theft cable. Encrypt all data on Bulawayo server using BitLocker. Install CCTV camera covering server area. Restrict depot server room access to depot manager.',
                         'Tinashe Moyo', '2025-06-30', 'Open',
                         'Physical cable lock installed. Server encryption in progress.'),

                        # ── Low risks ──────────────────────────────────────────
                        ('GPS tracking hardware (fleet devices)',
                         'GPS device tampering by drivers',
                         'Drivers have physical access to GPS units; no tamper detection',
                         2, 2, 'Low', 'Accept',
                         'Risk accepted at current level. Anti-tamper enclosures noted as future enhancement. Supervisors conduct monthly visual inspection of GPS units during vehicle service.',
                         'Kudzai Banda', None, 'Open',
                         'Risk accepted. Compensating control: monthly vehicle inspection includes GPS unit check.'),

                        ('Staff laptops (47 devices)',
                         'Shadow IT — use of personal cloud storage for work files',
                         'No technical control blocking Dropbox/Google Drive on company devices',
                         3, 2, 'Low', 'Mitigate',
                         'Publish acceptable use policy prohibiting personal cloud storage for work files. Use Intune to block unapproved cloud storage apps on managed devices.',
                         'Kudzai Banda', '2025-07-31', 'Open',
                         'AUP updated to explicitly prohibit personal cloud storage. Technical blocking in progress via Intune.'),

                        ('Harare HQ server room',
                         'Environmental damage from flooding or fire',
                         'No water detection sensor in server room; fire suppression is manual extinguisher only',
                         1, 5, 'Low', 'Accept',
                         'Risk accepted due to cost. Compensating controls: daily offsite backup, server room elevated 30cm above floor level, fire extinguisher serviced annually.',
                         'Tinashe Moyo', None, 'Open',
                         'Water sensor deferred to Year 2 budget. Fire extinguisher serviced January 2025.'),

                        ('Operations & dispatch staff (62)',
                         'Accidental data deletion by untrained staff',
                         'Dispatch staff have write access to shared folders containing customer data',
                         2, 2, 'Low', 'Mitigate',
                         'Restrict dispatch staff SharePoint permissions to read-only on customer data folders. Provide data handling refresher in next awareness training session.',
                         'Kudzai Banda', '2025-06-30', 'Open',
                         'SharePoint permission review initiated. Access tightened for 3 shared folders.'),

                        ('Microsoft 365 (email & SharePoint)',
                         'Accidental public sharing of internal SharePoint documents',
                         'Default SharePoint sharing policy allows external sharing',
                         2, 2, 'Low', 'Mitigate',
                         'Set SharePoint tenant-level sharing policy to "Only people in your organisation". Train staff on correct sharing practices. ISMS Owner reviews sharing audit log quarterly.',
                         'Kudzai Banda', '2025-05-31', 'In Treatment',
                         'External sharing disabled at tenant level April 2025. Quarterly audit log review scheduled.'),

                        ('Customer database (PostgreSQL)',
                         'SQL injection via customer-facing web portal',
                         'Customer portal developed by vendor; last penetration test was 18 months ago',
                         1, 5, 'Low', 'Transfer',
                         'Require vendor to conduct annual penetration test as part of SLA. Include pen test requirement in contract renewal. Review vendor test results when available.',
                         'Tinashe Moyo', '2025-09-30', 'Open',
                         'Pen test requirement added to vendor contract renewal clause. Vendor to conduct test Q3 2025.'),

                        ('Third-party courier API integration',
                         'Unencrypted data transmission over courier API',
                         'API uses HTTP on some legacy endpoints; not all endpoints enforce TLS',
                         1, 3, 'Low', 'Mitigate',
                         'Require courier partner to enforce TLS 1.2+ on all API endpoints. Document API security requirements in contract. If non-compliant by Q3 2025, evaluate alternative partner.',
                         'Kudzai Banda', '2025-07-31', 'Open',
                         'Security requirement communicated to courier partner. Awaiting confirmation of TLS enforcement.'),
                    ]
                    risk_rows = []
                    for r in risks:
                        (asset, threat, vuln, likelihood, impact, level,
                         treatment, plan, t_owner, t_due, status, notes) = r
                        risk_rows.append((
                            f'R-{str(uuid.uuid4())[:8].upper()}',
                            org_id, asset, threat, vuln,
                            likelihood, impact, level, treatment,
                            plan, t_owner, t_due,
                            owner_id,  # overall owner = ISMS Owner
                            status, notes, now(), owner_id
                        ))
                    conn.executemany(
                        """INSERT INTO risk_register
                           (risk_id, org_id, asset, threat, vulnerability,
                            likelihood, impact, risk_level, treatment,
                            treatment_plan, treatment_owner, treatment_due,
                            owner, status, notes, created_at, created_by)
                           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                        risk_rows
                    )
                    high_count = sum(1 for r in risks if r[5] == 'High')
                    med_count  = sum(1 for r in risks if r[5] == 'Medium')
                    low_count  = sum(1 for r in risks if r[5] == 'Low')
                    print(f"  ✅ Seeded {len(risk_rows)} risks into risk_register:")
                    print(f"       {high_count} High  |  {med_count} Medium  |  {low_count} Low")
                else:
                    print(f"  ℹ️  Risk register already has {count} entries — skipping")
        except Exception as e:
            print(f"  ⚠️  Risk register seeding failed: {e}")

        # ── Monitoring and document data ────────────────────────────────────────
        try:
            tables = [r[0] for r in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()]

            if 'incidents' in tables:
                count = conn.execute(
                    "SELECT COUNT(*) as c FROM incidents WHERE org_id=?", (org_id,)
                ).fetchone()['c']
                if count == 0:
                    conn.executemany(
                        """INSERT INTO incidents
                           (incident_id, org_id, title, description, severity, status,
                            reported_by, reported_date, created_at)
                           VALUES (?,?,?,?,?,?,?,?,?)""",
                        [
                            (str(uuid.uuid4()), org_id, 'Phishing Email Received',
                             'Staff member received and reported a phishing email impersonating ZIMRA.',
                             'Low', 'Closed', owner_id, '2025-02-10', now()),
                            (str(uuid.uuid4()), org_id, 'Laptop Reported Missing',
                             'Delivery driver reported company laptop missing after Bulawayo trip. Device recovered.',
                             'Medium', 'Closed', owner_id, '2025-03-05', now()),
                            (str(uuid.uuid4()), org_id, 'Unauthorised Login Attempt',
                             'Three failed login attempts on fleet management system from unknown IP. Account locked automatically.',
                             'Medium', 'Closed', owner_id, '2025-04-12', now()),
                        ]
                    )
                    print(f"  ✅ Seeded 3 demo incidents")

            if 'corrective_actions' in tables:
                count = conn.execute(
                    "SELECT COUNT(*) as c FROM corrective_actions WHERE org_id=?", (org_id,)
                ).fetchone()['c']
                if count == 0:
                    conn.executemany(
                        """INSERT INTO corrective_actions
                           (action_id, org_id, title, description, priority, status,
                            assigned_to, due_date, created_at)
                           VALUES (?,?,?,?,?,?,?,?,?)""",
                        [
                            (str(uuid.uuid4()), org_id,
                             'Implement Third-Party Access Review',
                             'Establish quarterly review process for all vendor and third-party system access rights.',
                             'High', 'Closed', owner_id, '2025-05-01', now()),
                            (str(uuid.uuid4()), org_id,
                             'Complete Bulawayo Staff Training',
                             'Ensure all Bulawayo depot staff complete the information security awareness module.',
                             'Medium', 'Closed', owner_id, '2025-04-20', now()),
                            (str(uuid.uuid4()), org_id,
                             'Deploy MFA on Remaining Systems',
                             'Enable multi-factor authentication on the customer portal and HR system.',
                             'High', 'In Progress', owner_id, '2025-07-01', now()),
                        ]
                    )
                    print(f"  ✅ Seeded 3 demo corrective actions")

            if 'audits' in tables:
                count = conn.execute(
                    "SELECT COUNT(*) as c FROM audits WHERE org_id=?", (org_id,)
                ).fetchone()['c']
                if count == 0:
                    conn.executemany(
                        """INSERT INTO audits
                           (audit_id, org_id, title, type, status, scheduled_date,
                            auditor, created_at)
                           VALUES (?,?,?,?,?,?,?,?)""",
                        [
                            (str(uuid.uuid4()), org_id, 'Internal ISMS Audit 2025',
                             'Internal', 'Complete', '2025-03-15', 'Tatenda Chikwanda', now()),
                            (str(uuid.uuid4()), org_id, 'Stage 1 Pre-Assessment',
                             'External', 'Scheduled', '2025-08-01', 'SAZ Certification Body', now()),
                        ]
                    )
                    print(f"  ✅ Seeded 2 demo audits")

            if 'documents_store' in tables:
                count = conn.execute(
                    "SELECT COUNT(*) as c FROM documents_store WHERE org_id=?", (org_id,)
                ).fetchone()['c']
                if count == 0:
                    conn.executemany(
                        """INSERT INTO documents_store
                           (doc_id, org_id, type, name, version, status,
                            content_json, exported_at, format, approved_by, created_at)
                           VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                        [
                            (str(uuid.uuid4()), org_id, 'information-security-policy',
                             'Information Security Policy', '1.0', 'generated',
                             None, None, 'docx', owner_id, now()),
                            (str(uuid.uuid4()), org_id, 'risk-assessment-report',
                             'Risk Assessment Report', '1.0', 'generated',
                             None, None, 'docx', owner_id, now()),
                            (str(uuid.uuid4()), org_id, 'risk-treatment-plan',
                             'Risk Treatment Plan', '1.0', 'generated',
                             None, None, 'docx', owner_id, now()),
                            (str(uuid.uuid4()), org_id, 'soa',
                             'Statement of Applicability', '1.0', 'generated',
                             None, None, 'docx', owner_id, now()),
                            (str(uuid.uuid4()), org_id, 'corrective-action-log',
                             'Corrective Action Log', '1.0', 'generated',
                             None, None, 'docx', owner_id, now()),
                            (str(uuid.uuid4()), org_id, 'scope-statement',
                             'Scope Statement', '1.0', 'generated',
                             None, None, 'docx', owner_id, now()),
                        ]
                    )
                    print(f"  ✅ Seeded 6 document statuses")

        except Exception as e:
            print(f"  ℹ️  Monitoring/document data skipped: {e}")

        # ── Statement of Applicability ─────────────────────────────────────
        # Realistic SoA for SafeRoute Logistics (Pvt) Ltd — ISO 27001:2022
        # Not applicable: 20 controls (software dev, DLP, advanced monitoring, etc.)
        # In Progress: 23 controls (with specific progress notes)
        # Implemented: ~50 controls (with evidence notes, human_approved=1)
        try:
            existing_soa = conn.execute(
                "SELECT COUNT(*) as c FROM soa_entries WHERE org_id=?", (org_id,)
            ).fetchone()['c']

            if existing_soa == 0:
                import json as _json
                import os as _os
                controls_path = _os.path.join(_os.path.dirname(__file__), 'data', 'annex-a-controls.json')
                with open(controls_path) as _f:
                    all_controls = _json.load(_f)

                # ── NOT APPLICABLE controls + justifications ──────────────────
                not_applicable = {
                    # No in-house software development
                    'A.8.4':  'SafeRoute Logistics does not develop or maintain source code. All software is procured from vendors under licence agreements. No in-house development function exists.',
                    'A.8.25': 'SafeRoute does not engage in software development. All applications are commercially acquired; secure SDLC obligations rest with vendors and are addressed through procurement clauses.',
                    'A.8.26': 'No custom application development is performed in-house. Security requirements are addressed through vendor evaluation, contract terms, and periodic SLA reviews.',
                    'A.8.27': 'Not applicable — no internal system development or integration activities are undertaken by SafeRoute staff. All integrations are vendor-managed.',
                    'A.8.28': 'Secure coding is not applicable as SafeRoute has no software development function. All code is owned and maintained by third-party vendors.',
                    'A.8.29': 'No development or acceptance testing environments exist within the organisation. Vendor-conducted testing is verified through contract obligations.',
                    'A.8.30': 'SafeRoute does not outsource software development; all systems are purchased off-the-shelf or subscribed as SaaS. No outsourced development relationships exist.',
                    'A.8.31': 'Separation of development, test, and production environments is not required as no in-house software development takes place. All environments are managed by cloud providers.',
                    'A.8.33': 'Test information controls are not applicable — SafeRoute has no internal development or testing pipelines. Test data management is not within scope.',
                    # DLP not cost-effective at current scale
                    'A.8.12': 'Data leakage prevention tooling is not cost-effective at SafeRoute\'s current scale (fewer than 100 staff). Compensating controls are in place: USB port restrictions via Group Policy on finance computers, email content monitoring, and a clean desk policy enforced quarterly.',
                    # Formal threat intelligence feed not budgeted
                    'A.5.7':  'Formal threat intelligence subscriptions are excluded due to budget constraints. As a compensating measure, the organisation monitors free CERT.zw advisories, vendor security bulletins, and ZIMRA cybersecurity notices. This will be revisited in the Year 2 budget.',
                    # Clock sync managed automatically by cloud providers
                    'A.8.17': 'Clock synchronisation is managed automatically by cloud-hosted platforms (Microsoft 365, Sage Cloud). On-premises servers use Windows Time Service synced to pool.ntp.org. No additional manual controls are required.',
                    # Full SIEM not implemented — manual log review compensates
                    'A.8.16': 'Fully automated monitoring via a SIEM platform is not implemented at this stage due to cost and resource constraints. Compensating control: monthly manual review of authentication, firewall, and application logs performed by the IT Administrator using a documented checklist.',
                    # No IP creation
                    'A.5.32': 'SafeRoute Logistics does not create intellectual property. The organisation uses commercially licensed software and does not hold patents, trademarks, or proprietary works requiring formal IP protection procedures.',
                    # Special interest groups — small org
                    'A.5.6':  'Formal membership of information security special interest groups is not feasible given the organisation\'s size and capacity. Staff follow CERT.zw public advisories and vendor security bulletins as a compensating measure.',
                    # Segregation of duties — small team
                    'A.5.3':  'Full segregation of duties is not achievable in an organisation of this size. Compensating controls include dual-approval requirements for financial transactions above USD 500, quarterly management review of access logs, and independent internal audit.',
                    # Cabling — leased premises
                    'A.7.12': 'The Harare headquarters is a leased commercial premise; structured cabling infrastructure is maintained by the building owner under a facilities management contract. SafeRoute ensures that cabling within the server room boundary is properly managed and secured.',
                    # Data masking — not applicable at this scale
                    'A.8.11': 'Data masking is not applicable at SafeRoute\'s current scale and data processing volume. Customer PII is protected via role-based access control, AES-256 encryption at rest, and strict need-to-know access policies rather than masking techniques.',
                    # Web filtering — partial, deferred
                    'A.8.23': 'A dedicated web filtering appliance has been deferred to the Year 2 ISMS budget. As a compensating measure, SafeRoute uses ISP-level DNS filtering and Microsoft Defender SmartScreen to block known malicious domains. This control will be fully implemented by Q1 2026.',
                    # Information labelling — simplified scheme
                    'A.5.13': 'Formal digital and physical information labelling is not implemented at this scale. The organisation applies a simplified three-tier classification scheme (Public, Internal, Confidential) communicated through policy and induction training rather than systematic labels on individual assets.',
                }

                # ── IN PROGRESS controls + specific progress notes ────────────
                in_progress = {
                    'A.5.5':  'ISMS Owner has identified key regulatory contacts: POTRAZ, Zimbabwe Republic Police Cyber Crime Unit, and CERT.zw. Draft contact procedure written; pending final review by legal counsel. Target completion: June 2025.',
                    'A.5.8':  'Information security requirements for project management drafted and circulated to Operations Manager. Two live projects already following draft guidelines informally. Awaiting final sign-off before formal adoption. Target: June 2025.',
                    'A.5.19': 'Three of seven vendors (GPS tracking, cloud backup, accounting) have signed Data Processing Agreements. Annual supplier security assessment questionnaire has been sent to the remaining four vendors. Two responses received and assessed satisfactory; two outstanding. Target: July 2025.',
                    'A.5.20': 'Information security clauses included in all new contracts drafted after January 2025. Retrospective review of six legacy contracts in progress; legal counsel reviewing a standard security clause template. Target: August 2025.',
                    'A.5.21': 'ICT supply chain security review initiated. Questionnaire sent to three critical suppliers. Two responses assessed as satisfactory; GPS tracking vendor response outstanding. Full review to be completed Q3 2025.',
                    'A.5.22': 'Annual vendor review process formalised. Reviews completed for three of seven active vendors using the new vendor scorecard template. Remaining four reviews scheduled for Q3 2025.',
                    'A.5.23': 'Cloud service security baseline checklist drafted for Microsoft 365 and Sage Cloud. Microsoft 365 assessed as satisfactory against the baseline. Sage Cloud review in progress — shared responsibility matrix being completed. Target: July 2025.',
                    'A.5.28': 'Evidence collection procedure drafted following internal audit recommendation. Evidence log template created and successfully piloted during April 2025 corrective action closure process. Full rollout planned June 2025.',
                    'A.5.29': 'Business Continuity Plan documented for core logistics operations covering load shedding, fleet system outage, and ransomware scenarios. IT DR runbook 70% complete — backup restore procedures tested; failover procedures outstanding. BCP tabletop exercise scheduled July 2025.',
                    'A.5.30': 'ICT readiness for disruption: generator and UPS verified for load shedding (see A.7.11). Remote working procedure drafted but not yet formally approved. BCP test scheduled Q3 2025 will validate ICT readiness under simulated outage.',
                    'A.5.35': 'Independent information security review planned as part of the SAZ Stage 1 certification audit (August 2025). Internal audit (March 2025) serves as the interim independent review. External review scope and engagement terms being finalised.',
                    'A.6.4':  'Disciplinary process for security policy violations is documented in the Employee Handbook (Section 8.3). HR Manager briefed. Formal disciplinary case simulation planned for Q3 2025 as part of policy testing.',
                    'A.6.7':  'Remote working policy drafted covering VPN usage requirements, home network security baseline, screen privacy, and incident reporting. VPN client deployed to 12 remote-capable staff. Policy pending final co-approval by HR Director and ISMS Owner. Target: June 2025.',
                    'A.7.4':  'CCTV monitoring operational at Harare HQ (four cameras, 30-day footage retention). Bulawayo depot upgrade (two additional cameras) has been procured; installation scheduled May 2025. Physical security monitoring review procedure being drafted alongside installation.',
                    'A.7.6':  'Access register for server room maintained. Visitor escort requirement in place and followed. Formal written procedure for working in secure areas being drafted based on current informal practice. Target: June 2025.',
                    'A.7.10': 'Storage media management procedure drafted. Removable media register active in finance department. Procedure for classifying and securely labelling physical media being finalised for rollout to all departments. Target Q3 2025.',
                    'A.8.9':  'Configuration management standard drafted for servers and network devices. Baseline configurations documented for three of six server types. Golden image process for new workstations defined and in use. Remaining server types to be baselined by July 2025.',
                    'A.8.10': 'Information deletion procedure drafted covering secure removal of customer data upon contract termination. Device decommissioning already uses DBAN 3-pass wipe (A.7.14). Cloud data deletion process being documented with each SaaS provider. Target: July 2025.',
                    'A.8.14': 'Redundancy review completed. Fleet management system has cloud failover capability; accounting system has daily backup with 4-hour RTO. Microsoft 365 provides built-in mail redundancy. Formal redundancy register being documented. Target: June 2025.',
                    'A.8.18': 'Privileged system utility programs inventoried and access restricted to IT Admin. Audit logging enabled on all administrative tools. Formal approval-and-log process for privileged utility use being documented. Target: June 2025.',
                    'A.8.19': 'Software installation policy drafted and communicated. Microsoft Intune application allowlist deployed on all finance computers. Full deployment to remaining 16 devices in progress (31 of 47 configured). Target: June 2025.',
                    'A.8.22': 'Network segregation implemented (see A.8.20). Formal network service management procedure being developed to document all authorised services per security zone and the approval process for service changes. Target: June 2025.',
                    'A.8.24': 'Cryptographic policy implemented (see A.5.33). Key and certificate management being formalised: certificate inventory spreadsheet in use, migrating to a dedicated certificate management log with renewal alerts. Target: July 2025.',
                }

                # ── IMPLEMENTED controls + evidence notes ─────────────────────
                implemented = {
                    'A.5.1':  'Information Security Policy approved by the Board of Directors on 15 January 2025. Distributed to all staff via email; printed copies at Harare reception and Bulawayo depot. Annual review scheduled January 2026. Evidence: signed board minute, distribution email record.',
                    'A.5.2':  'ISMS Owner (Operations Director, Tinashe Moyo) appointed via board resolution dated 10 January 2025. Roles and responsibilities matrix signed off and communicated to all department heads. Evidence: board resolution document, RACI matrix.',
                    'A.5.4':  'Management commitment statement embedded in the Information Security Policy. ISMS budget of USD 8,000 approved by the Board. ISMS Owner presents monthly status reports at management meetings. Evidence: board minutes, approved budget spreadsheet.',
                    'A.5.9':  'Asset register completed in SharePoint with 47 assets across hardware, software, data, people, and facilities. Each asset has a designated owner and classification. Reviewed quarterly. Evidence: asset register spreadsheet v1.2.',
                    'A.5.10': 'Acceptable Use Policy issued to all employees on joining. Signed acknowledgement forms held in HR records. AUP covers company devices, email, internet, and social media. Evidence: AUP document, signed acknowledgement log.',
                    'A.5.11': 'Return-of-assets procedure embedded in the HR offboarding checklist. All leavers return devices, access cards, and keys on last day. IT Admin revokes access within 4 hours of departure. Evidence: offboarding checklist records for 3 leavers in 2025.',
                    'A.5.12': 'Information classification policy implemented with three tiers: Public, Internal, Confidential. Guidance in staff awareness training and on the intranet. Evidence: classification policy document v1.0, training attendance sheet.',
                    'A.5.14': 'NDAs included in all employment contracts and contractor agreements. Reviewed by legal counsel and updated for CDPA Chapter 12:07 compliance. Evidence: standard NDA clause, signed contracts on file.',
                    'A.5.15': 'Role-based access control enforced across fleet management, Sage accounting, and Microsoft 365. Access rights matrix documented; quarterly access review completed April 2025. Evidence: access matrix spreadsheet, review sign-off record.',
                    'A.5.16': 'Unique user IDs assigned to all 96 staff. Shared accounts prohibited by policy and technically enforced. User account register updated within 24 hours of role changes. Evidence: user register in Active Directory, change log.',
                    'A.5.17': 'Password policy enforced: 12-character minimum, complexity required, 90-day rotation. MFA enabled on Microsoft 365, Sage, and fleet management. Password manager deployed to IT and finance teams. Evidence: Group Policy export, MFA enablement report.',
                    'A.5.18': 'Formal access request form required for all new accounts and elevated permissions. Approved by line managers before provisioning. Records retained. Evidence: completed access request forms on file (last reviewed April 2025).',
                    'A.5.24': 'Incident management policy documented covering classification matrix (Low/Medium/High/Critical), reporting channels, and escalation paths. Incident log template in use since February 2025. Evidence: policy document, 3 closed incident records.',
                    'A.5.25': 'Incident response procedure tested in tabletop exercise (March 2025). Escalation contacts list distributed to all team leaders. Post-incident reviews conducted for both 2025 Medium incidents. Evidence: tabletop exercise report, incident review records.',
                    'A.5.26': 'Incident response playbooks drafted for ransomware, phishing, and data breach scenarios. IT Admin and ISMS Owner briefed and signed off. Customer notification template prepared per CDPA 72-hour requirement. Evidence: playbook documents v1.0.',
                    'A.5.27': 'Lessons from two 2025 incidents incorporated into updated awareness training (April 2025). Incident root cause register maintained. Load shedding risk rating upgraded in risk register following generator delay. Evidence: updated training slides, root cause register.',
                    'A.5.31': 'Legal requirements register maintained and reviewed quarterly. Covers CDPA (Chapter 12:07), Electronic Transactions Act (Chapter 13:22), Companies Act (Chapter 24:31), and ZIMRA obligations. Evidence: requirements register v1.1.',
                    'A.5.33': 'Cryptography policy documented: AES-256 for data at rest (servers and laptops), TLS 1.2+ for data in transit, BitLocker mandatory on all laptops. Certificate management assigned to IT Admin. Evidence: cryptography policy v1.0, BitLocker compliance report.',
                    'A.5.34': 'Privacy notice published on SafeRoute website. DPO (Chipo Mutasa) appointed. Data processing register maintained with 12 processing activities documented. CDPA compliance assessed as satisfactory. Evidence: DPO appointment letter, data register.',
                    'A.5.36': 'ISMS compliance assessed through internal audit (March 2025). Compliance register tracks all ISO 27001:2022 clauses. Two minor NCs raised; both corrective actions closed. Evidence: internal audit report, CA closure records.',
                    'A.5.37': 'Documented operating procedures exist for all critical IT tasks: backup, user provisioning, incident response, server maintenance, and generator testing. Reviewed annually. Evidence: procedures folder in SharePoint, last review date April 2025.',
                    'A.6.1':  'Information security responsibilities included in all job descriptions and employment contracts. RACI matrix published on the intranet. Evidence: updated JDs for IT Admin, ISMS Owner, DPO; RACI matrix v1.2.',
                    'A.6.2':  'Pre-employment background screening conducted for IT, finance, and management roles. Includes identity check, reference verification, and criminal record check where legally permissible. Evidence: screening checklist in HR file for all relevant hires.',
                    'A.6.3':  'Annual mandatory security awareness training completed by 94 of 96 staff (98%). Phishing simulation (March 2025): 12% click rate, down from 31% in 2024. New joiners complete training within 30 days. Evidence: training completion report, phishing simulation report.',
                    'A.6.5':  'Termination responsibilities documented in HR offboarding checklist. Exit interview includes security debrief. IT Admin confirms access revocation before final payslip is issued. Evidence: offboarding checklist, access revocation confirmation emails.',
                    'A.6.6':  'Confidentiality agreements incorporated into all employment contracts and contractor NDAs. Reviewed by legal counsel for CDPA alignment. Evidence: standard contract clause, signed agreements on file.',
                    'A.6.8':  'Security event reporting procedure published and communicated. Dedicated WhatsApp group for incident reporting reaches all staff. Security reporting posters displayed at all locations. Evidence: procedure document, poster photos, WhatsApp group membership list.',
                    'A.7.1':  'Physical security perimeter defined: server room, finance office, and reception are controlled areas. Visitor register maintained at all entry points. CCTV operational at Harare HQ and Bulawayo depot. Evidence: physical security assessment, CCTV footage retention policy.',
                    'A.7.2':  'Key card access to server room, physical key for depot office, visitor badges required. Entry log reviewed weekly by ISMS Owner. Evidence: access log records (April 2025), key register.',
                    'A.7.3':  'Offices secured outside business hours. Harare HQ alarmed; Bulawayo depot has overnight security guard. Security check procedure documented and completed at end of each business day. Evidence: security check logbook, alarm activation records.',
                    'A.7.5':  'Clean desk and clear screen policy enforced in finance and operations. Monthly spot checks conducted by ISMS Owner. Policy included in quarterly staff briefings. Evidence: spot check records (April 2025), briefing attendance sheet.',
                    'A.7.7':  'Sensitive documents locked in pedestals overnight. Document shredder at reception and finance office. Spot checks conducted monthly. Evidence: spot check log, shredder maintenance record.',
                    'A.7.8':  'Servers in locked server room. Laptops used only in approved locations. Screen positioning policy enforced — no screens visible to unauthorised individuals in open areas. Evidence: physical security walk-through checklist.',
                    'A.7.9':  'Off-site asset procedure in place. Laptop loan register maintained. All laptops BitLocker-encrypted. Remote wipe enabled via Microsoft Intune. Company vehicles GPS-tracked. Evidence: laptop register, Intune device compliance report.',
                    'A.7.11': 'UPS units on all servers providing 4-hour battery backup. Diesel generator at Harare HQ with 72-hour fuel reserve; tested monthly. Load shedding schedule built into operations planning. Evidence: generator test log (April 2025), UPS maintenance record.',
                    'A.7.13': 'Equipment maintenance schedule for servers, UPS, and generator. Annual service contracts in place. Maintenance records in SharePoint. Evidence: service contracts, maintenance log showing last service dates.',
                    'A.7.14': 'Secure disposal: HDDs wiped with DBAN (3-pass overwrite) before disposal. Certificate of destruction obtained. Paper documents shredded on-site. Evidence: 4 certificates of destruction (2024-2025), shredding log.',
                    'A.8.1':  'All 47 company devices managed via Microsoft Intune MDM. Device register with serial numbers, assigned users, and encryption status. One device pending enrolment (new hire). Evidence: Intune device inventory export, device register.',
                    'A.8.2':  'Privileged access limited to IT Admin and ISMS Owner. Privileged account register maintained. Admin accounts separate from daily-use accounts. Privileged session logs reviewed monthly. Evidence: privileged access register, session log review record.',
                    'A.8.3':  'USB ports disabled on finance computers via Group Policy. Removable media requires written ISMS Owner approval. Exception log maintained. Evidence: GPO configuration export, exception log (0 exceptions in Q1 2025).',
                    'A.8.5':  'MFA enforced on Microsoft 365, Sage, and fleet management. Session idle timeout set to 10 minutes. Account lockout after 5 failed attempts. Password manager deployed to IT and finance. Evidence: MFA adoption report, Active Directory lockout policy.',
                    'A.8.7':  'Microsoft Defender for Business deployed on all 47 devices. Definitions updated daily. Weekly scheduled scans. One detection in Q1 2025 — quarantined and resolved within 2 hours. Evidence: Defender deployment report, incident record INC-2025-001.',
                    'A.8.8':  'Patch management procedure: critical patches within 7 days, standard patches within 30 days. April 2025 patch compliance: 96%. Patch log maintained. Evidence: patch compliance report, patch management procedure v1.1.',
                    'A.8.13': 'Daily encrypted backups to Bulawayo offsite server (AES-256). Weekly backup integrity test with restore verification. Backup success rate: 99.7% in April 2025. Evidence: backup success report, monthly restore verification log.',
                    'A.8.15': 'System logs retained for 90 days. Monthly log review checklist completed by IT Admin. Covers authentication, firewall, and application events. Evidence: log review checklists (Jan–Apr 2025), log retention policy.',
                    'A.8.20': 'Network segmented into three zones: external (customer Wi-Fi), DMZ (web-facing), internal (staff VLAN). Firewall rules documented and reviewed quarterly. No cross-zone access without ISMS Owner approval. Evidence: network diagram v2.1, firewall rule review record.',
                    'A.8.21': 'Network services documented in the network services register. Service configurations reviewed annually. Change management applied to all network changes. Evidence: network services register, last annual review sign-off.',
                    'A.8.32': 'Change management procedure in place. All changes documented in the Change Request Log, tested in staging (for applicable changes), approved by ISMS Owner before production. Emergency changes approved within 24 hours. Evidence: change log (12 changes in 2025), procedure document.',
                }

                soa_rows = []
                for ctrl in all_controls:
                    ref = ctrl['ref']
                    is_applicable = 0 if ref in not_applicable else 1
                    human_approved = 0
                    approved_by_val = None

                    if not is_applicable:
                        justification = not_applicable[ref]
                        status = 'Not Started'
                    elif ref in in_progress:
                        justification = in_progress[ref]
                        status = 'In Progress'
                    elif ref in implemented:
                        justification = implemented[ref]
                        status = 'Implemented'
                        human_approved = 1
                        approved_by_val = owner_id
                    else:
                        # Remaining applicable controls — not yet started
                        justification = ''
                        status = 'Not Started'

                    soa_rows.append((
                        str(uuid.uuid4()), org_id, ref,
                        ctrl['name'], ctrl['category'],
                        is_applicable, justification, status,
                        human_approved, approved_by_val
                    ))

                conn.executemany(
                    """INSERT OR IGNORE INTO soa_entries
                       (soa_id, org_id, annex_a_ref, control_name, category,
                        applicable, justification, implementation_status,
                        human_approved, approved_by)
                       VALUES (?,?,?,?,?,?,?,?,?,?)""",
                    soa_rows
                )
                na_count   = sum(1 for r in soa_rows if r[5] == 0)
                ip_count   = sum(1 for r in soa_rows if r[7] == 'In Progress')
                impl_count = sum(1 for r in soa_rows if r[7] == 'Implemented')
                ns_count   = sum(1 for r in soa_rows if r[5] == 1 and r[7] == 'Not Started')
                appr_count = sum(1 for r in soa_rows if r[8] == 1)
                print(f"  ✅ Seeded {len(soa_rows)} SoA entries for SafeRoute Logistics:")
                print(f"       {len(soa_rows) - na_count} applicable  |  {na_count} not applicable")
                print(f"       {impl_count} implemented (approved)  |  {ip_count} in progress  |  {ns_count} not started")
                print(f"       {appr_count} controls marked human-approved")
            else:
                print(f"  ℹ️  SoA entries already exist ({existing_soa} rows) — skipping SoA seed")

        except Exception as e:
            print(f"  ⚠️  SoA seeding failed: {e}")

        conn.commit()
        print()
        print("=" * 55)
        print("✅ All 10 steps marked Complete with demo data.")
        print("   Restart your backend and refresh the browser.")
        print("   Login: tinashe@saferoute.co.zw / password123")
        print("=" * 55)

    except Exception as e:
        conn.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    seed_all_steps_complete()
