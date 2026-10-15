'use client';

import React, { useState } from 'react';
import { 
  SavedReportingProfile, 
  PivotRowDimension, 
  PivotMetricId, 
  PivotSlicerState 
} from '@/lib/types/pivotReport.types';
import { UserProfile } from '@/lib/types/auth.types';
import { 
  X, 
  BookmarkCheck, 
  Trash2, 
  Star, 
  CheckCircle2, 
  Plus, 
  FolderLock,
  Layers,
  Sliders
} from 'lucide-react';

interface ProfileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  savedProfiles: SavedReportingProfile[];
  activeProfileId: string | null;
  currentDimension: PivotRowDimension;
  currentMetrics: PivotMetricId[];
  currentSlicers: PivotSlicerState;
  onSelectProfile: (profile: SavedReportingProfile) => void;
  onSaveNewProfile: (name: string, description: string, isDefault: boolean) => Promise<void>;
  onDeleteProfile: (profileId: string) => Promise<void>;
  onOpenAuthModal: () => void;
}

export function ProfileManagerModal({
  isOpen,
  onClose,
  currentUser,
  savedProfiles,
  activeProfileId,
  currentDimension,
  currentMetrics,
  currentSlicers,
  onSelectProfile,
  onSaveNewProfile,
  onDeleteProfile,
  onOpenAuthModal,
}: ProfileManagerModalProps) {
  const [newProfileName, setNewProfileName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'save' | 'manage'>('save');

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    setIsSaving(true);
    try {
      await onSaveNewProfile(newProfileName.trim(), newDescription.trim(), setAsDefault);
      setNewProfileName('');
      setNewDescription('');
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col"
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

          <div className="flex items-center gap-2 mb-1.5">
            <BookmarkCheck className="w-6 h-6 text-[#e5a812]" />
            <h3 className="text-lg font-bold">Reporting Profile Manager</h3>
          </div>
          <p className="text-xs text-blue-100/80">
            Save your customized row dimensions, metric selections, and slicers to your account for one-click recall anytime.
          </p>

          {/* User authentication status */}
          <div className="mt-3 flex items-center justify-between bg-white/10 px-3 py-1.5 rounded-xl text-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="text-slate-300">Account:</span>
              <span className="font-bold text-[#e5a812] truncate">
                {currentUser?.email || 'Guest User (Local Storage)'}
              </span>
            </div>
            {!currentUser && (
              <button
                onClick={onOpenAuthModal}
                className="text-[11px] font-bold text-white underline underline-offset-2 hover:text-[#e5a812]"
              >
                Sign In to Cloud
              </button>
            )}
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-3">
          <button
            onClick={() => setActiveTab('save')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'save'
                ? 'border-[#0c4ca3] text-[#0c4ca3]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Save Current View as Profile
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'manage'
                ? 'border-[#0c4ca3] text-[#0c4ca3]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Saved Profiles ({savedProfiles.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'save' ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Profile Name *
                </label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="e.g. Daily Buy Analysis, VIP Customers 15g, etc."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  placeholder="Brief notes on the concept or usage for this report view..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
                />
              </div>

              {/* View Summary Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider block">
                  Configuration to be saved:
                </span>
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="font-semibold text-slate-700">Row Dimension:</span>
                  <span className="capitalize font-mono text-[#0c4ca3] font-bold">{currentDimension}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="font-semibold text-slate-700">Metrics:</span>
                  <span>{currentMetrics.length} metrics selected</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="font-semibold text-slate-700">Slicers:</span>
                  <span className="truncate">
                    Month: {currentSlicers.month}, 500k: {currentSlicers.is_500k_up}, 2g: {currentSlicers.is_2g_up}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="set-default"
                  checked={setAsDefault}
                  onChange={(e) => setSetAsDefault(e.target.checked)}
                  className="rounded-sm border-slate-300 text-[#0c4ca3] focus:ring-[#0c4ca3]"
                />
                <label htmlFor="set-default" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Set as my default reporting profile on load
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !newProfileName.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-[#0c4ca3] hover:bg-[#093d84] text-white shadow-md disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {savedProfiles.map((profile) => {
                const isActive = profile.id === activeProfileId;
                return (
                  <div
                    key={profile.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-blue-50/80 border-[#0c4ca3] ring-1 ring-[#0c4ca3]'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {profile.profile_name}
                        </span>
                        {profile.is_default && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-100 text-amber-800 flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                            Default
                          </span>
                        )}
                        {isActive && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-[#0c4ca3] text-white">
                            Active
                          </span>
                        )}
                      </div>
                      {profile.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {profile.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 font-mono">
                        <span className="capitalize">Dimension: {profile.row_dimension}</span>
                        <span>•</span>
                        <span>{profile.selected_metrics.length} metrics</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          onSelectProfile(profile);
                          onClose();
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-[#0c4ca3] text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        }`}
                      >
                        {isActive ? 'Loaded' : 'Load Profile'}
                      </button>
                      <button
                        onClick={() => onDeleteProfile(profile.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Profile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
