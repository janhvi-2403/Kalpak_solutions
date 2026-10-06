'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Wrench,
  Plus,
  Search,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  IndianRupee,
  Tag,
  Edit2,
} from 'lucide-react';
import {
  Button,
  Input,
} from '@/components/ui';

interface ServiceItem {
  id: string;
  name: string;
  code: string;
  category?: string;
  description?: string;
  estimatedHours?: number;
  basePrice?: number;
  isActive: boolean;
  createdAt: string;
}

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('REPAIR');
  const [description, setDescription] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('2');
  const [basePrice, setBasePrice] = useState('1500');

  const fetchServices = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiClient<ServiceItem[]>('/products/services');
      setServices(data || []);
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load services',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setCategory('REPAIR');
    setDescription('');
    setEstimatedHours('2');
    setBasePrice('1500');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: ServiceItem) => {
    setEditingId(s.id);
    setName(s.name);
    setCode(s.code);
    setCategory(s.category || 'REPAIR');
    setDescription(s.description || '');
    setEstimatedHours(String(s.estimatedHours ?? 2));
    setBasePrice(String(s.basePrice ?? 0));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Service Name and Code are required' });
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        category: category.trim(),
        description: description.trim(),
        estimatedHours: parseFloat(estimatedHours) || 2,
        basePrice: parseFloat(basePrice) || 0,
      };

      if (editingId) {
        await apiClient(`/products/services/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setFeedbackMsg({ type: 'success', text: 'Service updated successfully' });
      } else {
        await apiClient('/products/services', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setFeedbackMsg({ type: 'success', text: 'Service created successfully' });
      }

      setIsModalOpen(false);
      fetchServices();
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save service',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, sName: string) => {
    if (!confirm(`Are you sure you want to delete "${sName}"?`)) return;
    try {
      await apiClient(`/products/services/${id}`, { method: 'DELETE' });
      setFeedbackMsg({ type: 'success', text: 'Service removed successfully' });
      fetchServices();
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete service',
      });
    }
  };

  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      (s.category && s.category.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <Wrench className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Services Master Catalog</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure standardized service offerings (Installation, Repair, Maintenance, Warranty, Inspection) 
            available for ticket assignment and SLA tracking.
          </p>
        </div>

        <Button onClick={handleOpenAdd} className="bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-2">
          <Plus className="w-4 h-4" />
          <span>Add Service</span>
        </Button>
      </div>

      {/* ── Feedback Message ── */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-medium border ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-600">
            Dismiss
          </button>
        </div>
      )}

      {/* ── Search & Filter Bar ── */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search services by name, code, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent border-none text-xs outline-none text-slate-900 placeholder:text-slate-400"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-slate-400 hover:text-slate-600">
            Clear
          </button>
        )}
      </div>

      {/* ── Services Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-semibold font-mono text-[10px]">
              <tr>
                <th className="py-3.5 px-6">Service Name & Code</th>
                <th className="py-3.5 px-6">Category</th>
                <th className="py-3.5 px-6">Est Duration</th>
                <th className="py-3.5 px-6">Base Rate</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading services catalog...
                  </td>
                </tr>
              ) : filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div className="font-semibold">No services found</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Click <strong>Add Service</strong> to define your first service type.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{service.name}</div>
                      <div className="font-mono text-[10px] text-slate-400 mt-0.5">{service.code}</div>
                      {service.description && (
                        <div className="text-[11px] text-slate-500 mt-0.5 max-w-sm truncate">
                          {service.description}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] border border-slate-200">
                        <Tag className="w-3 h-3 text-slate-500" />
                        {service.category || 'General'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {service.estimatedHours ?? 2} hrs
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="flex items-center gap-1 font-bold text-slate-900 font-mono">
                        <IndianRupee className="w-3.5 h-3.5 text-slate-500" />
                        {(service.basePrice ?? 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          service.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {service.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(service)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(service.id, service.name)}
                          className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add / Edit Service Dialog ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                  <Wrench className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingId ? 'Edit Service' : 'Add New Service'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Service Name *</label>
                  <Input
                    placeholder="e.g. AC Gas Refill / Compressor Repair"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Service Code *</label>
                  <Input
                    placeholder="e.g. SRV-REP-01"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
                  >
                    <option value="INSTALLATION">Installation</option>
                    <option value="REPAIR">Repair</option>
                    <option value="MAINTENANCE">Preventive Maintenance</option>
                    <option value="WARRANTY">Warranty Service</option>
                    <option value="INSPECTION">Inspection / Audit</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Est. Duration (Hours)</label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Base Price (₹ INR)</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="1500"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Scope of work, standard tasks, and required parts..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-900 outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  {isSubmitting ? 'Saving...' : editingId ? 'Update Service' : 'Create Service'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
