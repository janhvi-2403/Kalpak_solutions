import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateTicketDto,
  UpdateTicketStatusDto,
  AssignTicketDto,
  AddTicketNoteDto,
  UpdateTicketPriorityDto,
} from './dto/ticket.dto';
import { AuditEventType } from '@kalpak/types';
import { TicketStatus, TicketEventType, Prisma } from '@kalpak/database';
import { NotificationsService } from '../notifications/notifications.service';

// State machine: which transitions are allowed
const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'OPEN', 'CANCELLED'],
  IN_PROGRESS: ['AWAITING_CUSTOMER', 'RESOLVED', 'CANCELLED'],
  AWAITING_CUSTOMER: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
  CANCELLED: ['OPEN'],
};

// Closure authorities that allow CLOSED transition
const CLOSURE_AUTHORITY_MAP: Record<string, string[]> = {
  SUPPORT_EMPLOYEE: ['SUPPORT_EMPLOYEE', 'DEPT_HEAD', 'DEPARTMENT_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'CLIENT_ADMIN'],
  CLIENT: ['CLIENT', 'CUSTOMER', 'ADMIN', 'SUPER_ADMIN', 'CLIENT_ADMIN'],
  ADMIN: ['ADMIN', 'SUPER_ADMIN', 'CLIENT_ADMIN'],
  DEPT_HEAD: ['DEPT_HEAD', 'DEPARTMENT_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'CLIENT_ADMIN'],
  ANYONE: ['CLIENT_ADMIN', 'SUPPORT_EMPLOYEE', 'DEPT_HEAD', 'DEPARTMENT_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'CLIENT', 'CUSTOMER'],
};

const TICKET_SELECT = {
  id: true,
  ticketNumber: true,
  title: true,
  status: true,
  priority: true,
  raisedBy: true,
  isOverdue: true,
  tolerableOpenDays: true,
  dueAt: true,
  resolvedAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  raisedForCustomer: {
    select: { id: true, companyName: true },
  },
  assignedTo: {
    select: { id: true, fullName: true, email: true },
  },
  department: {
    select: { id: true, name: true, code: true },
  },
  customerAsset: {
    select: {
      id: true,
      serialNumber: true,
      product: { select: { name: true, modelNumber: true } },
    },
  },
} satisfies Prisma.ServiceTicketSelect;

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Generate ticket number: KAL-2026-0001 per tenant
  // ─────────────────────────────────────────────────────────────────────────
  private async generateTicketNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.serviceTicket.count({
      where: { tenantId },
    });
    const seq = String(count + 1).padStart(4, '0');
    return `KAL-${year}-${seq}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Create ticket with policy-aware intake validation
  // ─────────────────────────────────────────────────────────────────────────
  async createTicket(tenantId: string, actorUserId: string, dto: CreateTicketDto) {
    // Load policy for intake permission checks
    const policy = await this.prisma.tenantPolicy.findUnique({ where: { tenantId } });

    if (policy) {
      if (dto.raisedBy === 'CUSTOMER' && !policy.allowCustomerToRaise) {
        throw new ForbiddenException('Tenant policy does not allow customers to raise tickets');
      }
      if (dto.raisedBy === 'EMPLOYEE' && dto.raisedForCustomerId && !policy.allowEmployeeOnBehalf) {
        throw new ForbiddenException('Tenant policy does not allow employees to raise tickets on behalf of customers');
      }
    }

    const ticketNumber = await this.generateTicketNumber(tenantId);
    const tolerableOpenDays = policy?.tolerableOpenDays ?? 3;
    const dueAt = new Date(Date.now() + tolerableOpenDays * 24 * 60 * 60 * 1000);

    // Validate foreign keys exist in this tenant
    if (dto.raisedForCustomerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.raisedForCustomerId, tenantId, deletedAt: null },
      });
      if (!customer) throw new NotFoundException(`Customer not found`);
    }

    if (dto.departmentId) {
      const dept = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, tenantId, deletedAt: null },
      });
      if (!dept) throw new NotFoundException(`Department not found`);
    }

    if (dto.customerAssetId) {
      const asset = await this.prisma.customerAsset.findFirst({
        where: { id: dto.customerAssetId, tenantId, deletedAt: null },
      });
      if (!asset) throw new NotFoundException(`Asset not found`);
    }

    // If assignedToUserId provided at creation, status becomes ASSIGNED
    const initialStatus: TicketStatus = dto.assignedToUserId ? 'ASSIGNED' : 'OPEN';

    const ticket = await this.prisma.$transaction(async (tx) => {
      const created = await tx.serviceTicket.create({
        data: {
          tenantId,
          ticketNumber,
          title: dto.title,
          description: dto.description,
          status: initialStatus,
          priority: (dto.priority ?? 'MEDIUM') as any,
          raisedBy: (dto.raisedBy ?? 'EMPLOYEE') as any,
          raisedByUserId: actorUserId,
          raisedForCustomerId: dto.raisedForCustomerId,
          departmentId: dto.departmentId,
          customerAssetId: dto.customerAssetId,
          assignedToUserId: dto.assignedToUserId,
          tolerableOpenDays,
          dueAt,
        },
        select: TICKET_SELECT,
      });

      // Create CREATED timeline event
      await tx.ticketTimeline.create({
        data: {
          tenantId,
          ticketId: created.id,
          eventType: TicketEventType.CREATED,
          actorUserId,
          newStatus: 'OPEN',
          metadata: { ticketNumber, title: dto.title, priority: dto.priority ?? 'MEDIUM' },
        },
      });

      // If pre-assigned, create assignment record and ASSIGNED event
      if (dto.assignedToUserId) {
        await tx.ticketAssignment.create({
          data: {
            tenantId,
            ticketId: created.id,
            assignedToUserId: dto.assignedToUserId,
            assignedByUserId: actorUserId,
            departmentId: dto.departmentId,
            isActive: true,
          },
        });

        await tx.ticketTimeline.create({
          data: {
            tenantId,
            ticketId: created.id,
            eventType: TicketEventType.ASSIGNED,
            actorUserId,
            previousStatus: 'OPEN',
            newStatus: 'ASSIGNED',
            metadata: { assignedToUserId: dto.assignedToUserId },
          },
        });

        // Increment activeTicketsCount on employee
        await tx.employeeProfile.updateMany({
          where: { userId: dto.assignedToUserId, tenantId },
          data: { activeTicketsCount: { increment: 1 } },
        });
      }

      return created;
    });

    await this.auditService.record({
      tenantId,
      actorId: actorUserId,
      eventType: AuditEventType.TENANT_UPDATED,
      resourceType: 'ServiceTicket',
      resourceId: ticket.id,
      action: 'ticket_created',
      metadata: { ticketNumber, action: 'created' },
    });

    // Multi-channel Notification Dispatch
    let customerEmail: string | null = null;
    let customerPhone: string | null = null;
    if (dto.raisedForCustomerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.raisedForCustomerId },
        select: { email: true, phone: true },
      });
      customerEmail = customer?.email ?? null;
      customerPhone = customer?.phone ?? null;
    }

    await this.notificationsService.dispatchTicketCreated({
      tenantId,
      ticket,
      actorUserId,
      customerEmail,
      customerPhone,
    });

    if (dto.assignedToUserId) {
      const tech = await this.prisma.user.findUnique({
        where: { id: dto.assignedToUserId },
        select: { id: true, fullName: true, email: true, phoneNumber: true },
      });
      if (tech) {
        await this.notificationsService.dispatchTicketAssigned({
          tenantId,
          ticket,
          technician: {
            id: tech.id,
            fullName: tech.fullName,
            email: tech.email,
            phone: tech.phoneNumber,
          },
          assignedByUserId: actorUserId,
        });
      }
    }

    return ticket;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // List tickets with full filtering, pagination, and sorting
  // ─────────────────────────────────────────────────────────────────────────
  async listTickets(tenantId: string, query: {
    page?: number;
    pageSize?: number;
    status?: string;
    priority?: string;
    departmentId?: string;
    assignedToUserId?: string;
    raisedForCustomerId?: string;
    isOverdue?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ServiceTicketWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.status && { status: query.status as TicketStatus }),
      ...(query.priority && { priority: query.priority as any }),
      ...(query.departmentId && { departmentId: query.departmentId }),
      ...(query.assignedToUserId && { assignedToUserId: query.assignedToUserId }),
      ...(query.raisedForCustomerId && { raisedForCustomerId: query.raisedForCustomerId }),
      ...(query.isOverdue !== undefined && { isOverdue: query.isOverdue }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { ticketNumber: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const sortField = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.serviceTicket.findMany({
        where,
        select: TICKET_SELECT,
        orderBy: { [sortField]: sortOrder },
        skip,
        take: pageSize,
      }),
      this.prisma.serviceTicket.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Get single ticket detail with timeline and assignment history
  // ─────────────────────────────────────────────────────────────────────────
  async getTicketById(tenantId: string, id: string) {
    const ticket = await this.prisma.serviceTicket.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        raisedForCustomer: { select: { id: true, companyName: true } },
        assignedTo: { select: { id: true, fullName: true, email: true } },
        department: { select: { id: true, name: true, code: true } },
        customerAsset: {
          select: {
            id: true,
            serialNumber: true,
            product: { select: { name: true, modelNumber: true } },
          },
        },
        timeline: {
          orderBy: { createdAt: 'asc' },
          include: {
            actor: { select: { id: true, fullName: true, email: true } },
          },
        },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          include: {
            assignedTo: { select: { id: true, fullName: true, email: true } },
            assignedBy: { select: { id: true, fullName: true, email: true } },
            department: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!ticket) throw new NotFoundException(`Ticket not found`);
    return ticket;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Update ticket status with state machine enforcement
  // ─────────────────────────────────────────────────────────────────────────
  async updateStatus(
    tenantId: string,
    ticketId: string,
    actorUserId: string,
    dto: UpdateTicketStatusDto,
    actorRole?: string,
  ) {
    const ticket = await this.prisma.serviceTicket.findFirst({
      where: { id: ticketId, tenantId, deletedAt: null },
    });
    if (!ticket) throw new NotFoundException(`Ticket not found`);

    const allowed = VALID_TRANSITIONS[ticket.status];
    if (!allowed.includes(dto.status as TicketStatus)) {
      throw new BadRequestException(
        `Cannot transition ticket from ${ticket.status} to ${dto.status}. Allowed: [${allowed.join(', ')}]`,
      );
    }

    // For CLOSED, check closure authority from policy
    if (dto.status === 'CLOSED') {
      const policy = await this.prisma.tenantPolicy.findUnique({ where: { tenantId } });
      const closureAuthority = policy?.closureAuthority ?? 'SUPPORT_EMPLOYEE';
      const allowedRoles = CLOSURE_AUTHORITY_MAP[closureAuthority] ?? [];

      let role = actorRole;
      if (!role) {
        const membership = await this.prisma.tenantMembership.findUnique({
          where: { uq_membership_tenant_user: { tenantId, userId: actorUserId } },
          include: { role: true },
        });
        role = membership?.role?.name ?? 'SUPPORT_EMPLOYEE';
      }

      if (!allowedRoles.includes(role)) {
        throw new ForbiddenException(
          `Closure authority is restricted to roles: ${allowedRoles.join(', ')}. Your role: ${role}`,
        );
      }
    }

    const now = new Date();
    const updateData: Prisma.ServiceTicketUpdateInput = {
      status: dto.status as TicketStatus,
      ...(dto.status === 'RESOLVED' && { resolvedAt: now }),
      ...(dto.status === 'CLOSED' && { closedAt: now }),
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.serviceTicket.update({
        where: { id: ticketId },
        data: updateData,
      });

      await tx.ticketTimeline.create({
        data: {
          tenantId,
          ticketId,
          eventType: TicketEventType.STATUS_CHANGED,
          actorUserId,
          previousStatus: ticket.status,
          newStatus: dto.status as TicketStatus,
          note: dto.note,
          metadata: { fromStatus: ticket.status, toStatus: dto.status },
        },
      });

      // If resolved or closed, decrement employee active ticket count
      if (['RESOLVED', 'CLOSED', 'CANCELLED'].includes(dto.status) && ticket.assignedToUserId) {
        await tx.employeeProfile.updateMany({
          where: { userId: ticket.assignedToUserId, tenantId },
          data: { activeTicketsCount: { decrement: 1 } },
        });
      }

      // If reopened from resolved, increment again
      if (ticket.status === 'RESOLVED' && dto.status === 'IN_PROGRESS' && ticket.assignedToUserId) {
        await tx.employeeProfile.updateMany({
          where: { userId: ticket.assignedToUserId, tenantId },
          data: { activeTicketsCount: { increment: 1 } },
        });
      }
    });

    const updated = await this.getTicketById(tenantId, ticketId);

    // Multi-channel Status Notification Dispatch
    let customerEmail: string | null = null;
    let customerPhone: string | null = null;
    if (updated.raisedForCustomer?.id) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: updated.raisedForCustomer.id },
        select: { email: true, phone: true },
      });
      customerEmail = customer?.email ?? null;
      customerPhone = customer?.phone ?? null;
    }

    const notifyUserIds = [
      updated.assignedTo?.id,
      ticket.raisedByUserId,
      actorUserId,
    ].filter(Boolean) as string[];

    await this.notificationsService.dispatchStatusChanged({
      tenantId,
      ticket: updated,
      oldStatus: ticket.status,
      newStatus: dto.status,
      notifyUserIds,
      customerEmail,
      customerPhone,
      note: dto.note,
    });

    return updated;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Assign ticket (manual or re-assign)
  // ─────────────────────────────────────────────────────────────────────────
  async assignTicket(tenantId: string, ticketId: string, actorUserId: string, dto: AssignTicketDto) {
    const ticket = await this.prisma.serviceTicket.findFirst({
      where: { id: ticketId, tenantId, deletedAt: null },
    });
    if (!ticket) throw new NotFoundException(`Ticket not found`);
    if (['CLOSED', 'CANCELLED'].includes(ticket.status)) {
      throw new BadRequestException(`Cannot assign a ${ticket.status} ticket`);
    }

    const isReassign = Boolean(ticket.assignedToUserId);
    const eventType = isReassign ? TicketEventType.REASSIGNED : TicketEventType.ASSIGNED;

    await this.prisma.$transaction(async (tx) => {
      // Deactivate old assignments
      if (isReassign && ticket.assignedToUserId) {
        await tx.ticketAssignment.updateMany({
          where: { ticketId, isActive: true },
          data: { isActive: false, unassignedAt: new Date() },
        });

        // Decrement old assignee's count
        await tx.employeeProfile.updateMany({
          where: { userId: ticket.assignedToUserId, tenantId },
          data: { activeTicketsCount: { decrement: 1 } },
        });
      }

      // Create new assignment
      await tx.ticketAssignment.create({
        data: {
          tenantId,
          ticketId,
          assignedToUserId: dto.assignedToUserId,
          assignedByUserId: actorUserId,
          departmentId: dto.departmentId,
          isActive: true,
        },
      });

      // Update ticket
      await tx.serviceTicket.update({
        where: { id: ticketId },
        data: {
          assignedToUserId: dto.assignedToUserId,
          departmentId: dto.departmentId ?? ticket.departmentId,
          status: ticket.status === 'OPEN' ? 'ASSIGNED' : ticket.status,
        },
      });

      // Increment new assignee's count
      await tx.employeeProfile.updateMany({
        where: { userId: dto.assignedToUserId, tenantId },
        data: { activeTicketsCount: { increment: 1 } },
      });

      // Timeline event
      await tx.ticketTimeline.create({
        data: {
          tenantId,
          ticketId,
          eventType,
          actorUserId,
          previousStatus: ticket.status,
          newStatus: ticket.status === 'OPEN' ? 'ASSIGNED' : ticket.status,
          note: dto.note,
          metadata: {
            assignedToUserId: dto.assignedToUserId,
            previousAssigneeId: ticket.assignedToUserId,
          },
        },
      });
    });

    const updated = await this.getTicketById(tenantId, ticketId);

    const tech = await this.prisma.user.findUnique({
      where: { id: dto.assignedToUserId },
      select: { id: true, fullName: true, email: true, phoneNumber: true },
    });

    if (tech) {
      await this.notificationsService.dispatchTicketAssigned({
        tenantId,
        ticket: updated,
        technician: {
          id: tech.id,
          fullName: tech.fullName,
          email: tech.email,
          phone: tech.phoneNumber,
        },
        assignedByUserId: actorUserId,
      });
    }

    return updated;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Add a note to ticket timeline
  // ─────────────────────────────────────────────────────────────────────────
  async addNote(tenantId: string, ticketId: string, actorUserId: string, dto: AddTicketNoteDto) {
    const ticket = await this.prisma.serviceTicket.findFirst({
      where: { id: ticketId, tenantId, deletedAt: null },
    });
    if (!ticket) throw new NotFoundException(`Ticket not found`);
    if (['CLOSED', 'CANCELLED'].includes(ticket.status)) {
      throw new BadRequestException(`Cannot add notes to a ${ticket.status} ticket`);
    }

    const event = await this.prisma.ticketTimeline.create({
      data: {
        tenantId,
        ticketId,
        eventType: TicketEventType.NOTE_ADDED,
        actorUserId,
        note: dto.note,
        metadata: {},
      },
      include: {
        actor: { select: { id: true, fullName: true, email: true } },
      },
    });

    return event;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Update ticket priority
  // ─────────────────────────────────────────────────────────────────────────
  async updatePriority(tenantId: string, ticketId: string, actorUserId: string, dto: UpdateTicketPriorityDto) {
    const ticket = await this.prisma.serviceTicket.findFirst({
      where: { id: ticketId, tenantId, deletedAt: null },
    });
    if (!ticket) throw new NotFoundException(`Ticket not found`);

    await this.prisma.$transaction(async (tx) => {
      await tx.serviceTicket.update({
        where: { id: ticketId },
        data: { priority: dto.priority as any },
      });

      await tx.ticketTimeline.create({
        data: {
          tenantId,
          ticketId,
          eventType: TicketEventType.PRIORITY_CHANGED,
          actorUserId,
          note: dto.note,
          metadata: { previousPriority: ticket.priority, newPriority: dto.priority },
        },
      });
    });

    return this.getTicketById(tenantId, ticketId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Dashboard stats
  // ─────────────────────────────────────────────────────────────────────────
  async getStats(tenantId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const tenantFilter = tenantId ? { tenantId } : {};

    const [counts, resolvedToday, createdToday] = await Promise.all([
      this.prisma.serviceTicket.groupBy({
        by: ['status', 'isOverdue'],
        where: { ...tenantFilter, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.serviceTicket.count({
        where: { ...tenantFilter, deletedAt: null, resolvedAt: { gte: todayStart } },
      }),
      this.prisma.serviceTicket.count({
        where: { ...tenantFilter, deletedAt: null, createdAt: { gte: todayStart } },
      }),
    ]);

    const stats = {
      total: 0,
      open: 0,
      assigned: 0,
      inProgress: 0,
      awaitingCustomer: 0,
      resolved: 0,
      closed: 0,
      cancelled: 0,
      overdue: 0,
      resolvedToday,
      createdToday,
    };

    for (const row of counts) {
      const count = row._count.id;
      stats.total += count;
      if (row.isOverdue) stats.overdue += count;

      switch (row.status) {
        case 'OPEN': stats.open += count; break;
        case 'ASSIGNED': stats.assigned += count; break;
        case 'IN_PROGRESS': stats.inProgress += count; break;
        case 'AWAITING_CUSTOMER': stats.awaitingCustomer += count; break;
        case 'RESOLVED': stats.resolved += count; break;
        case 'CLOSED': stats.closed += count; break;
        case 'CANCELLED': stats.cancelled += count; break;
      }
    }

    return stats;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SLA overdue check — called by BullMQ worker
  // ─────────────────────────────────────────────────────────────────────────
  async flagOverdueTickets(): Promise<{ flagged: number }> {
    const now = new Date();

    // Find tickets that are past their due date and not yet flagged
    const overdueTickets = await this.prisma.serviceTicket.findMany({
      where: {
        deletedAt: null,
        isOverdue: false,
        dueAt: { lt: now },
        status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] },
      },
      select: { id: true, tenantId: true },
    });

    if (overdueTickets.length === 0) return { flagged: 0 };

    await this.prisma.$transaction([
      this.prisma.serviceTicket.updateMany({
        where: { id: { in: overdueTickets.map((t) => t.id) } },
        data: { isOverdue: true },
      }),
      ...overdueTickets.map((t) =>
        this.prisma.ticketTimeline.create({
          data: {
            tenantId: t.tenantId,
            ticketId: t.id,
            eventType: TicketEventType.OVERDUE_FLAGGED,
            note: 'Ticket exceeded tolerable open period and has been flagged as overdue.',
            metadata: { flaggedAt: now.toISOString() },
          },
        }),
      ),
    ]);

    return { flagged: overdueTickets.length };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Auto assign (round-robin equal distribution)
  // ─────────────────────────────────────────────────────────────────────────
  async autoAssign(tenantId: string, ticketId: string, departmentId?: string): Promise<void> {
    const ticket = await this.prisma.serviceTicket.findFirst({
      where: { id: ticketId, tenantId, deletedAt: null },
    });
    if (!ticket || ticket.status !== 'OPEN') return;

    // Find available employees in the department (if specified) sorted by active ticket count
    const employees = await this.prisma.employeeProfile.findMany({
      where: {
        tenantId,
        isAvailable: true,
        ...(departmentId && { departmentId }),
      },
      orderBy: { activeTicketsCount: 'asc' },
      take: 1,
    });

    if (employees.length === 0) return;
    const assignee = employees[0];
    if (!assignee) return;

    await this.assignTicket(tenantId, ticketId, assignee.userId, {
      assignedToUserId: assignee.userId,
      departmentId: assignee.departmentId ?? undefined,
      note: 'Auto-assigned by system (equal distribution)',
    });
  }
}
