'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { Button, Input, Alert } from '@/components/ui';
import { KeyRound, ArrowLeft, CheckCircle2, ArrowRight } from 'lucide-react';
import { KalpakLogo } from '@/components/KalpakLogo';

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
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50 selection:bg-orange-500 selection:text-white">
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl border border-slate-200/80 shadow-xl shadow-orange-500/5">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <KalpakLogo size="sm" href="/" />
            <Link
              href="/login"
              className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-orange-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Sign In
            </Link>
          </div>

          <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-600 border border-orange-500/20 flex items-center justify-center mb-4">
            <KeyRound className="w-5 h-5" />
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Forgot Password</h1>
          <p className="text-sm text-slate-500 mt-1">
            Enter your official email address and we will dispatch a secure reset link.
          </p>
        </div>

        {error && (
          <div className="mb-6">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {isSubmitted ? (
          <div className="py-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">Check Your Inbox</h3>
            <p className="text-sm text-slate-600 mt-2 mb-6 leading-relaxed">
              If an active account is registered with <strong className="text-slate-900">{email}</strong>, a
              password reset email has been dispatched with an expiring secure token.
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full h-11 text-sm font-bold border-slate-300 hover:border-orange-500 hover:text-orange-600">
                <span>Return to Sign In</span>
                <ArrowRight className="ml-1.5 w-4 h-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="reset-email"
              type="email"
              label="Official Email Address"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@kalpaksolutions.com"
            />

            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full h-11 text-sm font-extrabold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-700 shadow-lg shadow-orange-500/25 mt-2"
            >
              <span>Send Password Reset Link</span>
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
