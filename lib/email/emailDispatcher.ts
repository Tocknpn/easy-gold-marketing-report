import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { getGoogleServiceAccountCredentials } from './googleCredentials';

export interface DispatchEmailOptions {
  to: string | string[];
  subject: string;
  reportDate: string;
  pdfBase64?: string;
  quickBriefBase64?: string;
  dailyVelocityBase64?: string;
  summaryData?: any;
}

export interface DispatchResult {
  sent: boolean;
  provider: 'google_apps_script' | 'google_service_account' | 'gmail_smtp' | 'custom_smtp' | 'resend' | 'simulated';
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

async function sendGmailApi(
  accessToken: string,
  fromEmail: string,
  toList: string[],
  subject: string,
  htmlBody: string,
  pdfBase64?: string,
  pdfFilename?: string,
  quickBriefBase64?: string,
  dailyVelocityBase64?: string
) {
  const boundaryMixed = `easygold_mixed_${Date.now()}`;
  const boundaryRelated = `easygold_related_${Date.now()}`;
  const filename = pdfFilename || 'Easy_Gold_Executive_Report.pdf';

  let rawEmailParts: string[] = [
    `From: ${fromEmail}`,
    `To: ${toList.join(', ')}`,
    `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundaryMixed}"`,
    '',
    `--${boundaryMixed}`,
    `Content-Type: multipart/related; boundary="${boundaryRelated}"`,
    '',
    `--${boundaryRelated}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlBody,
  ];

  if (quickBriefBase64) {
    rawEmailParts.push(
      '',
      `--${boundaryRelated}`,
      'Content-Type: image/jpeg; name="quick_brief.jpg"',
      'Content-Transfer-Encoding: base64',
      'Content-ID: <quick_brief>',
      'Content-Disposition: inline; filename="quick_brief.jpg"',
      '',
      quickBriefBase64
    );
  }

  if (dailyVelocityBase64) {
    rawEmailParts.push(
      '',
      `--${boundaryRelated}`,
      'Content-Type: image/jpeg; name="daily_velocity.jpg"',
      'Content-Transfer-Encoding: base64',
      'Content-ID: <daily_velocity>',
      'Content-Disposition: inline; filename="daily_velocity.jpg"',
      '',
      dailyVelocityBase64
    );
  }

  rawEmailParts.push('', `--${boundaryRelated}--`);

  if (pdfBase64) {
    rawEmailParts.push(
      '',
      `--${boundaryMixed}`,
      `Content-Type: application/pdf; name="${filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${filename}"`,
      '',
      pdfBase64
    );
  }

  rawEmailParts.push('', `--${boundaryMixed}--`);

  const rawEmail = rawEmailParts.join('\r\n');
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
export function buildReportEmailHtml(
  reportDate: string,
  options?: { quickBriefBase64?: string; dailyVelocityBase64?: string; useCid?: boolean }
): string {
  const useCid = options?.useCid !== false;
  const qbSrc = options?.quickBriefBase64
    ? useCid
      ? 'cid:quick_brief'
      : `data:image/jpeg;base64,${options.quickBriefBase64}`
    : 'cid:quick_brief';

  const dvSrc = options?.dailyVelocityBase64
    ? useCid
      ? 'cid:daily_velocity'
      : `data:image/jpeg;base64,${options.dailyVelocityBase64}`
    : 'cid:daily_velocity';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Easy Gold Marketing BI report - ${reportDate}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
  <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="padding: 28px 32px;">
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px 0; color: #0f172a;">
        Dear Team,<br><br>
        Please see the email attached for the more information about the Easy Gold Marketing Report up to <strong>${reportDate}</strong>
      </p>

      <div style="margin: 20px 0 0 0;">
        <div style="margin-bottom: 20px; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; background: #ffffff;">
          <img src="${qbSrc}" alt="Quick Brief Top Line Performance" style="width: 100%; height: auto; display: block; border: 0;" />
        </div>
        <div style="margin-bottom: 12px; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; background: #ffffff;">
          <img src="${dvSrc}" alt="Easy Gold Marketing Daily Performance - Daily Velocity" style="width: 100%; height: auto; display: block; border: 0;" />
        </div>
      </div>
    </div>
    <div style="background: #f8fafc; padding: 14px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
      Easy Gold Marketing &amp; Financial Reporting
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
  const safeDate = (options.reportDate || 'Daily').replace(/\//g, '-');
  const pdfFilename = `Easy_Gold_Executive_Report_${safeDate}.pdf`;

  // 0. Check for Google Apps Script Web App Gateway (Sends natively from your Gmail with mailed-by: gmail.com)
  const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL || process.env.GMAIL_PROXY_URL;
  if (appsScriptUrl) {
    try {
      const res = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientList.join(', '),
          subject: options.subject,
          html: buildReportEmailHtml(options.reportDate, {
            quickBriefBase64: options.quickBriefBase64,
            dailyVelocityBase64: options.dailyVelocityBase64,
            useCid: true,
          }),
          pdfBase64: options.pdfBase64 || null,
          quickBriefBase64: options.quickBriefBase64 || null,
          dailyVelocityBase64: options.dailyVelocityBase64 || null,
          reportDate: options.reportDate,
          body: `Daily Easy Gold Marketing BI report for ${options.reportDate}`,
        }),
      });

      const data = await res.json().catch(() => ({ success: res.ok }));
      if (res.ok && data.success !== false) {
        return {
          sent: true,
          provider: 'google_apps_script',
          messageId: data.messageId || `gas_${Date.now()}`,
          message: `Email successfully delivered to ${recipientString} via Google Apps Script (from your Gmail)`,
        };
      } else {
        throw new Error(data.error || `HTTP ${res.status}: Failed to dispatch via Google Apps Script`);
      }
    } catch (err: any) {
      console.warn('Google Apps Script gateway dispatch failed, falling back:', err?.message || err);
    }
  }

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
        buildReportEmailHtml(options.reportDate, {
          quickBriefBase64: options.quickBriefBase64,
          dailyVelocityBase64: options.dailyVelocityBase64,
          useCid: true,
        }),
        options.pdfBase64,
        pdfFilename,
        options.quickBriefBase64,
        options.dailyVelocityBase64
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
      const resendAttachments: any[] = [];
      if (options.pdfBase64) {
        resendAttachments.push({
          filename: pdfFilename,
          content: options.pdfBase64,
        });
      }
      if (options.quickBriefBase64) {
        resendAttachments.push({
          filename: 'quick_brief.jpg',
          content: options.quickBriefBase64,
          content_id: 'quick_brief',
          disposition: 'inline',
        });
      }
      if (options.dailyVelocityBase64) {
        resendAttachments.push({
          filename: 'daily_velocity.jpg',
          content: options.dailyVelocityBase64,
          content_id: 'daily_velocity',
          disposition: 'inline',
        });
      }

      const resendPayload: Record<string, any> = {
        from: fromEmail,
        to: recipientList,
        subject: options.subject,
        html: buildReportEmailHtml(options.reportDate, {
          quickBriefBase64: options.quickBriefBase64,
          dailyVelocityBase64: options.dailyVelocityBase64,
          useCid: true,
        }),
      };
      if (resendAttachments.length > 0) {
        resendPayload.attachments = resendAttachments;
      }
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify(resendPayload),
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

      const attachments: any[] = [];
      if (options.pdfBase64) {
        attachments.push({
          filename: pdfFilename,
          content: Buffer.from(options.pdfBase64, 'base64'),
          contentType: 'application/pdf',
        });
      }
      if (options.quickBriefBase64) {
        attachments.push({
          filename: 'quick_brief.jpg',
          content: Buffer.from(options.quickBriefBase64, 'base64'),
          cid: 'quick_brief',
        });
      }
      if (options.dailyVelocityBase64) {
        attachments.push({
          filename: 'daily_velocity.jpg',
          content: Buffer.from(options.dailyVelocityBase64, 'base64'),
          cid: 'daily_velocity',
        });
      }

      const info = await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'Easy Gold Executive Report'}" <${smtpUser}>`,
        to: recipientString,
        subject: options.subject,
        html: buildReportEmailHtml(options.reportDate, {
          quickBriefBase64: options.quickBriefBase64,
          dailyVelocityBase64: options.dailyVelocityBase64,
          useCid: true,
        }),
        attachments: attachments.length > 0 ? attachments : undefined,
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
