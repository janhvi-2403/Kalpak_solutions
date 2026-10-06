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
  console.log('Seeding baseline permissions...');
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

  console.log('Seeding baseline system roles and role-permission mappings...');
  for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS_MAPPING)) {
    let role = await prisma.role.findFirst({
      where: {
        name: roleName,
        tenantId: null,
      },
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
    } else {
      role = await prisma.role.update({
        where: { id: role.id },
        data: {
          description: `System defined ${roleName} role`,
          isSystem: true,
        },
      });
    }

    // Clear existing permissions and link new ones
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    for (const code of permissions) {
      const permRecord = await prisma.permission.findUnique({
        where: { code },
      });
      if (permRecord) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permRecord.id,
          },
        });
      }
    }
  }

  console.log('Seeding initial demonstration accounts and tenant...');
  const { hashPassword } = await import('@kalpak/auth');

  // 1. Super Admin User
  const superAdminPasswordHash = await hashPassword('KalpakAdmin123!');
  await prisma.user.upsert({
    where: { email: 'admin@kalpak.com' },
    update: {
      fullName: 'System Super Administrator',
      passwordHash: superAdminPasswordHash,
      isActive: true,
      isSuperAdmin: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: 'admin@kalpak.com',
      fullName: 'System Super Administrator',
      passwordHash: superAdminPasswordHash,
      isActive: true,
      isSuperAdmin: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  // 2. Demonstration Client Tenant
  const acmeTenant = await prisma.tenant.upsert({
    where: { slug: 'acme-corp' },
    update: {
      name: 'Acme Corporation',
      status: 'ACTIVE',
    },
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      status: 'ACTIVE',
    },
  });

  // 3. Client Admin User
  const clientAdminPasswordHash = await hashPassword('AcmeAdmin123!');
  const clientAdminUser = await prisma.user.upsert({
    where: { email: 'clientadmin@acme.com' },
    update: {
      fullName: 'Alice Johnson (Client Admin)',
      passwordHash: clientAdminPasswordHash,
      isActive: true,
      isSuperAdmin: false,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: 'clientadmin@acme.com',
      fullName: 'Alice Johnson (Client Admin)',
      passwordHash: clientAdminPasswordHash,
      isActive: true,
      isSuperAdmin: false,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  // 4. Link Client Admin to Acme Corporation with CLIENT_ADMIN role
  const clientAdminRole = await prisma.role.findFirstOrThrow({
    where: { name: SystemRole.CLIENT_ADMIN, tenantId: null },
  });

  await prisma.tenantMembership.upsert({
    where: {
      uq_membership_tenant_user: {
        tenantId: acmeTenant.id,
        userId: clientAdminUser.id,
      },
    },
    update: {
      roleId: clientAdminRole.id,
      isDefault: true,
    },
    create: {
      tenantId: acmeTenant.id,
      userId: clientAdminUser.id,
      roleId: clientAdminRole.id,
      isDefault: true,
    },
  });

  // 5. Seed Support Technician User
  const techPasswordHash = await hashPassword('AcmeTech123!');
  const technicianRole = await prisma.role.findFirstOrThrow({
    where: { name: SystemRole.SUPPORT_EMPLOYEE, tenantId: null },
  });
  const techUser = await prisma.user.upsert({
    where: { email: 'tech@acme.com' },
    update: {
      fullName: 'Vikram Singh (Field Technician)',
      passwordHash: techPasswordHash,
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: 'tech@acme.com',
      fullName: 'Vikram Singh (Field Technician)',
      passwordHash: techPasswordHash,
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.tenantMembership.upsert({
    where: {
      uq_membership_tenant_user: {
        tenantId: acmeTenant.id,
        userId: techUser.id,
      },
    },
    update: { roleId: technicianRole.id },
    create: {
      tenantId: acmeTenant.id,
      userId: techUser.id,
      roleId: technicianRole.id,
    },
  });

  // 6. Seed Acme Departments
  const deptElec = await prisma.department.upsert({
    where: {
      uq_department_tenant_code: {
        tenantId: acmeTenant.id,
        code: 'ELEC',
      },
    },
    update: { name: 'Electrical & Instrumentation', headUserId: clientAdminUser.id },
    create: {
      tenantId: acmeTenant.id,
      code: 'ELEC',
      name: 'Electrical & Instrumentation',
      description: 'PLC, motor drives, sensors, and electrical control panels',
      headUserId: clientAdminUser.id,
    },
  });

  const deptMech = await prisma.department.upsert({
    where: {
      uq_department_tenant_code: {
        tenantId: acmeTenant.id,
        code: 'MECH',
      },
    },
    update: { name: 'Mechanical & Hydraulics' },
    create: {
      tenantId: acmeTenant.id,
      code: 'MECH',
      name: 'Mechanical & Hydraulics',
      description: 'Heavy machinery, pneumatic valves, and hydraulic powerpacks',
    },
  });

  // 7. Seed Technician Profile
  await prisma.employeeProfile.upsert({
    where: { userId: techUser.id },
    update: {
      departmentId: deptElec.id,
      designation: 'Senior Electrical Engineer',
      skills: ['PLC Siemens S7', 'SCADA', 'Allen Bradley Drives', 'VFDs'],
      isAvailable: true,
      phone: '+91 9822001122',
    },
    create: {
      tenantId: acmeTenant.id,
      userId: techUser.id,
      departmentId: deptElec.id,
      designation: 'Senior Electrical Engineer',
      skills: ['PLC Siemens S7', 'SCADA', 'Allen Bradley Drives', 'VFDs'],
      isAvailable: true,
      phone: '+91 9822001122',
    },
  });

  // 8. Seed Acme Products Catalog
  const prodCnc = await prisma.product.upsert({
    where: {
      uq_product_tenant_model: {
        tenantId: acmeTenant.id,
        modelNumber: 'CNC-5X-PRO',
      },
    },
    update: { name: 'CNC 5-Axis Heavy Machining Center' },
    create: {
      tenantId: acmeTenant.id,
      name: 'CNC 5-Axis Heavy Machining Center',
      modelNumber: 'CNC-5X-PRO',
      category: 'CNC Milling',
      departmentId: deptMech.id,
      description: 'High-speed industrial milling center with 24,000 RPM spindle',
      hasWarranty: true,
      warrantyPeriodMonths: 24,
    },
  });

  const prodPress = await prisma.product.upsert({
    where: {
      uq_product_tenant_model: {
        tenantId: acmeTenant.id,
        modelNumber: 'HYD-PRESS-50T',
      },
    },
    update: { name: 'Hydraulic Stamping Press 50-Ton' },
    create: {
      tenantId: acmeTenant.id,
      name: 'Hydraulic Stamping Press 50-Ton',
      modelNumber: 'HYD-PRESS-50T',
      category: 'Hydraulic Presses',
      departmentId: deptMech.id,
      description: 'Precision hydraulic stamping system for automotive sheet metal',
      hasWarranty: true,
      warrantyPeriodMonths: 12,
    },
  });

  // 9. Seed Acme Customers & Assets
  const custTata = await prisma.customer.upsert({
    where: { id: 'a1111111-1111-1111-1111-111111111111' },
    update: { companyName: 'Tata Motors Commercial Vehicles' },
    create: {
      id: 'a1111111-1111-1111-1111-111111111111',
      tenantId: acmeTenant.id,
      companyName: 'Tata Motors Commercial Vehicles',
      contactPerson: 'Rajesh Sharma',
      email: 'rajesh.sharma@tatamotors.com',
      phone: '+91 9876500001',
      city: 'Pune',
      pincode: '411018',
      address: 'Plot 14, Pimpri Industrial Belt, Pune',
      status: 'ACTIVE',
      portalAccessEnabled: true,
    },
  });

  const custBharat = await prisma.customer.upsert({
    where: { id: 'b2222222-2222-2222-2222-222222222222' },
    update: { companyName: 'Bharat Forge Precision Components' },
    create: {
      id: 'b2222222-2222-2222-2222-222222222222',
      tenantId: acmeTenant.id,
      companyName: 'Bharat Forge Precision Components',
      contactPerson: 'Sunil Kulkarni',
      email: 's.kulkarni@bharatforge.com',
      phone: '+91 9876500002',
      city: 'Pune',
      pincode: '411036',
      address: 'Mundhwa Industrial Corridor, Pune',
      status: 'ACTIVE',
      portalAccessEnabled: true,
    },
  });

  // 10. Seed Customer Installed Assets
  await prisma.customerAsset.upsert({
    where: {
      uq_asset_tenant_serial: {
        tenantId: acmeTenant.id,
        serialNumber: 'SN-TATA-CNC-001',
      },
    },
    update: { location: 'Pimpri Plant 1 - Engine Bay' },
    create: {
      tenantId: acmeTenant.id,
      customerId: custTata.id,
      productId: prodCnc.id,
      serialNumber: 'SN-TATA-CNC-001',
      location: 'Pimpri Plant 1 - Engine Bay',
      installationDate: new Date('2025-06-15'),
      warrantyEndDate: new Date('2027-06-15'),
      status: 'OPERATIONAL',
    },
  });

  await prisma.customerAsset.upsert({
    where: {
      uq_asset_tenant_serial: {
        tenantId: acmeTenant.id,
        serialNumber: 'SN-BF-HYD-102',
      },
    },
    update: { location: 'Mundhwa Forging Unit 3' },
    create: {
      tenantId: acmeTenant.id,
      customerId: custBharat.id,
      productId: prodPress.id,
      serialNumber: 'SN-BF-HYD-102',
      location: 'Mundhwa Forging Unit 3',
      installationDate: new Date('2026-01-10'),
      warrantyEndDate: new Date('2027-01-10'),
      status: 'OPERATIONAL',
    },
  });

  // 11. Seed Acme Policy Matrix
  await prisma.tenantPolicy.upsert({
    where: { tenantId: acmeTenant.id },
    update: {
      tolerableOpenDays: 3,
      closureAuthority: 'SUPPORT_EMPLOYEE',
      assignmentStrategy: 'MANUAL_DEPT_HEAD',
    },
    create: {
      tenantId: acmeTenant.id,
      businessType: 'BOTH',
      purposeOfUse: 'BOTH',
      allowCustomerToRaise: true,
      allowEmployeeOnBehalf: true,
      assignmentStrategy: 'MANUAL_DEPT_HEAD',
      closureAuthority: 'SUPPORT_EMPLOYEE',
      tolerableOpenDays: 3,
      notificationChannels: 'BOTH',
      platformAccess: 'BOTH',
      pushNotifications: true,
      maxUsersQuota: 50,
    },
  });

  console.log('Database foundation and Master Data seed created successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database foundation:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
