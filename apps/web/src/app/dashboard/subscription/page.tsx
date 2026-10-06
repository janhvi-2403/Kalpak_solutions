'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  CreditCard,
  CheckCircle2,
  Users,
  ShieldCheck,
  Building2,
  Clock,
  AlertTriangle,
  Check,
  Download,
  RefreshCw,
  Sparkles,
  Layers,
  HardDrive,
  Printer,
} from 'lucide-react';
import { Button, Badge, Dialog } from '@/components/ui';
import { loadRazorpayScript } from '@/lib/razorpay';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

interface CurrentPlanData {
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  planName: string;
  status: 'ACTIVE' | 'EXPIRED' | 'TRIAL' | 'PENDING_PAYMENT';
  isActive: boolean;
  isExpired: boolean;
  startsAt: string | null;
  endsAt: string | null;
  daysRemaining: number;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  currentPrice: number;
  basePrice: number;
  taxAmount: number;
  currency: string;
}

interface PlanOption {
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  planName: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  annualTotalPrice: number;
  discountPercent: number;
  maxTechnicians: number;
  features: string[];
  isCurrent: boolean;
}

interface LimitMetric {
  used: number;
  allowed: number;
  percentage: number;
  isApproachingLimit: boolean;
  isLimitReached: boolean;
}

interface StorageLimitMetric {
  usedMB: number;
  allowedMB: number;
  percentage: number;
  isApproachingLimit: boolean;
  isLimitReached: boolean;
}

interface UsageAndLimits {
  employees: LimitMetric;
  departments: LimitMetric;
  tickets: LimitMetric;
  storage: StorageLimitMetric;
}

interface BillingRecord {
  id: string;
  invoiceNumber: string;
  orderId: string;
  paymentId: string | null;
  amount: number;
  currency: string;
  plan: string;
  billingCycle: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentDate: string;
}

interface SubscriptionRecord {
  id: string;
  plan: string;
  planName: string;
  billingCycle: string;
  status: string;
  startsAt: string;
  endsAt: string;
  amount: number;
  currency: string;
  createdAt: string;
  type: 'NEW_PURCHASE' | 'RENEWAL' | 'UPGRADE';
}

interface ExpiryNotification {
  alertLevel: 'EXPIRED' | 'CRITICAL_1_DAY' | 'WARNING_3_DAYS' | 'NOTICE_7_DAYS' | 'PAYMENT_FAILED' | 'NONE';
  alertMessage: string;
  daysRemaining: number;
  isExpired: boolean;
  latestPaymentFailed: boolean;
}

interface FullSubscriptionResponse {
  hasActiveSubscription: boolean;
  isExpired: boolean;
  tenantStatus: string;
  currentPlan: CurrentPlanData;
  renewalInfo: {
    plan: string;
    annual: { basePrice: number; gstAmount: number; totalAmount: number };
    monthly: { basePrice: number; gstAmount: number; totalAmount: number };
  };
  availablePlans: PlanOption[];
  usageAndLimits: UsageAndLimits;
  billingHistory: BillingRecord[];
  subscriptionHistory: SubscriptionRecord[];
  expiryNotification: ExpiryNotification;
}

interface InvoiceDetails {
  invoiceNumber: string;
  orderId: string;
  paymentId: string | null;
  paymentDate: string;
  paymentStatus: string;
  plan: string;
  planName: string;
  billingCycle: string;
  currency: string;
  baseAmount: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
  sacCode: string;
  seller: {
    companyName: string;
    gstin: string;
    address: string;
    supportEmail: string;
    website: string;
  };
  buyer: {
    companyName: string;
    slug: string;
    contactName: string;
    contactEmail: string;
    gstin: string;
    address: any;
  };
}

export default function SubscriptionHubPage() {
  const { activeTenant, user } = useAuth();
  const [data, setData] = useState<FullSubscriptionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Triggers
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<'PROFESSIONAL' | 'ENTERPRISE'>('PROFESSIONAL');
  const [renewalCycle, setRenewalCycle] = useState<'ANNUAL' | 'MONTHLY'>('ANNUAL');
  const [upgradeCycle, setUpgradeCycle] = useState<'ANNUAL' | 'MONTHLY'>('ANNUAL');
  
  // Payment Processing State
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);

  // Invoice Modal State
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceDetails | null>(null);

  // Load Razorpay Script Dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Fetch full subscription & limits data
  const fetchData = useCallback(async () => {
    try {
      const res = await apiClient<FullSubscriptionResponse>('/payments/current');
      setData(res);
    } catch (err: any) {
      console.error('Failed to fetch subscription data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Razorpay Payment flow (for Renew or Upgrade)
  const initiatePayment = async (plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE', cycle: 'ANNUAL' | 'MONTHLY') => {
    setIsProcessingPayment(true);
    setPaymentError(null);
    setPaymentSuccessMsg(null);

    try {
      // 1. Ensure Razorpay Checkout SDK is loaded
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded || typeof window === 'undefined' || !window.Razorpay) {
        setIsProcessingPayment(false);
        setPaymentError('Razorpay Checkout SDK could not be loaded. Please check your internet connection.');
        return;
      }

      // 2. Create Order via Backend API
      const orderRes = await apiClient<any>('/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({
          plan,
          billingCycle: cycle,
          agreedToTerms: true,
        }),
      });

      // 3. Open Official Razorpay Checkout
      const options = {
        key: orderRes.keyId,
        amount: orderRes.amount,
        currency: 'INR',
        name: 'Kalpak Solutions',
        description: `${orderRes.plan} Plan (${orderRes.billingCycle})`,
        order_id: orderRes.orderId,
        prefill: {
          name: user?.fullName || '',
          email: user?.email || '',
        },
        theme: {
          color: '#ea580c',
        },
        handler: async (response: any) => {
          await verifyAndFinalize(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature);
        },
        modal: {
          ondismiss: () => {
            setIsProcessingPayment(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (err: any) => {
        setIsProcessingPayment(false);
        setPaymentError(`Payment Failed: ${err.error?.description || 'Transaction declined.'}`);
      });
      rzp.open();
    } catch (err: any) {
      setIsProcessingPayment(false);
      setPaymentError(err.message || 'Failed to initialize payment order. Please try again.');
    }
  };

  // Verify payment on backend
  const verifyAndFinalize = async (orderId: string, paymentId: string, signature: string) => {
    try {
      const verifyRes = await apiClient<any>('/payments/verify', {
        method: 'POST',
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        }),
      });

      setPaymentSuccessMsg(`Success! Your subscription has been extended until ${new Date(verifyRes.endsAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.`);
      setIsProcessingPayment(false);
      setShowRenewModal(false);
      setShowUpgradeModal(false);
      await fetchData();
    } catch (err: any) {
      setIsProcessingPayment(false);
      setPaymentError(err.message || 'Signature verification failed. Please contact support.');
    }
  };

  // View & download official tax invoice
  const handleViewInvoice = async (transactionId: string) => {
    try {
      const invoice = await apiClient<InvoiceDetails>(`/payments/invoices/${transactionId}`);
      setViewingInvoice(invoice);
    } catch (err: any) {
      alert(`Could not load invoice details: ${err.message}`);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="max-w-7xl mx-auto py-20 flex flex-col items-center justify-center text-sm font-medium text-slate-500">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span>Loading subscription &amp; entitlements...</span>
      </div>
    );
  }

  const { currentPlan, usageAndLimits, billingHistory, subscriptionHistory, expiryNotification, availablePlans } = data;
  const isExpired = currentPlan.isExpired;

  // Format currency in Indian Rupees
  const formatINR = (amt: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);

  // Format date helper
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* ── Top Header ── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-100">
              <CreditCard className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Subscription &amp; Billing Hub
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 pl-11">
            Manage your subscription tier, track usage quotas, review billing history, and download official tax invoices.
          </p>
        </div>
        <div className="flex items-center gap-3 pl-11 md:pl-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUpgradeModal(true)}
            className="text-xs font-semibold text-slate-700 bg-white border-slate-200 hover:bg-slate-50"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-orange-500" />
            Upgrade Plan
          </Button>
          <Button
            size="sm"
            onClick={() => setShowRenewModal(true)}
            className="text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Renew Subscription
          </Button>
        </div>
      </div>

      {/* ── 1. Expiry Notifications & Alert Banners ── */}
      {expiryNotification.alertLevel !== 'NONE' && (
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            expiryNotification.alertLevel === 'EXPIRED'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : expiryNotification.alertLevel === 'CRITICAL_1_DAY' || expiryNotification.alertLevel === 'PAYMENT_FAILED'
              ? 'bg-red-50 border-red-200 text-red-900'
              : expiryNotification.alertLevel === 'WARNING_3_DAYS'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="p-1 rounded-lg bg-white/80 shrink-0 mt-0.5">
              <AlertTriangle
                className={`w-5 h-5 ${
                  expiryNotification.alertLevel === 'EXPIRED' || expiryNotification.alertLevel === 'CRITICAL_1_DAY'
                    ? 'text-rose-600'
                    : expiryNotification.alertLevel === 'WARNING_3_DAYS'
                    ? 'text-amber-600'
                    : 'text-blue-600'
                }`}
              />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-0.5 flex items-center gap-2">
                {expiryNotification.alertLevel === 'EXPIRED' && <span>Subscription Expired</span>}
                {expiryNotification.alertLevel === 'CRITICAL_1_DAY' && <span>Urgent: 1 Day Remaining</span>}
                {expiryNotification.alertLevel === 'WARNING_3_DAYS' && <span>Warning: 3 Days Remaining</span>}
                {expiryNotification.alertLevel === 'NOTICE_7_DAYS' && <span>Notice: 7 Days Remaining</span>}
                {expiryNotification.alertLevel === 'PAYMENT_FAILED' && <span>Payment Attempt Failed</span>}
              </div>
              <p className="text-xs opacity-90 leading-relaxed max-w-3xl">
                {expiryNotification.alertMessage}
              </p>
              {isExpired && (
                <p className="text-[11px] font-medium text-rose-700 mt-1">
                  🔒 Operational restriction: Ticket creation and team invite privileges are temporarily paused. All existing customer records, tickets, and configurations remain 100% safe and intact.
                </p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowRenewModal(true)}
            className={`shrink-0 text-xs font-bold text-white shadow-xs ${
              isExpired
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Renew Now
          </Button>
        </div>
      )}

      {/* ── 2. Current Plan Overview Card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="text-base font-bold text-slate-900">Current Plan:</span>
                <span className="text-base font-extrabold text-orange-600">
                  {currentPlan.planName}
                </span>
                <Badge
                  variant={currentPlan.isActive ? 'success' : 'destructive'}
                  className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5"
                >
                  {currentPlan.status}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Billing:</span>
                <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md font-mono">
                  {currentPlan.billingCycle === 'ANNUAL' ? 'Yearly (Annual)' : 'Monthly'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-b border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-medium block mb-1">Start Date</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatDate(currentPlan.startsAt)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block mb-1">Expiry Date</span>
                <span className={`font-bold font-mono ${isExpired ? 'text-rose-600' : 'text-slate-900'}`}>
                  {formatDate(currentPlan.endsAt)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block mb-1">Days Remaining</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs ${
                    isExpired
                      ? 'bg-rose-100 text-rose-800'
                      : currentPlan.daysRemaining <= 7
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  <Clock className="w-3 h-3 mr-1" />
                  {isExpired ? '0 Days (Expired)' : `${currentPlan.daysRemaining} Days`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block mb-1">Current Price</span>
                <span className="font-extrabold text-slate-900 font-mono">
                  {formatINR(currentPlan.currentPrice)}
                  <span className="text-[10px] text-slate-400 font-normal"> / {currentPlan.billingCycle === 'ANNUAL' ? 'yr' : 'mo'}</span>
                </span>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Base: {formatINR(currentPlan.basePrice)} + 18% GST ({formatINR(currentPlan.taxAmount)})</span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">
                Tenant ID: <strong className="text-slate-600">{activeTenant?.slug}</strong>
              </span>
            </div>
          </div>

          <div className="pt-6 flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              onClick={() => setShowRenewModal(true)}
              className="text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Renew Current Plan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUpgradeModal(true)}
              className="text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-orange-500" />
              Compare &amp; Upgrade
            </Button>
          </div>
        </div>

        {/* ── Quick Summary / Guarantee Card ── */}
        <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-2xl text-white shadow-xs flex flex-col justify-between border border-slate-800">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-orange-400 font-bold">
                Kalpak SLA &amp; Support
              </span>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-white mt-2">
              Enterprise Data Safeguard
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Your company records, customer directory, technician assignments, and service call histories are preserved with full database encryption even if subscription lapses.
            </p>
          </div>

          <div className="pt-6 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Automatic Invoicing:</span>
              <span className="text-emerald-400 font-bold">GST Compliant</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300 mt-2">
              <span>Payment Gateway:</span>
              <span className="text-orange-400 font-bold">Razorpay 256-Bit</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Usage & Limits ── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Usage &amp; Plan Limits</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live consumption of system resources capped by your current plan tier.
            </p>
          </div>
          {(usageAndLimits.employees.isApproachingLimit ||
            usageAndLimits.departments.isApproachingLimit ||
            usageAndLimits.tickets.isApproachingLimit ||
            usageAndLimits.storage.isApproachingLimit) && (
            <Badge variant="warning" className="text-[10px] font-mono uppercase px-2 py-1">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Approaching Quota Limit
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-5">
          {/* Metric 1: Employees */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">Technicians / Staff</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  usageAndLimits.employees.isLimitReached
                    ? 'bg-rose-100 text-rose-800'
                    : usageAndLimits.employees.isApproachingLimit
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {usageAndLimits.employees.percentage}%
              </span>
            </div>

            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-500 font-medium">Used / Allowed</span>
              <span className="font-extrabold text-slate-900 font-mono">
                {usageAndLimits.employees.used} / {usageAndLimits.employees.allowed}
              </span>
            </div>

            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usageAndLimits.employees.isLimitReached
                    ? 'bg-rose-500'
                    : usageAndLimits.employees.isApproachingLimit
                    ? 'bg-amber-500'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${usageAndLimits.employees.percentage}%` }}
              />
            </div>

            {usageAndLimits.employees.isApproachingLimit && (
              <p className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                Approaching 5-staff limit. Upgrade to add more.
              </p>
            )}
          </div>

          {/* Metric 2: Departments */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">Departments</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  usageAndLimits.departments.isLimitReached
                    ? 'bg-rose-100 text-rose-800'
                    : usageAndLimits.departments.isApproachingLimit
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {usageAndLimits.departments.percentage}%
              </span>
            </div>

            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-500 font-medium">Used / Allowed</span>
              <span className="font-extrabold text-slate-900 font-mono">
                {usageAndLimits.departments.used} / {usageAndLimits.departments.allowed}
              </span>
            </div>

            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usageAndLimits.departments.isLimitReached
                    ? 'bg-rose-500'
                    : usageAndLimits.departments.isApproachingLimit
                    ? 'bg-amber-500'
                    : 'bg-emerald-600'
                }`}
                style={{ width: `${usageAndLimits.departments.percentage}%` }}
              />
            </div>

            {usageAndLimits.departments.isApproachingLimit && (
              <p className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                Department cap near maximum.
              </p>
            )}
          </div>

          {/* Metric 3: Tickets */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-slate-800">Service Tickets</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  usageAndLimits.tickets.isLimitReached
                    ? 'bg-rose-100 text-rose-800'
                    : usageAndLimits.tickets.isApproachingLimit
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {usageAndLimits.tickets.percentage}%
              </span>
            </div>

            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-500 font-medium">Used / Allowed</span>
              <span className="font-extrabold text-slate-900 font-mono">
                {usageAndLimits.tickets.used} / {usageAndLimits.tickets.allowed}
              </span>
            </div>

            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usageAndLimits.tickets.isLimitReached
                    ? 'bg-rose-500'
                    : usageAndLimits.tickets.isApproachingLimit
                    ? 'bg-amber-500'
                    : 'bg-purple-600'
                }`}
                style={{ width: `${usageAndLimits.tickets.percentage}%` }}
              />
            </div>

            {usageAndLimits.tickets.isApproachingLimit && (
              <p className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                Approaching ticket limit for this cycle.
              </p>
            )}
          </div>

          {/* Metric 4: Storage */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-bold text-slate-800">Storage Used</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  usageAndLimits.storage.isLimitReached
                    ? 'bg-rose-100 text-rose-800'
                    : usageAndLimits.storage.isApproachingLimit
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {usageAndLimits.storage.percentage}%
              </span>
            </div>

            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-500 font-medium">Used / Allowed</span>
              <span className="font-extrabold text-slate-900 font-mono">
                {usageAndLimits.storage.usedMB} MB / {(usageAndLimits.storage.allowedMB / 1000).toFixed(0)} GB
              </span>
            </div>

            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usageAndLimits.storage.isLimitReached
                    ? 'bg-rose-500'
                    : usageAndLimits.storage.isApproachingLimit
                    ? 'bg-amber-500'
                    : 'bg-orange-500'
                }`}
                style={{ width: `${Math.max(usageAndLimits.storage.percentage, 2)}%` }}
              />
            </div>

            {usageAndLimits.storage.isApproachingLimit && (
              <p className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                Cloud storage near limit.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Billing History Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">Billing History</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Official transaction logs, captured payments, and tax invoices.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 font-medium">
            {billingHistory.length} Recorded {billingHistory.length === 1 ? 'Transaction' : 'Transactions'}
          </span>
        </div>

        {billingHistory.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 italic">
            No previous billing records found for this organization.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Plan / Cycle</th>
                  <th className="py-3 px-4">Amount (INR)</th>
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {billingHistory.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800">{inv.plan}</span>
                      <span className="text-slate-400 text-[10px] block font-mono">
                        {inv.billingCycle}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {formatINR(inv.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">
                      {formatDate(inv.paymentDate)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={inv.paymentStatus === 'CAPTURED' ? 'success' : 'destructive'}
                        className="text-[10px] font-mono uppercase px-2 py-0.5"
                      >
                        {inv.paymentStatus === 'CAPTURED' ? 'Paid / Captured' : inv.paymentStatus}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {inv.paymentStatus === 'CAPTURED' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewInvoice(inv.id)}
                          className="text-xs h-7 font-medium text-slate-700 border-slate-200 hover:bg-slate-100"
                        >
                          <Download className="w-3 h-3 mr-1 text-slate-500" />
                          Download Invoice
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 5. Subscription History Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">Subscription History</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Timeline of previous plans, renewals, upgrades, and billing terms.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 font-medium">
            {subscriptionHistory.length} Historical {subscriptionHistory.length === 1 ? 'Period' : 'Periods'}
          </span>
        </div>

        {subscriptionHistory.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 italic">
            No subscription history recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-4">Plan Name</th>
                  <th className="py-3 px-4">Action Type</th>
                  <th className="py-3 px-4">Billing Period</th>
                  <th className="py-3 px-4">Cycle</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptionHistory.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {sub.planName}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                        {sub.type === 'NEW_PURCHASE' ? 'New Plan' : sub.type === 'UPGRADE' ? 'Tier Upgrade' : 'Renewal'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {formatDate(sub.startsAt)} &rarr; {formatDate(sub.endsAt)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {sub.billingCycle}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {formatINR(sub.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Badge
                        variant={sub.status === 'ACTIVE' ? 'success' : 'neutral'}
                        className="text-[10px] font-mono uppercase px-2 py-0.5"
                      >
                        {sub.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL 1: Renew Subscription
         ─────────────────────────────────────────────────────────────────────── */}
      <Dialog
        isOpen={showRenewModal}
        onClose={() => !isProcessingPayment && setShowRenewModal(false)}
        title="Renew Current Subscription"
      >
        <div className="space-y-4 pt-2 text-xs">
          <p className="text-slate-500">
            Extend your current <strong className="text-slate-900 font-bold">{currentPlan.planName}</strong> to ensure continuous ticket dispatch, SLA tracking, and staff access.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="bg-slate-50 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              type="button"
              onClick={() => setRenewalCycle('ANNUAL')}
              className={`flex-1 py-2 text-center font-bold rounded-lg transition-all ${
                renewalCycle === 'ANNUAL'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annual / Yearly <span className="text-[10px] text-emerald-600 font-mono">(Save 20%)</span>
            </button>
            <button
              type="button"
              onClick={() => setRenewalCycle('MONTHLY')}
              className={`flex-1 py-2 text-center font-bold rounded-lg transition-all ${
                renewalCycle === 'MONTHLY'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Billing
            </button>
          </div>

          {/* Pricing Breakdown */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Renewal Base Price:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatINR(data.renewalInfo[renewalCycle.toLowerCase() as 'annual' | 'monthly'].basePrice)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>GST (18% Tax):</span>
              <span className="font-mono font-bold text-slate-900">
                {formatINR(data.renewalInfo[renewalCycle.toLowerCase() as 'annual' | 'monthly'].gstAmount)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-slate-900 text-sm">
              <span>Total Renewal Price:</span>
              <span className="text-orange-600 font-mono">
                {formatINR(data.renewalInfo[renewalCycle.toLowerCase() as 'annual' | 'monthly'].totalAmount)}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>
              Upon payment, your expiry date will automatically extend by{' '}
              <strong>{renewalCycle === 'ANNUAL' ? '12 months' : '1 month'}</strong>.
            </span>
          </div>

          {paymentError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {paymentError}
            </div>
          )}

          {paymentSuccessMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {paymentSuccessMsg}
            </div>
          )}

          <div className="pt-4 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={isProcessingPayment}
              onClick={() => setShowRenewModal(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isProcessingPayment}
              onClick={() => initiatePayment(currentPlan.plan, renewalCycle)}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
            >
              {isProcessingPayment ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                <>
                  <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                  Pay {formatINR(data.renewalInfo[renewalCycle.toLowerCase() as 'annual' | 'monthly'].totalAmount)}
                </>
              )}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL 2: Compare & Upgrade Plan
         ─────────────────────────────────────────────────────────────────────── */}
      <Dialog
        isOpen={showUpgradeModal}
        onClose={() => !isProcessingPayment && setShowUpgradeModal(false)}
        title="Upgrade Organization Plan"
      >
        <div className="space-y-5 pt-2 text-xs">
          <p className="text-slate-500">
            Select a higher subscription tier to expand technician quotas, unlock automated routing, and gain multi-department controls.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="bg-slate-50 p-1 rounded-xl flex items-center border border-slate-200 max-w-sm mx-auto">
            <button
              type="button"
              onClick={() => setUpgradeCycle('ANNUAL')}
              className={`flex-1 py-1.5 text-center font-bold rounded-lg transition-all ${
                upgradeCycle === 'ANNUAL'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annual (Save 20%)
            </button>
            <button
              type="button"
              onClick={() => setUpgradeCycle('MONTHLY')}
              className={`flex-1 py-1.5 text-center font-bold rounded-lg transition-all ${
                upgradeCycle === 'MONTHLY'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {availablePlans.map((p) => {
              const price = upgradeCycle === 'ANNUAL' ? p.annualTotalPrice : p.monthlyPrice;
              const isSelected = selectedUpgradePlan === p.plan;
              return (
                <div
                  key={p.plan}
                  onClick={() => p.plan !== 'STARTER' && setSelectedUpgradePlan(p.plan as any)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    p.isCurrent
                      ? 'border-slate-200 bg-slate-50/50 opacity-70'
                      : isSelected
                      ? 'border-orange-500 bg-orange-50/30 ring-2 ring-orange-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-slate-900">{p.planName}</span>
                      {p.isCurrent ? (
                        <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                          Current
                        </span>
                      ) : isSelected ? (
                        <span className="text-[10px] font-mono bg-orange-600 text-white px-1.5 py-0.5 rounded font-bold">
                          Selected
                        </span>
                      ) : null}
                    </div>

                    <div className="text-lg font-extrabold text-slate-900 font-mono">
                      {formatINR(price)}
                      <span className="text-[10px] font-normal text-slate-400"> / {upgradeCycle === 'ANNUAL' ? 'yr' : 'mo'}</span>
                    </div>

                    <div className="mt-3 py-2 border-t border-slate-100 text-[11px] font-semibold text-slate-700">
                      Up to {p.maxTechnicians >= 999 ? 'Unlimited' : p.maxTechnicians} Technicians
                    </div>

                    <ul className="mt-2 space-y-1.5 text-[11px] text-slate-600">
                      {p.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4">
                    {p.isCurrent ? (
                      <span className="text-[11px] text-slate-400 italic block text-center">Active Plan</span>
                    ) : (
                      <Button
                        size="sm"
                        variant={isSelected ? 'primary' : 'outline'}
                        className={`w-full text-xs font-bold ${
                          isSelected ? 'bg-orange-600 text-white' : 'text-slate-700 border-slate-200'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUpgradePlan(p.plan as any);
                          initiatePayment(p.plan as any, upgradeCycle);
                        }}
                      >
                        Upgrade to {p.plan}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {paymentError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {paymentError}
            </div>
          )}

          {paymentSuccessMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {paymentSuccessMsg}
            </div>
          )}
        </div>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL 3: Official GST Tax Invoice
         ─────────────────────────────────────────────────────────────────────── */}
      <Dialog
        isOpen={!!viewingInvoice}
        onClose={() => setViewingInvoice(null)}
        title="Official GST Tax Invoice"
      >
        {viewingInvoice && (
          <div className="space-y-5 pt-2 text-xs" id="printable-tax-invoice">
            {/* Header */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {viewingInvoice.seller.companyName}
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  GSTIN: <strong className="font-mono text-slate-700">{viewingInvoice.seller.gstin}</strong>
                </p>
                <p className="text-slate-500 text-[11px] max-w-xs mt-0.5">
                  {viewingInvoice.seller.address}
                </p>
                <p className="text-slate-500 text-[11px]">
                  Email: {viewingInvoice.seller.supportEmail} | {viewingInvoice.seller.website}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                  TAX INVOICE
                </span>
                <div className="mt-2 font-mono font-bold text-slate-900 text-sm">
                  {viewingInvoice.invoiceNumber}
                </div>
                <div className="text-slate-500 text-[11px] font-mono mt-0.5">
                  Date: {formatDate(viewingInvoice.paymentDate)}
                </div>
                <div className="text-slate-500 text-[11px] font-mono">
                  SAC Code: {viewingInvoice.sacCode}
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block mb-1">
                Billed To (Client Customer)
              </span>
              <div className="font-bold text-slate-900">{viewingInvoice.buyer.companyName}</div>
              <div className="text-slate-500 text-[11px]">Attn: {viewingInvoice.buyer.contactName} ({viewingInvoice.buyer.contactEmail})</div>
              <div className="text-slate-500 text-[11px] font-mono">GSTIN: {viewingInvoice.buyer.gstin}</div>
            </div>

            {/* Line Items */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-mono uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5">Billing Term</th>
                    <th className="p-2.5 text-right">Taxable Amt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2.5">
                      <strong className="text-slate-900 block">{viewingInvoice.planName} Subscription</strong>
                      <span className="text-[11px] text-slate-500">Service Calls &amp; Operations Management Platform</span>
                    </td>
                    <td className="p-2.5 font-mono text-slate-600">{viewingInvoice.billingCycle}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                      {formatINR(viewingInvoice.baseAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Tax Breakdown */}
            <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100 font-mono">
              <div className="flex justify-between">
                <span>Taxable Base Value:</span>
                <span>{formatINR(viewingInvoice.baseAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>CGST (9.0%):</span>
                <span>{formatINR(viewingInvoice.cgstAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST (9.0%):</span>
                <span>{formatINR(viewingInvoice.sgstAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
                <span>Total Amount Paid:</span>
                <span className="text-orange-600">{formatINR(viewingInvoice.totalAmount)}</span>
              </div>
            </div>

            {/* Metadata Footer */}
            <div className="p-3 rounded-xl bg-slate-50 text-[10px] font-mono text-slate-500 space-y-1">
              <div>Razorpay Order ID: <span className="text-slate-800">{viewingInvoice.orderId}</span></div>
              <div>Razorpay Payment ID: <span className="text-slate-800">{viewingInvoice.paymentId || 'N/A'}</span></div>
              <div className="text-emerald-700 font-bold">Payment Status: {viewingInvoice.paymentStatus} (Captured Online)</div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingInvoice(null)}
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => window.print()}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Print / Save PDF
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
