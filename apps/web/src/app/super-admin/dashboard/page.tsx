'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Layers,
  CreditCard,
  Receipt,
  ToggleRight,
  Sliders,
  ShieldCheck,
  Settings,
  Users,
  Clock,
  AlertTriangle,
  IndianRupee,
  LogOut,
  Search,
  CheckCircle2,
  Save,
  Check,
  X,
  Activity,
  Sparkles,
} from 'lucide-react';
import { KalpakLogo } from '@/components/KalpakLogo';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui';
import { apiClient } from '@/lib/api-client';

type ActiveTab =
  | 'dashboard'
  | 'clients'
  | 'plans'
  | 'subscriptions'
  | 'billing'
  | 'entitlements'
  | 'enterprise'
  | 'security'
  | 'settings';

interface PlatformOverviewData {
  overview: {
    totalTenants: number;
    activeTenants: number;
    trialTenants: number;
    suspendedTenants: number;
  };
  planBreakdown: {
    starter: number;
    professional: number;
    enterprise: number;
  };
  revenueMetrics: {
    mrr: number;
    arr: number;
    newSubscriptionsThisMonth: number;
    renewalsThisMonth: number;
    cancellationsThisMonth: number;
    churnRate: string;
    trialsExpiringSoon: number;
    paymentsRequiringAttention: number;
  };
  recentActivity: Array<{
    id: string;
    tenantName: string;
    tenantSlug: string;
    action: string;
    badge: string;
    variant: 'emerald' | 'blue' | 'red' | 'orange' | 'purple';
    timestamp: string;
  }>;
  tenants: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    createdAt: string;
  }>;
}

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [data, setData] = useState<PlatformOverviewData | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [selectedClientModal, setSelectedClientModal] = useState<any>(null);



  // Enterprise Override State Demo
  const [enterpriseConfig, setEnterpriseConfig] = useState({
    companyName: 'Pune Auto Components Ltd',
    maxUsers: 500,
    maxStorageGb: 500,
    advancedAnalytics: true,
    apiIntegration: true,
    whatsapp: true,
    customWorkflow: true,
    customSla: true,
    customDomain: true,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const loadPlatformData = async () => {
    try {
      setIsDataLoading(true);
      const res = await apiClient<PlatformOverviewData>('/tenants/platform-overview');
      if (res && res.overview) {
        setData(res);
      }
    } catch {
      setData({
        overview: { totalTenants: 0, activeTenants: 0, trialTenants: 0, suspendedTenants: 0 },
        planBreakdown: { starter: 0, professional: 0, enterprise: 0 },
        revenueMetrics: {
          mrr: 0,
          arr: 0,
          newSubscriptionsThisMonth: 0,
          renewalsThisMonth: 0,
          cancellationsThisMonth: 0,
          churnRate: '0.0%',
          trialsExpiringSoon: 0,
          paymentsRequiringAttention: 0,
        },
        recentActivity: [],
        tenants: [],
      });
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadPlatformData();
    }
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (isLoading || isDataLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-700">Loading Kalpak Super Admin Console...</p>
        </div>
      </div>
    );
  }

  const { overview, planBreakdown, revenueMetrics, recentActivity, tenants = [] } = data;

  const filteredTenants = tenants.filter((t) =>
    t.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    t.slug.toLowerCase().includes(clientSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex selection:bg-orange-500 selection:text-white font-sans">
      {/* ─── SIDEBAR NAVIGATION (9 CORE MODULES) ─── */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 shadow-xl z-30">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <KalpakLogo size="sm" variant="dark" href="/super-admin/dashboard" />
          <div>
            <span className="block text-[11px] font-black text-orange-400 uppercase tracking-widest">
              Super Admin
            </span>
            <span className="block text-xs font-bold text-white">Platform Console</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'clients', label: 'Clients / Tenants', icon: Building2 },
            { id: 'plans', label: 'Subscription Plans', icon: Layers },
            { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
            { id: 'billing', label: 'Billing & Payments', icon: Receipt },
            { id: 'entitlements', label: 'Features & Entitlements', icon: ToggleRight },
            { id: 'enterprise', label: 'Enterprise Configuration', icon: Sliders },
            { id: 'security', label: 'Security & Audit', icon: ShieldCheck },
            { id: 'settings', label: 'System Settings', icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Info & Sign Out Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="block text-xs font-extrabold text-white truncate">
                {user?.fullName || 'Super Administrator'}
              </span>
              <span className="block text-[11px] text-slate-400 truncate">{user?.email}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/60 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200/90 px-6 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">
              {activeTab === 'dashboard' && 'Executive Business Dashboard'}
              {activeTab === 'clients' && 'Client Organization Management'}
              {activeTab === 'plans' && 'Subscription Plan Catalogue'}
              {activeTab === 'subscriptions' && 'Active Subscriptions Lifecycle'}
              {activeTab === 'billing' && 'Billing, Invoices & Payment Gateway'}
              {activeTab === 'entitlements' && 'Feature Entitlements Engine'}
              {activeTab === 'enterprise' && 'Enterprise Custom Overrides'}
              {activeTab === 'security' && 'Platform Security & Audit Trail'}
              {activeTab === 'settings' && 'Platform System Settings'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              SaaS Engine Live
            </span>
          </div>
        </header>

        {/* Tab Body */}
        <main className="p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODULE 1: DASHBOARD */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Executive SaaS Business Question Banner */}
              <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-orange-950 text-white p-7 sm:p-9 border border-slate-800 relative overflow-hidden shadow-lg">
                <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                    <span>Executive SaaS Health</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">How is my SaaS business doing?</h2>
                  <p className="text-sm text-slate-300 max-w-2xl">
                    High-level platform telemetry, paying client retention, recurring revenue metrics, and active client logins.
                  </p>
                </div>
              </div>

              {/* 6 Dashboard Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Total Clients */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Clients</span>
                    <Users className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="mt-3 text-3xl sm:text-4xl font-black text-slate-900">{overview.totalTenants}</div>
                  <p className="mt-1 text-xs text-slate-500">All registered tenant companies</p>
                </div>

                {/* Active Clients */}
                <div className="p-6 rounded-2xl bg-white border border-emerald-200 shadow-xs hover:shadow-md transition-all">
                  <div className="flex items-center justify-between text-emerald-700">
                    <span className="text-xs font-bold uppercase tracking-wider">Active Clients</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-3 text-3xl sm:text-4xl font-black text-emerald-700">{overview.activeTenants}</div>
                  <p className="mt-1 text-xs text-slate-500">Paying organizations active on SaaS</p>
                </div>

                {/* Trial Clients */}
                <div className="p-6 rounded-2xl bg-white border border-blue-200 shadow-xs hover:shadow-md transition-all">
                  <div className="flex items-center justify-between text-blue-700">
                    <span className="text-xs font-bold uppercase tracking-wider">Trial Clients</span>
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="mt-3 text-3xl sm:text-4xl font-black text-blue-700">{overview.trialTenants}</div>
                  <p className="mt-1 text-xs text-slate-500">In 14-day evaluation window</p>
                </div>

                {/* Expiring Soon */}
                <div className="p-6 rounded-2xl bg-white border border-amber-200 shadow-xs hover:shadow-md transition-all">
                  <div className="flex items-center justify-between text-amber-700">
                    <span className="text-xs font-bold uppercase tracking-wider">Expiring Soon</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="mt-3 text-3xl sm:text-4xl font-black text-amber-900">{revenueMetrics.trialsExpiringSoon}</div>
                  <p className="mt-1 text-xs text-slate-500">Subscriptions/Trials ending in 72h</p>
                </div>

                {/* Payment Issues */}
                <div className="p-6 rounded-2xl bg-white border border-red-200 shadow-xs hover:shadow-md transition-all">
                  <div className="flex items-center justify-between text-red-700">
                    <span className="text-xs font-bold uppercase tracking-wider">Payment Issues</span>
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="mt-3 text-3xl sm:text-4xl font-black text-red-700">{revenueMetrics.paymentsRequiringAttention}</div>
                  <p className="mt-1 text-xs text-slate-500">Failed card or dunning retries</p>
                </div>

                {/* Monthly Revenue */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Monthly Revenue</span>
                    <IndianRupee className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-3 text-2xl sm:text-3xl font-black text-slate-900">{formatCurrency(revenueMetrics.mrr)}</div>
                  <p className="mt-1 text-xs text-slate-500">MRR run rate from active clients</p>
                </div>
              </div>

              {/* Breakdown Grid: Subscription Distribution & Attention */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Subscription Distribution */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <Layers className="w-4 h-4 text-orange-600" />
                    <span>Subscription Distribution</span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-sm font-bold text-slate-700">Starter</span>
                      <span className="text-base font-black text-slate-900">{planBreakdown.starter}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/60 border border-blue-200">
                      <span className="text-sm font-bold text-blue-900">Professional</span>
                      <span className="text-base font-black text-blue-900">{planBreakdown.professional}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50/60 border border-orange-200">
                      <span className="text-sm font-bold text-orange-900">Enterprise</span>
                      <span className="text-base font-black text-orange-950">{planBreakdown.enterprise}</span>
                    </div>
                  </div>
                </div>

                {/* Subscription Attention */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Subscription Attention</span>
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="font-semibold text-slate-700">Professional trial ending</span>
                      <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                        {revenueMetrics.trialsExpiringSoon}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="font-semibold text-slate-700">Subscriptions expiring</span>
                      <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                        {revenueMetrics.trialsExpiringSoon}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="font-semibold text-slate-700">Payment failed</span>
                      <span className="font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                        {revenueMetrics.paymentsRequiringAttention}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="font-semibold text-slate-700">Suspended accounts</span>
                      <span className="font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                        {overview.suspendedTenants}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Client Account Activity Table */}
              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-orange-600" />
                      <span>Client Account Activity</span>
                    </h3>
                    <p className="text-xs text-slate-500">Account and security metadata across customer organizations</p>
                  </div>
                </div>

                {recentActivity.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No client organizations registered yet. As clients register on the platform, live account activity will appear here.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                    <div className="p-3 bg-slate-50 text-[11px] font-black text-slate-500 uppercase tracking-wider grid grid-cols-12">
                      <div className="col-span-4">Client Company</div>
                      <div className="col-span-3">Plan</div>
                      <div className="col-span-3">Status</div>
                      <div className="col-span-2 text-right">Activity Time</div>
                    </div>
                    {recentActivity.map((act) => (
                      <div key={act.id} className="p-3.5 grid grid-cols-12 items-center text-xs hover:bg-slate-50 transition-colors">
                        <div className="col-span-4 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-[11px]">
                            {act.tenantName.substring(0, 2).toUpperCase()}
                          </div>
                          <span>{act.tenantName}</span>
                        </div>
                        <div className="col-span-3 text-slate-600 font-medium">Starter / Pro</div>
                        <div className="col-span-3">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {act.badge}
                          </span>
                        </div>
                        <div className="col-span-2 text-right text-slate-500 font-mono">{act.timestamp}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODULE 2: CLIENTS / TENANTS */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'clients' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Clients / Tenants</h2>
                  <p className="text-xs text-slate-500">Manage all tenant companies using Kalpak's SaaS platform.</p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search company or slug..."
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white border border-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {filteredTenants.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
                  <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
                  <h3 className="text-base font-bold text-slate-700">No Client Tenants Found</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    There are currently no active tenant organizations in the database. When a client signs up or starts a trial, their management profile will appear here.
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider grid grid-cols-12">
                    <div className="col-span-4">Company</div>
                    <div className="col-span-3">Plan</div>
                    <div className="col-span-3">Status</div>
                    <div className="col-span-2 text-right">Created</div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {filteredTenants.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedClientModal(t)}
                        className="p-4 grid grid-cols-12 items-center text-xs hover:bg-orange-50/40 cursor-pointer transition-colors"
                      >
                        <div className="col-span-4 font-bold text-slate-900 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 font-black flex items-center justify-center">
                            {t.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="block font-extrabold">{t.name}</span>
                            <span className="block text-[11px] text-slate-400 font-mono">/{t.slug}</span>
                          </div>
                        </div>
                        <div className="col-span-3 font-semibold text-slate-700">Professional</div>
                        <div className="col-span-3">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {t.status}
                          </span>
                        </div>
                        <div className="col-span-2 text-right text-slate-500 font-mono">
                          {new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Client Overview Modal */}
              {selectedClientModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                  <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <span className="text-[11px] font-black text-orange-600 uppercase tracking-wider">Client Overview</span>
                        <h3 className="text-xl font-extrabold text-slate-900">{selectedClientModal.name}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedClientModal(null)}
                        className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 font-semibold block">Account Status</span>
                        <span className="font-extrabold text-emerald-700 text-sm mt-0.5 block">{selectedClientModal.status}</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 font-semibold block">Subscription Plan</span>
                        <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">Professional (14-Day Trial)</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 font-semibold block">User Limit</span>
                        <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">50 Licensed Users</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 font-semibold block">Storage Limit</span>
                        <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">50 GB High-Speed CDN</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700 block">Enabled Platform Features</span>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        {['Ticket Management', 'Customer Portal', 'Auto Assignment', 'Reports', 'API Integration'].map((feat) => (
                          <span key={feat} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            {feat}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button onClick={() => setSelectedClientModal(null)}>Close Overview</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODULE 3: SUBSCRIPTION PLANS */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'plans' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Subscription Plans Management</h2>
                <p className="text-xs text-slate-500">Define what features, limits, and pricing each SaaS tier includes.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Starter Plan */}
                <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-500">Starter Tier</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">Standard</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">₹4,999</h3>
                    <span className="text-xs text-slate-500 font-medium">/ month billed annually</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Up to 10 Licensed Users</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 5 GB Document Storage</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Ticket Management & Customer Portal</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Email Notifications</li>
                    <li className="flex items-center gap-2 text-slate-400"><X className="w-4 h-4 text-slate-300" /> Auto Assignment Engine</li>
                    <li className="flex items-center gap-2 text-slate-400"><X className="w-4 h-4 text-slate-300" /> REST API Integration</li>
                  </ul>
                </div>

                {/* Professional Plan */}
                <div className="p-6 rounded-3xl bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-400 shadow-md space-y-4 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-blue-700">Professional Tier</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase">
                      Most Popular
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-blue-900">₹9,999</h3>
                    <span className="text-xs text-blue-700 font-medium">/ month &bull; 14-Day Free Trial</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-blue-100">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Up to 50 Licensed Users</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 50 GB Cloud Storage</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Auto Assignment & SLA Rules</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Advanced Analytics & Reports</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Full REST API Integration</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Bulk Import/Export CSV</li>
                  </ul>
                </div>

                {/* Enterprise Plan */}
                <div className="p-6 rounded-3xl bg-gradient-to-b from-orange-50/70 via-white to-white border-2 border-orange-400 shadow-md space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-orange-700">Enterprise Tier</span>
                    <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 text-[10px] font-bold">Custom SLA</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-orange-950">Custom</h3>
                    <span className="text-xs text-orange-700 font-medium">Annual SLA Contract</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-orange-100">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Unlimited Users & Branches</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 500+ GB Dedicated Storage</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Custom Workflows & SLAs</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Dedicated Account Manager</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Custom Domain & Branding</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODULE 4: SUBSCRIPTIONS */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Client Subscriptions Lifecycle</h2>
                <p className="text-xs text-slate-500">Track active tenant subscriptions, renewal deadlines, and lifecycle statuses.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider grid grid-cols-12">
                  <div className="col-span-3">Company</div>
                  <div className="col-span-2">Plan</div>
                  <div className="col-span-3">Status</div>
                  <div className="col-span-2">Start Date</div>
                  <div className="col-span-2 text-right">Renewal Date</div>
                </div>
                {tenants.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">No active subscriptions found in the database.</div>
                ) : (
                  <div className="divide-y divide-slate-100 text-xs">
                    {tenants.map((t) => (
                      <div key={t.id} className="p-4 grid grid-cols-12 items-center hover:bg-slate-50">
                        <div className="col-span-3 font-extrabold text-slate-900">{t.name}</div>
                        <div className="col-span-2 font-semibold text-slate-700">Starter</div>
                        <div className="col-span-3">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            TRIALING
                          </span>
                        </div>
                        <div className="col-span-2 text-slate-600 font-mono">
                          {new Date(t.createdAt).toLocaleDateString('en-IN')}
                        </div>
                        <div className="col-span-2 text-right text-slate-600 font-mono">
                          {new Date(new Date(t.createdAt).getTime() + 14 * 86400000).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODULE 5: BILLING & PAYMENTS */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Billing & Payment Gateway (Razorpay)</h2>
                <p className="text-xs text-slate-500">Monitor transactions, Razorpay webhook executions, and dunning retries.</p>
              </div>

              {/* Payment Flow Diagram */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Razorpay Production Webhook Pipeline</span>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-600">
                  <span className="px-2.5 py-1 rounded bg-slate-100 font-bold text-slate-800">Order Created</span>
                  <span>&rarr;</span>
                  <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-bold">Payment Authorized</span>
                  <span>&rarr;</span>
                  <span className="px-2.5 py-1 rounded bg-purple-50 text-purple-700 font-bold">Webhook Received</span>
                  <span>&rarr;</span>
                  <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-700 font-bold">HMAC Signature Verified</span>
                  <span>&rarr;</span>
                  <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-extrabold">Subscription ACTIVE</span>
                </div>
              </div>

              {/* Payments Table */}
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider grid grid-cols-12">
                  <div className="col-span-3">Payment ID</div>
                  <div className="col-span-3">Client Company</div>
                  <div className="col-span-3">Amount</div>
                  <div className="col-span-3 text-right">Status</div>
                </div>
                <div className="p-8 text-center text-xs text-slate-500">
                  No payment transactions recorded yet. Live gateway webhooks will populate here upon checkout.
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODULE 6: FEATURES & ENTITLEMENTS */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'entitlements' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Features & Entitlement Engine</h2>
                <p className="text-xs text-slate-500">Canonical catalogue of platform capabilities mapped by subscription tier.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-700 uppercase tracking-wider grid grid-cols-12">
                  <div className="col-span-6">Feature Capability</div>
                  <div className="col-span-2 text-center">Starter</div>
                  <div className="col-span-2 text-center">Professional</div>
                  <div className="col-span-2 text-center">Enterprise</div>
                </div>

                <div className="divide-y divide-slate-100 text-xs font-medium">
                  {[
                    { code: 'TICKET_MANAGEMENT', label: 'Ticket Management & Dispatch', starter: true, pro: true, ent: true },
                    { code: 'CUSTOMER_PORTAL', label: 'Dedicated Client Service Portal', starter: true, pro: true, ent: true },
                    { code: 'EMPLOYEE_TICKET_CREATION', label: 'Field Staff Ticket Raising', starter: true, pro: true, ent: true },
                    { code: 'AUTO_ASSIGNMENT', label: 'Auto-Assignment SLA Dispatch', starter: false, pro: true, ent: true },
                    { code: 'EMAIL_NOTIFICATION', label: 'Email Alerts & Escalations', starter: true, pro: true, ent: true },
                    { code: 'WHATSAPP_NOTIFICATION', label: 'WhatsApp Instant Messaging', starter: false, pro: false, ent: true },
                    { code: 'REPORTS', label: 'Basic Operational Summary Reports', starter: true, pro: true, ent: true },
                    { code: 'ADVANCED_REPORTS', label: 'Executive Analytics & Drilldown', starter: false, pro: true, ent: true },
                    { code: 'API_INTEGRATION', label: 'Public REST API Keys', starter: false, pro: true, ent: true },
                    { code: 'BULK_IMPORT_EXPORT', label: 'Bulk Customer & Asset Import/Export', starter: false, pro: true, ent: true },
                    { code: 'CUSTOM_WORKFLOW', label: 'Custom SLA Escalation Workflows', starter: false, pro: false, ent: true },
                    { code: 'CUSTOM_DOMAIN', label: 'Custom White-Label Subdomain', starter: false, pro: false, ent: true },
                  ].map((feat) => (
                    <div key={feat.code} className="p-3.5 grid grid-cols-12 items-center hover:bg-slate-50">
                      <div className="col-span-6 font-bold text-slate-800 flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-400">{feat.code}</span>
                        <span>{feat.label}</span>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        {feat.starter ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-slate-300" />}
                      </div>
                      <div className="col-span-2 flex justify-center">
                        {feat.pro ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-slate-300" />}
                      </div>
                      <div className="col-span-2 flex justify-center">
                        {feat.ent ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-slate-300" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODULE 7: ENTERPRISE CONFIGURATION */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'enterprise' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Enterprise Custom Overrides</h2>
                <p className="text-xs text-slate-500">Configure customized user limits, storage capacities, and custom features per enterprise client.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Target Enterprise Tenant</label>
                    <input
                      type="text"
                      value={enterpriseConfig.companyName}
                      onChange={(e) => setEnterpriseConfig({ ...enterpriseConfig, companyName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Max Licensed Users</label>
                    <input
                      type="number"
                      value={enterpriseConfig.maxUsers}
                      onChange={(e) => setEnterpriseConfig({ ...enterpriseConfig, maxUsers: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-800 block">Custom Feature Overrides</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {[
                      { key: 'advancedAnalytics', label: 'Enable Advanced Analytics Engine' },
                      { key: 'apiIntegration', label: 'Enable Dedicated API Access' },
                      { key: 'whatsapp', label: 'Enable WhatsApp Customer Alerts' },
                      { key: 'customWorkflow', label: 'Enable Custom Workflow Engine' },
                      { key: 'customSla', label: 'Enable Custom SLA Escalation Rules' },
                      { key: 'customDomain', label: 'Enable Custom Subdomain Mapping' },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(enterpriseConfig as any)[item.key]}
                          onChange={(e) => setEnterpriseConfig({ ...enterpriseConfig, [item.key]: e.target.checked })}
                          className="w-4 h-4 text-orange-600 rounded border-slate-300"
                        />
                        <span className="font-semibold text-slate-800">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 font-extrabold">
                    <Save className="w-4 h-4 mr-2" />
                    Save Enterprise Overrides
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODULE 8: SECURITY & AUDIT */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Security & Audit Log</h2>
                <p className="text-xs text-slate-500">Immutable platform security events, plan updates, and administrator actions.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider grid grid-cols-12">
                  <div className="col-span-3">Timestamp</div>
                  <div className="col-span-3">Actor</div>
                  <div className="col-span-6">Action / Event Details</div>
                </div>
                <div className="divide-y divide-slate-100 text-xs font-medium">
                  <div className="p-4 grid grid-cols-12 items-center">
                    <div className="col-span-3 font-mono text-slate-500">{new Date().toLocaleString()}</div>
                    <div className="col-span-3 font-bold text-orange-600">Super Admin</div>
                    <div className="col-span-6 text-slate-800 font-semibold">Super Admin platform session active & verified</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODULE 9: SYSTEM SETTINGS */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">System & Platform Settings</h2>
                <p className="text-xs text-slate-500">Manage Kalpak SaaS global configurations, policies, and integrations.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Platform Brand Name</label>
                    <input type="text" defaultValue="Kalpak Solutions" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Default Currency</label>
                    <input type="text" defaultValue="INR (₹)" disabled className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-semibold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Session Inactivity Timeout</label>
                    <input type="text" defaultValue="60 minutes" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Payment Gateway</label>
                    <input type="text" defaultValue="Razorpay (Production / Live)" disabled className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-semibold" />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 font-extrabold">
                    <Save className="w-4 h-4 mr-2" />
                    Save Platform Settings
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
