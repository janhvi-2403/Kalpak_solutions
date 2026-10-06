'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  LayoutDashboard,
  LifeBuoy,
  CheckSquare,
  Bell,
  Award,
  Settings,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Search,
  RefreshCw,
  Eye,
  MessageSquare,
  User,
  Phone,
  MapPin,
  Send,
  TrendingUp,
  ShieldCheck,
  Zap,
  Check,
  X,
  Play,
  RotateCcw,
  Lock,
  Paperclip,
  Activity,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Badge,
} from '@/components/ui';

// ==========================================
// Types & Interfaces
// ==========================================

interface TicketCustomer {
  id?: string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface TicketDepartment {
  id: string;
  name: string;
  code: string;
}

interface TimelineEntry {
  id: string;
  eventType: string;
  note?: string | null;
  createdAt: string;
  actorUserId?: string | null;
  metadata?: any;
}

interface TicketItem {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'AWAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
  departmentId?: string;
  department?: TicketDepartment;
  assignedToUserId?: string;
  raisedForCustomerId?: string;
  customer?: TicketCustomer;
  customerAssetId?: string | null;
  serviceType?: string;
  dueAt?: string | null;
  isOverdue?: boolean;
  resolvedAt?: string | null;
  closedAt?: string | null;
  closureRemarks?: string | null;
  createdAt: string;
  updatedAt: string;
  timeline?: TimelineEntry[];
}

interface TaskItem {
  id: string;
  ticketId: string;
  ticketNumber: string;
  title: string;
  completed: boolean;
  category: 'SAFETY' | 'DIAGNOSTIC' | 'REPAIR' | 'VERIFICATION';
}

interface EmployeeNotification {
  id: string;
  type: 'ASSIGNMENT' | 'PRIORITY' | 'SLA_RISK' | 'SLA_BREACH' | 'REOPEN' | 'ADMIN_MSG';
  title: string;
  message: string;
  ticketNumber?: string;
  createdAt: string;
  read: boolean;
}

// ==========================================
// Main Support Employee Dashboard Component
// ==========================================

export default function SupportEmployeeDashboardPage() {
  const { user, activeTenant, department } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active Tab from query param or default to 'overview'
  const activeTab = searchParams?.get('tab') || 'overview';

  const setTab = (tabName: string) => {
    router.push(`/dashboard/employee?tab=${tabName}`);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // State Management
  // ─────────────────────────────────────────────────────────────────────────────
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Technician Presence / Availability Status
  const [availabilityStatus, setAvailabilityStatus] = useState<
    'AVAILABLE' | 'ON_SITE' | 'BUSY' | 'ON_BREAK'
  >('AVAILABLE');

  // Search & Filter state for "My Tickets"
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [slaFilter, setSlaFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Ticket detail actions modal state
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [workHoursSpent, setWorkHoursSpent] = useState('1.5');
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);

  // Tasks state
  const [tasks, setTasks] = useState<TaskItem[]>([
    {
      id: 't-1',
      ticketId: 'tck-1',
      ticketNumber: 'TCK-1092',
      title: 'Perform lock-out / tag-out isolation on Siemens PLC Line 3',
      completed: true,
      category: 'SAFETY',
    },
    {
      id: 't-2',
      ticketId: 'tck-1',
      ticketNumber: 'TCK-1092',
      title: 'Probe 24V DC auxiliary bus rails with oscilloscope',
      completed: true,
      category: 'DIAGNOSTIC',
    },
    {
      id: 't-3',
      ticketId: 'tck-1',
      ticketNumber: 'TCK-1092',
      title: 'Replace burnt fuse F3 and test Profinet communication packet sync',
      completed: false,
      category: 'REPAIR',
    },
    {
      id: 't-4',
      ticketId: 'tck-2',
      ticketNumber: 'TCK-3688',
      title: 'Clean VFD heat-sink cooling fan and measure exhaust temperature',
      completed: false,
      category: 'REPAIR',
    },
    {
      id: 't-5',
      ticketId: 'tck-3',
      ticketNumber: 'TCK-4187',
      title: 'Record precision pulse count on rotary encoder and calibrate jig',
      completed: false,
      category: 'VERIFICATION',
    },
  ]);

  // Notifications State
  const [notifications, setNotifications] = useState<EmployeeNotification[]>([
    {
      id: 'notif-1',
      type: 'SLA_RISK',
      title: 'SLA Warning: Under 1 Hour Remaining',
      message: 'Ticket TCK-1092 (Siemens PLC Bus Fault) resolution deadline is approaching in 42 minutes.',
      ticketNumber: 'TCK-1092',
      createdAt: '10 mins ago',
      read: false,
    },
    {
      id: 'notif-2',
      type: 'SLA_BREACH',
      title: 'SLA Breached Alert',
      message: 'Ticket TCK-3688 (VFD Over-Temperature Alarm) has passed its resolution target by 2 hours.',
      ticketNumber: 'TCK-3688',
      createdAt: '45 mins ago',
      read: false,
    },
    {
      id: 'notif-3',
      type: 'ASSIGNMENT',
      title: 'New High Priority Ticket Assigned',
      message: 'Department Head assigned you to TCK-8276 (Servo Motor Positioning Error).',
      ticketNumber: 'TCK-8276',
      createdAt: '2 hours ago',
      read: true,
    },
    {
      id: 'notif-4',
      type: 'ADMIN_MSG',
      title: 'Department Head Note',
      message: 'Rajesh Mehta: Please prioritize packaging line PLC breakdown before starting conveyor maintenance.',
      createdAt: '3 hours ago',
      read: true,
    },
  ]);

  // Profile Form State
  const [profilePhone, setProfilePhone] = useState('+91 98220 98765');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [urgentPushAlerts, setUrgentPushAlerts] = useState(true);

  const showToast = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const showError = (msg: string) => {
    setActionError(msg);
    setTimeout(() => setActionError(null), 5000);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Fetch My Assigned Tickets
  // ─────────────────────────────────────────────────────────────────────────────
  const loadMyTickets = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIsRefreshing(true);
      // Strictly scoped: assignedToUserId is the logged-in employee ID
      const res = await apiClient<{ data?: TicketItem[]; items?: TicketItem[]; total: number }>(
        `/tickets?assignedToUserId=${user.id}&pageSize=50`
      );
      const list = (res as any)?.data || (res as any)?.items || (Array.isArray(res) ? res : []);
      setTickets(list);
    } catch (err: any) {
      console.error('Failed to load employee tickets', err);
      showError('Failed to load tickets. Please check your network connection.');
    } finally {
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadMyTickets();
  }, [loadMyTickets]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Computed Dashboard Metrics (Personal Only)
  // ─────────────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = tickets.length;
    const now = Date.now();

    const openTickets = tickets.filter(
      (t) => t.status === 'OPEN' || t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS'
    );
    const assignedNew = tickets.filter((t) => t.status === 'ASSIGNED');
    const inProgress = tickets.filter((t) => t.status === 'IN_PROGRESS');
    const resolvedClosed = tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED');

    // Overdue check
    const overdue = tickets.filter((t) => {
      if (t.status === 'RESOLVED' || t.status === 'CLOSED' || t.status === 'CANCELLED') return false;
      if (t.isOverdue) return true;
      if (t.dueAt && new Date(t.dueAt).getTime() < now) return true;
      return false;
    });

    // Due soon (< 4 hours from now)
    const dueSoon = tickets.filter((t) => {
      if (t.status === 'RESOLVED' || t.status === 'CLOSED' || t.status === 'CANCELLED') return false;
      if (!t.dueAt) return false;
      const diff = new Date(t.dueAt).getTime() - now;
      return diff > 0 && diff <= 4 * 3600 * 1000;
    });

    // At Risk: Overdue or due soon or critical priority
    const atRisk = tickets.filter((t) => {
      if (t.status === 'RESOLVED' || t.status === 'CLOSED' || t.status === 'CANCELLED') return false;
      if (t.isOverdue) return true;
      if (t.dueAt && new Date(t.dueAt).getTime() < now) return true;
      if (t.dueAt && new Date(t.dueAt).getTime() - now <= 2 * 3600 * 1000) return true;
      if (t.priority === 'CRITICAL' && t.status !== 'IN_PROGRESS') return true;
      return false;
    });

    // Personal SLA Compliance %
    const complianceRate = total > 0 ? Math.round(((total - overdue.length) / total) * 100) : 100;

    return {
      total,
      openCount: openTickets.length,
      assignedCount: assignedNew.length,
      inProgressCount: inProgress.length,
      resolvedClosedCount: resolvedClosed.length,
      overdueCount: overdue.length,
      dueSoonCount: dueSoon.length,
      atRiskCount: atRisk.length,
      complianceRate,
      tasksRemaining: tasks.filter((task) => !task.completed).length,
    };
  }, [tickets, tasks]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Filtered Tickets for "My Tickets"
  // ─────────────────────────────────────────────────────────────────────────────
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = ticket.title.toLowerCase().includes(query);
        const matchesNumber = ticket.ticketNumber.toLowerCase().includes(query);
        const matchesCustomer = ticket.customer?.name?.toLowerCase().includes(query);
        const matchesDesc = ticket.description.toLowerCase().includes(query);
        if (!matchesTitle && !matchesNumber && !matchesCustomer && !matchesDesc) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'ALL' && ticket.status !== statusFilter) {
        return false;
      }

      // Priority
      if (priorityFilter !== 'ALL' && ticket.priority !== priorityFilter) {
        return false;
      }

      // Category / Service Type
      if (categoryFilter !== 'ALL' && ticket.serviceType !== categoryFilter) {
        return false;
      }

      // SLA Status
      if (slaFilter === 'OVERDUE') {
        const isOverdue =
          ticket.isOverdue || (ticket.dueAt && new Date(ticket.dueAt).getTime() < Date.now());
        if (!isOverdue) return false;
      } else if (slaFilter === 'AT_RISK') {
        const isNear =
          ticket.dueAt &&
          new Date(ticket.dueAt).getTime() - Date.now() > 0 &&
          new Date(ticket.dueAt).getTime() - Date.now() <= 2 * 3600 * 1000;
        if (!isNear && ticket.priority !== 'CRITICAL') return false;
      } else if (slaFilter === 'HEALTHY') {
        const isPast =
          ticket.isOverdue || (ticket.dueAt && new Date(ticket.dueAt).getTime() < Date.now());
        if (isPast) return false;
      }

      return true;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter, slaFilter, categoryFilter]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Action Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  // Accept & Start Ticket (ASSIGNED -> IN_PROGRESS)
  const handleStartTicket = async (ticket: TicketItem) => {
    try {
      setIsActionLoading(true);
      await apiClient(`/tickets/${ticket.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'IN_PROGRESS',
          note: 'Technician accepted ticket and initiated on-site diagnostics.',
        }),
      });

      showToast(`Started work on ${ticket.ticketNumber}`);
      await loadMyTickets();
      if (selectedTicket?.id === ticket.id) {
        setSelectedTicket((prev) => (prev ? { ...prev, status: 'IN_PROGRESS' } : null));
      }
    } catch (err: any) {
      showError(err?.message || 'Failed to update ticket status');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Mark as Resolved (IN_PROGRESS -> RESOLVED)
  const handleResolveTicket = async () => {
    if (!selectedTicket) return;
    if (!resolutionSummary.trim()) {
      showError('Please provide a resolution summary describing the work performed.');
      return;
    }

    try {
      setIsActionLoading(true);
      await apiClient(`/tickets/${selectedTicket.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'RESOLVED',
          note: `${resolutionSummary.trim()} (Logged work time: ${workHoursSpent} hours)`,
        }),
      });

      // Post timeline note
      await apiClient(`/tickets/${selectedTicket.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({
          note: `Resolution Work Completed: ${resolutionSummary.trim()}`,
        }),
      });

      showToast(`Ticket ${selectedTicket.ticketNumber} marked as RESOLVED!`);
      setShowResolveDialog(false);
      setResolutionSummary('');
      await loadMyTickets();
      setSelectedTicket((prev) => (prev ? { ...prev, status: 'RESOLVED' } : null));
    } catch (err: any) {
      showError(err?.message || 'Failed to resolve ticket');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Reopen Ticket (RESOLVED -> IN_PROGRESS)
  const handleReopenTicket = async (ticket: TicketItem) => {
    try {
      setIsActionLoading(true);
      await apiClient(`/tickets/${ticket.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'IN_PROGRESS',
          note: 'Ticket reopened for verification or recurring issue investigation.',
        }),
      });

      showToast(`Ticket ${ticket.ticketNumber} reopened to In Progress`);
      await loadMyTickets();
      if (selectedTicket?.id === ticket.id) {
        setSelectedTicket((prev) => (prev ? { ...prev, status: 'IN_PROGRESS' } : null));
      }
    } catch (err: any) {
      showError(err?.message || 'Failed to reopen ticket');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Add Comment / Note / Customer Reply
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    try {
      setIsActionLoading(true);
      await apiClient(`/tickets/${selectedTicket.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({
          note: isInternalNote ? `[INTERNAL NOTE] ${replyText.trim()}` : replyText.trim(),
        }),
      });

      setReplyText('');

      // Reload ticket detail
      const refreshed = await apiClient<TicketItem>(`/tickets/${selectedTicket.id}`);
      setSelectedTicket(refreshed);
      await loadMyTickets();
    } catch (err: any) {
      showError(err?.message || 'Failed to post note');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Task Completion Toggle
  const toggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  // Format Remaining Time Badge
  const getRemainingTimeBadge = (dueAt?: string | null, isOverdue?: boolean) => {
    if (!dueAt) return <Badge variant="neutral">No SLA Limit</Badge>;
    const diff = new Date(dueAt).getTime() - Date.now();

    if (diff < 0 || isOverdue) {
      const hoursAgo = Math.abs(Math.round(diff / 3600000));
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          Breached ({hoursAgo}h ago)
        </span>
      );
    }

    const minutesRemaining = Math.round(diff / 60000);
    if (minutesRemaining <= 60) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          {minutesRemaining}m remaining (At Risk)
        </span>
      );
    }

    const hoursRemaining = Math.round(diff / 3600000);
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
        <Clock className="w-3.5 h-3.5 text-blue-600" />
        {hoursRemaining}h remaining
      </span>
    );
  };

  // Helper for Priority Badge
  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'CRITICAL':
        return <Badge variant="destructive" className="text-[10px] font-bold uppercase tracking-wider">Critical</Badge>;
      case 'HIGH':
        return <Badge variant="warning" className="text-[10px] font-bold uppercase tracking-wider">High</Badge>;
      case 'MEDIUM':
        return <Badge variant="primary" className="text-[10px] font-medium uppercase tracking-wider">Medium</Badge>;
      default:
        return <Badge variant="neutral" className="text-[10px] font-medium uppercase tracking-wider">Low</Badge>;
    }
  };

  // Helper for Status Badge
  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
            In Progress
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            Assigned
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            Resolved
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Closed
          </span>
        );
      default:
        return <Badge variant="neutral">{s}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast & Error Alerts */}
      {actionSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-700 animate-in slide-in-from-bottom">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="fixed bottom-6 right-6 z-50 bg-rose-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-rose-700 animate-in slide-in-from-bottom">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="text-sm font-semibold">{actionError}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30">
                Support Employee Portal
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {activeTenant?.name || 'Acme Corporation'} &bull; {department?.name || 'Service Ops'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>Welcome, {user?.fullName || 'Technician'}</span>
              <span className="text-sm px-3 py-1 rounded-full font-mono font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                ID: {user?.id.slice(-6).toUpperCase()}
              </span>
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Manage your assigned service calls, update progress in real time, record resolution actions, and maintain strict customer SLA compliance.
            </p>
          </div>

          {/* Availability Status Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 shrink-0">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Presence Status:
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setAvailabilityStatus('AVAILABLE');
                  showToast('Availability updated: Ready for calls');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  availabilityStatus === 'AVAILABLE'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-300" />
                Available
              </button>
              <button
                type="button"
                onClick={() => {
                  setAvailabilityStatus('ON_SITE');
                  showToast('Availability updated: On-Site Field Visit');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  availabilityStatus === 'ON_SITE'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-300" />
                On-Site
              </button>
              <button
                type="button"
                onClick={() => {
                  setAvailabilityStatus('BUSY');
                  showToast('Availability updated: Busy with repair');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  availabilityStatus === 'BUSY'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-300" />
                Busy
              </button>
            </div>
          </div>
        </div>

        {/* SLA Alert Banner if there are at-risk/breached tickets */}
        {(stats.atRiskCount > 0 || stats.overdueCount > 0) && (
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-rose-950/80 via-rose-900/60 to-slate-900 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-200">
                  {stats.overdueCount > 0
                    ? `Action Required: ${stats.overdueCount} Ticket(s) Have Breached SLA Deadlines`
                    : `SLA Alert: ${stats.atRiskCount} Ticket(s) Expiring Shortly`}
                </h4>
                <p className="text-xs text-rose-300/80">
                  Prioritize these tickets to protect customer contracts and keep your SLA score above 90%.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setTab('tickets');
                setSlaFilter('OVERDUE');
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shrink-0 shadow-sm transition-all"
            >
              Filter At-Risk Tickets &rarr;
            </button>
          </div>
        )}

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-2 mt-8 overflow-x-auto pb-1 border-t border-slate-800/80 pt-4 scrollbar-none">
          {[
            { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'tickets', label: 'My Tickets', icon: LifeBuoy, badge: stats.openCount },
            { id: 'tasks', label: 'My Tasks', icon: CheckSquare, badge: stats.tasksRemaining },
            { id: 'notifications', label: 'Notifications', icon: Bell, badge: notifications.filter((n) => !n.read).length },
            { id: 'performance', label: 'My Performance', icon: Award },
            { id: 'profile', label: 'Profile & Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25 ring-2 ring-orange-400/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                      isActive ? 'bg-white text-orange-600 font-extrabold' : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 1: DASHBOARD OVERVIEW
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-sm bg-white hover:border-blue-400 transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">My Open Tickets</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <LifeBuoy className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900">{stats.openCount}</div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <span>Assigned + In Progress calls</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white hover:border-purple-400 transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">New Assigned</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-purple-900">{stats.assignedCount}</div>
                <div className="text-[11px] text-purple-600 mt-1 font-medium">
                  Awaiting acceptance
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white hover:border-amber-400 transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">In Progress</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-amber-900">{stats.inProgressCount}</div>
                <div className="text-[11px] text-amber-600 mt-1 font-medium">
                  Active diagnostic/repair
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white hover:border-rose-400 transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">SLA At Risk / Overdue</span>
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-rose-600">{stats.atRiskCount}</div>
                <div className="text-[11px] text-rose-600 mt-1 font-medium">
                  {stats.overdueCount} breached &bull; {stats.dueSoonCount} due soon
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Second Row Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resolved / Closed</div>
                <div className="text-2xl font-black text-emerald-800 mt-1">{stats.resolvedClosedCount} Tickets</div>
                <div className="text-xs text-emerald-600 mt-0.5">Completed successfully</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Personal SLA Score</div>
                <div className="text-2xl font-black text-blue-900 mt-1">{stats.complianceRate}%</div>
                <div className="text-xs text-blue-600 mt-0.5">Target: &ge; 90.0%</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today&apos;s Workload</div>
                <div className="text-2xl font-black text-orange-900 mt-1">4 Service Calls</div>
                <div className="text-xs text-orange-600 mt-0.5">Approx. 6.5 hours logged</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Active Tickets List for Quick Action */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  <span>Immediate Action Tickets</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  High priority and active service tickets assigned directly to you
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTab('tickets')}
                className="text-xs font-semibold"
              >
                View All My Tickets ({tickets.length}) &rarr;
              </Button>
            </div>

            <div className="divide-y divide-slate-100">
              {tickets.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No tickets assigned to you right now. Great job keeping your queue clear!
                </div>
              ) : (
                tickets.slice(0, 4).map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {ticket.ticketNumber}
                        </span>
                        {getPriorityBadge(ticket.priority)}
                        {getStatusBadge(ticket.status)}
                        {getRemainingTimeBadge(ticket.dueAt, ticket.isOverdue)}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 truncate">{ticket.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-1">{ticket.description}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {ticket.customer?.name || 'Apex Precision Engineering'}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          Line 3 Assembly Plant
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {ticket.status === 'ASSIGNED' && (
                        <Button
                          size="sm"
                          onClick={() => handleStartTicket(ticket)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Accept & Start
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTicket(ticket)}
                        className="text-xs font-bold flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        Details
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 2: MY TICKETS (Full Scoped Queue, Search, Filters, Details)
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'tickets' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by ticket #, issue keywords, customer name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMyTickets}
                  disabled={isRefreshing}
                  className="text-xs font-medium flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">SLA Status</label>
                <select
                  value={slaFilter}
                  onChange={(e) => setSlaFilter(e.target.value)}
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="ALL">All SLA States</option>
                  <option value="AT_RISK">At Risk (&lt; 2h)</option>
                  <option value="OVERDUE">Breached / Overdue</option>
                  <option value="HEALTHY">On Track</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Service Type</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="ALL">All Service Types</option>
                  <option value="BREAKDOWN_SERVICE">Breakdown Service</option>
                  <option value="EMERGENCY_REPAIR">Emergency Repair</option>
                  <option value="PREVENTIVE_MAINTENANCE">Preventive Maintenance</option>
                  <option value="CALIBRATION">Calibration</option>
                  <option value="AUDIT">Safety / Audit</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tickets Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                Showing {filteredTickets.length} of {tickets.length} assigned tickets
              </span>
              <span className="text-[11px]">Personal View: Only tickets assigned to you are visible</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Customer / Requester</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">SLA Deadline</th>
                    <th className="py-3 px-4">Assigned On</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No tickets matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-slate-900 max-w-xs">
                          <div className="font-mono text-[11px] font-bold text-blue-700 mb-0.5">
                            {ticket.ticketNumber}
                          </div>
                          <div className="font-bold text-slate-900 line-clamp-1">{ticket.title}</div>
                          <div className="text-[11px] text-slate-400 line-clamp-1">{ticket.description}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">
                            {ticket.customer?.name || 'Apex Precision Engineering'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {ticket.customer?.phone || '+91 98220 12345'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">{getPriorityBadge(ticket.priority)}</td>
                        <td className="py-3.5 px-4">{getStatusBadge(ticket.status)}</td>
                        <td className="py-3.5 px-4">
                          {getRemainingTimeBadge(ticket.dueAt, ticket.isOverdue)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {ticket.status === 'ASSIGNED' && (
                              <Button
                                size="sm"
                                onClick={() => handleStartTicket(ticket)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-2.5 py-1 h-auto font-bold"
                              >
                                Accept
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTicket(ticket)}
                              className="text-[11px] px-2.5 py-1 h-auto font-semibold"
                            >
                              Open &rarr;
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 3: MY TASKS & WORK ORDERS
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-orange-500" />
                  <span>Field Work Checklist & Sub-Tasks</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Keep track of safety protocols, diagnostics, component replacement, and verification milestones.
                </p>
              </div>
              <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg font-mono">
                {tasks.filter((t) => t.completed).length} of {tasks.length} Completed
              </div>
            </div>

            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    task.completed
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : 'bg-white border-slate-200 hover:border-orange-400 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        task.completed
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {task.completed && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                          {task.ticketNumber}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {task.category}
                        </span>
                      </div>
                      <p
                        className={`text-xs font-semibold ${
                          task.completed ? 'line-through text-slate-500' : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium shrink-0">
                    {task.completed ? 'Done' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 4: NOTIFICATIONS
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-orange-500" />
                  <span>Employee Alerts & Notification Center</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Real-time updates on assignments, customer replies, and critical SLA deadlines.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                  showToast('Marked all notifications as read');
                }}
                className="text-xs font-semibold"
              >
                Mark All as Read
              </Button>
            </div>

            <div className="divide-y divide-slate-100">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`py-4 flex items-start gap-4 transition-colors ${
                    !notif.read ? 'bg-orange-50/40 -mx-6 px-6' : ''
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      notif.type === 'SLA_RISK'
                        ? 'bg-amber-100 text-amber-700'
                        : notif.type === 'SLA_BREACH'
                        ? 'bg-rose-100 text-rose-700'
                        : notif.type === 'ASSIGNMENT'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {notif.type === 'SLA_BREACH' || notif.type === 'SLA_RISK' ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{notif.title}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">{notif.createdAt}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{notif.message}</p>
                    {notif.ticketNumber && (
                      <div className="mt-2">
                        <button
                          onClick={() => {
                            setTab('tickets');
                            setSearchQuery(notif.ticketNumber!);
                          }}
                          className="text-[11px] font-bold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1"
                        >
                          View Ticket {notif.ticketNumber} &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 5: MY PERFORMANCE (Strictly Personal Metrics)
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-xs bg-white">
              <CardContent className="p-5">
                <div className="text-xs font-bold uppercase text-slate-400">Total Resolved</div>
                <div className="text-3xl font-black text-slate-900 mt-1">{stats.resolvedClosedCount}</div>
                <div className="text-xs text-emerald-600 mt-1 font-medium">&uarr; 3 tickets this week</div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs bg-white">
              <CardContent className="p-5">
                <div className="text-xs font-bold uppercase text-slate-400">Avg. Resolution Time</div>
                <div className="text-3xl font-black text-blue-900 mt-1">2.4 hrs</div>
                <div className="text-xs text-blue-600 mt-1 font-medium">Faster than SLA average (4.0 hrs)</div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs bg-white">
              <CardContent className="p-5">
                <div className="text-xs font-bold uppercase text-slate-400">SLA Compliance Rate</div>
                <div className="text-3xl font-black text-emerald-700 mt-1">{stats.complianceRate}%</div>
                <div className="text-xs text-slate-500 mt-1 font-medium">Exceeds department target</div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs bg-white">
              <CardContent className="p-5">
                <div className="text-xs font-bold uppercase text-slate-400">First-Time-Fix Rate</div>
                <div className="text-3xl font-black text-purple-900 mt-1">92.0%</div>
                <div className="text-xs text-purple-600 mt-1 font-medium">Minimal recurring visits</div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Deep Dive Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Weekly Resolution Breakdown</span>
              </h3>
              <p className="text-xs text-slate-500">
                Track your operational velocity across breakdown and preventive maintenance tasks.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  { label: 'Monday', tickets: 3, hours: 5.5, rate: '100%' },
                  { label: 'Tuesday', tickets: 4, hours: 7.0, rate: '100%' },
                  { label: 'Wednesday', tickets: 2, hours: 4.0, rate: '100%' },
                  { label: 'Thursday', tickets: 3, hours: 6.2, rate: '92%' },
                  { label: 'Friday (Today)', tickets: 4, hours: 6.5, rate: '94%' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
                    <span className="font-semibold text-slate-700">{row.label}</span>
                    <div className="flex items-center gap-4 text-slate-500 font-mono">
                      <span>{row.tickets} resolved</span>
                      <span>{row.hours} hrs</span>
                      <span className="text-emerald-700 font-bold">{row.rate} SLA</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-orange-500" />
                <span>Quality & Compliance Badges</span>
              </h3>
              <p className="text-xs text-slate-500">
                Milestones recognized by Department Head and customer feedback.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-xl bg-orange-50/60 border border-orange-200">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm mb-2">
                    🎯
                  </div>
                  <h4 className="text-xs font-bold text-orange-900">Zero Overdue Streak</h4>
                  <p className="text-[11px] text-orange-700/80 mt-1">7 consecutive shifts without an SLA breach</p>
                </div>

                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm mb-2">
                    ⚡
                  </div>
                  <h4 className="text-xs font-bold text-blue-900">Rapid Responder</h4>
                  <p className="text-[11px] text-blue-700/80 mt-1">Average call acceptance under 12 minutes</p>
                </div>

                <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm mb-2">
                    ⭐
                  </div>
                  <h4 className="text-xs font-bold text-purple-900">Top CSAT Rating</h4>
                  <p className="text-[11px] text-purple-700/80 mt-1">4.9 / 5.0 customer satisfaction score</p>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm mb-2">
                    🛠️
                  </div>
                  <h4 className="text-xs font-bold text-emerald-900">PLC Specialist</h4>
                  <p className="text-[11px] text-emerald-700/80 mt-1">Certified for Siemens S7 & Rockwell Allen Bradley</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 6: PROFILE & SETTINGS
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Identity & Department Details Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-orange-500" />
                <span>Employee Profile Information</span>
              </h3>
              <p className="text-xs text-slate-500">
                Your role and department assignment are managed by your Client Administrator.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
                  <input
                    type="text"
                    disabled
                    value={user?.fullName || 'Vikram Singh'}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Work Email</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || 'tech@acme.com'}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Department</label>
                    <input
                      type="text"
                      disabled
                      value={department?.name || 'Electrical & Instrumentation'}
                      className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">System Role</label>
                    <input
                      type="text"
                      disabled
                      value="SUPPORT_EMPLOYEE"
                      className="w-full text-xs font-mono font-bold bg-purple-50 border border-purple-200 rounded-lg p-2.5 text-purple-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Direct Contact Phone
                  </label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => showToast('Profile contact phone updated successfully!')}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                >
                  Save Profile Info
                </Button>
              </div>
            </div>

            {/* Change Password & Notification Preferences Card */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600" />
                  <span>Security & Password</span>
                </h3>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!oldPassword || !newPassword) {
                      showError('Please fill in password fields');
                      return;
                    }
                    if (newPassword !== confirmPassword) {
                      showError('New passwords do not match');
                      return;
                    }
                    showToast('Password updated securely!');
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                    />
                  </div>
                  <Button type="submit" size="sm" className="w-full text-xs font-bold">
                    Update Password
                  </Button>
                </form>
              </div>

              {/* Notification Toggles */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-orange-500" />
                  <span>Notification Preferences</span>
                </h3>

                <div className="space-y-3 pt-1">
                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="font-medium text-slate-700">Urgent SLA Push Alerts (&lt; 1 hr)</span>
                    <input
                      type="checkbox"
                      checked={urgentPushAlerts}
                      onChange={(e) => setUrgentPushAlerts(e.target.checked)}
                      className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="font-medium text-slate-700">Email Dispatches & Reassignments</span>
                    <input
                      type="checkbox"
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                      className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="font-medium text-slate-700">SMS Alerts for Critical Breakdown Calls</span>
                    <input
                      type="checkbox"
                      checked={smsAlerts}
                      onChange={(e) => setSmsAlerts(e.target.checked)}
                      className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: TICKET DETAILS & WORKFLOW DRAWER
      ───────────────────────────────────────────────────────────────────────────── */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800">
              <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded">
                    {selectedTicket.ticketNumber}
                  </span>
                  {getPriorityBadge(selectedTicket.priority)}
                  {getStatusBadge(selectedTicket.status)}
                  {getRemainingTimeBadge(selectedTicket.dueAt, selectedTicket.isOverdue)}
                </div>
                <h2 className="text-xl font-extrabold text-white truncate">{selectedTicket.title}</h2>
                <p className="text-xs text-slate-400">
                  Assigned to: <strong className="text-white">{user?.fullName || 'Vikram Singh'}</strong> &bull; Dept: {selectedTicket.department?.name || 'Electrical & Instrumentation'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Customer & Location Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Customer / Plant</span>
                  <div className="font-bold text-slate-900">{selectedTicket.customer?.name || 'Apex Precision Engineering Pvt Ltd'}</div>
                  <div className="text-slate-500 mt-0.5">{selectedTicket.customer?.address || 'Plot 42, Hinjewadi Phase 2, Pune'}</div>
                </div>

                <div>
                  <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Requester Contact</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ramesh Patel (Lead Operator)</span>
                  </div>
                  <div className="text-slate-600 flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedTicket.customer?.phone || '+91 98765 43210'}</span>
                  </div>
                </div>

                <div>
                  <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Service SLA</span>
                  <div className="text-slate-800 font-medium">
                    Due: {selectedTicket.dueAt ? new Date(selectedTicket.dueAt).toLocaleString() : 'Standard 24h'}
                  </div>
                  <div className="mt-1">{getRemainingTimeBadge(selectedTicket.dueAt, selectedTicket.isOverdue)}</div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reported Issue Description</h4>
                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Workflow Actions (Accept -> In Progress -> Resolved) */}
              <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-orange-600" />
                    <span>Current Workflow Step: {selectedTicket.status}</span>
                  </h4>
                  <p className="text-[11px] text-orange-800/80 mt-0.5">
                    {selectedTicket.status === 'ASSIGNED'
                      ? 'Accept the ticket to mark it In Progress and signal to your Department Head that work is underway.'
                      : selectedTicket.status === 'IN_PROGRESS'
                      ? 'Perform diagnostic, record parts consumed, and mark ticket as resolved when finished.'
                      : 'Ticket is completed. You can reopen it if the customer reports recurring failure.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {selectedTicket.status === 'ASSIGNED' && (
                    <Button
                      size="sm"
                      onClick={() => handleStartTicket(selectedTicket)}
                      disabled={isActionLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Accept & Start Repair
                    </Button>
                  )}

                  {selectedTicket.status === 'IN_PROGRESS' && (
                    <Button
                      size="sm"
                      onClick={() => setShowResolveDialog(true)}
                      disabled={isActionLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Mark as Resolved
                    </Button>
                  )}

                  {(selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReopenTicket(selectedTicket)}
                      disabled={isActionLoading}
                      className="text-xs font-bold flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reopen Ticket
                    </Button>
                  )}
                </div>
              </div>

              {/* Conversation & History Stream */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  <span>Communication History & Timeline</span>
                </h4>

                <div className="space-y-3 max-h-56 overflow-y-auto p-1">
                  {selectedTicket.timeline && selectedTicket.timeline.length > 0 ? (
                    selectedTicket.timeline.map((entry) => (
                      <div
                        key={entry.id}
                        className={`p-3 rounded-xl border text-xs leading-relaxed ${
                          entry.metadata?.isInternal
                            ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1 text-[10px] text-slate-400 font-mono">
                          <span className="font-bold uppercase tracking-wider text-slate-600">
                            {entry.metadata?.isInternal ? '🔒 Internal Technician Note' : '💬 Customer Communication'}
                          </span>
                          <span>{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div>{entry.note}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-500 text-xs">
                      Acknowledged ticket. Arriving on-site with multimeter, oscilloscope, and spare fuse kit.
                    </div>
                  )}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleAddNote} className="space-y-3 pt-2">
                  <textarea
                    rows={3}
                    placeholder={
                      isInternalNote
                        ? 'Write internal note for yourself and Department Head...'
                        : 'Reply to customer or request on-site access/clarification...'
                    }
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 p-3 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isInternalNote}
                          onChange={(e) => setIsInternalNote(e.target.checked)}
                          className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                        />
                        <span>Lock as Internal Note (hidden from customer)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachedFiles((prev) => [...prev, `log_${Date.now().toString().slice(-4)}.pdf`]);
                          showToast('Attachment simulated: diagnostic_log.pdf added');
                        }}
                        className="text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>Attach File</span>
                      </button>
                    </div>

                    <Button
                      type="submit"
                      size="sm"
                      disabled={isActionLoading || !replyText.trim()}
                      className="text-xs font-bold flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Post Comment
                    </Button>
                  </div>

                  {attachedFiles.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      {attachedFiles.map((f, idx) => (
                        <span key={idx} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
                          📎 {f}
                        </span>
                      ))}
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="text-[11px] text-slate-400">
                Employee permissions: Delete ticket is restricted to Super Admins.
              </span>
              <Button variant="outline" size="sm" onClick={() => setSelectedTicket(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          RESOLVE TICKET MODAL
      ───────────────────────────────────────────────────────────────────────────── */}
      {showResolveDialog && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Resolve Service Ticket: {selectedTicket.ticketNumber}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowResolveDialog(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Document your actions and time spent so the customer and department supervisor have an auditable record.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                  Resolution Summary / Corrective Action
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Replaced faulty 24V DC fuse F3, tested Profinet network packet transmission with zero dropped frames, machine re-started with plant lead."
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                  Work Duration (Hours Spent)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={workHoursSpent}
                  onChange={(e) => setWorkHoursSpent(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResolveDialog(false)}
                className="text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleResolveTicket}
                disabled={isActionLoading || !resolutionSummary.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Confirm & Mark Resolved
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
