'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { KalpakLogo } from '@/components/KalpakLogo';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically finalize onboarding and redirect directly to dashboard,
    // since companies configure departments, team, and SLA rules directly from their Client Admin page.
    apiClient('/tenants/onboarding/complete', { method: 'POST' })
      .then(() => {
        router.replace('/dashboard');
      })
      .catch(() => {
        router.replace('/dashboard');
      });
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-orange-500 selection:text-white">
      <header className="border-b border-slate-200 bg-white py-4 px-6 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <KalpakLogo size="md" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-16 flex-1 w-full flex items-center">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl w-full text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-black text-slate-950 tracking-tight">
            Entering Workspace Dashboard...
          </h1>

          <p className="text-xs text-slate-600 leading-relaxed">
            All team, department, product, and SLA settings can be configured directly from your Client Admin dashboard.
          </p>

          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-md transition-all cursor-pointer w-full"
            >
              <span>Enter Workspace Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Kalpak Solutions Inc. All rights reserved.
      </footer>
    </div>
  );
}
