import {
  PivotRowDimension,
  PivotSlicerState,
  PivotMetricId,
  PivotRowData,
  PivotReportPayload,
} from '@/lib/types/pivotReport.types';
import {
  EXCEL_IMAGE_1_DAILY_DATA,
  EXCEL_IMAGE_2_CUSTOMER_DATA,
} from './pivotData';

export function computePivotReport(
  dimension: PivotRowDimension,
  slicers: PivotSlicerState,
  activeMetricIds: PivotMetricId[]
): PivotReportPayload {
  let rows: PivotRowData[] = [];

  if (dimension === 'date') {
    // Generate daily pivot rows matching Image 1
    rows = EXCEL_IMAGE_1_DAILY_DATA.map((item) => {
      // Apply 500k up modifier if selected
      const factor = slicers.is_500k_up === 'yes' ? 1.0 : slicers.is_500k_up === 'no' ? 0.35 : 1.35;
      
      const buy_trans = Math.round(item.buy_trans * factor);
      const unique_user = Math.round(item.unique_user * factor);
      const revenue_mil_lak = Number((item.revenue_mil_lak * factor).toFixed(2));
      const revenue_lak = Math.round(revenue_mil_lak * 1000000);
      const gold_weight_g = Number((item.gold_weight_g * factor).toFixed(2));
      const ticket_size_g = buy_trans > 0 ? Number((gold_weight_g / buy_trans).toFixed(1)) : item.ticket_size_g;
      const total_nc = Math.round(item.nc * factor);

      return {
        key: item.date,
        label: item.date,
        metrics: {
          total_buy_transac: buy_trans,
          total_unique_user: unique_user,
          revenue_buy_mil_lak: revenue_mil_lak,
          revenue_buy_lak: revenue_lak,
          gold_weight_buy_g: gold_weight_g,
          gold_buy_size_g: ticket_size_g,
          total_nc: total_nc,
          sum_gold_weight: gold_weight_g,
          sum_amount_lak: revenue_lak,
        },
      };
    });

    // Apply month filter
    if (slicers.month === "Apr'26") {
      rows = rows.filter((r) => r.label.startsWith('4/'));
    } else if (slicers.month === "May'26") {
      rows = rows.filter((r) => r.label.startsWith('5/'));
    }
  } else if (dimension === 'customer') {
    // Generate grouped customer rows matching Image 2 (Phone & Name)
    rows = EXCEL_IMAGE_2_CUSTOMER_DATA.map((item) => {
      let weight = item.gold_weight;
      let amount = item.amount_lak;

      // Filter conditions
      if (slicers.is_15g_up === 'yes' && weight < 15.0) return null;
      if (slicers.is_2g_up === 'yes' && weight < 2.0) return null;
      if (slicers.is_3_75g_up === 'yes' && weight < 3.75) return null;
      if (slicers.is_500k_up === 'yes' && amount < 500000) return null;

      const rev_mil = Number((amount / 1000000).toFixed(2));

      return {
        key: item.phone,
        label: item.phone,
        subLabel: item.name,
        phone: item.phone,
        metrics: {
          total_buy_transac: weight > 10 ? 12 : 3,
          total_unique_user: 1,
          revenue_buy_mil_lak: rev_mil,
          revenue_buy_lak: amount,
          gold_weight_buy_g: weight,
          gold_buy_size_g: Number((weight / 3).toFixed(1)),
          total_nc: item.phone.endsWith('0') ? 1 : 0,
          sum_gold_weight: weight,
          sum_amount_lak: amount,
        },
      };
    }).filter(Boolean) as PivotRowData[];
  } else if (dimension === 'bank') {
    const banks = [
      { name: 'BCEL One (Banque Pour Le Commerce Exterieur Lao)', share: 0.58, weightShare: 0.56 },
      { name: 'LDB Trust (Lao Development Bank)', share: 0.22, weightShare: 0.24 },
      { name: 'JDB Yes (Joint Development Bank)', share: 0.12, weightShare: 0.11 },
      { name: 'u-money (Unitel Star Fintech)', share: 0.05, weightShare: 0.05 },
      { name: 'M-Money (Lao Telecom)', share: 0.03, weightShare: 0.04 },
    ];

    const baseTrans = 123142;
    const baseRevMil = 1206192.1;
    const baseWeightG = 383084.7;

    rows = banks.map((b) => {
      const bTrans = Math.round(baseTrans * b.share);
      const bRevMil = Number((baseRevMil * b.share).toFixed(2));
      const bWeight = Number((baseWeightG * b.weightShare).toFixed(2));
      return {
        key: b.name,
        label: b.name,
        metrics: {
          total_buy_transac: bTrans,
          total_unique_user: Math.round(bTrans * 0.72),
          revenue_buy_mil_lak: bRevMil,
          revenue_buy_lak: Math.round(bRevMil * 1000000),
          gold_weight_buy_g: bWeight,
          gold_buy_size_g: Number((bWeight / bTrans).toFixed(1)),
          total_nc: Math.round(2486 * b.share),
          sum_gold_weight: bWeight,
          sum_amount_lak: Math.round(bRevMil * 1000000),
        },
      };
    });
  } else if (dimension === 'branch') {
    const branches = [
      { name: 'Vientiane Capital - Headquarters (ຕະຫຼາດເຊົ້າ)', share: 0.44 },
      { name: 'Champasak - Pakse Center (ປາກເຊ)', share: 0.21 },
      { name: 'Luang Prabang Heritage Branch (ຫຼວງພະບາງ)', share: 0.17 },
      { name: 'Savannakhet Trade Hub (ສະຫວັນນະເຂດ)', share: 0.12 },
      { name: 'Oudomxay Northern Hub (ອຸດົມໄຊ)', share: 0.06 },
    ];

    rows = branches.map((br) => {
      const bTrans = Math.round(123142 * br.share);
      const bRevMil = Number((1206192.1 * br.share).toFixed(2));
      const bWeight = Number((383084.7 * br.share).toFixed(2));
      return {
        key: br.name,
        label: br.name,
        metrics: {
          total_buy_transac: bTrans,
          total_unique_user: Math.round(bTrans * 0.74),
          revenue_buy_mil_lak: bRevMil,
          revenue_buy_lak: Math.round(bRevMil * 1000000),
          gold_weight_buy_g: bWeight,
          gold_buy_size_g: Number((bWeight / bTrans).toFixed(1)),
          total_nc: Math.round(2486 * br.share),
          sum_gold_weight: bWeight,
          sum_amount_lak: Math.round(bRevMil * 1000000),
        },
      };
    });
  } else {
    // Transaction type dimension
    const types = [
      { type: 'BUY_GOLD (ຊື້ຄຳ)', trans: 123142, revMil: 1206192.1, weight: 383084.7, nc: 2486 },
      { type: 'SALE_GOLD (ຂາຍຄຳ)', trans: 44102, revMil: 395400.0, weight: 125600.0, nc: 0 },
      { type: 'WITHDRAW_GOLD (ຖອນຄຳແທ່ງ)', trans: 9840, revMil: 28400.0, weight: 8900.0, nc: 0 },
    ];

    rows = types.map((t) => ({
      key: t.type,
      label: t.type,
      metrics: {
        total_buy_transac: t.trans,
        total_unique_user: Math.round(t.trans * 0.78),
        revenue_buy_mil_lak: t.revMil,
        revenue_buy_lak: Math.round(t.revMil * 1000000),
        gold_weight_buy_g: t.weight,
        gold_buy_size_g: Number((t.weight / t.trans).toFixed(1)),
        total_nc: t.nc,
        sum_gold_weight: t.weight,
        sum_amount_lak: Math.round(t.revMil * 1000000),
      },
    }));
  }

  // Calculate Column Totals
  const totals: Record<PivotMetricId, number> = {
    total_buy_transac: 0,
    total_unique_user: 0,
    revenue_buy_mil_lak: 0,
    revenue_buy_lak: 0,
    gold_weight_buy_g: 0,
    gold_buy_size_g: 0,
    total_nc: 0,
    sum_gold_weight: 0,
    sum_amount_lak: 0,
  };

  rows.forEach((r) => {
    totals.total_buy_transac += r.metrics.total_buy_transac || 0;
    totals.total_unique_user += r.metrics.total_unique_user || 0;
    totals.revenue_buy_mil_lak += r.metrics.revenue_buy_mil_lak || 0;
    totals.revenue_buy_lak += r.metrics.revenue_buy_lak || 0;
    totals.gold_weight_buy_g += r.metrics.gold_weight_buy_g || 0;
    totals.total_nc += r.metrics.total_nc || 0;
    totals.sum_gold_weight += r.metrics.sum_gold_weight || 0;
    totals.sum_amount_lak += r.metrics.sum_amount_lak || 0;
  });

  totals.revenue_buy_mil_lak = Number(totals.revenue_buy_mil_lak.toFixed(2));
  totals.gold_weight_buy_g = Number(totals.gold_weight_buy_g.toFixed(2));
  totals.sum_gold_weight = Number(totals.sum_gold_weight.toFixed(4));
  totals.gold_buy_size_g = totals.total_buy_transac > 0
    ? Number((totals.gold_weight_buy_g / totals.total_buy_transac).toFixed(1))
    : 0;

  return {
    dimension,
    slicers,
    activeMetricIds,
    rows,
    totals,
    totalRowCount: rows.length,
  };
}
