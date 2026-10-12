'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import {
  Building,
  User,
  Users,
  Phone,
  FileText,
  Ticket,
  Wrench,
  Shield,
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  UserX,
  Briefcase,
} from 'lucide-react';
import {
  Button,
  Input,
  Dialog,
  Card,
} from '@/components/ui';

interface CustomerBranch {
  id: string;
  branchName: string;
  branchCode?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  isHeadquarters: boolean;
  status: string;
  _count?: {
    contacts: number;
    assets: number;
    tickets: number;
  };
}

interface CustomerContact {
  id: string;
  name: string;
  branchId?: string | null;
  branch?: { id: string; branchName: string } | null;
  designation?: string | null;
  department?: string | null;
  email?: string | null;
  phone: string;
  alternatePhone?: string | null;
  isPrimary: boolean;
  status: string;
  notes?: string | null;
}

interface CustomerPortalUser {
  id: string;
  userId: string;
  branchId?: string | null;
  roleTitle?: string | null;
  status: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    isActive: boolean;
    emailVerified: boolean;
  };
  branch?: { id: string; branchName: string } | null;
  createdAt: string;
}

interface CustomerAsset {
  id: string;
  serialNumber: string;
  location?: string | null;
  installationDate?: string | null;
  warrantyEndDate?: string | null;
  status: string;
  product?: {
    id: string;
    name: string;
    modelNumber: string;
    category?: string;
  } | null;
  branch?: { id: string; branchName: string } | null;
}

interface CustomerTicket {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  department?: { id: string; name: string; code: string } | null;
  assignedTo?: { id: string; fullName: string; email: string } | null;
  customerAsset?: { id: string; serialNumber: string } | null;
  customerBranch?: { id: string; branchName: string } | null;
  customerContact?: { id: string; name: string; phone: string } | null;
}

interface CustomerDetail {
  id: string;
  tenantId: string;
  customerType: 'INDIVIDUAL' | 'BUSINESS_PARTNER' | 'CORPORATE';
  customerCode?: string | null;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  alternatePhone?: string | null;
  businessType?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  billingAddress?: string | null;
  taxId?: string | null;
  status: string;
  portalAccessEnabled: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  branches: CustomerBranch[];
  contacts: CustomerContact[];
  portalUsers: CustomerPortalUser[];
  assets: CustomerAsset[];
  tickets: CustomerTicket[];
  ticketSummary?: {
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    slaBreachedTickets: number;
  };
}

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params?.id as string;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'branches' | 'contacts' | 'portalUsers' | 'assets' | 'tickets'>('overview');
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal States
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<CustomerBranch | null>(null);
  const [branchForm, setBranchForm] = useState({
    branchName: '',
    branchCode: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    isHeadquarters: false,
  });

  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<CustomerContact | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    branchId: '',
    designation: '',
    department: '',
    email: '',
    phone: '',
    alternatePhone: '',
    isPrimary: false,
    notes: '',
  });

  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({
    email: '',
    fullName: '',
    phone: '',
    branchId: '',
    roleTitle: '',
  });

  const [showAssetModal, setShowAssetModal] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Array<{ id: string; name: string; modelNumber: string }>>([]);
  const [assetForm, setAssetForm] = useState({
    productId: '',
    serialNumber: '',
    branchId: '',
    location: '',
    installationDate: '',
    warrantyEndDate: '',
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMsg({ type, message });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchCustomer = useCallback(async () => {
    if (!customerId) return;
    try {
      setLoading(true);
      const res = await apiClient.get<CustomerDetail>(`/customers/${customerId}`);
      const raw = (res as any)?.data || res;
      if (raw) {
        const extractedCode =
          raw.customerCode ||
          raw.notes?.match(/Code:\s*([^\s|]+)/)?.[1] ||
          `CUST-${(raw.id || '').slice(0, 6).toUpperCase()}`;
        const extractedType =
          raw.customerType ||
          raw.notes?.match(/Type:\s*([^\s|]+)/)?.[1] ||
          'INDIVIDUAL';
        const extractedAltPhone =
          raw.alternatePhone ||
          raw.notes?.match(/AltPhone:\s*([^\s|]+)/)?.[1] ||
          '';

        setCustomer({
          ...raw,
          customerCode: extractedCode,
          customerType: extractedType,
          alternatePhone: extractedAltPhone,
          branches: Array.isArray(raw.branches) ? raw.branches : [],
          contacts: Array.isArray(raw.contacts) ? raw.contacts : [],
          portalUsers: Array.isArray(raw.portalUsers) ? raw.portalUsers : [],
          assets: Array.isArray(raw.assets) ? raw.assets : [],
          tickets: Array.isArray(raw.tickets) ? raw.tickets : [],
        });
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || err.message || 'Failed to load customer details');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  // Load products when Asset Modal opens
  useEffect(() => {
    if (showAssetModal && availableProducts.length === 0) {
      apiClient.get<any>('/products')
        .then((res: any) => {
          if (res) {
            const list = Array.isArray(res) ? res : (res.items || res.data || []);
            setAvailableProducts(list);
          }
        })
        .catch(() => {});
    }
  }, [showAssetModal, availableProducts.length]);

  // Branch Handlers
  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBranch) {
        await apiClient.patch(`/customers/${customerId}/branches/${editingBranch.id}`, branchForm);
        showToast('success', 'Branch updated successfully');
      } else {
        await apiClient.post(`/customers/${customerId}/branches`, branchForm);
        showToast('success', 'Branch created successfully');
      }
      setShowBranchModal(false);
      setEditingBranch(null);
      fetchCustomer();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to save branch');
    }
  };

  const handleDeleteBranch = async (branchId: string, branchName: string) => {
    if (!confirm(`Are you sure you want to remove branch "${branchName}"?`)) return;
    try {
      await apiClient.delete(`/customers/${customerId}/branches/${branchId}`);
      showToast('success', 'Branch removed successfully');
      fetchCustomer();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to delete branch');
    }
  };

  // Contact Handlers
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...contactForm,
        branchId: contactForm.branchId || null,
      };
      if (editingContact) {
        await apiClient.patch(`/customers/${customerId}/contacts/${editingContact.id}`, payload);
        showToast('success', 'Contact updated successfully');
      } else {
        await apiClient.post(`/customers/${customerId}/contacts`, payload);
        showToast('success', 'Contact created successfully');
      }
      setShowContactModal(false);
      setEditingContact(null);
      fetchCustomer();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to save contact');
    }
  };

  const handleDeleteContact = async (contactId: string, contactName: string) => {
    if (!confirm(`Are you sure you want to remove contact "${contactName}"?`)) return;
    try {
      await apiClient.delete(`/customers/${customerId}/contacts/${contactId}`);
      showToast('success', 'Contact removed successfully');
      fetchCustomer();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to delete contact');
    }
  };

  // Portal User Handlers
  const handleAssignPortalUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post(`/customers/${customerId}/portal-users`, {
        email: userForm.email,
        fullName: userForm.fullName,
        phone: userForm.phone,
        branchId: userForm.branchId || null,
        roleTitle: userForm.roleTitle || 'Customer Portal User',
      });
      showToast('success', 'User authorized for customer portal');
      setShowUserModal(false);
      setUserForm({ email: '', fullName: '', phone: '', branchId: '', roleTitle: '' });
      fetchCustomer();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to authorize user');
    }
  };

  const handleRevokePortalUser = async (portalUserId: string, userName: string) => {
    if (!confirm(`Revoke portal access for ${userName}?`)) return;
    try {
      await apiClient.delete(`/customers/${customerId}/portal-users/${portalUserId}`);
      showToast('success', 'Portal access revoked');
      fetchCustomer();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to revoke portal access');
    }
  };

  // Asset Handlers
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post(`/customers/${customerId}/assets`, {
        productId: assetForm.productId,
        serialNumber: assetForm.serialNumber,
        branchId: assetForm.branchId || null,
        location: assetForm.location,
        installationDate: assetForm.installationDate || null,
        warrantyEndDate: assetForm.warrantyEndDate || null,
      });
      showToast('success', 'Equipment/Asset linked to customer');
      setShowAssetModal(false);
      setAssetForm({ productId: '', serialNumber: '', branchId: '', location: '', installationDate: '', warrantyEndDate: '' });
      fetchCustomer();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to link asset');
    }
  };

  // Status toggle
  const handleToggleStatus = async () => {
    if (!customer) return;
    const newStatus = customer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await apiClient.patch(`/customers/${customer.id}/status`, { status: newStatus });
      showToast('success', `Customer status changed to ${newStatus}`);
      fetchCustomer();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to update status');
    }
  };

  const getCustomerTypeLabel = (type: string) => {
    switch (type) {
      case 'CORPORATE':
        return { text: 'Corporate / Fleet', badge: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'BUSINESS_PARTNER':
        return { text: 'Business Partner / Dealer', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
      default:
        return { text: 'Individual Customer', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
  };

  if (loading && !customer) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-10 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-40 bg-white rounded-xl border border-slate-200 p-6 animate-pulse" />
        <div className="h-96 bg-white rounded-xl border border-slate-200 p-6 animate-pulse" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Customer Not Found</h2>
        <p className="text-slate-600">The requested customer could not be found or has been deleted.</p>
        <Link href="/dashboard/customers">
          <Button variant="outline">Back to Customers</Button>
        </Link>
      </div>
    );
  }

  const typeInfo = getCustomerTypeLabel(customer.customerType);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
          {toastMsg.message}
        </div>
      )}

      {/* Back button & Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/customers" className="hover:text-orange-600 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Customers
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-700">{customer.companyName}</span>
      </div>

      {/* Top Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xl shadow-inner">
              {customer.customerType === 'CORPORATE' ? <Building className="w-7 h-7" /> : customer.customerType === 'BUSINESS_PARTNER' ? <Briefcase className="w-7 h-7" /> : <User className="w-7 h-7" />}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{customer.companyName}</h1>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${typeInfo.badge}`}>
                  {typeInfo.text}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {customer.customerCode || `CUST-${(customer.id || '').slice(0, 6).toUpperCase()}`}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${customer.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {customer.status}
                </span>
              </div>
              <p className="text-sm text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>Primary Contact: <strong className="text-slate-700 font-medium">{customer.contactPerson || customer.companyName}</strong></span>
                {customer.phone && <span className="font-mono text-slate-700 font-medium">📞 {customer.phone}</span>}
                {customer.email && <span className="text-slate-600">✉️ {customer.email}</span>}
                {customer.city && <span>📍 {customer.city}, {customer.country || 'India'}</span>}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleStatus}
              className={customer.status === 'ACTIVE' ? 'text-amber-700 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'}
            >
              {customer.status === 'ACTIVE' ? <UserX className="w-4 h-4 mr-1.5" /> : <UserCheck className="w-4 h-4 mr-1.5" />}
              {customer.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </Button>
            <Link href={`/dashboard/tickets/new?customerId=${customer.id}`}>
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                <Plus className="w-4 h-4 mr-1.5" /> New Ticket
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Summary Metric Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
            <span className="text-xs text-slate-500 uppercase font-semibold">Branches</span>
            <p className="text-lg font-bold text-slate-800">{customer.branches?.length ?? 0}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
            <span className="text-xs text-slate-500 uppercase font-semibold">Contacts</span>
            <p className="text-lg font-bold text-slate-800">{customer.contacts?.length ?? 0}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
            <span className="text-xs text-slate-500 uppercase font-semibold">Equipment / Assets</span>
            <p className="text-lg font-bold text-slate-800">{customer.assets?.length ?? 0}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
            <span className="text-xs text-slate-500 uppercase font-semibold">Total Tickets</span>
            <p className="text-lg font-bold text-slate-800">{customer.tickets?.length ?? 0}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
            <span className="text-xs text-slate-500 uppercase font-semibold">Open Tickets</span>
            <p className="text-lg font-bold text-orange-600">{customer.ticketSummary?.openTickets ?? 0}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
            <span className="text-xs text-slate-500 uppercase font-semibold">Portal Users</span>
            <p className="text-lg font-bold text-blue-600">{customer.portalUsers?.length ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-4 font-medium text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'overview'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" /> Overview & Billing
        </button>
        <button
          onClick={() => setActiveTab('branches')}
          className={`py-3 px-4 font-medium text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'branches'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4" /> Branches ({customer.branches?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`py-3 px-4 font-medium text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'contacts'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" /> Authorized Contacts ({customer.contacts?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('portalUsers')}
          className={`py-3 px-4 font-medium text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'portalUsers'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4" /> Portal Users ({customer.portalUsers?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('assets')}
          className={`py-3 px-4 font-medium text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'assets'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Wrench className="w-4 h-4" /> Equipment & Assets ({customer.assets?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`py-3 px-4 font-medium text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'tickets'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Ticket className="w-4 h-4" /> Tickets History ({customer.tickets?.length ?? 0})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact & Address Information */}
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900 border-b pb-2 flex items-center gap-2">
              <Phone className="w-4 h-4 text-orange-600" /> Contact & Location Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500 block text-xs">Official Email</span>
                <span className="font-medium text-slate-800 break-all">{customer.email}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Primary Phone</span>
                <span className="font-medium text-slate-800">{customer.phone}</span>
              </div>
              {customer.alternatePhone && (
                <div>
                  <span className="text-slate-500 block text-xs">Alternate Phone</span>
                  <span className="font-medium text-slate-800">{customer.alternatePhone}</span>
                </div>
              )}
              {customer.businessType && (
                <div>
                  <span className="text-slate-500 block text-xs">Business / Partner Type</span>
                  <span className="font-medium text-slate-800">{customer.businessType}</span>
                </div>
              )}
              <div className="sm:col-span-2">
                <span className="text-slate-500 block text-xs">Primary Address</span>
                <span className="font-medium text-slate-800">{customer.address || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">City & State</span>
                <span className="font-medium text-slate-800">
                  {[customer.city, customer.state].filter(Boolean).join(', ') || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Postal Code & Country</span>
                <span className="font-medium text-slate-800">
                  {[customer.pincode, customer.country || 'India'].filter(Boolean).join(', ')}
                </span>
              </div>
            </div>
          </Card>

          {/* Billing & Tax Information */}
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900 border-b pb-2 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" /> Billing & Legal Registration
            </h3>
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-slate-500 block text-xs">Tax ID / GSTIN / VAT</span>
                <span className="font-mono font-semibold text-slate-800">{customer.taxId || 'Not Registered'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Billing Address</span>
                <span className="font-medium text-slate-800">{customer.billingAddress || customer.address || 'Same as primary address'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Internal Notes</span>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs leading-relaxed">
                  {customer.notes || 'No internal notes recorded for this customer.'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: BRANCHES */}
      {activeTab === 'branches' && (
        <Card className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Customer Branches & Locations</h3>
              <p className="text-xs text-slate-500">Manage plant locations, dealerships, and regional facilities</p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingBranch(null);
                setBranchForm({
                  branchName: '',
                  branchCode: '',
                  contactPerson: '',
                  phone: '',
                  email: '',
                  address: '',
                  city: customer.city || '',
                  state: customer.state || '',
                  pincode: '',
                  isHeadquarters: (customer.branches?.length ?? 0) === 0,
                });
                setShowBranchModal(true);
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Branch
            </Button>
          </div>

          {(customer.branches?.length ?? 0) === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl space-y-3">
              <Building className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm text-slate-600 font-medium">No branches registered yet</p>
              <p className="text-xs text-slate-400">Add branch facilities to link equipment and authorized regional personnel.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase border-y">
                  <tr>
                    <th className="py-3 px-4">Branch Details</th>
                    <th className="py-3 px-4">Contact Person</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Assets</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(customer.branches || []).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                          {b.branchName}
                          {b.isHeadquarters && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 uppercase">
                              HQ
                            </span>
                          )}
                        </div>
                        {b.branchCode && (
                          <span className="text-xs font-mono text-slate-500">{b.branchCode}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-700">{b.contactPerson || '—'}</div>
                        <div className="text-xs text-slate-400">{b.phone || b.email || ''}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {[b.city, b.state].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {b._count?.assets ?? 0} assets
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingBranch(b);
                            setBranchForm({
                              branchName: b.branchName,
                              branchCode: b.branchCode || '',
                              contactPerson: b.contactPerson || '',
                              phone: b.phone || '',
                              email: b.email || '',
                              address: b.address || '',
                              city: b.city || '',
                              state: b.state || '',
                              pincode: b.pincode || '',
                              isHeadquarters: b.isHeadquarters,
                            });
                            setShowBranchModal(true);
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBranch(b.id, b.branchName)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: CONTACTS */}
      {activeTab === 'contacts' && (
        <Card className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Authorized Contacts Directory</h3>
              <p className="text-xs text-slate-500">Contact persons, maintenance leads, and division coordinators</p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingContact(null);
                setContactForm({
                  name: '',
                  branchId: customer.branches?.[0]?.id || '',
                  designation: '',
                  department: '',
                  email: '',
                  phone: '',
                  alternatePhone: '',
                  isPrimary: (customer.contacts?.length ?? 0) === 0,
                  notes: '',
                });
                setShowContactModal(true);
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Contact
            </Button>
          </div>

          {(customer.contacts?.length ?? 0) === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl space-y-3">
              <Users className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm text-slate-600 font-medium">No contacts recorded yet</p>
              <p className="text-xs text-slate-400">Add authorized contacts to streamline ticket notifications and dispatch coordination.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase border-y">
                  <tr>
                    <th className="py-3 px-4">Contact Name</th>
                    <th className="py-3 px-4">Designation / Role</th>
                    <th className="py-3 px-4">Branch Location</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(customer.contacts || []).map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          {c.name}
                          {c.isPrimary && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 uppercase">
                              Primary
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {c.designation || '—'}
                        {c.department && <span className="block text-xs text-slate-400">{c.department}</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {c.branch?.branchName || 'All Branches'}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">{c.phone}</td>
                      <td className="py-3 px-4 text-slate-600 text-xs break-all">{c.email || '—'}</td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingContact(c);
                            setContactForm({
                              name: c.name,
                              branchId: c.branchId || '',
                              designation: c.designation || '',
                              department: c.department || '',
                              email: c.email || '',
                              phone: c.phone,
                              alternatePhone: c.alternatePhone || '',
                              isPrimary: c.isPrimary,
                              notes: c.notes || '',
                            });
                            setShowContactModal(true);
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteContact(c.id, c.name)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 4: PORTAL USERS */}
      {activeTab === 'portalUsers' && (
        <Card className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Authorized Self-Service Portal Accounts</h3>
              <p className="text-xs text-slate-500">Users authorized to sign in and raise tickets for this customer</p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setUserForm({
                  email: '',
                  fullName: customer.contactPerson || '',
                  phone: customer.phone || '',
                  branchId: '',
                  roleTitle: 'Portal User',
                });
                setShowUserModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Authorize / Invite User
            </Button>
          </div>

          {(customer.portalUsers?.length ?? 0) === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl space-y-3">
              <Shield className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm text-slate-600 font-medium">No authorized portal users yet</p>
              <p className="text-xs text-slate-400">Authorize client employees or facility managers to log into the customer portal.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase border-y">
                  <tr>
                    <th className="py-3 px-4">User Details</th>
                    <th className="py-3 px-4">Role / Title</th>
                    <th className="py-3 px-4">Branch Scoping</th>
                    <th className="py-3 px-4">Verification</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(customer.portalUsers || []).map((pu) => (
                    <tr key={pu.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{pu.user.fullName}</div>
                        <div className="text-xs text-slate-500 break-all">{pu.user.email}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{pu.roleTitle || 'Portal User'}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {pu.branch ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {pu.branch.branchName}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">All Branches</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {pu.user.emailVerified ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium">
                            <AlertCircle className="w-3.5 h-3.5" /> Unverified
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pu.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {pu.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokePortalUser(pu.id, pu.user.fullName)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                        >
                          Revoke Access
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 5: ASSETS */}
      {activeTab === 'assets' && (
        <Card className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Equipment, Vehicles & Assets</h3>
              <p className="text-xs text-slate-500">Hardware assets and equipment deployed at customer locations</p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAssetModal(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Link Equipment
            </Button>
          </div>

          {(customer.assets?.length ?? 0) === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl space-y-3">
              <Wrench className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm text-slate-600 font-medium">No equipment linked yet</p>
              <p className="text-xs text-slate-400">Link machinery, vehicles, or IT assets to track service calls and breakdown history.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase border-y">
                  <tr>
                    <th className="py-3 px-4">Serial Number</th>
                    <th className="py-3 px-4">Product / Model</th>
                    <th className="py-3 px-4">Branch Location</th>
                    <th className="py-3 px-4">Warranty</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(customer.assets || []).map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">{a.serialNumber}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{a.product?.name || 'Equipment'}</div>
                        <div className="text-xs text-slate-500 font-mono">{a.product?.modelNumber || ''}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {a.branch?.branchName || a.location || 'Headquarters'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {a.warrantyEndDate ? (
                          new Date(a.warrantyEndDate) > new Date() ? (
                            <span className="text-emerald-700 font-medium">Under Warranty</span>
                          ) : (
                            <span className="text-slate-400">Expired</span>
                          )
                        ) : (
                          'Standard'
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700">
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 6: TICKETS */}
      {activeTab === 'tickets' && (
        <Card className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Service Tickets History</h3>
              <p className="text-xs text-slate-500">Breakdown calls and maintenance requests logged for this customer</p>
            </div>
            <Link href={`/dashboard/tickets/new?customerId=${customer.id}`}>
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                <Plus className="w-4 h-4 mr-1.5" /> Log Service Ticket
              </Button>
            </Link>
          </div>

          {(customer.tickets?.length ?? 0) === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl space-y-3">
              <Ticket className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm text-slate-600 font-medium">No service tickets recorded</p>
              <p className="text-xs text-slate-400">All historical tickets and service calls will be archived here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase border-y">
                  <tr>
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Branch / Facility</th>
                    <th className="py-3 px-4">Equipment</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Logged Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(customer.tickets || []).map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <Link href={`/dashboard/tickets/${t.id}`} className="font-mono font-semibold text-orange-600 hover:underline">
                          {t.ticketNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 line-clamp-1">{t.title}</div>
                        {t.assignedTo && <div className="text-xs text-slate-400">Tech: {t.assignedTo.fullName}</div>}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        {t.customerBranch?.branchName || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-600">
                        {t.customerAsset?.serialNumber || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          t.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                          t.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                          t.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          t.status === 'CLOSED' || t.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700' :
                          t.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* MODAL: ADD / EDIT BRANCH */}
      <Dialog
        open={showBranchModal}
        onOpenChange={setShowBranchModal}
        title={editingBranch ? 'Edit Customer Branch' : 'Register Customer Branch / Facility'}
      >
        <form onSubmit={handleSaveBranch} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Branch / Facility Name *</label>
            <Input
              required
              placeholder="e.g. Pune Assembly Plant 1"
              value={branchForm.branchName}
              onChange={(e) => setBranchForm({ ...branchForm, branchName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Code (Optional)</label>
              <Input
                placeholder="e.g. BR-PUNE-01"
                value={branchForm.branchCode}
                onChange={(e) => setBranchForm({ ...branchForm, branchCode: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
              <Input
                placeholder="Facility Manager"
                value={branchForm.contactPerson}
                onChange={(e) => setBranchForm({ ...branchForm, contactPerson: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
              <Input
                placeholder="+91 9876543210"
                value={branchForm.phone}
                onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Email</label>
              <Input
                type="email"
                placeholder="facility@company.com"
                value={branchForm.email}
                onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
            <Input
              placeholder="Plot 10, MIDC Industrial Area"
              value={branchForm.address}
              onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <Input
                placeholder="Pune"
                value={branchForm.city}
                onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <Input
                placeholder="Maharashtra"
                value={branchForm.state}
                onChange={(e) => setBranchForm({ ...branchForm, state: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode</label>
              <Input
                placeholder="411018"
                value={branchForm.pincode}
                onChange={(e) => setBranchForm({ ...branchForm, pincode: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isHeadquarters"
              checked={branchForm.isHeadquarters}
              onChange={(e) => setBranchForm({ ...branchForm, isHeadquarters: e.target.checked })}
              className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            <label htmlFor="isHeadquarters" className="text-xs font-medium text-slate-700">
              Set as Customer Headquarters / Main Location
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setShowBranchModal(false)}>Cancel</Button>
            <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white">Save Branch</Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL: ADD / EDIT CONTACT */}
      <Dialog
        open={showContactModal}
        onOpenChange={setShowContactModal}
        title={editingContact ? 'Edit Contact Person' : 'Add Authorized Contact Person'}
      >
        <form onSubmit={handleSaveContact} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Full Name *</label>
            <Input
              required
              placeholder="e.g. Vikram Joshi"
              value={contactForm.name}
              onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
              <Input
                placeholder="e.g. Plant Maintenance Head"
                value={contactForm.designation}
                onChange={(e) => setContactForm({ ...contactForm, designation: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <Input
                placeholder="e.g. Heavy Machining"
                value={contactForm.department}
                onChange={(e) => setContactForm({ ...contactForm, department: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
              <Input
                required
                placeholder="+91 9876543210"
                value={contactForm.phone}
                onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alternate Phone</label>
              <Input
                placeholder="+91 9876543211"
                value={contactForm.alternatePhone}
                onChange={(e) => setContactForm({ ...contactForm, alternatePhone: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <Input
              type="email"
              placeholder="vikram@company.com"
              value={contactForm.email}
              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Branch (Optional)</label>
            <select
              value={contactForm.branchId}
              onChange={(e) => setContactForm({ ...contactForm, branchId: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Branches / Central</option>
              {(customer.branches || []).map((b) => (
                <option key={b.id} value={b.id}>{b.branchName}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isPrimaryContact"
              checked={contactForm.isPrimary}
              onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })}
              className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            <label htmlFor="isPrimaryContact" className="text-xs font-medium text-slate-700">
              Set as Primary Point of Contact for this Customer
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setShowContactModal(false)}>Cancel</Button>
            <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white">Save Contact</Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL: AUTHORIZE / INVITE PORTAL USER */}
      <Dialog
        open={showUserModal}
        onOpenChange={setShowUserModal}
        title="Authorize Customer Portal User"
      >
        <form onSubmit={handleAssignPortalUser} className="space-y-4 text-sm">
          <p className="text-xs text-slate-500">
            Grant secure customer portal access. If the user does not have an account yet, a single-use setup invitation will be automatically dispatched.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">User Email Address *</label>
            <Input
              type="email"
              required
              placeholder="user@customer.com"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <Input
                placeholder="Vikram Joshi"
                value={userForm.fullName}
                onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <Input
                placeholder="+91 9876543210"
                value={userForm.phone}
                onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role Title</label>
              <Input
                placeholder="e.g. Fleet Manager"
                value={userForm.roleTitle}
                onChange={(e) => setUserForm({ ...userForm, roleTitle: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Scope to Branch (Optional)</label>
              <select
                value={userForm.branchId}
                onChange={(e) => setUserForm({ ...userForm, branchId: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Branches</option>
                {(customer.branches || []).map((b) => (
                  <option key={b.id} value={b.id}>{b.branchName}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setShowUserModal(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Authorize Access</Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL: LINK EQUIPMENT / ASSET */}
      <Dialog
        open={showAssetModal}
        onOpenChange={setShowAssetModal}
        title="Link Equipment or Asset"
      >
        <form onSubmit={handleSaveAsset} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Product Model *</label>
            <select
              required
              value={assetForm.productId}
              onChange={(e) => setAssetForm({ ...assetForm, productId: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">-- Select Product from Catalog --</option>
              {availableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.modelNumber})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Serial Number / Unique Asset ID *</label>
            <Input
              required
              placeholder="e.g. SN-CNC-90214"
              value={assetForm.serialNumber}
              onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Deploy at Branch (Optional)</label>
            <select
              value={assetForm.branchId}
              onChange={(e) => setAssetForm({ ...assetForm, branchId: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Headquarters / Main</option>
              {(customer.branches || []).map((b) => (
                <option key={b.id} value={b.id}>{b.branchName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Bay / Station (Optional)</label>
            <Input
              placeholder="e.g. Bay 4 - Heavy Machining Shop"
              value={assetForm.location}
              onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Installation Date</label>
              <Input
                type="date"
                value={assetForm.installationDate}
                onChange={(e) => setAssetForm({ ...assetForm, installationDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Warranty End Date</label>
              <Input
                type="date"
                value={assetForm.warrantyEndDate}
                onChange={(e) => setAssetForm({ ...assetForm, warrantyEndDate: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setShowAssetModal(false)}>Cancel</Button>
            <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white">Link Asset</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
