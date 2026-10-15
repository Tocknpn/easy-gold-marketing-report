import { PivotMetricDefinition, PivotMetricId } from '@/lib/types/pivotReport.types';

export const PIVOT_METRIC_DEFINITIONS: Record<PivotMetricId, PivotMetricDefinition> = {
  total_buy_transac: {
    id: 'total_buy_transac',
    label: 'Total Buy Transac',
    shortLabel: 'Buy Trans',
    category: 'buy',
    unit: 'count',
    decimals: 0,
  },
  total_unique_user: {
    id: 'total_unique_user',
    label: 'Total unique user',
    shortLabel: 'Unique Users',
    category: 'users',
    unit: 'users',
    decimals: 0,
  },
  revenue_buy_mil_lak: {
    id: 'revenue_buy_mil_lak',
    label: 'Revenue Buy (mil lak)',
    shortLabel: 'Rev (mil LAK)',
    category: 'buy',
    unit: 'mil_lak',
    decimals: 2,
  },
  revenue_buy_lak: {
    id: 'revenue_buy_lak',
    label: 'Revenue Buy (lak)',
    shortLabel: 'Rev (LAK)',
    category: 'buy',
    unit: 'lak',
    decimals: 0,
  },
  gold_weight_buy_g: {
    id: 'gold_weight_buy_g',
    label: 'Gold Weight Buy (g)',
    shortLabel: 'Gold Wt (g)',
    category: 'volume',
    unit: 'grams',
    decimals: 2,
  },
  gold_buy_size_g: {
    id: 'gold_buy_size_g',
    label: 'Gold Buy Size (g)',
    shortLabel: 'Ticket Size (g)',
    category: 'volume',
    unit: 'ticket_g',
    decimals: 1,
  },
  total_nc: {
    id: 'total_nc',
    label: 'Total NC',
    shortLabel: 'New Customers',
    category: 'users',
    unit: 'users',
    decimals: 0,
  },
  sum_gold_weight: {
    id: 'sum_gold_weight',
    label: 'Sum of ຍອດຄຳທັງໝົດ',
    shortLabel: 'ຍອດຄຳ (g)',
    category: 'volume',
    unit: 'grams',
    decimals: 4,
  },
  sum_amount_lak: {
    id: 'sum_amount_lak',
    label: 'Sum of ຖືກເປັນເງິນ(ກີບ)',
    shortLabel: 'ມູນຄ່າ (ກີບ)',
    category: 'general',
    unit: 'lak',
    decimals: 0,
  },
};

// Exact daily rows extracted directly from Excel Image 1
export const EXCEL_IMAGE_1_DAILY_DATA: Array<{
  date: string;
  buy_trans: number;
  unique_user: number;
  revenue_mil_lak: number;
  gold_weight_g: number;
  ticket_size_g: number;
  nc: number;
}> = [
  { date: '4/1/2026', buy_trans: 3755, unique_user: 2724, revenue_mil_lak: 82110.72, gold_weight_g: 23475.39, ticket_size_g: 6.3, nc: 198.0 },
  { date: '4/2/2026', buy_trans: 5520, unique_user: 3528, revenue_mil_lak: 100936.73, gold_weight_g: 29134.92, ticket_size_g: 5.3, nc: 202.0 },
  { date: '4/3/2026', buy_trans: 1347, unique_user: 1192, revenue_mil_lak: 10438.93, gold_weight_g: 3003.58, ticket_size_g: 2.2, nc: 122.0 },
  { date: '4/4/2026', buy_trans: 1288, unique_user: 1139, revenue_mil_lak: 8801.83, gold_weight_g: 2542.58, ticket_size_g: 2.0, nc: 86.0 },
  { date: '4/5/2026', buy_trans: 1169, unique_user: 1038, revenue_mil_lak: 9002.23, gold_weight_g: 2602.35, ticket_size_g: 2.2, nc: 60.0 },
  { date: '4/6/2026', buy_trans: 4267, unique_user: 3311, revenue_mil_lak: 83347.53, gold_weight_g: 24264.03, ticket_size_g: 5.7, nc: 130.0 },
  { date: '4/7/2026', buy_trans: 3137, unique_user: 2561, revenue_mil_lak: 47110.58, gold_weight_g: 13747.67, ticket_size_g: 4.4, nc: 103.0 },
  { date: '4/8/2026', buy_trans: 3831, unique_user: 2558, revenue_mil_lak: 83858.43, gold_weight_g: 24092.62, ticket_size_g: 6.3, nc: 161.0 },
  { date: '4/9/2026', buy_trans: 3195, unique_user: 2449, revenue_mil_lak: 59481.59, gold_weight_g: 17244.13, ticket_size_g: 5.4, nc: 98.0 },
  { date: '4/10/2026', buy_trans: 1637, unique_user: 1394, revenue_mil_lak: 16550.75, gold_weight_g: 4780.21, ticket_size_g: 2.9, nc: 92.0 },
  { date: '4/11/2026', buy_trans: 1529, unique_user: 1309, revenue_mil_lak: 15018.03, gold_weight_g: 4346.34, ticket_size_g: 2.8, nc: 91.0 },
  { date: '4/12/2026', buy_trans: 1044, unique_user: 942, revenue_mil_lak: 8652.89, gold_weight_g: 2505.18, ticket_size_g: 2.4, nc: 42.0 },
  { date: '4/13/2026', buy_trans: 2668, unique_user: 2166, revenue_mil_lak: 37961.21, gold_weight_g: 11027.11, ticket_size_g: 4.1, nc: 59.0 },
  { date: '4/14/2026', buy_trans: 241, unique_user: 208, revenue_mil_lak: 397.40, gold_weight_g: 113.89, ticket_size_g: 0.5, nc: 1.0 },
  { date: '4/15/2026', buy_trans: 234, unique_user: 207, revenue_mil_lak: 337.25, gold_weight_g: 96.10, ticket_size_g: 0.4, nc: 0.0 },
  { date: '4/16/2026', buy_trans: 221, unique_user: 194, revenue_mil_lak: 300.55, gold_weight_g: 86.10, ticket_size_g: 0.4, nc: 0.0 },
  { date: '4/17/2026', buy_trans: 1972, unique_user: 1667, revenue_mil_lak: 24687.15, gold_weight_g: 7110.10, ticket_size_g: 3.6, nc: 126.0 },
  { date: '4/18/2026', buy_trans: 1290, unique_user: 1129, revenue_mil_lak: 14428.06, gold_weight_g: 4144.67, ticket_size_g: 3.2, nc: 107.0 },
  { date: '4/19/2026', buy_trans: 855, unique_user: 754, revenue_mil_lak: 6508.39, gold_weight_g: 1870.79, ticket_size_g: 2.2, nc: 64.0 },
  { date: '4/20/2026', buy_trans: 2327, unique_user: 1878, revenue_mil_lak: 35094.66, gold_weight_g: 10146.38, ticket_size_g: 4.4, nc: 134.0 },
  { date: '4/21/2026', buy_trans: 3797, unique_user: 2711, revenue_mil_lak: 68466.64, gold_weight_g: 19843.74, ticket_size_g: 5.2, nc: 150.0 },
  { date: '4/22/2026', buy_trans: 3935, unique_user: 2979, revenue_mil_lak: 61874.92, gold_weight_g: 17986.56, ticket_size_g: 4.6, nc: 98.0 },
  { date: '4/23/2026', buy_trans: 3271, unique_user: 2718, revenue_mil_lak: 43951.36, gold_weight_g: 12782.72, ticket_size_g: 3.9, nc: 139.0 },
  { date: '4/24/2026', buy_trans: 5906, unique_user: 4442, revenue_mil_lak: 89556.65, gold_weight_g: 26159.02, ticket_size_g: 4.4, nc: 111.0 },
  { date: '4/25/2026', buy_trans: 1432, unique_user: 1282, revenue_mil_lak: 12207.19, gold_weight_g: 3553.92, ticket_size_g: 2.5, nc: 87.0 },
  { date: '4/26/2026', buy_trans: 1202, unique_user: 1096, revenue_mil_lak: 11162.12, gold_weight_g: 3251.10, ticket_size_g: 2.7, nc: 63.0 },
  { date: '4/27/2026', buy_trans: 3375, unique_user: 2646, revenue_mil_lak: 42611.50, gold_weight_g: 12445.23, ticket_size_g: 3.7, nc: 92.0 },
  { date: '4/28/2026', buy_trans: 9408, unique_user: 6092, revenue_mil_lak: 117649.26, gold_weight_g: 34696.81, ticket_size_g: 3.7, nc: 158.0 },
  { date: '4/29/2026', buy_trans: 5394, unique_user: 4283, revenue_mil_lak: 57801.45, gold_weight_g: 17128.09, ticket_size_g: 3.2, nc: 191.0 },
  { date: '4/30/2026', buy_trans: 3642, unique_user: 3190, revenue_mil_lak: 38760.38, gold_weight_g: 11471.16, ticket_size_g: 3.1, nc: 162.0 },
  { date: '5/1/2026', buy_trans: 2719, unique_user: 2338, revenue_mil_lak: 21210.45, gold_weight_g: 6287.07, ticket_size_g: 2.3, nc: 89.0 },
  { date: '5/2/2026', buy_trans: 1876, unique_user: 1671, revenue_mil_lak: 14736.46, gold_weight_g: 4367.53, ticket_size_g: 2.3, nc: 86.0 },
  { date: '5/3/2026', buy_trans: 1557, unique_user: 1395, revenue_mil_lak: 13418.31, gold_weight_g: 3976.17, ticket_size_g: 2.6, nc: 67.0 },
  { date: '5/4/2026', buy_trans: 10154, unique_user: 6893, revenue_mil_lak: 100768.88, gold_weight_g: 30135.62, ticket_size_g: 3.0, nc: 216.0 },
  { date: '5/5/2026', buy_trans: 5233, unique_user: 4490, revenue_mil_lak: 59585.26, gold_weight_g: 17844.14, ticket_size_g: 3.4, nc: 226.0 },
];

// Exact customer list extracted directly from Excel Image 2
export const EXCEL_IMAGE_2_CUSTOMER_DATA: Array<{
  phone: string;
  name: string;
  gold_weight: number;
  amount_lak: number;
}> = [
  { phone: '2022000020', name: 'ຄຳແພງ ຫຼວງພະລາຊ', gold_weight: 60.0000, amount_lak: 187120000 },
  { phone: '2022000050', name: 'ມະນີດອນ ສີມມະວົງ', gold_weight: 3.2127, amount_lak: 10000000 },
  { phone: '2022000564', name: 'ນ. ສອນທະລີ ໂສດາລັກ', gold_weight: 2.2272, amount_lak: 6860000 },
  { phone: '2022000694', name: 'ນາງ ພອນສະຫວັນ ປອງມາວງ', gold_weight: 0.1936, amount_lak: 600000 },
  { phone: '2022000961', name: 'viengkhone pathoumvahn', gold_weight: 0.0315, amount_lak: 100000 },
  { phone: '2022001101', name: 'ທ ສີທອນ ສອບປັນຍາ', gold_weight: 3.2203, amount_lak: 10000000 },
  { phone: '2022001184', name: 'PHONESAVANH BOSISAKOUN', gold_weight: 0.2574, amount_lak: 800000 },
  { phone: '2022002066', name: 'Phavanh Seephakhoun', gold_weight: 0.5861, amount_lak: 1800000 },
  { phone: '2022002206', name: 'ນາງ ເພັດສະໝອນ ຄຳຈັນ', gold_weight: 9.7677, amount_lak: 30000000 },
  { phone: '2022002443', name: 'ສຸລາລັດ ດວງສິດທິ', gold_weight: 0.1606, amount_lak: 500000 },
  { phone: '2022002846', name: 'ນ ສິບບະດອບ ວົງລັດດາ', gold_weight: 1.9500, amount_lak: 6000000 },
  { phone: '2022002883', name: 'ທ້າວ ສີອຳພອນ ທອນມະນີ', gold_weight: 0.0324, amount_lak: 100000 },
  { phone: '2022002903', name: 'ນ ຄຳຫລ້າ ວັນນະວົງ', gold_weight: 0.1625, amount_lak: 500000 },
  { phone: '2022003556', name: 'ນາງ ຄູນຄຳ ຫຼວງອາໄພ', gold_weight: 0.0954, amount_lak: 300000 },
  { phone: '2022003565', name: 'Miyuki vongvilay', gold_weight: 1.7341, amount_lak: 5400000 },
  { phone: '2022004568', name: 'ນ ສາຍຈຳພອນ ສີວັນທອງ', gold_weight: 0.6428, amount_lak: 2000000 },
  { phone: '2022005004', name: 'ຄຳພີ ເຫຼັກທະບັບດິດ', gold_weight: 0.3175, amount_lak: 1000000 },
  { phone: '2022005333', name: 'ນ ຈິດປະສັງ ບັນນະວົງສາ', gold_weight: 0.6512, amount_lak: 2000000 },
  { phone: '2022006203', name: 'ພັນທະວາ ບົວຮອນສີ', gold_weight: 15.0000, amount_lak: 45940000 },
  { phone: '2022006350', name: 'ນາງ ບົວວັນ ລ້ານທະຍອດ', gold_weight: 0.7967, amount_lak: 2500000 },
  { phone: '2022006897', name: 'ຈັນມະລີ ວົງພະຈັນ', gold_weight: 3.2559, amount_lak: 10000000 },
  { phone: '2022007172', name: 'ພິລັດ ດວງມະນີ', gold_weight: 0.0324, amount_lak: 100000 },
  { phone: '2022007473', name: 'ທ້າວ ສີຈັນ ເມັດສະຫວັນ', gold_weight: 0.1623, amount_lak: 500000 },
  { phone: '2022007733', name: 'ຈັນທະວີ ແສງທາວາ', gold_weight: 0.3250, amount_lak: 1000000 },
  { phone: '2022007830', name: 'ນ.ທອງລ່ຽນ ສີສຸພັນ', gold_weight: 0.5000, amount_lak: 1531334 },
  { phone: '2022008112', name: 'Nounhchanh saysongkham', gold_weight: 0.1622, amount_lak: 500000 },
  { phone: '2022008779', name: 'ມະນີວັນ ລຸກຄຳ', gold_weight: 0.6512, amount_lak: 2000000 },
  { phone: '2022008815', name: 'ຄຳຫຼ້າ ວັນນະວົງ', gold_weight: 0.8698, amount_lak: 2700000 },
  { phone: '2022011191', name: 'ພອນປະເສີດ ຮິບສິງລຽງໃຫມ່', gold_weight: 7.7419, amount_lak: 24000000 },
];
