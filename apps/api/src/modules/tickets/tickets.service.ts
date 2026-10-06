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
  TicketStatsQueryDto,
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
  RESOLVED: ['CLOSED', 'IN_PROGRESS', 'OPEN'],
  CLOSED: ['OPEN', 'IN_PROGRESS'],
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
  source: true,
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
  // Generate ticket number: KAL-2026-0001 per tenant (Collision-free)
  // ─────────────────────────────────────────────────────────────────────────
  private async generateTicketNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `KAL-${year}-`;

    const lastTicket = await this.prisma.serviceTicket.findFirst({
      where: {
        tenantId,
        ticketNumber: { startsWith: prefix },
      },
      orderBy: { ticketNumber: 'desc' },
      select: { ticketNumber: true },
    });

    let nextNum = 1;
    if (lastTicket?.ticketNumber) {
      const match = lastTicket.ticketNumber.match(/KAL-\d{4}-(\d+)/);
      if (match && match[1]) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    // Double check that the candidate ticketNumber is truly unique in this tenant
    while (true) {
      const candidate = `KAL-${year}-${String(nextNum).padStart(4, '0')}`;
      const existing = await this.prisma.serviceTicket.findFirst({
        where: {
          tenantId,
          ticketNumber: candidate,
        },
        select: { id: true },
      });
      if (!existing) {
        return candidate;
      }
      nextNum++;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Create ticket with policy-aware intake validation
  // ─────────────────────────────────────────────────────────────────────────
  async createTicket(tenantId: string, actorUserId: string | null | undefined, dto: CreateTicketDto) {
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
          source: dto.source || 'PORTAL',
          raisedByUserId: (actorUserId && actorUserId.length > 0) ? actorUserId : null,
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
          actorUserId: (actorUserId && actorUserId.length > 0) ? actorUserId : null,
          newStatus: 'OPEN',
          metadata: { ticketNumber, title: dto.title, priority: dto.priority ?? 'MEDIUM', source: dto.source || 'PORTAL' },
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
          assignedByUserId: actorUserId || undefined,
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
  async addNote(tenantId: string, ticketId: string, actorUserId: string | null | undefined, dto: AddTicketNoteDto) {
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
        actorUserId: (actorUserId && actorUserId.length > 0) ? actorUserId : null,
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
  // Dashboard stats — Overall Company View for Client Admin
  // ─────────────────────────────────────────────────────────────────────────
  async getStats(tenantId: string, query?: TicketStatsQueryDto) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const baseWhere: Prisma.ServiceTicketWhereInput = {
      tenantId,
      deletedAt: null,
    };

    // Filter: Date Range
    if (query?.startDate || query?.endDate) {
      baseWhere.createdAt = {};
      if (query.startDate) baseWhere.createdAt.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        baseWhere.createdAt.lte = end;
      }
    }

    // Filter: Department
    if (query?.departmentId && query.departmentId !== 'ALL') {
      baseWhere.departmentId = query.departmentId;
    }

    // Filter: Employee
    if (query?.employeeId && query.employeeId !== 'ALL') {
      baseWhere.assignedToUserId = query.employeeId;
    }

    // Filter: Customer
    if (query?.customerId && query.customerId !== 'ALL') {
      baseWhere.raisedForCustomerId = query.customerId;
    }

    // Filter: Product
    if (query?.productId && query.productId !== 'ALL') {
      baseWhere.productId = query.productId;
    }

    // Filter: Service
    if (query?.serviceId && query.serviceId !== 'ALL') {
      baseWhere.serviceCatalogId = query.serviceId;
    }

    // Filter: Status
    if (query?.status && query.status !== 'ALL') {
      baseWhere.status = query.status as TicketStatus;
    }

    const policy = await this.prisma.tenantPolicy.findUnique({ where: { tenantId } });
    const tolerableDays = policy?.tolerableOpenDays ?? 5;
    const agingThreshold = new Date(Date.now() - tolerableDays * 24 * 60 * 60 * 1000);

    const [
      totalCount,
      openCount,
      assignedCount,
      inProgressCount,
      awaitingCustomerCount,
      resolvedCount,
      closedCount,
      cancelledCount,
      overdueCount,
      agingCount,
      createdTodayCount,
      closedTodayCount,
      allMatchingTickets,
      departments,
      recentActivity,
      unreadNotifications,
      totalCustomers,
      totalEmployees,
    ] = await Promise.all([
      this.prisma.serviceTicket.count({ where: baseWhere }),
      this.prisma.serviceTicket.count({ where: { ...baseWhere, status: 'OPEN' } }),
      this.prisma.serviceTicket.count({ where: { ...baseWhere, status: 'ASSIGNED' } }),
      this.prisma.serviceTicket.count({ where: { ...baseWhere, status: 'IN_PROGRESS' } }),
      this.prisma.serviceTicket.count({ where: { ...baseWhere, status: 'AWAITING_CUSTOMER' } }),
      this.prisma.serviceTicket.count({ where: { ...baseWhere, status: 'RESOLVED' } }),
      this.prisma.serviceTicket.count({ where: { ...baseWhere, status: 'CLOSED' } }),
      this.prisma.serviceTicket.count({ where: { ...baseWhere, status: 'CANCELLED' } }),
      this.prisma.serviceTicket.count({ where: { ...baseWhere, isOverdue: true } }),
      this.prisma.serviceTicket.count({
        where: {
          ...baseWhere,
          status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_CUSTOMER'] },
          createdAt: { lte: agingThreshold },
        },
      }),
      this.prisma.serviceTicket.count({
        where: { ...baseWhere, createdAt: { gte: todayStart } },
      }),
      this.prisma.serviceTicket.count({
        where: {
          ...baseWhere,
          OR: [
            { closedAt: { gte: todayStart } },
            { resolvedAt: { gte: todayStart } },
            { status: 'CLOSED', updatedAt: { gte: todayStart } },
          ],
        },
      }),
      this.prisma.serviceTicket.findMany({
        where: baseWhere,
        select: {
          id: true,
          ticketNumber: true,
          title: true,
          status: true,
          priority: true,
          isOverdue: true,
          createdAt: true,
          departmentId: true,
          department: { select: { id: true, name: true } },
          raisedForCustomerId: true,
          raisedForCustomer: { select: { id: true, companyName: true } },
          productId: true,
          product: { select: { id: true, name: true } },
          serviceCatalogId: true,
          serviceCatalog: { select: { id: true, name: true } },
          serviceType: true,
          assignedTo: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.department.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, name: true },
      }),
      this.prisma.ticketTimeline.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: {
          actor: { select: { fullName: true, email: true } },
          ticket: { select: { ticketNumber: true, title: true, status: true, priority: true } },
        },
      }),
      this.prisma.notification.findMany({
        where: { tenantId, isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.customer.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.employeeProfile.count({ where: { tenantId, user: { deletedAt: null } } }),
    ]);

    // 1. Group Breakdown: Tickets by Department
    const deptCountMap: Record<string, { id: string; name: string; count: number }> = {};
    for (const d of departments) {
      deptCountMap[d.id] = { id: d.id, name: d.name, count: 0 };
    }
    let unassignedDeptCount = 0;
    for (const t of allMatchingTickets) {
      const dept = t.departmentId ? deptCountMap[t.departmentId] : undefined;
      if (dept) {
        dept.count += 1;
      } else {
        unassignedDeptCount += 1;
      }
    }
    const ticketsByDepartment = Object.values(deptCountMap).map((d) => ({
      id: d.id,
      name: d.name,
      count: d.count,
      percentage: totalCount > 0 ? Math.round((d.count / totalCount) * 100) : 0,
    }));
    if (unassignedDeptCount > 0) {
      ticketsByDepartment.push({
        id: 'unassigned',
        name: 'General / No Dept',
        count: unassignedDeptCount,
        percentage: totalCount > 0 ? Math.round((unassignedDeptCount / totalCount) * 100) : 0,
      });
    }
    ticketsByDepartment.sort((a, b) => b.count - a.count);

    // 2. Group Breakdown: Tickets by Status
    const statusOrder: { status: TicketStatus; label: string; color: string }[] = [
      { status: 'OPEN', label: 'Open', color: 'bg-sky-500' },
      { status: 'ASSIGNED', label: 'Assigned', color: 'bg-blue-500' },
      { status: 'IN_PROGRESS', label: 'In Progress', color: 'bg-indigo-500' },
      { status: 'AWAITING_CUSTOMER', label: 'Awaiting Customer', color: 'bg-amber-500' },
      { status: 'RESOLVED', label: 'Resolved', color: 'bg-teal-500' },
      { status: 'CLOSED', label: 'Closed', color: 'bg-emerald-500' },
      { status: 'CANCELLED', label: 'Cancelled', color: 'bg-slate-400' },
    ];
    const statusCounts: Record<string, number> = {
      OPEN: openCount,
      ASSIGNED: assignedCount,
      IN_PROGRESS: inProgressCount,
      AWAITING_CUSTOMER: awaitingCustomerCount,
      RESOLVED: resolvedCount,
      CLOSED: closedCount,
      CANCELLED: cancelledCount,
    };
    const ticketsByStatus = statusOrder.map((s) => {
      const c = statusCounts[s.status] || 0;
      return {
        status: s.status,
        label: s.label,
        color: s.color,
        count: c,
        percentage: totalCount > 0 ? Math.round((c / totalCount) * 100) : 0,
      };
    });

    // 3. Group Breakdown: Tickets by Customer
    const customerCountMap: Record<string, { id: string; name: string; count: number }> = {};
    for (const t of allMatchingTickets) {
      const cid = t.raisedForCustomerId || 'walkin';
      const cname = t.raisedForCustomer?.companyName || 'Direct / Walk-in';
      let entry = customerCountMap[cid];
      if (!entry) {
        entry = { id: cid, name: cname, count: 0 };
        customerCountMap[cid] = entry;
      }
      entry.count += 1;
    }
    const ticketsByCustomer = Object.values(customerCountMap)
      .map((c) => ({
        id: c.id,
        name: c.name,
        count: c.count,
        percentage: totalCount > 0 ? Math.round((c.count / totalCount) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // 4. Group Breakdown: Tickets by Product / Service
    const productServiceMap: Record<string, { id: string; name: string; type: 'PRODUCT' | 'SERVICE'; count: number }> = {};
    for (const t of allMatchingTickets) {
      if (t.productId && t.product) {
        const key = `prod_${t.productId}`;
        let entry = productServiceMap[key];
        if (!entry) {
          entry = { id: t.productId, name: t.product.name, type: 'PRODUCT', count: 0 };
          productServiceMap[key] = entry;
        }
        entry.count += 1;
      }
      if (t.serviceCatalogId && t.serviceCatalog) {
        const key = `serv_${t.serviceCatalogId}`;
        let entry = productServiceMap[key];
        if (!entry) {
          entry = { id: t.serviceCatalogId, name: t.serviceCatalog.name, type: 'SERVICE', count: 0 };
          productServiceMap[key] = entry;
        }
        entry.count += 1;
      } else if (!t.productId && !t.serviceCatalogId) {
        const key = `type_${t.serviceType || 'General'}`;
        let entry = productServiceMap[key];
        if (!entry) {
          entry = { id: key, name: t.serviceType || 'General Service', type: 'SERVICE', count: 0 };
          productServiceMap[key] = entry;
        }
        entry.count += 1;
      }
    }
    const ticketsByProductService = Object.values(productServiceMap)
      .map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        count: item.count,
        percentage: totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // 5. Compute Long-open / Overdue
    const overdueOrAgingSet = new Set<string>();
    for (const t of allMatchingTickets) {
      if (t.isOverdue) {
        overdueOrAgingSet.add(t.id);
      } else if (
        ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_CUSTOMER'].includes(t.status) &&
        new Date(t.createdAt) <= agingThreshold
      ) {
        overdueOrAgingSet.add(t.id);
      }
    }
    const longOpenOverdue = overdueOrAgingSet.size;

    // 6. Important Notifications & Alerts
    const importantNotifications: Array<{
      id: string;
      title: string;
      message: string;
      type: 'CRITICAL_TICKET' | 'OVERDUE_SLA' | 'SYSTEM' | 'INFO';
      severity: 'critical' | 'warning' | 'info';
      createdAt: string;
      ticketId?: string;
      ticketNumber?: string;
    }> = [];

    // Critical Open Tickets Alert
    const criticalTickets = allMatchingTickets.filter(
      (t) => t.priority === 'CRITICAL' && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(t.status)
    );
    if (criticalTickets.length > 0) {
      importantNotifications.push({
        id: 'alert-critical',
        title: `${criticalTickets.length} Critical Ticket${criticalTickets.length > 1 ? 's' : ''} Require Immediate Attention`,
        message: `Highest priority tickets currently active: ${criticalTickets.slice(0, 3).map((t) => t.ticketNumber).join(', ')}`,
        type: 'CRITICAL_TICKET',
        severity: 'critical',
        createdAt: new Date().toISOString(),
        ticketId: criticalTickets[0]?.id,
        ticketNumber: criticalTickets[0]?.ticketNumber,
      });
    }

    // Overdue SLA Alert
    if (overdueCount > 0) {
      importantNotifications.push({
        id: 'alert-overdue',
        title: `${overdueCount} Ticket${overdueCount > 1 ? 's' : ''} Exceeded SLA Resolution Window`,
        message: `Response or resolution time limits breached. Review tickets flagged as overdue.`,
        type: 'OVERDUE_SLA',
        severity: 'warning',
        createdAt: new Date().toISOString(),
      });
    }

    // Append Database Notifications
    for (const n of unreadNotifications) {
      importantNotifications.push({
        id: n.id,
        title: n.title,
        message: n.message,
        type: 'SYSTEM',
        severity: 'info',
        createdAt: n.createdAt.toISOString(),
      });
    }

    return {
      total: totalCount,
      open: openCount,
      inProgress: inProgressCount + assignedCount,
      closed: closedCount + resolvedCount,
      longOpenOverdue,
      createdToday: createdTodayCount,
      closedToday: closedTodayCount,

      // Extra statuses & counters
      assigned: assignedCount,
      inProgressOnly: inProgressCount,
      awaitingCustomer: awaitingCustomerCount,
      resolved: resolvedCount,
      closedOnly: closedCount,
      cancelled: cancelledCount,
      overdue: overdueCount,
      aging: agingCount,
      totalCustomers,
      totalEmployees,
      maxUsersQuota: policy?.maxUsersQuota ?? 5,

      // Group Breakdowns
      ticketsByDepartment,
      ticketsByStatus,
      ticketsByCustomer,
      ticketsByProductService,

      // Streams
      recentActivity,
      importantNotifications,
      recentTickets: allMatchingTickets.slice(0, 6),
    };
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
