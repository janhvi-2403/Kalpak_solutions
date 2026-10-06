'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { TenantBadge } from './tenant-badge';
import { NotificationDropdown } from './notification-dropdown';
import {
  LogOut,
  ChevronDown,
  Building2,
  Check,
  Sparkles,
  Loader2,
} from 'lucide-react';

export function Header() {
  const { user, activeTenant, activeRole, memberships, switchTenant, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitchTenant = async (tenantId: string) => {
    if (tenantId === activeTenant?.id) {
      setDropdownOpen(false);
      return;
    }
    try {
      setIsSwitching(tenantId);
      await switchTenant(tenantId);
      setDropdownOpen(false);
    } catch {
      // Error handled by AuthContext
    } finally {
      setIsSwitching(null);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
  };

  const companyProfile = (activeTenant?.settings as Record<string, any>)?.companyProfile;
  const companyLogo = companyProfile?.logoUrl || (activeTenant?.settings as Record<string, any>)?.logoUrl;
  const isSetupDone = (activeTenant?.settings as Record<string, any>)?.basicSetupCompleted || !!companyProfile?.logoUrl || !!companyProfile?.address;

  const isOnboardingPending =
    activeRole === 'CLIENT_ADMIN' &&
    !isSetupDone &&
    (!activeTenant?.settings?.onboardingCompleted ||
      activeTenant?.settings?.onboardingStep < 9);

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-6 flex items-center justify-between z-30 sticky top-0">
      {/* Left side: Tenant Switcher / Active Tenant */}
      <div className="flex items-center space-x-3">
        {memberships.length > 1 ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-lg px-3 py-1.5 transition-colors shadow-sm text-left group"
            >
              <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-xs text-slate-900 tracking-tight">
                    {activeTenant?.name || 'Select Organization'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200" />
                </div>
                <span className="font-mono text-[9px] text-slate-500 uppercase">
                  {activeRole || 'Member'}
                </span>
              </div>
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Switch Organization
                </div>
                <div className="py-1 max-h-56 overflow-y-auto">
                  {memberships.map((m) => {
                    const isSelected = m.tenantId === activeTenant?.id;
                    const switchingThis = isSwitching === m.tenantId;

                    return (
                      <button
                        key={m.tenantId}
                        onClick={() => handleSwitchTenant(m.tenantId)}
                        disabled={switchingThis}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                          isSelected
                            ? 'bg-blue-50 text-blue-900 font-medium'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <div>
                            <div className="font-semibold">{m.tenantName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{m.role}</div>
                          </div>
                        </div>
                        {switchingThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        ) : isSelected ? (
                          <Check className="w-4 h-4 text-blue-600" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <TenantBadge
            tenantName={activeTenant?.name || 'Company Portal'}
            role={activeRole || (user?.isSuperAdmin ? 'SUPER_ADMIN' : 'User')}
            isSuperAdmin={user?.isSuperAdmin}
            logoUrl={companyLogo}
          />
        )}
      </div>

      {/* Right side: Onboarding quick action, notifications, user avatar, logout */}
      <div className="flex items-center space-x-4">
        {/* Onboarding Banner / Quick Link */}
        {isOnboardingPending && (
          <Link
            href="/onboarding"
            className="hidden sm:inline-flex items-center space-x-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>Complete Setup</span>
          </Link>
        )}

        {/* Notification Center */}
        <NotificationDropdown />

        {/* User Identity */}
        <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
          <div className="hidden md:block text-right">
            <div className="text-xs font-semibold text-slate-900 leading-tight">
              {user?.fullName || 'Authenticated User'}
            </div>
            <div className="text-[10px] text-slate-400 font-mono leading-tight">
              {user?.email || 'user@domain.com'}
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
            {user?.fullName
              ? user.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase()
              : 'U'}
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          title="Sign Out"
          className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center"
        >
          {isLoggingOut ? (
            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
        </button>
      </div>
    </header>
  );
}
