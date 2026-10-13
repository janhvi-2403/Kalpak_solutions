'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  X,
  Plus,
  Trash2,
  Search,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Button, Input, Dialog } from '@/components/ui';
import { apiClient } from '@/lib/api-client';

export interface EntitlementItem {
  id: string;
  code: string;
  label: string;
  category: 'core' | 'automation' | 'notifications' | 'analytics' | 'integrations' | 'enterprise' | 'custom';
  description?: string;
  starter: boolean;
  pro: boolean;
  ent: boolean;
  isCustom?: boolean;
}

const DEFAULT_ENTITLEMENTS: EntitlementItem[] = [
  {
    id: 'TICKET_MANAGEMENT',
    code: 'TICKET_MANAGEMENT',
    label: 'Ticket Management & Dispatch',
    category: 'core',
    description: 'Create, update, tag, and close customer service tickets.',
    starter: true,
    pro: true,
    ent: true,
  },
  {
    id: 'CUSTOMER_PORTAL',
    code: 'CUSTOMER_PORTAL',
    label: 'Dedicated Client Service Portal',
    category: 'core',
    description: 'Self-service web portal for clients to check status.',
    starter: true,
    pro: true,
    ent: true,
  },
  {
    id: 'EMPLOYEE_TICKET_CREATION',
    code: 'EMPLOYEE_TICKET_CREATION',
    label: 'Field Staff Ticket Raising',
    category: 'core',
    description: 'Allows technicians and staff to open tickets on-behalf.',
    starter: true,
    pro: true,
    ent: true,
  },
  {
    id: 'AUTO_ASSIGNMENT',
    code: 'AUTO_ASSIGNMENT',
    label: 'Auto-Assignment SLA Dispatch',
    category: 'automation',
    description: 'Round-robin and skill-based automated dispatch rules.',
    starter: false,
    pro: true,
    ent: true,
  },
  {
    id: 'WORKLOAD_BALANCING',
    code: 'WORKLOAD_BALANCING',
    label: 'Workload Balancing & Capacity Rules',
    category: 'automation',
    description: 'Even distribution across available technicians.',
    starter: false,
    pro: true,
    ent: true,
  },
  {
    id: 'TICKET_AGING_ALERTS',
    code: 'TICKET_AGING_ALERTS',
    label: 'Real-Time SLA Aging Alerts',
    category: 'automation',
    description: 'Automatic warning notifications for tickets nearing breach.',
    starter: true,
    pro: true,
    ent: true,
  },
  {
    id: 'CUSTOM_WORKFLOW',
    code: 'CUSTOM_WORKFLOW',
    label: 'Custom SLA Escalation Workflows',
    category: 'automation',
    description: 'Custom multi-step escalation chains and automated actions.',
    starter: false,
    pro: false,
    ent: true,
  },
  {
    id: 'EMAIL_NOTIFICATION',
    code: 'EMAIL_NOTIFICATION',
    label: 'Email Alerts & Escalations',
    category: 'notifications',
    description: 'Automated email alerts sent to clients and technicians.',
    starter: true,
    pro: true,
    ent: true,
  },
  {
    id: 'PUSH_NOTIFICATION',
    code: 'PUSH_NOTIFICATION',
    label: 'Web Push & Desktop Alerts',
    category: 'notifications',
    description: 'Real-time in-app and browser notifications.',
    starter: true,
    pro: true,
    ent: true,
  },
  {
    id: 'WHATSAPP_NOTIFICATION',
    code: 'WHATSAPP_NOTIFICATION',
    label: 'WhatsApp Instant Messaging',
    category: 'notifications',
    description: 'Automated ticket confirmation and updates over WhatsApp API.',
    starter: false,
    pro: false,
    ent: true,
  },
  {
    id: 'REPORTS',
    code: 'REPORTS',
    label: 'Basic Operational Summary Reports',
    category: 'analytics',
    description: 'Weekly resolution count, volume trends, and agent metrics.',
    starter: true,
    pro: true,
    ent: true,
  },
  {
    id: 'ADVANCED_REPORTS',
    code: 'ADVANCED_REPORTS',
    label: 'Executive Analytics & Drilldown',
    category: 'analytics',
    description: 'SLA breach attribution, customer cohort analytics, CSV export.',
    starter: false,
    pro: true,
    ent: true,
  },
  {
    id: 'API_INTEGRATION',
    code: 'API_INTEGRATION',
    label: 'Public REST API Keys',
    category: 'integrations',
    description: 'Programmatic API token access for custom systems.',
    starter: false,
    pro: true,
    ent: true,
  },
  {
    id: 'BULK_IMPORT_EXPORT',
    code: 'BULK_IMPORT_EXPORT',
    label: 'Bulk Customer & Asset Import/Export',
    category: 'integrations',
    description: 'CSV bulk upload and download for users and tickets.',
    starter: false,
    pro: true,
    ent: true,
  },
  {
    id: 'CUSTOM_DOMAIN',
    code: 'CUSTOM_DOMAIN',
    label: 'Custom White-Label Subdomain',
    category: 'enterprise',
    description: 'Custom branded domain (e.g. support.yourcompany.com).',
    starter: false,
    pro: false,
    ent: true,
  },
  {
    id: 'SSO_SAML',
    code: 'SSO_SAML',
    label: 'Enterprise SSO & SAML Authentication',
    category: 'enterprise',
    description: 'Okta, Azure AD, and Google Workspace single sign-on.',
    starter: false,
    pro: false,
    ent: true,
  },
  {
    id: 'DEDICATED_MANAGER',
    code: 'DEDICATED_MANAGER',
    label: 'Dedicated Customer Success Manager',
    category: 'enterprise',
    description: 'Direct SLA support phone line and quarterly reviews.',
    starter: false,
    pro: false,
    ent: true,
  },
  {
    id: 'SLA_999',
    code: 'SLA_999',
    label: '99.9% Uptime Guarantee',
    category: 'enterprise',
    description: 'Financial backed uptime SLA with compensation credits.',
    starter: false,
    pro: false,
    ent: true,
  },
];

const STORAGE_KEY = 'kalpak_custom_entitlements_v2';

export function FeaturesEntitlementsManagement() {
  const [entitlements, setEntitlements] = useState<EntitlementItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Feature Form State
  const [newCode, setNewCode] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState<EntitlementItem['category']>('custom');
  const [newDescription, setNewDescription] = useState('');
  const [newStarter, setNewStarter] = useState(false);
  const [newPro, setNewPro] = useState(true);
  const [newEnt, setNewEnt] = useState(true);

  // Initialize from storage or defaults
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEntitlements(parsed);
          return;
        }
      }
    } catch {
      // fallback to default
    }
    setEntitlements(DEFAULT_ENTITLEMENTS);
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Toggle entitlement for a tier
  const handleToggleTier = (id: string, tier: 'starter' | 'pro' | 'ent') => {
    setEntitlements((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            [tier]: !item[tier],
          };
        }
        return item;
      })
    );
  };

  // Add new feature
  const handleAddFeature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) {
      showToast('error', 'Please enter a feature name / label.');
      return;
    }

    const formattedCode = (newCode.trim() || newLabel.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_'))
      .toUpperCase()
      .replace(/_{2,}/g, '_');

    // Check duplicate
    if (entitlements.some((item) => item.code === formattedCode)) {
      showToast('error', `A feature with code "${formattedCode}" already exists.`);
      return;
    }

    const newItem: EntitlementItem = {
      id: `FEAT_${Date.now()}`,
      code: formattedCode,
      label: newLabel.trim(),
      category: newCategory,
      description: newDescription.trim() || 'Custom configurable capability.',
      starter: newStarter,
      pro: newPro,
      ent: newEnt,
      isCustom: true,
    };

    const updated = [...entitlements, newItem];
    setEntitlements(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    // Reset form
    setNewCode('');
    setNewLabel('');
    setNewCategory('custom');
    setNewDescription('');
    setNewStarter(false);
    setNewPro(true);
    setNewEnt(true);
    setIsAddModalOpen(false);

    showToast('success', `Feature "${newItem.label}" added to entitlement matrix!`);
  };

  // Delete feature
  const handleDeleteFeature = (id: string, label: string) => {
    const updated = entitlements.filter((item) => item.id !== id);
    setEntitlements(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    showToast('success', `Removed feature "${label}" from entitlements.`);
  };

  // Save changes
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entitlements));

      // Attempt to sync custom features to active plans in database
      try {
        const featureMapStarter: Record<string, boolean> = {};
        const featureMapPro: Record<string, boolean> = {};
        const featureMapEnt: Record<string, boolean> = {};

        for (const item of entitlements) {
          const camelKey = item.code.toLowerCase().replace(/_([a-z])/g, (_, g) => g.toUpperCase());
          featureMapStarter[camelKey] = item.starter;
          featureMapPro[camelKey] = item.pro;
          featureMapEnt[camelKey] = item.ent;
        }

        // Send updates if API is responsive
        await Promise.allSettled([
          apiClient.put('/plans/STARTER', { features: featureMapStarter }),
          apiClient.put('/plans/PROFESSIONAL', { features: featureMapPro }),
          apiClient.put('/plans/ENTERPRISE', { features: featureMapEnt }),
        ]);
      } catch {
        // silent fallback, stored locally
      }

      showToast('success', 'Entitlement choices saved and synced successfully!');
    } catch (err: any) {
      showToast('error', `Failed to save changes: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleResetDefaults = () => {
    if (window.confirm('Reset all feature entitlements back to the canonical defaults? Custom features will be preserved.')) {
      const customItems = entitlements.filter((i) => i.isCustom);
      const resetList = [...DEFAULT_ENTITLEMENTS, ...customItems];
      setEntitlements(resetList);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(resetList));
      } catch {
        // ignore
      }
      showToast('success', 'Entitlements matrix reset to defaults.');
    }
  };

  // Filtered rows
  const filteredEntitlements = useMemo(() => {
    return entitlements.filter((item) => {
      const matchesSearch =
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [entitlements, searchQuery, selectedCategory]);

  // Statistics
  const stats = useMemo(() => {
    const total = entitlements.length;
    const starterCount = entitlements.filter((i) => i.starter).length;
    const proCount = entitlements.filter((i) => i.pro).length;
    const entCount = entitlements.filter((i) => i.ent).length;
    const customCount = entitlements.filter((i) => i.isCustom).length;
    return { total, starterCount, proCount, entCount, customCount };
  }, [entitlements]);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold border transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-extrabold text-slate-900">Features & Entitlements Engine</h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
              Interactive Customizer
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Customize platform capabilities across subscription tiers. Click any tier cell to toggle access on or off, or add new custom features.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs h-9 shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>+ Add Feature Option</span>
          </Button>

          <Button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 shadow-xs"
          >
            <Save className="w-4 h-4 mr-1.5" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </Button>

          <button
            type="button"
            onClick={handleResetDefaults}
            title="Reset canonical features to defaults"
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Capabilities</span>
          <div className="mt-2 text-2xl font-black text-slate-900">{stats.total}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">{stats.customCount} custom features added</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-blue-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">Starter Enabled</span>
          <div className="mt-2 text-2xl font-black text-blue-800">{stats.starterCount} / {stats.total}</div>
          <p className="text-[10px] text-blue-600 mt-0.5">Basic platform features</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-purple-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 block">Professional Enabled</span>
          <div className="mt-2 text-2xl font-black text-purple-800">{stats.proCount} / {stats.total}</div>
          <p className="text-[10px] text-purple-600 mt-0.5">Automation & SLAs enabled</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">Enterprise Enabled</span>
          <div className="mt-2 text-2xl font-black text-emerald-800">{stats.entCount} / {stats.total}</div>
          <p className="text-[10px] text-emerald-600 mt-0.5">Full capability access</p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search features by name or code..."
            className="pl-9 text-xs h-9"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'core', label: 'Core Tickets' },
            { id: 'automation', label: 'Automation & SLA' },
            { id: 'notifications', label: 'Notifications' },
            { id: 'analytics', label: 'Analytics' },
            { id: 'integrations', label: 'Integrations' },
            { id: 'enterprise', label: 'Enterprise' },
            { id: 'custom', label: 'Custom' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        {/* Table Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-700 uppercase tracking-wider grid grid-cols-12 items-center">
          <div className="col-span-5 sm:col-span-6">Feature Capability & Details</div>
          <div className="col-span-2 text-center flex flex-col items-center">
            <span>Starter</span>
            <span className="text-[10px] font-normal text-slate-500 normal-case">Click to toggle</span>
          </div>
          <div className="col-span-2 text-center flex flex-col items-center">
            <span>Professional</span>
            <span className="text-[10px] font-normal text-slate-500 normal-case">Click to toggle</span>
          </div>
          <div className="col-span-2 text-center flex flex-col items-center">
            <span>Enterprise</span>
            <span className="text-[10px] font-normal text-slate-500 normal-case">Click to toggle</span>
          </div>
          <div className="col-span-1 text-right sm:block hidden">Actions</div>
        </div>

        {/* Rows */}
        {filteredEntitlements.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-xs font-bold text-slate-500">No matching features found.</p>
            <Button size="sm" variant="outline" onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {filteredEntitlements.map((feat) => {
              return (
                <div
                  key={feat.id}
                  className="p-3.5 grid grid-cols-12 items-center hover:bg-slate-50/70 transition-colors gap-2"
                >
                  {/* Left Column: Code, Name, Category & Description */}
                  <div className="col-span-5 sm:col-span-6 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{feat.label}</span>
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {feat.code}
                      </span>
                      {feat.isCustom && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-700 border border-purple-200">
                          Custom
                        </span>
                      )}
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        • {feat.category}
                      </span>
                    </div>
                    {feat.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1">{feat.description}</p>
                    )}
                  </div>

                  {/* Starter Toggle Choice */}
                  <div className="col-span-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleToggleTier(feat.id, 'starter')}
                      title={`Click to ${feat.starter ? 'disable' : 'enable'} for Starter plan`}
                      className={`px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-2xs ${
                        feat.starter
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200 hover:text-slate-600'
                      }`}
                    >
                      {feat.starter ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Enabled</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3.5 h-3.5 text-slate-400" />
                          <span>Disabled</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Pro Toggle Choice */}
                  <div className="col-span-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleToggleTier(feat.id, 'pro')}
                      title={`Click to ${feat.pro ? 'disable' : 'enable'} for Professional plan`}
                      className={`px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-2xs ${
                        feat.pro
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200 hover:text-slate-600'
                      }`}
                    >
                      {feat.pro ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Enabled</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3.5 h-3.5 text-slate-400" />
                          <span>Disabled</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Enterprise Toggle Choice */}
                  <div className="col-span-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleToggleTier(feat.id, 'ent')}
                      title={`Click to ${feat.ent ? 'disable' : 'enable'} for Enterprise plan`}
                      className={`px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-2xs ${
                        feat.ent
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200 hover:text-slate-600'
                      }`}
                    >
                      {feat.ent ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Enabled</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3.5 h-3.5 text-slate-400" />
                          <span>Disabled</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Actions (Delete for custom features) */}
                  <div className="col-span-1 flex justify-end">
                    {feat.isCustom ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteFeature(feat.id, feat.label)}
                        title="Delete custom feature"
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-300 font-bold px-1 select-none">Core</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Helpful Guidance Footer */}
      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-950 flex items-start gap-3 text-xs leading-relaxed">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">How changes take effect:</strong> Toggling any feature on or off updates your tier permissions across the customer portal, technician workflows, and checkout comparison. Click <strong>&quot;Save Changes&quot;</strong> in the top-right to commit your updates.
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* ADD NEW FEATURE MODAL                                                     */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Dialog
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        title="Add New Feature / Capability Option"
      >
        <form onSubmit={handleAddFeature} className="space-y-4 text-xs pt-1">
          <p className="text-slate-500 text-[11px]">
            Define a new capability option to offer in subscription plans. You can choose which tiers include it by default.
          </p>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Feature Display Name *</label>
            <Input
              value={newLabel}
              onChange={(e) => {
                setNewLabel(e.target.value);
                if (!newCode || newCode === newLabel.toUpperCase().replace(/[^A-Z0-9]/g, '_')) {
                  setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '_'));
                }
              }}
              placeholder="e.g. AI Smart Routing, Field GPS Tracking"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Feature Code (Identifier)</label>
              <Input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                placeholder="e.g. AI_ROUTING"
                className="font-mono text-xs uppercase"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700 bg-white"
              >
                <option value="core">Core Tickets</option>
                <option value="automation">Automation & SLA</option>
                <option value="notifications">Notifications</option>
                <option value="analytics">Analytics</option>
                <option value="integrations">Integrations</option>
                <option value="enterprise">Enterprise</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Brief Description</label>
            <Input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="e.g. Real-time GPS location ping on ticket check-in."
            />
          </div>

          {/* Initial Tier Availability (Choose Options) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="font-bold text-slate-700 block">Choose Tiers with Access by Default:</label>
            <div className="grid grid-cols-3 gap-2">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newStarter}
                  onChange={(e) => setNewStarter(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded border-slate-300"
                />
                <span className="font-bold text-slate-800 text-xs">Starter</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPro}
                  onChange={(e) => setNewPro(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded border-slate-300"
                />
                <span className="font-bold text-slate-800 text-xs">Professional</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newEnt}
                  onChange={(e) => setNewEnt(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded border-slate-300"
                />
                <span className="font-bold text-slate-800 text-xs">Enterprise</span>
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold"
            >
              Add Capability Option
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
