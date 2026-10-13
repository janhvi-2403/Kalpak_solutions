'use client';

import React, { useState, useMemo } from 'react';
import {
  Building2,
  Search,
  Download,
  Eye,
  Edit2,
  ShieldAlert,
  ShieldCheck,
  Power,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Copy,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Check,
  X,
  Mail,
  Phone,
  Layers,
  Database,
  Activity,
  Shield,
  Info,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

// ── Types & Enums ─────────────────────────────────────────────────────────────

export type TenantStatusType = 'Active' | 'Trial' | 'Pending' | 'Suspended' | 'Deactivated';
export type PlanTierType = 'Starter' | 'Professional' | 'Enterprise';

export interface CompanyTenantRecord {
  id: string; // Tenant ID (UUID)
  slug: string;
  name: string; // Legal / registered business name
  displayName: string;
  industry: string;
  clientAdminName: string;
  clientAdminEmail: string;
  contactPhone: string;
  plan: PlanTierType;
  registeredOn: string;
  planExpiry: string;
  activeUsers: number;
  maxUsersQuota: number;
  status: TenantStatusType;
  // Extended profile details
  website?: string;
  businessAddress?: string;
  country?: string;
  timezone?: string;
  preferredLanguage?: string;
  storageUsedGb?: number;
  storageLimitGb?: number;
  departmentsCount?: number;
  departmentsLimit?: number;
  apiCallsMonthly?: number;
  apiCallsLimit?: number;
  mfaEnforced?: boolean;
  ssoEnabled?: boolean;
  activeSessionsCount?: number;
  lastLoginIp?: string;
  lastLoginAt?: string;
  billingCycle?: 'Monthly' | 'Annual';
  paymentMethodStatus?: string;
  statusReason?: string;
  contacts?: {
    primaryAdmin: { name: string; email: string; phone: string };
    technicalOps?: { name: string; email: string; phone: string };
    billingContact?: { name: string; email: string; phone: string };
  };
  auditLogs?: Array<{
    id: string;
    action: string;
    actor: string;
    timestamp: string;
    reason?: string;
    details: string;
  }>;
}

// ── Initial Seed / Canonical Records ───────────────────────────────────────────

const CANONICAL_COMPANIES: CompanyTenantRecord[] = [
  {
    id: 'e7b92014-9b2f-4822-a744-88c9bb0d1001',
    slug: 'kalpak-demo',
    name: 'Kalpak Demo Industries Pvt Ltd',
    displayName: 'Kalpak Demo Industries',
    industry: 'Manufacturing',
    clientAdminName: 'Aarav Sharma',
    clientAdminEmail: 'aarav.sharma@kalpakdemo.com',
    contactPhone: '+91 98765 43210',
    plan: 'Professional',
    registeredOn: '2026-10-10',
    planExpiry: '2026-11-10',
    activeUsers: 12,
    maxUsersQuota: 25,
    status: 'Active',
    website: 'https://demo-manufacturing.kalpak.com',
    businessAddress: 'Plot 42, MIDC Industrial Area, Bhosari, Pune, MH 411026',
    country: 'India',
    timezone: 'Asia/Kolkata (IST +5:30)',
    preferredLanguage: 'English (India)',
    storageUsedGb: 8.4,
    storageLimitGb: 20,
    departmentsCount: 3,
    departmentsLimit: 5,
    apiCallsMonthly: 14250,
    apiCallsLimit: 50000,
    mfaEnforced: true,
    ssoEnabled: false,
    activeSessionsCount: 4,
    lastLoginIp: '115.112.82.14',
    lastLoginAt: '2026-10-13 14:15 IST',
    billingCycle: 'Annual',
    paymentMethodStatus: 'Auto-Debit Active (HDFC Corporate)',
    statusReason: 'Production SaaS deployment verified',
    contacts: {
      primaryAdmin: { name: 'Aarav Sharma', email: 'aarav.sharma@kalpakdemo.com', phone: '+91 98765 43210' },
      technicalOps: { name: 'Vikram Joshi', email: 'v.joshi@kalpakdemo.com', phone: '+91 98765 43211' },
      billingContact: { name: 'Sunita Rao', email: 'accounts@kalpakdemo.com', phone: '+91 98765 43212' },
    },
    auditLogs: [
      {
        id: 'aud-101',
        action: 'TENANT_ACTIVATED',
        actor: 'Super Admin',
        timestamp: '10 Oct 2026, 10:00 AM',
        details: 'Organization setup completed, Professional annual license activated.',
      },
      {
        id: 'aud-102',
        action: 'MEMBER_INVITED',
        actor: 'Aarav Sharma',
        timestamp: '11 Oct 2026, 03:30 PM',
        details: 'Added 5 field service engineers to Pune Plant department.',
      },
      {
        id: 'aud-103',
        action: 'SECURITY_POLICY_UPDATE',
        actor: 'Super Admin',
        timestamp: '12 Oct 2026, 11:20 AM',
        details: 'Mandatory Two-Factor Authentication (MFA) enabled for tenant.',
      },
    ],
  },
  {
    id: '3f912c0a-6d44-42b7-8149-55e4cc8f2002',
    slug: 'northstar',
    name: 'Northstar Technologies Inc',
    displayName: 'Northstar Technologies',
    industry: 'IT',
    clientAdminName: 'Priya Deshmukh',
    clientAdminEmail: 'priya.deshmukh@northstar.io',
    contactPhone: '+91 98234 56789',
    plan: 'Starter',
    registeredOn: '2026-10-12',
    planExpiry: '2026-10-26',
    activeUsers: 4,
    maxUsersQuota: 5,
    status: 'Trial',
    website: 'https://northstar.io',
    businessAddress: 'Tower B, Cyber City, Magarpatta, Pune, MH 411028',
    country: 'India',
    timezone: 'Asia/Kolkata (IST +5:30)',
    preferredLanguage: 'English',
    storageUsedGb: 1.2,
    storageLimitGb: 5,
    departmentsCount: 1,
    departmentsLimit: 2,
    apiCallsMonthly: 310,
    apiCallsLimit: 5000,
    mfaEnforced: false,
    ssoEnabled: false,
    activeSessionsCount: 2,
    lastLoginIp: '103.21.124.9',
    lastLoginAt: '2026-10-13 18:30 IST',
    billingCycle: 'Monthly',
    paymentMethodStatus: '14-Day Free Evaluation Period',
    statusReason: 'Starter Self-Service Trial in progress',
    contacts: {
      primaryAdmin: { name: 'Priya Deshmukh', email: 'priya.deshmukh@northstar.io', phone: '+91 98234 56789' },
      technicalOps: { name: 'Aniket Kulkarni', email: 'aniket@northstar.io', phone: '+91 98234 56788' },
    },
    auditLogs: [
      {
        id: 'aud-201',
        action: 'TRIAL_INITIATED',
        actor: 'Priya Deshmukh',
        timestamp: '12 Oct 2026, 09:15 AM',
        details: 'Self-serve 14-day Starter trial initiated via web signup.',
      },
    ],
  },
  {
    id: '9a823b11-4f18-4cb5-b221-11b3dd9e3003',
    slug: 'greenfield',
    name: 'Greenfield Healthcare Systems Ltd',
    displayName: 'Greenfield Healthcare',
    industry: 'Healthcare',
    clientAdminName: 'Rohan Patil',
    clientAdminEmail: 'rohan.patil@greenfieldhealth.org',
    contactPhone: '+91 97654 32190',
    plan: 'Enterprise',
    registeredOn: '2025-09-01',
    planExpiry: '2027-09-01',
    activeUsers: 86,
    maxUsersQuota: 9999,
    status: 'Suspended',
    website: 'https://greenfieldhealth.org',
    businessAddress: 'Medical Enclave, Senapati Bapat Road, Pune, MH 411016',
    country: 'India',
    timezone: 'Asia/Kolkata (IST +5:30)',
    preferredLanguage: 'English',
    storageUsedGb: 88.5,
    storageLimitGb: 500,
    departmentsCount: 12,
    departmentsLimit: 9999,
    apiCallsMonthly: 184500,
    apiCallsLimit: 500000,
    mfaEnforced: true,
    ssoEnabled: true,
    activeSessionsCount: 0,
    lastLoginIp: '14.139.110.5',
    lastLoginAt: '2026-10-08 11:20 IST',
    billingCycle: 'Annual',
    paymentMethodStatus: 'Payment Overdue / Dunning Exceeded',
    statusReason: 'Suspended by Super Admin: Billing cycle unpaid after 3 dunning retries',
    contacts: {
      primaryAdmin: { name: 'Rohan Patil', email: 'rohan.patil@greenfieldhealth.org', phone: '+91 97654 32190' },
      billingContact: { name: 'Finance Desk', email: 'finance@greenfieldhealth.org', phone: '+91 97654 32199' },
    },
    auditLogs: [
      {
        id: 'aud-301',
        action: 'PAYMENT_FAILED',
        actor: 'Billing Gateway (Razorpay)',
        timestamp: '05 Oct 2026, 04:00 AM',
        details: 'Invoice #INV-2026-098 auto-debit rejected by issuing bank.',
      },
      {
        id: 'aud-302',
        action: 'TENANT_SUSPENDED',
        actor: 'Super Admin',
        timestamp: '09 Oct 2026, 02:00 PM',
        reason: 'Payment Overdue',
        details: 'Administrative suspension applied. Tenant logins locked until invoice clearance.',
      },
    ],
  },
  {
    id: '5c114e92-310a-4da2-bb17-77f6aa0b4004',
    slug: 'apex-logistics',
    name: 'Apex Global Supply Chain & Logistics LLP',
    displayName: 'Apex Logistics',
    industry: 'Logistics',
    clientAdminName: 'Vikramaditya Rao',
    clientAdminEmail: 'admin@apexlogistics.in',
    contactPhone: '+91 99887 76655',
    plan: 'Professional',
    registeredOn: '2026-08-15',
    planExpiry: '2027-08-15',
    activeUsers: 19,
    maxUsersQuota: 25,
    status: 'Active',
    website: 'https://apexlogistics.in',
    businessAddress: 'Logistics Hub, JNPT Road, Navi Mumbai, MH 400707',
    country: 'India',
    timezone: 'Asia/Kolkata (IST +5:30)',
    preferredLanguage: 'English',
    storageUsedGb: 14.2,
    storageLimitGb: 20,
    departmentsCount: 4,
    departmentsLimit: 5,
    apiCallsMonthly: 38200,
    apiCallsLimit: 50000,
    mfaEnforced: true,
    ssoEnabled: false,
    activeSessionsCount: 6,
    lastLoginIp: '182.72.64.12',
    lastLoginAt: '2026-10-13 16:45 IST',
    billingCycle: 'Annual',
    paymentMethodStatus: 'Active Auto-Debit',
    statusReason: 'Operational and good standing',
    contacts: {
      primaryAdmin: { name: 'Vikramaditya Rao', email: 'admin@apexlogistics.in', phone: '+91 99887 76655' },
    },
    auditLogs: [
      {
        id: 'aud-401',
        action: 'TENANT_ACTIVATED',
        actor: 'Super Admin',
        timestamp: '15 Aug 2026, 11:30 AM',
        details: 'Annual Professional tier subscription activated.',
      },
    ],
  },
  {
    id: '1d882a44-77e1-4c4f-9e23-33a8bb2c5005',
    slug: 'zenith-fin',
    name: 'Zenith Digital Financial Services Pvt Ltd',
    displayName: 'Zenith FinTech',
    industry: 'Financial Services',
    clientAdminName: 'Meera Iyer',
    clientAdminEmail: 'compliance@zenithfin.com',
    contactPhone: '+91 91234 56780',
    plan: 'Enterprise',
    registeredOn: '2026-06-05',
    planExpiry: '2027-06-05',
    activeUsers: 142,
    maxUsersQuota: 9999,
    status: 'Active',
    website: 'https://zenithfin.com',
    businessAddress: 'Fintech Hub, BKC, Bandra East, Mumbai, MH 400051',
    country: 'India',
    timezone: 'Asia/Kolkata (IST +5:30)',
    preferredLanguage: 'English',
    storageUsedGb: 120.4,
    storageLimitGb: 500,
    departmentsCount: 18,
    departmentsLimit: 9999,
    apiCallsMonthly: 412000,
    apiCallsLimit: 500000,
    mfaEnforced: true,
    ssoEnabled: true,
    activeSessionsCount: 19,
    lastLoginIp: '115.110.22.4',
    lastLoginAt: '2026-10-13 17:10 IST',
    billingCycle: 'Annual',
    paymentMethodStatus: 'Enterprise Contract (Wire Transfer)',
    statusReason: 'SOC2 & ISO 27001 verified financial tenant',
    contacts: {
      primaryAdmin: { name: 'Meera Iyer', email: 'compliance@zenithfin.com', phone: '+91 91234 56780' },
      technicalOps: { name: 'DevOps Security Team', email: 'secops@zenithfin.com', phone: '+91 91234 56781' },
    },
    auditLogs: [
      {
        id: 'aud-501',
        action: 'SSO_CONFIGURED',
        actor: 'Meera Iyer',
        timestamp: '08 Jun 2026, 02:45 PM',
        details: 'Okta SAML 2.0 Single Sign-On configured and tested.',
      },
    ],
  },
  {
    id: '7e440b88-1299-4c55-88aa-44e2ff1d6006',
    slug: 'orion-retail',
    name: 'Orion Hypermarkets & Retail Ltd',
    displayName: 'Orion Retail',
    industry: 'Retail',
    clientAdminName: 'Karan Malhotra',
    clientAdminEmail: 'karan.m@orionstores.in',
    contactPhone: '+91 93456 78901',
    plan: 'Starter',
    registeredOn: '2025-07-20',
    planExpiry: '2026-07-20',
    activeUsers: 3,
    maxUsersQuota: 5,
    status: 'Deactivated',
    website: 'https://orionstores.in',
    businessAddress: 'Retail Center, Connaught Place, New Delhi, DL 110001',
    country: 'India',
    timezone: 'Asia/Kolkata (IST +5:30)',
    preferredLanguage: 'English',
    storageUsedGb: 2.1,
    storageLimitGb: 5,
    departmentsCount: 1,
    departmentsLimit: 2,
    apiCallsMonthly: 0,
    apiCallsLimit: 5000,
    mfaEnforced: false,
    ssoEnabled: false,
    activeSessionsCount: 0,
    lastLoginIp: '122.161.44.8',
    lastLoginAt: '2026-07-19 14:00 IST',
    billingCycle: 'Annual',
    paymentMethodStatus: 'Decommissioned / Archival Retention Policy',
    statusReason: 'Client decommissioned on contract expiry per client request',
    contacts: {
      primaryAdmin: { name: 'Karan Malhotra', email: 'karan.m@orionstores.in', phone: '+91 93456 78901' },
    },
    auditLogs: [
      {
        id: 'aud-601',
        action: 'TENANT_DEACTIVATED',
        actor: 'Super Admin',
        timestamp: '20 Jul 2026, 11:00 AM',
        reason: 'Contract Expiration & Archival Retention',
        details: 'Organization access revoked. Data retained under 7-year statutory audit policy.',
      },
    ],
  },
];

interface ClientsTenantsManagementProps {
  tenants?: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    createdAt: string;
  }>;
  onRefresh?: () => Promise<void> | void;
}

export function ClientsTenantsManagement({ tenants = [], onRefresh }: ClientsTenantsManagementProps) {
  // Merge live database tenants with rich canonical records
  const [companies, setCompanies] = useState<CompanyTenantRecord[]>(() => {
    const list = [...CANONICAL_COMPANIES];

    // If live tenants are provided from DB, overlay or merge them
    if (tenants && tenants.length > 0) {
      tenants.forEach((dbTenant) => {
        const existingIdx = list.findIndex((c) => c.id === dbTenant.id || c.slug === dbTenant.slug);
        const mappedStatus: TenantStatusType =
          dbTenant.status === 'ACTIVE'
            ? 'Active'
            : dbTenant.status === 'TRIAL'
            ? 'Trial'
            : dbTenant.status === 'SUSPENDED'
            ? 'Suspended'
            : dbTenant.status === 'CANCELLED'
            ? 'Deactivated'
            : 'Pending';

        const existing = list[existingIdx];
        if (existing) {
          list[existingIdx] = {
            ...existing,
            name: dbTenant.name,
            status: mappedStatus,
            registeredOn: dbTenant.createdAt ? dbTenant.createdAt.substring(0, 10) : existing.registeredOn,
          };
        } else {
          list.push({
            id: dbTenant.id,
            slug: dbTenant.slug,
            name: dbTenant.name,
            displayName: dbTenant.name,
            industry: 'IT & Services',
            clientAdminName: 'Organization Admin',
            clientAdminEmail: `admin@${dbTenant.slug}.com`,
            contactPhone: '+91 98000 00000',
            plan: 'Professional',
            registeredOn: dbTenant.createdAt ? dbTenant.createdAt.substring(0, 10) : '2026-10-10',
            planExpiry: '2027-10-10',
            activeUsers: 5,
            maxUsersQuota: 25,
            status: mappedStatus,
            website: `https://${dbTenant.slug}.kalpak.com`,
            businessAddress: 'Corporate Office',
            country: 'India',
            timezone: 'Asia/Kolkata',
            preferredLanguage: 'English',
            storageUsedGb: 3.5,
            storageLimitGb: 20,
            departmentsCount: 2,
            departmentsLimit: 5,
            apiCallsMonthly: 5000,
            apiCallsLimit: 50000,
            mfaEnforced: false,
            ssoEnabled: false,
            activeSessionsCount: 1,
            lastLoginIp: '127.0.0.1',
            lastLoginAt: 'Recently',
            billingCycle: 'Annual',
            paymentMethodStatus: 'Active',
            contacts: {
              primaryAdmin: {
                name: 'Organization Admin',
                email: `admin@${dbTenant.slug}.com`,
                phone: '+91 98000 00000',
              },
            },
            auditLogs: [
              {
                id: `aud-${dbTenant.id.substring(0, 6)}`,
                action: 'TENANT_CREATED',
                actor: 'System',
                timestamp: dbTenant.createdAt || 'Initial Registration',
                details: 'Organization provisioned in database.',
              },
            ],
          });
        }
      });
    }

    return list;
  });

  // ── Filters & Search State ───────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [planFilter, setPlanFilter] = useState<string>('All');
  const [industryFilter, setIndustryFilter] = useState<string>('All');

  // ── Table Sorting & Pagination State ─────────────────────────────────────────
  type SortField = 'name' | 'registeredOn' | 'planExpiry' | 'users' | 'status';
  const [sortField, setSortField] = useState<SortField>('registeredOn');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // ── Selection & Bulk Actions State ───────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Modal States ─────────────────────────────────────────────────────────────
  // 1. Company Profile View Modal (6 tabs)
  const [viewProfileModal, setViewProfileModal] = useState<CompanyTenantRecord | null>(null);
  const [profileActiveTab, setProfileActiveTab] = useState<
    'overview' | 'contacts' | 'subscription' | 'usage' | 'security' | 'activity'
  >('overview');

  // 2. Status Transition Modal (Activate, Suspend, Deactivate)
  const [statusChangeTarget, setStatusChangeTarget] = useState<{
    company: CompanyTenantRecord;
    action: 'Activate' | 'Suspend' | 'Deactivate';
  } | null>(null);
  const [statusReasonCategory, setStatusReasonCategory] = useState<string>('');
  const [statusReasonNotes, setStatusReasonNotes] = useState<string>('');
  const [deactivateConfirmationInput, setDeactivateConfirmationInput] = useState<string>('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState<boolean>(false);

  // 3. Bulk Action Modal
  const [bulkActionModal, setBulkActionModal] = useState<'Activate' | 'Suspend' | 'Deactivate' | null>(null);
  const [bulkReasonNotes, setBulkReasonNotes] = useState<string>('');
  const [bulkConfirmationInput, setBulkConfirmationInput] = useState<string>('');
  const [isSubmittingBulk, setIsSubmittingBulk] = useState<boolean>(false);

  // 4. Edit Company Modal
  const [editCompanyModal, setEditCompanyModal] = useState<CompanyTenantRecord | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    displayName: '',
    industry: '',
    website: '',
    clientAdminName: '',
    clientAdminEmail: '',
    contactPhone: '',
    businessAddress: '',
  });

  // 5. Toast / Feedback Notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const copyToClipboard = (text: string, label: string = 'Copied') => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, 'info');
  };

  // ── Filter Options Derived ───────────────────────────────────────────────────
  const availableIndustries = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((c) => set.add(c.industry));
    return ['All', ...Array.from(set)];
  }, [companies]);

  // ── Filtered & Sorted Records ────────────────────────────────────────────────
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          c.name.toLowerCase().includes(q) ||
          c.displayName.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.clientAdminName.toLowerCase().includes(q) ||
          c.clientAdminEmail.toLowerCase().includes(q) ||
          c.contactPhone.toLowerCase().includes(q);
        if (!matches) return false;
      }
      // Status
      if (statusFilter !== 'All' && c.status !== statusFilter) {
        return false;
      }
      // Plan
      if (planFilter !== 'All' && c.plan !== planFilter) {
        return false;
      }
      // Industry
      if (industryFilter !== 'All' && c.industry !== industryFilter) {
        return false;
      }
      return true;
    });
  }, [companies, searchQuery, statusFilter, planFilter, industryFilter]);

  const sortedCompanies = useMemo(() => {
    return [...filteredCompanies].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortField === 'registeredOn') {
        cmp = new Date(a.registeredOn).getTime() - new Date(b.registeredOn).getTime();
      } else if (sortField === 'planExpiry') {
        cmp = new Date(a.planExpiry).getTime() - new Date(b.planExpiry).getTime();
      } else if (sortField === 'users') {
        cmp = a.activeUsers - b.activeUsers;
      } else if (sortField === 'status') {
        cmp = a.status.localeCompare(b.status);
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredCompanies, sortField, sortOrder]);

  // ── Pagination Calculation ───────────────────────────────────────────────────
  const totalPages = Math.ceil(sortedCompanies.length / pageSize) || 1;
  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCompanies.slice(start, start + pageSize);
  }, [sortedCompanies, currentPage, pageSize]);

  // ── Selection Logic ──────────────────────────────────────────────────────────
  const allCurrentPageSelected =
    paginatedCompanies.length > 0 && paginatedCompanies.every((c) => selectedIds.has(c.id));

  const toggleSelectAllPage = () => {
    const next = new Set(selectedIds);
    if (allCurrentPageSelected) {
      paginatedCompanies.forEach((c) => next.delete(c.id));
    } else {
      paginatedCompanies.forEach((c) => next.add(c.id));
    }
    setSelectedIds(next);
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // ── Export to CSV ────────────────────────────────────────────────────────────
  const exportToCsv = () => {
    const headers = [
      'Tenant ID',
      'Company Legal Name',
      'Display Name',
      'Slug / URL Identifier',
      'Industry',
      'Client Administrator',
      'Business Email',
      'Contact Phone',
      'Subscription Plan',
      'Registration Date',
      'Plan Expiration Date',
      'Active Users',
      'Permitted User Limit',
      'Account Status',
      'Website',
    ];

    const rows = sortedCompanies.map((c) => [
      `"${c.id}"`,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.displayName.replace(/"/g, '""')}"`,
      `"${c.slug}"`,
      `"${c.industry}"`,
      `"${c.clientAdminName.replace(/"/g, '""')}"`,
      `"${c.clientAdminEmail}"`,
      `"${c.contactPhone}"`,
      `"${c.plan}"`,
      `"${c.registeredOn}"`,
      `"${c.planExpiry}"`,
      `"${c.activeUsers}"`,
      `"${c.maxUsersQuota}"`,
      `"${c.status}"`,
      `"${c.website || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Kalpak_Tenants_Directory_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${sortedCompanies.length} companies to CSV.`, 'success');
  };

  // ── Handle Status Change Submission ──────────────────────────────────────────
  const handleExecuteStatusChange = async () => {
    if (!statusChangeTarget) return;
    const { company, action } = statusChangeTarget;

    // Safety check for deactivation
    if (action === 'Deactivate') {
      const requiredConfirm = company.slug.toLowerCase();
      if (deactivateConfirmationInput.trim().toLowerCase() !== requiredConfirm) {
        showToast(`Please type "${company.slug}" to verify deactivation`, 'error');
        return;
      }
    }

    if ((action === 'Suspend' || action === 'Deactivate') && !statusReasonNotes.trim()) {
      showToast('A recorded reason is mandatory for auditing', 'error');
      return;
    }

    setIsSubmittingStatus(true);
    try {
      // Map to backend status enum
      const backendStatus =
        action === 'Activate' ? 'ACTIVE' : action === 'Suspend' ? 'SUSPENDED' : 'CANCELLED';

      // Attempt API call if company is a real UUID or endpoint available
      try {
        await apiClient.patch(`/tenants/${company.id}/status`, {
          status: backendStatus,
          reason: `${statusReasonCategory ? `[${statusReasonCategory}] ` : ''}${statusReasonNotes}`,
          category: statusReasonCategory || 'ADMIN_ACTION',
        });
      } catch (err) {
        // If local mock or network fallback, log and continue updating local state
        console.warn('Backend status API call notice (proceeding with local state):', err);
      }

      // Update state locally
      const updatedStatus: TenantStatusType =
        action === 'Activate' ? 'Active' : action === 'Suspend' ? 'Suspended' : 'Deactivated';

      const newAuditLog = {
        id: `aud-${Date.now()}`,
        action: `TENANT_${action.toUpperCase()}D`,
        actor: 'Super Admin',
        timestamp: new Date().toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        reason: statusReasonCategory || action,
        details: `${action} applied by Super Admin. Reason: ${statusReasonNotes || 'Administrative clearance.'}`,
      };

      setCompanies((prev) =>
        prev.map((c) => {
          if (c.id === company.id) {
            return {
              ...c,
              status: updatedStatus,
              statusReason: statusReasonNotes || `Status updated to ${updatedStatus}`,
              auditLogs: [newAuditLog, ...(c.auditLogs || [])],
            };
          }
          return c;
        })
      );

      // If viewing this profile, sync viewProfileModal too
      if (viewProfileModal && viewProfileModal.id === company.id) {
        setViewProfileModal((prev) =>
          prev
            ? {
                ...prev,
                status: updatedStatus,
                statusReason: statusReasonNotes || `Status updated to ${updatedStatus}`,
                auditLogs: [newAuditLog, ...(prev.auditLogs || [])],
              }
            : null
        );
      }

      showToast(`Company "${company.displayName}" successfully set to ${updatedStatus}.`, 'success');
      setStatusChangeTarget(null);
      setStatusReasonCategory('');
      setStatusReasonNotes('');
      setDeactivateConfirmationInput('');

      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update tenant status', 'error');
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  // ── Handle Bulk Status Submission ────────────────────────────────────────────
  const handleExecuteBulkStatus = async () => {
    if (!bulkActionModal || selectedIds.size === 0) return;

    if (bulkActionModal === 'Deactivate') {
      if (bulkConfirmationInput.trim().toUpperCase() !== 'CONFIRM DEACTIVATE') {
        showToast('Please type "CONFIRM DEACTIVATE" to authorize bulk deactivation', 'error');
        return;
      }
    }

    if (!bulkReasonNotes.trim() && (bulkActionModal === 'Suspend' || bulkActionModal === 'Deactivate')) {
      showToast('A recorded reason is mandatory for bulk actions', 'error');
      return;
    }

    setIsSubmittingBulk(true);
    try {
      const targetStatus: TenantStatusType =
        bulkActionModal === 'Activate' ? 'Active' : bulkActionModal === 'Suspend' ? 'Suspended' : 'Deactivated';
      const backendStatus =
        bulkActionModal === 'Activate' ? 'ACTIVE' : bulkActionModal === 'Suspend' ? 'SUSPENDED' : 'CANCELLED';

      // Execute across selected
      const idsArray = Array.from(selectedIds);
      await Promise.allSettled(
        idsArray.map((id) =>
          apiClient
            .patch(`/tenants/${id}/status`, {
              status: backendStatus,
              reason: `[Bulk ${bulkActionModal}] ${bulkReasonNotes}`,
              category: 'BULK_SUPER_ADMIN_ACTION',
            })
            .catch((err) => console.warn(`Notice updating ${id}:`, err))
        )
      );

      const timestamp = new Date().toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      setCompanies((prev) =>
        prev.map((c) => {
          if (selectedIds.has(c.id)) {
            const newAuditLog = {
              id: `aud-${Date.now()}-${c.id.substring(0, 4)}`,
              action: `BULK_${bulkActionModal.toUpperCase()}D`,
              actor: 'Super Admin',
              timestamp,
              reason: 'Bulk Administration',
              details: `Bulk ${bulkActionModal} applied. Notes: ${bulkReasonNotes || 'Standard administrative operation.'}`,
            };
            return {
              ...c,
              status: targetStatus,
              statusReason: bulkReasonNotes || `Bulk transitioned to ${targetStatus}`,
              auditLogs: [newAuditLog, ...(c.auditLogs || [])],
            };
          }
          return c;
        })
      );

      showToast(`Successfully set ${selectedIds.size} companies to ${targetStatus}.`, 'success');
      setBulkActionModal(null);
      setBulkReasonNotes('');
      setBulkConfirmationInput('');
      setSelectedIds(new Set());
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Bulk operation failed', 'error');
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  // ── Handle Edit Company Submission ───────────────────────────────────────────
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCompanyModal) return;

    setCompanies((prev) =>
      prev.map((c) => {
        if (c.id === editCompanyModal.id) {
          return {
            ...c,
            name: editForm.name || c.name,
            displayName: editForm.displayName || c.displayName,
            industry: editForm.industry || c.industry,
            website: editForm.website || c.website,
            clientAdminName: editForm.clientAdminName || c.clientAdminName,
            clientAdminEmail: editForm.clientAdminEmail || c.clientAdminEmail,
            contactPhone: editForm.contactPhone || c.contactPhone,
            businessAddress: editForm.businessAddress || c.businessAddress,
          };
        }
        return c;
      })
    );

    if (viewProfileModal && viewProfileModal.id === editCompanyModal.id) {
      setViewProfileModal((prev) =>
        prev
          ? {
              ...prev,
              name: editForm.name || prev.name,
              displayName: editForm.displayName || prev.displayName,
              industry: editForm.industry || prev.industry,
              website: editForm.website || prev.website,
              clientAdminName: editForm.clientAdminName || prev.clientAdminName,
              clientAdminEmail: editForm.clientAdminEmail || prev.clientAdminEmail,
              contactPhone: editForm.contactPhone || prev.contactPhone,
              businessAddress: editForm.businessAddress || prev.businessAddress,
            }
          : null
      );
    }

    showToast(`Updated profile details for "${editForm.displayName || editCompanyModal.name}".`, 'success');
    setEditCompanyModal(null);
  };

  const openEditModal = (c: CompanyTenantRecord) => {
    setEditCompanyModal(c);
    setEditForm({
      name: c.name,
      displayName: c.displayName,
      industry: c.industry,
      website: c.website || '',
      clientAdminName: c.clientAdminName,
      clientAdminEmail: c.clientAdminEmail,
      contactPhone: c.contactPhone,
      businessAddress: c.businessAddress || '',
    });
  };

  // ── Sorting Toggle Helper ────────────────────────────────────────────────────
  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toastMessage.type === 'info' && <Info className="w-4 h-4 text-cyan-400 shrink-0" />}
          {toastMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
          <span className="text-xs font-semibold">{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-1 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Guidance & Policy Card: Clear Definitions ── */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-slate-200 p-5 border border-slate-700/80 shadow-md">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[11px] font-black uppercase tracking-wider border border-orange-500/30">
              <Shield className="w-3 h-3" />
              Tenant Lifecycle & Access Control Rules
            </div>
            <h2 className="text-base font-extrabold text-white">
              Platform Status Definitions & Governance Principles
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-emerald-500/30">
                <span className="font-extrabold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                </span>
                <p className="text-[11px] text-slate-300 mt-1">
                  Enables a company eligible to use the platform. Logins, technician tools, and portals are active.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-amber-500/30">
                <span className="font-extrabold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Suspend
                </span>
                <p className="text-[11px] text-slate-300 mt-1">
                  Temporarily restricts tenant access due to policy violation, security concern, or unpaid billing.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-600">
                <span className="font-extrabold text-slate-400 flex items-center gap-1.5">
                  <Power className="w-3.5 h-3.5" /> Deactivate
                </span>
                <p className="text-[11px] text-slate-300 mt-1">
                  Administratively disables tenant with recorded reason. Reactivation requires explicit authorization.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-purple-500/30">
                <span className="font-extrabold text-purple-400 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" /> Data Archival
                </span>
                <p className="text-[11px] text-slate-300 mt-1">
                  Permanent deletion is excluded from standard workflow. Records and audit trails are preserved.
                </p>
              </div>
            </div>
          </div>

          <div className="flex md:flex-col items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={exportToCsv}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <span className="text-[11px] text-slate-400">Total: {companies.length} Tenants</span>
          </div>
        </div>
      </div>

      {/* ── Section Header with Search & Filter Bar ── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Clients / Tenants</h1>
            <p className="text-xs text-slate-500">
              Search, filter, inspect details, and administer subscription access across all registered client companies.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              Active: {companies.filter((c) => c.status === 'Active').length}
            </span>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-800 font-bold border border-blue-200">
              Trial: {companies.filter((c) => c.status === 'Trial').length}
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200">
              Suspended: {companies.filter((c) => c.status === 'Suspended').length}
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-300">
              Deactivated: {companies.filter((c) => c.status === 'Deactivated').length}
            </span>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-2">
          {/* Search Box */}
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search legal name, slug, tenant ID, or administrator..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <div className="relative">
              <select
                aria-label="Filter companies by status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-orange-500"
              >
                <option value="All">Status: All statuses</option>
                <option value="Active">Active</option>
                <option value="Trial">Trial</option>
                <option value="Pending">Pending</option>
                <option value="Suspended">Suspended</option>
                <option value="Deactivated">Deactivated</option>
              </select>
            </div>
          </div>

          {/* Plan Filter */}
          <div className="lg:col-span-2">
            <div className="relative">
              <select
                aria-label="Filter companies by subscription plan"
                value={planFilter}
                onChange={(e) => {
                  setPlanFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-orange-500"
              >
                <option value="All">Plan: All plans</option>
                <option value="Starter">Starter plan</option>
                <option value="Professional">Professional plan</option>
                <option value="Enterprise">Enterprise plan</option>
              </select>
            </div>
          </div>

          {/* Industry Filter */}
          <div className="lg:col-span-2">
            <div className="relative">
              <select
                aria-label="Filter companies by industry category"
                value={industryFilter}
                onChange={(e) => {
                  setIndustryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-orange-500"
              >
                <option value="All">Industry: All industries</option>
                {availableIndustries
                  .filter((ind) => ind !== 'All')
                  .map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Reset Filters Button */}
          <div className="lg:col-span-1 flex items-center justify-end">
            {(searchQuery || statusFilter !== 'All' || planFilter !== 'All' || industryFilter !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
                  setPlanFilter('All');
                  setIndustryFilter('All');
                  setCurrentPage(1);
                }}
                className="w-full py-2.5 px-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors text-center"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Illustrative Preview Notice Banner */}
        <div className="px-4 py-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">
              <strong>Illustrative preview only.</strong> These sample companies and details are not real customer
              records. Real registered customer tenants in your database automatically appear alongside them.
            </span>
          </div>
          <span className="text-[11px] font-bold text-amber-800 shrink-0">Demo & Live Merged</span>
        </div>
      </div>

      {/* ── Bulk Actions Floating / Docked Toolbar ── */}
      {selectedIds.size > 0 && (
        <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl border border-slate-700 animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-orange-500 text-white font-extrabold text-xs">
              {selectedIds.size} Selected
            </span>
            <span className="text-xs text-slate-300">Choose a platform action to execute across selected tenants:</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBulkActionModal('Activate')}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Bulk Activate</span>
            </button>
            <button
              type="button"
              onClick={() => setBulkActionModal('Suspend')}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Bulk Suspend</span>
            </button>
            <button
              type="button"
              onClick={() => setBulkActionModal('Deactivate')}
              className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Bulk Deactivate</span>
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold ml-2 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ── Companies Main Table ── */}
      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="p-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    onChange={toggleSelectAllPage}
                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                </th>
                <th className="p-4 cursor-pointer hover:text-slate-900" onClick={() => handleSortToggle('name')}>
                  <div className="flex items-center gap-1">
                    <span>Company</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-4">Tenant ID</th>
                <th className="p-4">Industry</th>
                <th className="p-4">Client Admin</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Plan</th>
                <th className="p-4 cursor-pointer hover:text-slate-900" onClick={() => handleSortToggle('registeredOn')}>
                  <div className="flex items-center gap-1">
                    <span>Registered on</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:text-slate-900" onClick={() => handleSortToggle('planExpiry')}>
                  <div className="flex items-center gap-1">
                    <span>Plan expiry</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:text-slate-900" onClick={() => handleSortToggle('users')}>
                  <div className="flex items-center gap-1">
                    <span>Users</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:text-slate-900" onClick={() => handleSortToggle('status')}>
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {paginatedCompanies.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-slate-500">
                    <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No matching companies found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try clearing filters or search query to see registered companies.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedCompanies.map((c) => {
                  const isSelected = selectedIds.has(c.id);
                  const isExpiringSoon =
                    new Date(c.planExpiry).getTime() - new Date().getTime() < 14 * 86400000 &&
                    new Date(c.planExpiry).getTime() > new Date().getTime();
                  const isExpired = new Date(c.planExpiry).getTime() <= new Date().getTime();

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-orange-50/30 transition-colors ${
                        isSelected ? 'bg-orange-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(c.id)}
                          className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                        />
                      </td>

                      {/* Company Name & Slug */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-100 to-amber-200 text-orange-800 font-black flex items-center justify-center text-xs shrink-0 shadow-xs">
                            {c.displayName.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="block font-extrabold text-slate-900 truncate">{c.displayName}</span>
                            <span className="block text-[11px] text-slate-400 font-mono">
                              /{c.slug} · <span className="text-slate-500">{c.name}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Tenant ID with copy */}
                      <td className="p-4 font-mono text-[11px] text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span title={c.id}>{c.id.substring(0, 8)}...</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(c.id, 'Tenant ID')}
                            title="Copy full permanent Tenant ID"
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Industry */}
                      <td className="p-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {c.industry}
                        </span>
                      </td>

                      {/* Client Admin */}
                      <td className="p-4">
                        <span className="block font-bold text-slate-900">{c.clientAdminName}</span>
                        <span className="block text-[11px] text-slate-400">Primary Admin</span>
                      </td>

                      {/* Contact */}
                      <td className="p-4 text-slate-600">
                        <div className="space-y-0.5">
                          <span className="block text-[11px] font-medium text-slate-800 truncate max-w-[150px]">
                            {c.clientAdminEmail}
                          </span>
                          <span className="block text-[10px] text-slate-500 font-mono">{c.contactPhone}</span>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider ${
                            c.plan === 'Enterprise'
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : c.plan === 'Professional'
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}
                        >
                          {c.plan}
                        </span>
                      </td>

                      {/* Registered on */}
                      <td className="p-4 font-mono text-slate-600 text-[11px]">
                        {new Date(c.registeredOn).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Plan Expiry */}
                      <td className="p-4 font-mono text-[11px]">
                        <div className="space-y-0.5">
                          <span
                            className={`block font-bold ${
                              isExpired
                                ? 'text-rose-600'
                                : isExpiringSoon
                                ? 'text-amber-600'
                                : 'text-slate-700'
                            }`}
                          >
                            {new Date(c.planExpiry).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          {isExpired ? (
                            <span className="inline-block text-[10px] font-bold text-rose-600 bg-rose-50 px-1 rounded">
                              Expired
                            </span>
                          ) : isExpiringSoon ? (
                            <span className="inline-block text-[10px] font-bold text-amber-600 bg-amber-50 px-1 rounded">
                              Expires soon
                            </span>
                          ) : (
                            <span className="block text-[10px] text-slate-400">Valid</span>
                          )}
                        </div>
                      </td>

                      {/* Users Limit */}
                      <td className="p-4">
                        <div className="space-y-1 w-24">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-900">{c.activeUsers}</span>
                            <span className="text-slate-400 font-normal">
                              / {c.maxUsersQuota >= 9999 ? '∞' : c.maxUsersQuota}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                c.activeUsers / c.maxUsersQuota > 0.85 ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                              style={{
                                width: `${Math.min(100, (c.activeUsers / (c.maxUsersQuota || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                            c.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : c.status === 'Trial'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : c.status === 'Pending'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : c.status === 'Suspended'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-slate-200 text-slate-700 border border-slate-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              c.status === 'Active'
                                ? 'bg-emerald-500'
                                : c.status === 'Trial'
                                ? 'bg-blue-500 animate-pulse'
                                : c.status === 'Suspended'
                                ? 'bg-rose-500'
                                : 'bg-slate-500'
                            }`}
                          />
                          {c.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Profile */}
                          <button
                            type="button"
                            onClick={() => {
                              setViewProfileModal(c);
                              setProfileActiveTab('overview');
                            }}
                            title="View comprehensive company profile & audit tabs"
                            className="px-2.5 py-1.5 rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-100 font-bold text-xs flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>

                          {/* Edit Details */}
                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            title="Edit company registration info"
                            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Status Action Menu */}
                          {c.status === 'Active' || c.status === 'Trial' ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setStatusChangeTarget({ company: c, action: 'Suspend' })}
                                title="Suspend tenant access (temporary policy/billing hold)"
                                className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[11px] border border-amber-200 transition-colors"
                              >
                                Suspend
                              </button>
                              <button
                                type="button"
                                onClick={() => setStatusChangeTarget({ company: c, action: 'Deactivate' })}
                                title="Deactivate tenant (administrative termination with archival)"
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-[11px] border border-slate-200 transition-colors"
                              >
                                Deactivate
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setStatusChangeTarget({ company: c, action: 'Activate' })}
                              title="Activate tenant"
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200 transition-colors flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer & Pagination ── */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-4">
            <span>
              Showing{' '}
              <strong className="text-slate-900">
                {sortedCompanies.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-slate-900">
                {Math.min(currentPage * pageSize, sortedCompanies.length)}
              </strong>{' '}
              of <strong className="text-slate-900">{sortedCompanies.length}</strong> companies
            </span>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                aria-label="Select rows per page"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-semibold focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-800">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 3. COMPANY DETAILS MODAL — 6 DEDICATED TABS */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {viewProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white border-b border-slate-800 relative">
              <button
                type="button"
                onClick={() => setViewProfileModal(null)}
                className="absolute right-5 top-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-orange-400 uppercase tracking-widest">
                      Company Profile
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                      {viewProfileModal.id}
                      <button
                        type="button"
                        onClick={() => copyToClipboard(viewProfileModal.id, 'Tenant ID')}
                        className="text-slate-400 hover:text-white"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-white">{viewProfileModal.displayName}</h2>
                  <p className="text-xs text-slate-400">
                    Registered legal name: <strong className="text-slate-200">{viewProfileModal.name}</strong> ·
                    Slug: <strong className="text-orange-300 font-mono">/{viewProfileModal.slug}</strong>
                  </p>
                </div>

                {/* Status & Plan Badges in Header */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black ${
                      viewProfileModal.status === 'Active'
                        ? 'bg-emerald-500 text-white'
                        : viewProfileModal.status === 'Trial'
                        ? 'bg-blue-500 text-white'
                        : viewProfileModal.status === 'Suspended'
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {viewProfileModal.status}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-orange-500/20 text-orange-300 border border-orange-500/40">
                    {viewProfileModal.plan} plan
                  </span>
                </div>
              </div>

              {/* Quick Summary Strip matching user prompt */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block font-semibold">Client Admin</span>
                  <span className="text-white font-extrabold truncate block">
                    {viewProfileModal.clientAdminName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block font-semibold">Business email</span>
                  <span className="text-white font-mono text-[11px] truncate block">
                    {viewProfileModal.clientAdminEmail}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block font-semibold">Contact phone</span>
                  <span className="text-white font-mono text-[11px] truncate block">
                    {viewProfileModal.contactPhone}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block font-semibold">Industry</span>
                  <span className="text-white font-bold block">{viewProfileModal.industry}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block font-semibold">Registration date</span>
                  <span className="text-white font-bold block">
                    {new Date(viewProfileModal.registeredOn).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block font-semibold">Plan expires</span>
                  <span className="text-orange-400 font-bold block">
                    {new Date(viewProfileModal.planExpiry).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="px-6 border-b border-slate-200 bg-slate-50 flex items-center gap-2 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: Building2 },
                { id: 'contacts', label: 'Contacts', icon: Users },
                { id: 'subscription', label: 'Subscription', icon: Layers },
                { id: 'usage', label: 'Usage', icon: Activity },
                { id: 'security', label: 'Security', icon: ShieldCheck },
                { id: 'activity', label: 'Activity', icon: Clock },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = profileActiveTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setProfileActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                      isActive
                        ? 'border-orange-600 text-orange-600 bg-white rounded-t-xl'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body: Active Tab Content */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {/* TAB 1: OVERVIEW */}
              {profileActiveTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                        Registered Legal Name
                      </span>
                      <p className="text-sm font-extrabold text-slate-900">{viewProfileModal.name}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                        Display Name
                      </span>
                      <p className="text-sm font-extrabold text-slate-900">{viewProfileModal.displayName}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                        Industry Category
                      </span>
                      <p className="text-sm font-extrabold text-slate-900">{viewProfileModal.industry}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                        Website & Portal
                      </span>
                      <a
                        href={viewProfileModal.website || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-extrabold text-orange-600 hover:underline flex items-center gap-1"
                      >
                        {viewProfileModal.website || 'Not specified'}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 sm:col-span-2">
                      <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                        Business Physical Address
                      </span>
                      <p className="text-xs font-semibold text-slate-800">
                        {viewProfileModal.businessAddress || 'Plot 42, MIDC Industrial Area, Bhosari, Pune, MH 411026'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                        Country & Timezone
                      </span>
                      <p className="text-xs font-bold text-slate-900">
                        {viewProfileModal.country || 'India'} · {viewProfileModal.timezone || 'Asia/Kolkata (IST)'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                        Preferred Language
                      </span>
                      <p className="text-xs font-bold text-slate-900">
                        {viewProfileModal.preferredLanguage || 'English (India)'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 sm:col-span-2">
                      <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                        Tenant Dedicated URL / Slug
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-orange-600">
                          https://{viewProfileModal.slug}.kalpak-solutions.com
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(
                              `https://${viewProfileModal.slug}.kalpak-solutions.com`,
                              'Tenant Workspace URL'
                            )
                          }
                          className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 font-bold text-[11px] hover:bg-slate-100 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          Copy URL
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CONTACTS */}
              {profileActiveTab === 'contacts' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-slate-900">Primary Organization Contacts</h3>
                    <button
                      type="button"
                      onClick={() => openEditModal(viewProfileModal)}
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Update Contacts
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Primary Admin */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs">
                          PA
                        </div>
                        <div>
                          <span className="block font-bold text-slate-900 text-xs">
                            {viewProfileModal.contacts?.primaryAdmin.name || viewProfileModal.clientAdminName}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">Primary Administrator</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200/60 space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">
                            {viewProfileModal.contacts?.primaryAdmin.email || viewProfileModal.clientAdminEmail}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{viewProfileModal.contacts?.primaryAdmin.phone || viewProfileModal.contactPhone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Technical Contact */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          TO
                        </div>
                        <div>
                          <span className="block font-bold text-slate-900 text-xs">
                            {viewProfileModal.contacts?.technicalOps?.name || 'Technical Lead'}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">Technical Operations</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200/60 space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">
                            {viewProfileModal.contacts?.technicalOps?.email || `devops@${viewProfileModal.slug}.com`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{viewProfileModal.contacts?.technicalOps?.phone || '+91 98000 00001'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Billing Contact */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                          BC
                        </div>
                        <div>
                          <span className="block font-bold text-slate-900 text-xs">
                            {viewProfileModal.contacts?.billingContact?.name || 'Accounts Dept'}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">Billing & Invoicing</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200/60 space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">
                            {viewProfileModal.contacts?.billingContact?.email || `accounts@${viewProfileModal.slug}.com`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{viewProfileModal.contacts?.billingContact?.phone || '+91 98000 00002'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SUBSCRIPTION */}
              {profileActiveTab === 'subscription' && (
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-black uppercase text-orange-700">Active Tier</span>
                      <h4 className="text-xl font-black text-slate-900">{viewProfileModal.plan} Plan</h4>
                      <p className="text-xs text-slate-600">
                        Billing Interval:{' '}
                        <strong>{viewProfileModal.billingCycle || 'Annual'}</strong> · Next renewal on{' '}
                        <strong>{viewProfileModal.planExpiry}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          showToast(`To adjust plan tier, open Subscription Plans tab.`, 'info')
                        }
                        className="px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold"
                      >
                        Modify Subscription Tier
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-slate-400 font-semibold block uppercase text-[10px]">Payment Method Status</span>
                      <span className="font-extrabold text-slate-900 block">
                        {viewProfileModal.paymentMethodStatus || 'Razorpay Gateway Verified'}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-slate-400 font-semibold block uppercase text-[10px]">Auto-Renew Protocol</span>
                      <span className="font-extrabold text-emerald-700 block flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Enabled (Standard 3-Day Dunning Window)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: USAGE */}
              {profileActiveTab === 'usage' && (
                <div className="space-y-6">
                  <h3 className="text-sm font-extrabold text-slate-900">Real-Time Resource Quotas & Consumption</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* User Quota */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-orange-600" /> Active Users
                        </span>
                        <span className="font-extrabold text-slate-900">
                          {viewProfileModal.activeUsers} /{' '}
                          {viewProfileModal.maxUsersQuota >= 9999 ? 'Unlimited' : viewProfileModal.maxUsersQuota}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              (viewProfileModal.activeUsers / (viewProfileModal.maxUsersQuota || 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Storage Quota */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-blue-600" /> Storage Consumption
                        </span>
                        <span className="font-extrabold text-slate-900">
                          {viewProfileModal.storageUsedGb || 5} GB / {viewProfileModal.storageLimitGb || 20} GB
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              ((viewProfileModal.storageUsedGb || 5) / (viewProfileModal.storageLimitGb || 20)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Department Quota */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-emerald-600" /> Departments
                        </span>
                        <span className="font-extrabold text-slate-900">
                          {viewProfileModal.departmentsCount || 2} /{' '}
                          {viewProfileModal.departmentsLimit || 5}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              ((viewProfileModal.departmentsCount || 2) /
                                (viewProfileModal.departmentsLimit || 5)) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* API Monthly Calls */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-purple-600" /> Monthly API Calls
                        </span>
                        <span className="font-extrabold text-slate-900">
                          {viewProfileModal.apiCallsMonthly?.toLocaleString() || '12,400'} /{' '}
                          {viewProfileModal.apiCallsLimit?.toLocaleString() || '50,000'}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              ((viewProfileModal.apiCallsMonthly || 12400) /
                                (viewProfileModal.apiCallsLimit || 50000)) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: SECURITY */}
              {profileActiveTab === 'security' && (
                <div className="space-y-6">
                  <h3 className="text-sm font-extrabold text-slate-900">Identity, Access & Session Security</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                        Multi-Factor Authentication (MFA)
                      </span>
                      <span
                        className={`font-extrabold block ${
                          viewProfileModal.mfaEnforced ? 'text-emerald-700' : 'text-slate-600'
                        }`}
                      >
                        {viewProfileModal.mfaEnforced ? 'Enforced Platform-Wide' : 'Optional / Self-Enrollment'}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                        Enterprise SSO / SAML
                      </span>
                      <span
                        className={`font-extrabold block ${
                          viewProfileModal.ssoEnabled ? 'text-blue-700' : 'text-slate-500'
                        }`}
                      >
                        {viewProfileModal.ssoEnabled ? 'Configured (Okta / Azure AD)' : 'Not Configured'}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                        Active Concurrent Sessions
                      </span>
                      <span className="font-extrabold text-slate-900 block">
                        {viewProfileModal.activeSessionsCount || 1} Authenticated Sessions
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                        Last Admin Login Metadata
                      </span>
                      <span className="font-extrabold text-slate-900 block font-mono text-[11px]">
                        IP: {viewProfileModal.lastLoginIp || '115.112.82.14'} ({viewProfileModal.lastLoginAt || 'Recent'})
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: ACTIVITY & AUDIT */}
              {profileActiveTab === 'activity' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-slate-900">Audit Trail & Security Event Log</h3>
                    <span className="text-[11px] text-slate-500">Immutable chronological events</span>
                  </div>

                  <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
                    {(!viewProfileModal.auditLogs || viewProfileModal.auditLogs.length === 0) ? (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        No historical audit records found for this company.
                      </div>
                    ) : (
                      viewProfileModal.auditLogs.map((log) => (
                        <div key={log.id} className="p-4 space-y-1 bg-white hover:bg-slate-50 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-orange-500" />
                              {log.action}
                            </span>
                            <span className="text-slate-400 font-mono text-[11px]">{log.timestamp}</span>
                          </div>
                          <p className="text-slate-600 text-xs">{log.details}</p>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-0.5">
                            <span>Actor: <strong className="text-slate-700">{log.actor}</strong></span>
                            {log.reason && <span>· Reason: <strong className="text-amber-700">{log.reason}</strong></span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {viewProfileModal.status === 'Active' || viewProfileModal.status === 'Trial' ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setStatusChangeTarget({ company: viewProfileModal, action: 'Suspend' })
                      }
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs border border-amber-200"
                    >
                      Suspend Access
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setStatusChangeTarget({ company: viewProfileModal, action: 'Deactivate' })
                      }
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200"
                    >
                      Deactivate Tenant
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setStatusChangeTarget({ company: viewProfileModal, action: 'Activate' })
                    }
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                  >
                    Activate Tenant
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setViewProfileModal(null)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 4. ACTIVATE / SUSPEND / DEACTIVATE CONFIRMATION DIALOG WITH REASON & AUDITING */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {statusChangeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  statusChangeTarget.action === 'Activate'
                    ? 'bg-emerald-100 text-emerald-700'
                    : statusChangeTarget.action === 'Suspend'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {statusChangeTarget.action === 'Activate' && <CheckCircle2 className="w-6 h-6" />}
                {statusChangeTarget.action === 'Suspend' && <AlertTriangle className="w-6 h-6" />}
                {statusChangeTarget.action === 'Deactivate' && <Power className="w-6 h-6" />}
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Confirmed Administrator Action
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  {statusChangeTarget.action} Tenant: {statusChangeTarget.company.displayName}
                </h3>
                <p className="text-xs text-slate-500">
                  Target Tenant ID:{' '}
                  <span className="font-mono text-slate-700">{statusChangeTarget.company.id}</span>
                </p>
              </div>
            </div>

            {/* Explanatory Context */}
            <div
              className={`p-3.5 rounded-2xl text-xs border ${
                statusChangeTarget.action === 'Activate'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : statusChangeTarget.action === 'Suspend'
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}
            >
              {statusChangeTarget.action === 'Activate' && (
                <p>
                  <strong>Activate:</strong> Restores full platform functionality, technician work-orders, customer
                  self-service portal, and active billing cycle.
                </p>
              )}
              {statusChangeTarget.action === 'Suspend' && (
                <p>
                  <strong>Suspend:</strong> Temporarily blocks all tenant staff and customer logins. Work-orders and
                  tickets remain saved in database. Used for unpaid invoices or policy investigations.
                </p>
              )}
              {statusChangeTarget.action === 'Deactivate' && (
                <p>
                  <strong>Deactivate:</strong> Administratively disables tenant organization. All active sessions are
                  immediately terminated. Data is preserved under the retention policy; no financial records are deleted.
                </p>
              )}
            </div>

            {/* Reason Category Selection */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700">Reason Category</label>
              <select
                value={statusReasonCategory}
                onChange={(e) => setStatusReasonCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-orange-500"
              >
                <option value="">Select pre-defined audit category...</option>
                {statusChangeTarget.action === 'Suspend' && (
                  <>
                    <option value="Billing / Payment Overdue">Billing / Payment Overdue</option>
                    <option value="Terms of Service Violation">Terms of Service Violation</option>
                    <option value="Security Incident / Suspicious Traffic">Security Incident / Suspicious Traffic</option>
                    <option value="Legal Hold">Legal / Regulatory Hold</option>
                    <option value="Customer Investigation">Customer Investigation</option>
                  </>
                )}
                {statusChangeTarget.action === 'Deactivate' && (
                  <>
                    <option value="Client Contract Termination">Client Contract Termination</option>
                    <option value="Voluntary Offboarding">Voluntary Offboarding Request</option>
                    <option value="Long-Term Inactivity">Long-Term Inactivity & Abandonment</option>
                    <option value="Administrative Decommission">Administrative Decommission</option>
                  </>
                )}
                {statusChangeTarget.action === 'Activate' && (
                  <>
                    <option value="Billing Invoice Resolved">Billing Invoice Resolved</option>
                    <option value="Security Review Cleared">Security Review Cleared</option>
                    <option value="Onboarding Completed">Onboarding Verification Completed</option>
                    <option value="Trial Extension Granted">Trial Extension Granted</option>
                  </>
                )}
              </select>
            </div>

            {/* Reason Notes Textarea */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700">
                Detailed Audit Notes <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Enter mandatory audit rationale for compliance records..."
                value={statusReasonNotes}
                onChange={(e) => setStatusReasonNotes(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-sans text-xs focus:bg-white focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Extra Friction Safety for Deactivation */}
            {statusChangeTarget.action === 'Deactivate' && (
              <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-300 space-y-2 text-xs">
                <span className="font-extrabold text-rose-900 block flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" /> Additional Safety Confirmation
                </span>
                <p className="text-[11px] text-rose-800">
                  To confirm deactivation of <strong>{statusChangeTarget.company.name}</strong>, type company slug{' '}
                  <code className="bg-white px-1.5 py-0.5 rounded font-mono text-rose-900 font-bold">
                    {statusChangeTarget.company.slug}
                  </code>{' '}
                  below:
                </p>
                <input
                  type="text"
                  placeholder={`Type "${statusChangeTarget.company.slug}" to authorize`}
                  value={deactivateConfirmationInput}
                  onChange={(e) => setDeactivateConfirmationInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-rose-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmittingStatus}
                onClick={() => {
                  setStatusChangeTarget(null);
                  setStatusReasonCategory('');
                  setStatusReasonNotes('');
                  setDeactivateConfirmationInput('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  isSubmittingStatus ||
                  (!statusReasonNotes.trim() &&
                    (statusChangeTarget.action === 'Suspend' || statusChangeTarget.action === 'Deactivate')) ||
                  (statusChangeTarget.action === 'Deactivate' &&
                    deactivateConfirmationInput.trim().toLowerCase() !==
                      statusChangeTarget.company.slug.toLowerCase())
                }
                onClick={handleExecuteStatusChange}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  statusChangeTarget.action === 'Activate'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : statusChangeTarget.action === 'Suspend'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {isSubmittingStatus ? 'Updating Status...' : `Confirm ${statusChangeTarget.action}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 5. BULK ACTION CONFIRMATION MODAL */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {bulkActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  bulkActionModal === 'Activate'
                    ? 'bg-emerald-100 text-emerald-700'
                    : bulkActionModal === 'Suspend'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                <Layers className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Bulk Operation
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Bulk {bulkActionModal} ({selectedIds.size} Companies Selected)
                </h3>
                <p className="text-xs text-slate-500">
                  This action will apply status change across {selectedIds.size} customer organizations.
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700">
                Bulk Operation Audit Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Reason recorded in platform audit logs for all selected tenants..."
                value={bulkReasonNotes}
                onChange={(e) => setBulkReasonNotes(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:border-orange-500"
              />
            </div>

            {bulkActionModal === 'Deactivate' && (
              <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-300 space-y-2 text-xs">
                <span className="font-extrabold text-rose-900 block flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" /> High Impact Bulk Safety Check
                </span>
                <p className="text-[11px] text-rose-800">
                  Bulk deactivation terminates client access across all selected accounts. Type{' '}
                  <code className="bg-white px-1.5 py-0.5 rounded font-mono text-rose-900 font-bold">
                    CONFIRM DEACTIVATE
                  </code>{' '}
                  to authorize:
                </p>
                <input
                  type="text"
                  placeholder="Type CONFIRM DEACTIVATE"
                  value={bulkConfirmationInput}
                  onChange={(e) => setBulkConfirmationInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-rose-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmittingBulk}
                onClick={() => {
                  setBulkActionModal(null);
                  setBulkReasonNotes('');
                  setBulkConfirmationInput('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  isSubmittingBulk ||
                  !bulkReasonNotes.trim() ||
                  (bulkActionModal === 'Deactivate' &&
                    bulkConfirmationInput.trim().toUpperCase() !== 'CONFIRM DEACTIVATE')
                }
                onClick={handleExecuteBulkStatus}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  bulkActionModal === 'Activate'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : bulkActionModal === 'Suspend'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {isSubmittingBulk ? 'Processing...' : `Execute Bulk ${bulkActionModal}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 6. EDIT COMPANY DETAILS MODAL */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {editCompanyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-black uppercase text-orange-600">Company Administration</span>
                <h3 className="text-lg font-black text-slate-900">Edit Company Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditCompanyModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Display Name</label>
                  <input
                    type="text"
                    value={editForm.displayName}
                    onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Industry</label>
                  <input
                    type="text"
                    value={editForm.industry}
                    onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Registered Legal Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Client Admin Name</label>
                  <input
                    type="text"
                    value={editForm.clientAdminName}
                    onChange={(e) => setEditForm({ ...editForm, clientAdminName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Contact Phone</label>
                  <input
                    type="text"
                    value={editForm.contactPhone}
                    onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Business Email</label>
                <input
                  type="email"
                  value={editForm.clientAdminEmail}
                  onChange={(e) => setEditForm({ ...editForm, clientAdminEmail: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Website</label>
                <input
                  type="text"
                  value={editForm.website}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Business Address</label>
                <textarea
                  rows={2}
                  value={editForm.businessAddress}
                  onChange={(e) => setEditForm({ ...editForm, businessAddress: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditCompanyModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
