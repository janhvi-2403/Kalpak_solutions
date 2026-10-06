'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  LifeBuoy,
  Phone,
  Mail,
  Clock,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui';

interface SupportRequest {
  id: string;
  referenceId: string;
  subject: string;
  category: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  contactEmail: string;
  contactPhone?: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED';
  createdAt: string;
}

export default function SupportPage() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('SLA & Routing Configuration');
  const [priority, setPriority] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('clientadmin@acme.com');
  const [contactPhone, setContactPhone] = useState('+91 7498862377');

  const fetchTenantSupport = useCallback(async () => {
    try {
      setIsLoading(true);
      const tenant = await apiClient<any>('/tenants/current');
      if (tenant?.settings?.supportRequests) {
        setRequests(tenant.settings.supportRequests);
      }
    } catch (err) {
      console.error('Failed to load support requests:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenantSupport();
  }, [fetchTenantSupport]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      alert('Please fill in both the subject and detailed description.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSuccessMsg(null);

      const refNum = Math.floor(10000 + Math.random() * 90000);
      const newRequest: SupportRequest = {
        id: 'sr_' + Date.now(),
        referenceId: `KALPAK-SR-${refNum}`,
        subject: subject.trim(),
        category,
        priority,
        description: description.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        status: 'OPEN',
        createdAt: new Date().toISOString(),
      };

      const updatedRequests = [newRequest, ...requests];

      await apiClient('/tenants/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          supportRequests: updatedRequests,
        }),
      });

      setRequests(updatedRequests);
      setSubject('');
      setDescription('');
      setSuccessMsg(
        `Your request #${newRequest.referenceId} has been lodged with Kalpak Solutions Enterprise Desk. Our engineers will respond within SLA targets!`
      );
    } catch (err) {
      alert('Failed to submit support request: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'CRITICAL':
        return <span className="bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded">P1 - Critical</span>;
      case 'HIGH':
        return <span className="bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded">P2 - High</span>;
      case 'MEDIUM':
        return <span className="bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded">P3 - Medium</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded">P4 - Low</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Kalpak Solutions SaaS Support &amp; Help Desk
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Raise enterprise support requests directly with the Kalpak engineering team or reach our 24/7 hotline.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            SaaS SLA Status: Operational (99.98%)
          </span>
        </div>
      </div>

      {/* ── Contact Options Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-blue-600">
            <Phone className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider font-mono">24/7 Priority Hotline</span>
          </div>
          <div className="text-lg font-black text-slate-900">+91 74988 62377</div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Direct escalation bridge for critical platform downtime, database connectivity, or billing locks.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-indigo-600">
            <Mail className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider font-mono">Dedicated Support Email</span>
          </div>
          <div className="text-lg font-black text-slate-900">support@kalpaksolutions.com</div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Direct ticket logging for SLA rule assistance, custom service categories, or API webhooks.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-purple-600">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider font-mono">Guaranteed SaaS SLAs</span>
          </div>
          <div className="text-xs space-y-1 pt-1 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">P1 (Critical):</span>
              <span className="font-bold text-rose-600">&lt; 15 min response</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">P2 (High):</span>
              <span className="font-bold text-amber-600">&lt; 2 hr response</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">P3 (Medium/Low):</span>
              <span className="font-bold text-blue-600">&lt; 8 hr response</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Form: Raise a Support Request ── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-600" />
            Raise a Support Request with Kalpak Solutions
          </h2>
          <p className="text-xs text-slate-500">
            Submit a formal ticket to our SaaS operations team. We track resolution milestones under your SLA contract.
          </p>
        </div>

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmitRequest} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1 sm:col-span-2">
              <label className="font-bold text-slate-700">Ticket Subject / Title *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Need assistance setting up Hydraulic ticket assignment rule"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Urgency &amp; Severity *</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 font-semibold"
              >
                <option value="CRITICAL">P1 - Critical (System Down)</option>
                <option value="HIGH">P2 - High (Key Function Blocked)</option>
                <option value="MEDIUM">P3 - Medium (Configuration Question)</option>
                <option value="LOW">P4 - Low (General Inquiry)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Module / Issue Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 font-medium"
              >
                <option value="SLA & Routing Configuration">SLA &amp; Routing Configuration</option>
                <option value="Service Categories & Priorities">Service Categories &amp; Priorities</option>
                <option value="Subscription & Razorpay Invoicing">Subscription &amp; Razorpay Invoicing</option>
                <option value="Employee Quota & Department Roles">Employee Quota &amp; Department Roles</option>
                <option value="Reports & Data Export">Reports &amp; Data Export</option>
                <option value="Security & Audit Logs">Security &amp; Audit Logs</option>
                <option value="Other SaaS Inquiry">Other SaaS Inquiry</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Your Contact Email *</label>
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Phone for Urgent Callback</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <label className="font-bold text-slate-700">Detailed Description &amp; Reproduction Steps *</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue, expected behavior, relevant department or employee IDs, and attach any relevant context..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-900 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-6 py-2.5 gap-2 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Lodging Request...' : 'Submit Support Request'}</span>
            </Button>
          </div>
        </form>
      </div>

      {/* ── Past Support Requests Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Your Lodged SaaS Support Tickets</h2>
            <p className="text-xs text-slate-500">History and current status of requests with Kalpak Solutions</p>
          </div>
          <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
            {requests.length} Requests
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-semibold font-mono text-[10px]">
              <tr>
                <th className="py-3 px-6">Reference ID</th>
                <th className="py-3 px-6">Subject &amp; Category</th>
                <th className="py-3 px-6">Priority</th>
                <th className="py-3 px-6">Date Lodged</th>
                <th className="py-3 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    Loading your lodged support tickets...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    No support tickets lodged yet. Raise one above whenever you need help.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-6 font-mono font-bold text-blue-600">
                      {r.referenceId}
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="font-bold text-slate-900">{r.subject}</div>
                      <div className="text-[10px] text-slate-400">{r.category}</div>
                    </td>
                    <td className="py-3.5 px-6">{getPriorityBadge(r.priority)}</td>
                    <td className="py-3.5 px-6 font-mono text-[11px] text-slate-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
