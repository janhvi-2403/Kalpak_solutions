'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, RefreshCw, Mail, ArrowRight } from 'lucide-react';
import { apiClient, ApiClientError } from '@/lib/api-client';

function VerifySupportEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setErrorMessage('No verification token provided in URL. Please click the exact link from your verification email.');
      return;
    }

    let isMounted = true;

    async function verify() {
      try {
        const res = await apiClient<{
          success: boolean;
          message: string;
          email?: string;
          tenantName?: string;
        }>('/auth/support-emails/verify', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });

        if (isMounted) {
          setSuccess(true);
          setVerifiedEmail(res.email || null);
          setOrganizationName(res.tenantName || null);
        }
      } catch (err: any) {
        if (isMounted) {
          setSuccess(false);
          const msg =
            err instanceof ApiClientError
              ? err.message
              : err?.message || 'Verification link is invalid or has already expired.';
          setErrorMessage(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-8 text-center relative overflow-hidden">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600" />

        {loading ? (
          <div className="py-10 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center mx-auto text-orange-600">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Verifying Support Email</h2>
              <p className="text-xs text-slate-500 mt-1.5">
                Authenticating single-use cryptographic token in real time...
              </p>
            </div>
          </div>
        ) : success ? (
          <div className="py-6 space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-sm animate-in zoom-in-95 duration-300">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Verified &amp; Activated
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight pt-2">
                Support Email Confirmed!
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {verifiedEmail ? (
                  <>
                    <strong className="text-slate-900 font-mono">{verifiedEmail}</strong> is now verified and active for{' '}
                    <strong>{organizationName || 'your organization'}</strong>.
                  </>
                ) : (
                  'Your support email address has been successfully verified and activated.'
                )}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 text-left space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-semibold">
                <Mail className="w-4 h-4 text-orange-600" />
                <span>Real-Time Inbound Ticket Ingestion Active</span>
              </div>
              <p className="text-slate-500">
                Inquiries and support tickets sent to this address will automatically route into your Kalpak platform dashboard.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/dashboard/settings/email-configuration"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-lg shadow-orange-600/20 transition-all hover:scale-[1.02]"
              >
                <span>Go to Email Configuration</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-600 shadow-sm animate-in zoom-in-95 duration-300">
              <AlertCircle className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                Verification Failed
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight pt-2">
                Unable to Verify Email
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {errorMessage || 'This verification link is invalid, malformed, or has already expired.'}
              </p>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 text-left space-y-1.5">
              <p className="font-bold">Next Steps:</p>
              <ul className="list-disc pl-4 space-y-1 text-amber-800">
                <li>Log in to your Client Admin dashboard.</li>
                <li>Go to <strong>Email Configuration</strong> and click <strong>Verify Now</strong>.</li>
                <li>Enter the 6-digit code or request a fresh verification link.</li>
              </ul>
            </div>

            <div className="pt-2">
              <Link
                href="/dashboard/settings/email-configuration"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all hover:scale-[1.02]"
              >
                <span>Return to Email Configuration</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifySupportEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Loading verification details...</p>
          </div>
        </div>
      }
    >
      <VerifySupportEmailContent />
    </Suspense>
  );
}
