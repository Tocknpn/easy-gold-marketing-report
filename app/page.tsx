'use client';

import React, { useEffect, useState } from 'react';
import { PlatformOverviewSection } from '@/components/dashboard/PlatformOverviewSection';
import { BuyActivitySection } from '@/components/dashboard/BuyActivitySection';
import { SellActivitySection } from '@/components/dashboard/SellActivitySection';
import { ExecutiveDashboardData } from '@/lib/types/dashboard.types';
import { 
  BarChart3, 
  Calendar, 
  Database, 
  Download, 
  Layers, 
  RefreshCw, 
  ShieldCheck, 
  SlidersHorizontal,
  Users
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'adhoc' | 'branch' | 'export'>('overview');

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/summary');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load dashboard summary', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 pb-16">
      {/* Top Executive Header Bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-sm font-black text-lg">
              EG
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  EASY GOLD MARKETING REPORT
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300">
                  <ShieldCheck className="w-3 h-3" /> Supabase Free Tier (1.4M Rows)
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <span>Executive BI & Performance Analytics</span>
                <span>•</span>
                <span className="text-blue-600 font-medium">Cloudflare Edge Cached</span>
              </p>
            </div>
          </div>

          {/* Quick Actions & Period Badge */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Current: 2026-W41 (Oct 06 - Oct 12)</span>
            </div>

            <button
              onClick={fetchSummary}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors disabled:opacity-50"
              title="Refresh Metrics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <span className="text-xs font-bold text-slate-600 bg-amber-50 text-amber-900 px-2.5 py-1 rounded-md border border-amber-200">
                Admin
              </span>
            </div>
          </div>
        </div>

        {/* Module Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 overflow-x-auto border-t border-slate-100 py-1.5">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Module 1: Executive Overview
          </button>

          <button
            onClick={() => setActiveTab('adhoc')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'adhoc'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Module 2: Dynamic Ad-Hoc Filters
          </button>

          <button
            onClick={() => setActiveTab('branch')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'branch'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Module 3: Customer & Branch Analytics
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'export'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Module 4: Export & Schedule
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {loading && !data ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <p className="font-semibold text-sm">Aggregating weekly executive metrics...</p>
          </div>
        ) : data ? (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Section 1: Platform Overview (Blue) */}
                <PlatformOverviewSection
                  currentWeek={data.current_week}
                  history={data.history}
                  variances={data.variances}
                />

                {/* Section 2: Buy Activity (Forest Green) */}
                <BuyActivitySection
                  currentWeek={data.current_week}
                  history={data.history}
                  variances={data.variances}
                />

                {/* Section 3: Sell Activity (Burgundy) */}
                <SellActivitySection
                  currentWeek={data.current_week}
                  history={data.history}
                  variances={data.variances}
                />
              </div>
            )}

            {activeTab === 'adhoc' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">
                      Module 2: Dynamic Ad-Hoc Cross-Filtering Engine
                    </h2>
                    <p className="text-xs text-slate-500">
                      High-speed filtered aggregation powered by PostgreSQL composite index scans.
                    </p>
                  </div>
                  <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold border border-blue-200">
                    RPC: get_adhoc_filtered_metrics()
                  </span>
                </div>

                {/* Filter controls UI preview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Bank Filter</label>
                    <select className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-slate-50 font-medium">
                      <option>All Banks (BCEL, LDB, JDB...)</option>
                      <option>BCEL</option>
                      <option>LDB</option>
                      <option>JDB</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Type</label>
                    <select className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-slate-50 font-medium">
                      <option>All Types</option>
                      <option>BUY_GOLD</option>
                      <option>SALE_GOLD</option>
                      <option>OPEN_ACCOUNT</option>
                      <option>WITHDRAW_GOLD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gold Weight Bracket</label>
                    <select className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-slate-50 font-medium">
                      <option>All Brackets</option>
                      <option>Micro: 0.01g - 1g</option>
                      <option>Medium: 1g - 15g</option>
                      <option>Executive: 15g - 800g</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                    <select className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-slate-50 font-medium">
                      <option>Completed (ສໍາເລັດ)</option>
                      <option>Failed / Rejected (ປະຕິເສດ)</option>
                    </select>
                  </div>
                </div>

                {/* Performance stats banner */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Zero Sequential Scan Guarantee
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Query plans use composite index <code>idx_monthly_data_perf_composite</code> with sub-80ms target response on 1.4M rows.
                      </div>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors">
                    Execute Query
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'branch' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">
                      Module 3: Customer & Branch Analytics
                    </h2>
                    <p className="text-xs text-slate-500">
                      Breakdown across physical branch locations and top purchasing customers.
                    </p>
                  </div>
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold border border-emerald-200">
                    RPC: get_branch_and_customer_analytics()
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top Branches */}
                  <div className="border border-slate-200 rounded-xl p-4">
                    <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" /> Top Performing Branches
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                        <span className="font-semibold text-slate-700">ຮ້ານຄຳພູວົງ ສາຂາ ຕະຫຼາດວັງທອງ</span>
                        <span className="font-bold text-slate-900">3,420 Tx</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                        <span className="font-semibold text-slate-700">ຮ້ານຄຳພູວົງ ສາຂາ ຕະຫຼາດເຊົ້າ</span>
                        <span className="font-bold text-slate-900">2,890 Tx</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                        <span className="font-semibold text-slate-700">ຮ້ານຄຳພູນທະວີ ( ທ່າງ່ອນ )</span>
                        <span className="font-bold text-slate-900">1,940 Tx</span>
                      </div>
                    </div>
                  </div>

                  {/* Top Customer Profiles */}
                  <div className="border border-slate-200 rounded-xl p-4">
                    <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-600" /> High-Volume Customer Tiers
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                        <div>
                          <div className="font-semibold text-slate-800">VIP Customer Tier (15g - 150g)</div>
                          <div className="text-[10px] text-slate-500">Recurring Gold Investors</div>
                        </div>
                        <span className="font-bold text-emerald-700">28.4% Vol</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                        <div>
                          <div className="font-semibold text-slate-800">Retail Tier (&lt; 15g)</div>
                          <div className="text-[10px] text-slate-500">Daily Micro-Traders</div>
                        </div>
                        <span className="font-bold text-blue-700">71.6% Vol</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">
                      Module 4: Export & Scheduled Executive Reports
                    </h2>
                    <p className="text-xs text-slate-500">
                      Generate PDF executive briefs, Excel raw rollups, or trigger recurring reports.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-slate-200 rounded-xl p-4 text-center">
                    <div className="text-xs font-bold text-slate-700 mb-1">Executive Summary PDF</div>
                    <p className="text-[11px] text-slate-500 mb-4">Formatted presentation for Board review</p>
                    <button className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800">
                      Download PDF
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-4 text-center">
                    <div className="text-xs font-bold text-slate-700 mb-1">Weekly Rollup Excel (.xlsx)</div>
                    <p className="text-[11px] text-slate-500 mb-4">W37-W41 aggregated spreadsheet</p>
                    <button className="w-full py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800">
                      Export Excel
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-4 text-center">
                    <div className="text-xs font-bold text-slate-700 mb-1">Automated Weekly Dispatch</div>
                    <p className="text-[11px] text-slate-500 mb-4">Monday 08:00 AM Cron Schedule</p>
                    <button className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700">
                      Configure Schedule
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
