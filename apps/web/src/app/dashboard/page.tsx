'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  LifeBuoy,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  Package,
  Wrench,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Layers,
  Activity,
  X,
  Calendar,
  Bell,
  AlertCircle,
  UserCheck,
  RefreshCw,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Input,
  Select,
  Skeleton,
} from '@/components/ui';

interface DashboardStats {
  total: number;
  open: number;
  inProgress: number;
  closed: number;
  longOpenOverdue: number;
  createdToday: number;
  closedToday: number;

  // Extra details
  assigned?: number;
  inProgressOnly?: number;
  awaitingCustomer?: number;
  resolved?: number;
  closedOnly?: number;
  cancelled?: number;
  overdue?: number;
  aging?: number;
  totalCustomers: number;
  totalEmployees: number;
  maxUsersQuota: number;

  // Breakdowns
  ticketsByDepartment: Array<{
    id: string;
    name: string;
    count: number;
    percentage: number;
  }>;
  ticketsByStatus: Array<{
    status: string;
    label: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  ticketsByCustomer: Array<{
    id: string;
    name: string;
    count: number;
    percentage: number;
  }>;
  ticketsByProductService: Array<{
    id: string;
    name: string;
    type: 'PRODUCT' | 'SERVICE';
    count: number;
    percentage: number;
  }>;

  // Operational Streams
  recentActivity: Array<{
    id: string;
    eventType: string;
    note?: string;
    createdAt: string;
    actor?: { fullName: string; email: string };
    ticket?: { ticketNumber: string; title: string; status?: string; priority?: string };
  }>;
  importantNotifications: Array<{
    id: string;
    title: string;
    message: string;
    type: 'CRITICAL_TICKET' | 'OVERDUE_SLA' | 'SYSTEM' | 'INFO';
    severity: 'critical' | 'warning' | 'info';
    createdAt: string;
    ticketId?: string;
    ticketNumber?: string;
  }>;
  recentTickets: Array<{
    id: string;
    ticketNumber: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    raisedForCustomer?: { companyName: string; contactPerson?: string };
    assignedTo?: { fullName: string };
    department?: { name: string };
  }>;
}

interface FilterOption {
  id: string;
  name: string;
}

export default function OverallCompanyDashboardPage() {
  const { activeTenant, activeRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (activeRole === 'DEPARTMENT_ADMIN') {
      router.replace('/dashboard/department');
    } else if (activeRole === 'SUPPORT_EMPLOYEE') {
      router.replace('/dashboard/employee');
    }
  }, [activeRole, router]);

  // Statistics & Loading State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter Dropdown Options
  const [departments, setDepartments] = useState<FilterOption[]>([]);
  const [employees, setEmployees] = useState<FilterOption[]>([]);
  const [customers, setCustomers] = useState<FilterOption[]>([]);
  const [products, setProducts] = useState<FilterOption[]>([]);
  const [services, setServices] = useState<FilterOption[]>([]);

  // Filter Selection State
  const [dateRangePreset, setDateRangePreset] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<string>('ALL');
  const [selectedService, setSelectedService] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Load Filter Options
  useEffect(() => {
    Promise.allSettled([
      apiClient<any[]>('/departments'),
      apiClient<{ items?: any[] } | any[]>('/employees'),
      apiClient<any[]>('/customers'),
      apiClient<any[]>('/products'),
      apiClient<any[]>('/products/services'),
    ]).then(([deptRes, empRes, custRes, prodRes, servRes]) => {
      if (deptRes.status === 'fulfilled' && Array.isArray(deptRes.value)) {
        setDepartments(deptRes.value.map((d: any) => ({ id: d.id, name: d.name })));
      }
      if (empRes.status === 'fulfilled') {
        const items = Array.isArray(empRes.value) ? empRes.value : empRes.value?.items || [];
        setEmployees(
          items
            .filter((e: any) => e.user)
            .map((e: any) => ({ id: e.user.id, name: e.user.fullName || e.user.email }))
        );
      }
      if (custRes.status === 'fulfilled' && Array.isArray(custRes.value)) {
        setCustomers(custRes.value.map((c: any) => ({ id: c.id, name: c.companyName })));
      }
      if (prodRes.status === 'fulfilled' && Array.isArray(prodRes.value)) {
        setProducts(prodRes.value.map((p: any) => ({ id: p.id, name: p.name })));
      }
      if (servRes.status === 'fulfilled' && Array.isArray(servRes.value)) {
        setServices(servRes.value.map((s: any) => ({ id: s.id, name: s.name })));
      }
    });
  }, []);

  // Compute effective date filters based on preset
  const getEffectiveDates = useCallback(() => {
    const now = new Date();
    if (dateRangePreset === 'TODAY') {
      const today = now.toISOString().split('T')[0];
      return { start: today, end: today };
    }
    if (dateRangePreset === '7D') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start: past.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
    }
    if (dateRangePreset === '30D') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { start: past.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
    }
    if (dateRangePreset === 'MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: startOfMonth.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
    }
    if (dateRangePreset === 'CUSTOM') {
      return { start: startDate || undefined, end: endDate || undefined };
    }
    return { start: undefined, end: undefined };
  }, [dateRangePreset, startDate, endDate]);

  // Fetch Dashboard Stats
  const fetchDashboardStats = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const dates = getEffectiveDates();
      const params = new URLSearchParams();

      if (dates.start) params.set('startDate', dates.start);
      if (dates.end) params.set('endDate', dates.end);
      if (selectedDepartment && selectedDepartment !== 'ALL') params.set('departmentId', selectedDepartment);
      if (selectedEmployee && selectedEmployee !== 'ALL') params.set('employeeId', selectedEmployee);
      if (selectedCustomer && selectedCustomer !== 'ALL') params.set('customerId', selectedCustomer);
      if (selectedProduct && selectedProduct !== 'ALL') params.set('productId', selectedProduct);
      if (selectedService && selectedService !== 'ALL') params.set('serviceId', selectedService);
      if (selectedStatus && selectedStatus !== 'ALL') params.set('status', selectedStatus);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await apiClient<DashboardStats>(`/tickets/stats${qs}`);
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [
    getEffectiveDates,
    selectedDepartment,
    selectedEmployee,
    selectedCustomer,
    selectedProduct,
    selectedService,
    selectedStatus,
  ]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // Count active filters
  const activeFiltersCount =
    (dateRangePreset !== 'ALL' ? 1 : 0) +
    (selectedDepartment !== 'ALL' ? 1 : 0) +
    (selectedEmployee !== 'ALL' ? 1 : 0) +
    (selectedCustomer !== 'ALL' ? 1 : 0) +
    (selectedProduct !== 'ALL' ? 1 : 0) +
    (selectedService !== 'ALL' ? 1 : 0) +
    (selectedStatus !== 'ALL' ? 1 : 0);

  const handleResetFilters = () => {
    setDateRangePreset('ALL');
    setStartDate('');
    setEndDate('');
    setSelectedDepartment('ALL');
    setSelectedEmployee('ALL');
    setSelectedCustomer('ALL');
    setSelectedProduct('ALL');
    setSelectedService('ALL');
    setSelectedStatus('ALL');
  };

  const priorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'MEDIUM':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const statusBadgeColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'ASSIGNED':
      case 'IN_PROGRESS':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'AWAITING_CUSTOMER':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELLED':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* ── 1. Top Header & Tenant Identity ── */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-mono">
                <Building2 className="w-3.5 h-3.5" />
                <span>{activeTenant?.name || 'Company Workspace'}</span>
              </span>
              <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2.5 py-1 rounded-full text-xs font-semibold">
                Client Admin
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs font-medium">
                Overall Company View
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <span>Tenant Overview Dashboard</span>
              {isRefreshing && <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Complete bird&apos;s-eye telemetry across all departments, technicians, client accounts, equipment, and service operations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/dashboard/tickets">
              <Button size="md" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-2 shadow-md">
                <PlusCircle className="w-4 h-4" />
                <span>New Ticket</span>
              </Button>
            </Link>
            <Link href="/dashboard/admins">
              <Button size="md" variant="outline" className="border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white gap-2">
                <ShieldCheck className="w-4 h-4 text-orange-400" />
                <span>Client Admins</span>
              </Button>
            </Link>
            <Link href="/dashboard/reports">
              <Button size="md" variant="outline" className="border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span>Reports</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── 2. Universal Filters Bar ── */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-slate-900">Dashboard Company Filters</span>
              {activeFiltersCount > 0 && (
                <Badge variant="primary" className="text-[11px] py-0.5 px-2 bg-orange-50 text-orange-700 border-orange-200 font-mono">
                  {activeFiltersCount} Active
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:underline px-2 py-1 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={fetchDashboardStats}
                disabled={isRefreshing}
                className="h-8 text-xs text-slate-600 gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Apply Filters</span>
              </Button>
            </div>
          </div>

          {/* Filter Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Filter 1: Date Range Preset */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Date Range</span>
              </label>
              <Select
                value={dateRangePreset}
                onChange={(e) => setDateRangePreset(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Time' },
                  { value: 'TODAY', label: 'Today Only' },
                  { value: '7D', label: 'Last 7 Days' },
                  { value: '30D', label: 'Last 30 Days' },
                  { value: 'MONTH', label: 'This Month' },
                  { value: 'CUSTOM', label: 'Custom Range...' },
                ]}
                className="h-9 text-xs"
              />
            </div>

            {/* Filter 2: Department */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Department</span>
              </label>
              <Select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Departments (Overall Company)' },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                ]}
                className="h-9 text-xs"
              />
            </div>

            {/* Filter 3: Employee / Technician */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Employee / Staff</span>
              </label>
              <Select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Employees' },
                  ...employees.map((e) => ({ value: e.id, label: e.name })),
                ]}
                className="h-9 text-xs"
              />
            </div>

            {/* Filter 4: Customer */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Customer</span>
              </label>
              <Select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Customers' },
                  ...customers.map((c) => ({ value: c.id, label: c.name })),
                ]}
                className="h-9 text-xs"
              />
            </div>

            {/* Filter 5: Product */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-slate-500" />
                <span>Product</span>
              </label>
              <Select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Products' },
                  ...products.map((p) => ({ value: p.id, label: p.name })),
                ]}
                className="h-9 text-xs"
              />
            </div>

            {/* Filter 6: Service */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-slate-500" />
                <span>Service Type</span>
              </label>
              <Select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Services' },
                  ...services.map((s) => ({ value: s.id, label: s.name })),
                ]}
                className="h-9 text-xs"
              />
            </div>

            {/* Filter 7: Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-slate-500" />
                <span>Status</span>
              </label>
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'OPEN', label: 'Open' },
                  { value: 'ASSIGNED', label: 'Assigned' },
                  { value: 'IN_PROGRESS', label: 'In Progress' },
                  { value: 'AWAITING_CUSTOMER', label: 'Awaiting Customer' },
                  { value: 'RESOLVED', label: 'Resolved' },
                  { value: 'CLOSED', label: 'Closed' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
                className="h-9 text-xs"
              />
            </div>

            {/* Custom Date Pickers (if CUSTOM selected) */}
            {dateRangePreset === 'CUSTOM' && (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">From</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 text-xs py-1"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">To</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 text-xs py-1"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── 3. Core KPI Summary Cards (7 Requested Metrics) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Metric 1: Total tickets */}
        <Card className="border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total</span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <LifeBuoy className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              {loading ? (
                <Skeleton className="h-8 w-14" />
              ) : (
                <span className="text-2xl font-black text-slate-900 tracking-tight">{stats?.total ?? 0}</span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">All filtered tickets</p>
          </CardContent>
        </Card>

        {/* Metric 2: Open */}
        <Card className="border-slate-200 shadow-xs hover:border-sky-300 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">Open</span>
              <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              {loading ? (
                <Skeleton className="h-8 w-14" />
              ) : (
                <span className="text-2xl font-black text-sky-600 tracking-tight">{stats?.open ?? 0}</span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">Awaiting start</p>
          </CardContent>
        </Card>

        {/* Metric 3: In Progress */}
        <Card className="border-slate-200 shadow-xs hover:border-indigo-300 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">In Progress</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              {loading ? (
                <Skeleton className="h-8 w-14" />
              ) : (
                <span className="text-2xl font-black text-indigo-600 tracking-tight">{stats?.inProgress ?? 0}</span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">Active technician work</p>
          </CardContent>
        </Card>

        {/* Metric 4: Closed */}
        <Card className="border-slate-200 shadow-xs hover:border-emerald-300 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Closed</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              {loading ? (
                <Skeleton className="h-8 w-14" />
              ) : (
                <span className="text-2xl font-black text-emerald-600 tracking-tight">{stats?.closed ?? 0}</span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">Completed & resolved</p>
          </CardContent>
        </Card>

        {/* Metric 5: Long-open / overdue */}
        <Card className="border-slate-200 shadow-xs hover:border-rose-300 transition-colors bg-rose-50/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Long-Open / Overdue</span>
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              {loading ? (
                <Skeleton className="h-8 w-14" />
              ) : (
                <span className="text-2xl font-black text-rose-600 tracking-tight">
                  {stats?.longOpenOverdue ?? 0}
                </span>
              )}
            </div>
            <p className="text-[10px] text-rose-700/80 font-medium mt-1 truncate">SLA breach or aging</p>
          </CardContent>
        </Card>

        {/* Metric 6: Tickets created today */}
        <Card className="border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Created Today</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <PlusCircle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              {loading ? (
                <Skeleton className="h-8 w-14" />
              ) : (
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {stats?.createdToday ?? 0}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">Since 00:00 midnight</p>
          </CardContent>
        </Card>

        {/* Metric 7: Tickets closed today */}
        <Card className="border-slate-200 shadow-xs hover:border-teal-300 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Closed Today</span>
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Check className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              {loading ? (
                <Skeleton className="h-8 w-14" />
              ) : (
                <span className="text-2xl font-black text-teal-600 tracking-tight">
                  {stats?.closedToday ?? 0}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">Finished today</p>
          </CardContent>
        </Card>
      </div>

      {/* ── 4. Analytics Breakdown Section (4 Visual Panels) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Tickets by Department */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Tickets by Department</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Distribution of service requests across organizational divisions
                  </CardDescription>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">
                {stats?.ticketsByDepartment?.length || 0} Depts
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : !stats?.ticketsByDepartment || stats.ticketsByDepartment.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No department ticket data matching current filters.</p>
            ) : (
              stats.ticketsByDepartment.map((dept) => (
                <div key={dept.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{dept.name}</span>
                    <span className="font-mono text-slate-600">
                      <strong>{dept.count}</strong> tickets ({dept.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(dept.percentage, dept.count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Panel 2: Tickets by Status */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Tickets by Status</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Workflow state progression across open and resolved lifecycle
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            {/* Visual segmented distribution bar */}
            {!loading && stats && stats.total > 0 && (
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
                {stats.ticketsByStatus.map(
                  (s) =>
                    s.count > 0 && (
                      <div
                        key={s.status}
                        className={`${s.color} h-full transition-all duration-500`}
                        style={{ width: `${s.percentage}%` }}
                        title={`${s.label}: ${s.count} (${s.percentage}%)`}
                      />
                    )
                )}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              ) : (
                stats?.ticketsByStatus?.map((s) => (
                  <div
                    key={s.status}
                    className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${s.color}`} />
                      <span className="text-[11px] font-medium text-slate-600 truncate">{s.label}</span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-base font-bold text-slate-900">{s.count}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{s.percentage}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Panel 3: Tickets by Customer */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Tickets by Customer</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Accounts generating the highest support and breakdown volume
                  </CardDescription>
                </div>
              </div>
              <Link href="/dashboard/customers" className="text-xs font-semibold text-orange-600 hover:underline">
                View Customers
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : !stats?.ticketsByCustomer || stats.ticketsByCustomer.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-6 text-center">No customer ticket data found.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.ticketsByCustomer.map((cust, idx) => (
                  <div key={cust.id} className="p-3.5 px-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold font-mono">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{cust.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.max(cust.percentage, 5)}%` }}
                        />
                      </div>
                      <Badge variant="neutral" className="text-xs font-mono font-bold bg-white">
                        {cust.count} tickets
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel 4: Tickets by Product / Service */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Tickets by Product / Service</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Equipment models and service catalog categories in demand
                  </CardDescription>
                </div>
              </div>
              <Link href="/dashboard/products" className="text-xs font-semibold text-orange-600 hover:underline">
                View Catalog
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : !stats?.ticketsByProductService || stats.ticketsByProductService.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-6 text-center">No product/service ticket data found.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.ticketsByProductService.map((item) => (
                  <div key={item.id} className="p-3.5 px-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={item.type === 'PRODUCT' ? 'primary' : 'neutral'}
                        className={`text-[9px] py-0.5 px-1.5 font-mono uppercase ${
                          item.type === 'PRODUCT' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.type}
                      </Badge>
                      <span className="text-xs font-bold text-slate-900">{item.name}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      {item.count} tickets ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 5. Operational Activity Stream & Important Notifications ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stream 1: Recent Activity across the entire tenant */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Recent Activity</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Live operational updates across all company departments
                  </CardDescription>
                </div>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Real-time Feed</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !stats?.recentActivity || stats.recentActivity.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-6 text-center">No recent activity recorded.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
                {stats.recentActivity.map((act) => (
                  <div key={act.id} className="p-3.5 px-4 hover:bg-slate-50/60 transition-colors flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900 truncate">
                          {act.actor?.fullName || 'System Event'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5 line-clamp-2">
                        {act.note || act.eventType.replace(/_/g, ' ')}
                      </p>
                      {act.ticket && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            #{act.ticket.ticketNumber}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate">{act.ticket.title}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stream 2: Important Notifications & Critical Action Items */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Important Notifications</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Action items, critical escalations, and SLA alerts
                  </CardDescription>
                </div>
              </div>
              {stats?.importantNotifications && stats.importantNotifications.length > 0 && (
                <Badge variant="primary" className="bg-amber-100 text-amber-800 text-[10px] font-mono">
                  {stats.importantNotifications.length} Action Items
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !stats?.importantNotifications || stats.importantNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">All Systems Normal</p>
                <p className="text-[11px] mt-0.5">No overdue SLA breaches or critical ticket alerts detected.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
                {stats.importantNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3.5 px-4 flex items-start gap-3 text-xs transition-colors ${
                      notif.severity === 'critical'
                        ? 'bg-rose-50/40 hover:bg-rose-50/70'
                        : notif.severity === 'warning'
                        ? 'bg-amber-50/40 hover:bg-amber-50/70'
                        : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {notif.severity === 'critical' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                      ) : notif.severity === 'warning' ? (
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Bell className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-bold text-xs truncate ${
                            notif.severity === 'critical'
                              ? 'text-rose-900'
                              : notif.severity === 'warning'
                              ? 'text-amber-900'
                              : 'text-slate-900'
                          }`}
                        >
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                      {notif.ticketNumber && (
                        <Link
                          href={`/dashboard/tickets`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline mt-1.5"
                        >
                          <span>Review Ticket #{notif.ticketNumber}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 6. Filtered Recent Tickets Quick Table ── */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Matching Service Tickets</span>
                <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                  {stats?.recentTickets?.length || 0} Listed
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Most recent tickets adhering to current company filter parameters
              </CardDescription>
            </div>
            <Link href="/dashboard/tickets">
              <Button size="sm" variant="outline" className="text-xs text-slate-700 gap-1">
                <span>View All Tickets</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !stats?.recentTickets || stats.recentTickets.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <LifeBuoy className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-600">No tickets matching the selected filters.</p>
              <button
                onClick={handleResetFilters}
                className="text-xs font-bold text-orange-600 hover:underline mt-1 inline-block"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Ticket</th>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4">Department</th>
                    <th className="py-2.5 px-4">Assigned To</th>
                    <th className="py-2.5 px-4">Priority</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.recentTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <Link href="/dashboard/tickets" className="font-bold text-blue-600 hover:underline">
                          #{t.ticketNumber}
                        </Link>
                        <div className="font-semibold text-slate-900 line-clamp-1 max-w-xs">{t.title}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {t.raisedForCustomer?.companyName || 'Walk-in'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {t.department?.name || 'General'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {t.assignedTo?.fullName || <span className="text-slate-400 italic">Unassigned</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded border ${priorityBadgeColor(t.priority)}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded border ${statusBadgeColor(t.status)}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px] font-mono">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
