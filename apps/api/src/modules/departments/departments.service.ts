import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentQueryDto,
} from './dto/department.dto';
import { AuditEventType } from '@kalpak/types';
import { Prisma } from '@prisma/client';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async listDepartments(tenantId: string, query?: DepartmentQueryDto) {
    const where: Prisma.DepartmentWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (query?.status === 'ACTIVE') {
      where.isActive = true;
    } else if (query?.status === 'INACTIVE') {
      where.isActive = false;
    }

    if (query?.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { pocName: { contains: search, mode: 'insensitive' } },
        { pocEmail: { contains: search, mode: 'insensitive' } },
        { headUser: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const departments = await this.prisma.department.findMany({
      where,
      include: {
        headUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
        pocUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
        _count: {
          select: {
            tickets: {
              where: { deletedAt: null },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return departments.map((d) => ({
      id: d.id,
      tenantId: d.tenantId,
      name: d.name,
      code: d.code,
      description: d.description,
      isActive: d.isActive,
      headUserId: d.headUserId,
      headUser: d.headUser,
      pocUserId: d.pocUserId,
      poc: {
        name: d.pocName || d.pocUser?.fullName || null,
        email: d.pocEmail || d.pocUser?.email || null,
        phone: d.pocPhone || d.pocUser?.phoneNumber || null,
        userId: d.pocUserId || null,
      },
      totalTickets: d._count.tickets,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
  }

  async getDepartment(tenantId: string, departmentId: string) {
    const department = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        tenantId,
        deletedAt: null,
      },
      include: {
        headUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
        pocUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    // Ticket metrics
    const tickets = await this.prisma.serviceTicket.findMany({
      where: {
        departmentId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        isOverdue: true,
        dueAt: true,
        createdAt: true,
      },
    });

    const totalTickets = tickets.length;
    const openTickets = tickets.filter((t) =>
      ['OPEN', 'NEW', 'TRIAGED', 'ASSIGNED'].includes(t.status)
    ).length;
    const inProgressTickets = tickets.filter((t) =>
      ['IN_PROGRESS', 'WAITING_PARTS', 'SCHEDULED'].includes(t.status)
    ).length;
    const closedTickets = tickets.filter((t) =>
      ['RESOLVED', 'CLOSED'].includes(t.status)
    ).length;

    const now = new Date();
    const overdueTickets = tickets.filter((t) => {
      if (['RESOLVED', 'CLOSED', 'CANCELLED'].includes(t.status)) return false;
      if (t.isOverdue) return true;
      if (t.dueAt && new Date(t.dueAt) < now) return true;
      const ageMs = now.getTime() - new Date(t.createdAt).getTime();
      return ageMs > 3 * 24 * 60 * 60 * 1000; // 3 days aging
    }).length;

    const statusDistribution: Record<string, number> = {};
    for (const t of tickets) {
      statusDistribution[t.status] = (statusDistribution[t.status] || 0) + 1;
    }

    // Customers served (distinct customers with tickets in this department)
    const customers = await this.prisma.customer.findMany({
      where: {
        tenantId,
        deletedAt: null,
        tickets: {
          some: {
            departmentId,
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        companyName: true,
        contactPerson: true,
        email: true,
        phone: true,
        city: true,
        _count: {
          select: {
            tickets: {
              where: { departmentId, deletedAt: null },
            },
          },
        },
      },
      orderBy: { companyName: 'asc' },
      take: 20,
    });

    const customersServed = customers.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      contactPerson: c.contactPerson,
      email: c.email,
      phone: c.phone,
      city: c.city,
      ticketCount: c._count.tickets,
    }));

    // Products handled
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        departmentId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        modelNumber: true,
        category: true,
        description: true,
      },
      orderBy: { name: 'asc' },
    });

    // Services handled from ticket catalogs & service types
    const ticketServices = await this.prisma.serviceTicket.findMany({
      where: {
        departmentId,
        tenantId,
        deletedAt: null,
      },
      select: {
        serviceType: true,
        serviceCatalog: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
          },
        },
      },
    });

    const serviceMap = new Map<string, { id?: string; name: string; code?: string; category?: string }>();
    for (const ts of ticketServices) {
      if (ts.serviceCatalog) {
        serviceMap.set(ts.serviceCatalog.id, {
          id: ts.serviceCatalog.id,
          name: ts.serviceCatalog.name,
          code: ts.serviceCatalog.code,
          category: 'Catalog Service',
        });
      } else if (ts.serviceType) {
        serviceMap.set(ts.serviceType, {
          name: ts.serviceType.replace(/_/g, ' '),
          category: 'Standard Service',
        });
      }
    }
    const servicesHandled = Array.from(serviceMap.values());

    // Recent department-level ticket activity (Strictly ticket-level: no employee assignments or workload details)
    const recentActivity = await this.prisma.ticketTimeline.findMany({
      where: {
        tenantId,
        ticket: {
          departmentId,
          deletedAt: null,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: {
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            status: true,
            priority: true,
          },
        },
        actor: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return {
      department: {
        id: department.id,
        tenantId: department.tenantId,
        name: department.name,
        code: department.code,
        description: department.description,
        isActive: department.isActive,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
        headUserId: department.headUserId,
        headUser: department.headUser,
        pocUserId: department.pocUserId,
        poc: {
          name: department.pocName || department.pocUser?.fullName || null,
          email: department.pocEmail || department.pocUser?.email || null,
          phone: department.pocPhone || department.pocUser?.phoneNumber || null,
          userId: department.pocUserId || null,
        },
      },
      metrics: {
        totalTickets,
        openTickets,
        inProgressTickets,
        closedTickets,
        overdueTickets,
      },
      statusDistribution,
      customersServed,
      productsHandled: products,
      servicesHandled,
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        eventType: a.eventType,
        previousStatus: a.previousStatus,
        newStatus: a.newStatus,
        note: a.note,
        createdAt: a.createdAt,
        ticket: a.ticket,
        actor: a.actor
          ? {
              fullName: a.actor.fullName,
              email: a.actor.email,
            }
          : null,
      })),
    };
  }

  async createDepartment(tenantId: string, actorId: string, dto: CreateDepartmentDto) {
    const existing = await this.prisma.department.findFirst({
      where: {
        tenantId,
        code: dto.code.trim().toUpperCase(),
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(`Department code '${dto.code}' is already registered`);
    }

    const department = await this.prisma.department.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        description: dto.description?.trim(),
        headUserId: dto.headUserId || null,
        pocName: dto.pocName?.trim() || null,
        pocEmail: dto.pocEmail?.trim().toLowerCase() || null,
        pocPhone: dto.pocPhone?.trim() || null,
        pocUserId: dto.pocUserId || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        headUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
        pocUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.DEPARTMENT_CREATED,
      resourceType: 'DEPARTMENT',
      resourceId: department.id,
      action: 'CREATE_DEPARTMENT',
      metadata: { name: department.name, code: department.code },
    });

    return {
      ...department,
      poc: {
        name: department.pocName || department.pocUser?.fullName || null,
        email: department.pocEmail || department.pocUser?.email || null,
        phone: department.pocPhone || department.pocUser?.phoneNumber || null,
        userId: department.pocUserId || null,
      },
    };
  }

  async updateDepartment(tenantId: string, departmentId: string, actorId: string, dto: UpdateDepartmentDto) {
    const existing = await this.prisma.department.findFirst({
      where: { id: departmentId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Department not found');
    }

    if (dto.code && dto.code.trim().toUpperCase() !== existing.code) {
      const duplicate = await this.prisma.department.findFirst({
        where: {
          tenantId,
          code: dto.code.trim().toUpperCase(),
          id: { not: departmentId },
          deletedAt: null,
        },
      });

      if (duplicate) {
        throw new ConflictException(`Department code '${dto.code}' is already in use`);
      }
    }

    const updated = await this.prisma.department.update({
      where: { id: departmentId },
      data: {
        name: dto.name?.trim(),
        code: dto.code?.trim().toUpperCase(),
        description: dto.description !== undefined ? dto.description?.trim() : undefined,
        headUserId: dto.headUserId !== undefined ? dto.headUserId : undefined,
        pocName: dto.pocName !== undefined ? (dto.pocName ? dto.pocName.trim() : null) : undefined,
        pocEmail: dto.pocEmail !== undefined ? (dto.pocEmail ? dto.pocEmail.trim().toLowerCase() : null) : undefined,
        pocPhone: dto.pocPhone !== undefined ? (dto.pocPhone ? dto.pocPhone.trim() : null) : undefined,
        pocUserId: dto.pocUserId !== undefined ? dto.pocUserId : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
      },
      include: {
        headUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
        pocUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.DEPARTMENT_UPDATED,
      resourceType: 'DEPARTMENT',
      resourceId: updated.id,
      action: 'UPDATE_DEPARTMENT',
      metadata: { ...dto },
    });

    return {
      ...updated,
      poc: {
        name: updated.pocName || updated.pocUser?.fullName || null,
        email: updated.pocEmail || updated.pocUser?.email || null,
        phone: updated.pocPhone || updated.pocUser?.phoneNumber || null,
        userId: updated.pocUserId || null,
      },
    };
  }

  async toggleDepartmentStatus(tenantId: string, departmentId: string, actorId: string, isActive: boolean) {
    const existing = await this.prisma.department.findFirst({
      where: { id: departmentId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Department not found');
    }

    const updated = await this.prisma.department.update({
      where: { id: departmentId },
      data: { isActive },
      include: {
        headUser: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.DEPARTMENT_UPDATED,
      resourceType: 'DEPARTMENT',
      resourceId: departmentId,
      action: isActive ? 'ACTIVATE_DEPARTMENT' : 'DEACTIVATE_DEPARTMENT',
      metadata: { departmentId, isActive, name: existing.name },
    });

    return {
      id: updated.id,
      name: updated.name,
      code: updated.code,
      isActive: updated.isActive,
      message: `Department '${updated.name}' has been ${isActive ? 'activated' : 'deactivated'} successfully`,
    };
  }

  async deleteDepartment(tenantId: string, departmentId: string, actorId: string) {
    const existing = await this.prisma.department.findFirst({
      where: { id: departmentId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Department not found');
    }

    await this.prisma.department.update({
      where: { id: departmentId },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.DEPARTMENT_DELETED,
      resourceType: 'DEPARTMENT',
      resourceId: departmentId,
      action: 'DELETE_DEPARTMENT',
      metadata: { name: existing.name },
    });

    return { success: true, message: 'Department deleted successfully' };
  }

  async getEligibleUsers(tenantId: string) {
    const memberships = await this.prisma.tenantMembership.findMany({
      where: {
        tenantId,
        user: {
          deletedAt: null,
          isActive: true,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: { user: { fullName: 'asc' } },
    });

    return memberships.map((m) => m.user);
  }
}
