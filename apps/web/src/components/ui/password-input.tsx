'use client';

import * as React from 'react';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@kalpak/ui';

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showStrength?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label = 'Password', error, helperText, showStrength = false, id, value, onChange, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || 'password-input';

    const currentVal = typeof value === 'string' ? value : '';

    const checks = {
      length: currentVal.length >= 8,
      uppercase: /[A-Z]/.test(currentVal),
      lowercase: /[a-z]/.test(currentVal),
      number: /[0-9]/.test(currentVal),
      special: /[^A-Za-z0-9]/.test(currentVal),
    };

    const metCount = Object.values(checks).filter(Boolean).length;

    return (
      <div className="w-full">
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
        <div className="relative">
          <input
            id={inputId}
            type={showPassword ? 'text' : 'password'}
            ref={ref}
            value={value}
            onChange={onChange}
            className={cn(
              'w-full pl-3.5 pr-10 py-2.5 bg-white border rounded-lg text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 disabled:text-slate-500',
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : 'border-slate-300 focus:border-sky-500 focus:ring-sky-100',
              className
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {error ? (
          <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>
        ) : helperText ? (
          <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
        ) : null}

        {showStrength && currentVal.length > 0 && (
          <div className="mt-2 space-y-1.5">
            <div className="flex gap-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300 rounded-full',
                  metCount <= 2
                    ? 'w-1/3 bg-red-500'
                    : metCount <= 4
                      ? 'w-2/3 bg-amber-500'
                      : 'w-full bg-emerald-500'
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500 pt-0.5">
              <span className={checks.length ? 'text-emerald-600 font-medium' : ''}>
                ✓ At least 8 characters
              </span>
              <span className={checks.uppercase ? 'text-emerald-600 font-medium' : ''}>
                ✓ Uppercase letter
              </span>
              <span className={checks.lowercase ? 'text-emerald-600 font-medium' : ''}>
                ✓ Lowercase letter
              </span>
              <span className={checks.number ? 'text-emerald-600 font-medium' : ''}>
                ✓ Number (0-9)
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';
