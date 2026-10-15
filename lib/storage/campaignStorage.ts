import { CampaignSetupConfig } from '@/lib/types/campaign.types';
import { createClient } from '@/lib/supabase/client';

const LOCAL_STORAGE_CAMPAIGNS_KEY = 'easy_gold_saved_campaign_setups_v3';

export const INITIAL_PRESET_CAMPAIGNS: CampaignSetupConfig[] = [
  {
    id: 'campaign-test-2026',
    campaign_name: 'Test',
    description: 'Medium scale face-to-face booth activation test setup.',
    scale_category: 'MEDIUM — H2H BOOTH',
    category_tag: 'H2H Booth',
    team: 'KPV',
    status: 'draft',
    campaign_date_start: '2026-10-31',
    campaign_date_end: '2026-10-31',
    data_update_on: '2026-10-14',
    location: 'Testtt',
    same_period_backward_start: '2026-10-30',
    same_period_backward_end: '2026-10-30',
    condition_type: 'amount_gte',
    condition_operator: '>=',
    condition_value: 500000,
    condition_label: 'Buy trans >= 500k',
    tx_type: 'BUY_GOLD',
    target_types: ['ec', 'nc'],
    ec_target: 0,
    nc_target: 0,
    plan_budget: 2800000000, // ₭2.8B
    total_spending_cost: 0,
    customers_actual: 0,
    customers_target: 0,
    new_cust_actual: 0,
    new_cust_target: 0,
    cpo_actual: 0,
    cpo_target: 0,
    cpa_actual: 0,
    cpa_target: 0,
    execution_status_label: 'Plan Pending (No Targets Set)',
    year: 2026,
    quarter: 'Q4',
  },
  {
    id: 'campaign-boatracing-2026',
    campaign_name: 'Boatracing',
    description: 'National scale traditional boat racing H2H customer booth activation.',
    scale_category: 'NATIONAL — H2H BOOTH',
    category_tag: 'National Event',
    team: 'KPV',
    status: 'draft',
    campaign_date_start: '2026-10-21',
    campaign_date_end: '2026-10-27',
    data_update_on: '2026-10-14',
    location: 'Watchan',
    same_period_backward_start: '2026-10-14',
    same_period_backward_end: '2026-10-20',
    condition_type: 'amount_gte',
    condition_operator: '>=',
    condition_value: 500000,
    condition_label: 'Buy trans >= 500k',
    tx_type: 'BUY_GOLD',
    target_types: ['ec', 'nc'],
    ec_target: 1731,
    nc_target: 200,
    plan_budget: 395700000, // ₭395.7M
    total_spending_cost: 0,
    customers_actual: 1731,
    customers_target: 1731,
    new_cust_actual: 0,
    new_cust_target: 0,
    cpo_actual: 0,
    cpo_target: 0,
    cpa_actual: 0,
    cpa_target: 0,
    execution_status_label: '100% Plan Execution (Auto-Default)',
    year: 2026,
    quarter: 'Q4',
  },
  {
    id: 'campaign-jom-jaeng-2026',
    campaign_name: 'ບຸນຊ່ວງເຮືອ ຈອມແຈ້ງ',
    description: 'Large outdoor community festival boat racing event.',
    scale_category: 'LARGE — EVENT (OUTDOOR)',
    category_tag: 'Outdoor Event',
    team: 'AGENCY',
    status: 'draft',
    campaign_date_start: '2026-10-14',
    campaign_date_end: '2026-10-18',
    data_update_on: '2026-10-14',
    location: 'ຈິ່ນາຍໂມ້',
    same_period_backward_start: '2026-10-09',
    same_period_backward_end: '2026-10-13',
    condition_type: 'amount_gte',
    condition_operator: '>=',
    condition_value: 500000,
    condition_label: 'Buy trans >= 500k',
    tx_type: 'BUY_GOLD',
    target_types: ['ec', 'nc'],
    ec_target: 0,
    nc_target: 0,
    plan_budget: 0,
    total_spending_cost: 0,
    customers_actual: 0,
    customers_target: 0,
    new_cust_actual: 0,
    new_cust_target: 0,
    cpo_actual: 0,
    cpo_target: 0,
    cpa_actual: 0,
    cpa_target: 0,
    execution_status_label: 'Plan Pending (No Targets Set)',
    year: 2026,
    quarter: 'Q4',
  },
  {
    id: 'campaign-lao-ecommerce-2026',
    campaign_name: 'Lao E-commerce',
    description: 'High-profile e-commerce symposium and panel discussion exhibition.',
    scale_category: 'MED/LARGE BOUNDARY — COMMUNITY/PANEL',
    category_tag: 'Community / Panel',
    team: 'KPV',
    status: 'completed',
    campaign_date_start: '2026-09-26',
    campaign_date_end: '2026-09-28',
    data_update_on: '2026-09-28',
    location: 'Landmark Riverside Hotel',
    same_period_backward_start: '2026-09-23',
    same_period_backward_end: '2026-09-25',
    condition_type: 'amount_gte',
    condition_operator: '>=',
    condition_value: 500000,
    condition_label: 'Buy trans >= 500k',
    tx_type: 'BUY_GOLD',
    target_types: ['ec', 'nc'],
    ec_target: 450,
    nc_target: 100,
    plan_budget: 72800000, // ₭72.8M
    total_spending_cost: 72800000, // ₭72.8M
    customers_actual: 450,
    customers_target: 450,
    new_cust_actual: 120,
    new_cust_target: 100,
    cpo_actual: 161777,
    cpo_target: 161777,
    cpa_actual: 606666,
    cpa_target: 728000,
    execution_status_label: '100% Plan Execution (Completed)',
    year: 2026,
    quarter: 'Q3',
  },
  {
    id: 'campaign-lao-digital-award-2026',
    campaign_name: 'Lao Digital Award',
    description: 'Annual digital awards sponsorship and marketing booth outreach.',
    scale_category: 'SMALL — SPONSORSHIP',
    category_tag: 'Sponsorship',
    team: 'AGENCY',
    status: 'completed',
    campaign_date_start: '2026-09-22',
    campaign_date_end: '2026-09-23',
    data_update_on: '2026-09-23',
    location: 'Don Chan Palace Hotel',
    same_period_backward_start: '2026-09-20',
    same_period_backward_end: '2026-09-21',
    condition_type: 'amount_gte',
    condition_operator: '>=',
    condition_value: 500000,
    condition_label: 'Buy trans >= 500k',
    tx_type: 'BUY_GOLD',
    target_types: ['ec', 'nc'],
    ec_target: 280,
    nc_target: 75,
    plan_budget: 39700000, // ₭39.7M
    total_spending_cost: 39700000, // ₭39.7M
    customers_actual: 280,
    customers_target: 250,
    new_cust_actual: 75,
    new_cust_target: 60,
    cpo_actual: 141785,
    cpo_target: 158800,
    cpa_actual: 529333,
    cpa_target: 661666,
    execution_status_label: '100% Plan Execution (Completed)',
    year: 2026,
    quarter: 'Q3',
  },
  {
    id: 'campaign-lao-wisdom-2026',
    campaign_name: 'Lao Wisdom',
    description: 'Cultural knowledge and investment community panel forum.',
    scale_category: 'MEDIUM — COMMUNITY/PANEL',
    category_tag: 'Community / Panel',
    team: 'KPV',
    status: 'completed',
    campaign_date_start: '2026-09-18',
    campaign_date_end: '2026-09-19',
    data_update_on: '2026-09-19',
    location: 'National Cultural Hall',
    same_period_backward_start: '2026-09-16',
    same_period_backward_end: '2026-09-17',
    condition_type: 'amount_gte',
    condition_operator: '>=',
    condition_value: 500000,
    condition_label: 'Buy trans >= 500k',
    tx_type: 'BUY_GOLD',
    target_types: ['ec', 'nc'],
    ec_target: 390,
    nc_target: 95,
    plan_budget: 51800000, // ₭51.8M
    total_spending_cost: 51800000, // ₭51.8M
    customers_actual: 390,
    customers_target: 350,
    new_cust_actual: 95,
    new_cust_target: 80,
    cpo_actual: 132820,
    cpo_target: 148000,
    cpa_actual: 545263,
    cpa_target: 647500,
    execution_status_label: '100% Plan Execution (Completed)',
    year: 2026,
    quarter: 'Q3',
  },
  {
    id: 'campaign-buy-500k-mega',
    campaign_name: 'Mega Buy Gold >= 500K Campaign (Excel Image 3)',
    description: 'Long-term volume driver incentivizing transactions of 500,000 LAK and above.',
    scale_category: 'NATIONAL — VOLUME DRIVER',
    category_tag: 'Volume Driver',
    team: 'KPV',
    status: 'active',
    image_url: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=150&auto=format&fit=crop&q=80',
    campaign_date_start: '2026-08-24',
    campaign_date_end: '2026-12-25',
    data_update_on: '2026-10-14',
    location: 'Vientiane HQ & All Branches',
    auto_sync_max_date: true,
    same_period_backward_start: '2026-07-03',
    same_period_backward_end: '2026-08-23',
    condition_type: 'amount_gte',
    condition_operator: '>=',
    condition_value: 500000,
    condition_label: 'Buy trans >= 500k',
    tx_type: 'BUY_GOLD',
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
    execution_status_label: '42% Plan Execution In Progress',
    year: 2026,
    quarter: 'Q4',
  },
  {
    id: 'campaign-buy-2g-sprint',
    campaign_name: 'Q3 Gold Rush >= 2.0g (Excel Image 4)',
    description: '11-day high-weight sprint promotion comparing against normal Q3 baseline run rate.',
    scale_category: 'MEDIUM — SPRINT PROMO',
    category_tag: 'Sprint Promo',
    team: 'KPV',
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1624365168968-f283b5bfa082?w=150&auto=format&fit=crop&q=80',
    campaign_date_start: '2026-07-13',
    campaign_date_end: '2026-07-23',
    data_update_on: '2026-07-23',
    location: 'Nationwide App & Branches',
    auto_sync_max_date: false,
    same_period_backward_start: '2026-07-02',
    same_period_backward_end: '2026-07-12',
    condition_type: 'weight_gte',
    condition_operator: '>=',
    condition_value: 2.0,
    condition_label: 'Buy trans >= 2g',
    tx_type: 'BUY_GOLD',
    target_types: ['ec', 'nc'],
    ec_target: 12800,
    nc_target: 1200,
    plan_budget: 250000000,
    total_spending_cost: 245000000,
    customers_actual: 12800,
    customers_target: 12800,
    new_cust_actual: 1200,
    new_cust_target: 1200,
    baseline_daily_rr: 79.0, // Avg Normal RR of Q3 per Day from Image 4
    execution_status_label: '100% Plan Execution (Target Achieved)',
    year: 2026,
    quarter: 'Q3',
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
        return data.map((d: any) => ({
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
          customers_actual: d.customers_actual !== undefined ? Number(d.customers_actual) : undefined,
          customers_target: d.customers_target !== undefined ? Number(d.customers_target) : undefined,
          new_cust_actual: d.new_cust_actual !== undefined ? Number(d.new_cust_actual) : undefined,
          new_cust_target: d.new_cust_target !== undefined ? Number(d.new_cust_target) : undefined,
          cpo_actual: d.cpo_actual !== undefined ? Number(d.cpo_actual) : undefined,
          cpo_target: d.cpo_target !== undefined ? Number(d.cpo_target) : undefined,
          cpa_actual: d.cpa_actual !== undefined ? Number(d.cpa_actual) : undefined,
          cpa_target: d.cpa_target !== undefined ? Number(d.cpa_target) : undefined,
          execution_status_label: d.execution_status_label,
          year: d.year || 2026,
          quarter: d.quarter || 'Q4',
        }));
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
          return parsed;
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

export async function saveCampaignSetup(campaign: CampaignSetupConfig, userId?: string): Promise<CampaignSetupConfig> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const toSave: CampaignSetupConfig = {
    ...campaign,
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
        target_types: toSave.target_types,
        ec_target: toSave.ec_target,
        nc_target: toSave.nc_target,
        revenue_target_mil: toSave.revenue_target_mil,
        gold_weight_target_g: toSave.gold_weight_target_g,
        baseline_daily_rr: toSave.baseline_daily_rr,
        status: toSave.status || 'active',
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('campaign_setups')
        .upsert(dbPayload)
        .select()
        .single();

      if (!error && data) {
        toSave.id = data.id;
      }
    } catch (err) {
      console.warn('Could not upsert campaign in Supabase:', err);
    }
  }

  // Update local storage
  if (typeof window !== 'undefined') {
    const existing = await loadCampaignSetups(userId);
    const index = existing.findIndex((c) => c.id === toSave.id);
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
