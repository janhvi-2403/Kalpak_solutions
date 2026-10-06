import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { logger } from '@kalpak/logger';

export interface RoutingResult {
  departmentId?: string;
  departmentCode?: string;
  departmentName?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  matchedKeywords: string[];
}

interface TaxonomyRule {
  category: string;
  departmentKeywords: string[];
  suggestedDepartmentCodes: string[];
}

const TAXONOMY_RULES: TaxonomyRule[] = [
  {
    category: 'Information Technology & Networks',
    departmentKeywords: [
      'wifi',
      'wi-fi',
      'laptop',
      'computer',
      'network',
      'internet',
      'email',
      'password',
      'login',
      'vpn',
      'router',
      'firewall',
      'printer',
      'server',
      'software',
      'monitor',
      'slow connection',
      'cannot connect',
    ],
    suggestedDepartmentCodes: ['IT', 'TECH', 'NET', 'INFRA'],
  },
  {
    category: 'Electrical & Automation',
    departmentKeywords: [
      'electrical',
      'power',
      'circuit',
      'voltage',
      'sensor',
      'plc',
      'vfd',
      'drive',
      'tripping',
      'short circuit',
      'transformer',
      'breaker',
      'fuse',
      'wiring',
      'panel',
      'automation',
    ],
    suggestedDepartmentCodes: ['ELEC', 'AUTO', 'ELECTRICAL'],
  },
  {
    category: 'Mechanical & Hydraulics',
    departmentKeywords: [
      'mechanical',
      'machine',
      'spindle',
      'bearing',
      'gearbox',
      'hydraulic',
      'pneumatic',
      'oil',
      'pump',
      'conveyor',
      'noise',
      'vibration',
      'leakage',
      'seizure',
      'jam',
      'motor',
    ],
    suggestedDepartmentCodes: ['MECH', 'MAINT', 'HYDR'],
  },
  {
    category: 'Finance & Billing',
    departmentKeywords: [
      'invoice',
      'billing',
      'payment',
      'receipt',
      'charge',
      'tax',
      'gst',
      'refund',
      'pricing',
      'account',
      'bank',
    ],
    suggestedDepartmentCodes: ['FIN', 'BILLING', 'ACCOUNTS'],
  },
  {
    category: 'Human Resources',
    departmentKeywords: [
      'salary',
      'payroll',
      'leave',
      'attendance',
      'hiring',
      'employee',
      'benefits',
      'bonus',
      'policy',
    ],
    suggestedDepartmentCodes: ['HR', 'PEOPLE'],
  },
];

@Injectable()
export class DepartmentRoutingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deterministically classifies an inbound email and matches it against the tenant's departments.
   */
  async routeInboundEmail(
    tenantId: string,
    subject: string,
    bodyText: string
  ): Promise<RoutingResult> {
    const combinedContent = `${subject} ${bodyText}`.toLowerCase();

    // 1. Determine Priority
    const priority = this.detectPriority(combinedContent);

    // 2. Load tenant's active departments
    const activeDepartments = await this.prisma.department.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
    });

    // 3. Score against taxonomy rules
    let bestRule: TaxonomyRule = TAXONOMY_RULES[0]!;
    let maxMatchCount = 0;
    let matchedKeywords: string[] = [];

    for (const rule of TAXONOMY_RULES) {
      const matches = rule.departmentKeywords.filter((kw) =>
        combinedContent.includes(kw.toLowerCase())
      );
      if (matches.length > maxMatchCount) {
        maxMatchCount = matches.length;
        bestRule = rule;
        matchedKeywords = matches;
      }
    }

    // 4. Match rule with tenant's departments
    let matchedDept = activeDepartments.find((d) =>
      bestRule.suggestedDepartmentCodes.some(
        (code) => d.code.toUpperCase() === code.toUpperCase()
      )
    );

    // Secondary match: check if department name/code appears in the keywords or content
    if (!matchedDept) {
      matchedDept = activeDepartments.find((d) => {
        const nameLower = d.name.toLowerCase();
        const codeLower = d.code.toLowerCase();
        return (
          combinedContent.includes(nameLower) ||
          combinedContent.includes(codeLower) ||
          bestRule.departmentKeywords.some((kw) => nameLower.includes(kw))
        );
      });
    }

    // If still not matched, fallback to first available department
    if (!matchedDept && activeDepartments.length > 0) {
      matchedDept = activeDepartments[0];
    }

    logger.info(
      {
        tenantId,
        category: bestRule.category,
        priority,
        department: matchedDept?.name,
        matchedKeywords,
      },
      '[DepartmentRoutingService] Successfully classified inbound email'
    );

    return {
      departmentId: matchedDept?.id,
      departmentCode: matchedDept?.code,
      departmentName: matchedDept?.name,
      priority,
      category: bestRule.category,
      matchedKeywords,
    };
  }

  private detectPriority(content: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalWords = [
      'critical',
      'emergency',
      'smoke',
      'fire',
      'explosion',
      'outage',
      'halted',
      'production stopped',
      'production down',
      'factory stopped',
      'severe',
      'catastrophic',
    ];
    for (const word of criticalWords) {
      if (content.includes(word)) return 'CRITICAL';
    }

    const highWords = [
      'not working',
      'cannot connect',
      'down',
      'failed',
      'failure',
      'urgent',
      'broken',
      'blocked',
      'breach',
      'error code',
      'offline',
      'damaged',
      'high',
    ];
    for (const word of highWords) {
      if (content.includes(word)) return 'HIGH';
    }

    const lowWords = [
      'question',
      'inquiry',
      'info',
      'clarification',
      'how to',
      'suggestion',
      'feedback',
      'minor',
      'low',
    ];
    for (const word of lowWords) {
      if (content.includes(word)) return 'LOW';
    }

    return 'MEDIUM';
  }
}
