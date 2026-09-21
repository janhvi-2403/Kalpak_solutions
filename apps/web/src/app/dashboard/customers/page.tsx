'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Users,
  Plus,
  Search,
  Building,
  Phone,
  Mail,
  MapPin,
  Box,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  KeyRound,
  Copy,
} from 'lucide-react';
import {
  Button,
  Input,
  Dialog,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Skeleton,
  Checkbox,
} from '@/components/ui';

interface Customer {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  pincode?: string;
  status: string;
  portalAccessEnabled: boolean;
  notes?: string;
  assetCount: number;
  createdAt: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [portalModalData, setPortalModalData] = useState<{
    customerName: string;
    email: string;
    temporaryPassword?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [address, setAddress] = useState('');
  const [portalAccessEnabled, setPortalAccessEnabled] = useState(true);
  const [notes, setNotes] = useState('');

  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      const queryParam = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const data = await apiClient<Customer[]>(`/customers${queryParam}`);
      setCustomers(data);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to fetch customers' });
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !contactPerson.trim() || !email.trim() || !phone.trim()) return;

    try {
      setIsSubmitting(true);
      setFeedbackMsg(null);
      await apiClient('/customers', {
        method: 'POST',
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactPerson: contactPerson.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          city: city.trim() || undefined,
          pincode: pincode.trim() || undefined,
          address: address.trim() || undefined,
          portalAccessEnabled,
          notes: notes.trim() || undefined,
        }),
      });

      setFeedbackMsg({ type: 'success', text: `Customer "${companyName}" registered successfully` });
      setIsModalOpen(false);
      setCompanyName('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setCity('');
      setPincode('');
      setAddress('');
      setNotes('');
      await fetchCustomers();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to register customer' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete customer "${name}"?`)) return;

    try {
      await apiClient(`/customers/${id}`, { method: 'DELETE' });
      setFeedbackMsg({ type: 'success', text: `Customer "${name}" deleted` });
      await fetchCustomers();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to delete customer' });
    }
  };

  const handleEnablePortal = async (id: string, name: string) => {
    try {
      setFeedbackMsg(null);
      const res = await apiClient<any>(`/customers/${id}/enable-portal`, {
        method: 'POST',
      });
      setPortalModalData({
        customerName: name,
        email: res.email,
        temporaryPassword: res.temporaryPassword,
      });
      await fetchCustomers();
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to enable portal access',
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer Directory</h1>
            <Badge variant="primary" className="font-mono text-xs">
              {customers.length} Accounts
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Client accounts, factory plant locations, contact points, and customer portal permissions.
          </p>
        </div>

        <Button
          onClick={() => {
            setFeedbackMsg(null);
            setIsModalOpen(true);
          }}
          className="gap-2 self-start sm:self-auto bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by company, contact person, email, city..."
          className="w-full pl-9 pr-4 py-2 bg-white text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm animate-in fade-in-50 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 bg-white rounded-xl border border-slate-200 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Building className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No customer accounts found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search ? 'Try clearing your search query to see all accounts.' : 'Add your clients and their plant contacts to link installed equipment.'}
          </p>
          <Button onClick={() => setIsModalOpen(true)} size="sm" className="mt-2">
            Add First Customer
          </Button>
        </div>
      ) : (
        /* Customers Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((cust) => (
            <Card key={cust.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-base font-bold text-slate-900">{cust.companyName}</CardTitle>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{cust.contactPerson}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(cust.id, cust.companyName)}
                  title="Delete Customer"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </CardHeader>

              <CardContent className="space-y-3 pt-0 text-xs">
                {/* Contact info list */}
                <div className="space-y-1.5 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{cust.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{cust.phone}</span>
                  </div>
                  {cust.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{cust.city} {cust.pincode ? `(${cust.pincode})` : ''}</span>
                    </div>
                  )}
                </div>

                {/* Badges footer */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Box className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-semibold">{cust.assetCount}</span>
                    <span className="text-slate-400">machines</span>
                  </div>

                  {cust.portalAccessEnabled ? (
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded text-[10px] font-medium">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Portal Active
                      </span>
                      <button
                        onClick={() => handleEnablePortal(cust.id, cust.companyName)}
                        title="Reset Portal Credentials"
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <KeyRound className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEnablePortal(cust.id, cust.companyName)}
                      className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>Enable Portal</span>
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Customer Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register Client Customer Account"
        description="Add a customer company and designate primary contact points for service calls."
      >
        <form onSubmit={handleCreate} className="space-y-4 mt-4">
          <Input
            id="cust-company"
            label="Company Name"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Tata Motors Assembly Plant"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="cust-contact"
              label="Contact Person"
              required
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="e.g. Rajesh Sharma"
            />
            <Input
              id="cust-phone"
              label="Phone Number"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 9876543210"
            />
          </div>

          <Input
            id="cust-email"
            type="email"
            label="Work Email Address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. contact@tatamotors.com"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="cust-city"
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Pune"
            />
            <Input
              id="cust-pincode"
              label="Postal Pincode"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder="e.g. 411018"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Factory / Plant Address (Optional)
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              placeholder="Plot details, industrial zone..."
              className="w-full text-xs rounded-lg border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Checkbox
            id="cust-portal"
            label="Enable Customer Portal Access (Allows this customer to log tickets directly)"
            checked={portalAccessEnabled}
            onChange={(e) => setPortalAccessEnabled(e.target.checked)}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
              Register Customer
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Portal Credentials Modal */}
      {portalModalData && (
        <Dialog
          isOpen={true}
          onClose={() => setPortalModalData(null)}
          title="Customer Portal Access Provisioned"
          description={`Self-service portal credentials for ${portalModalData.customerName}`}
        >
          <div className="space-y-4 mt-4 text-xs">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Customer portal access has been provisioned and linked to this client.</span>
            </div>

            <div className="space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 text-[11px] block font-medium">Customer Company</span>
                <span className="font-semibold text-slate-800">{portalModalData.customerName}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block font-medium">Portal Login Email</span>
                <span className="font-mono text-slate-800 font-semibold">{portalModalData.email}</span>
              </div>
              {portalModalData.temporaryPassword && (
                <div>
                  <span className="text-slate-500 text-[11px] block font-medium">Temporary Access Password</span>
                  <span className="font-mono text-blue-600 font-bold bg-white px-2 py-1 rounded border border-slate-200 inline-block mt-0.5 select-all">
                    {portalModalData.temporaryPassword}
                  </span>
                </div>
              )}
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px]">
              <strong>Instructions:</strong> Share these credentials directly with the customer. They can sign in at their dedicated client portal URL: <code className="bg-amber-100/70 px-1 py-0.5 rounded font-mono">/portal/[organization-slug]/login</code>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  if (portalModalData.temporaryPassword) {
                    navigator.clipboard.writeText(
                      `Portal Login Email: ${portalModalData.email}\nTemporary Password: ${portalModalData.temporaryPassword}`
                    );
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
                className="gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied!' : 'Copy Credentials'}</span>
              </Button>
              <Button type="button" onClick={() => setPortalModalData(null)}>
                Done
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
