'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { LifeBuoy, Mail, Lock, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface TenantPublicInfo {
  id: string;
  name: string;
  slug: string;
}

export default function PortalLoginPage() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || '';

  const [tenantInfo, setTenantInfo] = useState<TenantPublicInfo | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantSlug) return;
    apiClient<TenantPublicInfo>(`/portal/tenant/${tenantSlug}/info`)
      .then((data) => setTenantInfo(data))
      .catch(() => {
        // If tenant lookup fails, fallback to slug name
        setTenantInfo({ id: '', name: tenantSlug.toUpperCase(), slug: tenantSlug });
      });
  }, [tenantSlug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      await apiClient('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          tenantSlug,
        }),
      });

      // Verify portal access by requesting /portal/me
      try {
        await apiClient('/portal/me');
        router.replace(`/portal/${tenantSlug}/dashboard`);
      } catch (err: any) {
        setErrorMsg('Login succeeded but your account is not provisioned as a portal customer.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid customer credentials or inactive portal account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo Badge */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/25 mb-4">
          <LifeBuoy className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {tenantInfo?.name || 'Kalpak'} Customer Portal
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Sign in to track service calls, raise repair requests, and inspect machine maintenance.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
          {errorMsg && (
            <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Registered Contact Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@company.com"
                  className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl pl-9 pr-4 py-2.5 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Portal Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl pl-9 pr-4 py-2.5 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-blue-600/30 disabled:opacity-50 transition-all focus:outline-none"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Customer Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 flex items-center justify-center gap-2 text-slate-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>End-to-End Encrypted Customer Session</span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Don't have your portal login credentials? Contact your service coordinator to provision portal access.
        </p>
      </div>
    </div>
  );
}
