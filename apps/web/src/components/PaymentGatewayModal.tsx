'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  CreditCard,
  QrCode,
  Building2,
  CheckCircle2,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { Button, Alert } from '@/components/ui';
import { apiClient, ApiClientError } from '@/lib/api-client';
import {
  PlanTier,
  BillingCycle,
  CreatePaymentOrderResponse,
  VerifyPaymentResponse,
} from '@kalpak/types';
import { KALPAK_LOGO_DATA_URL } from '@/lib/kalpak-logo-base64';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose?: () => void;
  plan?: PlanTier;
  billingCycle?: BillingCycle;
  tenantName?: string;
  tenantSlug?: string;
  userEmail?: string;
  userFullName?: string;
  onPaymentSuccess: (res: VerifyPaymentResponse) => void;
}

export function PaymentGatewayModal({
  isOpen,
  onClose,
  plan = 'STARTER',
  billingCycle = 'MONTHLY',
  tenantName,
  tenantSlug,
  userEmail,
  userFullName,
  onPaymentSuccess,
}: PaymentGatewayModalProps) {
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>(billingCycle);
  const [activeTab, setActiveTab] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');

  // Simulation Status
  const [simulationState, setSimulationState] = useState<
    'IDLE' | 'CONNECTING' | 'AUTHORIZING' | 'SUCCESS' | 'FAILED'
  >('IDLE');
  const [simulationStepText, setSimulationStepText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<VerifyPaymentResponse | null>(null);
  const [lastPaymentId, setLastPaymentId] = useState<string>('');

  // Card demo state
  const [cardNumber, setCardNumber] = useState('4111 •••• •••• 1111');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('888');

  // UPI demo state
  const [upiId, setUpiId] = useState('demo-business@okaxis');

  // Pricing
  const monthlyBase = 2999;
  const annualBase = 28788; // ₹2,399 / mo
  const basePrice = selectedCycle === 'ANNUAL' ? annualBase : monthlyBase;
  const gstAmount = Math.round(basePrice * 0.18);
  const totalAmount = basePrice + gstAmount;

  useEffect(() => {
    setSelectedCycle(billingCycle);
  }, [billingCycle]);

  if (!isOpen) return null;

  const handleSimulatePayment = async () => {
    setErrorMessage(null);
    setSimulationState('CONNECTING');
    setSimulationStepText('1/3 Connecting to NPCI & Razorpay Payment Switch...');

    try {
      // 1. Create real order on backend
      const orderRes = await apiClient<CreatePaymentOrderResponse>('/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({
          plan,
          billingCycle: selectedCycle,
          agreedToTerms: true,
        }),
      });

      const orderId = orderRes?.orderId || (orderRes as any)?.data?.orderId;
      if (!orderId) {
        throw new Error('Could not generate Order ID from payment service.');
      }

      await new Promise((resolve) => setTimeout(resolve, 800));
      setSimulationState('AUTHORIZING');
      setSimulationStepText('2/3 Authorizing ₹' + totalAmount.toLocaleString('en-IN') + ' with bank gateway...');

      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSimulationStepText('3/3 Capturing transaction & verifying cryptographic signature...');

      // 2. Call real verify on backend with mock signature
      const mockPaymentId = `pay_sim_${Date.now().toString().slice(-8)}`;
      const mockSignature = `sig_mock_${orderId}_${mockPaymentId}`;

      const verifyRes = await apiClient<VerifyPaymentResponse>('/payments/verify', {
        method: 'POST',
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: mockSignature,
        }),
      });

      setLastPaymentId(mockPaymentId);
      setSuccessData(verifyRes);
      setSimulationState('SUCCESS');
    } catch (err: unknown) {
      setSimulationState('FAILED');
      if (err instanceof ApiClientError) {
        setErrorMessage(err.errorResponse?.message || 'Payment simulation failed. Please try again.');
      } else {
        setErrorMessage('Failed to connect to backend payment service.');
      }
    }
  };

  const handleOpenNativeRazorpay = async () => {
    setErrorMessage(null);
    setSimulationState('CONNECTING');
    setSimulationStepText('Initializing Razorpay Checkout SDK...');

    try {
      const orderRes = await apiClient<CreatePaymentOrderResponse>('/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({
          plan,
          billingCycle: selectedCycle,
          agreedToTerms: true,
        }),
      });

      if (typeof window !== 'undefined' && window.Razorpay && !orderRes.isMockMode) {
        const options = {
          key: orderRes.keyId,
          amount: orderRes.amount,
          currency: orderRes.currency,
          name: 'Kalpak Solutions',
          description: `Kalpak Starter Plan (${selectedCycle === 'ANNUAL' ? '1-Year' : '1-Month'})`,
          order_id: orderRes.orderId,
          image: KALPAK_LOGO_DATA_URL,
          prefill: {
            name: userFullName || tenantName || 'Admin Customer',
            email: userEmail || 'billing@kalpak.solutions',
            contact: '9876543210',
          },
          theme: { color: '#ea580c' },
          modal: {
            ondismiss: () => {
              setSimulationState('IDLE');
            },
          },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            setSimulationState('AUTHORIZING');
            setSimulationStepText('Verifying Razorpay payment signature...');
            const verifyRes = await apiClient<VerifyPaymentResponse>('/payments/verify', {
              method: 'POST',
              body: JSON.stringify(response),
            });
            setLastPaymentId(response.razorpay_payment_id);
            setSuccessData(verifyRes);
            setSimulationState('SUCCESS');
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (failRes: any) => {
          setSimulationState('FAILED');
          setErrorMessage(failRes.error?.description || 'Payment was declined by Razorpay.');
        });
        rzp.open();
      } else {
        // Fallback to instant simulation if Razorpay key is in test/mock mode
        await handleSimulatePayment();
      }
    } catch (err: unknown) {
      setSimulationState('FAILED');
      if (err instanceof ApiClientError) {
        setErrorMessage(err.errorResponse?.message || 'Failed to open Razorpay gateway.');
      } else {
        setErrorMessage('Failed to connect to payment server.');
      }
    }
  };

  const handleSimulateFailure = () => {
    setSimulationState('CONNECTING');
    setSimulationStepText('Connecting to issuing bank...');
    setTimeout(() => {
      setSimulationState('FAILED');
      setErrorMessage(
        'Payment Declined (Mock): Bank Error 104 - Insufficient funds or card daily limit exceeded. (Demonstration of failure handling)'
      );
    }, 1200);
  };

  const handleFinish = () => {
    if (successData) {
      onPaymentSuccess(successData);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 text-white p-5 sm:p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Kalpak Pay • Payment Gateway</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Live Simulator
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Razorpay & NPCI 256-Bit SSL Encrypted Transaction
                </p>
              </div>
            </div>
            {onClose && simulationState !== 'SUCCESS' && (
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors text-xs font-semibold"
              >
                ✕ Close
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* SUCCESS SCREEN */}
          {simulationState === 'SUCCESS' && (
            <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full inline-block">
                  Payment Verified • Subscription Active
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-950 mt-2">
                  ₹{totalAmount.toLocaleString('en-IN')} Received Successfully!
                </h2>
                <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                  Your payment was captured and verified. Organization{' '}
                  <strong className="text-slate-900">{tenantName || tenantSlug || 'Acme'}</strong> now has full
                  access to the Kalpak Starter Plan!
                </p>
              </div>

              {/* Receipt / Invoice Summary Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-left space-y-2 text-xs max-w-sm mx-auto">
                <div className="flex justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Payment ID:</span>
                  <span className="font-mono font-bold text-slate-800">{lastPaymentId}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Plan Activated:</span>
                  <span className="font-bold text-orange-600">Starter Plan (5 Technicians)</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Billing Cycle:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedCycle === 'ANNUAL' ? 'Annual (1 Year)' : 'Monthly'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">GST Tax Invoice:</span>
                  <span className="font-semibold text-emerald-700">INV-2026-GST-OK</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handleFinish}
                  className="w-full h-12 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm shadow-lg shadow-orange-500/25 rounded-xl"
                >
                  <span>Launch Organization Dashboard</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* ACTIVE SIMULATION IN PROGRESS */}
          {(simulationState === 'CONNECTING' || simulationState === 'AUTHORIZING') && (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">Payment Simulation in Progress</h4>
                <p className="text-xs text-orange-600 font-medium mt-1 font-mono">{simulationStepText}</p>
              </div>
              <p className="text-[11px] text-slate-400">
                Simulating NPCI UPI Switch & Razorpay verification with backend PostgreSQL...
              </p>
            </div>
          )}

          {/* CHECKOUT / SIMULATOR CONTROLS */}
          {(simulationState === 'IDLE' || simulationState === 'FAILED') && (
            <>
              {errorMessage && (
                <Alert
                  variant="error"
                  title="Payment Simulation Failed"
                  className="text-xs"
                >
                  {errorMessage}
                </Alert>
              )}

              {/* Order Summary & Cycle Toggle */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Plan Selected</h4>
                    <div className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <span>Kalpak Starter Plan</span>
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                        5 Staff
                      </span>
                    </div>
                  </div>

                  {/* Billing Toggle */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedCycle('MONTHLY')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        selectedCycle === 'MONTHLY'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCycle('ANNUAL')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                        selectedCycle === 'ANNUAL'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>Annual</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-extrabold">
                        -20%
                      </span>
                    </button>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="pt-2 border-t border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Base Subscription ({selectedCycle === 'ANNUAL' ? '12 Months' : '1 Month'}):</span>
                    <span className="font-semibold text-slate-900">₹{basePrice.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>18% GST (CGST 9% + SGST 9%):</span>
                    <span className="font-semibold text-slate-900">₹{gstAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-black text-sm pt-1 border-t border-dashed border-slate-200">
                    <span>Total Payable Amount:</span>
                    <span className="text-orange-600 font-extrabold text-base">
                      ₹{totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Method Tabs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Simulated Payment Channel
                  </h4>
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>256-Bit SSL Secured</span>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('UPI')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      activeTab === 'UPI'
                        ? 'border-orange-500 bg-orange-50/70 text-orange-900 ring-2 ring-orange-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-orange-600" />
                    <span>UPI / QR Code</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('CARD')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      activeTab === 'CARD'
                        ? 'border-orange-500 bg-orange-50/70 text-orange-900 ring-2 ring-orange-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-orange-600" />
                    <span>Card (Debit/Credit)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('NETBANKING')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      activeTab === 'NETBANKING'
                        ? 'border-orange-500 bg-orange-50/70 text-orange-900 ring-2 ring-orange-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-orange-600" />
                    <span>Net Banking</span>
                  </button>
                </div>
              </div>

              {/* Channel Detail Preview */}
              {activeTab === 'UPI' && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-24 h-24 bg-white p-2 rounded-xl border border-slate-200 flex flex-col items-center justify-center shrink-0 shadow-xs">
                    <QrCode className="w-16 h-16 text-slate-800" />
                    <span className="text-[9px] font-bold text-slate-400">SCAN TO PAY</span>
                  </div>
                  <div className="space-y-1.5 text-center sm:text-left flex-1">
                    <h5 className="text-xs font-bold text-slate-900">Scan via Google Pay, PhonePe, Paytm, BHIM</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Instant zero-convenience-fee payment using any Indian UPI app.
                    </p>
                    <div className="flex items-center gap-1.5 pt-1 text-xs">
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="font-mono text-xs bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 w-full max-w-[200px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'CARD' && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-700 font-semibold">
                    <span>Simulated Test Card:</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                      Visa / Mastercard / RuPay
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-mono">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="col-span-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800 font-bold"
                      placeholder="Card Number"
                    />
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-1/2 bg-white px-1.5 py-1.5 rounded-lg border border-slate-200 text-center font-bold"
                        placeholder="MM/YY"
                      />
                      <input
                        type="text"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="w-1/2 bg-white px-1.5 py-1.5 rounded-lg border border-slate-200 text-center font-bold"
                        placeholder="CVV"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'NETBANKING' && (
                <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-center text-xs">
                  {['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank'].map((bank, i) => (
                    <div
                      key={i}
                      className="bg-white p-2 rounded-xl border border-slate-200 font-bold text-slate-700 shadow-xs text-[11px]"
                    >
                      {bank}
                    </div>
                  ))}
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="space-y-2.5 pt-2">
                <Button
                  type="button"
                  onClick={handleSimulatePayment}
                  className="w-full h-12 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm shadow-lg shadow-orange-500/25 rounded-xl flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>⚡ Simulate Instant Successful Payment (Test Mode)</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOpenNativeRazorpay}
                    className="flex-1 h-10 text-xs font-bold border-slate-300 hover:bg-slate-100 text-slate-800"
                  >
                    <span>Open Razorpay Checkout</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSimulateFailure}
                    className="h-10 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    <span>Simulate Decline</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-3.5 border-t border-slate-200 text-center text-[11px] text-slate-500 flex items-center justify-center gap-4">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>Official Razorpay API Sandbox</span>
          </span>
          <span>•</span>
          <span>GSTIN Compliant (18% B2B)</span>
        </div>
      </div>
    </div>
  );
}
