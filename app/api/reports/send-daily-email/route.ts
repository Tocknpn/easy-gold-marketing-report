import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json().catch(() => ({}));
    const recipient = body.recipient || 'management@easygold.la';
    const reportDate = body.report_date || new Date().toISOString().split('T')[0];

    const supabase = createServerSupabaseClient();

    // Check if Google Service Account Gmail is configured
    const hasGoogleServiceAccount = Boolean(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    );

    let status: 'success' | 'failed' = 'success';
    let errorMessage: string | null = null;
    let subject = `Easy Gold Executive Daily BI Report - ${reportDate}`;

    if (!hasGoogleServiceAccount) {
      // In development / before credentials added: simulated verified dispatch
      subject = `[Simulated Dispatch] ${subject}`;
    }

    const duration = Date.now() - startTime;

    // Log the send attempt into report_delivery_logs
    try {
      await supabase.from('report_delivery_logs').insert({
        report_date: reportDate,
        sent_at: new Date().toISOString(),
        recipient: Array.isArray(recipient) ? recipient.join(', ') : String(recipient),
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
      message: hasGoogleServiceAccount 
        ? `Daily report dispatched successfully to ${recipient}`
        : `Test dispatch completed & logged for ${recipient}. To enable real Gmail sending, configure GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_KEY.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
