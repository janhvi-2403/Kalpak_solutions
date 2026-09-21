import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { ContractsService } from '../contracts/contracts.service';
import { RaisePortalTicketDto, PortalTicketQueryDto } from './dto/portal.dto';
import {
  PortalProfile,
  PortalDashboardStats,
  PortalTicketSummary,
  PortalTicketDetail,
  PortalAsset,
  TicketRaisedByEnum,
  TicketPriorityEnum,
} from '@kalpak/types';

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ticketsService: TicketsService,
    private readonly contractsService: ContractsService
  ) {}

  /**
   * Helper: Resolve and validate the Customer entity linked to the current logged-in user.
   */
  async resolveCustomerForUser(userId: string, tenantId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        userId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!customer) {
      throw new ForbiddenException(
        'Access denied. No customer organization is associated with your account.'
      );
    }

    if (!customer.portalAccessEnabled) {
      throw new ForbiddenException(
        'Self-service portal access has been disabled for your organization. Please contact your support team.'
      );
    }

    return customer;
  }

  /**
   * Public info for tenant login branding
   */
  async getPublicTenantInfo(slug: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        slug: slug.trim().toLowerCase(),
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant organization '${slug}' does not exist.`);
    }

    return tenant;
  }

  /**
   * Return authenticated customer profile, linked user info, and tenant branding
   */
  async getPortalProfile(userId: string, tenantId: string): Promise<PortalProfile> {
    const customer = await this.resolveCustomerForUser(userId, tenantId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true },
    });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true },
    });

    if (!user || !tenant) {
      throw new NotFoundException('Profile context not found.');
    }

    return {
      customer: {
        id: customer.id,
        companyName: customer.companyName,
        contactPerson: customer.contactPerson,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        pincode: customer.pincode,
      },
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
    };
  }

  /**
   * Return stats for portal dashboard
   */
  async getDashboardStats(userId: string, tenantId: string): Promise<PortalDashboardStats> {
    const customer = await this.resolveCustomerForUser(userId, tenantId);

    const [totalTickets, openTickets, inProgressTickets, resolvedTickets, totalAssets] =
      await Promise.all([
        this.prisma.serviceTicket.count({
          where: { tenantId, raisedForCustomerId: customer.id, deletedAt: null },
        }),
        this.prisma.serviceTicket.count({
          where: {
            tenantId,
            raisedForCustomerId: customer.id,
            status: { in: ['OPEN', 'ASSIGNED'] as any },
            deletedAt: null,
          },
        }),
        this.prisma.serviceTicket.count({
          where: {
            tenantId,
            raisedForCustomerId: customer.id,
            status: { in: ['IN_PROGRESS', 'AWAITING_CUSTOMER'] as any },
            deletedAt: null,
          },
        }),
        this.prisma.serviceTicket.count({
          where: {
            tenantId,
            raisedForCustomerId: customer.id,
            status: { in: ['RESOLVED', 'CLOSED'] as any },
            deletedAt: null,
          },
        }),
        this.prisma.customerAsset.count({
          where: { tenantId, customerId: customer.id, deletedAt: null },
        }),
      ]);

    return {
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      totalAssets,
    };
  }

  /**
   * List all tickets belonging to this customer
   */
  async listCustomerTickets(
    userId: string,
    tenantId: string,
    query: PortalTicketQueryDto
  ): Promise<PortalTicketSummary[]> {
    const customer = await this.resolveCustomerForUser(userId, tenantId);

    const where: any = {
      tenantId,
      raisedForCustomerId: customer.id,
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { ticketNumber: { contains: term, mode: 'insensitive' } },
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    const tickets = await this.prisma.serviceTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customerAsset: {
          include: {
            product: true,
          },
        },
        assignedTo: {
          select: { fullName: true },
        },
      },
    });

    return tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      title: t.title,
      description: t.description,
      status: t.status as any,
      priority: t.priority as any,
      customerAssetId: t.customerAssetId,
      assetName: t.customerAsset ? t.customerAsset.product.name : null,
      assetSerialNumber: t.customerAsset ? t.customerAsset.serialNumber : null,
      assignedToName: t.assignedTo ? t.assignedTo.fullName : 'Service Desk',
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      dueAt: t.dueAt ? t.dueAt.toISOString() : null,
      resolvedAt: t.resolvedAt ? t.resolvedAt.toISOString() : null,
    }));
  }

  /**
   * Get single ticket detail with timeline, work orders, and billing breakdown
   */
  async getCustomerTicketById(
    userId: string,
    tenantId: string,
    ticketId: string
  ): Promise<PortalTicketDetail> {
    const customer = await this.resolveCustomerForUser(userId, tenantId);

    const ticket = await this.prisma.serviceTicket.findFirst({
      where: {
        id: ticketId,
        tenantId,
        raisedForCustomerId: customer.id,
        deletedAt: null,
      },
      include: {
        customerAsset: {
          include: {
            product: true,
          },
        },
        assignedTo: {
          select: { fullName: true },
        },
        timeline: {
          orderBy: { createdAt: 'asc' },
          include: {
            actor: {
              select: { fullName: true },
            },
          },
        },
        workOrders: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: {
            assignedTechnician: {
              select: { fullName: true },
            },
          },
        },
        partConsumptions: {
          include: {
            part: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Service ticket not found');
    }

    // Compute parts billing
    let subtotal = 0;
    let warrantyDiscount = 0;

    const billingItems = ticket.partConsumptions.map((pc) => {
      const unitPrice = Number(pc.unitPrice);
      const totalCost = unitPrice * pc.quantity;
      subtotal += totalCost;

      if (pc.isWarrantyCovered) {
        warrantyDiscount += totalCost;
      }

      return {
        id: pc.id,
        partName: pc.part.name,
        partNumber: pc.part.partNumber,
        quantity: pc.quantity,
        unitPrice,
        billedAmount: pc.isWarrantyCovered ? 0 : totalCost,
        isWarrantyCovered: pc.isWarrantyCovered,
      };
    });

    const netBillable = subtotal - warrantyDiscount;

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status as any,
      priority: ticket.priority as any,
      customerAssetId: ticket.customerAssetId,
      assetName: ticket.customerAsset ? ticket.customerAsset.product.name : null,
      assetSerialNumber: ticket.customerAsset ? ticket.customerAsset.serialNumber : null,
      assignedToName: ticket.assignedTo ? ticket.assignedTo.fullName : 'Service Desk',
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      dueAt: ticket.dueAt ? ticket.dueAt.toISOString() : null,
      resolvedAt: ticket.resolvedAt ? ticket.resolvedAt.toISOString() : null,
      timeline: ticket.timeline.map((evt) => ({
        id: evt.id,
        eventType: evt.eventType,
        note: evt.note,
        createdAt: evt.createdAt.toISOString(),
        actorName: evt.actor?.fullName || 'Kalpak Support',
      })),
      workOrders: ticket.workOrders.map((wo) => ({
        id: wo.id,
        orderNumber: wo.orderNumber,
        status: wo.status,
        scheduledDate: wo.scheduledDate ? wo.scheduledDate.toISOString() : null,
        technicianName: wo.assignedTechnician?.fullName || 'Assigned Technician',
        summary: wo.resolutionSummary,
      })),
      billing: {
        items: billingItems,
        subtotal,
        warrantyDiscount,
        netBillable,
      },
    };
  }

  /**
   * Customer raises a new ticket
   */
  async raiseTicket(
    userId: string,
    tenantId: string,
    dto: RaisePortalTicketDto
  ) {
    const customer = await this.resolveCustomerForUser(userId, tenantId);

    if (dto.customerAssetId) {
      const asset = await this.prisma.customerAsset.findFirst({
        where: {
          id: dto.customerAssetId,
          customerId: customer.id,
          tenantId,
          deletedAt: null,
        },
      });
      if (!asset) {
        throw new BadRequestException('Selected asset does not belong to your account');
      }
    }

    return this.ticketsService.createTicket(tenantId, userId, {
      title: dto.title,
      description: dto.description,
      priority: dto.priority || TicketPriorityEnum.MEDIUM,
      raisedBy: TicketRaisedByEnum.CUSTOMER,
      raisedForCustomerId: customer.id,
      customerAssetId: dto.customerAssetId,
    });
  }

  /**
   * List customer's installed machines / assets
   */
  async listCustomerAssets(userId: string, tenantId: string): Promise<PortalAsset[]> {
    const customer = await this.resolveCustomerForUser(userId, tenantId);

    const assets = await this.prisma.customerAsset.findMany({
      where: {
        tenantId,
        customerId: customer.id,
        deletedAt: null,
      },
      include: {
        product: true,
        _count: {
          select: {
            tickets: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return assets.map((a) => ({
      id: a.id,
      serialNumber: a.serialNumber,
      status: a.status,
      installationDate: a.installationDate ? a.installationDate.toISOString() : null,
      warrantyEndDate: a.warrantyEndDate ? a.warrantyEndDate.toISOString() : null,
      location: a.location,
      product: {
        id: a.product.id,
        name: a.product.name,
        modelNumber: a.product.modelNumber,
        category: a.product.category,
        hasWarranty: a.product.hasWarranty,
      },
      ticketCount: a._count.tickets,
    }));
  }

  /**
   * List AMC contracts and scheduled PM visits for the customer portal
   */
  async getCustomerContracts(userId: string, tenantId: string) {
    const customer = await this.resolveCustomerForUser(userId, tenantId);
    return this.contractsService.getCustomerPortalContracts(tenantId, customer.id);
  }
}
