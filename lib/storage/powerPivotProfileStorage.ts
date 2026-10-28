import { createClient, getSupabaseConfig } from '@/lib/supabase/client';
import {
  PowerPivotConfig,
  PowerPivotProfile,
  newFilterId,
} from '@/lib/types/powerPivot.types';

const LS_PROFILES = 'easy_gold_power_pivot_profiles_v2';
const LS_ACTIVE = 'easy_gold_power_pivot_active_profile_v2';
const LS_FAV_PRESETS = 'easy_gold_power_pivot_fav_presets_v2';
const LS_HIDDEN_PRESETS = 'easy_gold_power_pivot_hidden_presets_v2';

const nowIso = () => new Date().toISOString();

function getFavPresets(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LS_FAV_PRESETS) || '[]');
  } catch {
    return [];
  }
}

function setFavPresets(ids: string[]) {
  if (typeof window !== 'undefined') localStorage.setItem(LS_FAV_PRESETS, JSON.stringify(ids));
}

function getHiddenPresets(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LS_HIDDEN_PRESETS) || '[]');
  } catch {
    return [];
  }
}

function setHiddenPresets(ids: string[]) {
  if (typeof window !== 'undefined') localStorage.setItem(LS_HIDDEN_PRESETS, JSON.stringify(ids));
}

function tx(op: '=' | '>=', value: string, field = 'transaction_type') {
  return { id: newFilterId(), scope: 'row' as const, field, op, value, enabled: true };
}

function statusOk() {
  return { id: newFilterId(), scope: 'row' as const, field: 'status', op: '=' as const, value: 'ສໍາເລັດ', enabled: true };
}

function preset(
  id: string,
  name: string,
  description: string,
  config: Partial<PowerPivotConfig>
): PowerPivotProfile {
  return {
    id,
    name,
    description,
    isFavorite: false,
    isPreset: true,
    useCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    config: {
      rows: [],
      columns: [],
      values: [],
      filters: [statusOk()],
      customMeasures: [],
      sortBy: 'label',
      sortDir: 'desc',
      pageSize: 500,
      topN: null,
      ...config,
    },
  };
}

export const PRESET_PROFILES: PowerPivotProfile[] = [
  preset('preset-monthly-audit', 'Monthly Audit & Date Verification', 'Monthly breakdown with Min Datetime, Max Datetime, and Transaction Counts', {
    rows: ['month'],
    values: ['total_transaction', 'total_buy_transac', 'revenue_buy_mil', 'gold_weight_buy_g', 'min_datetime', 'max_datetime'],
    filters: [statusOk()],
    sortBy: 'month',
    sortDir: 'desc',
  }),
  preset('preset-daily-buy', 'Daily Buy Activity (Excel Image 1)', 'Daily breakdown of BUY_GOLD transactions >= 500K with timestamps', {
    rows: ['date'],
    values: ['total_buy_transac', 'total_unique_user', 'revenue_buy_mil', 'gold_weight_buy_g', 'min_datetime', 'max_datetime'],
    filters: [statusOk(), tx('>=', '500000', 'total_amount')],
    sortBy: 'date',
    sortDir: 'desc',
  }),
  preset('preset-bank-buy', 'Banking Gateway - Buy Summary', 'Buy performance per banking gateway', {
    rows: ['bank'],
    values: ['total_buy_transac', 'total_unique_user', 'revenue_buy_mil', 'gold_weight_buy_g', 'gold_buy_size_g'],
    filters: [statusOk()],
    sortBy: 'total_buy_transac',
  }),
  preset('preset-customer-leaders', 'Top Customers (Buy Leaderboard)', 'Top 100 Phone & customer ranked by buy value & weight', {
    rows: ['phone_customer'],
    values: ['total_buy_transac', 'revenue_buy_mil', 'gold_weight_buy_g', 'gold_buy_size_g'],
    filters: [statusOk()],
    sortBy: 'revenue_buy_mil',
    pageSize: 100,
    topN: 100,
  }),
  preset('preset-top-withdraw-leaders', 'Top Customers (Withdraw Leaderboard)', 'Top 50 Customers ranked by Total Withdraw Weight (g) & Withdraw Transactions', {
    rows: ['phone_customer'],
    values: ['withdraw_gold_g', 'withdraw_gold_15g', 'withdraw_trans', 'withdraw_value_mil'],
    filters: [statusOk()],
    sortBy: 'withdraw_gold_g',
    pageSize: 50,
    topN: 50,
  }),
  preset('preset-net-flow-week', 'Weekly Buy vs Sell Net Flow', 'ISO week trend: buy vs sell, net flow %, ABS value', {
    rows: ['week'],
    values: [
      'total_buy_transac', 'total_sell_transac', 'net_flow_trans',
      'revenue_buy_mil', 'revenue_sell_mil', 'abs_value_mil', 'net_flow_value',
    ],
    filters: [statusOk()],
    sortBy: 'week',
    sortDir: 'desc',
  }),
  preset('preset-bank-by-month', 'Bank x Month (Cross-tab)', 'Revenue Buy per bank, month across columns', {
    rows: ['bank'],
    columns: ['month'],
    values: ['revenue_buy_mil', 'total_buy_transac'],
    filters: [statusOk()],
    sortBy: 'revenue_buy_mil',
  }),
  preset('preset-weight-band', 'Ticket Size Bands by Transaction Type', 'Weight band rows, transaction type columns', {
    rows: ['weight_band'],
    columns: ['transaction_type'],
    values: ['total_transaction', 'total_unique_user'],
    filters: [statusOk()],
    sortBy: 'weight_band',
    sortDir: 'asc',
  }),
];

function readLocal(): PowerPivotProfile[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_PROFILES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PowerPivotProfile[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(list: PowerPivotProfile[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_PROFILES, JSON.stringify(list.filter((p) => !p.isPreset)));
}

function supabaseReady(): boolean {
  const { url } = getSupabaseConfig();
  return !!url && !url.includes('placeholder');
}

function fromRow(r: any): PowerPivotProfile {
  return {
    id: r.id,
    name: r.profile_name,
    description: r.description || undefined,
    config: r.config,
    isFavorite: !!r.is_favorite,
    lastUsedAt: r.last_used_at || undefined,
    useCount: r.use_count || 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Presets + local profiles + (best effort) Supabase profiles, newest first */
export async function loadPowerPivotProfiles(userId?: string): Promise<PowerPivotProfile[]> {
  const local = readLocal();
  const byId = new Map<string, PowerPivotProfile>();
  local.forEach((p) => byId.set(p.id, p));

  if (supabaseReady()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('power_pivot_profiles')
        .select('*')
        .order('updated_at', { ascending: false });
      if (!error && data) {
        data.forEach((r: any) => {
          const remote = fromRow(r);
          const mine = byId.get(remote.id);
          if (!mine || new Date(remote.updatedAt) >= new Date(mine.updatedAt)) byId.set(remote.id, remote);
        });
      }
    } catch (err) {
      console.warn('Could not load pivot profiles from Supabase (using local):', err);
    }
  }

  const favPresets = new Set(getFavPresets());
  const hiddenPresets = new Set(getHiddenPresets());

  const activePresets = PRESET_PROFILES
    .filter((p) => !hiddenPresets.has(p.id))
    .map((p) => ({ ...p, isFavorite: favPresets.has(p.id) }));

  const saved = Array.from(byId.values()).sort(
    (a, b) => Number(b.isFavorite) - Number(a.isFavorite) || +new Date(b.updatedAt) - +new Date(a.updatedAt)
  );
  return [...saved, ...activePresets];
}

export async function savePowerPivotProfile(
  profile: PowerPivotProfile,
  userId?: string
): Promise<PowerPivotProfile> {
  if (profile.isPreset) {
    const favs = new Set(getFavPresets());
    if (profile.isFavorite) {
      favs.add(profile.id);
    } else {
      favs.delete(profile.id);
    }
    setFavPresets(Array.from(favs));
    return profile;
  }

  const toSave: PowerPivotProfile = { ...profile, isPreset: false, updatedAt: nowIso() };

  const local = readLocal().filter((p) => p.id !== toSave.id);
  writeLocal([toSave, ...local]);

  if (supabaseReady()) {
    try {
      const supabase = createClient();
      await supabase.from('power_pivot_profiles').upsert({
        id: toSave.id,
        user_id: userId || null,
        profile_name: toSave.name,
        description: toSave.description || null,
        config: toSave.config,
        is_favorite: toSave.isFavorite,
        last_used_at: toSave.lastUsedAt || null,
        use_count: toSave.useCount,
        updated_at: toSave.updatedAt,
      });
    } catch (err) {
      console.warn('Could not sync pivot profile to Supabase (saved locally):', err);
    }
  }
  return toSave;
}

export async function deletePowerPivotProfile(id: string): Promise<void> {
  if (id.startsWith('preset-')) {
    const hidden = new Set(getHiddenPresets());
    hidden.add(id);
    setHiddenPresets(Array.from(hidden));
    return;
  }

  writeLocal(readLocal().filter((p) => p.id !== id));
  if (supabaseReady()) {
    try {
      await createClient().from('power_pivot_profiles').delete().eq('id', id);
    } catch (err) {
      console.warn('Could not delete pivot profile in Supabase:', err);
    }
  }
}

export function getActiveProfileId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LS_ACTIVE);
}

export function setActiveProfileId(id: string) {
  if (typeof window !== 'undefined') localStorage.setItem(LS_ACTIVE, id);
}

export function makeProfileId(): string {
  return `ppp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
