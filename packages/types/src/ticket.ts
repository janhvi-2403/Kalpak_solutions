// ============================================================================
// Ticket Lifecycle & Routing — Shared TypeScript Contracts
// ============================================================================

export enum TicketStatusEnum {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  AWAITING_CUSTOMER = 'AWAITING_CUSTOMER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum TicketPriorityEnum {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TicketRaisedByEnum {
  CUSTOMER = 'CUSTOMER',
  EMPLOYEE = 'EMPLOYEE',
}

export enum TicketEventTypeEnum {
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  REASSIGNED = 'REASSIGNED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  NOTE_ADDED = 'NOTE_ADDED',
  PRIORITY_CHANGED = 'PRIORITY_CHANGED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
  OVERDUE_FLAGGED = 'OVERDUE_FLAGGED',
  RESOLVED = 'RESOLVED',
}

// Valid state transitions from each status
export const VALID_TICKET_TRANSITIONS: Record<TicketStatusEnum, TicketStatusEnum[]> = {
  [TicketStatusEnum.OPEN]: [TicketStatusEnum.ASSIGNED, TicketStatusEnum.CANCELLED],
  [TicketStatusEnum.ASSIGNED]: [TicketStatusEnum.IN_PROGRESS, TicketStatusEnum.OPEN, TicketStatusEnum.CANCELLED],
  [TicketStatusEnum.IN_PROGRESS]: [
    TicketStatusEnum.AWAITING_CUSTOMER,
    TicketStatusEnum.RESOLVED,
    TicketStatusEnum.CANCELLED,
  ],
  [TicketStatusEnum.AWAITING_CUSTOMER]: [TicketStatusEnum.IN_PROGRESS, TicketStatusEnum.RESOLVED, TicketStatusEnum.CANCELLED],
  [TicketStatusEnum.RESOLVED]: [TicketStatusEnum.CLOSED, TicketStatusEnum.IN_PROGRESS],
  [TicketStatusEnum.CLOSED]: [],
  [TicketStatusEnum.CANCELLED]: [TicketStatusEnum.OPEN],
};

// DTO types
export interface CreateTicketDto {
  title: string;
  description: string;
  priority?: TicketPriorityEnum;
  raisedBy?: TicketRaisedByEnum;
  raisedForCustomerId?: string;
  departmentId?: string;
  customerAssetId?: string;
  assignedToUserId?: string;
}

export interface UpdateTicketStatusDto {
  status: TicketStatusEnum;
  note?: string;
}

export interface AssignTicketDto {
  assignedToUserId: string;
  departmentId?: string;
  note?: string;
}

export interface AddTicketNoteDto {
  note: string;
}

export interface UpdateTicketPriorityDto {
  priority: TicketPriorityEnum;
  note?: string;
}

// Response shape for ticket list items
export interface TicketListItemDto {
  id: string;
  ticketNumber: string;
  title: string;
  status: TicketStatusEnum;
  priority: TicketPriorityEnum;
  isOverdue: boolean;
  raisedBy: TicketRaisedByEnum;
  raisedForCustomer?: { id: string; companyName: string } | null;
  assignedTo?: { id: string; fullName: string; email: string } | null;
  department?: { id: string; name: string; code: string } | null;
  customerAsset?: { id: string; serialNumber: string; product: { name: string; modelNumber: string } } | null;
  createdAt: string;
  updatedAt: string;
  dueAt?: string | null;
}

// Response shape for ticket detail
export interface TicketDetailDto extends TicketListItemDto {
  description: string;
  tolerableOpenDays: number;
  resolvedAt?: string | null;
  closedAt?: string | null;
  timeline: TicketTimelineItemDto[];
  assignments: TicketAssignmentItemDto[];
}

export interface TicketTimelineItemDto {
  id: string;
  eventType: TicketEventTypeEnum;
  previousStatus?: TicketStatusEnum | null;
  newStatus?: TicketStatusEnum | null;
  note?: string | null;
  metadata: Record<string, unknown>;
  actor?: { id: string; fullName: string; email: string } | null;
  createdAt: string;
}

export interface TicketAssignmentItemDto {
  id: string;
  assignedToUserId: string;
  assignedTo: { id: string; fullName: string; email: string };
  assignedBy?: { id: string; fullName: string; email: string } | null;
  department?: { id: string; name: string; code: string } | null;
  isActive: boolean;
  assignedAt: string;
  unassignedAt?: string | null;
}

// Dashboard stats
export interface TicketStatsDto {
  total: number;
  open: number;
  assigned: number;
  inProgress: number;
  awaitingCustomer: number;
  resolved: number;
  closed: number;
  cancelled: number;
  overdue: number;
  resolvedToday: number;
  createdToday: number;
}

// Paginated ticket list response
export interface PaginatedTicketsDto {
  data: TicketListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
