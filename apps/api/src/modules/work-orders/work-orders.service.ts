import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateWorkOrderDto,
  UpdateChecklistItemDto,
  CompleteWorkOrderDto,
  WorkOrderListQueryDto,
} from './dto/work-order.dto';
import {
  WorkOrderStatus,
  ChecklistStatus,
  TicketEventType,
  NotificationType,
  NotificationDeliveryChannel,
  Prisma,
} from '@kalpak/database';

const DEFAULT_CHECKLIST_ITEMS = [
  {
    itemCode: 'CHK-SAF-01',
    taskTitle: 'Pre-Work Safety & LOTO Verification',
    description: 'Verify machine power lockout/tagout and confirm safe working perimeter.',
    targetValue: 'Zero energy verified',
    sortOrder: 1,
  },
  {
    itemCode: 'CHK-MEC-02',
    taskTitle: 'Mechanical Inspection & Spindle Alignment',
    description: 'Inspect physical bearings, drive belts, guide ways, and measure radial runout.',
    targetValue: '< 0.005 mm runout',
    sortOrder: 2,
  },
  {
    itemCode: 'CHK-ELE-03',
    taskTitle: 'Electrical Supply & Motor Current Test',
    description: 'Measure input line voltage, grounding resistance, and phase balance under no-load.',
    targetValue: '415V ± 5%',
    sortOrder: 3,
  },
  {
    itemCode: 'CHK-LUB-04',
    taskTitle: 'Lubrication System Pressure & Filter Check',
    description: 'Check centralized lubrication pump flow, reservoir level, and hydraulic pressure.',
    targetValue: 'Pressure > 4.5 bar',
    sortOrder: 4,
  },
  {
    itemCode: 'CHK-RUN-05',
    taskTitle: 'Operational Test Run & Thermal/Vibration Audit',
    description: 'Execute full speed 15-minute test cycle; log spindle thermal rise and vibration peak.',
    targetValue: '< 70°C, < 1.2 mm/s',
    sortOrder: 5,
  },
];

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ticketsService: TicketsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Generate Work Order Number: WO-2026-0001 per tenant
  // ─────────────────────────────────────────────────────────────────────────
  private async generateOrderNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.workOrder.count({
      where: { tenantId },
    });
    const seq = String(count + 1).padStart(4, '0');
    return `WO-${year}-${seq}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Create Work Order
  // ─────────────────────────────────────────────────────────────────────────
  async createWorkOrder(tenantId: string, actorUserId: string, dto: CreateWorkOrderDto) {
    const ticket = await this.prisma.serviceTicket.findFirst({
      where: { id: dto.ticketId, tenantId, deletedAt: null },
      include: { raisedForCustomer: true, customerAsset: true },
    });

    if (!ticket) {
      throw new NotFoundException(`Service ticket ${dto.ticketId} not found`);
    }

    if (['CLOSED', 'CANCELLED'].includes(ticket.status)) {
      throw new BadRequestException(`Cannot create work order for a ${ticket.status} ticket`);
    }

    // Verify technician exists
    const tech = await this.prisma.user.findFirst({
      where: { id: dto.assignedTechnicianId, deletedAt: null },
    });
    if (!tech) {
      throw new NotFoundException(`Technician ${dto.assignedTechnicianId} not found`);
    }

    const orderNumber = await this.generateOrderNumber(tenantId);
    const scheduledDate = new Date(dto.scheduledDate);

    // Checklist templates: user supplied or standard industrial machinery defaults
    const itemsToCreate = (dto.checklistTemplates && dto.checklistTemplates.length > 0)
      ? dto.checklistTemplates.map((t, idx) => ({
          tenantId,
          itemCode: t.itemCode,
          taskTitle: t.taskTitle,
          description: t.description || null,
          targetValue: t.targetValue || null,
          sortOrder: idx + 1,
          status: ChecklistStatus.PENDING,
        }))
      : DEFAULT_CHECKLIST_ITEMS.map((item) => ({
          tenantId,
          itemCode: item.itemCode,
          taskTitle: item.taskTitle,
          description: item.description,
          targetValue: item.targetValue,
          sortOrder: item.sortOrder,
          status: ChecklistStatus.PENDING,
        }));

    const customerId = ticket.raisedForCustomerId || ticket.raisedForCustomer?.id;
    if (!customerId) {
      throw new BadRequestException('Ticket must have an associated customer to schedule field service');
    }

    const workOrder = await this.prisma.$transaction(async (tx) => {
      const created = await tx.workOrder.create({
        data: {
          tenantId,
          orderNumber,
          ticketId: dto.ticketId,
          assignedTechnicianId: dto.assignedTechnicianId,
          customerId,
          customerAssetId: ticket.customerAssetId,
          status: WorkOrderStatus.SCHEDULED,
          serviceType: dto.serviceType || 'ON_SITE_REPAIR',
          scheduledDate,
          technicianNotes: dto.technicianNotes,
          checklistItems: {
            create: itemsToCreate,
          },
        },
        include: {
          assignedTechnician: {
            select: { id: true, fullName: true, email: true, phoneNumber: true },
          },
          customer: {
            select: { id: true, companyName: true, contactPerson: true, phone: true, email: true },
          },
          customerAsset: {
            select: {
              id: true,
              serialNumber: true,
              product: { select: { name: true, modelNumber: true } },
            },
          },
          checklistItems: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      // Record event on ticket timeline
      await tx.ticketTimeline.create({
        data: {
          tenantId,
          ticketId: dto.ticketId,
          eventType: TicketEventType.NOTE_ADDED,
          actorUserId,
          note: `Field Service Work Order ${orderNumber} scheduled for ${scheduledDate.toLocaleDateString()} (${dto.serviceType || 'ON_SITE_REPAIR'}). Assigned to: ${tech.fullName}.`,
          metadata: {
            workOrderId: created.id,
            orderNumber,
            serviceType: dto.serviceType,
            scheduledDate: scheduledDate.toISOString(),
          },
        },
      });

      return created;
    });

    // In-app alert to assigned technician
    await this.notificationsService.createNotification({
      tenantId,
      userId: dto.assignedTechnicianId,
      type: NotificationType.TICKET_ASSIGNED,
      channel: NotificationDeliveryChannel.IN_APP,
      title: `Field Work Order Dispatched: ${orderNumber}`,
      message: `You have been scheduled for ${dto.serviceType || 'Field Service'} on ticket ${ticket.ticketNumber} for ${ticket.raisedForCustomer?.companyName || 'Customer'}.`,
      link: `/dashboard/tickets/${ticket.id}`,
      metadata: { workOrderId: workOrder.id, orderNumber, ticketId: ticket.id },
    });

    return workOrder;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // List Work Orders (by query)
  // ─────────────────────────────────────────────────────────────────────────
  async listWorkOrders(tenantId: string, query: WorkOrderListQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.WorkOrderWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.ticketId && { ticketId: query.ticketId }),
      ...(query.status && { status: query.status }),
      ...(query.assignedTechnicianId && { assignedTechnicianId: query.assignedTechnicianId }),
      ...(query.customerId && { customerId: query.customerId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        orderBy: { scheduledDate: 'desc' },
        skip,
        take: pageSize,
        include: {
          assignedTechnician: {
            select: { id: true, fullName: true, email: true, phoneNumber: true },
          },
          customer: {
            select: { id: true, companyName: true, contactPerson: true, phone: true },
          },
          customerAsset: {
            select: {
              id: true,
              serialNumber: true,
              product: { select: { name: true, modelNumber: true } },
            },
          },
          checklistItems: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Get Work Orders by Ticket ID
  // ─────────────────────────────────────────────────────────────────────────
  async getWorkOrdersByTicket(tenantId: string, ticketId: string) {
    return this.prisma.workOrder.findMany({
      where: { tenantId, ticketId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTechnician: {
          select: { id: true, fullName: true, email: true, phoneNumber: true },
        },
        customer: {
          select: { id: true, companyName: true, contactPerson: true, phone: true, email: true },
        },
        customerAsset: {
          select: {
            id: true,
            serialNumber: true,
            product: { select: { name: true, modelNumber: true } },
          },
        },
        checklistItems: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Get Work Order by ID
  // ─────────────────────────────────────────────────────────────────────────
  async getWorkOrderById(tenantId: string, workOrderId: string) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, tenantId, deletedAt: null },
      include: {
        assignedTechnician: {
          select: { id: true, fullName: true, email: true, phoneNumber: true },
        },
        customer: {
          select: { id: true, companyName: true, contactPerson: true, phone: true, email: true },
        },
        customerAsset: {
          select: {
            id: true,
            serialNumber: true,
            product: { select: { name: true, modelNumber: true } },
          },
        },
        checklistItems: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!workOrder) {
      throw new NotFoundException(`Work Order ${workOrderId} not found`);
    }

    return workOrder;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Start Work Order
  // ─────────────────────────────────────────────────────────────────────────
  async startWork(tenantId: string, workOrderId: string, actorUserId: string) {
    const workOrder = await this.getWorkOrderById(tenantId, workOrderId);

    if (workOrder.status === WorkOrderStatus.COMPLETED) {
      throw new BadRequestException('Work order is already completed');
    }

    const updated = await this.prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        status: WorkOrderStatus.IN_PROGRESS,
        workStartedAt: workOrder.workStartedAt ?? new Date(),
      },
      include: {
        checklistItems: { orderBy: { sortOrder: 'asc' } },
        assignedTechnician: true,
        customer: true,
      },
    });

    // Record on ticket timeline
    await this.prisma.ticketTimeline.create({
      data: {
        tenantId,
        ticketId: workOrder.ticketId,
        eventType: TicketEventType.NOTE_ADDED,
        actorUserId,
        note: `Technician started work on Field Service Work Order ${workOrder.orderNumber}.`,
        metadata: { workOrderId, orderNumber: workOrder.orderNumber, status: 'IN_PROGRESS' },
      },
    });

    return updated;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Update Checklist Item
  // ─────────────────────────────────────────────────────────────────────────
  async updateChecklistItem(
    tenantId: string,
    workOrderId: string,
    itemId: string,
    actorUserId: string,
    dto: UpdateChecklistItemDto,
  ) {
    const item = await this.prisma.workOrderChecklistItem.findFirst({
      where: { id: itemId, workOrderId, tenantId },
    });

    if (!item) {
      throw new NotFoundException(`Checklist item ${itemId} not found`);
    }

    return this.prisma.workOrderChecklistItem.update({
      where: { id: itemId },
      data: {
        status: dto.status,
        readingValue: dto.readingValue !== undefined ? dto.readingValue : item.readingValue,
        remarks: dto.remarks !== undefined ? dto.remarks : item.remarks,
        verifiedByUserId: actorUserId,
        verifiedAt: new Date(),
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Complete Work Order & Customer Sign-Off
  // ─────────────────────────────────────────────────────────────────────────
  async completeWorkOrder(
    tenantId: string,
    workOrderId: string,
    actorUserId: string,
    dto: CompleteWorkOrderDto,
  ) {
    const workOrder = await this.getWorkOrderById(tenantId, workOrderId);

    if (workOrder.status === WorkOrderStatus.COMPLETED) {
      throw new BadRequestException('Work Order is already completed');
    }

    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const wo = await tx.workOrder.update({
        where: { id: workOrderId },
        data: {
          status: WorkOrderStatus.COMPLETED,
          workCompletedAt: now,
          customerSignerName: dto.customerSignerName,
          customerSignerTitle: dto.customerSignerTitle,
          customerSignature: dto.customerSignature,
          customerRating: dto.customerRating ?? 5,
          customerFeedback: dto.customerFeedback,
          resolutionSummary: dto.resolutionSummary,
          isSigned: true,
          signedAt: now,
        },
        include: {
          assignedTechnician: true,
          customer: true,
          checklistItems: { orderBy: { sortOrder: 'asc' } },
        },
      });

      // Timeline entry for work order sign-off
      await tx.ticketTimeline.create({
        data: {
          tenantId,
          ticketId: workOrder.ticketId,
          eventType: TicketEventType.NOTE_ADDED,
          actorUserId,
          note: `Field Service Work Order ${workOrder.orderNumber} completed. Verified and digitally signed by customer representative ${dto.customerSignerName} (${dto.customerSignerTitle}). Rating: ${dto.customerRating ?? 5}/5.`,
          metadata: {
            workOrderId,
            orderNumber: workOrder.orderNumber,
            rating: dto.customerRating ?? 5,
            signer: dto.customerSignerName,
          },
        },
      });

      return wo;
    });

    // If autoResolveTicket is requested and ticket is open/in_progress, transition to RESOLVED
    if (dto.autoResolveTicket) {
      const ticket = await this.prisma.serviceTicket.findUnique({
        where: { id: workOrder.ticketId },
      });

      if (ticket && ['ASSIGNED', 'IN_PROGRESS'].includes(ticket.status)) {
        try {
          await this.ticketsService.updateStatus(
            tenantId,
            workOrder.ticketId,
            actorUserId,
            {
              status: 'RESOLVED',
              note: `Resolved automatically upon completion and customer sign-off of Field Work Order ${workOrder.orderNumber}.`,
            },
          );
        } catch (err) {
          // If ticket state transition is blocked by custom rule, log without failing the work order
          console.warn('[WorkOrdersService] Auto-resolve ticket transition skipped:', err);
        }
      }
    }

    return updated;
  }
}
