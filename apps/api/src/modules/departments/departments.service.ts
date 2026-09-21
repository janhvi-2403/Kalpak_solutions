import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { AuditEventType } from '@kalpak/types';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async listDepartments(tenantId: string) {
    const departments = await this.prisma.department.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      include: {
        headUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            employeeProfiles: true,
            products: true,
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
      headUserId: d.headUserId,
      headUser: d.headUser,
      memberCount: d._count.employeeProfiles,
      productCount: d._count.products,
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
          },
        },
        employeeProfiles: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
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
      },
      include: {
        headUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
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

    return department;
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
        description: dto.description?.trim(),
        headUserId: dto.headUserId !== undefined ? dto.headUserId : undefined,
      },
      include: {
        headUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
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

    return updated;
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
}
