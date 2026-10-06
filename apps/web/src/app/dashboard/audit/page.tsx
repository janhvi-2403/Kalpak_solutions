'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Clock,
  Activity,
  FileCode,
  Globe,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui';

interface AuditLogRecord {
  id: string;
  eventType: string;
  resourceType: string;
  resourceId?: string | null;
  action: string;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  actor?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

interface AuditApiResponse {
  items: AuditLogRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function AuditLogsPage() {
  const [data, setData] = useState<AuditApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<AuditLogRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient<AuditApiResponse>(
        `/audit-logs?page=${currentPage}&limit=20`
      );
      setData(res);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Client-side search filtering across action, resource, actor name
  const filteredItems = (data?.items || []).filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const actionMatch = item.action?.toLowerCase().includes(q);
    const eventMatch = item.eventType?.toLowerCase().includes(q);
    const resourceMatch = item.resourceType?.toLowerCase().includes(q);
    const actorMatch =
      item.actor?.fullName?.toLowerCase().includes(q) ||
      item.actor?.email?.toLowerCase().includes(q);
    return actionMatch || eventMatch || resourceMatch || actorMatch;
  });

  const getActionBadgeColor = (action: string) => {
    const a = action.toUpperCase();
    if (a.includes('DELETE') || a.includes('REVOKE') || a.includes('CANCEL')) {
      return 'bg-rose-100 text-rose-700 border-rose-200';
    }
    if (a.includes('CREATE') || a.includes('INVITE') || a.includes('COMPLETE')) {
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
    if (a.includes('UPDATE') || a.includes('MODIFY') || a.includes('SWITCH')) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Administrative Audit Logs &amp; Compliance
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Immutable security audit trail: track who executed administrative actions, what changed, and exact timestamps.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchAuditLogs}
            disabled={isLoading}
            className="text-xs text-blue-600 hover:text-blue-700 gap-1.5 h-8"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── Filter / Search Bar ── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by actor, action, or resource..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 font-medium"
          />
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Showing {filteredItems.length} of {data?.total || 0} recorded events
        </div>
      </div>

      {/* ── Audit Logs Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-semibold font-mono text-[10px]">
              <tr>
                <th className="py-3 px-6">Timestamp</th>
                <th className="py-3 px-6">Actor (Who)</th>
                <th className="py-3 px-6">Action Executed</th>
                <th className="py-3 px-6">Resource Target</th>
                <th className="py-3 px-6">IP &amp; Device</th>
                <th className="py-3 px-6 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    Loading audit trail events...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div className="font-semibold">No audit events match your query</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Try clearing your search keyword.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const actorName = item.actor?.fullName || 'System / Platform';
                  const actorEmail = item.actor?.email || 'automated-task';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-6 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(item.createdAt).toLocaleString()}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {actorName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 leading-tight">
                              {actorName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {actorEmail}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-6">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getActionBadgeColor(
                            item.action
                          )}`}
                        >
                          {item.action}
                        </span>
                      </td>

                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-slate-800">
                          {item.resourceType}
                        </div>
                        {item.resourceId && (
                          <div className="text-[10px] text-slate-400 font-mono truncate max-w-xs">
                            ID: {item.resourceId}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-6 font-mono text-[10px] text-slate-500">
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-slate-400" />
                          <span>{item.ipAddress || 'Internal'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedRecord(item);
                            setIsDetailModalOpen(true);
                          }}
                          className="text-[11px] text-blue-600 hover:text-blue-800 hover:bg-blue-50 gap-1 h-7"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {data && data.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Page {data.page} of {data.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={!data.hasPrevPage || isLoading}
                className="gap-1 text-xs h-8"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={!data.hasNextPage || isLoading}
                className="gap-1 text-xs h-8"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Metadata Inspection Modal ── */}
      {isDetailModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Audit Event Payload Details
                </h3>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 block">Action:</span>
                  <span className="font-bold text-slate-800">{selectedRecord.action}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Event Type:</span>
                  <span className="font-bold text-slate-800">{selectedRecord.eventType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Actor:</span>
                  <span className="font-bold text-slate-800">
                    {selectedRecord.actor?.fullName || 'System'} ({selectedRecord.actor?.email || 'N/A'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Timestamp:</span>
                  <span className="font-bold text-slate-800">
                    {new Date(selectedRecord.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Change Metadata &amp; Diff Payload
                </label>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-64 leading-relaxed border border-slate-800">
                  {JSON.stringify(selectedRecord.metadata || {}, null, 2)}
                </pre>
              </div>

              {selectedRecord.userAgent && (
                <div>
                  <label className="text-slate-500 font-semibold block text-[10px]">
                    User Agent Header
                  </label>
                  <div className="text-[11px] font-mono text-slate-600 truncate bg-slate-100 p-2 rounded-lg">
                    {selectedRecord.userAgent}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailModalOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
