'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  User,
  Building2,
  Send,
  UserCheck,
  Calendar,
  FileText,
  Activity,
  History,
  ChevronRight,
} from 'lucide-react';
import {
  Button,
  Dialog,
} from '@/components/ui';
import { WorkOrdersSection } from '@/features/tickets/components/work-orders-section';
import { TicketPartsSection } from '@/features/tickets/components/ticket-parts-section';

interface TimelineEvent {
  id: string;
  eventType: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown>;
  actor?: { id: string; fullName: string; email: string } | null;
  createdAt: string;
}

interface TicketAssignment {
  id: string;
  assignedToUserId: string;
  assignedTo: { id: string; fullName: string; email: string };
  assignedBy?: { id: string; fullName: string; email: string } | null;
  department?: { id: string; name: string; code: string } | null;
  isActive: boolean;
  assignedAt: string;
}

interface TicketDetail {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'AWAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isOverdue: boolean;
  tolerableOpenDays: number;
  raisedBy: 'CUSTOMER' | 'EMPLOYEE';
  raisedForCustomer?: { id: string; companyName: string } | null;
  assignedTo?: { id: string; fullName: string; email: string } | null;
  department?: { id: string; name: string; code: string } | null;
  customerAsset?: {
    id: string;
    serialNumber: string;
    product?: { name: string; modelNumber: string };
  } | null;
  createdAt: string;
  updatedAt: string;
  dueAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  timeline: TimelineEvent[];
  assignments: TicketAssignment[];
}

interface Employee {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  departmentName?: string;
  activeTicketsCount?: number;
}

// State machine transition actions
const TRANSITIONS_CONFIG: Record<
  string,
  Array<{ targetStatus: string; label: string; variant: 'primary' | 'success' | 'warning' | 'destructive' | 'outline' }>
> = {
  OPEN: [
    { targetStatus: 'ASSIGNED', label: 'Assign & Dispatch', variant: 'primary' },
    { targetStatus: 'CANCELLED', label: 'Cancel Ticket', variant: 'destructive' },
  ],
  ASSIGNED: [
    { targetStatus: 'IN_PROGRESS', label: 'Start Working', variant: 'primary' },
    { targetStatus: 'OPEN', label: 'Return to Queue', variant: 'outline' },
    { targetStatus: 'CANCELLED', label: 'Cancel Ticket', variant: 'destructive' },
  ],
  IN_PROGRESS: [
    { targetStatus: 'AWAITING_CUSTOMER', label: 'Awaiting Customer Info', variant: 'warning' },
    { targetStatus: 'RESOLVED', label: 'Mark as Resolved', variant: 'success' },
    { targetStatus: 'CANCELLED', label: 'Cancel Ticket', variant: 'destructive' },
  ],
  AWAITING_CUSTOMER: [
    { targetStatus: 'IN_PROGRESS', label: 'Resume Work', variant: 'primary' },
    { targetStatus: 'RESOLVED', label: 'Mark as Resolved', variant: 'success' },
    { targetStatus: 'CANCELLED', label: 'Cancel Ticket', variant: 'destructive' },
  ],
  RESOLVED: [
    { targetStatus: 'CLOSED', label: 'Accept & Close Ticket', variant: 'success' },
    { targetStatus: 'IN_PROGRESS', label: 'Reopen (Not Fixed)', variant: 'warning' },
  ],
  CLOSED: [],
  CANCELLED: [
    { targetStatus: 'OPEN', label: 'Reopen Ticket', variant: 'outline' },
  ],
};

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Status Transition Modal
  const [selectedNextStatus, setSelectedNextStatus] = useState<string | null>(null);
  const [transitionNote, setTransitionNote] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Assign Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  // Add Note Box
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Priority Change Modal
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState('');
  const [priorityNote, setPriorityNote] = useState('');
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);

  const fetchTicket = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiClient<TicketDetail>(`/tickets/${ticketId}`);
      setTicket(data);
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to fetch ticket details',
      });
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  const fetchEmployees = useCallback(async () => {
    try {
      const data = await apiClient<Employee[]>('/employees');
      setEmployees(data);
    } catch (err) {
      console.error('Failed to load team roster:', err);
    }
  }, []);

  useEffect(() => {
    fetchTicket();
    fetchEmployees();
  }, [fetchTicket, fetchEmployees]);

  // Handle Status Transition
  const handleStatusTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNextStatus) return;

    try {
      setIsTransitioning(true);
      setFeedbackMsg(null);

      await apiClient(`/tickets/${ticketId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: selectedNextStatus,
          note: transitionNote.trim() || undefined,
        }),
      });

      setFeedbackMsg({
        type: 'success',
        text: `Status updated to ${selectedNextStatus}`,
      });
      setSelectedNextStatus(null);
      setTransitionNote('');
      await fetchTicket();
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update status',
      });
    } finally {
      setIsTransitioning(false);
    }
  };

  // Handle Assignment
  const handleAssignTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigneeUserId) return;

    try {
      setIsAssigning(true);
      setFeedbackMsg(null);

      await apiClient(`/tickets/${ticketId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({
          assignedToUserId: assigneeUserId,
          note: assignNote.trim() || undefined,
        }),
      });

      setFeedbackMsg({
        type: 'success',
        text: 'Ticket successfully assigned',
      });
      setIsAssignModalOpen(false);
      setAssigneeUserId('');
      setAssignNote('');
      await fetchTicket();
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to assign ticket',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      setIsAddingNote(true);
      setFeedbackMsg(null);

      await apiClient(`/tickets/${ticketId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: newNote.trim() }),
      });

      setFeedbackMsg({ type: 'success', text: 'Note appended to timeline' });
      setNewNote('');
      await fetchTicket();
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to add note',
      });
    } finally {
      setIsAddingNote(false);
    }
  };

  // Handle Priority Escalation
  const handleUpdatePriority = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPriority) return;

    try {
      setIsUpdatingPriority(true);
      setFeedbackMsg(null);

      await apiClient(`/tickets/${ticketId}/priority`, {
        method: 'PATCH',
        body: JSON.stringify({
          priority: selectedPriority,
          note: priorityNote.trim() || undefined,
        }),
      });

      setFeedbackMsg({ type: 'success', text: `Priority changed to ${selectedPriority}` });
      setIsPriorityModalOpen(false);
      setSelectedPriority('');
      setPriorityNote('');
      await fetchTicket();
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update priority',
      });
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center text-sm font-mono text-slate-400">
        Loading ticket detail & timeline history...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center space-y-4">
        <div className="text-lg font-bold text-slate-800">Ticket Not Found</div>
        <Link href="/dashboard/tickets">
          <Button variant="outline">Return to Tickets List</Button>
        </Link>
      </div>
    );
  }

  const nextTransitions = TRANSITIONS_CONFIG[ticket.status] || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/dashboard/tickets"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Tickets List</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedPriority(ticket.priority);
              setIsPriorityModalOpen(true);
            }}
            className="text-xs"
          >
            Change Priority
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAssignModalOpen(true)}
            className="text-xs gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{ticket.assignedTo ? 'Reassign' : 'Assign'}</span>
          </Button>
        </div>
      </div>

      {/* Ticket Banner Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl sm:text-2xl font-black font-mono text-blue-600 tracking-tight">
              {ticket.ticketNumber}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-300">
              {ticket.status}
            </span>
            {ticket.isOverdue && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5" />
                OVERDUE
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Created {new Date(ticket.createdAt).toLocaleDateString()}</span>
            </div>
            {ticket.dueAt && (
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Due {new Date(ticket.dueAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            {ticket.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 whitespace-pre-wrap leading-relaxed">
            {ticket.description}
          </p>
        </div>
      </div>

      {/* Feedback Message */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-xs font-semibold hover:underline opacity-70"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Left Details & Actions, Right Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols on lg) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lifecycle State Machine Controls */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Lifecycle State Machine Actions
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Current: <strong className="text-slate-800">{ticket.status}</strong>
              </span>
            </div>

            {nextTransitions.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl">
                This ticket is in terminal state <strong className="text-slate-800">{ticket.status}</strong>. No further transitions are permitted by policy.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-slate-500">
                  Select a valid next lifecycle transition according to Kalpak state machine rules:
                </div>
                <div className="flex flex-wrap gap-2">
                  {nextTransitions.map((t) => (
                    <Button
                      key={t.targetStatus}
                      onClick={() => setSelectedNextStatus(t.targetStatus)}
                      size="sm"
                      className={`text-xs font-semibold ${
                        t.variant === 'primary'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                          : t.variant === 'success'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                          : t.variant === 'warning'
                          ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                          : t.variant === 'destructive'
                          ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                          : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{t.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-1 opacity-70" />
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Context Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer & Asset Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
                <Building2 className="w-4 h-4 text-blue-500" />
                <span>Customer & Machine</span>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400">Account:</span>
                  <div className="font-bold text-slate-800 text-sm">
                    {ticket.raisedForCustomer?.companyName || 'Internal Client'}
                  </div>
                </div>
                {ticket.customerAsset ? (
                  <div>
                    <span className="text-slate-400">Equipment Unit:</span>
                    <div className="font-mono font-bold text-slate-800">
                      {ticket.customerAsset.serialNumber}
                    </div>
                    {ticket.customerAsset.product && (
                      <div className="text-[11px] text-slate-500">
                        {ticket.customerAsset.product.name} ({ticket.customerAsset.product.modelNumber})
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-400 italic">No equipment unit attached</div>
                )}
              </div>
            </div>

            {/* Assignment & Department Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
                <User className="w-4 h-4 text-indigo-500" />
                <span>Assigned Technician</span>
              </div>
              <div className="space-y-2 text-xs">
                {ticket.assignedTo ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                      {ticket.assignedTo.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{ticket.assignedTo.fullName}</div>
                      <div className="text-[11px] text-slate-400">{ticket.assignedTo.email}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                    No technician currently assigned. Use "Assign" above to dispatch.
                  </div>
                )}
                {ticket.department && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-slate-400">Department:</span>
                    <span className="font-semibold text-slate-800">{ticket.department.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Phase D: Field Service & Work Orders Section */}
          <WorkOrdersSection
            ticketId={ticket.id}
            ticketNumber={ticket.ticketNumber}
            ticketStatus={ticket.status}
            employees={employees}
            customerCompanyName={ticket.raisedForCustomer?.companyName}
            defaultTechnicianId={ticket.assignedTo?.id}
            onRefreshTicket={fetchTicket}
          />

          {/* Phase E: Spare Parts Consumed & Billing Section */}
          <TicketPartsSection ticketId={ticket.id} />

          {/* Add Note Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Add Progress Note or Customer Communication</span>
            </div>
            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                required
                rows={2}
                placeholder="Type technical observations, parts used, or telemetry notes..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isAddingNote || !newNote.trim()}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isAddingNote ? 'Adding...' : 'Post Note'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Immutable Audit Timeline */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Timeline & Audit Trail
                </h2>
              </div>
              <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                {ticket.timeline.length} events
              </span>
            </div>

            {/* Vertical Chronological Timeline */}
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {ticket.timeline.map((event) => {
                let nodeColor = 'bg-blue-600';
                if (event.eventType === 'STATUS_CHANGED') nodeColor = 'bg-indigo-600';
                if (event.eventType === 'RESOLVED') nodeColor = 'bg-emerald-600';
                if (event.eventType === 'CLOSED') nodeColor = 'bg-slate-700';
                if (event.eventType === 'OVERDUE_FLAGGED') nodeColor = 'bg-rose-600';
                if (event.eventType === 'PRIORITY_CHANGED') nodeColor = 'bg-amber-500';

                return (
                  <div key={event.id} className="relative group">
                    {/* Glowing Node Dot */}
                    <div
                      className={`absolute -left-[27px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${nodeColor}`}
                    />

                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          {event.eventType.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(event.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Transition Pill */}
                      {event.previousStatus && event.newStatus && (
                        <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                          <span className="font-semibold text-slate-700">{event.previousStatus}</span>
                          <span>→</span>
                          <span className="font-bold text-blue-600">{event.newStatus}</span>
                        </div>
                      )}

                      {/* Note Content */}
                      {event.note && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1 leading-relaxed">
                          {event.note}
                        </p>
                      )}

                      {/* Actor Information */}
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span>by</span>
                        <span className="font-medium text-slate-600">
                          {event.actor?.fullName || 'System Automation'}
                        </span>
                        <span>•</span>
                        <span>{new Date(event.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* State Transition Confirmation Dialog */}
      <Dialog
        isOpen={Boolean(selectedNextStatus)}
        onClose={() => setSelectedNextStatus(null)}
        title={`Confirm Status Transition: ${selectedNextStatus}`}
        description="This transition will be immutably recorded in the ticket timeline."
      >
        <form onSubmit={handleStatusTransition} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Transition Note / Action Taken
            </label>
            <textarea
              rows={3}
              placeholder="Describe work completed, next actions required, or customer feedback..."
              value={transitionNote}
              onChange={(e) => setTransitionNote(e.target.value)}
              className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedNextStatus(null)}
              disabled={isTransitioning}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isTransitioning}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {isTransitioning ? 'Applying...' : 'Confirm Transition'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Assign Technician Modal */}
      <Dialog
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Ticket to Technician"
        description="Re-routing will record an ASSIGNED event and update employee ticket quotas."
      >
        <form onSubmit={handleAssignTicket} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Team Member *
            </label>
            <select
              required
              value={assigneeUserId}
              onChange={(e) => setAssigneeUserId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            >
              <option value="">Select Technician...</option>
              {employees.map((emp) => (
                <option key={emp.userId} value={emp.userId}>
                  {emp.fullName} ({emp.role}) — {emp.activeTicketsCount ?? 0} active tickets
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Assignment Note (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Instructions or priority focus for this technician..."
              value={assignNote}
              onChange={(e) => setAssignNote(e.target.value)}
              className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAssignModalOpen(false)}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isAssigning || !assigneeUserId}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {isAssigning ? 'Assigning...' : 'Assign Technician'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Change Priority Modal */}
      <Dialog
        isOpen={isPriorityModalOpen}
        onClose={() => setIsPriorityModalOpen(false)}
        title="Escalate / Adjust Priority"
        description="Priority updates will be logged on the ticket timeline audit trail."
      >
        <form onSubmit={handleUpdatePriority} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Priority Level
            </label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical (Line Stoppage)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Reason for Adjustment
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Production line impacted, parts delayed..."
              value={priorityNote}
              onChange={(e) => setPriorityNote(e.target.value)}
              className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPriorityModalOpen(false)}
              disabled={isUpdatingPriority}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUpdatingPriority}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {isUpdatingPriority ? 'Saving...' : 'Update Priority'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
