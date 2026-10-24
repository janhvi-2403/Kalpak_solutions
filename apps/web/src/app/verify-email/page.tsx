'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiClient, ApiClientError, setAuthToken } from '@/lib/api-client';
import { Button, Alert, Input } from '@/components/ui';
import {
  Mail,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  KeyRound,
} from 'lucide-react';
import { KalpakLogo } from '@/components/KalpakLogo';

interface MfaSetupData {
  secret: string;
  otpauthUri: string;
  qrCode: string;
  backupCodes: string[];
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const initialEmail = searchParams.get('email') || '';
  const plan = searchParams.get('plan') || '';
  const returnUrl = searchParams.get('returnUrl') || '/plans';
  const checkoutUrl = `/login?returnUrl=${encodeURIComponent(returnUrl)}${plan ? `&plan=${encodeURIComponent(plan)}` : ''}`;

  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2FA Setup State
  const [mfaSetup, setMfaSetup] = useState<MfaSetupData | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [isEnablingMfa, setIsEnablingMfa] = useState(false);
  const [mfaEnabledSuccess, setMfaEnabledSuccess] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [showManualKey, setShowManualKey] = useState(false);

  // Resend state
  const [resendEmail, setResendEmail] = useState(initialEmail);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      setIsVerifying(true);
      setError(null);
      apiClient<{
        message: string;
        token?: string;
        user?: any;
        mfaSetup?: MfaSetupData;
        alreadyConfigured?: boolean;
      }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      })
        .then((res) => {
          if (res.token) {
            setAuthToken(res.token);
          }
          if (res.mfaSetup) {
            setMfaSetup(res.mfaSetup);
          }
          setIsVerified(true);
        })
        .catch((err) => {
          if (err instanceof ApiClientError) {
            setError(err.errorResponse.message || 'Verification link is invalid or has expired.');
          } else {
            setError('Unable to communicate with verification service.');
          }
        })
        .finally(() => {
          setIsVerifying(false);
        });
    }
  }, [token]);

  const handleEnableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode.trim() || totpCode.trim().length < 6) {
      setMfaError('Please enter a valid 6-digit verification code from your authenticator app.');
      return;
    }

    setIsEnablingMfa(true);
    setMfaError(null);

    try {
      await apiClient('/auth/mfa/enable', {
        method: 'POST',
        body: JSON.stringify({ code: totpCode.trim() }),
      });
      setMfaEnabledSuccess(true);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setMfaError(err.errorResponse?.message || 'Invalid code. Please ensure your device clock is synchronized and try again.');
      } else {
        setMfaError('Failed to activate 2FA. Please verify your connection and try again.');
      }
    } finally {
      setIsEnablingMfa(false);
    }
  };

  const copyToClipboard = (text: string, type: 'secret' | 'codes') => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === 'secret') {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2500);
      } else {
        setCopiedCodes(true);
        setTimeout(() => setCopiedCodes(false), 2500);
      }
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;

    setIsResending(true);
    setResendMessage(null);
    setError(null);

    try {
      const res = await apiClient<{ message: string; verificationUrl?: string; emailDelivered?: boolean }>(
        '/auth/resend-verification',
        {
          method: 'POST',
          body: JSON.stringify({ email: resendEmail.trim().toLowerCase() }),
        }
      );
      setResendMessage(res.message || 'If an unverified account exists, a new verification link has been dispatched.');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.errorResponse.message || 'Failed to resend email');
      } else {
        setError('Network error while requesting verification email.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-white p-6 sm:p-10 rounded-2xl border border-slate-200/80 shadow-xl shadow-orange-500/5 text-center">
      <div className="mb-6">
        <KalpakLogo size="sm" href="/" />
      </div>

      {/* State 1: Verifying Token via URL */}
      {token && isVerifying && (
        <div className="py-8">
          <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-4 animate-spin">
            <RefreshCw className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Validating Verification Link...</h2>
          <p className="text-sm text-slate-500 mt-2">Connecting to Kalpak authentication service.</p>
        </div>
      )}

      {/* State 2: Verification Succeeded -> 2FA Flow */}
      {isVerified && !isVerifying && (
        <div className="text-left">
          {/* Sub-State 2A: 2FA Activation Succeeded */}
          {mfaEnabledSuccess ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
              </div>

              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Two-Factor Authentication Active</h2>
              <p className="text-sm text-slate-600 mt-2 mb-6 leading-relaxed">
                Your email is verified and Google Authenticator is now successfully linked. At every sign-in, you will be prompted for your 6-digit authenticator code.
              </p>

              {mfaSetup?.backupCodes && mfaSetup.backupCodes.length > 0 && (
                <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-orange-600" />
                      Emergency Backup Codes
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(mfaSetup.backupCodes.join('\n'), 'codes')}
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                    >
                      {copiedCodes ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Codes</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs text-slate-800 bg-white p-3 rounded-lg border border-slate-200">
                    {mfaSetup.backupCodes.map((code, idx) => (
                      <span key={idx} className="tracking-wider">{code}</span>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Save these backup recovery codes in a safe password manager. If you lose access to your phone, they can be used to log in.
                  </p>
                </div>
              )}

              <Link href={checkoutUrl} className="block">
                <Button className="w-full h-11 text-sm font-extrabold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 shadow-lg shadow-orange-500/25">
                  <span>Sign In & Enter Workspace</span>
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          ) : mfaSetup ? (
            /* Sub-State 2B: Configure Google Authenticator 2FA */
            <div>
              <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold w-fit">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Email Verified Successfully</span>
              </div>

              <h2 className="text-xl font-black text-slate-900 tracking-tight">Set Up Two-Factor Authentication</h2>
              <p className="text-xs text-slate-600 mt-1 mb-4 leading-relaxed">
                Secure your workspace by linking Google Authenticator (or any TOTP app). You will need this code each time you sign in.
              </p>

              {mfaError && (
                <div className="mb-4">
                  <Alert variant="error" title="Activation Error">
                    {mfaError}
                  </Alert>
                </div>
              )}

              {/* Step A: Scan QR Code */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-center mb-4">
                <div className="bg-white p-3 rounded-xl border border-slate-200 inline-block shadow-sm mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mfaSetup.qrCode}
                    alt="Google Authenticator QR Code"
                    className="w-44 h-44 mx-auto"
                  />
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  Scan this QR code using <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, or <strong>Authy</strong>.
                </p>

                <div className="mt-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowManualKey(!showManualKey)}
                    className="text-xs text-orange-600 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>{showManualKey ? 'Hide Secret Key' : 'Can&apos;t scan? View Secret Key'}</span>
                  </button>

                  {showManualKey && (
                    <div className="mt-2.5 p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-left">
                      <div className="overflow-hidden mr-2">
                        <span className="text-[10px] text-slate-400 block uppercase font-mono">Secret Key</span>
                        <code className="text-xs font-mono font-bold text-slate-900 break-all">{mfaSetup.secret}</code>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(mfaSetup.secret, 'secret')}
                        className="px-2.5 py-1.5 rounded-md text-xs font-bold bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 border border-slate-200 shrink-0 transition-colors inline-flex items-center gap-1"
                      >
                        {copiedSecret ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedSecret ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Step B: Verify 6-digit code */}
              <form onSubmit={handleEnableMfa} className="space-y-4">
                <div>
                  <Input
                    id="verify-totp-code"
                    type="text"
                    label="Enter 6-Digit Authenticator Code"
                    required
                    autoFocus
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\s+/g, ''))}
                    placeholder="123456"
                    className="text-center tracking-widest text-2xl font-mono font-bold"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enter the dynamic 6-digit code currently shown in your Google Authenticator app.
                  </p>
                </div>

                <Button
                  type="submit"
                  isLoading={isEnablingMfa}
                  className="w-full h-11 text-sm font-extrabold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 shadow-lg shadow-orange-500/25"
                >
                  <ShieldCheck className="mr-2 w-4 h-4" />
                  <span>Verify & Activate 2FA</span>
                </Button>
              </form>
            </div>
          ) : (
            /* Sub-State 2C: Already Configured fallback */
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Email Verified Successfully</h2>
              <p className="text-sm text-slate-600 mt-2 mb-6 leading-relaxed">
                Your official email address is verified. You can now sign in to your workspace.
              </p>

              <Link href={checkoutUrl} className="block">
                <Button className="w-full h-11 text-sm font-extrabold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 shadow-lg shadow-orange-500/25">
                  <span>Sign In Directly</span>
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* State 3: Error or Verification Link Pending Request */}
      {!isVerified && !isVerifying && (
        <div>
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-600 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7" />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Verify Your Email Address</h2>
          <p className="text-sm text-slate-600 mt-2 mb-6 leading-relaxed">
            {initialEmail ? (
              <>
                We have dispatched a secure verification link to{' '}
                <strong className="text-slate-900">{initialEmail}</strong>.
              </>
            ) : (
              'Please check your email inbox for the secure verification link sent by Kalpak Solutions.'
            )}
          </p>

          {error && (
            <div className="mb-6 text-left">
              <Alert variant="error" title="Verification Issue">
                {error}
              </Alert>
            </div>
          )}

          {resendMessage && (
            <div className="mb-6 text-left">
              <Alert variant="success">{resendMessage}</Alert>
            </div>
          )}

          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/80 text-left mb-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Didn&apos;t receive the email?
            </h4>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Check your spam or junk folder, or request a fresh verification link below:
            </p>

            <form onSubmit={handleResend} className="space-y-3">
              <Input
                id="resend-email"
                type="email"
                required
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="alice@company.com"
              />
              <Button
                type="submit"
                variant="outline"
                isLoading={isResending}
                className="w-full text-xs h-9 font-bold border-slate-300 hover:border-orange-500 hover:text-orange-600"
              >
                Resend Verification Email
              </Button>
            </form>
          </div>

          <div className="pt-2 text-center text-xs text-slate-500">
            Already verified?{' '}
            <Link href="/login" className="text-orange-600 font-bold hover:underline">
              Return to Login
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50 selection:bg-orange-500 selection:text-white">
      <Suspense fallback={<div className="text-sm text-slate-500">Loading verification details...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </main>
  );
}
