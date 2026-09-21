'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wrench,
  ShieldCheck,
  User,
  Calendar,
  Cpu,
  Package,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { PortalTicketDetail } from '@kalpak/types';

export default function PortalTicketDetailPage() {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || '';
  const ticketId = (params?.id as string) || '';

  const [ticket, setTicket] = useState<PortalTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadTicket() {
      try {
        const data = await apiClient<PortalTicketDetail>(`/portal/tickets/${ticketId}`);
        setTicket(data);
      } catch (err: any) {
        setErrorMsg(err.message || 'Ticket not found or you do not have permission to view it.');
      } finally {
        setLoading(false);
      }
    }

    if (ticketId) {
      loadTicket();
    }
  }, [ticketId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Open (Pending Dispatch)
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/25">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            In Progress / Technician Dispatched
          </span>
        );
      case 'AWAITING_CUSTOMER':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/25">
            Awaiting Customer Input
          </span>
        );
      case 'RESOLVED':
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Resolved & Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Critical
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
            High
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Medium
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
            Low
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 font-sans">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
        <span>Loading ticket details...</span>
      </div>
    );
  }

  if (errorMsg || !ticket) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center font-sans">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">Unable to Load Ticket</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">{errorMsg || 'Ticket not found'}</p>
        <Link
          href={`/portal/${tenantSlug}/tickets`}
          className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Tickets</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans">
      {/* Top Breadcrumb & Title */}
      <div>
        <Link
          href={`/portal/${tenantSlug}/tickets`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Tickets</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-sm font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-lg border border-blue-500/20">
                {ticket.ticketNumber}
              </span>
              {getPriorityBadge(ticket.priority)}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {ticket.title}
            </h1>
          </div>

          <div className="self-start sm:self-auto">
            {getStatusBadge(ticket.status)}
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details, Timeline, Work Orders */}
        <div className="lg:col-span-2 space-y-6">
          {/* Issue Description Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Reported Symptoms & Description</span>
            </h2>
            <p className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">
              {ticket.description}
            </p>
          </div>

          {/* Service Visits & Work Orders */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>Field Engineering Visits ({ticket.workOrders.length})</span>
            </h2>

            {ticket.workOrders.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No on-site visits scheduled yet. Our service desk is evaluating initial diagnostics.
              </p>
            ) : (
              <div className="space-y-3">
                {ticket.workOrders.map((wo) => (
                  <div
                    key={wo.id}
                    className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-300">
                          {wo.orderNumber}
                        </span>
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {wo.status}
                        </span>
                      </div>
                      {wo.scheduledDate && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(wo.scheduledDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Specialist: <strong className="text-slate-200">{wo.technicianName}</strong></span>
                    </div>

                    {wo.summary && (
                      <div className="mt-2 text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        <span className="font-semibold text-slate-400 text-[11px] block mb-1">Resolution Summary:</span>
                        {wo.summary}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Parts Consumed & Billing Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <span>Replacement Parts Consumed & Live Billing</span>
              </h2>

              {ticket.billing.items.length > 0 && (
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  ₹{ticket.billing.netBillable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>

            {ticket.billing.items.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No replacement parts installed on this ticket yet.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Part Details</th>
                        <th className="py-2.5 px-3">Qty</th>
                        <th className="py-2.5 px-3">Unit Price</th>
                        <th className="py-2.5 px-3">Coverage</th>
                        <th className="py-2.5 px-3 text-right">Billable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {ticket.billing.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-200">{item.partName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{item.partNumber}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-300 font-medium">
                            {item.quantity}
                          </td>
                          <td className="py-3 px-3 text-slate-300 font-mono">
                            ₹{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3">
                            {item.isWarrantyCovered ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                                <ShieldCheck className="w-3 h-3" />
                                Warranty (100% Covered)
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Billable</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-slate-100">
                            {item.isWarrantyCovered ? (
                              <span className="text-emerald-400 line-through mr-1.5 text-[11px] text-slate-500">
                                ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                              </span>
                            ) : null}
                            ₹{item.billedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Billing Summary Box */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Parts Subtotal:</span>
                    <span className="font-mono">
                      ₹{ticket.billing.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {ticket.billing.warrantyDiscount > 0 && (
                    <div className="flex items-center justify-between text-emerald-400">
                      <span>Warranty Protection Discount:</span>
                      <span className="font-mono">
                        - ₹{ticket.billing.warrantyDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm font-bold text-white">
                    <span>Total Billed to Customer:</span>
                    <span className="font-mono text-emerald-400 text-base">
                      ₹{ticket.billing.netBillable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Ticket Activity Timeline */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Service Progress Timeline</span>
            </h2>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {ticket.timeline.map((event) => (
                <div key={event.id} className="relative">
                  <div className="absolute -left-6 top-1.5 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-slate-900" />
                  <div className="text-xs font-semibold text-slate-200">
                    {event.eventType.replace(/_/g, ' ')}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>{new Date(event.createdAt).toLocaleString()}</span>
                    <span>•</span>
                    <span>By: {event.actorName}</span>
                  </div>
                  {event.note && (
                    <div className="mt-2 text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                      {event.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Machinery & Ticket Meta Card */}
        <div className="space-y-6">
          {/* Machinery Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>Registered Machine</span>
            </h3>

            {ticket.assetName ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Model / Name</span>
                  <span className="font-bold text-white text-sm mt-0.5 block">{ticket.assetName}</span>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Serial Number</span>
                  <span className="font-mono text-blue-300 font-semibold mt-0.5 block">
                    {ticket.assetSerialNumber}
                  </span>
                </div>

                <Link
                  href={`/portal/${tenantSlug}/assets`}
                  className="block text-center text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors py-1"
                >
                  View Complete Maintenance History →
                </Link>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                General maintenance call (no specific plant machine linked).
              </p>
            )}
          </div>

          {/* Ticket Metadata Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 text-xs">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Ticket Logistics
            </h3>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Assigned Desk:</span>
              <span className="font-medium text-slate-200">{ticket.assignedToName}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Submitted Date:</span>
              <span className="text-slate-200">
                {new Date(ticket.createdAt).toLocaleDateString()}
              </span>
            </div>

            {ticket.dueAt && (
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Expected Resolution:</span>
                <span className="text-slate-200">
                  {new Date(ticket.dueAt).toLocaleDateString()}
                </span>
              </div>
            )}

            {ticket.resolvedAt && (
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800 text-emerald-400">
                <span>Completed Date:</span>
                <span>{new Date(ticket.resolvedAt).toLocaleDateString()}</span>
              </div>
            )}

            <div className="pt-2">
              <Link
                href={`/portal/${tenantSlug}/tickets/raise`}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-medium transition-colors"
              >
                <span>Raise Another Ticket</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
