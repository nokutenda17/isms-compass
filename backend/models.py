"""
Database schema for ISMS Compass.
Uses SQLite (dev) via Python's built-in sqlite3.
Switch to PostgreSQL in production by changing DB_PATH to a psycopg2 connection.
"""
import sqlite3
import os

DB_PATH = os.environ.get('DATABASE_URL', os.path.join(os.path.dirname(__file__), 'isms_compass.db'))


def get_db():
    """Get a database connection. Row factory set so rows behave like dicts."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Create all tables if they don't exist."""
    conn = get_db()
    c = conn.cursor()

    c.executescript("""
        -- Organisations
        CREATE TABLE IF NOT EXISTS organisations (
            org_id          TEXT PRIMARY KEY,
            name            TEXT NOT NULL,
            sector          TEXT,
            size            TEXT,
            country         TEXT DEFAULT 'Zimbabwe',
            city            TEXT,
            address         TEXT,
            risk_appetite   TEXT DEFAULT 'Standard',
            scope           TEXT,          -- JSON array of scope items
            created_at      TEXT NOT NULL
        );

        -- Users
        CREATE TABLE IF NOT EXISTS users (
            user_id             TEXT PRIMARY KEY,
            org_id              TEXT NOT NULL REFERENCES organisations(org_id),
            name                TEXT NOT NULL,
            email               TEXT NOT NULL UNIQUE,
            password_hash       TEXT NOT NULL,
            role                TEXT NOT NULL CHECK(role IN ('ISMS_Owner','Contributor','Reviewer','Auditor')),
            is_active           INTEGER DEFAULT 1,
            created_at          TEXT NOT NULL,
            last_login          TEXT,
            invite_code         TEXT,
            invite_expires_at   TEXT,
            auditor_token_expiry TEXT
        );

        -- ISMS Sessions (step state per org)
        CREATE TABLE IF NOT EXISTS isms_sessions (
            session_id      TEXT PRIMARY KEY,
            org_id          TEXT NOT NULL REFERENCES organisations(org_id),
            step_number     INTEGER NOT NULL,
            title           TEXT,
            description     TEXT,
            status          TEXT DEFAULT 'Not Started' CHECK(status IN ('Not Started','In Progress','Complete','Locked')),
            progress        INTEGER DEFAULT 0,
            draft_data      TEXT,          -- JSON blob of form data
            completed_at    TEXT,
            approved_by     TEXT,
            updated_at      TEXT,
            UNIQUE(org_id, step_number)
        );

        -- Asset Register
        CREATE TABLE IF NOT EXISTS asset_register (
            asset_id        TEXT PRIMARY KEY,
            org_id          TEXT NOT NULL REFERENCES organisations(org_id),
            name            TEXT NOT NULL,
            type            TEXT,
            owner           TEXT,
            classification  TEXT DEFAULT 'Medium',
            location        TEXT,
            description     TEXT,
            created_at      TEXT NOT NULL,
            created_by      TEXT
        );

        -- Risk Register
        CREATE TABLE IF NOT EXISTS risk_register (
            risk_id         TEXT PRIMARY KEY,
            org_id          TEXT NOT NULL REFERENCES organisations(org_id),
            asset_id        TEXT REFERENCES asset_register(asset_id),
            asset           TEXT,
            threat          TEXT NOT NULL,
            vulnerability   TEXT,
            likelihood      INTEGER NOT NULL DEFAULT 1,
            impact          INTEGER NOT NULL DEFAULT 1,
            score           INTEGER GENERATED ALWAYS AS (likelihood * impact) STORED,
            risk_level      TEXT,
            treatment       TEXT DEFAULT 'Mitigate' CHECK(treatment IN ('Mitigate','Accept','Transfer','Avoid')),
            treatment_plan  TEXT,
            treatment_owner TEXT,
            treatment_due   TEXT,
            residual_score  INTEGER,
            owner           TEXT,
            status          TEXT DEFAULT 'Open' CHECK(status IN ('Open','In Treatment','Closed')),
            notes           TEXT,
            created_at      TEXT NOT NULL,
            created_by      TEXT,
            updated_at      TEXT
        );

        -- Controls Mapping (risk → Annex A control)
        CREATE TABLE IF NOT EXISTS controls_mapping (
            mapping_id      TEXT PRIMARY KEY,
            org_id          TEXT NOT NULL,
            risk_id         TEXT REFERENCES risk_register(risk_id),
            annex_a_ref     TEXT NOT NULL,
            control_name    TEXT,
            applicable      INTEGER DEFAULT 1,
            justification   TEXT,
            status          TEXT DEFAULT 'Not Implemented',
            impl_date       TEXT
        );

        -- Statement of Applicability
        CREATE TABLE IF NOT EXISTS soa_entries (
            soa_id          TEXT PRIMARY KEY,
            org_id          TEXT NOT NULL REFERENCES organisations(org_id),
            annex_a_ref     TEXT NOT NULL,
            control_name    TEXT,
            category        TEXT,
            applicable      INTEGER DEFAULT 1,
            justification   TEXT,
            ai_draft        TEXT,
            implementation_status TEXT DEFAULT 'Not Started',
            human_approved  INTEGER DEFAULT 0,
            approved_by     TEXT,
            approved_at     TEXT,
            reviewed_by     TEXT,
            UNIQUE(org_id, annex_a_ref)
        );

        -- Documents Store
        CREATE TABLE IF NOT EXISTS documents_store (
            doc_id          TEXT PRIMARY KEY,
            org_id          TEXT NOT NULL REFERENCES organisations(org_id),
            type            TEXT NOT NULL,
            name            TEXT NOT NULL,
            version         TEXT DEFAULT '1.0',
            status          TEXT DEFAULT 'Not Generated',
            content_json    TEXT,
            exported_at     TEXT,
            format          TEXT,
            approved_by     TEXT,
            created_at      TEXT NOT NULL
        );

        -- Incidents
        CREATE TABLE IF NOT EXISTS incidents (
            incident_id     TEXT PRIMARY KEY,
            org_id          TEXT NOT NULL REFERENCES organisations(org_id),
            title           TEXT NOT NULL,
            description     TEXT,
            severity        TEXT DEFAULT 'Medium' CHECK(severity IN ('Critical','High','Medium','Low')),
            reported_by     TEXT,
            reported_by_id  TEXT,
            reported_date   TEXT NOT NULL,
            status          TEXT DEFAULT 'Open' CHECK(status IN ('Open','Under Investigation','Resolved','Closed')),
            resolution      TEXT,
            created_at      TEXT NOT NULL
        );

        -- Corrective Actions
        CREATE TABLE IF NOT EXISTS corrective_actions (
            action_id       TEXT PRIMARY KEY,
            org_id          TEXT NOT NULL REFERENCES organisations(org_id),
            title           TEXT NOT NULL,
            description     TEXT,
            source          TEXT DEFAULT 'Risk',
            assigned_to     TEXT,
            assigned_to_id  TEXT,
            due_date        TEXT,
            status          TEXT DEFAULT 'Open' CHECK(status IN ('Open','In Progress','Closed')),
            priority        TEXT DEFAULT 'Medium' CHECK(priority IN ('High','Medium','Low')),
            related_to      TEXT,
            closed_at       TEXT,
            created_at      TEXT NOT NULL,
            created_by      TEXT
        );

        -- Internal Audits
        CREATE TABLE IF NOT EXISTS audits (
            audit_id        TEXT PRIMARY KEY,
            org_id          TEXT NOT NULL REFERENCES organisations(org_id),
            title           TEXT NOT NULL,
            type            TEXT DEFAULT 'Internal',
            scope           TEXT,
            scheduled_date  TEXT,
            auditor         TEXT,
            auditor_id      TEXT,
            status          TEXT DEFAULT 'Scheduled' CHECK(status IN ('Scheduled','In Progress','Completed')),
            findings        TEXT,
            created_at      TEXT NOT NULL,
            created_by      TEXT
        );

        -- Management Reviews
        CREATE TABLE IF NOT EXISTS management_reviews (
            review_id       TEXT PRIMARY KEY,
            org_id          TEXT NOT NULL REFERENCES organisations(org_id),
            review_date     TEXT NOT NULL,
            attendees       TEXT,    -- JSON array
            agenda          TEXT,    -- JSON array
            decisions       TEXT,
            ai_draft_minutes TEXT,
            approved_by     TEXT,
            approved_at     TEXT,
            created_at      TEXT NOT NULL
        );

        -- Notifications
        CREATE TABLE IF NOT EXISTS notifications (
            notif_id        TEXT PRIMARY KEY,
            org_id          TEXT NOT NULL,
            user_id         TEXT,
            type            TEXT,
            title           TEXT NOT NULL,
            message         TEXT,
            read_at         TEXT,
            created_at      TEXT NOT NULL
        );

        -- Audit Log (immutable)
        CREATE TABLE IF NOT EXISTS audit_log (
            log_id          TEXT PRIMARY KEY,
            org_id          TEXT,
            user_id         TEXT,
            user_name       TEXT,
            user_role       TEXT,
            action          TEXT NOT NULL,
            entity_type     TEXT,
            entity_id       TEXT,
            description     TEXT,
            old_value       TEXT,
            new_value       TEXT,
            ip_address      TEXT,
            timestamp       TEXT NOT NULL
        );

        -- AI Response Cache
        CREATE TABLE IF NOT EXISTS ai_response_cache (
            cache_id        TEXT PRIMARY KEY,
            prompt_hash     TEXT NOT NULL,
            org_context_hash TEXT,
            response_text   TEXT NOT NULL,
            engine          TEXT,
            tokens_used     INTEGER,
            created_at      TEXT NOT NULL,
            expires_at      TEXT NOT NULL,
            UNIQUE(prompt_hash, org_context_hash)
        );

        -- Password reset tokens
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            token_id         TEXT PRIMARY KEY,
            user_id          TEXT NOT NULL REFERENCES users(user_id),
            token_hash       TEXT NOT NULL,
            expires_at       TEXT NOT NULL,
            used             INTEGER DEFAULT 0
        );
    """)

    conn.commit()
    conn.close()
    print("[OK] Database initialised.")
