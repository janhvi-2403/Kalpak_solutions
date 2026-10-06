import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { PaginatedResult } from '@kalpak/types';
import { Prisma } from '@kalpak/database';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        isActive: true,
        isSuperAdmin: true,
        mfaEnabled: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return user;
  }

  async listTenantUsers(
    tenantId: string,
    page: number = 1,
    limit: number = 20,
    departmentId?: string
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const skip = (page - 1) * limit;

    const userFilter: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(departmentId
        ? {
            OR: [
              { employeeProfile: { departmentId } },
              { headedDepartments: { some: { id: departmentId } } },
            ],
          }
        : {}),
    };

    const [total, memberships] = await Promise.all([
      this.prisma.tenantMembership.count({
        where: {
          tenantId,
          user: userFilter,
        },
      }),
      this.prisma.tenantMembership.findMany({
        where: {
          tenantId,
          user: userFilter,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phoneNumber: true,
              isActive: true,
              mfaEnabled: true,
              createdAt: true,
              lastLoginAt: true,
              employeeProfile: {
                select: {
                  departmentId: true,
                  department: { select: { id: true, name: true, code: true } },
                  designation: true,
                  skills: true,
                  isAvailable: true,
                  activeTicketsCount: true,
                },
              },
              headedDepartments: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        skip,
        take: limit,
      }),
    ]);

    const items = memberships.map((m) => {
      const headedDept = m.user.headedDepartments?.[0];
      const deptId = m.user.employeeProfile?.departmentId || headedDept?.id || null;
      const deptName = m.user.employeeProfile?.department?.name || headedDept?.name || null;
      return {
        membershipId: m.id,
        userId: m.user.id,
        email: m.user.email,
        fullName: m.user.fullName,
        phoneNumber: m.user.phoneNumber,
        isActive: m.user.isActive,
        mfaEnabled: m.user.mfaEnabled,
        role: m.role.name,
        departmentId: deptId,
        departmentName: deptName,
        designation: m.user.employeeProfile?.designation || (headedDept ? 'Department Head' : 'Support Specialist'),
        isAvailable: m.user.employeeProfile?.isAvailable ?? true,
        skills: m.user.employeeProfile?.skills || [],
        joinedAt: m.createdAt,
        lastLoginAt: m.user.lastLoginAt,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    };
  }

  async updateUserStatus(tenantId: string, userId: string, isActive: boolean, actorId?: string) {
    if (actorId && actorId === userId && !isActive) {
      throw new BadRequestException('You cannot deactivate your own administrative account');
    }

    // Ensure user belongs to the tenant
    const membership = await this.prisma.tenantMembership.findUnique({
      where: {
        uq_membership_tenant_user: {
          tenantId,
          userId,
        },
      },
      include: {
        role: true,
      },
    });

    if (!membership) {
      throw new NotFoundException('User is not a member of this organization');
    }

    // RULE: At least one active Client Admin must always remain
    if (!isActive && membership.role.name === 'CLIENT_ADMIN') {
      const activeAdminsCount = await this.prisma.tenantMembership.count({
        where: {
          tenantId,
          role: { name: 'CLIENT_ADMIN' },
          user: {
            isActive: true,
            deletedAt: null,
          },
        },
      });

      if (activeAdminsCount <= 1) {
        throw new BadRequestException(
          'At least one active Client Admin must always remain in the organization. You cannot deactivate the only active Client Admin.'
        );
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        isActive: true,
      },
    });

    return {
      success: true,
      message: `User status successfully updated to ${isActive ? 'ACTIVE' : 'DEACTIVATED'}`,
      user: updatedUser,
    };
  }
}
