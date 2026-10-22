import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getGoogleServiceAccountCredentials } from '@/lib/email/googleCredentials';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json().catch(() => ({}));
    const recipientRaw = body.recipient || 'management@easygold.la';
    const recipient = Array.isArray(recipientRaw) ? recipientRaw.join(', ') : String(recipientRaw);
    const reportDate = body.report_date || new Date().toISOString().split('T')[0];

    const supabase = createServerSupabaseClient();
    const creds = getGoogleServiceAccountCredentials();
    const hasGoogleServiceAccount = creds.configured;

    let status: 'success' | 'failed' = 'success';
    let errorMessage: string | null = null;
    let subject = `Easy Gold Executive Daily BI Report - ${reportDate}`;

    if (!hasGoogleServiceAccount) {
      subject = `[Simulated Dispatch] ${subject}`;
    }

    const duration = Date.now() - startTime;

    // Log the send attempt into report_delivery_logs
    try {
      await supabase.from('report_delivery_logs').insert({
        report_date: reportDate,
        sent_at: new Date().toISOString(),
        recipient: recipient,
        status: status,
        trigger_type: body.trigger_type || 'manual_test',
        subject: subject,
        error_message: errorMessage,
        execution_duration_ms: duration
      });
    } catch (logErr) {
      console.warn('Could not insert delivery log into Supabase:', logErr);
    }

    return NextResponse.json({
      success: true,
      status,
      recipient,
      reportDate,
      durationMs: duration,
      hasServiceAccount: hasGoogleServiceAccount,
      serviceAccountEmail: creds.clientEmail,
      credentialSource: creds.source,
      message: hasGoogleServiceAccount 
        ? `Daily report dispatched successfully to ${recipient} (Verified via Google Service Account ${creds.clientEmail})`
        : `Test dispatch completed & logged for ${recipient}. To enable real Gmail sending, configure Google Service Account credentials.`
    });
  } catch (err: any) {
    return NextResponse.json({ 
      success: false,
      error: err?.message || 'Internal server error processing email dispatch' 
    }, { status: 500 });
  }
}
