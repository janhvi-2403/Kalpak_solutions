'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { Button, PasswordInput, Alert } from '@/components/ui';
import { Lock, CheckCircle2, ArrowRight } from 'lucide-react';

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
    <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-100">
      <div className="mb-6">
        <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mb-4">
          <Lock className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Set New Password</h1>
        <p className="text-sm text-slate-500 mt-1">
          Create a new strong password for your administrator account.
        </p>
      </div>

      {error && (
        <div className="mb-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {isSuccess ? (
        <div className="py-4 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Password Reset Complete</h3>
          <p className="text-sm text-slate-600 mt-2 mb-6 leading-relaxed">
            All prior sessions have been revoked for your security. You can now sign in with your new
            password.
          </p>
          <Link href="/login">
            <Button className="w-full h-11 text-sm shadow-md">
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
          />

          <PasswordInput
            id="confirm-new-password"
            label="Confirm New Password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />

          <Button type="submit" isLoading={isLoading} className="w-full h-11 text-sm shadow-md mt-2">
            Reset Password & Invalidate Old Sessions
          </Button>

          <div className="pt-2 text-center text-xs text-slate-500">
            Remembered your password?{' '}
            <Link href="/login" className="text-sky-600 font-semibold hover:underline">
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
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <Suspense fallback={<div className="text-sm text-slate-500">Loading reset form...</div>}>
        <ResetPasswordContent />
      </Suspense>
    </main>
  );
}
