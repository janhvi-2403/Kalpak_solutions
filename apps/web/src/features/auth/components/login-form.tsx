'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
import { Building2, ArrowRight, KeyRound, ArrowLeft } from 'lucide-react';
import { AuthLoginResponse, TenantMembershipInfo } from '@kalpak/types';

import { useAuth } from '@/lib/auth-context';
import { KalpakLogo } from '@/components/KalpakLogo';

export function LoginForm() {
  const { refetchSession, subdomainSlug, subdomainTenant } = useAuth();
  const searchParams = useSearchParams();

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState(subdomainSlug || '');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sync subdomain slug if loaded asynchronously
  React.useEffect(() => {
    if (subdomainSlug && !tenantSlug) {
      setTenantSlug(subdomainSlug);
    }
  }, [subdomainSlug, tenantSlug]);


  // Inline MFA Challenge state
  const [isMfaStep, setIsMfaStep] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [cachedUser, setCachedUser] = useState<AuthLoginResponse['user'] | null>(null);

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

      setCachedUser(response.user);

      // Handle MFA Challenge
      if (response.mfaRequired) {
        setIsMfaStep(true);
        setTotpCode('');
        setIsLoading(false);
        return;
      }

      // Handle Multi-Tenant selection when user has multiple organizations and no slug was specified
      if (response.tenantSelectionRequired && response.memberships && response.memberships.length > 1) {
        setAvailableMemberships(response.memberships);
        setShowOrgPicker(true);
        return;
      }

      // Refresh session state and route according to role
      const freshSession = await refetchSession();
      const userRole = freshSession?.activeRole;
      if (response.user?.isSuperAdmin) {
        window.location.href = '/super-admin/dashboard';
      } else {
        let defaultDest = '/dashboard';
        if (userRole === 'DEPARTMENT_ADMIN') defaultDest = '/dashboard/department';
        if (userRole === 'SUPPORT_EMPLOYEE') defaultDest = '/dashboard/employee';
        const dest =
          searchParams?.get('returnUrl') ||
          (searchParams?.get('plan') === 'starter' ? '/checkout/starter' : defaultDest);
        window.location.href = dest;
      }
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

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await apiClient('/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ code: totpCode.trim() }),
      });

      const freshSession = await refetchSession();
      const userRole = freshSession?.activeRole;

      if (cachedUser?.isSuperAdmin) {
        window.location.href = '/super-admin/dashboard';
      } else {
        let defaultDest = '/dashboard';
        if (userRole === 'DEPARTMENT_ADMIN') defaultDest = '/dashboard/department';
        if (userRole === 'SUPPORT_EMPLOYEE') defaultDest = '/dashboard/employee';
        const dest =
          searchParams?.get('returnUrl') ||
          (searchParams?.get('plan') === 'starter' ? '/checkout/starter' : defaultDest);
        window.location.href = dest;
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.errorResponse.message || 'Invalid verification code or backup code');
      } else {
        setError('Failed to verify code. Please check your network connection.');
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
      <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200/80 shadow-xl shadow-orange-500/5">
        <div className="mb-8">
          <div className="mb-4">
            <KalpakLogo />
          </div>

          {!isMfaStep ? (
            <>
              {subdomainSlug ? (
                <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-800 border border-orange-200 text-xs font-bold tracking-wide">
                  <Building2 className="w-3.5 h-3.5 text-orange-600" />
                  <span>Signing in to {subdomainTenant?.name || subdomainSlug}</span>
                </div>
              ) : null}
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {subdomainTenant ? `${subdomainTenant.name} Portal` : 'Sign In to Platform'}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {subdomainTenant
                  ? 'Enter your credentials to access your organization workspace.'
                  : 'Enter your credentials to access your service management workspace.'}
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 border border-orange-500/20 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Two-Factor Authentication</h1>
              </div>
              <p className="text-sm text-slate-500">
                {isBackupCode
                  ? 'Enter one of your emergency single-use backup codes.'
                  : 'Enter the 6-digit verification code from your authenticator app.'}
              </p>
            </>
          )}
        </div>

        {error && (
          <div className="mb-6">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {!isMfaStep ? (
          /* Step 1: Standard / Super Admin Login Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="login-email"
              type="email"
              label="Work or Official Email"
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
              placeholder="••••••••••••"
            />

            {!subdomainSlug ? (
              <div className="pt-1">
                <Input
                  id="login-tenant"
                  type="text"
                  label="Organization Slug (Optional)"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  placeholder="e.g. acme-corp"
                  helperText="Leave empty for Super Admin or default workspace"
                />
              </div>
            ) : null}


            <div className="flex items-center justify-between pt-1 text-sm">
              <Checkbox
                id="remember-session"
                label="Remember session"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <Link
                href="/forgot-password"
                className="font-semibold text-orange-600 hover:text-orange-700 transition-colors text-xs"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full mt-4 h-11 text-sm font-extrabold shadow-lg shadow-orange-500/20"
            >
              <span>Sign In to Workspace</span>
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </form>
        ) : (
          /* Step 2: Inline MFA Verification Challenge */
          <form onSubmit={handleMfaSubmit} className="space-y-4">
            <div>
              <Input
                id="login-mfa-code"
                type="text"
                label={isBackupCode ? 'Emergency Recovery Code' : '6-Digit TOTP Code'}
                required
                autoFocus
                maxLength={isBackupCode ? 9 : 6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\s+/g, ''))}
                placeholder={isBackupCode ? 'XXXX-XXXX' : '123456'}
                className="text-center tracking-widest text-2xl font-mono font-bold"
              />
            </div>

            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full h-11 text-sm font-extrabold shadow-lg shadow-orange-500/20 mt-2"
            >
              <span>Verify & Continue</span>
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
                className="text-orange-600 hover:text-orange-700 font-bold transition-colors"
              >
                {isBackupCode ? 'Use 6-digit TOTP code' : 'Use emergency backup code'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMfaStep(false);
                  setTotpCode('');
                  setError(null);
                }}
                className="text-slate-500 hover:text-slate-700 font-medium inline-flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-sm text-slate-600">
          Need a new organization account?{' '}
          <Link href="/signup" className="font-bold text-orange-600 hover:text-orange-700 transition-colors">
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
              className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/30 transition-all text-left group disabled:opacity-50"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 group-hover:bg-orange-100 text-slate-700 group-hover:text-orange-700 flex items-center justify-center transition-colors">
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
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600 transition-colors" />
            </button>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
