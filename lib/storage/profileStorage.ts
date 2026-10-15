import { SavedReportingProfile, PivotSlicerState } from '@/lib/types/pivotReport.types';
import { createClient } from '@/lib/supabase/client';

const LOCAL_STORAGE_PROFILES_KEY = 'easy_gold_saved_reporting_profiles';

export const DEFAULT_PIVOT_SLICERS: PivotSlicerState = {
  month: 'all',
  tx_type: 'BUY_GOLD',
  is_500k_up: 'yes',
  is_2g_up: 'all',
  is_3_75g_up: 'all',
  is_15g_up: 'all',
  status: 'all',
  day_num: 'all',
  bank: 'all',
};

export const INITIAL_PRESET_PROFILES: SavedReportingProfile[] = [
  {
    id: 'profile-daily-buy-summary',
    profile_name: 'Daily Buy Activity (Excel Image 1)',
    description: 'Daily trend of Buy transactions, revenue in mil LAK, gold weight, ticket size, and new customers with 500k+ filter.',
    row_dimension: 'date',
    selected_metrics: [
      'total_buy_transac',
      'total_unique_user',
      'revenue_buy_mil_lak',
      'gold_weight_buy_g',
      'gold_buy_size_g',
      'total_nc',
    ],
    slicers: {
      ...DEFAULT_PIVOT_SLICERS,
      month: 'all',
      tx_type: 'BUY_GOLD',
      is_500k_up: 'yes',
      status: 'all',
    },
    is_default: true,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-10-15T00:00:00Z',
  },
  {
    id: 'profile-customer-gold-volume',
    profile_name: 'Customer Gold Accumulation (Excel Image 2)',
    description: 'Customer Phone number and Name grouped pivot showing total gold grams accumulated and sum in Kip.',
    row_dimension: 'customer',
    selected_metrics: [
      'sum_gold_weight',
      'sum_amount_lak',
    ],
    slicers: {
      ...DEFAULT_PIVOT_SLICERS,
      month: 'all',
      tx_type: 'BUY_GOLD',
      is_500k_up: 'all',
      is_15g_up: 'all',
      status: 'all',
    },
    is_default: false,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-10-15T00:00:00Z',
  },
  {
    id: 'profile-bank-performance',
    profile_name: 'Banking Gateway Flow (BCEL/LDB/JDB)',
    description: 'Bank payment channel breakdown with transaction volume, total weight, and revenue share.',
    row_dimension: 'bank',
    selected_metrics: [
      'total_buy_transac',
      'total_unique_user',
      'revenue_buy_mil_lak',
      'gold_weight_buy_g',
      'gold_buy_size_g',
    ],
    slicers: {
      ...DEFAULT_PIVOT_SLICERS,
      month: 'all',
      tx_type: 'all',
      is_500k_up: 'all',
    },
    is_default: false,
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-10-15T00:00:00Z',
  },
];

export async function loadReportingProfiles(userId?: string): Promise<SavedReportingProfile[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createClient();
      let query = supabase.from('user_reporting_profiles').select('*').order('created_at', { ascending: false });
      if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as SavedReportingProfile[];
      }
    } catch (err) {
      console.warn('Could not load profiles from Supabase, using local cache:', err);
    }
  }

  // Local storage fallback
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_STORAGE_PROFILES_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.warn('Failed parsing local profiles:', e);
      }
    }
    // Initialize with presets
    localStorage.setItem(LOCAL_STORAGE_PROFILES_KEY, JSON.stringify(INITIAL_PRESET_PROFILES));
    return INITIAL_PRESET_PROFILES;
  }

  return INITIAL_PRESET_PROFILES;
}

export async function saveReportingProfile(profile: SavedReportingProfile, userId?: string): Promise<SavedReportingProfile> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const toSave: SavedReportingProfile = {
    ...profile,
    user_id: userId || profile.user_id,
    updated_at: new Date().toISOString(),
  };

  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('user_reporting_profiles')
        .upsert({
          id: toSave.id,
          user_id: toSave.user_id,
          profile_name: toSave.profile_name,
          description: toSave.description,
          row_dimension: toSave.row_dimension,
          selected_metrics: toSave.selected_metrics,
          slicers: toSave.slicers,
          is_default: toSave.is_default || false,
          updated_at: toSave.updated_at,
        })
        .select()
        .single();

      if (!error && data) {
        toSave.id = data.id;
      }
    } catch (err) {
      console.warn('Could not upsert profile in Supabase:', err);
    }
  }

  // Update local storage
  if (typeof window !== 'undefined') {
    const existing = await loadReportingProfiles(userId);
    const index = existing.findIndex((p) => p.id === toSave.id);
    let updated: SavedReportingProfile[];
    if (index >= 0) {
      updated = [...existing];
      updated[index] = toSave;
    } else {
      updated = [toSave, ...existing];
    }
    localStorage.setItem(LOCAL_STORAGE_PROFILES_KEY, JSON.stringify(updated));
  }

  return toSave;
}

export async function deleteReportingProfile(profileId: string, userId?: string): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createClient();
      await supabase.from('user_reporting_profiles').delete().eq('id', profileId);
    } catch (err) {
      console.warn('Could not delete profile in Supabase:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const existing = await loadReportingProfiles(userId);
    const filtered = existing.filter((p) => p.id !== profileId);
    localStorage.setItem(LOCAL_STORAGE_PROFILES_KEY, JSON.stringify(filtered));
  }
}
