'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LifeBuoy,
  Users,
  Layers,
  LayoutDashboard,
  SlidersHorizontal,
  Package,
  Wrench,
  FileText,
  Bell,
  Settings,
  CreditCard,
  ShieldCheck,
  Radio,
  Mail,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  clientAdminOnly?: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const { activeTenant, activeRole, department } = useAuth();

  const isClientAdmin = activeRole === 'CLIENT_ADMIN' || activeRole === 'SUPER_ADMIN';
  const isDepartmentAdmin = activeRole === 'DEPARTMENT_ADMIN';
  const isSupportEmployee = activeRole === 'SUPPORT_EMPLOYEE';

  // Specific navigation for Support Employee / Field Technician
  const supportEmployeeNavItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard/employee',
      icon: LayoutDashboard,
    },
    {
      label: 'My Tickets',
      href: '/dashboard/employee?tab=tickets',
      icon: LifeBuoy,
    },
    {
      label: 'My Tasks',
      href: '/dashboard/employee?tab=tasks',
      icon: Users,
    },
    {
      label: 'Notifications',
      href: '/dashboard/employee?tab=notifications',
      icon: Bell,
    },
    {
      label: 'My Performance',
      href: '/dashboard/employee?tab=performance',
      icon: ShieldCheck,
    },
    {
      label: 'Profile & Settings',
      href: '/dashboard/employee?tab=profile',
      icon: Settings,
    },
  ];

  // Specific navigation for Department Head / Department Admin
  const departmentAdminNavItems: NavItem[] = [
    {
      label: 'Department Console',
      href: '/dashboard/department',
      icon: LayoutDashboard,
      badge: department?.code || 'Head',
    },
    {
      label: 'Employee Portal',
      href: '/dashboard/employee',
      icon: Users,
      badge: 'Tech View',
    },
    {
      label: 'Department Tickets',
      href: '/dashboard/department?tab=tickets',
      icon: LifeBuoy,
    },
    {
      label: 'Team & Workload',
      href: '/dashboard/department?tab=employees',
      icon: Users,
    },
    {
      label: 'SLA & Operations',
      href: '/dashboard/department?tab=sla',
      icon: ShieldCheck,
    },
    {
      label: 'Department Reports',
      href: '/dashboard/department?tab=reports',
      icon: FileText,
    },
    {
      label: 'Dept Settings',
      href: '/dashboard/department?tab=settings',
      icon: Settings,
    },
    {
      label: 'Activity & Alerts',
      href: '/dashboard/department?tab=activity',
      icon: Bell,
    },
    {
      label: 'Help / Support',
      href: '/dashboard/support',
      icon: LifeBuoy,
    },
  ];

  const clientAdminNavItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Dept Console',
      href: '/dashboard/department',
      icon: Layers,
      badge: 'Head Hub',
    },
    {
      label: 'Configuration',
      href: '/dashboard/configuration',
      icon: SlidersHorizontal,
      clientAdminOnly: true,
    },
    {
      label: 'Tickets',
      href: '/dashboard/tickets',
      icon: LifeBuoy,
    },
    {
      label: 'Customers',
      href: '/dashboard/customers',
      icon: Users,
      clientAdminOnly: true,
    },
    {
      label: 'Employees (5 Max)',
      href: '/dashboard/team',
      icon: Users,
      badge: 'Starter: 5',
      clientAdminOnly: true,
    },
    {
      label: 'Client Admins',
      href: '/dashboard/admins',
      icon: ShieldCheck,
      clientAdminOnly: true,
    },
    {
      label: 'Departments',
      href: '/dashboard/departments',
      icon: Layers,
      clientAdminOnly: true,
    },
    {
      label: 'Products',
      href: '/dashboard/products',
      icon: Package,
      clientAdminOnly: true,
    },
    {
      label: 'Services',
      href: '/dashboard/services',
      icon: Wrench,
      clientAdminOnly: true,
    },
    {
      label: 'Reports',
      href: '/dashboard/reports',
      icon: FileText,
      clientAdminOnly: true,
    },
    {
      label: 'Notifications',
      href: '/dashboard/notifications',
      icon: Bell,
    },
    {
      label: 'Audit Logs',
      href: '/dashboard/audit',
      icon: ShieldCheck,
      clientAdminOnly: true,
    },
    {
      label: 'Help / Support',
      href: '/dashboard/support',
      icon: LifeBuoy,
    },
    {
      label: 'Customer Channels',
      href: '/dashboard/channels',
      icon: Radio,
      badge: 'Channels',
      clientAdminOnly: true,
    },
    {
      label: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      clientAdminOnly: true,
    },
    {
      label: 'Email Configuration',
      href: '/dashboard/settings/email-configuration',
      icon: Mail,
      clientAdminOnly: true,
    },
    {
      label: 'Subscription',
      href: '/dashboard/subscription',
      icon: CreditCard,
      badge: 'Starter',
      clientAdminOnly: true,
    },
  ];

  const activeNavItems = isSupportEmployee
    ? supportEmployeeNavItems
    : isDepartmentAdmin
    ? departmentAdminNavItems
    : clientAdminNavItems;

  const companyProfile = (activeTenant?.settings as Record<string, any>)?.companyProfile;
  const companyLogo = companyProfile?.logoUrl || (activeTenant?.settings as Record<string, any>)?.logoUrl;
  const companyName = activeTenant?.name || 'Company Portal';

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 flex-shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-slate-800/80 justify-between gap-2.5">
        <Link href={isSupportEmployee ? "/dashboard/employee" : isDepartmentAdmin ? "/dashboard/department" : "/dashboard"} className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90 transition-opacity">
          {companyLogo ? (
            <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-slate-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={companyLogo} alt={companyName} className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
              {companyName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black text-white truncate tracking-tight">
              {companyName}
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate">
              {activeTenant?.slug ? `${activeTenant.slug}` : 'Tenant Admin'}
            </div>
          </div>
        </Link>
        <span className="text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded font-mono font-bold uppercase shrink-0">
          {activeRole === 'CLIENT_ADMIN'
            ? 'Admin'
            : activeRole === 'DEPARTMENT_ADMIN'
              ? 'Dept Head'
              : activeRole === 'SUPPORT_EMPLOYEE'
                ? 'Technician'
                : activeRole || 'Staff'}
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>
            {isSupportEmployee
              ? 'Support Employee'
              : isDepartmentAdmin
              ? (department?.name ? `${department.name}` : 'Department Hub')
              : 'Client Administration'}
          </span>
          {isDepartmentAdmin && department?.code && (
            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-amber-400 font-mono font-semibold">
              {department.code}
            </span>
          )}
        </div>
        {activeNavItems
          .filter((item) => !item.clientAdminOnly || isClientAdmin)
          .map((item) => {
            const Icon = item.icon;
            const isCurrent = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));

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

      {/* Sidebar Footer */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between px-2 py-1 text-xs">
          <span className="font-semibold text-slate-300 truncate">{companyName}</span>
          <span className="text-[10px] font-mono font-bold bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded border border-orange-500/30">
            Starter
          </span>
        </div>
      </div>
    </aside>
  );
}
