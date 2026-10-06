'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { KalpakLogo } from '@/components/KalpakLogo';
import { Button, Alert, Input } from '@/components/ui';
import {
  CheckCircle2,
  ShieldCheck,
  Zap,
  ArrowLeft,
  ArrowRight,
  Lock,
  CreditCard,
  Building2,
  QrCode,
  Smartphone,
  Check,
  Upload,
  Trash2,
} from 'lucide-react';
import {
  CreatePaymentOrderResponse,
  VerifyPaymentResponse,
  PlanTier,
  BillingCycle,
} from '@kalpak/types';
import { KALPAK_LOGO_DATA_URL } from '@/lib/kalpak-logo-base64';
import { loadRazorpayScript } from '@/lib/razorpay';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function StarterCheckoutPage() {
  const router = useRouter();
  const { user, activeTenant, isLoading: authLoading, refetchSession } = useAuth();

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('ANNUAL');
  const [gstin, setGstin] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('Maharashtra');
  const [pincode, setPincode] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentSuccessData, setPaymentSuccessData] = useState<VerifyPaymentResponse | null>(null);

  // Basic Company Setup State
  const [setupStep, setSetupStep] = useState<'CHECKOUT' | 'COMPANY_SETUP'>('CHECKOUT');
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState<string>('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companySupportEmail, setCompanySupportEmail] = useState('');
  const [isSavingSetup, setIsSavingSetup] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
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

  // Pricing Matrix (Calculated Ground Truth)
  const monthlyRate = 2999;
  const annualBase = 28788; // ₹2,399 / mo * 12
  const basePrice = billingCycle === 'ANNUAL' ? annualBase : monthlyRate;
  const gstAmount = Math.round(basePrice * 0.18);
  const totalPayable = basePrice + gstAmount;

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

  // Fetch active subscription for the current organization
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

  // Redirect to signup/login if unauthenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/signup?plan=starter&returnUrl=/checkout/starter');
    }
  }, [user, authLoading, router]);

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!agreedToTerms) {
      setErrorMessage('Please confirm the agreement checkbox to proceed with your subscription.');
      return;
    }

    if (!activeTenant) {
      setErrorMessage('No active organization found. Please complete organization setup first.');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Create Order on Backend
      const orderResponse = await apiClient<CreatePaymentOrderResponse>('/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({
          plan: 'STARTER' as PlanTier,
          billingCycle,
          gstin: gstin.trim() || undefined,
          billingAddress: {
            street: streetAddress.trim() || undefined,
            city: city.trim() || undefined,
            state: stateName.trim() || undefined,
            pincode: pincode.trim() || undefined,
            country: 'India',
          },
          agreedToTerms: true,
        }),
      });

      // 2. Ensure official Razorpay Checkout SDK is ready
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded || typeof window === 'undefined' || !window.Razorpay) {
        setIsProcessing(false);
        setErrorMessage('Razorpay Checkout SDK could not be loaded. Please check your internet connection.');
        return;
      }

      // 3. Open official Razorpay Checkout Modal
      const options = {
        key: orderResponse.keyId,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        name: 'Kalpak Solutions',
        description: `Kalpak Starter Plan (${billingCycle === 'ANNUAL' ? '1-Year' : '1-Month'} Subscription)`,
        order_id: orderResponse.orderId,
        image: KALPAK_LOGO_DATA_URL,
        prefill: {
          name: user?.fullName || orderResponse.companyName || 'Valued Customer',
          email: user?.email || orderResponse.customerEmail || 'billing@kalpak.com',
          contact: (user as any)?.phoneNumber || orderResponse.customerPhone || '9876543210',
        },
        theme: {
          color: '#ea580c', // Kalpak Orange theme
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: 'UPI / QR Code (GPay, PhonePe, BHIM)',
                instruments: [
                  {
                    method: 'upi',
                  },
                ],
              },
              other: {
                name: 'Cards, Netbanking & Wallets',
                instruments: [
                  {
                    method: 'card',
                  },
                  {
                    method: 'netbanking',
                  },
                  {
                    method: 'wallet',
                  },
                ],
              },
            },
            sequence: ['block.upi', 'block.other'],
            preferences: {
              show_default_blocks: true,
            },
          },
        },
        modal: {
          backdropclose: false,
          escape: true,
          handleback: true,
          confirm_close: true,
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          await verifyPaymentWithBackend(response);
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (failRes: any) => {
        setIsProcessing(false);
        setErrorMessage(
          failRes.error?.description || 'Payment was declined or failed. Please try another payment method.'
        );
      });
      rzp.open();
    } catch (err: unknown) {
      setIsProcessing(false);
      if (err instanceof ApiClientError) {
        setErrorMessage(err.errorResponse.message || 'Failed to initiate payment. Please try again.');
      } else {
        setErrorMessage('Unable to connect to the payment gateway. Please check your connection.');
      }
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setSetupError('Company logo image size must be under 2 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        setCompanyLogo(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const verifyPaymentWithBackend = async (payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    try {
      const verifyRes = await apiClient<VerifyPaymentResponse>('/payments/verify', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      await refetchSession();
      setPaymentSuccessData(verifyRes);

      // Prepopulate company setup values
      setCompanyName(activeTenant?.name || '');
      const fullAddress = [streetAddress, city, stateName, pincode].filter(Boolean).join(', ');
      setCompanyAddress(fullAddress);
      setCompanyPhone((activeTenant?.settings as any)?.companyProfile?.phone || '');
      setCompanyWebsite((activeTenant?.settings as any)?.companyProfile?.website || '');
      setCompanySupportEmail((activeTenant?.settings as any)?.companyProfile?.supportEmail || user?.email || '');
      setCompanyLogo((activeTenant?.settings as any)?.companyProfile?.logoUrl || (activeTenant?.settings as any)?.logoUrl || '');
      setSetupStep('COMPANY_SETUP');
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.errorResponse.message || 'Payment signature verification failed.');
      } else {
        setErrorMessage('Verification failed. Please contact support with your order reference.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveCompanySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSetup(true);
    setSetupError(null);

    try {
      await apiClient('/tenants/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: companyName.trim() || activeTenant?.name,
          logoUrl: companyLogo || undefined,
          address: companyAddress.trim() || undefined,
          phone: companyPhone.trim() || undefined,
          website: companyWebsite.trim() || undefined,
          supportEmail: companySupportEmail.trim() || undefined,
        }),
      });

      await refetchSession();
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setSetupError(err.errorResponse.message || 'Failed to save company profile');
      } else {
        setSetupError('An unexpected error occurred while saving company details. Please try again.');
      }
    } finally {
      setIsSavingSetup(false);
    }
  };

  if (authLoading || checkingSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">Loading checkout session & verifying subscription...</p>
        </div>
      </div>
    );
  }

  // Active Subscription Screen: Prevent duplicate purchase if current plan is valid & active
  if (
    existingSubscription?.hasActiveSubscription &&
    existingSubscription.subscription?.status === 'ACTIVE' &&
    setupStep !== 'COMPANY_SETUP'
  ) {
    const sub = existingSubscription.subscription;
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-orange-500 selection:text-white">
        <header className="border-b border-slate-200 bg-white py-4 px-6 sticky top-0 z-30 shadow-xs">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <KalpakLogo size="md" />
            <Link
              href="/dashboard"
              className="text-xs font-bold text-slate-600 hover:text-orange-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              &larr; Back to Dashboard
            </Link>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-12 sm:py-16 flex-1 w-full flex items-center">
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl w-full text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-100/80 px-3.5 py-1 rounded-full inline-block mb-3">
              Subscription Active • Valid
            </span>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              Starter Plan is Already Active!
            </h1>

            <p className="text-sm text-slate-600 mt-2.5 max-w-lg mx-auto leading-relaxed">
              Your organization <strong className="text-slate-900 font-bold">{activeTenant?.name}</strong> already has an active Starter plan subscription with official Razorpay payment verification.
            </p>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 my-6 text-left max-w-md mx-auto space-y-2.5 text-xs text-slate-700">
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Organization:</span>
                <strong className="text-slate-900">{activeTenant?.name} ({activeTenant?.slug})</strong>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Current Plan:</span>
                <strong className="text-orange-600 font-bold">Starter Plan (5 Staff)</strong>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Billing Cycle:</span>
                <strong className="text-slate-900">{sub.billingCycle === 'ANNUAL' ? 'Annual (Billed Yearly)' : 'Monthly'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Valid / Active Through:</span>
                <strong className="text-emerald-700 font-bold">
                  {new Date(sub.endsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </strong>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-md transition-all"
              >
                <span>Go to Dashboard</span>
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

  // Basic Company Setup View (Triggered after successful payment or when editing profile)
  if (paymentSuccessData && setupStep === 'COMPANY_SETUP') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-orange-500 selection:text-white">
        {/* Header */}
        <header className="border-b border-slate-200 bg-white py-4 px-6 sticky top-0 z-30 shadow-xs">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <KalpakLogo size="md" />
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Subscription Active • Payment Verified</span>
            </span>
          </div>
        </header>

        {/* Setup Content */}
        <main className="max-w-2xl mx-auto px-4 py-10 sm:py-14 flex-1 w-full">
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl w-full">
            {/* Step & Title */}
            <div className="mb-8 text-center">
              <span className="text-xs font-extrabold uppercase tracking-widest text-orange-600 bg-orange-100/80 px-3.5 py-1 rounded-full inline-block mb-3">
                Step 3 of 3 • Basic Company Setup
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                Configure Your Company Profile
              </h1>
              <p className="text-sm text-slate-600 mt-2 max-w-lg mx-auto leading-relaxed">
                Provide your official business branding so customer tickets, service contracts, SLAs, and customer portals reflect your organization.
              </p>
            </div>

            {setupError && (
              <div className="mb-6">
                <Alert variant="error">{setupError}</Alert>
              </div>
            )}

            <form onSubmit={handleSaveCompanySetup} className="space-y-6">
              {/* 1. Company Logo Upload & Preview */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Company Logo
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  {companyLogo ? (
                    <div className="relative group w-24 h-24 rounded-2xl border border-slate-200 bg-white p-2 flex items-center justify-center overflow-hidden shadow-xs shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={companyLogo} alt="Company Logo Preview" className="max-w-full max-h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setCompanyLogo('')}
                        className="absolute inset-0 bg-slate-900/70 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-xs font-bold gap-1"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                        <span>Remove</span>
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-2xl border border-slate-200 bg-white flex flex-col items-center justify-center text-slate-400 shrink-0">
                      <Building2 className="w-8 h-8 mb-1 text-slate-300" />
                      <span className="text-[10px] font-bold">No Logo</span>
                    </div>
                  )}

                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-xs transition-all">
                        <Upload className="w-3.5 h-3.5 text-orange-600" />
                        <span>{companyLogo ? 'Change Logo Image' : 'Upload Logo'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                      </label>
                      {companyLogo && (
                        <button
                          type="button"
                          onClick={() => setCompanyLogo('')}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      PNG, JPG, SVG or WebP up to 2MB. Recommended dimensions 400x400px.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Company Name */}
              <div>
                <Input
                  id="setup-company-name"
                  label="Company Name"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Precision Tools Pvt Ltd"
                  helperText="Official company name displayed in navigation and customer portals"
                />
              </div>

              {/* 3. Official Address */}
              <div>
                <Input
                  id="setup-company-address"
                  label="Headquarters / Operational Address"
                  type="text"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder="e.g. Plot 42, MIDC Industrial Area, Chakan, Pune 410501"
                  helperText="Physical office or plant address printed on service call work orders"
                />
              </div>

              {/* 4. Contact Phone & Website (Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    id="setup-company-phone"
                    label="Official Contact Phone"
                    type="tel"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    helperText="Support hotline for customer inquiries"
                  />
                </div>

                <div>
                  <Input
                    id="setup-company-website"
                    label="Company Website"
                    type="url"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="e.g. https://acmetools.com"
                    helperText="Official corporate web address"
                  />
                </div>
              </div>

              {/* 5. Support Email */}
              <div>
                <Input
                  id="setup-support-email"
                  label="Customer Support Email"
                  type="email"
                  value={companySupportEmail}
                  onChange={(e) => setCompanySupportEmail(e.target.value)}
                  placeholder="e.g. support@acmetools.com"
                  helperText="Inbound email address for ticket dispatches and customer notifications"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 space-y-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isSavingSetup}
                  className="w-full justify-center shadow-lg shadow-orange-500/20 py-3.5 font-black text-sm"
                >
                  <span>Save Profile & Launch Company Dashboard</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = '/dashboard';
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 py-1 transition-colors"
                  >
                    Skip for now & open Dashboard &rarr;
                  </button>
                </div>
              </div>
            </form>
          </div>
        </main>

        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Kalpak Solutions Inc. All rights reserved.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-orange-500 selection:text-white flex flex-col justify-between">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
          <KalpakLogo size="md" />

          <div className="flex items-center gap-2 sm:gap-4 text-xs font-semibold text-slate-600">
            <Link
              href="/"
              className="px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-orange-600 transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full flex-1">
        <div className="mb-8">
          <span className="text-xs font-extrabold uppercase tracking-wider text-orange-600 bg-orange-100/70 px-3 py-1 rounded-full inline-block mb-2">
            Step 2 of 2 • Plan & Billing Confirmation
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
            Confirm Your Starter Plan Subscription
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Review your plan parameters, verify tax details, and proceed to instant Razorpay activation.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6">
            <Alert variant="error" title="Order Notice">
              {errorMessage}
            </Alert>
          </div>
        )}

        <form onSubmit={handleProceedToPayment} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Plan Details & Billing Form (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Plan Overview Card */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs">
              <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-black text-slate-950">Starter Plan</h2>
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 uppercase tracking-wider">
                      Starter &rarr; Manage
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Designed for equipment manufacturers and service providers to streamline customer calls & team dispatch.
                  </p>
                </div>
                <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl shrink-0">
                  <Zap className="w-6 h-6" />
                </div>
              </div>

              {/* Core Inclusions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Up to 5 Technicians / Staff</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Unlimited Service Tickets</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Customer & Asset History</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>2FA Security & Audit Logs</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Email Notifications</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>1 Dedicated Workspace</span>
                </div>
              </div>
            </div>

            {/* 2. Billing Cycle Toggle Card */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Choose Billing Frequency</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Annual Option */}
                <div
                  onClick={() => setBillingCycle('ANNUAL')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between relative ${
                    billingCycle === 'ANNUAL'
                      ? 'border-orange-500 bg-orange-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="absolute -top-2.5 right-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                    Save 20%
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-900">Annual Billing</span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        billingCycle === 'ANNUAL' ? 'border-orange-600 bg-orange-600 text-white' : 'border-slate-300'
                      }`}
                    >
                      {billingCycle === 'ANNUAL' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    <span className="text-lg font-black text-slate-950">₹2,399</span> /month
                  </div>
                  <div className="text-[11px] text-orange-700 font-semibold mt-1">
                    Billed annually (₹28,788/yr)
                  </div>
                </div>

                {/* Monthly Option */}
                <div
                  onClick={() => setBillingCycle('MONTHLY')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    billingCycle === 'MONTHLY'
                      ? 'border-orange-500 bg-orange-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-900">Monthly Billing</span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        billingCycle === 'MONTHLY' ? 'border-orange-600 bg-orange-600 text-white' : 'border-slate-300'
                      }`}
                    >
                      {billingCycle === 'MONTHLY' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    <span className="text-lg font-black text-slate-950">₹2,999</span> /month
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Billed monthly • Cancel anytime
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Organization & Billing Address Information */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-600" />
                  <span>Organization & Tax Details</span>
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Slug: {activeTenant?.slug || 'my-company'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company / Legal Name</label>
                  <Input value={activeTenant?.name || ''} disabled className="bg-slate-50 font-medium text-slate-800" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Administrator Email</label>
                  <Input value={user?.email || ''} disabled className="bg-slate-50 font-medium text-slate-800" />
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-semibold text-slate-700 mb-1">Billing Street Address</label>
                <Input
                  placeholder="e.g. Unit 605, Shri Sairaj, Karve Nagar"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <Input
                    placeholder="e.g. Pune"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State</label>
                  <Input
                    placeholder="e.g. Maharashtra"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pincode</label>
                  <Input
                    placeholder="e.g. 411052"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-semibold text-slate-700 mb-1">
                  GSTIN Number (Optional for GST Tax Credit)
                </label>
                <Input
                  placeholder="e.g. 27ABCDE1234F1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  maxLength={15}
                />
              </div>
            </div>

            {/* 4. Terms of Service & Agreement Confirmation */}
            <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200/80">
              <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-800">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
                />
                <span className="leading-relaxed">
                  I confirm the subscription order on behalf of{' '}
                  <strong className="text-slate-950 font-bold">{activeTenant?.name || 'my organization'}</strong> and agree
                  to the{' '}
                  <a href="/terms" target="_blank" className="text-orange-600 underline font-semibold">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" target="_blank" className="text-orange-600 underline font-semibold">
                    Privacy Policy
                  </a>
                  . Subscriptions auto-renew until cancelled.
                </span>
              </label>
            </div>
          </div>

          {/* Right Column: Order Summary & Razorpay Trigger (5 cols) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-md">
              <h3 className="text-base font-black text-slate-950 pb-4 border-b border-slate-100">
                Order Summary
              </h3>

              <div className="py-4 space-y-3 text-xs border-b border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-600">
                    Starter Plan ({billingCycle === 'ANNUAL' ? '12 Months' : '1 Month'}):
                  </span>
                  <span className="font-bold text-slate-900">₹{basePrice.toLocaleString('en-IN')}</span>
                </div>

                {billingCycle === 'ANNUAL' && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Annual Discount (20% Off):</span>
                    <span>-₹7,200</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-slate-600">Applicable GST (18%):</span>
                  <span className="font-bold text-slate-900">₹{gstAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Total Row */}
              <div className="py-4 flex items-baseline justify-between border-b border-slate-100">
                <div>
                  <span className="text-sm font-bold text-slate-900 block">Total Amount Payable</span>
                  <span className="text-[11px] text-slate-500 font-medium">Includes all taxes (INR)</span>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-slate-950">
                    ₹{totalPayable.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Payment Methods Supported */}
              <div className="mt-4 pt-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Supported Payment Methods
                </span>
                <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-700">
                  <span className="px-2.5 py-1 bg-slate-100 rounded-lg flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5 text-orange-600" /> UPI (GPay/PhonePe)
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 rounded-lg flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Credit / Debit Cards
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 rounded-lg flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" /> Net Banking
                  </span>
                </div>
              </div>

              {/* Proceed to Payment Button */}
              <div className="mt-6 space-y-2.5">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={isProcessing || !agreedToTerms}
                  className="w-full justify-center shadow-lg shadow-orange-500/20 py-3.5 font-bold text-sm bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-700"
                >
                  {isProcessing ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Initiating Secure Gateway...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Proceed to Payment (₹{totalPayable.toLocaleString('en-IN')})
                    </span>
                  )}
                </Button>
              </div>

              <div className="mt-4 text-center space-y-1">
                <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Guaranteed Razorpay Security & Instant Activation</span>
                </p>
                <p className="text-[10px] text-slate-400">
                  Card details and UPI credentials are never stored on Kalpak servers.
                </p>
              </div>
            </div>

            {/* Assistance Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Need Help or Corporate Invoicing?</span>
                <span>Direct Support: +91 93730 28030</span>
              </div>
              <a
                href="mailto:contact@kalpaksolutions.com"
                className="text-orange-600 font-bold hover:underline shrink-0 ml-2"
              >
                Contact Sales &rarr;
              </a>
            </div>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Kalpak Solutions Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
