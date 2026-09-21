import React from 'react';
import { Building2 } from 'lucide-react';

interface TenantBadgeProps {
  tenantName?: string;
  role?: string;
  isSuperAdmin?: boolean;
}

export function TenantBadge({
  tenantName = 'Acme Support',
  role = 'Client Admin',
  isSuperAdmin = false,
}: TenantBadgeProps) {
  return (
    <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 shadow-sm">
      <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
        <Building2 className="w-3.5 h-3.5" />
      </div>
      <div className="flex items-center space-x-2 text-xs">
        <span className="font-semibold text-slate-800 tracking-tight">{tenantName}</span>
        <span className="text-slate-300">|</span>
        <span
          className={`font-mono text-[10px] font-medium uppercase px-1.5 py-0.5 rounded ${
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
