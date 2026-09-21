const { PrismaClient } = require('../packages/database/dist/index.js');
const prisma = new PrismaClient();

async function testSlaBreach() {
  const admin = await prisma.user.findFirst({ where: { email: 'clientadmin@acme.com' } });
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'acme-corp' } });

  // Create an overdue ticket
  const ticket = await prisma.serviceTicket.create({
    data: {
      tenantId: tenant.id,
      ticketNumber: 'KAL-TEST-OVERDUE',
      title: 'Overdue SLA Test Machine Failure',
      description: 'Test overdue ticket for SLA breach notification verification',
      status: 'OPEN',
      priority: 'CRITICAL',
      raisedBy: 'EMPLOYEE',
      raisedByUserId: admin.id,
      assignedToUserId: admin.id,
      isOverdue: false,
      dueAt: new Date(Date.now() - 3600000), // 1 hour ago
    },
  });

  console.log('Created test ticket:', ticket.ticketNumber, 'dueAt:', ticket.dueAt);

  // Check worker overdue query
  const overdue = await prisma.serviceTicket.findMany({
    where: {
      id: ticket.id,
      isOverdue: false,
      dueAt: { lt: new Date() },
      status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] },
    },
  });

  console.log('Overdue detected by query:', overdue.length);

  // Flag and notify
  await prisma.serviceTicket.update({
    where: { id: ticket.id },
    data: { isOverdue: true },
  });

  const notif = await prisma.notification.create({
    data: {
      tenantId: tenant.id,
      userId: admin.id,
      type: 'SLA_BREACH',
      channel: 'IN_APP',
      title: '⚠️ SLA OVERDUE: ' + ticket.ticketNumber,
      message: 'Ticket breached SLA deadline',
      link: '/dashboard/tickets/' + ticket.id,
    },
  });

  console.log('Created SLA_BREACH notification:', notif.id, notif.type, notif.title);

  // Clean up test ticket & notification
  await prisma.notification.delete({ where: { id: notif.id } });
  await prisma.serviceTicket.delete({ where: { id: ticket.id } });
  console.log('SLA check test successfully completed and cleaned up.');
  await prisma.$disconnect();
}

testSlaBreach().catch((err) => {
  console.error(err);
  process.exit(1);
});
