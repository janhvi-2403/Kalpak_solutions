import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkOrderStatus, ChecklistStatus } from '@kalpak/database';

export class ChecklistTemplateItemDto {
  @ApiProperty()
  @IsString()
  itemCode!: string;

  @ApiProperty()
  @IsString()
  taskTitle!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetValue?: string;
}

export class CreateWorkOrderDto {
  @ApiProperty({ description: 'Service Ticket ID to link work order to' })
  @IsUUID()
  ticketId!: string;

  @ApiProperty({ description: 'Assigned Field Service Engineer User ID' })
  @IsUUID()
  assignedTechnicianId!: string;

  @ApiProperty({ example: '2026-09-25T09:00:00.000Z' })
  @IsDateString()
  scheduledDate!: string;

  @ApiPropertyOptional({ default: 'ON_SITE_REPAIR' })
  @IsOptional()
  @IsString()
  serviceType?: string = 'ON_SITE_REPAIR';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  technicianNotes?: string;

  @ApiPropertyOptional({ type: [ChecklistTemplateItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistTemplateItemDto)
  checklistTemplates?: ChecklistTemplateItemDto[];
}

export class UpdateChecklistItemDto {
  @ApiProperty({ enum: ['PENDING', 'PASSED', 'FAILED', 'NOT_APPLICABLE'] })
  @IsEnum(['PENDING', 'PASSED', 'FAILED', 'NOT_APPLICABLE'])
  status!: ChecklistStatus;

  @ApiPropertyOptional({ example: '72.4 °C' })
  @IsOptional()
  @IsString()
  readingValue?: string;

  @ApiPropertyOptional({ example: 'Spindle bearing running smooth without excess heat' })
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CompleteWorkOrderDto {
  @ApiProperty({ example: 'Sanjay Deshmukh' })
  @IsString()
  customerSignerName!: string;

  @ApiProperty({ example: 'Plant Maintenance Manager' })
  @IsString()
  customerSignerTitle!: string;

  @ApiProperty({ description: 'Base64 data URL or digital sign-off token' })
  @IsString()
  customerSignature!: string;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  customerRating?: number = 5;

  @ApiPropertyOptional({ example: 'Prompt service, issue resolved on first visit.' })
  @IsOptional()
  @IsString()
  customerFeedback?: string;

  @ApiPropertyOptional({ example: 'Replaced bearing lubricator, cleaned spindle housing, calibrated runout to 0.004mm' })
  @IsOptional()
  @IsString()
  resolutionSummary?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  autoResolveTicket?: boolean = true;
}

export class WorkOrderListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ticketId?: string;

  @ApiPropertyOptional({ enum: ['SCHEDULED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] })
  @IsOptional()
  @IsEnum(['SCHEDULED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
  status?: WorkOrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedTechnicianId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;
}
