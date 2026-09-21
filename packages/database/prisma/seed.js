"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const types_1 = require("@kalpak/types");
const prisma = new client_1.PrismaClient();
const PERMISSION_DEFINITIONS = [
    // Tenant Administration
    { code: types_1.PermissionCode.TENANT_READ, description: 'View tenant details and statistics', module: 'TENANT' },
    { code: types_1.PermissionCode.TENANT_UPDATE, description: 'Modify tenant configuration and profile', module: 'TENANT' },
    { code: types_1.PermissionCode.TENANT_SETTINGS, description: 'Manage tenant security and domain settings', module: 'TENANT' },
    { code: types_1.PermissionCode.TENANT_MANAGE_ALL, description: 'Global multi-tenant platform administration', module: 'TENANT' },
    // User & RBAC Administration
    { code: types_1.PermissionCode.USER_READ, description: 'View users within tenant organization', module: 'USER' },
    { code: types_1.PermissionCode.USER_CREATE, description: 'Invite or provision new tenant members', module: 'USER' },
    { code: types_1.PermissionCode.USER_UPDATE, description: 'Update user profiles and statuses', module: 'USER' },
    { code: types_1.PermissionCode.USER_DELETE, description: 'Deactivate or soft-delete user accounts', module: 'USER' },
    { code: types_1.PermissionCode.ROLE_ASSIGN, description: 'Assign roles to tenant users', module: 'USER' },
    { code: types_1.PermissionCode.ROLE_MANAGE, description: 'Create and configure custom tenant roles', module: 'USER' },
    // Service Calls & Tickets
    { code: types_1.PermissionCode.TICKET_CREATE, description: 'Log a new service call or support ticket', module: 'TICKET' },
    { code: types_1.PermissionCode.TICKET_READ, description: 'View service tickets and work logs', module: 'TICKET' },
    { code: types_1.PermissionCode.TICKET_UPDATE, description: 'Update ticket details, notes and progress', module: 'TICKET' },
    { code: types_1.PermissionCode.TICKET_ASSIGN, description: 'Assign tickets to support technicians or teams', module: 'TICKET' },
    { code: types_1.PermissionCode.TICKET_RESOLVE, description: 'Mark tickets resolved or closed', module: 'TICKET' },
    { code: types_1.PermissionCode.TICKET_DELETE, description: 'Cancel or purge service tickets', module: 'TICKET' },
    // Customer Management
    { code: types_1.PermissionCode.CUSTOMER_READ, description: 'View client customer records', module: 'CUSTOMER' },
    { code: types_1.PermissionCode.CUSTOMER_CREATE, description: 'Register client customer records', module: 'CUSTOMER' },
    { code: types_1.PermissionCode.CUSTOMER_UPDATE, description: 'Edit client customer records', module: 'CUSTOMER' },
    // Products & Services
    { code: types_1.PermissionCode.PRODUCT_READ, description: 'View registered hardware/software products', module: 'PRODUCT' },
    { code: types_1.PermissionCode.PRODUCT_MANAGE, description: 'Add and configure product catalog', module: 'PRODUCT' },
    { code: types_1.PermissionCode.SERVICE_READ, description: 'View services and warranty contracts', module: 'SERVICE' },
    { code: types_1.PermissionCode.SERVICE_MANAGE, description: 'Manage service catalogs and SLAs', module: 'SERVICE' },
    // Reporting & Analytics
    { code: types_1.PermissionCode.REPORT_VIEW, description: 'View operational ticket & SLA aging dashboards', module: 'REPORT' },
    { code: types_1.PermissionCode.REPORT_EXPORT, description: 'Export operational and compliance reports', module: 'REPORT' },
    // Audit Logs
    { code: types_1.PermissionCode.AUDIT_READ, description: 'Inspect audit trail and security logs', module: 'AUDIT' },
    // Billing & Subscriptions
    { code: types_1.PermissionCode.BILLING_VIEW, description: 'View subscription plans and invoices', module: 'BILLING' },
    { code: types_1.PermissionCode.BILLING_MANAGE, description: 'Manage payment methods and plan upgrades', module: 'BILLING' },
];
const ROLE_PERMISSIONS_MAPPING = {
    [types_1.SystemRole.SUPER_ADMIN]: Object.values(types_1.PermissionCode),
    [types_1.SystemRole.CLIENT_ADMIN]: [
        types_1.PermissionCode.TENANT_READ,
        types_1.PermissionCode.TENANT_UPDATE,
        types_1.PermissionCode.TENANT_SETTINGS,
        types_1.PermissionCode.USER_READ,
        types_1.PermissionCode.USER_CREATE,
        types_1.PermissionCode.USER_UPDATE,
        types_1.PermissionCode.USER_DELETE,
        types_1.PermissionCode.ROLE_ASSIGN,
        types_1.PermissionCode.ROLE_MANAGE,
        types_1.PermissionCode.TICKET_CREATE,
        types_1.PermissionCode.TICKET_READ,
        types_1.PermissionCode.TICKET_UPDATE,
        types_1.PermissionCode.TICKET_ASSIGN,
        types_1.PermissionCode.TICKET_RESOLVE,
        types_1.PermissionCode.CUSTOMER_READ,
        types_1.PermissionCode.CUSTOMER_CREATE,
        types_1.PermissionCode.CUSTOMER_UPDATE,
        types_1.PermissionCode.PRODUCT_READ,
        types_1.PermissionCode.PRODUCT_MANAGE,
        types_1.PermissionCode.SERVICE_READ,
        types_1.PermissionCode.SERVICE_MANAGE,
        types_1.PermissionCode.REPORT_VIEW,
        types_1.PermissionCode.REPORT_EXPORT,
        types_1.PermissionCode.AUDIT_READ,
        types_1.PermissionCode.BILLING_VIEW,
        types_1.PermissionCode.BILLING_MANAGE,
    ],
    [types_1.SystemRole.DEPARTMENT_ADMIN]: [
        types_1.PermissionCode.USER_READ,
        types_1.PermissionCode.TICKET_CREATE,
        types_1.PermissionCode.TICKET_READ,
        types_1.PermissionCode.TICKET_UPDATE,
        types_1.PermissionCode.TICKET_ASSIGN,
        types_1.PermissionCode.TICKET_RESOLVE,
        types_1.PermissionCode.CUSTOMER_READ,
        types_1.PermissionCode.PRODUCT_READ,
        types_1.PermissionCode.SERVICE_READ,
        types_1.PermissionCode.REPORT_VIEW,
    ],
    [types_1.SystemRole.SUPPORT_EMPLOYEE]: [
        types_1.PermissionCode.TICKET_CREATE,
        types_1.PermissionCode.TICKET_READ,
        types_1.PermissionCode.TICKET_UPDATE,
        types_1.PermissionCode.TICKET_RESOLVE,
        types_1.PermissionCode.CUSTOMER_READ,
        types_1.PermissionCode.PRODUCT_READ,
        types_1.PermissionCode.SERVICE_READ,
    ],
    [types_1.SystemRole.CUSTOMER]: [
        types_1.PermissionCode.TICKET_CREATE,
        types_1.PermissionCode.TICKET_READ,
        types_1.PermissionCode.PRODUCT_READ,
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
        const role = await prisma.role.upsert({
            where: {
                uq_roles_tenant_name: {
                    tenantId: null,
                    name: roleName,
                },
            },
            update: {
                description: `System defined ${roleName} role`,
                isSystem: true,
            },
            create: {
                name: roleName,
                description: `System defined ${roleName} role`,
                isSystem: true,
                tenantId: null,
            },
        });
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
    console.log('Database foundation seeded successfully.');
}
main()
    .catch((e) => {
    console.error('Error seeding database foundation:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map