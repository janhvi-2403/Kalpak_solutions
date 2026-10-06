'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { Button, Input, PasswordInput, Alert, Badge } from '@/components/ui';
import {
  Building2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  Lock,
} from 'lucide-react';
import { PublicInvitationInfo } from '@kalpak/types';

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [invitationInfo, setInvitationInfo] = useState<PublicInvitationInfo | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  useEffect(() => {
    if (token) {
      apiClient<PublicInvitationInfo>(`/auth/invitations/${token}`)
        .then((data) => {
          setInvitationInfo(data);
          if (data.fullName) setFullName(data.fullName);
          if (data.phone) setPhone(data.phone);
        })
        .catch((err) => {
          if (err instanceof ApiClientError) {
            setError(err.errorResponse.message || 'Invitation not found or has expired.');
          } else {
            setError('Unable to load invitation details.');
          }
        })
        .finally(() => {
          setIsLoadingDetails(false);
        });
    } else {
      setError('Invitation token is missing from the URL.');
      setIsLoadingDetails(false);
    }
  }, [token]);

  const isClientAdmin = invitationInfo?.role === 'CLIENT_ADMIN';
  const isDeptAdmin = invitationInfo?.role === 'DEPARTMENT_ADMIN';
  const roleDisplay = isDeptAdmin ? 'Department Head' : isClientAdmin ? 'Client Administrator' : (invitationInfo?.role || 'Team Member');

  const handleCopySecret = () => {
    if (invitationInfo?.mfaSetup?.secret) {
      navigator.clipboard.writeText(invitationInfo.mfaSetup.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleCopyBackupCodes = () => {
    if (invitationInfo?.mfaSetup?.backupCodes) {
      navigator.clipboard.writeText(invitationInfo.mfaSetup.backupCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (isClientAdmin && (!totpCode || totpCode.trim().length !== 6)) {
      setError('Please enter the 6-digit verification code from your authenticator app to complete 2-step authentication.');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient('/auth/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({
          token,
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
          password,
          totpCode: totpCode.trim() || undefined,
          totpSecret: invitationInfo?.mfaSetup?.secret || undefined,
          backupCodes: invitationInfo?.mfaSetup?.backupCodes || undefined,
        }),
      });

      setIsAccepted(true);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.errorResponse.message || 'Failed to accept invitation');
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingDetails) {
    return (
      <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200 text-center text-sm text-slate-500 shadow-sm">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Validating secure invitation token...
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-xl shadow-slate-100 my-8">
      <div className="mb-6">
        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3 shadow-xs">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {isDeptAdmin
            ? 'Join as Department Head'
            : isClientAdmin
            ? 'Join as Client Administrator'
            : 'Join Organization Workspace'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {isDeptAdmin
            ? `Set your account password and security verification to activate Department Head authority for ${invitationInfo?.department || 'your department'}.`
            : isClientAdmin
            ? 'Set your account password and register 2-step authentication to activate administrator privileges.'
            : 'You have been invited to join the Kalpak Service Operations workspace.'}
        </p>
      </div>

      {error && (
        <div className="mb-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {isAccepted ? (
        <div className="py-4 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            {isDeptAdmin ? 'Department Head Activated!' : 'Account Activated Successfully!'}
          </h3>
          <p className="text-sm text-slate-600 mt-2 mb-4 leading-relaxed">
            Welcome to the team! Your account has been created and assigned as{' '}
            <strong className="text-slate-900">
              {isDeptAdmin ? `Department Head for ${invitationInfo?.department}` : roleDisplay}
            </strong>{' '}
            at <strong className="text-slate-900">{invitationInfo?.tenantName}</strong>.
          </p>

          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 mb-6 text-left space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Departmental Governance Active</span>
            </p>
            <p className="text-emerald-800 text-[11px] leading-relaxed">
              Your login credentials and security permissions are now live. You have operational control over your department's queues, technician assignments, and SLA resolution tracking.
            </p>
          </div>

          <Link href="/login">
            <Button className="w-full h-11 text-sm bg-orange-600 hover:bg-orange-700 text-white shadow-md">
              <span>Sign In to {isDeptAdmin ? 'Department Dashboard' : 'Dashboard'}</span>
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      ) : invitationInfo ? (
        <div>
          {/* Invitation Details Summary Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 mb-6 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Organization</span>
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-orange-600" />
                {invitationInfo.tenantName}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Email Address</span>
              <span className="font-mono text-slate-800">{invitationInfo.email}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Assigned Role</span>
              <Badge variant="primary" className="text-[10px] py-0.5 px-2 font-mono">
                {roleDisplay}
              </Badge>
            </div>
            {invitationInfo.department && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Assigned Department</span>
                <span className="font-bold text-orange-700 bg-orange-100/70 border border-orange-200 px-2 py-0.5 rounded text-[11px]">
                  {invitationInfo.department}
                </span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Step 1: Personal Profile */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                1. Account Details
              </div>

              <Input
                id="employee-name"
                label="Full Name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ramesh Patel"
              />

              <Input
                id="employee-phone"
                label="Mobile / Phone Number"
                required={isClientAdmin}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                helperText="Used for administrative security contact and MFA recovery"
              />

              <PasswordInput
                id="employee-password"
                label="Create Account Password"
                required
                showStrength={true}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />

              <PasswordInput
                id="employee-confirm-password"
                label="Confirm Account Password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {/* Step 2: 2-Step Authentication (MFA) Setup */}
            {invitationInfo.mfaSetup && (
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-orange-600" />
                    <span>2. Setup 2-Step Authentication</span>
                  </div>
                  {isClientAdmin && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      Mandatory for Admins
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Scan this QR code using <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, or <strong>Authy</strong> on your mobile phone:
                </p>

                {/* QR Code and Secret Key */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                  <div className="p-2 bg-white rounded-lg border border-slate-200 shrink-0 shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={invitationInfo.mfaSetup.qrCode}
                      alt="Authenticator QR Code"
                      className="w-32 h-32 object-contain"
                    />
                  </div>

                  <div className="space-y-2 text-xs flex-1 min-w-0">
                    <div>
                      <span className="text-slate-500 font-medium text-[11px] block">
                        Manual Entry Secret Key:
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <code className="bg-white border border-slate-200 px-2 py-1 rounded text-slate-800 font-mono text-[11px] truncate flex-1 select-all">
                          {invitationInfo.mfaSetup.secret}
                        </code>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleCopySecret}
                          className="h-7 text-xs px-2 shrink-0"
                          title="Copy secret key"
                        >
                          {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>

                    {invitationInfo.mfaSetup.backupCodes && (
                      <div className="pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyBackupCodes}
                          className="text-[11px] text-blue-600 h-6 px-1.5 hover:bg-blue-50"
                        >
                          {copiedCodes ? (
                            <span className="text-emerald-600 flex items-center gap-1 font-bold">
                              <Check className="w-3 h-3" /> Backup Codes Copied!
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Copy className="w-3 h-3" /> Copy 8 Emergency Backup Codes
                            </span>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 6-Digit Verification Input */}
                <div>
                  <Input
                    id="totp-code"
                    label="Enter 6-Digit Authenticator Verification Code"
                    required={isClientAdmin}
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="font-mono text-center tracking-widest text-lg font-bold"
                    helperText="Enter the 6-digit rotating code currently displayed in your authenticator app"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4">
                <Alert variant="error">{error}</Alert>
              </div>
            )}

            <Button
              type="submit"
              isLoading={isSubmitting}
              className="w-full h-11 text-sm bg-orange-600 hover:bg-orange-700 text-white shadow-md mt-6"
            >
              <span>Accept Invitation & Activate Account</span>
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </form>
        </div>
      ) : (
        <div className="text-center pt-2">
          <Link href="/login" className="text-sm font-semibold text-orange-600 hover:underline">
            Return to Login
          </Link>
        </div>
      )}
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50">
      <Suspense fallback={<div className="text-sm text-slate-500">Loading invitation...</div>}>
        <AcceptInvitationContent />
      </Suspense>
    </main>
  );
}
