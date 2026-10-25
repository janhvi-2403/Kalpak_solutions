'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiClient, ApiClientError } from '@/lib/api-client';
import {
  Mail,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Star,
  Power,
  RefreshCw,
  Info,
  ShieldCheck,
  Settings,
  Layers,
  SlidersHorizontal,
  ExternalLink,
  Shield,
  Zap,
  KeyRound,
  Check,
  Send,
  ArrowRight,
  Copy,
  LogOut,
  Inbox,
} from 'lucide-react';
import {
  Button,
  Input,
  Dialog,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui';
import {
  SupportEmailVerificationStatus,
} from '@kalpak/types';

// ==================== Interfaces ====================

interface SupportEmailItem {
  id: string;
  tenantId: string;
  email: string;
  displayName: string;
  isDefault: boolean;
  isActive: boolean;
  verificationStatus: SupportEmailVerificationStatus;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  id?: string;
  email: string;
  displayName: string;
  isDefault: boolean;
  isActive: boolean;
}

interface InboundPolicyConfig {
  id?: string;
  supportEmail: string;
  enabled: boolean;
  autoCreateTicket: boolean;
  autoRoute: boolean;
  status: string;
}

interface InboundEmailAuditItem {
  id: string;
  fromEmail: string;
  fromName?: string;
  toEmail: string;
  subject: string;
  ticketId?: string;
  ticketNumber?: string;
  departmentName?: string;
  receivedAt: string;
  createdAt: string;
}

interface GmailConnectionState {
  isConnected: boolean;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'EXPIRED';
  emailAddress: string | null;
  lastSyncAt: string | null;
  provider: string;
}

interface IncomingConfigState {
  method: string;
  inboundAddress: string;
  dedicatedInboundAddress?: string;
  cloudmailinBridgeAddress?: string;
  tenantSlug?: string;
  status: string;
}

const initialFormState: FormState = {
  email: '',
  displayName: '',
  isDefault: false,
  isActive: true,
};

export default function EmailConfigurationPage() {
  const searchParams = useSearchParams();

  // Automated Inbound Channels State (Option 1 & Option 2)
  const [incomingConfig, setIncomingConfig] = useState<IncomingConfigState | null>(null);
  const [gmailConnection, setGmailConnection] = useState<GmailConnectionState>({
    isConnected: false,
    status: 'DISCONNECTED',
    emailAddress: null,
    lastSyncAt: null,
    provider: 'GMAIL',
  });
  const [isConnectingGmail, setIsConnectingGmail] = useState<boolean>(false);
  const [isDisconnectingGmail, setIsDisconnectingGmail] = useState<boolean>(false);
  const [isSyncingGmail, setIsSyncingGmail] = useState<boolean>(false);
  const [copiedInbound, setCopiedInbound] = useState<boolean>(false);

  // Support Email State
  const [emails, setEmails] = useState<SupportEmailItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Inbound Intake & Routing Policy State (shifted from Configuration tab)
  const [policyConfig, setPolicyConfig] = useState<InboundPolicyConfig>({
    supportEmail: '',
    enabled: true,
    autoCreateTicket: true,
    autoRoute: true,
    status: 'ACTIVE',
  });
  const [isSavingPolicy, setIsSavingPolicy] = useState<boolean>(false);
  const [recentInboundEmails, setRecentInboundEmails] = useState<InboundEmailAuditItem[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState<boolean>(false);

  // Email Query Simulation State (In-app ticket generator)
  const [simSenderEmail, setSimSenderEmail] = useState<string>('customer@acme-corp.com');
  const [simSenderName, setSimSenderName] = useState<string>('Rajesh Kumar');
  const [simSubject, setSimSubject] = useState<string>('Emergency: Conveyor Motor Overheating on Line #2');
  const [simBody, setSimBody] = useState<string>('Our assembly line conveyor motor is running abnormally hot and tripping the circuit breaker. Need immediate maintenance technician visit.');
  const [simToEmail, setSimToEmail] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<{
    ticketNumber?: string;
    ticketId?: string;
    status: string;
    message: string;
  } | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  // Support Email Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [formErrors, setFormErrors] = useState<{ email?: string; displayName?: string }>({});

  // Real-Time Verification Modal State
  const [verifyingCandidate, setVerifyingCandidate] = useState<SupportEmailItem | null>(null);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isConfirmingCode, setIsConfirmingCode] = useState<boolean>(false);
  const [isInstantVerifying, setIsInstantVerifying] = useState<boolean>(false);
  const [isResendingCode, setIsResendingCode] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [verificationSuccess, setVerificationSuccess] = useState<boolean>(false);

  // Delete confirmation modal state
  const [deleteCandidate, setDeleteCandidate] = useState<SupportEmailItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Status toggle in progress tracking
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Real-time Polling: Check status while verification modal is open
  const candidateIdRef = useRef<string | null>(null);
  candidateIdRef.current = verifyingCandidate?.id || null;

  useEffect(() => {
    if (!verifyingCandidate || verificationSuccess) return;

    const interval = setInterval(async () => {
      const currentId = candidateIdRef.current;
      if (!currentId) return;

      try {
        const item = await apiClient<SupportEmailItem>(`/tenants/support-emails/${currentId}`);
        if (item && item.verificationStatus === SupportEmailVerificationStatus.VERIFIED) {
          setVerificationSuccess(true);
          fetchSupportEmails();
        }
      } catch {
        // Polling failure is non-blocking
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [verifyingCandidate, verificationSuccess]);

  // ==================== Data Fetching ====================

  const fetchSupportEmails = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient<SupportEmailItem[]>('/tenants/support-emails');
      setEmails(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err instanceof ApiClientError ? err.message : 'Failed to fetch support email addresses',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchInboundIntegration = useCallback(async () => {
    setIsLoadingEmails(true);
    try {
      const [res, incomingRes, gmailStatus] = await Promise.all([
        apiClient<{
          emailConfig?: InboundPolicyConfig;
          recentInboundEmails?: InboundEmailAuditItem[];
        }>('/tenants/email-config').catch(() => null),
        apiClient<IncomingConfigState>('/tenants/email-config/incoming').catch(() => null),
        apiClient<GmailConnectionState>('/email-integration/gmail/status').catch(() => null),
      ]);

      if (res?.emailConfig) {
        setPolicyConfig(res.emailConfig);
      }
      if (Array.isArray(res?.recentInboundEmails)) {
        setRecentInboundEmails(res.recentInboundEmails);
      }
      if (incomingRes) {
        setIncomingConfig(incomingRes);
      }
      if (gmailStatus) {
        setGmailConnection(gmailStatus);
      }
    } catch {
      // Non-blocking for email directory
    } finally {
      setIsLoadingEmails(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchSupportEmails(), fetchInboundIntegration()]);
  }, [fetchSupportEmails, fetchInboundIntegration]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Check URL params from Google OAuth callback
  useEffect(() => {
    const connectedParam = searchParams.get('connected');
    const emailParam = searchParams.get('email');
    const errorParam = searchParams.get('error');

    if (connectedParam === 'true') {
      setFeedback({
        type: 'success',
        message: `Gmail mailbox ${emailParam ? `(${emailParam}) ` : ''}connected successfully! Kalpak will now process incoming emails and replies automatically.`,
      });
    } else if (errorParam) {
      setFeedback({
        type: 'error',
        message: `Google Authorization Notice: ${decodeURIComponent(errorParam)}`,
      });
    }
  }, [searchParams]);

  // Automatically dismiss success feedback after 5 seconds
  useEffect(() => {
    if (feedback?.type === 'success') {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [feedback]);

  // Handle Connect / Reconnect Gmail (Google OAuth 2.0)
  const handleConnectGmail = async () => {
    try {
      setIsConnectingGmail(true);
      setFeedback(null);
      const res = await apiClient<{ authUrl: string }>('/email-integration/gmail/connect');
      if (res?.authUrl) {
        window.location.href = res.authUrl;
      } else {
        throw new Error('No authorization URL returned by server');
      }
    } catch (err: any) {
      setIsConnectingGmail(false);
      setFeedback({
        type: 'error',
        message: err?.message || 'Google OAuth is not configured on server (requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET).',
      });
    }
  };

  // Handle Disconnect Gmail
  const handleDisconnectGmail = async () => {
    if (!confirm('Are you sure you want to disconnect this Gmail mailbox? Automated email-to-ticket conversion will stop.')) {
      return;
    }

    try {
      setIsDisconnectingGmail(true);
      setFeedback(null);
      await apiClient('/email-integration/gmail/disconnect', { method: 'POST' });
      setFeedback({
        type: 'success',
        message: 'Gmail mailbox disconnected successfully.',
      });
      await fetchInboundIntegration();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed disconnecting Gmail',
      });
    } finally {
      setIsDisconnectingGmail(false);
    }
  };

  // Handle Manual Immediate Sync
  const handleSyncGmail = async () => {
    try {
      setIsSyncingGmail(true);
      setFeedback(null);
      const res = await apiClient<{ success: boolean; syncedCount: number }>(
        '/email-integration/gmail/sync',
        { method: 'POST' }
      );
      setFeedback({
        type: 'success',
        message: `Synced ${res?.syncedCount || 0} message(s) from your Gmail mailbox.`,
      });
      await fetchInboundIntegration();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed syncing Gmail mailbox',
      });
    } finally {
      setIsSyncingGmail(false);
    }
  };

  const handleCopyInbound = (address: string) => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopiedInbound(true);
    setTimeout(() => setCopiedInbound(false), 2500);
  };

  // ==================== Form Handlers ====================

  const openAddModal = () => {
    setIsEditMode(false);
    setFormData({
      ...initialFormState,
      isDefault: emails.length === 0,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (item: SupportEmailItem) => {
    setIsEditMode(true);
    setFormData({
      id: item.id,
      email: item.email,
      displayName: item.displayName,
      isDefault: item.isDefault,
      isActive: item.isActive,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: { email?: string; displayName?: string } = {};

    if (!formData.email.trim()) {
      errors.email = 'Support email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email address';
    }

    if (!formData.displayName.trim()) {
      errors.displayName = 'Display name is required';
    } else if (formData.displayName.trim().length > 150) {
      errors.displayName = 'Display name cannot exceed 150 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (isEditMode && formData.id) {
        await apiClient<SupportEmailItem>(`/tenants/support-emails/${formData.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            email: formData.email.trim().toLowerCase(),
            displayName: formData.displayName.trim(),
            isDefault: formData.isDefault,
            isActive: formData.isActive,
          }),
        });

        setFeedback({
          type: 'success',
          message: `Support email "${formData.email.trim().toLowerCase()}" updated successfully.`,
        });
        setIsModalOpen(false);
        await fetchSupportEmails();
      } else {
        const created = await apiClient<SupportEmailItem>('/tenants/support-emails', {
          method: 'POST',
          body: JSON.stringify({
            email: formData.email.trim().toLowerCase(),
            displayName: formData.displayName.trim(),
            isDefault: formData.isDefault,
            isActive: formData.isActive,
          }),
        });

        setIsModalOpen(false);
        await fetchSupportEmails();

        // Immediately open Real-Time Verification modal for the newly added address!
        openVerificationModal(created);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err instanceof ApiClientError ? err.message : 'Failed to save support email',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== Actions ====================

  const handleSetDefault = async (item: SupportEmailItem) => {
    if (item.isDefault) return;

    setSettingDefaultId(item.id);
    try {
      await apiClient<SupportEmailItem>(`/tenants/support-emails/${item.id}/set-default`, {
        method: 'PATCH',
      });
      setFeedback({
        type: 'success',
        message: `"${item.displayName}" (${item.email}) is now the default support email.`,
      });
      await fetchSupportEmails();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err instanceof ApiClientError ? err.message : 'Failed to set default support email',
      });
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleToggleStatus = async (item: SupportEmailItem) => {
    setTogglingId(item.id);
    try {
      const updatedStatus = !item.isActive;
      await apiClient<SupportEmailItem>(`/tenants/support-emails/${item.id}/toggle-status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: updatedStatus }),
      });
      setFeedback({
        type: 'success',
        message: `Support email "${item.email}" is now ${updatedStatus ? 'active' : 'inactive'}.`,
      });
      await fetchSupportEmails();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err instanceof ApiClientError ? err.message : 'Failed to update status',
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;

    setIsDeleting(true);
    try {
      await apiClient(`/tenants/support-emails/${deleteCandidate.id}`, {
        method: 'DELETE',
      });
      setFeedback({
        type: 'success',
        message: `Support email "${deleteCandidate.email}" deleted successfully.`,
      });
      setDeleteCandidate(null);
      await fetchSupportEmails();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof ApiClientError ? err.message : 'Failed to delete support email',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // ==================== Real-Time Verification Handlers ====================

  const openVerificationModal = (item: SupportEmailItem) => {
    setVerifyingCandidate(item);
    setVerificationCode('');
    setVerificationError(null);
    setVerificationSuccess(item.verificationStatus === SupportEmailVerificationStatus.VERIFIED);
    setResendCooldown(0);
  };

  const handleConfirmCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingCandidate) return;

    const code = verificationCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setVerificationError('Please enter a valid 6-digit numeric verification code.');
      return;
    }

    setIsConfirmingCode(true);
    setVerificationError(null);

    try {
      await apiClient(`/tenants/support-emails/${verifyingCandidate.id}/confirm-code`, {
        method: 'POST',
        body: JSON.stringify({ code }),
      });

      setVerificationSuccess(true);
      await fetchSupportEmails();
      setFeedback({
        type: 'success',
        message: `Support email "${verifyingCandidate.email}" verified and activated successfully!`,
      });
    } catch (err: any) {
      setVerificationError(
        err instanceof ApiClientError
          ? err.message
          : err?.message || 'Invalid or expired verification code. Please try again.'
      );
    } finally {
      setIsConfirmingCode(false);
    }
  };

  const handleResendCode = async () => {
    if (!verifyingCandidate || resendCooldown > 0) return;

    setIsResendingCode(true);
    setVerificationError(null);

    try {
      const res = await apiClient<{ message?: string }>(`/tenants/support-emails/${verifyingCandidate.id}/resend`, {
        method: 'POST',
      });
      setResendCooldown(60);
      setFeedback({
        type: 'success',
        message: res?.message || `A fresh 6-digit verification code has been dispatched to ${verifyingCandidate.email}.`,
      });
    } catch (err: any) {
      setVerificationError(
        err instanceof ApiClientError
          ? err.message
          : err?.message || 'Failed to resend verification code. Please wait before retrying.'
      );
    } finally {
      setIsResendingCode(false);
    }
  };

  const handleInstantVerify = async (candidate?: SupportEmailItem) => {
    const target = candidate || verifyingCandidate;
    if (!target) return;

    setIsInstantVerifying(true);
    setVerificationError(null);

    try {
      await apiClient(`/tenants/support-emails/${target.id}/instant-verify`, {
        method: 'POST',
      });

      setVerificationSuccess(true);
      await fetchSupportEmails();
      setFeedback({
        type: 'success',
        message: `Support email "${target.email}" verified instantly in real time! Real-time ticket ingestion is active.`,
      });

      // If modal was not open (table click), open modal in success state or close
      if (!verifyingCandidate) {
        setVerifyingCandidate(target);
      }
    } catch (err: any) {
      const msg = err instanceof ApiClientError ? err.message : err?.message || 'Failed to instant-verify email.';
      setVerificationError(msg);
      setFeedback({
        type: 'error',
        message: msg,
      });
    } finally {
      setIsInstantVerifying(false);
    }
  };

  // ==================== Intake Policy Handlers ====================

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPolicy(true);
    setFeedback(null);

    const defaultAddress = emails.find((e) => e.isDefault)?.email || emails[0]?.email || policyConfig.supportEmail;

    try {
      const updated = await apiClient<InboundPolicyConfig>('/tenants/email-config', {
        method: 'PUT',
        body: JSON.stringify({
          supportEmail: defaultAddress || 'support@yourdomain.com',
          enabled: policyConfig.enabled,
          autoCreateTicket: policyConfig.autoCreateTicket,
          autoRoute: policyConfig.autoRoute,
        }),
      });

      setPolicyConfig(updated);
      setFeedback({
        type: 'success',
        message: 'Inbound email intake and routing policies updated successfully!',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err instanceof ApiClientError ? err.message : (err.message || 'Failed to save intake policies'),
      });
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const handleSimulateEmailQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simSenderEmail.trim() || !simSubject.trim() || !simBody.trim()) {
      setSimError('Please fill in customer sender email, query subject, and description.');
      return;
    }

    try {
      setIsSimulating(true);
      setSimError(null);
      setSimResult(null);

      const targetTo = simToEmail.trim() || emails.find((e) => e.isDefault)?.email || emails[0]?.email || policyConfig.supportEmail;

      const res = await apiClient<{
        success: boolean;
        status: string;
        ticketId?: string;
        ticketNumber?: string;
        message: string;
      }>('/tenants/email-config/incoming/simulate-query', {
        method: 'POST',
        body: JSON.stringify({
          fromEmail: simSenderEmail.trim(),
          fromName: simSenderName.trim() || undefined,
          subject: simSubject.trim(),
          bodyText: simBody.trim(),
          toEmail: targetTo || undefined,
        }),
      });

      if (res.success && res.ticketNumber) {
        setSimResult({
          ticketNumber: res.ticketNumber,
          ticketId: res.ticketId,
          status: res.status,
          message: res.message,
        });
        await fetchInboundIntegration();
      } else {
        setSimError(res.message || 'Email processed but ticket was not generated. Check tenant intake policies.');
      }
    } catch (err: any) {
      setSimError(err instanceof Error ? err.message : 'Failed to simulate email query');
    } finally {
      setIsSimulating(false);
    }
  };

  // ==================== Computed Metrics ====================

  const metrics = useMemo(() => {
    const total = emails.length;
    const active = emails.filter((e) => e.isActive).length;
    const verified = emails.filter(
      (e) => e.verificationStatus === SupportEmailVerificationStatus.VERIFIED
    ).length;
    const defaultItem = emails.find((e) => e.isDefault);
    return { total, active, verified, defaultItem };
  }, [emails]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <Mail className="w-6 h-6 text-orange-600" />
              Email Configuration
            </h1>
            <Badge variant="primary" className="text-xs font-semibold">
              Client Admin
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Configure primary support mailboxes, automated ticket intake policies, and monitor real-time email ingestion.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={refreshAll}
            disabled={isLoading || isLoadingEmails}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading || isLoadingEmails ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={openAddModal} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="w-4 h-4" />
            Add Support Email
          </Button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200 text-sm font-semibold">
        <Link
          href="/dashboard/configuration"
          className="px-4 py-2.5 text-slate-600 hover:text-slate-900 border-b-2 border-transparent transition-colors flex items-center gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Configuration
        </Link>
        <Link
          href="/dashboard/settings/email-configuration"
          className="px-4 py-2.5 text-orange-600 border-b-2 border-orange-600 transition-colors flex items-center gap-2"
        >
          <Mail className="w-4 h-4" />
          Email Configuration
        </Link>
        <Link
          href="/dashboard/settings"
          className="px-4 py-2.5 text-slate-600 hover:text-slate-900 border-b-2 border-transparent transition-colors flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Policy &amp; SLAs
        </Link>
      </div>

      {/* Feedback Alert Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-sm animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{feedback.type === 'success' ? 'Success' : 'Notice'}</p>
              <p className="mt-0.5">{feedback.message}</p>
            </div>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-semibold p-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Support Addresses
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{metrics.total}</p>
          <p className="text-xs text-slate-500 mt-1">Configured for your organization</p>
        </Card>

        <Card className="p-5 border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Inboxes
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Power className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{metrics.active}</p>
          <p className="text-xs text-slate-500 mt-1">Ready to receive customer communications</p>
        </Card>

        <Card className="p-5 border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Verified Addresses
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{metrics.verified}</p>
          <p className="text-xs text-slate-500 mt-1">
            {metrics.defaultItem ? `Default: ${metrics.defaultItem.email}` : 'No default email set'}
          </p>
        </Card>
      </div>

      {/* ======================================================== */}
      {/* AUTOMATED INBOUND CHANNELS (OPTION 1 & OPTION 2)          */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Option 1: Built-in Dedicated Inbound Address */}
        <Card className="border-orange-200 bg-gradient-to-br from-white via-orange-50/20 to-white shadow-sm overflow-hidden flex flex-col justify-between">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="neutral" className="bg-orange-100/80 text-orange-800 border-orange-300 font-bold text-[11px] px-2.5 py-0.5">
                Option 1 • Instant &amp; Zero-Config
              </Badge>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active &amp; Ready
              </span>
            </div>
            <CardTitle className="text-base font-bold text-slate-900 mt-3 flex items-center gap-2">
              <Mail className="w-5 h-5 text-orange-600" />
              Built-in Dedicated Inbound Address
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Your organization&apos;s pre-configured Kalpak inbound address. Customers who email this address automatically generate tickets with zero setup required.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-4">
            <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between gap-3 shadow-inner">
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-orange-400 block font-bold">
                  Customer Inbound Address
                </span>
                <p className="font-mono text-sm font-semibold text-white truncate selection:bg-orange-600">
                  {incomingConfig?.dedicatedInboundAddress || `${policyConfig?.supportEmail?.split('@')[0] || 'support'}@inbound.kalpak.solutions`}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  handleCopyInbound(
                    incomingConfig?.dedicatedInboundAddress ||
                      `${policyConfig?.supportEmail?.split('@')[0] || 'support'}@inbound.kalpak.solutions`
                  )
                }
                className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shrink-0 gap-1.5"
              >
                {copiedInbound ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
            <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-100 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-orange-600" />
                Zero Technical Setup
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Provide this email address on your invoices, website contact page, or client portal. Any incoming query creates a live ticket in your Ticket Management dashboard immediately.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Option 2: 1-Click Connect with Google Workspace / Gmail */}
        <Card className="border-blue-200 bg-gradient-to-br from-white via-blue-50/20 to-white shadow-sm overflow-hidden flex flex-col justify-between">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="neutral" className="bg-blue-100/80 text-blue-800 border-blue-300 font-bold text-[11px] px-2.5 py-0.5">
                Option 2 • 1-Click Frontend OAuth
              </Badge>
              {gmailConnection.isConnected ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  Not Connected
                </span>
              )}
            </div>
            <CardTitle className="text-base font-bold text-slate-900 mt-3 flex items-center gap-2">
              <Inbox className="w-5 h-5 text-blue-600" />
              Connect with Google Workspace / Gmail
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Connect your company&apos;s official Google Workspace or Gmail support mailbox. All incoming customer inquiries and replies sync into tickets automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-4">
            {gmailConnection.isConnected ? (
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">
                      Authorized Support Mailbox
                    </span>
                    <p className="font-bold text-sm text-slate-900">
                      {gmailConnection.emailAddress || 'Connected Mailbox'}
                    </p>
                    {gmailConnection.lastSyncAt && (
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Last Synced: {new Date(gmailConnection.lastSyncAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleSyncGmail}
                      disabled={isSyncingGmail}
                      className="text-xs border-blue-200 text-blue-700 hover:bg-blue-100 gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGmail ? 'animate-spin' : ''}`} />
                      <span>{isSyncingGmail ? 'Syncing...' : 'Sync Now'}</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleDisconnectGmail}
                      disabled={isDisconnectingGmail}
                      className="text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 gap-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={handleConnectGmail}
                  disabled={isConnectingGmail}
                  className="w-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold shadow-sm py-2.5 flex items-center justify-center gap-2.5 transition-colors"
                >
                  {isConnectingGmail ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-600" />
                      <span>Redirecting to Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Connect Google Workspace / Gmail (1-Click)</span>
                    </>
                  )}
                </Button>
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    Official Google OAuth 2.0
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Authenticate once with Google. No forwarding rules or technical configurations required.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ======================================================== */}
      {/* 1. SUPPORT EMAIL DIRECTORY                                */}
      {/* ======================================================== */}
      <Card className="border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-600" />
              Support Email Directory
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage multiple support inboxes with real-time verification and role designations.
            </p>
          </div>

          <Button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Support Email
          </Button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading support email addresses...</p>
            <p className="text-xs text-slate-400 mt-1">Applying multi-tenant isolation context</p>
          </div>
        ) : emails.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Support Emails Configured</h3>
            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
              You haven&apos;t added any support email addresses for your organization yet. Add your primary support email to get started.
            </p>
            <Button
              onClick={openAddModal}
              className="mt-5 bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Add First Support Email
            </Button>
          </div>
        ) : (
          /* Emails Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Support Email</th>
                  <th className="py-3.5 px-6">Display Name</th>
                  <th className="py-3.5 px-6">Role / Default</th>
                  <th className="py-3.5 px-6">Active Status</th>
                  <th className="py-3.5 px-6">
                    <span className="flex items-center gap-1">
                      Verification Status
                      <span title="Real-time verified status" className="cursor-help">
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                      </span>
                    </span>
                  </th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {emails.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      item.isDefault ? 'bg-orange-50/20' : ''
                    }`}
                  >
                    {/* Support Email Address */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            item.isDefault
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                            {item.email}
                            {item.isDefault && (
                              <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-1.5 py-0.5 rounded">
                                PRIMARY
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            ID: {item.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Display Name */}
                    <td className="py-4 px-6">
                      <span className="font-medium text-slate-800">{item.displayName}</span>
                    </td>

                    {/* Default Status & Toggle */}
                    <td className="py-4 px-6">
                      {item.isDefault ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          Default Sender
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(item)}
                          disabled={settingDefaultId === item.id || !item.isActive}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-orange-600 hover:bg-orange-50 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-orange-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={!item.isActive ? 'Activate address first to make it default' : 'Click to make this the default address'}
                        >
                          <Star className="w-3.5 h-3.5" />
                          {settingDefaultId === item.id ? 'Setting...' : 'Set as Default'}
                        </button>
                      )}
                    </td>

                    {/* Active Status Switch */}
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        disabled={togglingId === item.id || item.verificationStatus !== SupportEmailVerificationStatus.VERIFIED}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
                          item.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        } ${item.verificationStatus !== SupportEmailVerificationStatus.VERIFIED ? 'opacity-60 cursor-not-allowed' : ''}`}
                        title={item.verificationStatus !== SupportEmailVerificationStatus.VERIFIED ? 'Verify email before activating' : 'Click to toggle active status'}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.isActive ? 'bg-emerald-600' : 'bg-slate-400'
                          }`}
                        />
                        {togglingId === item.id ? (
                          'Updating...'
                        ) : item.isActive ? (
                          'Active'
                        ) : (
                          'Inactive'
                        )}
                      </button>
                    </td>

                    {/* Verification Status with Real-Time Verification Actions */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.verificationStatus === SupportEmailVerificationStatus.VERIFIED ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Verified
                          </div>
                        ) : (
                          <>
                            <div
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"
                              title="Verification code pending"
                            >
                              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                              Pending Verification
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => openVerificationModal(item)}
                              className="h-7 px-2.5 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-sm flex items-center gap-1"
                            >
                              <KeyRound className="w-3 h-3" />
                              Verify Now
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleInstantVerify(item)}
                              className="h-7 px-2 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 flex items-center gap-1"
                              title="One-click instant verification"
                            >
                              <Zap className="w-3 h-3 text-emerald-600" />
                              Instant
                            </Button>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Support Email"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteCandidate(item)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Support Email"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info box on verification status */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              All email records are strictly isolated under Row-Level Security (RLS) and automatically bound to your tenant context.
            </span>
          </div>
          <span className="font-medium text-slate-400">Total: {emails.length} address{emails.length === 1 ? '' : 'es'}</span>
        </div>
      </Card>

      {/* ======================================================== */}
      {/* 2. AUTOMATED TICKET INTAKE & ROUTING POLICIES           */}
      {/* ======================================================== */}
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="p-6 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-orange-600" />
            Automated Ticket Intake &amp; Routing Policies
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Configure automated service ticket ingestion and intelligent keyword-based department routing for incoming emails.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSavePolicy} className="space-y-6">
            {/* Master Enable Intake Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="space-y-0.5">
                <label className="text-sm font-bold text-slate-900">Enable Inbound Email Support</label>
                <p className="text-xs text-slate-500">
                  When enabled, real customer emails to your verified support address create service tickets in real time.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={policyConfig.enabled}
                  onChange={(e) => setPolicyConfig({ ...policyConfig, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500" />
              </label>
            </div>

            {/* Automation Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Auto-Create Tickets</span>
                  <input
                    type="checkbox"
                    checked={policyConfig.autoCreateTicket}
                    onChange={(e) => setPolicyConfig({ ...policyConfig, autoCreateTicket: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                  />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  When enabled, incoming emails from new or registered customers automatically generate a service ticket with assigned tracking numbers.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Automatic Routing</span>
                  <input
                    type="checkbox"
                    checked={policyConfig.autoRoute}
                    onChange={(e) => setPolicyConfig({ ...policyConfig, autoRoute: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                  />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Auto-detects department (Maintenance, Electrical, Hydraulic, etc.) and priority based on email content keywords and registered assignment rules.
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                type="submit"
                disabled={isSavingPolicy}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 shadow-sm"
              >
                {isSavingPolicy ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Saving Policies...
                  </span>
                ) : (
                  'Save Intake Policies'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ======================================================== */}
      {/* 3. SIMULATE INBOUND EMAIL QUERY & TICKET CREATION       */}
      {/* ======================================================== */}
      <Card className="border-cyan-200 bg-gradient-to-br from-white to-cyan-50/30 shadow-sm overflow-hidden">
        <CardHeader className="p-6 border-b border-cyan-100 bg-white/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-600" />
                Simulate Inbound Email Query (Instant Ticket Generator)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Test sending a customer inquiry email to your support desk. A service ticket with Source: EMAIL will immediately be generated and displayed in your Ticket Section.
              </CardDescription>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200 self-start sm:self-auto">
              Live Inbound Pipeline
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {simResult && (
            <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                    <span>Ticket Generated Successfully!</span>
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-700 text-xs">
                      #{simResult.ticketNumber}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Your inquiry has been converted into a live support ticket. You can view all its details in the Ticket Section.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href="/dashboard/tickets">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm text-xs"
                  >
                    <span>View in Ticket Section</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {simError && (
            <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{simError}</span>
              </div>
              <button
                type="button"
                onClick={() => setSimError(null)}
                className="text-xs font-bold hover:underline opacity-80"
              >
                Dismiss
              </button>
            </div>
          )}

          <form onSubmit={handleSimulateEmailQuery} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer Email (From) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="email"
                  value={simSenderEmail}
                  onChange={(e) => setSimSenderEmail(e.target.value)}
                  placeholder="e.g. client@company.com"
                  required
                  className="bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer Name / Contact Person
                </label>
                <Input
                  type="text"
                  value={simSenderName}
                  onChange={(e) => setSimSenderName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="bg-white text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Query Subject <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  value={simSubject}
                  onChange={(e) => setSimSubject(e.target.value)}
                  placeholder="e.g. Motor overheating on Conveyor #2"
                  required
                  className="bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Recipient Support Address (To)
                </label>
                <Input
                  type="email"
                  value={simToEmail}
                  onChange={(e) => setSimToEmail(e.target.value)}
                  placeholder={emails[0]?.email || policyConfig.supportEmail || 'support@yourtenant.com'}
                  className="bg-white text-xs"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Defaults to your default verified support email if left blank.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Inquiry Description / Body <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={simBody}
                onChange={(e) => setSimBody(e.target.value)}
                rows={3}
                required
                placeholder="Describe the issue, symptoms, machine numbers, or question..."
                className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white placeholder:text-slate-400"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-cyan-100">
              <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-600" />
                Auto-provisions customer record, classifies department, and generates live ticket with Source: EMAIL.
              </span>

              <Button
                type="submit"
                disabled={isSimulating}
                className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-6 shadow-sm gap-2"
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Inbound Query...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Email Query &amp; Generate Ticket</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ======================================================== */}
      {/* 4. RECENT INBOUND EMAILS AUDIT TRAIL                    */}
      {/* ======================================================== */}
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              Recent Inbound Emails &amp; Ingestion Audit Trail
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Live record of customer emails received and converted to service tickets.
            </CardDescription>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {recentInboundEmails.length} {recentInboundEmails.length === 1 ? 'Record' : 'Records'}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingEmails ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-6 h-6 text-orange-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading recent inbound audit logs...</p>
            </div>
          ) : recentInboundEmails.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50">
              <Mail className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700">No Inbound Emails Processed Yet</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Customer emails received at your support address will automatically appear here with their linked service ticket number.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-6">Received</th>
                    <th className="py-3 px-6">From</th>
                    <th className="py-3 px-6">To</th>
                    <th className="py-3 px-6">Subject</th>
                    <th className="py-3 px-6">Routed Department</th>
                    <th className="py-3 px-6 text-right">Linked Ticket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentInboundEmails.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-6 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {new Date(item.receivedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-6">
                        <div className="font-semibold text-slate-900">{item.fromName || item.fromEmail}</div>
                        {item.fromName && <div className="text-[10px] text-slate-400 font-mono">{item.fromEmail}</div>}
                      </td>
                      <td className="py-3 px-6 font-mono text-[11px] text-slate-600">
                        {item.toEmail}
                      </td>
                      <td className="py-3 px-6 font-medium text-slate-800 max-w-xs truncate">
                        {item.subject}
                      </td>
                      <td className="py-3 px-6">
                        {item.departmentName ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {item.departmentName}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-right">
                        {item.ticketNumber ? (
                          <Link
                            href={`/dashboard/tickets`}
                            className="inline-flex items-center gap-1 font-mono font-bold text-orange-600 hover:text-orange-700 hover:underline"
                          >
                            <span>#{item.ticketNumber}</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="text-slate-400">Processing</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ======================================================== */}
      {/* REAL-TIME VERIFICATION MODAL                             */}
      {/* ======================================================== */}
      <Dialog
        isOpen={Boolean(verifyingCandidate)}
        onClose={() => !isConfirmingCode && !isInstantVerifying && setVerifyingCandidate(null)}
        title="Verify Support Email"
        description="Verify your support email address in real time using your 6-digit code or instant one-click activation."
      >
        <div className="space-y-5 pt-2">
          {verifyingCandidate && (
            <>
              {/* Target Address Card */}
              <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200/80 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Support Email</p>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Live Polling Active
                    </span>
                  </div>
                  <p className="font-mono text-sm font-bold text-slate-900 truncate mt-0.5">{verifyingCandidate.email}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{verifyingCandidate.displayName}</p>
                </div>
              </div>

              {verificationSuccess ? (
                /* Verification Success State */
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3 animate-in zoom-in-95 duration-200">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-extrabold text-emerald-950">Email Verified in Real Time!</h3>
                  <p className="text-xs text-emerald-800 leading-relaxed max-w-sm mx-auto">
                    <strong>{verifyingCandidate.email}</strong> is now verified, active, and ready to ingest customer service inquiries and support tickets.
                  </p>
                  <div className="pt-2">
                    <Button
                      onClick={() => setVerifyingCandidate(null)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Option A: 6-Digit Verification Code */}
                  <form onSubmit={handleConfirmCode} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          6-Digit Verification Code <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[11px] text-slate-400">Check your email inbox</span>
                      </div>
                      <Input
                        type="text"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setVerificationCode(val);
                          setVerificationError(null);
                        }}
                        placeholder="123456"
                        className={`text-center font-mono text-xl tracking-[0.35em] font-bold ${
                          verificationError ? 'border-red-400 focus:ring-red-300' : ''
                        }`}
                        autoFocus
                      />
                      {verificationError ? (
                        <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {verificationError}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 mt-1.5">
                          Enter the 6-digit numeric verification code dispatched to this address.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={isResendingCode || resendCooldown > 0}
                        className="text-xs font-semibold text-orange-600 hover:text-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isResendingCode ? 'animate-spin' : ''}`} />
                        {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                      </button>

                      <Button
                        type="submit"
                        disabled={isConfirmingCode || verificationCode.trim().length !== 6}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs min-w-[140px]"
                      >
                        {isConfirmingCode ? (
                          <span className="flex items-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Verifying...
                          </span>
                        ) : (
                          'Confirm Code'
                        )}
                      </Button>
                    </div>
                  </form>

                  {/* Divider */}
                  <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                      <span className="bg-white px-2">OR INSTANT VERIFICATION</span>
                    </div>
                  </div>

                  {/* Option B: Instant 1-Click Real-Time Verification */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-emerald-600" />
                        Instant Direct Verification
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Bypass email transit delay and activate this address immediately for your organization.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => handleInstantVerify()}
                      disabled={isInstantVerifying}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-sm"
                    >
                      {isInstantVerifying ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Instant Verify</span>
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Close Action */}
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setVerifyingCandidate(null)}
              disabled={isConfirmingCode || isInstantVerifying}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Add / Edit Support Email Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={isEditMode ? 'Edit Support Email Address' : 'Add New Support Email'}
        description={
          isEditMode
            ? 'Update the email address, display name, or default status for this sender.'
            : 'Add a support email address where customers can send tickets and inquiries.'
        }
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Support Email Address <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. support@yourcompany.com"
              className={formErrors.email ? 'border-red-400 focus:ring-red-300' : ''}
              autoFocus
            />
            {formErrors.email ? (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {formErrors.email}
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">
                The address where customer communications are received.
              </p>
            )}
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Display Name <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="e.g. Acme Support Team"
              className={formErrors.displayName ? 'border-red-400 focus:ring-red-300' : ''}
            />
            {formErrors.displayName ? (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {formErrors.displayName}
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">
                The friendly sender name shown to customers (e.g. &ldquo;ABC Support&rdquo;).
              </p>
            )}
          </div>

          {/* Options: Default & Active Checkboxes */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="mt-1 w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
              />
              <div>
                <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  Mark as Default Support Email
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Primary notifications and customer tickets will default to this address.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="mt-1 w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
              />
              <div>
                <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <Power className="w-3.5 h-3.5 text-emerald-600" />
                  Active Address
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  When deactivated, this email address will be hidden from customer self-service.
                </p>
              </div>
            </label>
          </div>

          {/* System Verification Notice */}
          <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200/80 flex items-start gap-2.5 text-xs text-slate-600">
            <Zap className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">Real-Time Verification Prompt</p>
              <p className="text-slate-500 mt-0.5">
                Upon saving, the real-time verification modal will open immediately to confirm with code or instant activation.
              </p>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-orange-600 hover:bg-orange-700 text-white min-w-[120px]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </span>
              ) : isEditMode ? (
                'Update Email'
              ) : (
                'Add Email'
              )}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        isOpen={Boolean(deleteCandidate)}
        onClose={() => !isDeleting && setDeleteCandidate(null)}
        title="Delete Support Email"
        description="Are you sure you want to remove this support email address?"
      >
        <div className="space-y-4 pt-2">
          {deleteCandidate && (
            <div className="p-4 rounded-xl bg-red-50/50 border border-red-200">
              <p className="text-sm font-semibold text-slate-900">{deleteCandidate.displayName}</p>
              <p className="text-xs font-mono text-slate-600 mt-0.5">{deleteCandidate.email}</p>
              {deleteCandidate.isDefault && (
                <p className="text-xs text-amber-700 font-semibold mt-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  This is currently the default support email. If deleted, another active address will be promoted to default.
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteCandidate(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white min-w-[100px]"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Deleting...
                </span>
              ) : (
                'Delete'
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
