'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import {
  LifeBuoy,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
  Wrench,
  Flame,
  ShieldAlert,
  Layers,
  RotateCcw,
} from 'lucide-react';
import {
  Button,
  Input,
  Dialog,
  Badge,
} from '@/components/ui';

interface TicketListItem {
  id: string;
  ticketNumber: string;
  title: string;
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'AWAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isOverdue: boolean;
  raisedBy: 'CUSTOMER' | 'EMPLOYEE';
  raisedForCustomer?: { id: string; companyName: string } | null;
  assignedTo?: { id: string; fullName: string; email: string } | null;
  department?: { id: string; name: string; code: string } | null;
  customerAsset?: { id: string; serialNumber: string; product: { name: string; modelNumber: string } } | null;
  createdAt: string;
  updatedAt: string;
  dueAt?: string | null;
}

interface TicketStats {
  total: number;
  open: number;
  assigned: number;
  inProgress: number;
  awaitingCustomer: number;
  resolved: number;
  closed: number;
  cancelled: number;
  overdue: number;
  resolvedToday: number;
  createdToday: number;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Customer {
  id: string;
  companyName: string;
}

interface Asset {
  id: string;
  serialNumber: string;
  product?: { name: string; modelNumber: string };
  customerId?: string;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dropdown options for create modal
  const [departments, setDepartments] = useState<Department[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiClient<TicketStats>('/tickets/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch ticket stats:', err);
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string | number | boolean | undefined> = {
        page,
        pageSize: 15,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        isOverdue: overdueOnly ? true : undefined,
      };

      const result = await apiClient<{ data: TicketListItem[]; total: number; totalPages: number }>('/tickets', { params });
      setTickets(result.data || []);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load tickets',
      });
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter, priorityFilter, overdueOnly]);

  const fetchLookupData = useCallback(async () => {
    try {
      const [depts, custs, assts] = await Promise.all([
        apiClient<Department[]>('/departments').catch(() => []),
        apiClient<Customer[]>('/customers').catch(() => []),
        apiClient<Asset[]>('/assets').catch(() => []),
      ]);
      setDepartments(depts);
      setCustomers(custs);
      setAssets(assts);
    } catch (err) {
      console.error('Failed to load lookup data:', err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchLookupData();
  }, [fetchStats, fetchLookupData]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    try {
      setIsSubmitting(true);
      setFeedbackMsg(null);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        priority,
        raisedBy: 'EMPLOYEE',
        ...(selectedDeptId ? { departmentId: selectedDeptId } : {}),
        ...(selectedCustomerId ? { raisedForCustomerId: selectedCustomerId } : {}),
        ...(selectedAssetId ? { customerAssetId: selectedAssetId } : {}),
      };

      const newTicket = await apiClient<TicketListItem>('/tickets', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setFeedbackMsg({
        type: 'success',
        text: `Ticket ${newTicket.ticketNumber} created successfully!`,
      });

      // Reset form
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setSelectedDeptId('');
      setSelectedCustomerId('');
      setSelectedAssetId('');

      // Refresh list & stats
      await Promise.all([fetchTickets(), fetchStats()]);
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to create ticket',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: TicketListItem['status']) => {
    switch (status) {
      case 'OPEN':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Open</span>;
      case 'ASSIGNED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800 border border-cyan-200">Assigned</span>;
      case 'IN_PROGRESS':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">In Progress</span>;
      case 'AWAITING_CUSTOMER':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">Awaiting Customer</span>;
      case 'RESOLVED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Resolved</span>;
      case 'CLOSED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">Closed</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">Cancelled</span>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getPriorityBadge = (prio: TicketListItem['priority']) => {
    switch (prio) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300 animate-pulse">
            <Flame className="w-3 h-3 text-red-600" />
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Service Tickets & Calls
            </h1>
            <span className="text-[11px] font-mono font-bold bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
              Phase B Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Policy-aware ticket intake, intelligent auto-routing, immutable event timelines, and SLA enforcement.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-600/20 gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Raise Service Ticket</span>
        </Button>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-xs font-semibold hover:underline opacity-70"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Tickets</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats?.total ?? '—'}</div>
          <div className="text-[10px] text-slate-400 mt-1">Tenant lifetime</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Open / Queued</div>
          <div className="text-2xl font-black text-blue-600 mt-1">{stats?.open ?? '—'}</div>
          <div className="text-[10px] text-slate-400 mt-1">Awaiting technician</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">In Progress</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">{stats?.inProgress ?? '—'}</div>
          <div className="text-[10px] text-slate-400 mt-1">Under active service</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">Customer Wait</div>
          <div className="text-2xl font-black text-purple-600 mt-1">{stats?.awaitingCustomer ?? '—'}</div>
          <div className="text-[10px] text-slate-400 mt-1">Pending client info</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Resolved</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{(stats?.resolved ?? 0) + (stats?.closed ?? 0)}</div>
          <div className="text-[10px] text-emerald-600/80 mt-1 font-medium">{stats?.resolvedToday ?? 0} today</div>
        </div>

        <div className={`p-4 rounded-xl border shadow-sm ${
          (stats?.overdue ?? 0) > 0
            ? 'bg-rose-50/70 border-rose-200 text-rose-900'
            : 'bg-white border-slate-200/80 text-slate-900'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              SLA Overdue
            </span>
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">{stats?.overdue ?? 0}</div>
          <div className="text-[10px] text-rose-500 mt-1">Past tolerable days</div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ticket #, title, customer, asset..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="AWAITING_CUSTOMER">Awaiting Customer</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Priority Dropdown */}
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Overdue Checkbox Button */}
          <button
            onClick={() => {
              setOverdueOnly(!overdueOnly);
              setPage(1);
            }}
            className={`px-3 py-2 text-xs rounded-lg border font-medium flex items-center gap-1.5 transition-colors ${
              overdueOnly
                ? 'bg-rose-100 text-rose-800 border-rose-300 font-semibold'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <span>Overdue Only</span>
          </button>

          {/* Reset Filters */}
          {(search || statusFilter || priorityFilter || overdueOnly) && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setPriorityFilter('');
                setOverdueOnly(false);
                setPage(1);
              }}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Ticket List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-slate-400 font-mono">
            Loading tickets from tenant datastore...
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <div className="text-base font-bold text-slate-800">No Tickets Found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search || statusFilter || priorityFilter || overdueOnly
                ? 'No tickets match your filter criteria. Try clearing some filters.'
                : 'Get started by creating your first service call or ticket.'}
            </p>
            <Button
              onClick={() => setIsModalOpen(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Raise Ticket
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Ticket Ref</th>
                  <th className="py-3 px-4">Issue Title & Details</th>
                  <th className="py-3 px-4">Customer & Machine</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                  >
                    {/* Ticket Ref */}
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                      <Link
                        href={`/dashboard/tickets/${t.id}`}
                        className="hover:underline flex items-center gap-1.5"
                      >
                        <span>{t.ticketNumber}</span>
                        {t.isOverdue && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" title="SLA Overdue" />
                        )}
                      </Link>
                    </td>

                    {/* Title */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <Link
                        href={`/dashboard/tickets/${t.id}`}
                        className="font-bold text-slate-900 group-hover:text-blue-600 line-clamp-1"
                      >
                        {t.title}
                      </Link>
                      {t.department && (
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-slate-400" />
                          <span>{t.department.name}</span>
                        </div>
                      )}
                    </td>

                    {/* Customer & Asset */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800 truncate max-w-[160px]">
                        {t.raisedForCustomer?.companyName || 'Internal Client'}
                      </div>
                      {t.customerAsset && (
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Wrench className="w-3 h-3 text-slate-400" />
                          <span>{t.customerAsset.serialNumber}</span>
                        </div>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getPriorityBadge(t.priority)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(t.status)}
                    </td>

                    {/* Assigned To */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {t.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                            {t.assignedTo.fullName.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-800">{t.assignedTo.fullName}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link href={`/dashboard/tickets/${t.id}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold gap-1 text-xs"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Page <span className="font-bold text-slate-800">{page}</span> of{' '}
              <span className="font-bold text-slate-800">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Ticket Modal Dialog */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Raise New Service Ticket"
        description="Policy-aware ticket dispatch. Reference number and timeline event will be auto-generated."
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Issue Title *
            </label>
            <Input
              required
              placeholder="e.g. Hydraulic pressure drop during stamping cycle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Issue Description & Symptoms *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Provide detailed observations, error codes, and operational symptoms..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium (Standard SLA)</option>
                <option value="HIGH">High (Urgent Attention)</option>
                <option value="CRITICAL">Critical (Line Stoppage)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Department
              </label>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              >
                <option value="">Auto-route by Policy</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Customer Account
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              >
                <option value="">Internal / Not Linked</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Equipment / Asset
              </label>
              <select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              >
                <option value="">Select Asset (Optional)</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.serialNumber} {a.product?.name ? `(${a.product.name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
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
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-600/20"
            >
              {isSubmitting ? 'Creating Ticket...' : 'Create Ticket'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
