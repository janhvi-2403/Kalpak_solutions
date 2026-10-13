import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlanDto {
  @ApiProperty({ example: 'ENTERPRISE_PLUS', description: 'Unique uppercase plan code identifier' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 'Enterprise Plus', description: 'Display name of the subscription plan' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Enterprise → Custom Scale', description: 'Visual badge or subtitle' })
  @IsOptional()
  @IsString()
  badge?: string;

  @ApiPropertyOptional({ example: 'Customized tier for global multi-branch enterprises.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 4999, description: 'Monthly price in INR when billed monthly' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyPrice!: number;

  @ApiPropertyOptional({ example: 3999, description: 'Equivalent monthly price in INR when billed annually' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  annualMonthlyPrice?: number;

  @ApiPropertyOptional({ example: 47988, description: 'Total annual price in INR' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  annualTotalPrice?: number;

  @ApiPropertyOptional({ example: 20, description: 'Discount percentage on annual billing' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discountPercent?: number;

  @ApiPropertyOptional({ example: 'INR', default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 14, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  trialDays?: number;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isFreeTrialAllowed?: boolean;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED'], default: 'ACTIVE' })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED'])
  status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED';

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isRecommended?: boolean;

  @ApiPropertyOptional({ example: 4, default: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  displayOrder?: number;

  @ApiPropertyOptional({
    example: { maxUsers: 15, maxDepartments: 5, maxTicketsMonthly: 'Unlimited', storageGb: 20, maxIntegrations: 3 },
  })
  @IsOptional()
  limits?: any;

  @ApiPropertyOptional({
    example: {
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
      advancedReports: false,
      apiIntegration: true,
      bulkImportExport: true,
      customWorkflows: false,
      customSla: false,
      multiLocation: false,
      ssoSaml: false,
      dedicatedManager: false,
      slaUptime999: false,
    },
  })
  @IsOptional()
  features?: any;

  @ApiPropertyOptional({ example: ['Up to 15 Technicians', 'Includes Auto Assignment', 'Email & Push Alerts'] })
  @IsOptional()
  @IsArray()
  highlights?: string[];
}
