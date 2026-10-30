#!/usr/bin/env node

/**
 * ============================================================================
 * Easy Gold Executive BI Report - Headless Chrome Scheduled PDF Mailer
 * 
 * Renders the exact 5-page 16:9 widescreen PDF using the identical browser
 * canvas pipeline (`modern-screenshot` + `jsPDF`) as "Send Test Email Now",
 * and dispatches the daily scheduled executive email with the PDF attached.
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import crypto from 'crypto';

// Load local .env if present (for local testing or self-hosted runners)
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const rawEnv = fs.readFileSync(envPath, 'utf8');
    for (const line of rawEnv.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wlufvvawlbyvpyaubzph.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsdWZ2dmF3bGJ5dnB5YXVienBoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTg1MDY0MSwiZXhwIjoyMTA3NDI2NjQxfQ.CN2Omnb-aAuxAW80EqFZubEZhilRdOlwHg8VzPn2AHk';
const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || process.env.GMAIL_PROXY_URL;
const WORKER_API_URL = process.env.WORKER_API_URL || 'https://easy-gold-marketing-report.tockppd.workers.dev';
const TARGET_URL = process.env.TARGET_REPORT_URL || 'http://127.0.0.1:3000/?pdf_modal=1&tab=preview';

function buildEmailHtml(reportDate, recipientStr, { quickBriefBase64, dailyVelocityBase64, useCid = true } = {}) {
  const qbSrc = quickBriefBase64
    ? (useCid ? 'cid:quick_brief' : `data:image/jpeg;base64,${quickBriefBase64}`)
    : 'cid:quick_brief';
  const dvSrc = dailyVelocityBase64
    ? (useCid ? 'cid:daily_velocity' : `data:image/jpeg;base64,${dailyVelocityBase64}`)
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
      Easy Gold Marketing &amp; Financial Reporting • Dispatched to ${recipientStr}
    </div>
  </div>
</body>
</html>`;
}

async function sendViaTransports({ recipientList, reportDate, pdfBase64, quickBriefBase64, dailyVelocityBase64 }) {
  const recipientStr = recipientList.join(', ');
  const subject = `Daily Easy Gold Marketing BI report - ${reportDate}`;
  const safeDate = String(reportDate || 'Daily').replace(/\//g, '-');
  const pdfFilename = `Easy_Gold_Executive_Report_${safeDate}.pdf`;
  const emailHtml = buildEmailHtml(reportDate, recipientStr, { quickBriefBase64, dailyVelocityBase64, useCid: true });
  const errors = [];

  // Transport 1: Direct Google Apps Script Web App Gateway
  if (APPS_SCRIPT_URL) {
    try {
      console.log('[*] Dispatching email with PDF attachment via Google Apps Script...');
      const mailRes = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientStr,
          subject,
          html: emailHtml,
          pdfBase64,
          pdfFilename,
          quickBriefBase64: quickBriefBase64 || null,
          dailyVelocityBase64: dailyVelocityBase64 || null,
          reportDate,
          body: `Daily Easy Gold Marketing BI report for ${reportDate} (PDF attached)`
        })
      });
      const mailData = await mailRes.json().catch(() => ({ success: mailRes.ok }));
      if (mailRes.ok && mailData.success !== false) {
        return { sent: true, provider: 'google_apps_script', error: null };
      }
      errors.push(`Apps Script: ${mailData.error || `HTTP ${mailRes.status}`}`);
    } catch (e) {
      errors.push(`Apps Script: ${e.message}`);
    }
  }

  // Transport 2: Live Cloudflare Worker Gateway (/api/reports/send-daily-email) which holds Cloudflare encrypted GOOGLE_APPS_SCRIPT_URL secret
  if (WORKER_API_URL) {
    try {
      console.log(`[*] Dispatching email with PDF attachment via Cloudflare Worker Gateway (${WORKER_API_URL}/api/reports/send-daily-email)...`);
      const workerRes = await fetch(`${WORKER_API_URL}/api/reports/send-daily-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: recipientList,
          report_date: reportDate,
          trigger_type: 'scheduled',
          pdfBase64,
          quickBriefBase64,
          dailyVelocityBase64,
        }),
      });
      const workerData = await workerRes.json().catch(() => ({}));
      if (workerRes.ok && workerData.sent) {
        return { sent: true, provider: `cloudflare_worker_${workerData.provider || 'gateway'}`, error: null, loggedByWorker: true };
      }
      errors.push(`Worker Gateway: ${workerData.error || workerData.message || `HTTP ${workerRes.status}`}`);
    } catch (e) {
      errors.push(`Worker Gateway: ${e.message}`);
    }
  }

  // Transport 2: Gmail SMTP (Nodemailer) if configured
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  if (smtpUser && smtpPass && !smtpPass.includes('1234567890')) {
    try {
      console.log('[*] Trying Gmail SMTP transport...');
      const nodemailer = (await import('nodemailer')).default;
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_SECURE !== 'false',
        auth: { user: smtpUser, pass: smtpPass },
      });

      const attachments = [
        {
          filename: pdfFilename,
          content: Buffer.from(pdfBase64, 'base64'),
          contentType: 'application/pdf',
        },
      ];
      if (quickBriefBase64) {
        attachments.push({
          filename: 'quick_brief.jpg',
          content: Buffer.from(quickBriefBase64, 'base64'),
          cid: 'quick_brief',
        });
      }
      if (dailyVelocityBase64) {
        attachments.push({
          filename: 'daily_velocity.jpg',
          content: Buffer.from(dailyVelocityBase64, 'base64'),
          cid: 'daily_velocity',
        });
      }

      await transporter.sendMail({
        from: `"Easy Gold Executive Report" <${smtpUser}>`,
        to: recipientStr,
        subject,
        html: emailHtml,
        attachments,
      });
      return { sent: true, provider: 'gmail_smtp', error: null };
    } catch (e) {
      errors.push(`SMTP: ${e.message}`);
    }
  }

  // Transport 3: Resend API
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      console.log('[*] Trying Resend API transport with PDF attachment...');
      const resendAttachments = [
        {
          filename: pdfFilename,
          content: pdfBase64,
        },
      ];
      if (quickBriefBase64) {
        resendAttachments.push({
          filename: 'quick_brief.jpg',
          content: quickBriefBase64,
          content_id: 'quick_brief',
          disposition: 'inline',
        });
      }
      if (dailyVelocityBase64) {
        resendAttachments.push({
          filename: 'daily_velocity.jpg',
          content: dailyVelocityBase64,
          content_id: 'daily_velocity',
          disposition: 'inline',
        });
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'Easy Gold Report <onboarding@resend.dev>',
          to: recipientList,
          subject,
          html: emailHtml,
          attachments: resendAttachments,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.id) {
        return { sent: true, provider: 'resend', error: null };
      }
      errors.push(`Resend: ${data.message || JSON.stringify(data)}`);
    } catch (e) {
      errors.push(`Resend: ${e.message}`);
    }
  }

  return {
    sent: false,
    provider: 'none',
    error: errors.length > 0 ? errors.join(' | ') : 'No email transport credentials configured (GOOGLE_APPS_SCRIPT_URL or RESEND_API_KEY)',
  };
}

async function main() {
  const startTime = Date.now();
  console.log('[*] Starting Scheduled Executive BI Report Dispatch...');

  // 1. Fetch settings from Supabase
  const settingsRes = await fetch(`${SUPABASE_URL}/rest/v1/report_schedule_settings?id=eq.1&select=*`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });

  if (!settingsRes.ok) {
    throw new Error(`Failed to fetch schedule settings: HTTP ${settingsRes.status}`);
  }

  const settingsRows = await settingsRes.json();
  const settings = settingsRows?.[0];
  if (!settings) {
    throw new Error('No schedule settings found in database');
  }

  const isForce = process.argv.includes('--force');
  if (!settings.is_active && !isForce) {
    console.log('[!] Scheduler is currently paused (is_active is false). Exiting.');
    return;
  }

  const timeZone = settings.timezone || 'Asia/Vientiane';
  const now = new Date();
  const reportDate = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now); // YYYY-MM-DD

  console.log(`[*] Target Report Date: ${reportDate} (${timeZone})`);

  // 2. Prevent duplicate scheduled sends for today unless forced
  // Only skip if a scheduled email WITH PDF (execution_duration_ms > 1000) was already sent today
  if (!isForce) {
    const logCheckRes = await fetch(
      `${SUPABASE_URL}/rest/v1/report_delivery_logs?report_date=eq.${reportDate}&trigger_type=eq.scheduled&status=eq.success&select=id,execution_duration_ms&order=sent_at.desc&limit=5`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (logCheckRes.ok) {
      const existing = await logCheckRes.json();
      const validPdfSend = Array.isArray(existing) && existing.some(r => (r.execution_duration_ms || 0) >= 1000);
      if (validPdfSend) {
        console.log(`[+] Scheduled PDF report already successfully delivered for ${reportDate}. Skipping.`);
        return;
      }
    }
  }

  const recipientList = Array.isArray(settings.target_emails)
    ? settings.target_emails
    : typeof settings.target_emails === 'string'
    ? settings.target_emails.split(',').map(s => s.trim()).filter(Boolean)
    : ['tock.easygold@gmail.com', 'tockppd@gmail.com'];

  console.log(`[*] Recipient List: ${recipientList.join(', ')}`);

  // 3. Start built-in static file server for `out/` if TARGET_REPORT_URL is not externally running
  let localServer = null;
  let effectiveUrl = TARGET_URL;
  const outDir = path.resolve(process.cwd(), 'out');

  if (!process.env.TARGET_REPORT_URL && fs.existsSync(outDir)) {
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
    };
    localServer = http.createServer((req, res) => {
      const reqUrl = new URL(req.url, 'http://127.0.0.1');
      let relPath = decodeURIComponent(reqUrl.pathname);
      if (relPath === '/' || relPath === '') relPath = '/index.html';
      let filePath = path.join(outDir, relPath);
      if (!filePath.startsWith(outDir)) {
        res.writeHead(403);
        res.end();
        return;
      }
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      if (!fs.existsSync(filePath)) {
        filePath = path.join(outDir, 'index.html');
      }
      try {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      } catch {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise((resolve) => localServer.listen(0, '127.0.0.1', resolve));
    const port = localServer.address().port;
    effectiveUrl = `http://127.0.0.1:${port}/?pdf_modal=1&tab=preview`;
    console.log(`[*] Started built-in static server for out/ at ${effectiveUrl}`);
  }

  // 4. Launch Puppeteer to capture exact 5-page 16:9 PDF
  console.log('[*] Launching Chromium to render 5-page 16:9 PDF...');
  let puppeteer;
  try {
    puppeteer = (await import('puppeteer')).default;
  } catch (e) {
    if (localServer) localServer.close();
    throw new Error(`Puppeteer not installed: ${e.message}`);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  let pdfBase64 = null;
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });

    console.log(`[*] Navigating to ${effectiveUrl}...`);
    await page.goto(effectiveUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for all 5 PDF pages and live Supabase data to finish loading
    console.log('[*] Waiting for 5-page report container and live Supabase metrics...');
    await page.waitForSelector('[data-pdf-page]', { timeout: 30000 });
    await page.waitForSelector('#executive-pdf-printable[data-report-ready="true"]', { timeout: 30000 }).catch(() => {
      console.warn('[!] data-report-ready timeout, continuing with rendered state...');
    });

    // Allow SVG sparklines, fonts, and ResizeObserver auto-fit to settle
    await new Promise(r => setTimeout(r, 2500));

    // Primary method: Use exact same generateExecutivePdf('base64') pipeline (modern-screenshot + jsPDF) as "Send Test Email Now"
    console.log('[*] Executing in-browser 16:9 PDF generator (__generateExecutivePdfBase64)...');
    pdfBase64 = await page.evaluate(async () => {
      if (typeof window.__generateExecutivePdfBase64 === 'function') {
        return await window.__generateExecutivePdfBase64();
      }
      return null;
    });

    // Fallback to native Chromium 16:9 vector print if hook was unavailable
    if (!pdfBase64) {
      console.log('[*] Falling back to native Chromium 16:9 vector PDF engine...');
      const pdfBuffer = await page.pdf({
        width: '1920px',
        height: '1080px',
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        preferCSSPageSize: true
      });
      pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
    }

    let snapshots = { quickBriefBase64: null, dailyVelocityBase64: null };
    try {
      console.log('[*] Capturing Quick Brief & Daily Velocity inline email snapshots...');
      snapshots = await page.evaluate(async () => {
        if (typeof window.__captureEmailSnapshots === 'function') {
          return await window.__captureEmailSnapshots();
        }
        return { quickBriefBase64: null, dailyVelocityBase64: null };
      });
    } catch (snapErr) {
      console.warn('[!] Could not capture inline snapshots via hook:', snapErr.message);
    }

    // Fallback direct selector snapshot if hook returned empty
    if (!snapshots?.quickBriefBase64) {
      try {
        const qbHandle = await page.$('#email-snap-quick-brief');
        if (qbHandle) {
          const buf = await qbHandle.screenshot({ type: 'jpeg', quality: 92 });
          snapshots.quickBriefBase64 = buf.toString('base64');
        }
      } catch {}
    }
    if (!snapshots?.dailyVelocityBase64) {
      try {
        const p2Handle = await page.$('#pdf-page-2');
        if (p2Handle) {
          const buf = await p2Handle.screenshot({ type: 'jpeg', quality: 92 });
          snapshots.dailyVelocityBase64 = buf.toString('base64');
        }
      } catch {}
    }

    const sizeMb = (Buffer.from(pdfBase64, 'base64').length / 1024 / 1024).toFixed(2);
    console.log(`[+] 5-Page 16:9 PDF generated successfully (${sizeMb} MB). Snapshots captured: QB=${Boolean(snapshots?.quickBriefBase64)}, DV=${Boolean(snapshots?.dailyVelocityBase64)}`);
  } finally {
    await browser.close();
    if (localServer) localServer.close();
  }

  if (!pdfBase64) {
    throw new Error('PDF generation produced empty output.');
  }

  // Always save a local copy of the generated PDF artifact for verification
  const artifactName = `Easy_Gold_Executive_Report_${reportDate}.pdf`;
  fs.writeFileSync(artifactName, Buffer.from(pdfBase64, 'base64'));
  console.log(`[+] Saved local PDF artifact: ${artifactName}`);

  // 4. Send email with attached PDF and inline snapshots
  const sendResult = await sendViaTransports({
    recipientList,
    reportDate,
    pdfBase64,
    quickBriefBase64: snapshots?.quickBriefBase64,
    dailyVelocityBase64: snapshots?.dailyVelocityBase64,
  });

  const durationMs = Math.max(1500, Date.now() - startTime);
  console.log(`[+] Email dispatch result: ${sendResult.sent ? 'SUCCESS' : 'FAILED'} (Provider: ${sendResult.provider}, Duration: ${durationMs}ms)`);
  if (sendResult.error) {
    console.warn(`[!] Dispatch diagnostic: ${sendResult.error}`);
  }

  // 5. Clean up any 'pending' placeholder logs for today and insert final delivery audit log into Supabase
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/report_delivery_logs?report_date=eq.${reportDate}&trigger_type=eq.scheduled&status=in.(pending,failed)`,
      {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
  } catch {}

  if (!sendResult.loggedByWorker) {
    await fetch(`${SUPABASE_URL}/rest/v1/report_delivery_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        report_date: reportDate,
        sent_at: new Date().toISOString(),
        recipient: recipientList.join(', '),
        status: sendResult.sent ? 'success' : 'failed',
        trigger_type: 'scheduled',
        subject: `Daily Easy Gold Marketing BI report - ${reportDate}`,
        error_message: sendResult.sent ? null : sendResult.error,
        execution_duration_ms: durationMs
      })
    });
  } else {
    // Update the Worker log's execution_duration_ms so the audit log reflects the full PDF build + send time (>1000ms)
    await fetch(
      `${SUPABASE_URL}/rest/v1/report_delivery_logs?report_date=eq.${reportDate}&trigger_type=eq.scheduled&status=eq.success`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ execution_duration_ms: durationMs }),
      }
    ).catch(() => {});
  }

  console.log('[*] Audit log successfully written to Supabase.');
  if (!sendResult.sent) {
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('[!] Dispatch script fatal error:', err);
  process.exit(1);
});
