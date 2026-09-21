'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useParams } from 'next/navigation';
import {
  LifeBuoy,
  LayoutDashboard,
  Ticket,
  PlusCircle,
  Cpu,
  CalendarCheck,
  LogOut,
  Building2,
  UserCheck,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { PortalProfile } from '@kalpak/types';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || '';

  const isLoginPage = pathname.includes('/login');

  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [loading, setLoading] = useState(!isLoginPage);

  useEffect(() => {
    if (isLoginPage) return;

    let mounted = true;
    async function loadPortalProfile() {
      try {
        const data = await apiClient<PortalProfile>('/portal/me');
        if (mounted) {
          setProfile(data);
          setLoading(false);
        }
      } catch (err) {
        // If unauthenticated or no portal access, redirect to login
        if (mounted) {
          router.replace(`/portal/${tenantSlug}/login`);
        }
      }
    }

    loadPortalProfile();

    return () => {
      mounted = false;
    };
  }, [pathname, isLoginPage, tenantSlug, router]);

  const handleLogout = async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch {
      // Continue logout redirect regardless
    }
    router.replace(`/portal/${tenantSlug}/login`);
  };

  // Login page layout doesn't need the authenticated nav bar
  if (isLoginPage) {
    return <div className="min-h-screen bg-slate-950 text-slate-100">{children}</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium tracking-wide">Connecting to Customer Portal...</p>
      </div>
    );
  }

  const navLinks = [
    {
      label: 'Dashboard',
      href: `/portal/${tenantSlug}/dashboard`,
      icon: LayoutDashboard,
    },
    {
      label: 'My Tickets',
      href: `/portal/${tenantSlug}/tickets`,
      icon: Ticket,
    },
    {
      label: 'Raise Request',
      href: `/portal/${tenantSlug}/tickets/raise`,
      icon: PlusCircle,
    },
    {
      label: 'My Machinery',
      href: `/portal/${tenantSlug}/assets`,
      icon: Cpu,
    },
    {
      label: 'AMC & Contracts',
      href: `/portal/${tenantSlug}/contracts`,
      icon: CalendarCheck,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Portal Tag */}
            <div className="flex items-center gap-6">
              <Link
                href={`/portal/${tenantSlug}/dashboard`}
                className="flex items-center gap-3 group focus:outline-none"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  <LifeBuoy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-white tracking-tight">
                      {profile?.tenant?.name || 'Kalpak'}
                    </span>
                    <span className="bg-blue-500/20 text-blue-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-blue-500/30 uppercase tracking-wider">
                      Client Portal
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate max-w-[200px]">
                    <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{profile?.customer?.companyName}</span>
                  </p>
                </div>
              </Link>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-800">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive =
                    link.href === `/portal/${tenantSlug}/dashboard`
                      ? pathname === link.href
                      : pathname.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* User Info & Logout */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-200 flex items-center justify-end gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {profile?.customer?.contactPerson || profile?.user?.fullName}
                </span>
                <span className="text-[11px] text-slate-400">{profile?.user?.email}</span>
              </div>

              <button
                onClick={handleLogout}
                title="Sign Out"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-slate-800 hover:border-rose-500/30 transition-all focus:outline-none"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Sub-Bar */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-800 py-2 bg-slate-950/60 px-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === `/portal/${tenantSlug}/dashboard`
                ? pathname === link.href
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium ${
                  isActive ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/50 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} {profile?.tenant?.name || 'Kalpak Solutions'}. Customer Service Portal.</p>
          <p className="text-slate-400">Need urgent support? Contact support hotline at {profile?.customer?.phone || 'your assigned manager'}.</p>
        </div>
      </footer>
    </div>
  );
}
