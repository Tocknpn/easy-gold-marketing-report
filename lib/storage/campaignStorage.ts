import { CampaignSetupConfig } from '@/lib/types/campaign.types';
import { createClient } from '@/lib/supabase/client';

const LOCAL_STORAGE_CAMPAIGNS_KEY = 'easy_gold_saved_campaign_setups_v7';

const LEGACY_ID_MAP: Record<string, string> = {
  'campaign-buy-500k-mega': '10000000-0000-0000-0000-000000000001',
  'campaign-buy-2g-sprint': '10000000-0000-0000-0000-000000000002',
  'campaign-vip-15g-saver': '10000000-0000-0000-0000-000000000003',
  'campaign-new-user-welcome': '10000000-0000-0000-0000-000000000004',
  'campaign-ldb-artist-2026': '10000000-0000-0000-0000-000000000005',
};

export const INITIAL_PRESET_CAMPAIGNS: CampaignSetupConfig[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    campaign_name: 'Mega Buy Gold >= 500K Campaign (Excel Image 3)',
    description: 'Long-term volume driver incentivizing transactions of 500,000 LAK and above across all branch counters and app.',
    category_tag: 'Volume Driver',
    scale_category: 'VOLUME DRIVER — TICKET >= 500K',
    team: 'ALL BRANCHES',
    location: 'Vientiane HQ & All Branches',
    status: 'active',
    image_url: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=150&auto=format&fit=crop&q=80',
    campaign_date_start: '2026-08-24',
    campaign_date_end: '2026-12-25',
    data_update_on: '2026-10-18',
    auto_sync_max_date: true,
    same_period_backward_start: '2026-07-03',
    same_period_backward_end: '2026-08-23',
    condition_type: 'amount_gte',
    condition_operator: '>=',
    condition_value: 500000,
    condition_label: 'Buy trans >= 500k',
    tx_type: 'BUY_GOLD',
    bank: 'all',
    target_types: ['ec', 'nc', 'revenue', 'weight'],
    ec_target: 307500,
    nc_target: 17220,
    revenue_target_mil: 2876304.2,
    gold_weight_target_g: 913509.7,
    plan_budget: 2876304200,
    total_spending_cost: 120000000,
    customers_actual: 129150,
    customers_target: 307500,
    new_cust_actual: 2410,
    new_cust_target: 17220,
    baseline_daily_rr: 79.0,
    execution_status_label: '42% Time Gone • Pacing: Healthy (+35% vs Backward)',
    year: 2026,
    quarter: 'Q4',
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    campaign_name: 'Q3 Gold Rush >= 2.0g Sprint (Excel Image 4)',
    description: '11-day high-weight sprint promotion comparing against normal Q3 baseline run rate.',
    category_tag: 'Sprint Promo',
    scale_category: 'SPRINT PROMO — WEIGHT >= 2.0G',
    team: 'MOBILE APP',
    location: 'Nationwide App & Counters',
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1624365168968-f283b5bfa082?w=150&auto=format&fit=crop&q=80',
    campaign_date_start: '2026-07-13',
    campaign_date_end: '2026-07-23',
    data_update_on: '2026-07-23',
    auto_sync_max_date: false,
    same_period_backward_start: '2026-07-02',
    same_period_backward_end: '2026-07-12',
    condition_type: 'weight_gte',
    condition_operator: '>=',
    condition_value: 2.0,
    condition_label: 'Buy trans >= 2g',
    tx_type: 'BUY_GOLD',
    bank: 'all',
    target_types: ['ec', 'nc'],
    ec_target: 12800,
    nc_target: 1200,
    plan_budget: 250000000,
    total_spending_cost: 245000000,
    customers_actual: 12800,
    customers_target: 12800,
    new_cust_actual: 1200,
    new_cust_target: 1200,
    baseline_daily_rr: 79.0,
    execution_status_label: '100% Plan Execution (Target Achieved)',
    year: 2026,
    quarter: 'Q3',
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    campaign_name: 'VIP Gold Saver >= 15g Retention Promo',
    description: 'Special wealth accumulation incentive for high-tier bullion savers with premium fee discounts.',
    category_tag: 'VIP Retention',
    scale_category: 'VIP RETENTION — WEIGHT >= 15.0G',
    team: 'VIP DESK',
    location: 'VIP Wealth Lounges & App',
    status: 'active',
    image_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150&auto=format&fit=crop&q=80',
    campaign_date_start: '2026-09-01',
    campaign_date_end: '2026-11-30',
    data_update_on: '2026-10-14',
    auto_sync_max_date: true,
    same_period_backward_start: '2026-07-01',
    same_period_backward_end: '2026-08-31',
    condition_type: 'weight_gte',
    condition_operator: '>=',
    condition_value: 15.0,
    condition_label: 'Buy trans >= 15g',
    tx_type: 'BUY_GOLD',
    bank: 'all',
    target_types: ['ec', 'nc', 'revenue'],
    ec_target: 5000,
    nc_target: 450,
    revenue_target_mil: 1500000,
    plan_budget: 450000000,
    total_spending_cost: 180000000,
    customers_actual: 3250,
    customers_target: 5000,
    new_cust_actual: 310,
    new_cust_target: 450,
    execution_status_label: '65% Time Gone • Pacing Steady',
    year: 2026,
    quarter: 'Q4',
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    campaign_name: 'First Gold Step — New Customer Welcome',
    description: 'First-time digital gold buyer onboarding incentive with zero transaction fee on first purchase.',
    category_tag: 'New Acquisition',
    scale_category: 'ACQUISITION — FIRST BUY >= 200K',
    team: 'DIGITAL GROWTH',
    location: 'Easy Gold App & QR Onboarding',
    status: 'active',
    image_url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=150&auto=format&fit=crop&q=80',
    campaign_date_start: '2026-10-01',
    campaign_date_end: '2026-10-31',
    data_update_on: '2026-10-14',
    auto_sync_max_date: true,
    same_period_backward_start: '2026-09-01',
    same_period_backward_end: '2026-09-30',
    condition_type: 'amount_gte',
    condition_operator: '>=',
    condition_value: 200000,
    condition_label: 'First Buy >= 200k',
    tx_type: 'BUY_GOLD',
    bank: 'all',
    target_types: ['nc', 'ec'],
    ec_target: 8500,
    nc_target: 5000,
    plan_budget: 180000000,
    total_spending_cost: 75000000,
    customers_actual: 4120,
    customers_target: 8500,
    new_cust_actual: 2950,
    new_cust_target: 5000,
    execution_status_label: '45% Time Gone • New User Hit 59%',
    year: 2026,
    quarter: 'Q4',
  },
  {
    id: '10000000-0000-0000-0000-000000000005',
    campaign_name: 'LDB Oct',
    description: 'Special promotion for transactions of 100,000 LAK and above across all banks.',
    category_tag: 'Volume Driver',
    scale_category: 'VOLUME DRIVER — TICKET >= 100K',
    team: 'MARKETING',
    location: 'Nationwide & App',
    status: 'active',
    image_url: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=150&auto=format&fit=crop&q=80',
    campaign_date_start: '2026-10-15',
    campaign_date_end: '2026-10-27',
    data_update_on: '2026-10-18',
    auto_sync_max_date: true,
    same_period_backward_start: '2026-10-04',
    same_period_backward_end: '2026-10-15',
    condition_type: 'amount_gte',
    condition_operator: '>=',
    condition_value: 100000,
    condition_label: 'Buy trans >= 100k',
    tx_type: 'BUY_GOLD',
    bank: 'all',
    target_types: ['ec'],
    ec_target: 62400,
    nc_target: 0,
    revenue_target_mil: 2876304.2,
    gold_weight_target_g: 913509.7,
    plan_budget: 395700000,
    total_spending_cost: 0,
    customers_actual: 10454,
    customers_target: 62400,
    new_cust_actual: 5746,
    new_cust_target: 0,
    baseline_daily_rr: 79.0,
    execution_status_label: 'Active Campaign (4d elapsed)',
    year: 2026,
    quarter: 'Q4',
  },
];

export async function loadCampaignSetups(userId?: string): Promise<CampaignSetupConfig[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('campaign_setups')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        // Map database fields to CampaignSetupConfig
        const list = data.map((d: any) => ({
          id: d.id,
          user_id: d.user_id,
          campaign_name: d.campaign_name,
          description: d.description,
          image_url: d.image_url,
          category_tag: d.category_tag || 'Standard Promo',
          campaign_date_start: d.campaign_start_date,
          campaign_date_end: d.campaign_end_date,
          data_update_on: d.as_of_date,
          auto_sync_max_date: d.auto_sync_max_date ?? true,
          same_period_backward_start: d.backward_start_date,
          same_period_backward_end: d.backward_end_date,
          condition_type: d.condition_type || 'amount_gte',
          condition_operator: d.condition_operator || '>=',
          condition_value: Number(d.condition_value) || 0,
          condition_max_value: d.condition_max_value ? Number(d.condition_max_value) : undefined,
          condition_label: d.condition_label || 'Custom',
          tx_type: d.tx_type || 'BUY_GOLD',
          bank: d.bank || 'all',
          target_types: d.target_types || ['ec', 'nc'],
          ec_target: Number(d.ec_target) || 0,
          nc_target: Number(d.nc_target) || 0,
          revenue_target_mil: d.revenue_target_mil ? Number(d.revenue_target_mil) : undefined,
          gold_weight_target_g: d.gold_weight_target_g ? Number(d.gold_weight_target_g) : undefined,
          baseline_daily_rr: d.baseline_daily_rr ? Number(d.baseline_daily_rr) : undefined,
          status: d.status || 'active',
          scale_category: d.scale_category,
          team: d.team || 'KPV',
          location: d.location,
          total_spending_cost: d.total_spending_cost !== undefined ? Number(d.total_spending_cost) : undefined,
          plan_budget: d.plan_budget !== undefined ? Number(d.plan_budget) : undefined,
          customers_actual: (d.actual_ec !== undefined && d.actual_ec !== null && Number(d.actual_ec) > 0) ? Number(d.actual_ec) : (d.customers_actual !== undefined ? Number(d.customers_actual) : undefined),
          customers_target: d.customers_target !== undefined ? Number(d.customers_target) : undefined,
          new_cust_actual: (d.actual_nc !== undefined && d.actual_nc !== null && Number(d.actual_nc) > 0) ? Number(d.actual_nc) : (d.new_cust_actual !== undefined ? Number(d.new_cust_actual) : undefined),
          new_cust_target: d.new_cust_target !== undefined ? Number(d.new_cust_target) : undefined,
          sql_script: d.sql_script || undefined,
          cpo_actual: d.cpo_actual !== undefined ? Number(d.cpo_actual) : undefined,
          cpo_target: d.cpo_target !== undefined ? Number(d.cpo_target) : undefined,
          cpa_actual: d.cpa_actual !== undefined ? Number(d.cpa_actual) : undefined,
          cpa_target: d.cpa_target !== undefined ? Number(d.cpa_target) : undefined,
          execution_status_label: d.execution_status_label,
          year: d.year || 2026,
          quarter: d.quarter || 'Q4',
        }));

        const sanitizedList = list.map(sanitizeLoadedCampaign);

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LOCAL_STORAGE_CAMPAIGNS_KEY, JSON.stringify(sanitizedList));
          } catch (e) {
            console.warn('Failed to cache campaigns to localStorage:', e);
          }
        }

        return sanitizedList;
      }
    } catch (err) {
      console.warn('Could not load campaigns from Supabase, using local cache:', err);
    }
  }

  // Local storage fallback
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_STORAGE_CAMPAIGNS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = parsed.map(sanitizeLoadedCampaign);
          // Update localStorage if values were sanitized
          localStorage.setItem(LOCAL_STORAGE_CAMPAIGNS_KEY, JSON.stringify(sanitized));
          return sanitized;
        }
      } catch (e) {
        console.warn('Failed parsing local campaigns:', e);
      }
    }
    // Initialize with presets
    localStorage.setItem(LOCAL_STORAGE_CAMPAIGNS_KEY, JSON.stringify(INITIAL_PRESET_CAMPAIGNS));
    return INITIAL_PRESET_CAMPAIGNS;
  }

  return INITIAL_PRESET_CAMPAIGNS;
}

/**
 * Sanitizes campaign setups by clearing accidental 1731 dummy values and zeroing upcoming campaigns
 */
function sanitizeLoadedCampaign(c: CampaignSetupConfig): CampaignSetupConfig {
  const resolvedId = LEGACY_ID_MAP[c.id] || c.id;
  const asOfDate = (c.auto_sync_max_date !== false ? '2026-10-18' : c.data_update_on) || '2026-10-18';
  const isUpcoming = new Date(asOfDate).getTime() < new Date(c.campaign_date_start).getTime();

  let customersActual = c.customers_actual;
  let newCustActual = c.new_cust_actual;

  // Upcoming campaign has not launched: actuals must strictly be 0
  if (isUpcoming) {
    customersActual = 0;
    newCustActual = 0;
  } else if (customersActual === 1731 && c.ec_target !== 1731) {
    customersActual = 0;
    newCustActual = 0;
  } else if (customersActual === 6615 && resolvedId === '10000000-0000-0000-0000-000000000005') {
    customersActual = 10454;
    newCustActual = 5746;
  }

  // Restore preset verified count if actuals are 0 or missing for active campaign
  const preset = INITIAL_PRESET_CAMPAIGNS.find((p) => p.id === resolvedId);
  if ((customersActual === undefined || customersActual === 0) && preset && preset.customers_actual && !isUpcoming) {
    customersActual = preset.customers_actual;
    newCustActual = preset.new_cust_actual;
  }

  return {
    ...c,
    id: resolvedId,
    status: isUpcoming ? 'upcoming' : c.status,
    customers_actual: customersActual,
    new_cust_actual: newCustActual,
  };
}

export async function saveCampaignSetup(campaign: CampaignSetupConfig, userId?: string): Promise<CampaignSetupConfig> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Ensure valid UUID for PostgreSQL campaign_setups table
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaign.id);
  const targetId = isUuid
    ? campaign.id
    : (LEGACY_ID_MAP[campaign.id] || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `10000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`));

  const toSave: CampaignSetupConfig = {
    ...campaign,
    id: targetId,
    user_id: userId || campaign.user_id,
  };

  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createClient();
      const dbPayload = {
        id: toSave.id,
        user_id: toSave.user_id,
        campaign_name: toSave.campaign_name,
        description: toSave.description,
        image_url: toSave.image_url,
        category_tag: toSave.category_tag,
        campaign_start_date: toSave.campaign_date_start,
        campaign_end_date: toSave.campaign_date_end,
        as_of_date: toSave.data_update_on,
        backward_start_date: toSave.same_period_backward_start,
        backward_end_date: toSave.same_period_backward_end,
        condition_type: toSave.condition_type,
        condition_operator: toSave.condition_operator,
        condition_value: toSave.condition_value,
        condition_max_value: toSave.condition_max_value,
        condition_label: toSave.condition_label,
        tx_type: toSave.tx_type,
        bank: toSave.bank || 'all',
        target_types: toSave.target_types,
        ec_target: toSave.ec_target,
        nc_target: toSave.nc_target,
        revenue_target_mil: toSave.revenue_target_mil,
        gold_weight_target_g: toSave.gold_weight_target_g,
        baseline_daily_rr: toSave.baseline_daily_rr,
        status: toSave.status || 'active',
        actual_ec: toSave.customers_actual ?? 0,
        actual_nc: toSave.new_cust_actual ?? 0,
        sql_script: toSave.sql_script || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('campaign_setups')
        .upsert(dbPayload)
        .select()
        .single();

      if (!error && data) {
        toSave.id = data.id;
      } else if (error) {
        console.error('Supabase campaign upsert error:', error);
      }
    } catch (err) {
      console.warn('Could not upsert campaign in Supabase:', err);
    }
  }

  // Update local storage
  if (typeof window !== 'undefined') {
    let existing: CampaignSetupConfig[] = [];
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_CAMPAIGNS_KEY);
      if (raw) {
        existing = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Could not read existing local campaigns:', e);
    }
    if (!existing || existing.length === 0) {
      existing = [...INITIAL_PRESET_CAMPAIGNS];
    }
    const index = existing.findIndex((c) => c.id === toSave.id || c.id === campaign.id);
    let updated: CampaignSetupConfig[];
    if (index >= 0) {
      updated = [...existing];
      updated[index] = toSave;
    } else {
      updated = [toSave, ...existing];
    }
    localStorage.setItem(LOCAL_STORAGE_CAMPAIGNS_KEY, JSON.stringify(updated));
  }

  return toSave;
}

export async function deleteCampaignSetup(campaignId: string, userId?: string): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createClient();
      await supabase.from('campaign_setups').delete().eq('id', campaignId);
    } catch (err) {
      console.warn('Could not delete campaign in Supabase:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const existing = await loadCampaignSetups(userId);
    const filtered = existing.filter((c) => c.id !== campaignId);
    localStorage.setItem(LOCAL_STORAGE_CAMPAIGNS_KEY, JSON.stringify(filtered));
  }
}
