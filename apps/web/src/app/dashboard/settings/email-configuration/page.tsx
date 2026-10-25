'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiClient, ApiClientError } from '@/lib/api-client';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  Power,
  RefreshCw,
  ShieldCheck,
  Zap,
  Check,
  ArrowRight,
  Copy,
  LogOut,
  Inbox,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui';

// ==================== Interfaces ====================

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

  // General Page & Feedback State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Inbound Intake & Routing Policy State
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

  // ==================== Data Fetching ====================

  const fetchGmailStatus = useCallback(async () => {
    try {
      const gmailStatus = await apiClient<GmailConnectionState>('/email-integration/gmail/status');
      if (gmailStatus) {
        setGmailConnection(gmailStatus);
      }
    } catch {
      // Non-blocking if Gmail status route is uninitialized
    }
  }, []);

  const fetchInboundIntegration = useCallback(async () => {
    try {
      const configRes = await apiClient<IncomingConfigState>('/tenants/email-config/incoming');
      setIncomingConfig(configRes);
    } catch {
      try {
        const fallbackRes = await apiClient<IncomingConfigState>('/incoming-email/config');
        setIncomingConfig(fallbackRes);
      } catch {
        // Non-blocking
      }
    }
  }, []);

  const fetchPolicyConfig = useCallback(async () => {
    try {
      const data = await apiClient<any>('/email-config');
      if (data?.emailConfig) {
        setPolicyConfig({
          id: data.emailConfig.id,
          supportEmail: data.emailConfig.supportEmail || '',
          enabled: data.emailConfig.enabled ?? true,
          autoCreateTicket: data.emailConfig.autoCreateTicket ?? true,
          autoRoute: data.emailConfig.autoRoute ?? true,
          status: data.emailConfig.status || 'ACTIVE',
        });
      }
      if (data?.connection) {
        setGmailConnection((prev) => ({
          ...prev,
          ...data.connection,
        }));
      }
    } catch {
      // Non-blocking
    }
  }, []);

  const fetchRecentEmails = useCallback(async () => {
    setIsLoadingEmails(true);
    try {
      const data = await apiClient<InboundEmailAuditItem[]>('/email-config/recent-inbound');
      setRecentInboundEmails(Array.isArray(data) ? data : []);
    } catch {
      setRecentInboundEmails([]);
    } finally {
      setIsLoadingEmails(false);
    }
  }, []);

  // Read URL query params for OAuth status redirects
  useEffect(() => {
    const errorParam = searchParams.get('error');
    const successParam = searchParams.get('success');
    const connectedParam = searchParams.get('connected');
    const emailParam = searchParams.get('email');

    if (errorParam) {
      setFeedback({
        type: 'error',
        message: decodeURIComponent(errorParam),
      });
    } else if (connectedParam === 'true' || successParam) {
      const connectedEmail = emailParam ? decodeURIComponent(emailParam) : null;
      setFeedback({
        type: 'success',
        message: `Google Workspace support mailbox ${connectedEmail ? `(${connectedEmail}) ` : ''}connected successfully!`,
      });
      // Immediately reflect connected status in UI from verified server callback
      if (connectedEmail) {
        setGmailConnection({
          isConnected: true,
          status: 'CONNECTED',
          emailAddress: connectedEmail,
          lastSyncAt: new Date().toISOString(),
          provider: 'GMAIL',
        });
      }
      fetchGmailStatus();
      fetchPolicyConfig();
    }
  }, [searchParams, fetchGmailStatus, fetchPolicyConfig]);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      fetchInboundIntegration(),
      fetchGmailStatus(),
      fetchPolicyConfig(),
      fetchRecentEmails(),
    ]);
    setIsLoading(false);
  }, [fetchInboundIntegration, fetchGmailStatus, fetchPolicyConfig, fetchRecentEmails]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Automatically dismiss success feedback after 5 seconds
  useEffect(() => {
    if (feedback?.type === 'success') {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [feedback]);

  // ==================== Handlers ====================

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
      setGmailConnection({
        isConnected: false,
        status: 'DISCONNECTED',
        emailAddress: null,
        lastSyncAt: null,
        provider: 'GMAIL',
      });
      await Promise.all([fetchGmailStatus(), fetchPolicyConfig(), fetchInboundIntegration()]);
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
      await Promise.all([fetchGmailStatus(), fetchPolicyConfig(), fetchRecentEmails()]);
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

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPolicy(true);
    setFeedback(null);

    try {
      await apiClient('/email-config', {
        method: 'POST',
        body: JSON.stringify({
          supportEmail: policyConfig.supportEmail?.trim() || `support@kalpak.solutions`,
          enabled: policyConfig.enabled,
          autoCreateTicket: policyConfig.autoCreateTicket,
          autoRoute: policyConfig.autoRoute,
        }),
      });

      setFeedback({
        type: 'success',
        message: 'Intake and routing automation policies updated successfully.',
      });
      await fetchPolicyConfig();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err instanceof ApiClientError ? err.message : 'Failed to update intake policy',
      });
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const primaryInboundAddress =
    incomingConfig?.dedicatedInboundAddress ||
    (incomingConfig?.tenantSlug
      ? `c5e1f5045bfd98846d8e+${incomingConfig.tenantSlug}@cloudmailin.net`
      : 'c5e1f5045bfd98846d8e@cloudmailin.net');

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <Link href="/dashboard" className="hover:text-slate-800">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-700">Settings</span>
            <span>/</span>
            <span className="text-orange-600 font-semibold">Email &amp; Ticketing Channels</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Mail className="w-6 h-6 text-orange-600" />
            Support Email &amp; Inbound Ticketing Channels
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Connect your customer communication channels. Inbound emails automatically convert into live service tickets with zero manual forwarding friction.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={isLoading}
            className="flex items-center gap-2 text-slate-600 bg-white hover:bg-slate-50 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Link href="/dashboard/tickets">
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-1.5 text-xs font-bold shadow-sm">
              <span>View Tickets Section</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Global Alert Notification */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-start justify-between border text-sm transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <p className="font-medium text-xs md:text-sm">{feedback.message}</p>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold opacity-70 hover:opacity-100 ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* OVERVIEW STATS                                           */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-5 border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Channel 1: Built-in Address
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2 truncate">
            {primaryInboundAddress}
          </p>
          <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Always Active • Zero Setup
          </p>
        </Card>

        <Card className="p-5 border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Channel 2: Google Workspace
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">
            {gmailConnection.isConnected ? (
              <span className="text-emerald-700">Connected</span>
            ) : (
              <span className="text-slate-500">Not Connected</span>
            )}
          </p>
          <p className="text-xs text-slate-500 mt-1 truncate">
            {gmailConnection.isConnected
              ? gmailConnection.emailAddress || 'Official Inbox Sync Active'
              : '1-Click Connect available below'}
          </p>
        </Card>

        <Card className="p-5 border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Ticket Ingestion Status
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Power className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">
            {policyConfig.enabled ? 'Running' : 'Paused'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Auto-Create: {policyConfig.autoCreateTicket ? 'Enabled' : 'Disabled'} • Auto-Route: {policyConfig.autoRoute ? 'Enabled' : 'Disabled'}
          </p>
        </Card>
      </div>

      {/* ======================================================== */}
      {/* INBOUND CHANNELS (OPTION 1 & OPTION 2)                   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Option 1: Built-in Dedicated Inbound Address */}
        <Card className="border-orange-200 bg-gradient-to-br from-white via-orange-50/20 to-white shadow-sm overflow-hidden flex flex-col justify-between">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="neutral" className="bg-orange-100/80 text-orange-800 border-orange-300 font-bold text-[11px] px-2.5 py-0.5">
                Channel 1 • Instant &amp; Zero-Config
              </Badge>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active &amp; Ready
              </span>
            </div>
            <CardTitle className="text-base font-bold text-slate-900 mt-3 flex items-center gap-2">
              <Mail className="w-5 h-5 text-orange-600" />
              Built-in Dedicated Support Address
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Your organization&apos;s pre-configured Kalpak support address. Anyone who emails this address automatically generates a ticket in your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-4">
            <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between gap-3 shadow-inner">
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-orange-400 block font-bold">
                  Your Support Address
                </span>
                <p className="font-mono text-sm font-semibold text-white truncate selection:bg-orange-600">
                  {primaryInboundAddress}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => handleCopyInbound(primaryInboundAddress)}
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
                Put this email address on your invoices, website contact page, or client portal. Any customer email arriving here automatically creates a live ticket in your Ticket Management dashboard.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Option 2: 1-Click Connect with Google Workspace / Gmail */}
        <Card className="border-blue-200 bg-gradient-to-br from-white via-blue-50/20 to-white shadow-sm overflow-hidden flex flex-col justify-between">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="neutral" className="bg-blue-100/80 text-blue-800 border-blue-300 font-bold text-[11px] px-2.5 py-0.5">
                Channel 2 • 1-Click Google OAuth
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
              Connect your company&apos;s official Google Workspace or Gmail support mailbox. Incoming customer emails and replies sync into tickets automatically.
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
      {/* 2. INTAKE & TICKET AUTOMATION SETTINGS                   */}
      {/* ======================================================== */}
      <Card className="border-slate-200 bg-white overflow-hidden shadow-sm">
        <CardHeader className="p-6 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-orange-600" />
            Intake &amp; Automatic Routing Policies
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Configure how incoming customer emails are converted into service tickets and assigned to teams.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSavePolicy} className="space-y-6">
            {/* Master Toggle */}
            <div className="flex items-center justify-between p-4 bg-orange-50/40 rounded-xl border border-orange-100">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Power className="w-4 h-4 text-orange-600" />
                  Enable Email-to-Ticket Ingestion
                </span>
                <p className="text-xs text-slate-500">
                  When enabled, real customer emails to your inbound address create service tickets in real time.
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
                  When enabled, incoming emails automatically generate a service ticket with an assigned tracking number.
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
                  Auto-detects department (Maintenance, Electrical, Mechanical) and priority based on email keywords.
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
      {/* 3. RECENT INBOUND EMAILS AUDIT TRAIL                     */}
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
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {item.departmentName || 'General Support'}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right">
                        {item.ticketId ? (
                          <Link
                            href={`/dashboard/tickets/${item.ticketId}`}
                            className="inline-flex items-center gap-1 font-mono font-bold text-orange-600 hover:text-orange-800 hover:underline"
                          >
                            <span>#{item.ticketNumber || 'TICKET'}</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="text-slate-400 font-mono">--</span>
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
    </div>
  );
}
