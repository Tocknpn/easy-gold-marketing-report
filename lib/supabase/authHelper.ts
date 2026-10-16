import { createClient } from './client';
import { UserProfile, AdminUserRecord, CreateUserInput, UpdateUserInput } from '@/lib/types/auth.types';

const DEMO_USER_KEY = 'easy_gold_auth_demo_user';
const DEMO_USERS_LIST_KEY = 'easy_gold_admin_users_directory_v1';

export const DEFAULT_DEMO_USER: UserProfile = {
  id: 'usr-easygold-demo-admin',
  email: 'director@easygold.la',
  full_name: 'Operations Director',
  role: 'admin',
  assigned_profiles: ['profile-daily-buy-summary', 'profile-customer-gold-volume', 'profile-bank-performance'],
  status: 'active',
  created_at: '2026-01-15T08:00:00Z',
  last_sign_in_at: '2026-10-16T05:20:00Z',
};

export const INITIAL_DEMO_USERS: AdminUserRecord[] = [
  {
    id: 'usr-easygold-demo-admin',
    email: 'director@easygold.la',
    full_name: 'Operations Director (Admin)',
    role: 'admin',
    assigned_profiles: ['profile-daily-buy-summary', 'profile-customer-gold-volume', 'profile-bank-performance'],
    status: 'active',
    created_at: '2026-01-15T08:00:00Z',
    last_sign_in_at: '2026-10-16T05:20:00Z',
    reporting_profiles_count: 5,
  },
  {
    id: 'usr-marketing-manager',
    email: 'manager@easygold.la',
    full_name: 'Marketing Campaign Lead',
    role: 'operations_manager',
    assigned_profiles: ['profile-daily-buy-summary', 'profile-bank-performance'],
    status: 'active',
    created_at: '2026-03-01T09:30:00Z',
    last_sign_in_at: '2026-10-15T14:10:00Z',
    reporting_profiles_count: 3,
  },
  {
    id: 'usr-bi-analyst',
    email: 'analyst@easygold.la',
    full_name: 'Senior BI & Data Analyst',
    role: 'operations_manager',
    assigned_profiles: ['profile-daily-buy-summary', 'profile-customer-gold-volume'],
    status: 'active',
    created_at: '2026-05-10T11:00:00Z',
    last_sign_in_at: '2026-10-14T18:45:00Z',
    reporting_profiles_count: 4,
  },
  {
    id: 'usr-branch-auditor',
    email: 'auditor@easygold.la',
    full_name: 'Branch Compliance Auditor',
    role: 'viewer',
    assigned_profiles: ['profile-bank-performance'],
    status: 'active',
    created_at: '2026-08-20T10:15:00Z',
    last_sign_in_at: '2026-10-12T09:30:00Z',
    reporting_profiles_count: 1,
  },
];

export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Try fetching rich profile from public.profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        return {
          id: user.id,
          email: user.email || 'user@easygold.la',
          full_name: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0],
          role: profile?.role || (user.user_metadata?.role as any) || 'admin',
          assigned_profiles: profile?.assigned_profiles || ['profile-daily-buy-summary'],
          status: profile?.status || 'active',
          created_at: profile?.created_at || user.created_at,
          last_sign_in_at: user.last_sign_in_at,
        };
      }
    } catch (err) {
      console.warn('Error reading supabase user:', err);
    }
  }

  // Fallback to local storage demo session
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(DEMO_USER_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return DEFAULT_DEMO_USER;
      }
    }
    // Default to initial logged-in demo user so user can immediately use saved profiles
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(DEFAULT_DEMO_USER));
    return DEFAULT_DEMO_USER;
  }

  return DEFAULT_DEMO_USER;
}

export async function signIn(email: string, password: string): Promise<{ user: UserProfile | null; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { user: null, error: error.message };
      }
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const userProfile: UserProfile = {
          id: data.user.id,
          email: data.user.email || email,
          full_name: profile?.full_name || data.user.user_metadata?.full_name || email.split('@')[0],
          role: profile?.role || (data.user.user_metadata?.role as any) || 'admin',
          assigned_profiles: profile?.assigned_profiles || ['profile-daily-buy-summary'],
          status: profile?.status || 'active',
          last_sign_in_at: data.user.last_sign_in_at,
        };
        return { user: userProfile };
      }
    } catch (err: any) {
      return { user: null, error: err.message || 'Login failed' };
    }
  }

  // Fallback demo authentication: find or create in demo users list
  let allDemo = getStoredDemoUsers();
  const cleanEmail = email.trim().toLowerCase();
  let existing = allDemo.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!existing) {
    const isAdmin = cleanEmail.includes('admin') || cleanEmail.includes('director');
    existing = {
      id: `usr-${Date.now()}`,
      email: cleanEmail,
      full_name: cleanEmail.split('@')[0].toUpperCase(),
      role: isAdmin ? 'admin' : 'operations_manager',
      assigned_profiles: ['profile-daily-buy-summary'],
      status: 'active',
      created_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      reporting_profiles_count: 1,
    };
    allDemo.unshift(existing);
    saveStoredDemoUsers(allDemo);
  } else {
    existing.last_sign_in_at = new Date().toISOString();
    saveStoredDemoUsers(allDemo);
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(existing));
  }

  return { user: existing };
}

export async function signUp(email: string, password: string): Promise<{ user: UserProfile | null; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: email.split('@')[0],
            role: 'operations_manager',
          },
        },
      });
      if (error) {
        return { user: null, error: error.message };
      }
      if (data.user) {
        const profile: UserProfile = {
          id: data.user.id,
          email: data.user.email || email,
          full_name: email.split('@')[0],
          role: 'operations_manager',
          assigned_profiles: ['profile-daily-buy-summary'],
          status: 'active',
        };
        return { user: profile };
      }
    } catch (err: any) {
      return { user: null, error: err.message || 'Sign up failed' };
    }
  }

  // Fallback demo sign up
  const profile: UserProfile = {
    id: `usr-${Date.now()}`,
    email: email.trim().toLowerCase(),
    full_name: email.split('@')[0].toUpperCase(),
    role: 'operations_manager',
    assigned_profiles: ['profile-daily-buy-summary'],
    status: 'active',
    created_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
  };

  const allDemo = getStoredDemoUsers();
  allDemo.unshift({ ...profile, reporting_profiles_count: 1 });
  saveStoredDemoUsers(allDemo);

  if (typeof window !== 'undefined') {
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(profile));
  }

  return { user: profile };
}

export async function signOut(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Signout error:', e);
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEMO_USER_KEY);
  }
}

// -------------------------------------------------------------
// ADMIN USER MANAGEMENT METHODS
// -------------------------------------------------------------

function getStoredDemoUsers(): AdminUserRecord[] {
  if (typeof window === 'undefined') return INITIAL_DEMO_USERS;
  try {
    const raw = localStorage.getItem(DEMO_USERS_LIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [...INITIAL_DEMO_USERS];
}

function saveStoredDemoUsers(users: AdminUserRecord[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DEMO_USERS_LIST_KEY, JSON.stringify(users));
  }
}

export async function listAdminUsers(): Promise<{ users: AdminUserRecord[]; source: 'supabase' | 'local' }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped: AdminUserRecord[] = data.map((p: any) => ({
          id: p.id,
          email: p.email,
          full_name: p.full_name || p.email.split('@')[0],
          role: p.role,
          assigned_profiles: p.assigned_profiles || [],
          status: p.status || 'active',
          created_at: p.created_at,
          last_sign_in_at: p.last_sign_in_at,
          reporting_profiles_count: Array.isArray(p.assigned_profiles) ? p.assigned_profiles.length : 0,
        }));
        return { users: mapped, source: 'supabase' };
      }
    } catch (err) {
      console.warn('Error reading profiles from Supabase, falling back to local store:', err);
    }
  }

  return { users: getStoredDemoUsers(), source: 'local' };
}

export async function createAdminUser(input: CreateUserInput): Promise<{ user: AdminUserRecord; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createClient();
      // First create user via auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: input.email,
        password: input.password || 'EasyGold2026!',
        options: {
          data: {
            full_name: input.full_name,
            role: input.role,
          },
        },
      });

      if (authError) {
        return { user: null as any, error: authError.message };
      }

      const newUserId = authData.user?.id || `usr-${Date.now()}`;

      // Insert/update public.profiles
      await supabase.from('profiles').upsert({
        id: newUserId,
        email: input.email,
        full_name: input.full_name,
        role: input.role,
        assigned_profiles: input.assigned_profiles || ['profile-daily-buy-summary'],
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const userRecord: AdminUserRecord = {
        id: newUserId,
        email: input.email,
        full_name: input.full_name,
        role: input.role,
        assigned_profiles: input.assigned_profiles || ['profile-daily-buy-summary'],
        status: 'active',
        created_at: new Date().toISOString(),
        reporting_profiles_count: (input.assigned_profiles || []).length,
      };

      return { user: userRecord };
    } catch (err: any) {
      console.warn('Supabase create user error:', err);
    }
  }

  // Local demo fallback
  const allDemo = getStoredDemoUsers();
  const existing = allDemo.find((u) => u.email.toLowerCase() === input.email.toLowerCase());
  if (existing) {
    return { user: null as any, error: 'User with this email already exists.' };
  }

  const newUser: AdminUserRecord = {
    id: `usr-${Date.now()}`,
    email: input.email.trim().toLowerCase(),
    full_name: input.full_name,
    role: input.role,
    assigned_profiles: input.assigned_profiles || ['profile-daily-buy-summary'],
    status: 'active',
    created_at: new Date().toISOString(),
    reporting_profiles_count: (input.assigned_profiles || []).length,
  };

  allDemo.unshift(newUser);
  saveStoredDemoUsers(allDemo);
  return { user: newUser };
}

export async function updateAdminUser(input: UpdateUserInput): Promise<{ success: boolean; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createClient();
      const updates: any = {
        updated_at: new Date().toISOString(),
      };
      if (input.full_name) updates.full_name = input.full_name;
      if (input.role) updates.role = input.role;
      if (input.assigned_profiles) updates.assigned_profiles = input.assigned_profiles;
      if (input.status) updates.status = input.status;

      const { error } = await supabase.from('profiles').update(updates).eq('id', input.id);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.warn('Supabase update user error:', err);
    }
  }

  // Local demo fallback
  const allDemo = getStoredDemoUsers();
  const index = allDemo.findIndex((u) => u.id === input.id);
  if (index >= 0) {
    allDemo[index] = {
      ...allDemo[index],
      full_name: input.full_name ?? allDemo[index].full_name,
      role: input.role ?? allDemo[index].role,
      assigned_profiles: input.assigned_profiles ?? allDemo[index].assigned_profiles,
      status: input.status ?? allDemo[index].status,
      reporting_profiles_count: (input.assigned_profiles ?? allDemo[index].assigned_profiles ?? []).length,
    };
    saveStoredDemoUsers(allDemo);
    return { success: true };
  }

  return { success: false, error: 'User not found' };
}

export async function deleteAdminUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.warn('Supabase delete user error:', err);
    }
  }

  // Local demo fallback
  const allDemo = getStoredDemoUsers();
  const filtered = allDemo.filter((u) => u.id !== userId);
  saveStoredDemoUsers(filtered);
  return { success: true };
}
