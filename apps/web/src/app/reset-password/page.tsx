'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { Button, PasswordInput, Alert } from '@/components/ui';
import { Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import { KalpakLogo } from '@/components/KalpakLogo';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Password reset token is missing or malformed from the link.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await apiClient('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token,
          password,
        }),
      });

      setIsSuccess(true);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.errorResponse.message || 'Failed to reset password. The link may have expired.');
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl border border-slate-200/80 shadow-xl shadow-orange-500/5">
      <div className="mb-6">
        <div className="mb-6">
          <KalpakLogo size="sm" href="/" />
        </div>

        <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-600 border border-orange-500/20 flex items-center justify-center mb-4">
          <Lock className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Set New Password</h1>
        <p className="text-sm text-slate-500 mt-1">
          Create a new strong password for your account.
        </p>
      </div>

      {error && (
        <div className="mb-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {isSuccess ? (
        <div className="py-4 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900">Password Reset Complete</h3>
          <p className="text-sm text-slate-600 mt-2 mb-6 leading-relaxed">
            All prior sessions have been revoked for your security. You can now sign in with your new password.
          </p>
          <Link href="/login">
            <Button className="w-full h-11 text-sm font-extrabold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 shadow-lg shadow-orange-500/25">
              <span>Sign In to Dashboard</span>
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            id="new-password"
            label="New Password"
            required
            showStrength={true}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            helperText="Hashed with Argon2id (min 8 chars, uppercase, lowercase, number, special)"
          />

          <PasswordInput
            id="confirm-new-password"
            label="Confirm New Password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />

          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full h-11 text-sm font-extrabold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-700 shadow-lg shadow-orange-500/25 mt-2"
          >
            <span>Reset Password & Invalidate Old Sessions</span>
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>

          <div className="pt-2 text-center text-xs text-slate-500">
            Remembered your password?{' '}
            <Link href="/login" className="text-orange-600 font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50 selection:bg-orange-500 selection:text-white">
      <Suspense fallback={<div className="text-sm text-slate-500">Loading reset form...</div>}>
        <ResetPasswordContent />
      </Suspense>
    </main>
  );
}
