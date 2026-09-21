import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { EmailNotificationAdapter } from './adapters/email-notification.adapter';
import { WhatsAppNotificationAdapter } from './adapters/whatsapp-notification.adapter';
import { NotificationType, NotificationDeliveryChannel, Prisma } from '@kalpak/database';
import { NotificationListQueryDto, TestNotificationDispatchDto } from './dto/notification.dto';
import { getConfig } from '@kalpak/config';
import { logger } from '@kalpak/logger';

@Injectable()
export class NotificationsService {
  private readonly config = getConfig();

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailAdapter: EmailNotificationAdapter,
    private readonly whatsappAdapter: WhatsAppNotificationAdapter,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Query User Notifications (Paginated)
  // ─────────────────────────────────────────────────────────────────────────
  async getUserNotifications(tenantId: string, userId: string, query: NotificationListQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.NotificationWhereInput = {
      tenantId,
      userId,
      ...(query.unreadOnly ? { isRead: false } : {}),
    };

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { tenantId, userId, isRead: false },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
      unreadCount,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Get Unread Count for Header Badge
  // ─────────────────────────────────────────────────────────────────────────
  async getUnreadCount(tenantId: string, userId: string) {
    if (!tenantId || !userId) {
      return { unreadCount: 0 };
    }
    const unreadCount = await this.prisma.notification.count({
      where: {
        tenantId,
        userId,
        isRead: false,
      },
    });
    return { unreadCount };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Mark Single Notification as Read
  // ─────────────────────────────────────────────────────────────────────────
  async markAsRead(tenantId: string, userId: string, notificationId: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, tenantId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    if (existing.isRead) {
      return existing;
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Mark All Notifications as Read
  // ─────────────────────────────────────────────────────────────────────────
  async markAllAsRead(tenantId: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        tenantId,
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { updatedCount: result.count };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Internal In-App Notification Recorder
  // ─────────────────────────────────────────────────────────────────────────
  async createNotification(params: {
    tenantId: string;
    userId: string;
    type: NotificationType;
    channel?: NotificationDeliveryChannel;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      return await this.prisma.notification.create({
        data: {
          tenantId: params.tenantId,
          userId: params.userId,
          type: params.type,
          channel: params.channel ?? NotificationDeliveryChannel.IN_APP,
          title: params.title,
          message: params.message,
          link: params.link,
          metadata: params.metadata ?? {},
        },
      });
    } catch (err) {
      logger.error({ err, params }, '[NotificationsService] Failed to create notification record');
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Event Dispatcher: Ticket Created
  // ─────────────────────────────────────────────────────────────────────────
  async dispatchTicketCreated(params: {
    tenantId: string;
    ticket: {
      id: string;
      ticketNumber: string;
      title: string;
      priority: string;
      raisedForCustomer?: { id: string; companyName: string } | null;
    };
    actorUserId: string;
    customerEmail?: string | null;
    customerPhone?: string | null;
  }) {
    const { tenantId, ticket, actorUserId, customerEmail, customerPhone } = params;
    const webBase = this.config.WEB_BASE_URL || 'http://localhost:3000';
    const ticketLink = `${webBase}/dashboard/tickets/${ticket.id}`;

    // 1. In-App Notification to ticket creator
    await this.createNotification({
      tenantId,
      userId: actorUserId,
      type: NotificationType.TICKET_CREATED,
      channel: NotificationDeliveryChannel.IN_APP,
      title: `Ticket Created: ${ticket.ticketNumber}`,
      message: `Your ticket "${ticket.title}" (${ticket.priority} priority) has been successfully logged.`,
      link: ticketLink,
      metadata: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, priority: ticket.priority },
    });

    // 2. Tenant Policy check for outbound channels
    const policy = await this.prisma.tenantPolicy.findUnique({ where: { tenantId } });
    const notificationChannels = policy?.notificationChannels || 'BOTH';

    // 3. Outbound Email
    if (customerEmail && (notificationChannels === 'EMAIL' || notificationChannels === 'BOTH')) {
      await this.emailAdapter.send({
        to: customerEmail,
        subject: `[${ticket.ticketNumber}] Service Request Acknowledged: ${ticket.title}`,
        template: 'TICKET_CREATED',
        data: {
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          priority: ticket.priority,
          customerName: ticket.raisedForCustomer?.companyName || 'Valued Customer',
          link: ticketLink,
        },
      });
    }

    // 4. Outbound WhatsApp
    if (customerPhone && (notificationChannels === 'WHATSAPP' || notificationChannels === 'BOTH')) {
      await this.whatsappAdapter.send({
        toPhone: customerPhone,
        template: 'ticket_alert',
        bodyText: `Hello! Your service ticket #${ticket.ticketNumber} ("${ticket.title}") has been registered. View progress: ${ticketLink}`,
        parameters: {
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          priority: ticket.priority,
          link: ticketLink,
        },
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Event Dispatcher: Ticket Assigned
  // ─────────────────────────────────────────────────────────────────────────
  async dispatchTicketAssigned(params: {
    tenantId: string;
    ticket: {
      id: string;
      ticketNumber: string;
      title: string;
      priority: string;
      customerAsset?: { serialNumber: string; product: { name: string; modelNumber: string } } | null;
      raisedForCustomer?: { companyName: string } | null;
    };
    technician: {
      id: string;
      fullName: string;
      email: string;
      phone?: string | null;
    };
    assignedByUserId?: string;
  }) {
    const { tenantId, ticket, technician } = params;
    const webBase = this.config.WEB_BASE_URL || 'http://localhost:3000';
    const ticketLink = `${webBase}/dashboard/tickets/${ticket.id}`;

    // 1. In-App Notification to Technician
    await this.createNotification({
      tenantId,
      userId: technician.id,
      type: NotificationType.TICKET_ASSIGNED,
      channel: NotificationDeliveryChannel.IN_APP,
      title: `Assigned: ${ticket.ticketNumber}`,
      message: `You have been assigned to "${ticket.title}" (${ticket.priority} priority).`,
      link: ticketLink,
      metadata: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, priority: ticket.priority },
    });

    // 2. Tenant Policy check
    const policy = await this.prisma.tenantPolicy.findUnique({ where: { tenantId } });
    const notificationChannels = policy?.notificationChannels || 'BOTH';

    // 3. Outbound Email to Technician
    if (technician.email && (notificationChannels === 'EMAIL' || notificationChannels === 'BOTH')) {
      await this.emailAdapter.send({
        to: technician.email,
        recipientName: technician.fullName,
        subject: `Assignment: [${ticket.ticketNumber}] ${ticket.title}`,
        template: 'TICKET_ASSIGNED',
        data: {
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          priority: ticket.priority,
          customer: ticket.raisedForCustomer?.companyName || 'N/A',
          asset: ticket.customerAsset?.product?.name || 'N/A',
          link: ticketLink,
        },
      });
    }

    // 4. Outbound WhatsApp to Technician
    if (technician.phone && (notificationChannels === 'WHATSAPP' || notificationChannels === 'BOTH')) {
      await this.whatsappAdapter.send({
        toPhone: technician.phone,
        recipientName: technician.fullName,
        template: 'ticket_assigned',
        bodyText: `🔧 New Assignment: Ticket #${ticket.ticketNumber} (${ticket.priority}) for ${ticket.raisedForCustomer?.companyName || 'Customer'}. Open: ${ticketLink}`,
        parameters: {
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          priority: ticket.priority,
          link: ticketLink,
        },
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Event Dispatcher: Status Changed
  // ─────────────────────────────────────────────────────────────────────────
  async dispatchStatusChanged(params: {
    tenantId: string;
    ticket: {
      id: string;
      ticketNumber: string;
      title: string;
      status: string;
      raisedForCustomer?: { companyName: string } | null;
      assignedTo?: { id: string; fullName: string; email: string; phone?: string | null } | null;
    };
    oldStatus: string;
    newStatus: string;
    notifyUserIds: string[];
    customerEmail?: string | null;
    customerPhone?: string | null;
    note?: string;
  }) {
    const { tenantId, ticket, oldStatus, newStatus, notifyUserIds, customerEmail, customerPhone, note } = params;
    const webBase = this.config.WEB_BASE_URL || 'http://localhost:3000';
    const ticketLink = `${webBase}/dashboard/tickets/${ticket.id}`;

    const isResolved = newStatus === 'RESOLVED';
    const isClosed = newStatus === 'CLOSED';
    const notifType = isResolved
      ? NotificationType.TICKET_RESOLVED
      : isClosed
      ? NotificationType.TICKET_CLOSED
      : NotificationType.STATUS_CHANGED;

    // 1. In-App Notifications for all designated users
    const uniqueUserIds = [...new Set(notifyUserIds.filter(Boolean))];
    await Promise.all(
      uniqueUserIds.map((userId) =>
        this.createNotification({
          tenantId,
          userId,
          type: notifType,
          channel: NotificationDeliveryChannel.IN_APP,
          title: `Status: ${ticket.ticketNumber} -> ${newStatus}`,
          message: `Ticket "${ticket.title}" changed from ${oldStatus} to ${newStatus}.${note ? ` Note: ${note}` : ''}`,
          link: ticketLink,
          metadata: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, oldStatus, newStatus },
        }),
      ),
    );

    // 2. Policy check
    const policy = await this.prisma.tenantPolicy.findUnique({ where: { tenantId } });
    const notificationChannels = policy?.notificationChannels || 'BOTH';

    // 3. Email dispatch to customer if applicable
    if (customerEmail && (notificationChannels === 'EMAIL' || notificationChannels === 'BOTH')) {
      await this.emailAdapter.send({
        to: customerEmail,
        subject: `Update on [${ticket.ticketNumber}]: Status is now ${newStatus}`,
        template: 'STATUS_CHANGED',
        data: {
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          oldStatus,
          newStatus,
          note: note || '',
          link: ticketLink,
        },
      });
    }

    // 4. WhatsApp dispatch to customer
    if (customerPhone && (notificationChannels === 'WHATSAPP' || notificationChannels === 'BOTH')) {
      await this.whatsappAdapter.send({
        toPhone: customerPhone,
        template: 'status_update',
        bodyText: `Status Update: Your ticket #${ticket.ticketNumber} is now ${newStatus}. Details: ${ticketLink}`,
        parameters: {
          ticketNumber: ticket.ticketNumber,
          oldStatus,
          newStatus,
          link: ticketLink,
        },
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Event Dispatcher: SLA Breach Overdue
  // ─────────────────────────────────────────────────────────────────────────
  async dispatchSlaBreach(params: {
    tenantId: string;
    ticket: {
      id: string;
      ticketNumber: string;
      title: string;
      priority: string;
      dueAt?: Date | null;
      raisedForCustomer?: { companyName: string } | null;
      assignedTo?: { id: string; fullName: string; email: string; phone?: string | null } | null;
    };
    adminUserIds: string[];
  }) {
    const { tenantId, ticket, adminUserIds } = params;
    const webBase = this.config.WEB_BASE_URL || 'http://localhost:3000';
    const ticketLink = `${webBase}/dashboard/tickets/${ticket.id}`;

    // In-app notifications to admins and assigned technician
    const recipientUserIds = [...new Set([...adminUserIds, ticket.assignedTo?.id].filter(Boolean) as string[])];

    await Promise.all(
      recipientUserIds.map((userId) =>
        this.createNotification({
          tenantId,
          userId,
          type: NotificationType.SLA_BREACH,
          channel: NotificationDeliveryChannel.IN_APP,
          title: `⚠️ SLA OVERDUE: ${ticket.ticketNumber}`,
          message: `Ticket "${ticket.title}" (${ticket.priority}) has breached its SLA response/resolution deadline!`,
          link: ticketLink,
          metadata: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, priority: ticket.priority, dueAt: ticket.dueAt },
        }),
      ),
    );

    // Email dispatch to admins / technician
    const policy = await this.prisma.tenantPolicy.findUnique({ where: { tenantId } });
    const notificationChannels = policy?.notificationChannels || 'BOTH';

    if (ticket.assignedTo?.email && (notificationChannels === 'EMAIL' || notificationChannels === 'BOTH')) {
      await this.emailAdapter.send({
        to: ticket.assignedTo.email,
        recipientName: ticket.assignedTo.fullName,
        subject: `URGENT: SLA Overdue Breach on [${ticket.ticketNumber}]`,
        template: 'SLA_BREACH',
        data: {
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          priority: ticket.priority,
          customer: ticket.raisedForCustomer?.companyName || 'N/A',
          dueAt: ticket.dueAt?.toISOString() || 'Past due',
          link: ticketLink,
        },
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test Dispatch Endpoint
  // ─────────────────────────────────────────────────────────────────────────
  async testDispatch(tenantId: string, userId: string, dto: TestNotificationDispatchDto) {
    if (dto.channel === NotificationDeliveryChannel.IN_APP) {
      const record = await this.createNotification({
        tenantId,
        userId,
        type: NotificationType.TICKET_CREATED,
        channel: NotificationDeliveryChannel.IN_APP,
        title: dto.title,
        message: dto.message,
        link: dto.link,
      });
      return { success: true, channel: 'IN_APP', notification: record };
    }

    if (dto.channel === NotificationDeliveryChannel.EMAIL) {
      const result = await this.emailAdapter.send({
        to: dto.recipient,
        subject: dto.title,
        template: 'GENERIC',
        data: { message: dto.message, link: dto.link },
      });
      return { channel: 'EMAIL', ...result };
    }

    if (dto.channel === NotificationDeliveryChannel.WHATSAPP) {
      const result = await this.whatsappAdapter.send({
        toPhone: dto.recipient,
        template: 'generic',
        bodyText: `${dto.title}: ${dto.message} ${dto.link ? `(${dto.link})` : ''}`,
        parameters: { title: dto.title, message: dto.message },
      });
      return { channel: 'WHATSAPP', ...result };
    }

    throw new BadRequestException(`Unsupported notification channel: ${dto.channel}`);
  }
}
