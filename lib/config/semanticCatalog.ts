/**
 * Semantic Measure & Dimension Catalog
 * Based on Section 6 and Section 10 of "Data Structure Handbook: Easy Gold Reporting"
 * 
 * Rules:
 * 1. Base facts are additive only (counts, sums) stored in DB facts.
 * 2. Derived measures are calculated here to ensure consistent formulas everywhere.
 * 3. Never sum distinct counts or stored ratios.
 */

export interface DimensionDef {
  id: string;
  label: string;
  tableSource: 'dim_date' | 'dim_branch' | 'dim_bank' | 'dim_status' | 'dim_weight_bucket' | 'dim_amount_bucket';
  column: string;
}

export interface MeasureDef {
  id: string;
  label: string;
  type: 'base' | 'derived' | 'distinct';
  unit: 'count' | 'grams' | 'lak' | 'million_lak' | '15g' | 'percent' | 'ratio';
  description: string;
  calculate?: (base: Record<string, number>) => number;
}

// 1. Semantic Dimensions
export const SEMANTIC_DIMENSIONS: Record<string, DimensionDef> = {
  date: { id: 'date', label: 'Date', tableSource: 'dim_date', column: 'date_id' },
  month: { id: 'month', label: 'Month', tableSource: 'dim_date', column: 'year_month' },
  week: { id: 'week', label: 'Week', tableSource: 'dim_date', column: 'year_week' },
  branch: { id: 'branch', label: 'Branch', tableSource: 'dim_branch', column: 'branch_code' },
  bank: { id: 'bank', label: 'Bank', tableSource: 'dim_bank', column: 'bank_code' },
  transaction_type: { id: 'transaction_type', label: 'Transaction Type', tableSource: 'dim_status', column: 'tx_type_code' },
  status: { id: 'status', label: 'Status Code', tableSource: 'dim_status', column: 'status_code' },
  weight_bucket: { id: 'weight_bucket', label: 'Weight Bracket', tableSource: 'dim_weight_bucket', column: 'bucket_code' },
  amount_bucket: { id: 'amount_bucket', label: 'Amount Bracket', tableSource: 'dim_amount_bucket', column: 'bucket_code' },
};

// 2. Semantic Measures (Section 6)
export const SEMANTIC_MEASURES: Record<string, MeasureDef> = {
  // --- BASE MEASURES ---
  buy_trans: {
    id: 'buy_trans',
    label: 'Total Buy Transac',
    type: 'base',
    unit: 'count',
    description: 'Sum of trans_count where transaction_type = BUY_GOLD',
  },
  sell_trans: {
    id: 'sell_trans',
    label: 'Total Sell Transac',
    type: 'base',
    unit: 'count',
    description: 'Sum of trans_count where transaction_type = SALE_GOLD',
  },
  withdraw_trans: {
    id: 'withdraw_trans',
    label: 'Withdraw Trans',
    type: 'base',
    unit: 'count',
    description: 'Sum of trans_count where transaction_type = WITHDRAW_GOLD',
  },
  new_register: {
    id: 'new_register',
    label: 'New Register',
    type: 'base',
    unit: 'count',
    description: 'Sum of trans_count where transaction_type = OPEN_ACCOUNT',
  },
  revenue_buy_mil_lak: {
    id: 'revenue_buy_mil_lak',
    label: 'Revenue Buy (mil LAK)',
    type: 'base',
    unit: 'million_lak',
    description: 'Sum of amount_lak for BUY_GOLD divided by 1,000,000',
  },
  revenue_sell_mil_lak: {
    id: 'revenue_sell_mil_lak',
    label: 'Revenue Sell (mil LAK)',
    type: 'base',
    unit: 'million_lak',
    description: 'Sum of amount_lak for SALE_GOLD divided by 1,000,000',
  },
  gold_weight_buy_g: {
    id: 'gold_weight_buy_g',
    label: 'Gold Weight Buy (g)',
    type: 'base',
    unit: 'grams',
    description: 'Sum of gold_weight_g for BUY_GOLD',
  },
  gold_weight_sell_g: {
    id: 'gold_weight_sell_g',
    label: 'Gold Weight Sell (g)',
    type: 'base',
    unit: 'grams',
    description: 'Sum of gold_weight_g for SALE_GOLD',
  },
  gold_weight_withdraw_g: {
    id: 'gold_weight_withdraw_g',
    label: 'Gold Weight Withdraw (g)',
    type: 'base',
    unit: 'grams',
    description: 'Sum of gold_weight_g for WITHDRAW_GOLD',
  },

  // --- DERIVED MEASURES ---
  total_transactions: {
    id: 'total_transactions',
    label: 'Total Transaction',
    type: 'derived',
    unit: 'count',
    description: 'Buy + Sell transactions',
    calculate: (b) => (b.buy_trans || 0) + (b.sell_trans || 0),
  },
  gold_weight_15g: {
    id: 'gold_weight_15g',
    label: 'Gold weight (15g)',
    type: 'derived',
    unit: '15g',
    description: 'Total weight in grams divided by 15',
    calculate: (b) => {
      const totalG = (b.gold_weight_buy_g || 0) + (b.gold_weight_sell_g || 0);
      return Math.round((totalG / 15) * 100) / 100;
    },
  },
  avg_buy_size_g: {
    id: 'avg_buy_size_g',
    label: 'Avg Buy size (g)',
    type: 'derived',
    unit: 'grams',
    description: 'Gold Weight Buy divided by Total Buy Transac',
    calculate: (b) => {
      if (!b.buy_trans || b.buy_trans === 0) return 0;
      return Math.round(((b.gold_weight_buy_g || 0) / b.buy_trans) * 100) / 100;
    },
  },
  avg_sell_size_g: {
    id: 'avg_sell_size_g',
    label: 'Avg Sell size (g)',
    type: 'derived',
    unit: 'grams',
    description: 'Gold Weight Sell divided by Total Sell Transac',
    calculate: (b) => {
      if (!b.sell_trans || b.sell_trans === 0) return 0;
      return Math.round(((b.gold_weight_sell_g || 0) / b.sell_trans) * 100) / 100;
    },
  },
  abs_buy_size_lak: {
    id: 'abs_buy_size_lak',
    label: 'ABS (Average Buy Size LAK)',
    type: 'derived',
    unit: 'lak',
    description: 'Revenue Buy divided by Total Buy Transac',
    calculate: (b) => {
      if (!b.buy_trans || b.buy_trans === 0) return 0;
      return Math.round(((b.amount_buy_lak || 0) / b.buy_trans));
    },
  },
  net_flow_percent_trans: {
    id: 'net_flow_percent_trans',
    label: '%Net Flow (trans)',
    type: 'derived',
    unit: 'percent',
    description: 'Buy transactions divided by total transactions',
    calculate: (b) => {
      const total = (b.buy_trans || 0) + (b.sell_trans || 0);
      if (total === 0) return 0;
      return Math.round(((b.buy_trans || 0) / total) * 1000) / 10;
    },
  },
  net_flow_percent_value: {
    id: 'net_flow_percent_value',
    label: '%Net Flow (value)',
    type: 'derived',
    unit: 'percent',
    description: 'Revenue Buy divided by (Revenue Buy + Revenue Sell)',
    calculate: (b) => {
      const total = (b.amount_buy_lak || 0) + (b.amount_sell_lak || 0);
      if (total === 0) return 0;
      return Math.round(((b.amount_buy_lak || 0) / total) * 1000) / 10;
    },
  },

  // --- DISTINCT MEASURES ---
  unique_users: {
    id: 'unique_users',
    label: 'Total Unique Users',
    type: 'distinct',
    unit: 'count',
    description: 'Counted distinctly from fact_customer_daily',
  },
};

// 3. Query Router Helper (Section 10)
export type TableTarget = 'fact_daily_core' | 'fact_daily_wide' | 'fact_hourly' | 'fact_customer_daily' | 'raw';

export interface QueryRequirement {
  dimensions: string[];
  requiresHourly?: boolean;
  requiresBuckets?: boolean;
  requiresDistinctUsers?: boolean;
  requiresRawDrillThrough?: boolean;
}

export function routeQueryTarget(req: QueryRequirement): TableTarget {
  if (req.requiresRawDrillThrough) {
    return 'raw';
  }
  if (req.requiresDistinctUsers) {
    return 'fact_customer_daily';
  }
  if (req.requiresHourly || req.dimensions.includes('hour')) {
    return 'fact_hourly';
  }
  if (
    req.requiresBuckets || 
    req.dimensions.includes('weight_bucket') || 
    req.dimensions.includes('amount_bucket')
  ) {
    return 'fact_daily_wide';
  }
  // Default to fact_daily_core (~80% of reports)
  return 'fact_daily_core';
}
