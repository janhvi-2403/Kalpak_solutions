'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Mail,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Shield,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Skeleton,
} from '@/components/ui';

export interface EmailConfigurationData {
  id?: string;
  tenantId?: string;
  supportEmail: string;
  provider: string;
  providerAddress?: string;
  enabled: boolean;
  autoCreateTicket: boolean;
  autoRoute: boolean;
  status: string;
  verifiedAt?: string | null;
}

export interface InboundEmailItem {
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

export function EmailConfigurationTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Configuration State
  const [config, setConfig] = useState<EmailConfigurationData>({
    supportEmail: '',
    provider: 'MAILGUN',
    providerAddress: '',
    enabled: true,
    autoCreateTicket: true,
    autoRoute: true,
    status: 'ACTIVE',
  });

  const [inboundDetails, setInboundDetails] = useState<{
    provider: string;
    providerInboundAddress: string;
    webhookUrl: string;
    webhookSecretConfigured: boolean;
    status: string;
  }>({
    provider: 'MAILGUN',
    providerInboundAddress: '',
    webhookUrl: '',
    webhookSecretConfigured: false,
    status: 'ACTIVE',
  });

  const [recentEmails, setRecentEmails] = useState<InboundEmailItem[]>([]);

  // Load configuration from API
  const loadEmailConfig = useCallback(async () => {
    try {
      setLoading(true);
      setFeedback(null);
      const res = await apiClient<{
        emailConfig: EmailConfigurationData;
        inboundDetails: typeof inboundDetails;
        recentInboundEmails: InboundEmailItem[];
      }>('/tenants/email-config');

      if (res && res.emailConfig) {
        setConfig(res.emailConfig);
      }
      if (res && res.inboundDetails) {
        setInboundDetails(res.inboundDetails);
      }
      if (res && res.recentInboundEmails) {
        setRecentEmails(res.recentInboundEmails);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to load email integration configuration.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmailConfig();
  }, [loadEmailConfig]);

  // Save updated configuration
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.supportEmail.trim()) {
      setFeedback({ type: 'error', message: 'Support email address cannot be empty.' });
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);

      const updated = await apiClient<EmailConfigurationData>('/tenants/email-config', {
        method: 'PUT',
        body: JSON.stringify({
          supportEmail: config.supportEmail.trim().toLowerCase(),
          enabled: config.enabled,
          autoCreateTicket: config.autoCreateTicket,
          autoRoute: config.autoRoute,
        }),
      });

      setConfig(updated);
      setFeedback({
        type: 'success',
        message: 'Email configuration successfully saved! Inbound emails will be routed according to these settings.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to save email configuration.',
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string, enabled: boolean) => {
    if (!enabled) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          Disabled
        </span>
      );
    }

    switch (status.toUpperCase()) {
      case 'ACTIVE':
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Active & Verified
          </span>
        );
      case 'PENDING_VERIFICATION':
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Pending Verification
          </span>
        );
      case 'ERROR':
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Integration Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
            Not Configured
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Hero Overview Header */}
      <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent p-6 rounded-2xl border border-orange-200/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-md">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">Inbound Email Support Integration</h2>
              {getStatusBadge(config.status, config.enabled)}
            </div>
            <p className="text-sm text-slate-600 mt-0.5">
              Receive customer emails, automatically create isolated service tickets, and route them to the right department.
            </p>
          </div>
        </div>

        <Button
          onClick={loadEmailConfig}
          variant="outline"
          size="sm"
          className="gap-2 text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Status
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-orange-600" />
            Tenant Email Settings
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Configure your organization's support email address and automated ticket intake policies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveConfig} className="space-y-6">
            {/* Enable Email Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="space-y-0.5">
                <label className="text-sm font-bold text-slate-900">Enable Inbound Email Support</label>
                <p className="text-xs text-slate-500">
                  When enabled, real customer emails to your support address will create service tickets.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500" />
              </label>
            </div>

            {/* Support Email Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span>Configured Support Email Address *</span>
                  {(config.status === 'ACTIVE' || config.status === 'VERIFIED') && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 normal-case">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Verified & Active
                    </span>
                  )}
                </span>
                <span className="text-slate-400 font-normal normal-case text-xs">Customer-facing address</span>
              </label>
              <Input
                type="email"
                value={config.supportEmail}
                onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })}
                placeholder="e.g. support@acme-corp.com"
                required
                className="font-mono text-sm"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <p>
                  Incoming emails sent to this address will be resolved to your organization in real time.
                </p>
                <Link
                  href="/dashboard/settings/email-configuration"
                  className="text-orange-600 hover:text-orange-700 font-semibold inline-flex items-center gap-1 shrink-0 ml-2"
                >
                  <span>Manage Support Mailboxes</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Automation Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Auto-Create Tickets</span>
                  <input
                    type="checkbox"
                    checked={config.autoCreateTicket}
                    onChange={(e) => setConfig({ ...config, autoCreateTicket: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  When enabled, every valid email from known or new customers automatically creates a service ticket.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Automatic Routing</span>
                  <input
                    type="checkbox"
                    checked={config.autoRoute}
                    onChange={(e) => setConfig({ ...config, autoRoute: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Auto-detects department (IT, Electrical, Mechanical, HR) and priority (Critical, High, Medium) based on email keywords.
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={saving}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 shadow-sm"
              >
                {saving ? 'Saving Settings...' : 'Save Email Configuration'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Recent Inbound Emails Audit Feed */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              Recent Inbound Emails Audit Trail
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Live record of emails received and processed for your organization.
            </CardDescription>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {recentEmails.length} {recentEmails.length === 1 ? 'Record' : 'Records'}
          </span>
        </CardHeader>
        <CardContent>
          {recentEmails.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Mail className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700">No Inbound Emails Received Yet</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Send a test email to your configured support address <code>{config.supportEmail || 'support@yourdomain.com'}</code> to see it appear here live!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Received</th>
                    <th className="py-3 px-4">From</th>
                    <th className="py-3 px-4">To</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Routed Department</th>
                    <th className="py-3 px-4">Ticket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentEmails.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {new Date(item.receivedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.fromName || item.fromEmail}</div>
                        {item.fromName && <div className="text-[10px] text-slate-400 font-mono">{item.fromEmail}</div>}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {item.toEmail}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 max-w-xs truncate">
                        {item.subject}
                      </td>
                      <td className="py-3 px-4">
                        {item.departmentName ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {item.departmentName}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
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
    </div>
  );
}
