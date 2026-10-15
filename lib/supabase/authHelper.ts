import { createClient } from './client';
import { UserProfile } from '@/lib/types/auth.types';

const DEMO_USER_KEY = 'easy_gold_auth_demo_user';

export const DEFAULT_DEMO_USER: UserProfile = {
  id: 'usr-easygold-demo-admin',
  email: 'director@easygold.la',
  full_name: 'Operations Director',
  role: 'admin',
};

export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        return {
          id: user.id,
          email: user.email || 'user@easygold.la',
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
          role: (user.user_metadata?.role as any) || 'admin',
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
        const profile: UserProfile = {
          id: data.user.id,
          email: data.user.email || email,
          full_name: data.user.user_metadata?.full_name || email.split('@')[0],
          role: (data.user.user_metadata?.role as any) || 'admin',
        };
        return { user: profile };
      }
    } catch (err: any) {
      return { user: null, error: err.message || 'Login failed' };
    }
  }

  // Fallback demo authentication
  const profile: UserProfile = {
    id: `usr-${Date.now()}`,
    email: email.trim().toLowerCase(),
    full_name: email.split('@')[0].toUpperCase(),
    role: email.includes('admin') || email.includes('director') ? 'admin' : 'operations_manager',
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(profile));
  }

  return { user: profile };
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
  };

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
