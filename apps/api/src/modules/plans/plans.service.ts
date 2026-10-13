import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { logger } from '@kalpak/logger';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlanDefinition, PlanStatus } from '@kalpak/types';

export const INITIAL_CANONICAL_PLANS: PlanDefinition[] = [
  {
    id: 'STARTER',
    code: 'STARTER',
    name: 'Starter',
    badge: 'Starter → Manage',
    description: 'Manage service calls, customer history, and support team operations from one centralized system.',
    monthlyPrice: 2999,
    annualMonthlyPrice: 2399,
    annualTotalPrice: 28788,
    discountPercent: 20,
    currency: 'INR',
    billingIntervals: ['MONTHLY', 'ANNUAL'],
    trialDays: 0,
    isFreeTrialAllowed: false,
    effectiveDate: 'Immediate',
    status: 'ACTIVE',
    isRecommended: false,
    displayOrder: 1,
    limits: {
      maxUsers: 5,
      maxDepartments: 1,
      maxTicketsMonthly: 'Unlimited',
      storageGb: 5,
      maxIntegrations: 0,
    },
    features: {
      ticketManagement: true,
      customerPortal: true,
      manualAssignment: true,
      autoAssignment: false,
      workloadBalancing: false,
      employeeOnBehalf: false,
      ticketAgingAlerts: false,
      emailNotifications: true,
      pushNotifications: true,
      whatsappNotifications: false,
      mobileAccess: false,
      basicReports: true,
      advancedReports: false,
      apiIntegration: false,
      bulkImportExport: false,
      customWorkflows: false,
      customSla: false,
      multiLocation: false,
      ssoSaml: false,
      dedicatedManager: false,
      slaUptime999: false,
    },
    highlights: [
      'Up to 5 Technicians / Staff Members',
      'Full Ticket & Service Call Management',
      'Customer Directory & Machinery Registry',
      'Products & Standard Services Catalog',
      'Real-Time Status & SLA Aging Tracking',
      'Audit Logging & 2-Factor Authentication',
    ],
  },
  {
    id: 'PROFESSIONAL',
    code: 'PROFESSIONAL',
    name: 'Professional',
    badge: 'Professional → Automate',
    description: 'Automate ticket routing, balance staff workload, and enable mobile technician field updates.',
    monthlyPrice: 6999,
    annualMonthlyPrice: 5599,
    annualTotalPrice: 67188,
    discountPercent: 20,
    currency: 'INR',
    billingIntervals: ['MONTHLY', 'ANNUAL'],
    trialDays: 14,
    isFreeTrialAllowed: true,
    effectiveDate: 'Immediate',
    status: 'ACTIVE',
    isRecommended: true,
    displayOrder: 2,
    limits: {
      maxUsers: 25,
      maxDepartments: 5,
      maxTicketsMonthly: 'Unlimited',
      storageGb: 25,
      maxIntegrations: 5,
    },
    features: {
      ticketManagement: true,
      customerPortal: true,
      manualAssignment: true,
      autoAssignment: true,
      workloadBalancing: true,
      employeeOnBehalf: true,
      ticketAgingAlerts: true,
      emailNotifications: true,
      pushNotifications: true,
      whatsappNotifications: false,
      mobileAccess: true,
      basicReports: true,
      advancedReports: true,
      apiIntegration: true,
      bulkImportExport: true,
      customWorkflows: false,
      customSla: false,
      multiLocation: false,
      ssoSaml: false,
      dedicatedManager: false,
      slaUptime999: false,
    },
    highlights: [
      'Up to 25 Technicians & Dispatchers',
      'Automatic Assignment (Role, Skill & Dept)',
      'Workload Balancing (Equal Distribution)',
      'Employee-on-Behalf Ticket Creation',
      'Mobile + Web Access & Push Alerts',
      'Ticket Aging & Escalation Alerts',
      'Bulk Import/Export & API Integration',
      '14-Day Free Trial Full Access',
    ],
  },
  {
    id: 'ENTERPRISE',
    code: 'ENTERPRISE',
    name: 'Enterprise',
    badge: 'Enterprise → Scale',
    description: 'Scale across multiple branches, territories, and integrate with custom ERP and CRM systems.',
    monthlyPrice: 14999,
    annualMonthlyPrice: 11999,
    annualTotalPrice: 143988,
    discountPercent: 20,
    currency: 'INR',
    billingIntervals: ['MONTHLY', 'ANNUAL'],
    trialDays: 14,
    isFreeTrialAllowed: true,
    effectiveDate: 'Immediate',
    status: 'ACTIVE',
    isRecommended: false,
    displayOrder: 3,
    limits: {
      maxUsers: 'Unlimited',
      maxDepartments: 'Unlimited',
      maxTicketsMonthly: 'Unlimited',
      storageGb: 'Unlimited',
      maxIntegrations: 'Unlimited',
    },
    features: {
      ticketManagement: true,
      customerPortal: true,
      manualAssignment: true,
      autoAssignment: true,
      workloadBalancing: true,
      employeeOnBehalf: true,
      ticketAgingAlerts: true,
      emailNotifications: true,
      pushNotifications: true,
      whatsappNotifications: true,
      mobileAccess: true,
      basicReports: true,
      advancedReports: true,
      apiIntegration: true,
      bulkImportExport: true,
      customWorkflows: true,
      customSla: true,
      multiLocation: true,
      ssoSaml: true,
      dedicatedManager: true,
      slaUptime999: true,
    },
    highlights: [
      'Unlimited Technicians & Admins (9,999)',
      'Multi-Location & Multi-Organization Support',
      'Email + WhatsApp + Push Notifications',
      'Custom SLA Policies & Priority Rules',
      'Custom Ticket Fields & Workflow Builder',
      'Dedicated Account Manager & 99.9% Uptime SLA',
      'Unlimited Storage & Custom Data Retention',
      'SSO / SAML Enterprise Authentication',
    ],
  },
];

@Injectable()
export class PlansService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.seedDefaultPlansIfEmpty();
    } catch (err: any) {
      logger.warn({ err: err?.message }, 'Could not automatically initialize subscription plans table');
    }
  }

  /**
   * Seeds Starter, Professional, Enterprise plans if database table is empty.
   */
  async seedDefaultPlansIfEmpty() {
    try {
      const existingCount = await (this.prisma as any).subscriptionPlan.count();
      if (existingCount > 0) return;

      logger.info('[PlansService] Seeding default canonical subscription plans into database...');
      for (const p of INITIAL_CANONICAL_PLANS) {
        await (this.prisma as any).subscriptionPlan.create({
          data: {
            code: p.code || p.id,
            name: p.name,
            badge: p.badge,
            description: p.description,
            monthlyPrice: p.monthlyPrice,
            annualMonthlyPrice: p.annualMonthlyPrice,
            annualTotalPrice: p.annualTotalPrice,
            discountPercent: p.discountPercent,
            currency: p.currency,
            trialDays: p.trialDays,
            isFreeTrialAllowed: p.isFreeTrialAllowed,
            status: p.status,
            isRecommended: p.isRecommended,
            displayOrder: p.displayOrder,
            limits: p.limits as any,
            features: p.features as any,
            highlights: p.highlights,
          },
        });
      }
      logger.info('[PlansService] Canonical plans successfully seeded.');
    } catch (err) {
      logger.warn({ err }, '[PlansService] Subscription plans table seed skipped or schema migrating.');
    }
  }

  /**
   * Public View: Get all ACTIVE plans ordered by displayOrder.
   */
  async getActivePlans(): Promise<PlanDefinition[]> {
    try {
      const dbPlans = await (this.prisma as any).subscriptionPlan.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { displayOrder: 'asc' },
      });

      if (dbPlans && dbPlans.length > 0) {
        return dbPlans.map(this.mapDbPlanToDefinition);
      }
    } catch (err) {
      logger.warn({ err }, 'Error querying subscription_plans table, returning canonical fallback');
    }

    // Fallback to active canonical plans if table not yet migrated
    return INITIAL_CANONICAL_PLANS.filter((p) => p.status === 'ACTIVE');
  }

  /**
   * Super Admin View: Get ALL plans including INACTIVE, DRAFT, and ARCHIVED.
   */
  async getAllPlansForManagement(): Promise<PlanDefinition[]> {
    try {
      const dbPlans = await (this.prisma as any).subscriptionPlan.findMany({
        orderBy: { displayOrder: 'asc' },
      });

      if (dbPlans && dbPlans.length > 0) {
        return dbPlans.map(this.mapDbPlanToDefinition);
      }
    } catch (err) {
      logger.warn({ err }, 'Error querying all subscription plans, returning canonical defaults');
    }

    return INITIAL_CANONICAL_PLANS;
  }

  /**
   * Find plan by ID or uppercase code.
   */
  async getPlanByIdOrCode(idOrCode: string): Promise<PlanDefinition> {
    const clean = idOrCode.trim();
    let plan = await (this.prisma as any).subscriptionPlan.findFirst({
      where: {
        OR: [{ id: clean }, { code: clean.toUpperCase() }],
      },
    });

    if (!plan) {
      // Check fallback canonical
      const foundFallback = INITIAL_CANONICAL_PLANS.find(
        (p) => p.id === clean || p.code === clean.toUpperCase()
      );
      if (foundFallback) return foundFallback;
      throw new NotFoundException(`Subscription plan '${idOrCode}' not found`);
    }

    return this.mapDbPlanToDefinition(plan);
  }

  /**
   * Super Admin: Create a new Subscription Plan.
   */
  async createPlan(dto: CreatePlanDto, adminUserId?: string): Promise<PlanDefinition> {
    const cleanCode = dto.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (!cleanCode) {
      throw new BadRequestException('Plan code cannot be empty.');
    }

    const existing = await (this.prisma as any).subscriptionPlan.findUnique({
      where: { code: cleanCode },
    });
    if (existing) {
      throw new ConflictException(`A plan with code '${cleanCode}' already exists.`);
    }

    const discount = dto.discountPercent !== undefined ? dto.discountPercent : 20;
    const monthlyPrice = Number(dto.monthlyPrice);
    const annualMonthlyPrice =
      dto.annualMonthlyPrice !== undefined
        ? Number(dto.annualMonthlyPrice)
        : Math.round(monthlyPrice * (1 - discount / 100));
    const annualTotalPrice =
      dto.annualTotalPrice !== undefined ? Number(dto.annualTotalPrice) : annualMonthlyPrice * 12;

    const count = await (this.prisma as any).subscriptionPlan.count();
    const displayOrder = dto.displayOrder !== undefined ? dto.displayOrder : count + 1;

    const created = await (this.prisma as any).subscriptionPlan.create({
      data: {
        code: cleanCode,
        name: dto.name.trim(),
        badge: dto.badge?.trim() || `${dto.name.trim()} Tier`,
        description: dto.description?.trim() || '',
        monthlyPrice,
        annualMonthlyPrice,
        annualTotalPrice,
        discountPercent: discount,
        currency: dto.currency || 'INR',
        trialDays: dto.trialDays ?? 0,
        isFreeTrialAllowed: Boolean(dto.isFreeTrialAllowed),
        status: dto.status || 'ACTIVE',
        isRecommended: Boolean(dto.isRecommended),
        displayOrder,
        limits: dto.limits || {
          maxUsers: 10,
          maxDepartments: 2,
          maxTicketsMonthly: 'Unlimited',
          storageGb: 10,
          maxIntegrations: 1,
        },
        features: dto.features || {
          ticketManagement: true,
          customerPortal: true,
          manualAssignment: true,
          autoAssignment: false,
          workloadBalancing: false,
          employeeOnBehalf: false,
          ticketAgingAlerts: false,
          emailNotifications: true,
          pushNotifications: true,
          whatsappNotifications: false,
          mobileAccess: false,
          basicReports: true,
          advancedReports: false,
          apiIntegration: false,
          bulkImportExport: false,
          customWorkflows: false,
          customSla: false,
          multiLocation: false,
          ssoSaml: false,
          dedicatedManager: false,
          slaUptime999: false,
        },
        highlights: dto.highlights || ['Standard ticket and customer management'],
      },
    });

    logger.info({ adminUserId, planCode: cleanCode }, '[PlansService] New subscription plan created');
    return this.mapDbPlanToDefinition(created);
  }

  /**
   * Super Admin: Update an existing Subscription Plan.
   */
  async updatePlan(id: string, dto: UpdatePlanDto, adminUserId?: string): Promise<PlanDefinition> {
    const existing = await (this.prisma as any).subscriptionPlan.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Plan with ID '${id}' not found.`);
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.badge !== undefined) data.badge = dto.badge?.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim();
    if (dto.discountPercent !== undefined) data.discountPercent = dto.discountPercent;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.trialDays !== undefined) data.trialDays = dto.trialDays;
    if (dto.isFreeTrialAllowed !== undefined) data.isFreeTrialAllowed = dto.isFreeTrialAllowed;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.isRecommended !== undefined) data.isRecommended = dto.isRecommended;
    if (dto.displayOrder !== undefined) data.displayOrder = dto.displayOrder;
    if (dto.limits !== undefined) data.limits = dto.limits;
    if (dto.features !== undefined) data.features = dto.features;
    if (dto.highlights !== undefined) data.highlights = dto.highlights;

    if (dto.monthlyPrice !== undefined) {
      const monthly = Number(dto.monthlyPrice);
      data.monthlyPrice = monthly;
      const discount = dto.discountPercent !== undefined ? dto.discountPercent : existing.discountPercent;
      data.annualMonthlyPrice =
        dto.annualMonthlyPrice !== undefined
          ? Number(dto.annualMonthlyPrice)
          : Math.round(monthly * (1 - discount / 100));
      data.annualTotalPrice =
        dto.annualTotalPrice !== undefined
          ? Number(dto.annualTotalPrice)
          : Number(data.annualMonthlyPrice) * 12;
    } else {
      if (dto.annualMonthlyPrice !== undefined) data.annualMonthlyPrice = Number(dto.annualMonthlyPrice);
      if (dto.annualTotalPrice !== undefined) data.annualTotalPrice = Number(dto.annualTotalPrice);
    }

    const updated = await (this.prisma as any).subscriptionPlan.update({
      where: { id },
      data,
    });

    logger.info({ adminUserId, planId: id }, '[PlansService] Subscription plan updated');
    return this.mapDbPlanToDefinition(updated);
  }

  /**
   * Super Admin: Update plan status (Activate / Deactivate / Archive).
   */
  async updatePlanStatus(id: string, status: PlanStatus, adminUserId?: string): Promise<PlanDefinition> {
    const existing = await (this.prisma as any).subscriptionPlan.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Plan with ID '${id}' not found.`);
    }

    const updated = await (this.prisma as any).subscriptionPlan.update({
      where: { id },
      data: { status },
    });

    logger.info({ adminUserId, planId: id, status }, '[PlansService] Subscription plan status updated');
    return this.mapDbPlanToDefinition(updated);
  }

  /**
   * Super Admin: Duplicate an existing plan.
   */
  async duplicatePlan(id: string, adminUserId?: string): Promise<PlanDefinition> {
    const source = await (this.prisma as any).subscriptionPlan.findUnique({ where: { id } });
    if (!source) {
      throw new NotFoundException(`Source plan '${id}' not found.`);
    }

    const timestamp = Date.now().toString().slice(-4);
    const newCode = `${source.code}_COPY_${timestamp}`.slice(0, 50);
    const count = await (this.prisma as any).subscriptionPlan.count();

    const created = await (this.prisma as any).subscriptionPlan.create({
      data: {
        code: newCode,
        name: `${source.name} (Copy)`,
        badge: source.badge ? `${source.badge} [Copy]` : `${source.name} [Copy]`,
        description: source.description,
        monthlyPrice: source.monthlyPrice,
        annualMonthlyPrice: source.annualMonthlyPrice,
        annualTotalPrice: source.annualTotalPrice,
        discountPercent: source.discountPercent,
        currency: source.currency,
        trialDays: source.trialDays,
        isFreeTrialAllowed: source.isFreeTrialAllowed,
        status: 'DRAFT', // Duplicates start as DRAFT until Super Admin activates them
        isRecommended: false,
        displayOrder: count + 1,
        limits: source.limits,
        features: source.features,
        highlights: source.highlights,
      },
    });

    logger.info({ adminUserId, sourceId: id, newId: created.id }, '[PlansService] Plan duplicated');
    return this.mapDbPlanToDefinition(created);
  }

  /**
   * Super Admin: Archive or soft-delete a plan.
   */
  async archivePlan(id: string, adminUserId?: string): Promise<PlanDefinition> {
    return this.updatePlanStatus(id, 'ARCHIVED', adminUserId);
  }

  /**
   * Super Admin: Permanently delete a plan.
   */
  async deletePlan(
    id: string,
    force = false,
    adminUserId?: string
  ): Promise<{ success: boolean; message: string; deletedId: string }> {
    const plan = await (this.prisma as any).subscriptionPlan.findFirst({
      where: {
        OR: [{ id }, { code: id.toUpperCase() }],
      },
    });

    if (!plan) {
      const fallback = INITIAL_CANONICAL_PLANS.find(
        (p) => p.id === id || p.code === id.toUpperCase()
      );
      if (fallback) {
        return { success: true, message: `Plan '${fallback.name}' removed from view.`, deletedId: id };
      }
      throw new NotFoundException(`Plan '${id}' not found`);
    }

    // Check if tenants are subscribed to this plan code
    const tenantCount = await this.prisma.subscription.count({
      where: {
        plan: (['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(plan.code)
          ? plan.code
          : 'ENTERPRISE') as any,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
    });

    if (tenantCount > 0 && !force) {
      throw new ConflictException(
        `Cannot delete plan '${plan.name}' because ${tenantCount} active organization(s) are currently subscribed to it. You can archive it instead or confirm force delete.`
      );
    }

    await (this.prisma as any).subscriptionPlan.delete({
      where: { id: plan.id },
    });

    logger.info({ adminUserId, planId: plan.id, code: plan.code }, '[PlansService] Plan permanently deleted');
    return {
      success: true,
      message: `Plan '${plan.name}' has been permanently deleted.`,
      deletedId: plan.id,
    };
  }

  private mapDbPlanToDefinition(p: any): PlanDefinition {
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      badge: p.badge || `${p.name} Plan`,
      description: p.description || '',
      monthlyPrice: Number(p.monthlyPrice),
      annualMonthlyPrice: Number(p.annualMonthlyPrice),
      annualTotalPrice: Number(p.annualTotalPrice),
      discountPercent: p.discountPercent || 20,
      currency: p.currency || 'INR',
      billingIntervals: ['MONTHLY', 'ANNUAL'],
      trialDays: p.trialDays || 0,
      isFreeTrialAllowed: Boolean(p.isFreeTrialAllowed),
      effectiveDate: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : 'Immediate',
      status: (p.status as PlanStatus) || 'ACTIVE',
      isRecommended: Boolean(p.isRecommended),
      displayOrder: p.displayOrder || 0,
      limits: (p.limits as any) || {
        maxUsers: 5,
        maxDepartments: 1,
        maxTicketsMonthly: 'Unlimited',
        storageGb: 5,
        maxIntegrations: 0,
      },
      features: (p.features as any) || {},
      highlights: Array.isArray(p.highlights) ? p.highlights : [],
      createdAt: p.createdAt?.toISOString(),
      updatedAt: p.updatedAt?.toISOString(),
    };
  }
}
