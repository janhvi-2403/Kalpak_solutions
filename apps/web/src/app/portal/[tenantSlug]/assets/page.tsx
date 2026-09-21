'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Cpu,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  MapPin,
  PlusCircle,
  Wrench,
  Search,
  Ticket,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { PortalAsset } from '@kalpak/types';

export default function PortalAssetsPage() {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || '';

  const [assets, setAssets] = useState<PortalAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadAssets() {
      try {
        const data = await apiClient<PortalAsset[]>('/portal/assets');
        setAssets(data);
      } catch (err) {
        // Handled
      } finally {
        setLoading(false);
      }
    }

    loadAssets();
  }, []);

  const filteredAssets = assets.filter((a) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      a.product.name.toLowerCase().includes(term) ||
      a.serialNumber.toLowerCase().includes(term) ||
      a.product.modelNumber.toLowerCase().includes(term) ||
      (a.location && a.location.toLowerCase().includes(term))
    );
  });

  const isWarrantyValid = (warrantyEndDate?: string | null) => {
    if (!warrantyEndDate) return false;
    return new Date(warrantyEndDate) > new Date();
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Registered Machinery & Assets</h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse installed equipment, warranty validity, and maintenance ticket history.
          </p>
        </div>

        <Link
          href={`/portal/${tenantSlug}/tickets/raise`}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-blue-600/25 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Raise Ticket for Asset</span>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by machine model, serial number, location..."
            className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl pl-9 pr-4 py-2 border border-slate-800 focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Assets Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
          <span>Loading equipment directory...</span>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl text-center py-16 px-4">
          <Cpu className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-300">No machinery registered</p>
          <p className="text-xs text-slate-500 mt-1">
            Registered machines and warranty agreements will appear here once commissioned by your service provider.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAssets.map((asset) => {
            const hasActiveWarranty = isWarrantyValid(asset.warrantyEndDate);
            return (
              <div
                key={asset.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-blue-400 tracking-wider">
                        {asset.product.category}
                      </span>
                      <h2 className="text-base font-bold text-white tracking-tight leading-snug">
                        {asset.product.name}
                      </h2>
                    </div>

                    {hasActiveWarranty ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                        <ShieldCheck className="w-3 h-3" />
                        Warranty Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full shrink-0">
                        <ShieldAlert className="w-3 h-3 text-slate-500" />
                        Expired
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mt-3 text-xs">
                    <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Model #:</span>
                      <span className="font-mono font-medium text-slate-200">{asset.product.modelNumber}</span>
                    </div>

                    <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Serial Number:</span>
                      <span className="font-mono font-semibold text-blue-300">{asset.serialNumber}</span>
                    </div>

                    {asset.location && (
                      <div className="flex items-center gap-2 text-slate-400 px-1 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{asset.location}</span>
                      </div>
                    )}

                    {asset.warrantyEndDate && (
                      <div className="flex items-center gap-2 text-slate-400 px-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>Warranty until: <strong className="text-slate-300">{new Date(asset.warrantyEndDate).toLocaleDateString()}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Ticket className="w-3.5 h-3.5 text-slate-500" />
                    <span>{asset.ticketCount || 0} Tickets</span>
                  </div>

                  <Link
                    href={`/portal/${tenantSlug}/tickets/raise?assetId=${asset.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 px-3 py-1.5 rounded-lg border border-blue-500/20 transition-all"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Report Issue</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
