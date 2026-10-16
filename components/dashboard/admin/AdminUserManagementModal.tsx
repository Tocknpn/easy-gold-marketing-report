'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile, AdminUserRecord, AppRole } from '@/lib/types/auth.types';
import { 
  listAdminUsers, 
  createAdminUser, 
  updateAdminUser, 
  deleteAdminUser 
} from '@/lib/supabase/authHelper';
import { INITIAL_PRESET_PROFILES } from '@/lib/storage/profileStorage';
import { 
  X, 
  UserPlus, 
  ShieldCheck, 
  Users, 
  Lock, 
  Mail, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Edit3, 
  KeyRound, 
  FileSpreadsheet, 
  Database, 
  Search, 
  Filter, 
  RefreshCw,
  Sparkles,
  Check,
  Crown,
  Eye,
  Sliders,
  Layers,
  Copy
} from 'lucide-react';

interface AdminUserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
}

export function AdminUserManagementModal({
  isOpen,
  onClose,
  currentUser,
}: AdminUserManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'directory' | 'add_user' | 'profiles'>('directory');
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [source, setSource] = useState<'supabase' | 'local'>('local');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Editing state
  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null);
  const [editRole, setEditRole] = useState<AppRole>('viewer');
  const [editProfiles, setEditProfiles] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // New user form state
  const [newEmail, setNewEmail] = useState<string>('');
  const [newFullName, setNewFullName] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('EasyGold2026!');
  const [newRole, setNewRole] = useState<AppRole>('operations_manager');
  const [newAssignedProfiles, setNewAssignedProfiles] = useState<string[]>([
    'profile-daily-buy-summary',
    'profile-customer-gold-volume',
  ]);

  // Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Available reporting profiles list
  const availableProfiles = [
    { id: 'profile-daily-buy-summary', name: 'Daily Buy Activity (Excel Image 1)', desc: 'Buy trans, revenue mil LAK, 500k+ filter' },
    { id: 'profile-customer-gold-volume', name: 'Customer Gold Accumulation (Excel Image 2)', desc: 'Phone, customer name, grams accumulated' },
    { id: 'profile-bank-performance', name: 'Banking Gateway Flow (BCEL / LDB / JDB)', desc: 'Breakdown of transactions & volume by bank' },
    { id: 'preset-net-flow-week', name: 'Weekly Buy vs Sell Net Flow', desc: 'ISO week buy vs sell, ABS value mil LAK' },
    { id: 'preset-campaign-tracking', name: 'Campaign Target Intelligence', desc: 'Campaign KPIs, backward baseline comparisons' },
  ];

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await listAdminUsers();
      setUsers(res.users);
      setSource(res.source);
    } catch (err: any) {
      setErrorMsg('Failed to load user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newFullName) {
      showNotification('Please fill in email and full name', true);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createAdminUser({
        email: newEmail,
        full_name: newFullName,
        password: newPassword,
        role: newRole,
        assigned_profiles: newAssignedProfiles,
      });

      if (res.error) {
        showNotification(res.error, true);
      } else {
        showNotification(`Created account for ${newFullName} successfully!`);
        setNewEmail('');
        setNewFullName('');
        setActiveTab('directory');
        fetchUsers();
      }
    } catch (err: any) {
      showNotification(err.message || 'Creation failed', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (user: AdminUserRecord) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditProfiles(user.assigned_profiles || []);
    setEditStatus((user.status as any) || 'active');
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      const res = await updateAdminUser({
        id: editingUser.id,
        role: editRole,
        assigned_profiles: editProfiles,
        status: editStatus,
      });

      if (res.error) {
        showNotification(res.error, true);
      } else {
        showNotification(`Updated role & profiles for ${editingUser.full_name || editingUser.email}`);
        setEditingUser(null);
        fetchUsers();
      }
    } catch (err: any) {
      showNotification(err.message || 'Update failed', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (userId === currentUser?.id) {
      showNotification('You cannot delete your own active admin account.', true);
      return;
    }
    if (!confirm(`Are you sure you want to delete user ${email}?`)) return;

    try {
      const res = await deleteAdminUser(userId);
      if (res.error) {
        showNotification(res.error, true);
      } else {
        showNotification(`User ${email} removed.`);
        fetchUsers();
      }
    } catch (err: any) {
      showNotification(err.message || 'Deletion failed', true);
    }
  };

  const toggleProfileAssignment = (profileId: string, isNewUserForm = false) => {
    if (isNewUserForm) {
      setNewAssignedProfiles((prev) =>
        prev.includes(profileId) ? prev.filter((p) => p !== profileId) : [...prev, profileId]
      );
    } else {
      setEditProfiles((prev) =>
        prev.includes(profileId) ? prev.filter((p) => p !== profileId) : [...prev, profileId]
      );
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesQuery =
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesQuery && matchesRole;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#0c4ca3] via-[#093d84] to-[#062c60] text-white p-5 sm:p-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="p-1.5 rounded-xl bg-[#e5a812]/20 border border-[#e5a812]/40 text-[#e5a812]">
                <Crown className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>User &amp; Reporting Profile Management</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#e5a812] text-slate-950">
                  ADMIN ONLY
                </span>
              </h2>
            </div>
            <p className="text-xs text-blue-100/80 max-w-2xl leading-relaxed">
              Store users in Supabase, control role permissions (Admin, Operations Manager, Viewer), and assign custom reporting profiles to each team member.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub Header: Navigation Tabs & Backend Status */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-300/80 shadow-2xs">
            <button
              onClick={() => setActiveTab('directory')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                activeTab === 'directory'
                  ? 'bg-[#0c4ca3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Directory ({users.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('add_user')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                activeTab === 'add_user'
                  ? 'bg-[#0c4ca3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add / Invite User</span>
            </button>
            <button
              onClick={() => setActiveTab('profiles')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                activeTab === 'profiles'
                  ? 'bg-[#0c4ca3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Reporting Profiles Setup</span>
            </button>
          </div>

          {/* Supabase backend status pill */}
          <div className="flex items-center gap-2 text-xs">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] border ${
              source === 'supabase'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${source === 'supabase' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{source === 'supabase' ? 'Supabase Database Connected' : 'Local Storage Demo Mode'}</span>
            </div>

            <button
              onClick={fetchUsers}
              disabled={loading}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
              title="Refresh users"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Alert Messages */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)}><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)}><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* TAB 1: USER DIRECTORY */}
        {activeTab === 'directory' && (
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            {/* Search & Filter bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search user by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0c4ca3]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Role:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-[#0c4ca3]"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="operations_manager">Operations Manager</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">User &amp; Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Assigned Reporting Profiles</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0c4ca3] mb-2" />
                          <span>Loading users directory from Supabase...</span>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-400">
                          No users found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isAdmin = u.role === 'admin';
                        const isManager = u.role === 'operations_manager';
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                                  isAdmin
                                    ? 'bg-[#0c4ca3] text-[#e5a812]'
                                    : isManager
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {u.email.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>{u.full_name || u.email.split('@')[0]}</span>
                                    {u.id === currentUser?.id && (
                                      <span className="text-[9px] px-1.5 py-0.2 bg-blue-100 text-[#0c4ca3] rounded-sm font-black">
                                        YOU
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500">{u.email}</div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3.5">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isAdmin
                                  ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                  : isManager
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {isAdmin && <Crown className="w-3 h-3 text-[#e5a812]" />}
                                {isManager && <Sliders className="w-3 h-3 text-amber-600" />}
                                {u.role}
                              </span>
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1 flex-wrap max-w-xs">
                                {(u.assigned_profiles && u.assigned_profiles.length > 0) ? (
                                  u.assigned_profiles.slice(0, 2).map((pid) => (
                                    <span
                                      key={pid}
                                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[130px]"
                                      title={pid}
                                    >
                                      {pid.replace('profile-', '').replace('preset-', '').replace(/-/g, ' ')}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">No custom profiles</span>
                                )}
                                {(u.assigned_profiles && u.assigned_profiles.length > 2) && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-blue-50 text-[#0c4ca3] border border-blue-200">
                                    +{u.assigned_profiles.length - 2} more
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-3.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.status === 'suspended'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'suspended' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                <span className="capitalize">{u.status || 'Active'}</span>
                              </span>
                            </td>

                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleStartEdit(u)}
                                  className="p-1.5 rounded-lg text-slate-600 hover:text-[#0c4ca3] hover:bg-blue-50 transition-colors"
                                  title="Edit role & reporting profiles"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                {u.id !== currentUser?.id && (
                                  <button
                                    onClick={() => handleDeleteUser(u.id, u.email)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Delete user"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Helper Note for Admin */}
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#0c4ca3] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Admin Security Note:</span>
                <p className="mt-0.5 text-blue-800/90 leading-relaxed">
                  Only Admins can assign and provision reporting profiles. When a user logs in, the reporting tabs (Custom Pivot Profiles, Campaign Intelligence, WoW matrix) will automatically reflect the specific views and permissions assigned to their account.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ADD / INVITE USER */}
        {activeTab === 'add_user' && (
          <div className="p-6 flex-1 overflow-y-auto">
            <form onSubmit={handleCreateUser} className="max-w-xl mx-auto space-y-5">
              <div className="text-center pb-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0c4ca3] mx-auto flex items-center justify-center mb-2 shadow-xs">
                  <UserPlus className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Provision New Team Member</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  The account will be securely registered in Supabase Auth and synced with assigned reporting profiles.
                </p>
              </div>

              <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name &amp; Title
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. Somphone Xayavong"
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0c4ca3] bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Corporate Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      placeholder="e.g. somphone@easygold.la"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0c4ca3] bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Initial Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0c4ca3] bg-white font-mono"
                      required
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    User can sign in immediately or change their password after logging in.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    System Role &amp; Access Tier
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewRole('admin')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        newRole === 'admin'
                          ? 'border-[#0c4ca3] bg-blue-50/70 text-[#0c4ca3] ring-1 ring-[#0c4ca3]'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1 font-bold text-xs mb-0.5">
                        <Crown className="w-3.5 h-3.5 text-[#e5a812]" />
                        <span>Admin</span>
                      </div>
                      <p className="text-[10px] text-slate-500">Full workspace &amp; user management</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewRole('operations_manager')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        newRole === 'operations_manager'
                          ? 'border-[#0c4ca3] bg-blue-50/70 text-[#0c4ca3] ring-1 ring-[#0c4ca3]'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1 font-bold text-xs mb-0.5">
                        <Sliders className="w-3.5 h-3.5 text-amber-600" />
                        <span>Manager</span>
                      </div>
                      <p className="text-[10px] text-slate-500">Can view &amp; customize reports</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewRole('viewer')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        newRole === 'viewer'
                          ? 'border-[#0c4ca3] bg-blue-50/70 text-[#0c4ca3] ring-1 ring-[#0c4ca3]'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1 font-bold text-xs mb-0.5">
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Viewer</span>
                      </div>
                      <p className="text-[10px] text-slate-500">Read-only assigned reports</p>
                    </button>
                  </div>
                </div>

                {/* Assigned Reporting Profiles Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Assign Default Reporting Profiles
                  </label>
                  <div className="space-y-2">
                    {availableProfiles.map((p) => {
                      const isSelected = newAssignedProfiles.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleProfileAssignment(p.id, true)}
                          className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-blue-50/80 border-[#0c4ca3] text-slate-900'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs flex items-center gap-1.5">
                              <span>{p.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-500">{p.desc}</span>
                          </div>
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                            isSelected ? 'bg-[#0c4ca3] text-white' : 'border border-slate-300'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('directory')}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black bg-[#0c4ca3] hover:bg-[#093d84] text-white shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  <span>Create User Account</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: REPORTING PROFILES SETUP */}
        {activeTab === 'profiles' && (
          <div className="p-6 flex-1 overflow-y-auto space-y-5">
            <div className="flex items-start justify-between gap-4 flex-wrap pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#0c4ca3]" />
                  <span>Central Reporting Profiles Catalog</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage the profiles and templates that team members can access across Pivot Studio, MTD views, and Campaigns.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`-- SQL script: sql/21_admin_user_management_and_reporting_profiles.sql\n-- Run in Supabase SQL editor to create public.profiles and triggers.`);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-300"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedSql ? 'Copied SQL Path!' : 'Copy Supabase SQL'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {availableProfiles.map((p) => {
                const assignedCount = users.filter((u) => u.assigned_profiles?.includes(p.id)).length;
                return (
                  <div key={p.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-bold text-xs text-slate-900">{p.name}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-[#0c4ca3] rounded-md font-bold border border-blue-200">
                          {assignedCount} users assigned
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{p.desc}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-mono text-[10px] text-slate-400">{p.id}</span>
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Ready in Supabase</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Supabase Schema Blueprint Box */}
            <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#e5a812] flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  <span>Database Setup: 21_admin_user_management_and_reporting_profiles.sql</span>
                </span>
                <span className="text-[10px] text-slate-400">PostgreSQL 15+ / Supabase</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                This schema provisions the <code className="text-[#e5a812] bg-slate-800 px-1 py-0.5 rounded">public.profiles</code> table, creates an automatic trigger <code className="text-[#e5a812] bg-slate-800 px-1 py-0.5 rounded">on_auth_user_created</code>, and establishes strict Row-Level Security (RLS) ensuring that only administrators can configure user roles and assigned profiles.
              </p>
            </div>
          </div>
        )}

        {/* MODAL: EDIT USER & PROFILES DIALOG */}
        {editingUser && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 flex flex-col space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#0c4ca3] text-[#e5a812] font-black flex items-center justify-center text-sm">
                    {editingUser.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      Edit User: {editingUser.full_name || editingUser.email}
                    </h4>
                    <span className="text-xs text-slate-500">{editingUser.email}</span>
                  </div>
                </div>
                <button onClick={() => setEditingUser(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Edit Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Assign System Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRole('admin')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                      editRole === 'admin'
                        ? 'border-[#0c4ca3] bg-blue-50 text-[#0c4ca3] ring-1 ring-[#0c4ca3]'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    👑 Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRole('operations_manager')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                      editRole === 'operations_manager'
                        ? 'border-[#0c4ca3] bg-blue-50 text-[#0c4ca3] ring-1 ring-[#0c4ca3]'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    📊 Manager
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRole('viewer')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                      editRole === 'viewer'
                        ? 'border-[#0c4ca3] bg-blue-50 text-[#0c4ca3] ring-1 ring-[#0c4ca3]'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    👁️ Viewer
                  </button>
                </div>
              </div>

              {/* Edit Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Account Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus('active')}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-bold ${
                      editStatus === 'active'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Active Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus('suspended')}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-bold ${
                      editStatus === 'suspended'
                        ? 'border-red-500 bg-red-50 text-red-800'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Suspended
                  </button>
                </div>
              </div>

              {/* Edit Assigned Reporting Profiles */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Assigned Reporting Profiles
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {availableProfiles.map((p) => {
                    const isChecked = editProfiles.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleProfileAssignment(p.id, false)}
                        className={`p-2 rounded-xl border cursor-pointer flex items-center justify-between text-xs transition-colors ${
                          isChecked ? 'bg-blue-50/80 border-[#0c4ca3] text-slate-900' : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="font-semibold">{p.name}</span>
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center ${
                          isChecked ? 'bg-[#0c4ca3] text-white' : 'border border-slate-300'
                        }`}>
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSaveEdit}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-[#0c4ca3] hover:bg-[#093d84] text-white shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
