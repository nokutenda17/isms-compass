import io
import json
import zipfile
import csv
from flask import Blueprint, request, jsonify, g, send_file
from models import get_db
from services.auth_service import jwt_required, roles_required, now_iso
from services import doc_service, audit_helper

documents_bp = Blueprint('documents', __name__)

DOC_NAMES = {
    'information-security-policy': 'Information_Security_Policy',
    'risk-assessment-report': 'Risk_Assessment_Report',
    'risk-treatment-plan': 'Risk_Treatment_Plan',
    'soa': 'Statement_of_Applicability',
    'corrective-action-log': 'Corrective_Action_Log',
    'scope-statement': 'Scope_Statement',
}


def _get_org(conn, org_id):
    row = conn.execute("SELECT * FROM organisations WHERE org_id=?", (org_id,)).fetchone()
    return dict(row) if row else {}


def _get_step_draft(conn, org_id, step_number):
    row = conn.execute(
        "SELECT draft_data FROM isms_sessions WHERE org_id=? AND step_number=?",
        (org_id, step_number)
    ).fetchone()
    return json.loads(row['draft_data'] or '{}') if row else {}


@documents_bp.route('/documents/status', methods=['GET'])
@jwt_required
@roles_required('ISMS_Owner')
def get_document_status():
    conn = get_db()
    try:
        docs = conn.execute(
            "SELECT * FROM documents_store WHERE org_id=? ORDER BY type",
            (g.org_id,)
        ).fetchall()
        
        existing_docs = {d['type']: dict(d) for d in docs}
        result = []
        for doc_type, doc_name in DOC_NAMES.items():
            if doc_type in existing_docs:
                result.append(existing_docs[doc_type])
            else:
                result.append({
                    'doc_id': doc_type,
                    'type': doc_type,
                    'name': doc_name.replace('_', ' '),
                    'status': 'Not Generated',
                    'exported_at': None,
                    'version': '1.0'
                })
        return jsonify(result), 200
    finally:
        conn.close()


@documents_bp.route('/export/<doc_type>', methods=['GET'])
@jwt_required
@roles_required('ISMS_Owner')
def export_document(doc_type):
    fmt = request.args.get('format', 'docx').lower()
    conn = get_db()
    try:
        org = _get_org(conn, g.org_id)
        filename_base = DOC_NAMES.get(doc_type, doc_type)

        if doc_type == 'information-security-policy':
            draft = _get_step_draft(conn, g.org_id, 2)
            docx_bytes = doc_service.generate_information_security_policy(org, draft)

        elif doc_type == 'scope-statement':
            draft = _get_step_draft(conn, g.org_id, 1)
            docx_bytes = doc_service.generate_scope_statement(org, draft)

        elif doc_type == 'risk-assessment-report':
            risks = conn.execute(
                "SELECT * FROM risk_register WHERE org_id=? ORDER BY score DESC",
                (g.org_id,)
            ).fetchall()
            docx_bytes = doc_service.generate_risk_assessment_report(org, [dict(r) for r in risks])

        elif doc_type == 'soa':
            entries = conn.execute(
                "SELECT * FROM soa_entries WHERE org_id=? ORDER BY annex_a_ref",
                (g.org_id,)
            ).fetchall()
            docx_bytes = doc_service.generate_soa(org, [dict(e) for e in entries])

        elif doc_type == 'risk-treatment-plan':
            risks = conn.execute(
                "SELECT * FROM risk_register WHERE org_id=? AND treatment_plan IS NOT NULL",
                (g.org_id,)
            ).fetchall()
            docx_bytes = doc_service.generate_risk_treatment_plan(org, [dict(r) for r in risks])

        elif doc_type == 'corrective-action-log':
            actions = conn.execute(
                "SELECT * FROM corrective_actions WHERE org_id=? ORDER BY created_at DESC",
                (g.org_id,)
            ).fetchall()
            docx_bytes = doc_service.generate_corrective_action_log(org, [dict(a) for a in actions])

        else:
            return jsonify({'error': f'Unknown document type: {doc_type}'}), 400

        # Update document store
        conn.execute(
            """INSERT OR REPLACE INTO documents_store
               (doc_id, org_id, type, name, status, exported_at, format, approved_by, created_at)
               VALUES (COALESCE((SELECT doc_id FROM documents_store WHERE org_id=? AND type=?),
               lower(hex(randomblob(8)))), ?,?,?,?,?,?,?,?)""",
            (g.org_id, doc_type, g.org_id, doc_type, filename_base,
             'Ready', now_iso(), 'docx', g.user_id, now_iso())
        )
        conn.commit()

        audit_helper.log(g.org_id, g.user_id, '', g.role,
                         'DOCUMENT_EXPORTED', f"Document exported: {filename_base}.docx",
                         'document', doc_type)

        return send_file(
            io.BytesIO(docx_bytes),
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            as_attachment=True,
            download_name=f"{filename_base}_{now_iso()[:10]}.docx"
        )
    finally:
        conn.close()


@documents_bp.route('/export/audit-package', methods=['POST'])
@jwt_required
@roles_required('ISMS_Owner')
def export_audit_package():
    conn = get_db()
    try:
        org = _get_org(conn, g.org_id)
        zip_buf = io.BytesIO()

        with zipfile.ZipFile(zip_buf, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Add all generated documents
            for doc_type, filename in DOC_NAMES.items():
                try:
                    if doc_type == 'information-security-policy':
                        draft = _get_step_draft(conn, g.org_id, 2)
                        content = doc_service.generate_information_security_policy(org, draft)
                    elif doc_type == 'scope-statement':
                        draft = _get_step_draft(conn, g.org_id, 1)
                        content = doc_service.generate_scope_statement(org, draft)
                    elif doc_type == 'risk-assessment-report':
                        risks = conn.execute(
                            "SELECT * FROM risk_register WHERE org_id=?", (g.org_id,)
                        ).fetchall()
                        content = doc_service.generate_risk_assessment_report(org, [dict(r) for r in risks])
                    elif doc_type == 'soa':
                        entries = conn.execute(
                            "SELECT * FROM soa_entries WHERE org_id=?", (g.org_id,)
                        ).fetchall()
                        content = doc_service.generate_soa(org, [dict(e) for e in entries])
                    elif doc_type == 'risk-treatment-plan':
                        risks = conn.execute(
                            "SELECT * FROM risk_register WHERE org_id=?", (g.org_id,)
                        ).fetchall()
                        content = doc_service.generate_risk_treatment_plan(org, [dict(r) for r in risks])
                    elif doc_type == 'corrective-action-log':
                        actions = conn.execute(
                            "SELECT * FROM corrective_actions WHERE org_id=?", (g.org_id,)
                        ).fetchall()
                        content = doc_service.generate_corrective_action_log(org, [dict(a) for a in actions])
                    else:
                        continue
                    zf.writestr(f"{filename}.docx", content)
                except Exception as e:
                    print(f"Skipping {doc_type}: {e}")

            # Add audit log as CSV
            logs = conn.execute(
                "SELECT * FROM audit_log WHERE org_id=? ORDER BY timestamp DESC",
                (g.org_id,)
            ).fetchall()
            csv_buf = io.StringIO()
            writer = csv.DictWriter(csv_buf, fieldnames=[
                'log_id', 'user_name', 'user_role', 'action', 'description', 'timestamp'
            ])
            writer.writeheader()
            for log in logs:
                writer.writerow({
                    'log_id': log['log_id'],
                    'user_name': log['user_name'],
                    'user_role': log['user_role'],
                    'action': log['action'],
                    'description': log['description'],
                    'timestamp': log['timestamp'],
                })
            zf.writestr('Audit_Log.csv', csv_buf.getvalue())

            # Cover sheet
            cover = f"""ISMS AUDIT EVIDENCE PACKAGE
Organisation: {org.get('name', '')}
Generated: {now_iso()[:10]}
Prepared by: ISMS Compass

Contents:
{chr(10).join(f'  - {v}.docx' for v in DOC_NAMES.values())}
  - Audit_Log.csv

This package has been generated by ISMS Compass for ISO 27001:2022 certification preparation.
All documents marked DRAFT require final review and sign-off before submission to auditors.
"""
            zf.writestr('README.txt', cover)

        audit_helper.log(g.org_id, g.user_id, '', g.role,
                         'AUDIT_PACKAGE_EXPORTED', "Full audit evidence package exported")

        zip_buf.seek(0)
        return send_file(
            zip_buf,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f"ISMS_Audit_Package_{now_iso()[:10]}.zip"
        )
    finally:
        conn.close()


@documents_bp.route('/preview/<doc_type>', methods=['GET'])
@jwt_required
@roles_required('ISMS_Owner')
def preview_document(doc_type):
    """Return a simple HTML preview of the document."""
    conn = get_db()
    try:
        org = _get_org(conn, g.org_id)
        html = f"""<html><body style="font-family:Arial;max-width:800px;margin:auto;padding:2rem">
<h1 style="color:#1F3864">{DOC_NAMES.get(doc_type, doc_type)}</h1>
<p><strong>Organisation:</strong> {org.get('name', '')}</p>
<p><strong>Generated:</strong> {now_iso()[:10]}</p>
<p style="color:#F57C00"><em>DRAFT — Requires Review and Approval</em></p>
<hr/>
<p>Download the full DOCX version to see the complete formatted document.</p>
</body></html>"""
        from flask import Response
        return Response(html, mimetype='text/html')
    finally:
        conn.close()
