'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  PlusCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { PortalAsset, TicketPriorityEnum } from '@kalpak/types';

function RaisePortalTicketContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = (params?.tenantSlug as string) || '';

  const preselectedAssetId = searchParams.get('assetId') || '';

  const [assets, setAssets] = useState<PortalAsset[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriorityEnum>(TicketPriorityEnum.MEDIUM);
  const [customerAssetId, setCustomerAssetId] = useState(preselectedAssetId);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    apiClient<PortalAsset[]>('/portal/assets')
      .then((data) => setAssets(data))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        priority,
      };

      if (customerAssetId && customerAssetId.trim()) {
        payload.customerAssetId = customerAssetId;
      }

      const created = await apiClient<any>('/portal/tickets', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      router.push(`/portal/${tenantSlug}/tickets/${created.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit service request. Please check all fields.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans">
      {/* Back Button & Header */}
      <div>
        <Link
          href={`/portal/${tenantSlug}/tickets`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Tickets</span>
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-tight">Raise New Service Request</h1>
        <p className="text-xs text-slate-400 mt-1">
          Submit an incident, breakdown, or routine maintenance request to our technical service team.
        </p>
      </div>

      {/* Main Form Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Issue Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Subject / Short Description <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              minLength={5}
              maxLength={250}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Unusual vibration on Spindle Motor during high speed cycle"
              className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl px-4 py-2.5 border border-slate-800 focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Machine / Asset Selector & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Affected Machinery (Optional)</span>
                <span className="text-[10px] text-slate-500">From registered plant units</span>
              </label>
              <select
                value={customerAssetId}
                onChange={(e) => setCustomerAssetId(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 text-xs rounded-xl px-3 py-2.5 border border-slate-800 focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="">General Facility / Unlisted Machine</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.product.name} (SN: {asset.serialNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Severity / Urgency
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriorityEnum)}
                className="w-full bg-slate-950 text-slate-200 text-xs rounded-xl px-3 py-2.5 border border-slate-800 focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value={TicketPriorityEnum.LOW}>Low - Routine check / non-blocking</option>
                <option value={TicketPriorityEnum.MEDIUM}>Medium - Degraded operation / minor fault</option>
                <option value={TicketPriorityEnum.HIGH}>High - Significant throughput impact</option>
                <option value={TicketPriorityEnum.CRITICAL}>Critical - Complete plant / line stoppage</option>
              </select>
            </div>
          </div>

          {/* Detailed Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Detailed Symptoms & Observations <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              minLength={10}
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe what occurred: when did the issue start, any error code shown on HMI display, operating environment conditions, etc."
              className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl p-4 border border-slate-800 focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Info notice */}
          <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3 text-blue-400 text-xs">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Once submitted, your request will be instantly assigned a tracking number and forwarded to our field service engineering team.
            </span>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href={`/portal/${tenantSlug}/tickets`}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs py-2.5 px-5 rounded-xl shadow-lg shadow-blue-600/30 disabled:opacity-50 transition-all focus:outline-none"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Submit Ticket</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RaisePortalTicketPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto text-xs text-slate-400 py-10">Loading form...</div>}>
      <RaisePortalTicketContent />
    </Suspense>
  );
}
