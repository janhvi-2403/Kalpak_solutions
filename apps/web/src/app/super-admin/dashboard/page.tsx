'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Layers,
  Receipt,
  Users,
  Clock,
  AlertTriangle,
  IndianRupee,
  LogOut,
  CheckCircle2,
  Sparkles,
  Activity,
} from 'lucide-react';
import { KalpakLogo } from '@/components/KalpakLogo';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { SubscriptionPlansManagement, ClientTenant } from '@/features/super-admin/subscription-plans-management';
import { ClientsTenantsManagement } from '@/features/super-admin/clients-tenants-management';

type ActiveTab =
  | 'dashboard'
  | 'clients'
  | 'plans'
  | 'billing';

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
  tenants: ClientTenant[];
}

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [data, setData] = useState<PlatformOverviewData | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);





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
            { id: 'billing', label: 'Billing & Payments', icon: Receipt },
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
              {activeTab === 'plans' && 'Subscription Plan Catalogue & Entitlements'}
              {activeTab === 'billing' && 'Billing, Invoices & Payment Gateway'}
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
                      <div className="col-span-3">Event / Action</div>
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
                        <div className="col-span-3 text-slate-700 font-medium truncate">{act.action}</div>
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
            <ClientsTenantsManagement
              tenants={tenants}
              onRefresh={loadPlatformData}
            />
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODULE 3: SUBSCRIPTION PLANS */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'plans' && (
            <SubscriptionPlansManagement
              tenants={tenants}
              onRefreshData={loadPlatformData}
            />
          )}

          {/* ───────────────────────────────────────────────────────────── */}


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
        </main>
      </div>
    </div>
  );
}
