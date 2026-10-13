'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  CheckCircle2,
  X,
  Check,
  Plus,
  Edit3,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Users,
  Building2,
  HardDrive,
  Sliders,
  Archive,
  RefreshCw,
  AlertTriangle,
  Copy,
  Power,
  Trash2,
  ToggleRight,
} from 'lucide-react';
import { Button, Input, Dialog } from '@/components/ui';
import { apiClient } from '@/lib/api-client';
import { FeaturesEntitlementsManagement } from './entitlements-management';

// ── Types & Interfaces ─────────────────────────────────────────────────────────

export type PlanStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED';

export interface PlanLimits {
  maxUsers: number | 'Unlimited';
  maxDepartments: number | 'Unlimited';
  maxTicketsMonthly: number | 'Unlimited';
  storageGb: number | 'Unlimited';
  maxIntegrations: number | 'Unlimited';
}

export interface PlanFeatures {
  ticketManagement: boolean;
  customerPortal: boolean;
  manualAssignment: boolean;
  autoAssignment: boolean;
  workloadBalancing: boolean;
  employeeOnBehalf: boolean;
  ticketAgingAlerts: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  whatsappNotifications: boolean;
  mobileAccess: boolean;
  basicReports: boolean;
  advancedReports: boolean;
  apiIntegration: boolean;
  bulkImportExport: boolean;
  customWorkflows: boolean;
  customSla: boolean;
  multiLocation: boolean;
  ssoSaml: boolean;
  dedicatedManager: boolean;
  slaUptime999: boolean;
  [key: string]: boolean | string | undefined;
}

export const STANDARD_FEATURE_LABELS: Record<string, string> = {
  ticketManagement: 'Ticket Management & Calls',
  customerPortal: 'Customer Self-Service Portal',
  manualAssignment: 'Manual Assignment & Dispatch',
  autoAssignment: 'Automatic Assignment Engine',
  workloadBalancing: 'Technician Workload Balancing',
  employeeOnBehalf: 'Employee-on-Behalf Ticket Creation',
  ticketAgingAlerts: 'SLA Aging & Escalation Alerts',
  emailNotifications: 'Email Notifications & Alerts',
  pushNotifications: 'Push Notifications & Web Alerts',
  whatsappNotifications: 'WhatsApp Instant Alerts',
  mobileAccess: 'Mobile Technician Field Access',
  basicReports: 'Basic Operational Dashboards',
  advancedReports: 'Advanced Analytics & Exports',
  apiIntegration: 'Public REST API Keys',
  bulkImportExport: 'Bulk Data Import & CSV Export',
  customWorkflows: 'Custom Workflow & Ticket Builder',
  customSla: 'Custom SLA Escalation Rules',
  multiLocation: 'Multi-Location Support',
  ssoSaml: 'SSO / SAML Enterprise Auth',
  dedicatedManager: 'Dedicated Account Manager',
  slaUptime999: '99.9% Platform Uptime SLA',
};

export interface PlanDefinition {
  id: string; // 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | custom string
  code?: string;
  name: string;
  badge: string; // e.g. "Starter → Manage", "Professional → Automate", "Enterprise → Scale"
  description: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  annualTotalPrice: number;
  discountPercent: number;
  currency: string;
  billingIntervals: ('MONTHLY' | 'ANNUAL')[];
  trialDays: number;
  isFreeTrialAllowed: boolean;
  effectiveDate: string;
  status: PlanStatus;
  isRecommended: boolean;
  displayOrder: number;
  limits: PlanLimits;
  features: PlanFeatures;
  highlights: string[];
}

export interface ClientTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  plan?: string;
  billingCycle?: string;
  amount?: number;
  startsAt?: string;
  endsAt?: string;
  maxUsersQuota?: number;
  policy?: any;
}

// ── Canonical Home Page Plans Data (Exact 1:1 Match) ──────────────────────────

export const INITIAL_CANONICAL_PLANS: PlanDefinition[] = [
  {
    id: 'STARTER',
    name: 'Starter',
    badge: 'Starter → Manage',
    description: 'Manage service calls, customer history, and support team operations from one centralized system.',
    monthlyPrice: 2999,
    annualMonthlyPrice: 2399,
    annualTotalPrice: 28788,
    discountPercent: 20,
    currency: 'INR',
    billingIntervals: ['MONTHLY', 'ANNUAL'],
    trialDays: 0,
    isFreeTrialAllowed: false,
    effectiveDate: 'Immediate',
    status: 'ACTIVE',
    isRecommended: false,
    displayOrder: 1,
    limits: {
      maxUsers: 5,
      maxDepartments: 1,
      maxTicketsMonthly: 'Unlimited',
      storageGb: 5,
      maxIntegrations: 1,
    },
    features: {
      ticketManagement: true,
      customerPortal: true,
      manualAssignment: true,
      autoAssignment: false,
      workloadBalancing: false,
      employeeOnBehalf: false,
      ticketAgingAlerts: false,
      emailNotifications: true,
      pushNotifications: false,
      whatsappNotifications: false,
      mobileAccess: false,
      basicReports: true,
      advancedReports: false,
      apiIntegration: false,
      bulkImportExport: false,
      customWorkflows: false,
      customSla: false,
      multiLocation: false,
      ssoSaml: false,
      dedicatedManager: false,
      slaUptime999: false,
    },
    highlights: [
      'Up to 5 Technicians / Staff',
      'Unlimited Tickets & Calls',
      '1 Organization Workspace',
      'Manual Assignment & Status Tracking',
      'Email Notifications',
      'Basic Dashboard & Reports',
      '2FA Security & Audit Logs',
    ],
  },
  {
    id: 'PROFESSIONAL',
    name: 'Professional',
    badge: 'Professional → Automate',
    description: 'Automate ticket assignments, SLA escalations, and technician workloads across departments.',
    monthlyPrice: 6999,
    annualMonthlyPrice: 5599,
    annualTotalPrice: 67188,
    discountPercent: 20,
    currency: 'INR',
    billingIntervals: ['MONTHLY', 'ANNUAL'],
    trialDays: 14,
    isFreeTrialAllowed: true,
    effectiveDate: 'Immediate',
    status: 'ACTIVE',
    isRecommended: true,
    displayOrder: 2,
    limits: {
      maxUsers: 25,
      maxDepartments: 5,
      maxTicketsMonthly: 'Unlimited',
      storageGb: 50,
      maxIntegrations: 5,
    },
    features: {
      ticketManagement: true,
      customerPortal: true,
      manualAssignment: true,
      autoAssignment: true,
      workloadBalancing: true,
      employeeOnBehalf: true,
      ticketAgingAlerts: true,
      emailNotifications: true,
      pushNotifications: true,
      whatsappNotifications: false,
      mobileAccess: true,
      basicReports: true,
      advancedReports: true,
      apiIntegration: true,
      bulkImportExport: true,
      customWorkflows: false,
      customSla: false,
      multiLocation: false,
      ssoSaml: false,
      dedicatedManager: false,
      slaUptime999: false,
    },
    highlights: [
      'Up to 25 Technicians & Dispatchers',
      'Automatic Assignment (Role, Skill & Dept)',
      'Workload Balancing (Equal Distribution)',
      'Employee-on-Behalf Ticket Creation',
      'Mobile + Web Access & Push Alerts',
      'Ticket Aging & Escalation Alerts',
      'Bulk Import/Export & API Integration',
      '14-Day Free Trial Full Access',
    ],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    badge: 'Enterprise → Scale',
    description: 'Scale across multiple branches, territories, and integrate with custom ERP and CRM systems.',
    monthlyPrice: 14999,
    annualMonthlyPrice: 11999,
    annualTotalPrice: 143988,
    discountPercent: 20,
    currency: 'INR',
    billingIntervals: ['MONTHLY', 'ANNUAL'],
    trialDays: 14,
    isFreeTrialAllowed: true,
    effectiveDate: 'Immediate',
    status: 'ACTIVE',
    isRecommended: false,
    displayOrder: 3,
    limits: {
      maxUsers: 'Unlimited',
      maxDepartments: 'Unlimited',
      maxTicketsMonthly: 'Unlimited',
      storageGb: 'Unlimited',
      maxIntegrations: 'Unlimited',
    },
    features: {
      ticketManagement: true,
      customerPortal: true,
      manualAssignment: true,
      autoAssignment: true,
      workloadBalancing: true,
      employeeOnBehalf: true,
      ticketAgingAlerts: true,
      emailNotifications: true,
      pushNotifications: true,
      whatsappNotifications: true,
      mobileAccess: true,
      basicReports: true,
      advancedReports: true,
      apiIntegration: true,
      bulkImportExport: true,
      customWorkflows: true,
      customSla: true,
      multiLocation: true,
      ssoSaml: true,
      dedicatedManager: true,
      slaUptime999: true,
    },
    highlights: [
      'Unlimited Technicians & Admins (9,999)',
      'Multi-Location & Multi-Organization Support',
      'Email + WhatsApp + Push Notifications',
      'Custom SLA Policies & Priority Rules',
      'Custom Ticket Fields & Workflow Builder',
      'Dedicated Account Manager & 99.9% Uptime SLA',
      'Unlimited Storage & Custom Data Retention',
      'SSO / SAML Enterprise Authentication',
    ],
  },
];

interface Props {
  tenants: ClientTenant[];
  onRefreshData?: () => Promise<void>;
}

export function SubscriptionPlansManagement({ tenants = [], onRefreshData }: Props) {
  // ── States ───────────────────────────────────────────────────────────────────

  // Sub-tabs: 'catalogue' | 'entitlements' | 'comparison' | 'lifecycle'
  const [subTab, setSubTab] = useState<'catalogue' | 'entitlements' | 'comparison' | 'lifecycle'>('catalogue');

  // Plans list (persisted in localStorage for administrative customizer)
  const [plans, setPlans] = useState<PlanDefinition[]>(INITIAL_CANONICAL_PLANS);

  // Billing cycle view toggle on comparison / cards
  const [billingCycleView, setBillingCycleView] = useState<'monthly' | 'annual'>('annual');

  // Filter for plan status in catalogue
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [editingPlan, setEditingPlan] = useState<PlanDefinition | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editorTab, setEditorTab] = useState<'basic' | 'pricing' | 'limits' | 'entitlements'>('basic');

  // Delete modal state
  const [planToDelete, setPlanToDelete] = useState<PlanDefinition | null>(null);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);

  // Custom options builder states in editor
  const [newHighlightInput, setNewHighlightInput] = useState('');
  const [newFeatureNameInput, setNewFeatureNameInput] = useState('');
  const [newFeatureValueInput, setNewFeatureValueInput] = useState('');
  const [newFeatureStatus, setNewFeatureStatus] = useState<boolean>(true);

  // Plan Change / Upgrade / Downgrade Preview modal
  const [planChangeTarget, setPlanChangeTarget] = useState<{
    tenant: ClientTenant;
    targetPlanId: string;
    billingCycle: 'MONTHLY' | 'ANNUAL';
    status: 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'CANCELLED';
  } | null>(null);
  const [isApplyingChange, setIsApplyingChange] = useState(false);

  // Filter clients by plan modal / drilldown
  const [drilldownPlanId, setDrilldownPlanId] = useState<string | null>(null);

  // Client search in lifecycle tab
  const [lifecycleSearch, setLifecycleSearch] = useState('');
  const [lifecyclePlanFilter, setLifecyclePlanFilter] = useState('ALL');

  // Toast banner
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Load custom plans from server API or fallback
  const fetchPlans = React.useCallback(async () => {
    try {
      setIsLoadingPlans(true);
      const res = await apiClient<PlanDefinition[]>('/plans/manage');
      if (Array.isArray(res) && res.length > 0) {
        setPlans(res);
        return;
      }
    } catch (err: any) {
      console.warn('Could not fetch server plans, using fallback:', err);
    } finally {
      setIsLoadingPlans(false);
    }
    setPlans(INITIAL_CANONICAL_PLANS);
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Refresh plans from server
  const handleRefreshPlans = async () => {
    await fetchPlans();
    showToast('success', 'Plans refreshed from database.');
  };

  // Map client counts per plan
  const planClientCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of plans) {
      counts[p.id] = 0;
    }
    for (const t of tenants) {
      const pId = (t.plan || 'STARTER').toUpperCase();
      counts[pId] = (counts[pId] || 0) + 1;
    }
    return counts;
  }, [plans, tenants]);

  // Formatter
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // ── Plan Editor Handlers ─────────────────────────────────────────────────────

  const handleOpenEdit = (plan: PlanDefinition) => {
    setEditingPlan(JSON.parse(JSON.stringify(plan)));
    setIsCreatingNew(false);
    setEditorTab('basic');
  };

  const handleOpenCreate = () => {
    const newId = `CUSTOM_${Date.now().toString().slice(-4)}`;
    const blankPlan: PlanDefinition = {
      id: newId,
      name: 'Custom Tier',
      badge: 'Custom → Expand',
      description: 'Specialized enterprise or regional tier with tailored quotas.',
      monthlyPrice: 4999,
      annualMonthlyPrice: 3999,
      annualTotalPrice: 47988,
      discountPercent: 20,
      currency: 'INR',
      billingIntervals: ['MONTHLY', 'ANNUAL'],
      trialDays: 14,
      isFreeTrialAllowed: true,
      effectiveDate: new Date().toISOString().slice(0, 10),
      status: 'DRAFT',
      isRecommended: false,
      displayOrder: plans.length + 1,
      limits: {
        maxUsers: 15,
        maxDepartments: 3,
        maxTicketsMonthly: 'Unlimited',
        storageGb: 20,
        maxIntegrations: 3,
      },
      features: {
        ticketManagement: true,
        customerPortal: true,
        manualAssignment: true,
        autoAssignment: true,
        workloadBalancing: true,
        employeeOnBehalf: true,
        ticketAgingAlerts: true,
        emailNotifications: true,
        pushNotifications: true,
        whatsappNotifications: false,
        mobileAccess: true,
        basicReports: true,
        advancedReports: false,
        apiIntegration: true,
        bulkImportExport: true,
        customWorkflows: false,
        customSla: false,
        multiLocation: false,
        ssoSaml: false,
        dedicatedManager: false,
        slaUptime999: false,
      },
      highlights: ['Custom tailored quotas', 'Includes Auto Assignment', 'Email & Push Notifications'],
    };
    setEditingPlan(blankPlan);
    setIsCreatingNew(true);
    setEditorTab('basic');
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;
    if (!editingPlan.name.trim()) {
      alert('Plan name is required.');
      return;
    }

    try {
      setIsSavingPlan(true);
      if (isCreatingNew) {
        const payload = {
          ...editingPlan,
          code: (editingPlan.code || editingPlan.id).toUpperCase(),
        };
        const created = await apiClient<PlanDefinition>('/plans', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setPlans((prev) => [...prev, created].sort((a, b) => a.displayOrder - b.displayOrder));
        showToast('success', `Plan "${created.name}" created and published to server.`);
      } else {
        const updated = await apiClient<PlanDefinition>(`/plans/${editingPlan.id}`, {
          method: 'PUT',
          body: JSON.stringify(editingPlan),
        });
        setPlans((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p)).sort((a, b) => a.displayOrder - b.displayOrder)
        );
        showToast('success', `Plan "${updated.name}" updated successfully.`);
      }
      setEditingPlan(null);
      setIsCreatingNew(false);
      await fetchPlans();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to save plan on server.');
    } finally {
      setIsSavingPlan(false);
    }
  };

  // Toggle Plan Status (Activate / Deactivate)
  const handleTogglePlanStatus = async (plan: PlanDefinition) => {
    const nextStatus: PlanStatus = plan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const updated = await apiClient<PlanDefinition>(`/plans/${plan.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? updated : p)));
      showToast('success', `Plan "${plan.name}" status updated to ${nextStatus}.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to update plan status.');
    }
  };

  // Duplicate an existing plan
  const handleDuplicatePlan = async (plan: PlanDefinition) => {
    try {
      const duplicated = await apiClient<PlanDefinition>(`/plans/${plan.id}/duplicate`, {
        method: 'POST',
      });
      setPlans((prev) => [...prev, duplicated].sort((a, b) => a.displayOrder - b.displayOrder));
      showToast('success', `Plan duplicated as "${duplicated.name}".`);
      await fetchPlans();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to duplicate plan.');
    }
  };

  // Deprecate / Archive plan
  const handleArchivePlan = async (plan: PlanDefinition) => {
    const isCurrentlyArchived = plan.status === 'ARCHIVED';
    const actionLabel = isCurrentlyArchived ? 'restore' : 'archive';
    if (!confirm(`Are you sure you want to ${actionLabel} "${plan.name}"?`)) {
      return;
    }

    try {
      const nextStatus: PlanStatus = isCurrentlyArchived ? 'ACTIVE' : 'ARCHIVED';
      const updated = await apiClient<PlanDefinition>(`/plans/${plan.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? updated : p)));
      showToast('success', `Plan "${plan.name}" ${isCurrentlyArchived ? 'restored' : 'archived'}.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to update plan archive status.');
    }
  };

  // Permanently delete a plan
  const handleConfirmDeletePlan = async () => {
    if (!planToDelete) return;
    try {
      setIsDeletingPlan(true);
      const forceParam = forceDelete ? '?force=true' : '';
      await apiClient(`/plans/${planToDelete.id}${forceParam}`, {
        method: 'DELETE',
      });
      setPlans((prev) => prev.filter((p) => p.id !== planToDelete.id && p.code !== planToDelete.code));
      showToast('success', `Plan "${planToDelete.name}" permanently deleted.`);
      if (editingPlan?.id === planToDelete.id) {
        setEditingPlan(null);
      }
      setPlanToDelete(null);
      setForceDelete(false);
      await fetchPlans();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to delete plan.');
    } finally {
      setIsDeletingPlan(false);
    }
  };

  // ── Plan Change (Upgrade / Downgrade) Execution ──────────────────────────────

  const handleOpenPlanChange = (tenant: ClientTenant) => {
    const currentPlanId = (tenant.plan || 'STARTER').toUpperCase();
    const defaultTarget = currentPlanId === 'STARTER' ? 'PROFESSIONAL' : currentPlanId === 'PROFESSIONAL' ? 'ENTERPRISE' : 'STARTER';
    setPlanChangeTarget({
      tenant,
      targetPlanId: defaultTarget,
      billingCycle: (tenant.billingCycle as any) || 'ANNUAL',
      status: (tenant.status as any) || 'ACTIVE',
    });
  };

  const handleExecutePlanChange = async () => {
    if (!planChangeTarget) return;
    try {
      setIsApplyingChange(true);
      await apiClient.patch(`/tenants/${planChangeTarget.tenant.id}/subscription`, {
        plan: planChangeTarget.targetPlanId,
        billingCycle: planChangeTarget.billingCycle,
        status: planChangeTarget.status,
      });

      showToast(
        'success',
        `Client "${planChangeTarget.tenant.name}" successfully upgraded/changed to ${planChangeTarget.targetPlanId}!`
      );
      setPlanChangeTarget(null);

      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to update client subscription on server.');
    } finally {
      setIsApplyingChange(false);
    }
  };

  // Filtered plans in catalogue
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (statusFilter === 'ALL') return true;
      return p.status === statusFilter;
    });
  }, [plans, statusFilter]);

  // Lifecycle table filtered clients
  const lifecycleFilteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const q = lifecycleSearch.toLowerCase().trim();
      const matchesSearch = !q || t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q);
      const tenantPlan = (t.plan || 'STARTER').toUpperCase();
      const matchesPlan = lifecyclePlanFilter === 'ALL' || tenantPlan === lifecyclePlanFilter;
      return matchesSearch && matchesPlan;
    });
  }, [tenants, lifecycleSearch, lifecyclePlanFilter]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold border transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
            <span>{toast.message}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Sub-Nav Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900">Subscription Plans Management</h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 font-mono">
              Home-Page Synced
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage Starter, Professional & Enterprise plans, configure pricing, trial durations, module entitlements, and execute client lifecycle upgrades.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sub Tab Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSubTab('catalogue')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                subTab === 'catalogue' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-orange-600" />
              <span>1. Plan Catalogue</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('entitlements')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                subTab === 'entitlements' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ToggleRight className="w-3.5 h-3.5 text-purple-600" />
              <span>2. Features & Entitlements</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('comparison')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                subTab === 'comparison' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>3. Plan Comparison</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('lifecycle')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                subTab === 'lifecycle' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>4. Subscriptions & Lifecycle</span>
            </button>
          </div>

          <Button
            onClick={handleOpenCreate}
            className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs h-9"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span>Create Plan</span>
          </Button>

          <button
            type="button"
            onClick={handleRefreshPlans}
            disabled={isLoadingPlans}
            title="Refresh plans from database"
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingPlans ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 1. PLAN CATALOGUE VIEW (Features 1, 2, 3)                                */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {subTab === 'catalogue' && (
        <div className="space-y-6">
          {/* Controls: Status Filter & Annual / Monthly Preview */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Filter Status:</span>
              {(['ALL', 'ACTIVE', 'DRAFT', 'ARCHIVED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Display Pricing:</span>
              <div className="bg-slate-100 p-0.5 rounded-lg flex items-center text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setBillingCycleView('annual')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    billingCycleView === 'annual' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Annual (Save 20%)
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycleView('monthly')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    billingCycleView === 'monthly' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>
          </div>

          {/* Plan Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredPlans.map((plan) => {
              const clientCount = planClientCounts[plan.id] || 0;
              const isPro = plan.id === 'PROFESSIONAL';
              const isArchived = plan.status === 'ARCHIVED';
              const isDraft = plan.status === 'DRAFT';

              const displayPrice =
                billingCycleView === 'annual' ? plan.annualMonthlyPrice : plan.monthlyPrice;

              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all relative ${
                    isPro
                      ? 'bg-white border-2 border-orange-500 shadow-xl lg:-translate-y-1'
                      : isArchived
                      ? 'bg-slate-50 border border-slate-300 opacity-80'
                      : 'bg-white border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  {/* Recommended Badge */}
                  {plan.isRecommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-600 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-0.5 rounded-full shadow-sm whitespace-nowrap flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      <span>Most Popular • Recommended</span>
                    </div>
                  )}

                  <div>
                    {/* Header: Title, Order, Status */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-black text-slate-950">{plan.name}</h3>
                          <span className="text-[10px] font-mono text-slate-400 font-bold">#{plan.displayOrder}</span>
                        </div>
                        <span className="text-xs font-black text-orange-600 tracking-wide uppercase">
                          {plan.badge}
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                            isArchived
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : isDraft
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {plan.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDrilldownPlanId(plan.id)}
                          className="text-[11px] font-bold text-slate-500 hover:text-orange-600 flex items-center gap-1"
                        >
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>{clientCount} Clients</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 min-h-[36px] line-clamp-2 leading-relaxed mb-4">
                      {plan.description}
                    </p>

                    {/* Archived Notice */}
                    {isArchived && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] mb-4 space-y-0.5">
                        <div className="flex items-center gap-1 font-bold">
                          <AlertTriangle className="w-3 h-3 text-amber-700" />
                          <span>Grandfathered / Deprecated Plan</span>
                        </div>
                        <p className="text-[10px] text-amber-800">
                          Existing {clientCount} subscribed clients retain access. Hidden from new signups.
                        </p>
                      </div>
                    )}

                    {/* Limits Box */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 mb-5 text-xs space-y-1.5 text-slate-700">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" /> Licensed Staff:
                        </span>
                        <strong className="text-slate-900 font-extrabold">
                          {plan.limits.maxUsers === 'Unlimited' ? 'Unlimited Seats' : `${plan.limits.maxUsers} Technicians`}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" /> Departments:
                        </span>
                        <strong className="text-slate-900 font-extrabold">
                          {plan.limits.maxDepartments === 'Unlimited' ? 'Unlimited Depts' : `${plan.limits.maxDepartments} Depts`}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 flex items-center gap-1">
                          <HardDrive className="w-3 h-3 text-slate-400" /> Cloud Storage:
                        </span>
                        <strong className="text-slate-900 font-extrabold">
                          {plan.limits.storageGb === 'Unlimited' ? 'Unlimited Storage' : `${plan.limits.storageGb} GB`}
                        </strong>
                      </div>
                    </div>

                    {/* Price Block */}
                    <div className="mb-5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-black text-slate-950">
                          {formatINR(displayPrice)}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">/month</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium">
                        {billingCycleView === 'annual'
                          ? `Billed annually (${formatINR(plan.annualTotalPrice)}/yr)`
                          : `Billed monthly`}
                        {' • '}
                        {plan.isFreeTrialAllowed ? `${plan.trialDays}-Day Free Trial` : 'Paid Plan'}
                      </p>
                    </div>

                    {/* Highlights List */}
                    <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-700">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                        Core Entitlements:
                      </span>
                      {plan.highlights.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="leading-tight">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions Footer: Edit, Delete, Duplicate, Activate/Deactivate, Archive */}
                  <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleOpenEdit(plan)}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs font-bold border-slate-200 hover:border-orange-400 hover:text-orange-600 h-8"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                        <span>Edit Plan</span>
                      </Button>
                      <Button
                        onClick={() => {
                          setPlanToDelete(plan);
                          setForceDelete(false);
                        }}
                        variant="outline"
                        size="sm"
                        title="Delete Plan Permanently"
                        className="text-xs font-bold border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-400 h-8 px-3"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        <span>Delete</span>
                      </Button>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-50">
                      <span className="font-medium">Quick actions:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicatePlan(plan)}
                          title="Duplicate Plan"
                          className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-orange-600 transition-colors flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePlanStatus(plan)}
                          title={
                            plan.status === 'ACTIVE'
                              ? 'Deactivate plan (Hide from checkout)'
                              : 'Activate plan (Publish to checkout)'
                          }
                          className={`px-2 py-1 rounded-lg border text-[11px] transition-colors flex items-center gap-1 ${
                            plan.status === 'ACTIVE'
                              ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              : 'border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-emerald-600'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          <span>{plan.status === 'ACTIVE' ? 'Active' : 'Draft'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchivePlan(plan)}
                          title={isArchived ? 'Restore plan' : 'Archive plan'}
                          className={`px-2 py-1 rounded-lg border text-[11px] transition-colors flex items-center gap-1 ${
                            isArchived
                              ? 'border-amber-300 text-amber-700 hover:bg-amber-100'
                              : 'border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-amber-600'
                          }`}
                        >
                          <Archive className="w-3 h-3" />
                          <span>{isArchived ? 'Archived' : 'Archive'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 2. FEATURES & ENTITLEMENTS ENGINE VIEW                                    */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {subTab === 'entitlements' && (
        <FeaturesEntitlementsManagement />
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 3. PLAN COMPARISON MATRIX VIEW                                           */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {subTab === 'comparison' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Side-by-Side Tier Comparison Matrix</h3>
              <p className="text-xs text-slate-500">
                Identify features available only on higher plans and review exact price points.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Cycle:</span>
              <div className="bg-slate-100 p-0.5 rounded-lg flex items-center text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setBillingCycleView('annual')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    billingCycleView === 'annual' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Annual (20% Off)
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycleView('monthly')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    billingCycleView === 'monthly' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-800">
                    <th className="p-4 font-black uppercase text-[11px] tracking-wider w-2/5">
                      Feature &amp; Limit Matrix
                    </th>
                    {plans.map((p) => {
                      const displayPrice =
                        billingCycleView === 'annual' ? p.annualMonthlyPrice : p.monthlyPrice;
                      return (
                        <th key={p.id} className="p-4 text-center border-l border-slate-100 w-1/5 min-w-[180px]">
                          <div className="space-y-1">
                            <span className="block font-black text-sm text-slate-950">{p.name}</span>
                            <span className="text-[10px] font-bold text-orange-600 block">{p.badge}</span>
                            <div className="text-base font-black text-slate-900 mt-1">
                              {formatINR(displayPrice)}
                              <span className="text-[10px] text-slate-500 font-normal">/mo</span>
                            </div>
                            <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold font-mono">
                              {planClientCounts[p.id] || 0} Clients
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                handleOpenEdit(p);
                                setEditorTab('entitlements');
                              }}
                              className="w-full text-[11px] font-bold py-1 px-2 rounded-lg border border-orange-200 text-orange-700 bg-orange-50/60 hover:bg-orange-100 transition-colors flex items-center justify-center gap-1 mt-1.5"
                            >
                              <Sliders className="w-3 h-3 text-orange-600" />
                              <span>Customize Options</span>
                            </button>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Category: Pricing & Terms */}
                  <tr className="bg-slate-50/80 font-black text-[11px] text-slate-700 uppercase tracking-wider">
                    <td colSpan={plans.length + 1} className="px-4 py-2">
                      1. Pricing, Currency &amp; Free Trial
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-semibold text-slate-800">Annual Billed Price</td>
                    {plans.map((p) => (
                      <td key={p.id} className="p-3.5 text-center font-bold text-slate-700 border-l border-slate-100">
                        {formatINR(p.annualTotalPrice)}/yr
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3.5 font-semibold text-slate-800">Free Trial Duration</td>
                    {plans.map((p) => (
                      <td key={p.id} className="p-3.5 text-center font-bold text-slate-700 border-l border-slate-100">
                        {p.isFreeTrialAllowed ? `${p.trialDays} Days Free Trial` : 'Paid (0 Days)'}
                      </td>
                    ))}
                  </tr>

                  {/* Category: Quotas & Capacity */}
                  <tr className="bg-slate-50/80 font-black text-[11px] text-slate-700 uppercase tracking-wider">
                    <td colSpan={plans.length + 1} className="px-4 py-2">
                      2. Scale &amp; Capacity Quotas
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-semibold text-slate-800">Licensed Technicians / Staff Quota</td>
                    {plans.map((p) => (
                      <td key={p.id} className="p-3.5 text-center font-extrabold text-slate-900 border-l border-slate-100">
                        {p.limits.maxUsers === 'Unlimited' ? 'Unlimited Seats' : `${p.limits.maxUsers} Users`}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3.5 font-semibold text-slate-800">Department Workspaces</td>
                    {plans.map((p) => (
                      <td key={p.id} className="p-3.5 text-center font-extrabold text-slate-900 border-l border-slate-100">
                        {p.limits.maxDepartments === 'Unlimited' ? 'Unlimited Depts' : `${p.limits.maxDepartments} Dept`}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3.5 font-semibold text-slate-800">Document &amp; File Storage Limit</td>
                    {plans.map((p) => (
                      <td key={p.id} className="p-3.5 text-center font-bold text-slate-700 border-l border-slate-100">
                        {p.limits.storageGb === 'Unlimited' ? 'Unlimited Storage' : `${p.limits.storageGb} GB`}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3.5 font-semibold text-slate-800">Monthly Ticket Quota</td>
                    {plans.map((p) => (
                      <td key={p.id} className="p-3.5 text-center font-bold text-emerald-700 border-l border-slate-100">
                        Unlimited Calls &amp; Tickets
                      </td>
                    ))}
                  </tr>

                  {/* Category: Automation & Routing (Higher Plan Exclusives) */}
                  <tr className="bg-slate-50/80 font-black text-[11px] text-slate-700 uppercase tracking-wider">
                    <td colSpan={plans.length + 1} className="px-4 py-2 flex items-center justify-between">
                      <span>3. Automation, Workflows &amp; Routing</span>
                      <span className="text-[10px] text-orange-700 font-bold normal-case">★ Higher Plan Exclusives</span>
                    </td>
                  </tr>
                  {[
                    { key: 'autoAssignment', label: 'Automatic Skill & Department Assignment' },
                    { key: 'workloadBalancing', label: 'Equal Ticket Distribution & Workload Balancing' },
                    { key: 'employeeOnBehalf', label: 'Employee-on-Behalf Ticket Creation' },
                    { key: 'ticketAgingAlerts', label: 'Real-Time SLA Aging & Escalation Alerts' },
                    { key: 'customWorkflows', label: 'Custom Ticket Fields & Workflow Engine' },
                    { key: 'customSla', label: 'Custom SLA Policies & Priority Rules' },
                  ].map((row) => (
                    <tr key={row.key} className="hover:bg-slate-50/50">
                      <td className="p-3.5 font-semibold text-slate-800 flex items-center gap-2">
                        <span>{row.label}</span>
                        {row.key === 'autoAssignment' && (
                          <span className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.2 rounded font-bold">
                            Pro+
                          </span>
                        )}
                        {row.key === 'customWorkflows' && (
                          <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-bold">
                            Enterprise
                          </span>
                        )}
                      </td>
                      {plans.map((p) => {
                        const hasFeat = (p.features as any)[row.key];
                        return (
                          <td key={p.id} className="p-3.5 text-center border-l border-slate-100">
                            {hasFeat ? (
                              <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-slate-300 mx-auto" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Category: Channels & Security */}
                  <tr className="bg-slate-50/80 font-black text-[11px] text-slate-700 uppercase tracking-wider">
                    <td colSpan={plans.length + 1} className="px-4 py-2">
                      4. Channels, APIs, Analytics &amp; Enterprise Governance
                    </td>
                  </tr>
                  {[
                    { key: 'emailNotifications', label: 'Email Notifications & Custom SMTP' },
                    { key: 'pushNotifications', label: 'Technician Push Notifications' },
                    { key: 'mobileAccess', label: 'Mobile + Web Platform Access' },
                    { key: 'whatsappNotifications', label: 'WhatsApp Customer Instant Notifications' },
                    { key: 'bulkImportExport', label: 'Bulk Customer & Asset Import/Export (CSV/Excel)' },
                    { key: 'apiIntegration', label: 'Public REST API Keys & Webhooks' },
                    { key: 'advancedReports', label: 'Executive Analytics & Drilldown Dashboards' },
                    { key: 'multiLocation', label: 'Multi-Location & Branch Support' },
                    { key: 'ssoSaml', label: 'SSO / SAML Enterprise Authentication' },
                    { key: 'dedicatedManager', label: 'Dedicated Account Manager & 99.9% SLA' },
                  ].map((row) => (
                    <tr key={row.key} className="hover:bg-slate-50/50">
                      <td className="p-3.5 font-semibold text-slate-800">{row.label}</td>
                      {plans.map((p) => {
                        const hasFeat = (p.features as any)[row.key];
                        return (
                          <td key={p.id} className="p-3.5 text-center border-l border-slate-100">
                            {hasFeat ? (
                              <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-slate-300 mx-auto" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 5. CLIENT SUBSCRIPTIONS LIFECYCLE & UPGRADES VIEW (Feature 5)            */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {subTab === 'lifecycle' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Client Plan Subscriptions &amp; Lifecycle Management</h3>
              <p className="text-xs text-slate-500">
                Upgrade, downgrade, preview changes, handle deprecation, and track which clients are on each tier.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search client organization..."
                  value={lifecycleSearch}
                  onChange={(e) => setLifecycleSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-56 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <select
                value={lifecyclePlanFilter}
                onChange={(e) => setLifecyclePlanFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700"
              >
                <option value="ALL">All Plans</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lifecycle Table */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-600 uppercase tracking-wider grid grid-cols-12">
              <div className="col-span-3">Client Company</div>
              <div className="col-span-2">Current Plan</div>
              <div className="col-span-2">Status &amp; Cycle</div>
              <div className="col-span-2">Users / Limit</div>
              <div className="col-span-2">Renewal / Expiry</div>
              <div className="col-span-1 text-right">Action</div>
            </div>

            {lifecycleFilteredTenants.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No matching client organizations found for this filter.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs font-medium">
                {lifecycleFilteredTenants.map((t) => {
                  const currentPlanId = (t.plan || 'STARTER').toUpperCase();
                  const planObj: PlanDefinition = plans.find((p) => p.id === currentPlanId) || INITIAL_CANONICAL_PLANS[0]!;
                  const isTrial = t.status === 'TRIAL';

                  return (
                    <div key={t.id} className="p-4 grid grid-cols-12 items-center hover:bg-slate-50 transition-colors">
                      {/* Name & Slug */}
                      <div className="col-span-3 font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 font-black flex items-center justify-center text-xs">
                          {t.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="block font-bold">{t.name}</span>
                          <span className="block text-[11px] text-slate-400 font-mono">/{t.slug}</span>
                        </div>
                      </div>

                      {/* Current Plan */}
                      <div className="col-span-2">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold ${
                            currentPlanId === 'ENTERPRISE'
                              ? 'bg-purple-50 text-purple-800 border border-purple-200'
                              : currentPlanId === 'PROFESSIONAL'
                              ? 'bg-orange-50 text-orange-800 border border-orange-200'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}
                        >
                          {planObj.name}
                        </span>
                      </div>

                      {/* Status & Billing Cycle */}
                      <div className="col-span-2 space-y-0.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isTrial
                              ? 'bg-blue-100 text-blue-800'
                              : t.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {t.status}
                        </span>
                        <span className="block text-[10px] text-slate-500 font-mono uppercase">
                          {t.billingCycle || 'ANNUAL'}
                        </span>
                      </div>

                      {/* Quota */}
                      <div className="col-span-2 text-slate-700">
                        <span className="font-extrabold">{t.maxUsersQuota || planObj.limits.maxUsers}</span>
                        <span className="text-slate-400 text-[11px]"> licensed users</span>
                      </div>

                      {/* Renewal Date */}
                      <div className="col-span-2 font-mono text-slate-600 text-[11px]">
                        {t.endsAt ? new Date(t.endsAt).toLocaleDateString('en-IN') : 'Ongoing SLA'}
                      </div>

                      {/* Action: Change Plan */}
                      <div className="col-span-1 text-right">
                        <Button
                          onClick={() => handleOpenPlanChange(t)}
                          variant="outline"
                          size="sm"
                          className="h-8 text-[11px] font-bold border-slate-200 hover:border-orange-500 hover:text-orange-600 px-2.5"
                        >
                          Change
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: CREATE & EDIT PLAN (Features 1, 2, 3)                           */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {editingPlan && (
        <Dialog
          open={!!editingPlan}
          onOpenChange={(open) => !open && setEditingPlan(null)}
          title={isCreatingNew ? 'Create New Subscription Plan' : `Edit Plan: ${editingPlan.name}`}
        >
          <div className="space-y-5 text-xs max-h-[80vh] overflow-y-auto pr-1">
            {/* Modal Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setEditorTab('basic')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  editorTab === 'basic' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Plan Info
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('pricing')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  editorTab === 'pricing' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Pricing &amp; Trial
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('limits')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  editorTab === 'limits' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3. Resource Limits
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('entitlements')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  editorTab === 'entitlements' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                4. Custom Options &amp; Features
              </button>
            </div>

            {/* TAB 1: BASIC PLAN INFO */}
            {editorTab === 'basic' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Plan Identifier (ID)</label>
                    <Input
                      disabled={!isCreatingNew}
                      value={editingPlan.id}
                      onChange={(e) => setEditingPlan({ ...editingPlan, id: e.target.value.toUpperCase() })}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Plan Display Name *</label>
                    <Input
                      value={editingPlan.name}
                      onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Tagline / Badge Text</label>
                    <Input
                      placeholder="e.g. Starter → Manage"
                      value={editingPlan.badge}
                      onChange={(e) => setEditingPlan({ ...editingPlan, badge: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Display Order</label>
                    <Input
                      type="number"
                      value={editingPlan.displayOrder}
                      onChange={(e) => setEditingPlan({ ...editingPlan, displayOrder: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Description</label>
                  <textarea
                    rows={2}
                    value={editingPlan.description}
                    onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Plan Lifecycle Status</label>
                    <select
                      value={editingPlan.status}
                      onChange={(e) => setEditingPlan({ ...editingPlan, status: e.target.value as PlanStatus })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800"
                    >
                      <option value="ACTIVE">Active (Available for checkout)</option>
                      <option value="INACTIVE">Inactive (Deactivated from checkout)</option>
                      <option value="DRAFT">Draft (Internal preview only)</option>
                      <option value="ARCHIVED">Archived (Grandfather existing clients, hide for new)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Recommended / Most Popular</label>
                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer h-10">
                      <input
                        type="checkbox"
                        checked={editingPlan.isRecommended}
                        onChange={(e) => setEditingPlan({ ...editingPlan, isRecommended: e.target.checked })}
                        className="w-4 h-4 text-orange-600 rounded border-slate-300"
                      />
                      <span className="text-xs font-bold text-slate-800">Mark as Recommended</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PRICING & TRIAL CONFIGURATION */}
            {editorTab === 'pricing' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Monthly Price (₹)</label>
                    <Input
                      type="number"
                      value={editingPlan.monthlyPrice}
                      onChange={(e) => {
                        const m = Number(e.target.value);
                        const disc = editingPlan.discountPercent || 20;
                        const annMo = Math.round(m * (1 - disc / 100));
                        setEditingPlan({
                          ...editingPlan,
                          monthlyPrice: m,
                          annualMonthlyPrice: annMo,
                          annualTotalPrice: annMo * 12,
                        });
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Annual Price / Mo (₹)</label>
                    <Input
                      type="number"
                      value={editingPlan.annualMonthlyPrice}
                      onChange={(e) => {
                        const annMo = Number(e.target.value);
                        setEditingPlan({
                          ...editingPlan,
                          annualMonthlyPrice: annMo,
                          annualTotalPrice: annMo * 12,
                        });
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Annual Total (₹)</label>
                    <Input
                      type="number"
                      value={editingPlan.annualTotalPrice}
                      onChange={(e) => setEditingPlan({ ...editingPlan, annualTotalPrice: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Free Trial Settings</label>
                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer h-10">
                      <input
                        type="checkbox"
                        checked={editingPlan.isFreeTrialAllowed}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            isFreeTrialAllowed: e.target.checked,
                            trialDays: e.target.checked ? (editingPlan.trialDays || 14) : 0,
                          })
                        }
                        className="w-4 h-4 text-orange-600 rounded border-slate-300"
                      />
                      <span className="text-xs font-bold text-slate-800">Enable Free Trial Window</span>
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Trial Duration (Days)</label>
                    <Input
                      type="number"
                      disabled={!editingPlan.isFreeTrialAllowed}
                      value={editingPlan.trialDays}
                      onChange={(e) => setEditingPlan({ ...editingPlan, trialDays: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Currency</label>
                    <select
                      value={editingPlan.currency}
                      onChange={(e) => setEditingPlan({ ...editingPlan, currency: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800"
                    >
                      <option value="INR">INR (₹) - Indian Rupee</option>
                      <option value="USD">USD ($) - US Dollar</option>
                      <option value="EUR">EUR (€) - Euro</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Price Change Effective Date</label>
                    <Input
                      type="date"
                      value={editingPlan.effectiveDate === 'Immediate' ? new Date().toISOString().slice(0, 10) : editingPlan.effectiveDate}
                      onChange={(e) => setEditingPlan({ ...editingPlan, effectiveDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 space-y-1">
                  <span className="font-bold text-slate-800 block text-[11px]">Notice on Price Adjustments:</span>
                  <p className="text-[11px] leading-relaxed">
                    Existing clients retain their grandfathered contract rate until scheduled annual renewal, protecting customer trust.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: CAPACITY & RESOURCE LIMITS */}
            {editorTab === 'limits' && (
              <div className="space-y-4">
                <div>
                  <span className="font-bold text-slate-800 block">Numeric Capacity &amp; Resource Quotas</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Define maximum staff, department, storage, and ticket quotas enforced for organizations on this tier.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <label className="text-xs font-bold text-slate-800 block">Licensed Technicians / Staff</label>
                    <Input
                      value={String(editingPlan.limits.maxUsers)}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          limits: {
                            ...editingPlan.limits,
                            maxUsers: e.target.value === 'Unlimited' ? 'Unlimited' : Number(e.target.value) || 0,
                          },
                        })
                      }
                      className="bg-white font-mono font-bold"
                    />
                    <div className="flex gap-1 pt-1">
                      {['5', '15', '25', '50', 'Unlimited'].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() =>
                            setEditingPlan({
                              ...editingPlan,
                              limits: {
                                ...editingPlan.limits,
                                maxUsers: val === 'Unlimited' ? 'Unlimited' : Number(val),
                              },
                            })
                          }
                          className="px-2 py-0.5 rounded text-[10px] bg-white border border-slate-200 hover:border-orange-400 hover:text-orange-600 font-bold"
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <label className="text-xs font-bold text-slate-800 block">Organization Departments</label>
                    <Input
                      value={String(editingPlan.limits.maxDepartments)}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          limits: {
                            ...editingPlan.limits,
                            maxDepartments: e.target.value === 'Unlimited' ? 'Unlimited' : Number(e.target.value) || 0,
                          },
                        })
                      }
                      className="bg-white font-mono font-bold"
                    />
                    <div className="flex gap-1 pt-1">
                      {['1', '3', '5', '10', 'Unlimited'].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() =>
                            setEditingPlan({
                              ...editingPlan,
                              limits: {
                                ...editingPlan.limits,
                                maxDepartments: val === 'Unlimited' ? 'Unlimited' : Number(val),
                              },
                            })
                          }
                          className="px-2 py-0.5 rounded text-[10px] bg-white border border-slate-200 hover:border-orange-400 hover:text-orange-600 font-bold"
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <label className="text-xs font-bold text-slate-800 block">Cloud Storage (GB)</label>
                    <Input
                      value={String(editingPlan.limits.storageGb)}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          limits: {
                            ...editingPlan.limits,
                            storageGb: e.target.value === 'Unlimited' ? 'Unlimited' : Number(e.target.value) || 0,
                          },
                        })
                      }
                      className="bg-white font-mono font-bold"
                    />
                    <div className="flex gap-1 pt-1">
                      {['5', '20', '50', '100', 'Unlimited'].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() =>
                            setEditingPlan({
                              ...editingPlan,
                              limits: {
                                ...editingPlan.limits,
                                storageGb: val === 'Unlimited' ? 'Unlimited' : Number(val),
                              },
                            })
                          }
                          className="px-2 py-0.5 rounded text-[10px] bg-white border border-slate-200 hover:border-orange-400 hover:text-orange-600 font-bold"
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <label className="text-xs font-bold text-slate-800 block">Monthly Service Tickets</label>
                    <Input
                      value={String(editingPlan.limits.maxTicketsMonthly || 'Unlimited')}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          limits: {
                            ...editingPlan.limits,
                            maxTicketsMonthly: e.target.value === 'Unlimited' ? 'Unlimited' : Number(e.target.value) || 0,
                          },
                        })
                      }
                      className="bg-white font-mono font-bold"
                    />
                    <div className="flex gap-1 pt-1">
                      {['500', '2500', '10000', 'Unlimited'].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() =>
                            setEditingPlan({
                              ...editingPlan,
                              limits: {
                                ...editingPlan.limits,
                                maxTicketsMonthly: val === 'Unlimited' ? 'Unlimited' : Number(val),
                              },
                            })
                          }
                          className="px-2 py-0.5 rounded text-[10px] bg-white border border-slate-200 hover:border-orange-400 hover:text-orange-600 font-bold"
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: CUSTOM OPTIONS & HIGHLIGHTS BUILDER */}
            {editorTab === 'entitlements' && (
              <div className="space-y-6">
                {/* 1. Plan Highlights & Selling Points (Customer Facing) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block text-xs">
                        Plan Selling Points &amp; Highlights
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Bullet points displayed on plan cards, main landing page, and client upgrade modals.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">
                      {(editingPlan.highlights || []).length} Highlights
                    </span>
                  </div>

                  {/* Add New Highlight Form */}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Add key selling point (e.g. Up to 15 Technicians, WhatsApp Alerts)..."
                      value={newHighlightInput}
                      onChange={(e) => setNewHighlightInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newHighlightInput.trim()) {
                            setEditingPlan({
                              ...editingPlan,
                              highlights: [...(editingPlan.highlights || []), newHighlightInput.trim()],
                            });
                            setNewHighlightInput('');
                          }
                        }
                      }}
                      className="text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (newHighlightInput.trim()) {
                          setEditingPlan({
                            ...editingPlan,
                            highlights: [...(editingPlan.highlights || []), newHighlightInput.trim()],
                          });
                          setNewHighlightInput('');
                        }
                      }}
                      className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shrink-0 h-9"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add Option
                    </Button>
                  </div>

                  {/* Quick Preset Suggestion Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 self-center mr-1">Quick Add:</span>
                    {[
                      'Unlimited Service Tickets',
                      '14-Day Full Free Trial',
                      'WhatsApp & SMS Alerts',
                      'Automatic Technician Routing',
                      'Mobile Field App Access',
                      'Custom SLA Escalations',
                      'Dedicated Account Manager',
                      '2FA Security & Audit Logs',
                      '99.9% Uptime Guarantee',
                    ].map((suggestion) => {
                      const alreadyAdded = (editingPlan.highlights || []).includes(suggestion);
                      if (alreadyAdded) return null;
                      return (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            setEditingPlan({
                              ...editingPlan,
                              highlights: [...(editingPlan.highlights || []), suggestion],
                            });
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-colors font-medium flex items-center gap-1"
                        >
                          <Plus className="w-2.5 h-2.5 text-slate-400" />
                          <span>{suggestion}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Highlights List */}
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 pt-1">
                    {(editingPlan.highlights || []).map((highlight, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 group hover:border-slate-300"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <input
                          type="text"
                          value={highlight}
                          onChange={(e) => {
                            const updated = [...(editingPlan.highlights || [])];
                            updated[idx] = e.target.value;
                            setEditingPlan({ ...editingPlan, highlights: updated });
                          }}
                          className="flex-1 bg-transparent text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-orange-500 rounded px-1"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (editingPlan.highlights || []).filter((_, i) => i !== idx);
                            setEditingPlan({ ...editingPlan, highlights: updated });
                          }}
                          title="Remove option"
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {(editingPlan.highlights || []).length === 0 && (
                      <div className="text-center py-4 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No highlights added yet. Use the input above or click a suggestion chip to add.
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Custom Capabilities & Feature Options */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block text-xs">
                        Feature Entitlements &amp; Custom Options
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Customize what capabilities are included, specify custom values, or add brand-new options.
                      </p>
                    </div>
                  </div>

                  {/* Add New Custom Feature Option Form */}
                  <div className="p-3 rounded-xl bg-orange-50/50 border border-orange-200/80 space-y-2.5">
                    <span className="text-[11px] font-bold text-orange-950 block">
                      + Add New Custom Feature / Capability Option:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-6">
                        <Input
                          placeholder="Feature or capability name (e.g. Night Shift Field Support)..."
                          value={newFeatureNameInput}
                          onChange={(e) => setNewFeatureNameInput(e.target.value)}
                          className="text-xs bg-white"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <Input
                          placeholder="Detail / Quota (Optional)"
                          value={newFeatureValueInput}
                          onChange={(e) => setNewFeatureValueInput(e.target.value)}
                          className="text-xs bg-white"
                        />
                      </div>
                      <div className="sm:col-span-3 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setNewFeatureStatus(!newFeatureStatus)}
                          className={`flex-1 h-9 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                            newFeatureStatus
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-200 text-slate-700 border-slate-300'
                          }`}
                        >
                          {newFeatureStatus ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                          <span>{newFeatureStatus ? 'Included' : 'Excluded'}</span>
                        </button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            if (newFeatureNameInput.trim()) {
                              const featureKey = newFeatureNameInput.trim().replace(/\s+/g, '_').toLowerCase();
                              setEditingPlan({
                                ...editingPlan,
                                features: {
                                  ...editingPlan.features,
                                  [featureKey]: newFeatureValueInput.trim() ? newFeatureValueInput.trim() : newFeatureStatus,
                                },
                              });
                              setNewFeatureNameInput('');
                              setNewFeatureValueInput('');
                              setNewFeatureStatus(true);
                              showToast('success', `Option "${newFeatureNameInput.trim()}" added to plan.`);
                            }
                          }}
                          className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-9 px-3"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* List of Feature Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-64 overflow-y-auto pr-1">
                    {Object.entries(editingPlan.features || {}).map(([key, val]) => {
                      const isIncluded =
                        val === true || (typeof val === 'string' && val.toLowerCase() !== 'false' && val.toLowerCase() !== 'no');
                      const label =
                        STANDARD_FEATURE_LABELS[key] ||
                        key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                      const isCustom = !STANDARD_FEATURE_LABELS[key];
                      const detailText = typeof val === 'string' && val !== 'true' && val !== 'false' ? val : '';

                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between p-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-800 block truncate" title={label}>
                              {label}
                            </span>
                            {detailText && (
                              <span className="text-[10px] font-mono text-orange-600 font-semibold block">
                                {detailText}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Toggle Included / Excluded */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPlan({
                                  ...editingPlan,
                                  features: {
                                    ...editingPlan.features,
                                    [key]: !isIncluded,
                                  },
                                });
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 border ${
                                isIncluded
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              {isIncluded ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Yes</span>
                                </>
                              ) : (
                                <>
                                  <X className="w-3 h-3 text-slate-400" />
                                  <span>No</span>
                                </>
                              )}
                            </button>

                            {/* Delete custom feature button */}
                            {isCustom && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedFeatures = { ...editingPlan.features };
                                  delete updatedFeatures[key];
                                  setEditingPlan({
                                    ...editingPlan,
                                    features: updatedFeatures,
                                  });
                                }}
                                title="Remove custom option"
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Action Buttons */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setEditingPlan(null)} disabled={isSavingPlan}>
                  Cancel
                </Button>
                {!isCreatingNew && (
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setPlanToDelete(editingPlan);
                      setForceDelete(false);
                    }}
                    disabled={isSavingPlan}
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 text-xs font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    <span>Delete Plan</span>
                  </Button>
                )}
              </div>
              <Button
                onClick={handleSavePlan}
                disabled={isSavingPlan}
                className="bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold"
              >
                {isSavingPlan ? 'Saving Plan...' : 'Save Plan Changes'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* DELETE PLAN CONFIRMATION DIALOG                                          */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {planToDelete && (() => {
        const activeTenantCount = (planToDelete?.id ? planClientCounts[planToDelete.id] : 0) ?? 0;
        return (
          <Dialog
            open={!!planToDelete}
            onOpenChange={(open) => !open && setPlanToDelete(null)}
            title={`Permanently Delete Plan: ${planToDelete.name}`}
          >
            <div className="space-y-4 text-xs pt-1">
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-rose-950">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Confirm Permanent Deletion</span>
                </div>
                <p className="leading-relaxed">
                  You are about to delete <strong className="font-mono text-rose-950">{planToDelete.name}</strong> ({planToDelete.code || planToDelete.id}).
                  This will permanently remove the plan from the database and public pricing listings.
                </p>
              </div>

              {activeTenantCount > 0 ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Users className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      Warning: {activeTenantCount} Client Organization(s) Currently Subscribed
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Existing clients are actively using this plan tier. We recommend clicking <strong>Archive</strong> instead to grandfather their existing terms while preventing any new signups.
                  </p>
                  <label className="flex items-start gap-2 pt-2 border-t border-amber-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forceDelete}
                      onChange={(e) => setForceDelete(e.target.checked)}
                      className="w-4 h-4 text-rose-600 rounded border-amber-400 mt-0.5"
                    />
                    <span className="text-[11px] font-bold text-amber-950">
                      I acknowledge that {activeTenantCount} client(s) use this tier, and I still want to force permanent deletion.
                    </span>
                  </label>
                </div>
              ) : (
                <p className="text-slate-500 text-[11px]">
                  No active client subscriptions are linked to this plan. It is completely safe to delete.
                </p>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPlanToDelete(null);
                    setForceDelete(false);
                  }}
                  disabled={isDeletingPlan}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmDeletePlan}
                  disabled={isDeletingPlan || (activeTenantCount > 0 && !forceDelete)}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  {isDeletingPlan ? (
                    <div className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting Plan...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Plan Permanently</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </Dialog>
        );
      })()}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: PLAN CHANGE PREVIEW (Upgrade / Downgrade) (Feature 5)            */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {planChangeTarget && (
        <Dialog
          open={!!planChangeTarget}
          onOpenChange={(open) => !open && setPlanChangeTarget(null)}
          title={`Change Plan for ${planChangeTarget.tenant.name}`}
        >
          <div className="space-y-5 text-xs max-h-[80vh] overflow-y-auto pr-1">
            <p className="text-slate-500">
              Preview before/after quotas and pricing impact before applying subscription changes to the client tenant.
            </p>

            {/* Selector: Choose Target Plan */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Select Target Plan</label>
                <select
                  value={planChangeTarget.targetPlanId}
                  onChange={(e) => setPlanChangeTarget({ ...planChangeTarget, targetPlanId: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.badge}) - {formatINR(p.annualMonthlyPrice)}/mo
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Billing Interval</label>
                <select
                  value={planChangeTarget.billingCycle}
                  onChange={(e) =>
                    setPlanChangeTarget({ ...planChangeTarget, billingCycle: e.target.value as 'MONTHLY' | 'ANNUAL' })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900"
                >
                  <option value="ANNUAL">Annual (20% Savings)</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
            </div>

            {/* Side-by-Side Diff Preview */}
            {(() => {
              const currentPlanId = (planChangeTarget.tenant.plan || 'STARTER').toUpperCase();
              const currentPlan: PlanDefinition = plans.find((p) => p.id === currentPlanId) || INITIAL_CANONICAL_PLANS[0]!;
              const targetPlan: PlanDefinition = plans.find((p) => p.id === planChangeTarget.targetPlanId) || INITIAL_CANONICAL_PLANS[0]!;
              const isUpgrade = targetPlan.displayOrder > currentPlan.displayOrder;

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50/70 border border-orange-200 text-orange-950 font-bold">
                    <span className="flex items-center gap-1.5">
                      {isUpgrade ? (
                        <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-amber-600" />
                      )}
                      <span>Action: {isUpgrade ? 'Tier Upgrade' : 'Tier Downgrade / Adjustment'}</span>
                    </span>
                    <span className="text-[11px] font-mono">
                      {currentPlan.name} &rarr; {targetPlan.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Current */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Plan</span>
                      <h4 className="text-sm font-black text-slate-900">{currentPlan.name}</h4>
                      <div className="text-xs text-slate-600 space-y-1">
                        <div>Price: {formatINR(currentPlan.annualMonthlyPrice)}/mo</div>
                        <div>User Quota: {currentPlan.limits.maxUsers} Technicians</div>
                        <div>Storage: {currentPlan.limits.storageGb} GB</div>
                        <div>Auto Assignment: {currentPlan.features.autoAssignment ? 'Yes' : 'No'}</div>
                      </div>
                    </div>

                    {/* Target */}
                    <div className="p-4 rounded-2xl bg-emerald-50/50 border-2 border-emerald-300 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block">Target New Plan</span>
                      <h4 className="text-sm font-black text-emerald-950">{targetPlan.name}</h4>
                      <div className="text-xs text-emerald-900 space-y-1">
                        <div>
                          Price:{' '}
                          {formatINR(
                            planChangeTarget.billingCycle === 'ANNUAL'
                              ? targetPlan.annualMonthlyPrice
                              : targetPlan.monthlyPrice
                          )}
                          /mo
                        </div>
                        <div className="font-bold">
                          User Quota: {targetPlan.limits.maxUsers} Technicians
                        </div>
                        <div>Storage: {targetPlan.limits.storageGb} GB</div>
                        <div>Auto Assignment: {targetPlan.features.autoAssignment ? 'Yes' : 'No'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <Button variant="outline" onClick={() => setPlanChangeTarget(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleExecutePlanChange}
                disabled={isApplyingChange}
                className="bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold"
              >
                {isApplyingChange ? 'Applying Changes...' : 'Confirm & Apply Plan Change'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 3: DRILLDOWN CLIENTS ON PLAN (Feature 5)                           */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {drilldownPlanId && (
        <Dialog
          open={!!drilldownPlanId}
          onOpenChange={(open) => !open && setDrilldownPlanId(null)}
          title={`Clients Subscribed to ${drilldownPlanId}`}
        >
          <div className="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
            {(() => {
              const matchedTenants = tenants.filter(
                (t) => (t.plan || 'STARTER').toUpperCase() === drilldownPlanId
              );

              if (matchedTenants.length === 0) {
                return (
                  <div className="p-8 text-center text-slate-500">
                    No client organizations are currently subscribed to this tier.
                  </div>
                );
              }

              return (
                <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
                  {matchedTenants.map((t) => (
                    <div key={t.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <span className="font-bold text-slate-900 block">{t.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">/{t.slug}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {t.status}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDrilldownPlanId(null);
                            handleOpenPlanChange(t);
                          }}
                          className="h-7 text-[10px]"
                        >
                          Change Plan
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="pt-2 flex justify-end">
              <Button variant="outline" onClick={() => setDrilldownPlanId(null)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
