import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from ..config import Config

logger = logging.getLogger("sentinelx.email")


class EmailService:
    """
    Robust Email Service for SentinelX.
    Supports standard SMTP (Gmail App Passwords, Outlook, Brevo, AWS SES)
    with an automatic, non-blocking Development Simulator fallback when SMTP is not configured.
    """

    @classmethod
    def is_smtp_configured(cls) -> bool:
        return bool(Config.SMTP_USER and Config.SMTP_PASSWORD and Config.SMTP_HOST)

    @classmethod
    def send_email(cls, to_email: str, subject: str, html_body: str, text_body: str = None) -> dict:
        """
        Send an email via SMTP or fallback to dev console log.
        """
        to_email = to_email.strip()
        from_email = Config.SMTP_FROM_EMAIL or Config.SMTP_USER or "no-reply@sentinelx.gov.bd"
        from_name = Config.SMTP_FROM_NAME or "SentinelX National Command"

        if cls.is_smtp_configured():
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = formataddr((from_name, from_email))
                msg["To"] = to_email

                if text_body:
                    msg.attach(MIMEText(text_body, "plain", "utf-8"))
                if html_body:
                    msg.attach(MIMEText(html_body, "html", "utf-8"))

                logger.info(f"[Email] Connecting to SMTP server {Config.SMTP_HOST}:{Config.SMTP_PORT}...")
                with smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT, timeout=12) as server:
                    if Config.SMTP_USE_TLS:
                        server.starttls()
                    server.login(Config.SMTP_USER, Config.SMTP_PASSWORD)
                    server.sendmail(from_email, [to_email], msg.as_string())

                logger.info(f"[Email] Successfully dispatched email to {to_email} via SMTP.")
                return {
                    "success": True,
                    "mode": "smtp",
                    "recipient": to_email,
                    "message": f"Email successfully sent to {to_email}."
                }
            except Exception as e:
                logger.error(f"[Email] SMTP dispatch failed ({e}). Falling back to development logger.")

        # Development Fallback / Console Output
        print("\n" + "=" * 70)
        print("          SENTINELX SECURE EMAIL DISPATCH (DEV MODE)")
        print("=" * 70)
        print(f"FROM   : {from_name} <{from_email}>")
        print(f"TO     : {to_email}")
        print(f"SUBJECT: {subject}")
        print("-" * 70)
        if text_body:
            print(text_body.strip())
        else:
            print("(HTML message generated)")
        print("=" * 70 + "\n")

        return {
            "success": True,
            "mode": "dev_simulated",
            "recipient": to_email,
            "message": f"[Dev Mode] Email simulated for {to_email}. Check terminal output for credentials/OTP."
        }

    @classmethod
    def send_verification_otp(cls, to_email: str, otp_code: str, recipient_name: str = "Citizen") -> dict:
        """
        Dispatches a 6-digit email verification OTP code.
        """
        subject = f"SentinelX Security Code: {otp_code}"
        
        text_body = f"""
Dear {recipient_name},

Your SentinelX National Security Portal verification code is: {otp_code}

This one-time passcode (OTP) will expire in 10 minutes.
If you did not request this verification code, please ignore this email.

SentinelX Cyber Command & Public Safety Network
Government of the People's Republic of Bangladesh
"""

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SentinelX Security Code</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 540px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
    <!-- Header -->
    <tr>
      <td style="padding: 24px 32px; background: linear-gradient(135deg, #02204d 0%, #0369a1 100%); border-bottom: 2px solid #0284c7;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 1.5px; text-transform: uppercase;">
                SENTINEL<span style="color: #38bdf8;">X</span>
              </span>
              <div style="font-size: 11px; color: #bae6fd; letter-spacing: 0.5px; margin-top: 4px;">
                National Public Safety & Law Enforcement Registry
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 32px 32px 24px 32px; color: #e2e8f0;">
        <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #f8fafc; font-weight: 700;">
          Identity Verification Code
        </h2>
        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: #94a3b8;">
          Hello <strong style="color: #f1f5f9;">{recipient_name}</strong>, use the one-time verification passcode below to verify your email address and activate your SentinelX citizen account:
        </p>

        <!-- OTP Box -->
        <div style="text-align: center; margin: 24px 0; padding: 20px; background-color: #090d16; border: 1px dashed #0284c7; border-radius: 12px;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #38bdf8; font-weight: 600; margin-bottom: 6px;">
            One-Time Passcode (OTP)
          </div>
          <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; font-family: monospace;">
            {otp_code}
          </div>
          <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
            Valid for the next <strong>10 minutes</strong>
          </div>
        </div>

        <p style="margin: 20px 0 0 0; font-size: 12px; line-height: 1.5; color: #64748b;">
          <strong>Security Notice:</strong> Never share this code with anyone. Official SentinelX staff will never ask for your verification code or password.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 16px 32px; background-color: #090d16; border-top: 1px solid #1e293b; text-align: center; font-size: 11px; color: #475569;">
        Government of the People's Republic of Bangladesh &bull; SentinelX Central Command
      </td>
    </tr>
  </table>
</body>
</html>
"""
        return cls.send_email(to_email, subject, html_body, text_body)

    @classmethod
    def send_temporary_password(
        cls,
        to_email: str,
        full_name: str,
        role: str,
        designation: str,
        badge: str,
        station_or_thana: str,
        temp_password: str,
        login_url: str = None
    ) -> dict:
        """
        Dispatches official authority credentials and temporary password to a newly provisioned officer.
        """
        portal_url = login_url or Config.FRONTEND_URL or "http://localhost:3000"
        role_label = "Bangladesh Police Authority" if role == "POLICE" else "Consumer Rights (DNCRP) Enforcement"
        subject = f"Official Account Provisioned: SentinelX {role_label} Access Credentials"

        text_body = f"""
CONFIDENTIAL & OFFICIAL
SENTINELX NATIONAL CENTRAL COMMAND

Dear {full_name},

Your official authority account has been provisioned on the SentinelX Public Safety & Law Enforcement Platform.

ACCOUNT CREDENTIALS:
- Official Role    : {role} ({role_label})
- Designation/Rank : {designation or 'Official'}
- Badge / Id Number: {badge or 'N/A'}
- Jurisdiction     : {station_or_thana}
- Official Email   : {to_email}
- Temporary Password: {temp_password}

PORTAL ACCESS: {portal_url}

MANDATORY SECURITY PROTOCOL:
Upon your first login using this temporary password, the system will immediately require you to establish a permanent, personal password. Do not disclose this temporary password.

SentinelX Directorate of Command & Enforcement
Government of the People's Republic of Bangladesh
"""

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SentinelX Authority Provisioning</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
    <!-- Header -->
    <tr>
      <td style="padding: 24px 32px; background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%); border-bottom: 2px solid #6366f1;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 1.5px; text-transform: uppercase;">
                SENTINEL<span style="color: #a5b4fc;">X</span>
              </span>
              <div style="font-size: 11px; color: #c7d2fe; letter-spacing: 0.5px; margin-top: 4px;">
                Official Authority Access Clearance &bull; National Enforcement
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 32px 32px 24px 32px; color: #e2e8f0;">
        <div style="display: inline-block; padding: 4px 10px; background-color: #312e81; border: 1px solid #6366f1; border-radius: 6px; font-size: 11px; font-weight: 700; color: #c7d2fe; text-transform: uppercase; margin-bottom: 16px;">
          {role_label}
        </div>

        <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #f8fafc; font-weight: 700;">
          Welcome to SentinelX, {full_name}
        </h2>
        <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.5; color: #94a3b8;">
          Your official operational account has been provisioned by Central Command. Your clearance credentials and jurisdiction parameters are detailed below:
        </p>

        <!-- Officer Details Table -->
        <table width="100%" cellpadding="8" cellspacing="0" style="background-color: #090d16; border: 1px solid #1e293b; border-radius: 10px; margin-bottom: 20px; font-size: 12px;">
          <tr>
            <td style="color: #64748b; width: 38%; border-bottom: 1px solid #1e293b;">Rank / Designation:</td>
            <td style="color: #f1f5f9; font-weight: 600; border-bottom: 1px solid #1e293b;">{designation or 'Officer'}</td>
          </tr>
          <tr>
            <td style="color: #64748b; border-bottom: 1px solid #1e293b;">Badge / ID Number:</td>
            <td style="color: #a5b4fc; font-weight: 700; font-family: monospace; border-bottom: 1px solid #1e293b;">{badge or 'N/A'}</td>
          </tr>
          <tr>
            <td style="color: #64748b; border-bottom: 1px solid #1e293b;">Assigned Station:</td>
            <td style="color: #f1f5f9; font-weight: 600; border-bottom: 1px solid #1e293b;">{station_or_thana}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Login Email:</td>
            <td style="color: #38bdf8; font-weight: 600; font-family: monospace;">{to_email}</td>
          </tr>
        </table>

        <!-- Temporary Password Card -->
        <div style="background: linear-gradient(135deg, #18181b 0%, #1e1b4b 100%); border: 1px solid #6366f1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #a5b4fc; font-weight: 700; margin-bottom: 6px;">
            Temporary Access Password
          </div>
          <div style="font-size: 24px; font-weight: 800; letter-spacing: 2px; color: #ffffff; font-family: monospace; padding: 6px 12px; background-color: #090d16; border-radius: 8px; display: inline-block; border: 1px dashed #818cf8;">
            {temp_password}
          </div>
          <div style="font-size: 11px; color: #f59e0b; margin-top: 10px; font-weight: 600;">
            ⚠️ Mandatory: You will be required to change this password immediately upon first login.
          </div>
        </div>

        <!-- Call to Action -->
        <div style="text-align: center; margin: 26px 0;">
          <a href="{portal_url}" style="background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 13px; display: inline-block; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4);">
            Access SentinelX Portal &rarr;
          </a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 16px 32px; background-color: #090d16; border-top: 1px solid #1e293b; text-align: center; font-size: 11px; color: #475569;">
        CONFIDENTIAL &bull; For Official Authorized Law Enforcement Use Only
      </td>
    </tr>
  </table>
</body>
</html>
"""
        return cls.send_email(to_email, subject, html_body, text_body)
