'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Send,
  Sliders,
  Layers,
  Inbox,
  AlertTriangle,
  LogOut,
  Info,
  Check,
  Settings,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Skeleton,
} from '@/components/ui';

interface EmailConnectionState {
  isConnected: boolean;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'EXPIRED';
  emailAddress: string | null;
  lastSyncAt: string | null;
  provider: string;
}

interface EmailConfigState {
  id?: string;
  supportEmail: string;
  enabled: boolean;
  autoCreateTicket: boolean;
  autoRoute: boolean;
  customerRepliesEnabled: boolean;
  unknownCustomerPolicy: 'AUTO_CREATE' | 'REQUIRE_APPROVAL';
  defaultDepartmentId: string | null;
  defaultPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  notifyTicketCreated: boolean;
  notifyTicketAssigned: boolean;
  notifyTicketStatusChanged: boolean;
  notifyCustomerReply: boolean;
  notifyTicketResolved: boolean;
  notifyTicketClosed: boolean;
  notifyLongOpenTicket: boolean;
}

interface RecentEmailItem {
  id: string;
  ticketId: string | null;
  ticketNumber?: string;
  departmentName?: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  direction: 'INBOUND' | 'OUTBOUND';
  processingStatus: string;
  receivedAt: string;
  createdAt: string;
}

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

export default function EmailToTicketPage() {
  const searchParams = useSearchParams();

  const [connection, setConnection] = useState<EmailConnectionState>({
    isConnected: false,
    status: 'DISCONNECTED',
    emailAddress: null,
    lastSyncAt: null,
    provider: 'GMAIL',
  });

  const [config, setConfig] = useState<EmailConfigState>({
    supportEmail: '',
    enabled: true,
    autoCreateTicket: true,
    autoRoute: true,
    customerRepliesEnabled: true,
    unknownCustomerPolicy: 'AUTO_CREATE',
    defaultDepartmentId: null,
    defaultPriority: 'MEDIUM',
    notifyTicketCreated: true,
    notifyTicketAssigned: true,
    notifyTicketStatusChanged: true,
    notifyCustomerReply: true,
    notifyTicketResolved: true,
    notifyTicketClosed: true,
    notifyLongOpenTicket: true,
  });

  const [recentMessages, setRecentMessages] = useState<RecentEmailItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check URL params from Google OAuth callback
  useEffect(() => {
    const connectedParam = searchParams.get('connected');
    const emailParam = searchParams.get('email');
    const errorParam = searchParams.get('error');

    if (connectedParam === 'true') {
      setFeedback({
        type: 'success',
        text: `Gmail mailbox ${emailParam ? `(${emailParam}) ` : ''}connected successfully! Kalpak will now process incoming emails and replies automatically.`,
      });
    } else if (errorParam) {
      setFeedback({
        type: 'error',
        text: `Google Authorization Failed: ${decodeURIComponent(errorParam)}`,
      });
    }
  }, [searchParams]);

  // Load configuration, connection status, departments & recent messages
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [emailData, statusData, deptRes] = await Promise.all([
        apiClient<any>('/tenants/email-config').catch(() => null),
        apiClient<EmailConnectionState>('/email-integration/gmail/status').catch(() => null),
        apiClient<DepartmentOption[]>('/departments').catch(() => []),
      ]);

      if (emailData?.emailConfig) {
        setConfig({
          supportEmail: emailData.emailConfig.supportEmail || '',
          enabled: emailData.emailConfig.enabled ?? true,
          autoCreateTicket: emailData.emailConfig.autoCreateTicket ?? true,
          autoRoute: emailData.emailConfig.autoRoute ?? true,
          customerRepliesEnabled: emailData.emailConfig.customerRepliesEnabled ?? true,
          unknownCustomerPolicy: emailData.emailConfig.unknownCustomerPolicy || 'AUTO_CREATE',
          defaultDepartmentId: emailData.emailConfig.defaultDepartmentId || null,
          defaultPriority: emailData.emailConfig.defaultPriority || 'MEDIUM',
          notifyTicketCreated: emailData.emailConfig.notifyTicketCreated ?? true,
          notifyTicketAssigned: emailData.emailConfig.notifyTicketAssigned ?? true,
          notifyTicketStatusChanged: emailData.emailConfig.notifyTicketStatusChanged ?? true,
          notifyCustomerReply: emailData.emailConfig.notifyCustomerReply ?? true,
          notifyTicketResolved: emailData.emailConfig.notifyTicketResolved ?? true,
          notifyTicketClosed: emailData.emailConfig.notifyTicketClosed ?? true,
          notifyLongOpenTicket: emailData.emailConfig.notifyLongOpenTicket ?? true,
        });
      }

      if (statusData) {
        setConnection(statusData);
      } else if (emailData?.connection) {
        setConnection(emailData.connection);
      }

      if (Array.isArray(emailData?.recentMessages)) {
        setRecentMessages(emailData.recentMessages);
      }

      if (Array.isArray(deptRes)) {
        setDepartments(deptRes);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Failed loading email configuration',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Connect / Reconnect Gmail (Google OAuth 2.0)
  const handleConnectGmail = async () => {
    try {
      setIsConnecting(true);
      setFeedback(null);
      const res = await apiClient<{ authUrl: string }>('/email-integration/gmail/connect');
      if (res?.authUrl) {
        window.location.href = res.authUrl;
      } else {
        throw new Error('No authorization URL returned by server');
      }
    } catch (err: any) {
      setIsConnecting(false);
      setFeedback({
        type: 'error',
        text: err?.message || 'Failed initiating Google OAuth. Ensure GOOGLE_CLIENT_ID is set in environment.',
      });
    }
  };

  // Handle Disconnect Gmail
  const handleDisconnectGmail = async () => {
    if (!confirm('Are you sure you want to disconnect this Gmail mailbox? Automated email-to-ticket conversion will stop.')) {
      return;
    }

    try {
      setIsDisconnecting(true);
      setFeedback(null);
      await apiClient('/email-integration/gmail/disconnect', { method: 'POST' });
      setFeedback({
        type: 'success',
        text: 'Gmail mailbox disconnected successfully.',
      });
      await loadData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Failed disconnecting Gmail',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Handle Manual Immediate Sync
  const handleSyncNow = async () => {
    try {
      setIsSyncing(true);
      setFeedback(null);
      const res = await apiClient<{ success: boolean; syncedCount: number; errors: string[] }>(
        '/email-integration/gmail/sync',
        { method: 'POST' }
      );

      setFeedback({
        type: 'success',
        text: `Sync completed! Processed ${res.syncedCount} new email(s).`,
      });
      await loadData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Failed syncing mailbox',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Save Ticket Creation, Defaults & Notification Preferences
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setFeedback(null);
      await apiClient('/tenants/email-config', {
        method: 'PUT',
        body: JSON.stringify(config),
      });

      setFeedback({
        type: 'success',
        text: 'Email-to-Ticket configuration saved successfully for your organization.',
      });
      await loadData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Failed saving configuration',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Header & Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
          <Link href="/dashboard/settings" className="hover:text-orange-600 transition-colors">
            Settings
          </Link>
          <span>/</span>
          <span className="text-orange-600">Email-to-Ticket</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <Mail className="w-6 h-6 text-orange-600" />
              Email-to-Ticket Configuration
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Connect your company Gmail support mailbox to automatically convert customer emails into tickets and manage replies.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              Google OAuth 2.0
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              ₹0 Free Demo
            </span>
          </div>
        </div>
      </div>

      {/* Settings Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200 text-sm font-semibold">
        <Link
          href="/dashboard/settings"
          className="px-4 py-2.5 text-slate-600 hover:text-slate-900 border-b-2 border-transparent transition-colors flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Policy & SLAs
        </Link>
        <Link
          href="/dashboard/settings/email-to-ticket"
          className="px-4 py-2.5 text-orange-600 border-b-2 border-orange-600 transition-colors flex items-center gap-2"
        >
          <Mail className="w-4 h-4" />
          Email-to-Ticket (Gmail)
        </Link>
      </div>

      {/* Feedback Alerts */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm animate-in fade-in-50 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="flex-1 font-medium">{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Required Informational Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200/80 shadow-xs flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
          <Info className="w-5 h-5" />
        </div>
        <div className="flex-1 text-sm text-slate-800 leading-relaxed">
          <p className="font-semibold text-orange-950 mb-0.5">How Email-to-Ticket Works</p>
          <p className="text-slate-700">
            Customers can send support requests to your configured company email. Kalpak will automatically convert new emails into tickets and attach replies to the correct ticket.
          </p>
        </div>
      </div>

      {/* Quick Status Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Gmail Connection</span>
          <div className="mt-1 flex items-center gap-1.5 font-bold text-xs">
            {connection.isConnected ? (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <Check className="w-3.5 h-3.5" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-500">
                <AlertCircle className="w-3.5 h-3.5" /> Disconnected
              </span>
            )}
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Email-to-Ticket</span>
          <div className="mt-1 flex items-center gap-1.5 font-bold text-xs">
            {config.enabled ? (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <Check className="w-3.5 h-3.5" /> Enabled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-500">
                Disabled
              </span>
            )}
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Customer Replies</span>
          <div className="mt-1 flex items-center gap-1.5 font-bold text-xs">
            {config.customerRepliesEnabled ? (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <Check className="w-3.5 h-3.5" /> Enabled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-500">
                Disabled
              </span>
            )}
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Default Dept</span>
          <span className="mt-1 font-bold text-xs text-slate-800 truncate">
            {departments.find((d) => d.id === config.defaultDepartmentId)?.name || 'Auto-Route'}
          </span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Default Priority</span>
          <span className="mt-1 font-bold text-xs text-orange-600">
            {config.defaultPriority}
          </span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Last Email Sync</span>
          <span className="mt-1 font-bold text-xs text-slate-800 truncate">
            {connection.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleTimeString() : 'Never'}
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. Email Integration (Gmail OAuth 2.0 Connection)                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                Email Integration
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Authorize your company support Gmail inbox using Google OAuth 2.0. No password required.
              </CardDescription>
            </div>
            {/* Status Badge */}
            <div>
              {connection.isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </span>
              ) : connection.status === 'ERROR' || connection.status === 'EXPIRED' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Needs Reconnection
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  Disconnected
                </span>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500">Connected Company Email Address:</span>
              <p className="text-base font-bold text-slate-900 font-mono">
                {connection.emailAddress || 'No Gmail mailbox connected'}
              </p>
              {connection.lastSyncAt && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Last synced: {new Date(connection.lastSyncAt).toLocaleString()} (Automated background polling every 60s)
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              {connection.isConnected && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="rounded-xl border-slate-300 hover:bg-slate-100"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Button>
              )}

              {!connection.isConnected ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConnectGmail}
                  disabled={isConnecting}
                  className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-xs shadow-orange-500/20"
                >
                  {isConnecting ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-1.5" />
                  ) : (
                    <Mail className="w-4 h-4 mr-1.5" />
                  )}
                  Connect Gmail
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleConnectGmail}
                    disabled={isConnecting}
                    className="rounded-xl border-slate-300 hover:bg-slate-100 text-slate-700 font-medium"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isConnecting ? 'animate-spin' : ''}`} />
                    Reconnect Gmail
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDisconnectGmail}
                    disabled={isDisconnecting}
                    className="rounded-xl font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1.5" />
                    Disconnect
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 bg-blue-50/60 border border-blue-200/60 p-3 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Zero-Password Security:</strong> Kalpak never asks for your Google password. Authorization is secured using OAuth 2.0 refresh tokens encrypted with AES-256-GCM.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Configuration Form: Ticket Creation, Defaults & Notifications     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSaveConfig} className="space-y-6">
        {/* 2. Ticket Creation Settings */}
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 pb-4">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-orange-600" />
              Ticket Creation Settings
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Control automated ticket intake rules and unknown customer provisioning.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {/* Toggle: Enable Email-to-Ticket */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-xl hover:bg-slate-50/80 transition-colors">
              <div>
                <label className="text-sm font-bold text-slate-900 cursor-pointer">
                  Enable Email-to-Ticket
                </label>
                <p className="text-xs text-slate-500">
                  Allow inbound emails received by your connected support mailbox to be ingested by Kalpak.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500 cursor-pointer mt-0.5"
              />
            </div>

            {/* Toggle: Automatically create ticket */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-xl hover:bg-slate-50/80 transition-colors">
              <div>
                <label className="text-sm font-bold text-slate-900 cursor-pointer">
                  Automatically create ticket from incoming customer email
                </label>
                <p className="text-xs text-slate-500">
                  When a customer sends a new support email, automatically generate a real ticket in your system.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.autoCreateTicket}
                onChange={(e) => setConfig((prev) => ({ ...prev, autoCreateTicket: e.target.checked }))}
                className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500 cursor-pointer mt-0.5"
              />
            </div>

            {/* Toggle: Customer replies should update existing ticket */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-xl hover:bg-slate-50/80 transition-colors">
              <div>
                <label className="text-sm font-bold text-slate-900 cursor-pointer">
                  Customer replies should update existing ticket instead of creating a new ticket
                </label>
                <p className="text-xs text-slate-500">
                  Detect thread headers (In-Reply-To, References) and ticket numbers (e.g. [KAL-2026-0001]) to append responses to the existing ticket timeline.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.customerRepliesEnabled}
                onChange={(e) => setConfig((prev) => ({ ...prev, customerRepliesEnabled: e.target.checked }))}
                className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500 cursor-pointer mt-0.5"
              />
            </div>

            {/* Unknown Customer Policy */}
            <div className="pt-2 border-t border-slate-100">
              <label className="text-sm font-bold text-slate-900 block mb-2">
                Unknown Customer Policy
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-colors ${
                    config.unknownCustomerPolicy === 'AUTO_CREATE'
                      ? 'border-orange-500 bg-orange-50/40 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="unknownCustomerPolicy"
                    value="AUTO_CREATE"
                    checked={config.unknownCustomerPolicy === 'AUTO_CREATE'}
                    onChange={() => setConfig((prev) => ({ ...prev, unknownCustomerPolicy: 'AUTO_CREATE' }))}
                    className="mt-0.5 text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Create customer automatically</span>
                    <span className="text-[11px] text-slate-500">
                      Instantly provision an active customer account in this tenant and log their ticket.
                    </span>
                  </div>
                </label>

                <label
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-colors ${
                    config.unknownCustomerPolicy === 'REQUIRE_APPROVAL'
                      ? 'border-orange-500 bg-orange-50/40 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="unknownCustomerPolicy"
                    value="REQUIRE_APPROVAL"
                    checked={config.unknownCustomerPolicy === 'REQUIRE_APPROVAL'}
                    onChange={() => setConfig((prev) => ({ ...prev, unknownCustomerPolicy: 'REQUIRE_APPROVAL' }))}
                    className="mt-0.5 text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Require admin approval</span>
                    <span className="text-[11px] text-slate-500">
                      Hold incoming emails from unregistered senders for Client Admin verification.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Ticket Defaults */}
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 pb-4">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-600" />
              Ticket Defaults
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Set the fallback department and priority assigned to tickets created via email.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Default Department
                </label>
                <select
                  value={config.defaultDepartmentId || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      defaultDepartmentId: e.target.value ? e.target.value : null,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Auto-Route based on subject/content</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  If set, unrouted emails are assigned to this department by default.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Default Priority
                </label>
                <select
                  value={config.defaultPriority}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      defaultPriority: e.target.value as any,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Initial priority applied to newly generated email tickets.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Email Notifications (Client Admin Configurable) */}
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 pb-4">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-orange-600" />
              Email Notifications
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Configure which ticket lifecycle events trigger outbound email notifications via your connected Gmail.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={config.notifyTicketCreated}
                  onChange={(e) => setConfig((prev) => ({ ...prev, notifyTicketCreated: e.target.checked }))}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Ticket created</span>
                  <span className="text-[11px] text-slate-500">Send acknowledgement email to customer with ticket number</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={config.notifyTicketAssigned}
                  onChange={(e) => setConfig((prev) => ({ ...prev, notifyTicketAssigned: e.target.checked }))}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Ticket assigned</span>
                  <span className="text-[11px] text-slate-500">Notify assigned technician or department head</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={config.notifyTicketStatusChanged}
                  onChange={(e) => setConfig((prev) => ({ ...prev, notifyTicketStatusChanged: e.target.checked }))}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Ticket status changed</span>
                  <span className="text-[11px] text-slate-500">Inform customer when ticket moves between progress states</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={config.notifyCustomerReply}
                  onChange={(e) => setConfig((prev) => ({ ...prev, notifyCustomerReply: e.target.checked }))}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Customer reply</span>
                  <span className="text-[11px] text-slate-500">Alert technicians when a customer sends an email reply</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={config.notifyTicketResolved}
                  onChange={(e) => setConfig((prev) => ({ ...prev, notifyTicketResolved: e.target.checked }))}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Ticket resolved</span>
                  <span className="text-[11px] text-slate-500">Send resolution summary and confirmation notice</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={config.notifyTicketClosed}
                  onChange={(e) => setConfig((prev) => ({ ...prev, notifyTicketClosed: e.target.checked }))}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Ticket closed</span>
                  <span className="text-[11px] text-slate-500">Send final closure notification to customer</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors sm:col-span-2">
                <input
                  type="checkbox"
                  checked={config.notifyLongOpenTicket}
                  onChange={(e) => setConfig((prev) => ({ ...prev, notifyLongOpenTicket: e.target.checked }))}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Long-open ticket (SLA Overdue)</span>
                  <span className="text-[11px] text-slate-500">
                    Send urgent alerts when tickets exceed tolerable open days threshold without resolution.
                  </span>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500">
            Settings persist against your active organization only.
          </span>
          <Button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 shadow-sm shadow-orange-500/20"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Save Configuration
          </Button>
        </div>
      </form>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. Recent Synced Email Activity Log                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Inbox className="w-4 h-4 text-orange-600" />
                Recent Synced Email Activity
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Log of real incoming emails and outgoing notifications processed for this tenant.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadData}
              className="rounded-xl border-slate-300 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {recentMessages.length === 0 ? (
            <div className="p-8 text-center">
              <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No synced emails yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Once your support Gmail receives customer inquiries, they will appear here and be converted into tickets automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Sender / Recipient</th>
                    <th className="px-4 py-2.5">Subject</th>
                    <th className="px-4 py-2.5">Linked Ticket</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentMessages.map((msg) => (
                    <tr key={msg.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        {msg.direction === 'INBOUND' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            INBOUND
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                            OUTBOUND
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {msg.direction === 'INBOUND' ? msg.fromEmail : msg.toEmail}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">
                        {msg.subject}
                      </td>
                      <td className="px-4 py-3">
                        {msg.ticketId ? (
                          <Link
                            href={`/dashboard/tickets/${msg.ticketId}`}
                            className="inline-flex items-center gap-1 font-mono font-bold text-orange-600 hover:text-orange-700 hover:underline"
                          >
                            {msg.ticketNumber || 'View Ticket'}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {msg.processingStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(msg.receivedAt || msg.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
