import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from app.core.config import settings


def _build_html(title: str, body_html: str) -> str:
    return f"""
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><style>
  body {{ font-family: Arial, sans-serif; background: #0a0a0f; color: #e2e8f0; margin: 0; padding: 20px; }}
  .container {{ max-width: 600px; margin: 0 auto; background: #12121a; border-radius: 16px; padding: 40px; border: 1px solid #2a2a3e; }}
  .logo {{ text-align: center; margin-bottom: 30px; }}
  .logo h1 {{ color: #d4a017; font-size: 22px; margin: 0; }}
  .content {{ margin: 20px 0; line-height: 1.8; }}
  .btn {{ display: inline-block; background: #d4a017; color: #0a0a0f; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: bold; margin: 20px 0; }}
  .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #2a2a3e; font-size: 12px; color: #666; text-align: center; }}
</style></head>
<body>
  <div class="container">
    <div class="logo"><h1>🎓 مملكة الأرض الافتراضية</h1><p style="color:#666;margin:4px 0;font-size:13px;">Virtual Earth Kingdom University</p></div>
    <h2 style="color:#d4a017;margin-bottom:10px;">{title}</h2>
    <div class="content">{body_html}</div>
    <div class="footer"><p>هذا البريد أُرسل تلقائياً — لا تردّ عليه</p><p>© 2025 جامعة مملكة الأرض الافتراضية</p></div>
  </div>
</body>
</html>"""


def _send_sync(to_email: str, subject: str, html_body: str):
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"[EMAIL SKIP] No SMTP config. Would send to {to_email}: {subject}")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"جامعة مملكة الأرض <{settings.SMTP_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send to {to_email}: {e}")


async def send_email(to_email: str, subject: str, html_body: str):
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _send_sync, to_email, subject, html_body)


async def send_welcome_email(to_email: str, name: str, student_id: str):
    body = f"""
<p>مرحباً <strong>{name}</strong>،</p>
<p>نرحب بك في جامعة مملكة الأرض الافتراضية! تم تفعيل حسابك بنجاح.</p>
<p><strong>رقمك الجامعي:</strong> {student_id}</p>
<p><strong>بريدك الإلكتروني:</strong> {to_email}</p>
<a href="https://s7sai.cloud/auth/login" class="btn">ابدأ التعلم الآن</a>
<p>في حال واجهتك أي مشكلة، تواصل مع الدعم الفني عبر الموقع.</p>"""
    await send_email(to_email, "🎓 مرحباً بك في جامعة مملكة الأرض الافتراضية", _build_html("مرحباً بك!", body))


async def send_password_reset_email(to_email: str, name: str, reset_token: str):
    reset_url = f"https://s7sai.cloud/auth/reset-password?token={reset_token}"
    body = f"""
<p>مرحباً <strong>{name}</strong>،</p>
<p>تلقّينا طلباً لإعادة تعيين كلمة مرور حسابك.</p>
<a href="{reset_url}" class="btn">إعادة تعيين كلمة المرور</a>
<p style="color:#888;font-size:13px;">⏱️ هذا الرابط صالح لمدة <strong>30 دقيقة</strong> فقط.</p>
<p style="color:#888;font-size:13px;">إذا لم تطلب هذا، تجاهل هذه الرسالة — حسابك بأمان.</p>"""
    await send_email(to_email, "🔐 إعادة تعيين كلمة المرور", _build_html("إعادة تعيين كلمة المرور", body))


async def send_grade_notification(to_email: str, name: str, course: str, grade: str):
    body = f"""
<p>مرحباً <strong>{name}</strong>،</p>
<p>تم رصد درجتك في مادة <strong>{course}</strong>.</p>
<p style="font-size:32px;color:#d4a017;text-align:center;font-weight:bold;">{grade}</p>
<a href="https://s7sai.cloud/student/grades" class="btn">عرض درجاتي</a>"""
    await send_email(to_email, f"📊 درجتك في {course}", _build_html("نتيجة المادة", body))
