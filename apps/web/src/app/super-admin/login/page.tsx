'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Lock,
  KeyRound,
} from 'lucide-react';
import { KalpakLogo } from '@/components/KalpakLogo';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { Button, Input, PasswordInput, Alert } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import { AuthLoginResponse } from '@kalpak/types';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const { refetchSession } = useAuth();

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // MFA Challenge State
  const [mfaChallenge, setMfaChallenge] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiClient<AuthLoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      if (response.mfaRequired) {
        setMfaChallenge(true);
        return;
      }

      await refetchSession();
      router.push('/super-admin/dashboard');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.errorResponse.message || 'Invalid administrator credentials');
      } else {
        setError('Unable to authenticate with server. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await apiClient('/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ code: totpCode.trim() }),
      });

      await refetchSession();
      router.push('/super-admin/dashboard');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.errorResponse.message || 'Invalid verification code');
      } else {
        setError('Failed to verify MFA code.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-950 text-slate-100">
      {/* Left Column: Enterprise Security & Brand Context */}
      <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-b from-slate-900 via-slate-950 to-black p-12 flex-col justify-between relative overflow-hidden border-r border-slate-800">
        <div className="relative z-10">
          <div className="mb-10">
            <KalpakLogo size="lg" variant="dark" href="/" />
          </div>

          <div className="space-y-4 max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Super Administrator Portal</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight leading-tight text-white">
              Platform Master Control & Security Operations
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Authenticate with your verified Super Admin credentials and hardware-grade TOTP authenticator to
              manage SaaS tenants, enforce security baselines, and monitor platform audit logs.
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-4 pt-8 border-t border-slate-800/80">
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <ShieldCheck className="w-5 h-5 text-orange-400 shrink-0" />
            <span>Argon2id Cryptographic Password Verification</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <KeyRound className="w-5 h-5 text-amber-400 shrink-0" />
            <span>Mandatory RFC 6238 TOTP Multi-Factor Authentication</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Stateful HttpOnly Session Cookie Protection</span>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Kalpak Solutions Inc. All rights reserved.
        </div>
      </div>

      {/* Right Column: Login / MFA Form Card */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md">
          <div className="bg-slate-900 border border-slate-800 p-8 sm:p-10 rounded-2xl shadow-2xl">
            {/* Logo visible on mobile */}
            <div className="lg:hidden mb-6">
              <KalpakLogo size="md" variant="dark" href="/" />
            </div>

            {!mfaChallenge ? (
              // Step 1: Email & Password Form
              <div>
                <div className="mb-8">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-500/10 text-orange-400 text-xs font-bold uppercase tracking-wider mb-2">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Super Admin Access</span>
                  </div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Sign In to Master Portal</h1>
                  <p className="text-sm text-slate-400 mt-1">
                    Enter your official Super Admin email and master password.
                  </p>
                </div>

                {error && (
                  <div className="mb-6">
                    <Alert variant="error">{error}</Alert>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <Input
                    id="admin-login-email"
                    type="email"
                    label="Super Admin Email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@kalpaksolutions.com"
                    className="bg-slate-950 border-slate-700 text-white placeholder-slate-500"
                  />

                  <PasswordInput
                    id="admin-login-password"
                    label="Password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="bg-slate-950 border-slate-700 text-white placeholder-slate-500"
                  />

                  <div className="flex items-center justify-end text-xs">
                    <Link
                      href="/forgot-password"
                      className="text-orange-400 hover:text-orange-300 font-semibold transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    isLoading={isLoading}
                    className="w-full h-11 text-sm font-extrabold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-700 shadow-lg shadow-orange-500/25 mt-2"
                  >
                    <span>Authenticate Credentials</span>
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-400">
                  <span>First time setting up this installation? </span>
                  <Link
                    href="/super-admin/bootstrap"
                    className="text-orange-400 hover:text-orange-300 font-bold transition-colors"
                  >
                    Initialize Super Admin Bootstrap &rarr;
                  </Link>
                </div>
              </div>
            ) : (
              // Step 2: MFA Challenge Form
              <div>
                <div className="mb-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center mx-auto mb-3 border border-orange-500/30">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Two-Factor Authentication</h1>
                  <p className="text-sm text-slate-400 mt-1">
                    {isBackupCode
                      ? 'Enter one of your emergency recovery backup codes.'
                      : 'Enter the 6-digit code from your authenticator app.'}
                  </p>
                </div>

                {error && (
                  <div className="mb-6">
                    <Alert variant="error">{error}</Alert>
                  </div>
                )}

                <form onSubmit={handleMfaSubmit} className="space-y-4">
                  <Input
                    id="admin-mfa-code"
                    type="text"
                    label={isBackupCode ? 'Emergency Recovery Code' : '6-Digit TOTP Code'}
                    required
                    autoFocus
                    maxLength={isBackupCode ? 9 : 6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\s+/g, ''))}
                    placeholder={isBackupCode ? 'XXXX-XXXX' : '123456'}
                    className="text-center tracking-widest text-xl font-mono font-bold bg-slate-950 border-slate-700 text-white placeholder-slate-600"
                  />

                  <Button
                    type="submit"
                    isLoading={isLoading}
                    className="w-full h-11 text-sm font-extrabold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 shadow-lg shadow-orange-500/25 mt-2"
                  >
                    <span>Verify & Access Dashboard</span>
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>

                  <div className="flex items-center justify-between pt-3 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setIsBackupCode(!isBackupCode);
                        setTotpCode('');
                        setError(null);
                      }}
                      className="text-orange-400 hover:text-orange-300 font-semibold"
                    >
                      {isBackupCode ? 'Use Authenticator App (TOTP)' : 'Use Emergency Backup Code'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMfaChallenge(false);
                        setPassword('');
                        setError(null);
                      }}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
