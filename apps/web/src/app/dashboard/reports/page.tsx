'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  FileText,
  Download,
  Filter,
  BarChart3,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  TrendingUp,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Activity,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui';

interface ReportData {
  summary: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    overdue: number;
    avgResolutionHours?: number;
    slaComplianceRate?: number;
  };
  slaPerformance?: {
    complianceRate: number;
    avgResolutionHours: number;
    overdueCount: number;
    resolvedWithinSla: number;
    totalResolved: number;
  };
  departmentSla?: Array<{
    id: string;
    name: string;
    total: number;
    resolved: number;
    overdue: number;
    complianceRate: number;
  }>;
  trends?: Array<{
    date: string;
    created: number;
    resolved: number;
  }>;
  groupBy: string;
  breakdown: Array<{
    key: string;
    label: string;
    count: number;
  }>;
  ticketsCount: number;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showGlossary, setShowGlossary] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState<
    'status' | 'priority' | 'department' | 'employee' | 'customer' | 'product' | 'service'
  >('status');

  const fetchReport = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('groupBy', groupBy);

      const result = await apiClient<ReportData>(`/reports/tickets?${params.toString()}`);
      setData(result);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, groupBy]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const res = await fetch(`${apiUrl}/reports/tickets/export-csv?${params.toString()}`, {
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to generate CSV export');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error exporting CSV: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  const total = data?.summary.total || 0;
  const complianceRate = data?.slaPerformance?.complianceRate ?? data?.summary.slaComplianceRate ?? 100;
  const avgResolutionHours = data?.slaPerformance?.avgResolutionHours ?? data?.summary.avgResolutionHours ?? 0;
  const overdueCount = data?.summary.overdue || 0;

  // Max count for trend bar scaling
  const maxTrendVal = Math.max(
    ...(data?.trends?.flatMap((t) => [t.created, t.resolved]) || [5]),
    5
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Reports &amp; Operational Analytics
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Department-wise and company-wide ticket reports, SLA performance, resolution velocity, and operational trends.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGlossary((prev) => !prev)}
            className="text-xs font-semibold gap-1.5 border-slate-300 text-slate-700"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>{showGlossary ? 'Hide Guide' : 'What is SLA & Trends?'}</span>
            {showGlossary ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>

          <Button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exporting...' : 'Export to CSV'}</span>
          </Button>
        </div>
      </div>

      {/* ── Educational Guide: What is SLA, Performance, Categories, Trends ── */}
      {showGlossary && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md border border-slate-700/60 relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider font-mono">
              <Activity className="w-4 h-4" />
              Operational Concepts &amp; Key Metrics Guide
            </div>
            <button
              onClick={() => setShowGlossary(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-4 text-xs">
            <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-800/80 border border-slate-700">
              <div className="flex items-center gap-2 font-bold text-sky-400 text-sm">
                <Clock className="w-4 h-4" />
                What is SLA?
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                <strong>Service Level Agreement (SLA)</strong> is the formal commitment defining target response and resolution times for customer issues. If a ticket exceeds its target deadline (e.g., 4h for Critical, 24h for Medium), it is flagged as <em>SLA Overdue</em>.
              </p>
            </div>

            <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-800/80 border border-slate-700">
              <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                What is Performance?
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                <strong>SLA Performance</strong> measures operational health: <em>Compliance Rate</em> (% of tickets resolved on time) and <em>Mean Time to Resolution (MTTR)</em> in hours. A high compliance rate (&gt;90%) indicates prompt customer satisfaction.
              </p>
            </div>

            <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-800/80 border border-slate-700">
              <div className="flex items-center gap-2 font-bold text-purple-400 text-sm">
                <Layers className="w-4 h-4" />
                What are Categories?
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                <strong>Categories &amp; Issue Types</strong> classify customer requests (e.g., Breakdown, Electrical, Preventive Maintenance). They dictate routing rules, target departments, and specific skill sets required for technician dispatch.
              </p>
            </div>

            <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-800/80 border border-slate-700">
              <div className="flex items-center gap-2 font-bold text-amber-400 text-sm">
                <TrendingUp className="w-4 h-4" />
                What are Trends?
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                <strong>Operational Trends</strong> illustrate incoming ticket intake volume versus resolution velocity over time (e.g. 7-day timeline). Comparing created vs. resolved tickets helps identify work backlogs before SLA breaches occur.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Key SLA & Operational Health Gauges ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* SLA Compliance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">SLA Compliance Rate</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                complianceRate >= 90
                  ? 'bg-emerald-100 text-emerald-700'
                  : complianceRate >= 75
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {complianceRate >= 90 ? 'Healthy' : complianceRate >= 75 ? 'Needs Attention' : 'Critical'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{isLoading ? '—' : `${complianceRate}%`}</span>
            <span className="text-[11px] text-slate-400">on-time resolution</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-1">
            <div
              className={`h-full rounded-full transition-all ${
                complianceRate >= 90 ? 'bg-emerald-500' : complianceRate >= 75 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, complianceRate))}%` }}
            />
          </div>
        </div>

        {/* MTTR */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Avg Resolution Time (MTTR)</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{isLoading ? '—' : `${avgResolutionHours}h`}</span>
            <span className="text-[11px] text-slate-400">from open to resolve</span>
          </div>
          <p className="text-[10px] text-slate-500">
            Speed with which engineering / service leads finalize customer issues.
          </p>
        </div>

        {/* SLA Overdue Alert */}
        <div
          className={`p-5 rounded-2xl border shadow-sm space-y-2 ${
            overdueCount > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-white border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${overdueCount > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
              SLA Breaches / Overdue
            </span>
            <AlertTriangle className={`w-4 h-4 ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black ${overdueCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {isLoading ? '—' : overdueCount}
            </span>
            <span className={`text-[11px] ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
              tickets missed target
            </span>
          </div>
          <p className="text-[10px] text-slate-500">
            Tickets that missed the contractual resolution deadline.
          </p>
        </div>

        {/* Lifecycle Velocity */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active vs Closed Ratio</span>
            <Activity className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-600">
              {isLoading ? '—' : `${(data?.summary.open || 0) + (data?.summary.inProgress || 0)}`}
            </span>
            <span className="text-[11px] text-slate-400">
              active / {(data?.summary.resolved || 0) + (data?.summary.closed || 0)} closed
            </span>
          </div>
          <p className="text-[10px] text-slate-500">
            Work in queue requiring technician assignment or customer confirmation.
          </p>
        </div>
      </div>

      {/* ── 7-Day Operational Trends (Created vs Resolved) ── */}
      {data?.trends && data.trends.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  7-Day Ticket Velocity Trends (Intake vs. Resolution)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily volume pace comparing new incoming tickets with completed resolutions.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-sky-500" />
                <span className="text-slate-600">Created</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="text-slate-600">Resolved</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-3 pt-2">
            {data.trends.map((item) => {
              const dayLabel = new Date(item.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'numeric',
                day: 'numeric',
              });
              const createdHeight = Math.max(12, Math.round((item.created / maxTrendVal) * 90));
              const resolvedHeight = Math.max(12, Math.round((item.resolved / maxTrendVal) * 90));

              return (
                <div key={item.date} className="flex flex-col items-center gap-2">
                  <div className="h-28 w-full flex items-end justify-center gap-1.5 bg-slate-50 rounded-xl p-2 border border-slate-100">
                    {/* Created Bar */}
                    <div
                      className="w-1/2 bg-sky-500 rounded-t transition-all hover:bg-sky-600 relative group flex items-start justify-center pt-1"
                      style={{ height: `${createdHeight}%` }}
                      title={`Created: ${item.created}`}
                    >
                      <span className="text-[9px] font-mono font-bold text-white opacity-90 group-hover:opacity-100">
                        {item.created}
                      </span>
                    </div>
                    {/* Resolved Bar */}
                    <div
                      className="w-1/2 bg-emerald-500 rounded-t transition-all hover:bg-emerald-600 relative group flex items-start justify-center pt-1"
                      style={{ height: `${resolvedHeight}%` }}
                      title={`Resolved: ${item.resolved}`}
                    >
                      <span className="text-[9px] font-mono font-bold text-white opacity-90 group-hover:opacity-100">
                        {item.resolved}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 text-center font-mono">
                    {dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Department-Wise SLA & Resolution Performance ── */}
      {data?.departmentSla && data.departmentSla.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Department-Wise SLA Performance &amp; Resolution
                </h2>
                <p className="text-xs text-slate-500">
                  Accountability metrics tracking ticket volume, resolution count, and SLA breach rate per operational unit.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full">
              {data.departmentSla.length} Departments
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-semibold font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-6">Department</th>
                  <th className="py-3 px-6">Total Tickets</th>
                  <th className="py-3 px-6">Resolved</th>
                  <th className="py-3 px-6">SLA Overdue</th>
                  <th className="py-3 px-6">Compliance Rate</th>
                  <th className="py-3 px-6 w-1/4">Performance Bar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.departmentSla.map((dept) => {
                  const isHigh = dept.complianceRate >= 90;
                  const isMed = dept.complianceRate >= 75 && dept.complianceRate < 90;

                  return (
                    <tr key={dept.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-6 font-bold text-slate-900">
                        {dept.name}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-bold text-slate-700">
                        {dept.total}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-semibold text-emerald-600">
                        {dept.resolved}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-semibold">
                        {dept.overdue > 0 ? (
                          <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            {dept.overdue} breached
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-bold">
                        <span
                          className={
                            isHigh ? 'text-emerald-600' : isMed ? 'text-amber-600' : 'text-rose-600'
                          }
                        >
                          {dept.complianceRate}%
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isHigh ? 'bg-emerald-500' : isMed ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, dept.complianceRate))}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Filter Controls ── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            Report Dimensional Parameters
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchReport}
            disabled={isLoading}
            className="text-xs text-blue-600 hover:text-blue-700 gap-1.5 h-8"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Group By Dimension</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 font-medium"
            >
              <option value="status">Ticket Status (Lifecycle)</option>
              <option value="priority">Priority Level (Critical, High, Medium, Low)</option>
              <option value="department">Department</option>
              <option value="employee">Assigned Employee / Staff</option>
              <option value="customer">Customer Company</option>
              <option value="product">Product Model</option>
              <option value="service">Service Offering / Category</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Summary KPI Tiles ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-500">Total Filtered</div>
          <div className="text-2xl font-black text-slate-900">{isLoading ? '—' : data?.summary.total ?? 0}</div>
          <div className="text-[10px] text-slate-400">Total tickets</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-sky-700">Open Tickets</div>
          <div className="text-2xl font-black text-sky-700">{isLoading ? '—' : data?.summary.open ?? 0}</div>
          <div className="text-[10px] text-sky-600">Pending action</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-indigo-700">In Progress</div>
          <div className="text-2xl font-black text-indigo-700">{isLoading ? '—' : data?.summary.inProgress ?? 0}</div>
          <div className="text-[10px] text-indigo-600">Being serviced</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-emerald-700">Resolved</div>
          <div className="text-2xl font-black text-emerald-700">{isLoading ? '—' : data?.summary.resolved ?? 0}</div>
          <div className="text-[10px] text-emerald-600">Fixed &amp; verified</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-700">Closed</div>
          <div className="text-2xl font-black text-slate-700">{isLoading ? '—' : data?.summary.closed ?? 0}</div>
          <div className="text-[10px] text-slate-500">Finalized calls</div>
        </div>

        <div
          className={`p-5 rounded-2xl border shadow-sm space-y-1 ${
            (data?.summary.overdue ?? 0) > 0 ? 'bg-rose-50/80 border-rose-200' : 'bg-white border-slate-200/80'
          }`}
        >
          <div className={`text-xs font-semibold ${(data?.summary.overdue ?? 0) > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
            SLA Overdue
          </div>
          <div className={`text-2xl font-black ${(data?.summary.overdue ?? 0) > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            {isLoading ? '—' : data?.summary.overdue ?? 0}
          </div>
          <div className="text-[10px] text-rose-600">Missed SLA target</div>
        </div>
      </div>

      {/* ── Dimensional Breakdown Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Breakdown by {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
            </h2>
            <p className="text-xs text-slate-500">Aggregate volume and distribution share for selected date criteria</p>
          </div>
          <span className="text-xs font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">
            {data?.breakdown.length || 0} Groups
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-semibold font-mono text-[10px]">
              <tr>
                <th className="py-3.5 px-6">{groupBy.toUpperCase()} GROUP</th>
                <th className="py-3.5 px-6">TICKETS COUNT</th>
                <th className="py-3.5 px-6">PERCENTAGE SHARE</th>
                <th className="py-3.5 px-6 w-1/3">DISTRIBUTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Aggregating report data...
                  </td>
                </tr>
              ) : !data || data.breakdown.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    <BarChart3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div className="font-semibold">No records match the selected date range</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Try clearing or expanding the date filter.
                    </div>
                  </td>
                </tr>
              ) : (
                data.breakdown.map((row) => {
                  const share = total > 0 ? Math.round((row.count / total) * 100) : 0;
                  return (
                    <tr key={row.key} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-6 font-bold text-slate-900">
                        {row.label}
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-blue-600 text-sm">
                        {row.count}
                      </td>
                      <td className="py-4 px-6 font-mono font-semibold text-slate-700">
                        {share}%
                      </td>
                      <td className="py-4 px-6">
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
