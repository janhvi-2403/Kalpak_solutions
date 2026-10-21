'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiClient, ApiClientError, setAuthToken } from '@/lib/api-client';
import {
  Button,
  Input,
  PasswordInput,
  Checkbox,
  Alert,
  Dialog,
  Badge,
} from '@/components/ui';
import {
  Building2,
  ArrowRight,
  KeyRound,
  ArrowLeft,
  Mail,
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { AuthLoginResponse, TenantMembershipInfo } from '@kalpak/types';

import { useAuth } from '@/lib/auth-context';
import { KalpakLogo } from '@/components/KalpakLogo';
import {
  buildTenantSubdomainUrl,
  sanitizeReturnUrl,
  getDefaultDashboardForRole,
} from '@/lib/subdomain';

export interface TestingAccount {
  id: string;
  roleTitle: string;
  badge: string;
  email: string;
  password: string;
  tenantSlug: string;
  targetUrl: string;
  features: string;
}

export const TESTING_ACCOUNTS: TestingAccount[] = [
  {
    id: 'super-admin',
    roleTitle: 'Super Admin',
    badge: 'Platform Owner',
    email: 'admin@kalpak.com',
    password: 'KalpakAdmin123!',
    tenantSlug: '',
    targetUrl: '/super-admin/dashboard',
    features: 'Executive business telemetry, tenant activation/suspension, plan pricing catalogue.',
  },
  {
    id: 'client-admin',
    roleTitle: 'Client Admin',
    badge: 'Acme Admin',
    email: 'clientadmin@acme.com',
    password: 'AcmeAdmin123!',
    tenantSlug: 'acme-corp',
    targetUrl: '/dashboard',
    features: '5-Staff quota meter, ticket lifecycle, department routing, customer assets, CSV export.',
  },
  {
    id: 'dept-head',
    roleTitle: 'Department Head',
    badge: 'Mechanical Head',
    email: 'depthead@acme.com',
    password: 'AcmeDept123!',
    tenantSlug: 'acme-corp',
    targetUrl: '/dashboard/department',
    features: 'Department-specific ticket triage queue, SLA monitoring, workload overview.',
  },
  {
    id: 'field-tech',
    roleTitle: 'Field Technician',
    badge: 'Electrical Support',
    email: 'tech@acme.com',
    password: 'AcmeTech123!',
    tenantSlug: 'acme-corp',
    targetUrl: '/dashboard/employee',
    features: 'Field ticket assignments, work orders, spare parts consumption, SLA milestone tracking.',
  },
];

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

  // Unverified email handler state
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [resendStatusMessage, setResendStatusMessage] = useState<string | null>(null);
  const [directVerificationUrl, setDirectVerificationUrl] = useState<string | null>(null);
  const [isActivatingDirectly, setIsActivatingDirectly] = useState(false);

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
  const [warmingStatus, setWarmingStatus] = useState<string | null>(null);

  React.useEffect(() => {
    const handleWarming = (e: Event) => {
      const customEvent = e as CustomEvent<{ retryCount: number; maxRetries: number }>;
      const attempt = customEvent.detail?.retryCount || 1;
      setWarmingStatus(`Waking up cloud server (attempt ${attempt}/5)... please wait`);
    };
    const handleReady = () => {
      setWarmingStatus(null);
    };

    window.addEventListener('kalpak:server-warming', handleWarming);
    window.addEventListener('kalpak:server-ready', handleReady);
    return () => {
      window.removeEventListener('kalpak:server-warming', handleWarming);
      window.removeEventListener('kalpak:server-ready', handleReady);
    };
  }, []);

  const navigateAfterAuth = (
    isSuperAdmin: boolean,
    userRole: string | null | undefined,
    tenantSlug: string | null | undefined,
    tenantSettings?: any
  ) => {
    if (isSuperAdmin) {
      const dest = sanitizeReturnUrl(searchParams?.get('returnUrl'), '/super-admin/dashboard');
      window.location.href = dest;
      return;
    }

    const defaultDest = getDefaultDashboardForRole(userRole, false, tenantSlug);
    const planParam = searchParams?.get('plan');
    let dest = planParam
      ? `/checkout?plan=${planParam}`
      : sanitizeReturnUrl(searchParams?.get('returnUrl'), defaultDest);

    // If Client Admin has not finished onboarding, route to all plans page
    const onboardingCompleted = (tenantSettings as any)?.onboarding?.completed;
    if (userRole === 'CLIENT_ADMIN' && onboardingCompleted === false && dest === '/dashboard') {
      dest = '/plans';
    }

    if (tenantSlug && !dest.startsWith('/plans') && !dest.startsWith('/checkout') && !dest.startsWith('/onboarding') && userRole !== 'CUSTOMER') {
      window.location.href = buildTenantSubdomainUrl(tenantSlug, dest);
    } else {
      window.location.href = dest;
    }
  };

  const [selectedQuickRole, setSelectedQuickRole] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  const handleCopyCredentials = (acc: TestingAccount, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`Email: ${acc.email}\nPassword: ${acc.password}\nRole: ${acc.roleTitle}`);
    }
    setCopiedAccount(acc.id);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const handleSelectQuickAccount = (acc: TestingAccount, autoSubmit = false) => {
    setSelectedQuickRole(acc.id);
    setEmail(acc.email);
    setPassword(acc.password);
    setTenantSlug(acc.tenantSlug);
    setError(null);

    if (autoSubmit) {
      triggerLogin(acc.email, acc.password, acc.tenantSlug);
    }
  };

  const triggerLogin = async (loginEmail: string, loginPassword: string, loginTenantSlug?: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiClient<AuthLoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
          tenantSlug: loginTenantSlug?.trim() || undefined,
        }),
      });

      setCachedUser(response.user);
      if ((response as any).token) {
        setAuthToken((response as any).token);
      }

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

      // Refresh session state and route according to authoritative role and environment
      const freshSession = await refetchSession();
      const isSuperAdmin = Boolean(
        response.user?.isSuperAdmin ||
        freshSession?.user?.isSuperAdmin ||
        freshSession?.activeRole === 'SUPER_ADMIN'
      );
      const userRole = freshSession?.activeRole;
      const targetTenantSlug = freshSession?.activeTenant?.slug;

      navigateAfterAuth(isSuperAdmin, userRole, targetTenantSlug, freshSession?.activeTenant?.settings);
    } catch (err) {
      if (err instanceof ApiClientError) {
        const rawMsg = err.errorResponse?.message || '';
        const errCode = (err.errorResponse as any)?.code;
        const errEmail = (err.errorResponse as any)?.email;

        if (errCode === 'EMAIL_NOT_VERIFIED' || rawMsg.toLowerCase().includes('verify your email')) {
          setUnverifiedEmail(errEmail || loginEmail.trim().toLowerCase());
          setError(rawMsg || 'Please verify your email address before signing in.');
          return;
        }

        const isLocalhost =
          typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

        if (
          !rawMsg ||
          rawMsg.includes('<html') ||
          rawMsg.includes('<!DOCTYPE') ||
          rawMsg.includes('502 Bad Gateway') ||
          rawMsg.trim().startsWith('<')
        ) {
          setError(
            isLocalhost
              ? 'Backend API server is not running on port 4000. Please start the backend with: pnpm --filter @kalpak/api run start:dev'
              : 'The server is waking up from sleep on the Render free tier (cold start). Please wait ~30-60 seconds and try again.'
          );
        } else {
          setError(rawMsg);
        }
      } else if (err instanceof Error && err.name === 'AbortError') {
        setError('The server is taking longer than usual to respond (waking up). Please try again in a moment.');
      } else {
        setError('Unable to communicate with the authentication service. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await triggerLogin(email, password, tenantSlug);
  };

  const handleResendFromLogin = async () => {
    const targetEmail = unverifiedEmail || email.trim().toLowerCase();
    if (!targetEmail) return;
    setIsResendingVerification(true);
    setResendStatusMessage(null);
    try {
      const res = await apiClient<{ message: string; verificationUrl?: string; emailDelivered?: boolean }>(
        '/auth/resend-verification',
        {
          method: 'POST',
          body: JSON.stringify({ email: targetEmail }),
        }
      );
      setResendStatusMessage(res.message || 'Verification link has been dispatched.');
      if (res.verificationUrl) {
        setDirectVerificationUrl(res.verificationUrl);
      }
    } catch (err: any) {
      setResendStatusMessage(err?.errorResponse?.message || 'Failed to request verification email.');
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleInstantVerifyAndLogin = async () => {
    const targetEmail = unverifiedEmail || email.trim().toLowerCase();
    if (!targetEmail) return;
    setIsActivatingDirectly(true);
    setResendStatusMessage(null);
    try {
      await apiClient('/health/verify-user-by-email', {
        method: 'POST',
        body: JSON.stringify({ email: targetEmail }),
      });
      setUnverifiedEmail(null);
      setError(null);
      // Wait briefly then re-trigger login
      setTimeout(() => {
        const submitBtn = document.getElementById('login-submit-btn');
        if (submitBtn) {
          submitBtn.click();
        }
      }, 300);
    } catch (err: any) {
      setResendStatusMessage(err?.errorResponse?.message || 'Instant verification failed. Please try again.');
    } finally {
      setIsActivatingDirectly(false);
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
      const isSuperAdmin = Boolean(
        cachedUser?.isSuperAdmin ||
        freshSession?.user?.isSuperAdmin ||
        freshSession?.activeRole === 'SUPER_ADMIN'
      );
      const userRole = freshSession?.activeRole;
      const targetTenantSlug = freshSession?.activeTenant?.slug;

      navigateAfterAuth(isSuperAdmin, userRole, targetTenantSlug, freshSession?.activeTenant?.settings);
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
      const freshSession = await refetchSession();
      const isSuperAdmin = Boolean(
        cachedUser?.isSuperAdmin ||
        freshSession?.user?.isSuperAdmin ||
        freshSession?.activeRole === 'SUPER_ADMIN'
      );
      const userRole = freshSession?.activeRole;
      const targetTenantSlug = freshSession?.activeTenant?.slug;

      navigateAfterAuth(isSuperAdmin, userRole, targetTenantSlug, freshSession?.activeTenant?.settings);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.errorResponse.message || 'Failed to select organization');
      }
    } finally {
      setIsSwitchingOrg(false);
    }
  };

  const selectedAccount = TESTING_ACCOUNTS.find((a) => a.id === selectedQuickRole || a.email === email);

  return (
    <div className="w-full max-w-xl">
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

        {unverifiedEmail ? (
          <div className="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50/90 text-amber-900 shadow-sm text-left">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-amber-900">Email Verification Required</h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Your account (<strong className="font-semibold text-amber-950">{unverifiedEmail}</strong>) is registered, but your email address has not been verified yet. Check your inbox or spam folder.
                </p>

                {resendStatusMessage && (
                  <p className="text-xs font-semibold text-emerald-800 bg-emerald-100/70 border border-emerald-300 rounded-lg p-2.5 mt-2.5">
                    {resendStatusMessage}
                  </p>
                )}

                {directVerificationUrl && (
                  <div className="mt-3">
                    <a
                      href={directVerificationUrl}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify Email & Activate Account &rarr;</span>
                    </a>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200/80">
                  <button
                    type="button"
                    onClick={handleResendFromLogin}
                    disabled={isResendingVerification}
                    className="text-xs font-bold text-orange-700 hover:text-orange-900 underline disabled:opacity-50"
                  >
                    {isResendingVerification ? 'Resending...' : 'Resend Verification Email'}
                  </button>
                  <span className="text-amber-400">&bull;</span>
                  <button
                    type="button"
                    onClick={handleInstantVerifyAndLogin}
                    disabled={isActivatingDirectly}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline disabled:opacity-50"
                  >
                    {isActivatingDirectly ? 'Activating...' : 'Instant Test Verification'}
                  </button>
                  <span className="text-amber-400">&bull;</span>
                  <Link
                    href={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
                    className="text-xs font-bold text-slate-700 hover:text-slate-900 underline"
                  >
                    Verification Page &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="mb-6">
            <Alert variant="error">{error}</Alert>
          </div>
        ) : null}

        {!isMfaStep ? (
          <>
            {/* Official Company Testing Logins Quick Selector */}
            {!subdomainSlug && (
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    <h3 className="text-xs font-black tracking-wider uppercase text-slate-100">
                      Testing &amp; QA Logins (Company Review)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    4 Roles Active
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 mb-3">
                  Click any card to autofill, or use <strong>1-Click Sign In</strong> to test that persona:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TESTING_ACCOUNTS.map((acc) => {
                    const isSelected = selectedQuickRole === acc.id || email === acc.email;
                    return (
                      <div
                        key={acc.id}
                        onClick={() => handleSelectQuickAccount(acc, false)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-orange-500/15 border-orange-500 shadow-sm shadow-orange-500/20'
                            : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-black text-white">{acc.roleTitle}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-700 text-orange-300 shrink-0">
                            {acc.badge}
                          </span>
                        </div>

                        <div className="text-[11px] font-mono text-slate-300 truncate">
                          {acc.email}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                          Password: <span className="text-orange-300 font-bold">{acc.password}</span>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex items-center justify-between gap-1">
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectQuickAccount(acc, true);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-black text-orange-400 hover:text-orange-300 transition-colors disabled:opacity-50"
                          >
                            <span>1-Click Sign In</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            title="Copy credentials"
                            onClick={(e) => handleCopyCredentials(acc, e)}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
                          >
                            {copiedAccount === acc.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedAccount && (
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-orange-300 font-bold mb-1">
                      <span>Direct Dashboard:</span>
                      <span className="font-mono text-slate-200">http://localhost:3000{selectedAccount.targetUrl}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 leading-snug">
                      <strong className="text-slate-300">Features:</strong> {selectedAccount.features}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 1: Standard / Super Admin Login Form */}
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
              id="login-submit-btn"
              type="submit"
              isLoading={isLoading}
              className="w-full mt-4 h-11 text-sm font-extrabold shadow-lg shadow-orange-500/20"
            >
              <span>{warmingStatus ? 'Connecting to Cloud...' : 'Sign In to Workspace'}</span>
              {!warmingStatus && <ArrowRight className="ml-2 w-4 h-4" />}
            </Button>
            {warmingStatus && (
              <p className="text-center text-xs text-orange-600 font-semibold animate-pulse mt-2">
                {warmingStatus}
              </p>
            )}
          </form>
        </>
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
