import { DynamicFilterState, DynamicReportPayload } from '../types/dynamicReport.types';

export const ALL_AVAILABLE_BANKS = [
  'BCEL',
  'LDB',
  'JDB',
  'UMONEY',
  'MMONEY',
  'ACLEDA',
  'APB',
  'LVB',
  'PSVB',
  'STB',
];

export const ALL_AVAILABLE_TX_TYPES = [
  { id: 'BUY_GOLD', label: 'Buy Gold (ຊື້ຄຳ)' },
  { id: 'SALE_GOLD', label: 'Sell Gold (ຂາຍຄຳ)' },
  { id: 'WITHDRAW_GOLD', label: 'Withdraw Gold (ຖອນຄຳແທ່ງ)' },
  { id: 'MARKETHUB_WITHDRAW', label: 'MarketHub Withdraw (ຖອນຜ່ານຮ້ານ)' },
  { id: 'OPEN_ACCOUNT', label: 'Open Account (ເປີດບັນຊີໃໝ່)' },
  { id: 'REFUND', label: 'Refund (ຄືນເງິນ)' },
];

export const ALL_AVAILABLE_BRANCHES = [
  'ສຳນັກງານໃຫຍ່ໂພນສີນວນ',
  'ຮ້ານຄຳພູວົງ ສາຂາ ຕະຫຼາດເຊົ້າ',
  'ຮ້ານຄຳພູວົງ ສາຂາ ຕະຫຼາດວັງທອງ',
  'ຮ້ານຄຳພູວົງ ສາຂາ ວຽງຈັນເຊັນເຕີ້',
  'ຮ້ານຄຳພູວົງ ສາຂາ ໄອເຕັກມໍ',
  'ສາຂາຮ້ານຄຳພູວົງ ວັດໄຕ',
  'ຮ້ານຄຳພູວົງ ສາຂາ ໂພນໂຮງ',
  'ຮ້ານຄຳພູນທະວີ ( ທ່າງ່ອນ )',
  'Digital App / Online',
];

export const DEFAULT_FILTER_STATE: DynamicFilterState = {
  startDate: '2026-10-01',
  endDate: '2026-10-12',
  quickPreset: 'this_month',
  selectedBanks: [],
  selectedBranches: [],
  selectedTxTypes: [],
  minWeight: null,
  maxWeight: null,
  minAmount: null,
  maxAmount: null,
  startHour: null,
  endHour: null,
  status: 'ສໍາເລັດ',
};

// High-fidelity fallback / baseline payload representing active month
export const DEFAULT_DYNAMIC_REPORT_PAYLOAD: DynamicReportPayload = {
  meta: {
    start_date: '2026-10-01',
    end_date: '2026-10-12',
    generated_at: new Date().toISOString(),
  },
  dax_measures: {
    // Engagement
    total_transaction: 66652,
    total_unique_user: 27940,
    freq_per_user_all: 2.39,
    new_register: 833,
    total_amount_lak: 168420000000,
    total_gold_weight_g: 7892.4,

    // Buy Performance
    total_buy_transac: 47948,
    user_buy: 21350,
    freq_per_user_buy: 2.25,
    gold_weight_buy_g: 5091.2,
    gold_weight_buy_15g: 339.41,
    revenue_buy_lak: 114850000000,
    revenue_buy_mil_lak: 114850.0,
    abs_buy_ticket_lak: 2395303,
    gold_buy_size_g: 0.1062,

    // Sell Performance
    total_sell_transac: 17234,
    user_sell: 8420,
    freq_per_user_sell: 2.05,
    gold_weight_sell_g: 1937.1,
    gold_weight_sell_15g: 129.14,
    revenue_sell_lak: 43570000000,
    revenue_sell_mil_lak: 43570.0,
    avg_sell_size_lak: 2528142,
    gold_sell_size_g: 0.1124,

    // Withdraw Performance
    withdraw_trans: 1470,
    user_withdraw_gold: 1140,
    withdraw_gold_g: 864.1,
    withdraw_gold_15g: 57.61,
    withdraw_value_lak: 10000000000,
    withdraw_value_mil_lak: 10000.0,
    withdraw_ticket_size_g: 0.5878,
    withdraw_ticket_size_lak: 6802721,

    // Flow & Pricing
    net_flow_trans_pct: 71.94,
    net_flow_value_pct: 72.50,
    net_gold_weight_g: 2290.0,
    open_price: 22450000,
    close_price: 22780000,
    price_change: 330000,

    // Statistical Metrics
    avg_value_lak: 2526856,
    min_value_lak: 100000,
    max_value_lak: 850000000,
    median_value_lak: 500000,
    avg_weight_g: 0.1184,
    min_weight_g: 0.0044,
    max_weight_g: 37.5,
    median_weight_g: 0.0221,
  },
  hourly: [
    { hour: 0, hour_label: '00:00', total_tx: 452, buy_tx: 310, sell_tx: 142, buy_weight_g: 32.1, sell_weight_g: 14.5, total_amount_lak: 1050000000 },
    { hour: 1, hour_label: '01:00', total_tx: 210, buy_tx: 145, sell_tx: 65, buy_weight_g: 15.2, sell_weight_g: 7.1, total_amount_lak: 490000000 },
    { hour: 2, hour_label: '02:00', total_tx: 125, buy_tx: 88, sell_tx: 37, buy_weight_g: 9.1, sell_weight_g: 4.2, total_amount_lak: 280000000 },
    { hour: 3, hour_label: '03:00', total_tx: 95, buy_tx: 68, sell_tx: 27, buy_weight_g: 6.8, sell_weight_g: 3.1, total_amount_lak: 210000000 },
    { hour: 4, hour_label: '04:00', total_tx: 88, buy_tx: 60, sell_tx: 28, buy_weight_g: 6.2, sell_weight_g: 3.0, total_amount_lak: 195000000 },
    { hour: 5, hour_label: '05:00', total_tx: 165, buy_tx: 115, sell_tx: 50, buy_weight_g: 12.0, sell_weight_g: 5.5, total_amount_lak: 380000000 },
    { hour: 6, hour_label: '06:00', total_tx: 480, buy_tx: 345, sell_tx: 135, buy_weight_g: 36.4, sell_weight_g: 14.2, total_amount_lak: 1120000000 },
    { hour: 7, hour_label: '07:00', total_tx: 1120, buy_tx: 810, sell_tx: 310, buy_weight_g: 85.5, sell_weight_g: 33.1, total_amount_lak: 2650000000 },
    { hour: 8, hour_label: '08:00', total_tx: 2540, buy_tx: 1820, sell_tx: 720, buy_weight_g: 192.4, sell_weight_g: 76.8, total_amount_lak: 6150000000 },
    { hour: 9, hour_label: '09:00', total_tx: 4850, buy_tx: 3510, sell_tx: 1340, buy_weight_g: 375.1, sell_weight_g: 142.0, total_amount_lak: 11800000000 },
    { hour: 10, hour_label: '10:00', total_tx: 6120, buy_tx: 4420, sell_tx: 1700, buy_weight_g: 480.2, sell_weight_g: 182.5, total_amount_lak: 15200000000 },
    { hour: 11, hour_label: '11:00', total_tx: 5850, buy_tx: 4210, sell_tx: 1640, buy_weight_g: 452.0, sell_weight_g: 175.2, total_amount_lak: 14600000000 },
    { hour: 12, hour_label: '12:00', total_tx: 4320, buy_tx: 3110, sell_tx: 1210, buy_weight_g: 332.0, sell_weight_g: 128.5, total_amount_lak: 10750000000 },
    { hour: 13, hour_label: '13:00', total_tx: 4980, buy_tx: 3580, sell_tx: 1400, buy_weight_g: 388.5, sell_weight_g: 150.0, total_amount_lak: 12400000000 },
    { hour: 14, hour_label: '14:00', total_tx: 6240, buy_tx: 4490, sell_tx: 1750, buy_weight_g: 495.0, sell_weight_g: 190.2, total_amount_lak: 15900000000 },
    { hour: 15, hour_label: '15:00', total_tx: 5780, buy_tx: 4150, sell_tx: 1630, buy_weight_g: 448.2, sell_weight_g: 174.5, total_amount_lak: 14500000000 },
    { hour: 16, hour_label: '16:00', total_tx: 5410, buy_tx: 3890, sell_tx: 1520, buy_weight_g: 418.0, sell_weight_g: 161.0, total_amount_lak: 13600000000 },
    { hour: 17, hour_label: '17:00', total_tx: 4620, buy_tx: 3320, sell_tx: 1300, buy_weight_g: 355.2, sell_weight_g: 138.0, total_amount_lak: 11500000000 },
    { hour: 18, hour_label: '18:00', total_tx: 3890, buy_tx: 2790, sell_tx: 1100, buy_weight_g: 298.0, sell_weight_g: 116.5, total_amount_lak: 9650000000 },
    { hour: 19, hour_label: '19:00', total_tx: 3540, buy_tx: 2540, sell_tx: 1000, buy_weight_g: 272.5, sell_weight_g: 106.0, total_amount_lak: 8800000000 },
    { hour: 20, hour_label: '20:00', total_tx: 2980, buy_tx: 2140, sell_tx: 840, buy_weight_g: 228.0, sell_weight_g: 89.2, total_amount_lak: 740000000 },
    { hour: 21, hour_label: '21:00', total_tx: 2250, buy_tx: 1610, sell_tx: 640, buy_weight_g: 172.5, sell_weight_g: 67.5, total_amount_lak: 560000000 },
    { hour: 22, hour_label: '22:00', total_tx: 1420, buy_tx: 1010, sell_tx: 410, buy_weight_g: 108.0, sell_weight_g: 43.1, total_amount_lak: 355000000 },
    { hour: 23, hour_label: '23:00', total_tx: 877, buy_tx: 627, sell_tx: 250, buy_weight_g: 66.8, sell_weight_g: 26.5, total_amount_lak: 219000000 },
  ],
  banks: [
    { bank_name: 'BCEL', total_tx: 47990, total_weight_g: 5682.5, total_amount_lak: 121262000000, share_pct: 72.0 },
    { bank_name: 'LDB', total_tx: 8665, total_weight_g: 1025.9, total_amount_lak: 21894000000, share_pct: 13.0 },
    { bank_name: 'JDB', total_tx: 4665, total_weight_g: 552.4, total_amount_lak: 11789000000, share_pct: 7.0 },
    { bank_name: 'UMONEY', total_tx: 2332, total_weight_g: 276.2, total_amount_lak: 5894000000, share_pct: 3.5 },
    { bank_name: 'MMONEY', total_tx: 1666, total_weight_g: 197.3, total_amount_lak: 4210000000, share_pct: 2.5 },
    { bank_name: 'ACLEDA', total_tx: 533, total_weight_g: 63.1, total_amount_lak: 1347000000, share_pct: 0.8 },
    { bank_name: 'APB', total_tx: 400, total_weight_g: 47.3, total_amount_lak: 1010000000, share_pct: 0.6 },
    { bank_name: 'LVB', total_tx: 200, total_weight_g: 23.6, total_amount_lak: 505000000, share_pct: 0.3 },
    { bank_name: 'PSVB', total_tx: 133, total_weight_g: 15.7, total_amount_lak: 336000000, share_pct: 0.2 },
    { bank_name: 'STB', total_tx: 68, total_weight_g: 8.4, total_amount_lak: 173000000, share_pct: 0.1 },
  ],
  branches: [
    { branch_name: 'Digital App / Online', total_tx: 58650, total_weight_g: 6945.3, total_amount_lak: 148209000000, withdraw_tx: 0 },
    { branch_name: 'ສຳນັກງານໃຫຍ່ໂພນສີນວນ', total_tx: 3120, total_weight_g: 369.7, total_amount_lak: 7893000000, withdraw_tx: 580 },
    { branch_name: 'ຮ້ານຄຳພູວົງ ສາຂາ ຕະຫຼາດເຊົ້າ', total_tx: 1850, total_weight_g: 219.2, total_amount_lak: 4680000000, withdraw_tx: 360 },
    { branch_name: 'ຮ້ານຄຳພູວົງ ສາຂາ ຕະຫຼາດວັງທອງ', total_tx: 1140, total_weight_g: 135.1, total_amount_lak: 2884000000, withdraw_tx: 220 },
    { branch_name: 'ຮ້ານຄຳພູວົງ ສາຂາ ວຽງຈັນເຊັນເຕີ້', total_tx: 780, total_weight_g: 92.4, total_amount_lak: 1973000000, withdraw_tx: 140 },
    { branch_name: 'ຮ້ານຄຳພູວົງ ສາຂາ ໄອເຕັກມໍ', total_tx: 520, total_weight_g: 61.6, total_amount_lak: 1315000000, withdraw_tx: 90 },
    { branch_name: 'ສາຂາຮ້ານຄຳພູວົງ ວັດໄຕ', total_tx: 360, total_weight_g: 42.6, total_amount_lak: 910000000, withdraw_tx: 50 },
    { branch_name: 'ຮ້ານຄຳພູວົງ ສາຂາ ໂພນໂຮງ', total_tx: 152, total_weight_g: 18.0, total_amount_lak: 384000000, withdraw_tx: 20 },
    { branch_name: 'ຮ້ານຄຳພູນທະວີ ( ທ່າງ່ອນ )', total_tx: 80, total_weight_g: 8.5, total_amount_lak: 172000000, withdraw_tx: 10 },
  ],
  weight_brackets: [
    { weight_bracket: '< 0.5g', count: 48920, total_weight_g: 1420.5, total_amount_lak: 32671000000 },
    { weight_bracket: '0.5g - 1g', count: 9840, total_weight_g: 742.0, total_amount_lak: 17066000000 },
    { weight_bracket: '1g - 5g', count: 5410, total_weight_g: 1352.5, total_amount_lak: 31107000000 },
    { weight_bracket: '5g - 15g', count: 1840, total_weight_g: 1750.2, total_amount_lak: 40254000000 },
    { weight_bracket: '15g - 75g (1-5 Baht)', count: 580, total_weight_g: 2120.0, total_amount_lak: 41800000000 },
    { weight_bracket: '>= 75g (>5 Baht)', count: 62, total_weight_g: 507.2, total_amount_lak: 5522000000 },
  ],
};

/**
 * Filter simulation calculation engine for local/fallback environment.
 * Evaluates active filter constraints and scales realistic metrics accurately.
 */
export function calculateFilteredReport(
  filters: DynamicFilterState,
  base: DynamicReportPayload = DEFAULT_DYNAMIC_REPORT_PAYLOAD
): DynamicReportPayload {
  let scaleFactor = 1.0;

  // 1. Bank filter scaling
  if (filters.selectedBanks.length > 0) {
    const bankShare = filters.selectedBanks.reduce((sum, b) => {
      const found = base.banks.find((item) => item.bank_name.toUpperCase() === b.toUpperCase());
      return sum + (found ? found.share_pct / 100 : 0.05);
    }, 0);
    scaleFactor *= Math.min(1.0, Math.max(0.01, bankShare));
  }

  // 2. Transaction Type filter scaling
  if (filters.selectedTxTypes.length > 0) {
    const buyAllowed = filters.selectedTxTypes.includes('BUY_GOLD');
    const sellAllowed = filters.selectedTxTypes.includes('SALE_GOLD');
    const withdrawAllowed = filters.selectedTxTypes.includes('WITHDRAW_GOLD') || filters.selectedTxTypes.includes('MARKETHUB_WITHDRAW');

    let txShare = 0;
    if (buyAllowed) txShare += 0.72;
    if (sellAllowed) txShare += 0.26;
    if (withdrawAllowed) txShare += 0.02;
    scaleFactor *= Math.min(1.0, Math.max(0.02, txShare));
  }

  // 3. Hour filter scaling
  if (filters.startHour !== null && filters.endHour !== null) {
    const hoursSpan = Math.max(1, filters.endHour - filters.startHour + 1);
    const hourRatio = hoursSpan / 24;
    scaleFactor *= Math.min(1.0, Math.max(0.05, hourRatio));
  }

  // 4. Weight bracket scaling
  if (filters.minWeight !== null || filters.maxWeight !== null) {
    const minW = filters.minWeight ?? 0;
    const maxW = filters.maxWeight ?? 1000;
    if (maxW <= 0.5) scaleFactor *= 0.65;
    else if (minW >= 15) scaleFactor *= 0.08;
    else scaleFactor *= 0.85;
  }

  // 5. Amount range scaling
  if (filters.minAmount !== null || filters.maxAmount !== null) {
    const minA = filters.minAmount ?? 0;
    const maxA = filters.maxAmount ?? 1e12;
    if (maxA <= 500000) scaleFactor *= 0.45;
    else if (minA >= 50000000) scaleFactor *= 0.06;
  }

  const factor = Math.max(0.01, scaleFactor);

  const scaledTotalTx = Math.round(base.dax_measures.total_transaction * factor);
  const scaledUsers = Math.max(1, Math.round(base.dax_measures.total_unique_user * Math.pow(factor, 0.85)));
  const scaledBuyTx = Math.round(base.dax_measures.total_buy_transac * factor);
  const scaledSellTx = Math.round(base.dax_measures.total_sell_transac * factor);
  const scaledWithdrawTx = Math.max(0, Math.round(base.dax_measures.withdraw_trans * factor));

  const scaledBuyWeightG = Number((base.dax_measures.gold_weight_buy_g * factor).toFixed(2));
  const scaledSellWeightG = Number((base.dax_measures.gold_weight_sell_g * factor).toFixed(2));
  const scaledWithdrawWeightG = Number((base.dax_measures.withdraw_gold_g * factor).toFixed(2));

  const scaledRevenueBuyLak = Math.round(base.dax_measures.revenue_buy_lak * factor);
  const scaledRevenueSellLak = Math.round(base.dax_measures.revenue_sell_lak * factor);
  const scaledWithdrawValueLak = Math.round(base.dax_measures.withdraw_value_lak * factor);

  const buyRevMil = Number((scaledRevenueBuyLak / 1e6).toFixed(2));
  const sellRevMil = Number((scaledRevenueSellLak / 1e6).toFixed(2));
  const withdrawRevMil = Number((scaledWithdrawValueLak / 1e6).toFixed(2));

  const userBuy = Math.max(1, Math.round(base.dax_measures.user_buy * Math.pow(factor, 0.85)));
  const userSell = Math.max(1, Math.round(base.dax_measures.user_sell * Math.pow(factor, 0.85)));
  const userWithdraw = Math.max(0, Math.round(base.dax_measures.user_withdraw_gold * Math.pow(factor, 0.85)));

  const totalRev = scaledRevenueBuyLak + scaledRevenueSellLak;
  const netFlowValPct = totalRev > 0 ? Number(((scaledRevenueBuyLak / totalRev) * 100).toFixed(2)) : 0;
  const netFlowTxPct = scaledTotalTx > 0 ? Number(((scaledBuyTx / scaledTotalTx) * 100).toFixed(2)) : 0;

  return {
    meta: {
      start_date: filters.startDate,
      end_date: filters.endDate,
      generated_at: new Date().toISOString(),
    },
    dax_measures: {
      total_transaction: scaledTotalTx,
      total_unique_user: scaledUsers,
      freq_per_user_all: Number((scaledTotalTx / scaledUsers).toFixed(2)),
      new_register: Math.round(base.dax_measures.new_register * factor),
      total_amount_lak: scaledRevenueBuyLak + scaledRevenueSellLak + scaledWithdrawValueLak,
      total_gold_weight_g: Number((scaledBuyWeightG + scaledSellWeightG + scaledWithdrawWeightG).toFixed(2)),

      total_buy_transac: scaledBuyTx,
      user_buy: userBuy,
      freq_per_user_buy: Number((scaledBuyTx / userBuy).toFixed(2)),
      gold_weight_buy_g: scaledBuyWeightG,
      gold_weight_buy_15g: Number((scaledBuyWeightG / 15.0).toFixed(2)),
      revenue_buy_lak: scaledRevenueBuyLak,
      revenue_buy_mil_lak: buyRevMil,
      abs_buy_ticket_lak: scaledBuyTx > 0 ? Math.round(scaledRevenueBuyLak / scaledBuyTx) : 0,
      gold_buy_size_g: scaledBuyTx > 0 ? Number((scaledBuyWeightG / scaledBuyTx).toFixed(4)) : 0,

      total_sell_transac: scaledSellTx,
      user_sell: userSell,
      freq_per_user_sell: Number((scaledSellTx / userSell).toFixed(2)),
      gold_weight_sell_g: scaledSellWeightG,
      gold_weight_sell_15g: Number((scaledSellWeightG / 15.0).toFixed(2)),
      revenue_sell_lak: scaledRevenueSellLak,
      revenue_sell_mil_lak: sellRevMil,
      avg_sell_size_lak: scaledSellTx > 0 ? Math.round(scaledRevenueSellLak / scaledSellTx) : 0,
      gold_sell_size_g: scaledSellTx > 0 ? Number((scaledSellWeightG / scaledSellTx).toFixed(4)) : 0,

      withdraw_trans: scaledWithdrawTx,
      user_withdraw_gold: userWithdraw,
      withdraw_gold_g: scaledWithdrawWeightG,
      withdraw_gold_15g: Number((scaledWithdrawWeightG / 15.0).toFixed(2)),
      withdraw_value_lak: scaledWithdrawValueLak,
      withdraw_value_mil_lak: withdrawRevMil,
      withdraw_ticket_size_g: scaledWithdrawTx > 0 ? Number((scaledWithdrawWeightG / scaledWithdrawTx).toFixed(4)) : 0,
      withdraw_ticket_size_lak: scaledWithdrawTx > 0 ? Math.round(scaledWithdrawValueLak / scaledWithdrawTx) : 0,

      net_flow_trans_pct: netFlowTxPct,
      net_flow_value_pct: netFlowValPct,
      net_gold_weight_g: Number((scaledBuyWeightG - scaledSellWeightG - scaledWithdrawWeightG).toFixed(2)),
      open_price: base.dax_measures.open_price,
      close_price: base.dax_measures.close_price,
      price_change: base.dax_measures.price_change,

      avg_value_lak: Math.round(base.dax_measures.avg_value_lak),
      min_value_lak: base.dax_measures.min_value_lak,
      max_value_lak: base.dax_measures.max_value_lak,
      median_value_lak: base.dax_measures.median_value_lak,
      avg_weight_g: base.dax_measures.avg_weight_g,
      min_weight_g: base.dax_measures.min_weight_g,
      max_weight_g: base.dax_measures.max_weight_g,
      median_weight_g: base.dax_measures.median_weight_g,
    },
    hourly: base.hourly.map((h) => ({
      ...h,
      total_tx: Math.round(h.total_tx * factor),
      buy_tx: Math.round(h.buy_tx * factor),
      sell_tx: Math.round(h.sell_tx * factor),
      buy_weight_g: Number((h.buy_weight_g * factor).toFixed(1)),
      sell_weight_g: Number((h.sell_weight_g * factor).toFixed(1)),
      total_amount_lak: Math.round(h.total_amount_lak * factor),
    })),
    banks: base.banks.map((b) => ({
      ...b,
      total_tx: Math.round(b.total_tx * factor),
      total_weight_g: Number((b.total_weight_g * factor).toFixed(1)),
      total_amount_lak: Math.round(b.total_amount_lak * factor),
    })),
    branches: base.branches.map((br) => ({
      ...br,
      total_tx: Math.round(br.total_tx * factor),
      total_weight_g: Number((br.total_weight_g * factor).toFixed(1)),
      total_amount_lak: Math.round(br.total_amount_lak * factor),
      withdraw_tx: Math.round(br.withdraw_tx * factor),
    })),
    weight_brackets: base.weight_brackets.map((wb) => ({
      ...wb,
      count: Math.round(wb.count * factor),
      total_weight_g: Number((wb.total_weight_g * factor).toFixed(1)),
      total_amount_lak: Math.round(wb.total_amount_lak * factor),
    })),
  };
}
