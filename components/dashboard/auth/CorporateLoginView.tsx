'use client';

import React, { useState } from 'react';
import { UserProfile } from '@/lib/types/auth.types';
import { signIn, signUp } from '@/lib/supabase/authHelper';
import {
  Lock,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  SlidersHorizontal,
  Target,
  Crown
} from 'lucide-react';

interface CorporateLoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export function CorporateLoginView({ onLoginSuccess }: CorporateLoginViewProps) {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg('Please enter both corporate email and password.');
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'signin') {
        const res = await signIn(email.trim(), password);
        if (res.error) {
          setErrorMsg(res.error);
        } else if (res.user) {
          setSuccessMsg(`Welcome back, ${res.user.full_name || res.user.email}!`);
          setTimeout(() => onLoginSuccess(res.user!), 500);
        }
      } else {
        const res = await signUp(email.trim(), password);
        if (res.error) {
          setErrorMsg(res.error);
        } else if (res.user) {
          setSuccessMsg(`Account created for ${res.user.email}! Logging in...`);
          setTimeout(() => onLoginSuccess(res.user!), 600);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: 'admin' | 'manager') => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const demoEmail = role === 'admin' ? 'director@easygold.la' : 'manager@easygold.la';
    const res = await signIn(demoEmail, 'EasyGold2026!');
    if (res.user) {
      setSuccessMsg(`Authenticated as ${res.user.full_name}!`);
      setTimeout(() => onLoginSuccess(res.user!), 400);
    } else {
      setErrorMsg(res.error || 'Quick login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#051329] via-[#092248] to-[#040e1f] text-slate-100 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Decorative ambient lights */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#0c4ca3]/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#e5a812]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar Branding */}
      <header className="flex items-center justify-between max-w-6xl mx-auto w-full pt-2">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-baseline gap-1 font-black leading-none">
              <span className="text-2xl sm:text-3xl text-[#e5a812] tracking-wider font-black">EASY</span>
              <span className="text-2xl sm:text-3xl text-white tracking-wider font-black">GOLD</span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-bold text-blue-200/70 tracking-wider mt-0.5 uppercase">
              by KHAMPHOUVONG
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-blue-500/30 text-blue-200 text-xs font-semibold backdrop-blur-md">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Encrypted Corporate Portal</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </header>

      {/* Center Auth Card */}
      <main className="flex-1 flex items-center justify-center py-8 z-10 w-full">
        <div className="w-full max-w-md bg-white/95 text-slate-900 rounded-3xl shadow-2xl border border-white/20 backdrop-blur-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-[#0c4ca3] via-[#093d84] to-[#062c60] text-white p-6 sm:p-7 relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl font-black text-[#e5a812]">Easy</span>
              <span className="text-2xl font-black text-white">Gold</span>
              <span className="ml-2 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-[#e5a812] text-slate-950">
                Security Gate
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Executive BI &amp; Analytics
            </h1>
            <p className="text-xs text-blue-100/80 mt-1.5 leading-relaxed">
              Restricted workspace. Please sign in with your corporate credentials to view real-time sales operations and financial performance.
            </p>
          </div>

          {/* Form Area */}
          <div className="p-6 sm:p-7 space-y-4">
            {/* Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => { setActiveTab('signin'); setErrorMsg(null); }}
                className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
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
                className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'signup'
                    ? 'bg-white text-[#0c4ca3] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Register
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-bold">{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {activeTab === 'signup' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Somphone Xayavong"
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0c4ca3]"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Corporate Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="director@easygold.la"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0c4ca3]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0c4ca3]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-xs font-black bg-gradient-to-r from-[#0c4ca3] to-[#093d84] hover:from-[#0a3f88] hover:to-[#073068] text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Verifying Credentials...</span>
                ) : activeTab === 'signin' ? (
                  <span>Sign In to Executive Workspace</span>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </form>

            {/* Quick 1-Click Role Access */}
            <div className="pt-3 border-t border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#e5a812]" />
                  <span>Authorized Role Login (1-Click)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">Live Supabase Auth</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin')}
                  disabled={loading}
                  className="py-2.5 px-3 rounded-xl text-[11px] font-bold bg-blue-50 text-[#0c4ca3] hover:bg-blue-100 border border-blue-200 transition-colors text-left flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Crown className="w-4 h-4 text-[#e5a812] shrink-0" />
                  <div className="min-w-0">
                    <div className="font-black text-slate-900 truncate">Operations Director</div>
                    <div className="text-[10px] text-blue-600 font-semibold">Admin Access</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('manager')}
                  disabled={loading}
                  className="py-2.5 px-3 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200 transition-colors text-left flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Target className="w-4 h-4 text-amber-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-black text-slate-900 truncate">Marketing Lead</div>
                    <div className="text-[10px] text-amber-700 font-semibold">Manager Access</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Footer Info */}
      <footer className="max-w-6xl mx-auto w-full text-center pb-2 text-[11px] text-blue-200/60 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-white/10 pt-3">
        <span>© 2026 Easy Gold by Khamphouvong. All rights reserved.</span>
        <div className="flex items-center gap-3">
          <span>Supabase RBAC Security</span>
          <span>•</span>
          <span>Row Level Encryption</span>
          <span>•</span>
          <span>Incognito Protection Active</span>
        </div>
      </footer>
    </div>
  );
}
