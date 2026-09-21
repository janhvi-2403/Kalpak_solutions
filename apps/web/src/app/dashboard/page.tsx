'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  Lock,
  Database,
  CheckCircle2,
  LifeBuoy,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui';

export default function DashboardPage() {
  const { user, activeTenant, activeRole, permissions, memberships } = useAuth();
  const [ticketStats, setTicketStats] = useState<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    overdue: number;
  } | null>(null);

  useEffect(() => {
    apiClient<{
      total: number;
      open: number;
      inProgress: number;
      resolved: number;
      overdue: number;
    }>('/tickets/stats')
      .then((data) => setTicketStats(data))
      .catch((err) => console.error('Failed to load dashboard ticket stats:', err));
  }, []);

  const onboardingStep = activeTenant?.settings?.onboardingStep || 1;
  const isOnboardingComplete = activeTenant?.settings?.onboardingCompleted === true;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-mono">
              <Building2 className="w-3.5 h-3.5" />
              <span>{activeTenant?.name || 'Kalpak Solutions'}</span>
              <span>•</span>
              <span className="uppercase">{activeRole || 'Member'}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {user?.fullName?.split(' ')[0] || 'Admin'}
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Kalpak Solutions Multi-Tenant Service Platform. Your tenant data is strictly isolated
              with PostgreSQL Row-Level Security and stateful session cookies.
            </p>
          </div>

          {!isOnboardingComplete && activeRole === 'CLIENT_ADMIN' && (
            <div className="flex-shrink-0">
              <Link href="/onboarding">
                <Button
                  size="md"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/30 gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Resume Onboarding (Step {onboardingStep}/9)</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Onboarding Progress Callout (if in progress) */}
      {!isOnboardingComplete && activeRole === 'CLIENT_ADMIN' && (
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 border border-amber-300/60 flex items-center justify-center text-amber-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-amber-950">
                Organization Setup in Progress
              </div>
              <p className="text-xs text-amber-800/90">
                Step {onboardingStep} of 9 completed. Finalize departments, team invitations, and SLA rules to activate live service calls.
              </p>
            </div>
          </div>
          <Link href="/onboarding">
            <Button size="sm" variant="outline" className="border-amber-300 text-amber-900 hover:bg-amber-100">
              Continue Wizard
            </Button>
          </Link>
        </div>
      )}

      {isOnboardingComplete && (
        <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-5 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div>
            <div className="text-sm font-bold text-emerald-950">Organization Fully Configured</div>
            <p className="text-xs text-emerald-800">
              All 9 setup steps are completed. Your tenant is fully operational and ready for service ticket intake.
            </p>
          </div>
        </div>
      )}

      {/* Service Calls & Ticket Operations Overview */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Service Tickets & Call Operations
              </h2>
              <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
                Active Engine
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Live lifecycle state transitions, automatic department dispatch, and SLA tolerable open periods.
            </p>
          </div>

          <Link href="/dashboard/tickets">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5">
              <span>Open Service Desk</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500">Total Tickets</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">{ticketStats?.total ?? '—'}</div>
          </div>
          <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
            <div className="text-[11px] font-semibold text-blue-700">Open / Queued</div>
            <div className="text-xl font-black text-blue-700 mt-0.5">{ticketStats?.open ?? '—'}</div>
          </div>
          <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100">
            <div className="text-[11px] font-semibold text-indigo-700">In Progress</div>
            <div className="text-xl font-black text-indigo-700 mt-0.5">{ticketStats?.inProgress ?? '—'}</div>
          </div>
          <div className={`p-3.5 rounded-xl border ${
            (ticketStats?.overdue ?? 0) > 0
              ? 'bg-rose-50 border-rose-200'
              : 'bg-emerald-50/60 border-emerald-100'
          }`}>
            <div className={`text-[11px] font-semibold flex items-center gap-1 ${
              (ticketStats?.overdue ?? 0) > 0 ? 'text-rose-700' : 'text-emerald-700'
            }`}>
              {(ticketStats?.overdue ?? 0) > 0 ? <ShieldAlert className="w-3.5 h-3.5" /> : null}
              <span>{(ticketStats?.overdue ?? 0) > 0 ? 'SLA Overdue' : 'Resolved'}</span>
            </div>
            <div className={`text-xl font-black mt-0.5 ${
              (ticketStats?.overdue ?? 0) > 0 ? 'text-rose-700' : 'text-emerald-700'
            }`}>
              {(ticketStats?.overdue ?? 0) > 0 ? ticketStats?.overdue : (ticketStats?.resolved ?? '—')}
            </div>
          </div>
        </div>
      </div>

      {/* Core Architectural Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tenant Isolation Pillar */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Database Isolation
            </span>
            <Database className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900">PostgreSQL RLS Active</div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Every database query runs with discriminator column isolation. Data is impossible to cross-leak between tenants.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Tenant Slug:</span>
            <span className="font-mono font-semibold text-slate-800">{activeTenant?.slug || 'none'}</span>
          </div>
        </div>

        {/* Security & Sessions Pillar */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Authentication
            </span>
            <Lock className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900">Stateful HttpOnly Session</div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Server-side Redis/Postgres session storage with HttpOnly Lax cookies, cryptographic CSRF tokens, and MFA support.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>MFA Status:</span>
            <span className="font-semibold text-emerald-600">
              {user?.mfaEnabled ? 'Enforced & Verified' : 'Available'}
            </span>
          </div>
        </div>

        {/* RBAC & Identity Pillar */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Access Control
            </span>
            <ShieldCheck className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900">RBAC Enforcement</div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Granular permission matrix evaluated on every API request. User identity resolved via NestJS AsyncLocalStorage.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Permissions Assigned:</span>
            <span className="font-mono font-semibold text-purple-700">{permissions.length} actions</span>
          </div>
        </div>
      </div>

      {/* Active Session & Multi-Tenancy Detail Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Active Tenant & Session Context</h3>
            <p className="text-xs text-slate-500">Live parameters extracted from secure cookie session</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Session
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          <div className="px-6 py-3.5 flex items-center justify-between">
            <span className="text-slate-500">Authenticated User</span>
            <span className="font-medium text-slate-900">{user?.fullName} ({user?.email})</span>
          </div>
          <div className="px-6 py-3.5 flex items-center justify-between">
            <span className="text-slate-500">Active Organization</span>
            <span className="font-medium text-slate-900">{activeTenant?.name}</span>
          </div>
          <div className="px-6 py-3.5 flex items-center justify-between">
            <span className="text-slate-500">Assigned Role</span>
            <span className="font-mono font-bold text-blue-600">{activeRole}</span>
          </div>
          <div className="px-6 py-3.5 flex items-center justify-between">
            <span className="text-slate-500">Tenant Identifier (UUID)</span>
            <span className="font-mono text-slate-600">{activeTenant?.id}</span>
          </div>
          <div className="px-6 py-3.5 flex items-center justify-between">
            <span className="text-slate-500">Associated Organizations</span>
            <span className="font-medium text-slate-900">{memberships.length} organizations linked</span>
          </div>
        </div>
      </div>
    </div>
  );
}
