'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { Button, Input, Alert } from '@/components/ui';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { KalpakLogo } from '@/components/KalpakLogo';

export default function MfaChallengePage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await apiClient('/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim() }),
      });

      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.errorResponse.message || 'Invalid verification code. Please check your authenticator app.');
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    } finally {
      router.push('/login');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50 selection:bg-orange-500 selection:text-white">
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl border border-slate-200/80 shadow-xl shadow-orange-500/5">
        <div className="mb-6">
          <div className="mb-6">
            <KalpakLogo size="sm" href="/" />
          </div>

          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 border border-orange-500/20 flex items-center justify-center mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Two-Factor Authentication</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isBackupCode
              ? 'Enter one of your emergency recovery backup codes.'
              : 'Enter the 6-digit verification code from your authenticator app.'}
          </p>
        </div>

        {error && (
          <div className="mb-6">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              id="mfa-code"
              type="text"
              label={isBackupCode ? 'Emergency Recovery Code' : '6-Digit TOTP Code'}
              required
              autoFocus
              maxLength={isBackupCode ? 9 : 6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s+/g, ''))}
              placeholder={isBackupCode ? 'XXXX-XXXX' : '123456'}
              className="text-center tracking-widest text-2xl font-mono font-bold"
            />
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full h-11 text-sm font-extrabold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-700 shadow-lg shadow-orange-500/25 mt-2"
          >
            <span>Verify & Access Workspace</span>
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>

          <div className="flex items-center justify-between pt-3 text-xs">
            <button
              type="button"
              onClick={() => {
                setIsBackupCode(!isBackupCode);
                setCode('');
                setError(null);
              }}
              className="text-orange-600 hover:text-orange-700 font-bold transition-colors"
            >
              {isBackupCode ? 'Use 6-digit TOTP code' : 'Use emergency backup code'}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancel & Sign Out
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
