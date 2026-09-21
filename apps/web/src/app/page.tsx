'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  LifeBuoy,
  Clock,
  Zap,
  Users,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  Building2,
  Phone,
  Mail,
  MapPin,
  Trophy,
  Award,
  Shield,
  Layers,
  Wrench,
  Package,
  Ticket,
  Bell,
  BarChart3,
  Menu,
  X,
} from 'lucide-react';
import { KalpakLogo } from '@/components/KalpakLogo';
import { RotatingAnnouncementBar } from '@/components/RotatingAnnouncementBar';

export default function HomePage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-orange-500 selection:text-white">
      {/* Top Banner: Rotating Recognition Announcements & 14-Day Free Trial Notice */}
      <RotatingAnnouncementBar />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 xl:px-12 h-18 sm:h-22 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 shrink">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 sm:p-2 rounded-lg text-slate-700 hover:text-orange-600 hover:bg-orange-50 focus:outline-none transition-colors shrink-0"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-orange-600" /> : <Menu className="w-5 h-5" />}
            </button>

            <KalpakLogo size="md" />
          </div>

          <nav className="hidden lg:flex items-center space-x-8 text-sm font-medium text-slate-700 ml-10 xl:ml-16">
            <a href="#services" className="hover:text-orange-600 transition-colors font-semibold">
              Services
            </a>
            <a href="#capabilities" className="hover:text-orange-600 transition-colors">
              Field Operations
            </a>
            <a href="#pricing" className="hover:text-orange-600 transition-colors">
              Pricing & Plans
            </a>
            <a href="#payment-gateway" className="hover:text-orange-600 transition-colors">
              Payment Gateway
            </a>
            <a href="#awards" className="hover:text-orange-600 transition-colors">
              Awards
            </a>
            <a href="#contact" className="hover:text-orange-600 transition-colors">
              Contact
            </a>
          </nav>

          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <Link
              href="/login"
              className="hidden sm:inline-block whitespace-nowrap text-xs sm:text-sm font-bold text-slate-800 hover:text-orange-600 px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-lg hover:bg-orange-50 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="whitespace-nowrap inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-700 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all border border-orange-400/40 shrink-0"
            >
              <span className="hidden sm:inline">Start 14-Day Free Trial</span>
              <span className="sm:hidden">Free Trial</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>
          </div>
        </div>

        {/* Mobile Slide-Down Navigation Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-200 shadow-xl px-4 py-4 space-y-3">
            <nav className="flex flex-col space-y-1 text-sm font-semibold text-slate-800">
              <a
                href="#services"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center justify-between"
              >
                <span>🎫 Services</span>
                <span className="text-xs text-slate-400">&rarr;</span>
              </a>
              <a
                href="#capabilities"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center justify-between"
              >
                <span>⚙️ Field Operations</span>
                <span className="text-xs text-slate-400">&rarr;</span>
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center justify-between"
              >
                <span>💳 Pricing & Plans</span>
                <span className="text-xs text-slate-400">&rarr;</span>
              </a>
              <a
                href="#payment-gateway"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center justify-between"
              >
                <span>🔒 Payment Gateway</span>
                <span className="text-xs text-slate-400">&rarr;</span>
              </a>
              <a
                href="#awards"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center justify-between"
              >
                <span>🏆 Awards</span>
                <span className="text-xs text-slate-400">&rarr;</span>
              </a>
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center justify-between"
              >
                <span>📍 Contact & Pune Office</span>
                <span className="text-xs text-slate-400">&rarr;</span>
              </a>
            </nav>
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-orange-500 to-amber-600 shadow-md"
              >
                Start 14-Day Free Trial
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 sm:pt-24 pb-20 sm:pb-24 overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-white via-orange-50/20 to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 text-center">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100/70 border border-orange-200 text-orange-900 text-xs sm:text-sm font-semibold mb-8 shadow-xs">
            <Trophy className="w-4 h-4 text-orange-600" />
            <span>By Kalpak Solutions — Award-Winning Enterprise Software Provider</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-950 tracking-tight leading-[1.18] mb-6 max-w-4xl mx-auto">
            Service Calls & Ticket Management,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500">
              Engineered for Service Excellence
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            Built specifically for equipment manufacturers, technical maintenance contractors, and field service organizations. Streamline technician assignment, automate SLA escalation, track spare parts inventory, and offer clients a dedicated service portal.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white text-base bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-md hover:shadow-lg transition-all"
            >
              <span>Start 14-Day Free Trial</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 rounded-xl font-bold text-slate-700 text-base bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 shadow-xs transition-all"
            >
              View Subscription Pricing
            </a>
          </div>

          {/* Business-Focused Value Guarantees */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto text-left pt-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-orange-200 transition-colors">
              <div className="flex items-center gap-2.5 text-orange-600 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Free Trial</span>
              </div>
              <h2 className="text-base font-bold text-slate-900">14-Day Free Trial</h2>
              <p className="text-xs text-slate-600 mt-1">
                Full-featured access for your team. Zero commitment, no credit card required to start.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-orange-200 transition-colors">
              <div className="flex items-center gap-2.5 text-amber-600 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Quick Setup</span>
              </div>
              <h2 className="text-base font-bold text-slate-900">Instant Onboarding</h2>
              <p className="text-xs text-slate-600 mt-1">
                Create your tenant organization and start dispatching technician work orders in under 5 minutes.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-orange-200 transition-colors">
              <div className="flex items-center gap-2.5 text-emerald-600 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Flexible SaaS</span>
              </div>
              <h2 className="text-base font-bold text-slate-900">Subscription Plans</h2>
              <p className="text-xs text-slate-600 mt-1">
                Transparent monthly or annual plans with integrated Razorpay & Stripe payment gateways.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-orange-200 transition-colors">
              <div className="flex items-center gap-2.5 text-blue-600 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pune, India</span>
              </div>
              <h2 className="text-base font-bold text-slate-900">Kalpak Solutions</h2>
              <p className="text-xs text-slate-600 mt-1">
                Backed by 15+ years of software excellence, dedicated customer support & SLA reliability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Awards & Industry Accolades Section (From official website kalpaksolutions.com) */}
      <section id="awards" className="py-20 sm:py-24 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-orange-700 bg-orange-100/70 px-3 py-1 rounded-full mb-3">
              <Award className="w-3.5 h-3.5" /> Industry Recognitions & Trust
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
              Proven Track Record of Software Excellence
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Kalpak Solutions has been repeatedly recognized by leading enterprise technology magazines and global industry forums for CRM, ERP, and customized enterprise solutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs hover:shadow-md transition-all">
              <div className="text-amber-500 mb-3">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-1">Top 10 CRM Solutions</h3>
              <p className="text-xs font-semibold text-orange-600 mb-2">CIO Insider Magazine</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Shortlisted among India&apos;s leading CRM and customer lifecycle solutions providers for operational efficiency and scalability.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs hover:shadow-md transition-all">
              <div className="text-orange-500 mb-3">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-1">Top 10 Inventory Solutions</h3>
              <p className="text-xs font-semibold text-orange-600 mb-2">SiliconIndia Magazine</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Recognized for excellence in real-time spare parts tracking, multi-warehouse stock control, and service inventory optimization.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs hover:shadow-md transition-all">
              <div className="text-blue-500 mb-3">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-1">Top 25 Project Solutions</h3>
              <p className="text-xs font-semibold text-orange-600 mb-2">APAC CIOoutlook (USA)</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Selected among 1,200 software enterprises in the Asia-Pacific region for superior workflow dispatch and milestone tracking.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs hover:shadow-md transition-all">
              <div className="text-emerald-500 mb-3">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-1">Global Achievers Award</h3>
              <p className="text-xs font-semibold text-orange-600 mb-2">Dubai International Forum</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Honored at the International Conference in Dubai for impactful contribution to digital enterprise systems and cloud solutions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Platform Services Section */}
      <section id="services" className="py-20 sm:py-24 bg-slate-50/50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-700 bg-orange-100/70 px-3.5 py-1 rounded-full mb-3 inline-block">
              Core Platform Services
            </span>
            <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight sm:text-4xl">
              Complete End-to-End Service & Support Solutions
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Kalpak Solutions provides everything required to manage enterprise service operations, support communications, customer portals, and multi-business accounts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* 1. Ticket Management */}
            <div className="bg-slate-50/80 p-8 rounded-2xl border border-slate-200/90 hover:border-orange-300 hover:shadow-lg transition-all group flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Ticket className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-full font-mono">
                    Service 01
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2.5 flex items-center gap-2">
                  <span>🎫 Ticket Management</span>
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Create, track, assign, update, and close service tickets from one centralized system.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/70 flex items-center text-xs font-bold text-orange-600">
                <span>Centralized Lifecycle Management</span>
              </div>
            </div>

            {/* 2. Smart Ticket Assignment */}
            <div className="bg-slate-50/80 p-8 rounded-2xl border border-slate-200/90 hover:border-amber-300 hover:shadow-lg transition-all group flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Zap className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-full font-mono">
                    Service 02
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2.5 flex items-center gap-2">
                  <span>⚡ Smart Ticket Assignment</span>
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Automatically assign tickets based on department, role, skills, or workload, with manual assignment when needed.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/70 flex items-center text-xs font-bold text-amber-600">
                <span>Rule-Based & Skill Balancing</span>
              </div>
            </div>

            {/* 3. Multi-Channel Notifications */}
            <div className="bg-slate-50/80 p-8 rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-lg transition-all group flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Bell className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-full font-mono">
                    Service 03
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2.5 flex items-center gap-2">
                  <span>🔔 Multi-Channel Notifications</span>
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Keep customers and support teams informed through Email, WhatsApp, and Push Notifications.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/70 flex items-center text-xs font-bold text-emerald-600">
                <span>Instant Omnichannel Alerts</span>
              </div>
            </div>

            {/* 4. Reports & Dashboards */}
            <div className="bg-slate-50/80 p-8 rounded-2xl border border-slate-200/90 hover:border-blue-300 hover:shadow-lg transition-all group flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-full font-mono">
                    Service 04
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2.5 flex items-center gap-2">
                  <span>📊 Reports & Dashboards</span>
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Get real-time visibility into open tickets, resolution time, ticket aging, employee performance, and service activity.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/70 flex items-center text-xs font-bold text-blue-600">
                <span>Live Analytics & SLA Metrics</span>
              </div>
            </div>

            {/* 5. Customer & Support Portal */}
            <div className="bg-slate-50/80 p-8 rounded-2xl border border-slate-200/90 hover:border-purple-300 hover:shadow-lg transition-all group flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-full font-mono">
                    Service 05
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2.5 flex items-center gap-2">
                  <span>👥 Customer & Support Portal</span>
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Give customers an easy way to raise tickets, upload photos/attachments, track status, respond, and view ticket history while support teams manage everything from their dashboard.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/70 flex items-center text-xs font-bold text-purple-600">
                <span>Self-Service & Attachment Uploads</span>
              </div>
            </div>

            {/* 6. Multi-Tenant Business Management */}
            <div className="bg-slate-50/80 p-8 rounded-2xl border border-slate-200/90 hover:border-teal-300 hover:shadow-lg transition-all group flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-full font-mono">
                    Service 06
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2.5 flex items-center gap-2">
                  <span>🏢 Multi-Tenant Business Management</span>
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Manage multiple businesses/clients securely with separate data, users, roles, permissions, configurations, and subscription plans.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/70 flex items-center text-xs font-bold text-teal-600">
                <span>Complete Data & Role Isolation</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Capabilities Section */}
      <section id="capabilities" className="py-20 sm:py-24 bg-slate-50/70 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-100/60 px-3 py-1 rounded-full mb-3 inline-block">
              Core Capabilities
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
              Engineered for Seamless Field Service Operations
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Everything your organization needs to log, prioritize, assign, execute, and monitor service requests across customer fleets and distributed field technicians.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <div className="bg-white p-7 rounded-2xl border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center mb-5">
                <LifeBuoy className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Service Calls & Tickets</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Log service requests with structured hardware model mapping, symptom classification, severity tagging, and automated priority queues.
              </p>
            </div>

            <div className="bg-white p-7 rounded-2xl border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-5">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Smart Technician Assignment</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Dispatch work orders based on technician geographic territory, skill specialization, and real-time workload balancing.
              </p>
            </div>

            <div className="bg-white p-7 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">SLA Aging & Escalation Engine</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Automated monitors track ticket age against contractual SLA windows, alerting managers and re-routing stalled requests proactively.
              </p>
            </div>

            <div className="bg-white p-7 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-5">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Customer & Installed Asset Directory</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Track full client fleet history, serial numbers, installed product locations, warranty periods, and past maintenance records.
              </p>
            </div>

            <div className="bg-white p-7 rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-5">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Spare Parts & Inventory Control</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Manage service van stock, warehouse inventories, part replacement logging, and automatic stock deduction upon ticket resolution.
              </p>
            </div>

            <div className="bg-white p-7 rounded-2xl border border-slate-200 hover:border-teal-300 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-5">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Preventive Maintenance (AMC/CMC)</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Schedule recurring preventive maintenance visits, generate periodic work orders automatically, and ensure SLA compliance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing & Subscription Module */}
      <section id="pricing" className="py-20 sm:py-24 bg-white border-b border-slate-200/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-700 bg-orange-100/70 px-3.5 py-1 rounded-full mb-3 inline-block">
              SaaS Subscription Plans
            </span>
            <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight sm:text-4xl">
              Simple, Transparent Pricing for Every Service Team
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Pick the right plan for your service operations. Every plan comes with our <strong>14-Day Free Trial</strong> — no credit card required to start.
            </p>

            {/* Simple Positioning Summary */}
            <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-3 text-xs font-bold">
              <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800">
                <span className="text-orange-600 font-extrabold">Starter</span> &rarr; Manage
              </span>
              <span className="text-slate-300 font-bold">&bull;</span>
              <span className="px-3 py-1 rounded-full bg-orange-100 border border-orange-200 text-orange-900 shadow-xs">
                <span className="text-orange-600 font-extrabold">Professional</span> &rarr; Automate
              </span>
              <span className="text-slate-300 font-bold">&bull;</span>
              <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800">
                <span className="text-orange-600 font-extrabold">Enterprise</span> &rarr; Scale
              </span>
            </div>

            {/* Billing Cycle Toggle */}
            <div className="mt-8 inline-flex items-center p-1 sm:p-1.5 rounded-xl bg-slate-100 border border-slate-200 max-w-full">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all inline-flex items-center gap-1.5 sm:gap-2 ${
                  billingCycle === 'annual'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[10px] sm:text-[11px] bg-white/20 text-white font-bold px-1.5 sm:px-2 py-0.5 rounded-full">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-7xl mx-auto">
            {/* 1. Starter Plan (Starter -> Manage) */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-8 flex flex-col justify-between hover:border-slate-300 transition-all shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-2xl font-black text-slate-950">Starter</h3>
                    <span className="text-xs font-extrabold text-orange-600 tracking-wide uppercase">
                      Starter &rarr; Manage
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-slate-200/80 text-slate-700 rounded-md">
                    Up to 5 Technicians
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                  Manage service calls, customer history, and support team operations from one centralized system.
                </p>

                {/* Plan Limits Box */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 mb-6 text-xs space-y-1 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Staff Limit:</span>
                    <strong className="text-slate-900">Up to 5 Technicians / Staff</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Service Tickets:</span>
                    <strong className="text-emerald-600">Unlimited Tickets & Calls</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Workspaces:</span>
                    <strong className="text-slate-900">1 Organization Workspace</strong>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-950">
                      {billingCycle === 'annual' ? '₹2,399' : '₹2,999'}
                    </span>
                    <span className="text-sm font-medium text-slate-500">/month</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {billingCycle === 'annual'
                      ? 'Billed annually (₹28,788/yr) • 14-Day Free Trial'
                      : 'Billed monthly • 14-Day Free Trial'}
                  </p>
                </div>

                {/* Starter Features List */}
                <div className="pt-5 border-t border-slate-200 space-y-2.5 text-xs text-slate-700">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Ticket & Service Call Management</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Customer & Employee Management</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Manual Assignment & Status Tracking</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Comments, Attachments & Ticket History</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Email Notifications</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Basic Dashboard & Reports</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Web Access & Basic Role Management</span>
                  </div>
                  <div className="flex items-center gap-2.5 font-semibold text-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>2FA Security (Two-Factor Authentication)</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  href="/signup?plan=starter"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 hover:border-slate-400 transition-colors shadow-xs"
                >
                  <span>Start 14-Day Free Trial</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-[11px] text-center text-slate-500 mt-2">
                  No credit card required for 14 days
                </p>
              </div>
            </div>

            {/* 2. Professional Plan (Professional -> Automate) */}
            <div className="rounded-2xl bg-white border-2 border-orange-500 p-8 flex flex-col justify-between shadow-xl relative scale-100 lg:-translate-y-2">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-600 text-white text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-sm whitespace-nowrap">
                Most Popular • Automate
              </div>

              <div>
                <div className="flex items-center justify-between mb-3 mt-2">
                  <div>
                    <h3 className="text-2xl font-black text-slate-950">Professional</h3>
                    <span className="text-xs font-extrabold text-orange-600 tracking-wide uppercase">
                      Professional &rarr; Automate
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-orange-100 text-orange-800 rounded-md">
                    Up to 25 Technicians
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                  Automate ticket assignments, SLA escalations, and technician workloads across departments.
                </p>

                {/* Plan Limits Box */}
                <div className="bg-orange-50/60 p-3 rounded-xl border border-orange-200/70 mb-6 text-xs space-y-1 text-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Staff Limit:</span>
                    <strong className="text-slate-950">Up to 25 Technicians & Dispatchers</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Assignment:</span>
                    <strong className="text-orange-700 font-bold">Role, Skill & Workload Based</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">SLA Monitoring:</span>
                    <strong className="text-emerald-700">Real-Time Aging & Alerts</strong>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-950">
                      {billingCycle === 'annual' ? '₹5,599' : '₹6,999'}
                    </span>
                    <span className="text-sm font-medium text-slate-500">/month</span>
                  </div>
                  <p className="text-xs text-orange-700 font-medium mt-1">
                    {billingCycle === 'annual'
                      ? 'Save ₹16,800/yr with annual billing • 14-Day Free Trial'
                      : 'Billed monthly • 14-Day Free Trial'}
                  </p>
                </div>

                {/* Professional Features List */}
                <div className="pt-5 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
                  <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
                    Everything in Starter, plus:
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>Automatic Assignment — Role, Department & Skills</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>Equal Ticket Distribution (Workload Balancing)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>Employee-on-Behalf Ticket Creation</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>Mobile + Web Access</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>Email + Push Notifications</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>Ticket Aging & Escalation Alerts</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>Advanced Dashboards & Reports</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>Bulk Import/Export & API Integration</span>
                  </div>
                  <div className="flex items-center gap-2.5 font-semibold text-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>Advanced Roles & Permissions</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  href="/signup?plan=professional"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-md hover:shadow-lg transition-all"
                >
                  <span>Start 14-Day Free Trial</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-[11px] text-center text-slate-500 mt-2">
                  Instant activation • 14 days full access
                </p>
              </div>
            </div>

            {/* 3. Enterprise Plan (Enterprise -> Scale) */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-8 flex flex-col justify-between hover:border-slate-300 transition-all shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-2xl font-black text-slate-950">Enterprise</h3>
                    <span className="text-xs font-extrabold text-orange-600 tracking-wide uppercase">
                      Enterprise &rarr; Scale
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-slate-200/80 text-slate-700 rounded-md">
                    Unlimited Scale
                  </span>
                </div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  For large & multi-location organizations
                </div>
                <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                  Scale across multiple branches, territories, and integrate with custom ERP and CRM systems.
                </p>

                {/* Plan Limits Box */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 mb-6 text-xs space-y-1 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">User Limits:</span>
                    <strong className="text-slate-950">Unlimited Technicians & Admins</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Multi-Location:</span>
                    <strong className="text-emerald-600">Multi-Org & Branch Support</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Support Level:</span>
                    <strong className="text-slate-900">Dedicated Account Manager</strong>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-950">
                      {billingCycle === 'annual' ? '₹11,999' : '₹14,999'}
                    </span>
                    <span className="text-sm font-medium text-slate-500">/month</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Custom scale or unlimited seats available
                  </p>
                </div>

                {/* Enterprise Features List */}
                <div className="pt-5 border-t border-slate-200 space-y-2.5 text-xs text-slate-700">
                  <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
                    Everything in Professional, plus:
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Multi-Location & Multi-Organization Management</span>
                  </div>
                  <div className="flex items-center gap-2.5 font-semibold text-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Email + WhatsApp + Push Notifications</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Advanced Workflow & Routing Configuration</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Flexible Closure & Client Configurations</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Enterprise API Integrations</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Advanced Analytics & Reporting</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Custom Limits, Configuration & Enterprise Support</span>
                  </div>
                  <div className="flex items-center gap-2.5 font-semibold text-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Subscription & Payment Management</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  href="/signup?plan=enterprise"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 hover:border-slate-400 transition-colors shadow-xs"
                >
                  <span>Start 14-Day Free Trial</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-[11px] text-center text-slate-500 mt-2">
                  Includes custom proof-of-concept setup
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Gateway & Billing Infrastructure Module */}
      <section id="payment-gateway" className="py-20 sm:py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <span className="text-xs font-mono font-bold tracking-wider text-orange-400 uppercase">
                Seamless Subscription Billing
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight mt-2 mb-5 sm:text-4xl text-white">
                Integrated Payment Gateway & Instant Subscription Activation
              </h2>
              <p className="text-slate-300 leading-relaxed mb-6 text-sm">
                Kalpak Solutions SaaS platform is architected for subscription billing. We support frictionless payment gateway integrations, automated recurring subscriptions, and compliant GST invoices for enterprise customers.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-200">
                <div className="flex items-start gap-3 bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                  <CreditCard className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white font-semibold">Multiple Payment Modes</strong>
                    <span className="text-xs text-slate-400">
                      UPI, Credit/Debit Cards, Net Banking, and International Cards via Razorpay & Stripe.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white font-semibold">14-Day Zero Risk Trial</strong>
                    <span className="text-xs text-slate-400">
                      Evaluate full features for 14 days without charge. Pay only when your organization is ready.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                  <Layers className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white font-semibold">Automated GST Invoicing</strong>
                    <span className="text-xs text-slate-400">
                      Instant compliant tax invoices generated with your company GSTIN upon successful payment.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                  <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white font-semibold">PCI-DSS Level 1 Security</strong>
                    <span className="text-xs text-slate-400">
                      End-to-end 256-bit SSL encrypted transactions with bank-grade security protocols.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Gateway Visual Card */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                  <span className="text-xs text-slate-400 font-mono ml-2">Checkout & Billing Gateway</span>
                </div>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  SSL 256-Bit Encrypted
                </span>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">Selected Plan</span>
                    <strong className="text-base text-white">Professional Plan (Annual)</strong>
                    <p className="text-xs text-slate-400">Up to 25 Technicians • Full SLA & Inventory Suite</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-emerald-400 font-bold block">14 Days Free</span>
                    <span className="text-lg font-extrabold text-white">₹5,599/mo</span>
                  </div>
                </div>

                <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-700/60 space-y-3">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">Supported Payment Channels</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700 text-slate-300 font-medium">
                      UPI / QR Code
                    </div>
                    <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700 text-slate-300 font-medium">
                      Credit / Debit Cards
                    </div>
                    <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700 text-slate-300 font-medium">
                      Net Banking (50+ Banks)
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl text-xs text-orange-200 flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-orange-400 shrink-0" />
                  <span>
                    <strong>14-Day Free Evaluation:</strong> Your card or account will NOT be charged during the 14-day trial period.
                  </span>
                </div>

                <Link
                  href="/signup"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 transition-all shadow-md"
                >
                  <span>Start 14-Day Free Trial Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Free Trial Call to Action Banner */}
      <section className="py-20 sm:py-24 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white text-center">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <span className="inline-block bg-white/20 text-white text-xs uppercase tracking-wider font-extrabold px-3 py-1 rounded-full mb-4">
            Zero Risk • 14 Days Free
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            Ready to upgrade your field service and ticket management?
          </h2>
          <p className="text-orange-100 mb-8 max-w-2xl mx-auto text-base">
            Set up your organization in minutes. Configure technician skills, assign work orders, enforce strict SLA deadlines, and delight your customers with real-time visibility.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-slate-900 bg-white hover:bg-slate-100 shadow-lg transition-all"
            >
              <span>Start 14-Day Free Trial</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 rounded-xl font-bold text-white border-2 border-white/80 hover:bg-white/10 transition-all"
            >
              Sign In to Existing Account
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Us Section with Google Map */}
      <section id="contact" className="py-20 sm:py-24 bg-slate-50 border-b border-slate-200/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-700 bg-orange-100/70 px-3.5 py-1 rounded-full mb-3 inline-block">
              Get In Touch
            </span>
            <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight sm:text-4xl">
              Contact Kalpak Solutions
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Have questions regarding subscriptions, custom deployments, or technical support? Our team in Pune is here to assist you.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
            {/* Address Card */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs hover:border-orange-300 hover:shadow-md transition-all flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="text-sm">
                <h3 className="text-base font-bold text-slate-900 mb-1.5">Registered Office</h3>
                <p className="text-slate-700 font-medium leading-relaxed">
                  <strong>Kalpak Solutions</strong><br />
                  Unit no. 605, 6th floor Shri Sairaj,<br />
                  Karve Nagar, Pune - 411052,<br />
                  Maharashtra, India.
                </p>
              </div>
            </div>

            {/* Email & Web Card */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs hover:border-orange-300 hover:shadow-md transition-all flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <Mail className="w-6 h-6" />
              </div>
              <div className="text-sm">
                <h3 className="text-base font-bold text-slate-900 mb-1.5">E-mail & Website</h3>
                <div className="space-y-1.5">
                  <p>
                    <span className="text-xs text-slate-500 font-semibold block">Official Inquiries:</span>
                    <a
                      href="mailto:contact@kalpaksolutions.com"
                      className="text-orange-600 hover:text-orange-700 font-bold underline"
                    >
                      contact@kalpaksolutions.com
                    </a>
                  </p>
                  <p>
                    <span className="text-xs text-slate-500 font-semibold block">Company Portal:</span>
                    <a
                      href="https://kalpaksolutions.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 font-semibold underline"
                    >
                      https://kalpaksolutions.com
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Phone Card */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs hover:border-orange-300 hover:shadow-md transition-all flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <Phone className="w-6 h-6" />
              </div>
              <div className="text-sm">
                <h3 className="text-base font-bold text-slate-900 mb-1.5">Contact Numbers</h3>
                <p className="text-xs text-slate-500 font-semibold mb-1">Direct Calling & WhatsApp Support:</p>
                <div className="flex flex-col gap-1 font-bold text-slate-800">
                  <a
                    href="tel:+919373028030"
                    className="hover:text-orange-600 transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>📞 +91 93730 28030</span>
                  </a>
                  <a
                    href="tel:+919922062814"
                    className="hover:text-orange-600 transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>📞 +91 99220 62814</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Google Map Location */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                <MapPin className="w-4 h-4 text-orange-600" />
                <span>Google Maps Location: Shri Sairaj, Karve Nagar, Pune</span>
              </div>
              <a
                href="https://maps.google.com/?q=Kalpak+Solutions+Shri+Sairaj+Karve+Nagar+Pune+411052"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-orange-600 hover:underline"
              >
                Open in Google Maps &rarr;
              </a>
            </div>
            <div className="w-full h-80 sm:h-96 rounded-xl overflow-hidden border border-slate-200">
              <iframe
                title="Kalpak Solutions Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3783.7839774882964!2d73.8165651791802!3d18.493441737716836!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2bfe88a5e6067%3A0x68edbc0ce1e2f5f8!2sShri%20Sairaj%2C%20Karve%20Nagar%2C%20Pune%2C%20Maharashtra%20411052!5e0!3m2!1sen!2sin!4v1725779849173!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Professional Company Footer (Based on authentic kalpaksolutions.com details) */}
      <footer className="mt-auto bg-slate-950 text-slate-400 border-t border-slate-800 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-16 sm:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
            {/* Column 1: Brand & Company Summary */}
            <div className="lg:col-span-2 space-y-4">
              <KalpakLogo size="lg" variant="dark" />
              <p className="text-xs text-slate-300 font-medium uppercase tracking-wider">
                WE DEVELOP WEB PRESENCE &bull; ENTERPRISE SOFTWARE
              </p>
              <p className="text-xs text-slate-400 leading-relaxed pr-6">
                Kalpak Solutions is an award-winning enterprise software provider delivering specialized CRM, ERP, and customized web systems since 2008. Our Service Operations platform empowers equipment manufacturers and field contractors with scalable service ticket tracking and technician dispatch.
              </p>
              <div className="pt-2">
                <span className="text-xs font-semibold text-amber-400 block mb-1">
                  14-Day Free Trial Guarantee:
                </span>
                <span className="text-xs text-slate-400">
                  Explore full features with your field technicians. No credit card required.
                </span>
              </div>
            </div>

            {/* Column 2: Platform Modules & Services */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
                Services & Platform
              </h3>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="#services" className="hover:text-white transition-colors">
                    🎫 Ticket Management
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:text-white transition-colors">
                    ⚡ Smart Assignment
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:text-white transition-colors">
                    🔔 Multi-Channel Alerts
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:text-white transition-colors">
                    📊 Reports & Dashboards
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:text-white transition-colors">
                    👥 Customer Portal
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:text-white transition-colors">
                    🏢 Multi-Tenant SaaS
                  </a>
                </li>
                <li>
                  <a href="#capabilities" className="hover:text-white transition-colors">
                    🔧 Field AMCs & PMs
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white transition-colors">
                    💳 Subscription Pricing
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Company & Awards */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
                Kalpak Solutions
              </h3>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <a
                    href="https://www.kalpaksolutions.com/about_us.php"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    About Company
                  </a>
                </li>
                <li>
                  <a href="#awards" className="hover:text-white transition-colors">
                    Awards & Accolades
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.kalpaksolutions.com/management.php"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Leadership & Management
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.kalpaksolutions.com/clients.php"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Client Portfolio
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.kalpaksolutions.com/careers.php"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">
                    Client Portal Login
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact & Pune Office */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
                Registered Office
              </h3>
              <ul className="space-y-3 text-xs">
                <li className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Kalpak Solutions</strong>
                    <br />
                    Unit No. 605, 6th Floor, Shri Sairaj,
                    <br />
                    Karve Nagar, Pune - 411052,
                    <br />
                    Maharashtra, India.
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-orange-500 shrink-0" />
                  <div className="flex flex-col">
                    <a href="tel:+919373028030" className="hover:text-white transition-colors">
                      +91 93730 28030
                    </a>
                    <a href="tel:+919922062814" className="hover:text-white transition-colors">
                      +91 99220 62814
                    </a>
                  </div>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-orange-500 shrink-0" />
                  <a
                    href="mailto:contact@kalpaksolutions.com"
                    className="hover:text-white transition-colors truncate"
                  >
                    contact@kalpaksolutions.com
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Sub-Footer Divider */}
          <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center space-x-2 text-slate-400">
              <span>&copy; {new Date().getFullYear()} Kalpak Solutions. All rights reserved.</span>
            </div>

            <div className="flex items-center space-x-6 text-slate-400">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>GST Registered &bull; 256-Bit SSL Encrypted</span>
              </span>
              <a
                href="https://www.kalpaksolutions.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors font-medium text-orange-400"
              >
                kalpaksolutions.com
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
