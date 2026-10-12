'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import {
  Users,
  Plus,
  Search,
  Building,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  UserX,
  UserCheck,
  Eye,
  Edit2,
  Download,
  Upload,
  Briefcase,
} from 'lucide-react';
import {
  Button,
  Input,
  Dialog,
  Card,
  Skeleton,
} from '@/components/ui';

interface CustomerListItem {
  id: string;
  tenantId: string;
  customerType: 'INDIVIDUAL' | 'BUSINESS_PARTNER' | 'CORPORATE';
  customerCode?: string | null;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  businessType?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  billingAddress?: string;
  taxId?: string;
  status: 'ACTIVE' | 'INACTIVE' | string;
  portalAccessEnabled: boolean;
  verificationStatus?: 'VERIFIED' | 'PENDING' | 'UNVERIFIED';
  isVerified?: boolean;
  notes?: string;
  assetCount: number;
  branchCount: number;
  contactCount: number;
  userCount: number;
  ticketCount: number;
  openTicketCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  individual: number;
  businessPartner: number;
  corporate: number;
  withOpenTickets: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    total: 0,
    active: 0,
    inactive: 0,
    individual: 0,
    businessPartner: 0,
    corporate: 0,
    withOpenTickets: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Alert State
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal States
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerListItem | null>(null);
  const [formCustomerType, setFormCustomerType] = useState<'INDIVIDUAL' | 'BUSINESS_PARTNER' | 'CORPORATE'>('INDIVIDUAL');
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState({
    customerCode: '',
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    alternatePhone: '',
    businessType: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    billingAddress: '',
    taxId: '',
    status: 'ACTIVE',
    notes: '',
  });

  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerListItem | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMsg({ type, message });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await apiClient.get<CustomerStats>('/customers/stats');
      const data = (res as any)?.data || res;
      if (data) {
        setStats(data);
      }
    } catch {
      // stats error fallback
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search.trim()) queryParams.set('search', search.trim());
      if (statusFilter !== 'ALL') queryParams.set('status', statusFilter);
      if (typeFilter !== 'ALL') queryParams.set('customerType', typeFilter);
      queryParams.set('page', page.toString());
      queryParams.set('limit', '15');

      const res = await apiClient.get<any>(
        `/customers?${queryParams.toString()}`
      );
      const unwrapped = (res as any)?.data !== undefined ? (res as any).data : res;
      let itemList: CustomerListItem[] = [];
      let total = 0;
      let totalPages = 1;

      if (Array.isArray(unwrapped)) {
        itemList = unwrapped;
        total = unwrapped.length;
        totalPages = 1;
      } else if (unwrapped && Array.isArray(unwrapped.items)) {
        itemList = unwrapped.items;
        total = unwrapped.total ?? unwrapped.items.length;
        totalPages = unwrapped.totalPages ?? 1;
      } else if (Array.isArray((res as any)?.items)) {
        itemList = (res as any).items;
        total = (res as any).total ?? (res as any).items.length;
        totalPages = (res as any).totalPages ?? 1;
      }

      setCustomers(itemList);
      setTotalPages(totalPages);
      setTotalCount(total);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, page]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Debounced search handling
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    setModalError(null);
    setFormCustomerType('INDIVIDUAL');
    setCustomerForm({
      customerCode: '',
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      alternatePhone: '',
      businessType: '',
      address: '',
      city: '',
      state: '',
      country: 'India',
      pincode: '',
      billingAddress: '',
      taxId: '',
      status: 'ACTIVE',
      notes: '',
    });
    setShowAddEditModal(true);
  };

  const openEditModal = (customer: CustomerListItem) => {
    setEditingCustomer(customer);
    setModalError(null);
    setFormCustomerType(customer.customerType || 'INDIVIDUAL');
    setCustomerForm({
      customerCode: customer.customerCode || '',
      companyName: customer.companyName,
      contactPerson: customer.contactPerson,
      email: customer.email,
      phone: customer.phone,
      alternatePhone: customer.alternatePhone || '',
      businessType: customer.businessType || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      country: customer.country || 'India',
      pincode: customer.pincode || '',
      billingAddress: customer.billingAddress || '',
      taxId: customer.taxId || '',
      status: customer.status,
      notes: customer.notes || '',
    });
    setShowAddEditModal(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSavingCustomer(true);
    try {
      const payload: any = {
        customerType: formCustomerType,
        companyName: customerForm.companyName.trim(),
        contactPerson: (customerForm.contactPerson || customerForm.companyName).trim(),
        email: customerForm.email.trim().toLowerCase(),
        phone: customerForm.phone.trim(),
        status: customerForm.status || 'ACTIVE',
      };

      if (customerForm.customerCode?.trim()) payload.customerCode = customerForm.customerCode.trim();
      if (customerForm.alternatePhone?.trim()) payload.alternatePhone = customerForm.alternatePhone.trim();
      if (customerForm.businessType?.trim()) payload.businessType = customerForm.businessType.trim();
      if (customerForm.address?.trim()) payload.address = customerForm.address.trim();
      if (customerForm.city?.trim()) payload.city = customerForm.city.trim();
      if (customerForm.state?.trim()) payload.state = customerForm.state.trim();
      if (customerForm.country?.trim()) payload.country = customerForm.country.trim();
      if (customerForm.pincode?.trim()) payload.pincode = customerForm.pincode.trim();
      if (customerForm.billingAddress?.trim()) payload.billingAddress = customerForm.billingAddress.trim();
      if (customerForm.taxId?.trim()) payload.taxId = customerForm.taxId.trim();
      if (customerForm.notes?.trim()) payload.notes = customerForm.notes.trim();

      if (editingCustomer) {
        await apiClient.patch(`/customers/${editingCustomer.id}`, payload);
        showToast('success', `Customer "${payload.companyName}" updated successfully`);
      } else {
        await apiClient.post('/customers', payload);
        showToast('success', `Customer "${payload.companyName}" registered successfully`);
      }

      setShowAddEditModal(false);
      setPage(1);
      // Auto-reset filters if current filter would hide newly created customer
      if (typeFilter !== 'ALL' && typeFilter !== formCustomerType) {
        setTypeFilter('ALL');
      }
      if (statusFilter === 'INACTIVE' && payload.status === 'ACTIVE') {
        setStatusFilter('ALL');
      }
      await fetchCustomers();
      await fetchStats();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to save customer';
      const formatted = Array.isArray(msg) ? msg.join(', ') : msg;
      setModalError(formatted);
      showToast('error', formatted);
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleToggleStatus = async (customer: CustomerListItem) => {
    const newStatus = customer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await apiClient.patch(`/customers/${customer.id}/status`, { status: newStatus });
      showToast('success', `Customer marked as ${newStatus}`);
      fetchCustomers();
      fetchStats();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;
    try {
      await apiClient.delete(`/customers/${customerToDelete.id}`);
      showToast('success', `Customer "${customerToDelete.companyName}" processed successfully`);
      setShowDeleteModal(false);
      setCustomerToDelete(null);
      fetchCustomers();
      fetchStats();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to delete customer');
    }
  };

  // Export handling
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const res = await apiClient.get<any[]>('/customers/export');
      const data = (res as any)?.data || res || [];
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `customers_export_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
      } else {
        // CSV export
        if (data.length === 0) {
          showToast('error', 'No customers available to export');
          return;
        }
        const headers = Object.keys(data[0] || {}).join(',');
        const rows = data.map((row: Record<string, any>) =>
          Object.values(row)
            .map((val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`)
            .join(',')
        );
        const csvContent = [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      }
      showToast('success', `Customers exported successfully (${data.length} records)`);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to export customers');
    }
  };

  // Import handling
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;
    try {
      setImporting(true);
      let records: any[] = [];
      const trimmed = importText.trim();
      if (trimmed.startsWith('[')) {
        records = JSON.parse(trimmed);
      } else {
        // Simple CSV parse
        const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
        const headerLine = lines[0];
        if (!headerLine || lines.length < 2) throw new Error('CSV must have header line and at least one data row');
        const headers = headerLine.split(',').map((h) => h.replace(/["']/g, '').trim());
        for (let i = 1; i < lines.length; i++) {
          const rowLine = lines[i];
          if (!rowLine) continue;
          const vals = rowLine.split(',').map((v) => v.replace(/["']/g, '').trim());
          const obj: any = {};
          headers.forEach((h, idx) => {
            obj[h] = vals[idx] || '';
          });
          records.push(obj);
        }
      }

      const res = await apiClient.post<any>('/customers/import', records);
      showToast('success', `Import complete! ${res.data?.importedCount || 0} imported, ${res.data?.errorCount || 0} errors.`);
      setShowImportModal(false);
      setImportText('');
      fetchCustomers();
      fetchStats();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to parse and import records');
    } finally {
      setImporting(false);
    }
  };

  const getCustomerTypeLabel = (type: string) => {
    switch (type) {
      case 'CORPORATE':
        return { text: 'Corporate / Fleet', badge: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'BUSINESS_PARTNER':
        return { text: 'Business Partner', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
      default:
        return { text: 'Individual', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`fixed top-6 right-6 z-[9999] px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
          {toastMsg.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-orange-600" /> Customer Management
          </h1>
          <p className="text-sm text-slate-500">
            Manage individual vehicle/asset owners, business dealer partners, and corporate fleets.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            className="text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportModal(true)}
            className="text-slate-700 hover:bg-slate-50"
          >
            <Upload className="w-4 h-4 mr-1.5" /> Import
          </Button>
          <Button
            size="sm"
            onClick={openCreateModal}
            className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Customer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4 bg-white border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Total Customers</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {statsLoading ? '...' : stats.total}
          </div>
        </Card>
        <Card className="p-4 bg-white border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Active Accounts</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {statsLoading ? '...' : stats.active}
          </div>
        </Card>
        <Card className="p-4 bg-white border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Individual Owners</span>
          <div className="text-2xl font-bold text-teal-600 mt-1">
            {statsLoading ? '...' : stats.individual}
          </div>
        </Card>
        <Card className="p-4 bg-white border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Business Partners</span>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {statsLoading ? '...' : stats.businessPartner}
          </div>
        </Card>
        <Card className="p-4 bg-white border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Corporate / Fleets</span>
          <div className="text-2xl font-bold text-purple-600 mt-1">
            {statsLoading ? '...' : stats.corporate}
          </div>
        </Card>
        <Card className="p-4 bg-white border-slate-200">
          <span className="text-xs text-slate-500 font-medium">With Open Tickets</span>
          <div className="text-2xl font-bold text-orange-600 mt-1">
            {statsLoading ? '...' : stats.withOpenTickets}
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-white border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              type="text"
              placeholder="Search by name, customer code, email, phone, city..."
              value={search}
              onChange={handleSearchChange}
              className="pl-9 w-full bg-slate-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Type selector */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">All Categories</option>
              <option value="INDIVIDUAL">Individual Customers</option>
              <option value="BUSINESS_PARTNER">Business Partners</option>
              <option value="CORPORATE">Corporate / Fleet</option>
            </select>

            {/* Status selector */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setTypeFilter('ALL');
                setPage(1);
              }}
              className="text-xs text-slate-600"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          </div>
        </div>
      </Card>

      {/* Customer Directory Table */}
      <Card className="bg-white border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-semibold text-slate-800">No Customers Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No customer records match your filter criteria. Register individual owners, business dealers, or corporate fleets.
            </p>
            <Button size="sm" onClick={openCreateModal} className="bg-orange-600 text-white mt-2">
              <Plus className="w-4 h-4 mr-1.5" /> Add Customer
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Branches & Assets</th>
                  <th className="py-3 px-4">Tickets</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => {
                  const typeBadge = getCustomerTypeLabel(c.customerType);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/dashboard/customers/${c.id}`}
                              className="font-bold text-slate-900 hover:text-orange-600 hover:underline"
                            >
                              {c.companyName}
                            </Link>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${typeBadge.badge}`}>
                              {typeBadge.text}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            {c.customerCode && (
                              <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-[11px] font-semibold text-slate-700">
                                {c.customerCode}
                              </span>
                            )}
                            <span className="break-all">{c.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{c.contactPerson}</div>
                        <div className="text-xs text-slate-500 font-mono">{c.phone}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium" title="Branches">
                            {c.branchCount} br
                          </span>
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium" title="Assets">
                            {c.assetCount} assets
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {c.openTicketCount > 0 ? (
                          <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                            {c.openTicketCount} Open
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">0 Open</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                            c.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <Link href={`/dashboard/customers/${c.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-600 hover:text-orange-600">
                            <Eye className="w-4 h-4 mr-1" /> View
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(c)}
                          className="h-8 px-2 text-slate-600 hover:text-slate-900"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(c)}
                          className={`h-8 px-2 ${c.status === 'ACTIVE' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                          title={c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        >
                          {c.status === 'ACTIVE' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCustomerToDelete(c);
                            setShowDeleteModal(true);
                          }}
                          className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
            <div>
              Showing {customers.length} of {totalCount} customers (Page {page} of {totalPages})
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* MODAL: ADD / EDIT CUSTOMER */}
      <Dialog
        open={showAddEditModal}
        onOpenChange={setShowAddEditModal}
        title={editingCustomer ? 'Edit Customer Record' : 'Register New Customer'}
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4 text-sm max-h-[80vh] overflow-y-auto pr-1">
          {modalError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{modalError}</span>
            </div>
          )}
          {/* Customer Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Customer Category *</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormCustomerType('INDIVIDUAL')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                  formCustomerType === 'INDIVIDUAL'
                    ? 'border-orange-600 bg-orange-50 text-orange-800 ring-2 ring-orange-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Users className="w-4 h-4 text-teal-600" />
                <span>Individual Owner</span>
              </button>
              <button
                type="button"
                onClick={() => setFormCustomerType('BUSINESS_PARTNER')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                  formCustomerType === 'BUSINESS_PARTNER'
                    ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Briefcase className="w-4 h-4 text-blue-600" />
                <span>Business Partner</span>
              </button>
              <button
                type="button"
                onClick={() => setFormCustomerType('CORPORATE')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                  formCustomerType === 'CORPORATE'
                    ? 'border-purple-600 bg-purple-50 text-purple-800 ring-2 ring-purple-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Building className="w-4 h-4 text-purple-600" />
                <span>Corporate / Fleet</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {formCustomerType === 'INDIVIDUAL' ? 'Customer Full Name *' : 'Company / Organization Name *'}
              </label>
              <Input
                required
                placeholder={formCustomerType === 'INDIVIDUAL' ? 'e.g. Anand Verma' : 'e.g. Tata Motors Commercial'}
                value={customerForm.companyName}
                onChange={(e) => setCustomerForm({ ...customerForm, companyName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Code (Optional — auto-generated if blank)
              </label>
              <Input
                placeholder="e.g. CUST-CORP-001"
                value={customerForm.customerCode}
                onChange={(e) => setCustomerForm({ ...customerForm, customerCode: e.target.value })}
              />
            </div>
          </div>

          {formCustomerType !== 'INDIVIDUAL' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Contact Person</label>
                <Input
                  placeholder="e.g. Rajesh Sharma"
                  value={customerForm.contactPerson}
                  onChange={(e) => setCustomerForm({ ...customerForm, contactPerson: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {formCustomerType === 'BUSINESS_PARTNER' ? 'Partner / Business Type' : 'Tax ID / GSTIN / VAT'}
                </label>
                <Input
                  placeholder={formCustomerType === 'BUSINESS_PARTNER' ? 'e.g. Authorized Dealer' : 'e.g. 27AAACT2727Q1ZT'}
                  value={formCustomerType === 'BUSINESS_PARTNER' ? customerForm.businessType : customerForm.taxId}
                  onChange={(e) =>
                    formCustomerType === 'BUSINESS_PARTNER'
                      ? setCustomerForm({ ...customerForm, businessType: e.target.value })
                      : setCustomerForm({ ...customerForm, taxId: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email Address *</label>
              <Input
                type="email"
                required
                placeholder="official@company.com"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Phone Number *</label>
              <Input
                required
                placeholder="+91 9876543210"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alternate Phone (Optional)</label>
              <Input
                placeholder="+91 9876543211"
                value={customerForm.alternatePhone}
                onChange={(e) => setCustomerForm({ ...customerForm, alternatePhone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
              <select
                value={customerForm.status}
                onChange={(e) => setCustomerForm({ ...customerForm, status: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Address</label>
            <Input
              placeholder="Plot 14, MIDC Industrial Belt"
              value={customerForm.address}
              onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <Input
                placeholder="Pune"
                value={customerForm.city}
                onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <Input
                placeholder="Maharashtra"
                value={customerForm.state}
                onChange={(e) => setCustomerForm({ ...customerForm, state: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Postal Code</label>
              <Input
                placeholder="411018"
                value={customerForm.pincode}
                onChange={(e) => setCustomerForm({ ...customerForm, pincode: e.target.value })}
              />
            </div>
          </div>

          {formCustomerType === 'CORPORATE' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Address (If Different)</label>
              <Input
                placeholder="HQ Bombay House, Mumbai"
                value={customerForm.billingAddress}
                onChange={(e) => setCustomerForm({ ...customerForm, billingAddress: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Notes</label>
            <textarea
              rows={2}
              placeholder="Special service instructions, contract terms, etc."
              value={customerForm.notes}
              onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {modalError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span className="font-medium">{modalError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setShowAddEditModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSavingCustomer}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isSavingCustomer
                ? 'Saving...'
                : editingCustomer
                ? 'Update Customer'
                : 'Register Customer'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL: BULK IMPORT */}
      <Dialog
        open={showImportModal}
        onOpenChange={setShowImportModal}
        title="Import Customer Records"
      >
        <form onSubmit={handleImportSubmit} className="space-y-4 text-sm">
          <p className="text-xs text-slate-500">
            Paste customer data in CSV or JSON format. Required fields: <code className="text-orange-600 font-mono">companyName, contactPerson, email, phone</code>.
          </p>

          <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-xs font-mono text-slate-600">
            companyName,contactPerson,email,phone,customerType,city<br />
            &quot;Acme Corp&quot;,&quot;John Doe&quot;,&quot;john@acme.com&quot;,&quot;+91 9876500010&quot;,&quot;CORPORATE&quot;,&quot;Mumbai&quot;
          </div>

          <textarea
            required
            rows={8}
            placeholder="Paste CSV or JSON records here..."
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="w-full p-3 font-mono text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setShowImportModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={importing} className="bg-orange-600 hover:bg-orange-700 text-white">
              {importing ? 'Importing...' : 'Upload & Import'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL: CONFIRM DEACTIVATION / REMOVAL */}
      <Dialog
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Remove Customer Record"
      >
        <div className="space-y-4 text-sm">
          <p className="text-slate-600">
            Are you sure you want to remove <strong>{customerToDelete?.companyName}</strong>?
          </p>
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-800">
            <strong>Note on Historical Integrity:</strong> If this customer has existing service tickets or assets, they will be automatically <strong>deactivated</strong> instead of deleted to protect historical audit records and ticket history.
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 text-white">
              Confirm Action
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
