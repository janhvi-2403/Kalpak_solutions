import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../../core/mail/mail.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { AuditEventType, SystemRole } from '@kalpak/types';
import { generateSessionToken, hashToken } from '@kalpak/auth';
import { getConfig } from '@kalpak/config';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
  ) {}

  async getStats(tenantId: string) {
    const total = await this.prisma.customer.count({
      where: { tenantId, deletedAt: null },
    });
    const active = await this.prisma.customer.count({
      where: { tenantId, status: 'ACTIVE', deletedAt: null },
    });
    const inactive = await this.prisma.customer.count({
      where: { tenantId, status: 'INACTIVE', deletedAt: null },
    });

    const customersWithOpenTickets = await this.prisma.customer.count({
      where: {
        tenantId,
        deletedAt: null,
        tickets: {
          some: {
            deletedAt: null,
            status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_CUSTOMER'] },
          },
        },
      },
    });

    return {
      total,
      active,
      inactive,
      withOpenTickets: customersWithOpenTickets,
    };
  }

  async listCustomers(tenantId: string, search?: string, status?: string) {
    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { companyName: { contains: term, mode: 'insensitive' } },
        { contactPerson: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [customers, pendingInvitations] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              emailVerified: true,
              emailVerifiedAt: true,
              isActive: true,
            },
          },
          _count: {
            select: {
              assets: true,
              tickets: true,
            },
          },
          tickets: {
            where: {
              deletedAt: null,
              status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_CUSTOMER'] },
            },
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invitation.findMany({
        where: {
          tenantId,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: {
          email: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
    ]);

    const pendingEmailSet = new Set(
      pendingInvitations.map((inv) => inv.email.toLowerCase().trim())
    );

    return customers.map((c) => {
      const isVerified = Boolean(c.user?.emailVerified);
      const isPending = !isVerified && pendingEmailSet.has(c.email.toLowerCase().trim());
      const verificationStatus: 'VERIFIED' | 'PENDING' | 'UNVERIFIED' = isVerified
        ? 'VERIFIED'
        : isPending
        ? 'PENDING'
        : 'UNVERIFIED';

      return {
        id: c.id,
        tenantId: c.tenantId,
        companyName: c.companyName,
        contactPerson: c.contactPerson,
        email: c.email,
        phone: c.phone,
        address: c.address,
        city: c.city,
        pincode: c.pincode,
        status: c.status,
        portalAccessEnabled: c.portalAccessEnabled || isVerified,
        verificationStatus,
        isVerified,
        notes: c.notes,
        assetCount: c._count.assets,
        ticketCount: c._count.tickets,
        openTicketCount: c.tickets.length,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });
  }

  async getCustomer(tenantId: string, customerId: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId)) {
      throw new NotFoundException('Customer not found');
    }

    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            emailVerified: true,
            emailVerifiedAt: true,
            isActive: true,
          },
        },
        assets: {
          where: { deletedAt: null },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                modelNumber: true,
                category: true,
              },
            },
          },
          orderBy: { serialNumber: 'asc' },
        },
        tickets: {
          where: { deletedAt: null },
          include: {
            department: {
              select: { id: true, name: true, code: true },
            },
            assignedTo: {
              select: { id: true, fullName: true, email: true },
            },
            customerAsset: {
              select: { id: true, serialNumber: true },
            },
            product: {
              select: { id: true, name: true, modelNumber: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const pendingInvitation = await this.prisma.invitation.findFirst({
      where: {
        tenantId,
        email: customer.email.toLowerCase().trim(),
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const isVerified = Boolean(customer.user?.emailVerified);
    const isPending = !isVerified && Boolean(pendingInvitation);
    const verificationStatus: 'VERIFIED' | 'PENDING' | 'UNVERIFIED' = isVerified
      ? 'VERIFIED'
      : isPending
      ? 'PENDING'
      : 'UNVERIFIED';

    const tickets = customer.tickets;
    const now = new Date();
    const ticketSummary = {
      totalTickets: tickets.length,
      openTickets: tickets.filter((t) => t.status === 'OPEN' || t.status === 'ASSIGNED').length,
      inProgressTickets: tickets.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'AWAITING_CUSTOMER').length,
      resolvedTickets: tickets.filter((t) => t.status === 'RESOLVED').length,
      closedTickets: tickets.filter((t) => t.status === 'CLOSED').length,
      slaBreachedTickets: tickets.filter(
        (t) => t.isOverdue || (t.dueAt && new Date(t.dueAt) < now && t.status !== 'RESOLVED' && t.status !== 'CLOSED')
      ).length,
    };

    return {
      ...customer,
      portalAccessEnabled: customer.portalAccessEnabled || isVerified,
      verificationStatus,
      isVerified,
      pendingInvitation,
      ticketSummary,
    };
  }

  async createCustomer(tenantId: string, actorId: string, dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findFirst({
      where: {
        tenantId,
        email: dto.email.trim().toLowerCase(),
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(`Customer with email '${dto.email}' already exists`);
    }

    const customer = await this.prisma.customer.create({
      data: {
        tenantId,
        companyName: dto.companyName.trim(),
        contactPerson: dto.contactPerson.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone.trim(),
        address: dto.address?.trim(),
        city: dto.city?.trim(),
        pincode: dto.pincode?.trim(),
        status: dto.status || 'ACTIVE',
        portalAccessEnabled: dto.portalAccessEnabled ?? false,
        notes: dto.notes?.trim(),
      },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.CUSTOMER_CREATED,
      resourceType: 'CUSTOMER',
      resourceId: customer.id,
      action: 'CREATE_CUSTOMER',
      metadata: { companyName: customer.companyName, email: customer.email },
    });

    return customer;
  }

  async updateCustomer(tenantId: string, customerId: string, actorId: string, dto: UpdateCustomerDto) {
    const existing = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Customer not found');
    }

    if (dto.email && dto.email.trim().toLowerCase() !== existing.email) {
      const duplicate = await this.prisma.customer.findFirst({
        where: {
          tenantId,
          email: dto.email.trim().toLowerCase(),
          id: { not: customerId },
          deletedAt: null,
        },
      });

      if (duplicate) {
        throw new ConflictException(`Customer email '${dto.email}' is already in use`);
      }
    }

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        companyName: dto.companyName?.trim(),
        contactPerson: dto.contactPerson?.trim(),
        email: dto.email?.trim().toLowerCase(),
        phone: dto.phone?.trim(),
        address: dto.address?.trim(),
        city: dto.city?.trim(),
        pincode: dto.pincode?.trim(),
        status: dto.status,
        portalAccessEnabled: dto.portalAccessEnabled,
        notes: dto.notes?.trim(),
      },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.CUSTOMER_UPDATED,
      resourceType: 'CUSTOMER',
      resourceId: updated.id,
      action: 'UPDATE_CUSTOMER',
      metadata: { ...dto },
    });

    return updated;
  }

  async deleteCustomer(tenantId: string, customerId: string, actorId: string) {
    const existing = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
      include: {
        _count: {
          select: { tickets: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Customer not found');
    }

    // Don't delete customers permanently if they have ticket history.
    // Instead: Deactivate Customer. This preserves historical records.
    if (existing._count.tickets > 0) {
      await this.prisma.customer.update({
        where: { id: customerId },
        data: { status: 'INACTIVE' },
      });

      await this.auditService.record({
        tenantId,
        actorId,
        eventType: AuditEventType.CUSTOMER_UPDATED,
        resourceType: 'CUSTOMER',
        resourceId: customerId,
        action: 'DEACTIVATE_CUSTOMER',
        metadata: {
          companyName: existing.companyName,
          ticketCount: existing._count.tickets,
          reason: 'Customer has historical tickets; preserved by deactivating.',
        },
      });

      return {
        success: true,
        deactivated: true,
        message: `Customer "${existing.companyName}" has ${existing._count.tickets} ticket(s) in history and was deactivated instead of permanently deleted to preserve records.`,
      };
    }

    await this.prisma.customer.update({
      where: { id: customerId },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.CUSTOMER_DELETED,
      resourceType: 'CUSTOMER',
      resourceId: customerId,
      action: 'DELETE_CUSTOMER',
      metadata: { companyName: existing.companyName },
    });

    return { success: true, message: `Customer "${existing.companyName}" deleted successfully` };
  }

  async updateCustomerStatus(tenantId: string, customerId: string, actorId: string, status: string) {
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      throw new BadRequestException('Status must be ACTIVE or INACTIVE');
    }

    const existing = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Customer not found');
    }

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: { status },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.CUSTOMER_UPDATED,
      resourceType: 'CUSTOMER',
      resourceId: customerId,
      action: 'UPDATE_CUSTOMER_STATUS',
      metadata: { previousStatus: existing.status, newStatus: status },
    });

    return updated;
  }

  async inviteCustomer(tenantId: string, customerId: string, actorId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
      include: { user: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, slug: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Locate the system CUSTOMER role
    let customerRole = await this.prisma.role.findFirst({
      where: { name: SystemRole.CUSTOMER, tenantId: null },
    });
    if (!customerRole) {
      customerRole = await this.prisma.role.findFirst({
        where: { name: SystemRole.CUSTOMER },
      });
    }

    if (!customerRole) {
      throw new BadRequestException('Customer role is not configured in the system.');
    }

    const email = customer.email.toLowerCase().trim();

    // 1. Invalidate any existing pending invitations for this email in this tenant
    await this.prisma.invitation.updateMany({
      where: {
        tenantId,
        email,
        acceptedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    // 2. Generate secure single-use invitation token
    const rawToken = generateSessionToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await this.prisma.invitation.create({
      data: {
        tenantId,
        email,
        roleId: customerRole.id,
        fullName: customer.contactPerson || customer.companyName,
        phone: customer.phone,
        tokenHash,
        invitedByUserId: actorId,
        expiresAt,
      },
      include: {
        role: true,
      },
    });

    // 3. Dispatch official invitation email (identical secure activation pattern as Department Head)
    await this.mailService.sendInvitationEmail(
      email,
      rawToken,
      tenant.name,
      'CUSTOMER',
      undefined,
      customer.contactPerson || customer.companyName,
      customer.phone
    );

    // 4. Record audit event
    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.INVITATION_CREATED,
      resourceType: 'INVITATION',
      resourceId: invitation.id,
      action: 'INVITE_CUSTOMER',
      metadata: { customerId: customer.id, email, companyName: customer.companyName },
    });

    const config = getConfig();
    const inviteUrl = `${config.WEB_BASE_URL}/accept-invitation?token=${rawToken}`;

    return {
      success: true,
      customerId: customer.id,
      email,
      fullName: customer.contactPerson || customer.companyName,
      inviteUrl,
      token: rawToken,
      expiresAt,
      verificationStatus: 'PENDING',
      message: `Invitation email sent to ${email}. The customer can activate their account and set their password using the secure link.`,
    };
  }

  async enablePortalAccess(
    tenantId: string,
    customerId: string,
    actorId: string,
    _customPassword?: string
  ) {
    return this.inviteCustomer(tenantId, customerId, actorId);
  }
}
