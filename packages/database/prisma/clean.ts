import { PrismaClient } from '@prisma/client';
import { PermissionCode, SystemRole } from '@kalpak/types';

const prisma = new PrismaClient();

const PERMISSION_DEFINITIONS: Array<{ code: PermissionCode; description: string; module: string }> = [
  // Tenant Administration
  { code: PermissionCode.TENANT_READ, description: 'View tenant details and statistics', module: 'TENANT' },
  { code: PermissionCode.TENANT_UPDATE, description: 'Modify tenant configuration and profile', module: 'TENANT' },
  { code: PermissionCode.TENANT_SETTINGS, description: 'Manage tenant security and domain settings', module: 'TENANT' },
  { code: PermissionCode.TENANT_MANAGE_ALL, description: 'Global multi-tenant platform administration', module: 'TENANT' },

  // User & RBAC Administration
  { code: PermissionCode.USER_READ, description: 'View users within tenant organization', module: 'USER' },
  { code: PermissionCode.USER_CREATE, description: 'Invite or provision new tenant members', module: 'USER' },
  { code: PermissionCode.USER_UPDATE, description: 'Update user profiles and statuses', module: 'USER' },
  { code: PermissionCode.USER_DELETE, description: 'Deactivate or soft-delete user accounts', module: 'USER' },
  { code: PermissionCode.ROLE_ASSIGN, description: 'Assign roles to tenant users', module: 'USER' },
  { code: PermissionCode.ROLE_MANAGE, description: 'Create and configure custom tenant roles', module: 'USER' },

  // Service Calls & Tickets
  { code: PermissionCode.TICKET_CREATE, description: 'Log a new service call or support ticket', module: 'TICKET' },
  { code: PermissionCode.TICKET_READ, description: 'View service tickets and work logs', module: 'TICKET' },
  { code: PermissionCode.TICKET_UPDATE, description: 'Update ticket details, notes and progress', module: 'TICKET' },
  { code: PermissionCode.TICKET_ASSIGN, description: 'Assign tickets to support technicians or teams', module: 'TICKET' },
  { code: PermissionCode.TICKET_RESOLVE, description: 'Mark tickets resolved or closed', module: 'TICKET' },
  { code: PermissionCode.TICKET_DELETE, description: 'Cancel or purge service tickets', module: 'TICKET' },

  // Customer Management
  { code: PermissionCode.CUSTOMER_READ, description: 'View client customer records', module: 'CUSTOMER' },
  { code: PermissionCode.CUSTOMER_CREATE, description: 'Register client customer records', module: 'CUSTOMER' },
  { code: PermissionCode.CUSTOMER_UPDATE, description: 'Edit client customer records', module: 'CUSTOMER' },

  // Products & Services
  { code: PermissionCode.PRODUCT_READ, description: 'View registered hardware/software products', module: 'PRODUCT' },
  { code: PermissionCode.PRODUCT_MANAGE, description: 'Add and configure product catalog', module: 'PRODUCT' },
  { code: PermissionCode.SERVICE_READ, description: 'View services and warranty contracts', module: 'SERVICE' },
  { code: PermissionCode.SERVICE_MANAGE, description: 'Manage service catalogs and SLAs', module: 'SERVICE' },

  // Reporting & Analytics
  { code: PermissionCode.REPORT_VIEW, description: 'View operational ticket & SLA aging dashboards', module: 'REPORT' },
  { code: PermissionCode.REPORT_EXPORT, description: 'Export operational and compliance reports', module: 'REPORT' },

  // Audit Logs
  { code: PermissionCode.AUDIT_READ, description: 'Inspect audit trail and security logs', module: 'AUDIT' },

  // Billing & Subscriptions
  { code: PermissionCode.BILLING_VIEW, description: 'View subscription plans and invoices', module: 'BILLING' },
  { code: PermissionCode.BILLING_MANAGE, description: 'Manage payment methods and plan upgrades', module: 'BILLING' },
];

const ROLE_PERMISSIONS_MAPPING: Record<SystemRole, PermissionCode[]> = {
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

async function main() {
  console.log('--- Cleaning Kalpak SaaS Database ---');
  console.log('Truncating all tenant, customer, ticket, session, and user data...');

  // Fetch all public tables to truncate safely
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename NOT IN ('_prisma_migrations', 'permissions', 'role_permissions', 'roles');
  `;

  for (const { tablename } of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    } catch (err: any) {
      console.warn(`Could not truncate ${tablename}: ${err.message}`);
    }
  }

  // Clear non-system roles
  try {
    await prisma.role.deleteMany({
      where: { isSystem: false },
    });
  } catch (err: any) {
    console.warn(`Could not clear custom roles: ${err.message}`);
  }

  console.log('✓ All users, credentials, sessions, tokens, and tenants cleared.');

  console.log('Ensuring baseline RBAC permissions & system roles...');
  for (const perm of PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { description: perm.description, module: perm.module },
      create: {
        code: perm.code,
        description: perm.description,
        module: perm.module,
      },
    });
  }

  for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS_MAPPING)) {
    let role = await prisma.role.findFirst({
      where: { name: roleName, tenantId: null },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: roleName,
          description: `System defined ${roleName} role`,
          isSystem: true,
          tenantId: null,
        },
      });
    }

    const permissionRecords = await prisma.permission.findMany({
      where: { code: { in: permissions } },
    });

    for (const p of permissionRecords) {
      await prisma.rolePermission.upsert({
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

  console.log('✓ Baseline RBAC roles and permissions ready.');
  console.log('--- Database is completely fresh and ready for new registrations! ---');
}

main()
  .catch((e) => {
    console.error('Error cleaning database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
