'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient, ApiClientError } from '@/lib/api-client';
import {
  ShieldCheck,
  Settings,
  Clock,
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  Mail,
  Lock,
  QrCode,
  Copy,
  Check,
  Download,
  KeyRound,
  ShieldAlert,
  Smartphone,
} from 'lucide-react';
import {
  Button,
  Input,
  Select,
  Checkbox,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Skeleton,
  Dialog,
} from '@/components/ui';

interface TenantPolicy {
  id: string;
  tenantId: string;
  businessType: string;
  purposeOfUse: string;
  allowCustomerToRaise: boolean;
  allowEmployeeOnBehalf: boolean;
  assignmentStrategy: string;
  closureAuthority: string;
  tolerableOpenDays: number;
  notificationChannels: string;
  platformAccess: string;
  pushNotifications: boolean;
  maxUsersQuota: number;
  subscriptionStartsAt: string;
  subscriptionEndsAt?: string | null;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'policy' | 'security'>('policy');
  const [policy, setPolicy] = useState<TenantPolicy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form Fields
  const [businessType, setBusinessType] = useState('BOTH');
  const [purposeOfUse, setPurposeOfUse] = useState('BOTH');
  const [allowCustomerToRaise, setAllowCustomerToRaise] = useState(true);
  const [allowEmployeeOnBehalf, setAllowEmployeeOnBehalf] = useState(true);
  const [assignmentStrategy, setAssignmentStrategy] = useState('MANUAL_DEPT_HEAD');
  const [closureAuthority, setClosureAuthority] = useState('SUPPORT_EMPLOYEE');
  const [tolerableOpenDays, setTolerableOpenDays] = useState(3);
  const [notificationChannels, setNotificationChannels] = useState('BOTH');
  const [platformAccess, setPlatformAccess] = useState('BOTH');
  const [pushNotifications, setPushNotifications] = useState(true);

  // MFA / 2FA State
  const [mfaStatus, setMfaStatus] = useState<{ mfaEnabled: boolean; backupCodesRemaining: number } | null>(null);
  const [isMfaLoading, setIsMfaLoading] = useState(false);
  const [mfaSetupData, setMfaSetupData] = useState<{ secret: string; otpauthUri: string; qrCode: string; backupCodes: string[] } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [isActivatingMfa, setIsActivatingMfa] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);
  const [mfaFeedback, setMfaFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDisablingMfa, setIsDisablingMfa] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableModal, setShowDisableModal] = useState(false);

  const fetchPolicy = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiClient<TenantPolicy>('/tenants/policy');
      setPolicy(data);
      setBusinessType(data.businessType);
      setPurposeOfUse(data.purposeOfUse);
      setAllowCustomerToRaise(data.allowCustomerToRaise);
      setAllowEmployeeOnBehalf(data.allowEmployeeOnBehalf);
      setAssignmentStrategy(data.assignmentStrategy);
      setClosureAuthority(data.closureAuthority);
      setTolerableOpenDays(data.tolerableOpenDays || 3);
      setNotificationChannels(data.notificationChannels);
      setPlatformAccess(data.platformAccess);
      setPushNotifications(data.pushNotifications);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to fetch policy' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMfaStatus = useCallback(async () => {
    try {
      setIsMfaLoading(true);
      const data = await apiClient<{ mfaEnabled: boolean; backupCodesRemaining: number }>('/auth/mfa/status');
      setMfaStatus(data);
    } catch {
      // Ignore if session not ready
    } finally {
      setIsMfaLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicy();
    fetchMfaStatus();
  }, [fetchPolicy, fetchMfaStatus]);

  const handleStartMfaSetup = async () => {
    try {
      setIsMfaLoading(true);
      setMfaFeedback(null);
      const data = await apiClient<{ secret: string; otpauthUri: string; qrCode: string; backupCodes: string[] }>('/auth/mfa/setup', {
        method: 'POST',
      });
      setMfaSetupData(data);
      setMfaCode('');
    } catch (err) {
      setMfaFeedback({
        type: 'error',
        text: err instanceof ApiClientError ? err.errorResponse.message : 'Failed to initialize MFA setup.',
      });
    } finally {
      setIsMfaLoading(false);
    }
  };

  const handleConfirmMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.length !== 6) {
      setMfaFeedback({ type: 'error', text: 'Please enter a valid 6-digit verification code.' });
      return;
    }

    try {
      setIsActivatingMfa(true);
      setMfaFeedback(null);
      await apiClient('/auth/mfa/enable', {
        method: 'POST',
        body: JSON.stringify({ code: mfaCode.trim() }),
      });
      setMfaFeedback({ type: 'success', text: 'Two-Factor Authentication (2FA) is now active and protecting your account!' });
      setMfaSetupData(null);
      await fetchMfaStatus();
    } catch (err) {
      setMfaFeedback({
        type: 'error',
        text: err instanceof ApiClientError ? err.errorResponse.message : 'Invalid verification code. Please check your authenticator app.',
      });
    } finally {
      setIsActivatingMfa(false);
    }
  };

  const handleDisableMfa = async () => {
    try {
      setIsDisablingMfa(true);
      setMfaFeedback(null);
      await apiClient('/auth/mfa/disable', {
        method: 'POST',
        body: JSON.stringify({ password: disablePassword || undefined }),
      });
      setMfaFeedback({ type: 'success', text: 'Two-Factor Authentication has been disabled.' });
      setShowDisableModal(false);
      setDisablePassword('');
      await fetchMfaStatus();
    } catch (err) {
      setMfaFeedback({
        type: 'error',
        text: err instanceof ApiClientError ? err.errorResponse.message : 'Failed to disable MFA.',
      });
    } finally {
      setIsDisablingMfa(false);
    }
  };

  const copyToClipboard = (text: string, type: 'secret' | 'backup') => {
    navigator.clipboard.writeText(text);
    if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedBackupCodes(true);
      setTimeout(() => setCopiedBackupCodes(false), 2000);
    }
  };

  const downloadBackupCodes = () => {
    if (!mfaSetupData?.backupCodes) return;
    const blob = new Blob([
      `KALPAK SOLUTIONS - EMERGENCY RECOVERY BACKUP CODES\n` +
      `Date Generated: ${new Date().toISOString()}\n\n` +
      `Keep these codes safe. Each code can only be used once if you lose access to your authenticator app.\n\n` +
      mfaSetupData.backupCodes.join('\n')
    ], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kalpak-backup-codes-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setFeedbackMsg(null);
      await apiClient('/tenants/policy', {
        method: 'PATCH',
        body: JSON.stringify({
          businessType,
          purposeOfUse,
          allowCustomerToRaise,
          allowEmployeeOnBehalf,
          assignmentStrategy,
          closureAuthority,
          tolerableOpenDays: Number(tolerableOpenDays),
          notificationChannels,
          platformAccess,
          pushNotifications,
        }),
      });

      setFeedbackMsg({ type: 'success', text: 'Operational policy and routing matrix saved successfully' });
      await fetchPolicy();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save policy' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {activeTab === 'policy' ? 'Tenant Policy & Routing Matrix' : 'Security & Multi-Factor Authentication'}
            </h1>
            <span className="bg-blue-50 text-blue-700 text-xs font-mono font-semibold px-2 py-0.5 rounded border border-blue-200">
              {activeTab === 'policy' ? 'SLA & Rules' : '2FA / TOTP'}
            </span>
          </div>
          {policy && (
            <div className="text-xs font-medium text-slate-500 flex items-center gap-2">
              <span>Quota: <strong className="text-slate-800">{policy.maxUsersQuota} users</strong></span>
              <span>•</span>
              <span>Subscribed: <strong className="text-slate-800">{new Date(policy.subscriptionStartsAt).toLocaleDateString()}</strong></span>
            </div>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-1">
          {activeTab === 'policy'
            ? 'Configure business scope, assignment strategy, tolerable open period thresholds, and ticket closure permissions.'
            : 'Protect your administrator account with Time-based One-Time Password (TOTP) authenticator apps and emergency recovery codes.'}
        </p>
      </div>

      {/* Settings Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('policy')}
          className={`px-4 py-2.5 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'policy'
              ? 'text-orange-600 border-orange-600'
              : 'text-slate-600 hover:text-slate-900 border-transparent'
          }`}
        >
          <Settings className="w-4 h-4" />
          Policy & SLAs
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2.5 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'security'
              ? 'text-orange-600 border-orange-600'
              : 'text-slate-600 hover:text-slate-900 border-transparent'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Security & 2FA</span>
          {mfaStatus?.mfaEnabled ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          )}
        </button>
        <Link
          href="/dashboard/settings/email-configuration"
          className="px-4 py-2.5 text-slate-600 hover:text-slate-900 border-b-2 border-transparent transition-colors flex items-center gap-2"
        >
          <Mail className="w-4 h-4" />
          Email Configuration
        </Link>
      </div>

      {/* Feedback Alert for Policy */}
      {activeTab === 'policy' && feedbackMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm animate-in fade-in-50 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {activeTab === 'policy' ? (
        isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Business Operations Scope */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-600" />
                <span>Business Scope & Intake Permissions</span>
              </CardTitle>
              <CardDescription>
                Define operational domain mode and specify who can initiate service calls.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  id="business-type"
                  label="Operational Domain Mode"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  options={[
                    { value: 'SERVICE', label: 'Service Only (Repair & Maintenance)' },
                    { value: 'PRODUCT', label: 'Product Only (Equipment Warranty)' },
                    { value: 'BOTH', label: 'Both (Products & Service Calls)' },
                  ]}
                />

                <Select
                  id="purpose-use"
                  label="Purpose of Use"
                  value={purposeOfUse}
                  onChange={(e) => setPurposeOfUse(e.target.value)}
                  options={[
                    { value: 'INTERNAL', label: 'Internal Operations Only' },
                    { value: 'EXTERNAL', label: 'External Customer Support Only' },
                    { value: 'BOTH', label: 'Both (Internal & Customer Facing)' },
                  ]}
                />
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100">
                <Checkbox
                  id="allow-client-raise"
                  label="Allow client customers to raise tickets directly via Customer Portal"
                  checked={allowCustomerToRaise}
                  onChange={(e) => setAllowCustomerToRaise(e.target.checked)}
                />
                <Checkbox
                  id="allow-emp-on-behalf"
                  label="Allow support employees to log tickets on behalf of customers"
                  checked={allowEmployeeOnBehalf}
                  onChange={(e) => setAllowEmployeeOnBehalf(e.target.checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Ticket Assignment & Routing Strategy */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Ticket Assignment & Allocation Engine</span>
              </CardTitle>
              <CardDescription>
                Specify how new incoming service calls are dispatched to technicians.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                id="assign-strategy"
                label="Dispatch / Allocation Strategy"
                value={assignmentStrategy}
                onChange={(e) => setAssignmentStrategy(e.target.value)}
                options={[
                  {
                    value: 'MANUAL_DEPT_HEAD',
                    label: 'Manual Allocation (Reviewed & assigned by Department Head)',
                  },
                  {
                    value: 'AUTO_SKILLS',
                    label: 'Auto-Assign (Role, Department & Skill Competency matching)',
                  },
                  {
                    value: 'AUTO_ROUND_ROBIN',
                    label: 'Equal Distribution (Round-Robin to least busy technician)',
                  },
                ]}
              />

              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-200/80 leading-relaxed">
                {assignmentStrategy === 'MANUAL_DEPT_HEAD' && (
                  <span>
                    Tickets land in the unassigned Department queue. The designated Department Head
                    reviews complexity and manually assigns the call to a field engineer.
                  </span>
                )}
                {assignmentStrategy === 'AUTO_SKILLS' && (
                  <span>
                    System automatically matches the product category and required expertise with technician skill
                    tags (e.g., PLC, VFDs, Hydraulics) for instant assignment.
                  </span>
                )}
                {assignmentStrategy === 'AUTO_ROUND_ROBIN' && (
                  <span>
                    Tickets are evenly distributed among available support engineers to prevent technician burnout
                    and maintain equal workload.
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 3: SLA Aging & Closure Authority */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>SLA Aging & Closure Policy</span>
              </CardTitle>
              <CardDescription>
                Enforce "Tolerable Ticket Open" threshold and govern who can officially resolve tickets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  id="tolerable-days"
                  type="number"
                  label="'Tolerable Ticket Open' Period (Days)"
                  required
                  value={tolerableOpenDays}
                  onChange={(e) => setTolerableOpenDays(Number(e.target.value))}
                  min={1}
                  max={90}
                  helperText="Tickets remaining unclosed beyond this threshold trigger automated escalations"
                />

                <Select
                  id="closure-authority"
                  label="Ticket Can Be Closed By"
                  value={closureAuthority}
                  onChange={(e) => setClosureAuthority(e.target.value)}
                  options={[
                    { value: 'SUPPORT_EMPLOYEE', label: 'Support Employee / Technician' },
                    { value: 'CLIENT', label: 'Client / Customer Only' },
                    { value: 'ADMIN', label: 'Client Admin Only' },
                    { value: 'DEPT_HEAD', label: 'Department Head Only' },
                    { value: 'ANYONE', label: 'Anyone (Technician, Customer, or Admin)' },
                  ]}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Notifications & Multi-Channel Delivery */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                <span>Channels & Device Delivery</span>
              </CardTitle>
              <CardDescription>
                Configure real-time notifications for technician assignment and customer status updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  id="notif-channels"
                  label="Notification Delivery Channels"
                  value={notificationChannels}
                  onChange={(e) => setNotificationChannels(e.target.value)}
                  options={[
                    { value: 'EMAIL', label: 'Email Only' },
                    { value: 'WHATSAPP', label: 'WhatsApp Only' },
                    { value: 'BOTH', label: 'Both (Email + WhatsApp)' },
                    { value: 'NONE', label: 'None (In-App Only)' },
                  ]}
                />

                <Select
                  id="platform-access"
                  label="Supported Device Access"
                  value={platformAccess}
                  onChange={(e) => setPlatformAccess(e.target.value)}
                  options={[
                    { value: 'WEB', label: 'Web Browser Only' },
                    { value: 'MOBILE', label: 'Mobile App Only' },
                    { value: 'BOTH', label: 'Both (Web + Mobile Responsive)' },
                  ]}
                />
              </div>

              <div className="pt-2">
                <Checkbox
                  id="push-notifs"
                  label="Enable browser & mobile push notifications on assignment and status updates"
                  checked={pushNotifications}
                  onChange={(e) => setPushNotifications(e.target.checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Bar */}
          <div className="flex items-center justify-between p-4 bg-slate-100 rounded-xl">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Policies are enforced in real-time across all ticket lifecycles</span>
            </div>
            <Button type="submit" isLoading={isSaving} className="bg-blue-600 hover:bg-blue-700">
              Save Policy Matrix
            </Button>
          </div>
        </form>
      )
    ) : (
      /* Security & Two-Factor Authentication (2FA / MFA) Tab */
        <div className="space-y-6 animate-in fade-in-50">
          {/* MFA Feedback Alert */}
          {mfaFeedback && (
            <div
              className={`p-4 rounded-xl border flex items-center gap-3 text-sm animate-in fade-in-50 ${
                mfaFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-red-50 text-red-900 border-red-200'
              }`}
            >
              {mfaFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <span>{mfaFeedback.text}</span>
            </div>
          )}

          {/* Current 2FA Status Card */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                      mfaStatus?.mfaEnabled
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : 'bg-amber-50 text-amber-600 border-amber-200'
                    }`}
                  >
                    {mfaStatus?.mfaEnabled ? (
                      <ShieldCheck className="w-6 h-6" />
                    ) : (
                      <ShieldAlert className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>Two-Factor Authentication (TOTP / 2FA)</span>
                      {mfaStatus?.mfaEnabled ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Active & Protected
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          Inactive / Recommended
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      {mfaStatus?.mfaEnabled
                        ? 'Your account requires a 6-digit TOTP code from your authenticator app at each sign in.'
                        : 'Add an extra layer of security to prevent unauthorized access even if your password is compromised.'}
                    </CardDescription>
                  </div>
                </div>

                <div>
                  {mfaStatus?.mfaEnabled ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDisableModal(true)}
                      className="border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold"
                    >
                      <Lock className="w-3.5 h-3.5 mr-1.5" />
                      Disable 2FA
                    </Button>
                  ) : !mfaSetupData ? (
                    <Button
                      type="button"
                      onClick={handleStartMfaSetup}
                      isLoading={isMfaLoading}
                      className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold shadow-md shadow-orange-500/20"
                    >
                      <Smartphone className="w-3.5 h-3.5 mr-1.5" />
                      Setup 2FA Authenticator
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {mfaStatus?.mfaEnabled ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                    <div className="space-y-1">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4 text-orange-600" />
                        <span>Emergency Recovery Backup Codes</span>
                      </div>
                      <p className="text-slate-500">
                        {mfaStatus.backupCodesRemaining > 0
                          ? `You have ${mfaStatus.backupCodesRemaining} single-use recovery codes remaining in reserve.`
                          : 'You have no recovery backup codes remaining. If you lose your phone, contact support.'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleStartMfaSetup}
                      isLoading={isMfaLoading}
                      className="text-xs shrink-0 font-bold"
                    >
                      Regenerate New Codes
                    </Button>
                  </div>
                </div>
              ) : !mfaSetupData ? (
                <div className="space-y-4 text-xs text-slate-600">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50">
                      <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-center leading-5 text-[10px] font-black">1</span>
                        <span>Authenticator App</span>
                      </div>
                      <p className="text-slate-500">Works with Google Authenticator, Microsoft Authenticator, 1Password, or Authy.</p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50">
                      <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-center leading-5 text-[10px] font-black">2</span>
                        <span>Emergency Backup</span>
                      </div>
                      <p className="text-slate-500">Receive 8 single-use emergency codes to access your account if your device is unavailable.</p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50">
                      <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-center leading-5 text-[10px] font-black">3</span>
                        <span>Enterprise Standard</span>
                      </div>
                      <p className="text-slate-500">RFC 6238 TOTP algorithm compliant. Encrypted securely with AES-256 at rest.</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* MFA Setup Wizard (When initiated) */}
          {mfaSetupData && (
            <Card className="border-orange-200 shadow-md shadow-orange-500/5 bg-gradient-to-b from-white to-orange-50/20">
              <CardHeader className="border-b border-orange-100 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-orange-600" />
                      <span>Setup Two-Factor Authenticator</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      Scan the QR code below or enter the key manually into your authenticator app.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMfaSetupData(null)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 pt-6">
                {/* Step 1: Scan QR Code */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mfaSetupData.qrCode}
                      alt="Two-Factor QR Code"
                      className="w-48 h-48 rounded-lg"
                    />
                    <span className="text-[11px] text-slate-400 mt-2">Scan with Google Authenticator or Authy</span>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Can&apos;t scan the QR code?
                    </div>
                    <p className="text-xs text-slate-500">
                      Enter this secret key manually into your authenticator app instead:
                    </p>
                    <div className="p-3 bg-slate-100 rounded-xl font-mono text-xs font-bold text-slate-800 break-all select-all flex items-center justify-between gap-2 border border-slate-200">
                      <span>{mfaSetupData.secret}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(mfaSetupData.secret, 'secret')}
                        className="text-orange-600 hover:text-orange-700 shrink-0 font-sans text-xs font-bold flex items-center gap-1"
                      >
                        {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSecret ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Account: <strong className="text-slate-700">Kalpak Solutions</strong> • Type: Time-based (30s)
                    </div>
                  </div>
                </div>

                {/* Step 2: Emergency Recovery Backup Codes */}
                <div className="space-y-3 pt-4 border-t border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4 text-orange-600" />
                        <span>Emergency Recovery Backup Codes</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Save these 8 single-use codes now. They can restore access if you ever lose your phone.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(mfaSetupData.backupCodes.join('\n'), 'backup')}
                        className="text-xs h-8"
                      >
                        {copiedBackupCodes ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                        <span>{copiedBackupCodes ? 'Copied All' : 'Copy All'}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={downloadBackupCodes}
                        className="text-xs h-8"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        <span>Download (.txt)</span>
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {mfaSetupData.backupCodes.map((code, idx) => (
                      <div
                        key={idx}
                        className="text-center font-mono text-xs font-bold text-slate-800 bg-white py-1.5 px-2 rounded-lg border border-slate-200/80"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Step 3: Enter 6-digit Code to Confirm */}
                <form onSubmit={handleConfirmMfa} className="space-y-4 pt-4 border-t border-slate-200/80">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 mb-1">
                      Verify & Activate Two-Factor Authentication
                    </h4>
                    <p className="text-xs text-slate-500 mb-3">
                      Enter the 6-digit code currently generated by your authenticator app to verify setup.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <Input
                        id="mfa-verify-code"
                        type="text"
                        maxLength={6}
                        autoFocus
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-full sm:w-48 text-center font-mono text-xl font-bold tracking-widest h-11"
                        required
                      />
                      <Button
                        type="submit"
                        isLoading={isActivatingMfa}
                        className="w-full sm:w-auto h-11 px-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold shadow-md shadow-orange-500/20"
                      >
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Confirm & Activate 2FA
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Disable 2FA Modal */}
          {showDisableModal && (
            <Dialog
              isOpen={showDisableModal}
              onClose={() => {
                setShowDisableModal(false);
                setDisablePassword('');
              }}
              title="Disable Two-Factor Authentication"
              description="Are you sure you want to remove two-factor protection from your account?"
            >
              <div className="space-y-4 pt-2">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Disabling Two-Factor Authentication reduces your account security. Anyone with your password will be able to access this workspace.
                  </span>
                </div>

                <div>
                  <Input
                    id="disable-pass"
                    type="password"
                    label="Confirm Account Password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    placeholder="Enter your current password"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowDisableModal(false);
                      setDisablePassword('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleDisableMfa}
                    isLoading={isDisablingMfa}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold"
                  >
                    Confirm & Disable 2FA
                  </Button>
                </div>
              </div>
            </Dialog>
          )}
        </div>
      )}
    </div>
  );
}
