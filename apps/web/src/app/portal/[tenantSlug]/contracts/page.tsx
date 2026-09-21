'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CalendarCheck,
  ShieldCheck,
  Wrench,
  Cpu,
  Calendar,
  AlertCircle,
  FileText,
  CheckCircle2,
  PhoneCall,
  PlusCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import {
  CustomerPortalContractsResponse,
  ServiceContractDetail,
  PmScheduleSummary,
  ContractAssetInfo,
} from '@kalpak/types';

export default function PortalContractsPage() {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || '';

  const [data, setData] = useState<CustomerPortalContractsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContracts() {
      try {
        const res = await apiClient<CustomerPortalContractsResponse>('/portal/contracts');
        setData(res);
      } catch (err) {
        console.error('Failed to load portal contracts:', err);
      } finally {
        setLoading(false);
      }
    }

    loadContracts();
  }, []);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'COMPREHENSIVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Comprehensive AMC (100% Parts & Labor)
          </span>
        );
      case 'NON_COMPREHENSIVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Non-Comprehensive (Labor Only)
          </span>
        );
      case 'LABOR_ONLY':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Labor Only
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {type}
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Active Coverage
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" />
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {status}
          </span>
        );
    }
  };

  const getDaysRemaining = (endDateStr: string) => {
    const end = new Date(endDateStr).getTime();
    const now = new Date().getTime();
    return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-400">Loading service contracts & PM schedules...</p>
      </div>
    );
  }

  const contracts: any[] = Array.isArray(data) ? data : (data as any)?.contracts || [];
  const pmSchedules: any[] = Array.isArray(data)
    ? contracts.flatMap((c) => c.pmSchedules || [])
    : (data as any)?.pmSchedules || [];

  return (
    <div className="space-y-8 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <CalendarCheck className="w-7 h-7 text-blue-500" />
            Annual Maintenance Contracts & PM Plans
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            View active AMC warranty coverage for your industrial machinery and track scheduled preventive maintenance visits.
          </p>
        </div>

        <Link
          href={`/portal/${tenantSlug}/tickets/raise`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-600/20"
        >
          <PlusCircle className="w-4 h-4" />
          Request Service Call
        </Link>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 flex items-center justify-between backdrop-blur-sm">
          <div>
            <p className="text-xs font-medium text-slate-400">Active AMC Contracts</p>
            <p className="text-2xl font-bold text-white mt-1">
              {contracts.filter((c: ServiceContractDetail) => c.status === 'ACTIVE').length}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 flex items-center justify-between backdrop-blur-sm">
          <div>
            <p className="text-xs font-medium text-slate-400">Covered Machinery Fleet</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {contracts.reduce((acc: number, c: ServiceContractDetail) => acc + c.coveredAssets.length, 0)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Cpu className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 flex items-center justify-between backdrop-blur-sm">
          <div>
            <p className="text-xs font-medium text-slate-400">Scheduled PM Visits</p>
            <p className="text-2xl font-bold text-indigo-400 mt-1">{pmSchedules.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Wrench className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Section 1: Active Service Contracts */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          Active Service Agreements ({contracts.length})
        </h2>

        {contracts.length === 0 ? (
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-8 text-center text-slate-400">
            <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No Active AMC Contracts Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              You do not have an active Annual Maintenance Contract registered. Contact your service representative to enroll your machinery for priority response and preventive upkeep.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {contracts.map((contract: ServiceContractDetail) => {
              const daysRemaining = getDaysRemaining(contract.endDate);

              return (
                <div
                  key={contract.id}
                  className="bg-slate-950/60 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5"
                >
                  {/* Contract Top Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/80 pb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-blue-400">
                          {contract.contractNumber}
                        </span>
                        {getStatusBadge(contract.status)}
                      </div>
                      <h3 className="text-lg font-bold text-white mt-1">{contract.title}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {getTypeBadge(contract.contractType)}
                    </div>
                  </div>

                  {/* Validity & Terms */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/50 border border-slate-800/60 p-4 rounded-lg text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Coverage Window</span>
                      <span className="text-slate-200 font-semibold mt-0.5 block">
                        {new Date(contract.startDate).toLocaleDateString()} -{' '}
                        {new Date(contract.endDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Days Remaining</span>
                      <span className="text-amber-400 font-semibold mt-0.5 block">
                        {daysRemaining > 0
                          ? `${daysRemaining} days active`
                          : 'Expired'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Parts & Consumables</span>
                      <span className="text-emerald-400 font-semibold mt-0.5 block">
                        {contract.contractType === 'COMPREHENSIVE'
                          ? 'Included (100% Free)'
                          : 'Labor Only (Parts Billed)'}
                      </span>
                    </div>
                  </div>

                  {/* Covered Machinery Cards */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                      Covered Equipment ({contract.coveredAssets.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {contract.coveredAssets.map((item: ContractAssetInfo) => (
                        <div
                          key={item.id}
                          className="bg-slate-900/70 border border-slate-800 p-3 rounded-lg flex items-start gap-3"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                            <Cpu className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="font-semibold text-white text-xs truncate">
                              {item.productName}
                            </h5>
                            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                              SN: {item.serialNumber}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Model: {item.modelNumber}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contract Notes / SLA */}
                  {contract.notes && (
                    <div className="text-xs text-slate-400 bg-slate-900/30 p-3 rounded-lg border border-slate-800/40">
                      <span className="font-medium text-slate-300">Contract SLA & Terms: </span>
                      {contract.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Upcoming Preventive Maintenance Visits */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Wrench className="w-5 h-5 text-indigo-400" />
          Scheduled Preventive Maintenance Visits ({pmSchedules.length})
        </h2>

        {pmSchedules.length === 0 ? (
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-8 text-center text-slate-400">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No Upcoming PM Visits Scheduled</h3>
            <p className="text-xs text-slate-400 mt-1">
              Your service engineer will configure routine PM inspections for your covered machinery.
            </p>
          </div>
        ) : (
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Equipment</th>
                    <th className="py-3 px-4">Maintenance Task</th>
                    <th className="py-3 px-4">Cadence</th>
                    <th className="py-3 px-4">Next Due Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {pmSchedules.map((pm: PmScheduleSummary) => {
                    const daysUntilDue = Math.ceil(
                      (new Date(pm.nextDueDate).getTime() - new Date().getTime()) /
                        (1000 * 60 * 60 * 24)
                    );
                    const isDueSoon = daysUntilDue <= 7;
                    const isOverdue = daysUntilDue < 0;

                    return (
                      <tr key={pm.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-blue-400" />
                            {pm.assetName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            SN: {pm.assetSerialNumber}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-200">{pm.title}</div>
                          {pm.description && (
                            <div className="text-[11px] text-slate-400 truncate max-w-[220px]">
                              {pm.description}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300">
                            {pm.frequency}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span
                              className={
                                isOverdue
                                  ? 'text-rose-400'
                                  : isDueSoon
                                  ? 'text-amber-400'
                                  : 'text-slate-200'
                              }
                            >
                              {new Date(pm.nextDueDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {isOverdue
                              ? `${Math.abs(daysUntilDue)} days overdue`
                              : `In ${daysUntilDue} days`}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Scheduled
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Help / Renewal Assistance Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900/40 border border-blue-500/30 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm">Need contract renewal or equipment expansion?</h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Contact your designated Kalpak Solutions account manager for customized enterprise AMCs and preventive service plans.
            </p>
          </div>
        </div>
        <Link
          href={`/portal/${tenantSlug}/tickets/raise`}
          className="shrink-0 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
        >
          Submit Inquiry
        </Link>
      </div>
    </div>
  );
}
