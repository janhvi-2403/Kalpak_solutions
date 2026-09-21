'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { Button, Alert, Input } from '@/components/ui';
import { Mail, CheckCircle2, RefreshCw, ArrowRight } from 'lucide-react';
import { KalpakLogo } from '@/components/KalpakLogo';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const initialEmail = searchParams.get('email') || '';

  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resend state
  const [resendEmail, setResendEmail] = useState(initialEmail);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      setIsVerifying(true);
      setError(null);
      apiClient<{ message: string }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      })
        .then(() => {
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

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;

    setIsResending(true);
    setResendMessage(null);
    setError(null);

    try {
      const res = await apiClient<{ message: string }>('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: resendEmail.trim().toLowerCase() }),
      });
      setResendMessage(res.message || 'If an unverified account exists, a new link has been dispatched.');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.errorResponse.message || 'Failed to resend email');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl border border-slate-200/80 shadow-xl shadow-orange-500/5 text-center">
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

      {/* State 2: Verification Succeeded */}
      {isVerified && (
        <div className="py-6">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Email Verified Successfully</h2>
          <p className="text-sm text-slate-600 mt-2 mb-8 leading-relaxed">
            Your official email address has been verified. Your administrator account is now active.
          </p>

          <Link href="/login" className="block">
            <Button className="w-full h-11 text-sm font-extrabold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 shadow-lg shadow-orange-500/25">
              <span>Sign In to Dashboard</span>
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      )}

      {/* State 3: Error or Verification Pending */}
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
              <Alert variant="error" title="Verification Link Issue">
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
              Check your spam folder or request a new verification link below.
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
                Resend Verification Link
              </Button>
            </form>
          </div>

          <div className="pt-2 text-center text-xs text-slate-500">
            Ready to sign in?{' '}
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
