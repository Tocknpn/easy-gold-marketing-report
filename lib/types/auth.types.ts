export type AppRole = 'admin' | 'operations_manager' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: AppRole;
  avatar_url?: string;
  assigned_profiles?: string[]; // IDs of reporting profiles this user has access to
  status?: 'active' | 'suspended' | 'invited';
  created_at?: string;
  last_sign_in_at?: string;
}

export interface AdminUserRecord extends UserProfile {
  reporting_profiles_count?: number;
  profiles_summary?: {
    id: string;
    name: string;
  }[];
}

export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDemoUser: boolean;
}

export interface CreateUserInput {
  email: string;
  password?: string;
  full_name: string;
  role: AppRole;
  assigned_profiles?: string[];
}

export interface UpdateUserInput {
  id: string;
  full_name?: string;
  role?: AppRole;
  assigned_profiles?: string[];
  status?: 'active' | 'suspended' | 'invited';
  password?: string;
}
