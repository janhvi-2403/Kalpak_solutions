'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  CalendarCheck,
  Plus,
  Search,
  ShieldCheck,
  Clock,
  Wrench,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Cpu,
  FileText,
  Zap,
} from 'lucide-react';
import {
  Button,
  Input,
  Dialog,
  Card,
  CardContent,
} from '@/components/ui';
import {
  ServiceContractSummary,
  ServiceContractDetail,
  PmScheduleSummary,
  ContractsDashboardStats,
  ContractTypeEnum,
  PmFrequencyEnum,
} from '@kalpak/types';

export default function ContractsPage() {
  const [activeTab, setActiveTab] = useState<'contracts' | 'schedules'>('contracts');
  const [contracts, setContracts] = useState<ServiceContractSummary[]>([]);
  const [schedules, setSchedules] = useState<PmScheduleSummary[]>([]);
  const [stats, setStats] = useState<ContractsDashboardStats>({
    totalActiveContracts: 0,
    expiringIn30DaysCount: 0,
    upcomingPmVisitsThisMonth: 0,
    totalContractValue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modals
  const [isCreateContractOpen, setIsCreateContractOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedContractDetail, setSelectedContractDetail] = useState<ServiceContractDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // New AMC Form State
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerAssets, setCustomerAssets] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formCustomer, setFormCustomer] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<ContractTypeEnum>(ContractTypeEnum.COMPREHENSIVE);
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formEndDate, setFormEndDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [formValue, setFormValue] = useState(120000);
  const [formNotes, setFormNotes] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [autoGenPm, setAutoGenPm] = useState(true);
  const [pmFrequency, setPmFrequency] = useState<PmFrequencyEnum>(PmFrequencyEnum.QUARTERLY);

  // Action status notification
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsData, contractsData, schedulesData] = await Promise.all([
        apiClient<ContractsDashboardStats>('/contracts/summary').catch(() => ({
          totalActiveContracts: 0,
          expiringIn30DaysCount: 0,
          upcomingPmVisitsThisMonth: 0,
          totalContractValue: 0,
        })),
        apiClient<ServiceContractSummary[]>('/contracts').catch(() => []),
        apiClient<PmScheduleSummary[]>('/contracts/schedules').catch(() => []),
      ]);

      setStats(statsData);
      setContracts(contractsData);
      setSchedules(schedulesData);
    } catch (err: any) {
      console.error('Failed to load AMC & PM contracts data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load customer list for New AMC modal
  const handleOpenCreateModal = async () => {
    setIsCreateContractOpen(true);
    try {
      const res = await apiClient<any>('/customers');
      const list = Array.isArray(res) ? res : res?.data || [];
      setCustomers(list);
      if (list.length > 0 && !formCustomer) {
        setFormCustomer(list[0].id);
        loadAssetsForCustomer(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  const loadAssetsForCustomer = async (customerId: string) => {
    try {
      const res = await apiClient<any>(`/customers/${customerId}`);
      const assets = res?.assets || [];
      setCustomerAssets(assets);
      setSelectedAssetIds(assets.map((a: any) => a.id));
    } catch (err) {
      console.error('Failed to fetch customer assets:', err);
      setCustomerAssets([]);
      setSelectedAssetIds([]);
    }
  };

  const handleCustomerChange = (customerId: string) => {
    setFormCustomer(customerId);
    loadAssetsForCustomer(customerId);
  };

  const handleAssetToggle = (assetId: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  };

  // Submit New Contract
  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomer || !formTitle || !formStartDate || !formEndDate) {
      setActionError('Please fill in all required contract fields.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    try {
      await apiClient('/contracts', {
        method: 'POST',
        body: JSON.stringify({
          customerId: formCustomer,
          title: formTitle,
          contractType: formType,
          startDate: formStartDate,
          endDate: formEndDate,
          totalAmount: Number(formValue),
          billingFrequency: 'ANNUAL',
          notes: formNotes,
          assetIds: selectedAssetIds,
          generatePmSchedules: autoGenPm,
          defaultPmFrequency: pmFrequency,
        }),
      });

      setActionSuccess(`Annual Maintenance Contract "${formTitle}" created successfully!`);
      setTimeout(() => setActionSuccess(null), 5000);
      setIsCreateContractOpen(false);
      // Reset form
      setFormTitle('');
      setFormNotes('');
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create contract.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // View Contract Detail
  const handleViewContractDetail = async (contractId: string) => {
    setIsDetailOpen(true);
    setIsDetailLoading(true);
    try {
      const detail = await apiClient<ServiceContractDetail>(`/contracts/${contractId}`);
      setSelectedContractDetail(detail);
    } catch (err: any) {
      setActionError(err.message || 'Failed to fetch contract details.');
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Trigger PM Visit
  const handleTriggerPmVisit = async (scheduleId: string) => {
    try {
      const res = await apiClient<any>(`/contracts/schedules/${scheduleId}/trigger`, {
        method: 'POST',
      });
      setActionSuccess(
        `PM Visit triggered! Auto-created Ticket ${res.ticketNumber} and Field Work Order ${res.workOrderNumber}.`
      );
      setTimeout(() => setActionSuccess(null), 7000);
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to trigger PM visit.');
      setTimeout(() => setActionError(null), 5000);
    }
  };

  // Filtered lists
  const filteredContracts = contracts.filter((c) => {
    const matchesSearch =
      c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || c.contractType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const filteredSchedules = schedules.filter((s) => {
    const matchesSearch =
      s.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Active
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Expired
          </span>
        );
      case 'TERMINATED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            Terminated
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Draft
          </span>
        );
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'COMPREHENSIVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Comprehensive AMC
          </span>
        );
      case 'NON_COMPREHENSIVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            Non-Comprehensive
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

  const getDaysRemaining = (endDateStr: string) => {
    const end = new Date(endDateStr).getTime();
    const now = new Date().getTime();
    return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* Toast Alerts */}
      {actionSuccess && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg shadow-emerald-950/40 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-medium">{actionSuccess}</p>
        </div>
      )}
      {actionError && (
        <div className="bg-rose-950/80 border border-rose-500/40 text-rose-200 px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg shadow-rose-950/40 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <p className="text-sm font-medium">{actionError}</p>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <CalendarCheck className="w-7 h-7 text-blue-500" />
            Service Contracts & AMC Scheduling
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage comprehensive & labor AMCs, monitor machinery coverage, and auto-dispatch preventive maintenance visits.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleOpenCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            New AMC Contract
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-800/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Active AMCs</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.totalActiveContracts}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Expiring in 30d</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{stats.expiringIn30DaysCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Upcoming PM (Month)</p>
              <p className="text-2xl font-bold text-indigo-400 mt-1">{stats.upcomingPmVisitsThisMonth}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Wrench className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Total Contract Value</p>
              <p className="text-2xl font-bold text-white mt-1">
                ₹{(stats.totalContractValue / 100000).toFixed(1)}L
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs & Search Navigation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('contracts')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'contracts'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            All AMC Contracts ({contracts.length})
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'schedules'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>PM Inspection Schedules ({schedules.length})</span>
            {stats.upcomingPmVisitsThisMonth > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contracts or machinery..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {activeTab === 'contracts' && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
                <option value="DRAFT">Draft</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Types</option>
                <option value="COMPREHENSIVE">Comprehensive</option>
                <option value="NON_COMPREHENSIVE">Non-Comprehensive</option>
                <option value="LABOR_ONLY">Labor Only</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* Tab 1: Contracts Table View */}
      {activeTab === 'contracts' && (
        <Card className="bg-slate-900/60 border-slate-800/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Contract #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Coverage Type</th>
                  <th className="py-3.5 px-4">Validity</th>
                  <th className="py-3.5 px-4 text-center">Machinery</th>
                  <th className="py-3.5 px-4 text-right">Value (INR)</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Loading service contracts...
                    </td>
                  </tr>
                ) : filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <CalendarCheck className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                      <p className="text-sm font-medium">No service contracts found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Create an AMC to schedule preventive maintenance and provide priority coverage.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredContracts.map((contract) => {
                    const daysRemaining = getDaysRemaining(contract.endDate);
                    return (
                      <tr
                        key={contract.id}
                        className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                        onClick={() => handleViewContractDetail(contract.id)}
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-semibold text-blue-400 group-hover:text-blue-300">
                            {contract.contractNumber}
                          </span>
                          <div className="text-[11px] text-slate-400 font-sans mt-0.5 truncate max-w-[180px]">
                            {contract.title}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-white flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate max-w-[160px]">{contract.customerName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">{getTypeBadge(contract.contractType)}</td>
                        <td className="py-3.5 px-4">
                          <div className="text-[11px] text-slate-300">
                            {new Date(contract.startDate).toLocaleDateString()} -{' '}
                            {new Date(contract.endDate).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[11px]">
                            <Cpu className="w-3 h-3 text-emerald-400" />
                            {contract.coveredAssetsCount}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-white">
                          ₹{contract.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">{getStatusBadge(contract.status)}</td>
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            onClick={() => handleViewContractDetail(contract.id)}
                            className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2 py-1 h-auto"
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 2: PM Schedules View */}
      {activeTab === 'schedules' && (
        <Card className="bg-slate-900/60 border-slate-800/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Machine & Serial #</th>
                  <th className="py-3.5 px-4">Inspection Title</th>
                  <th className="py-3.5 px-4">Frequency</th>
                  <th className="py-3.5 px-4">Next Due Date</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Loading PM schedules...
                    </td>
                  </tr>
                ) : filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <Wrench className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                      <p className="text-sm font-medium">No PM inspection schedules found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Schedules are created automatically when setting up an AMC contract.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredSchedules.map((schedule) => {
                    const daysUntilDue = Math.ceil(
                      (new Date(schedule.nextDueDate).getTime() - new Date().getTime()) /
                        (1000 * 60 * 60 * 24)
                    );
                    const isDueSoon = daysUntilDue <= 7;
                    const isOverdue = daysUntilDue < 0;

                    return (
                      <tr key={schedule.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-blue-400" />
                            {schedule.assetName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            SN: {schedule.assetSerialNumber}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-300">{schedule.title}</div>
                          {schedule.description && (
                            <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                              {schedule.description}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300">
                            {schedule.frequency}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span
                              className={`font-medium ${
                                isOverdue
                                  ? 'text-rose-400'
                                  : isDueSoon
                                  ? 'text-amber-400'
                                  : 'text-slate-300'
                              }`}
                            >
                              {new Date(schedule.nextDueDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {isOverdue
                              ? `${Math.abs(daysUntilDue)} days OVERDUE`
                              : `Due in ${daysUntilDue} days`}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            onClick={() => handleTriggerPmVisit(schedule.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 py-1 h-auto flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-300" />
                            Dispatch Visit
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal: Create AMC Contract */}
      <Dialog
        isOpen={isCreateContractOpen}
        onClose={() => setIsCreateContractOpen(false)}
        title="Draft Annual Maintenance Contract (AMC)"
      >
        <form onSubmit={handleCreateContract} className="space-y-4 text-xs">
          {/* Customer Selection */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Customer / Client Account *</label>
            <select
              value={formCustomer}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              required
            >
              <option value="">Select a customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} ({c.contactPerson})
                </option>
              ))}
            </select>
          </div>

          {/* Contract Title */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Contract Title / Identifier *</label>
            <Input
              type="text"
              placeholder="e.g. 2026 Comprehensive Fleet AMC"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              required
            />
          </div>

          {/* Contract Type & Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Contract Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value={ContractTypeEnum.COMPREHENSIVE}>Comprehensive (Parts + Labor)</option>
                <option value={ContractTypeEnum.NON_COMPREHENSIVE}>Non-Comprehensive (Labor only)</option>
                <option value={ContractTypeEnum.LABOR_ONLY}>Labor Only</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Annual Contract Value (INR) *</label>
              <Input
                type="number"
                value={formValue}
                onChange={(e) => setFormValue(Number(e.target.value))}
                min="0"
                required
              />
            </div>
          </div>

          {/* Validity Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Start Date *</label>
              <Input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">End Date *</label>
              <Input
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Covered Machinery Multi-Select */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Select Covered Equipment / Machinery ({selectedAssetIds.length} selected)
            </label>
            <div className="max-h-36 overflow-y-auto bg-slate-950/60 border border-slate-800 rounded-lg p-2 space-y-1.5">
              {customerAssets.length === 0 ? (
                <p className="text-slate-500 text-center py-3 italic">
                  No assets found for selected customer.
                </p>
              ) : (
                customerAssets.map((asset) => (
                  <label
                    key={asset.id}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-800/40 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAssetIds.includes(asset.id)}
                      onChange={() => handleAssetToggle(asset.id)}
                      className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 truncate">
                      <span className="text-white font-medium">{asset.name}</span>
                      <span className="text-slate-400 font-mono ml-2">SN: {asset.serialNumber}</span>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* PM Auto-Generation Option */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoGenPm}
                onChange={(e) => setAutoGenPm(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-200 font-medium">
                Auto-generate Preventive Maintenance (PM) schedules for covered assets
              </span>
            </label>

            {autoGenPm && (
              <div className="pl-6 flex items-center gap-3">
                <span className="text-slate-400">Inspection Cadence:</span>
                <select
                  value={pmFrequency}
                  onChange={(e) => setPmFrequency(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={PmFrequencyEnum.MONTHLY}>Monthly</option>
                  <option value={PmFrequencyEnum.QUARTERLY}>Quarterly (Recommended)</option>
                  <option value={PmFrequencyEnum.BI_ANNUAL}>Bi-Annual</option>
                  <option value={PmFrequencyEnum.ANNUAL}>Annual</option>
                </select>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Contract Terms / SLA Notes</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="e.g. 4-hour emergency response time, 4 mandatory scheduled visits per year."
              rows={2}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateContractOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? 'Creating AMC...' : 'Create & Activate Contract'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Contract Detail View */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedContractDetail?.contractNumber || 'Contract Details'}
      >
        {isDetailLoading || !selectedContractDetail ? (
          <div className="py-8 text-center text-slate-400">Loading contract details...</div>
        ) : (
          <div className="space-y-4 text-xs">
            {/* Header summary */}
            <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 p-3 rounded-lg">
              <div>
                <h3 className="font-semibold text-sm text-white">
                  {selectedContractDetail.title}
                </h3>
                <p className="text-slate-400 mt-0.5">
                  {selectedContractDetail.customerName}
                </p>
              </div>
              <div className="text-right">
                {getStatusBadge(selectedContractDetail.status)}
                <div className="mt-1">{getTypeBadge(selectedContractDetail.contractType)}</div>
              </div>
            </div>

            {/* Terms Grid */}
            <div className="grid grid-cols-2 gap-3 bg-slate-950/40 border border-slate-800 p-3 rounded-lg">
              <div>
                <span className="text-slate-400">Coverage Window:</span>
                <p className="font-medium text-white mt-0.5">
                  {new Date(selectedContractDetail.startDate).toLocaleDateString()} -{' '}
                  {new Date(selectedContractDetail.endDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Annual Value:</span>
                <p className="font-semibold text-emerald-400 mt-0.5">
                  ₹{selectedContractDetail.totalAmount.toLocaleString()} ({selectedContractDetail.billingFrequency})
                </p>
              </div>
              <div>
                <span className="text-slate-400">Days Remaining:</span>
                <p className="font-medium text-amber-400 mt-0.5">
                  {getDaysRemaining(selectedContractDetail.endDate)} days active
                </p>
              </div>
              <div>
                <span className="text-slate-400">Scheduled PMs:</span>
                <p className="font-medium text-indigo-400 mt-0.5">
                  {selectedContractDetail.activePmSchedulesCount} active plans
                </p>
              </div>
            </div>

            {/* Covered Machinery */}
            <div>
              <h4 className="font-semibold text-white mb-2 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Covered Machinery ({selectedContractDetail.coveredAssets.length})
              </h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {selectedContractDetail.coveredAssets.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800"
                  >
                    <div>
                      <span className="font-medium text-white">{item.productName}</span>
                      <span className="text-slate-400 font-mono ml-2">SN: {item.serialNumber}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{item.modelNumber}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Associated PM Schedules */}
            {selectedContractDetail.pmSchedules.length > 0 && (
              <div>
                <h4 className="font-semibold text-white mb-2 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-indigo-400" />
                  Scheduled PM Inspections ({selectedContractDetail.pmSchedules.length})
                </h4>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {selectedContractDetail.pmSchedules.map((pm) => (
                    <div
                      key={pm.id}
                      className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800"
                    >
                      <div>
                        <span className="font-medium text-white">{pm.title}</span>
                        <div className="text-[11px] text-slate-400">
                          Due: {new Date(pm.nextDueDate).toLocaleDateString()} ({pm.frequency})
                        </div>
                      </div>
                      <Button
                        onClick={() => handleTriggerPmVisit(pm.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2 py-0.5 h-auto flex items-center gap-1 shadow-sm"
                      >
                        <Zap className="w-3 h-3 text-amber-300" />
                        Trigger
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Close */}
            <div className="flex justify-end pt-2">
              <Button
                variant="ghost"
                onClick={() => setIsDetailOpen(false)}
                className="text-slate-300 hover:text-white"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
