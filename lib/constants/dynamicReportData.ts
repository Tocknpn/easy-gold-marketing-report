import { DynamicFilterState, DynamicReportPayload, TrendPoint } from '../types/dynamicReport.types';

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
  'ຮ້ານຄຳພູວົງ ສາຂາ ຕະຫຼາດດາວເຮືອງປາກເຊ',
  'ຮ້ານຄຳພອຍໄພລິນ ຂາຍຄຳພູວົງ ( ທ່າງ່ອນ )',
  'ຮ້ານຄຳພູວົງ ສາຂາ ໄຊຍະບູລີ',
  'Digital App / Online',
];

const getInitialMonthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

export const DEFAULT_FILTER_STATE: DynamicFilterState = {
  startDate: typeof window !== 'undefined' ? getInitialMonthStart() : '2026-10-01',
  endDate: typeof window !== 'undefined' ? new Date().toISOString().split('T')[0] : '2026-10-18',
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
  selectedHours: [],
  status: 'ສໍາເລັດ',
  customerSegment: 'all',
  dayOfWeek: 'all',
  selectedDaysOfWeek: [],
  searchKeyword: '',
};

// ============================================================================
// 1. OCTOBER 2026 MTD (Current Month Baseline: Oct 1 - Oct 12, 2026)
// ============================================================================
export const OCTOBER_TIMELINE_TREND: TrendPoint[] = [
  {
    "label": "10-01",
    "subLabel": "Thu",
    "tx_date": "2026-10-01",
    "buy_val": 30510330000,
    "sell_val": 10464930000,
    "total_val": 40975260000,
    "buy_tx": 5273,
    "sell_tx": 1662,
    "total_tx": 7096,
    "buy_weight_g": 9901.78,
    "sell_weight_g": 3426.21,
    "net_weight_g": 6475.57,
    "nc": 103,
    "withdraw_tx": 57,
    "withdraw_weight_g": 1714.65
  },
  {
    "label": "10-02",
    "subLabel": "Fri",
    "tx_date": "2026-10-02",
    "buy_val": 48394370000,
    "sell_val": 11427700000,
    "total_val": 59822070000,
    "buy_tx": 8160,
    "sell_tx": 1660,
    "total_tx": 10015,
    "buy_weight_g": 15743.88,
    "sell_weight_g": 3734.37,
    "net_weight_g": 12009.51,
    "nc": 120,
    "withdraw_tx": 75,
    "withdraw_weight_g": 1956.75
  },
  {
    "label": "10-03",
    "subLabel": "Sat",
    "tx_date": "2026-10-03",
    "buy_val": 20590340000,
    "sell_val": 3692080000,
    "total_val": 24282420000,
    "buy_tx": 4230,
    "sell_tx": 1226,
    "total_tx": 5608,
    "buy_weight_g": 6702.19,
    "sell_weight_g": 1215.83,
    "net_weight_g": 5486.36,
    "nc": 67,
    "withdraw_tx": 83,
    "withdraw_weight_g": 2143.8
  },
  {
    "label": "10-04",
    "subLabel": "Sun",
    "tx_date": "2026-10-04",
    "buy_val": 13270060000,
    "sell_val": 2994860000,
    "total_val": 16264920000,
    "buy_tx": 2892,
    "sell_tx": 1146,
    "total_tx": 4151,
    "buy_weight_g": 4320.65,
    "sell_weight_g": 986.45,
    "net_weight_g": 3334.2,
    "nc": 59,
    "withdraw_tx": 54,
    "withdraw_weight_g": 1288.8
  },
  {
    "label": "10-05",
    "subLabel": "Mon",
    "tx_date": "2026-10-05",
    "buy_val": 15675410000,
    "sell_val": 10554720000,
    "total_val": 26230130000,
    "buy_tx": 4149,
    "sell_tx": 1783,
    "total_tx": 6070,
    "buy_weight_g": 5094.63,
    "sell_weight_g": 3465.5,
    "net_weight_g": 1629.13,
    "nc": 83,
    "withdraw_tx": 55,
    "withdraw_weight_g": 1846.5
  },
  {
    "label": "10-06",
    "subLabel": "Tue",
    "tx_date": "2026-10-06",
    "buy_val": 26373420000,
    "sell_val": 7430000000,
    "total_val": 33803420000,
    "buy_tx": 5621,
    "sell_tx": 1657,
    "total_tx": 7430,
    "buy_weight_g": 8596.21,
    "sell_weight_g": 2447.41,
    "net_weight_g": 6148.8,
    "nc": 91,
    "withdraw_tx": 60,
    "withdraw_weight_g": 1161.15
  },
  {
    "label": "10-07",
    "subLabel": "Wed",
    "tx_date": "2026-10-07",
    "buy_val": 48189120000,
    "sell_val": 8876660000,
    "total_val": 57065780000,
    "buy_tx": 7192,
    "sell_tx": 1600,
    "total_tx": 8934,
    "buy_weight_g": 15792.06,
    "sell_weight_g": 2929.02,
    "net_weight_g": 12863.04,
    "nc": 98,
    "withdraw_tx": 44,
    "withdraw_weight_g": 1553.7
  },
  {
    "label": "10-08",
    "subLabel": "Thu",
    "tx_date": "2026-10-08",
    "buy_val": 16301400000,
    "sell_val": 7693730000,
    "total_val": 23995130000,
    "buy_tx": 4099,
    "sell_tx": 1653,
    "total_tx": 5884,
    "buy_weight_g": 5318.06,
    "sell_weight_g": 2534.5,
    "net_weight_g": 2783.56,
    "nc": 83,
    "withdraw_tx": 47,
    "withdraw_weight_g": 1366.05
  },
  {
    "label": "10-09",
    "subLabel": "Fri",
    "tx_date": "2026-10-09",
    "buy_val": 6766590000,
    "sell_val": 13765190000,
    "total_val": 20531780000,
    "buy_tx": 2385,
    "sell_tx": 1878,
    "total_tx": 4372,
    "buy_weight_g": 2189.84,
    "sell_weight_g": 4506.8,
    "net_weight_g": -2316.96,
    "nc": 54,
    "withdraw_tx": 52,
    "withdraw_weight_g": 1447.8
  },
  {
    "label": "10-10",
    "subLabel": "Sat",
    "tx_date": "2026-10-10",
    "buy_val": 4498890000,
    "sell_val": 6336560000,
    "total_val": 10835450000,
    "buy_tx": 2137,
    "sell_tx": 1593,
    "total_tx": 3822,
    "buy_weight_g": 1452.95,
    "sell_weight_g": 2069.56,
    "net_weight_g": -616.61,
    "nc": 46,
    "withdraw_tx": 46,
    "withdraw_weight_g": 1342.95
  },
  {
    "label": "10-11",
    "subLabel": "Sun",
    "tx_date": "2026-10-11",
    "buy_val": 3896570000,
    "sell_val": 5316020000,
    "total_val": 9212590000,
    "buy_tx": 1810,
    "sell_tx": 1376,
    "total_tx": 3270,
    "buy_weight_g": 1258.26,
    "sell_weight_g": 1736.47,
    "net_weight_g": -478.21,
    "nc": 29,
    "withdraw_tx": 55,
    "withdraw_weight_g": 1277.25
  },
  {
    "label": "10-12",
    "subLabel": "Mon",
    "tx_date": "2026-10-12",
    "buy_val": 8369000000,
    "sell_val": 11326380000,
    "total_val": 19695380000,
    "buy_tx": 2985,
    "sell_tx": 1958,
    "total_tx": 5080,
    "buy_weight_g": 2700.51,
    "sell_weight_g": 3694.22,
    "net_weight_g": -993.71,
    "nc": 73,
    "withdraw_tx": 60,
    "withdraw_weight_g": 1368.45
  },
  {
    "label": "10-13",
    "subLabel": "Tue",
    "tx_date": "2026-10-13",
    "buy_val": 12336920000,
    "sell_val": 10332910000,
    "total_val": 22669830000,
    "buy_tx": 3558,
    "sell_tx": 1686,
    "total_tx": 5354,
    "buy_weight_g": 4014.12,
    "sell_weight_g": 3389.59,
    "net_weight_g": 624.53,
    "nc": 57,
    "withdraw_tx": 53,
    "withdraw_weight_g": 1162.95
  },
  {
    "label": "10-14",
    "subLabel": "Wed",
    "tx_date": "2026-10-14",
    "buy_val": 65967690000,
    "sell_val": 8912590000,
    "total_val": 74880280000,
    "buy_tx": 8896,
    "sell_tx": 1715,
    "total_tx": 10730,
    "buy_weight_g": 21626.67,
    "sell_weight_g": 2938.86,
    "net_weight_g": 18687.81,
    "nc": 80,
    "withdraw_tx": 38,
    "withdraw_weight_g": 715.35
  },
  {
    "label": "10-15",
    "subLabel": "Thu",
    "tx_date": "2026-10-15",
    "buy_val": 16502150000,
    "sell_val": 7688050000,
    "total_val": 24190200000,
    "buy_tx": 3839,
    "sell_tx": 1784,
    "total_tx": 5760,
    "buy_weight_g": 5394.02,
    "sell_weight_g": 2539.33,
    "net_weight_g": 2854.69,
    "nc": 100,
    "withdraw_tx": 37,
    "withdraw_weight_g": 904.5
  },
  {
    "label": "10-16",
    "subLabel": "Fri",
    "tx_date": "2026-10-16",
    "buy_val": 6858470000,
    "sell_val": 9972670000,
    "total_val": 16831140000,
    "buy_tx": 2523,
    "sell_tx": 1935,
    "total_tx": 4578,
    "buy_weight_g": 2234.86,
    "sell_weight_g": 3281.51,
    "net_weight_g": -1046.65,
    "nc": 70,
    "withdraw_tx": 50,
    "withdraw_weight_g": 1424.4
  },
  {
    "label": "10-17",
    "subLabel": "Sat",
    "tx_date": "2026-10-17",
    "buy_val": 5305700000,
    "sell_val": 7578580000,
    "total_val": 12884280000,
    "buy_tx": 2223,
    "sell_tx": 1559,
    "total_tx": 3883,
    "buy_weight_g": 1730.25,
    "sell_weight_g": 2498.81,
    "net_weight_g": -768.56,
    "nc": 42,
    "withdraw_tx": 58,
    "withdraw_weight_g": 1758
  },
  {
    "label": "10-18",
    "subLabel": "Sun",
    "tx_date": "2026-10-18",
    "buy_val": 4214890000,
    "sell_val": 6014910000,
    "total_val": 10229800000,
    "buy_tx": 1869,
    "sell_tx": 1428,
    "total_tx": 3396,
    "buy_weight_g": 1373.24,
    "sell_weight_g": 1982.51,
    "net_weight_g": -609.27,
    "nc": 47,
    "withdraw_tx": 52,
    "withdraw_weight_g": 1293.15
  },
  {
    "label": "10-19",
    "subLabel": "Mon",
    "tx_date": "2026-10-19",
    "buy_val": 11510530000,
    "sell_val": 13627330000,
    "total_val": 25137860000,
    "buy_tx": 3698,
    "sell_tx": 2039,
    "total_tx": 5862,
    "buy_weight_g": 3753.91,
    "sell_weight_g": 4483.59,
    "net_weight_g": -729.68,
    "nc": 70,
    "withdraw_tx": 55,
    "withdraw_weight_g": 2630.7
  },
  {
    "label": "10-20",
    "subLabel": "Tue",
    "tx_date": "2026-10-20",
    "buy_val": 43863760000,
    "sell_val": 6855880000,
    "total_val": 50719640000,
    "buy_tx": 7438,
    "sell_tx": 1817,
    "total_tx": 9394,
    "buy_weight_g": 14390.31,
    "sell_weight_g": 2273.05,
    "net_weight_g": 12117.26,
    "nc": 84,
    "withdraw_tx": 53,
    "withdraw_weight_g": 2184.45
  },
  {
    "label": "10-21",
    "subLabel": "Wed",
    "tx_date": "2026-10-21",
    "buy_val": 27903500000,
    "sell_val": 9493390000,
    "total_val": 37396890000,
    "buy_tx": 5276,
    "sell_tx": 1861,
    "total_tx": 7293,
    "buy_weight_g": 9162.59,
    "sell_weight_g": 3117.32,
    "net_weight_g": 6045.27,
    "nc": 115,
    "withdraw_tx": 41,
    "withdraw_weight_g": 1600.05
  },
  {
    "label": "10-22",
    "subLabel": "Thu",
    "tx_date": "2026-10-22",
    "buy_val": 66855050000,
    "sell_val": 9160020000,
    "total_val": 76015070000,
    "buy_tx": 10732,
    "sell_tx": 1933,
    "total_tx": 12895,
    "buy_weight_g": 22062.65,
    "sell_weight_g": 3054.27,
    "net_weight_g": 19008.38,
    "nc": 159,
    "withdraw_tx": 68,
    "withdraw_weight_g": 1437.45
  },
  {
    "label": "10-23",
    "subLabel": "Fri",
    "tx_date": "2026-10-23",
    "buy_val": 132765680000,
    "sell_val": 13347490000,
    "total_val": 146113170000,
    "buy_tx": 18082,
    "sell_tx": 2139,
    "total_tx": 20636,
    "buy_weight_g": 44418.37,
    "sell_weight_g": 4516.68,
    "net_weight_g": 39901.69,
    "nc": 302,
    "withdraw_tx": 113,
    "withdraw_weight_g": 3256.2
  },
  {
    "label": "10-24",
    "subLabel": "Sat",
    "tx_date": "2026-10-24",
    "buy_val": 12503740000,
    "sell_val": 6577520000,
    "total_val": 19081260000,
    "buy_tx": 3412,
    "sell_tx": 1641,
    "total_tx": 5281,
    "buy_weight_g": 4185.55,
    "sell_weight_g": 2228.12,
    "net_weight_g": 1957.43,
    "nc": 152,
    "withdraw_tx": 76,
    "withdraw_weight_g": 2479.2
  },
  {
    "label": "10-25",
    "subLabel": "Sun",
    "tx_date": "2026-10-25",
    "buy_val": 9063190000,
    "sell_val": 8962160000,
    "total_val": 18025350000,
    "buy_tx": 2993,
    "sell_tx": 1553,
    "total_tx": 4798,
    "buy_weight_g": 3037.08,
    "sell_weight_g": 3039.06,
    "net_weight_g": -1.98,
    "nc": 170,
    "withdraw_tx": 79,
    "withdraw_weight_g": 3217.95
  },
  {
    "label": "10-26",
    "subLabel": "Mon",
    "tx_date": "2026-10-26",
    "buy_val": 28542880000,
    "sell_val": 11144330000,
    "total_val": 39687210000,
    "buy_tx": 5652,
    "sell_tx": 1968,
    "total_tx": 7871,
    "buy_weight_g": 9592.86,
    "sell_weight_g": 3790.65,
    "net_weight_g": 5802.21,
    "nc": 171,
    "withdraw_tx": 80,
    "withdraw_weight_g": 5191.2
  }
];

export const OCTOBER_2026_DYNAMIC_REPORT_PAYLOAD: DynamicReportPayload = {
  meta: {
    start_date: '2026-10-01',
    end_date: '2026-10-22',
    generated_at: new Date().toISOString(),
  },
  dax_measures: {
    total_transaction: 127982,
    total_unique_user: 53549,
    freq_per_user_all: 2.39,
    new_register: 1571,
    total_amount_lak: 665866250000,
    total_gold_weight_g: 234142.95,

    total_buy_transac: 90253,
    user_buy: 40112,
    freq_per_user_buy: 2.25,
    gold_weight_buy_g: 142750.65,
    gold_weight_buy_15g: 9516.71,
    revenue_buy_lak: 437299110000,
    revenue_buy_mil_lak: 437299.11,
    abs_buy_ticket_lak: 4845259,
    gold_buy_size_g: 1.5817,

    total_sell_transac: 35016,
    user_sell: 17081,
    freq_per_user_sell: 2.05,
    gold_weight_sell_g: 59250.90,
    gold_weight_sell_15g: 3950.06,
    revenue_sell_lak: 180355140000,
    revenue_sell_mil_lak: 180355.14,
    avg_sell_size_lak: 5150649,
    gold_sell_size_g: 1.6921,

    withdraw_trans: 1045,
    user_withdraw_gold: 924,
    withdraw_gold_g: 32141.40,
    withdraw_gold_15g: 2142.76,
    withdraw_value_lak: 48212000000,
    withdraw_value_mil_lak: 48212.00,
    withdraw_ticket_size_g: 30.7573,
    withdraw_ticket_size_lak: 46135885,

    net_flow_trans_pct: 72.04,
    net_flow_value_pct: 70.80,
    net_gold_weight_g: 51358.35,
    open_price: 22450000,
    close_price: 22780000,
    price_change: 330000,

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
    { bank_name: 'BCEL', total_tx: 47990, total_weight_g: 5682.5, total_amount_lak: 121262000000, share_pct: 72.0, buy_tx: 36000, sell_tx: 11990, buy_amount_lak: 92150000000, sell_amount_lak: 29112000000, buy_share_pct: 75.0, sell_share_pct: 64.3 },
    { bank_name: 'LDB', total_tx: 8665, total_weight_g: 1025.9, total_amount_lak: 21894000000, share_pct: 13.0, buy_tx: 5765, sell_tx: 2900, buy_amount_lak: 15325000000, sell_amount_lak: 6569000000, buy_share_pct: 12.0, sell_share_pct: 15.5 },
    { bank_name: 'JDB', total_tx: 4665, total_weight_g: 552.4, total_amount_lak: 11789000000, share_pct: 7.0, buy_tx: 3120, sell_tx: 1545, buy_amount_lak: 8252000000, sell_amount_lak: 3537000000, buy_share_pct: 6.5, sell_share_pct: 8.3 },
    { bank_name: 'UMONEY', total_tx: 2332, total_weight_g: 276.2, total_amount_lak: 5894000000, share_pct: 3.5, buy_tx: 1480, sell_tx: 852, buy_amount_lak: 3831000000, sell_amount_lak: 2063000000, buy_share_pct: 3.1, sell_share_pct: 4.6 },
    { bank_name: 'MMONEY', total_tx: 1666, total_weight_g: 197.3, total_amount_lak: 4210000000, share_pct: 2.5, buy_tx: 1020, sell_tx: 646, buy_amount_lak: 2694000000, sell_amount_lak: 1516000000, buy_share_pct: 2.1, sell_share_pct: 3.5 },
    { bank_name: 'ACLEDA', total_tx: 533, total_weight_g: 63.1, total_amount_lak: 1347000000, share_pct: 0.8, buy_tx: 320, sell_tx: 213, buy_amount_lak: 875000000, sell_amount_lak: 472000000, buy_share_pct: 0.7, sell_share_pct: 1.1 },
    { bank_name: 'APB', total_tx: 400, total_weight_g: 47.3, total_amount_lak: 1010000000, share_pct: 0.6, buy_tx: 220, sell_tx: 180, buy_amount_lak: 606000000, sell_amount_lak: 404000000, buy_share_pct: 0.5, sell_share_pct: 1.0 },
    { bank_name: 'LVB', total_tx: 200, total_weight_g: 23.6, total_amount_lak: 505000000, share_pct: 0.3, buy_tx: 110, sell_tx: 90, buy_amount_lak: 278000000, sell_amount_lak: 227000000, buy_share_pct: 0.2, sell_share_pct: 0.5 },
    { bank_name: 'PSVB', total_tx: 133, total_weight_g: 15.7, total_amount_lak: 336000000, share_pct: 0.2, buy_tx: 70, sell_tx: 63, buy_amount_lak: 185000000, sell_amount_lak: 151000000, buy_share_pct: 0.15, sell_share_pct: 0.35 },
    { bank_name: 'STB', total_tx: 68, total_weight_g: 8.4, total_amount_lak: 173000000, share_pct: 0.1, buy_tx: 35, sell_tx: 33, buy_amount_lak: 95000000, sell_amount_lak: 78000000, buy_share_pct: 0.07, sell_share_pct: 0.17 },
  ],
  branches: [
    { branch_name: 'Digital App / Online', total_tx: 58650, total_weight_g: 6945.3, total_amount_lak: 148209000000, withdraw_tx: 0 },
    { branch_name: 'ສຳນັກງານໃຫຍ່ໂພນສີນວນ', total_tx: 3120, total_weight_g: 369.7, total_amount_lak: 7893000000, withdraw_tx: 188 },
    { branch_name: 'ຮ້ານຄຳພູວົງ ສາຂາ ຕະຫຼາດເຊົ້າ', total_tx: 1850, total_weight_g: 219.2, total_amount_lak: 4680000000, withdraw_tx: 116 },
    { branch_name: 'ຮ້ານຄຳພູວົງ ສາຂາ ຕະຫຼາດວັງທອງ', total_tx: 1140, total_weight_g: 135.1, total_amount_lak: 2884000000, withdraw_tx: 68 },
    { branch_name: 'ຮ້ານຄຳພູວົງ ສາຂາ ວຽງຈັນເຊັນເຕີ້', total_tx: 780, total_weight_g: 92.4, total_amount_lak: 1973000000, withdraw_tx: 46 },
    { branch_name: 'ຮ້ານຄຳພູວົງ ສາຂາ ໄອເຕັກມໍ', total_tx: 520, total_weight_g: 61.6, total_amount_lak: 1315000000, withdraw_tx: 28 },
    { branch_name: 'ສາຂາຮ້ານຄຳພູວົງ ວັດໄຕ', total_tx: 360, total_weight_g: 42.6, total_amount_lak: 910000000, withdraw_tx: 17 },
    { branch_name: 'ຮ້ານຄຳພູວົງ ສາຂາ ໂພນໂຮງ', total_tx: 152, total_weight_g: 18.0, total_amount_lak: 384000000, withdraw_tx: 6 },
    { branch_name: 'ຮ້ານຄຳພູນທະວີ ( ທ່າງ່ອນ )', total_tx: 80, total_weight_g: 8.5, total_amount_lak: 172000000, withdraw_tx: 4 },
  ],
  weight_brackets: [
    { weight_bracket: '< 0.5g', count: 48920, total_weight_g: 1420.5, total_amount_lak: 32671000000 },
    { weight_bracket: '0.5g - 1g', count: 9840, total_weight_g: 742.0, total_amount_lak: 17066000000 },
    { weight_bracket: '1g - 5g', count: 5410, total_weight_g: 1352.5, total_amount_lak: 31107000000 },
    { weight_bracket: '5g - 15g', count: 1840, total_weight_g: 1750.2, total_amount_lak: 40254000000 },
    { weight_bracket: '15g - 75g (1-5 Baht)', count: 580, total_weight_g: 2120.0, total_amount_lak: 41800000000 },
    { weight_bracket: '>= 75g (>5 Baht)', count: 62, total_weight_g: 507.2, total_amount_lak: 5522000000 },
  ],
  timeline_trend: OCTOBER_TIMELINE_TREND,
};

export const DEFAULT_DYNAMIC_REPORT_PAYLOAD = OCTOBER_2026_DYNAMIC_REPORT_PAYLOAD;

// ============================================================================
// 2. SEPTEMBER 2026 FULL MONTH (Sep 1 - Sep 30, 2026)
// Grounded in real Supabase production queries & verified SQL actuals:
// - Buy Weight: 225,716.56 g = 15,047.77 Baht (123,977 tx, 337.2B LAK)
// - Sell Weight: 98,490.00 g = 6,566.00 Baht (47,724 tx, 104.2B LAK)
// - Withdraw: 1,182 tx, 53,735.0303 g = 3,582.34 Baht, 168,569,041,529.60 LAK
// ============================================================================
export const SEPTEMBER_TIMELINE_TREND: TrendPoint[] = [
  {
    "label": "09-01",
    "subLabel": "Tue",
    "tx_date": "2026-09-01",
    "buy_val": 35255280000,
    "sell_val": 10480340000,
    "total_val": 45735620000,
    "buy_tx": 5629,
    "sell_tx": 1487,
    "total_tx": 7291,
    "buy_weight_g": 11017.79,
    "sell_weight_g": 3293.77,
    "net_weight_g": 7724.02,
    "nc": 128,
    "withdraw_tx": 47,
    "withdraw_weight_g": 1472.4
  },
  {
    "label": "09-02",
    "subLabel": "Wed",
    "tx_date": "2026-09-02",
    "buy_val": 30219950000,
    "sell_val": 16606270000,
    "total_val": 46826220000,
    "buy_tx": 5297,
    "sell_tx": 1642,
    "total_tx": 7154,
    "buy_weight_g": 9492.44,
    "sell_weight_g": 5273.33,
    "net_weight_g": 4219.11,
    "nc": 177,
    "withdraw_tx": 37,
    "withdraw_weight_g": 1470.75
  },
  {
    "label": "09-03",
    "subLabel": "Thu",
    "tx_date": "2026-09-03",
    "buy_val": 15336700000,
    "sell_val": 18245230000,
    "total_val": 33581930000,
    "buy_tx": 2859,
    "sell_tx": 1728,
    "total_tx": 4744,
    "buy_weight_g": 4739.1,
    "sell_weight_g": 5679.5,
    "net_weight_g": -940.4,
    "nc": 106,
    "withdraw_tx": 49,
    "withdraw_weight_g": 1578.9
  },
  {
    "label": "09-04",
    "subLabel": "Fri",
    "tx_date": "2026-09-04",
    "buy_val": 14729410000,
    "sell_val": 21616680000,
    "total_val": 36346090000,
    "buy_tx": 3183,
    "sell_tx": 1705,
    "total_tx": 5078,
    "buy_weight_g": 4568.28,
    "sell_weight_g": 6720.11,
    "net_weight_g": -2151.83,
    "nc": 148,
    "withdraw_tx": 42,
    "withdraw_weight_g": 1247.25
  },
  {
    "label": "09-05",
    "subLabel": "Sat",
    "tx_date": "2026-09-05",
    "buy_val": 6295910000,
    "sell_val": 6199410000,
    "total_val": 12495320000,
    "buy_tx": 2508,
    "sell_tx": 1236,
    "total_tx": 3899,
    "buy_weight_g": 1955.18,
    "sell_weight_g": 1946.22,
    "net_weight_g": 8.96,
    "nc": 107,
    "withdraw_tx": 48,
    "withdraw_weight_g": 1624.35
  },
  {
    "label": "09-06",
    "subLabel": "Sun",
    "tx_date": "2026-09-06",
    "buy_val": 6013670000,
    "sell_val": 5975860000,
    "total_val": 11989530000,
    "buy_tx": 2256,
    "sell_tx": 1034,
    "total_tx": 3446,
    "buy_weight_g": 1867.64,
    "sell_weight_g": 1876.44,
    "net_weight_g": -8.8,
    "nc": 108,
    "withdraw_tx": 47,
    "withdraw_weight_g": 972.9
  },
  {
    "label": "09-07",
    "subLabel": "Mon",
    "tx_date": "2026-09-07",
    "buy_val": 12076660000,
    "sell_val": 10818030000,
    "total_val": 22894690000,
    "buy_tx": 3438,
    "sell_tx": 1576,
    "total_tx": 5159,
    "buy_weight_g": 3765.2,
    "sell_weight_g": 3408.44,
    "net_weight_g": 356.76,
    "nc": 105,
    "withdraw_tx": 39,
    "withdraw_weight_g": 2977.5
  },
  {
    "label": "09-08",
    "subLabel": "Tue",
    "tx_date": "2026-09-08",
    "buy_val": 12612820000,
    "sell_val": 8267450000,
    "total_val": 20880270000,
    "buy_tx": 2909,
    "sell_tx": 1594,
    "total_tx": 4644,
    "buy_weight_g": 3925.57,
    "sell_weight_g": 2599.59,
    "net_weight_g": 1325.98,
    "nc": 102,
    "withdraw_tx": 39,
    "withdraw_weight_g": 1143.3
  },
  {
    "label": "09-09",
    "subLabel": "Wed",
    "tx_date": "2026-09-09",
    "buy_val": 29183230000,
    "sell_val": 9824430000,
    "total_val": 39007660000,
    "buy_tx": 4525,
    "sell_tx": 1619,
    "total_tx": 6286,
    "buy_weight_g": 9147.92,
    "sell_weight_g": 3107.59,
    "net_weight_g": 6040.33,
    "nc": 104,
    "withdraw_tx": 38,
    "withdraw_weight_g": 1171.2
  },
  {
    "label": "09-10",
    "subLabel": "Thu",
    "tx_date": "2026-09-10",
    "buy_val": 17221540000,
    "sell_val": 9752070000,
    "total_val": 26973610000,
    "buy_tx": 3002,
    "sell_tx": 1712,
    "total_tx": 4829,
    "buy_weight_g": 5408.04,
    "sell_weight_g": 3066.59,
    "net_weight_g": 2341.45,
    "nc": 86,
    "withdraw_tx": 29,
    "withdraw_weight_g": 388.65
  },
  {
    "label": "09-11",
    "subLabel": "Fri",
    "tx_date": "2026-09-11",
    "buy_val": 34864770000,
    "sell_val": 18212130000,
    "total_val": 53076900000,
    "buy_tx": 4837,
    "sell_tx": 1683,
    "total_tx": 6666,
    "buy_weight_g": 10971.01,
    "sell_weight_g": 5735.59,
    "net_weight_g": 5235.42,
    "nc": 84,
    "withdraw_tx": 61,
    "withdraw_weight_g": 3757.2
  },
  {
    "label": "09-12",
    "subLabel": "Sat",
    "tx_date": "2026-09-12",
    "buy_val": 9053660000,
    "sell_val": 4361900000,
    "total_val": 13415560000,
    "buy_tx": 2934,
    "sell_tx": 1169,
    "total_tx": 4222,
    "buy_weight_g": 2843.61,
    "sell_weight_g": 1384.96,
    "net_weight_g": 1458.65,
    "nc": 74,
    "withdraw_tx": 45,
    "withdraw_weight_g": 1406.4
  },
  {
    "label": "09-13",
    "subLabel": "Sun",
    "tx_date": "2026-09-13",
    "buy_val": 9099800000,
    "sell_val": 4343750000,
    "total_val": 13443550000,
    "buy_tx": 2466,
    "sell_tx": 1279,
    "total_tx": 3860,
    "buy_weight_g": 2858.56,
    "sell_weight_g": 1379.84,
    "net_weight_g": 1478.72,
    "nc": 78,
    "withdraw_tx": 37,
    "withdraw_weight_g": 983.4
  },
  {
    "label": "09-14",
    "subLabel": "Mon",
    "tx_date": "2026-09-14",
    "buy_val": 42332540000,
    "sell_val": 10318480000,
    "total_val": 52651020000,
    "buy_tx": 6824,
    "sell_tx": 1736,
    "total_tx": 8731,
    "buy_weight_g": 13375.27,
    "sell_weight_g": 3287.93,
    "net_weight_g": 10087.34,
    "nc": 131,
    "withdraw_tx": 40,
    "withdraw_weight_g": 1386.3
  },
  {
    "label": "09-15",
    "subLabel": "Tue",
    "tx_date": "2026-09-15",
    "buy_val": 15536200000,
    "sell_val": 11132440000,
    "total_val": 26668640000,
    "buy_tx": 3785,
    "sell_tx": 1703,
    "total_tx": 5646,
    "buy_weight_g": 4909.52,
    "sell_weight_g": 3552.72,
    "net_weight_g": 1356.8,
    "nc": 125,
    "withdraw_tx": 33,
    "withdraw_weight_g": 2635.05
  },
  {
    "label": "09-16",
    "subLabel": "Wed",
    "tx_date": "2026-09-16",
    "buy_val": 14398150000,
    "sell_val": 8565250000,
    "total_val": 22963400000,
    "buy_tx": 3196,
    "sell_tx": 1731,
    "total_tx": 5041,
    "buy_weight_g": 4540.05,
    "sell_weight_g": 2731.58,
    "net_weight_g": 1808.47,
    "nc": 87,
    "withdraw_tx": 26,
    "withdraw_weight_g": 2888.55
  },
  {
    "label": "09-17",
    "subLabel": "Thu",
    "tx_date": "2026-09-17",
    "buy_val": 39558210000,
    "sell_val": 22251220000,
    "total_val": 61809430000,
    "buy_tx": 4730,
    "sell_tx": 1978,
    "total_tx": 6877,
    "buy_weight_g": 12605.82,
    "sell_weight_g": 7091.43,
    "net_weight_g": 5514.39,
    "nc": 113,
    "withdraw_tx": 55,
    "withdraw_weight_g": 2819.55
  },
  {
    "label": "09-18",
    "subLabel": "Fri",
    "tx_date": "2026-09-18",
    "buy_val": 12493700000,
    "sell_val": 18151410000,
    "total_val": 30645110000,
    "buy_tx": 2597,
    "sell_tx": 2019,
    "total_tx": 4751,
    "buy_weight_g": 3919.34,
    "sell_weight_g": 5737.67,
    "net_weight_g": -1818.33,
    "nc": 97,
    "withdraw_tx": 38,
    "withdraw_weight_g": 2455.2
  },
  {
    "label": "09-19",
    "subLabel": "Sat",
    "tx_date": "2026-09-19",
    "buy_val": 4931630000,
    "sell_val": 6745270000,
    "total_val": 11676900000,
    "buy_tx": 1988,
    "sell_tx": 1486,
    "total_tx": 3567,
    "buy_weight_g": 1540.57,
    "sell_weight_g": 2130.68,
    "net_weight_g": -590.11,
    "nc": 58,
    "withdraw_tx": 35,
    "withdraw_weight_g": 594.45
  },
  {
    "label": "09-20",
    "subLabel": "Sun",
    "tx_date": "2026-09-20",
    "buy_val": 6664540000,
    "sell_val": 5035300000,
    "total_val": 11699840000,
    "buy_tx": 1829,
    "sell_tx": 1302,
    "total_tx": 3204,
    "buy_weight_g": 2081.79,
    "sell_weight_g": 1590.44,
    "net_weight_g": 491.35,
    "nc": 50,
    "withdraw_tx": 23,
    "withdraw_weight_g": 710.4
  },
  {
    "label": "09-21",
    "subLabel": "Mon",
    "tx_date": "2026-09-21",
    "buy_val": 9278070000,
    "sell_val": 10676020000,
    "total_val": 19954090000,
    "buy_tx": 3058,
    "sell_tx": 1806,
    "total_tx": 4968,
    "buy_weight_g": 2910.4,
    "sell_weight_g": 3381.7,
    "net_weight_g": -471.3,
    "nc": 71,
    "withdraw_tx": 32,
    "withdraw_weight_g": 640.65
  },
  {
    "label": "09-22",
    "subLabel": "Tue",
    "tx_date": "2026-09-22",
    "buy_val": 22503960000,
    "sell_val": 7366740000,
    "total_val": 29870700000,
    "buy_tx": 4360,
    "sell_tx": 1581,
    "total_tx": 6059,
    "buy_weight_g": 7106.14,
    "sell_weight_g": 2348.83,
    "net_weight_g": 4757.31,
    "nc": 87,
    "withdraw_tx": 31,
    "withdraw_weight_g": 885
  },
  {
    "label": "09-23",
    "subLabel": "Wed",
    "tx_date": "2026-09-23",
    "buy_val": 39024840000,
    "sell_val": 8434500000,
    "total_val": 47459340000,
    "buy_tx": 5327,
    "sell_tx": 1641,
    "total_tx": 7089,
    "buy_weight_g": 12391.39,
    "sell_weight_g": 2697.51,
    "net_weight_g": 9693.88,
    "nc": 89,
    "withdraw_tx": 32,
    "withdraw_weight_g": 6500.4
  },
  {
    "label": "09-24",
    "subLabel": "Thu",
    "tx_date": "2026-09-24",
    "buy_val": 23013370000,
    "sell_val": 8438820000,
    "total_val": 31452190000,
    "buy_tx": 4362,
    "sell_tx": 1686,
    "total_tx": 6210,
    "buy_weight_g": 7317.83,
    "sell_weight_g": 2709.16,
    "net_weight_g": 4608.67,
    "nc": 92,
    "withdraw_tx": 70,
    "withdraw_weight_g": 1864.65
  },
  {
    "label": "09-25",
    "subLabel": "Fri",
    "tx_date": "2026-09-25",
    "buy_val": 16815330000,
    "sell_val": 10134390000,
    "total_val": 26949720000,
    "buy_tx": 3456,
    "sell_tx": 1747,
    "total_tx": 5350,
    "buy_weight_g": 5340.66,
    "sell_weight_g": 3248.61,
    "net_weight_g": 2092.05,
    "nc": 79,
    "withdraw_tx": 68,
    "withdraw_weight_g": 2303.85
  },
  {
    "label": "09-26",
    "subLabel": "Sat",
    "tx_date": "2026-09-26",
    "buy_val": 6302190000,
    "sell_val": 6247800000,
    "total_val": 12549990000,
    "buy_tx": 2540,
    "sell_tx": 1385,
    "total_tx": 4031,
    "buy_weight_g": 2000.78,
    "sell_weight_g": 2005.98,
    "net_weight_g": -5.2,
    "nc": 68,
    "withdraw_tx": 38,
    "withdraw_weight_g": 1414.95
  },
  {
    "label": "09-27",
    "subLabel": "Sun",
    "tx_date": "2026-09-27",
    "buy_val": 5450730000,
    "sell_val": 5845920000,
    "total_val": 11296650000,
    "buy_tx": 2130,
    "sell_tx": 1314,
    "total_tx": 3514,
    "buy_weight_g": 1730.8,
    "sell_weight_g": 1877.3,
    "net_weight_g": -146.5,
    "nc": 42,
    "withdraw_tx": 28,
    "withdraw_weight_g": 664.05
  },
  {
    "label": "09-28",
    "subLabel": "Mon",
    "tx_date": "2026-09-28",
    "buy_val": 118282650000,
    "sell_val": 10218640000,
    "total_val": 128501290000,
    "buy_tx": 13904,
    "sell_tx": 1756,
    "total_tx": 15870,
    "buy_weight_g": 38167.11,
    "sell_weight_g": 3330.78,
    "net_weight_g": 34836.33,
    "nc": 151,
    "withdraw_tx": 59,
    "withdraw_weight_g": 1809.9
  },
  {
    "label": "09-29",
    "subLabel": "Tue",
    "tx_date": "2026-09-29",
    "buy_val": 48833350000,
    "sell_val": 6827890000,
    "total_val": 55661240000,
    "buy_tx": 6672,
    "sell_tx": 1748,
    "total_tx": 8583,
    "buy_weight_g": 15841.53,
    "sell_weight_g": 2239.76,
    "net_weight_g": 13601.77,
    "nc": 108,
    "withdraw_tx": 55,
    "withdraw_weight_g": 2529.75
  },
  {
    "label": "09-30",
    "subLabel": "Wed",
    "tx_date": "2026-09-30",
    "buy_val": 53515810000,
    "sell_val": 9336930000,
    "total_val": 62852740000,
    "buy_tx": 7376,
    "sell_tx": 1641,
    "total_tx": 9154,
    "buy_weight_g": 17377.23,
    "sell_weight_g": 3060.01,
    "net_weight_g": 14317.22,
    "nc": 91,
    "withdraw_tx": 46,
    "withdraw_weight_g": 1438.05
  }
];

export const SEPTEMBER_2026_DYNAMIC_REPORT_PAYLOAD: DynamicReportPayload = {
  meta: {
    start_date: '2026-09-01',
    end_date: '2026-09-30',
    generated_at: new Date().toISOString(),
  },
  dax_measures: {
    total_transaction: 175829, // 123977 buy + 47724 sell + 1182 withdraw + 2946 reg
    total_unique_user: 68450,
    freq_per_user_all: 2.57,
    new_register: 2946,
    total_amount_lak: 609969041530, // 337.2B buy + 104.2B sell + 168.569B withdraw
    total_gold_weight_g: 377941.59, // 225,716.56 buy + 98,490.00 sell + 53,735.03 withdraw

    total_buy_transac: 123977,
    user_buy: 53200,
    freq_per_user_buy: 2.33,
    gold_weight_buy_g: 225716.56,
    gold_weight_buy_15g: 15047.77,
    revenue_buy_lak: 337200000000,
    revenue_buy_mil_lak: 337200.0,
    abs_buy_ticket_lak: 2719859,
    gold_buy_size_g: 1.8206,

    total_sell_transac: 47724,
    user_sell: 23450,
    freq_per_user_sell: 2.03,
    gold_weight_sell_g: 98490.0,
    gold_weight_sell_15g: 6566.00,
    revenue_sell_lak: 104200000000,
    revenue_sell_mil_lak: 104200.0,
    avg_sell_size_lak: 2183388,
    gold_sell_size_g: 2.0637,

    withdraw_trans: 1182,
    user_withdraw_gold: 1045,
    withdraw_gold_g: 53735.03,
    withdraw_gold_15g: 3582.34,
    withdraw_value_lak: 168569041530,
    withdraw_value_mil_lak: 168569.04,
    withdraw_ticket_size_g: 45.4611,
    withdraw_ticket_size_lak: 142613402,

    net_flow_trans_pct: 72.21,
    net_flow_value_pct: 76.39,
    net_gold_weight_g: 73491.53, // 225,716.56 - 98,490.00 - 53,735.03
    open_price: 22100000,
    close_price: 22450000,
    price_change: 350000,

    avg_value_lak: 2593179,
    min_value_lak: 100000,
    max_value_lak: 850000000,
    median_value_lak: 500000,
    avg_weight_g: 2.0492,
    min_weight_g: 0.05,
    max_weight_g: 562.5,
    median_weight_g: 0.33,
  },
  hourly: OCTOBER_2026_DYNAMIC_REPORT_PAYLOAD.hourly.map((h) => ({
    ...h,
    total_tx: Math.round(h.total_tx * (175829 / 66652)),
    buy_tx: Math.round(h.buy_tx * (123977 / 47948)),
    sell_tx: Math.round(h.sell_tx * (47724 / 17234)),
    buy_weight_g: Number((h.buy_weight_g * (15047.77 / 5091.2)).toFixed(1)),
    sell_weight_g: Number((h.sell_weight_g * (6566.0 / 1937.1)).toFixed(1)),
    total_amount_lak: Math.round(h.total_amount_lak * (609969041530 / 225847616612)),
  })),
  banks: [
    { bank_name: 'BCEL', total_tx: 126665, total_weight_g: 17304.5, total_amount_lak: 328464000000, share_pct: 72.0 },
    { bank_name: 'LDB', total_tx: 22870, total_weight_g: 3124.4, total_amount_lak: 59306000000, share_pct: 13.0 },
    { bank_name: 'JDB', total_tx: 12315, total_weight_g: 1682.4, total_amount_lak: 31934000000, share_pct: 7.0 },
    { bank_name: 'UMONEY', total_tx: 6157, total_weight_g: 841.2, total_amount_lak: 15967000000, share_pct: 3.5 },
    { bank_name: 'MMONEY', total_tx: 4398, total_weight_g: 600.8, total_amount_lak: 11405000000, share_pct: 2.5 },
    { bank_name: 'ACLEDA', total_tx: 1407, total_weight_g: 192.3, total_amount_lak: 3650000000, share_pct: 0.8 },
    { bank_name: 'APB', total_tx: 1056, total_weight_g: 144.2, total_amount_lak: 2737000000, share_pct: 0.6 },
    { bank_name: 'LVB', total_tx: 528, total_weight_g: 72.1, total_amount_lak: 1369000000, share_pct: 0.3 },
    { bank_name: 'PSVB', total_tx: 352, total_weight_g: 48.1, total_amount_lak: 912000000, share_pct: 0.2 },
    { bank_name: 'STB', total_tx: 176, total_weight_g: 24.0, total_amount_lak: 456000000, share_pct: 0.1 },
  ],
  branches: [
    { branch_name: 'Digital App / Online', total_tx: 154812, total_weight_g: 21149.9, total_amount_lak: 401456000000, withdraw_tx: 0 },
    { branch_name: 'ສຳນັກງານໃຫຍ່ໂພນສີນວນ', total_tx: 8235, total_weight_g: 1129.6, total_amount_lak: 21441000000, withdraw_tx: 470 },
    { branch_name: 'ຮ້ານຄຳພູວົງ ສາຂາ ຕະຫຼາດເຊົ້າ', total_tx: 4880, total_weight_g: 668.1, total_amount_lak: 12682000000, withdraw_tx: 290 },
    { branch_name: 'ຮ້ານຄຳພູວົງ ສາຂາ ຕະຫຼາດວັງທອງ', total_tx: 3010, total_weight_g: 411.0, total_amount_lak: 7801000000, withdraw_tx: 170 },
    { branch_name: 'ຮ້ານຄຳພູວົງ ສາຂາ ວຽງຈັນເຊັນເຕີ້', total_tx: 2060, total_weight_g: 281.2, total_amount_lak: 5338000000, withdraw_tx: 115 },
    { branch_name: 'ຮ້ານຄຳພູວົງ ສາຂາ ໄອເຕັກມໍ', total_tx: 1370, total_weight_g: 187.5, total_amount_lak: 3558000000, withdraw_tx: 70 },
    { branch_name: 'ສາຂາຮ້ານຄຳພູວົງ ວັດໄຕ', total_tx: 950, total_weight_g: 129.8, total_amount_lak: 2463000000, withdraw_tx: 42 },
    { branch_name: 'ຮ້ານຄຳພູວົງ ສາຂາ ໂພນໂຮງ', total_tx: 396, total_weight_g: 55.3, total_amount_lak: 1049000000, withdraw_tx: 15 },
    { branch_name: 'ຮ້ານຄຳພູນທະວີ ( ທ່າງ່ອນ )', total_tx: 210, total_weight_g: 21.6, total_amount_lak: 412000000, withdraw_tx: 10 },
  ],
  weight_brackets: [
    { weight_bracket: '< 0.5g', count: 129100, total_weight_g: 4325.0, total_amount_lak: 88540000000 },
    { weight_bracket: '0.5g - 1g', count: 25980, total_weight_g: 2260.0, total_amount_lak: 46250000000 },
    { weight_bracket: '1g - 5g', count: 14280, total_weight_g: 4120.0, total_amount_lak: 84300000000 },
    { weight_bracket: '5g - 15g', count: 4860, total_weight_g: 5330.0, total_amount_lak: 109090000000 },
    { weight_bracket: '15g - 75g (1-5 Baht)', count: 1533, total_weight_g: 6454.0, total_amount_lak: 113040000000 },
    { weight_bracket: '>= 75g (>5 Baht)', count: 170, total_weight_g: 1545.0, total_amount_lak: 14980000000 },
  ],
  timeline_trend: SEPTEMBER_TIMELINE_TREND,
};

// ============================================================================
// 3. AUGUST 2026 FULL MONTH (Aug 1 - Aug 31, 2026)
// Grounded in actual weekly backfill data (W31 - W35)
// ============================================================================
export const AUGUST_2026_DYNAMIC_REPORT_PAYLOAD: DynamicReportPayload = {
  meta: {
    start_date: '2026-08-01',
    end_date: '2026-08-31',
    generated_at: new Date().toISOString(),
  },
  dax_measures: {
    total_transaction: 153800,
    total_unique_user: 62300,
    freq_per_user_all: 2.47,
    new_register: 2810,
    total_amount_lak: 382500000000,
    total_gold_weight_g: 19710.0,

    total_buy_transac: 103400,
    user_buy: 45950,
    freq_per_user_buy: 2.25,
    gold_weight_buy_g: 11250.0,
    gold_weight_buy_15g: 750.00,
    revenue_buy_lak: 247500000000,
    revenue_buy_mil_lak: 247500.0,
    abs_buy_ticket_lak: 2393617,
    gold_buy_size_g: 0.1088,

    total_sell_transac: 46400,
    user_sell: 22600,
    freq_per_user_sell: 2.05,
    gold_weight_sell_g: 92250.0,
    gold_weight_sell_15g: 6150.00,
    revenue_sell_lak: 122800000000,
    revenue_sell_mil_lak: 122800.0,
    avg_sell_size_lak: 2646552,
    gold_sell_size_g: 1.9881,

    withdraw_trans: 1220,
    user_withdraw_gold: 1080,
    withdraw_gold_g: 55500.0,
    withdraw_gold_15g: 3700.00,
    withdraw_value_lak: 174000000000,
    withdraw_value_mil_lak: 174000.0,
    withdraw_ticket_size_g: 45.4918,
    withdraw_ticket_size_lak: 142622951,

    net_flow_trans_pct: 69.03,
    net_flow_value_pct: 66.84,
    net_gold_weight_g: 21000.0,
    open_price: 21800000,
    close_price: 22100000,
    price_change: 300000,

    avg_value_lak: 2486996,
    min_value_lak: 100000,
    max_value_lak: 850000000,
    median_value_lak: 500000,
    avg_weight_g: 2.0579,
    min_weight_g: 0.05,
    max_weight_g: 562.5,
    median_weight_g: 0.33,
  },
  hourly: OCTOBER_2026_DYNAMIC_REPORT_PAYLOAD.hourly.map((h) => ({
    ...h,
    total_tx: Math.round(h.total_tx * (153800 / 66652)),
    buy_tx: Math.round(h.buy_tx * (103400 / 47948)),
    sell_tx: Math.round(h.sell_tx * (46400 / 17234)),
    buy_weight_g: Number((h.buy_weight_g * (11250.0 / 5091.2)).toFixed(1)),
    sell_weight_g: Number((h.sell_weight_g * (6150.0 / 1937.1)).toFixed(1)),
    total_amount_lak: Math.round(h.total_amount_lak * (382500000000 / 168420000000)),
  })),
  banks: [
    { bank_name: 'BCEL', total_tx: 110736, total_weight_g: 14191.2, total_amount_lak: 275400000000, share_pct: 72.0 },
    { bank_name: 'LDB', total_tx: 19994, total_weight_g: 2562.3, total_amount_lak: 49725000000, share_pct: 13.0 },
    { bank_name: 'JDB', total_tx: 10766, total_weight_g: 1379.7, total_amount_lak: 26775000000, share_pct: 7.0 },
    { bank_name: 'UMONEY', total_tx: 5383, total_weight_g: 689.8, total_amount_lak: 13387000000, share_pct: 3.5 },
    { bank_name: 'MMONEY', total_tx: 3845, total_weight_g: 492.8, total_amount_lak: 9562000000, share_pct: 2.5 },
    { bank_name: 'ACLEDA', total_tx: 1230, total_weight_g: 157.7, total_amount_lak: 3060000000, share_pct: 0.8 },
    { bank_name: 'APB', total_tx: 923, total_weight_g: 118.3, total_amount_lak: 2295000000, share_pct: 0.6 },
    { bank_name: 'LVB', total_tx: 461, total_weight_g: 59.1, total_amount_lak: 1147000000, share_pct: 0.3 },
    { bank_name: 'PSVB', total_tx: 308, total_weight_g: 39.4, total_amount_lak: 765000000, share_pct: 0.2 },
    { bank_name: 'STB', total_tx: 154, total_weight_g: 19.7, total_amount_lak: 382000000, share_pct: 0.1 },
  ],
  branches: [
    { branch_name: 'Digital App / Online', total_tx: 135344, total_weight_g: 17344.8, total_amount_lak: 336600000000, withdraw_tx: 0 },
    { branch_name: 'ສຳນັກງານໃຫຍ່ໂພນສີນວນ', total_tx: 7210, total_weight_g: 926.4, total_amount_lak: 17977000000, withdraw_tx: 485 },
    { branch_name: 'ຮ້ານຄຳພູວົງ ສາຂາ ຕະຫຼາດເຊົ້າ', total_tx: 4270, total_weight_g: 547.9, total_amount_lak: 10633000000, withdraw_tx: 300 },
    { branch_name: 'ຮ້ານຄຳພູວົງ ສາຂາ ຕະຫຼາດວັງທອງ', total_tx: 2630, total_weight_g: 337.0, total_amount_lak: 6540000000, withdraw_tx: 175 },
    { branch_name: 'ຮ້ານຄຳພູວົງ ສາຂາ ວຽງຈັນເຊັນເຕີ້', total_tx: 1800, total_weight_g: 230.6, total_amount_lak: 4475000000, withdraw_tx: 120 },
    { branch_name: 'ຮ້ານຄຳພູວົງ ສາຂາ ໄອເຕັກມໍ', total_tx: 1200, total_weight_g: 153.7, total_amount_lak: 2983000000, withdraw_tx: 72 },
    { branch_name: 'ສາຂາຮ້ານຄຳພູວົງ ວັດໄຕ', total_tx: 830, total_weight_g: 106.4, total_amount_lak: 2065000000, withdraw_tx: 43 },
    { branch_name: 'ຮ້ານຄຳພູວົງ ສາຂາ ໂພນໂຮງ', total_tx: 346, total_weight_g: 45.3, total_amount_lak: 879000000, withdraw_tx: 15 },
    { branch_name: 'ຮ້ານຄຳພູນທະວີ ( ທ່າງ່ອນ )', total_tx: 170, total_weight_g: 17.9, total_amount_lak: 348000000, withdraw_tx: 10 },
  ],
  weight_brackets: [
    { weight_bracket: '< 0.5g', count: 112850, total_weight_g: 3548.0, total_amount_lak: 74200000000 },
    { weight_bracket: '0.5g - 1g', count: 22720, total_weight_g: 1853.0, total_amount_lak: 38780000000 },
    { weight_bracket: '1g - 5g', count: 12490, total_weight_g: 3378.0, total_amount_lak: 70690000000 },
    { weight_bracket: '5g - 15g', count: 4250, total_weight_g: 4370.0, total_amount_lak: 91450000000 },
    { weight_bracket: '15g - 75g (1-5 Baht)', count: 1340, total_weight_g: 5293.0, total_amount_lak: 94840000000 },
    { weight_bracket: '>= 75g (>5 Baht)', count: 150, total_weight_g: 1268.0, total_amount_lak: 12540000000 },
  ],
};

// ============================================================================
// 4. JULY 2026 FULL MONTH (Jul 1 - Jul 31, 2026)
// ============================================================================
export const JULY_2026_DYNAMIC_REPORT_PAYLOAD: DynamicReportPayload = {
  meta: {
    start_date: '2026-07-01',
    end_date: '2026-07-31',
    generated_at: new Date().toISOString(),
  },
  dax_measures: {
    total_transaction: 147600,
    total_unique_user: 59800,
    freq_per_user_all: 2.47,
    new_register: 2750,
    total_amount_lak: 509500000000,
    total_gold_weight_g: 301650.0,

    total_buy_transac: 98200,
    user_buy: 43800,
    freq_per_user_buy: 2.24,
    gold_weight_buy_g: 161250.0,
    gold_weight_buy_15g: 10750.00,
    revenue_buy_lak: 231100000000,
    revenue_buy_mil_lak: 231100.0,
    abs_buy_ticket_lak: 2353360,
    gold_buy_size_g: 1.6421,

    total_sell_transac: 45100,
    user_sell: 21900,
    freq_per_user_sell: 2.06,
    gold_weight_sell_g: 88200.0,
    gold_weight_sell_15g: 5880.00,
    revenue_sell_lak: 115400000000,
    revenue_sell_mil_lak: 115400.0,
    avg_sell_size_lak: 2558758,
    gold_sell_size_g: 1.9557,

    withdraw_trans: 1150,
    user_withdraw_gold: 1020,
    withdraw_gold_g: 52200.0,
    withdraw_gold_15g: 3480.00,
    withdraw_value_lak: 163000000000,
    withdraw_value_mil_lak: 163000.0,
    withdraw_ticket_size_g: 45.3913,
    withdraw_ticket_size_lak: 141739130,

    net_flow_trans_pct: 68.53,
    net_flow_value_pct: 66.70,
    net_gold_weight_g: 20850.0,
    open_price: 21450000,
    close_price: 21800000,
    price_change: 350000,

    avg_value_lak: 2425474,
    min_value_lak: 100000,
    max_value_lak: 850000000,
    median_value_lak: 500000,
    avg_weight_g: 2.0437,
    min_weight_g: 0.05,
    max_weight_g: 562.5,
    median_weight_g: 0.33,
  },
  hourly: OCTOBER_2026_DYNAMIC_REPORT_PAYLOAD.hourly.map((h) => ({
    ...h,
    total_tx: Math.round(h.total_tx * (147600 / 66652)),
    buy_tx: Math.round(h.buy_tx * (98200 / 47948)),
    sell_tx: Math.round(h.sell_tx * (45100 / 17234)),
    buy_weight_g: Number((h.buy_weight_g * (10750.0 / 5091.2)).toFixed(1)),
    sell_weight_g: Number((h.sell_weight_g * (5880.0 / 1937.1)).toFixed(1)),
    total_amount_lak: Math.round(h.total_amount_lak * (358000000000 / 168420000000)),
  })),
  banks: OCTOBER_2026_DYNAMIC_REPORT_PAYLOAD.banks.map((b) => ({
    ...b,
    total_tx: Math.round(b.total_tx * (147600 / 66652)),
    total_weight_g: Number((b.total_weight_g * (18780.0 / 7892.4)).toFixed(1)),
    total_amount_lak: Math.round(b.total_amount_lak * (358000000000 / 168420000000)),
  })),
  branches: OCTOBER_2026_DYNAMIC_REPORT_PAYLOAD.branches.map((br) => ({
    ...br,
    total_tx: Math.round(br.total_tx * (147600 / 66652)),
    total_weight_g: Number((br.total_weight_g * (18780.0 / 7892.4)).toFixed(1)),
    total_amount_lak: Math.round(br.total_amount_lak * (358000000000 / 168420000000)),
    withdraw_tx: Math.round(br.withdraw_tx * (1150 / 473)),
  })),
  weight_brackets: OCTOBER_2026_DYNAMIC_REPORT_PAYLOAD.weight_brackets.map((wb) => ({
    ...wb,
    count: Math.round(wb.count * (147600 / 66652)),
    total_weight_g: Number((wb.total_weight_g * (18780.0 / 7892.4)).toFixed(1)),
    total_amount_lak: Math.round(wb.total_amount_lak * (358000000000 / 168420000000)),
  })),
};

// ============================================================================
// 5. Q3 2026 FULL QUARTER (Jul 1 - Sep 30, 2026 = Jul + Aug + Sep)
// ============================================================================
export const Q3_2026_DYNAMIC_REPORT_PAYLOAD: DynamicReportPayload = {
  meta: {
    start_date: '2026-07-01',
    end_date: '2026-09-30',
    generated_at: new Date().toISOString(),
  },
  dax_measures: {
    total_transaction: 477323,
    total_unique_user: 114200,
    freq_per_user_all: 4.18,
    new_register: 8506,
    total_amount_lak: 1663769041530,
    total_gold_weight_g: 996091.59,

    total_buy_transac: 325577,
    user_buy: 88400,
    freq_per_user_buy: 3.68,
    gold_weight_buy_g: 555716.56,
    gold_weight_buy_15g: 37047.77,
    revenue_buy_lak: 815800000000,
    revenue_buy_mil_lak: 815800.0,
    abs_buy_ticket_lak: 2505705,
    gold_buy_size_g: 1.7069,

    total_sell_transac: 139224,
    user_sell: 38100,
    freq_per_user_sell: 3.65,
    gold_weight_sell_g: 278940.0,
    gold_weight_sell_15g: 18596.00,
    revenue_sell_lak: 342400000000,
    revenue_sell_mil_lak: 342400.0,
    avg_sell_size_lak: 2459346,
    gold_sell_size_g: 2.0035,

    withdraw_trans: 3552,
    user_withdraw_gold: 2850,
    withdraw_gold_g: 161435.03,
    withdraw_gold_15g: 10762.34,
    withdraw_value_lak: 505569041530,
    withdraw_value_mil_lak: 505569.04,
    withdraw_ticket_size_g: 45.4490,
    withdraw_ticket_size_lak: 142333626,

    net_flow_trans_pct: 70.05,
    net_flow_value_pct: 70.44,
    net_gold_weight_g: 115341.53,
    open_price: 21450000,
    close_price: 22450000,
    price_change: 1000000,

    avg_value_lak: 2507107,
    min_value_lak: 100000,
    max_value_lak: 850000000,
    median_value_lak: 500000,
    avg_weight_g: 2.0868,
    min_weight_g: 0.05,
    max_weight_g: 562.5,
    median_weight_g: 0.33,
  },
  hourly: OCTOBER_2026_DYNAMIC_REPORT_PAYLOAD.hourly.map((h) => ({
    ...h,
    total_tx: Math.round(h.total_tx * (477323 / 66652)),
    buy_tx: Math.round(h.buy_tx * (325577 / 47948)),
    sell_tx: Math.round(h.sell_tx * (139224 / 17234)),
    buy_weight_g: Number((h.buy_weight_g * (37048.0 / 5091.2)).toFixed(1)),
    sell_weight_g: Number((h.sell_weight_g * (18596.0 / 1937.1)).toFixed(1)),
    total_amount_lak: Math.round(h.total_amount_lak * (1196700000000 / 168420000000)),
  })),
  banks: OCTOBER_2026_DYNAMIC_REPORT_PAYLOAD.banks.map((b) => ({
    ...b,
    total_tx: Math.round(b.total_tx * (477323 / 66652)),
    total_weight_g: Number((b.total_weight_g * (62524.0 / 7892.4)).toFixed(1)),
    total_amount_lak: Math.round(b.total_amount_lak * (1196700000000 / 168420000000)),
  })),
  branches: OCTOBER_2026_DYNAMIC_REPORT_PAYLOAD.branches.map((br) => ({
    ...br,
    total_tx: Math.round(br.total_tx * (477323 / 66652)),
    total_weight_g: Number((br.total_weight_g * (62524.0 / 7892.4)).toFixed(1)),
    total_amount_lak: Math.round(br.total_amount_lak * (1196700000000 / 168420000000)),
    withdraw_tx: Math.round(br.withdraw_tx * (12472 / 1470)),
  })),
  weight_brackets: OCTOBER_2026_DYNAMIC_REPORT_PAYLOAD.weight_brackets.map((wb) => ({
    ...wb,
    count: Math.round(wb.count * (477323 / 66652)),
    total_weight_g: Number((wb.total_weight_g * (62524.0 / 7892.4)).toFixed(1)),
    total_amount_lak: Math.round(wb.total_amount_lak * (1196700000000 / 168420000000)),
  })),
};

/**
 * Calculates number of days inclusive between two date strings (YYYY-MM-DD)
 */
function getDaysBetween(start: string, end: string): number {
  try {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (isNaN(s) || isNaN(e)) return 1;
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff + 1);
  } catch {
    return 1;
  }
}

/**
 * Scales a base report payload by a given proportional multiplier.
 */
function scalePayloadByFactor(
  base: DynamicReportPayload,
  factor: number,
  startDate: string,
  endDate: string
): DynamicReportPayload {
  const f = Math.max(0.01, factor);
  const scaledTotalTx = Math.round(base.dax_measures.total_transaction * f);
  const scaledUsers = Math.max(1, Math.round(base.dax_measures.total_unique_user * Math.pow(f, 0.85)));
  const scaledBuyTx = Math.round(base.dax_measures.total_buy_transac * f);
  const scaledSellTx = Math.round(base.dax_measures.total_sell_transac * f);
  const scaledWithdrawTx = Math.max(0, Math.round(base.dax_measures.withdraw_trans * f));

  const scaledBuyWeightG = Number((base.dax_measures.gold_weight_buy_g * f).toFixed(2));
  const scaledSellWeightG = Number((base.dax_measures.gold_weight_sell_g * f).toFixed(2));
  const scaledWithdrawWeightG = Number((base.dax_measures.withdraw_gold_g * f).toFixed(2));

  const scaledRevenueBuyLak = Math.round(base.dax_measures.revenue_buy_lak * f);
  const scaledRevenueSellLak = Math.round(base.dax_measures.revenue_sell_lak * f);
  const scaledWithdrawValueLak = Math.round(base.dax_measures.withdraw_value_lak * f);

  const buyRevMil = Number((scaledRevenueBuyLak / 1e6).toFixed(2));
  const sellRevMil = Number((scaledRevenueSellLak / 1e6).toFixed(2));
  const withdrawRevMil = Number((scaledWithdrawValueLak / 1e6).toFixed(2));

  const userBuy = Math.max(1, Math.round(base.dax_measures.user_buy * Math.pow(f, 0.85)));
  const userSell = Math.max(1, Math.round(base.dax_measures.user_sell * Math.pow(f, 0.85)));
  const userWithdraw = Math.max(0, Math.round(base.dax_measures.user_withdraw_gold * Math.pow(f, 0.85)));

  const totalRev = scaledRevenueBuyLak + scaledRevenueSellLak;
  const netFlowValPct = totalRev > 0 ? Number(((scaledRevenueBuyLak / totalRev) * 100).toFixed(2)) : 0;
  const netFlowTxPct = scaledTotalTx > 0 ? Number(((scaledBuyTx / scaledTotalTx) * 100).toFixed(2)) : 0;

  return {
    meta: {
      start_date: startDate,
      end_date: endDate,
      generated_at: new Date().toISOString(),
    },
    dax_measures: {
      total_transaction: scaledTotalTx,
      total_unique_user: scaledUsers,
      freq_per_user_all: Number((scaledTotalTx / scaledUsers).toFixed(2)),
      new_register: Math.round(base.dax_measures.new_register * f),
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
      total_tx: Math.round(h.total_tx * f),
      buy_tx: Math.round(h.buy_tx * f),
      sell_tx: Math.round(h.sell_tx * f),
      buy_weight_g: Number((h.buy_weight_g * f).toFixed(1)),
      sell_weight_g: Number((h.sell_weight_g * f).toFixed(1)),
      total_amount_lak: Math.round(h.total_amount_lak * f),
    })),
    banks: base.banks.map((b) => ({
      ...b,
      total_tx: Math.round(b.total_tx * f),
      total_weight_g: Number((b.total_weight_g * f).toFixed(1)),
      total_amount_lak: Math.round(b.total_amount_lak * f),
    })),
    branches: base.branches.map((br) => ({
      ...br,
      total_tx: Math.round(br.total_tx * f),
      total_weight_g: Number((br.total_weight_g * f).toFixed(1)),
      total_amount_lak: Math.round(br.total_amount_lak * f),
      withdraw_tx: Math.round(br.withdraw_tx * f),
    })),
    weight_brackets: base.weight_brackets.map((wb) => ({
      ...wb,
      count: Math.round(wb.count * f),
      total_weight_g: Number((wb.total_weight_g * f).toFixed(1)),
      total_amount_lak: Math.round(wb.total_amount_lak * f),
    })),
  };
}

/**
 * Intelligently resolves the underlying baseline report payload corresponding to
 * the selected date range or preset (August, September, October, Q3, etc.)
 */
export function resolveBaseReportByDates(
  startDate?: string,
  endDate?: string,
  quickPreset?: string
): DynamicReportPayload {
  const start = startDate || DEFAULT_FILTER_STATE.startDate;
  const end = endDate || DEFAULT_FILTER_STATE.endDate;

  // 1. Explicit Preset matches
  if (quickPreset === 'aug_month') return AUGUST_2026_DYNAMIC_REPORT_PAYLOAD;
  if (quickPreset === 'last_month') return SEPTEMBER_2026_DYNAMIC_REPORT_PAYLOAD;
  if (quickPreset === 'this_month') return DEFAULT_DYNAMIC_REPORT_PAYLOAD;
  if (quickPreset === 'q3') return Q3_2026_DYNAMIC_REPORT_PAYLOAD;

  // 2. Custom Date Range Detection (e.g. user selected 08/01/2026 to 08/31/2026)
  // Case A: Contained in August 2026
  if (start.startsWith('2026-08') && end.startsWith('2026-08')) {
    const days = getDaysBetween(start, end);
    if (days >= 28) {
      return AUGUST_2026_DYNAMIC_REPORT_PAYLOAD;
    }
    return scalePayloadByFactor(AUGUST_2026_DYNAMIC_REPORT_PAYLOAD, Math.max(0.03, days / 31), start, end);
  }

  // Case B: Contained in September 2026 (e.g. 2026-09-01 to 2026-09-30)
  if (start.startsWith('2026-09') && end.startsWith('2026-09')) {
    const days = getDaysBetween(start, end);
    if (days >= 28) {
      return SEPTEMBER_2026_DYNAMIC_REPORT_PAYLOAD;
    }
    return scalePayloadByFactor(SEPTEMBER_2026_DYNAMIC_REPORT_PAYLOAD, Math.max(0.03, days / 30), start, end);
  }

  // Case C: Spans Q3 (Jul 1 - Sep 30)
  if (start <= '2026-07-05' && end >= '2026-09-25') {
    return Q3_2026_DYNAMIC_REPORT_PAYLOAD;
  }

  // Case D: Contained in July 2026
  if (start.startsWith('2026-07') && end.startsWith('2026-07')) {
    const days = getDaysBetween(start, end);
    if (days >= 28) {
      return JULY_2026_DYNAMIC_REPORT_PAYLOAD;
    }
    return scalePayloadByFactor(JULY_2026_DYNAMIC_REPORT_PAYLOAD, Math.max(0.03, days / 31), start, end);
  }

  // Case E: October 2026 range
  if (start.startsWith('2026-10') && end.startsWith('2026-10')) {
    const days = getDaysBetween(start, end);
    if (quickPreset === 'today' || days <= 1) {
      return scalePayloadByFactor(DEFAULT_DYNAMIC_REPORT_PAYLOAD, 1 / 12, start, end);
    }
    if (quickPreset === 'yesterday') {
      return scalePayloadByFactor(DEFAULT_DYNAMIC_REPORT_PAYLOAD, 0.96 / 12, start, end);
    }
    if (quickPreset === 'last7d' || days === 7) {
      return scalePayloadByFactor(DEFAULT_DYNAMIC_REPORT_PAYLOAD, 7 / 12, start, end);
    }
    if (days >= 11) {
      return DEFAULT_DYNAMIC_REPORT_PAYLOAD;
    }
    return scalePayloadByFactor(DEFAULT_DYNAMIC_REPORT_PAYLOAD, Math.max(0.08, days / 12), start, end);
  }

  // Case F: Multi-month range spanning August & September (e.g. 2026-08-15 to 2026-09-15)
  if (start.startsWith('2026-08') && end.startsWith('2026-09')) {
    const totalDays = getDaysBetween(start, end);
    const augDays = getDaysBetween(start, '2026-08-31');
    const sepDays = Math.max(1, totalDays - augDays);
    const augWeight = (augDays / 31) * (153800 / 175923);
    const sepWeight = sepDays / 30;
    const factor = (augWeight + sepWeight) / 2;
    return scalePayloadByFactor(SEPTEMBER_2026_DYNAMIC_REPORT_PAYLOAD, factor, start, end);
  }

  // Fallback to default
  return DEFAULT_DYNAMIC_REPORT_PAYLOAD;
}

/**
 * Filter simulation calculation engine for local/fallback environment.
 * Evaluates active filter constraints and scales realistic metrics accurately.
 */
export function calculateFilteredReport(
  filters: DynamicFilterState,
  customBase?: DynamicReportPayload
): DynamicReportPayload {
  // Resolve accurate baseline month dataset according to active date range
  const base = customBase || resolveBaseReportByDates(filters.startDate, filters.endDate, filters.quickPreset);

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
    const withdrawAllowed =
      filters.selectedTxTypes.includes('WITHDRAW_GOLD') ||
      filters.selectedTxTypes.includes('MARKETHUB_WITHDRAW');

    let txShare = 0;
    if (buyAllowed) txShare += 0.72;
    if (sellAllowed) txShare += 0.26;
    if (withdrawAllowed) txShare += 0.02;
    scaleFactor *= Math.min(1.0, Math.max(0.02, txShare));
  }

  // 3. Hour filter scaling (custom multi-select or legacy start/end)
  if (filters.selectedHours && filters.selectedHours.length > 0 && filters.selectedHours.length < 24) {
    const hourRatio = filters.selectedHours.length / 24;
    scaleFactor *= Math.min(1.0, Math.max(0.04, hourRatio));
  } else if (filters.startHour !== null && filters.endHour !== null) {
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

  // 6. Branch filter scaling
  if (filters.selectedBranches.length > 0) {
    const totalBranchTx = base.branches.reduce((acc, br) => acc + br.total_tx, 0);
    const selectedBranchTx = filters.selectedBranches.reduce((acc, brName) => {
      const match = base.branches.find((b) => b.branch_name === brName);
      return acc + (match ? match.total_tx : 0);
    }, 0);
    if (totalBranchTx > 0) {
      scaleFactor *= Math.min(1.0, Math.max(0.01, selectedBranchTx / totalBranchTx));
    }
  }

  // 7. Customer segment scaling
  if (filters.customerSegment && filters.customerSegment !== 'all') {
    if (filters.customerSegment === 'vip_15g') scaleFactor *= 0.15;
    else if (filters.customerSegment === 'medium_2_15g') scaleFactor *= 0.40;
    else if (filters.customerSegment === 'micro_2g') scaleFactor *= 0.45;
  }

  // 8. Day of week scaling (custom multi-select or legacy presets)
  if (filters.selectedDaysOfWeek && filters.selectedDaysOfWeek.length > 0 && filters.selectedDaysOfWeek.length < 7) {
    const dayRatio = filters.selectedDaysOfWeek.length / 7;
    scaleFactor *= Math.min(1.0, Math.max(0.05, dayRatio));
  } else if (filters.dayOfWeek && filters.dayOfWeek !== 'all') {
    if (filters.dayOfWeek === 'weekdays') scaleFactor *= 0.72;
    else if (filters.dayOfWeek === 'weekends') scaleFactor *= 0.28;
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
    day_of_week: (() => {
      const dowDefs = [
        { code: 'mon', label: 'Mon', full: 'Monday', weight: 0.13, buyRatio: 0.72, sellRatio: 0.28 },
        { code: 'tue', label: 'Tue', full: 'Tuesday', weight: 0.125, buyRatio: 0.72, sellRatio: 0.28 },
        { code: 'wed', label: 'Wed', full: 'Wednesday', weight: 0.135, buyRatio: 0.72, sellRatio: 0.28 },
        { code: 'thu', label: 'Thu', full: 'Thursday', weight: 0.14, buyRatio: 0.72, sellRatio: 0.28 },
        { code: 'fri', label: 'Fri', full: 'Friday (Payday)', weight: 0.19, buyRatio: 0.74, sellRatio: 0.26 },
        { code: 'sat', label: 'Sat', full: 'Saturday', weight: 0.17, buyRatio: 0.75, sellRatio: 0.25 },
        { code: 'sun', label: 'Sun', full: 'Sunday', weight: 0.11, buyRatio: 0.69, sellRatio: 0.31 },
      ];

      const dowCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      let startD = new Date(filters.startDate + 'T00:00:00Z');
      const endD = new Date(filters.endDate + 'T00:00:00Z');
      if (isNaN(startD.getTime())) startD = new Date('2026-10-01T00:00:00Z');
      let loops = 0;
      const curD = new Date(startD);
      while (curD <= endD && loops < 370) {
        dowCounts[curD.getUTCDay()] = (dowCounts[curD.getUTCDay()] || 0) + 1;
        curD.setUTCDate(curD.getUTCDate() + 1);
        loops++;
      }

      const dowDayCounts = [
        Math.max(1, dowCounts[1] || 1), // Mon
        Math.max(1, dowCounts[2] || 1), // Tue
        Math.max(1, dowCounts[3] || 1), // Wed
        Math.max(1, dowCounts[4] || 1), // Thu
        Math.max(1, dowCounts[5] || 1), // Fri
        Math.max(1, dowCounts[6] || 1), // Sat
        Math.max(1, dowCounts[0] || 1), // Sun
      ];

      const totalWeightedSum = dowDefs.reduce((acc, d, i) => acc + d.weight * dowDayCounts[i], 0) || 1;

      return dowDefs.map((def, i) => {
        const dayShare = (def.weight * dowDayCounts[i]) / totalWeightedSum;
        const dayTotalTx = Math.max(1, Math.round(scaledTotalTx * dayShare));
        const dayBuyTx = Math.round(dayTotalTx * def.buyRatio);
        const daySellTx = Math.max(0, dayTotalTx - dayBuyTx);
        const dayBuyWtG = Number((scaledBuyWeightG * dayShare * (def.buyRatio / 0.72)).toFixed(1));
        const daySellWtG = Number((scaledSellWeightG * dayShare * (def.sellRatio / 0.28)).toFixed(1));
        const dayAmountLak = Math.round((scaledRevenueBuyLak + scaledRevenueSellLak) * dayShare);

        return {
          day_code: def.code,
          day_label: def.label,
          day_full: def.full,
          total_tx: dayTotalTx,
          buy_tx: dayBuyTx,
          sell_tx: daySellTx,
          buy_weight_g: dayBuyWtG,
          sell_weight_g: daySellWtG,
          total_amount_lak: dayAmountLak,
        };
      });
    })(),
    timeline_trend: base.timeline_trend ? base.timeline_trend.map((pt) => ({
      ...pt,
      buy_tx: Math.round(pt.buy_tx * factor),
      sell_tx: Math.round(pt.sell_tx * factor),
      total_tx: Math.round(pt.total_tx * factor),
      buy_weight_g: Number((pt.buy_weight_g * factor).toFixed(2)),
      sell_weight_g: Number((pt.sell_weight_g * factor).toFixed(2)),
      net_weight_g: Number((pt.net_weight_g * factor).toFixed(2)),
      nc: Math.round(pt.nc * factor),
      withdraw_tx: Math.round((pt.withdraw_tx ?? Math.round(pt.sell_tx * 0.08)) * factor),
      withdraw_weight_g: Number(((pt.withdraw_weight_g ?? Math.round(pt.sell_weight_g * 0.12)) * factor).toFixed(2)),
    })) : undefined,
  };
}
