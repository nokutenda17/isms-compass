"""Shared helper to write immutable audit log entries."""
import uuid
from datetime import datetime, timezone
from models import get_db


def log(org_id: str, user_id: str, user_name: str, user_role: str,
        action: str, description: str,
        entity_type: str = None, entity_id: str = None,
        old_value: str = None, new_value: str = None,
        ip_address: str = None):
    conn = get_db()
    try:
        if not user_name and user_id:
            user = conn.execute("SELECT name FROM users WHERE user_id=?", (user_id,)).fetchone()
            if user:
                user_name = user['name']

        conn.execute(
            """INSERT INTO audit_log
               (log_id, org_id, user_id, user_name, user_role, action,
                entity_type, entity_id, description, old_value, new_value,
                ip_address, timestamp)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (str(uuid.uuid4()), org_id, user_id, user_name, user_role, action,
             entity_type, entity_id, description, old_value, new_value,
             ip_address, datetime.now(timezone.utc).isoformat())
        )
        conn.commit()
    except Exception as e:
        print(f"Audit log write failed: {e}")
    finally:
        conn.close()
