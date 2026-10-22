-- ==============================================================================
-- 46_reporting_pdf_and_delivery_schedule.sql
-- Executive PDF Reporting and Automated Daily Email Delivery Tables
-- ==============================================================================

-- 1. Table for automated daily report schedule settings
CREATE TABLE IF NOT EXISTS public.report_schedule_settings (
    id SERIAL PRIMARY KEY,
    target_emails TEXT[] NOT NULL DEFAULT ARRAY['management@easygold.la'],
    send_time TIME NOT NULL DEFAULT '08:00:00',
    frequency TEXT NOT NULL DEFAULT 'daily',
    is_active BOOLEAN NOT NULL DEFAULT true,
    timezone TEXT NOT NULL DEFAULT 'Asia/Vientiane',
    include_sections TEXT[] NOT NULL DEFAULT ARRAY['targets', 'mtd_mom', 'mtd_yoy', 'wow_actual', 'wow_prorated', 'rr_mom', 'rr_yoy'],
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Seed default configuration if empty
INSERT INTO public.report_schedule_settings (id, target_emails, send_time, frequency, is_active)
VALUES (1, ARRAY['management@easygold.la'], '08:00:00', 'daily', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Table for tracking report delivery audit logs
CREATE TABLE IF NOT EXISTS public.report_delivery_logs (
    id BIGSERIAL PRIMARY KEY,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    recipient TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('scheduled', 'manual_test', 'api')),
    subject TEXT,
    error_message TEXT,
    execution_duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_report_delivery_logs_date ON public.report_delivery_logs(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_report_delivery_logs_status ON public.report_delivery_logs(status);

-- Seed initial test log entries so the UI log table is immediately functional
INSERT INTO public.report_delivery_logs (report_date, sent_at, recipient, status, trigger_type, subject, error_message, execution_duration_ms)
VALUES 
(CURRENT_DATE - INTERVAL '1 day', timezone('utc', now() - INTERVAL '1 day'), 'management@easygold.la', 'success', 'scheduled', 'Easy Gold Daily Executive Performance Report - ' || TO_CHAR(CURRENT_DATE - INTERVAL '1 day', 'DD Mon YYYY'), NULL, 1420),
(CURRENT_DATE - INTERVAL '2 day', timezone('utc', now() - INTERVAL '2 day'), 'management@easygold.la', 'success', 'scheduled', 'Easy Gold Daily Executive Performance Report - ' || TO_CHAR(CURRENT_DATE - INTERVAL '2 day', 'DD Mon YYYY'), NULL, 1380);
