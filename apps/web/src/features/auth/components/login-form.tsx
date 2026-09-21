'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient, ApiClientError } from '@/lib/api-client';
import {
  Button,
  Input,
  PasswordInput,
  Checkbox,
  Alert,
  Dialog,
  Badge,
} from '@/components/ui';
import { Building2, ArrowRight } from 'lucide-react';
import { AuthLoginResponse, TenantMembershipInfo } from '@kalpak/types';

import { useAuth } from '@/lib/auth-context';
import { KalpakLogo } from '@/components/KalpakLogo';

export function LoginForm() {
  const router = useRouter();
  const { refetchSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Multi-tenant organization selection state
  const [showOrgPicker, setShowOrgPicker] = useState(false);
  const [availableMemberships, setAvailableMemberships] = useState<TenantMembershipInfo[]>([]);
  const [isSwitchingOrg, setIsSwitchingOrg] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiClient<AuthLoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          tenantSlug: tenantSlug.trim() || undefined,
        }),
      });

      // Handle MFA Challenge
      if (response.mfaRequired) {
        router.push('/mfa');
        return;
      }

      // Handle Multi-Tenant selection when user has multiple organizations and no slug was specified
      if (response.tenantSelectionRequired && response.memberships && response.memberships.length > 1) {
        setAvailableMemberships(response.memberships);
        setShowOrgPicker(true);
        return;
      }

      // Refresh session state and navigate to Dashboard
      await refetchSession();
      window.location.href = '/dashboard';
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.errorResponse.message || 'Invalid email or password. Please try again.');
      } else {
        setError('Unable to communicate with the authentication service. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOrganization = async (tenantId: string) => {
    setIsSwitchingOrg(true);
    setError(null);
    try {
      await apiClient('/tenants/switch', {
        method: 'POST',
        body: JSON.stringify({ tenantId }),
      });
      setShowOrgPicker(false);
      await refetchSession();
      window.location.href = '/dashboard';
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.errorResponse.message || 'Failed to select organization');
      }
    } finally {
      setIsSwitchingOrg(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-100">
        <div className="mb-8">
          <div className="mb-3">
            <KalpakLogo />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign In to Platform</h2>
          <p className="text-sm text-slate-500 mt-1">
            Enter your credentials to access your service management portal.
          </p>
        </div>

        {error && (
          <div className="mb-6">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="login-email"
            type="email"
            label="Work Email Address"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alice@company.com"
          />

          <PasswordInput
            id="login-password"
            label="Password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <div className="pt-1">
            <Input
              id="login-tenant"
              type="text"
              label="Organization Slug (Optional)"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              placeholder="e.g. acme-corp"
              helperText="Specify if your account belongs to multiple client organizations"
            />
          </div>

          <div className="flex items-center justify-between pt-1 text-sm">
            <Checkbox
              id="remember-session"
              label="Remember session"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <Link
              href="/forgot-password"
              className="font-medium text-sky-600 hover:text-sky-700 transition-colors text-xs"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" isLoading={isLoading} className="w-full mt-4 h-11 text-sm">
            Sign In to Workspace
          </Button>

          {/* Quick-fill Demo Accounts Helper */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Demo Credentials:
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('clientadmin@acme.com');
                  setPassword('AcmeAdmin123!');
                  setTenantSlug('acme-corp');
                }}
                className="text-left p-2 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-300 transition-colors"
              >
                <div className="font-semibold text-slate-800 text-xs">Client Admin</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">clientadmin@acme.com</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('admin@kalpak.com');
                  setPassword('KalpakAdmin123!');
                  setTenantSlug('');
                }}
                className="text-left p-2 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-300 transition-colors"
              >
                <div className="font-semibold text-slate-800 text-xs">Super Admin</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">admin@kalpak.com</div>
              </button>
            </div>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-sm text-slate-600">
          Need a new organization account?{' '}
          <Link href="/signup" className="font-semibold text-sky-600 hover:text-sky-700 transition-colors">
            Register Organization
          </Link>
        </div>
      </div>

      {/* Multi-Tenant Organization Selector Modal */}
      <Dialog
        isOpen={showOrgPicker}
        onClose={() => setShowOrgPicker(false)}
        title="Select Organization"
        description="Your account has access to multiple client organizations. Choose which workspace you want to enter:"
      >
        <div className="space-y-2 mt-4">
          {availableMemberships.map((membership) => (
            <button
              key={membership.tenantId}
              type="button"
              disabled={isSwitchingOrg}
              onClick={() => handleSelectOrganization(membership.tenantId)}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-sky-500 hover:bg-sky-50/50 transition-all text-left group disabled:opacity-50"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 group-hover:bg-sky-100 text-slate-700 group-hover:text-sky-700 flex items-center justify-center transition-colors">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">{membership.tenantName}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 font-mono">@{membership.tenantSlug}</span>
                    <Badge variant="primary" className="text-[10px] py-0 px-1.5">
                      {membership.role}
                    </Badge>
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors" />
            </button>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
