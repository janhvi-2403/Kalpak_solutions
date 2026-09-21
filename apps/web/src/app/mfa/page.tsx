'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { Button, Input, Alert } from '@/components/ui';
import { ShieldAlert, ArrowRight } from 'lucide-react';

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
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-100">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Two-Factor Challenge</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isBackupCode
              ? 'Enter one of your 8-character emergency backup codes.'
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
              label={isBackupCode ? 'Emergency Backup Code' : '6-Digit TOTP Code'}
              required
              autoFocus
              maxLength={isBackupCode ? 9 : 6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s+/g, ''))}
              placeholder={isBackupCode ? 'XXXX-XXXX' : '123456'}
              className="text-center tracking-widest text-lg font-mono font-bold"
            />
          </div>

          <Button type="submit" isLoading={isLoading} className="w-full h-11 text-sm shadow-md mt-2">
            <span>Verify & Enter Workspace</span>
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
              className="text-sky-600 hover:text-sky-700 font-medium"
            >
              {isBackupCode ? 'Use 6-digit TOTP code' : 'Use emergency backup code'}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="text-slate-400 hover:text-slate-600"
            >
              Cancel & Sign Out
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
