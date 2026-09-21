'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { Button, Input, Alert } from '@/components/ui';
import { KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await apiClient('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setIsSubmitted(true);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.errorResponse.message || 'Unable to submit request');
      } else {
        setError('Network error. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-100">
        <div className="mb-6">
          <Link
            href="/login"
            className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Sign In
          </Link>

          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mb-4">
            <KeyRound className="w-5 h-5" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Forgot Password</h1>
          <p className="text-sm text-slate-500 mt-1">
            Enter your work email address and we will dispatch a secure reset link.
          </p>
        </div>

        {error && (
          <div className="mb-6">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {isSubmitted ? (
          <div className="py-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Check Your Inbox</h3>
            <p className="text-sm text-slate-600 mt-2 mb-6 leading-relaxed">
              If an active account is registered with <strong className="text-slate-900">{email}</strong>, a
              password reset email has been dispatched with an expiring secure token.
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full h-10 text-sm">
                Return to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="reset-email"
              type="email"
              label="Work Email Address"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alice@company.com"
            />

            <Button type="submit" isLoading={isLoading} className="w-full h-11 text-sm shadow-md mt-2">
              Send Password Reset Link
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
