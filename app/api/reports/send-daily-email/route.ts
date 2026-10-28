import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendExecutiveReportEmail } from '@/lib/email/emailDispatcher';
import { getGoogleServiceAccountCredentials } from '@/lib/email/googleCredentials';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json().catch(() => ({}));
    const recipientRaw = body.recipient || 'tockppd@gmail.com';
    const recipient = Array.isArray(recipientRaw) ? recipientRaw.join(', ') : String(recipientRaw);
    const reportDate = body.report_date || new Date().toISOString().split('T')[0];

    const supabase = createServerSupabaseClient();
    const creds = getGoogleServiceAccountCredentials();

    let subject = `Easy Gold Executive Daily BI Report - ${reportDate}`;

    // Attempt real email delivery via configured transport (Google Apps Script, Gmail API, SMTP, or Resend)
    const dispatchResult = await sendExecutiveReportEmail({
      to: recipient,
      subject,
      reportDate,
      pdfBase64: body.pdfBase64 || undefined,
      summaryData: body.summaryData || undefined,
    });

    const status: 'success' | 'failed' = dispatchResult.sent || dispatchResult.provider === 'simulated' ? 'success' : 'failed';
    const duration = Date.now() - startTime;

    // Log the send attempt into report_delivery_logs in Supabase
    try {
      await supabase.from('report_delivery_logs').insert({
        report_date: reportDate,
        sent_at: new Date().toISOString(),
        recipient: recipient,
        status: status,
        trigger_type: body.trigger_type || 'manual_test',
        subject: subject,
        error_message: dispatchResult.error || (dispatchResult.provider === 'simulated' ? 'Simulated dispatch (No SMTP credentials)' : null),
        execution_duration_ms: duration,
      });
    } catch (logErr) {
      console.warn('Could not insert delivery log into Supabase:', logErr);
    }

    return NextResponse.json({
      success: true,
      status,
      sent: dispatchResult.sent,
      provider: dispatchResult.provider,
      recipient,
      reportDate,
      durationMs: duration,
      messageId: dispatchResult.messageId,
      message: dispatchResult.message,
      hasServiceAccount: creds.configured,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || 'Internal server error processing email dispatch',
    }, { status: 500 });
  }
}
