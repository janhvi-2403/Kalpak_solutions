import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsArray,
  IsNumber,
  Min,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { ContractTypeEnum, ContractStatusEnum, PmFrequencyEnum } from '@kalpak/types';

export class CreateContractDto {
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @IsString()
  @IsOptional()
  contractNumber?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  @IsIn(['COMPREHENSIVE', 'NON_COMPREHENSIVE', 'LABOR_ONLY'])
  contractType?: ContractTypeEnum;

  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @IsString()
  @IsOptional()
  billingFrequency?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  totalAmount?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  termsAndConditions?: string;

  @IsArray()
  @IsString({ each: true })
  assetIds!: string[];

  @IsBoolean()
  @IsOptional()
  generatePmSchedules?: boolean;

  @IsString()
  @IsOptional()
  @IsIn(['MONTHLY', 'QUARTERLY', 'BI_ANNUAL', 'ANNUAL'])
  defaultPmFrequency?: PmFrequencyEnum;
}

export class CreatePmScheduleDto {
  @IsString()
  @IsOptional()
  contractId?: string;

  @IsString()
  @IsNotEmpty()
  assetId!: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(['MONTHLY', 'QUARTERLY', 'BI_ANNUAL', 'ANNUAL'])
  frequency?: PmFrequencyEnum;

  @IsDateString()
  @IsNotEmpty()
  nextDueDate!: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  totalVisitsQuota?: number;
}

export class ContractQueryDto {
  @IsString()
  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'])
  status?: ContractStatusEnum;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsBoolean()
  @IsOptional()
  expiringSoon?: boolean;
}
