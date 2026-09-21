import { logger } from '@kalpak/logger';
import { getConfig } from '@kalpak/config';
import { createPrismaClient } from '@kalpak/database';
import { JobRegistry } from './jobs';

async function bootstrap() {
  const config = getConfig();
  logger.info({ appName: config.APP_NAME }, '[Kalpak Worker] Starting background worker process...');

  const prisma = createPrismaClient();
  const registry = new JobRegistry();

  // Job: Session cleanup (cleans up expired sessions)
  registry.register('session:cleanup', async (job) => {
    logger.info({ jobId: job.id }, 'Session cleanup job tick executed');
    const deleted = await prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    logger.info({ jobId: job.id, deletedCount: deleted.count }, 'Expired sessions cleaned up');
  });

  // Job: Ticket SLA overdue check — runs every 30 minutes in production
  registry.register('ticket:sla_check', async (job) => {
    logger.info({ jobId: job.id }, '[SLA] Starting overdue ticket check...');
    const now = new Date();

    // Find non-overdue tickets that have exceeded their tolerable open period
    const overdueTickets = await prisma.serviceTicket.findMany({
      where: {
        deletedAt: null,
        isOverdue: false,
        dueAt: { lt: now },
        status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] },
      },
      select: {
        id: true,
        tenantId: true,
        ticketNumber: true,
        title: true,
        priority: true,
        assignedToUserId: true,
      },
    });

    if (overdueTickets.length === 0) {
      logger.info({ jobId: job.id }, '[SLA] No overdue tickets found. All caught up.');
      return;
    }

    // Collect notifications to create
    const notificationsToCreate: any[] = [];
    for (const t of overdueTickets) {
      if (t.assignedToUserId) {
        notificationsToCreate.push(
          prisma.notification.create({
            data: {
              tenantId: t.tenantId,
              userId: t.assignedToUserId,
              type: 'SLA_BREACH',
              channel: 'IN_APP',
              title: `⚠️ SLA OVERDUE: ${t.ticketNumber}`,
              message: `Ticket "${t.title}" (${t.priority}) has breached its SLA deadline and is now overdue.`,
              link: `/dashboard/tickets/${t.id}`,
              metadata: { ticketId: t.id, ticketNumber: t.ticketNumber, priority: t.priority },
            },
          }),
        );
      }
    }

    // Batch flag them
    await prisma.$transaction([
      prisma.serviceTicket.updateMany({
        where: { id: { in: overdueTickets.map((t) => t.id) } },
        data: { isOverdue: true },
      }),
      ...overdueTickets.map((t) =>
        prisma.ticketTimeline.create({
          data: {
            tenantId: t.tenantId,
            ticketId: t.id,
            eventType: 'OVERDUE_FLAGGED',
            note: 'Ticket exceeded tolerable open period and has been automatically flagged as overdue.',
            metadata: { flaggedAt: now.toISOString(), flaggedByWorker: true },
          },
        }),
      ),
      ...notificationsToCreate,
    ]);

    logger.info({ jobId: job.id, flagged: overdueTickets.length }, `[SLA] Flagged ${overdueTickets.length} overdue tickets and dispatched breach alerts`);
  });

  // Job: Preventive Maintenance (PM) due check — identifies upcoming PM visits within 7 days
  registry.register('contract:pm_due_check', async (job) => {
    logger.info({ jobId: job.id }, '[PM] Checking upcoming and due preventive maintenance visits...');
    const alertWindow = new Date();
    alertWindow.setDate(alertWindow.getDate() + 7);

    const dueSchedules = await prisma.preventiveMaintenanceSchedule.findMany({
      where: {
        isActive: true,
        nextDueDate: { lte: alertWindow },
      },
      include: {
        asset: {
          include: {
            customer: true,
            product: true,
          },
        },
        contract: true,
      },
    });

    if (dueSchedules.length === 0) {
      logger.info({ jobId: job.id }, '[PM] No PM visits due within the next 7 days.');
      return;
    }

    logger.info(
      { jobId: job.id, count: dueSchedules.length },
      `[PM] Found ${dueSchedules.length} PM schedules due for execution within 7 days.`
    );

    for (const schedule of dueSchedules) {
      // Find tenant admin users or managers to notify
      const memberships = await prisma.tenantMembership.findMany({
        where: {
          tenantId: schedule.tenantId,
          role: { name: { in: ['CLIENT_ADMIN', 'DISPATCHER', 'SUPER_ADMIN'] } },
        },
        select: { userId: true },
        take: 3,
      });

      for (const m of memberships) {
        await prisma.notification.create({
          data: {
            tenantId: schedule.tenantId,
            userId: m.userId,
            type: 'TICKET_ASSIGNED',
            channel: 'IN_APP',
            title: `🔧 PM VISIT DUE: ${schedule.asset.product.name}`,
            message: `Preventive Maintenance "${schedule.title}" for ${schedule.asset.product.name} (${schedule.asset.customer.companyName}) is scheduled for ${schedule.nextDueDate.toISOString().split('T')[0]}.`,
            link: `/dashboard/contracts`,
            metadata: {
              scheduleId: schedule.id,
              assetId: schedule.assetId,
              contractId: schedule.contractId,
              dueDate: schedule.nextDueDate.toISOString(),
            },
          },
        }).catch((err) => logger.warn({ err }, '[PM] Notification dispatch skipped'));
      }
    }

    logger.info({ jobId: job.id, schedulesProcessed: dueSchedules.length }, '[PM] Completed PM visit check and notifications.');
  });

  logger.info('[Kalpak Worker] Background job processor initialized and listening.');

  const shutdown = async (signal: string) => {
    logger.info({ signal }, '[Kalpak Worker] Gracefully shutting down worker process...');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.fatal({ err }, '[Kalpak Worker] Fatal startup failure');
  process.exit(1);
});
