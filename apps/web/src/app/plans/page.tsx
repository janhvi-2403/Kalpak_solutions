'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { KalpakLogo } from '@/components/KalpakLogo';
import { Button } from '@/components/ui';
import {
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Building2,
  Users,
  Headphones,
  Check,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { ALL_PLANS } from '@/lib/plans';
import { BillingCycle } from '@kalpak/types';

function PlansContent() {
  const router = useRouter();
  const { user, activeTenant, isLoading: authLoading, logout } = useAuth();

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('ANNUAL');
  const [existingSubscription, setExistingSubscription] = useState<{
    hasActiveSubscription: boolean;
    subscription: {
      id: string;
      plan: string;
      billingCycle: string;
      status: string;
      endsAt: string;
    } | null;
  } | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  // Check if active subscription exists
  useEffect(() => {
    if (activeTenant) {
      apiClient<{
        hasActiveSubscription: boolean;
        subscription: {
          id: string;
          plan: string;
          billingCycle: string;
          status: string;
          endsAt: string;
        } | null;
      }>('/payments/my-subscription')
        .then((res) => {
          setExistingSubscription(res);
        })
        .catch(() => {})
        .finally(() => {
          setCheckingSubscription(false);
        });
    } else if (!authLoading) {
      setCheckingSubscription(false);
    }
  }, [activeTenant, authLoading]);

  if (authLoading || checkingSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  const handleSelectPlan = (planKey: string) => {
    const cycleParam = billingCycle.toLowerCase();
    router.push(`/checkout?plan=${planKey.toLowerCase()}&billing=${cycleParam}`);
  };

  const plansList = Object.values(ALL_PLANS);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-orange-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <KalpakLogo size="md" />
            <span className="hidden sm:inline-block text-xs font-semibold text-slate-400 border-l border-slate-200 pl-3">
              Subscription Management
            </span>
          </div>

          <div className="flex items-center gap-3">
            {activeTenant && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700">
                <Building2 className="w-3.5 h-3.5 text-orange-600" />
                <span className="font-bold text-slate-900">{activeTenant.name}</span>
                <span className="text-slate-400">({activeTenant.slug})</span>
              </div>
            )}

            {user ? (
              <button
                type="button"
                onClick={() => logout()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-orange-600 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex-1 w-full">
        {/* Banner if already subscribed */}
        {existingSubscription?.hasActiveSubscription &&
          existingSubscription.subscription?.status === 'ACTIVE' && (
            <div className="mb-10 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black">
                    Your {existingSubscription.subscription.plan} Plan is Currently Active
                  </h3>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Valid through{' '}
                    {new Date(existingSubscription.subscription.endsAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    . You can upgrade or change tiers below anytime.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors whitespace-nowrap"
                >
                  Go to Dashboard &rarr;
                </Link>
              </div>
            </div>
          )}

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-50 border border-orange-200/80 text-orange-700 text-xs font-black uppercase tracking-wider mb-4 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            <span>Transparent, Scalable Service Plans</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-tight">
            Choose the Perfect Plan for Your Team
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            All plans include ticket management, customer profiles, SLA monitoring, and 2FA security. Pick the right
            tier to match your technician fleet and automated routing needs.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-8 inline-flex items-center p-1.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <button
              type="button"
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                billingCycle === 'MONTHLY'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('ANNUAL')}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                billingCycle === 'ANNUAL'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wide bg-white/20 text-white px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {plansList.map((plan) => {
            const isAnnual = billingCycle === 'ANNUAL';
            const displayPrice = isAnnual ? plan.annualMonthlyPrice : plan.monthlyPrice;
            const isPopular = plan.isPopular;

            return (
              <div
                key={plan.key}
                className={`relative rounded-3xl transition-all duration-200 flex flex-col justify-between ${
                  isPopular
                    ? 'bg-white border-2 border-orange-500 shadow-2xl shadow-orange-500/10 lg:-translate-y-3 p-8 sm:p-9'
                    : 'bg-white border border-slate-200/90 shadow-md hover:border-slate-300 hover:shadow-lg p-7 sm:p-8'
                }`}
              >
                {/* Popular Pill */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white text-[11px] font-black uppercase tracking-wider px-4 py-1 rounded-full shadow-md whitespace-nowrap flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-white fill-white" />
                    <span>Most Popular • Best Value</span>
                  </div>
                )}

                <div>
                  {/* Plan Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-orange-600 bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">
                      {plan.tagline}
                    </span>
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{plan.maxTechniciansText}</span>
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-slate-950 tracking-tight">{plan.name}</h3>
                  <p className="text-xs text-slate-600 mt-2 min-h-[36px] leading-relaxed">{plan.description}</p>

                  {/* Price Block */}
                  <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
                        ₹{displayPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">/ month</span>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-1">
                      {isAnnual ? (
                        <>
                          Billed annually at{' '}
                          <strong className="text-slate-700 font-bold">
                            ₹{plan.annualTotalPrice.toLocaleString('en-IN')} / year
                          </strong>{' '}
                          (+18% GST)
                        </>
                      ) : (
                        'Billed monthly (+18% GST)'
                      )}
                    </p>
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 mb-8">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Included Capabilities:
                    </p>
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            isPopular
                              ? 'bg-orange-100 text-orange-600'
                              : 'bg-emerald-100 text-emerald-600'
                          }`}
                        >
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span className="leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan Selection CTA */}
                <div className="pt-4 border-t border-slate-100">
                  <Button
                    onClick={() => handleSelectPlan(plan.code)}
                    className={`w-full h-12 text-sm font-black rounded-xl transition-all shadow-md cursor-pointer ${
                      isPopular
                        ? 'text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-orange-500/25'
                        : 'text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 hover:text-slate-900'
                    }`}
                  >
                    <span>Choose {plan.name}</span>
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Enterprise & Security Assurances */}
        <div className="mt-16 bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Official Razorpay Checkout</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Bank-grade 256-bit SSL encrypted payments supporting UPI, Cards, NetBanking, and Corporate Accounts.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">GST-Compliant Tax Invoices</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Provide your organization&apos;s GSTIN during checkout to receive automatic input tax credit invoices.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                <Headphones className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Dedicated Service Support</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Get seamless onboarding guidance, SLA policy setup assistance, and priority customer care.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Kalpak Solutions Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default function PlansPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PlansContent />
    </Suspense>
  );
}
