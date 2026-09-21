'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Ticket,
  Search,
  PlusCircle,
  ArrowUpRight,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { PortalTicketSummary } from '@kalpak/types';

export default function PortalTicketsPage() {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || '';

  const [tickets, setTickets] = useState<PortalTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (search.trim()) {
        params.search = search.trim();
      }

      const data = await apiClient<PortalTicketSummary[]>('/portal/tickets', { params });
      setTickets(data);
    } catch (err) {
      // Handle
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Open
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            In Progress
          </span>
        );
      case 'AWAITING_CUSTOMER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Awaiting Action
          </span>
        );
      case 'RESOLVED':
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Resolved
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <span className="text-rose-400 font-semibold flex items-center gap-1 text-[11px]"><ShieldAlert className="w-3 h-3" /> Critical</span>;
      case 'HIGH':
        return <span className="text-orange-400 font-medium text-[11px]">High</span>;
      case 'MEDIUM':
        return <span className="text-blue-400 font-medium text-[11px]">Medium</span>;
      default:
        return <span className="text-slate-400 font-medium text-[11px]">Low</span>;
    }
  };

  const filterTabs = [
    { label: 'All Tickets', value: 'ALL' },
    { label: 'Open', value: 'OPEN' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Resolved', value: 'RESOLVED' },
    { label: 'Closed', value: 'CLOSED' },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Service & Repair Tickets</h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse full history of maintenance tickets and track technician progress.
          </p>
        </div>

        <Link
          href={`/portal/${tenantSlug}/tickets/raise`}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-blue-600/25 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Raise New Request</span>
        </Link>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 sm:pb-0">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === tab.value
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticket # or keyword..."
            className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl pl-9 pr-4 py-2 border border-slate-800 focus:border-blue-500 focus:outline-none transition-colors"
          />
        </form>
      </div>

      {/* Tickets Table / List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
            <span>Fetching tickets...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Ticket className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-300">No matching tickets found</p>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your filter or search keywords, or submit a new service call.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px] bg-slate-950/40">
                  <th className="py-3.5 px-4">Ticket ID</th>
                  <th className="py-3.5 px-4">Subject & Issue</th>
                  <th className="py-3.5 px-4">Associated Machinery</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Logged On</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-4 font-mono font-medium text-blue-400">
                      {ticket.ticketNumber}
                    </td>
                    <td className="py-4 px-4 max-w-[280px]">
                      <div className="font-semibold text-white truncate">{ticket.title}</div>
                      <div className="text-slate-400 text-[11px] truncate mt-0.5">
                        {ticket.description}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-300 max-w-[200px]">
                      {ticket.assetName ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-200 truncate">{ticket.assetName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">SN: {ticket.assetSerialNumber}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">General Call</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {getPriorityBadge(ticket.priority)}
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(ticket.status)}
                    </td>
                    <td className="py-4 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(ticket.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Link
                        href={`/portal/${tenantSlug}/tickets/${ticket.id}`}
                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
                      >
                        <span>View</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
