import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape

logger = logging.getLogger(__name__)

MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
MAIL_PORT = int(os.environ.get('MAIL_PORT', '587'))
MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() == 'true'
MAIL_USERNAME = os.environ.get('MAIL_USERNAME', '').strip()
MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', '')
MAIL_FROM_NAME = os.environ.get('MAIL_FROM_NAME', 'ISMS Compass')
MAIL_FROM_ADDRESS = os.environ.get('MAIL_FROM_ADDRESS', MAIL_USERNAME or 'no-reply@example.com')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/')


def _render_email_html(title: str, intro_html: str, cta_text: str, cta_url: str, extra_html: str = '') -> str:
    return f"""<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#1f2937;">
    <div style="max-width:640px;margin:24px auto;padding:0 16px;">
      <div style="background:#1F3864;color:#ffffff;padding:16px 20px;border-radius:10px 10px 0 0;font-size:20px;font-weight:700;">
        ISMS Compass
      </div>
      <div style="background:#ffffff;padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 10px 10px;">
        <h2 style="margin:0 0 14px 0;color:#111827;">{escape(title)}</h2>
        {intro_html}
        <div style="margin:24px 0;">
          <a href="{escape(cta_url)}" style="background:#1F3864;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;display:inline-block;">
            {escape(cta_text)}
          </a>
        </div>
        {extra_html}
      </div>
      <p style="font-size:12px;color:#6b7280;text-align:center;margin-top:16px;">
        This email was sent by ISMS Compass. Do not reply to this email.
      </p>
    </div>
  </body>
</html>"""


def _send_email(to_email: str, subject: str, html_body: str, text_body: str):
    if not MAIL_USERNAME:
        logger.warning("MAIL_USERNAME is not configured. Skipping email send for subject '%s'.", subject)
        return

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{MAIL_FROM_NAME} <{MAIL_FROM_ADDRESS}>"
        msg['To'] = to_email

        msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
        msg.attach(MIMEText(html_body, 'html', 'utf-8'))

        with smtplib.SMTP(MAIL_SERVER, MAIL_PORT, timeout=15) as server:
            if MAIL_USE_TLS:
                server.starttls()
            server.login(MAIL_USERNAME, MAIL_PASSWORD)
            server.sendmail(MAIL_FROM_ADDRESS, [to_email], msg.as_string())
    except Exception as exc:
        logger.exception("Failed to send email to %s: %s", to_email, exc)


def send_welcome_email(to_email: str, to_name: str, org_name: str):
    safe_name = escape(to_name or 'there')
    safe_org = escape(org_name)
    subject = f"Welcome to ISMS Compass — {org_name}"
    html_body = _render_email_html(
        title=f"Welcome, {safe_name}",
        intro_html=(
            f"<p style='margin:0 0 10px 0;'>Welcome to <strong>{safe_org}</strong> on ISMS Compass.</p>"
            "<p style='margin:0;'>ISMS Compass helps you implement ISO 27001 with guided workflows and practical templates."
            " You can collaborate with your team, track progress, and maintain a clear audit trail as you move toward certification.</p>"
        ),
        cta_text="Log In to ISMS Compass",
        cta_url=FRONTEND_URL,
    )
    text_body = (
        f"Welcome, {to_name}.\n\n"
        f"Welcome to {org_name} on ISMS Compass.\n"
        "ISMS Compass helps you implement ISO 27001 with guided workflows and practical templates.\n\n"
        f"Log in: {FRONTEND_URL}\n\n"
        "This email was sent by ISMS Compass. Do not reply."
    )
    _send_email(to_email, subject, html_body, text_body)


def send_invite_email(
    to_email: str,
    to_name: str,
    org_name: str,
    invite_code: str,
    invited_by_name: str,
    role: str,
):
    subject = f"You've been invited to join {org_name} on ISMS Compass"
    accept_url = f"{FRONTEND_URL}/accept-invite?email={to_email}"
    html_body = _render_email_html(
        title="You're Invited",
        intro_html=(
            f"<p style='margin:0 0 10px 0;'>{escape(invited_by_name)} has invited you to join "
            f"<strong>{escape(org_name)}</strong> as <strong>{escape(role)}</strong>.</p>"
            "<p style='margin:0 0 10px 0;'>Use this invite code to activate your account:</p>"
            f"<div style='font-family:monospace;font-size:24px;font-weight:700;"
            f"padding:12px;background:#f9fafb;border:1px dashed #9ca3af;border-radius:8px;letter-spacing:2px;'>"
            f"{escape(invite_code)}</div>"
        ),
        cta_text="Accept Invitation",
        cta_url=accept_url,
        extra_html="<p style='margin-top:12px;color:#4b5563;'>This code expires in 48 hours.</p>",
    )
    text_body = (
        f"Hello {to_name or 'there'},\n\n"
        f"{invited_by_name} has invited you to join {org_name} as {role}.\n"
        f"Invite code: {invite_code}\n"
        f"Accept invitation: {accept_url}\n"
        "This code expires in 48 hours.\n\n"
        "This email was sent by ISMS Compass. Do not reply."
    )
    _send_email(to_email, subject, html_body, text_body)


def send_password_reset_email(to_email: str, to_name: str, reset_url: str):
    subject = "ISMS Compass — Password Reset Request"
    html_body = _render_email_html(
        title="Password Reset Request",
        intro_html=(
            "<p style='margin:0 0 10px 0;'>We received a request to reset your password.</p>"
            "<p style='margin:0;'>Use the button below to set a new password.</p>"
        ),
        cta_text="Reset My Password",
        cta_url=reset_url,
        extra_html=(
            "<p style='margin-top:12px;color:#4b5563;'>This link expires in 1 hour.</p>"
            "<p style='margin:8px 0 0 0;color:#4b5563;'>If you did not request this, you can ignore this email.</p>"
        ),
    )
    text_body = (
        f"Hello {to_name or 'there'},\n\n"
        "We received a request to reset your password.\n"
        f"Reset your password: {reset_url}\n"
        "This link expires in 1 hour.\n"
        "If you did not request this, you can ignore this email.\n\n"
        "This email was sent by ISMS Compass. Do not reply."
    )
    _send_email(to_email, subject, html_body, text_body)


def send_password_changed_email(to_email: str, to_name: str):
    subject = "ISMS Compass — Your password was changed"
    html_body = _render_email_html(
        title="Password Changed",
        intro_html=(
            "<p style='margin:0 0 10px 0;'>Your ISMS Compass password was just changed.</p>"
            "<p style='margin:0;'>If this was not you, contact your ISMS Owner immediately.</p>"
        ),
        cta_text="Log In to ISMS Compass",
        cta_url=FRONTEND_URL,
    )
    text_body = (
        f"Hello {to_name or 'there'},\n\n"
        "Your ISMS Compass password was just changed.\n"
        "If this was not you, contact your ISMS Owner immediately.\n\n"
        f"Log in: {FRONTEND_URL}\n\n"
        "This email was sent by ISMS Compass. Do not reply."
    )
    _send_email(to_email, subject, html_body, text_body)
