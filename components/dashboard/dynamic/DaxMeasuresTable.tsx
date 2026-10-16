'use client';

import React, { useState } from 'react';
import { Table, Search, Download, CheckCircle2, Copy, Eye, EyeOff } from 'lucide-react';
import { DaxMeasuresPayload, DaxMeasureRow } from '@/lib/types/dynamicReport.types';

interface DaxMeasuresTableProps {
  measures: DaxMeasuresPayload;
}

export function DaxMeasuresTable({ measures }: DaxMeasuresTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedFormula, setCopiedFormula] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const formatNumber = (val: number) => Math.round(val).toLocaleString('en-US');
  const formatDec = (val: number, dec: number = 2) => Number(val).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });

  const allMeasureRows: DaxMeasureRow[] = [
    {
      name: '%Net Flow (trans)',
      category: 'Price & Flow',
      daxFormula: '[Total Buy Transac]/[Total transaction]',
      value: `${measures.net_flow_trans_pct}%`,
      description: 'Percentage of total transactions representing Buy Gold activity',
    },
    {
      name: '%Net Flow (value)',
      category: 'Price & Flow',
      daxFormula: 'DIVIDE([Revenue Buy (mil lak)], [Revenue Buy (mil lak)]+[Revenue Sell (mil lak)], 0)',
      value: `${measures.net_flow_value_pct}%`,
      description: 'Share of buy revenue over total trading transaction turnover',
    },
    {
      name: 'ABS',
      category: 'Buy',
      daxFormula: '([Revenue Buy (mil lak)]/[Total Buy Transac])',
      value: `${formatNumber(measures.abs_buy_ticket_lak)} LAK`,
      description: 'Average Buy Size / Ticket in monetary value',
    },
    {
      name: 'Avg. Sell size',
      category: 'Sell',
      daxFormula: '[Revenue Sell (mil LAK)]/[Total Sell Transac]',
      value: `${formatNumber(measures.avg_sell_size_lak)} LAK`,
      description: 'Average Sell Size in monetary value per sale transaction',
    },
    {
      name: 'Close Price',
      category: 'Price & Flow',
      daxFormula: 'var lasthour = CALCULATE(MAX(DateTime), Buy & Amount>100k) return LASTNONBLANK(Gold Price)',
      value: `${formatNumber(measures.close_price)} LAK/15g`,
      description: 'Period closing execution price for purchases over 100,000 LAK',
    },
    {
      name: 'Freq per user all',
      category: 'Engagement',
      daxFormula: 'DIVIDE([Total transaction], CALCULATE(DISTINCTCOUNT(User ID)), 0)',
      value: `${formatDec(measures.freq_per_user_all)} tx/user`,
      description: 'Average transaction frequency across all active platform participants',
    },
    {
      name: 'Freq per User Buy',
      category: 'Buy',
      daxFormula: 'DIVIDE([Total Buy Transac], [User Buy], 0)',
      value: `${formatDec(measures.freq_per_user_buy)} tx/buyer`,
      description: 'Average number of buy operations per distinct buyer',
    },
    {
      name: 'Freq per User Sell',
      category: 'Sell',
      daxFormula: 'DIVIDE([Total Sell Transac], [User Sell], 0)',
      value: `${formatDec(measures.freq_per_user_sell)} tx/seller`,
      description: 'Average number of sell operations per distinct seller',
    },
    {
      name: 'Gold Buy Size (g)',
      category: 'Buy',
      daxFormula: 'DIVIDE([Gold Weight Buy (g)], [Total Buy Transac], 0)',
      value: `${formatDec(measures.gold_buy_size_g, 4)} g`,
      description: 'Average physical gold weight purchased per buy transaction',
    },
    {
      name: 'Gold Sell Size (g)',
      category: 'Sell',
      daxFormula: 'DIVIDE([Gold Weight Sell (g)], [Total Sell Transac], 0)',
      value: `${formatDec(measures.gold_sell_size_g, 4)} g`,
      description: 'Average physical gold weight sold per sale transaction',
    },
    {
      name: 'Gold Weight Buy (15g)',
      category: 'Buy',
      daxFormula: "CALCULATE(SUM('Raw Data'[Gold Weight]), Type='BUY_GOLD')/15",
      value: `${formatDec(measures.gold_weight_buy_15g, 2)} Baht`,
      description: 'Total purchased gold volume normalized to standard 15g Lao Baht units',
    },
    {
      name: 'Gold Weight Buy (g)',
      category: 'Buy',
      daxFormula: "CALCULATE(SUM('Raw Data'[Gold Weight]), Type='BUY_GOLD')",
      value: `${formatDec(measures.gold_weight_buy_g, 2)} g`,
      description: 'Total gold weight bought by users in grams',
    },
    {
      name: 'Gold Weight Sell (15g)',
      category: 'Sell',
      daxFormula: "CALCULATE(SUM('Raw Data'[Gold Weight]), Type='SALE_GOLD')/15",
      value: `${formatDec(measures.gold_weight_sell_15g, 2)} Baht`,
      description: 'Total sold gold volume normalized to standard 15g Lao Baht units',
    },
    {
      name: 'Gold Weight Sell (g)',
      category: 'Sell',
      daxFormula: "CALCULATE(SUM('Raw Data'[Gold Weight]), Type='SALE_GOLD')",
      value: `${formatDec(measures.gold_weight_sell_g, 2)} g`,
      description: 'Total gold weight sold back by users in grams',
    },
    {
      name: 'New Register',
      category: 'Engagement',
      daxFormula: "CALCULATE(COUNT([Source Name]), Type='OPEN_ACCOUNT')",
      value: `${formatNumber(measures.new_register)} users`,
      description: 'Count of new user onboarding registrations',
    },
    {
      name: 'Open Price',
      category: 'Price & Flow',
      daxFormula: 'var firsthour = CALCULATE(MIN(DateTime), Buy & Amount>100k) return FIRSTNONBLANK(Gold Price)',
      value: `${formatNumber(measures.open_price)} LAK/15g`,
      description: 'Period opening execution price for purchases over 100,000 LAK',
    },
    {
      name: 'Price Change',
      category: 'Price & Flow',
      daxFormula: '[Close Price]-[Open Price]',
      value: `${measures.price_change >= 0 ? '+' : ''}${formatNumber(measures.price_change)} LAK`,
      description: 'Net price fluctuation over the selected time window',
    },
    {
      name: 'Revenue Buy (mil lak)',
      category: 'Buy',
      daxFormula: "CALCULATE(SUM('Raw Data'[Amount (Kip)]), Type='BUY_GOLD')/1000000",
      value: `${formatDec(measures.revenue_buy_mil_lak, 1)} M LAK`,
      description: 'Total turnover generated from gold purchases (in Million Kip)',
    },
    {
      name: 'Revenue Sell (mil LAK)',
      category: 'Sell',
      daxFormula: "CALCULATE(SUM('Raw Data'[Amount (Kip)]), Type='SALE_GOLD')/1000000",
      value: `${formatDec(measures.revenue_sell_mil_lak, 1)} M LAK`,
      description: 'Total cash liquidated to customers for selling gold (in Million Kip)',
    },
    {
      name: 'Total Buy Transac',
      category: 'Buy',
      daxFormula: "CALCULATE(COUNT([Source Name]), Type='BUY_GOLD')",
      value: `${formatNumber(measures.total_buy_transac)} tx`,
      description: 'Total completed buy transactions in window',
    },
    {
      name: 'Total Sell Transac',
      category: 'Sell',
      daxFormula: "CALCULATE(COUNT([Source Name]), Type='SALE_GOLD')",
      value: `${formatNumber(measures.total_sell_transac)} tx`,
      description: 'Total completed sell transactions in window',
    },
    {
      name: 'Total transaction',
      category: 'Engagement',
      daxFormula: 'CALCULATE(COUNT([Source Name]))',
      value: `${formatNumber(measures.total_transaction)} tx`,
      description: 'Total completed transactions across all operation types',
    },
    {
      name: 'Total unique user',
      category: 'Engagement',
      daxFormula: "CALCULATE(DISTINCTCOUNT('Raw Data'[User ID]), User ID <> BLANK())",
      value: `${formatNumber(measures.total_unique_user)} users`,
      description: 'Distinct user count participating during the period',
    },
    {
      name: 'User Buy',
      category: 'Buy',
      daxFormula: "CALCULATE(DISTINCTCOUNT('Raw Data'[User ID]), Type='BUY_GOLD')",
      value: `${formatNumber(measures.user_buy)} buyers`,
      description: 'Distinct customers who completed at least one gold purchase',
    },
    {
      name: 'User Sell',
      category: 'Sell',
      daxFormula: "CALCULATE(DISTINCTCOUNT('Raw Data'[User ID]), Type='SALE_GOLD')",
      value: `${formatNumber(measures.user_sell)} sellers`,
      description: 'Distinct customers who completed at least one gold sale',
    },
    {
      name: 'User Withdraw Gold',
      category: 'Withdraw',
      daxFormula: "CALCULATE(DISTINCTCOUNT('Raw Data'[User ID]), Type='WITHDRAW_GOLD')",
      value: `${formatNumber(measures.user_withdraw_gold)} users`,
      description: 'Distinct customers who requested physical gold bar redemption',
    },
    {
      name: 'withdraw gold (15g)',
      category: 'Withdraw',
      daxFormula: "CALCULATE(SUM('Raw Data'[Gold Weight]), Type='WITHDRAW_GOLD')/15",
      value: `${formatDec(measures.withdraw_gold_15g, 2)} Baht`,
      description: 'Total physical gold bar withdrawals normalized in 15g Baht units',
    },
    {
      name: 'Withdraw Trans',
      category: 'Withdraw',
      daxFormula: "CALCULATE(COUNT([Source Name]), Type='WITHDRAW_GOLD')",
      value: `${formatNumber(measures.withdraw_trans)} tx`,
      description: 'Total count of physical gold bar redemption orders',
    },
    {
      name: 'Withdraw Value (mil lak)',
      category: 'Withdraw',
      daxFormula: "CALCULATE(SUM('Raw Data'[Amount (Kip)]), Type='WITHDRAW_GOLD')/1000000",
      value: `${formatDec(measures.withdraw_value_mil_lak, 1)} M LAK`,
      description: 'Estimated financial valuation of withdrawn physical gold (in Million Kip)',
    },
    {
      name: 'Median Value (LAK)',
      category: 'Statistics',
      daxFormula: "MEDIAN('Raw Data'[Amount (Kip)])",
      value: `${formatNumber(measures.median_value_lak)} LAK`,
      description: '50th percentile transaction monetary amount',
    },
    {
      name: 'Median Weight (g)',
      category: 'Statistics',
      daxFormula: "MEDIAN('Raw Data'[Gold Weight])",
      value: `${formatDec(measures.median_weight_g, 4)} g`,
      description: '50th percentile transaction physical gold weight',
    },
  ];

  const categories = ['All', 'Engagement', 'Buy', 'Sell', 'Withdraw', 'Price & Flow', 'Statistics'];

  const filteredRows = allMeasureRows.filter((row) => {
    const matchesCat = selectedCategory === 'All' || row.category === selectedCategory;
    const matchesSearch =
      row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.daxFormula.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleCopyFormula = (formula: string) => {
    navigator.clipboard.writeText(formula);
    setCopiedFormula(formula);
    setTimeout(() => setCopiedFormula(null), 2000);
  };

  // If collapsed/hidden, show compact header with Eye Icon
  if (!isVisible) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-sm mb-6 transition-all hover:border-slate-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#0c4ca3] flex items-center justify-center shrink-0">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">
                  DAX Measures Explorer (PowerBI / Excel Formula Matrix)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0c4ca3] border border-blue-200">
                  {allMeasureRows.length} Measures
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                  Hidden / ຖືກເຊື່ອງໄວ້
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Technical DAX formula definitions are hidden to keep your dashboard clean. Click the eye button to reveal details.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsVisible(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-[#0c4ca3] hover:to-[#093d84] text-[#0c4ca3] hover:text-white border border-blue-200 shadow-2xs hover:shadow-sm transition-all cursor-pointer self-start sm:self-auto group"
            title="Show DAX measures and formulas"
          >
            <Eye className="w-4 h-4 text-[#0c4ca3] group-hover:text-white transition-colors" />
            <span>Show Details (ສະແດງສູດ DAX)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-6 transition-all animate-in fade-in duration-200">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-[#0c4ca3]" />
            <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">
              DAX Measures Explorer (PowerBI / Excel Formula Matrix)
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#0c4ca3]">
              {allMeasureRows.length} Measures
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            1:1 replication of all 29+ measures from the Excel model, computed dynamically over active filters.
          </p>
        </div>

        {/* Search, Category Filter & Eye Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer shadow-2xs"
            title="Hide DAX Measures Details"
          >
            <EyeOff className="w-4 h-4 text-slate-600" />
            <span>Hide (ເຊື່ອງ)</span>
          </button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search measure or formula..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0c4ca3] w-44 sm:w-56"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-[11px] font-bold px-2 py-1 rounded transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#0c4ca3] text-white shadow-xs'
                    : 'text-slate-650 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-150 max-h-[500px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 font-black text-slate-700 uppercase tracking-wider text-[11px]">
                Measure Name
              </th>
              <th className="py-2.5 px-3 font-black text-slate-700 uppercase tracking-wider text-[11px]">
                Category
              </th>
              <th className="py-2.5 px-3 font-black text-slate-700 uppercase tracking-wider text-[11px]">
                Live Filtered Value
              </th>
              <th className="py-2.5 px-3 font-black text-slate-700 uppercase tracking-wider text-[11px]">
                PowerBI / Excel DAX Formula
              </th>
              <th className="py-2.5 px-3 font-black text-slate-700 uppercase tracking-wider text-[11px]">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredRows.map((row) => (
              <tr key={row.name} className="hover:bg-blue-50/40 transition-colors">
                <td className="py-2 px-3 font-extrabold text-slate-900 whitespace-nowrap">
                  {row.name}
                </td>
                <td className="py-2 px-3 whitespace-nowrap">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight ${
                      row.category === 'Buy'
                        ? 'bg-emerald-100 text-emerald-800'
                        : row.category === 'Sell'
                        ? 'bg-rose-100 text-rose-800'
                        : row.category === 'Withdraw'
                        ? 'bg-purple-100 text-purple-800'
                        : row.category === 'Engagement'
                        ? 'bg-blue-100 text-blue-800'
                        : row.category === 'Statistics'
                        ? 'bg-slate-200 text-slate-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {row.category}
                  </span>
                </td>
                <td className="py-2 px-3 font-black text-[#0c4ca3] whitespace-nowrap text-sm">
                  {row.value}
                </td>
                <td className="py-2 px-3 font-mono text-[11px] text-slate-600 max-w-md truncate" title={row.daxFormula}>
                  {row.daxFormula}
                </td>
                <td className="py-2 px-3 whitespace-nowrap">
                  <button
                    onClick={() => handleCopyFormula(row.daxFormula)}
                    title="Copy DAX Formula"
                    className="p-1 rounded text-slate-400 hover:text-[#0c4ca3] hover:bg-blue-50 transition-colors inline-flex items-center gap-1"
                  >
                    {copiedFormula === row.daxFormula ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
