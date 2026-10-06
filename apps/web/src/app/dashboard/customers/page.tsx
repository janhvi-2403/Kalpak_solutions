'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import {
  Users,
  Plus,
  Search,
  Building,
  Phone,
  Mail,
  MapPin,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Copy,
  Ticket,
  ExternalLink,
  RefreshCw,
  UserX,
  UserCheck,
  Eye,
  X,
  AlertTriangle,
  Send,
} from 'lucide-react';
import {
  Button,
  Input,
  Dialog,
  Badge,
  Card,
  Skeleton,
  Checkbox,
} from '@/components/ui';

interface CustomerListItem {
  id: string;
  tenantId: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  pincode?: string;
  status: 'ACTIVE' | 'INACTIVE' | string;
  portalAccessEnabled: boolean;
  verificationStatus?: 'VERIFIED' | 'PENDING' | 'UNVERIFIED';
  isVerified?: boolean;
  notes?: string;
  assetCount: number;
  ticketCount: number;
  openTicketCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  withOpenTickets: number;
}

interface CustomerAssetItem {
  id: string;
  serialNumber: string;
  warrantyStatus?: string;
  warrantyEndDate?: string;
  installationDate?: string;
  product?: {
    id: string;
    name: string;
    modelNumber: string;
    category?: string;
  };
}

interface CustomerTicketItem {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'AWAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  serviceType?: string;
  isOverdue: boolean;
  dueAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  department?: { id: string; name: string; code: string } | null;
  assignedTo?: { id: string; fullName: string; email: string } | null;
  customerAsset?: { id: string; serialNumber: string } | null;
  product?: { id: string; name: string; modelNumber: string } | null;
}

interface CustomerDetail extends CustomerListItem {
  assets: CustomerAssetItem[];
  tickets: CustomerTicketItem[];
  ticketSummary: {
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    slaBreachedTickets: number;
  };
}

interface DepartmentItem {
  id: string;
  name: string;
  code: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    total: 0,
    active: 0,
    inactive: 0,
    withOpenTickets: 0,
  });
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [verificationFilter, setVerificationFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING' | 'UNVERIFIED'>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [ticketFilter, setTicketFilter] = useState<'ALL' | 'WITH_OPEN' | 'WITH_TICKETS' | 'NO_TICKETS'>('ALL');
  const [sortBy, setSortBy] = useState<'RECENT' | 'NAME' | 'TICKETS'>('RECENT');

  // Modals & Panels State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // View Customer Details
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Create Ticket for Customer Modal
  const [ticketModalCustomer, setTicketModalCustomer] = useState<CustomerListItem | CustomerDetail | null>(null);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketPriority, setTicketPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [ticketDepartmentId, setTicketDepartmentId] = useState('');
  const [ticketAssetId, setTicketAssetId] = useState('');
  const [ticketServiceType, setTicketServiceType] = useState('BREAKDOWN');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [createdTicketResult, setCreatedTicketResult] = useState<{ id: string; ticketNumber: string } | null>(null);

  // Invitation Sent Modal (Token-based email activation link matching Department Head)
  const [sentInviteModalData, setSentInviteModalData] = useState<{
    customerName: string;
    email: string;
    inviteUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isInvitingId, setIsInvitingId] = useState<string | null>(null);

  // Status Change / Deactivate Modal
  const [statusChangeCandidate, setStatusChangeCandidate] = useState<CustomerListItem | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Add Customer Form Fields
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [address, setAddress] = useState('');
  const [customerType, setCustomerType] = useState('REGULAR');
  const [initialStatus, setInitialStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [sendInviteOnCreate, setSendInviteOnCreate] = useState(true);
  const [notes, setNotes] = useState('');

  // Fetch Departments Master Data
  useEffect(() => {
    async function loadDepartments() {
      try {
        const deptsRes = await apiClient<DepartmentItem[]>('/departments').catch(() => []);
        if (Array.isArray(deptsRes)) {
          setDepartments(deptsRes);
        }
      } catch (err) {
        console.error('Failed to load initial metadata', err);
      }
    }
    loadDepartments();
  }, []);

  // Fetch KPI Stats
  const fetchStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const data = await apiClient<CustomerStats>('/customers/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch customer stats', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Fetch Customers List
  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const data = await apiClient<CustomerListItem[]>(`/customers${queryStr}`);
      setCustomers(data);
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to fetch customers list',
      });
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  // Initial load and on filters change
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  // Fetch Single Customer Full Details when drawer opened
  const fetchCustomerDetail = useCallback(async (id: string) => {
    try {
      setIsLoadingDetail(true);
      const data = await apiClient<CustomerDetail>(`/customers/${id}`);
      setCustomerDetail(data);
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load customer details',
      });
      setSelectedCustomerId(null);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerDetail(selectedCustomerId);
    } else {
      setCustomerDetail(null);
    }
  }, [selectedCustomerId, fetchCustomerDetail]);

  // Unique list of cities for filter
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.city && c.city.trim()) set.add(c.city.trim());
    });
    return Array.from(set).sort();
  }, [customers]);

  // Filtered & Sorted Customers
  const filteredCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        // Verification status filter
        if (verificationFilter !== 'ALL') {
          if (verificationFilter === 'VERIFIED' && c.verificationStatus !== 'VERIFIED') return false;
          if (verificationFilter === 'PENDING' && c.verificationStatus !== 'PENDING') return false;
          if (verificationFilter === 'UNVERIFIED' && c.verificationStatus !== 'UNVERIFIED') return false;
        }

        // Location filter
        if (locationFilter !== 'ALL') {
          if (!c.city || c.city.toLowerCase() !== locationFilter.toLowerCase()) return false;
        }

        // Ticket Count filter
        if (ticketFilter === 'WITH_OPEN') {
          if ((c.openTicketCount || 0) <= 0) return false;
        } else if (ticketFilter === 'WITH_TICKETS') {
          if ((c.ticketCount || 0) <= 0) return false;
        } else if (ticketFilter === 'NO_TICKETS') {
          if ((c.ticketCount || 0) > 0) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'NAME') {
          return a.companyName.localeCompare(b.companyName);
        }
        if (sortBy === 'TICKETS') {
          return (b.ticketCount || 0) - (a.ticketCount || 0);
        }
        // RECENT
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [customers, locationFilter, ticketFilter, verificationFilter, sortBy]);

  // Handle Add Customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !contactPerson.trim() || !email.trim() || !phone.trim()) return;

    try {
      setIsSubmitting(true);
      setFeedbackMsg(null);

      const notesPayload = [
        customerType ? `[Type: ${customerType}]` : '',
        notes.trim() ? notes.trim() : '',
      ]
        .filter(Boolean)
        .join(' ');

      const res = await apiClient<any>('/customers', {
        method: 'POST',
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactPerson: contactPerson.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          city: city.trim() || undefined,
          pincode: pincode.trim() || undefined,
          address: address.trim() || undefined,
          status: initialStatus,
          notes: notesPayload || undefined,
        }),
      });

      setFeedbackMsg({
        type: 'success',
        text: `Customer "${companyName}" added successfully.`,
      });

      setIsAddModalOpen(false);
      const newCustId = res?.id;
      const newCustCompany = companyName;
      const newCustEmail = email;
      const newCustContact = contactPerson;

      // Reset form
      setCompanyName('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setCity('');
      setPincode('');
      setAddress('');
      setCustomerType('REGULAR');
      setInitialStatus('ACTIVE');
      setNotes('');

      // Refresh list & stats
      await Promise.all([fetchCustomers(), fetchStats()]);

      // If send invite was checked, dispatch invitation email immediately
      if (sendInviteOnCreate && newCustId) {
        handleInviteCustomer(newCustId, newCustCompany, newCustEmail, newCustContact);
      }
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to register customer',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Send Customer Invitation (Email activation workflow matching Department Head)
  const handleInviteCustomer = async (
    customerId: string,
    company: string,
    customerEmail: string,
    contact: string
  ) => {
    try {
      setIsInvitingId(customerId);
      setFeedbackMsg(null);
      const res = await apiClient<any>(`/customers/${customerId}/invite`, {
        method: 'POST',
      });

      const inviteUrl =
        res.inviteUrl ||
        `${window.location.origin}/accept-invitation?token=${res.token || ''}`;

      setSentInviteModalData({
        customerName: `${company} (${contact})`,
        email: res.email || customerEmail,
        inviteUrl,
      });

      setFeedbackMsg({
        type: 'success',
        text: `Invitation email sent to ${customerEmail}. Customer can set password via email activation link.`,
      });

      await fetchCustomers();
      if (selectedCustomerId === customerId) {
        await fetchCustomerDetail(customerId);
      }
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to send customer invitation',
      });
    } finally {
      setIsInvitingId(null);
    }
  };

  // Handle Status Toggle / Deactivation
  const handleStatusChange = async (targetStatus: 'ACTIVE' | 'INACTIVE') => {
    if (!statusChangeCandidate) return;

    try {
      setIsUpdatingStatus(true);
      setFeedbackMsg(null);

      await apiClient<any>(`/customers/${statusChangeCandidate.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetStatus }),
      });

      setFeedbackMsg({
        type: 'success',
        text: `Customer "${statusChangeCandidate.companyName}" is now ${targetStatus === 'ACTIVE' ? 'Active' : 'Deactivated'}. Ticket records preserved.`,
      });

      setStatusChangeCandidate(null);
      await Promise.all([fetchCustomers(), fetchStats()]);
      if (selectedCustomerId === statusChangeCandidate.id) {
        await fetchCustomerDetail(statusChangeCandidate.id);
      }
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update customer status',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Delete (with soft deactivation if ticket history exists)
  const handleDeleteCustomer = async (cust: CustomerListItem) => {
    if (
      !confirm(
        `Are you sure you want to remove customer "${cust.companyName}"?\nIf the customer has ticket history, they will be safely deactivated to preserve all service and audit records.`
      )
    ) {
      return;
    }

    try {
      setFeedbackMsg(null);
      const res = await apiClient<any>(`/customers/${cust.id}`, { method: 'DELETE' });
      setFeedbackMsg({
        type: 'success',
        text: res.message || `Customer "${cust.companyName}" updated.`,
      });
      await Promise.all([fetchCustomers(), fetchStats()]);
      if (selectedCustomerId === cust.id) {
        setSelectedCustomerId(null);
      }
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to process customer delete',
      });
    }
  };

  // Open "Create Ticket for Customer" Modal
  const openCreateTicketModal = (customer: CustomerListItem | CustomerDetail) => {
    setTicketModalCustomer(customer);
    setTicketTitle('');
    setTicketDescription('');
    setTicketPriority('MEDIUM');
    setTicketDepartmentId(departments[0]?.id || '');
    setTicketAssetId('');
    setTicketServiceType('BREAKDOWN');
    setCreatedTicketResult(null);
  };

  // Handle Submit Manual Ticket for Customer
  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketModalCustomer || !ticketTitle.trim() || !ticketDescription.trim()) return;

    try {
      setIsSubmittingTicket(true);
      setFeedbackMsg(null);

      const payload: any = {
        title: ticketTitle.trim(),
        description: ticketDescription.trim(),
        priority: ticketPriority,
        raisedBy: 'EMPLOYEE',
        raisedForCustomerId: ticketModalCustomer.id,
        source: 'PHONE',
      };

      if (ticketDepartmentId) {
        payload.departmentId = ticketDepartmentId;
      }
      if (ticketAssetId) {
        payload.customerAssetId = ticketAssetId;
      }

      const res = await apiClient<any>('/tickets', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setCreatedTicketResult({
        id: res.id,
        ticketNumber: res.ticketNumber || 'Ticket Created',
      });

      setFeedbackMsg({
        type: 'success',
        text: `Service ticket ${res.ticketNumber} created successfully for ${ticketModalCustomer.companyName}.`,
      });

      // Refresh data
      await Promise.all([fetchCustomers(), fetchStats()]);
      if (selectedCustomerId === ticketModalCustomer.id) {
        await fetchCustomerDetail(ticketModalCustomer.id);
      }
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to create service ticket',
      });
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer Directory</h1>
            <Badge variant="primary" className="font-mono text-xs">
              {stats.total} Total
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Searchable customer accounts, factory locations, direct phone intakes, and ticket histories.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchStats();
              fetchCustomers();
            }}
            className="gap-1.5 text-xs text-slate-600"
            title="Refresh list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={() => {
              setFeedbackMsg(null);
              setIsAddModalOpen(true);
            }}
            className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </Button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Customers</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {isLoadingStats ? <Skeleton className="h-7 w-12" /> : stats.total}
            </span>
            <span className="text-xs text-slate-400">accounts</span>
          </div>
        </Card>

        <Card className="p-4 border-emerald-100 bg-emerald-50/30 shadow-sm hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Active</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100/80 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-950">
              {isLoadingStats ? <Skeleton className="h-7 w-12" /> : stats.active}
            </span>
            <span className="text-xs text-emerald-600 font-medium">enabled</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200 bg-slate-50/60 shadow-sm hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Inactive</span>
            <div className="w-8 h-8 rounded-lg bg-slate-200/70 text-slate-500 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-700">
              {isLoadingStats ? <Skeleton className="h-7 w-12" /> : stats.inactive}
            </span>
            <span className="text-xs text-slate-400">deactivated</span>
          </div>
        </Card>

        <Card className="p-4 border-amber-200 bg-amber-50/40 shadow-sm hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Customers with Open Tickets</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-950">
              {isLoadingStats ? <Skeleton className="h-7 w-12" /> : stats.withOpenTickets}
            </span>
            <span className="text-xs text-amber-700 font-medium">require attention</span>
          </div>
        </Card>
      </div>

      {/* Feedback Message */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-in fade-in-50 ${
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
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-4 border-slate-200 bg-white space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer, contact person, email, phone, city..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm"
            />
          </div>

          {/* Verification Status Filter */}
          <div className="md:col-span-2">
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value as any)}
              className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="ALL">All Verification</option>
              <option value="VERIFIED">✓ Verified Only</option>
              <option value="PENDING">⏳ Pending Verification</option>
              <option value="UNVERIFIED">Not Verified</option>
            </select>
          </div>

          {/* Location Filter */}
          <div className="md:col-span-2">
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Locations</option>
              {uniqueCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Ticket Count Filter */}
          <div className="md:col-span-3">
            <select
              value={ticketFilter}
              onChange={(e) => setTicketFilter(e.target.value as any)}
              className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Ticket States</option>
              <option value="WITH_OPEN">Has Open Tickets (Active Calls)</option>
              <option value="WITH_TICKETS">Has Ticket History (&gt; 0)</option>
              <option value="NO_TICKETS">No Tickets Raised (0)</option>
            </select>
          </div>
        </div>

        {/* Sub-bar: Sort & Counts */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-medium">
            <span>Showing</span>
            <strong className="text-slate-800">{filteredCustomers.length}</strong>
            <span>of {customers.length} loaded accounts</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Sort by:</span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setSortBy('RECENT')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                  sortBy === 'RECENT'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Recently Added
              </button>
              <button
                type="button"
                onClick={() => setSortBy('TICKETS')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                  sortBy === 'TICKETS'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ticket Count
              </button>
              <button
                type="button"
                onClick={() => setSortBy('NAME')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                  sortBy === 'NAME'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Company (A-Z)
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Customers Table */}
      <Card className="border-slate-200 bg-white overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-6 w-1/5" />
                <Skeleton className="h-6 w-1/6" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Building className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No customers match your criteria</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search query, location filter, or ticket state filters to view client records.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                  setLocationFilter('ALL');
                  setTicketFilter('ALL');
                }}
              >
                Reset Filters
              </Button>
              <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
                Add Customer
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Customer & Contact</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Company / Location</th>
                  <th className="py-3 px-4 text-center">Tickets</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((cust) => {
                  const isActive = cust.status === 'ACTIVE';
                  const hasOpen = (cust.openTicketCount || 0) > 0;

                  return (
                    <tr
                      key={cust.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* Customer & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {cust.companyName.substring(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setSelectedCustomerId(cust.id)}
                              className="font-bold text-slate-900 hover:text-blue-600 text-xs text-left truncate block max-w-xs transition-colors"
                            >
                              {cust.companyName}
                            </button>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Users className="w-3 h-3 text-slate-400" />
                              <span className="truncate">{cust.contactPerson}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        <a
                          href={`mailto:${cust.email}`}
                          className="hover:text-blue-600 hover:underline flex items-center gap-1.5 truncate max-w-[180px]"
                        >
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{cust.email}</span>
                        </a>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        <a
                          href={`tel:${cust.phone}`}
                          className="hover:text-blue-600 flex items-center gap-1.5"
                        >
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{cust.phone}</span>
                        </a>
                      </td>

                      {/* Location / Company */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-800">
                            {cust.city || 'Location N/A'}
                          </span>
                          {cust.pincode && (
                            <span className="text-[10px] text-slate-400">({cust.pincode})</span>
                          )}
                        </div>
                      </td>

                      {/* Tickets Count */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <Badge
                            variant={cust.ticketCount > 0 ? 'primary' : 'neutral'}
                            className="font-semibold px-2 py-0.5 text-xs"
                          >
                            {cust.ticketCount}
                          </Badge>
                          {hasOpen && (
                            <span
                              title={`${cust.openTicketCount} open / active tickets`}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200"
                            >
                              {cust.openTicketCount} open
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Verification Status */}
                      <td className="py-3.5 px-4 text-center">
                        {cust.verificationStatus === 'VERIFIED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Verified
                          </span>
                        ) : cust.verificationStatus === 'PENDING' ? (
                          <span
                            title="Invitation email sent; customer sets password via email link"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                            Not Verified
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* View Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCustomerId(cust.id)}
                            className="h-7 px-2.5 text-xs gap-1 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </Button>

                          {/* + Ticket Button (Manual Phone Intake) */}
                          <Button
                            size="sm"
                            onClick={() => openCreateTicketModal(cust)}
                            className="h-7 px-2.5 text-xs gap-1 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                            title="Create Ticket for Customer (Phone / Manual Call)"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Ticket</span>
                          </Button>

                          {/* Send / Resend Invitation Email */}
                          <button
                            type="button"
                            onClick={() =>
                              handleInviteCustomer(
                                cust.id,
                                cust.companyName,
                                cust.email,
                                cust.contactPerson
                              )
                            }
                            disabled={isInvitingId === cust.id}
                            className={`p-1.5 rounded-lg transition-colors ${
                              cust.verificationStatus === 'PENDING'
                                ? 'text-amber-600 hover:bg-amber-50'
                                : cust.verificationStatus === 'VERIFIED'
                                ? 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                                : 'text-blue-600 hover:bg-blue-50'
                            }`}
                            title={
                              cust.verificationStatus === 'VERIFIED'
                                ? 'Resend Activation Link / Invite Email'
                                : cust.verificationStatus === 'PENDING'
                                ? 'Resend Invitation Email (Pending Activation)'
                                : 'Send Invitation Email'
                            }
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          {/* Deactivate / Activate Button */}
                          <button
                            type="button"
                            onClick={() => setStatusChangeCandidate(cust)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title={isActive ? 'Deactivate Customer (Preserve Records)' : 'Activate Customer'}
                          >
                            {isActive ? (
                              <UserX className="w-3.5 h-3.5" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                          </button>

                          {/* Soft Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomer(cust)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Remove Customer (Deactivates if tickets exist)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. Customer Details Slide-Over / Modal */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedCustomerId && (
        <Dialog
          isOpen={true}
          onClose={() => setSelectedCustomerId(null)}
          title={customerDetail ? customerDetail.companyName : 'Customer Account Profile'}
          description="Profile information, ticket summary metrics, and historical service calls."
        >
          {isLoadingDetail || !customerDetail ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <div className="space-y-6 pt-2 max-h-[75vh] overflow-y-auto pr-1">
              {/* Header Profile Bar */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      {customerDetail.companyName}
                    </h2>
                    {customerDetail.verificationStatus === 'VERIFIED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Verified Account
                      </span>
                    ) : customerDetail.verificationStatus === 'PENDING' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Pending Verification
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700">
                        <AlertCircle className="w-3 h-3 text-slate-500" />
                        Not Verified
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {customerDetail.contactPerson}
                    </span>
                    <a
                      href={`mailto:${customerDetail.email}`}
                      className="hover:underline text-blue-600 flex items-center gap-1"
                    >
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {customerDetail.email}
                    </a>
                    <a
                      href={`tel:${customerDetail.phone}`}
                      className="hover:underline text-slate-700 flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {customerDetail.phone}
                    </a>
                    {customerDetail.city && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {customerDetail.city}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Action Triggers */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => openCreateTicketModal(customerDetail)}
                    className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-xs shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Ticket for Customer</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleInviteCustomer(
                        customerDetail.id,
                        customerDetail.companyName,
                        customerDetail.email,
                        customerDetail.contactPerson
                      )
                    }
                    className="text-xs gap-1 border-slate-200"
                    title="Send Email Invitation"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {customerDetail.verificationStatus === 'VERIFIED'
                        ? 'Resend Link'
                        : customerDetail.verificationStatus === 'PENDING'
                        ? 'Resend Invite'
                        : 'Send Invite'}
                    </span>
                  </Button>
                </div>
              </div>

              {/* Ticket Summary KPIs */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Ticket Summary
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                    <span className="text-[11px] text-slate-500 block">Total</span>
                    <span className="text-lg font-bold text-slate-900">
                      {customerDetail.ticketSummary.totalTickets}
                    </span>
                  </div>
                  <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 text-center">
                    <span className="text-[11px] text-blue-700 block font-medium">Open</span>
                    <span className="text-lg font-bold text-blue-900">
                      {customerDetail.ticketSummary.openTickets}
                    </span>
                  </div>
                  <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-100 text-center">
                    <span className="text-[11px] text-purple-700 block font-medium">In Progress</span>
                    <span className="text-lg font-bold text-purple-900">
                      {customerDetail.ticketSummary.inProgressTickets}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100 text-center">
                    <span className="text-[11px] text-emerald-700 block font-medium">Resolved</span>
                    <span className="text-lg font-bold text-emerald-900">
                      {customerDetail.ticketSummary.resolvedTickets}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-100/70 rounded-lg border border-slate-200 text-center">
                    <span className="text-[11px] text-slate-600 block">Closed</span>
                    <span className="text-lg font-bold text-slate-700">
                      {customerDetail.ticketSummary.closedTickets}
                    </span>
                  </div>
                  <div className="p-3 bg-red-50/60 rounded-lg border border-red-100 text-center">
                    <span className="text-[11px] text-red-700 block font-medium">SLA Breached</span>
                    <span className="text-lg font-bold text-red-800">
                      {customerDetail.ticketSummary.slaBreachedTickets}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Ticket History Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Ticket History
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      All service calls and tickets raised for this customer in chronological order.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openCreateTicketModal(customerDetail)}
                    className="text-xs gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Ticket</span>
                  </Button>
                </div>

                {customerDetail.tickets.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                    <Ticket className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">
                      No ticket history for this customer
                    </p>
                    <p className="text-[11px] text-slate-500">
                      When this customer calls with an issue, click below to record their first service call.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => openCreateTicketModal(customerDetail)}
                      className="mt-2 bg-blue-600 hover:bg-blue-700"
                    >
                      Create First Ticket
                    </Button>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold text-[11px]">
                            <th className="py-2.5 px-3">Ticket ID</th>
                            <th className="py-2.5 px-3">Subject / Issue</th>
                            <th className="py-2.5 px-3">Department</th>
                            <th className="py-2.5 px-3">Priority</th>
                            <th className="py-2.5 px-3">Assigned Technician</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Created</th>
                            <th className="py-2.5 px-3">SLA Status</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {customerDetail.tickets.map((t) => {
                            const isCritical = t.priority === 'CRITICAL';
                            const isHigh = t.priority === 'HIGH';

                            return (
                              <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                                {/* Ticket ID */}
                                <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                                  <Link
                                    href={`/dashboard/tickets/${t.id}`}
                                    className="hover:underline flex items-center gap-1"
                                  >
                                    <span>{t.ticketNumber}</span>
                                    <ExternalLink className="w-3 h-3 text-slate-400" />
                                  </Link>
                                </td>

                                {/* Subject */}
                                <td className="py-2.5 px-3 max-w-[200px]">
                                  <span className="font-semibold text-slate-800 block truncate" title={t.title}>
                                    {t.title}
                                  </span>
                                  {t.customerAsset && (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      Asset: {t.customerAsset.serialNumber}
                                    </span>
                                  )}
                                </td>

                                {/* Department */}
                                <td className="py-2.5 px-3 text-slate-600">
                                  {t.department ? (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                                      {t.department.name}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">General</span>
                                  )}
                                </td>

                                {/* Priority */}
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      isCritical
                                        ? 'bg-red-100 text-red-800 border border-red-200'
                                        : isHigh
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                        : t.priority === 'MEDIUM'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {t.priority}
                                  </span>
                                </td>

                                {/* Assigned Staff */}
                                <td className="py-2.5 px-3 text-slate-600">
                                  {t.assignedTo ? (
                                    <span className="font-medium text-slate-800">
                                      {t.assignedTo.fullName}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                                  )}
                                </td>

                                {/* Status */}
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      t.status === 'RESOLVED'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : t.status === 'CLOSED'
                                        ? 'bg-slate-200 text-slate-700'
                                        : t.status === 'IN_PROGRESS'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    {t.status}
                                  </span>
                                </td>

                                {/* Created Date */}
                                <td className="py-2.5 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                                  {new Date(t.createdAt).toLocaleDateString()}
                                </td>

                                {/* SLA Status */}
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  {t.isOverdue ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                                      <AlertTriangle className="w-3 h-3 text-red-600" />
                                      SLA Breached
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      On Track
                                    </span>
                                  )}
                                </td>

                                {/* Action */}
                                <td className="py-2.5 px-3 text-right">
                                  <Link
                                    href={`/dashboard/tickets/${t.id}`}
                                    className="text-blue-600 hover:text-blue-800 font-semibold hover:underline inline-flex items-center gap-0.5"
                                  >
                                    <span>Open</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </Link>
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

              {/* Installed Assets & Plant Equipment */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Registered Plant Equipment & Assets ({customerDetail.assets.length})
                </h3>

                {customerDetail.assets.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    No machine serial numbers currently tagged to this customer account.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {customerDetail.assets.map((asset) => (
                      <div
                        key={asset.id}
                        className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-xs text-slate-900 block">
                            {asset.serialNumber}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {asset.product?.name || 'Equipment'} ({asset.product?.modelNumber || 'N/A'})
                          </span>
                        </div>
                        <Badge variant="neutral" className="text-[10px]">
                          {asset.warrantyStatus || 'WARRANTY'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                <Button variant="outline" onClick={() => setSelectedCustomerId(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Dialog>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. Add Customer Modal */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Customer Account"
        description="Client Admin manual customer onboarding. Designate primary contacts and portal settings."
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 mt-3 text-xs">
          <Input
            id="cust-company"
            label="Company / Organization Name *"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. ABC Industries Ltd."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="cust-contact"
              label="Contact Person Name *"
              required
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="e.g. Rahul Patil"
            />
            <Input
              id="cust-phone"
              label="Phone Number *"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
            />
          </div>

          <Input
            id="cust-email"
            type="email"
            label="Email Address *"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. rahul@abcindustries.com"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="cust-city"
              label="Location / City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Pune, Nashik, Mumbai"
            />
            <Input
              id="cust-pincode"
              label="Postal Pincode"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder="e.g. 411018"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Type
              </label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="REGULAR">Regular Client</option>
                <option value="ENTERPRISE">Enterprise / Key Account</option>
                <option value="SME">SME Manufacturer</option>
                <option value="AMC">Annual Maintenance (AMC) Client</option>
                <option value="VIP">VIP Priority Customer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Account Status
              </label>
              <select
                value={initialStatus}
                onChange={(e) => setInitialStatus(e.target.value as any)}
                className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ACTIVE">Active (Can Raise Tickets)</option>
                <option value="INACTIVE">Inactive (Disabled)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Factory / Plant Address (Optional)
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              placeholder="Plot number, industrial estate, landmark..."
              className="w-full text-xs rounded-lg border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Checkbox
            id="cust-invite"
            label="Send activation invitation email immediately (Customer will set their own password via secure email link)"
            checked={sendInviteOnCreate}
            onChange={(e) => setSendInviteOnCreate(e.target.checked)}
          />

          <div className="sticky -bottom-2 bg-white flex items-center justify-end gap-3 pt-3 pb-1 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
              Add Customer
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7. Manual Ticket Creation for Customer Modal */}
      {/* ───────────────────────────────────────────────────────────── */}
      {ticketModalCustomer && (
        <Dialog
          isOpen={true}
          onClose={() => setTicketModalCustomer(null)}
          title={`Create Ticket for ${ticketModalCustomer.companyName}`}
          description="Phone call intake or manual ticket entry on behalf of this customer."
        >
          {createdTicketResult ? (
            <div className="space-y-4 py-3 text-xs">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-900">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">Ticket Successfully Created!</h4>
                  <p className="text-emerald-700 mt-0.5">
                    Service Call <span className="font-mono font-bold">{createdTicketResult.ticketNumber}</span> is now active in the dispatch queue.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setTicketModalCustomer(null)}
                >
                  Close
                </Button>
                <Link href={`/dashboard/tickets/${createdTicketResult.id}`}>
                  <Button className="bg-blue-600 hover:bg-blue-700 gap-1.5">
                    <span>View Ticket in Tickets Desk</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateTicketSubmit} className="space-y-4 mt-3 text-xs">
              {/* Customer summary banner */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 block">
                    Customer Account
                  </span>
                  <span className="font-bold text-slate-900 text-xs">
                    {ticketModalCustomer.companyName}
                  </span>
                  <span className="text-slate-500 text-[11px] block">
                    Contact: {ticketModalCustomer.contactPerson} ({ticketModalCustomer.phone})
                  </span>
                </div>
                <Badge variant="primary" className="text-[10px]">
                  Intake: Phone Call
                </Badge>
              </div>

              <Input
                id="ticket-subject"
                label="Issue / Subject *"
                required
                value={ticketTitle}
                onChange={(e) => setTicketTitle(e.target.value)}
                placeholder="e.g. Gearbox making abnormal noise"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department Routing *
                  </label>
                  <select
                    value={ticketDepartmentId}
                    onChange={(e) => setTicketDepartmentId(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">General Support Queue</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Priority Level *
                  </label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value as any)}
                    className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="CRITICAL">P1 — Critical Breakdown</option>
                    <option value="HIGH">P2 — High Impact Failure</option>
                    <option value="MEDIUM">P3 — Medium Issue</option>
                    <option value="LOW">P4 — Low Priority / Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Service Category
                  </label>
                  <select
                    value={ticketServiceType}
                    onChange={(e) => setTicketServiceType(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="BREAKDOWN">Mechanical / Electrical Breakdown</option>
                    <option value="REPAIR">Repair Service</option>
                    <option value="PREVENTIVE">Preventive Maintenance (PM)</option>
                    <option value="WARRANTY">Warranty Claim</option>
                    <option value="INSTALLATION">Machine Installation</option>
                    <option value="INSPECTION">Routine Inspection</option>
                  </select>
                </div>

                {/* If customer detail has assets, allow choosing asset */}
                {'assets' in ticketModalCustomer && ticketModalCustomer.assets?.length > 0 ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target Equipment / Serial Number
                    </label>
                    <select
                      value={ticketAssetId}
                      onChange={(e) => setTicketAssetId(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    >
                      <option value="">General Facility / No Asset</option>
                      {ticketModalCustomer.assets.map((ast) => (
                        <option key={ast.id} value={ast.id}>
                          {ast.serialNumber} - {ast.product?.name || 'Machine'}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Intake Source
                    </label>
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-medium">
                      Phone Call / In-Person Intake
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Issue Description & Customer Remarks *
                </label>
                <textarea
                  required
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  rows={4}
                  placeholder="Detail symptoms, machine behavior, error codes reported by the caller..."
                  className="w-full text-xs rounded-lg border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sticky -bottom-2 bg-white flex items-center justify-end gap-3 pt-3 pb-1 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTicketModalCustomer(null)}
                  disabled={isSubmittingTicket}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmittingTicket}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Create Ticket
                </Button>
              </div>
            </form>
          )}
        </Dialog>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. Customer Status / Deactivation Modal */}
      {/* ───────────────────────────────────────────────────────────── */}
      {statusChangeCandidate && (
        <Dialog
          isOpen={true}
          onClose={() => setStatusChangeCandidate(null)}
          title={
            statusChangeCandidate.status === 'ACTIVE'
              ? `Deactivate Customer: ${statusChangeCandidate.companyName}`
              : `Activate Customer: ${statusChangeCandidate.companyName}`
          }
          description="Manage customer operational status while strictly preserving historical records."
        >
          <div className="space-y-4 py-2 text-xs">
            {statusChangeCandidate.status === 'ACTIVE' ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-amber-900">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-800">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Preserve Historical Records</span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  Deactivating <strong>{statusChangeCandidate.companyName}</strong> prevents new service tickets from being raised by this customer.
                </p>
                <p className="text-amber-800 leading-relaxed font-medium">
                  All past service tickets ({statusChangeCandidate.ticketCount} tickets), audit logs, installed machines, and technician work orders remain fully preserved and searchable in reports.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-emerald-900">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                  <UserCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Re-activate Customer</span>
                </div>
                <p className="text-emerald-700">
                  Activating <strong>{statusChangeCandidate.companyName}</strong> re-enables ticket creation and self-service portal access.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                type="button"
                onClick={() => setStatusChangeCandidate(null)}
                disabled={isUpdatingStatus}
              >
                Cancel
              </Button>
              <Button
                type="button"
                isLoading={isUpdatingStatus}
                onClick={() =>
                  handleStatusChange(
                    statusChangeCandidate.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
                  )
                }
                className={
                  statusChangeCandidate.status === 'ACTIVE'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }
              >
                {statusChangeCandidate.status === 'ACTIVE'
                  ? 'Deactivate Customer'
                  : 'Re-activate Customer'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. Customer Invitation Email Dispatched Modal */}
      {/* ───────────────────────────────────────────────────────────── */}
      {sentInviteModalData && (
        <Dialog
          isOpen={true}
          onClose={() => setSentInviteModalData(null)}
          title="Customer Invitation Dispatched"
          description={`Secure account activation link sent to ${sentInviteModalData.email}`}
        >
          <div className="space-y-4 mt-2 text-xs">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Invitation email dispatched! The customer can click the link in their email to set their own password and activate their portal account.
              </span>
            </div>

            <div className="space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[11px] font-medium">Customer Account</span>
                <span className="font-semibold text-slate-800">{sentInviteModalData.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[11px] font-medium">Recipient Email</span>
                <span className="font-mono text-slate-800 font-semibold">{sentInviteModalData.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[11px] font-medium">Verification Status</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Pending Verification
                </span>
              </div>
            </div>

            {/* Single-Use Activation Link box matching Department Head workflow */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Single-Use Activation Link</span>
                <span className="text-[10px] text-slate-400 font-normal">Valid for 7 days</span>
              </label>
              <div className="p-2.5 bg-slate-900 text-slate-100 font-mono text-xs rounded-lg break-all select-all">
                {sentInviteModalData.inviteUrl}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                💡 <em>Testing Tip:</em> The customer will set their own credentials via this link. If outbound SMTP is in local development mode, you can copy or open this activation link directly to complete testing.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(sentInviteModalData.inviteUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied!' : 'Copy Activation Link'}</span>
              </Button>
              <a
                href={sentInviteModalData.inviteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold gap-1.5">
                  <span>Open Link to Test</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
              <Button type="button" onClick={() => setSentInviteModalData(null)}>
                Done
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
