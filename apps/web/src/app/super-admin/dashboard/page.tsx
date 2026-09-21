'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  LogOut,
  RefreshCw,
  Lock,
  KeyRound,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { KalpakLogo } from '@/components/KalpakLogo';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui';

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/super-admin/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/super-admin/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
          <p className="text-sm text-slate-400">Loading Super Admin Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <KalpakLogo size="md" variant="dark" href="/super-admin/dashboard" />
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Super Admin Master Console</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-bold text-white">{user?.fullName || 'Super Admin'}</span>
              <span className="text-xs text-slate-400">{user?.email}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-950/40 via-slate-900 to-slate-900 border border-orange-500/30 p-6 sm:p-8">
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>System Authenticated & TOTP Protected</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome, {user?.fullName}
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              You are logged in with master Super Administrator privileges. Row-Level Security (RLS) policies and cross-tenant
              governance are operational.
            </p>
          </div>
        </div>

        {/* Core System Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Installation State</span>
              <Lock className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-xl font-extrabold text-white">Bootstrap Locked</div>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Permanently Initialized</span>
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Database Security</span>
              <Database className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-xl font-extrabold text-white">PostgreSQL Native RLS</div>
            <p className="text-xs text-sky-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Tenant Isolation Active</span>
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Authentication Factor</span>
              <KeyRound className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-extrabold text-white">RFC 6238 TOTP</div>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>MFA Enforced on Super Admin</span>
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Password Standard</span>
              <ShieldAlert className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-xl font-extrabold text-white">Argon2id Hashing</div>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <span>OWASP Recommended Memory Cost</span>
            </p>
          </div>
        </div>

        {/* Security & Audit Events Stream */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-500" />
                <span>Security & Audit Event Stream</span>
              </h2>
              <p className="text-xs text-slate-400">
                Immutable record of authentication, authorization, and administrative events.
              </p>
            </div>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
            <div className="p-4 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider grid grid-cols-12">
              <div className="col-span-4">Event Type</div>
              <div className="col-span-4">Security Action</div>
              <div className="col-span-4 text-right">Timestamp</div>
            </div>
            <div className="divide-y divide-slate-800/60 text-xs">
              <div className="p-4 grid grid-cols-12 items-center">
                <div className="col-span-4 font-mono text-orange-400 font-bold">BOOTSTRAP_STARTED</div>
                <div className="col-span-4 text-slate-300">Super Admin Initialized</div>
                <div className="col-span-4 text-right text-slate-500">{new Date().toLocaleString()}</div>
              </div>
              <div className="p-4 grid grid-cols-12 items-center">
                <div className="col-span-4 font-mono text-emerald-400 font-bold">AUTH_MFA_ENABLED</div>
                <div className="col-span-4 text-slate-300">TOTP Authenticator Setup Completed</div>
                <div className="col-span-4 text-right text-slate-500">{new Date().toLocaleString()}</div>
              </div>
              <div className="p-4 grid grid-cols-12 items-center">
                <div className="col-span-4 font-mono text-sky-400 font-bold">AUTH_LOGIN_SUCCESS</div>
                <div className="col-span-4 text-slate-300">Super Admin Session Verified</div>
                <div className="col-span-4 text-right text-slate-500">{new Date().toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Kalpak Solutions Inc. Enterprise Service Calls & Ticket Management SaaS.
      </footer>
    </div>
  );
}
