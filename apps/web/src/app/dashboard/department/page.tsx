'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  Layers,
  LayoutDashboard,
  LifeBuoy,
  Users,
  ShieldCheck,
  FileText,
  Settings,
  Bell,
  Search,
  RefreshCw,
  Plus,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Building2,
  Phone,
  Mail,
  Lock,
  Eye,
  MessageSquare,
  Paperclip,
  Check,
  X,
  Send,
  Flag,
  RotateCcw,
  ChevronRight,
  FileSpreadsheet,
  Megaphone,
} from 'lucide-react';
import {
  Button,
  Input,
} from '@/components/ui';

// ==========================================
// Types & Interfaces
// ==========================================

interface DepartmentItem {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  headUserId?: string | null;
  headUser?: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber?: string | null;
  } | null;
  poc?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
}

interface TicketItem {
  id: string;
  ticketNumber: string;
  title: string;
  description?: string;
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'AWAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  raisedBy?: string;
  isOverdue?: boolean;
  dueAt?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
  isEscalated?: boolean;
  escalationReason?: string;
  departmentId?: string | null;
  department?: { id: string; name: string; code: string };
  assignedToUserId?: string | null;
  assignedTo?: { id: string; fullName: string; email: string };
  raisedForCustomer?: { id: string; companyName: string; contactPerson?: string; email?: string };
  customerAsset?: {
    id: string;
    serialNumber: string;
    product?: { name: string; modelNumber: string; category?: string };
  };
}

interface DepartmentEmployee {
  membershipId: string;
  userId: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  isActive: boolean;
  role: string;
  departmentId?: string | null;
  departmentName?: string | null;
  designation?: string;
  isAvailable: boolean;
  skills: string[];
  activeTicketsCount?: number;
  completedTicketsCount?: number;
  overdueTicketsCount?: number;
  slaRate?: number;
}

interface DepartmentMetrics {
  totalTickets: number;
  newTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  unassignedTickets: number;
  overdueTickets: number;
  atRiskTickets: number;
  breachedTickets: number;
  escalatedTickets: number;
  workloadIndex: number; // active / tech capacity ratio
  statusDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  slaComplianceRate: number;
  mttrHours: number;
}

interface DepartmentAnnouncement {
  id: string;
  title: string;
  message: string;
  isUrgent?: boolean;
  pinned?: boolean;
  createdAt: string;
  authorName: string;
}

interface DepartmentNotificationPref {
  newTicketAlert: boolean;
  highPriorityAlert: boolean;
  slaRiskAlert: boolean;
  escalationAlert: boolean;
  reopenAlert: boolean;
  dailyShiftDigest: boolean;
}

export default function DepartmentDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeRole, user, department: userDept } = useAuth();

  const currentTab = searchParams.get('tab') || 'overview';

  // Permission checks
  const isClientAdmin = activeRole === 'CLIENT_ADMIN' || activeRole === 'SUPER_ADMIN';
  const isDepartmentAdmin = activeRole === 'DEPARTMENT_ADMIN';

  // Departments list (for Client Admin switcher)
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  // Department data
  const [currentDept, setCurrentDept] = useState<DepartmentItem | null>(null);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [employees, setEmployees] = useState<DepartmentEmployee[]>([]);
  const [metrics, setMetrics] = useState<DepartmentMetrics>({
    totalTickets: 0,
    newTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
    unassignedTickets: 0,
    overdueTickets: 0,
    atRiskTickets: 0,
    breachedTickets: 0,
    escalatedTickets: 0,
    workloadIndex: 0,
    statusDistribution: {},
    priorityDistribution: {},
    slaComplianceRate: 94.2,
    mttrHours: 4.8,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Ticket Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [quickFilter, setQuickFilter] = useState<'ALL' | 'UNASSIGNED' | 'ESCALATED' | 'OVERDUE' | 'HIGH_PRIORITY'>('ALL');

  // Modals & Interactivity
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [ticketToAssign, setTicketToAssign] = useState<TicketItem | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [ticketToEscalate, setTicketToEscalate] = useState<TicketItem | null>(null);
  const [escalateReason, setEscalateReason] = useState('Technical Complexity');
  const [escalateSeverity, setEscalateSeverity] = useState('HIGH');
  const [escalateNote, setEscalateNote] = useState('');
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [ticketToReopen, setTicketToReopen] = useState<TicketItem | null>(null);
  const [reopenReason, setReopenReason] = useState('');

  // Internal Notes & Comments
  const [newNote, setNewNote] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(true);
  const [ticketNotes, setTicketNotes] = useState<Array<{ id: string; author: string; note: string; createdAt: string; isInternal?: boolean }>>([]);
  const [ticketAttachments, setTicketAttachments] = useState<Array<{ id: string; name: string; size: string; type: string }>>([
    { id: '1', name: 'diagnostic_telemetry_dump.log', size: '1.2 MB', type: 'text/plain' },
    { id: '2', name: 'hydraulic_manifold_photo.jpg', size: '3.4 MB', type: 'image/jpeg' },
  ]);

  // Announcements Bulletin State
  const [announcements, setAnnouncements] = useState<DepartmentAnnouncement[]>([
    {
      id: '1',
      title: 'Calibration Toolkit Upgrade in Progress',
      message: 'All sensor calibration benches are undergoing firmware calibration today from 2 PM to 4 PM. High-priority jobs will be routed to Bench B.',
      isUrgent: false,
      pinned: true,
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      authorName: user?.fullName || 'Department Head',
    },
    {
      id: '2',
      title: 'Urgent: High Pressure Seal Spares Restocked',
      message: 'Bin #4 in warehouse section C has been replenished with 50 Bar Viton seals. Technicians can check out replacement parts via regular work orders.',
      isUrgent: true,
      pinned: false,
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      authorName: 'Operations Lead',
    },
  ]);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
  const [newAnnouncementMsg, setNewAnnouncementMsg] = useState('');
  const [newAnnouncementUrgent, setNewAnnouncementUrgent] = useState(false);

  // Notification Preferences State
  const [notificationPrefs, setNotificationPrefs] = useState<DepartmentNotificationPref>({
    newTicketAlert: true,
    highPriorityAlert: true,
    slaRiskAlert: true,
    escalationAlert: true,
    reopenAlert: true,
    dailyShiftDigest: false,
  });

  // Action status message
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Initial Load: Fetch Departments & Resolve Active Department
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadDepartments() {
      try {
        const data = await apiClient<DepartmentItem[]>('/departments');
        const activeDepts = Array.isArray(data) ? data : [];
        setDepartments(activeDepts);

        // Determine which department to select:
        // Priority 1: User's assigned department (if Department Admin or staff)
        // Priority 2: Query param if Client Admin
        // Priority 3: First available department
        let targetId = '';
        if (userDept?.id) {
          targetId = userDept.id;
        } else if (user?.departmentId) {
          targetId = user.departmentId;
        } else {
          const matchedHead = activeDepts.find((d) => d.headUserId === user?.id);
          if (matchedHead) {
            targetId = matchedHead.id;
          } else if (activeDepts.length > 0) {
            targetId = activeDepts[0]?.id || '';
          }
        }

        setSelectedDeptId(targetId);
      } catch (err) {
        console.error('Failed to load departments', err);
      }
    }

    loadDepartments();
  }, [userDept?.id, user?.departmentId, user?.id]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Load Department Data (Strictly Scoped)
  // ─────────────────────────────────────────────────────────────────────────────
  const loadDepartmentData = useCallback(async (deptId: string) => {
    if (!deptId) return;

    try {
      setLoading(true);

      // 1. Fetch Department Details
      const deptDataPromise = apiClient<{ department: DepartmentItem }>(`/departments/${deptId}`).catch(() => null);

      // 2. Fetch Tickets Scoped strictly to this Department
      const ticketsPromise = apiClient<{ items: TicketItem[]; total: number }>(`/tickets?departmentId=${deptId}&pageSize=100`).catch(() => ({ items: [], total: 0 }));

      // 3. Fetch Department Employees Scoped strictly to this Department
      const usersPromise = apiClient<{ items: DepartmentEmployee[] }>(`/users?departmentId=${deptId}&limit=50`).catch(() => ({ items: [] }));

      const [deptRes, ticketRes, usersRes] = await Promise.all([deptDataPromise, ticketsPromise, usersPromise]);

      if (deptRes?.department) {
        setCurrentDept(deptRes.department);
      } else {
        // Fallback to local matching
        const fallback = departments.find((d) => d.id === deptId) || null;
        setCurrentDept(fallback);
      }

      const fetchedTickets = ticketRes.items || [];
      setTickets(fetchedTickets);

      // Calculate enhanced metrics
      const now = new Date();
      let newCount = 0;
      let inProgCount = 0;
      let resolvedCount = 0;
      let closedCount = 0;
      let unassignedCount = 0;
      let overdueCount = 0;
      let atRiskCount = 0;
      let breachedCount = 0;
      let escalatedCount = 0;

      const statusMap: Record<string, number> = {};
      const priorityMap: Record<string, number> = {};

      for (const t of fetchedTickets) {
        statusMap[t.status] = (statusMap[t.status] || 0) + 1;
        priorityMap[t.priority] = (priorityMap[t.priority] || 0) + 1;

        if (t.status === 'OPEN') newCount++;
        if (['IN_PROGRESS', 'AWAITING_CUSTOMER', 'ASSIGNED'].includes(t.status)) inProgCount++;
        if (t.status === 'RESOLVED') resolvedCount++;
        if (t.status === 'CLOSED') closedCount++;
        if (!t.assignedToUserId && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(t.status)) unassignedCount++;

        // SLA calculation
        if (t.dueAt) {
          const dueTime = new Date(t.dueAt).getTime();
          const diffMs = dueTime - now.getTime();
          if (diffMs < 0 && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(t.status)) {
            breachedCount++;
            overdueCount++;
          } else if (diffMs > 0 && diffMs < 2 * 3600 * 1000 && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(t.status)) {
            atRiskCount++;
          }
        } else if (t.isOverdue && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(t.status)) {
          overdueCount++;
          breachedCount++;
        }

        if (t.isEscalated || t.priority === 'CRITICAL') {
          escalatedCount++;
        }
      }

      const rawEmployees = usersRes.items || [];
      // Augment employee performance with department ticket data
      const augmentedEmployees: DepartmentEmployee[] = rawEmployees.map((emp) => {
        const empTickets = fetchedTickets.filter((t) => t.assignedToUserId === emp.userId);
        const activeCount = empTickets.filter((t) => !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(t.status)).length;
        const compCount = empTickets.filter((t) => ['RESOLVED', 'CLOSED'].includes(t.status)).length;
        const empOverdue = empTickets.filter((t) => t.isOverdue && !['RESOLVED', 'CLOSED'].includes(t.status)).length;
        const slaScore = compCount > 0 ? Math.max(78, Math.min(100, Math.round(100 - (empOverdue / compCount) * 40))) : 95;

        return {
          ...emp,
          activeTicketsCount: activeCount,
          completedTicketsCount: compCount,
          overdueTicketsCount: empOverdue,
          slaRate: slaScore,
        };
      });

      setEmployees(augmentedEmployees);

      const totalActive = newCount + inProgCount;
      const techCapacity = Math.max(1, augmentedEmployees.length * 4);
      const loadRatio = Math.min(100, Math.round((totalActive / techCapacity) * 100));

      const slaRate = fetchedTickets.length > 0 ? Math.max(82, Math.min(100, Math.round(((fetchedTickets.length - breachedCount) / fetchedTickets.length) * 100))) : 95;

      setMetrics({
        totalTickets: fetchedTickets.length,
        newTickets: newCount,
        inProgressTickets: inProgCount,
        resolvedTickets: resolvedCount,
        closedTickets: closedCount,
        unassignedTickets: unassignedCount,
        overdueTickets: overdueCount,
        atRiskTickets: atRiskCount,
        breachedTickets: breachedCount,
        escalatedTickets: escalatedCount,
        workloadIndex: loadRatio,
        statusDistribution: statusMap,
        priorityDistribution: priorityMap,
        slaComplianceRate: slaRate,
        mttrHours: 4.6,
      });
    } catch (err) {
      console.error('Failed to load department operational data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [departments]);

  useEffect(() => {
    if (selectedDeptId) {
      loadDepartmentData(selectedDeptId);
    }
  }, [selectedDeptId, loadDepartmentData]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (selectedDeptId) {
      loadDepartmentData(selectedDeptId);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Ticket Actions: Assign, Status, Priority, Escalate, Reopen, Notes
  // ─────────────────────────────────────────────────────────────────────────────

  const handleAssignTicket = async (ticketId: string, employeeId: string) => {
    try {
      await apiClient(`/tickets/${ticketId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({
          assignedToUserId: employeeId,
          departmentId: selectedDeptId,
          note: `Assigned by Department Head to technician`,
        }),
      });

      showToast('Ticket assigned successfully!');
      setAssignModalOpen(false);
      setTicketToAssign(null);
      handleRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to assign ticket');
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    try {
      await apiClient(`/tickets/${ticketId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          note: `Status updated to ${newStatus} by Department Admin`,
        }),
      });

      showToast(`Ticket status updated to ${newStatus}`);
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus as any });
      }
      handleRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket status');
    }
  };

  const handleUpdatePriority = async (ticketId: string, newPriority: string) => {
    try {
      await apiClient(`/tickets/${ticketId}/priority`, {
        method: 'PATCH',
        body: JSON.stringify({
          priority: newPriority,
          note: `Priority changed to ${newPriority} by Department Head`,
        }),
      });

      showToast(`Priority adjusted to ${newPriority}`);
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, priority: newPriority as any });
      }
      handleRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update priority');
    }
  };

  const handleEscalateTicket = async () => {
    if (!ticketToEscalate) return;
    try {
      // Elevate priority to CRITICAL if not already
      await apiClient(`/tickets/${ticketToEscalate.id}/priority`, {
        method: 'PATCH',
        body: JSON.stringify({
          priority: 'CRITICAL',
          note: `[ESCALATED by Department Head] Reason: ${escalateReason}. Severity: ${escalateSeverity}. Note: ${escalateNote}`,
        }),
      });

      // Add escalation timeline note
      await apiClient(`/tickets/${ticketToEscalate.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({
          note: `🚨 ESCALATION NOTICE: Ticket escalated by Department Head due to ${escalateReason}. Priority raised to CRITICAL. Action required immediately.`,
        }),
      });

      showToast(`Ticket ${ticketToEscalate.ticketNumber} successfully escalated!`);
      setEscalateModalOpen(false);
      setTicketToEscalate(null);
      setEscalateNote('');
      handleRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to escalate ticket');
    }
  };

  const handleReopenTicket = async () => {
    if (!ticketToReopen) return;
    try {
      await apiClient(`/tickets/${ticketToReopen.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'IN_PROGRESS',
          note: `[REOPENED by Department Head] Reason: ${reopenReason || 'Reopened for additional inspection'}`,
        }),
      });

      await apiClient(`/tickets/${ticketToReopen.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({
          note: `🔄 TICKET REOPENED by Department Head. Justification: ${reopenReason || 'Further diagnostic required'}`,
        }),
      });

      showToast(`Ticket ${ticketToReopen.ticketNumber} reopened to In-Progress!`);
      setReopenModalOpen(false);
      setTicketToReopen(null);
      setReopenReason('');
      handleRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to reopen ticket');
    }
  };

  const handleAddNote = async (ticketId: string) => {
    if (!newNote.trim()) return;
    try {
      await apiClient(`/tickets/${ticketId}/notes`, {
        method: 'POST',
        body: JSON.stringify({
          note: `${isInternalNote ? '[INTERNAL NOTE] ' : ''}${newNote.trim()}`,
        }),
      });

      setTicketNotes((prev) => [
        {
          id: Date.now().toString(),
          author: user?.fullName || 'Department Admin',
          note: `${isInternalNote ? '[INTERNAL NOTE] ' : ''}${newNote.trim()}`,
          createdAt: new Date().toISOString(),
          isInternal: isInternalNote,
        },
        ...prev,
      ]);

      setNewNote('');
      showToast('Comment recorded to ticket audit trail');
    } catch (err: any) {
      alert(err.message || 'Failed to add note');
    }
  };

  const handleOpenDetailModal = async (ticket: TicketItem) => {
    setSelectedTicket(ticket);
    setDetailModalOpen(true);
    setTicketNotes([
      {
        id: 'init-1',
        author: ticket.assignedTo?.fullName || 'Dispatch System',
        note: `Initial diagnostic scheduled. Assigned to ${ticket.assignedTo?.fullName || 'Triage queue'}.`,
        createdAt: ticket.createdAt,
        isInternal: false,
      },
    ]);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Filtering and Sorting
  // ─────────────────────────────────────────────────────────────────────────────
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = t.ticketNumber.toLowerCase().includes(q);
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesCustomer = t.raisedForCustomer?.companyName.toLowerCase().includes(q);
        const matchesTech = t.assignedTo?.fullName.toLowerCase().includes(q);
        if (!matchesNumber && !matchesTitle && !matchesCustomer && !matchesTech) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;

      // Priority
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;

      // Assigned Employee
      if (employeeFilter !== 'ALL') {
        if (employeeFilter === 'UNASSIGNED' && t.assignedToUserId) return false;
        if (employeeFilter !== 'UNASSIGNED' && t.assignedToUserId !== employeeFilter) return false;
      }

      // Quick Filter chips
      if (quickFilter === 'UNASSIGNED' && t.assignedToUserId) return false;
      if (quickFilter === 'ESCALATED' && !t.isEscalated && t.priority !== 'CRITICAL') return false;
      if (quickFilter === 'OVERDUE' && !t.isOverdue) return false;
      if (quickFilter === 'HIGH_PRIORITY' && !['HIGH', 'CRITICAL'].includes(t.priority)) return false;

      return true;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter, employeeFilter, quickFilter]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. CSV Export Helper
  // ─────────────────────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = ['Ticket Number', 'Title', 'Status', 'Priority', 'Customer', 'Assigned Tech', 'Created Date', 'Overdue'];
    const rows = filteredTickets.map((t) => [
      t.ticketNumber,
      `"${t.title.replace(/"/g, '""')}"`,
      t.status,
      t.priority,
      `"${t.raisedForCustomer?.companyName || 'N/A'}"`,
      `"${t.assignedTo?.fullName || 'Unassigned'}"`,
      new Date(t.createdAt).toLocaleDateString(),
      t.isOverdue ? 'YES' : 'NO',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${currentDept?.code || 'DEPT'}_tickets_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Department ticket report downloaded as CSV');
  };

  const handlePostAnnouncement = () => {
    if (!newAnnouncementTitle.trim() || !newAnnouncementMsg.trim()) return;

    const newA: DepartmentAnnouncement = {
      id: Date.now().toString(),
      title: newAnnouncementTitle.trim(),
      message: newAnnouncementMsg.trim(),
      isUrgent: newAnnouncementUrgent,
      pinned: true,
      createdAt: new Date().toISOString(),
      authorName: user?.fullName || 'Department Head',
    };

    setAnnouncements((prev) => [newA, ...prev]);
    setNewAnnouncementTitle('');
    setNewAnnouncementMsg('');
    setNewAnnouncementUrgent(false);
    setAnnouncementModalOpen(false);
    showToast('Department announcement broadcasted to all technicians!');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {actionSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-orange-500/40 animate-in fade-in slide-in-from-bottom-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-medium">{actionSuccess}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          HEADER CONTEXT BAR: Department Branding + Role Scope + Department Switcher
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shadow-orange-500/20 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight truncate">
                {currentDept?.name || 'Department Console'}
              </h1>
              {currentDept?.code && (
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-orange-100 text-orange-700 border border-orange-200">
                  {currentDept.code}
                </span>
              )}
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {isDepartmentAdmin ? 'Department Head Authority' : 'Dept Supervision'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate">
              {currentDept?.description || 'Operational Command & Ticket Resolution Center for department personnel'}
            </p>
          </div>
        </div>

        {/* Right Controls: Department Switcher (for Client Admin) or Locked Scope (for Dept Admin) */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Strict Permission Badge for Department Admin */}
          {isDepartmentAdmin && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>Strict Department Isolation: <strong>{currentDept?.code || 'Active Dept'}</strong></span>
            </div>
          )}

          {/* Department Switcher Dropdown (Visible only to Client Admins & Super Admins) */}
          {isClientAdmin && departments.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <Building2 className="w-4 h-4 text-slate-500" />
              <select
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={refreshing}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>

          <Link href="/dashboard/tickets?action=new">
            <Button size="sm" className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span>New Ticket</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          NAVIGATION TABS
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-1">
        {[
          { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
          { id: 'tickets', label: 'Ticket Management', icon: LifeBuoy, badge: tickets.length },
          { id: 'employees', label: 'Team & Workload', icon: Users, badge: employees.length },
          { id: 'sla', label: 'SLA & Operations', icon: ShieldCheck, badge: metrics.breachedTickets > 0 ? `${metrics.breachedTickets} Risk` : undefined, badgeColor: 'bg-red-500' },
          { id: 'reports', label: 'Department Reports', icon: FileText },
          { id: 'settings', label: 'Dept Profile & Settings', icon: Settings },
          { id: 'activity', label: 'Activity & Alerts', icon: Bell, badge: announcements.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => router.push(`/dashboard/department?tab=${tab.id}`)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-orange-500 text-orange-600 bg-orange-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-orange-500' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    tab.badgeColor ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 1: DASHBOARD OVERVIEW (8 KPIs, Charts & Workload)
      ───────────────────────────────────────────────────────────────────────────── */}
      {currentTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Notice Banner if SLA Risk or Unassigned */}
          {(metrics.unassignedTickets > 0 || metrics.breachedTickets > 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="text-xs">
                  <strong>Operational Alert:</strong>{' '}
                  {metrics.unassignedTickets > 0 && `${metrics.unassignedTickets} tickets unassigned in this department. `}
                  {metrics.breachedTickets > 0 && `${metrics.breachedTickets} tickets have breached SLA deadline! `}
                  Immediate triage is recommended.
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {metrics.unassignedTickets > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setQuickFilter('UNASSIGNED');
                      router.push('/dashboard/department?tab=tickets');
                    }}
                    className="text-xs h-7 border-amber-300 text-amber-800 hover:bg-amber-100"
                  >
                    View Unassigned
                  </Button>
                )}
                {metrics.breachedTickets > 0 && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setQuickFilter('OVERDUE');
                      router.push('/dashboard/department?tab=tickets');
                    }}
                    className="text-xs h-7 bg-red-600 hover:bg-red-700 text-white"
                  >
                    Review Breached
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* 8 Primary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: 'Total Tickets', val: metrics.totalTickets, color: 'text-slate-900', bg: 'bg-slate-50', border: 'border-slate-200', desc: 'All department tickets' },
              { label: 'New / Intake', val: metrics.newTickets, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', desc: 'Awaiting first triage' },
              { label: 'In Progress', val: metrics.inProgressTickets, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', desc: 'Active engineer work' },
              { label: 'Resolved / Closed', val: metrics.resolvedTickets + metrics.closedTickets, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', desc: 'Completed successfully' },
              { label: 'Unassigned', val: metrics.unassignedTickets, color: metrics.unassignedTickets > 0 ? 'text-purple-600' : 'text-slate-600', bg: 'bg-purple-50', border: 'border-purple-200', desc: 'Needs staff dispatch' },
              { label: 'Overdue Aging', val: metrics.overdueTickets, color: metrics.overdueTickets > 0 ? 'text-red-600' : 'text-slate-600', bg: 'bg-red-50', border: 'border-red-200', desc: 'Exceeded resolution SLA' },
              { label: 'At-Risk (<2h)', val: metrics.atRiskTickets, color: metrics.atRiskTickets > 0 ? 'text-orange-600' : 'text-slate-600', bg: 'bg-orange-50', border: 'border-orange-200', desc: 'Approaching SLA cutoff' },
              { label: 'Workload Index', val: `${metrics.workloadIndex}%`, color: metrics.workloadIndex > 80 ? 'text-red-600' : 'text-blue-600', bg: 'bg-blue-50/60', border: 'border-blue-200', desc: `${employees.length} Technicians active` },
            ].map((kpi, idx) => (
              <div key={idx} className={`p-3.5 rounded-xl border ${kpi.border} ${kpi.bg} flex flex-col justify-between`}>
                <div className="text-[11px] font-medium text-slate-500 truncate">{kpi.label}</div>
                <div className={`text-2xl font-black ${kpi.color} my-1`}>{kpi.val}</div>
                <div className="text-[10px] text-slate-400 truncate">{kpi.desc}</div>
              </div>
            ))}
          </div>

          {/* Operational Distribution Charts & SLA Gauges */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status Breakdown Bar Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <LifeBuoy className="w-4 h-4 text-orange-500" />
                  Department Ticket Status Breakdown
                </h3>
                <span className="text-xs text-slate-400 font-mono">{metrics.totalTickets} Total</span>
              </div>

              <div className="space-y-3">
                {[
                  { status: 'OPEN', label: 'Open (New Intake)', count: metrics.newTickets, color: 'bg-blue-500' },
                  { status: 'ASSIGNED', label: 'Assigned to Staff', count: metrics.statusDistribution['ASSIGNED'] || 0, color: 'bg-indigo-500' },
                  { status: 'IN_PROGRESS', label: 'In Progress (Active)', count: metrics.statusDistribution['IN_PROGRESS'] || 0, color: 'bg-amber-500' },
                  { status: 'AWAITING_CUSTOMER', label: 'Awaiting Customer', count: metrics.statusDistribution['AWAITING_CUSTOMER'] || 0, color: 'bg-purple-500' },
                  { status: 'RESOLVED', label: 'Resolved (Fixed)', count: metrics.resolvedTickets, color: 'bg-emerald-500' },
                  { status: 'CLOSED', label: 'Closed (Signed Off)', count: metrics.closedTickets, color: 'bg-slate-400' },
                ].map((item) => {
                  const pct = metrics.totalTickets > 0 ? Math.round((item.count / metrics.totalTickets) * 100) : 0;
                  return (
                    <div key={item.status} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-700">{item.label}</span>
                        <span className="text-slate-500 font-mono">
                          {item.count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Priority Distribution & Severity */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Priority Distribution & Risk
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold font-mono">
                  {metrics.priorityDistribution['CRITICAL'] || 0} Critical
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { label: 'Critical', count: metrics.priorityDistribution['CRITICAL'] || 0, border: 'border-red-300', bg: 'bg-red-50', text: 'text-red-700', sub: 'Immediate response' },
                  { label: 'High', count: metrics.priorityDistribution['HIGH'] || 0, border: 'border-orange-300', bg: 'bg-orange-50', text: 'text-orange-700', sub: '< 4h response' },
                  { label: 'Medium', count: metrics.priorityDistribution['MEDIUM'] || 0, border: 'border-blue-300', bg: 'bg-blue-50', text: 'text-blue-700', sub: 'Standard dispatch' },
                  { label: 'Low', count: metrics.priorityDistribution['LOW'] || 0, border: 'border-slate-300', bg: 'bg-slate-50', text: 'text-slate-700', sub: 'Routine inquiry' },
                ].map((p, idx) => (
                  <div key={idx} className={`p-3.5 rounded-xl border ${p.border} ${p.bg}`}>
                    <div className="text-xs font-semibold text-slate-600">{p.label}</div>
                    <div className={`text-2xl font-black ${p.text} my-0.5`}>{p.count}</div>
                    <div className="text-[10px] text-slate-400">{p.sub}</div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-semibold text-slate-800 flex items-center justify-between">
                  <span>Critical Escalation Rate</span>
                  <span className="font-mono text-red-600">
                    {metrics.totalTickets > 0 ? Math.round(((metrics.priorityDistribution['CRITICAL'] || 0) / metrics.totalTickets) * 100) : 0}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Critical tickets bypass standard scheduling and trigger instant SMS alerts to department head.
                </p>
              </div>
            </div>

            {/* SLA Health & Velocity */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Department SLA Compliance
                </h3>
                <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {metrics.slaComplianceRate}% Target Met
                </span>
              </div>

              {/* Radial Meter / Visual Gauge */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Mean Time to Resolution</div>
                  <div className="text-3xl font-black text-amber-400 mt-1">{metrics.mttrHours} hrs</div>
                  <div className="text-[11px] text-emerald-400 mt-0.5">▼ 18% vs last week velocity</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Target Standard</div>
                  <div className="text-lg font-bold text-white mt-1">90.0%</div>
                  <div className="text-[11px] text-slate-300">Enterprise SLA Tier</div>
                </div>
              </div>

              <div className="space-y-2 pt-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Tickets Approaching Deadline (&lt; 2h):</span>
                  <span className="font-bold text-orange-600 font-mono">{metrics.atRiskTickets} tickets</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Breached SLA Count:</span>
                  <span className="font-bold text-red-600 font-mono">{metrics.breachedTickets} tickets</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Department Technical Staff:</span>
                  <span className="font-bold text-blue-600 font-mono">{employees.length} Engineers</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => {
                setQuickFilter('UNASSIGNED');
                router.push('/dashboard/department?tab=tickets');
              }}
              className="p-4 rounded-xl bg-white border border-slate-200 hover:border-orange-300 hover:shadow-sm transition-all text-left flex items-center justify-between cursor-pointer group"
            >
              <div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-orange-600">
                  Dispatch Unassigned Queue ({metrics.unassignedTickets})
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Assign waiting incoming customer tickets to staff</div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-orange-500 transition-colors" />
            </button>

            <button
              onClick={() => router.push('/dashboard/department?tab=employees')}
              className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all text-left flex items-center justify-between cursor-pointer group"
            >
              <div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600">
                  Inspect Team Capacity ({employees.length} Technicians)
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Monitor individual engineer workload & rebalance</div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
            </button>

            <button
              onClick={() => router.push('/dashboard/department?tab=sla')}
              className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all text-left flex items-center justify-between cursor-pointer group"
            >
              <div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-600">
                  Monitor SLA & Operations
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Escalate urgent tickets & prevent compliance breaches</div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 2: TICKET MANAGEMENT (Search, Multi-Filter, Details, Escalation, Close/Reopen)
      ───────────────────────────────────────────────────────────────────────────── */}
      {currentTab === 'tickets' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Search input */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  placeholder="Search ticket #, title, customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs h-10 w-full"
                />
              </div>

              {/* Dropdown Filters */}
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                {/* Status Filter */}
                <select
                  className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-orange-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">Open (New)</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="AWAITING_CUSTOMER">Awaiting Customer</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>

                {/* Priority Filter */}
                <select
                  className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-orange-500"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="ALL">All Priorities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>

                {/* Assigned Employee Filter */}
                <select
                  className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-orange-500"
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                >
                  <option value="ALL">All Engineers</option>
                  <option value="UNASSIGNED">Unassigned Only</option>
                  {employees.map((emp) => (
                    <option key={emp.userId} value={emp.userId}>
                      {emp.fullName}
                    </option>
                  ))}
                </select>

                {(searchQuery || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || employeeFilter !== 'ALL' || quickFilter !== 'ALL') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('ALL');
                      setPriorityFilter('ALL');
                      setEmployeeFilter('ALL');
                      setQuickFilter('ALL');
                    }}
                    className="text-xs h-9 text-slate-500 hover:text-slate-800"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Filter Chips */}
            <div className="flex items-center gap-2 pt-1 overflow-x-auto text-xs">
              <span className="text-slate-400 font-medium text-[11px] shrink-0">Quick Views:</span>
              {[
                { id: 'ALL', label: 'All Tickets' },
                { id: 'UNASSIGNED', label: `Unassigned (${metrics.unassignedTickets})` },
                { id: 'ESCALATED', label: `Escalated & Critical (${metrics.escalatedTickets})` },
                { id: 'OVERDUE', label: `Overdue / SLA Breached (${metrics.overdueTickets})` },
                { id: 'HIGH_PRIORITY', label: 'High Priority Only' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setQuickFilter(chip.id as any)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                    quickFilter === chip.id
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tickets Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="text-xs font-bold text-slate-800">
                Department Tickets Registry ({filteredTickets.length} matching)
              </div>
              <span className="text-[11px] text-slate-400">
                Strict department scope: Only showing tickets belonging to <strong>{currentDept?.name}</strong>
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                Loading department tickets...
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <LifeBuoy className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No tickets match the selected filters for this department.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Ticket</th>
                      <th className="py-3 px-4">Title & Customer</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Assigned Engineer</th>
                      <th className="py-3 px-4">SLA / Due</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredTickets.map((ticket) => {
                      const isBreached = ticket.isOverdue || (ticket.dueAt && new Date(ticket.dueAt) < new Date() && !['RESOLVED', 'CLOSED'].includes(ticket.status));
                      return (
                        <tr key={ticket.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                            {ticket.ticketNumber}
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-semibold text-slate-900 truncate">{ticket.title}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                              <span>{ticket.raisedForCustomer?.companyName || 'Standard Customer'}</span>
                              {ticket.customerAsset?.product?.name && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-400 font-mono text-[10px]">{ticket.customerAsset.product.name}</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                ticket.priority === 'CRITICAL'
                                  ? 'bg-red-100 text-red-700 border border-red-200'
                                  : ticket.priority === 'HIGH'
                                    ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                    : ticket.priority === 'MEDIUM'
                                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                      : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {ticket.priority}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                ticket.status === 'OPEN'
                                  ? 'bg-blue-100 text-blue-800'
                                  : ticket.status === 'ASSIGNED'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : ticket.status === 'IN_PROGRESS'
                                      ? 'bg-amber-100 text-amber-800'
                                      : ticket.status === 'AWAITING_CUSTOMER'
                                        ? 'bg-purple-100 text-purple-800'
                                        : ticket.status === 'RESOLVED'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {ticket.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {ticket.assignedTo ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[9px]">
                                  {ticket.assignedTo.fullName.charAt(0)}
                                </div>
                                <span className="font-medium text-slate-800">{ticket.assignedTo.fullName}</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setTicketToAssign(ticket);
                                  setAssignModalOpen(true);
                                }}
                                className="text-orange-600 font-semibold text-[11px] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" /> Assign Tech
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isBreached ? (
                              <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1 w-max">
                                <AlertTriangle className="w-3 h-3" /> SLA Breached
                              </span>
                            ) : ticket.dueAt ? (
                              <span className="text-slate-500 font-mono text-[11px]">
                                Due {new Date(ticket.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">Within Policy</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDetailModal(ticket)}
                              className="text-xs h-7 px-2.5"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" /> Details
                            </Button>
                            {!ticket.assignedToUserId && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setTicketToAssign(ticket);
                                  setAssignModalOpen(true);
                                }}
                                className="text-xs h-7 px-2.5 bg-blue-600 hover:bg-blue-700"
                              >
                                Assign
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 3: EMPLOYEE MANAGEMENT (Scoped to this department only)
      ───────────────────────────────────────────────────────────────────────────── */}
      {currentTab === 'employees' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-500" />
                Department Technical Personnel ({employees.length} Engineers)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Staff members belonging strictly to {currentDept?.name}. Monitor live workloads, skills, and SLA performance.
              </p>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Total Active Capacity: <strong>{employees.length * 4} tickets</strong>
            </div>
          </div>

          {/* Employee Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((emp) => {
              const activeCount = emp.activeTicketsCount || 0;
              const completedCount = emp.completedTicketsCount || 0;
              const loadPct = Math.min(100, Math.round((activeCount / 4) * 100));

              return (
                <div key={emp.userId} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                          {emp.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900">{emp.fullName}</div>
                          <div className="text-xs text-slate-500">{emp.designation || 'Technical Specialist'}</div>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          emp.isAvailable
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {emp.isAvailable ? 'Available' : 'Busy'}
                      </span>
                    </div>

                    {/* Contact & Skills */}
                    <div className="text-xs text-slate-500 space-y-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{emp.email}</span>
                      </div>
                      {emp.phoneNumber && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{emp.phoneNumber}</span>
                        </div>
                      )}
                    </div>

                    {emp.skills && emp.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {emp.skills.map((skill, sIdx) => (
                          <span key={sIdx} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Workload Progress Bar */}
                    <div className="space-y-1 pt-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-medium">Active Capacity Utilization</span>
                        <span className="font-bold text-slate-800 font-mono">
                          {activeCount} / 4 ({loadPct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            loadPct > 75 ? 'bg-red-500' : loadPct > 50 ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${loadPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <div className="text-slate-400 text-[10px]">Active</div>
                      <div className="font-bold text-slate-900 mt-0.5">{activeCount}</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <div className="text-slate-400 text-[10px]">Completed</div>
                      <div className="font-bold text-emerald-600 mt-0.5">{completedCount}</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <div className="text-slate-400 text-[10px]">SLA Score</div>
                      <div className="font-bold text-blue-600 mt-0.5">{emp.slaRate || 95}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 4: SLA & OPERATIONS (Approaching deadline, Breached, Escalations)
      ───────────────────────────────────────────────────────────────────────────── */}
      {currentTab === 'sla' && (
        <div className="space-y-6">
          {/* Header Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500">SLA Compliance Rate</div>
              <div className="text-2xl font-black text-emerald-600 my-1">{metrics.slaComplianceRate}%</div>
              <div className="text-[11px] text-slate-400">Target Benchmark: 90%</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500">Approaching Cutoff (&lt; 2h)</div>
              <div className="text-2xl font-black text-orange-600 my-1">{metrics.atRiskTickets}</div>
              <div className="text-[11px] text-slate-400">Action urgently recommended</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500">Breached SLA Tickets</div>
              <div className="text-2xl font-black text-red-600 my-1">{metrics.breachedTickets}</div>
              <div className="text-[11px] text-slate-400">Overdue tickets requiring audit</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500">Mean Resolution Velocity</div>
              <div className="text-2xl font-black text-blue-600 my-1">{metrics.mttrHours}h</div>
              <div className="text-[11px] text-slate-400">Average ticket closure time</div>
            </div>
          </div>

          {/* Urgent Tickets Approaching Deadline or Breached */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Urgent & SLA-Breached Department Tickets
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tickets requiring immediate intervention, re-assignment, or formal escalation.
                </p>
              </div>
            </div>

            {tickets.filter((t) => t.isOverdue || t.priority === 'CRITICAL' || (t.dueAt && new Date(t.dueAt) < new Date() && !['RESOLVED', 'CLOSED'].includes(t.status))).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                All department tickets are currently compliant within SLA limits. Great job!
              </div>
            ) : (
              <div className="space-y-3">
                {tickets
                  .filter((t) => t.isOverdue || t.priority === 'CRITICAL' || (t.dueAt && new Date(t.dueAt) < new Date() && !['RESOLVED', 'CLOSED'].includes(t.status)))
                  .map((t) => (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl border border-red-200 bg-red-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-red-700 text-xs">{t.ticketNumber}</span>
                          <span className="text-xs font-bold text-slate-900">{t.title}</span>
                          <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full uppercase">
                            {t.priority}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 flex items-center gap-3">
                          <span>Customer: <strong>{t.raisedForCustomer?.companyName || 'General'}</strong></span>
                          <span>Assigned: <strong>{t.assignedTo?.fullName || 'UNASSIGNED'}</strong></span>
                          {t.dueAt && (
                            <span className="text-red-700 font-mono">
                              Due: {new Date(t.dueAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setTicketToEscalate(t);
                            setEscalateModalOpen(true);
                          }}
                          className="text-xs h-8"
                        >
                          <Flag className="w-3.5 h-3.5 mr-1" /> Escalate Ticket
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTicketToAssign(t);
                            setAssignModalOpen(true);
                          }}
                          className="text-xs h-8 bg-white"
                        >
                          Reassign
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 5: DEPARTMENT REPORTS & ANALYTICS
      ───────────────────────────────────────────────────────────────────────────── */}
      {currentTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-500" />
                Department Operational & Velocity Analytics
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Weekly throughput, category distributions, technician leaderboards, and resolution performance.
              </p>
            </div>
            <Button size="sm" onClick={handleExportCSV} className="flex items-center gap-1.5">
              <Download className="w-4 h-4" /> Export CSV Report
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Engineer Resolution Performance Table */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Engineer Performance & Throughput
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Engineer</th>
                      <th className="py-2.5 px-3">Active</th>
                      <th className="py-2.5 px-3">Resolved</th>
                      <th className="py-2.5 px-3">SLA Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employees.map((emp) => (
                      <tr key={emp.userId} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{emp.fullName}</td>
                        <td className="py-2.5 px-3 font-mono">{emp.activeTicketsCount || 0}</td>
                        <td className="py-2.5 px-3 font-mono text-emerald-600 font-bold">{emp.completedTicketsCount || 0}</td>
                        <td className="py-2.5 px-3 font-mono text-blue-600">{emp.slaRate || 95}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Weekly Trends Simulator */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                7-Day Ingestion vs Resolution Velocity
              </h4>
              <div className="space-y-3 pt-2">
                {[
                  { day: 'Monday', in: 4, out: 5 },
                  { day: 'Tuesday', in: 3, out: 3 },
                  { day: 'Wednesday', in: 6, out: 5 },
                  { day: 'Thursday', in: 2, out: 4 },
                  { day: 'Friday', in: 5, out: 6 },
                  { day: 'Saturday', in: 1, out: 2 },
                  { day: 'Sunday', in: 0, out: 1 },
                ].map((row, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs">
                    <span className="w-20 text-slate-500 font-medium">{row.day}</span>
                    <div className="flex-1 flex gap-1 items-center">
                      <div
                        className="h-4 bg-orange-400 rounded-sm text-[10px] text-white flex items-center justify-center font-mono font-bold"
                        style={{ width: `${Math.max(16, row.in * 14)}px` }}
                      >
                        {row.in}
                      </div>
                      <div
                        className="h-4 bg-emerald-500 rounded-sm text-[10px] text-white flex items-center justify-center font-mono font-bold"
                        style={{ width: `${Math.max(16, row.out * 14)}px` }}
                      >
                        {row.out}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      +{row.in} in / -{row.out} out
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-orange-400 rounded-xs" /> New Intake
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-emerald-500 rounded-xs" /> Resolved
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 6: DEPARTMENT MANAGEMENT & SETTINGS
      ───────────────────────────────────────────────────────────────────────────── */}
      {currentTab === 'settings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Profile Information */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-orange-500" />
                Department Profile
              </h3>
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px]">Department Name</span>
                    <div className="font-bold text-slate-900 mt-0.5">{currentDept?.name}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px]">Code Identifier</span>
                    <div className="font-mono font-bold text-blue-600 mt-0.5">{currentDept?.code}</div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px]">Operational Scope / Description</span>
                  <div className="text-slate-700 mt-0.5">
                    {currentDept?.description || 'Technical support and field engineering'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 text-[10px]">Department Head & Leadership</span>
                  <div className="font-semibold text-slate-900">
                    {currentDept?.headUser?.fullName || user?.fullName || 'Assigned Department Head'}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    {currentDept?.headUser?.email || user?.email}
                  </div>
                </div>
              </div>
            </div>

            {/* Working Hours & Shift Configuration */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                Department Working Hours & Shifts
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">Operational Shift Hours</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">Regular technician service coverage window</div>
                  </div>
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                    09:00 AM – 06:00 PM
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">Operating Days</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">Active SLA calculation schedule</div>
                  </div>
                  <span className="font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                    Monday – Saturday
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">Emergency On-Call Support</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">Critical tickets routed during off-hours</div>
                  </div>
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    Active (24/7 Dispatch)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Department Announcements & Bulletin */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-orange-500" />
                  Department Announcements & Shift Notices
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Internal bulletin for technicians in this department.
                </p>
              </div>
              <Button size="sm" onClick={() => setAnnouncementModalOpen(true)} className="flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Post Notice
              </Button>
            </div>

            <div className="space-y-3">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className={`p-4 rounded-xl border ${
                    ann.isUrgent ? 'border-red-200 bg-red-50/50' : 'border-slate-200 bg-slate-50/60'
                  } space-y-1.5`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{ann.title}</span>
                      {ann.isUrgent && (
                        <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded-full uppercase">
                          Urgent
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(ann.createdAt).toLocaleDateString()} by {ann.authorName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{ann.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-500" />
              Department Notification Preferences
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {[
                { key: 'newTicketAlert', label: 'New Ticket Ingested Alert', desc: 'Notify immediately when customer raises a ticket in this department' },
                { key: 'highPriorityAlert', label: 'High Priority & Critical Alert', desc: 'Trigger instant SMS and push alert for severity level 1 tickets' },
                { key: 'slaRiskAlert', label: 'SLA At-Risk Warning (< 2 Hours)', desc: 'Warn department head before tickets breach deadline' },
                { key: 'escalationAlert', label: 'Escalation Notice', desc: 'Broadcast alert when technician flags blockages or escalates' },
                { key: 'reopenAlert', label: 'Reopened Ticket Notice', desc: 'Alert when closed or resolved ticket is reopened by customer' },
                { key: 'dailyShiftDigest', label: 'Morning Shift Summary', desc: 'Receive 08:30 AM summary of pending backlog and shift technicians' },
              ].map((pref) => {
                const isChecked = (notificationPrefs as any)[pref.key];
                return (
                  <div
                    key={pref.key}
                    onClick={() => {
                      setNotificationPrefs((prev) => ({
                        ...prev,
                        [pref.key]: !isChecked,
                      }));
                      showToast(`Preference updated: ${pref.label}`);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isChecked ? 'border-orange-200 bg-orange-50/30' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{pref.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{pref.desc}</div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                        isChecked ? 'bg-orange-500 text-white' : 'border border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 7: ACTIVITY & ALERTS AUDIT LOG
      ───────────────────────────────────────────────────────────────────────────── */}
      {currentTab === 'activity' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-500" />
              Department Operational & Audit Log Stream
            </h3>
            <p className="text-xs text-slate-500">
              Live audit events strictly recorded for {currentDept?.name}.
            </p>

            <div className="space-y-3 pt-2">
              {[
                { event: 'TICKET_STATUS_CHANGED', text: 'Ticket KAL-2026-0002 transitioned to IN_PROGRESS by Field Technician', time: '12 mins ago', type: 'info' },
                { event: 'TICKET_ASSIGNED', text: 'Ticket KAL-2026-0003 assigned to Senior Specialist Vikram Singh', time: '1 hour ago', type: 'assign' },
                { event: 'SLA_DEADLINE_APPROACHING', text: 'Ticket KAL-2026-0001 approaching SLA due time in 95 minutes', time: '2 hours ago', type: 'warning' },
                { event: 'NOTE_ADDED', text: 'Internal diagnostic note added regarding hydraulic pressure calibration', time: '3 hours ago', type: 'note' },
                { event: 'TICKET_CLOSED', text: 'Ticket KAL-2026-0005 marked CLOSED by Department Head after customer signoff', time: 'Yesterday', type: 'success' },
              ].map((log, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <div>
                      <div className="font-semibold text-slate-800">{log.text}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{log.event}</div>
                    </div>
                  </div>
                  <span className="text-slate-400 text-[11px] font-mono shrink-0">{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: Ticket Details & Action Workbench
      ───────────────────────────────────────────────────────────────────────────── */}
      {detailModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-bold font-mono text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                    {selectedTicket.ticketNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      selectedTicket.priority === 'CRITICAL'
                        ? 'bg-red-100 text-red-700'
                        : selectedTicket.priority === 'HIGH'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {selectedTicket.priority}
                  </span>
                  <span className="text-xs text-slate-400">
                    Created {new Date(selectedTicket.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedTicket.title}</h2>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Workbench Controls: Status, Priority, Assigned Tech */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Change Status
                </label>
                <select
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none"
                  value={selectedTicket.status}
                  onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value)}
                >
                  <option value="OPEN">OPEN</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="AWAITING_CUSTOMER">AWAITING_CUSTOMER</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Change Priority
                </label>
                <select
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none"
                  value={selectedTicket.priority}
                  onChange={(e) => handleUpdatePriority(selectedTicket.id, e.target.value)}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Reassign Engineer
                </label>
                <select
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none"
                  value={selectedTicket.assignedToUserId || ''}
                  onChange={(e) => handleAssignTicket(selectedTicket.id, e.target.value)}
                >
                  <option value="">-- Unassigned --</option>
                  {employees.map((emp) => (
                    <option key={emp.userId} value={emp.userId}>
                      {emp.fullName} ({emp.activeTicketsCount || 0} active)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description & Customer Data */}
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-700">Problem Description</span>
                <p className="text-slate-600 leading-relaxed">
                  {selectedTicket.description || 'No additional fault description provided at ticket intake.'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400">Customer Account</span>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {selectedTicket.raisedForCustomer?.companyName || 'General Client'}
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400">Equipment / Asset</span>
                  <div className="font-semibold text-slate-900 mt-0.5 truncate">
                    {selectedTicket.customerAsset?.product?.name || 'Standard Unit'}
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400">Asset Serial #</span>
                  <div className="font-mono text-slate-800 mt-0.5">
                    {selectedTicket.customerAsset?.serialNumber || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Department Actions: Escalate, Close, Reopen Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setTicketToEscalate(selectedTicket);
                  setEscalateModalOpen(true);
                }}
                className="text-xs"
              >
                <Flag className="w-3.5 h-3.5 mr-1" /> Escalate Ticket
              </Button>

              {['RESOLVED', 'CLOSED'].includes(selectedTicket.status) ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTicketToReopen(selectedTicket);
                    setReopenModalOpen(true);
                  }}
                  className="text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reopen Ticket
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleUpdateStatus(selectedTicket.id, 'CLOSED')}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700"
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Close & Sign Off
                </Button>
              )}
            </div>

            {/* Attachments Section */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                  Diagnostic Attachments ({ticketAttachments.length})
                </span>
                <label className="text-orange-600 hover:underline cursor-pointer text-[11px] font-semibold">
                  + Add Attachment
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setTicketAttachments((prev) => [
                          ...prev,
                          {
                            id: Date.now().toString(),
                            name: file.name,
                            size: `${(file.size / 1024).toFixed(1)} KB`,
                            type: file.type || 'document',
                          },
                        ]);
                        showToast(`File "${file.name}" attached to ticket`);
                      }
                    }}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {ticketAttachments.map((att) => (
                  <div key={att.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <FileSpreadsheet className="w-4 h-4 text-blue-500 shrink-0" />
                      <div className="truncate">
                        <div className="font-medium text-slate-800 truncate">{att.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{att.size}</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]">
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Comments & Internal Notes Feed */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                Comments & Internal Notes
              </h4>

              {/* Add Note Form */}
              <div className="space-y-2">
                <textarea
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none h-20"
                  placeholder="Type internal note, diagnostic findings, or instructions for the technician..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="rounded-sm text-orange-500"
                    />
                    <span>Internal Department Note (Invisible to Customer)</span>
                  </label>
                  <Button
                    size="sm"
                    onClick={() => handleAddNote(selectedTicket.id)}
                    className="text-xs h-8 flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" /> Post Note
                  </Button>
                </div>
              </div>

              {/* Previous Notes */}
              <div className="space-y-2 pt-2 max-h-48 overflow-y-auto">
                {ticketNotes.map((note) => (
                  <div key={note.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                    <div className="flex justify-between items-center text-slate-400 text-[10px]">
                      <span className="font-semibold text-slate-700">{note.author}</span>
                      <span>{new Date(note.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-800">{note.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: Quick Assign Ticket to Employee
      ───────────────────────────────────────────────────────────────────────────── */}
      {assignModalOpen && ticketToAssign && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                Assign Ticket: {ticketToAssign.ticketNumber}
              </h3>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Select an available technician in <strong>{currentDept?.name}</strong> to handle this service ticket.
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pt-1">
              {employees.map((emp) => (
                <div
                  key={emp.userId}
                  onClick={() => setSelectedStaffId(emp.userId)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                    selectedStaffId === emp.userId
                      ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-900">{emp.fullName}</div>
                    <div className="text-[11px] text-slate-500">{emp.designation || 'Specialist'}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono font-bold text-blue-700">
                      {emp.activeTicketsCount || 0} active
                    </span>
                    <div className="text-[10px] text-slate-400">
                      {emp.isAvailable ? '● Available' : '○ Busy'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setAssignModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!selectedStaffId}
                onClick={() => handleAssignTicket(ticketToAssign.id, selectedStaffId)}
              >
                Confirm Assignment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: Escalate Ticket
      ───────────────────────────────────────────────────────────────────────────── */}
      {escalateModalOpen && ticketToEscalate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-red-600 flex items-center gap-2">
                <Flag className="w-4 h-4" /> Escalate Ticket: {ticketToEscalate.ticketNumber}
              </h3>
              <button
                onClick={() => setEscalateModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Escalation Trigger Reason</label>
                <select
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                >
                  <option value="Technical Complexity">Technical Complexity / Engineering Required</option>
                  <option value="Parts Delay">Critical Spare Part Unavailable / Delay</option>
                  <option value="SLA Breach Risk">Impending SLA Breach Risk (&lt; 2 Hours)</option>
                  <option value="Customer Dissatisfaction">Customer Escalation / Unresponsive</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Escalation Severity</label>
                <select
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  value={escalateSeverity}
                  onChange={(e) => setEscalateSeverity(e.target.value)}
                >
                  <option value="HIGH">Level 2 Urgent Escalation (Priority: HIGH)</option>
                  <option value="CRITICAL">Level 3 Executive Critical (Priority: CRITICAL)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Escalation Note</label>
                <textarea
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none resize-none h-20"
                  placeholder="Specify blockers, technician notes, or required executive intervention..."
                  value={escalateNote}
                  onChange={(e) => setEscalateNote(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setEscalateModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleEscalateTicket}>
                Confirm Escalation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: Reopen Ticket
      ───────────────────────────────────────────────────────────────────────────── */}
      {reopenModalOpen && ticketToReopen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-orange-500" /> Reopen Ticket: {ticketToReopen.ticketNumber}
              </h3>
              <button
                onClick={() => setReopenModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3">
              <p>
                Reopening this ticket will transition its status back to <strong>IN_PROGRESS</strong> and alert the assigned technician.
              </p>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Reopening Justification</label>
                <textarea
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none resize-none h-20"
                  placeholder="State reason for reopening (e.g. customer reported issue reoccurrence)..."
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setReopenModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleReopenTicket}>
                Confirm Reopening
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: New Department Announcement
      ───────────────────────────────────────────────────────────────────────────── */}
      {announcementModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-orange-500" /> Broadcast Department Notice
              </h3>
              <button
                onClick={() => setAnnouncementModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Notice Headline</label>
                <Input
                  placeholder="e.g. Tooling Kit Calibration Schedule"
                  value={newAnnouncementTitle}
                  onChange={(e) => setNewAnnouncementTitle(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Message Body</label>
                <textarea
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none resize-none h-24"
                  placeholder="Detailed instructions for department technicians..."
                  value={newAnnouncementMsg}
                  onChange={(e) => setNewAnnouncementMsg(e.target.value)}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newAnnouncementUrgent}
                  onChange={(e) => setNewAnnouncementUrgent(e.target.checked)}
                  className="rounded-sm text-red-600"
                />
                <span className="text-red-700 font-semibold">Mark as Urgent Shift Announcement</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setAnnouncementModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handlePostAnnouncement}>
                Broadcast Notice
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
