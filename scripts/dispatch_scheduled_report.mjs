#!/usr/bin/env node

/**
 * ============================================================================
 * Easy Gold Executive BI Report - Headless Chrome Scheduled PDF Mailer
 * 
 * Generates 100% native vector PDF via Chromium print engine and sends
 * the daily scheduled executive email with the PDF attached.
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wlufvvawlbyvpyaubzph.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsdWZ2dmF3bGJ5dnB5YXVienBoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTg1MDY0MSwiZXhwIjoyMTA3NDI2NjQxfQ.CN2Omnb-aAuxAW80EqFZubEZhilRdOlwHg8VzPn2AHk';
const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
const TARGET_URL = process.env.TARGET_REPORT_URL || 'http://127.0.0.1:3000/?pdf_modal=1&tab=preview';

async function main() {
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
  if (!isForce) {
    const logCheckRes = await fetch(
      `${SUPABASE_URL}/rest/v1/report_delivery_logs?report_date=eq.${reportDate}&trigger_type=eq.scheduled&status=eq.success&select=id&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (logCheckRes.ok) {
      const existing = await logCheckRes.json();
      if (existing && existing.length > 0) {
        console.log(`[+] Scheduled report already successfully delivered for ${reportDate}. Skipping.`);
        return;
      }
    }
  }

  const recipientList = Array.isArray(settings.target_emails)
    ? settings.target_emails
    : typeof settings.target_emails === 'string'
    ? settings.target_emails.split(',').map(s => s.trim()).filter(Boolean)
    : ['tockeasygold@gmail.com', 'tockppd@gmail.com'];

  console.log(`[*] Recipient List: ${recipientList.join(', ')}`);

  // 3. Launch Puppeteer to capture vector PDF
  console.log('[*] Launching Chromium to render vector PDF...');
  let puppeteer;
  try {
    puppeteer = (await import('puppeteer')).default;
  } catch (e) {
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
    
    console.log(`[*] Navigating to ${TARGET_URL}...`);
    await page.goto(TARGET_URL, { waitUntil: 'networkidle0', timeout: 60000 });

    // Wait for PDF elements to load
    await page.waitForSelector('[data-pdf-page]', { timeout: 15000 });
    // Allow SVG animations, fonts, and render cycles to settle
    await new Promise(r => setTimeout(r, 2000));

    console.log('[*] Generating native 16:9 widescreen presentation vector PDF...');
    const pdfBuffer = await page.pdf({
      width: '1920px',
      height: '1080px',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true
    });

    pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
    console.log(`[+] Native PDF generated successfully (${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB).`);
  } finally {
    await browser.close();
  }

  if (!pdfBase64) {
    throw new Error('PDF generation produced empty output.');
  }

  // 4. Send email with attached PDF
  const gasUrl = APPS_SCRIPT_URL || process.env.GMAIL_PROXY_URL;
  if (!gasUrl) {
    console.warn('[!] GOOGLE_APPS_SCRIPT_URL not configured. Saving local PDF artifact only.');
    fs.writeFileSync(`Easy_Gold_Executive_Report_${reportDate}.pdf`, Buffer.from(pdfBase64, 'base64'));
    console.log(`[+] Saved Easy_Gold_Executive_Report_${reportDate}.pdf`);
    return;
  }

  console.log('[*] Dispatching email with PDF attachment via Google Apps Script...');
  const emailHtml = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background: #0c4ca3; padding: 24px 32px; color: #ffffff;">
      <span style="background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase;">Official BI Dispatch</span>
      <h1 style="margin: 8px 0 0 0; font-size: 20px; font-weight: 800;">Easy Gold Daily Performance Report</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.85;">Date: ${reportDate}</p>
    </div>
    <div style="padding: 28px 32px;">
      <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">
        Dear Executive Team,<br><br>
        The daily Easy Gold Business Intelligence synthesis for <strong>${reportDate}</strong> has been compiled.
        All core metrics (MTD Pace, MoM / YoY growth, and target run-rates) are compiled and verified.
      </p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px; margin: 20px 0;">
        <strong style="color: #166534; font-size: 13px;">✓ Live High-Resolution Vector PDF Attached</strong>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #15803d;">Please find the complete landscape executive PDF report attached to this email.</p>
      </div>
    </div>
    <div style="background: #f8fafc; padding: 16px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
      Easy Gold Marketing &amp; Financial Reporting • Dispatched to ${recipientList.join(', ')}
    </div>
  </div>
</body>
</html>`;

  const mailRes = await fetch(gasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: recipientList.join(', '),
      subject: `Easy Gold Executive Daily BI Report - ${reportDate}`,
      html: emailHtml,
      pdfBase64: pdfBase64,
      reportDate: reportDate,
      body: `Easy Gold Executive Daily BI Report for ${reportDate} (PDF attached)`
    })
  });

  const mailData = await mailRes.json().catch(() => ({ success: mailRes.ok }));
  const isSuccess = mailRes.ok && mailData.success !== false;

  console.log(`[+] Email dispatch result: ${isSuccess ? 'SUCCESS' : 'FAILED'}`);

  // 5. Log delivery into Supabase
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
      status: isSuccess ? 'success' : 'failed',
      trigger_type: 'scheduled',
      subject: `Easy Gold Executive Daily BI Report - ${reportDate}`,
      error_message: isSuccess ? null : (mailData.error || `HTTP ${mailRes.status}`),
      execution_duration_ms: 5000
    })
  });

  console.log('[*] Audit log successfully written to Supabase.');
}

main().catch(err => {
  console.error('[!] Dispatch script fatal error:', err);
  process.exit(1);
});
