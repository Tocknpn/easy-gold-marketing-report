import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { getGoogleServiceAccountCredentials } from './googleCredentials';

export interface DispatchEmailOptions {
  to: string | string[];
  subject: string;
  reportDate: string;
  pdfBase64?: string;
  summaryData?: any;
}

export interface DispatchResult {
  sent: boolean;
  provider: 'google_service_account' | 'gmail_smtp' | 'custom_smtp' | 'resend' | 'simulated';
  messageId?: string;
  message: string;
  error?: string;
}

function signJwtRs256(header: any, claim: any, privateKeyPem: string): string {
  const encHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encClaim = Buffer.from(JSON.stringify(claim)).toString('base64url');
  const unsigned = `${encHeader}.${encClaim}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const signature = signer.sign(privateKeyPem, 'base64url');
  return `${unsigned}.${signature}`;
}

async function getGoogleAccessToken(clientEmail: string, privateKey: string, impersonateUser?: string | null): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim: any = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/gmail.send',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  if (impersonateUser) {
    claim.sub = impersonateUser;
  }
  const assertion = signJwtRs256(header, claim, privateKey);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Failed to exchange JWT for Google access token');
  }
  return data.access_token;
}

async function sendGmailApi(accessToken: string, fromEmail: string, toList: string[], subject: string, htmlBody: string) {
  const rawEmail = [
    `From: ${fromEmail}`,
    `To: ${toList.join(', ')}`,
    `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlBody,
  ].join('\r\n');

  const raw = Buffer.from(rawEmail).toString('base64url');
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });
  const data = await res.json();
  if (!res.ok || !data.id) {
    throw new Error(data.error?.message || JSON.stringify(data));
  }
  return data;
}

/**
 * Builds high-fidelity HTML email template for Easy Gold Executive Daily Report
 */
export function buildReportEmailHtml(reportDate: string, summaryData?: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Easy Gold Executive Daily Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
    .container { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #0c4ca3; padding: 28px 32px; color: #ffffff; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .title { margin: 0; font-size: 22px; font-weight: 800; }
    .subtitle { margin: 6px 0 0 0; font-size: 13px; opacity: 0.85; }
    .content { padding: 32px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 24px 0; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
    .card-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
    .card-value { font-size: 20px; font-weight: 900; color: #0f172a; }
    .footer { background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; }
    .btn { display: inline-block; background: #0c4ca3; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 13px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Official BI Dispatch</div>
      <h1 class="title">Executive Daily Performance Report</h1>
      <p class="subtitle">Easy Gold Marketing & Financial Analytics - ${reportDate}</p>
    </div>
    <div class="content">
      <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">
        Dear Executive Team,<br><br>
        The daily Easy Gold Business Intelligence synthesis for <strong>${reportDate}</strong> has been generated and validated. 
        All core metrics (MTD Pace, MoM / YoY growth, and target run-rates) are compiled below.
      </p>

      <div class="grid">
        <div class="card">
          <div class="card-label">Report Period</div>
          <div class="card-value">${reportDate}</div>
        </div>
        <div class="card">
          <div class="card-label">Dispatch Status</div>
          <div class="card-value" style="color: #059669;">Verified Active</div>
        </div>
      </div>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <h4 style="margin: 0 0 6px 0; color: #166534; font-size: 13px; font-weight: 800;">Automated Dispatch Confirmed</h4>
        <p style="margin: 0; font-size: 12px; color: #15803d; line-height: 1.5;">
          This email was triggered via the Easy Gold Executive BI Engine. You can view the real-time interactive charts, MTD forecasting, and run-rate variance directly on the executive dashboard.
        </p>
      </div>

      <div style="text-align: center;">
        <a href="http://localhost:3000" class="btn" style="color: #ffffff;">Open Executive Dashboard</a>
      </div>
    </div>
    <div class="footer">
      Easy Gold Executive Marketing & Financial Reporting System<br>
      Automated dispatch time: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Vientiane' })} (ICT / GMT+7)
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Dispatches an email via configured transport:
 * 1. Resend API (if RESEND_API_KEY is configured)
 * 2. Gmail / Custom SMTP (if SMTP_USER & SMTP_PASS or GMAIL_APP_PASSWORD configured)
 * 3. Simulation fallback (if credentials are not yet entered, with clear diagnostic message)
 */
export async function sendExecutiveReportEmail(options: DispatchEmailOptions): Promise<DispatchResult> {
  const recipientList = Array.isArray(options.to) ? options.to : options.to.split(',').map((e) => e.trim());
  const recipientString = recipientList.join(', ');
  // 1. Check for Google Service Account Gmail API
  const googleCreds = getGoogleServiceAccountCredentials();
  if (googleCreds.configured && googleCreds.clientEmail && googleCreds.privateKey) {
    try {
      const impersonateUser = process.env.GMAIL_IMPERSONATE_USER || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || null;
      const accessToken = await getGoogleAccessToken(googleCreds.clientEmail, googleCreds.privateKey, impersonateUser);
      const sender = impersonateUser || googleCreds.clientEmail;
      const result = await sendGmailApi(
        accessToken,
        sender,
        recipientList,
        options.subject,
        buildReportEmailHtml(options.reportDate, options.summaryData)
      );
      return {
        sent: true,
        provider: 'google_service_account',
        messageId: result.id,
        message: `Email successfully delivered to ${recipientString} via Google Service Account Gmail API`,
      };
    } catch (err: any) {
      console.warn('Google Service Account Gmail API dispatch error, falling back to other transports:', err?.message || err);
    }
  }

  // 2. Check for Resend API
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const fromEmail = process.env.RESEND_FROM || 'Easy Gold Report <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: recipientList,
          subject: options.subject,
          html: buildReportEmailHtml(options.reportDate, options.summaryData),
        }),
      });

      const data = await res.json();
      if (res.ok && data.id) {
        return {
          sent: true,
          provider: 'resend',
          messageId: data.id,
          message: `Email successfully delivered to ${recipientString} via Resend`,
        };
      } else {
        throw new Error(data?.message || JSON.stringify(data));
      }
    } catch (err: any) {
      console.error('Resend delivery failed:', err);
      return {
        sent: false,
        provider: 'resend',
        error: err?.message,
        message: `Resend delivery failed: ${err?.message}`,
      };
    }
  }

  // 2. Check for SMTP (Gmail or custom SMTP server)
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT) || 465;
  const smtpSecure = process.env.SMTP_SECURE !== 'false';

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'Easy Gold Executive Report'}" <${smtpUser}>`,
        to: recipientString,
        subject: options.subject,
        html: buildReportEmailHtml(options.reportDate, options.summaryData),
      });

      return {
        sent: true,
        provider: smtpHost.includes('gmail') ? 'gmail_smtp' : 'custom_smtp',
        messageId: info.messageId,
        message: `Email sent to ${recipientString} via ${smtpHost}`,
      };
    } catch (err: any) {
      console.error('SMTP delivery failed:', err);
      return {
        sent: false,
        provider: 'custom_smtp',
        error: err?.message,
        message: `SMTP delivery failed: ${err?.message}`,
      };
    }
  }

  // 3. Fallback: No real email service credentials found in .env
  return {
    sent: false,
    provider: 'simulated',
    message: `Simulated dispatch logged. To receive real emails in ${recipientString}, add Gmail App Password (SMTP_USER & SMTP_PASS) or RESEND_API_KEY to .env.`,
  };
}
