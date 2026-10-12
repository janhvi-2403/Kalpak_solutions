import { PrismaClient } from '@prisma/client';
import { PermissionCode, SystemRole } from '@kalpak/types';
import * as fs from 'fs';
import * as path from 'path';

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

  // 5b. Seed Department Admin / Head User
  const deptHeadPasswordHash = await hashPassword('AcmeDept123!');
  const deptAdminRole = await prisma.role.findFirstOrThrow({
    where: { name: SystemRole.DEPARTMENT_ADMIN, tenantId: null },
  });
  const deptHeadUser = await prisma.user.upsert({
    where: { email: 'depthead@acme.com' },
    update: {
      fullName: 'Rajesh Nair (Dept Head)',
      passwordHash: deptHeadPasswordHash,
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: 'depthead@acme.com',
      fullName: 'Rajesh Nair (Dept Head)',
      passwordHash: deptHeadPasswordHash,
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.tenantMembership.upsert({
    where: {
      uq_membership_tenant_user: {
        tenantId: acmeTenant.id,
        userId: deptHeadUser.id,
      },
    },
    update: { roleId: deptAdminRole.id },
    create: {
      tenantId: acmeTenant.id,
      userId: deptHeadUser.id,
      roleId: deptAdminRole.id,
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
    update: { name: 'Mechanical & Hydraulics', headUserId: deptHeadUser.id },
    create: {
      tenantId: acmeTenant.id,
      code: 'MECH',
      name: 'Mechanical & Hydraulics',
      description: 'Heavy machinery, pneumatic valves, and hydraulic powerpacks',
      headUserId: deptHeadUser.id,
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

  await prisma.employeeProfile.upsert({
    where: { userId: deptHeadUser.id },
    update: {
      departmentId: deptMech.id,
      designation: 'Head of Mechanical & Hydraulics',
      skills: ['Hydraulics', 'Pneumatics', 'Heavy Machinery', 'Preventive Maintenance'],
      isAvailable: true,
      phone: '+91 9822003344',
    },
    create: {
      tenantId: acmeTenant.id,
      userId: deptHeadUser.id,
      departmentId: deptMech.id,
      designation: 'Head of Mechanical & Hydraulics',
      skills: ['Hydraulics', 'Pneumatics', 'Heavy Machinery', 'Preventive Maintenance'],
      isAvailable: true,
      phone: '+91 9822003344',
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
    update: {
      customerType: 'CORPORATE',
      customerCode: 'CUST-CORP-001',
      companyName: 'Tata Motors Commercial Vehicles',
    },
    create: {
      id: 'a1111111-1111-1111-1111-111111111111',
      tenantId: acmeTenant.id,
      customerType: 'CORPORATE',
      customerCode: 'CUST-CORP-001',
      companyName: 'Tata Motors Commercial Vehicles',
      contactPerson: 'Rajesh Sharma',
      email: 'rajesh.sharma@tatamotors.com',
      phone: '+91 9876500001',
      alternatePhone: '+91 9876500099',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      pincode: '411018',
      address: 'Plot 14, Pimpri Industrial Belt, Pune',
      billingAddress: 'Corporate HQ, Bombay House, 24 Homi Mody Street, Mumbai 400001',
      taxId: '27AAACT2727Q1ZT',
      status: 'ACTIVE',
      portalAccessEnabled: true,
    },
  });

  const custBharat = await prisma.customer.upsert({
    where: { id: 'b2222222-2222-2222-2222-222222222222' },
    update: {
      customerType: 'BUSINESS_PARTNER',
      customerCode: 'CUST-BIZ-001',
      companyName: 'Bharat Forge Precision Components',
      businessType: 'Authorized Partner & Service Center',
    },
    create: {
      id: 'b2222222-2222-2222-2222-222222222222',
      tenantId: acmeTenant.id,
      customerType: 'BUSINESS_PARTNER',
      customerCode: 'CUST-BIZ-001',
      companyName: 'Bharat Forge Precision Components',
      contactPerson: 'Sunil Kulkarni',
      email: 's.kulkarni@bharatforge.com',
      phone: '+91 9876500002',
      businessType: 'Authorized Partner & Service Center',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      pincode: '411036',
      address: 'Mundhwa Industrial Corridor, Pune',
      taxId: '27AAACB0001B1ZU',
      status: 'ACTIVE',
      portalAccessEnabled: true,
    },
  });

  const custAnand = await prisma.customer.upsert({
    where: { id: 'c3333333-3333-3333-3333-333333333333' },
    update: {
      customerType: 'INDIVIDUAL',
      customerCode: 'CUST-IND-001',
      companyName: 'Anand Verma',
    },
    create: {
      id: 'c3333333-3333-3333-3333-333333333333',
      tenantId: acmeTenant.id,
      customerType: 'INDIVIDUAL',
      customerCode: 'CUST-IND-001',
      companyName: 'Anand Verma',
      contactPerson: 'Anand Verma',
      email: 'anand.verma@example.com',
      phone: '+91 9876500003',
      alternatePhone: '+91 9876500004',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      pincode: '411001',
      address: 'Flat 402, Green Acres, Koregaon Park',
      status: 'ACTIVE',
      portalAccessEnabled: false,
    },
  });

  // Seed Branches for Corporate and Business Partner
  const branchPimpri = await prisma.customerBranch.upsert({
    where: {
      uq_customer_branch_name: {
        customerId: custTata.id,
        branchName: 'Pimpri Manufacturing Plant',
      },
    },
    update: { isHeadquarters: true },
    create: {
      tenantId: acmeTenant.id,
      customerId: custTata.id,
      branchName: 'Pimpri Manufacturing Plant',
      branchCode: 'TATA-PIMPRI',
      contactPerson: 'Rajesh Sharma',
      phone: '+91 9876500001',
      email: 'pimpri.plant@tatamotors.com',
      address: 'Plot 14, Pimpri Industrial Belt',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      pincode: '411018',
      isHeadquarters: true,
      status: 'ACTIVE',
    },
  });

  const branchChakan = await prisma.customerBranch.upsert({
    where: {
      uq_customer_branch_name: {
        customerId: custTata.id,
        branchName: 'Chakan Assembly Line 2',
      },
    },
    update: {},
    create: {
      tenantId: acmeTenant.id,
      customerId: custTata.id,
      branchName: 'Chakan Assembly Line 2',
      branchCode: 'TATA-CHAKAN',
      contactPerson: 'Vikas Patil',
      phone: '+91 9876500015',
      email: 'chakan.line2@tatamotors.com',
      address: 'Phase 2, MIDC Chakan',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      pincode: '410501',
      isHeadquarters: false,
      status: 'ACTIVE',
    },
  });

  // Seed Contacts for Corporate
  await prisma.customerContact.upsert({
    where: { id: 'd4444444-4444-4444-4444-444444444444' },
    update: { isPrimary: true },
    create: {
      id: 'd4444444-4444-4444-4444-444444444444',
      tenantId: acmeTenant.id,
      customerId: custTata.id,
      branchId: branchPimpri.id,
      name: 'Rajesh Sharma',
      designation: 'VP - Operations & Fleet',
      department: 'Heavy Vehicles Division',
      email: 'rajesh.sharma@tatamotors.com',
      phone: '+91 9876500001',
      alternatePhone: '+91 9876500099',
      isPrimary: true,
      status: 'ACTIVE',
    },
  });

  await prisma.customerContact.upsert({
    where: { id: 'e5555555-5555-5555-5555-555555555555' },
    update: {},
    create: {
      id: 'e5555555-5555-5555-5555-555555555555',
      tenantId: acmeTenant.id,
      customerId: custTata.id,
      branchId: branchChakan.id,
      name: 'Pooja Nair',
      designation: 'Maintenance Lead',
      department: 'Plant Engineering',
      email: 'pooja.nair@tatamotors.com',
      phone: '+91 9876500022',
      isPrimary: false,
      status: 'ACTIVE',
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

  // Apply PostgreSQL RLS policies
  try {
    const rlsPath = path.join(__dirname, 'rls.sql');
    if (fs.existsSync(rlsPath)) {
      console.log('Applying RLS policies...');
      const sql = fs.readFileSync(rlsPath, 'utf-8');
      const statements: string[] = [];
      let currentStmt = '';
      let inDollarQuote = false;
      const lines = sql.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('--') && !inDollarQuote) continue;
        const dollarMatches = line.match(/\$\$/g);
        if (dollarMatches && dollarMatches.length % 2 === 1) inDollarQuote = !inDollarQuote;
        currentStmt += line + '\n';
        if (!inDollarQuote && trimmed.endsWith(';')) {
          const stmtToPush = currentStmt.trim();
          if (stmtToPush.length > 0) statements.push(stmtToPush);
          currentStmt = '';
        }
      }
      for (const stmt of statements) {
        try {
          await prisma.$executeRawUnsafe(stmt);
        } catch (err: any) {
          // ignore already exists or warnings
        }
      }
      console.log(`Applied ${statements.length} RLS statements successfully.`);
    }
  } catch (rlsErr) {
    console.warn('Note: Could not automatically run RLS migration script:', rlsErr);
  }
}

main()
  .catch((e) => {
    console.error('Error seeding database foundation:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
