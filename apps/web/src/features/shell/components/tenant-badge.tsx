import React from 'react';
import { Building2 } from 'lucide-react';

interface TenantBadgeProps {
  tenantName?: string;
  role?: string;
  isSuperAdmin?: boolean;
  logoUrl?: string;
}

export function TenantBadge({
  tenantName = 'Company Portal',
  role = 'Client Admin',
  isSuperAdmin = false,
  logoUrl,
}: TenantBadgeProps) {
  return (
    <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 shadow-sm">
      {logoUrl ? (
        <div className="w-6 h-6 rounded-md bg-white border border-slate-200 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={tenantName} className="max-w-full max-h-full object-contain" />
        </div>
      ) : (
        <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Building2 className="w-3.5 h-3.5" />
        </div>
      )}
      <div className="flex items-center space-x-2 text-xs">
        <span className="font-bold text-slate-900 tracking-tight">{tenantName}</span>
        <span className="text-slate-300">|</span>
        <span
          className={`font-mono text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
            isSuperAdmin
              ? 'bg-purple-50 text-purple-700 border border-purple-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          {role}
        </span>
      </div>
    </div>
  );
}
