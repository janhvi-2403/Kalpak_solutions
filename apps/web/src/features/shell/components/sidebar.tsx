'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LifeBuoy,
  Users,
  Layers,
  BarChart3,
  ShieldCheck,
  LayoutDashboard,
  Sparkles,
  Database,
  Lock,
  Package,
  CalendarCheck,
} from 'lucide-react';
import { KalpakLogo } from '@/components/KalpakLogo';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  clientAdminOnly?: boolean;
  active?: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const { activeTenant, activeRole } = useAuth();

  const isClientAdmin = activeRole === 'CLIENT_ADMIN' || activeRole === 'SUPER_ADMIN';

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: true,
    },
    {
      label: 'Tickets & Calls',
      href: '/dashboard/tickets',
      icon: LifeBuoy,
      active: true,
    },
    {
      label: 'AMCs & PM Contracts',
      href: '/dashboard/contracts',
      icon: CalendarCheck,
      active: true,
    },
    {
      label: 'Departments',
      href: '/dashboard/departments',
      icon: Layers,
      clientAdminOnly: true,
      active: true,
    },
    {
      label: 'Customers',
      href: '/dashboard/customers',
      icon: Users,
      clientAdminOnly: true,
      active: true,
    },
    {
      label: 'Products & Equipment',
      href: '/dashboard/products',
      icon: BarChart3,
      clientAdminOnly: true,
      active: true,
    },
    {
      label: 'Parts & Inventory',
      href: '/dashboard/inventory',
      icon: Package,
      active: true,
    },
    {
      label: 'Team & Technicians',
      href: '/dashboard/team',
      icon: Users,
      clientAdminOnly: true,
      active: true,
    },
    {
      label: 'Tenant Policy & Config',
      href: '/dashboard/settings',
      icon: ShieldCheck,
      clientAdminOnly: true,
      active: true,
    },
    {
      label: 'Onboarding Wizard',
      href: '/onboarding',
      icon: Sparkles,
      badge: '9 Steps',
      clientAdminOnly: true,
      active: true,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 flex-shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-slate-800/80 justify-between">
        <KalpakLogo size="sm" variant="dark" href="/dashboard" />
        <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded font-mono font-semibold truncate max-w-[90px]">
          {activeTenant?.slug || 'service'}
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Platform Menu
        </div>
        {navItems
          .filter((item) => !item.clientAdminOnly || isClientAdmin)
          .map((item) => {
            const Icon = item.icon;
            const isCurrent = pathname === item.href;

            if (!item.active) {
              return (
                <div
                  key={item.label}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-500 cursor-not-allowed select-none group"
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-4 h-4 text-slate-600" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isCurrent
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isCurrent ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                      isCurrent
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
      </nav>

      {/* Security & Isolation Status Card */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              Tenant Isolation
            </span>
            <span className="text-[9px] font-mono bg-emerald-950 text-emerald-300 px-1 rounded border border-emerald-800/50">
              RLS ON
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              Cookie Security
            </span>
            <span className="text-[9px] font-mono text-slate-400">HttpOnly</span>
          </div>
        </div>
        <div className="mt-3 text-center text-[10px] text-slate-500 font-mono">
          Kalpak Solutions Enterprise v1.0
        </div>
      </div>
    </aside>
  );
}
