'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui';
import { KalpakLogo } from '@/components/KalpakLogo';

export default function RootErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log sanitized error internally without exposing details to client DOM
    console.error('Handled application error:', {
      name: error.name,
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-orange-500 selection:text-white">
      <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-center space-y-6">
        <div className="flex justify-center">
          <KalpakLogo size="md" variant="dark" href="/" />
        </div>

        <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            An unexpected error occurred while processing your request. Our system security filters have protected your session.
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-slate-500 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800/80 mt-2">
              Reference ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>

          <Link href="/" className="w-full">
            <Button
              variant="outline"
              className="w-full border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              <Home className="w-4 h-4 mr-2" />
              Return Home
            </Button>
          </Link>
        </div>

        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Kalpak Security Isolation & Protection Active</span>
        </div>
      </div>
    </div>
  );
}
