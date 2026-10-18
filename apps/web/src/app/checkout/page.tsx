'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { KalpakLogo } from '@/components/KalpakLogo';
import { Button, Alert, Input } from '@/components/ui';
import {
  CheckCircle2,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Lock,
  CreditCard,
  Building2,
  Check,
  Upload,
  Trash2,
  Printer,
  Calendar,
  Receipt,
} from 'lucide-react';
import {
  CreatePaymentOrderResponse,
  VerifyPaymentResponse,
  PlanTier,
  BillingCycle,
} from '@kalpak/types';
import { KALPAK_LOGO_DATA_URL } from '@/lib/kalpak-logo-base64';
import { loadRazorpayScript } from '@/lib/razorpay';
import { buildTenantSubdomainUrl } from '@/lib/subdomain';
import { ALL_PLANS, getPlanDetails, PlanDetails } from '@/lib/plans';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, activeTenant, isLoading: authLoading, refetchSession } = useAuth();

  // Read initial plan from searchParams (defaulting to STARTER)
  const initialPlanParam = searchParams?.get('plan')?.toUpperCase() || 'STARTER';
  const initialPlanKey: PlanTier =
    initialPlanParam === 'PROFESSIONAL'
      ? 'PROFESSIONAL'
      : initialPlanParam === 'ENTERPRISE'
      ? 'ENTERPRISE'
      : 'STARTER';

  const initialCycleParam = searchParams?.get('billing')?.toUpperCase();
  const initialCycle: BillingCycle = initialCycleParam === 'MONTHLY' ? 'MONTHLY' : 'ANNUAL';

  const [selectedPlanKey, setSelectedPlanKey] = useState<PlanTier>(initialPlanKey);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(initialCycle);
  const [gstin, setGstin] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('Maharashtra');
  const [pincode, setPincode] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentSuccessData, setPaymentSuccessData] = useState<VerifyPaymentResponse | null>(null);
  const [paymentOrderData, setPaymentOrderData] = useState<CreatePaymentOrderResponse | null>(null);

  // Workflow steps: CHECKOUT -> CONFIRMATION -> COMPANY_SETUP
  const [currentStep, setCurrentStep] = useState<'CHECKOUT' | 'CONFIRMATION' | 'COMPANY_SETUP'>('CHECKOUT');

  // Basic Company Setup State
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

  // Active Plan Details
  const activePlan: PlanDetails = getPlanDetails(selectedPlanKey);

  // Pricing calculations
  const basePrice = billingCycle === 'ANNUAL' ? activePlan.annualTotalPrice : activePlan.monthlyPrice;
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
      router.push(`/signup?plan=${selectedPlanKey.toLowerCase()}&returnUrl=/checkout`);
    }
  }, [user, authLoading, router, selectedPlanKey]);

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
          plan: selectedPlanKey,
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

      setPaymentOrderData(orderResponse);

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
        description: `Kalpak ${activePlan.name} (${billingCycle === 'ANNUAL' ? '1-Year' : '1-Month'} Subscription)`,
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
        setErrorMessage(err.errorResponse?.message || 'Failed to initiate payment. Please try again.');
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

      // Prepopulate company setup values for Step 3
      setCompanyName(activeTenant?.name || '');
      const fullAddress = [streetAddress, city, stateName, pincode].filter(Boolean).join(', ');
      setCompanyAddress(fullAddress);
      setCompanyPhone((activeTenant?.settings as any)?.companyProfile?.phone || '');
      setCompanyWebsite((activeTenant?.settings as any)?.companyProfile?.website || '');
      setCompanySupportEmail((activeTenant?.settings as any)?.companyProfile?.supportEmail || user?.email || '');
      setCompanyLogo(
        (activeTenant?.settings as any)?.companyProfile?.logoUrl ||
          (activeTenant?.settings as any)?.logoUrl ||
          ''
      );

      // Show Confirmation Screen first!
      setCurrentStep('CONFIRMATION');
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.errorResponse?.message || 'Payment signature verification failed.');
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

      // Mark onboarding completed in tenant settings so companies enter dashboard directly
      await apiClient('/tenants/onboarding/complete', {
        method: 'POST',
      }).catch(() => {});

      const updated = await refetchSession();
      const targetSlug = updated?.activeTenant?.slug || activeTenant?.slug;
      const targetUrl = targetSlug ? buildTenantSubdomainUrl(targetSlug, '/dashboard') : '/dashboard';
      window.location.href = targetUrl;
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setSetupError(err.errorResponse?.message || 'Failed to save company profile');
      } else {
        setSetupError('An unexpected error occurred while saving company details. Please try again.');
      }
    } finally {
      setIsSavingSetup(false);
    }
  };

  const handleSkipToDashboard = async () => {
    setIsSavingSetup(true);
    try {
      await apiClient('/tenants/onboarding/complete', {
        method: 'POST',
      }).catch(() => {});
      const updated = await refetchSession();
      const targetSlug = updated?.activeTenant?.slug || activeTenant?.slug;
      const targetUrl = targetSlug ? buildTenantSubdomainUrl(targetSlug, '/dashboard') : '/dashboard';
      window.location.href = targetUrl;
    } catch {
      window.location.href = '/dashboard';
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
    currentStep === 'CHECKOUT'
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
              {sub.plan} Plan is Already Active!
            </h1>

            <p className="text-sm text-slate-600 mt-2.5 max-w-lg mx-auto leading-relaxed">
              Your organization <strong className="text-slate-900 font-bold">{activeTenant?.name}</strong> already has
              an active {sub.plan} subscription with official Razorpay verification.
            </p>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 my-6 text-left max-w-md mx-auto space-y-2.5 text-xs text-slate-700">
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Organization:</span>
                <strong className="text-slate-900">
                  {activeTenant?.name} ({activeTenant?.slug})
                </strong>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Current Plan:</span>
                <strong className="text-orange-600 font-bold">{sub.plan} Plan</strong>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Billing Cycle:</span>
                <strong className="text-slate-900">
                  {sub.billingCycle === 'ANNUAL' ? 'Annual (Billed Yearly)' : 'Monthly'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Valid / Active Through:</span>
                <strong className="text-emerald-700 font-bold">
                  {new Date(sub.endsAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </strong>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setCompanyName(activeTenant?.name || '');
                  setCompanyAddress([streetAddress, city, stateName, pincode].filter(Boolean).join(', '));
                  setCompanyPhone((activeTenant?.settings as any)?.companyProfile?.phone || '');
                  setCompanyWebsite((activeTenant?.settings as any)?.companyProfile?.website || '');
                  setCompanySupportEmail((activeTenant?.settings as any)?.companyProfile?.supportEmail || user?.email || '');
                  setCompanyLogo(
                    (activeTenant?.settings as any)?.companyProfile?.logoUrl ||
                      (activeTenant?.settings as any)?.logoUrl ||
                      ''
                  );
                  setCurrentStep('COMPANY_SETUP');
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-md transition-all cursor-pointer"
              >
                <span>Configure Company Profile</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                href="/plans"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-slate-700 hover:text-slate-900 text-sm bg-slate-100 hover:bg-slate-200 transition-all"
              >
                <span>View All Plans &rarr;</span>
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

  // STEP 2: PAYMENT CONFIRMATION SCREEN
  if (paymentSuccessData && currentStep === 'CONFIRMATION') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-orange-500 selection:text-white">
        {/* Header */}
        <header className="border-b border-slate-200 bg-white py-4 px-6 sticky top-0 z-30 shadow-xs">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <KalpakLogo size="md" />
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Payment Verified • Active</span>
            </span>
          </div>
        </header>

        {/* Confirmation Content */}
        <main className="max-w-2xl mx-auto px-4 py-10 sm:py-14 flex-1 w-full">
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl w-full text-center">
            {/* Success Celebration Badge */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-3xl bg-emerald-400/20 animate-ping" />
              <div className="relative w-20 h-20 rounded-3xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Check className="w-10 h-10 stroke-[3]" />
              </div>
            </div>

            <span className="text-xs font-black uppercase tracking-widest text-emerald-700 bg-emerald-100/90 px-4 py-1.5 rounded-full inline-block mb-3">
              Order Confirmed & Subscription Activated
            </span>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              Payment Successful!
            </h1>

            <p className="text-sm text-slate-600 mt-2 max-w-lg mx-auto leading-relaxed">
              Your payment for <strong className="text-slate-900 font-bold">{activePlan.name}</strong> has been
              cryptographically verified and activated for <strong className="text-slate-900 font-bold">{activeTenant?.name}</strong>.
            </p>

            {/* Official Order Receipt Summary */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/90 my-8 text-left space-y-3.5 text-xs text-slate-700">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-orange-600" />
                  <span>Subscription Plan</span>
                </span>
                <span className="font-extrabold text-orange-600 text-sm">
                  {activePlan.name} ({activePlan.maxTechniciansText})
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Billing Frequency</span>
                <span className="font-bold text-slate-900">
                  {billingCycle === 'ANNUAL' ? 'Annual (12 Months • 20% Off)' : 'Monthly'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Active Through</span>
                </span>
                <span className="font-bold text-emerald-700">
                  {new Date(paymentSuccessData.endsAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>

              {paymentOrderData?.orderId && (
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Razorpay Order ID</span>
                  <span className="font-mono text-slate-900 font-semibold text-[11px]">
                    {paymentOrderData.orderId}
                  </span>
                </div>
              )}

              {paymentSuccessData.subscriptionId && (
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Subscription ID</span>
                  <span className="font-mono text-slate-900 font-semibold text-[11px]">
                    {paymentSuccessData.subscriptionId}
                  </span>
                </div>
              )}

              {gstin && (
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Registered GSTIN</span>
                  <span className="font-mono text-slate-900 font-bold uppercase">{gstin}</span>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="pt-2 space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Base Subscription Fee:</span>
                  <span>₹{basePrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CGST (9%) + SGST (9%):</span>
                  <span>₹{gstAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-950 font-black text-sm pt-2 border-t border-slate-200">
                  <span>Total Amount Paid:</span>
                  <span className="text-emerald-700 font-extrabold">₹{totalPayable.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-slate-700 hover:text-slate-900 text-xs bg-slate-100 hover:bg-slate-200 transition-all border border-slate-200 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>Print Official Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep('COMPANY_SETUP')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-white text-sm bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
              >
                <span>Proceed to Company Basic Configuration</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleSkipToDashboard}
                disabled={isSavingSetup}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-slate-700 hover:text-slate-900 text-xs bg-white hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer"
              >
                <span>Direct to Dashboard &rarr;</span>
              </button>
            </div>
          </div>
        </main>

        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Kalpak Solutions Inc. All rights reserved.
        </footer>
      </div>
    );
  }

  // STEP 3: COMPANY BASIC CONFIGURATION VIEW
  if (currentStep === 'COMPANY_SETUP') {
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
                Final Step • Company Profile Configuration
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                Configure Your Company Profile
              </h1>
              <p className="text-sm text-slate-600 mt-2 max-w-lg mx-auto leading-relaxed">
                Provide your official branding and contact details so service tickets, customer notifications, and portals reflect your business.
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
                      <img
                        src={companyLogo}
                        alt="Company Logo Preview"
                        className="max-w-full max-h-full object-contain"
                      />
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
                  label="Official Business Address"
                  type="text"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder="Street, City, State, Pincode"
                  helperText="Used on service invoices, tickets, and customer reports"
                />
              </div>

              {/* 4. Phone & Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    id="setup-company-phone"
                    label="Official Phone / Support Hotline"
                    type="tel"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    helperText="Primary helpline for client tickets"
                  />
                </div>
                <div>
                  <Input
                    id="setup-company-website"
                    label="Website URL"
                    type="url"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="https://example.com"
                    helperText="Company public web address"
                  />
                </div>
              </div>

              {/* 5. Support Email */}
              <div>
                <Input
                  id="setup-company-email"
                  label="Support & Escalation Email"
                  type="email"
                  value={companySupportEmail}
                  onChange={(e) => setCompanySupportEmail(e.target.value)}
                  placeholder="support@yourcompany.com"
                  helperText="Where customer SLA escalation notifications will be routed"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep('CONFIRMATION')}
                  className="w-full sm:w-auto text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  &larr; Back to Order Confirmation
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSkipToDashboard}
                    disabled={isSavingSetup}
                    className="text-xs font-bold text-slate-500 hover:text-orange-600 transition-colors"
                  >
                    Skip Setup & Enter Dashboard &rarr;
                  </button>

                  <Button
                    type="submit"
                    disabled={isSavingSetup}
                    className="w-full sm:w-auto h-11 px-8 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-md transition-all cursor-pointer"
                  >
                    {isSavingSetup ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving Configuration...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span>Save & Enter Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
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

  // STEP 1: CHECKOUT VIEW
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-orange-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white py-4 px-6 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <KalpakLogo size="md" />
          <div className="flex items-center gap-3">
            <Link
              href="/plans"
              className="text-xs font-bold text-slate-600 hover:text-orange-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>View All Plans</span>
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <Lock className="w-3.5 h-3.5" />
              <span>256-Bit SSL Secured</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12 flex-1 w-full">
        {/* Breadcrumb / Step Indicator */}
        <div className="mb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100/70 text-orange-700 text-xs font-extrabold uppercase tracking-wider mb-2">
            <span>Step 1 of 3 • Plan Selection & Checkout</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            Review Your Plan & Complete Subscription
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Choose your subscription tier, billing cycle, and billing details. Official Razorpay checkout activated.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6">
            <Alert variant="error">{errorMessage}</Alert>
          </div>
        )}

        {/* Plan Switcher Pills */}
        <div className="mb-8 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            Selected Subscription Plan (Click to Switch):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(Object.keys(ALL_PLANS) as PlanTier[]).map((tierKey) => {
              const p = ALL_PLANS[tierKey];
              const isSelected = selectedPlanKey === tierKey;
              return (
                <button
                  key={tierKey}
                  type="button"
                  onClick={() => setSelectedPlanKey(tierKey)}
                  className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-sm text-slate-900">{p.name}</span>
                    {p.isPopular && (
                      <span className="text-[9px] font-black uppercase tracking-wider text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-700">
                    ₹
                    {(billingCycle === 'ANNUAL' ? p.annualMonthlyPrice : p.monthlyPrice).toLocaleString('en-IN')}{' '}
                    <span className="text-[10px] text-slate-500 font-normal">/ mo</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">{p.maxTechniciansText}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form & Billing Details */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Billing Frequency Toggle */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <span>Select Billing Cycle</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBillingCycle('ANNUAL')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
                    billingCycle === 'ANNUAL'
                      ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="absolute top-2.5 right-2.5 text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    Save 20%
                  </span>
                  <div className="text-xs font-bold text-slate-900">Annual Billing</div>
                  <div className="text-base font-black text-slate-950 mt-1">
                    ₹{activePlan.annualMonthlyPrice.toLocaleString('en-IN')}{' '}
                    <span className="text-xs font-normal text-slate-500">/ mo</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Billed ₹{activePlan.annualTotalPrice.toLocaleString('en-IN')} annually
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBillingCycle('MONTHLY')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    billingCycle === 'MONTHLY'
                      ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900">Monthly Billing</div>
                  <div className="text-base font-black text-slate-950 mt-1">
                    ₹{activePlan.monthlyPrice.toLocaleString('en-IN')}{' '}
                    <span className="text-xs font-normal text-slate-500">/ mo</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Billed every month, cancel anytime</div>
                </button>
              </div>
            </div>

            {/* 2. Billing Address & Tax Details */}
            <form onSubmit={handleProceedToPayment} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <span>Billing Information & Tax Invoice</span>
              </h2>

              <div>
                <Input
                  id="checkout-gstin"
                  label="GSTIN (Optional for Business ITC)"
                  type="text"
                  placeholder="e.g. 27ABCDE1234F1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  helperText="Required if your organization claims Goods & Services Tax input credit."
                />
              </div>

              <div>
                <Input
                  id="checkout-street"
                  label="Street Address / Office Location"
                  type="text"
                  placeholder="e.g. Plot 42, Hinjewadi Phase 1"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Input
                    id="checkout-city"
                    label="City"
                    type="text"
                    placeholder="e.g. Pune"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    id="checkout-state"
                    label="State"
                    type="text"
                    placeholder="e.g. Maharashtra"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    id="checkout-pincode"
                    label="Pincode"
                    type="text"
                    placeholder="411057"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                  />
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="pt-3 border-t border-slate-100">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                  />
                  <span>
                    I confirm that I am authorized to bind{' '}
                    <strong className="text-slate-900">{activeTenant?.name || 'this organization'}</strong> to Kalpak
                    Solutions Terms of Service, Privacy Policy, and Recurring Subscription billing agreement.
                  </span>
                </label>
              </div>

              {/* Submit Payment CTA */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full h-12 text-sm font-black rounded-xl text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Initiating Razorpay Gateway...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Pay ₹{totalPayable.toLocaleString('en-IN')} with Razorpay</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column: Order Summary & Invoice Breakdown */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center justify-between">
                <span>Order Summary</span>
                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full">
                  {billingCycle}
                </span>
              </h3>

              {/* Plan Card */}
              <div className="py-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-base text-slate-950">{activePlan.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{activePlan.maxTechniciansText}</p>
                  </div>
                  <span className="text-base font-black text-slate-900">
                    ₹{basePrice.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Breakdown */}
              <div className="py-4 space-y-2.5 text-xs text-slate-600 border-b border-slate-100">
                <div className="flex justify-between">
                  <span>Base Plan Price:</span>
                  <span className="font-semibold text-slate-900">₹{basePrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Goods & Services Tax (GST 18%):</span>
                  <span className="font-semibold text-slate-900">₹{gstAmount.toLocaleString('en-IN')}</span>
                </div>
                {billingCycle === 'ANNUAL' && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Annual Discount Applied:</span>
                    <span>20% Saved</span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="pt-4 flex items-baseline justify-between">
                <span className="text-sm font-bold text-slate-900">Total Payable Now:</span>
                <span className="text-2xl font-black text-slate-950">
                  ₹{totalPayable.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 text-right mt-1">Inclusive of all taxes</p>

              {/* Included Capabilities Snippet */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                  Included in {activePlan.name}:
                </p>
                <div className="space-y-2">
                  {activePlan.features.slice(0, 5).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Payment Method Badges */}
            <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200/80 text-xs text-slate-500 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Supported Payment Methods via Razorpay:</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-600">
                <span className="px-2 py-1 rounded-md bg-white border border-slate-200 font-medium">
                  UPI (GPay / PhonePe / Paytm / BHIM)
                </span>
                <span className="px-2 py-1 rounded-md bg-white border border-slate-200 font-medium">
                  Credit / Debit Cards (Visa, MasterCard, RuPay)
                </span>
                <span className="px-2 py-1 rounded-md bg-white border border-slate-200 font-medium">
                  NetBanking (50+ Banks)
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Kalpak Solutions Inc. All rights reserved.
      </footer>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
