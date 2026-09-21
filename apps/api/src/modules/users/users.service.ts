import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { PaginatedResult } from '@kalpak/types';

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
    limit: number = 20
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const skip = (page - 1) * limit;

    const [total, memberships] = await Promise.all([
      this.prisma.tenantMembership.count({
        where: {
          tenantId,
          user: { deletedAt: null },
        },
      }),
      this.prisma.tenantMembership.findMany({
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
              isActive: true,
              mfaEnabled: true,
              createdAt: true,
              lastLoginAt: true,
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

    const items = memberships.map((m) => ({
      membershipId: m.id,
      userId: m.user.id,
      email: m.user.email,
      fullName: m.user.fullName,
      isActive: m.user.isActive,
      mfaEnabled: m.user.mfaEnabled,
      role: m.role.name,
      joinedAt: m.createdAt,
      lastLoginAt: m.user.lastLoginAt,
    }));

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
}
