import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TicketsService } from '../tickets/tickets.service';
import {
  CreateContractDto,
  CreatePmScheduleDto,
  ContractQueryDto,
} from './dto/contract.dto';
import {
  ContractTypeEnum,
  ContractStatusEnum,
  PmFrequencyEnum,
  ServiceContractSummary,
  ServiceContractDetail,
  PmScheduleSummary,
  ContractsDashboardStats,
  TriggerPmVisitResponse,
  AuditEventType,
} from '@kalpak/types';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly ticketsService: TicketsService
  ) {}

  /**
   * Helper: Generate contract number AMC-YYYY-XXXX per tenant
   */
  private async generateContractNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.serviceContract.count({
      where: { tenantId },
    });
    const seq = String(count + 1).padStart(4, '0');
    return `AMC-${year}-${seq}`;
  }

  /**
   * Helper: Calculate next due date based on frequency
   */
  private calculateNextDueDate(fromDate: Date, frequency: PmFrequencyEnum): Date {
    const next = new Date(fromDate);
    switch (frequency) {
      case PmFrequencyEnum.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        break;
      case PmFrequencyEnum.QUARTERLY:
        next.setMonth(next.getMonth() + 3);
        break;
      case PmFrequencyEnum.BI_ANNUAL:
        next.setMonth(next.getMonth() + 6);
        break;
      case PmFrequencyEnum.ANNUAL:
      default:
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  }

  /**
   * Create a new Annual Maintenance Contract (AMC)
   */
  async createContract(
    tenantId: string,
    actorId: string,
    dto: CreateContractDto
  ): Promise<ServiceContractDetail> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId, deletedAt: null },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Verify all assets exist and belong to this customer
    const assets = await this.prisma.customerAsset.findMany({
      where: {
        id: { in: dto.assetIds },
        customerId: dto.customerId,
        tenantId,
        deletedAt: null,
      },
      include: {
        product: true,
      },
    });

    if (assets.length !== dto.assetIds.length) {
      throw new BadRequestException('One or more selected machinery/assets are invalid');
    }

    const contractNumber =
      dto.contractNumber?.trim() || (await this.generateContractNumber(tenantId));

    const existingNumber = await this.prisma.serviceContract.findFirst({
      where: { tenantId, contractNumber },
    });
    if (existingNumber) {
      throw new ConflictException(`Contract number '${contractNumber}' already exists`);
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) {
      throw new BadRequestException('Contract end date must be after start date');
    }

    const contract = await this.prisma.$transaction(async (tx) => {
      const created = await tx.serviceContract.create({
        data: {
          tenantId,
          customerId: dto.customerId,
          contractNumber,
          title: dto.title.trim(),
          contractType: (dto.contractType || ContractTypeEnum.COMPREHENSIVE) as any,
          status: ContractStatusEnum.ACTIVE as any,
          startDate,
          endDate,
          billingFrequency: dto.billingFrequency || 'ANNUAL',
          totalAmount: dto.totalAmount || 0,
          notes: dto.notes?.trim(),
          termsAndConditions: dto.termsAndConditions?.trim(),
          assets: {
            create: dto.assetIds.map((assetId) => ({
              assetId,
            })),
          },
        },
        include: {
          customer: true,
          assets: {
            include: {
              asset: {
                include: {
                  product: true,
                },
              },
            },
          },
          pmSchedules: true,
        },
      });

      if (dto.generatePmSchedules) {
        const freq = dto.defaultPmFrequency || PmFrequencyEnum.QUARTERLY;
        for (const asset of assets) {
          const nextDueDate = this.calculateNextDueDate(startDate, freq);
          await tx.preventiveMaintenanceSchedule.create({
            data: {
              tenantId,
              contractId: created.id,
              assetId: asset.id,
              title: `Routine PM Inspection - ${asset.product.name}`,
              description: `Regular scheduled preventive maintenance under ${contractNumber}.`,
              frequency: freq as any,
              nextDueDate,
              totalVisitsQuota: 4,
              visitsCompletedCount: 0,
              isActive: true,
            },
          });
        }
      }

      return created;
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.CUSTOMER_UPDATED,
      resourceType: 'CONTRACT',
      resourceId: contract.id,
      action: 'CREATE_SERVICE_CONTRACT',
      metadata: { contractNumber, customerId: dto.customerId, title: dto.title },
    });

    return this.getContractDetail(tenantId, contract.id);
  }

  /**
   * List contracts with search and filters
   */
  async listContracts(
    tenantId: string,
    query: ContractQueryDto
  ): Promise<ServiceContractSummary[]> {
    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.expiringSoon) {
      const now = new Date();
      const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      where.endDate = { gte: now, lte: in30Days };
      where.status = ContractStatusEnum.ACTIVE;
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { contractNumber: { contains: term, mode: 'insensitive' } },
        { title: { contains: term, mode: 'insensitive' } },
        { customer: { companyName: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const contracts = await this.prisma.serviceContract.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { companyName: true } },
        _count: {
          select: {
            assets: true,
            pmSchedules: true,
          },
        },
      },
    });

    return contracts.map((c) => ({
      id: c.id,
      contractNumber: c.contractNumber,
      title: c.title,
      customerId: c.customerId,
      customerName: c.customer.companyName,
      contractType: c.contractType as any,
      status: c.status as any,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate.toISOString(),
      billingFrequency: c.billingFrequency,
      totalAmount: Number(c.totalAmount),
      coveredAssetsCount: c._count.assets,
      activePmSchedulesCount: c._count.pmSchedules,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  /**
   * Get single contract detail
   */
  async getContractDetail(
    tenantId: string,
    contractId: string
  ): Promise<ServiceContractDetail> {
    const contract = await this.prisma.serviceContract.findFirst({
      where: { id: contractId, tenantId, deletedAt: null },
      include: {
        customer: { select: { companyName: true } },
        assets: {
          include: {
            asset: {
              include: {
                product: true,
              },
            },
          },
        },
        pmSchedules: {
          where: { deletedAt: null },
          include: {
            asset: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('Service contract not found');
    }

    return {
      id: contract.id,
      contractNumber: contract.contractNumber,
      title: contract.title,
      customerId: contract.customerId,
      customerName: contract.customer.companyName,
      contractType: contract.contractType as any,
      status: contract.status as any,
      startDate: contract.startDate.toISOString(),
      endDate: contract.endDate.toISOString(),
      billingFrequency: contract.billingFrequency,
      totalAmount: Number(contract.totalAmount),
      notes: contract.notes,
      termsAndConditions: contract.termsAndConditions,
      coveredAssetsCount: contract.assets.length,
      activePmSchedulesCount: contract.pmSchedules.length,
      createdAt: contract.createdAt.toISOString(),
      coveredAssets: contract.assets.map((ca) => ({
        id: ca.id,
        assetId: ca.assetId,
        serialNumber: ca.asset.serialNumber,
        productName: ca.asset.product.name,
        modelNumber: ca.asset.product.modelNumber,
        location: ca.asset.location,
      })),
      pmSchedules: contract.pmSchedules.map((s) => ({
        id: s.id,
        contractId: s.contractId,
        contractNumber: contract.contractNumber,
        assetId: s.assetId,
        assetName: s.asset.product.name,
        assetSerialNumber: s.asset.serialNumber,
        title: s.title,
        description: s.description,
        frequency: s.frequency as any,
        nextDueDate: s.nextDueDate.toISOString(),
        lastServicedDate: s.lastServicedDate ? s.lastServicedDate.toISOString() : null,
        totalVisitsQuota: s.totalVisitsQuota,
        visitsCompletedCount: s.visitsCompletedCount,
        isActive: s.isActive,
      })),
    };
  }

  /**
   * Create a Preventive Maintenance schedule
   */
  async createPmSchedule(
    tenantId: string,
    actorId: string,
    dto: CreatePmScheduleDto
  ): Promise<PmScheduleSummary> {
    const asset = await this.prisma.customerAsset.findFirst({
      where: { id: dto.assetId, tenantId, deletedAt: null },
      include: { product: true },
    });
    if (!asset) {
      throw new NotFoundException('Machinery/Asset not found');
    }

    let contractNumber: string | null = null;
    if (dto.contractId) {
      const contract = await this.prisma.serviceContract.findFirst({
        where: { id: dto.contractId, tenantId, deletedAt: null },
      });
      if (!contract) {
        throw new NotFoundException('Linked service contract not found');
      }
      contractNumber = contract.contractNumber;
    }

    const schedule = await this.prisma.preventiveMaintenanceSchedule.create({
      data: {
        tenantId,
        contractId: dto.contractId,
        assetId: dto.assetId,
        departmentId: dto.departmentId,
        title: dto.title.trim(),
        description: dto.description?.trim(),
        frequency: (dto.frequency || PmFrequencyEnum.QUARTERLY) as any,
        nextDueDate: new Date(dto.nextDueDate),
        totalVisitsQuota: dto.totalVisitsQuota || 4,
        visitsCompletedCount: 0,
        isActive: true,
      },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.TICKET_CREATED,
      resourceType: 'PM_SCHEDULE',
      resourceId: schedule.id,
      action: 'CREATE_PM_SCHEDULE',
      metadata: { title: dto.title, assetId: dto.assetId, frequency: dto.frequency },
    });

    return {
      id: schedule.id,
      contractId: schedule.contractId,
      contractNumber,
      assetId: schedule.assetId,
      assetName: asset.product.name,
      assetSerialNumber: asset.serialNumber,
      title: schedule.title,
      description: schedule.description,
      frequency: schedule.frequency as any,
      nextDueDate: schedule.nextDueDate.toISOString(),
      lastServicedDate: null,
      totalVisitsQuota: schedule.totalVisitsQuota,
      visitsCompletedCount: schedule.visitsCompletedCount,
      isActive: schedule.isActive,
    };
  }

  /**
   * List PM schedules across tenant
   */
  async listPmSchedules(
    tenantId: string,
    assetId?: string
  ): Promise<PmScheduleSummary[]> {
    const where: any = {
      tenantId,
      deletedAt: null,
    };
    if (assetId) {
      where.assetId = assetId;
    }

    const schedules = await this.prisma.preventiveMaintenanceSchedule.findMany({
      where,
      orderBy: { nextDueDate: 'asc' },
      include: {
        contract: { select: { contractNumber: true } },
        asset: { include: { product: true } },
      },
    });

    return schedules.map((s) => ({
      id: s.id,
      contractId: s.contractId,
      contractNumber: s.contract ? s.contract.contractNumber : null,
      assetId: s.assetId,
      assetName: s.asset.product.name,
      assetSerialNumber: s.asset.serialNumber,
      title: s.title,
      description: s.description,
      frequency: s.frequency as any,
      nextDueDate: s.nextDueDate.toISOString(),
      lastServicedDate: s.lastServicedDate ? s.lastServicedDate.toISOString() : null,
      totalVisitsQuota: s.totalVisitsQuota,
      visitsCompletedCount: s.visitsCompletedCount,
      isActive: s.isActive,
    }));
  }

  /**
   * Trigger PM visit -> Automatically creates ServiceTicket + WorkOrder + Inspection Checklist
   */
  async triggerPmVisit(
    tenantId: string,
    actorId: string,
    scheduleId: string
  ): Promise<TriggerPmVisitResponse> {
    const schedule = await this.prisma.preventiveMaintenanceSchedule.findFirst({
      where: { id: scheduleId, tenantId, deletedAt: null },
      include: {
        asset: { include: { product: true } },
        contract: true,
      },
    });

    if (!schedule) {
      throw new NotFoundException('PM Schedule not found');
    }

    const now = new Date();
    const asset = schedule.asset;

    // 1. Create PM Service Ticket via TicketsService
    const ticketTitle = `[PM Visit] ${schedule.title} - ${asset.product.name} (${asset.serialNumber})`;
    const ticketDesc =
      schedule.description ||
      `Routine preventive maintenance visit as per schedule (${schedule.frequency}) on ${asset.product.name}. Check lubrication, drive belts, mechanical tolerances, and calibration.`;

    const ticket = await this.ticketsService.createTicket(tenantId, actorId, {
      title: ticketTitle,
      description: ticketDesc,
      priority: 'MEDIUM' as any,
      raisedBy: 'EMPLOYEE' as any,
      raisedForCustomerId: asset.customerId,
      customerAssetId: asset.id,
      departmentId: schedule.departmentId || undefined,
    });

    // 2. Link contract and pmSchedule on ticket
    await this.prisma.serviceTicket.update({
      where: { id: ticket.id },
      data: {
        serviceType: 'PREVENTIVE_MAINTENANCE',
        contractId: schedule.contractId,
        pmScheduleId: schedule.id,
      },
    });

    // 3. Auto-generate Work Order with checklist
    const count = await this.prisma.workOrder.count({ where: { tenantId } });
    const orderNumber = `WO-${now.getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const workOrder = await this.prisma.workOrder.create({
      data: {
        tenantId,
        ticketId: ticket.id,
        customerId: asset.customerId,
        customerAssetId: asset.id,
        assignedTechnicianId: actorId,
        orderNumber,
        serviceType: 'PREVENTIVE_MAINTENANCE',
        scheduledDate: schedule.nextDueDate,
        status: 'SCHEDULED',
        technicianNotes: `Standard PM inspection for ${asset.product.name}.`,
        checklistItems: {
          create: [
            {
              tenantId,
              itemCode: 'PM-CHK-01',
              taskTitle: 'Visual Machine Integrity & Frame Inspection',
              description: 'Check frame bolts, structural stability, guards, and safety interlocks.',
              targetValue: 'All secure & intact',
              sortOrder: 1,
              status: 'PENDING',
            },
            {
              tenantId,
              itemCode: 'PM-CHK-02',
              taskTitle: 'Mechanical Lubrication & Alignment',
              description: 'Inspect bearings, guide rails, and gearbox oil levels. Top up grease.',
              targetValue: 'Lubricated & aligned',
              sortOrder: 2,
              status: 'PENDING',
            },
            {
              tenantId,
              itemCode: 'PM-CHK-03',
              taskTitle: 'Electrical & Thermal Verification',
              description: 'Measure motor operating voltage, thermal temperature, and grounding resistance.',
              targetValue: 'Normal operating range',
              sortOrder: 3,
              status: 'PENDING',
            },
            {
              tenantId,
              itemCode: 'PM-CHK-04',
              taskTitle: 'Operational Cycle Test & Sensor Calibration',
              description: 'Run test cycles, verify accuracy against tolerances, and calibrate sensors.',
              targetValue: 'Cycle passed within specs',
              sortOrder: 4,
              status: 'PENDING',
            },
          ],
        },
      },
    });

    // 4. Update schedule nextDueDate and visit counters
    const newNextDueDate = this.calculateNextDueDate(schedule.nextDueDate, schedule.frequency as any);
    await this.prisma.preventiveMaintenanceSchedule.update({
      where: { id: schedule.id },
      data: {
        visitsCompletedCount: schedule.visitsCompletedCount + 1,
        lastServicedDate: now,
        nextDueDate: newNextDueDate,
      },
    });

    return {
      success: true,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      workOrderId: workOrder.id,
      workOrderNumber: workOrder.orderNumber,
      scheduleId: schedule.id,
      nextDueDate: newNextDueDate.toISOString(),
      message: `PM Service Visit dispatched: Ticket ${ticket.ticketNumber} and Work Order ${workOrder.orderNumber} successfully generated.`,
    };
  }

  /**
   * Contracts dashboard stats
   */
  async getDashboardStats(tenantId: string): Promise<ContractsDashboardStats> {
    const now = new Date();
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [totalActiveContracts, expiringIn30DaysCount, upcomingPmVisitsThisMonth, contracts] =
      await Promise.all([
        this.prisma.serviceContract.count({
          where: { tenantId, status: ContractStatusEnum.ACTIVE as any, deletedAt: null },
        }),
        this.prisma.serviceContract.count({
          where: {
            tenantId,
            status: ContractStatusEnum.ACTIVE as any,
            endDate: { gte: now, lte: in30Days },
            deletedAt: null,
          },
        }),
        this.prisma.preventiveMaintenanceSchedule.count({
          where: {
            tenantId,
            isActive: true,
            nextDueDate: { lte: endOfMonth },
            deletedAt: null,
          },
        }),
        this.prisma.serviceContract.findMany({
          where: { tenantId, status: ContractStatusEnum.ACTIVE as any, deletedAt: null },
          select: { totalAmount: true },
        }),
      ]);

    const totalContractValue = contracts.reduce((acc, c) => acc + Number(c.totalAmount), 0);

    return {
      totalActiveContracts,
      expiringIn30DaysCount,
      upcomingPmVisitsThisMonth,
      totalContractValue,
    };
  }

  /**
   * Customer portal: get contracts & upcoming maintenance for a customer
   */
  async getCustomerPortalContracts(tenantId: string, customerId: string) {
    const contracts = await this.prisma.serviceContract.findMany({
      where: { tenantId, customerId, deletedAt: null },
      orderBy: { endDate: 'desc' },
      include: {
        assets: {
          include: {
            asset: {
              include: {
                product: true,
              },
            },
          },
        },
        pmSchedules: {
          where: { deletedAt: null },
          include: {
            asset: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    return contracts.map((c) => ({
      id: c.id,
      contractNumber: c.contractNumber,
      title: c.title,
      contractType: c.contractType,
      status: c.status,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate.toISOString(),
      billingFrequency: c.billingFrequency,
      coveredAssets: c.assets.map((ca) => ({
        assetId: ca.assetId,
        productName: ca.asset.product.name,
        modelNumber: ca.asset.product.modelNumber,
        serialNumber: ca.asset.serialNumber,
      })),
      pmSchedules: c.pmSchedules.map((s) => ({
        id: s.id,
        title: s.title,
        frequency: s.frequency,
        nextDueDate: s.nextDueDate.toISOString(),
        visitsCompletedCount: s.visitsCompletedCount,
        totalVisitsQuota: s.totalVisitsQuota,
        assetName: s.asset.product.name,
        serialNumber: s.asset.serialNumber,
      })),
    }));
  }
}
