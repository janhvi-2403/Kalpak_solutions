import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../../core/mail/mail.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CreateCustomerBranchDto,
  UpdateCustomerBranchDto,
  CreateCustomerContactDto,
  UpdateCustomerContactDto,
  AssignCustomerUserDto,
  LinkCustomerAssetDto,
} from './dto/customer.dto';
import { AuditEventType, CustomerType, SystemRole } from '@kalpak/types';
import { generateSessionToken, hashToken } from '@kalpak/auth';
import { getConfig } from '@kalpak/config';
import * as crypto from 'crypto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Helper: Generate a unique customer code within the tenant
   */
  private async generateCustomerCode(tenantId: string, type: CustomerType): Promise<string> {
    const prefixMap: Record<CustomerType, string> = {
      [CustomerType.INDIVIDUAL]: 'CUST-IND',
      [CustomerType.BUSINESS_PARTNER]: 'CUST-BIZ',
      [CustomerType.CORPORATE]: 'CUST-CORP',
    };
    const prefix = prefixMap[type] || 'CUST';

    for (let i = 0; i < 5; i++) {
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const code = `${prefix}-${randomSuffix}`;
      const existing = await this.prisma.customer.findFirst({
        where: { tenantId, customerCode: code },
      });
      if (!existing) {
        return code;
      }
    }
    return `${prefix}-${Date.now().toString().slice(-6)}`;
  }

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

    const individual = await this.prisma.customer.count({
      where: { tenantId, customerType: CustomerType.INDIVIDUAL, deletedAt: null },
    });
    const businessPartner = await this.prisma.customer.count({
      where: { tenantId, customerType: CustomerType.BUSINESS_PARTNER, deletedAt: null },
    });
    const corporate = await this.prisma.customer.count({
      where: { tenantId, customerType: CustomerType.CORPORATE, deletedAt: null },
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
      individual,
      businessPartner,
      corporate,
      withOpenTickets: customersWithOpenTickets,
    };
  }

  async listCustomers(
    tenantId: string,
    options: {
      search?: string;
      status?: string;
      customerType?: string;
      branchId?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (options.status && options.status !== 'ALL') {
      where.status = options.status;
    }

    if (options.customerType && options.customerType !== 'ALL') {
      where.customerType = options.customerType as CustomerType;
    }

    if (options.branchId && options.branchId !== 'ALL') {
      where.branches = {
        some: {
          id: options.branchId,
          deletedAt: null,
        },
      };
    }

    if (options.search && options.search.trim()) {
      const term = options.search.trim();
      where.OR = [
        { companyName: { contains: term, mode: 'insensitive' } },
        { customerCode: { contains: term, mode: 'insensitive' } },
        { contactPerson: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    const sortField = options.sortBy || 'createdAt';
    const sortDirection = options.sortOrder === 'asc' ? 'asc' : 'desc';
    if (['companyName', 'createdAt', 'customerCode', 'status', 'customerType'].includes(sortField)) {
      orderBy[sortField] = sortDirection;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [total, customers, pendingInvitations] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
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
              assets: { where: { deletedAt: null } },
              tickets: { where: { deletedAt: null } },
              branches: { where: { deletedAt: null } },
              contacts: { where: { deletedAt: null } },
              portalUsers: true,
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
        orderBy,
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
        },
      }),
    ]);

    const pendingEmailSet = new Set(
      pendingInvitations.map((inv) => inv.email.toLowerCase().trim())
    );

    const items = customers.map((c) => {
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
        customerType: c.customerType,
        customerCode: c.customerCode,
        companyName: c.companyName,
        contactPerson: c.contactPerson,
        email: c.email,
        phone: c.phone,
        alternatePhone: c.alternatePhone,
        businessType: c.businessType,
        address: c.address,
        city: c.city,
        state: c.state,
        country: c.country,
        pincode: c.pincode,
        billingAddress: c.billingAddress,
        taxId: c.taxId,
        status: c.status,
        portalAccessEnabled: c.portalAccessEnabled || isVerified,
        verificationStatus,
        isVerified,
        notes: c.notes,
        assetCount: c._count.assets,
        branchCount: c._count.branches,
        contactCount: c._count.contacts,
        userCount: c._count.portalUsers + (c.userId ? 1 : 0),
        ticketCount: c._count.tickets,
        openTicketCount: c.tickets.length,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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
        branches: {
          where: { deletedAt: null },
          include: {
            _count: {
              select: {
                contacts: { where: { deletedAt: null } },
                assets: { where: { deletedAt: null } },
                tickets: { where: { deletedAt: null } },
              },
            },
          },
          orderBy: [{ isHeadquarters: 'desc' }, { branchName: 'asc' }],
        },
        contacts: {
          where: { deletedAt: null },
          include: {
            branch: { select: { id: true, branchName: true } },
          },
          orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
        },
        portalUsers: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                isActive: true,
                emailVerified: true,
              },
            },
            branch: {
              select: { id: true, branchName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
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
            branch: {
              select: { id: true, branchName: true },
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
            customerBranch: {
              select: { id: true, branchName: true },
            },
            customerContact: {
              select: { id: true, name: true, phone: true },
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
    const customerType = dto.customerType || CustomerType.INDIVIDUAL;
    const email = dto.email.trim().toLowerCase();

    // Check email uniqueness within tenant for active records
    const existingEmail = await this.prisma.customer.findFirst({
      where: {
        tenantId,
        email,
        deletedAt: null,
      },
    });

    if (existingEmail) {
      throw new ConflictException(`Customer with email '${dto.email}' already exists in your organization`);
    }

    // Determine or generate customer code
    let customerCode = dto.customerCode?.trim();
    if (!customerCode) {
      customerCode = await this.generateCustomerCode(tenantId, customerType);
    } else {
      const existingCode = await this.prisma.customer.findFirst({
        where: { tenantId, customerCode },
      });
      if (existingCode) {
        throw new ConflictException(`Customer code '${customerCode}' already exists in your organization`);
      }
    }

    const customer = await this.prisma.customer.create({
      data: {
        tenantId,
        customerType,
        customerCode,
        companyName: dto.companyName.trim(),
        contactPerson: dto.contactPerson.trim(),
        email,
        phone: dto.phone.trim(),
        alternatePhone: dto.alternatePhone?.trim(),
        businessType: dto.businessType?.trim(),
        address: dto.address?.trim(),
        city: dto.city?.trim(),
        state: dto.state?.trim(),
        country: dto.country?.trim() || 'India',
        pincode: dto.pincode?.trim(),
        billingAddress: dto.billingAddress?.trim(),
        taxId: dto.taxId?.trim(),
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
      metadata: {
        companyName: customer.companyName,
        customerCode: customer.customerCode,
        customerType: customer.customerType,
        email: customer.email,
      },
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

    // Check code uniqueness if changed
    if (dto.customerCode && dto.customerCode.trim() !== existing.customerCode) {
      const codeDuplicate = await this.prisma.customer.findFirst({
        where: {
          tenantId,
          customerCode: dto.customerCode.trim(),
          id: { not: customerId },
        },
      });
      if (codeDuplicate) {
        throw new ConflictException(`Customer code '${dto.customerCode}' already in use`);
      }
    }

    // Check email uniqueness if changed
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
        customerType: dto.customerType,
        customerCode: dto.customerCode?.trim(),
        companyName: dto.companyName?.trim(),
        contactPerson: dto.contactPerson?.trim(),
        email: dto.email?.trim().toLowerCase(),
        phone: dto.phone?.trim(),
        alternatePhone: dto.alternatePhone?.trim(),
        businessType: dto.businessType?.trim(),
        address: dto.address?.trim(),
        city: dto.city?.trim(),
        state: dto.state?.trim(),
        country: dto.country?.trim(),
        pincode: dto.pincode?.trim(),
        billingAddress: dto.billingAddress?.trim(),
        taxId: dto.taxId?.trim(),
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

  // ---------------------------------------------------------------------------
  // Branches Management
  // ---------------------------------------------------------------------------
  async listBranches(tenantId: string, customerId: string) {
    await this.ensureCustomerExists(tenantId, customerId);
    return this.prisma.customerBranch.findMany({
      where: { tenantId, customerId, deletedAt: null },
      include: {
        _count: {
          select: {
            contacts: { where: { deletedAt: null } },
            assets: { where: { deletedAt: null } },
            tickets: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: [{ isHeadquarters: 'desc' }, { branchName: 'asc' }],
    });
  }

  async createBranch(tenantId: string, customerId: string, actorId: string, dto: CreateCustomerBranchDto) {
    const customer = await this.ensureCustomerExists(tenantId, customerId);

    // If headquarters, unset other branches
    if (dto.isHeadquarters) {
      await this.prisma.customerBranch.updateMany({
        where: { tenantId, customerId, isHeadquarters: true },
        data: { isHeadquarters: false },
      });
    }

    const branch = await this.prisma.customerBranch.create({
      data: {
        tenantId,
        customerId,
        branchName: dto.branchName.trim(),
        branchCode: dto.branchCode?.trim(),
        contactPerson: dto.contactPerson?.trim(),
        phone: dto.phone?.trim(),
        email: dto.email?.trim().toLowerCase(),
        address: dto.address?.trim(),
        city: dto.city?.trim(),
        state: dto.state?.trim(),
        country: dto.country?.trim() || 'India',
        pincode: dto.pincode?.trim(),
        isHeadquarters: dto.isHeadquarters ?? false,
        status: dto.status || 'ACTIVE',
      },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.CUSTOMER_BRANCH_CREATED,
      resourceType: 'CUSTOMER_BRANCH',
      resourceId: branch.id,
      action: 'CREATE_BRANCH',
      metadata: { customerId, customerName: customer.companyName, branchName: branch.branchName },
    });

    return branch;
  }

  async updateBranch(
    tenantId: string,
    customerId: string,
    branchId: string,
    actorId: string,
    dto: UpdateCustomerBranchDto
  ) {
    await this.ensureCustomerExists(tenantId, customerId);
    const existing = await this.prisma.customerBranch.findFirst({
      where: { id: branchId, customerId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Branch not found');
    }

    if (dto.isHeadquarters) {
      await this.prisma.customerBranch.updateMany({
        where: { tenantId, customerId, isHeadquarters: true, id: { not: branchId } },
        data: { isHeadquarters: false },
      });
    }

    const updated = await this.prisma.customerBranch.update({
      where: { id: branchId },
      data: {
        branchName: dto.branchName?.trim(),
        branchCode: dto.branchCode?.trim(),
        contactPerson: dto.contactPerson?.trim(),
        phone: dto.phone?.trim(),
        email: dto.email?.trim().toLowerCase(),
        address: dto.address?.trim(),
        city: dto.city?.trim(),
        state: dto.state?.trim(),
        country: dto.country?.trim(),
        pincode: dto.pincode?.trim(),
        isHeadquarters: dto.isHeadquarters,
        status: dto.status,
      },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.CUSTOMER_BRANCH_UPDATED,
      resourceType: 'CUSTOMER_BRANCH',
      resourceId: branchId,
      action: 'UPDATE_BRANCH',
      metadata: { customerId, branchName: updated.branchName },
    });

    return updated;
  }

  async deleteBranch(tenantId: string, customerId: string, branchId: string, actorId: string) {
    await this.ensureCustomerExists(tenantId, customerId);
    const existing = await this.prisma.customerBranch.findFirst({
      where: { id: branchId, customerId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Branch not found');
    }

    await this.prisma.customerBranch.update({
      where: { id: branchId },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.CUSTOMER_BRANCH_DELETED,
      resourceType: 'CUSTOMER_BRANCH',
      resourceId: branchId,
      action: 'DELETE_BRANCH',
      metadata: { customerId, branchName: existing.branchName },
    });

    return { success: true, message: `Branch "${existing.branchName}" deleted successfully` };
  }

  // ---------------------------------------------------------------------------
  // Contacts Management
  // ---------------------------------------------------------------------------
  async listContacts(tenantId: string, customerId: string) {
    await this.ensureCustomerExists(tenantId, customerId);
    return this.prisma.customerContact.findMany({
      where: { tenantId, customerId, deletedAt: null },
      include: {
        branch: { select: { id: true, branchName: true } },
      },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    });
  }

  async createContact(tenantId: string, customerId: string, actorId: string, dto: CreateCustomerContactDto) {
    const customer = await this.ensureCustomerExists(tenantId, customerId);

    if (dto.branchId) {
      const branch = await this.prisma.customerBranch.findFirst({
        where: { id: dto.branchId, customerId, tenantId, deletedAt: null },
      });
      if (!branch) {
        throw new NotFoundException('Selected branch not found for this customer');
      }
    }

    if (dto.isPrimary) {
      await this.prisma.customerContact.updateMany({
        where: { tenantId, customerId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await this.prisma.customerContact.create({
      data: {
        tenantId,
        customerId,
        branchId: dto.branchId || null,
        name: dto.name.trim(),
        designation: dto.designation?.trim(),
        department: dto.department?.trim(),
        email: dto.email?.trim().toLowerCase(),
        phone: dto.phone.trim(),
        alternatePhone: dto.alternatePhone?.trim(),
        isPrimary: dto.isPrimary ?? false,
        status: dto.status || 'ACTIVE',
        notes: dto.notes?.trim(),
      },
      include: {
        branch: { select: { id: true, branchName: true } },
      },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.CUSTOMER_CONTACT_CREATED,
      resourceType: 'CUSTOMER_CONTACT',
      resourceId: contact.id,
      action: 'CREATE_CONTACT',
      metadata: { customerId, customerName: customer.companyName, contactName: contact.name },
    });

    return contact;
  }

  async updateContact(
    tenantId: string,
    customerId: string,
    contactId: string,
    actorId: string,
    dto: UpdateCustomerContactDto
  ) {
    await this.ensureCustomerExists(tenantId, customerId);
    const existing = await this.prisma.customerContact.findFirst({
      where: { id: contactId, customerId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Contact not found');
    }

    if (dto.branchId) {
      const branch = await this.prisma.customerBranch.findFirst({
        where: { id: dto.branchId, customerId, tenantId, deletedAt: null },
      });
      if (!branch) {
        throw new NotFoundException('Selected branch not found');
      }
    }

    if (dto.isPrimary) {
      await this.prisma.customerContact.updateMany({
        where: { tenantId, customerId, isPrimary: true, id: { not: contactId } },
        data: { isPrimary: false },
      });
    }

    const updated = await this.prisma.customerContact.update({
      where: { id: contactId },
      data: {
        branchId: dto.branchId !== undefined ? dto.branchId : existing.branchId,
        name: dto.name?.trim(),
        designation: dto.designation?.trim(),
        department: dto.department?.trim(),
        email: dto.email?.trim().toLowerCase(),
        phone: dto.phone?.trim(),
        alternatePhone: dto.alternatePhone?.trim(),
        isPrimary: dto.isPrimary,
        status: dto.status,
        notes: dto.notes?.trim(),
      },
      include: {
        branch: { select: { id: true, branchName: true } },
      },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.CUSTOMER_CONTACT_UPDATED,
      resourceType: 'CUSTOMER_CONTACT',
      resourceId: contactId,
      action: 'UPDATE_CONTACT',
      metadata: { customerId, contactName: updated.name },
    });

    return updated;
  }

  async deleteContact(tenantId: string, customerId: string, contactId: string, actorId: string) {
    await this.ensureCustomerExists(tenantId, customerId);
    const existing = await this.prisma.customerContact.findFirst({
      where: { id: contactId, customerId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Contact not found');
    }

    await this.prisma.customerContact.update({
      where: { id: contactId },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.CUSTOMER_CONTACT_DELETED,
      resourceType: 'CUSTOMER_CONTACT',
      resourceId: contactId,
      action: 'DELETE_CONTACT',
      metadata: { customerId, contactName: existing.name },
    });

    return { success: true, message: `Contact "${existing.name}" deleted successfully` };
  }

  // ---------------------------------------------------------------------------
  // Authorized Customer Portal Users Management
  // ---------------------------------------------------------------------------
  async listPortalUsers(tenantId: string, customerId: string) {
    await this.ensureCustomerExists(tenantId, customerId);
    return this.prisma.customerUser.findMany({
      where: { tenantId, customerId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            isActive: true,
            emailVerified: true,
          },
        },
        branch: {
          select: { id: true, branchName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async assignPortalUser(
    tenantId: string,
    customerId: string,
    actorId: string,
    dto: AssignCustomerUserDto
  ) {
    const customer = await this.ensureCustomerExists(tenantId, customerId);

    let targetUserId = dto.userId;

    if (!targetUserId && dto.email) {
      const email = dto.email.trim().toLowerCase();
      let user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Invite this user as customer portal user
        const customerRole = await this.prisma.role.findFirst({
          where: { name: SystemRole.CUSTOMER },
        });
        if (!customerRole) {
          throw new BadRequestException('Customer role is not configured');
        }

        const rawToken = generateSessionToken();
        const tokenHash = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });

        await this.prisma.invitation.create({
          data: {
            tenantId,
            email,
            roleId: customerRole.id,
            fullName: dto.fullName || email.split('@')[0],
            phone: dto.phone,
            tokenHash,
            invitedByUserId: actorId,
            expiresAt,
          },
        });

        await this.mailService.sendInvitationEmail(
          email,
          rawToken,
          tenant?.name || 'Kalpak Solutions',
          'CUSTOMER',
          undefined,
          dto.fullName,
          dto.phone
        );

        return {
          success: true,
          message: `Invitation sent to ${email}. Once they accept, they will have portal access to ${customer.companyName}.`,
          invited: true,
        };
      }
      targetUserId = user.id;
    }

    if (!targetUserId) {
      throw new BadRequestException('Either userId or email must be provided');
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!user) {
      throw new NotFoundException('User account not found');
    }

    // Verify branch if provided
    if (dto.branchId) {
      const branch = await this.prisma.customerBranch.findFirst({
        where: { id: dto.branchId, customerId, tenantId, deletedAt: null },
      });
      if (!branch) {
        throw new NotFoundException('Branch not found for this customer');
      }
    }

    // Check if already assigned
    const existing = await this.prisma.customerUser.findFirst({
      where: { customerId, userId: targetUserId },
    });

    if (existing) {
      throw new ConflictException('User is already authorized for this customer');
    }

    const customerUser = await this.prisma.customerUser.create({
      data: {
        tenantId,
        customerId,
        userId: targetUserId,
        branchId: dto.branchId || null,
        roleTitle: dto.roleTitle?.trim(),
        status: 'ACTIVE',
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, isActive: true } },
        branch: { select: { id: true, branchName: true } },
      },
    });

    // Ensure customer has portalAccessEnabled set to true
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { portalAccessEnabled: true },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.CUSTOMER_USER_ASSIGNED,
      resourceType: 'CUSTOMER_USER',
      resourceId: customerUser.id,
      action: 'ASSIGN_PORTAL_USER',
      metadata: { customerId, userId: targetUserId, roleTitle: dto.roleTitle },
    });

    return customerUser;
  }

  async removePortalUser(tenantId: string, customerId: string, customerUserId: string, actorId: string) {
    await this.ensureCustomerExists(tenantId, customerId);
    const existing = await this.prisma.customerUser.findFirst({
      where: { id: customerUserId, customerId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Authorized customer user assignment not found');
    }

    await this.prisma.customerUser.delete({
      where: { id: customerUserId },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.CUSTOMER_USER_REVOKED,
      resourceType: 'CUSTOMER_USER',
      resourceId: customerUserId,
      action: 'REVOKE_PORTAL_USER',
      metadata: { customerId, userId: existing.userId },
    });

    return { success: true, message: 'Portal access revoked for user' };
  }

  // ---------------------------------------------------------------------------
  // Assets & Tickets Management
  // ---------------------------------------------------------------------------
  async linkAsset(tenantId: string, customerId: string, actorId: string, dto: LinkCustomerAssetDto) {
    const customer = await this.ensureCustomerExists(tenantId, customerId);

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException('Product not found in this organization');
    }

    const serialNumber = dto.serialNumber.trim();
    const existingSerial = await this.prisma.customerAsset.findFirst({
      where: { tenantId, serialNumber, deletedAt: null },
    });
    if (existingSerial) {
      throw new ConflictException(`Asset with serial number '${serialNumber}' already exists`);
    }

    if (dto.branchId) {
      const branch = await this.prisma.customerBranch.findFirst({
        where: { id: dto.branchId, customerId, tenantId, deletedAt: null },
      });
      if (!branch) {
        throw new NotFoundException('Branch not found for this customer');
      }
    }

    const asset = await this.prisma.customerAsset.create({
      data: {
        tenantId,
        customerId,
        productId: dto.productId,
        branchId: dto.branchId || null,
        serialNumber,
        location: dto.location?.trim(),
        installationDate: dto.installationDate ? new Date(dto.installationDate) : null,
        warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : null,
        status: 'OPERATIONAL',
        notes: dto.notes?.trim(),
      },
      include: {
        product: { select: { id: true, name: true, modelNumber: true, category: true } },
        branch: { select: { id: true, branchName: true } },
      },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.ASSET_CREATED,
      resourceType: 'CUSTOMER_ASSET',
      resourceId: asset.id,
      action: 'LINK_CUSTOMER_ASSET',
      metadata: { customerId, customerName: customer.companyName, serialNumber: asset.serialNumber },
    });

    return asset;
  }

  async getCustomerTickets(tenantId: string, customerId: string) {
    await this.ensureCustomerExists(tenantId, customerId);
    return this.prisma.serviceTicket.findMany({
      where: { tenantId, raisedForCustomerId: customerId, deletedAt: null },
      include: {
        customerBranch: { select: { id: true, branchName: true } },
        customerContact: { select: { id: true, name: true, phone: true } },
        customerAsset: {
          select: {
            id: true,
            serialNumber: true,
            product: { select: { name: true, modelNumber: true } },
          },
        },
        department: { select: { id: true, name: true, code: true } },
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Import & Export
  // ---------------------------------------------------------------------------
  async exportCustomers(tenantId: string) {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        _count: {
          select: {
            branches: { where: { deletedAt: null } },
            contacts: { where: { deletedAt: null } },
            assets: { where: { deletedAt: null } },
            tickets: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return customers.map((c) => ({
      customerCode: c.customerCode || '',
      customerType: c.customerType,
      companyName: c.companyName,
      contactPerson: c.contactPerson,
      email: c.email,
      phone: c.phone,
      alternatePhone: c.alternatePhone || '',
      businessType: c.businessType || '',
      city: c.city || '',
      state: c.state || '',
      country: c.country || 'India',
      status: c.status,
      branchCount: c._count.branches,
      contactCount: c._count.contacts,
      assetCount: c._count.assets,
      ticketCount: c._count.tickets,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async importCustomers(tenantId: string, actorId: string, records: CreateCustomerDto[]) {
    if (!Array.isArray(records) || records.length === 0) {
      throw new BadRequestException('Records must be a non-empty array of customer objects');
    }

    const created: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      if (!rec) continue;
      try {
        if (!rec.companyName || !rec.contactPerson || !rec.email || !rec.phone) {
          throw new BadRequestException('companyName, contactPerson, email, and phone are required');
        }
        const customer = await this.createCustomer(tenantId, actorId, rec);
        created.push(customer);
      } catch (err: any) {
        errors.push({
          row: i + 1,
          email: rec?.email,
          error: err.message || 'Failed to import customer',
        });
      }
    }

    return {
      total: records.length,
      importedCount: created.length,
      errorCount: errors.length,
      errors,
    };
  }

  // ---------------------------------------------------------------------------
  // Invitation & Portal Access (retained for backward compatibility)
  // ---------------------------------------------------------------------------
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

    await this.prisma.invitation.updateMany({
      where: {
        tenantId,
        email,
        acceptedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    const rawToken = generateSessionToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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

    await this.mailService.sendInvitationEmail(
      email,
      rawToken,
      tenant.name,
      'CUSTOMER',
      undefined,
      customer.contactPerson || customer.companyName,
      customer.phone
    );

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

  private async ensureCustomerExists(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }
}
