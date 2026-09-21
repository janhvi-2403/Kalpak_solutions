'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShieldCheck,
  KeyRound,
  QrCode,
  Copy,
  Check,
  Download,
  ArrowRight,
  Lock,
  Server,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Mail,
} from 'lucide-react';
import { KalpakLogo } from '@/components/KalpakLogo';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { Button, Input, PasswordInput, Alert } from '@/components/ui';

interface BootstrapStatus {
  isAvailable: boolean;
  isCompleted: boolean;
  message: string;
  requiresDeploymentAuth: boolean;
}

interface StagedPayload {
  tempToken: string;
  email: string;
  fullName: string;
  qrCodeDataUrl: string;
  otpauthUri: string;
  totpSecretFormatted: string;
  backupCodes: string[];
}

export default function SuperAdminBootstrapPage() {
  // Status check
  const [statusLoading, setStatusLoading] = useState(true);
  const [status, setStatus] = useState<BootstrapStatus | null>(null);

  // Wizard Step: 1 (Credentials) | 2 (Email Verification) | 3 (TOTP QR) | 4 (Backup Codes) | 5 (Done)
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State - Step 1
  const [secret, setSecret] = useState('');
  const [fullName, setFullName] = useState('Kalpak System Administrator');
  const [email, setEmail] = useState('admin@kalpaksolutions.com');
  const [phoneNumber, setPhoneNumber] = useState('+91 93730 28030');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Staged Response
  const [stagedData, setStagedData] = useState<StagedPayload | null>(null);

  // Form State - Step 2 (Email Verification)
  const [emailCode, setEmailCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccessMessage, setResendSuccessMessage] = useState<string | null>(null);

  // Form State - Step 3 (TOTP MFA)
  const [totpCode, setTotpCode] = useState('');

  // Backup Codes - Step 4
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [savedConfirmation, setSavedConfirmation] = useState(false);

  // Global UI State
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check bootstrap status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  // Countdown timer for resend email
  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const checkStatus = async () => {
    try {
      setStatusLoading(true);
      setError(null);
      const res = await apiClient<BootstrapStatus>('/bootstrap/status');
      setStatus(res);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.errorResponse.message || 'Unable to query bootstrap authorization status');
      } else {
        setError('Network error checking bootstrap status.');
      }
    } finally {
      setStatusLoading(false);
    }
  };

  // Step 1: Initiate Bootstrap
  const handleInitiateBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!secret.trim()) {
      setError('Deployment authorization secret is required to initialize Super Admin.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiClient<StagedPayload>('/bootstrap/init', {
        method: 'POST',
        headers: {
          'x-bootstrap-secret': secret.trim(),
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phoneNumber: phoneNumber.trim() || undefined,
          password,
          secret: secret.trim(),
        }),
      });

      setStagedData(data);
      setBackupCodes(data.backupCodes || []);
      setStep(2); // Go to Email Verification
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.errorResponse.message || 'Bootstrap initialization failed');
      } else {
        setError('Failed to communicate with the bootstrap service');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify Official Email Code
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResendSuccessMessage(null);

    if (!stagedData || !stagedData.tempToken) {
      setError('Staging session expired. Please re-enter credentials.');
      setStep(1);
      return;
    }

    if (!emailCode.trim() || emailCode.trim().length < 6) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient('/bootstrap/verify-email', {
        method: 'POST',
        body: JSON.stringify({
          tempToken: stagedData.tempToken,
          code: emailCode.trim(),
        }),
      });

      setStep(3); // Proceed to TOTP QR Setup
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.errorResponse.message || 'Invalid email verification code.');
      } else {
        setError('Failed to verify email code.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Resend Email Code Helper
  const handleResendEmail = async () => {
    if (!stagedData?.tempToken || resendCooldown > 0) return;
    setError(null);
    setResendSuccessMessage(null);

    try {
      const res = await apiClient<{ message: string }>('/bootstrap/resend-email', {
        method: 'POST',
        body: JSON.stringify({ tempToken: stagedData.tempToken }),
      });
      setResendSuccessMessage(res.message);
      setResendCooldown(60);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.errorResponse.message || 'Failed to resend verification email');
      }
    }
  };

  // Step 3: Verify Initial TOTP & Lock Bootstrap
  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!stagedData || !stagedData.tempToken) {
      setError('Staging session expired. Please re-enter credentials.');
      setStep(1);
      return;
    }

    if (totpCode.trim().length !== 6) {
      setError('Please enter a valid 6-digit TOTP code from your authenticator app.');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient('/bootstrap/verify-mfa', {
        method: 'POST',
        body: JSON.stringify({
          tempToken: stagedData.tempToken,
          totpCode: totpCode.trim(),
        }),
      });

      setStep(4); // Proceed to Recovery Codes
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.errorResponse.message || 'Invalid 6-digit verification code.');
      } else {
        setError('Failed to verify TOTP code.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Copy Secret Helper
  const handleCopySecret = () => {
    if (stagedData?.totpSecretFormatted) {
      navigator.clipboard.writeText(stagedData.totpSecretFormatted.replace(/\s+/g, ''));
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2500);
    }
  };

  // Copy Backup Codes Helper
  const handleCopyCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2500);
  };

  // Download Backup Codes
  const handleDownloadCodes = () => {
    const content = `KALPAK SOLUTIONS - SUPER ADMIN EMERGENCY BACKUP CODES\nGenerated: ${new Date().toISOString()}\nAccount: ${email}\n\n${backupCodes.join(
      '\n'
    )}\n\nIMPORTANT: Each backup code is single-use. Store these codes in a secure password manager or offline vault.`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kalpak-super-admin-backup-codes-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (statusLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
          <h2 className="text-xl font-bold">Checking Installation Authorization...</h2>
          <p className="text-sm text-slate-400">Verifying database and deployment bootstrap state.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 selection:bg-orange-500 selection:text-white">
      {/* Header Bar */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-800/80 mb-8">
        <KalpakLogo size="md" variant="dark" href="/" />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300">
          <Server className="w-3.5 h-3.5 text-orange-400" />
          <span>One-Time System Installation</span>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto w-full">
        {/* Status Alert if Locked */}
        {status && !status.isAvailable && (
          <div className="mb-8 p-6 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-amber-300">
                  {status.isCompleted
                    ? 'Installation Bootstrap is Permanently Locked'
                    : 'Bootstrap Authorization Disabled'}
                </h3>
                <p className="text-sm text-amber-200/90 leading-relaxed">{status.message}</p>
                <div className="pt-3 flex flex-wrap gap-3">
                  <Link
                    href="/super-admin/login"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 transition-colors shadow-md"
                  >
                    <span>Go to Super Admin Login</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={checkStatus}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Re-check Status</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Container (only shown if available) */}
        {status?.isAvailable && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-10 backdrop-blur-md">
            {/* Step Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-3 overflow-x-auto gap-2">
                <span className={step >= 1 ? 'text-orange-400 whitespace-nowrap' : 'whitespace-nowrap'}>1. Authorization</span>
                <span className={step >= 2 ? 'text-orange-400 whitespace-nowrap' : 'whitespace-nowrap'}>2. Email Verification</span>
                <span className={step >= 3 ? 'text-orange-400 whitespace-nowrap' : 'whitespace-nowrap'}>3. TOTP MFA</span>
                <span className={step >= 4 ? 'text-orange-400 whitespace-nowrap' : 'whitespace-nowrap'}>4. Backup Codes</span>
                <span className={step >= 5 ? 'text-orange-400 whitespace-nowrap' : 'whitespace-nowrap'}>5. Complete</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                <div
                  className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 h-full transition-all duration-300"
                  style={{ width: `${(step / 5) * 100}%` }}
                />
              </div>
            </div>

            {error && (
              <div className="mb-6">
                <Alert variant="error">{error}</Alert>
              </div>
            )}

            {/* STEP 1: Deployment Authorization & Credentials */}
            {step === 1 && (
              <form onSubmit={handleInitiateBootstrap} className="space-y-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Deployment Authorization Required</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">
                    Initialize Initial Super Administrator
                  </h2>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Provide the server-side deployment authorization secret configured in your environment along with the
                    initial Super Admin profile credentials.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
                  <PasswordInput
                    id="bootstrap-secret"
                    label="Server Deployment Secret (INITIAL_BOOTSTRAP_SECRET)"
                    required
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Enter deployment-level authorization secret"
                    helperText="Configured in Render / environment secrets. Never exposed in URLs."
                    className="bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    id="admin-name"
                    type="text"
                    label="Full Name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Kalpak System Administrator"
                    className="bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                  />
                  <Input
                    id="admin-email"
                    type="email"
                    label="Official Email Address"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@kalpaksolutions.com"
                    className="bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <Input
                    id="admin-phone"
                    type="tel"
                    label="Contact Phone Number (Stored as profile contact, no SMS OTP)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 93730 28030"
                    className="bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <PasswordInput
                    id="admin-password"
                    label="Strong Password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    helperText="Hashed using Argon2id (min 8 chars, uppercase, lowercase, number, special)"
                    className="bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                  />
                  <PasswordInput
                    id="admin-confirm-password"
                    label="Confirm Password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <Button
                    type="submit"
                    isLoading={isLoading}
                    className="h-11 px-8 text-sm font-extrabold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-700 shadow-lg shadow-orange-500/25"
                  >
                    <span>Proceed to Email Verification</span>
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </form>
            )}

            {/* STEP 2: Official Email Verification */}
            {step === 2 && stagedData && (
              <form onSubmit={handleVerifyEmail} className="space-y-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold">
                    <Mail className="w-3.5 h-3.5" />
                    <span>Step 2: Official Email Verification</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">
                    Verify Your Official Email
                  </h2>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    A 6-digit confirmation code has been dispatched to{' '}
                    <strong className="text-white">{stagedData.email}</strong>. Enter the code below to verify ownership.
                  </p>
                </div>

                {resendSuccessMessage && (
                  <Alert variant="success">{resendSuccessMessage}</Alert>
                )}

                <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 max-w-md mx-auto">
                  <Input
                    id="email-otp-code"
                    type="text"
                    label="6-Digit Email Verification Code"
                    required
                    autoFocus
                    maxLength={6}
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\s+/g, ''))}
                    placeholder="123456"
                    className="text-center tracking-widest text-2xl font-mono font-bold bg-slate-900 border-slate-700 text-white placeholder-slate-600"
                    helperText="Check your email inbox or server terminal for the 6-digit code."
                  />

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                    <span>Did not receive the code?</span>
                    <button
                      type="button"
                      disabled={resendCooldown > 0}
                      onClick={handleResendEmail}
                      className="text-orange-400 hover:text-orange-300 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    &larr; Back to credentials
                  </button>
                  <Button
                    type="submit"
                    isLoading={isLoading}
                    className="h-11 px-8 text-sm font-extrabold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 shadow-lg shadow-orange-500/25"
                  >
                    <span>Verify Email & Setup MFA</span>
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </form>
            )}

            {/* STEP 3: TOTP Authenticator App QR Setup */}
            {step === 3 && stagedData && (
              <form onSubmit={handleVerifyTotp} className="space-y-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Step 3: Authenticator App Registration</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">
                    Set Up Two-Factor Authentication (TOTP)
                  </h2>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Scan the QR code below using Google Authenticator, Microsoft Authenticator, or 1Password.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center p-6 rounded-2xl bg-slate-950 border border-slate-800">
                  {/* QR Code */}
                  <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-inner">
                    <Image
                      src={stagedData.qrCodeDataUrl}
                      alt="TOTP Authenticator QR Code"
                      width={180}
                      height={180}
                      unoptimized
                      className="rounded-lg"
                    />
                    <span className="text-[10px] font-bold text-slate-600 mt-2 uppercase tracking-wider">
                      Scan with Authenticator App
                    </span>
                  </div>

                  {/* Manual Key & Verification Input */}
                  <div className="md:col-span-7 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Manual Entry Secret Key
                      </label>
                      <div className="flex items-center gap-2">
                        <code className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-amber-400 font-mono text-xs sm:text-sm font-bold tracking-widest flex-1 select-all">
                          {stagedData.totpSecretFormatted}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopySecret}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedSecret ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      <Input
                        id="totp-code"
                        type="text"
                        label="Enter 6-Digit Authenticator Code"
                        required
                        autoFocus
                        maxLength={6}
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\s+/g, ''))}
                        placeholder="123456"
                        className="text-center tracking-widest text-xl font-mono font-bold bg-slate-900 border-slate-700 text-white placeholder-slate-600"
                        helperText="Verify your authenticator app by typing the generated 6-digit code."
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    &larr; Back to email verification
                  </button>
                  <Button
                    type="submit"
                    isLoading={isLoading}
                    className="h-11 px-8 text-sm font-extrabold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 shadow-lg shadow-orange-500/25"
                  >
                    <span>Verify & Commit Bootstrap</span>
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </form>
            )}

            {/* STEP 4: Emergency Backup Codes */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Email & MFA Verified</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">
                    Save Your Emergency Recovery Codes
                  </h2>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    If you lose access to your authenticator device, you can use these one-time recovery codes to sign in.
                    Each code can only be used once.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {backupCodes.map((code, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center font-mono text-xs font-bold text-amber-300 tracking-wider select-all"
                      >
                        {code}
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCopyCodes}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                    >
                      {copiedCodes ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCodes ? 'Codes Copied' : 'Copy All Codes'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadCodes}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .txt</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-orange-950/30 border border-orange-500/30 flex items-start gap-3 text-xs text-orange-200">
                  <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={savedConfirmation}
                      onChange={(e) => setSavedConfirmation(e.target.checked)}
                      className="rounded border-orange-500 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="font-medium">
                      I confirm that I have safely backed up these recovery codes in a secure location.
                    </span>
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <Button
                    type="button"
                    disabled={!savedConfirmation}
                    onClick={() => setStep(5)}
                    className="h-11 px-8 text-sm font-extrabold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 shadow-lg shadow-orange-500/25 disabled:opacity-50"
                  >
                    <span>Finalize Installation</span>
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 5: Permanent Completion & Lock */}
            {step === 5 && (
              <div className="text-center py-6 space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 shadow-lg">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-3xl font-extrabold text-white tracking-tight">
                    Super Administrator Initialized!
                  </h2>
                  <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                    The installation bootstrap is now <strong className="text-white">permanently completed and locked</strong>.
                    Subsequent deployment restarts or database resets will not reopen this setup.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 max-w-md mx-auto text-left space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Super Admin Account:</span>
                    <span className="font-semibold text-white">{email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email Verification:</span>
                    <span className="font-semibold text-emerald-400">Verified & Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Two-Factor MFA:</span>
                    <span className="font-semibold text-emerald-400">Enforced & Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bootstrap Lockout:</span>
                    <span className="font-semibold text-orange-400">Permanent Lock Active</span>
                  </div>
                </div>

                <div className="pt-4 flex justify-center gap-4">
                  <Link
                    href="/super-admin/dashboard"
                    className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 shadow-xl shadow-orange-500/30 transition-all hover:-translate-y-0.5"
                  >
                    <span>Enter Super Admin Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full text-center py-6 text-xs text-slate-500 border-t border-slate-800/60 mt-12">
        &copy; {new Date().getFullYear()} Kalpak Solutions Inc. Enterprise Service Calls & Ticket Management SaaS.
      </footer>
    </main>
  );
}
