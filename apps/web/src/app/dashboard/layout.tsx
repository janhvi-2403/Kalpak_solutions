'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { Sidebar } from '@/features/shell/components/sidebar';
import { Header } from '@/features/shell/components/header';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
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

  if (!isAuthenticated) {
    return null;
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
