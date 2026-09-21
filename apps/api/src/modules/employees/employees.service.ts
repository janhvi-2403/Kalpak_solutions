import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateEmployeeProfileDto } from './dto/employee.dto';
import { AuditEventType } from '@kalpak/types';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async listEmployees(tenantId: string) {
    const memberships = await this.prisma.tenantMembership.findMany({
      where: {
        tenantId,
        user: { deletedAt: null },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phoneNumber: true,
            isActive: true,
            employeeProfile: {
              where: { tenantId },
              include: {
                department: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
              },
            },
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => {
      const profile = m.user.employeeProfile;
      return {
        id: profile?.id || m.id,
        tenantId: m.tenantId,
        userId: m.user.id,
        fullName: m.user.fullName,
        email: m.user.email,
        phone: profile?.phone || m.user.phoneNumber || null,
        role: m.role.name,
        roleId: m.role.id,
        departmentId: profile?.departmentId || null,
        departmentName: profile?.department?.name || null,
        departmentCode: profile?.department?.code || null,
        designation: profile?.designation || null,
        skills: profile?.skills || [],
        isAvailable: profile?.isAvailable ?? true,
        activeTicketsCount: profile?.activeTicketsCount || 0,
        isActive: m.user.isActive,
      };
    });
  }

  async updateEmployee(tenantId: string, userId: string, actorId: string, dto: UpdateEmployeeProfileDto) {
    const membership = await this.prisma.tenantMembership.findUnique({
      where: {
        uq_membership_tenant_user: {
          tenantId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('User is not a member of this organization');
    }

    const profile = await this.prisma.employeeProfile.upsert({
      where: { userId },
      create: {
        tenantId,
        userId,
        departmentId: dto.departmentId || null,
        designation: dto.designation?.trim(),
        skills: dto.skills || [],
        phone: dto.phone?.trim(),
        isAvailable: dto.isAvailable ?? true,
      },
      update: {
        departmentId: dto.departmentId !== undefined ? dto.departmentId : undefined,
        designation: dto.designation !== undefined ? dto.designation?.trim() : undefined,
        skills: dto.skills !== undefined ? dto.skills : undefined,
        phone: dto.phone !== undefined ? dto.phone?.trim() : undefined,
        isAvailable: dto.isAvailable !== undefined ? dto.isAvailable : undefined,
      },
      include: {
        department: true,
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.USER_UPDATED,
      resourceType: 'EMPLOYEE_PROFILE',
      resourceId: profile.id,
      action: 'UPDATE_EMPLOYEE_PROFILE',
      metadata: { userId, designation: profile.designation, departmentId: profile.departmentId },
    });

    return profile;
  }
}
