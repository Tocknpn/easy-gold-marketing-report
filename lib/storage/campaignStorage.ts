import { CampaignSetupConfig } from '@/lib/types/campaign.types';
import { createClient } from '@/lib/supabase/client';

const LOCAL_STORAGE_CAMPAIGNS_KEY = 'easy_gold_saved_campaign_setups_v2';

export const INITIAL_PRESET_CAMPAIGNS: CampaignSetupConfig[] = [
  {
    id: 'campaign-buy-500k-mega',
    campaign_name: 'Mega Buy Gold >= 500K Campaign (Excel Image 3)',
    description: 'Long-term volume driver incentivizing transactions of 500,000 LAK and above.',
    category_tag: 'Volume Driver',
    image_url: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=150&auto=format&fit=crop&q=80',
    campaign_date_start: '2026-08-24',
    campaign_date_end: '2026-12-25',
    data_update_on: '2026-10-14',
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
    status: 'active',
  },
  {
    id: 'campaign-buy-2g-sprint',
    campaign_name: 'Q3 Gold Rush >= 2.0g (Excel Image 4)',
    description: '11-day high-weight sprint promotion comparing against normal Q3 baseline run rate.',
    category_tag: 'Sprint Promo',
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
    target_types: ['ec', 'nc'],
    ec_target: 12800,
    nc_target: 1200,
    baseline_daily_rr: 79.0, // Avg Normal RR of Q3 per Day from Image 4
    status: 'completed',
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
