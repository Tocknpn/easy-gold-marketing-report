'use client';

import React, { useState } from 'react';
import { UserProfile } from '@/lib/types/auth.types';
import { signIn } from '@/lib/supabase/authHelper';
import { Lock, Mail, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CorporateLoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export function CorporateLoginView({ onLoginSuccess }: CorporateLoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg('Please enter email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await signIn(email.trim(), password);
      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.user) {
        setSuccessMsg('Login successful. Redirecting...');
        setTimeout(() => onLoginSuccess(res.user!), 300);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f5f9] text-slate-800 flex flex-col items-center justify-center p-4 select-none">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md border border-slate-200/80 p-6 sm:p-8">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="flex items-baseline justify-center gap-1 font-black leading-none">
            <span className="text-2xl text-[#e5a812] tracking-wider">EASY</span>
            <span className="text-2xl text-[#0c4ca3] tracking-wider">GOLD</span>
          </div>
          <div className="text-[10px] font-bold text-slate-400 tracking-wider mt-1 uppercase">
            by KHAMPHOUVONG
          </div>
          <h1 className="text-sm font-bold text-slate-700 mt-4">
            Sign In to Dashboard
          </h1>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success message */}
        {successMsg && (
          <div className="mb-4 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@easygold.la"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c4ca3]"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-9 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c4ca3]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-xs font-bold bg-[#0c4ca3] hover:bg-[#0a3f88] text-white transition-colors disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>

      <div className="text-[11px] text-slate-400 mt-6">
        © 2026 Easy Gold by Khamphouvong
      </div>
    </div>
  );
}
