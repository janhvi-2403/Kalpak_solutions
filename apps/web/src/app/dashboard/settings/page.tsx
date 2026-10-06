'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import {
  ShieldCheck,
  Settings,
  Clock,
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  Mail,
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

  useEffect(() => {
    fetchPolicy();
  }, [fetchPolicy]);

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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tenant Policy & Routing Matrix</h1>
            <span className="bg-blue-50 text-blue-700 text-xs font-mono font-semibold px-2 py-0.5 rounded border border-blue-200">
              SLA & Rules
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
          Configure business scope, assignment strategy, tolerable open period thresholds, and ticket closure permissions.
        </p>
      </div>

      {/* Settings Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200 text-sm font-semibold">
        <Link
          href="/dashboard/settings"
          className="px-4 py-2.5 text-orange-600 border-b-2 border-orange-600 transition-colors flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Policy & SLAs
        </Link>
        <Link
          href="/dashboard/settings/email-configuration"
          className="px-4 py-2.5 text-slate-600 hover:text-slate-900 border-b-2 border-transparent transition-colors flex items-center gap-2"
        >
          <Mail className="w-4 h-4" />
          Email Configuration
        </Link>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
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

      {isLoading ? (
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
      )}
    </div>
  );
}
