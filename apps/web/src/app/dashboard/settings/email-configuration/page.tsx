'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
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
  Inbox,
  Copy,
  Check,
  Send,
  Zap,
} from 'lucide-react';
import {
  Button,
  Input,
  Dialog,
  Badge,
  Card,
} from '@/components/ui';
import {
  SupportEmailVerificationStatus,
  InboundForwardingStatus,
  IncomingEmailConfigDto,
  TestIncomingEmailResponse,
  OutboundEmailStatus,
  OutgoingEmailConfigDto,
  SendTestEmailResponse,
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

const initialFormState: FormState = {
  email: '',
  displayName: '',
  isDefault: false,
  isActive: true,
};

export default function EmailConfigurationPage() {
  // Support Email State
  const [emails, setEmails] = useState<SupportEmailItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Incoming Email Forwarding State
  const [incomingConfig, setIncomingConfig] = useState<IncomingEmailConfigDto | null>(null);
  const [isLoadingIncoming, setIsLoadingIncoming] = useState<boolean>(true);
  const [isTestingIncoming, setIsTestingIncoming] = useState<boolean>(false);
  const [copiedInbound, setCopiedInbound] = useState<boolean>(false);
  const [showTestModal, setShowTestModal] = useState<boolean>(false);
  const [lastTestResponse, setLastTestResponse] = useState<TestIncomingEmailResponse | null>(null);

  // Outgoing Email State
  const [outgoingConfig, setOutgoingConfig] = useState<OutgoingEmailConfigDto | null>(null);
  const [isLoadingOutgoing, setIsLoadingOutgoing] = useState<boolean>(true);
  const [isSavingOutgoing, setIsSavingOutgoing] = useState<boolean>(false);
  const [outgoingFormData, setOutgoingFormData] = useState<{
    senderName: string;
    fromEmail: string;
    replyToEmail: string;
  }>({
    senderName: '',
    fromEmail: '',
    replyToEmail: '',
  });
  const [outgoingErrors, setOutgoingErrors] = useState<{
    senderName?: string;
    fromEmail?: string;
    replyToEmail?: string;
  }>({});

  // Outgoing Test Email Modal state
  const [showSendTestModal, setShowSendTestModal] = useState<boolean>(false);
  const [testRecipientEmail, setTestRecipientEmail] = useState<string>('');
  const [testRecipientError, setTestRecipientError] = useState<string | null>(null);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState<boolean>(false);
  const [testSendResult, setTestSendResult] = useState<SendTestEmailResponse | null>(null);

  // Support Email Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [formErrors, setFormErrors] = useState<{ email?: string; displayName?: string }>({});

  // Delete confirmation modal state
  const [deleteCandidate, setDeleteCandidate] = useState<SupportEmailItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Status toggle in progress tracking
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

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

  const fetchIncomingConfig = useCallback(async () => {
    setIsLoadingIncoming(true);
    try {
      const data = await apiClient<IncomingEmailConfigDto>('/tenants/email-config/incoming');
      setIncomingConfig(data);
    } catch (err: any) {
      // Inbound config error
    } finally {
      setIsLoadingIncoming(false);
    }
  }, []);

  const fetchOutgoingConfig = useCallback(async () => {
    setIsLoadingOutgoing(true);
    try {
      const data = await apiClient<OutgoingEmailConfigDto>('/tenants/email-config/outgoing');
      setOutgoingConfig(data);
      setOutgoingFormData({
        senderName: data.senderName || '',
        fromEmail: data.fromEmail || '',
        replyToEmail: data.replyToEmail || '',
      });
    } catch (err: any) {
      // Outbound config fetch error
    } finally {
      setIsLoadingOutgoing(false);
    }
  }, []);

  useEffect(() => {
    fetchSupportEmails();
    fetchIncomingConfig();
    fetchOutgoingConfig();
  }, [fetchSupportEmails, fetchIncomingConfig, fetchOutgoingConfig]);

  // Automatically dismiss success feedback after 5 seconds
  useEffect(() => {
    if (feedback?.type === 'success') {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [feedback]);

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
      } else {
        await apiClient<SupportEmailItem>('/tenants/support-emails', {
          method: 'POST',
          body: JSON.stringify({
            email: formData.email.trim().toLowerCase(),
            displayName: formData.displayName.trim(),
            isDefault: formData.isDefault,
            isActive: formData.isActive,
          }),
        });

        setFeedback({
          type: 'success',
          message: `Support email "${formData.email.trim().toLowerCase()}" added successfully.`,
        });
      }

      setIsModalOpen(false);
      await fetchSupportEmails();
      await fetchIncomingConfig();
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
      await fetchIncomingConfig();
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

  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const handleVerifyEmail = async (item: SupportEmailItem) => {
    setVerifyingId(item.id);
    try {
      await apiClient(`/tenants/support-emails/${item.id}/verify`, {
        method: 'POST',
      });
      setFeedback({
        type: 'success',
        message: `Support email "${item.email}" verified successfully! Real-time ticket ingestion is active.`,
      });
      await fetchSupportEmails();
      await fetchIncomingConfig();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err instanceof ApiClientError ? err.message : (err.message || 'Failed to verify support email'),
      });
    } finally {
      setVerifyingId(null);
    }
  };

  // ==================== Incoming Email Forwarding Handlers ====================

  const handleCopyInboundAddress = () => {
    if (!incomingConfig?.inboundAddress) return;
    navigator.clipboard.writeText(incomingConfig.inboundAddress);
    setCopiedInbound(true);
    setTimeout(() => setCopiedInbound(false), 2500);
  };

  const handleTestIncomingEmail = async (simulate = false) => {
    setIsTestingIncoming(true);
    setFeedback(null);

    try {
      const res = await apiClient<TestIncomingEmailResponse>('/tenants/email-config/incoming/test', {
        method: 'POST',
        body: JSON.stringify({ simulateReception: simulate }),
      });

      setLastTestResponse(res);

      if (incomingConfig) {
        setIncomingConfig({
          ...incomingConfig,
          status: res.status,
          lastTestedAt: res.lastTestedAt,
          lastTestedMessage: res.message,
        });
      }

      setFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });

      if (!res.success && !simulate) {
        setShowTestModal(true);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err instanceof ApiClientError ? err.message : 'Failed to test incoming email forwarding',
      });
    } finally {
      setIsTestingIncoming(false);
    }
  };

  // ==================== Outgoing Email Handlers ====================

  const handleSaveOutgoing = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { senderName?: string; fromEmail?: string; replyToEmail?: string } = {};

    if (!outgoingFormData.fromEmail.trim()) {
      errors.fromEmail = 'From email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(outgoingFormData.fromEmail.trim())) {
      errors.fromEmail = 'Please provide a valid email address';
    }

    if (
      outgoingFormData.replyToEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(outgoingFormData.replyToEmail.trim())
    ) {
      errors.replyToEmail = 'Please provide a valid reply-to email address';
    }

    setOutgoingErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSavingOutgoing(true);
    setFeedback(null);
    try {
      const updated = await apiClient<OutgoingEmailConfigDto>('/tenants/email-config/outgoing', {
        method: 'PATCH',
        body: JSON.stringify({
          senderName: outgoingFormData.senderName.trim() || undefined,
          fromEmail: outgoingFormData.fromEmail.trim().toLowerCase(),
          replyToEmail: outgoingFormData.replyToEmail.trim().toLowerCase() || undefined,
        }),
      });
      setOutgoingConfig(updated);
      setFeedback({
        type: 'success',
        message: 'Outgoing email configuration saved successfully.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err instanceof ApiClientError ? err.message : 'Failed to save outgoing email configuration',
      });
    } finally {
      setIsSavingOutgoing(false);
    }
  };

  const handleOpenSendTestModal = () => {
    setTestRecipientEmail('');
    setTestRecipientError(null);
    setTestSendResult(null);
    setShowSendTestModal(true);
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipientEmail.trim()) {
      setTestRecipientError('Recipient email address is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testRecipientEmail.trim())) {
      setTestRecipientError('Please provide a valid recipient email address');
      return;
    }

    setTestRecipientError(null);
    setIsSendingTestEmail(true);
    setTestSendResult(null);

    try {
      const res = await apiClient<SendTestEmailResponse>('/tenants/email-config/outgoing/test', {
        method: 'POST',
        body: JSON.stringify({ recipientEmail: testRecipientEmail.trim().toLowerCase() }),
      });
      setTestSendResult(res);
      if (outgoingConfig) {
        setOutgoingConfig({
          ...outgoingConfig,
          status: res.status,
          lastTestedAt: res.lastTestedAt,
          lastTestedMessage: res.message,
        });
      }
      setFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
    } catch (err: any) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to send test email';
      setTestSendResult({
        success: false,
        status: OutboundEmailStatus.FAILED,
        message: msg,
        lastTestedAt: new Date().toISOString(),
      });
      setFeedback({
        type: 'error',
        message: msg,
      });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // ==================== Computed Metrics ====================

  const metrics = useMemo(() => {
    const total = emails.length;
    const active = emails.filter((e) => e.isActive).length;
    const defaultItem = emails.find((e) => e.isDefault);
    return { total, active, defaultItem };
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
            Configure primary support email addresses and incoming email forwarding for automated ticket capture.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => {
              fetchSupportEmails();
              fetchIncomingConfig();
              fetchOutgoingConfig();
            }}
            disabled={isLoading || isLoadingIncoming || isLoadingOutgoing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading || isLoadingIncoming || isLoadingOutgoing ? 'animate-spin' : ''}`} />
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
          href="/dashboard/settings"
          className="px-4 py-2.5 text-slate-600 hover:text-slate-900 border-b-2 border-transparent transition-colors flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Policy & SLAs
        </Link>
        <Link
          href="/dashboard/settings/email-configuration"
          className="px-4 py-2.5 text-orange-600 border-b-2 border-orange-600 transition-colors flex items-center gap-2"
        >
          <Mail className="w-4 h-4" />
          Email Configuration
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              Incoming Email Status
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {incomingConfig?.status === InboundForwardingStatus.CONNECTED ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Connected
              </span>
            ) : incomingConfig?.status === InboundForwardingStatus.FAILED ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                Failed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Waiting for Setup
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">Email Forwarding Pipeline</p>
        </Card>

        <Card className="p-5 border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Outgoing Email Status
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {outgoingConfig?.status === OutboundEmailStatus.CONNECTED ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Connected
              </span>
            ) : outgoingConfig?.status === OutboundEmailStatus.FAILED ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                Failed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Not Configured
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">Outgoing SMTP Dispatch</p>
        </Card>
      </div>

      {/* ======================================================== */}
      {/* 1. SUPPORT EMAIL SECTION                                */}
      {/* ======================================================== */}
      <Card className="border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-600" />
              Support Email Directory
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Add multiple support emails (e.g. general help, billing, enterprise VIP) with individual display names.
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
                      <span title="System-controlled read-only status" className="cursor-help">
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
                        disabled={togglingId === item.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
                          item.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Click to toggle active status"
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

                    {/* Verification Status with Real-time Verify Action */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.verificationStatus === SupportEmailVerificationStatus.VERIFIED ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Verified
                          </div>
                        ) : item.verificationStatus === SupportEmailVerificationStatus.PENDING ? (
                          <>
                            <div
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"
                              title="System verification pending"
                            >
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Pending Verification
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleVerifyEmail(item)}
                              disabled={verifyingId === item.id}
                              className="h-7 px-2.5 text-xs font-bold text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                            >
                              {verifyingId === item.id ? 'Verifying...' : 'Verify Now'}
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                              Unverified
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleVerifyEmail(item)}
                              disabled={verifyingId === item.id}
                              className="h-7 px-2.5 text-xs font-bold text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                            >
                              {verifyingId === item.id ? 'Verifying...' : 'Verify Now'}
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
      {/* 2. INCOMING EMAIL SECTION                               */}
      {/* ======================================================== */}
      <Card className="border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Inbox className="w-5 h-5 text-orange-600" />
                Incoming Email
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Method: {incomingConfig?.method || 'Email Forwarding'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Forward inquiries from your existing support email (e.g.{' '}
              <span className="font-semibold text-slate-700">
                {metrics.defaultItem ? metrics.defaultItem.email : 'support@abc.com'}
              </span>
              ) to your unique Kalpak Inbound Email address.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => handleTestIncomingEmail(false)}
              disabled={isTestingIncoming || isLoadingIncoming}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isTestingIncoming ? 'animate-spin' : ''}`} />
              {isTestingIncoming ? 'Testing Connection...' : 'Test Incoming Email'}
            </Button>
          </div>
        </div>

        {/* Inbound Email Configuration Box */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Unique Inbound Address Card (Left - 7 cols) */}
            <div className="lg:col-span-7 bg-gradient-to-br from-slate-50 to-orange-50/20 rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-orange-600" />
                    Kalpak Inbound Email Address
                  </span>
                  <Badge variant="primary" className="text-[11px] font-semibold">
                    Unique Tenant Inbound
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Forward all customer inquiries from your company support address to this recipient address:
                </p>

                {/* Inbound Address Bar with Copy */}
                <div className="mt-3.5 flex items-center gap-2 bg-white rounded-xl p-2 pl-3.5 border border-slate-200 shadow-sm">
                  <span className="font-mono text-sm sm:text-base font-semibold text-slate-900 select-all truncate">
                    {incomingConfig?.inboundAddress || 'Loading address...'}
                  </span>
                  <button
                    onClick={handleCopyInboundAddress}
                    disabled={!incomingConfig?.inboundAddress}
                    className={`ml-auto shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                      copiedInbound
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {copiedInbound ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Protected by Tenant Isolation
                </span>
                <span>Automated Ingestion</span>
              </div>
            </div>

            {/* Status & Method Box (Right - 5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Forwarding Status
                </span>

                <div className="mt-2">
                  {incomingConfig?.status === InboundForwardingStatus.CONNECTED ? (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-emerald-900">Connected</p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Incoming email forwarding is verified. Emails forwarded to your Kalpak Inbound Address are being received.
                        </p>
                      </div>
                    </div>
                  ) : incomingConfig?.status === InboundForwardingStatus.FAILED ? (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-red-900">Failed</p>
                        <p className="text-xs text-red-700 mt-0.5">
                          Verification failed. Ensure your email provider forwarding rule is active and points to your Kalpak Inbound address.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
                      <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-amber-900">Waiting for Setup</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Forwarding rule has not been detected yet. Set up forwarding in your email host and click &ldquo;Test Incoming Email&rdquo;.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Details */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Forwarding Method:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">Email Forwarding</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Last Tested:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {incomingConfig?.lastTestedAt
                      ? new Date(incomingConfig.lastTestedAt).toLocaleString()
                      : 'Not tested yet'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3-Step Setup Instructions Guide */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-orange-600" />
                How to Set Up Email Forwarding
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Step 1 */}
              <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm relative">
                <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center mb-2.5">
                  1
                </div>
                <h4 className="text-sm font-bold text-slate-900">Configure Support Email</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Make sure your primary support email (e.g.{' '}
                  <span className="font-semibold text-slate-700">
                    {metrics.defaultItem ? metrics.defaultItem.email : 'support@abc.com'}
                  </span>
                  ) is registered in the Support Email section above.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm relative">
                <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center mb-2.5">
                  2
                </div>
                <h4 className="text-sm font-bold text-slate-900">Set Up Forwarding Rule</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  In your email host (Google Workspace, Microsoft 365, cPanel, or Zoho), create an automatic forwarding rule sending all incoming emails to your{' '}
                  <span className="font-semibold text-slate-700">Kalpak Inbound Address</span>.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm relative">
                <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center mb-2.5">
                  3
                </div>
                <h4 className="text-sm font-bold text-slate-900">Verify Connectivity</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Send a test message to your support email, then click{' '}
                  <span className="font-semibold text-slate-700">&ldquo;Test Incoming Email&rdquo;</span> to confirm your forwarding is active and connected.
                </p>
              </div>
            </div>
          </div>

          {/* Test & Simulation Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Zap className="w-3.5 h-3.5 text-orange-600" />
              <span>
                Want to test before updating your DNS or mail server? Use the simulated test option.
              </span>
            </div>

            <div className="flex items-center gap-2.5 ml-auto">
              <Button
                variant="outline"
                onClick={() => handleTestIncomingEmail(true)}
                disabled={isTestingIncoming}
                className="text-xs font-semibold flex items-center gap-1.5 text-slate-700 hover:text-orange-600 hover:bg-orange-50 border-slate-300"
              >
                <Send className="w-3.5 h-3.5" />
                Simulate Test Inbound Email
              </Button>
              <Button
                onClick={() => handleTestIncomingEmail(false)}
                disabled={isTestingIncoming}
                className="text-xs font-semibold flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingIncoming ? 'animate-spin' : ''}`} />
                Test Incoming Email
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ======================================================== */}
      {/* 3. OUTGOING EMAIL SECTION                               */}
      {/* ======================================================== */}
      <Card className="border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-orange-600" />
                Outgoing Email
              </h2>
              {/* Outbound Status Badge */}
              {outgoingConfig?.status === OutboundEmailStatus.CONNECTED ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Connected
                </span>
              ) : outgoingConfig?.status === OutboundEmailStatus.FAILED ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                  Failed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Not Configured
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Configure sender details for outgoing customer emails, ticket notifications, and system dispatches.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              onClick={handleOpenSendTestModal}
              disabled={isLoadingOutgoing || !outgoingFormData.fromEmail}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-sm disabled:opacity-50"
              title={!outgoingFormData.fromEmail ? 'Save From Email first to send a test' : 'Send a real test email'}
            >
              <Send className="w-4 h-4" />
              Send Test Email
            </Button>
          </div>
        </div>

        <form onSubmit={handleSaveOutgoing} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sender Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Sender Name <span className="text-slate-400 font-normal">(e.g. ABC Support)</span>
              </label>
              <Input
                type="text"
                value={outgoingFormData.senderName}
                onChange={(e) => {
                  setOutgoingFormData({ ...outgoingFormData, senderName: e.target.value });
                  if (outgoingErrors.senderName) setOutgoingErrors({ ...outgoingErrors, senderName: undefined });
                }}
                placeholder="e.g. ABC Support"
                className={outgoingErrors.senderName ? 'border-red-400 focus:ring-red-300' : ''}
              />
              {outgoingErrors.senderName ? (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {outgoingErrors.senderName}
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">
                  The friendly sender name shown in customer email clients.
                </p>
              )}
            </div>

            {/* From Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                From Email <span className="text-red-500">*</span> <span className="text-slate-400 font-normal">(e.g. support@abc.com)</span>
              </label>
              <Input
                type="email"
                value={outgoingFormData.fromEmail}
                onChange={(e) => {
                  setOutgoingFormData({ ...outgoingFormData, fromEmail: e.target.value });
                  if (outgoingErrors.fromEmail) setOutgoingErrors({ ...outgoingErrors, fromEmail: undefined });
                }}
                placeholder="e.g. support@abc.com"
                className={outgoingErrors.fromEmail ? 'border-red-400 focus:ring-red-300' : ''}
              />
              {outgoingErrors.fromEmail ? (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {outgoingErrors.fromEmail}
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">
                  The sender email address appearing in the &ldquo;From&rdquo; header.
                </p>
              )}
            </div>

            {/* Reply-To Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Reply-To Email <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <Input
                type="email"
                value={outgoingFormData.replyToEmail}
                onChange={(e) => {
                  setOutgoingFormData({ ...outgoingFormData, replyToEmail: e.target.value });
                  if (outgoingErrors.replyToEmail) setOutgoingErrors({ ...outgoingErrors, replyToEmail: undefined });
                }}
                placeholder="e.g. support@abc.com"
                className={outgoingErrors.replyToEmail ? 'border-red-400 focus:ring-red-300' : ''}
              />
              {outgoingErrors.replyToEmail ? (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {outgoingErrors.replyToEmail}
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">
                  Where customer replies are routed. Defaults to From Email if blank.
                </p>
              )}
            </div>
          </div>

          {/* Status info bar & Save button */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {outgoingConfig?.lastTestedAt ? (
                  <>
                    Last tested:{' '}
                    <strong className="text-slate-700">
                      {new Date(outgoingConfig.lastTestedAt).toLocaleString()}
                    </strong>
                    {outgoingConfig.lastTestedMessage && (
                      <span className="ml-1 text-slate-600 font-medium">
                        — {outgoingConfig.lastTestedMessage}
                      </span>
                    )}
                  </>
                ) : (
                  'Outbound emails are securely isolated by tenant and dispatched via your platform mail service.'
                )}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                type="submit"
                disabled={isSavingOutgoing}
                className="bg-slate-900 hover:bg-slate-800 text-white min-w-[140px] flex items-center justify-center gap-2 text-xs font-semibold"
              >
                {isSavingOutgoing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Outgoing Settings'
                )}
              </Button>
            </div>
          </div>
        </form>
      </Card>

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

          {/* System Verification Notice (Read-only status) */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-700">Verification Status (Read-Only)</p>
              <p className="text-slate-500 mt-0.5">
                Verification status is system-controlled. Newly added addresses (or modified addresses) are automatically tagged as &ldquo;Pending Verification&rdquo;.
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

      {/* Test Guidance Modal */}
      <Dialog
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        title="Incoming Email Test Result"
        description="Forwarded email verification details."
      >
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-900">Waiting for Forwarded Email</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                {lastTestResponse?.message ||
                  'No forwarded email has been detected yet from your support address.'}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 text-slate-600 border border-slate-200">
            <p className="font-semibold text-slate-800">Quick Checklist:</p>
            <ul className="list-disc pl-4 space-y-1 text-slate-600">
              <li>
                Inbound address is correctly set to:{' '}
                <span className="font-mono font-semibold text-slate-900">
                  {incomingConfig?.inboundAddress}
                </span>
              </li>
              <li>
                Your forwarding rule in your email host (Google Workspace, Office 365, etc.) is active.
              </li>
              <li>You sent at least one email to your support address after setting up forwarding.</li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowTestModal(false);
                handleTestIncomingEmail(true);
              }}
              className="text-xs flex items-center gap-1.5 text-orange-600 hover:text-orange-700"
            >
              <Zap className="w-3.5 h-3.5" />
              Simulate Inbound Test Now
            </Button>
            <Button
              onClick={() => setShowTestModal(false)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs"
            >
              Got it
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Send Real Test Email Modal */}
      <Dialog
        isOpen={showSendTestModal}
        onClose={() => !isSendingTestEmail && setShowSendTestModal(false)}
        title="Send Real Test Email"
        description="Verify your Outgoing Email configuration by sending a real email to a specified recipient."
      >
        <form onSubmit={handleSendTestEmail} className="space-y-4 pt-2">
          {/* Current Outgoing Identity preview */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <p className="font-semibold text-slate-700">Outgoing Identity Summary:</p>
            <div className="grid grid-cols-2 gap-2 text-slate-600">
              <p>
                Sender Name:{' '}
                <span className="font-medium text-slate-900">
                  {outgoingFormData.senderName || 'Not Set'}
                </span>
              </p>
              <p>
                From Email:{' '}
                <span className="font-medium text-slate-900">
                  {outgoingFormData.fromEmail || 'Not Set'}
                </span>
              </p>
              <p className="col-span-2">
                Reply-To:{' '}
                <span className="font-medium text-slate-900">
                  {outgoingFormData.replyToEmail ||
                    outgoingFormData.fromEmail ||
                    'Same as From Email'}
                </span>
              </p>
            </div>
          </div>

          {/* Recipient Email Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Recipient Email Address <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              value={testRecipientEmail}
              onChange={(e) => {
                setTestRecipientEmail(e.target.value);
                setTestRecipientError(null);
              }}
              placeholder="e.g. admin@yourcompany.com"
              className={testRecipientError ? 'border-red-400 focus:ring-red-300' : ''}
              autoFocus
              disabled={isSendingTestEmail}
            />
            {testRecipientError ? (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {testRecipientError}
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">
                Enter an inbox address where you can verify receipt of the test message.
              </p>
            )}
          </div>

          {/* Test Result Feedback */}
          {testSendResult && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                testSendResult.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-red-50 text-red-900 border-red-200'
              }`}
            >
              {testSendResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">
                  {testSendResult.success ? 'Delivery Success (Connected)' : 'Delivery Failed'}
                </p>
                <p className="mt-0.5">{testSendResult.message}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Tested at: {new Date(testSendResult.lastTestedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          )}

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSendTestModal(false)}
              disabled={isSendingTestEmail}
            >
              Close
            </Button>
            <Button
              type="submit"
              disabled={isSendingTestEmail}
              className="bg-orange-600 hover:bg-orange-700 text-white min-w-[130px]"
            >
              {isSendingTestEmail ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Sending Test...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" />
                  Send Test Email
                </span>
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
