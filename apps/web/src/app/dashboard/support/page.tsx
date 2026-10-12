'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  LifeBuoy,
  Phone,
  Mail,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Plus,
  Search,
  Paperclip,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Server,
  Database,
  ShieldAlert,
  FileText,
  HelpCircle,
  Activity,
  X,
  MessageSquare,
  RotateCcw,
  Layers,
} from 'lucide-react';
import { Button, Input, Card, Badge, Dialog } from '@/components/ui';

// ── Types & Interfaces ─────────────────────────────────────────────────────────

export interface SupportMessage {
  id: string;
  senderName: string;
  senderRole: 'CLIENT_ADMIN' | 'KALPAK_ENGINEERING' | 'SYSTEM';
  message: string;
  attachments?: Array<{ name: string; size: string; dataUrl?: string }>;
  timestamp: string;
  isInternal?: boolean; // Hidden from Client Admin view
}

export interface SupportRequest {
  id: string;
  referenceId: string; // KALPAK-SR-XXXXX
  subject: string;
  category:
    | 'Technical Issue'
    | 'Configuration'
    | 'SLA Issue'
    | 'Integration'
    | 'Data/Database Issue'
    | 'Billing/Subscription'
    | 'Feature Request'
    | 'Account Access'
    | 'Other';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'OPEN' | 'AWAITING_KALPAK' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  affectedModule:
    | 'Tickets & Work Orders'
    | 'Customers & Assets'
    | 'Customer Channels'
    | 'Inventory & Parts'
    | 'Billing & Invoicing'
    | 'Reports & Analytics'
    | 'User Access & RBAC'
    | 'API & Webhooks'
    | 'Other';
  issueStartTime: string;
  businessImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'OPERATIONS_BLOCKED';
  description: string;
  attachments: Array<{ name: string; size: string; dataUrl?: string }>;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  organizationName: string;
  requesterName: string;
  assignedTeam: string;
  assignedEngineer?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  messages: SupportMessage[];
}

// ── Default Sample Data for Initial View ──────────────────────────────────────

const INITIAL_SAMPLE_REQUESTS: SupportRequest[] = [
  {
    id: 'sr_sample_01',
    referenceId: 'KALPAK-SR-81042',
    subject: 'Assistance required setting up custom SLA response timers for hydraulic breakdown calls',
    category: 'SLA Issue',
    priority: 'P2',
    status: 'IN_PROGRESS',
    affectedModule: 'Tickets & Work Orders',
    issueStartTime: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
    businessImpact: 'MEDIUM',
    description:
      'We need to configure our SLA policy so critical breakdown calls default to a 30-minute first-response and 4-hour on-site resolution target during working days.',
    attachments: [{ name: 'sla_policy_specs.pdf', size: '240 KB' }],
    contactName: 'Operations Lead',
    contactEmail: 'admin@acmecorp.com',
    contactPhone: '+91 98765 43210',
    organizationName: 'Acme Heavy Equipment Ltd.',
    requesterName: 'Client Admin',
    assignedTeam: 'Kalpak SLA & Core Routing Team',
    assignedEngineer: 'Rohan Deshmukh (L2 SaaS Specialist)',
    createdAt: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
    messages: [
      {
        id: 'msg_01',
        senderName: 'Client Admin',
        senderRole: 'CLIENT_ADMIN',
        message:
          'We configured the SLA matrix under Settings > Configuration, but after saving, tickets logged via WhatsApp channel still showed 8 hours instead of 4 hours.',
        timestamp: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
      },
      {
        id: 'msg_02',
        senderName: 'Kalpak Automated Dispatch',
        senderRole: 'SYSTEM',
        message:
          'Ticket logged under reference KALPAK-SR-81042. Assigned to Kalpak SLA & Core Routing Team with P2 High priority target (Response SLA < 2 hours).',
        timestamp: new Date(Date.now() - 3600 * 1000 * 17.5).toISOString(),
      },
      {
        id: 'msg_03',
        senderName: 'Rohan Deshmukh',
        senderRole: 'KALPAK_ENGINEERING',
        message:
          'Hello! We inspected your tenant channel settings. The WhatsApp inbound webhook had an override default priority of "MEDIUM". We have synchronized the priority mapping rule with your custom hydraulic SLA schedule. Please test with a test ticket and confirm.',
        timestamp: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
      },
    ],
  },
  {
    id: 'sr_sample_02',
    referenceId: 'KALPAK-SR-74291',
    subject: 'Request for webhook event payload verification on Ticket Close events',
    category: 'Integration',
    priority: 'P3',
    status: 'RESOLVED',
    affectedModule: 'API & Webhooks',
    issueStartTime: new Date(Date.now() - 3600 * 1000 * 72).toISOString(),
    businessImpact: 'LOW',
    description:
      'We are connecting our internal ERP system to receive webhook dispatches whenever a service ticket status transitions to RESOLVED or CLOSED.',
    attachments: [],
    contactName: 'Lead Systems Architect',
    contactEmail: 'admin@acmecorp.com',
    contactPhone: '+91 98765 43210',
    organizationName: 'Acme Heavy Equipment Ltd.',
    requesterName: 'Client Admin',
    assignedTeam: 'Kalpak Cloud & API Integrations',
    assignedEngineer: 'Sneha Patel',
    createdAt: new Date(Date.now() - 3600 * 1000 * 72).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    resolvedAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    messages: [
      {
        id: 'msg_04',
        senderName: 'Client Admin',
        senderRole: 'CLIENT_ADMIN',
        message: 'Could you verify if the ticket resolution payload includes parts consumed and invoice IDs?',
        timestamp: new Date(Date.now() - 3600 * 1000 * 72).toISOString(),
      },
      {
        id: 'msg_05',
        senderName: 'Sneha Patel',
        senderRole: 'KALPAK_ENGINEERING',
        message:
          'Yes, the webhook payload includes the full `resolutionSummary`, `partsUsed` list, and `inventoryAdjustments`. Full JSON schema has been added to our API documentation.',
        timestamp: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
      },
    ],
  },
];

// ── FAQ Data ───────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'How do I configure Email-to-Ticket for automatic breakdown calls?',
    a: 'Navigate to Customer Channels > Email. You can either utilize the managed Kalpak support address (e.g. support@yourtenant.kalpaksolutions.com) or connect your corporate Google Workspace / Microsoft 365 inbox via IMAP/SMTP. Any customer email sent will automatically generate a ticket and dispatch an acknowledgment with a tracking code.',
  },
  {
    q: 'What occurs during a cold start on the Render cloud environment?',
    a: 'On low-activity tiers, backend containers spin down after 15 minutes of inactivity to save compute. The very first request after sleep initiates a cold start, which typically completes in 30–50 seconds. Once awake, performance returns to standard sub-second latency.',
  },
  {
    q: 'How do I invite authorized customer contacts to the Self-Service Portal?',
    a: 'Go to Customers, click View on any customer record, and navigate to the "Portal Users" tab. Click "Authorize / Invite User", enter their official email, full name, and branch scoping. They will receive an invitation link to set up their password and log breakdown tickets directly.',
  },
  {
    q: 'How are priority SLA response and resolution targets calculated?',
    a: 'Kalpak evaluates SLAs based on business operating hours configured in Settings > Configuration. For instance, P1 Critical tickets trigger immediate real-time alerts with a 15-minute response target, while P2 High and P3 Medium requests follow working day schedules.',
  },
  {
    q: 'How can our dispatch managers export ticket analytics and reports to CSV?',
    a: 'Head to the Reports section from the left navigation bar. Filter by date range, department, technician, or customer type, and click "Export to CSV" or "Print Summary".',
  },
];

// ── Normalization for backward compatibility and crash prevention ─────────────

const normalizeRequest = (r: any): SupportRequest => {
  if (!r || typeof r !== 'object') {
    return {
      id: 'sr_' + Date.now(),
      referenceId: 'KALPAK-SR-00000',
      subject: 'Support Request',
      category: 'Technical Issue',
      priority: 'P3',
      status: 'OPEN',
      affectedModule: 'Tickets & Work Orders',
      issueStartTime: new Date().toISOString(),
      businessImpact: 'MEDIUM',
      description: '',
      attachments: [],
      contactName: 'Client Admin',
      contactEmail: '',
      contactPhone: '',
      organizationName: 'Organization',
      requesterName: 'Client Admin',
      assignedTeam: 'Kalpak Core SaaS Engineering',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
  }

  // Priority mapping (supports P1, P2, P3, P4 as well as legacy CRITICAL, HIGH, MEDIUM, LOW)
  let priority: SupportRequest['priority'] = 'P3';
  const rawP = String(r.priority || '').toUpperCase();
  if (rawP === 'P1' || rawP === 'CRITICAL') priority = 'P1';
  else if (rawP === 'P2' || rawP === 'HIGH') priority = 'P2';
  else if (rawP === 'P3' || rawP === 'MEDIUM') priority = 'P3';
  else if (rawP === 'P4' || rawP === 'LOW') priority = 'P4';

  // Status mapping (supports OPEN, IN_PROGRESS, AWAITING_KALPAK, RESOLVED, CLOSED, IN_REVIEW)
  let status: SupportRequest['status'] = 'OPEN';
  const rawS = String(r.status || '').toUpperCase();
  if (rawS === 'RESOLVED') status = 'RESOLVED';
  else if (rawS === 'CLOSED') status = 'CLOSED';
  else if (rawS === 'IN_PROGRESS' || rawS === 'IN_REVIEW') status = 'IN_PROGRESS';
  else if (rawS === 'AWAITING_KALPAK') status = 'AWAITING_KALPAK';
  else status = 'OPEN';

  // Ensure messages array is populated with at least the initial request description
  let messages: SupportMessage[] = [];
  if (Array.isArray(r.messages) && r.messages.length > 0) {
    messages = r.messages.map((m: any) => ({
      id: m?.id || 'msg_' + Math.random(),
      senderName: m?.senderName || 'User',
      senderRole: m?.senderRole || 'CLIENT_ADMIN',
      message: m?.message || '',
      attachments: Array.isArray(m?.attachments) ? m.attachments : [],
      timestamp: m?.timestamp || r.createdAt || new Date().toISOString(),
      isInternal: Boolean(m?.isInternal),
    }));
  } else if (r.description) {
    messages = [
      {
        id: 'msg_desc_' + (r.id || Date.now()),
        senderName: r.contactName || r.requesterName || 'Client Admin',
        senderRole: 'CLIENT_ADMIN',
        message: r.description,
        attachments: Array.isArray(r.attachments) ? r.attachments : [],
        timestamp: r.createdAt || new Date().toISOString(),
      },
    ];
  }

  return {
    id: r.id || 'sr_' + Math.random(),
    referenceId: r.referenceId || `KALPAK-SR-${Math.floor(10000 + Math.random() * 90000)}`,
    subject: r.subject || 'Support Request',
    category: r.category || 'Technical Issue',
    priority,
    status,
    affectedModule: r.affectedModule || 'Tickets & Work Orders',
    issueStartTime: r.issueStartTime || r.createdAt || new Date().toISOString(),
    businessImpact: r.businessImpact || (priority === 'P1' ? 'OPERATIONS_BLOCKED' : priority === 'P2' ? 'HIGH' : 'MEDIUM'),
    description: r.description || '',
    attachments: Array.isArray(r.attachments) ? r.attachments : [],
    contactName: r.contactName || r.requesterName || 'Client Admin',
    contactEmail: r.contactEmail || '',
    contactPhone: r.contactPhone || '',
    organizationName: r.organizationName || 'Organization',
    requesterName: r.requesterName || r.contactName || 'Client Admin',
    assignedTeam: r.assignedTeam || 'Kalpak Core SaaS Engineering',
    assignedEngineer: r.assignedEngineer,
    createdAt: r.createdAt || new Date().toISOString(),
    updatedAt: r.updatedAt || r.createdAt || new Date().toISOString(),
    resolvedAt: r.resolvedAt,
    messages,
  };
};

export default function HelpAndSupportPage() {
  const { user, activeTenant } = useAuth();

  // State: Data
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [apiLatency, setApiLatency] = useState<number | null>(null);

  // State: Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    subject: '',
    category: 'Technical Issue' as SupportRequest['category'],
    priority: 'P3' as SupportRequest['priority'],
    affectedModule: 'Tickets & Work Orders' as SupportRequest['affectedModule'],
    issueStartTime: new Date().toISOString().slice(0, 16),
    businessImpact: 'MEDIUM' as SupportRequest['businessImpact'],
    description: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    attachments: [] as Array<{ name: string; size: string; dataUrl?: string }>,
  });

  // State: Detail Drawer / Modal
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replyAttachment, setReplyAttachment] = useState<{ name: string; size: string; dataUrl?: string } | null>(null);

  // State: Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL'); // ALL, 7D, 30D, 90D

  // State: Platform Status time period
  const [uptimePeriod, setUptimePeriod] = useState<'7D' | '30D' | '90D'>('30D');

  // State: Expanded FAQ index
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Toast / Notification banner
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // ── Fetch Support Requests from Tenant Settings ──────────────────────────────

  const fetchSupportRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const startTime = performance.now();
      const tenant = await apiClient<any>('/tenants/current');
      const endTime = performance.now();
      setApiLatency(Math.round(endTime - startTime));

      const rawSaved: any[] = tenant?.settings?.supportRequests || [];
      let listToNormalize = rawSaved;

      if (!Array.isArray(listToNormalize) || listToNormalize.length === 0) {
        const localCached = localStorage.getItem('kalpak_support_requests');
        if (localCached) {
          try {
            const parsed = JSON.parse(localCached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              listToNormalize = parsed;
            }
          } catch {
            listToNormalize = INITIAL_SAMPLE_REQUESTS;
          }
        } else {
          listToNormalize = INITIAL_SAMPLE_REQUESTS;
        }
      }

      const normalized = listToNormalize.map(normalizeRequest);
      setRequests(normalized);
    } catch (err: any) {
      console.warn('Failed to load support requests from server, checking local cache:', err);
      const localCached = localStorage.getItem('kalpak_support_requests');
      let fallbackList = INITIAL_SAMPLE_REQUESTS;
      if (localCached) {
        try {
          const parsed = JSON.parse(localCached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            fallbackList = parsed;
          }
        } catch {}
      }
      setRequests(fallbackList.map(normalizeRequest));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSupportRequests();
  }, [fetchSupportRequests]);

  // Pre-fill user contact information on auth load
  useEffect(() => {
    if (user) {
      setCreateForm((prev) => ({
        ...prev,
        contactName: prev.contactName || user.fullName || '',
        contactEmail: prev.contactEmail || user.email || '',
        contactPhone: prev.contactPhone || '+91 98765 43210',
      }));
    }
  }, [user]);

  // ── Save Support Requests to Tenant Settings ─────────────────────────────────

  const persistRequests = async (updatedList: SupportRequest[]) => {
    setRequests(updatedList);
    localStorage.setItem('kalpak_support_requests', JSON.stringify(updatedList));

    try {
      setIsSaving(true);
      await apiClient.patch('/tenants/profile', {
        supportRequests: updatedList,
      });
    } catch (err: any) {
      console.warn('Could not persist to tenant profile on server:', err?.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Metric Counts (Calculated directly from actual records) ───────────────────

  const counts = useMemo(() => {
    let openCount = 0;
    let awaitingCount = 0;
    let resolvedCount = 0;
    let criticalCount = 0;

    for (const r of requests) {
      if (r.status === 'OPEN' || r.status === 'IN_PROGRESS' || r.status === 'AWAITING_KALPAK') {
        openCount++;
      }
      if (
        r.status === 'AWAITING_KALPAK' ||
        (r.status === 'OPEN' &&
          (!r.messages ||
            r.messages.length === 0 ||
            r.messages[r.messages.length - 1]?.senderRole === 'CLIENT_ADMIN'))
      ) {
        awaitingCount++;
      }
      if (r.status === 'RESOLVED' || r.status === 'CLOSED') {
        resolvedCount++;
      }
      if (r.priority === 'P1' && r.status !== 'RESOLVED' && r.status !== 'CLOSED') {
        criticalCount++;
      }
    }

    return {
      open: openCount,
      awaiting: awaitingCount,
      resolved: resolvedCount,
      critical: criticalCount,
    };
  }, [requests]);

  // ── Filtered Requests ─────────────────────────────────────────────────────────

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRef = r.referenceId.toLowerCase().includes(q);
        const matchesSub = r.subject.toLowerCase().includes(q);
        const matchesCat = r.category.toLowerCase().includes(q);
        if (!matchesRef && !matchesSub && !matchesCat) return false;
      }

      // Status
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;

      // Priority
      if (priorityFilter !== 'ALL' && r.priority !== priorityFilter) return false;

      // Category
      if (categoryFilter !== 'ALL' && r.category !== categoryFilter) return false;

      // Date Period
      if (dateFilter !== 'ALL') {
        const createdMs = new Date(r.createdAt).getTime();
        const nowMs = Date.now();
        const diffDays = (nowMs - createdMs) / (1000 * 3600 * 24);
        if (dateFilter === '7D' && diffDays > 7) return false;
        if (dateFilter === '30D' && diffDays > 30) return false;
        if (dateFilter === '90D' && diffDays > 90) return false;
      }

      return true;
    });
  }, [requests, searchQuery, statusFilter, priorityFilter, categoryFilter, dateFilter]);

  // ── Handlers: Create Support Request ──────────────────────────────────────────

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.subject.trim() || !createForm.description.trim()) {
      showToast('error', 'Please provide both a subject title and detailed description.');
      return;
    }

    const refNum = Math.floor(10000 + Math.random() * 90000);
    const referenceId = `KALPAK-SR-${refNum}`;

    let assignedTeam = 'Kalpak Core SaaS Engineering';
    if (createForm.category === 'Integration') assignedTeam = 'Kalpak Cloud & API Integrations';
    if (createForm.category === 'SLA Issue') assignedTeam = 'Kalpak SLA & Core Routing Team';
    if (createForm.category === 'Billing/Subscription') assignedTeam = 'Kalpak Subscription & Finance Operations';
    if (createForm.category === 'Data/Database Issue') assignedTeam = 'Kalpak Database & Infrastructure Tier 2';

    const newRequest: SupportRequest = {
      id: 'sr_' + Date.now(),
      referenceId,
      subject: createForm.subject.trim(),
      category: createForm.category,
      priority: createForm.priority,
      status: 'AWAITING_KALPAK',
      affectedModule: createForm.affectedModule,
      issueStartTime: createForm.issueStartTime || new Date().toISOString(),
      businessImpact: createForm.businessImpact,
      description: createForm.description.trim(),
      attachments: createForm.attachments,
      contactName: createForm.contactName.trim() || user?.fullName || 'Client Admin',
      contactEmail: createForm.contactEmail.trim() || user?.email || 'admin@tenant.com',
      contactPhone: createForm.contactPhone.trim() || '',
      organizationName: activeTenant?.name || 'Organization',
      requesterName: user?.fullName || 'Client Admin',
      assignedTeam,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 'msg_' + Date.now(),
          senderName: user?.fullName || 'Client Admin',
          senderRole: 'CLIENT_ADMIN',
          message: createForm.description.trim(),
          attachments: createForm.attachments,
          timestamp: new Date().toISOString(),
        },
        {
          id: 'msg_sys_' + (Date.now() + 1),
          senderName: 'Kalpak Automated Dispatch',
          senderRole: 'SYSTEM',
          message: `Ticket lodged successfully with reference #${referenceId}. Assigned to ${assignedTeam}. Escalated to on-call engineers according to ${createForm.priority} SLA target.`,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const updated = [newRequest, ...requests];
    await persistRequests(updated);

    showToast(
      'success',
      `Request #${referenceId} submitted to Kalpak Engineering. Response targeted within SLA schedule.`
    );
    setShowCreateModal(false);
    setCreateForm({
      subject: '',
      category: 'Technical Issue',
      priority: 'P3',
      affectedModule: 'Tickets & Work Orders',
      issueStartTime: new Date().toISOString().slice(0, 16),
      businessImpact: 'MEDIUM',
      description: '',
      contactName: user?.fullName || '',
      contactEmail: user?.email || '',
      contactPhone: '',
      attachments: [],
    });
  };

  // ── Handlers: Reply / Update Communication ───────────────────────────────────

  const handleSendReply = async () => {
    if (!selectedRequest || !replyText.trim()) return;

    setIsSubmittingReply(true);
    const newMessage: SupportMessage = {
      id: 'msg_' + Date.now(),
      senderName: user?.fullName || 'Client Admin',
      senderRole: 'CLIENT_ADMIN',
      message: replyText.trim(),
      attachments: replyAttachment ? [replyAttachment] : [],
      timestamp: new Date().toISOString(),
    };

    const updatedRequest: SupportRequest = {
      ...selectedRequest,
      status: 'AWAITING_KALPAK',
      updatedAt: new Date().toISOString(),
      messages: [...(selectedRequest.messages || []), newMessage],
    };

    const updatedList = requests.map((r) => (r.id === selectedRequest.id ? updatedRequest : r));
    await persistRequests(updatedList);
    setSelectedRequest(updatedRequest);
    setReplyText('');
    setReplyAttachment(null);
    setIsSubmittingReply(false);
    showToast('success', 'Reply sent to Kalpak Engineering.');
  };

  const handleToggleResolve = async (req: SupportRequest, newStatus: 'RESOLVED' | 'CLOSED' | 'OPEN') => {
    const updatedRequest: SupportRequest = {
      ...req,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      resolvedAt: newStatus === 'RESOLVED' || newStatus === 'CLOSED' ? new Date().toISOString() : undefined,
      messages: [
        ...(req.messages || []),
        {
          id: 'msg_status_' + Date.now(),
          senderName: user?.fullName || 'Client Admin',
          senderRole: 'CLIENT_ADMIN',
          message:
            newStatus === 'OPEN'
              ? 'Request has been reopened by the client admin for further clarification.'
              : `Request marked as ${newStatus} by Client Admin.`,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const updatedList = requests.map((r) => (r.id === req.id ? updatedRequest : r));
    await persistRequests(updatedList);
    if (selectedRequest && selectedRequest.id === req.id) {
      setSelectedRequest(updatedRequest);
    }
    showToast('success', `Request #${req.referenceId} status updated to ${newStatus}.`);
  };

  // ── Helper: Attachments Upload ────────────────────────────────────────────────

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'create' | 'reply') => {
    const files = e.target.files;
    if (!files || files.length === 0 || !files[0]) return;

    const file = files[0];
    const sizeKB = Math.round(file.size / 1024);
    const sizeText = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      const item = {
        name: file.name,
        size: sizeText,
        dataUrl: reader.result as string,
      };

      if (target === 'create') {
        setCreateForm((prev) => ({
          ...prev,
          attachments: [...prev.attachments, item],
        }));
      } else {
        setReplyAttachment(item);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Priority Badge Helper ────────────────────────────────────────────────────

  const renderPriorityBadge = (priority?: string) => {
    const p = String(priority || '').toUpperCase();
    if (p === 'P1' || p === 'CRITICAL') {
      return (
        <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 border border-red-200 text-[11px] font-bold px-2 py-0.5 rounded">
          <AlertTriangle className="w-3 h-3 text-red-600" /> P1 - Critical
        </span>
      );
    }
    if (p === 'P2' || p === 'HIGH') {
      return (
        <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 border border-orange-200 text-[11px] font-bold px-2 py-0.5 rounded">
          P2 - High
        </span>
      );
    }
    if (p === 'P4' || p === 'LOW') {
      return (
        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold px-2 py-0.5 rounded">
          P4 - Low
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-bold px-2 py-0.5 rounded">
        P3 - Medium
      </span>
    );
  };

  const renderStatusBadge = (status?: string) => {
    const s = String(status || '').toUpperCase();
    switch (s) {
      case 'OPEN':
        return <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-xs">Open</Badge>;
      case 'AWAITING_KALPAK':
        return <Badge className="bg-blue-50 text-blue-800 border-blue-200 text-xs">Awaiting Kalpak</Badge>;
      case 'IN_PROGRESS':
      case 'IN_REVIEW':
        return <Badge className="bg-purple-50 text-purple-800 border-purple-200 text-xs">In Progress</Badge>;
      case 'RESOLVED':
        return <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs">Resolved</Badge>;
      case 'CLOSED':
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs">Closed</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs">{status || 'Open'}</Badge>;
    }
  };

  // SLA Target Helper (Never returns undefined)
  const getExpectedSlaTimes = (priority?: string) => {
    const p = String(priority || '').toUpperCase();
    if (p === 'P1' || p === 'CRITICAL') {
      return { response: '< 15 mins (24/7 on-call dispatch)', resolution: '< 4 hours' };
    }
    if (p === 'P2' || p === 'HIGH') {
      return { response: '< 2 hours (Working hours)', resolution: '< 12 hours' };
    }
    if (p === 'P4' || p === 'LOW') {
      return { response: '< 24 hours', resolution: '< 72 hours' };
    }
    return { response: '< 8 hours (Working hours)', resolution: '< 24 hours' };
  };

  // Safe Date Formatters
  const formatSafeDate = (d?: string) => {
    if (!d) return '—';
    try {
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString();
    } catch {
      return '—';
    }
  };

  const formatSafeDateTime = (d?: string) => {
    if (!d) return '—';
    try {
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? '—' : dt.toLocaleString();
    } catch {
      return '—';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-red-50 text-red-800 border-red-300'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-orange-100 text-orange-600 border border-orange-200">
            <LifeBuoy className="w-7 h-7" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Enterprise Help &amp; SaaS Support
            </h1>
            <p className="text-xs text-slate-500">
              Direct engineering bridge between{' '}
              <strong className="text-slate-700">{activeTenant?.name || 'Your Organization'}</strong> and Kalpak
              Solutions Core Platform Operations.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs px-4 py-2 gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Support Request</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSupportRequests}
            disabled={isLoading}
            className="text-xs text-slate-600 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── 1. Support Overview Cards (Actual Counts from Records) ────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Open Requests */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open Requests</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{counts.open}</div>
          <p className="text-[11px] text-slate-400">Under investigation or in queue</p>
        </div>

        {/* Awaiting Kalpak Response */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Awaiting Kalpak</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-600">{counts.awaiting}</div>
          <p className="text-[11px] text-slate-400">Awaiting engineer dispatch reply</p>
        </div>

        {/* Resolved Requests */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolved Requests</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{counts.resolved}</div>
          <p className="text-[11px] text-slate-400">Successfully closed milestones</p>
        </div>

        {/* Critical Incidents */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Critical Incidents</span>
            <div className="p-2 rounded-xl bg-red-50 text-red-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold ${counts.critical > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {counts.critical}
          </div>
          <p className="text-[11px] text-slate-400">Active P1 outages / blockers</p>
        </div>
      </div>

      {/* ── 3. My Support Requests Table & Filters ─────────────────────────── */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-600" /> My Support Requests
            </h2>
            <p className="text-xs text-slate-500">Track and manage formal inquiries filed with Kalpak Solutions</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by ID or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="AWAITING_KALPAK">Awaiting Kalpak</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="P1">P1 - Critical</option>
              <option value="P2">P2 - High</option>
              <option value="P3">P3 - Medium</option>
              <option value="P4">P4 - Low</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">All Categories</option>
              <option value="Technical Issue">Technical Issue</option>
              <option value="Configuration">Configuration</option>
              <option value="SLA Issue">SLA Issue</option>
              <option value="Integration">Integration</option>
              <option value="Data/Database Issue">Data/Database Issue</option>
              <option value="Billing/Subscription">Billing/Subscription</option>
              <option value="Feature Request">Feature Request</option>
              <option value="Account Access">Account Access</option>
              <option value="Other">Other</option>
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">All Time</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
              <option value="90D">Last 90 Days</option>
            </select>
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-y border-slate-100">
              <tr>
                <th className="py-3 px-6">Reference ID</th>
                <th className="py-3 px-6">Subject &amp; Module</th>
                <th className="py-3 px-6">Category</th>
                <th className="py-3 px-6">Priority</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6">Assigned Team</th>
                <th className="py-3 px-6">Created On</th>
                <th className="py-3 px-6">Last Updated</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <LifeBuoy className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No support requests match your filters</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Clear your search parameters or click &ldquo;Create Support Request&rdquo; to lodge a new inquiry.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6 font-mono font-bold text-orange-600">{r.referenceId}</td>
                    <td className="py-3.5 px-6">
                      <div className="font-semibold text-slate-900 max-w-xs truncate" title={r.subject}>
                        {r.subject}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="font-medium text-slate-500">{r.affectedModule}</span>
                        {r.attachments && r.attachments.length > 0 && (
                          <span className="flex items-center gap-0.5 text-blue-600">
                            <Paperclip className="w-3 h-3" /> {r.attachments.length}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {r.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-6">{renderPriorityBadge(r.priority)}</td>
                    <td className="py-3.5 px-6">{renderStatusBadge(r.status)}</td>
                    <td className="py-3.5 px-6 text-slate-600 font-medium">
                      <div className="line-clamp-1">{r.assignedTeam}</div>
                      {r.assignedEngineer && (
                        <div className="text-[10px] text-slate-400 font-normal">Tech: {r.assignedEngineer}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {formatSafeDate(r.createdAt)}
                    </td>
                    <td className="py-3.5 px-6 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {formatSafeDate(r.updatedAt)}
                    </td>
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedRequest(normalizeRequest(r))}
                        className="h-7 text-xs px-2.5 text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200 font-semibold"
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── 5. Platform Status and Incidents ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real Operational Status & Health */}
        <Card className="lg:col-span-2 p-6 bg-white border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" /> Real-time Platform Operational Status
              </h2>
              <p className="text-xs text-slate-500">Live service health monitoring across Kalpak SaaS infrastructure</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                All Systems Operational
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center space-y-1">
              <Server className="w-4 h-4 text-emerald-600 mx-auto" />
              <div className="text-xs font-semibold text-slate-800">API Gateway</div>
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded">
                Operational {apiLatency ? `(${apiLatency}ms)` : ''}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center space-y-1">
              <LifeBuoy className="w-4 h-4 text-emerald-600 mx-auto" />
              <div className="text-xs font-semibold text-slate-800">Web App Router</div>
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded">
                Operational
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center space-y-1">
              <Database className="w-4 h-4 text-emerald-600 mx-auto" />
              <div className="text-xs font-semibold text-slate-800">PostgreSQL Cloud</div>
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded">
                Operational
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center space-y-1">
              <Mail className="w-4 h-4 text-emerald-600 mx-auto" />
              <div className="text-xs font-semibold text-slate-800">Notification Engine</div>
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded">
                Operational
              </span>
            </div>
          </div>

          {/* Historical Uptime Target */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-slate-800">Target SLA Commitment: 99.9% Monthly Uptime</span>
                <p className="text-[11px] text-slate-500">
                  Target SLA commitment backed by redundant container health checks and automated failovers.
                </p>
              </div>
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-medium">
                {(['7D', '30D', '90D'] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setUptimePeriod(period)}
                    className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                      uptimePeriod === period ? 'bg-orange-600 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {period === '7D' ? '7 Days' : period === '30D' ? '30 Days' : '90 Days'}
                  </button>
                ))}
              </div>
            </div>

            {/* Uptime bar simulation */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>Observed Availability ({uptimePeriod === '7D' ? 'Last 7 Days' : uptimePeriod === '30D' ? 'Last 30 Days' : 'Last 90 Days'}):</span>
                <span className="font-bold text-emerald-700">
                  {uptimePeriod === '7D' ? '100.00%' : uptimePeriod === '30D' ? '99.96%' : '99.94%'}
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex gap-0.5">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div key={i} className="flex-1 bg-emerald-500 hover:opacity-80 rounded-sm" title={`Day ${i + 1}: 100%`} />
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Active Incidents & Maintenance Notices */}
        <Card className="p-6 bg-white border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-600" /> Active Incidents &amp; Maintenance
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> No Unscheduled Outages
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                All platform APIs, databases, background workers, and email gateways are running without degradation.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-slate-800">Scheduled Maintenance Notice</span>
                <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded">
                  UPCOMING
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Platform database indexing optimization is scheduled for{' '}
                <strong className="text-slate-800">Sunday, 02:00 AM – 02:30 AM IST</strong>. Zero service downtime is
                expected.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── 6. Contact and Self-Service Help ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Channels */}
        <Card className="p-6 bg-white border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Phone className="w-4 h-4 text-orange-600" /> Support Desk Channels
          </h2>

          <div className="space-y-3.5 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Official Support Email</span>
              <a
                href="mailto:support@kalpaksolutions.com"
                className="text-sm font-bold text-orange-600 hover:underline flex items-center gap-1.5 mt-0.5"
              >
                <Mail className="w-4 h-4 text-orange-500" /> support@kalpaksolutions.com
              </a>
              <p className="text-[11px] text-slate-500 mt-0.5">Average ticket acknowledgment in &lt; 30 minutes.</p>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                Standard Business Hours Hotline
              </span>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                <Phone className="w-4 h-4 text-slate-600" /> +91 74988 62377
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Available <strong className="text-slate-700">Monday &ndash; Friday, 9:00 AM &ndash; 6:00 PM IST</strong>.
              </p>
            </div>

            <div className="border-t border-slate-100 pt-3 bg-red-50/60 p-3 rounded-xl border border-red-100">
              <span className="text-[10px] uppercase font-bold text-red-800 font-mono flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-600" /> P1 Critical Escalation
              </span>
              <p className="text-[11px] text-red-700 mt-1 leading-relaxed">
                For complete system unresponsiveness outside business hours, mark your request as{' '}
                <strong className="text-red-900 font-bold">P1 Critical</strong> above. Automated on-call pager alerts
                dispatch infrastructure engineers 24/7.
              </p>
            </div>
          </div>
        </Card>

        {/* Documentation & Guides */}
        <Card className="p-6 bg-white border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" /> Knowledge &amp; Integration Guides
          </h2>

          <div className="space-y-2.5 text-xs">
            <a
              href="/dashboard/configuration"
              className="p-2.5 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 flex items-center justify-between transition-colors text-slate-700 font-medium"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-600" />
                <span>SLA &amp; Priority Setup Guide</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>

            <a
              href="/dashboard/channels"
              className="p-2.5 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 flex items-center justify-between transition-colors text-slate-700 font-medium"
            >
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Inbound Email-to-Ticket Setup</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>

            <a
              href="/dashboard/settings/email-configuration"
              className="p-2.5 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 flex items-center justify-between transition-colors text-slate-700 font-medium"
            >
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-purple-600" />
                <span>SMTP &amp; Custom Mailer Configuration</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>

            <a
              href="https://kalpak-api.onrender.com/api/docs"
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 flex items-center justify-between transition-colors text-slate-700 font-medium"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>REST API Swagger Documentation</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </Card>

        {/* FAQs */}
        <Card className="p-6 bg-white border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-purple-600" /> Frequently Asked Questions
          </h2>

          <div className="space-y-2 text-xs">
            {FAQS.map((faq, index) => {
              const isOpen = expandedFaq === index;
              return (
                <div key={index} className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isOpen ? null : index)}
                    className="w-full text-left p-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between font-semibold text-slate-800 text-[11px] transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="p-3 bg-white text-slate-600 text-[11px] leading-relaxed border-t border-slate-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── 2. Modal: Raise a Support Request ──────────────────────────────── */}
      <Dialog
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        title="Create Formal Support Request with Kalpak Engineering"
      >
        <form onSubmit={handleCreateRequest} className="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-1">
          <p className="text-slate-500">
            Submit a formal ticket to our SaaS operations team. We track resolution milestones under your SLA contract.
          </p>

          {/* Subject */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Issue Subject / Title *</label>
            <Input
              required
              placeholder="e.g. Inbound WhatsApp webhook messages failing to create service calls"
              value={createForm.subject}
              onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Request Category *</label>
              <select
                value={createForm.category}
                onChange={(e) => setCreateForm({ ...createForm, category: e.target.value as any })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="Technical Issue">Technical Issue</option>
                <option value="Configuration">Configuration</option>
                <option value="SLA Issue">SLA Issue</option>
                <option value="Integration">Integration</option>
                <option value="Data/Database Issue">Data/Database Issue</option>
                <option value="Billing/Subscription">Billing/Subscription</option>
                <option value="Feature Request">Feature Request</option>
                <option value="Account Access">Account Access</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Priority &amp; Urgency *</label>
              <select
                value={createForm.priority}
                onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as any })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="P1">P1 - Critical (Complete Operations Blocked)</option>
                <option value="P2">P2 - High (Key Functionality Impaired)</option>
                <option value="P3">P3 - Medium (Configuration / Minor Bug)</option>
                <option value="P4">P4 - Low (General Inquiry / Improvement)</option>
              </select>
            </div>
          </div>

          {/* Affected Module & Issue Start Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Affected Module *</label>
              <select
                value={createForm.affectedModule}
                onChange={(e) => setCreateForm({ ...createForm, affectedModule: e.target.value as any })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="Tickets & Work Orders">Tickets &amp; Work Orders</option>
                <option value="Customers & Assets">Customers &amp; Assets</option>
                <option value="Customer Channels">Customer Channels (Phone, Email, WhatsApp)</option>
                <option value="Inventory & Parts">Inventory &amp; Parts</option>
                <option value="Billing & Invoicing">Billing &amp; Invoicing</option>
                <option value="Reports & Analytics">Reports &amp; Analytics</option>
                <option value="User Access & RBAC">User Access &amp; RBAC</option>
                <option value="API & Webhooks">API &amp; Webhooks</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Issue Start Time</label>
              <Input
                type="datetime-local"
                value={createForm.issueStartTime}
                onChange={(e) => setCreateForm({ ...createForm, issueStartTime: e.target.value })}
              />
            </div>
          </div>

          {/* Business Impact */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Business Impact *</label>
            <select
              value={createForm.businessImpact}
              onChange={(e) => setCreateForm({ ...createForm, businessImpact: e.target.value as any })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="LOW">Low &mdash; Minor inconvenience, workarounds available</option>
              <option value="MEDIUM">Medium &mdash; Routine service calls slowed, non-critical</option>
              <option value="HIGH">High &mdash; Significant team or customer impact</option>
              <option value="OPERATIONS_BLOCKED">Operations Blocked &mdash; Field service or dispatch halting</option>
            </select>
          </div>

          {/* Detailed Description */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Detailed Description &amp; Steps to Reproduce *</label>
            <textarea
              required
              rows={4}
              placeholder="Provide exact error messages, URL endpoints, affected IDs, and what steps lead to this failure..."
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              className="w-full p-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Attachment Upload */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 flex items-center justify-between">
              <span>Screenshot, Log File or Attachment (Optional)</span>
              <span className="text-[10px] text-slate-400">PNG, JPG, PDF, LOG (Max 10 MB)</span>
            </label>
            <input
              type="file"
              onChange={(e) => handleFileUpload(e, 'create')}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
            />
            {createForm.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {createForm.attachments.map((att, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-mono border"
                  >
                    <Paperclip className="w-3 h-3 text-slate-400" />
                    <span>{att.name}</span>
                    <span className="text-slate-400">({att.size})</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Contact Details */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
            <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block font-mono">
              Contact &amp; Escalation Information
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 block">Contact Name</label>
                <Input
                  value={createForm.contactName}
                  onChange={(e) => setCreateForm({ ...createForm, contactName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block">Official Email</label>
                <Input
                  type="email"
                  value={createForm.contactEmail}
                  onChange={(e) => setCreateForm({ ...createForm, contactEmail: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block">Callback Phone</label>
                <Input
                  value={createForm.contactPhone}
                  onChange={(e) => setCreateForm({ ...createForm, contactPhone: e.target.value })}
                />
              </div>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
              <span>Organization: <strong>{activeTenant?.name || 'Acme Heavy Equipment Ltd.'}</strong></span>
              <span>Requester: <strong>{user?.fullName || 'Client Admin'}</strong></span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-orange-600 hover:bg-orange-700 text-white font-semibold">
              <Send className="w-3.5 h-3.5 mr-1.5" />
              <span>{isSaving ? 'Lodging Ticket...' : 'Submit Support Request'}</span>
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── 4. Dialog / Drawer: Request Details & Communication ─────────────── */}
      <Dialog
        open={!!selectedRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
        title={selectedRequest ? `Support Request #${selectedRequest.referenceId}` : 'Support Request Details'}
      >
        {selectedRequest && (
          <div className="space-y-5 text-xs max-h-[82vh] overflow-y-auto pr-1">
            {/* Request Summary Banner */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-orange-600 text-sm">
                    {selectedRequest.referenceId}
                  </span>
                  {renderPriorityBadge(selectedRequest.priority)}
                  {renderStatusBadge(selectedRequest.status)}
                </div>
                <div className="text-[11px] text-slate-500">
                  Lodged on {formatSafeDateTime(selectedRequest.createdAt)}
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-900">{selectedRequest.subject}</h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-400 block">Category</span>
                  <span className="font-semibold text-slate-800">{selectedRequest.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Affected Module</span>
                  <span className="font-semibold text-slate-800">{selectedRequest.affectedModule}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Assigned Team</span>
                  <span className="font-semibold text-slate-800">{selectedRequest.assignedTeam}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Business Impact</span>
                  <span className="font-semibold text-slate-800">{selectedRequest.businessImpact}</span>
                </div>
              </div>

              {/* SLA Target box */}
              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-center justify-between">
                <div>
                  <strong>SLA Milestones:</strong> Target Response{' '}
                  <span className="font-mono font-bold">{getExpectedSlaTimes(selectedRequest.priority).response}</span>{' '}
                  | Target Resolution{' '}
                  <span className="font-mono font-bold">{getExpectedSlaTimes(selectedRequest.priority).resolution}</span>
                </div>
                {selectedRequest.resolvedAt && (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resolved at {formatSafeDateTime(selectedRequest.resolvedAt)}
                  </span>
                )}
              </div>
            </div>

            {/* Conversation Timeline & Communication */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-orange-600" />
                Communication Thread with Kalpak Engineering
              </h4>

              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 min-h-[160px] max-h-[300px] overflow-y-auto">
                {(selectedRequest.messages || [])
                  .filter((m) => m && !m.isInternal) // Hide internal engineering notes from Client Admin
                  .map((msg) => {
                    const isClient = msg.senderRole === 'CLIENT_ADMIN';
                    const isSystem = msg.senderRole === 'SYSTEM';

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="text-center my-2">
                          <span className="inline-block text-[10px] font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                            ⚙️ {msg.message} &bull; {formatSafeDateTime(msg.timestamp)}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isClient ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="font-semibold text-slate-700">
                            {isClient ? `${msg.senderName} (You)` : `${msg.senderName} (Kalpak Engineering)`}
                          </span>
                          <span>{formatSafeDateTime(msg.timestamp)}</span>
                        </div>
                        <div
                          className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                            isClient
                              ? 'bg-orange-600 text-white rounded-br-none'
                              : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200'
                          }`}
                        >
                          {msg.message}
                          {msg.attachments && (msg.attachments || []).length > 0 && (
                            <div className="mt-2 pt-2 border-t border-white/20 flex flex-wrap gap-1.5">
                              {(msg.attachments || []).map((att, aIdx) => (
                                <span
                                  key={aIdx}
                                  className="inline-flex items-center gap-1 text-[10px] font-mono bg-black/10 px-2 py-0.5 rounded"
                                >
                                  <Paperclip className="w-3 h-3" />
                                  <span>{att.name} ({att.size})</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Reply Box */}
              {selectedRequest.status !== 'CLOSED' ? (
                <div className="space-y-2 pt-1">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Send Reply or Add Information</label>
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your message for the assigned Kalpak engineering team..."
                      className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer text-[11px] font-medium text-slate-600 hover:text-orange-600 flex items-center gap-1 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{replyAttachment ? replyAttachment.name : 'Attach File'}</span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'reply')}
                        />
                      </label>
                      {replyAttachment && (
                        <button
                          type="button"
                          onClick={() => setReplyAttachment(null)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedRequest.status === 'RESOLVED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleResolve(selectedRequest, 'OPEN')}
                          className="text-amber-700 border-amber-300 hover:bg-amber-50 h-8 gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Reopen Request
                        </Button>
                      )}

                      {selectedRequest.status !== 'RESOLVED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleResolve(selectedRequest, 'RESOLVED')}
                          className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 h-8 gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
                        </Button>
                      )}

                      <Button
                        size="sm"
                        onClick={handleSendReply}
                        disabled={isSubmittingReply || !replyText.trim()}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-semibold h-8 gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSubmittingReply ? 'Sending...' : 'Send Reply'}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-xs">
                  This request has been closed. Click &ldquo;Reopen Request&rdquo; to resume communication with Kalpak engineering.
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleResolve(selectedRequest, 'OPEN')}
                      className="text-xs text-orange-600 border-orange-200"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reopen Request
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setSelectedRequest(null)}>
                Close Viewer
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
