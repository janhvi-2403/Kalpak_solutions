import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { logger } from '@kalpak/logger';
import { PermissionCode, SystemRole } from '@kalpak/types';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? [
              { emit: 'event', level: 'query' },
              { emit: 'stdout', level: 'warn' },
              { emit: 'stdout', level: 'error' },
            ]
          : [{ emit: 'stdout', level: 'error' }],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      logger.info('Database connection established successfully');
      await this.ensureBaselineRbac();
    } catch (error) {
      logger.error({ error }, 'Failed to connect to PostgreSQL database');
      throw error;
    }
  }

  /**
   * Ensures essential baseline RBAC permissions and system roles exist in the database.
   */
  async ensureBaselineRbac() {
    try {
      const PERMISSION_DEFINITIONS = [
        { code: PermissionCode.TENANT_READ, description: 'View tenant details and statistics', module: 'TENANT' },
        { code: PermissionCode.TENANT_UPDATE, description: 'Modify tenant configuration and profile', module: 'TENANT' },
        { code: PermissionCode.TENANT_SETTINGS, description: 'Manage tenant security and domain settings', module: 'TENANT' },
        { code: PermissionCode.TENANT_MANAGE_ALL, description: 'Global multi-tenant platform administration', module: 'TENANT' },
        { code: PermissionCode.USER_READ, description: 'View users within tenant organization', module: 'USER' },
        { code: PermissionCode.USER_CREATE, description: 'Invite or provision new tenant members', module: 'USER' },
        { code: PermissionCode.USER_UPDATE, description: 'Update user profiles and statuses', module: 'USER' },
        { code: PermissionCode.USER_DELETE, description: 'Deactivate or soft-delete user accounts', module: 'USER' },
        { code: PermissionCode.ROLE_ASSIGN, description: 'Assign roles to tenant users', module: 'USER' },
        { code: PermissionCode.ROLE_MANAGE, description: 'Create and configure custom tenant roles', module: 'USER' },
        { code: PermissionCode.TICKET_CREATE, description: 'Log a new service call or support ticket', module: 'TICKET' },
        { code: PermissionCode.TICKET_READ, description: 'View service tickets and work logs', module: 'TICKET' },
        { code: PermissionCode.TICKET_UPDATE, description: 'Update ticket details, notes and progress', module: 'TICKET' },
        { code: PermissionCode.TICKET_ASSIGN, description: 'Assign tickets to support technicians or teams', module: 'TICKET' },
        { code: PermissionCode.TICKET_RESOLVE, description: 'Mark tickets resolved or closed', module: 'TICKET' },
        { code: PermissionCode.TICKET_DELETE, description: 'Cancel or purge service tickets', module: 'TICKET' },
        { code: PermissionCode.CUSTOMER_READ, description: 'View client customer records', module: 'CUSTOMER' },
        { code: PermissionCode.CUSTOMER_CREATE, description: 'Register client customer records', module: 'CUSTOMER' },
        { code: PermissionCode.CUSTOMER_UPDATE, description: 'Edit client customer records', module: 'CUSTOMER' },
        { code: PermissionCode.PRODUCT_READ, description: 'View registered hardware/software products', module: 'PRODUCT' },
        { code: PermissionCode.PRODUCT_MANAGE, description: 'Add and configure product catalog', module: 'PRODUCT' },
        { code: PermissionCode.SERVICE_READ, description: 'View services and warranty contracts', module: 'SERVICE' },
        { code: PermissionCode.SERVICE_MANAGE, description: 'Manage service catalogs and SLAs', module: 'SERVICE' },
        { code: PermissionCode.REPORT_VIEW, description: 'View operational ticket & SLA aging dashboards', module: 'REPORT' },
        { code: PermissionCode.REPORT_EXPORT, description: 'Export operational and compliance reports', module: 'REPORT' },
        { code: PermissionCode.AUDIT_READ, description: 'Inspect audit trail and security logs', module: 'AUDIT' },
        { code: PermissionCode.BILLING_VIEW, description: 'View subscription plans and invoices', module: 'BILLING' },
        { code: PermissionCode.BILLING_MANAGE, description: 'Manage payment methods and plan upgrades', module: 'BILLING' },
      ];

      for (const perm of PERMISSION_DEFINITIONS) {
        await this.permission.upsert({
          where: { code: perm.code },
          update: { description: perm.description, module: perm.module },
          create: {
            code: perm.code,
            description: perm.description,
            module: perm.module,
          },
        });
      }

      const ROLE_PERMISSIONS_MAPPING: Record<string, PermissionCode[]> = {
        [SystemRole.SUPER_ADMIN]: Object.values(PermissionCode),
        [SystemRole.CLIENT_ADMIN]: [
          PermissionCode.TENANT_READ,
          PermissionCode.TENANT_UPDATE,
          PermissionCode.TENANT_SETTINGS,
          PermissionCode.USER_READ,
          PermissionCode.USER_CREATE,
          PermissionCode.USER_UPDATE,
          PermissionCode.USER_DELETE,
          PermissionCode.ROLE_ASSIGN,
          PermissionCode.ROLE_MANAGE,
          PermissionCode.TICKET_CREATE,
          PermissionCode.TICKET_READ,
          PermissionCode.TICKET_UPDATE,
          PermissionCode.TICKET_ASSIGN,
          PermissionCode.TICKET_RESOLVE,
          PermissionCode.CUSTOMER_READ,
          PermissionCode.CUSTOMER_CREATE,
          PermissionCode.CUSTOMER_UPDATE,
          PermissionCode.PRODUCT_READ,
          PermissionCode.PRODUCT_MANAGE,
          PermissionCode.SERVICE_READ,
          PermissionCode.SERVICE_MANAGE,
          PermissionCode.REPORT_VIEW,
          PermissionCode.REPORT_EXPORT,
          PermissionCode.AUDIT_READ,
          PermissionCode.BILLING_VIEW,
          PermissionCode.BILLING_MANAGE,
        ],
        [SystemRole.DEPARTMENT_ADMIN]: [
          PermissionCode.TENANT_READ,
          PermissionCode.USER_READ,
          PermissionCode.TICKET_CREATE,
          PermissionCode.TICKET_READ,
          PermissionCode.TICKET_UPDATE,
          PermissionCode.TICKET_ASSIGN,
          PermissionCode.TICKET_RESOLVE,
          PermissionCode.CUSTOMER_READ,
          PermissionCode.PRODUCT_READ,
          PermissionCode.SERVICE_READ,
          PermissionCode.REPORT_VIEW,
        ],
        [SystemRole.SUPPORT_EMPLOYEE]: [
          PermissionCode.TICKET_CREATE,
          PermissionCode.TICKET_READ,
          PermissionCode.TICKET_UPDATE,
          PermissionCode.TICKET_RESOLVE,
          PermissionCode.CUSTOMER_READ,
          PermissionCode.PRODUCT_READ,
          PermissionCode.SERVICE_READ,
        ],
        [SystemRole.CUSTOMER]: [
          PermissionCode.TICKET_CREATE,
          PermissionCode.TICKET_READ,
          PermissionCode.PRODUCT_READ,
        ],
      };

      for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS_MAPPING)) {
        let role = await this.role.findFirst({
          where: { name: roleName, tenantId: null },
        });

        if (!role) {
          role = await this.role.create({
            data: {
              name: roleName,
              description: `${roleName} default system role`,
              isSystem: true,
              tenantId: null,
            },
          });
        }

        const permissionRecords = await this.permission.findMany({
          where: { code: { in: permissions } },
        });

        for (const p of permissionRecords) {
          await this.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: p.id,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: p.id,
            },
          });
        }
      }
      logger.info('Baseline RBAC roles and permissions verified successfully');
    } catch (error) {
      logger.warn({ error }, 'Failed to auto-seed baseline RBAC roles and permissions');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    logger.info('Database connection closed cleanly');
  }

  /**
   * Executes a database operation within a PostgreSQL transaction bound to a specific tenant ID for RLS.
   */
  async withTenantContext<T>(
    tenantId: string | null,
    isSuperAdmin: boolean,
    operation: (tx: PrismaService) => Promise<T>
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      if (tenantId) {
        // Enforce strict UUID format to prevent SQL injection in transaction context
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId);
        if (!isUuid) {
          throw new Error(`Invalid tenant ID format for RLS context: "${tenantId}"`);
        }
        await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
      }
      if (isSuperAdmin) {
        await tx.$executeRawUnsafe(`SET LOCAL app.bypass_rls = 'true'`);
      }
      return operation(tx as unknown as PrismaService);
    });
  }
}
