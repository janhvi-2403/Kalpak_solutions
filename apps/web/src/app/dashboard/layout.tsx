'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { Sidebar } from '@/features/shell/components/sidebar';
import { Header } from '@/features/shell/components/header';
import { Loader2, AlertTriangle, RefreshCw, ShieldAlert, ArrowRight, LogOut } from 'lucide-react';
import { buildTenantSubdomainUrl } from '@/lib/subdomain';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user, activeTenant, subdomainSlug, logout } = useAuth();
  const router = useRouter();
  const [showLoginFallback, setShowLoginFallback] = useState(false);
  const [expiryAlert, setExpiryAlert] = useState<{
    alertLevel: string;
    alertMessage: string;
    isExpired: boolean;
  } | null>(null);

  // Smooth redirect when unauthenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const returnUrl = typeof window !== 'undefined' 
        ? encodeURIComponent(window.location.pathname + window.location.search) 
        : '';
      const target = returnUrl ? `/login?returnUrl=${returnUrl}` : '/login';
      router.replace(target);
    }
  }, [isLoading, isAuthenticated, router]);

  // Safety watchdog: if verification takes more than 2 seconds, show options or redirect
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoginFallback(true);
    }, 1000);

    const watchdog = setTimeout(() => {
      if (isLoading && !isAuthenticated) {
        const returnUrl = typeof window !== 'undefined' 
          ? encodeURIComponent(window.location.pathname + window.location.search) 
          : '';
        const target = returnUrl ? `/login?returnUrl=${returnUrl}` : '/login';
        router.replace(target);
      }
    }, 2200);

    return () => {
      clearTimeout(timer);
      clearTimeout(watchdog);
    };
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      apiClient<any>('/payments/current')
        .then((res) => {
          if (res?.expiryNotification && res.expiryNotification.alertLevel !== 'NONE') {
            setExpiryAlert(res.expiryNotification);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-slate-50 items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-6 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Verifying Secure Session</h3>
            <p className="text-xs text-slate-500 mt-1">
              Checking your authentication credentials and tenant access...
            </p>
          </div>
          
          {showLoginFallback && (
            <div className="w-full pt-3 mt-1 border-t border-slate-100 flex flex-col gap-2 animate-in fade-in">
              <p className="text-xs text-slate-500">Not signed in yet or session expired?</p>
              <Link
                href="/login"
                className="w-full py-2.5 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 text-center transition-all"
              >
                Go to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isCrossTenant = Boolean(
    subdomainSlug &&
    activeTenant?.slug &&
    subdomainSlug.toLowerCase() !== activeTenant.slug.toLowerCase()
  );

  if (!isAuthenticated) {
    return null;
  }

  // Cross-tenant protection barrier: prevents rendering any tenant dashboard data
  // if user manually altered the subdomain in the browser URL
  if (isCrossTenant && activeTenant) {
    const authorizedUrl = buildTenantSubdomainUrl(activeTenant.slug, '/dashboard');

    return (
      <div className="flex h-screen bg-slate-100/90 items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-rose-200 shadow-2xl p-7 flex flex-col items-center gap-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-inner">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700">
              Cross-Tenant Access Denied
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-2">
              Unauthorized Workspace
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
              You are signed in as <span className="font-semibold text-slate-800">{user?.email}</span> with access to{' '}
              <span className="font-bold text-slate-900">{activeTenant.name}</span> (<code className="text-orange-600 font-mono text-[11px]">{activeTenant.slug}</code>).
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              You cannot access or view data from the <code className="text-rose-600 font-mono font-bold text-[11px]">{subdomainSlug}</code> workspace.
            </p>
          </div>

          <div className="w-full pt-4 border-t border-slate-100 flex flex-col gap-2.5">
            <button
              onClick={() => {
                window.location.href = authorizedUrl;
              }}
              className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Go to Your Authorized Workspace ({activeTenant.slug})</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={logout}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span>Sign In with a Different Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        {expiryAlert && (
          <div
            className={`px-6 py-2 text-xs flex items-center justify-between border-b ${
              expiryAlert.isExpired
                ? 'bg-rose-50 border-rose-200 text-rose-900 font-medium'
                : 'bg-amber-50 border-amber-200 text-amber-900 font-medium'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={`w-4 h-4 shrink-0 ${
                  expiryAlert.isExpired ? 'text-rose-600' : 'text-amber-600'
                }`}
              />
              <span>
                {expiryAlert.isExpired
                  ? 'Subscription Expired: Operational write actions are restricted to read-only mode. All company data is safely preserved.'
                  : expiryAlert.alertMessage}
              </span>
            </div>
            <Link
              href="/dashboard/subscription"
              className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-white transition-colors ${
                expiryAlert.isExpired
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              <RefreshCw className="w-3 h-3" />
              Renew Now
            </Link>
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
