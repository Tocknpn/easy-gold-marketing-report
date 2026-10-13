import { DynamicReportPayload } from '@/lib/types/dynamicReport.types';

export function exportDynamicReportToCsv(data: DynamicReportPayload) {
  const m = data.dax_measures;
  const rows = [
    ['Category', 'Measure Name', 'Value', 'Unit / Notes'],
    ['Platform', 'Total Transactions', m.total_transaction, 'Completed transactions'],
    ['Platform', 'Total Unique Users', m.total_unique_user, 'Distinct phone accounts'],
    ['Platform', 'Frequency Per User All', m.freq_per_user_all, 'Transactions per user'],
    ['Platform', 'New Register', m.new_register, 'OPEN_ACCOUNT count'],
    ['Platform', 'Total Turnover (LAK)', m.total_amount_lak, 'Gross transaction value'],
    ['Platform', 'Total Gold Flow (g)', m.total_gold_weight_g, 'Gross gold grams moved'],
    
    ['Buy Performance', 'Buy Transactions', m.total_buy_transac, 'Completed BUY_GOLD'],
    ['Buy Performance', 'Buy Users', m.user_buy, 'Distinct buyers'],
    ['Buy Performance', 'Buy Frequency per User', m.freq_per_user_buy, 'Buy operations per buyer'],
    ['Buy Performance', 'Gold Weight Buy (g)', m.gold_weight_buy_g, 'Grams'],
    ['Buy Performance', 'Gold Weight Buy (15g)', m.gold_weight_buy_15g, '15g Lao Baht units'],
    ['Buy Performance', 'Revenue Buy (mil LAK)', m.revenue_buy_mil_lak, 'Million LAK'],
    ['Buy Performance', 'ABS Ticket Size (LAK)', m.abs_buy_ticket_lak, 'Average purchase value'],
    ['Buy Performance', 'Gold Buy Size (g)', m.gold_buy_size_g, 'Average physical weight bought'],

    ['Sell Performance', 'Sell Transactions', m.total_sell_transac, 'Completed SALE_GOLD'],
    ['Sell Performance', 'Sell Users', m.user_sell, 'Distinct sellers'],
    ['Sell Performance', 'Sell Frequency per User', m.freq_per_user_sell, 'Sell operations per seller'],
    ['Sell Performance', 'Gold Weight Sell (g)', m.gold_weight_sell_g, 'Grams'],
    ['Sell Performance', 'Gold Weight Sell (15g)', m.gold_weight_sell_15g, '15g Lao Baht units'],
    ['Sell Performance', 'Revenue Sell (mil LAK)', m.revenue_sell_mil_lak, 'Million LAK'],
    ['Sell Performance', 'Avg Sell Size (LAK)', m.avg_sell_size_lak, 'Average sale liquidation value'],
    ['Sell Performance', 'Gold Sell Size (g)', m.gold_sell_size_g, 'Average physical weight sold'],

    ['Withdraw Performance', 'Withdraw Transactions', m.withdraw_trans, 'Orders count'],
    ['Withdraw Performance', 'Withdraw Users', m.user_withdraw_gold, 'Distinct withdrawing users'],
    ['Withdraw Performance', 'Withdraw Gold (g)', m.withdraw_gold_g, 'Grams'],
    ['Withdraw Performance', 'Withdraw Gold (15g)', m.withdraw_gold_15g, '15g Lao Baht units'],
    ['Withdraw Performance', 'Withdraw Value (mil LAK)', m.withdraw_value_mil_lak, 'Million LAK'],
    ['Withdraw Performance', 'Withdraw Ticket Size (g)', m.withdraw_ticket_size_g, 'Average weight per order'],

    ['Price & Flow', '%Net Flow (Transactions)', `${m.net_flow_trans_pct}%`, 'Buy Tx / Total Tx'],
    ['Price & Flow', '%Net Flow (Revenue Value)', `${m.net_flow_value_pct}%`, 'Buy Rev / (Buy + Sell Rev)'],
    ['Price & Flow', 'Net Gold Balance (g)', m.net_gold_weight_g, 'Buy Weight - Sell - Withdraw'],
    ['Price & Flow', 'Open Price', m.open_price, 'LAK / 15g'],
    ['Price & Flow', 'Close Price', m.close_price, 'LAK / 15g'],
    ['Price & Flow', 'Price Change', m.price_change, 'LAK / 15g'],

    ['Statistics', 'Average Value (LAK)', m.avg_value_lak, 'Mean'],
    ['Statistics', 'Median Value (LAK)', m.median_value_lak, '50th Percentile'],
    ['Statistics', 'Min Value (LAK)', m.min_value_lak, 'Minimum'],
    ['Statistics', 'Max Value (LAK)', m.max_value_lak, 'Maximum'],
    ['Statistics', 'Average Weight (g)', m.avg_weight_g, 'Mean'],
    ['Statistics', 'Median Weight (g)', m.median_weight_g, '50th Percentile'],
  ];

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `EasyGold_Dynamic_BI_Report_${data.meta.start_date}_to_${data.meta.end_date}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
