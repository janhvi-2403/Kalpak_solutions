import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { AuditEventType, SystemRole } from '@kalpak/types';
import { hashPassword } from '@kalpak/auth';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async listCustomers(tenantId: string, search?: string) {
    const where: any = {
      tenantId,
      deletedAt: null,
    };

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

    const customers = await this.prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: { assets: true },
        },
      },
      orderBy: { companyName: 'asc' },
    });

    return customers.map((c) => ({
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
      portalAccessEnabled: c.portalAccessEnabled,
      notes: c.notes,
      assetCount: c._count.assets,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  async getCustomer(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId,
        deletedAt: null,
      },
      include: {
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
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
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
    });

    if (!existing) {
      throw new NotFoundException('Customer not found');
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

    return { success: true, message: 'Customer deleted successfully' };
  }

  async enablePortalAccess(
    tenantId: string,
    customerId: string,
    actorId: string,
    customPassword?: string
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
      include: { user: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const tempPassword =
      customPassword?.trim() ||
      `Portal@${Math.random().toString(36).substring(2, 8).toUpperCase()}!`;
    const passwordHash = await hashPassword(tempPassword);

    let customerRole = await this.prisma.role.findFirst({
      where: { name: SystemRole.CUSTOMER, tenantId: null },
    });
    if (!customerRole) {
      customerRole = await this.prisma.role.findFirst({
        where: { name: SystemRole.CUSTOMER },
      });
    }

    let userId = customer.userId;

    if (userId && customer.user) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          isActive: true,
          emailVerified: true,
        },
      });
    } else {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: customer.email.toLowerCase().trim() },
      });

      if (existingUser) {
        userId = existingUser.id;
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            passwordHash,
            isActive: true,
            emailVerified: true,
          },
        });
      } else {
        const newUser = await this.prisma.user.create({
          data: {
            email: customer.email.toLowerCase().trim(),
            fullName: customer.contactPerson || customer.companyName,
            phoneNumber: customer.phone,
            passwordHash,
            isActive: true,
            emailVerified: true,
            emailVerifiedAt: new Date(),
          },
        });
        userId = newUser.id;
      }
    }

    if (customerRole) {
      await this.prisma.tenantMembership.upsert({
        where: {
          uq_membership_tenant_user: {
            tenantId,
            userId,
          },
        },
        update: {
          roleId: customerRole.id,
        },
        create: {
          tenantId,
          userId,
          roleId: customerRole.id,
          isDefault: true,
        },
      });
    }

    await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        portalAccessEnabled: true,
        userId,
      },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.CUSTOMER_UPDATED,
      resourceType: 'CUSTOMER',
      resourceId: customerId,
      action: 'ENABLE_PORTAL_ACCESS',
      metadata: { customerId, email: customer.email, userId },
    });

    return {
      success: true,
      customerId: customer.id,
      userId,
      email: customer.email,
      temporaryPassword: tempPassword,
      message: 'Customer portal access has been successfully provisioned.',
    };
  }
}
