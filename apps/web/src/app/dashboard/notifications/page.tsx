'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Mail,
  Smartphone,
  Shield,
  Send,
  RefreshCw,
  Sliders,
  Check,
  LifeBuoy,
} from 'lucide-react';
import { Button } from '@/components/ui';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  channel: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

interface NotificationPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  notifyOnTicketCreated: boolean;
  notifyOnSlaBreach: boolean;
  notifyOnTicketResolved: boolean;
  notifyOnAssignment: boolean;
  digestFrequency: 'INSTANT' | 'DAILY' | 'WEEKLY';
  adminAlertEmails: string;
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'alerts' | 'preferences'>('alerts');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isDispatchingTest, setIsDispatchingTest] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // Company Preferences State
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    emailEnabled: true,
    smsEnabled: true,
    inAppEnabled: true,
    pushEnabled: true,
    notifyOnTicketCreated: true,
    notifyOnSlaBreach: true,
    notifyOnTicketResolved: true,
    notifyOnAssignment: true,
    digestFrequency: 'INSTANT',
    adminAlertEmails: 'clientadmin@acme.com',
  });

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient<{
        items: NotificationItem[];
        total: number;
        unreadCount: number;
      }>(`/notifications?pageSize=50${filterUnreadOnly ? '&unreadOnly=true' : ''}`);

      setNotifications(res?.items || []);
      setUnreadCount(res?.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filterUnreadOnly]);

  const fetchTenantPrefs = useCallback(async () => {
    try {
      const tenant = await apiClient<any>('/tenants/current');
      if (tenant?.settings?.notificationPreferences) {
        setPrefs((prev) => ({
          ...prev,
          ...tenant.settings.notificationPreferences,
        }));
      }
    } catch (err) {
      console.error('Failed to load tenant preferences:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchTenantPrefs();
  }, [fetchNotifications, fetchTenantPrefs]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiClient(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setIsMarkingAll(true);
      await apiClient('/notifications/mark-all-read', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleSendTestNotification = async () => {
    try {
      setIsDispatchingTest(true);
      await apiClient('/notifications/test-dispatch', {
        method: 'POST',
        body: JSON.stringify({
          channel: 'IN_APP',
          subject: 'Test SLA & Notification Dispatch',
          content: 'This is a live test notification from your Kalpak Solutions Client Admin portal.',
        }),
      });
      await fetchNotifications();
    } catch (err) {
      alert('Failed to send test notification: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsDispatchingTest(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingPrefs(true);
      setSaveSuccess(false);

      await apiClient('/tenants/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          notificationPreferences: prefs,
        }),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      alert('Failed to save preferences: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsSavingPrefs(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-100">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Company Notifications &amp; Alerts
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure company-level notification channels and inspect high-priority SLA and operational alerts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendTestNotification}
            disabled={isDispatchingTest}
            className="text-xs gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Send className="w-3.5 h-3.5 text-orange-500" />
            <span>{isDispatchingTest ? 'Dispatching...' : 'Send Test Alert'}</span>
          </Button>
          <Button
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isMarkingAll || unreadCount === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark All Read</span>
          </Button>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'alerts'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Active Alerts Stream</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-mono rounded-full bg-rose-500 text-white font-black">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'preferences'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Company Notification Preferences</span>
        </button>
      </div>

      {/* ── Tab 1: Live Alerts Stream ── */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterUnreadOnly}
                  onChange={(e) => setFilterUnreadOnly(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <span>Show Unread Only ({unreadCount})</span>
              </label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchNotifications}
              disabled={isLoading}
              className="text-xs text-blue-600 hover:text-blue-700 gap-1.5 h-7"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm divide-y divide-slate-100 overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-xs text-slate-400">
                Loading notification stream...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <div className="text-sm font-bold text-slate-800">You are all caught up!</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No active alerts require your immediate attention. New ticket assignments, SLA breaches, and customer updates will appear here.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isOverdue = item.title.toLowerCase().includes('overdue') || item.title.toLowerCase().includes('breach');
                const isTicket = item.title.toLowerCase().includes('ticket');

                return (
                  <div
                    key={item.id}
                    className={`p-4 transition flex items-start justify-between gap-4 ${
                      item.isRead ? 'bg-white hover:bg-slate-50/60' : 'bg-blue-50/40 hover:bg-blue-50/70'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                          isOverdue
                            ? 'bg-rose-100 text-rose-600'
                            : isTicket
                            ? 'bg-sky-100 text-sky-600'
                            : 'bg-amber-100 text-amber-600'
                        }`}
                      >
                        {isOverdue ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : isTicket ? (
                          <LifeBuoy className="w-4 h-4" />
                        ) : (
                          <Bell className="w-4 h-4" />
                        )}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {item.title}
                          </span>
                          {!item.isRead && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                          )}
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                            {item.channel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {item.message}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(item.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {!item.isRead && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMarkAsRead(item.id)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-100/60 shrink-0 h-8"
                      >
                        Mark Read
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── Tab 2: Company Notification Preferences ── */}
      {activeTab === 'preferences' && (
        <form onSubmit={handleSavePreferences} className="space-y-6">
          {saveSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Company notification preferences successfully updated and applied!</span>
            </div>
          )}

          {/* Delivery Channels */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Supported Alert Channels</h2>
              <p className="text-xs text-slate-500">Toggle communication gateways for dispatching operational events</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Email Notifications</div>
                    <div className="text-[11px] text-slate-500">Dispatch transactional updates to inbox</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.emailEnabled}
                  onChange={(e) => setPrefs({ ...prefs, emailEnabled: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">SMS Critical Alerts</div>
                    <div className="text-[11px] text-slate-500">SMS gateway for urgent P1 breakdown notices</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.smsEnabled}
                  onChange={(e) => setPrefs({ ...prefs, smsEnabled: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">In-App Notification Feed</div>
                    <div className="text-[11px] text-slate-500">Real-time alerts inside the dashboard</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.inAppEnabled}
                  onChange={(e) => setPrefs({ ...prefs, inAppEnabled: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Browser Push Notifications</div>
                    <div className="text-[11px] text-slate-500">Desktop push alerts when app is in background</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.pushEnabled}
                  onChange={(e) => setPrefs({ ...prefs, pushEnabled: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Trigger Event Rules */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Event Trigger Rules</h2>
              <p className="text-xs text-slate-500">Configure which operational milestones generate automated alerts</p>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-900">New Ticket Creation Alert</div>
                  <div className="text-[11px] text-slate-500">Notify department head and client admin whenever a customer opens a ticket</div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.notifyOnTicketCreated}
                  onChange={(e) => setPrefs({ ...prefs, notifyOnTicketCreated: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    SLA Breach Warning &amp; Escalation
                  </div>
                  <div className="text-[11px] text-slate-500">Instant notification when a ticket approaches or breaches its SLA resolution target</div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.notifyOnSlaBreach}
                  onChange={(e) => setPrefs({ ...prefs, notifyOnSlaBreach: e.target.checked })}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-900">Technician Assignment Alert</div>
                  <div className="text-[11px] text-slate-500">Notify the assigned employee when a ticket is routed to their work queue</div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.notifyOnAssignment}
                  onChange={(e) => setPrefs({ ...prefs, notifyOnAssignment: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-900">Ticket Resolution Confirmation</div>
                  <div className="text-[11px] text-slate-500">Send resolution note and customer sign-off request upon repair completion</div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.notifyOnTicketResolved}
                  onChange={(e) => setPrefs({ ...prefs, notifyOnTicketResolved: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Client Admin Alert Email(s)</label>
                <input
                  type="text"
                  value={prefs.adminAlertEmails}
                  onChange={(e) => setPrefs({ ...prefs, adminAlertEmails: e.target.value })}
                  placeholder="admin@company.com, alerts@company.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 font-mono"
                />
                <span className="text-[10px] text-slate-400">Comma-separated emails to receive SLA breach digests.</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Digest Summary Frequency</label>
                <select
                  value={prefs.digestFrequency}
                  onChange={(e) => setPrefs({ ...prefs, digestFrequency: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 font-medium"
                >
                  <option value="INSTANT">Real-time / Instant</option>
                  <option value="DAILY">Daily Morning Digest (09:00 AM)</option>
                  <option value="WEEKLY">Weekly Operational Summary (Mondays)</option>
                </select>
                <span className="text-[10px] text-slate-400">Batched rollup frequency for low-priority alerts.</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSavingPrefs}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-6 py-2.5 shadow-sm"
            >
              {isSavingPrefs ? 'Saving Settings...' : 'Save Notification Preferences'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
