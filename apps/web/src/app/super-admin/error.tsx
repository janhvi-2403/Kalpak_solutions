'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui';
import { KalpakLogo } from '@/components/KalpakLogo';

export default function SuperAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Super Admin console error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-orange-500 selection:text-white">
      <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-center space-y-6">
        <div className="flex justify-center">
          <KalpakLogo size="md" variant="dark" href="/super-admin/dashboard" />
        </div>

        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white tracking-tight">
            Super Admin Console Notice
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            The platform dashboard encountered a refresh synchronization issue. Your administrative session remains safe.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload Console
          </Button>

          <Link href="/super-admin/dashboard" className="w-full">
            <Button
              variant="outline"
              className="w-full border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldAlert className="w-4 h-4 text-orange-500" />
          <span>Kalpak Master Administration Security</span>
        </div>
      </div>
    </div>
  );
}
