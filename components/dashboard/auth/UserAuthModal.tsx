'use client';

import React, { useState } from 'react';
import { UserProfile } from '@/lib/types/auth.types';
import { signIn, signUp, signOut, DEFAULT_DEMO_USER } from '@/lib/supabase/authHelper';
import { 
  X, 
  Lock, 
  Mail, 
  User, 
  ShieldCheck, 
  LogOut, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Crown,
  Sliders,
  Database,
  Layers
} from 'lucide-react';

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onAuthChange: (user: UserProfile | null) => void;
  onOpenAdminModal?: () => void;
}

export function UserAuthModal({
  isOpen,
  onClose,
  currentUser,
  onAuthChange,
  onOpenAdminModal,
}: UserAuthModalProps) {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'signin') {
        const res = await signIn(email, password);
        if (res.error) {
          setErrorMsg(res.error);
        } else if (res.user) {
          setSuccessMsg(`Welcome back, ${res.user.full_name || res.user.email}!`);
          onAuthChange(res.user);
          setTimeout(() => onClose(), 600);
        }
      } else {
        const res = await signUp(email, password);
        if (res.error) {
          setErrorMsg(res.error);
        } else if (res.user) {
          setSuccessMsg(`Account created for ${res.user.email}!`);
          onAuthChange(res.user);
          setTimeout(() => onClose(), 600);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'admin' | 'manager') => {
    setLoading(true);
    const demoEmail = role === 'admin' ? 'director@easygold.la' : 'manager@easygold.la';
    const res = await signIn(demoEmail, 'EasyGold2026!');
    if (res.user) {
      onAuthChange(res.user);
      onClose();
    } else if (res.error) {
      setErrorMsg(res.error);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    onAuthChange(null);
    onClose();
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0c4ca3] via-[#093d84] to-[#062c60] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-black text-[#e5a812]">Easy</span>
            <span className="text-2xl font-black text-white">Gold</span>
            <span className="ml-2 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-[#e5a812] text-slate-950">
              Identity & Access
            </span>
          </div>

          <h3 className="text-lg font-bold">
            {currentUser ? 'User Account & Profiles' : 'Sign In to Your Workspace'}
          </h3>
          <p className="text-xs text-blue-100/80 mt-1">
            Store and sync custom pivot reporting profiles, campaign goals, and executive views securely in Supabase.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {currentUser ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#0c4ca3] text-[#e5a812] font-black flex items-center justify-center text-xl shadow-xs">
                  {currentUser.email.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 truncate">
                      {currentUser.full_name || currentUser.email}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight bg-blue-200 text-blue-900 flex items-center gap-1">
                      {isAdmin && <Crown className="w-3 h-3 text-[#e5a812]" />}
                      {currentUser.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{currentUser.email}</p>
                </div>
              </div>

              {/* Assigned Profiles Preview */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-[#0c4ca3]" />
                    <span>Assigned Reporting Profiles</span>
                  </span>
                  <span>{currentUser.assigned_profiles?.length || 1} Active</span>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {(currentUser.assigned_profiles || ['profile-daily-buy-summary']).map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs"
                    >
                      {p.replace('profile-', '').replace('preset-', '').replace(/-/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Admin Console Shortcut Button */}
              {isAdmin && onOpenAdminModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAdminModal();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-900 to-[#0c4ca3] hover:from-blue-800 hover:to-[#0a3f88] text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4 text-[#e5a812]" />
                  <span>Open Admin User &amp; Profile Management</span>
                </button>
              )}

              <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All saved reporting layouts sync with Supabase profiles.</span>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Continue Workspace
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => { setActiveTab('signin'); setErrorMsg(null); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'signin'
                      ? 'bg-white text-[#0c4ca3] shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('signup'); setErrorMsg(null); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'signup'
                      ? 'bg-white text-[#0c4ca3] shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Register
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Corporate Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. director@easygold.la"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0c4ca3]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-9 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0c4ca3]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl text-xs font-black bg-[#0c4ca3] hover:bg-[#093d84] text-white shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span>Authenticating...</span>
                  ) : activeTab === 'signin' ? (
                    <span>Sign In</span>
                  ) : (
                    <span>Create Account</span>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
