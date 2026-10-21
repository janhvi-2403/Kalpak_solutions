import { PrismaClient, PlanTier, BillingCycle, SubscriptionStatus } from '@prisma/client';
import { hashPassword, verifyPassword } from '@kalpak/auth';
import { SystemRole } from '@kalpak/types';

const prisma = new PrismaClient();

export async function restoreTestingLogins() {
  console.log('================================================================');
  console.log('🔄 RESTORING OFFICIAL COMPANY TESTING LOGINS & DEMO ENVIRONMENT');
  console.log('================================================================\n');

  // 1. Ensure Acme Corporation tenant exists and is fully activated
  console.log('1. Configuring demonstration tenant: Acme Corporation (acme-corp)...');
  const acmeTenant = await prisma.tenant.upsert({
    where: { slug: 'acme-corp' },
    update: {
      name: 'Acme Corporation',
      status: 'ACTIVE',
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
      status: 'ACTIVE',
      settings: {
        onboarding: { completed: true },
        industry: 'Precision Manufacturing & Industrial Machinery',
        contactPhone: '+91 20 2687 4000',
        supportEmail: 'support@acme.com',
      },
    },
  });

  // 2. Ensure Tenant Policy with 5-Staff quota meter is configured
  console.log('2. Applying Acme Tenant Policy with 5-Staff Quota Limit...');
  await prisma.tenantPolicy.upsert({
    where: { tenantId: acmeTenant.id },
    update: {
      maxUsersQuota: 5,
      tolerableOpenDays: 3,
      closureAuthority: 'SUPPORT_EMPLOYEE',
      assignmentStrategy: 'MANUAL_DEPT_HEAD',
      businessType: 'BOTH',
      purposeOfUse: 'BOTH',
      allowCustomerToRaise: true,
      allowEmployeeOnBehalf: true,
      notificationChannels: 'BOTH',
      platformAccess: 'BOTH',
      pushNotifications: true,
    },
    create: {
      tenantId: acmeTenant.id,
      maxUsersQuota: 5,
      tolerableOpenDays: 3,
      closureAuthority: 'SUPPORT_EMPLOYEE',
      assignmentStrategy: 'MANUAL_DEPT_HEAD',
      businessType: 'BOTH',
      purposeOfUse: 'BOTH',
      allowCustomerToRaise: true,
      allowEmployeeOnBehalf: true,
      notificationChannels: 'BOTH',
      platformAccess: 'BOTH',
      pushNotifications: true,
    },
  });

  // 3. Ensure Active Subscription exists for Acme Tenant
  console.log('3. Ensuring active subscription for Acme Corporation...');
  const existingSub = await prisma.subscription.findFirst({
    where: { tenantId: acmeTenant.id, status: SubscriptionStatus.ACTIVE },
  });

  if (!existingSub) {
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    await prisma.subscription.create({
      data: {
        tenantId: acmeTenant.id,
        plan: PlanTier.STARTER,
        billingCycle: BillingCycle.ANNUAL,
        status: SubscriptionStatus.ACTIVE,
        amount: 14999.0,
        taxAmount: 2699.82,
        currency: 'INR',
        startsAt: new Date(),
        endsAt: oneYearLater,
        metadata: {
          note: 'Restored official testing subscription (5-Staff Quota)',
        },
      },
    });
  }

  // 4. Retrieve System Roles
  console.log('4. Resolving system roles...');
  const clientAdminRole = await prisma.role.findFirstOrThrow({
    where: { name: SystemRole.CLIENT_ADMIN, tenantId: null },
  });
  const deptAdminRole = await prisma.role.findFirstOrThrow({
    where: { name: SystemRole.DEPARTMENT_ADMIN, tenantId: null },
  });
  const technicianRole = await prisma.role.findFirstOrThrow({
    where: { name: SystemRole.SUPPORT_EMPLOYEE, tenantId: null },
  });

  // 5. Restore 4 Official Company Testing Accounts
  console.log('5. Provisioning & verifying 4 official credentials...');

  // Account 1: Super Admin
  const superAdminPassword = 'KalpakAdmin123!';
  const superAdminPasswordHash = await hashPassword(superAdminPassword);
  const superAdminUser = await prisma.user.upsert({
    where: { email: 'admin@kalpak.com' },
    update: {
      fullName: 'System Super Administrator',
      passwordHash: superAdminPasswordHash,
      isActive: true,
      isSuperAdmin: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      mfaEnabled: false,
      mfaSecret: null,
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
      mfaSecret: null,
    },
  });

  // Account 2: Client Admin
  const clientAdminPassword = 'AcmeAdmin123!';
  const clientAdminPasswordHash = await hashPassword(clientAdminPassword);
  const clientAdminUser = await prisma.user.upsert({
    where: { email: 'clientadmin@acme.com' },
    update: {
      fullName: 'Alice Johnson (Client Admin)',
      passwordHash: clientAdminPasswordHash,
      isActive: true,
      isSuperAdmin: false,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      mfaEnabled: false,
      mfaSecret: null,
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
      mfaSecret: null,
    },
  });

  await prisma.tenantMembership.upsert({
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

  // Account 3: Department Head
  const deptHeadPassword = 'AcmeDept123!';
  const deptHeadPasswordHash = await hashPassword(deptHeadPassword);
  const deptHeadUser = await prisma.user.upsert({
    where: { email: 'depthead@acme.com' },
    update: {
      fullName: 'Rajesh Nair (Dept Head)',
      passwordHash: deptHeadPasswordHash,
      isActive: true,
      isSuperAdmin: false,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      mfaEnabled: false,
      mfaSecret: null,
      deletedAt: null,
    },
    create: {
      email: 'depthead@acme.com',
      fullName: 'Rajesh Nair (Dept Head)',
      passwordHash: deptHeadPasswordHash,
      isActive: true,
      isSuperAdmin: false,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      mfaEnabled: false,
      mfaSecret: null,
    },
  });

  await prisma.tenantMembership.upsert({
    where: {
      uq_membership_tenant_user: {
        tenantId: acmeTenant.id,
        userId: deptHeadUser.id,
      },
    },
    update: { roleId: deptAdminRole.id, isDefault: true },
    create: {
      tenantId: acmeTenant.id,
      userId: deptHeadUser.id,
      roleId: deptAdminRole.id,
      isDefault: true,
    },
  });

  // Account 4: Support Field Technician
  const techPassword = 'AcmeTech123!';
  const techPasswordHash = await hashPassword(techPassword);
  const techUser = await prisma.user.upsert({
    where: { email: 'tech@acme.com' },
    update: {
      fullName: 'Vikram Singh (Field Technician)',
      passwordHash: techPasswordHash,
      isActive: true,
      isSuperAdmin: false,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      mfaEnabled: false,
      mfaSecret: null,
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
      mfaSecret: null,
    },
  });

  await prisma.tenantMembership.upsert({
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

  // 6. Ensure Acme Departments
  console.log('6. Configuring departments and assignments...');
  const deptElec = await prisma.department.upsert({
    where: {
      uq_department_tenant_code: {
        tenantId: acmeTenant.id,
        code: 'ELEC',
      },
    },
    update: {
      name: 'Electrical & Instrumentation',
      headUserId: clientAdminUser.id,
      isActive: true,
    },
    create: {
      tenantId: acmeTenant.id,
      code: 'ELEC',
      name: 'Electrical & Instrumentation',
      description: 'PLC, motor drives, sensors, and electrical control panels',
      headUserId: clientAdminUser.id,
      isActive: true,
    },
  });

  const deptMech = await prisma.department.upsert({
    where: {
      uq_department_tenant_code: {
        tenantId: acmeTenant.id,
        code: 'MECH',
      },
    },
    update: {
      name: 'Mechanical & Hydraulics',
      headUserId: deptHeadUser.id,
      isActive: true,
    },
    create: {
      tenantId: acmeTenant.id,
      code: 'MECH',
      name: 'Mechanical & Hydraulics',
      description: 'Heavy machinery, pneumatic valves, and hydraulic powerpacks',
      headUserId: deptHeadUser.id,
      isActive: true,
    },
  });

  // 7. Ensure Employee Profiles
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

  // 8. Verify password hashes in memory to be 100% confident
  console.log('8. Performing integrity validation on password hashes...');
  const tests = [
    { email: 'admin@kalpak.com', pass: superAdminPassword, hash: superAdminUser.passwordHash },
    { email: 'clientadmin@acme.com', pass: clientAdminPassword, hash: clientAdminUser.passwordHash },
    { email: 'depthead@acme.com', pass: deptHeadPassword, hash: deptHeadUser.passwordHash },
    { email: 'tech@acme.com', pass: techPassword, hash: techUser.passwordHash },
  ];

  for (const t of tests) {
    const ok = await verifyPassword(t.pass, t.hash);
    if (!ok) {
      throw new Error(`CRITICAL: Password verification failed for ${t.email}`);
    }
  }

  console.log('\n================================================================');
  console.log('✅ ALL 4 OFFICIAL COMPANY TESTING LOGINS SUCCESSFULLY RESTORED!');
  console.log('================================================================\n');

  console.table([
    {
      Role: 'Super Admin',
      Email: 'admin@kalpak.com',
      Password: 'KalpakAdmin123!',
      LandingUrl: 'http://localhost:3000/super-admin/dashboard',
      Status: 'Active & Verified',
    },
    {
      Role: 'Client Admin',
      Email: 'clientadmin@acme.com',
      Password: 'AcmeAdmin123!',
      LandingUrl: 'http://localhost:3000/dashboard',
      Status: 'Active & Verified',
    },
    {
      Role: 'Department Head',
      Email: 'depthead@acme.com',
      Password: 'AcmeDept123!',
      LandingUrl: 'http://localhost:3000/dashboard/department',
      Status: 'Active & Verified',
    },
    {
      Role: 'Field Technician',
      Email: 'tech@acme.com',
      Password: 'AcmeTech123!',
      LandingUrl: 'http://localhost:3000/dashboard/employee',
      Status: 'Active & Verified',
    },
  ]);
}

if (require.main === module) {
  restoreTestingLogins()
    .catch((err) => {
      console.error('❌ Failed to restore testing logins:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
