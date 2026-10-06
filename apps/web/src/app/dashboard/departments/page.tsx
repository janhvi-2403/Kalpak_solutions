'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Building2,
  Search,
  Plus,
  Edit2,
  Power,
  Layers,
  Users,
  Ticket,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  X,
  Phone,
  Mail,
  Shield,
  Activity,
  Package,
  RefreshCw,
  Info,
  Filter,
} from 'lucide-react';
import {
  Button,
  Input,
  Dialog,
  Badge,
  Skeleton,
} from '@/components/ui';

// ==================== Interfaces ====================

interface DepartmentListItem {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  headUserId?: string | null;
  headUser?: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber?: string | null;
  } | null;
  poc: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    userId?: string | null;
  };
  totalTickets: number;
  createdAt: string;
  updatedAt: string;
}

interface DepartmentDetailData {
  department: DepartmentListItem;
  metrics: {
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    closedTickets: number;
    overdueTickets: number;
  };
  statusDistribution: Record<string, number>;
  customersServed: Array<{
    id: string;
    companyName: string;
    contactPerson: string;
    email: string;
    phone: string;
    city?: string | null;
    ticketCount: number;
  }>;
  productsHandled: Array<{
    id: string;
    name: string;
    modelNumber: string;
    category: string;
    description?: string | null;
  }>;
  servicesHandled: Array<{
    id?: string;
    name: string;
    code?: string;
    category?: string;
  }>;
  recentActivity: Array<{
    id: string;
    eventType: string;
    previousStatus?: string | null;
    newStatus?: string | null;
    note?: string | null;
    createdAt: string;
    ticket: {
      id: string;
      ticketNumber: string;
      title: string;
      status: string;
      priority: string;
    };
    actor?: {
      fullName: string;
      email: string;
    } | null;
  }>;
}

interface EligibleUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
}

export default function DepartmentsPage() {
  // Main list state
  const [departments, setDepartments] = useState<DepartmentListItem[]>([]);
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [departmentToEdit, setDepartmentToEdit] = useState<DepartmentListItem | null>(null);

  // Detail drawer state
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [deptDetails, setDeptDetails] = useState<DepartmentDetailData | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Activate/Deactivate Dialog
  const [statusToggleTarget, setStatusToggleTarget] = useState<DepartmentListItem | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formHeadUserId, setFormHeadUserId] = useState('');
  const [formPocName, setFormPocName] = useState('');
  const [formPocEmail, setFormPocEmail] = useState('');
  const [formPocPhone, setFormPocPhone] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Global feedback message
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Auto-dismiss feedback message after 5 seconds
  useEffect(() => {
    if (feedbackMsg) {
      const timer = setTimeout(() => setFeedbackMsg(null), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [feedbackMsg]);

  // Fetch departments list
  const fetchDepartments = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);

      const params: Record<string, string> = {};
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const data = await apiClient<DepartmentListItem[]>('/departments', { params });
      setDepartments(data);
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to fetch departments',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, statusFilter]);

  // Fetch eligible users for Head and POC dropdowns
  const fetchEligibleUsers = useCallback(async () => {
    try {
      const users = await apiClient<EligibleUser[]>('/departments/eligible-users');
      setEligibleUsers(users || []);
    } catch {
      // Non-critical, ignore or keep empty
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
    fetchEligibleUsers();
  }, [fetchDepartments, fetchEligibleUsers]);

  // Fetch detailed department view
  const fetchDepartmentDetails = useCallback(async (id: string) => {
    try {
      setIsLoadingDetails(true);
      const data = await apiClient<DepartmentDetailData>(`/departments/${id}`);
      setDeptDetails(data);
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load department details',
      });
      setSelectedDeptId(null);
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  const handleSelectDepartment = (dept: DepartmentListItem) => {
    setSelectedDeptId(dept.id);
    fetchDepartmentDetails(dept.id);
  };

  // Open Add Modal
  const openAddModal = () => {
    setFormName('');
    setFormCode('');
    setFormDescription('');
    setFormHeadUserId('');
    setFormPocName('');
    setFormPocEmail('');
    setFormPocPhone('');
    setFormIsActive(true);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (dept: DepartmentListItem) => {
    setDepartmentToEdit(dept);
    setFormName(dept.name);
    setFormCode(dept.code);
    setFormDescription(dept.description || '');
    setFormHeadUserId(dept.headUserId || '');
    setFormPocName(dept.poc.name || '');
    setFormPocEmail(dept.poc.email || '');
    setFormPocPhone(dept.poc.phone || '');
    setFormIsActive(dept.isActive);
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Handle Create Department
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      setFormError('Department Name and Department Code are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      await apiClient('/departments', {
        method: 'POST',
        body: JSON.stringify({
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          description: formDescription.trim() || undefined,
          headUserId: formHeadUserId || null,
          pocName: formPocName.trim() || undefined,
          pocEmail: formPocEmail.trim() || undefined,
          pocPhone: formPocPhone.trim() || undefined,
          isActive: formIsActive,
        }),
      });

      setFeedbackMsg({
        type: 'success',
        text: `Department "${formName}" created successfully!`,
      });
      setIsAddModalOpen(false);
      await fetchDepartments(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create department');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Update Department
  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentToEdit) return;
    if (!formName.trim() || !formCode.trim()) {
      setFormError('Department Name and Department Code are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      await apiClient(`/departments/${departmentToEdit.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          description: formDescription.trim() || undefined,
          headUserId: formHeadUserId || null,
          pocName: formPocName.trim() || null,
          pocEmail: formPocEmail.trim() || null,
          pocPhone: formPocPhone.trim() || null,
          isActive: formIsActive,
        }),
      });

      setFeedbackMsg({
        type: 'success',
        text: `Department "${formName}" updated successfully!`,
      });
      setIsEditModalOpen(false);
      setDepartmentToEdit(null);
      await fetchDepartments(true);

      // If this department is currently viewed in detail drawer, refresh it
      if (selectedDeptId === departmentToEdit.id) {
        fetchDepartmentDetails(departmentToEdit.id);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update department');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Activate / Deactivate Department
  const handleToggleStatus = async () => {
    if (!statusToggleTarget) return;

    try {
      setIsTogglingStatus(true);
      const newStatus = !statusToggleTarget.isActive;

      await apiClient(`/departments/${statusToggleTarget.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: newStatus }),
      });

      setFeedbackMsg({
        type: 'success',
        text: `Department "${statusToggleTarget.name}" has been ${
          newStatus ? 'activated' : 'deactivated'
        }.`,
      });

      setStatusToggleTarget(null);
      await fetchDepartments(true);

      // Refresh drawer if open
      if (selectedDeptId === statusToggleTarget.id) {
        fetchDepartmentDetails(statusToggleTarget.id);
      }
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update status',
      });
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Quick department metrics calculation
  const totalDepts = departments.length;
  const activeDepts = useMemo(
    () => departments.filter((d) => d.isActive).length,
    [departments]
  );
  const inactiveDepts = totalDepts - activeDepts;
  const totalDeptTickets = useMemo(
    () => departments.reduce((acc, d) => acc + (d.totalTickets || 0), 0),
    [departments]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* ==================== Page Header ==================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-sm shadow-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Departments
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Client Admin Company-Wide Department Management &amp; Service Health
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDepartments(true)}
            disabled={isRefreshing || isLoading}
            className="gap-2 border-slate-200 hover:bg-slate-50 text-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={openAddModal}
            size="sm"
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Department</span>
          </Button>
        </div>
      </div>

      {/* ==================== Feedback Alert Banner ==================== */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-in fade-in slide-in-from-top-2 duration-200 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==================== KPI Stat Badges ==================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Departments</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalDepts}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Active Departments</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{activeDepts}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Inactive Departments</p>
            <p className="text-2xl font-bold text-slate-500 mt-1">{inactiveDepts}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <Power className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Department Tickets</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{totalDeptTickets}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Ticket className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ==================== Search & Filter Bar ==================== */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, code, POC, or head..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 self-start md:self-auto">
          <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All' : st === 'ACTIVE' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
      </div>

      {/* ==================== Departments List Table ==================== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div className="space-y-2 w-1/4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        ) : departments.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No departments found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'ALL'
                ? 'No departments match your current filter parameters. Try clearing filters.'
                : 'Create your first organizational department to group tickets, assign heads, and route services.'}
            </p>
            {searchQuery || statusFilter !== 'ALL' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
              >
                Clear Filters
              </Button>
            ) : (
              <Button onClick={openAddModal} size="sm" className="mt-2">
                Create First Department
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Department Head</th>
                  <th className="py-3.5 px-4">Point of Contact (POC)</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Total Tickets</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {departments.map((dept) => (
                  <tr
                    key={dept.id}
                    onClick={() => handleSelectDepartment(dept)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                  >
                    {/* Department Name & Code */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {dept.code.substring(0, 3)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {dept.name}
                            </span>
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold border border-slate-200">
                              {dept.code}
                            </span>
                          </div>
                          {dept.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 max-w-xs">
                              {dept.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Department Head */}
                    <td className="py-4 px-4 text-slate-700">
                      {dept.headUser ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {dept.headUser.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 leading-tight">
                              {dept.headUser.fullName}
                            </p>
                            <p className="text-[10px] text-slate-400 leading-tight">
                              {dept.headUser.email}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                      )}
                    </td>

                    {/* POC */}
                    <td className="py-4 px-4 text-slate-700">
                      {dept.poc.name ? (
                        <div>
                          <p className="font-medium text-slate-900 leading-tight">
                            {dept.poc.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                            {dept.poc.email && (
                              <span className="flex items-center gap-0.5 truncate max-w-[140px]">
                                <Mail className="w-2.5 h-2.5 text-slate-400" />
                                {dept.poc.email}
                              </span>
                            )}
                            {dept.poc.phone && (
                              <span className="flex items-center gap-0.5">
                                <Phone className="w-2.5 h-2.5 text-slate-400" />
                                {dept.poc.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No POC specified</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          dept.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            dept.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Total Tickets */}
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200">
                        <Ticket className="w-3.5 h-3.5 text-slate-500" />
                        {dept.totalTickets || 0}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div
                        className="inline-flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* View Details Button */}
                        <button
                          onClick={() => handleSelectDepartment(dept)}
                          title="View Department Overview"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(dept)}
                          title="Edit Department"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Activate / Deactivate Toggle Button */}
                        <button
                          onClick={() => setStatusToggleTarget(dept)}
                          title={dept.isActive ? 'Deactivate Department' : 'Activate Department'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            dept.isActive
                              ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==================== Department Details Slide-Over Drawer ==================== */}
      {selectedDeptId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {deptDetails?.department.code.substring(0, 3) || 'DEP'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {deptDetails?.department.name || 'Loading...'}
                    </h2>
                    {deptDetails && (
                      <Badge
                        variant={deptDetails.department.isActive ? 'success' : 'neutral'}
                        className="text-[10px] uppercase font-mono tracking-wider"
                      >
                        {deptDetails.department.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>Code: <strong className="font-mono text-slate-700">{deptDetails?.department.code}</strong></span>
                    <span>•</span>
                    <span>Created: {deptDetails?.department.createdAt ? new Date(deptDetails.department.createdAt).toLocaleDateString() : '-'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {deptDetails && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(deptDetails.department)}
                    className="gap-1.5 text-xs text-slate-700"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </Button>
                )}
                <button
                  onClick={() => {
                    setSelectedDeptId(null);
                    setDeptDetails(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoadingDetails || !deptDetails ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 rounded-xl" />
                    ))}
                  </div>
                  <Skeleton className="h-28 rounded-xl" />
                  <Skeleton className="h-44 rounded-xl" />
                </div>
              ) : (
                <>
                  {/* Department Description */}
                  {deptDetails.department.description && (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600">
                      <p className="font-semibold text-slate-800 mb-0.5">Scope &amp; Responsibilities</p>
                      {deptDetails.department.description}
                    </div>
                  )}

                  {/* Operational Isolation Notice */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Company-Wide Department View</span>: Individual employee workloads, resolution metrics, and technician assignments are managed within the <em>Department Head Dashboard</em>.
                    </div>
                  </div>

                  {/* Leadership: Head and POC */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Department Head */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <Shield className="w-3.5 h-3.5 text-blue-600" />
                        <span>Department Head</span>
                      </div>
                      {deptDetails.department.headUser ? (
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {deptDetails.department.headUser.fullName}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {deptDetails.department.headUser.email}
                          </p>
                          {deptDetails.department.headUser.phoneNumber && (
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {deptDetails.department.headUser.phoneNumber}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No Department Head assigned</p>
                      )}
                    </div>

                    {/* Point of Contact (POC) */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Point of Contact (POC)</span>
                      </div>
                      {deptDetails.department.poc.name ? (
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {deptDetails.department.poc.name}
                          </p>
                          {deptDetails.department.poc.email && (
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {deptDetails.department.poc.email}
                            </p>
                          )}
                          {deptDetails.department.poc.phone && (
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {deptDetails.department.poc.phone}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No POC configured</p>
                      )}
                    </div>
                  </div>

                  {/* Ticket Health & Volume Metrics */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <Ticket className="w-3.5 h-3.5 text-blue-600" />
                      <span>Ticket Metrics &amp; Volume</span>
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase">Total</p>
                        <p className="text-xl font-bold text-slate-900 mt-0.5">
                          {deptDetails.metrics.totalTickets}
                        </p>
                      </div>

                      <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-center">
                        <p className="text-[10px] font-semibold text-amber-700 uppercase">Open</p>
                        <p className="text-xl font-bold text-amber-900 mt-0.5">
                          {deptDetails.metrics.openTickets}
                        </p>
                      </div>

                      <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-center">
                        <p className="text-[10px] font-semibold text-blue-700 uppercase">In Progress</p>
                        <p className="text-xl font-bold text-blue-900 mt-0.5">
                          {deptDetails.metrics.inProgressTickets}
                        </p>
                      </div>

                      <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-center">
                        <p className="text-[10px] font-semibold text-emerald-700 uppercase">Closed</p>
                        <p className="text-xl font-bold text-emerald-900 mt-0.5">
                          {deptDetails.metrics.closedTickets}
                        </p>
                      </div>

                      <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200 text-center col-span-2 sm:col-span-1">
                        <p className="text-[10px] font-semibold text-rose-700 uppercase">Overdue</p>
                        <p className="text-xl font-bold text-rose-900 mt-0.5">
                          {deptDetails.metrics.overdueTickets}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Ticket Distribution by Status */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Status Distribution
                    </h4>

                    {deptDetails.metrics.totalTickets > 0 ? (
                      <div>
                        {/* Segmented Bar */}
                        <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-100">
                          {Object.entries(deptDetails.statusDistribution).map(([st, count]) => {
                            const pct = (count / deptDetails.metrics.totalTickets) * 100;
                            let bgClass = 'bg-slate-400';
                            if (st === 'OPEN' || st === 'NEW') bgClass = 'bg-amber-500';
                            else if (st === 'IN_PROGRESS' || st === 'TRIAGED') bgClass = 'bg-blue-500';
                            else if (st === 'RESOLVED' || st === 'CLOSED') bgClass = 'bg-emerald-500';
                            else if (st === 'CANCELLED') bgClass = 'bg-slate-300';
                            else if (st === 'WAITING_PARTS') bgClass = 'bg-purple-500';

                            return (
                              <div
                                key={st}
                                style={{ width: `${pct}%` }}
                                className={`${bgClass} transition-all`}
                                title={`${st}: ${count} (${pct.toFixed(0)}%)`}
                              />
                            );
                          })}
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-slate-100">
                          {Object.entries(deptDetails.statusDistribution).map(([st, count]) => (
                            <span
                              key={st}
                              className="inline-flex items-center gap-1.5 text-[11px] bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 text-slate-700"
                            >
                              <span className="font-semibold">{st.replace(/_/g, ' ')}</span>: {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No tickets recorded for this department yet.</p>
                    )}
                  </div>

                  {/* Customers Served & Products/Services Handled */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Customers Served */}
                    <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          <span>Customers Served</span>
                        </h4>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {deptDetails.customersServed.length}
                        </span>
                      </div>

                      {deptDetails.customersServed.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {deptDetails.customersServed.map((cust) => (
                            <div
                              key={cust.id}
                              className="p-2 bg-slate-50/80 rounded-lg border border-slate-100 text-xs flex items-center justify-between"
                            >
                              <div>
                                <p className="font-semibold text-slate-900 leading-tight">
                                  {cust.companyName}
                                </p>
                                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                                  {cust.contactPerson} {cust.city ? `• ${cust.city}` : ''}
                                </p>
                              </div>
                              <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                {cust.ticketCount} {cust.ticketCount === 1 ? 'ticket' : 'tickets'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No customer tickets raised yet.</p>
                      )}
                    </div>

                    {/* Products & Services Handled */}
                    <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Products &amp; Services</span>
                        </h4>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {deptDetails.productsHandled.length + deptDetails.servicesHandled.length}
                        </span>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {deptDetails.productsHandled.map((prod) => (
                          <div
                            key={prod.id}
                            className="p-2 bg-slate-50/80 rounded-lg border border-slate-100 text-xs flex items-center justify-between"
                          >
                            <div>
                              <p className="font-semibold text-slate-900 leading-tight">
                                {prod.name}
                              </p>
                              <p className="text-[10px] text-slate-500 leading-tight mt-0.5 font-mono">
                                Model: {prod.modelNumber} • {prod.category}
                              </p>
                            </div>
                            <span className="text-[9px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                              Product
                            </span>
                          </div>
                        ))}

                        {deptDetails.servicesHandled.map((serv, idx) => (
                          <div
                            key={serv.id || idx}
                            className="p-2 bg-slate-50/80 rounded-lg border border-slate-100 text-xs flex items-center justify-between"
                          >
                            <div>
                              <p className="font-semibold text-slate-900 leading-tight">
                                {serv.name}
                              </p>
                              <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                                {serv.category || 'Service Catalog'} {serv.code ? `• ${serv.code}` : ''}
                              </p>
                            </div>
                            <span className="text-[9px] font-semibold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                              Service
                            </span>
                          </div>
                        ))}

                        {deptDetails.productsHandled.length === 0 &&
                          deptDetails.servicesHandled.length === 0 && (
                            <p className="text-xs text-slate-400 italic">No products or catalog services linked yet.</p>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Recent Department Ticket Activity Stream */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-blue-600" />
                      <span>Recent Department Ticket Activity</span>
                    </h4>

                    {deptDetails.recentActivity.length > 0 ? (
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                        {deptDetails.recentActivity.map((act) => (
                          <div
                            key={act.id}
                            className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[10px]">
                                {act.ticket.ticketNumber}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(act.createdAt).toLocaleString(undefined, {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </span>
                            </div>

                            <p className="text-slate-800 font-medium">{act.ticket.title}</p>

                            <p className="text-slate-600 text-[11px]">
                              <span className="font-medium text-slate-700">
                                {act.eventType.replace(/_/g, ' ')}
                              </span>
                              {act.previousStatus && act.newStatus && (
                                <span>: {act.previousStatus} → <strong>{act.newStatus}</strong></span>
                              )}
                              {act.note && <span> — &quot;{act.note}&quot;</span>}
                            </p>

                            {act.actor && (
                              <p className="text-[10px] text-slate-400">
                                Logged by: {act.actor.fullName}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No recent activity on department tickets.</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Department ID: <span className="font-mono text-slate-700">{deptDetails?.department.id}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedDeptId(null);
                  setDeptDetails(null);
                }}
              >
                Close Drawer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== Add Department Modal ==================== */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Department"
        description="Configure an organizational department with operational leadership and service scope."
      >
        <form onSubmit={handleCreateDepartment} className="space-y-4 mt-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 text-red-800 text-xs border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="add-dept-name"
              label="Department Name *"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Field Engineering"
            />

            <Input
              id="add-dept-code"
              label="Department Code *"
              required
              value={formCode}
              onChange={(e) => setFormCode(e.target.value.toUpperCase())}
              placeholder="e.g. FLD"
              helperText="Uppercase alphanumeric (2-10 chars)"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Scope
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
              placeholder="Scope of work, products handled, and operational responsibilities..."
              className="w-full text-xs rounded-lg border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Department Head Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department Head
            </label>
            <select
              value={formHeadUserId}
              onChange={(e) => setFormHeadUserId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Organization Member --</option>
              {eligibleUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.email})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              The Department Head will have operational management in their dashboard.
            </p>
          </div>

          {/* Point of Contact (POC) Fields */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <p className="text-xs font-semibold text-slate-700">Point of Contact (POC)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                id="add-poc-name"
                label="POC Name"
                value={formPocName}
                onChange={(e) => setFormPocName(e.target.value)}
                placeholder="Full name"
              />
              <Input
                id="add-poc-email"
                label="POC Email"
                type="email"
                value={formPocEmail}
                onChange={(e) => setFormPocEmail(e.target.value)}
                placeholder="poc@example.com"
              />
              <Input
                id="add-poc-phone"
                label="POC Phone"
                value={formPocPhone}
                onChange={(e) => setFormPocPhone(e.target.value)}
                placeholder="+91 98..."
              />
            </div>
          </div>

          {/* Status Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
            <div>
              <p className="text-xs font-semibold text-slate-800">Initial Status</p>
              <p className="text-[10px] text-slate-500">
                Active departments are immediately selectable for ticket assignment.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormIsActive(!formIsActive)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                formIsActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border-slate-300'
              }`}
            >
              {formIsActive ? 'ACTIVE' : 'INACTIVE'}
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Create Department
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ==================== Edit Department Modal ==================== */}
      <Dialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Department"
        description="Update department details, operational leadership, or contact points."
      >
        <form onSubmit={handleUpdateDepartment} className="space-y-4 mt-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 text-red-800 text-xs border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="edit-dept-name"
              label="Department Name *"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />

            <Input
              id="edit-dept-code"
              label="Department Code *"
              required
              value={formCode}
              onChange={(e) => setFormCode(e.target.value.toUpperCase())}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Scope
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
              className="w-full text-xs rounded-lg border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Department Head Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department Head
            </label>
            <select
              value={formHeadUserId}
              onChange={(e) => setFormHeadUserId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Organization Member --</option>
              {eligibleUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.email})
                </option>
              ))}
            </select>
          </div>

          {/* Point of Contact (POC) Fields */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <p className="text-xs font-semibold text-slate-700">Point of Contact (POC)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                id="edit-poc-name"
                label="POC Name"
                value={formPocName}
                onChange={(e) => setFormPocName(e.target.value)}
                placeholder="Full name"
              />
              <Input
                id="edit-poc-email"
                label="POC Email"
                type="email"
                value={formPocEmail}
                onChange={(e) => setFormPocEmail(e.target.value)}
                placeholder="poc@example.com"
              />
              <Input
                id="edit-poc-phone"
                label="POC Phone"
                value={formPocPhone}
                onChange={(e) => setFormPocPhone(e.target.value)}
                placeholder="+91..."
              />
            </div>
          </div>

          {/* Status Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
            <div>
              <p className="text-xs font-semibold text-slate-800">Status</p>
              <p className="text-[10px] text-slate-500">
                Active departments allow automated and manual ticket routing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormIsActive(!formIsActive)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                formIsActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border-slate-300'
              }`}
            >
              {formIsActive ? 'ACTIVE' : 'INACTIVE'}
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ==================== Status Toggle Confirmation Dialog ==================== */}
      <Dialog
        isOpen={!!statusToggleTarget}
        onClose={() => setStatusToggleTarget(null)}
        title={
          statusToggleTarget?.isActive
            ? `Deactivate ${statusToggleTarget.name}?`
            : `Activate ${statusToggleTarget?.name}?`
        }
        description={
          statusToggleTarget?.isActive
            ? 'Deactivating this department will prevent new ticket assignments to it. Existing tickets remain active and can be resolved.'
            : 'Activating this department will make it available for service ticket routing, catalog assignments, and team management.'
        }
      >
        <div className="space-y-4 mt-4">
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs ${
              statusToggleTarget?.isActive
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-blue-50 text-blue-900 border-blue-200'
            }`}
          >
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold">
                {statusToggleTarget?.isActive ? 'Notice' : 'Ready to Activate'}
              </p>
              <p className="mt-0.5">
                Current total tickets: <strong>{statusToggleTarget?.totalTickets || 0}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusToggleTarget(null)}
              disabled={isTogglingStatus}
            >
              Cancel
            </Button>
            <Button
              type="button"
              isLoading={isTogglingStatus}
              onClick={handleToggleStatus}
              className={
                statusToggleTarget?.isActive
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }
            >
              {statusToggleTarget?.isActive ? 'Deactivate Department' : 'Activate Department'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
