'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Ticket,
  CheckCircle2,
  Cpu,
  PlusCircle,
  ArrowUpRight,
  AlertCircle,
  Wrench,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import {
  PortalProfile,
  PortalDashboardStats,
  PortalTicketSummary,
} from '@kalpak/types';

export default function PortalDashboardPage() {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || '';

  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [stats, setStats] = useState<PortalDashboardStats | null>(null);
  const [recentTickets, setRecentTickets] = useState<PortalTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [profData, statsData, ticketsData] = await Promise.all([
          apiClient<PortalProfile>('/portal/me'),
          apiClient<PortalDashboardStats>('/portal/stats'),
          apiClient<PortalTicketSummary[]>('/portal/tickets'),
        ]);

        setProfile(profData);
        setStats(statsData);
        setRecentTickets(ticketsData.slice(0, 5));
      } catch (err) {
        // Handled by layout
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

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
            Awaiting Your Action
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
        <span>Loading dashboard overview...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-blue-400 tracking-wider uppercase bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                Service & Maintenance Portal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome, {profile?.customer?.companyName || 'Valued Customer'}
            </h1>
            <p className="mt-1.5 text-sm text-slate-400 max-w-xl">
              Track active service tickets, monitor field engineer dispatch, and review spare parts consumption in real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/portal/${tenantSlug}/tickets/raise`}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-blue-600/25 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Raise Service Ticket</span>
            </Link>

            <Link
              href={`/portal/${tenantSlug}/assets`}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs py-2.5 px-4 rounded-xl border border-slate-700 transition-all"
            >
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>My Machinery</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Counters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Tickets */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Open Tickets
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {stats?.openTickets || 0}
            </span>
            <span className="text-xs text-amber-400/80">Pending dispatch</span>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              In Progress
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {stats?.inProgressTickets || 0}
            </span>
            <span className="text-xs text-blue-400/80">Technician active</span>
          </div>
        </div>

        {/* Resolved */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Resolved Tickets
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {stats?.resolvedTickets || 0}
            </span>
            <span className="text-xs text-emerald-400/80">Completed</span>
          </div>
        </div>

        {/* Machinery */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Registered Machinery
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {stats?.totalAssets || 0}
            </span>
            <span className="text-xs text-indigo-400/80">Under coverage</span>
          </div>
        </div>
      </div>

      {/* Recent Tickets Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Recent Service Calls</h2>
            <p className="text-xs text-slate-400 mt-0.5">Live status and updates on your recent maintenance requests</p>
          </div>

          <Link
            href={`/portal/${tenantSlug}/tickets`}
            className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>View All ({stats?.totalTickets || 0})</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {recentTickets.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
            <Ticket className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-300">No service tickets recorded yet</p>
            <p className="text-xs text-slate-500 mt-1">Raise your first ticket whenever you require maintenance or spare parts.</p>
            <Link
              href={`/portal/${tenantSlug}/tickets/raise`}
              className="inline-flex items-center gap-1.5 mt-4 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Raise Ticket</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Ticket ID</th>
                  <th className="py-3 px-3">Subject</th>
                  <th className="py-3 px-3">Equipment</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Logged Date</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-3 font-mono font-medium text-blue-400">
                      {ticket.ticketNumber}
                    </td>
                    <td className="py-3.5 px-3 font-medium text-white max-w-[240px] truncate">
                      {ticket.title}
                    </td>
                    <td className="py-3.5 px-3 text-slate-300 truncate max-w-[180px]">
                      {ticket.assetName ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-200">{ticket.assetName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">SN: {ticket.assetSerialNumber}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">General Call</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      {getPriorityBadge(ticket.priority)}
                    </td>
                    <td className="py-3.5 px-3">
                      {getStatusBadge(ticket.status)}
                    </td>
                    <td className="py-3.5 px-3 text-slate-400">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <Link
                        href={`/portal/${tenantSlug}/tickets/${ticket.id}`}
                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
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
