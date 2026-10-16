import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AdminUserRecord } from '@/lib/types/auth.types';

export const runtime = 'edge';

const FALLBACK_USERS: AdminUserRecord[] = [
  {
    id: 'usr-easygold-demo-admin',
    email: 'director@easygold.la',
    full_name: 'Operations Director',
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

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      const supabase = createServerSupabaseClient();
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const users: AdminUserRecord[] = data.map((p: any) => ({
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

        return NextResponse.json({ success: true, users, source: 'supabase' });
      }
    }
  } catch (err: any) {
    console.error('Error in GET /api/admin/users:', err);
  }

  return NextResponse.json({ success: true, users: FALLBACK_USERS, source: 'fallback' });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, full_name, role, assigned_profiles, password } = body;

    if (!email || !full_name) {
      return NextResponse.json({ success: false, error: 'Email and full name are required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      const supabase = createServerSupabaseClient();
      
      // Sign up or insert
      const { data: authUser, error: authError } = await supabase.auth.signUp({
        email,
        password: password || 'EasyGold2026!',
        options: {
          data: { full_name, role: role || 'operations_manager' },
        },
      });

      if (authError) {
        return NextResponse.json({ success: false, error: authError.message }, { status: 400 });
      }

      const userId = authUser.user?.id || `usr-${Date.now()}`;

      await supabase.from('profiles').upsert({
        id: userId,
        email,
        full_name,
        role: role || 'operations_manager',
        assigned_profiles: assigned_profiles || ['profile-daily-buy-summary'],
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        user: {
          id: userId,
          email,
          full_name,
          role: role || 'operations_manager',
          assigned_profiles: assigned_profiles || ['profile-daily-buy-summary'],
          status: 'active',
          created_at: new Date().toISOString(),
        },
      });
    }

    // Mock response
    const newUser: AdminUserRecord = {
      id: `usr-${Date.now()}`,
      email,
      full_name,
      role: role || 'operations_manager',
      assigned_profiles: assigned_profiles || ['profile-daily-buy-summary'],
      status: 'active',
      created_at: new Date().toISOString(),
      reporting_profiles_count: (assigned_profiles || []).length,
    };

    return NextResponse.json({ success: true, user: newUser });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, full_name, role, assigned_profiles, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      const supabase = createServerSupabaseClient();
      const updates: any = { updated_at: new Date().toISOString() };
      if (full_name !== undefined) updates.full_name = full_name;
      if (role !== undefined) updates.role = role;
      if (assigned_profiles !== undefined) updates.assigned_profiles = assigned_profiles;
      if (status !== undefined) updates.status = status;

      const { error } = await supabase.from('profiles').update(updates).eq('id', id);
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      const supabase = createServerSupabaseClient();
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to delete user' }, { status: 500 });
  }
}
