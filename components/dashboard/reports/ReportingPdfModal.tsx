'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Mail, 
  Clock, 
  Settings, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Send, 
  FileText,
  Sparkles,
  ShieldCheck,
  Calendar,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { 
  ExecutivePdfReportDocument, 
  ExecutivePdfReportDocumentProps 
} from './ExecutivePdfReportDocument';
import { 
  DEFAULT_2026_TARGETS, 
  MONTH_NAMES, 
  LATEST_DATA_DATE,
  calculateRunRateComparison, 
  DailyMetricRow
} from '@/lib/constants/targetData';
import { MtdReportPayload } from '@/lib/types/mtd.types';
import { ExecutiveDashboardData, WeeklyMetricRow, MetricVariances } from '@/lib/types/dashboard.types';
import { calculateVariance, prorateLinear, prorateActiveUsers, prorateWeeklyRow } from '@/lib/utils/runRate';
import { createClient } from '@/lib/supabase/client';

interface ReportingPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  dailyRows?: DailyMetricRow[];
  mtdData?: MtdReportPayload;
  weeklyData?: ExecutiveDashboardData;
}

export function ReportingPdfModal({
  isOpen,
  onClose,
  dailyRows,
  mtdData: passedMtdData,
  weeklyData: passedWeeklyData,
}: ReportingPdfModalProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'settings' | 'history'>('preview');

  // Live state
  const [loading, setLoading] = useState<boolean>(false);
  const [localDailyRows, setLocalDailyRows] = useState<DailyMetricRow[]>(dailyRows || []);
  const [momMtd, setMomMtd] = useState<MtdReportPayload | null>(passedMtdData || null);
  const [yoyMtd, setYoyMtd] = useState<MtdReportPayload | null>(null);
  const [weekly, setWeekly] = useState<ExecutiveDashboardData | null>(passedWeeklyData || null);

  // Settings State
  const [targetEmails, setTargetEmails] = useState<string>('management@easygold.la');
  const [sendTime, setSendTime] = useState<string>('08:00');
  const [frequency, setFrequency] = useState<string>('daily');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [settingsSaveMsg, setSettingsSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasGoogleServiceAccount, setHasGoogleServiceAccount] = useState<boolean>(false);
  const [hasGoogleAppsScript, setHasGoogleAppsScript] = useState<boolean>(false);

  // Send Test Email State
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ status: 'success' | 'failed' | 'simulated'; message: string } | null>(null);

  // Delivery History State
  const [deliveryLogs, setDeliveryLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  // Sync state whenever props update
  useEffect(() => {
    if (passedMtdData && passedMtdData.metrics) {
      setMomMtd(passedMtdData);
    }
  }, [passedMtdData]);

  useEffect(() => {
    if (passedWeeklyData && passedWeeklyData.current_week) {
      setWeekly(passedWeeklyData);
    }
  }, [passedWeeklyData]);

  // Load schedule settings & delivery logs from backend
  const loadScheduleData = async () => {
    try {
      setLoadingLogs(true);
      const res = await fetch('/api/reports/schedule');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          if (Array.isArray(data.settings.target_emails)) {
            setTargetEmails(data.settings.target_emails.join(', '));
          } else {
            setTargetEmails(String(data.settings.target_emails));
          }
          setSendTime(data.settings.send_time || '08:00');
          setFrequency(data.settings.frequency || 'daily');
          setIsActive(data.settings.is_active ?? true);
        }
        if (data.logs) {
          setDeliveryLogs(data.logs);
        }
        setHasGoogleServiceAccount(Boolean(data.googleServiceAccountConfigured));
        setHasGoogleAppsScript(Boolean(data.hasGoogleAppsScript));
      }
    } catch (e) {
      console.warn('Failed to load schedule settings:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Load MTD MoM and YoY
  const loadReportData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // 1. Fetch live daily metrics so run-rate and targets calculate with real rows
      const { data: rows } = await supabase
        .from('summary_daily_metrics')
        .select('*')
        .order('date_id', { ascending: true });
      if (rows && rows.length > 0) {
        setLocalDailyRows(rows as DailyMetricRow[]);
      }

      // 2. Fetch live MTD if not passed or ensure it is up-to-date
      let activeAsOf = passedMtdData?.as_of_date || '2026-10-21';
      if (!passedMtdData || !passedMtdData.metrics) {
        const momRes = await fetch(`/api/dashboard/mtd-forecast?refresh=true`);
        if (momRes.ok) {
          const momJson = await momRes.json();
          if (momJson?.metrics) {
            setMomMtd(momJson);
            if (momJson.as_of_date) activeAsOf = momJson.as_of_date;
          }
        }
      } else {
        setMomMtd(passedMtdData);
      }

      // 3. Fetch live YoY MTD using exact same as_of_date
      const curYear = passedMtdData?.current_month_year || 2026;
      const curMonth = passedMtdData?.current_month_num || 10;
      const yoyRes = await fetch(`/api/dashboard/mtd-forecast?as_of_date=${activeAsOf}&comp_year=${curYear - 1}&comp_month=${curMonth}&refresh=true`);
      if (yoyRes.ok) {
        const yoyJson = await yoyRes.json();
        if (yoyJson?.metrics) {
          setYoyMtd(yoyJson);
        }
      }

      // 4. Fetch weekly if not passed
      if (!passedWeeklyData || !passedWeeklyData.current_week) {
        const wkRes = await fetch('/api/dashboard/summary?refresh=true');
        if (wkRes.ok) {
          const wkJson = await wkRes.json();
          if (wkJson?.current_week) {
            setWeekly(wkJson);
          }
        }
      } else {
        setWeekly(passedWeeklyData);
      }
    } catch (err) {
      console.error('Failed to load comprehensive report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadScheduleData();
      loadReportData();
    }
  }, [isOpen]);

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSaveMsg(null);
    try {
      const emailList = targetEmails
        .split(',')
        .map((em) => em.trim())
        .filter((em) => em.length > 0);

      const res = await fetch('/api/reports/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_emails: emailList,
          send_time: sendTime,
          frequency,
          is_active: isActive,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // Fallback if response is non-JSON
      }

      if (res.ok && data?.success !== false) {
        setSettingsSaveMsg({ type: 'success', text: 'Schedule settings saved successfully!' });
        setTimeout(() => setSettingsSaveMsg(null), 3500);
      } else {
        setSettingsSaveMsg({
          type: 'error',
          text: data?.error || (res.status !== 200 ? `Failed to save (Status ${res.status})` : 'Failed to save settings.')
        });
      }
    } catch (err: any) {
      setSettingsSaveMsg({ type: 'error', text: `Error saving settings: ${err?.message}` });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Handle Send Test Email
  const handleSendTestEmail = async () => {
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const emailList = targetEmails
        .split(',')
        .map((em) => em.trim())
        .filter((em) => em.length > 0);

      // Temporarily ensure report preview container is visible and has layout dimensions
      const previewContainer = document.getElementById('report-preview-container');
      const prevDisplay = previewContainer ? previewContainer.style.display : '';
      const prevPosition = previewContainer ? previewContainer.style.position : '';
      const prevZIndex = previewContainer ? previewContainer.style.zIndex : '';
      const prevWidth = previewContainer ? previewContainer.style.width : '';
      const prevOpacity = previewContainer ? previewContainer.style.opacity : '';

      if (previewContainer) {
        previewContainer.style.display = 'block';
        previewContainer.style.position = 'fixed';
        previewContainer.style.top = '0px';
        previewContainer.style.left = '0px';
        previewContainer.style.width = '1440px';
        previewContainer.style.zIndex = '-9999';
        previewContainer.style.opacity = '1';
        previewContainer.classList.remove('hidden');
        // Force browser layout reflow
        void previewContainer.offsetHeight;
      }

      // Wait 120ms for DOM layout and fonts to compute
      await new Promise((resolve) => setTimeout(resolve, 120));

      let pdfBase64: string | null = null;
      try {
        const reportElem = document.querySelector('.executive-report-root') as HTMLElement | null;
        if (!reportElem) {
          throw new Error('Report element .executive-report-root not found in DOM');
        }

        const html2canvas = (await import('html2canvas')).default;
        const { jsPDF } = await import('jspdf');

        const canvas = await html2canvas(reportElem, {
          scale: 1.25,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 1440,
        });

        if (!canvas || canvas.width === 0 || canvas.height === 0) {
          throw new Error('Canvas render produced 0x0 empty image');
        }

        const imgData = canvas.toDataURL('image/jpeg', 0.88);
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = pdfWidth / imgWidth;
        const renderedHeight = imgHeight * ratio;

        let heightLeft = renderedHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, renderedHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position -= pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, renderedHeight, undefined, 'FAST');
          heightLeft -= pdfHeight;
        }

        const dataUri = pdf.output('datauristring');
        pdfBase64 = dataUri.split(',')[1] || null;
      } finally {
        // Restore container style
        if (previewContainer) {
          previewContainer.style.display = prevDisplay;
          previewContainer.style.position = prevPosition;
          previewContainer.style.zIndex = prevZIndex;
          previewContainer.style.width = prevWidth;
          previewContainer.style.opacity = prevOpacity;
          if (activeTab !== 'preview') {
            previewContainer.classList.add('hidden');
          }
        }
      }

      if (!pdfBase64) {
        throw new Error('Failed to generate visual report PDF');
      }

      const res = await fetch('/api/reports/send-daily-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: emailList,
          trigger_type: 'manual_test',
          pdfBase64,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // Fallback for non-JSON or stream termination
      }

      if (res.ok && data?.success) {
        setTestResult({
          status: data.sent ? 'success' : 'simulated',
          message: data.message || `Dispatch logged for ${emailList.join(', ')}`,
        });
        loadScheduleData(); // refresh audit logs
      } else {
        setTestResult({
          status: 'failed',
          message: data?.error || data?.message || (res.status !== 200 ? `Dispatch failed with status ${res.status}` : 'Failed to dispatch test email'),
        });
      }
    } catch (err: any) {
      setTestResult({
        status: 'failed',
        message: err?.message || 'Error triggering test email',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Trigger Native Vector High-Definition Print / PDF Save
  const handlePrintHd = () => {
    window.print();
  };

  // Dynamically compute calendar bounds matching live active data
  const currentYear = momMtd?.current_month_year || passedMtdData?.current_month_year || 2026;
  const currentMonth = momMtd?.current_month_num || passedMtdData?.current_month_num || 10;
  const currentMonthLabel = momMtd?.current_month_label || passedMtdData?.current_month_label || "Oct'26";
  const compMonthLabel = momMtd?.comparison_month_label || passedMtdData?.comparison_month_label || "Sep'26";
  const yoyMonthLabel = `${MONTH_NAMES[currentMonth - 1]}'${String(currentYear - 1).slice(-2)}`;

  const cutoffDay = useMemo(() => {
    if (momMtd?.elapsed_days) return momMtd.elapsed_days;
    if (passedMtdData?.elapsed_days) return passedMtdData.elapsed_days;
    if (momMtd?.as_of_date) {
      const parts = String(momMtd.as_of_date).split('-');
      const d = parseInt(parts[2], 10);
      if (!isNaN(d)) return d;
    }
    return 21;
  }, [momMtd, passedMtdData]);

  const asOfDateDisplay = useMemo(() => {
    if (momMtd?.display_as_of_date) return momMtd.display_as_of_date;
    if (passedMtdData?.display_as_of_date) return passedMtdData.display_as_of_date;
    if (momMtd?.as_of_date) {
      return String(momMtd.as_of_date).split('-').reverse().join('/');
    }
    return `21/10/${currentYear}`;
  }, [momMtd, passedMtdData, currentYear]);

  // Compute Run-Rate payloads
  const rrMomData = useMemo(() => {
    return calculateRunRateComparison(
      currentYear,
      currentMonth,
      currentYear,
      Math.max(1, currentMonth - 1),
      cutoffDay,
      DEFAULT_2026_TARGETS,
      localDailyRows
    );
  }, [currentYear, currentMonth, cutoffDay, localDailyRows]);

  const rrYoyData = useMemo(() => {
    return calculateRunRateComparison(
      currentYear,
      currentMonth,
      currentYear - 1,
      currentMonth,
      cutoffDay,
      DEFAULT_2026_TARGETS,
      localDailyRows
    );
  }, [currentYear, currentMonth, cutoffDay, localDailyRows]);

  // Fallback YoY MTD payload if fetch hasn't completed
  const effectiveYoyMtd: MtdReportPayload = useMemo(() => {
    if (yoyMtd && yoyMtd.metrics) return yoyMtd;
    // Derive sensible fallback from momMtd with YoY labels
    if (momMtd && momMtd.metrics) {
      return {
        ...momMtd,
        comparison_month_label: yoyMonthLabel,
        comparison_month_year: currentYear - 1,
        comparison_month_num: currentMonth,
      };
    }
    return {
      as_of_date: `${currentYear}-10-21`,
      display_as_of_date: `21/10/${currentYear}`,
      current_month_label: currentMonthLabel,
      current_month_year: currentYear,
      current_month_num: currentMonth,
      comparison_month_label: yoyMonthLabel,
      comparison_month_year: currentYear - 1,
      comparison_month_num: currentMonth,
      elapsed_days: cutoffDay,
      total_days_current_month: 31,
      elapsed_working_days: 15,
      total_working_days_current_month: 22,
      calculation_mode: 'calendar_days',
      metrics: {
        buy_weight_g: { id: 'buy_weight_g', label: 'Buy Weight', unit: 'g', icon_name: 'shopping-bag', current_mtd: 9517, comp_mtd: 7856, mtd_variance_percent: 21, est_month_end: 14049, full_comp_month: 15048, forecast_variance_percent: -7 },
        buy_transactions: { id: 'buy_transactions', label: 'Buy Trx', icon_name: 'shopping-cart', current_mtd: 90253, comp_mtd: 73850, mtd_variance_percent: 22, est_month_end: 133231, full_comp_month: 123977, forecast_variance_percent: 7 },
        sell_weight_g: { id: 'sell_weight_g', label: 'Sell Weight', unit: 'g', icon_name: 'tag', current_mtd: 3950, comp_mtd: 4998, mtd_variance_percent: -21, est_month_end: 5831, full_comp_month: 6566, forecast_variance_percent: -11 },
        sell_transactions: { id: 'sell_transactions', label: 'Sell Trx', icon_name: 'scale', current_mtd: 35016, comp_mtd: 33225, mtd_variance_percent: 5, est_month_end: 51690, full_comp_month: 47724, forecast_variance_percent: 8 },
        withdraw_15g: { id: 'withdraw_15g', label: 'Withdraw (15g)', unit: 'g', icon_name: 'layers', current_mtd: 2143, comp_mtd: 2288, mtd_variance_percent: -6, est_month_end: 3163, full_comp_month: 3582, forecast_variance_percent: -12 },
        new_customers: { id: 'new_customers', label: 'NC', icon_name: 'user-plus', current_mtd: 1571, comp_mtd: 2139, mtd_variance_percent: -27, est_month_end: 2319, full_comp_month: 2946, forecast_variance_percent: -21 },
        total_transactions: { id: 'total_transactions', label: 'Total Trx', icon_name: 'arrow-left-right', current_mtd: 127982, comp_mtd: 110063, mtd_variance_percent: 16, est_month_end: 188926, full_comp_month: 175923, forecast_variance_percent: 7 },
      }
    };
  }, [yoyMtd, momMtd, currentYear, currentMonth, currentMonthLabel, yoyMonthLabel, cutoffDay]);

  // Compute Weekly metrics
  const weeklyCurrentWeek: WeeklyMetricRow = weekly?.current_week || {
    week_label: 'W43',
    year_week: '2026-W43',
    week_number: 43,
    year: 2026,
    start_date: '2026-10-19',
    end_date: '2026-10-25',
    all_transactions: 25920,
    active_users: 13599,
    new_registers: 316,
    withdraw_gold_grams: 7310.39,
    buy_weight_15g: 1912.00,
    buy_transactions: 18281,
    buy_ticket_size_g: 1.60,
    buy_value_mil_lak: 87492.7,
    sell_weight_15g: 790.23,
    sell_transactions: 7128,
    sell_ticket_size_g: 1.70,
    sell_value_mil_lak: 35991.5
  };

  const weeklyRawWeek = { ...weeklyCurrentWeek };
  // Only last 5 weeks so sparklines are clean without cramming W01..W43
  const weeklyHistory = useMemo(() => {
    const list = weekly?.history || [weeklyCurrentWeek];
    return list.slice(Math.max(0, list.length - 5));
  }, [weekly, weeklyCurrentWeek]);

  const weeklyElapsedDays = 2; // e.g. W43 partial week
  const isPartialWeek = true;

  // Prorated Week Calculations
  const proratedWeek: WeeklyMetricRow = useMemo(() => {
    return prorateWeeklyRow(weeklyCurrentWeek, weeklyElapsedDays);
  }, [weeklyCurrentWeek, weeklyElapsedDays]);

  const prevWeek = weekly?.previous_week;
  const prevBuyVal = prevWeek ? (prevWeek.buy_value_mil_lak ?? 0) : undefined;
  const prevSellVal = prevWeek ? (prevWeek.sell_value_mil_lak ?? 0) : undefined;

  // Raw Variances
  const weeklyVariances: MetricVariances = useMemo(() => {
    return {
      all_transactions: calculateVariance(weeklyCurrentWeek.all_transactions, prevWeek?.all_transactions),
      active_users: calculateVariance(weeklyCurrentWeek.active_users, prevWeek?.active_users),
      new_registers: calculateVariance(weeklyCurrentWeek.new_registers, prevWeek?.new_registers),
      withdraw_gold_grams: calculateVariance(Number(weeklyCurrentWeek.withdraw_gold_grams), prevWeek ? Number(prevWeek.withdraw_gold_grams) : undefined),
      buy_weight_15g: calculateVariance(Number(weeklyCurrentWeek.buy_weight_15g), prevWeek ? Number(prevWeek.buy_weight_15g) : undefined),
      buy_transactions: calculateVariance(weeklyCurrentWeek.buy_transactions, prevWeek?.buy_transactions),
      buy_ticket_size_g: calculateVariance(Number(weeklyCurrentWeek.buy_ticket_size_g), prevWeek ? Number(prevWeek.buy_ticket_size_g) : undefined),
      buy_value_mil_lak: calculateVariance(Number(weeklyCurrentWeek.buy_value_mil_lak), prevBuyVal),
      sell_weight_15g: calculateVariance(Number(weeklyCurrentWeek.sell_weight_15g), prevWeek ? Number(prevWeek.sell_weight_15g) : undefined),
      sell_transactions: calculateVariance(weeklyCurrentWeek.sell_transactions, prevWeek?.sell_transactions),
      sell_ticket_size_g: calculateVariance(Number(weeklyCurrentWeek.sell_ticket_size_g), prevWeek ? Number(prevWeek.sell_ticket_size_g) : undefined),
      sell_value_mil_lak: calculateVariance(Number(weeklyCurrentWeek.sell_value_mil_lak), prevSellVal),
    };
  }, [weeklyCurrentWeek, prevWeek, prevBuyVal, prevSellVal]);

  // Prorated Variances
  const weeklyProratedVariances: MetricVariances = useMemo(() => {
    return {
      all_transactions: calculateVariance(proratedWeek.all_transactions, prevWeek?.all_transactions),
      active_users: calculateVariance(proratedWeek.active_users, prevWeek?.active_users),
      new_registers: calculateVariance(proratedWeek.new_registers, prevWeek?.new_registers),
      withdraw_gold_grams: calculateVariance(Number(proratedWeek.withdraw_gold_grams), prevWeek ? Number(prevWeek.withdraw_gold_grams) : undefined),
      buy_weight_15g: calculateVariance(Number(proratedWeek.buy_weight_15g), prevWeek ? Number(prevWeek.buy_weight_15g) : undefined),
      buy_transactions: calculateVariance(proratedWeek.buy_transactions, prevWeek?.buy_transactions),
      buy_ticket_size_g: calculateVariance(Number(proratedWeek.buy_ticket_size_g), prevWeek ? Number(prevWeek.buy_ticket_size_g) : undefined),
      buy_value_mil_lak: calculateVariance(Number(proratedWeek.buy_value_mil_lak), prevBuyVal),
      sell_weight_15g: calculateVariance(Number(proratedWeek.sell_weight_15g), prevWeek ? Number(prevWeek.sell_weight_15g) : undefined),
      sell_transactions: calculateVariance(proratedWeek.sell_transactions, prevWeek?.sell_transactions),
      sell_ticket_size_g: calculateVariance(Number(proratedWeek.sell_ticket_size_g), prevWeek ? Number(prevWeek.sell_ticket_size_g) : undefined),
      sell_value_mil_lak: calculateVariance(Number(proratedWeek.sell_value_mil_lak), prevSellVal),
    };
  }, [proratedWeek, prevWeek, prevBuyVal, prevSellVal]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-300 shadow-2xl w-full max-w-[96vw] 2xl:max-w-[1600px] max-h-[96vh] flex flex-col overflow-hidden my-auto">
        {/* ================================================================== */}
        {/* MODAL HEADER                                                       */}
        {/* ================================================================== */}
        <div className="px-6 py-4 bg-[#0b192c] text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-brand-gold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Executive PDF Report &amp; Daily Delivery
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  HD Vector Ready
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                7-Section Vertical Management Overview • Daily Email Scheduler
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendTestEmail}
              disabled={isSendingTest}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Capture visual report screenshot and email as PDF"
            >
              <Send className="w-3.5 h-3.5 text-white" />
              <span>{isSendingTest ? 'Sending PDF...' : 'Email This Report'}</span>
            </button>
            <button
              onClick={handlePrintHd}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#d4a017] hover:bg-[#b8860b] text-slate-950 font-black text-xs shadow-xs transition-all cursor-pointer"
              title="Download or Print PDF in Full HD 300+ DPI"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>Download / Print PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================== */}
        {/* TAB CONTROLS                                                       */}
        {/* ================================================================== */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-[#0c4ca3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Report Preview (7 Sections)</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#0c4ca3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Automated Daily Email Settings</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-[#0c4ca3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Delivery Audit Log</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Month Rollover: <strong>Active Dynamic</strong></span>
          </div>
        </div>

        {/* ================================================================== */}
        {/* TAB 1: REPORT PREVIEW & PRINT ENGINE                               */}
        {/* ================================================================== */}
        <div id="report-preview-container" className={activeTab === 'preview' ? 'flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100' : 'hidden'}>
          {loading && !momMtd ? (
            <div className="py-24 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-[#0c4ca3] mx-auto" />
              <p className="text-sm font-bold text-slate-700">Compiling 7 Executive Sections...</p>
            </div>
          ) : (
            <div 
              id="executive-pdf-printable" 
              className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-2 sm:p-6 transition-all"
            >
              <ExecutivePdfReportDocument
                currentYear={currentYear}
                currentMonth={currentMonth}
                currentMonthLabel={currentMonthLabel}
                comparisonMonthLabel={compMonthLabel}
                yoyMonthLabel={yoyMonthLabel}
                asOfDateDisplay={asOfDateDisplay}
                targetTrackingData={rrMomData}
                rrMomData={rrMomData}
                rrYoyData={rrYoyData}
                momMtdData={momMtd || effectiveYoyMtd}
                yoyMtdData={effectiveYoyMtd}
                weeklyCurrentWeek={proratedWeek}
                weeklyRawWeek={weeklyRawWeek}
                weeklyHistory={weeklyHistory}
                weeklyVariances={weeklyVariances}
                weeklyProratedVariances={weeklyProratedVariances}
                selectedWeekLabel={weeklyCurrentWeek.week_label}
                isPartialWeek={isPartialWeek}
                elapsedDays={weeklyElapsedDays}
              />
            </div>
          )}
        </div>

        {/* ================================================================== */}
        {/* TAB 2: AUTOMATED DAILY EMAIL SETTINGS                               */}
        {/* ================================================================== */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50 space-y-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Header Box */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-blue-50 text-[#0c4ca3] shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Automated Daily Report Dispatcher
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                    Configure the target email recipients and send schedule. The Easy Gold BI engine automatically compiles the newest data (including month rollovers) and emails this PDF report daily.
                  </p>
                </div>
              </div>

              {/* Settings Form */}
              <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <div className="space-y-4">
                  {/* Recipients */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black uppercase text-slate-700 tracking-wider">
                      Target Email Recipients (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={targetEmails}
                      onChange={(e) => setTargetEmails(e.target.value)}
                      placeholder="e.g. advice@easygold.la, management@easygold.la"
                      className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-none"
                      required
                    />
                    <span className="text-[11px] text-slate-400">
                      Separate multiple recipient emails with commas.
                    </span>
                  </div>

                  {/* Frequency & Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black uppercase text-slate-700 tracking-wider">
                        Frequency
                      </label>
                      <select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-none"
                      >
                        <option value="daily">Daily (Every Day)</option>
                        <option value="weekdays">Weekdays Only (Mon-Fri)</option>
                        <option value="weekly_monday">Weekly on Monday</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black uppercase text-slate-700 tracking-wider">
                        Daily Dispatch Time (ICT / GMT+7)
                      </label>
                      <div className="relative flex items-center">
                        <Clock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                        <input
                          type="time"
                          value={sendTime}
                          onChange={(e) => setSendTime(e.target.value)}
                          className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-none"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Active Toggle */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-black text-slate-800">
                        Scheduler Status
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Enable or pause automated daily dispatches.
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </div>

                {/* Google Gateway Status Banner */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs flex items-start gap-3">
                  <div className="p-1 rounded bg-white border border-slate-200 text-slate-600 shrink-0">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">
                      Google Gmail Gateway {hasGoogleAppsScript ? '(Connected via Apps Script)' : '(Google Cloud & Gmail)'}
                    </span>
                    <span className="text-slate-600 text-[11px]">
                      {hasGoogleAppsScript
                        ? 'Google Apps Script Gateway is active. Emails will be dispatched natively from your Gmail account.'
                        : hasGoogleServiceAccount
                        ? 'Google Gateway is configured in environment. Provide GOOGLE_APPS_SCRIPT_URL to dispatch directly from your personal Gmail.'
                        : 'Set GOOGLE_APPS_SCRIPT_URL in Cloudflare or .env to dispatch directly from your Gmail.'}
                    </span>
                  </div>
                </div>

                {/* Save Feedback */}
                {settingsSaveMsg && (
                  <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                    settingsSaveMsg.type === 'success' 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    {settingsSaveMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{settingsSaveMsg.text}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    disabled={isSendingTest}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 ${isSendingTest ? 'animate-pulse' : ''}`} />
                    <span>{isSendingTest ? 'Sending Test Dispatch...' : 'Send Test Email Now'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#0c4ca3] hover:bg-[#093a7d] text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>{isSavingSettings ? 'Saving...' : 'Save Settings'}</span>
                  </button>
                </div>

                {/* Test Send Feedback */}
                {testResult && (
                  <div className={`p-3.5 rounded-xl border text-xs font-medium ${
                    testResult.status === 'success' 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                      : testResult.status === 'simulated'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    <div className="flex items-center gap-2 font-bold mb-1">
                      {testResult.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : testResult.status === 'simulated' ? (
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>
                        {testResult.status === 'success' 
                          ? 'Email Delivered to Inbox' 
                          : testResult.status === 'simulated'
                          ? 'Simulated Dispatch Logged in Database'
                          : 'Dispatch Failed'}
                      </span>
                    </div>
                    <p className="text-[11px] ml-6 leading-relaxed opacity-90">{testResult.message}</p>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 3: DELIVERY HISTORY & AUDIT LOG                                */}
        {/* ================================================================== */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50 space-y-4">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Automated Dispatch Audit Logs
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Chronological audit ledger of generated daily reports and transmission statuses.
                  </p>
                </div>
                <button
                  onClick={loadScheduleData}
                  disabled={loadingLogs}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                  <span>Refresh Logs</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                        <th className="py-2.5 px-3">Report Date</th>
                        <th className="py-2.5 px-3">Sent At</th>
                        <th className="py-2.5 px-3">Target Recipient</th>
                        <th className="py-2.5 px-3">Trigger</th>
                        <th className="py-2.5 px-3">Duration</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deliveryLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No dispatch logs found yet. Click &quot;Send Test Email Now&quot; to test.
                          </td>
                        </tr>
                      ) : (
                        deliveryLogs.map((log: any, idx: number) => (
                          <tr key={log.id || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                              {log.report_date}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">
                              {new Date(log.sent_at).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-800 max-w-xs truncate">
                              {log.recipient}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="capitalize px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px]">
                                {log.trigger_type?.replace('_', ' ') || 'scheduled'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                              {log.execution_duration_ms ? `${log.execution_duration_ms}ms` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {log.status === 'success' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Completed</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                  <span>Failed</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
