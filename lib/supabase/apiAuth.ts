import { createServerSupabaseClient } from './server';
import type { AppRole } from '@/lib/types/auth.types';

type RoleCheckResult =
  | { ok: true; userId: string; role: AppRole }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Server-side only. Verifies the caller's Supabase session (from cookies) and
 * checks their role in public.profiles - never trust a role sent by the client.
 */
export async function requireRole(allowedRoles: AppRole[]): Promise<RoleCheckResult> {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: 'Authentication required' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single();

  if (!profile || profile.status !== 'active' || !allowedRoles.includes(profile.role)) {
    return { ok: false, status: 403, error: 'Insufficient permissions' };
  }

  return { ok: true, userId: user.id, role: profile.role as AppRole };
}
