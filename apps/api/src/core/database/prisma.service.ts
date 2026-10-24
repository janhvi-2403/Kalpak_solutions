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
      await this.ensureDemoLogins();
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
    if (tenantId) {
      // Enforce strict UUID format to prevent SQL injection in transaction context
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId);
      if (!isUuid) {
        throw new Error(`Invalid tenant ID format for RLS context: "${tenantId}"`);
      }
    }

    return this.$transaction(async (tx) => {
      if (tenantId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
      }
      if (isSuperAdmin) {
        await tx.$executeRawUnsafe(`SET LOCAL app.bypass_rls = 'true'`);
      }
      return operation(tx as unknown as PrismaService);
    });
  }

  /**
   * Safely and permanently purges any tenant(s), child records, and associated non-superadmin users
   * matching a given keyword / slug / company name (e.g. 'infosys').
   */
  async purgeTarget(identifier: string) {
    try {
      const term = identifier.trim().toLowerCase();
      if (!term) return { purgedTenants: 0, purgedUsers: 0 };

      const matchingTenants = await this.tenant.findMany({
        where: {
          OR: [
            { slug: term },
            { slug: { contains: term, mode: 'insensitive' } },
            { name: { contains: term, mode: 'insensitive' } },
          ],
        },
      });

      let purgedTenants = 0;
      let purgedUsers = 0;

      for (const t of matchingTenants) {
        logger.info({ tenantId: t.id, slug: t.slug }, `[PrismaService] Purging tenant "${t.slug}"`);

        await this.ticketPartConsumption.deleteMany({ where: { tenantId: t.id } });
        await this.workOrderChecklistItem.deleteMany({ where: { tenantId: t.id } });
        await this.workOrder.deleteMany({ where: { tenantId: t.id } });
        await this.ticketTimeline.deleteMany({ where: { tenantId: t.id } });
        await this.ticketAssignment.deleteMany({ where: { tenantId: t.id } });

        await this.inboundEmail.deleteMany({ where: { tenantId: t.id } });
        await this.emailMessage.deleteMany({ where: { tenantId: t.id } });
        await this.supportEmail.deleteMany({ where: { tenantId: t.id } });
        await this.emailConnection.deleteMany({ where: { tenantId: t.id } });
        await this.emailConfiguration.deleteMany({ where: { tenantId: t.id } });

        await this.serviceTicket.deleteMany({ where: { tenantId: t.id } });

        await this.contractAsset.deleteMany({ where: { contract: { tenantId: t.id } } });
        await this.preventiveMaintenanceSchedule.deleteMany({ where: { tenantId: t.id } });
        await this.serviceContract.deleteMany({ where: { tenantId: t.id } });
        await this.serviceCatalog.deleteMany({ where: { tenantId: t.id } });

        await this.customerAsset.deleteMany({ where: { tenantId: t.id } });
        await this.customerUser.deleteMany({ where: { tenantId: t.id } });
        await this.customerContact.deleteMany({ where: { tenantId: t.id } });
        await this.customerBranch.deleteMany({ where: { tenantId: t.id } });
        await this.customer.deleteMany({ where: { tenantId: t.id } });

        await this.inventoryTransaction.deleteMany({ where: { tenantId: t.id } });
        await this.partInventory.deleteMany({ where: { tenantId: t.id } });
        await this.sparePart.deleteMany({ where: { tenantId: t.id } });
        await this.storageLocation.deleteMany({ where: { tenantId: t.id } });
        await this.product.deleteMany({ where: { tenantId: t.id } });

        await this.employeeProfile.deleteMany({ where: { tenantId: t.id } });
        await this.invitation.deleteMany({ where: { tenantId: t.id } });
        await this.department.deleteMany({ where: { tenantId: t.id } });

        await this.paymentTransaction.deleteMany({ where: { tenantId: t.id } });
        await this.subscription.deleteMany({ where: { tenantId: t.id } });
        await this.tenantPolicy.deleteMany({ where: { tenantId: t.id } });

        const memberships = await this.tenantMembership.findMany({
          where: { tenantId: t.id },
          select: { userId: true },
        });
        const userIds = memberships.map((m) => m.userId);

        await this.tenantMembership.deleteMany({ where: { tenantId: t.id } });

        await this.rolePermission.deleteMany({
          where: { role: { tenantId: t.id, isSystem: false } },
        });
        await this.role.deleteMany({
          where: { tenantId: t.id, isSystem: false },
        });

        await this.notification.deleteMany({ where: { tenantId: t.id } });
        await this.auditEvent.deleteMany({ where: { tenantId: t.id } });
        await this.tenant.delete({ where: { id: t.id } });
        purgedTenants++;

        for (const uid of userIds) {
          const remaining = await this.tenantMembership.count({ where: { userId: uid } });
          const userRec = await this.user.findUnique({ where: { id: uid }, select: { isSuperAdmin: true } });
          if (remaining === 0 && !userRec?.isSuperAdmin) {
            await this.notification.deleteMany({ where: { userId: uid } });
            await this.emailVerificationToken.deleteMany({ where: { userId: uid } });
            await this.passwordResetToken.deleteMany({ where: { userId: uid } });
            await this.session.deleteMany({ where: { userId: uid } });
            await this.auditEvent.deleteMany({ where: { actorId: uid } });
            await this.user.delete({ where: { id: uid } });
            purgedUsers++;
          }
        }
      }

      // Purge any orphan users whose email matches term (except super admin)
      const orphanUsers = await this.user.findMany({
        where: {
          email: { contains: term, mode: 'insensitive' },
          isSuperAdmin: false,
        },
      });

      for (const u of orphanUsers) {
        logger.info({ userId: u.id, email: u.email }, `[PrismaService] Purging user "${u.email}"`);
        await this.notification.deleteMany({ where: { userId: u.id } });
        await this.emailVerificationToken.deleteMany({ where: { userId: u.id } });
        await this.passwordResetToken.deleteMany({ where: { userId: u.id } });
        await this.session.deleteMany({ where: { userId: u.id } });
        await this.tenantMembership.deleteMany({ where: { userId: u.id } });
        await this.auditEvent.deleteMany({ where: { actorId: u.id } });
        await this.user.delete({ where: { id: u.id } });
        purgedUsers++;
      }

      return { purgedTenants, purgedUsers };
    } catch (err: any) {
      logger.warn({ error: err.message }, `[PrismaService] purgeTarget error for "${identifier}"`);
      return { purgedTenants: 0, purgedUsers: 0 };
    }
  }

  /**
   * Safely and permanently deletes a user by email, cleaning all child/foreign-key relationships
   * so that the user can register fresh without hitting "Account already exists".
   */
  async purgeUserByEmail(email: string) {
    try {
      const targetEmail = email.trim().toLowerCase();
      if (!targetEmail) return false;

      const user = await this.user.findUnique({
        where: { email: targetEmail },
        select: { id: true, isSuperAdmin: true },
      });
      if (!user || user.isSuperAdmin) return false;

      logger.info({ email: targetEmail, userId: user.id }, `[PrismaService] Purging user "${targetEmail}"`);

      await this.invitation.updateMany({ where: { invitedByUserId: user.id }, data: { invitedByUserId: null } });
      await this.notification.deleteMany({ where: { userId: user.id } });
      await this.emailVerificationToken.deleteMany({ where: { userId: user.id } });
      await this.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await this.session.deleteMany({ where: { userId: user.id } });
      await this.tenantMembership.deleteMany({ where: { userId: user.id } });
      await this.auditEvent.deleteMany({ where: { actorId: user.id } });
      await this.user.delete({ where: { id: user.id } });

      logger.info({ email: targetEmail }, `[PrismaService] Successfully purged user "${targetEmail}" from database`);
      return true;
    } catch (err: any) {
      logger.warn({ error: err.message, email }, `[PrismaService] purgeUserByEmail warning`);
      return false;
    }
  }

  /**
   * Automatically guarantees that official company testing accounts exist and are verified.
   */
  async ensureDemoLogins() {
    try {
      const { hashPassword } = await import('@kalpak/auth');

      const acmeTenant = await this.tenant.upsert({
        where: { slug: 'acme-corp' },
        update: {
          name: 'Acme Corporation',
          status: 'ACTIVE' as any,
          settings: {
            onboarding: { completed: true },
            industry: 'Precision Manufacturing & Industrial Machinery',
            contactPhone: '+91 20 2687 4000',
            supportEmail: 'support@acme.com',
          },
          deletedAt: null,
        },
        create: {
          name: 'Acme Corporation',
          slug: 'acme-corp',
          status: 'ACTIVE' as any,
          settings: {
            onboarding: { completed: true },
            industry: 'Precision Manufacturing & Industrial Machinery',
            contactPhone: '+91 20 2687 4000',
            supportEmail: 'support@acme.com',
          },
        },
      });

      const clientAdminRole = await this.role.findFirst({
        where: { name: SystemRole.CLIENT_ADMIN, tenantId: null },
      });
      const technicianRole = await this.role.findFirst({
        where: { name: SystemRole.SUPPORT_EMPLOYEE, tenantId: null },
      });

      // 1. Super Admin
      const superAdminPasswordHash = await hashPassword('KalpakAdmin123!');
      await this.user.upsert({
        where: { email: 'admin@kalpak.com' },
        update: {
          fullName: 'System Super Administrator',
          passwordHash: superAdminPasswordHash,
          isActive: true,
          isSuperAdmin: true,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          mfaEnabled: false,
          deletedAt: null,
        },
        create: {
          email: 'admin@kalpak.com',
          fullName: 'System Super Administrator',
          passwordHash: superAdminPasswordHash,
          isActive: true,
          isSuperAdmin: true,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          mfaEnabled: false,
        },
      });

      // 2. Client Admin
      const clientAdminPasswordHash = await hashPassword('AcmeAdmin123!');
      const clientAdminUser = await this.user.upsert({
        where: { email: 'clientadmin@acme.com' },
        update: {
          fullName: 'Alice Johnson (Client Admin)',
          passwordHash: clientAdminPasswordHash,
          isActive: true,
          isSuperAdmin: false,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          mfaEnabled: false,
          deletedAt: null,
        },
        create: {
          email: 'clientadmin@acme.com',
          fullName: 'Alice Johnson (Client Admin)',
          passwordHash: clientAdminPasswordHash,
          isActive: true,
          isSuperAdmin: false,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          mfaEnabled: false,
        },
      });

      if (clientAdminRole) {
        await this.tenantMembership.upsert({
          where: {
            uq_membership_tenant_user: {
              tenantId: acmeTenant.id,
              userId: clientAdminUser.id,
            },
          },
          update: { roleId: clientAdminRole.id, isDefault: true },
          create: {
            tenantId: acmeTenant.id,
            userId: clientAdminUser.id,
            roleId: clientAdminRole.id,
            isDefault: true,
          },
        });
      }

      // 3. Clear demo department head data as requested
      await this.purgeUserByEmail('depthead@acme.com');

      // 4. Restore official credentials requested by user
      const infosysTenant = await this.tenant.upsert({
        where: { slug: 'infosys' },
        update: {
          name: 'Infosys',
          status: 'ACTIVE' as any,
          settings: {
            onboarding: { completed: true },
            industry: 'Information Technology & Consulting',
            contactPhone: '+91 20 2687 4000',
            supportEmail: 'support@infosys.com',
          },
          deletedAt: null,
        },
        create: {
          name: 'Infosys',
          slug: 'infosys',
          status: 'ACTIVE' as any,
          settings: {
            onboarding: { completed: true },
            industry: 'Information Technology & Consulting',
            contactPhone: '+91 20 2687 4000',
            supportEmail: 'support@infosys.com',
          },
        },
      });

      const devyaniPasswordHash = await hashPassword('Infosys@123');
      const devyaniUser = await this.user.upsert({
        where: { email: 'devyanigurgude@gmail.com' },
        update: {
          fullName: 'Devyani Gurgude',
          passwordHash: devyaniPasswordHash,
          isActive: true,
          isSuperAdmin: false,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          mfaEnabled: false,
          deletedAt: null,
        },
        create: {
          email: 'devyanigurgude@gmail.com',
          fullName: 'Devyani Gurgude',
          passwordHash: devyaniPasswordHash,
          isActive: true,
          isSuperAdmin: false,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          mfaEnabled: false,
        },
      });

      if (clientAdminRole) {
        await this.tenantMembership.upsert({
          where: {
            uq_membership_tenant_user: {
              tenantId: infosysTenant.id,
              userId: devyaniUser.id,
            },
          },
          update: { roleId: clientAdminRole.id, isDefault: true },
          create: {
            tenantId: infosysTenant.id,
            userId: devyaniUser.id,
            roleId: clientAdminRole.id,
            isDefault: true,
          },
        });
      }

      // 4. Support Field Technician
      const techPasswordHash = await hashPassword('AcmeTech123!');
      const techUser = await this.user.upsert({
        where: { email: 'tech@acme.com' },
        update: {
          fullName: 'Vikram Singh (Field Technician)',
          passwordHash: techPasswordHash,
          isActive: true,
          isSuperAdmin: false,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          mfaEnabled: false,
          deletedAt: null,
        },
        create: {
          email: 'tech@acme.com',
          fullName: 'Vikram Singh (Field Technician)',
          passwordHash: techPasswordHash,
          isActive: true,
          isSuperAdmin: false,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          mfaEnabled: false,
        },
      });

      if (technicianRole) {
        await this.tenantMembership.upsert({
          where: {
            uq_membership_tenant_user: {
              tenantId: acmeTenant.id,
              userId: techUser.id,
            },
          },
          update: { roleId: technicianRole.id, isDefault: true },
          create: {
            tenantId: acmeTenant.id,
            userId: techUser.id,
            roleId: technicianRole.id,
            isDefault: true,
          },
        });
      }

      logger.info('[PrismaService] Official testing accounts provisioned/verified successfully');
    } catch (error) {
      logger.warn({ error }, '[PrismaService] ensureDemoLogins warning');
    }
  }
}

