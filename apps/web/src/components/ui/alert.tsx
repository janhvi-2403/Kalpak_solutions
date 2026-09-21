import * as React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@kalpak/ui';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
}

export function Alert({ variant = 'info', title, children, className, ...props }: AlertProps) {
  const configs = {
    info: {
      icon: Info,
      style: 'bg-sky-50 border-sky-200 text-sky-900 [&>svg]:text-sky-600',
    },
    success: {
      icon: CheckCircle2,
      style: 'bg-emerald-50 border-emerald-200 text-emerald-900 [&>svg]:text-emerald-600',
    },
    warning: {
      icon: AlertTriangle,
      style: 'bg-amber-50 border-amber-200 text-amber-900 [&>svg]:text-amber-600',
    },
    error: {
      icon: AlertCircle,
      style: 'bg-red-50 border-red-200 text-red-900 [&>svg]:text-red-600',
    },
  };

  const { icon: Icon, style } = configs[variant];

  return (
    <div
      role="alert"
      className={cn('relative w-full rounded-xl border p-4 flex gap-3 text-sm transition-all', style, className)}
      {...props}
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="flex-1">
        {title && <h5 className="font-semibold mb-1 leading-none tracking-tight">{title}</h5>}
        <div className="text-sm opacity-90 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
