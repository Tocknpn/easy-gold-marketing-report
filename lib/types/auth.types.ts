export type AppRole = 'admin' | 'operations_manager' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: AppRole;
  avatar_url?: string;
}

export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDemoUser: boolean;
}
