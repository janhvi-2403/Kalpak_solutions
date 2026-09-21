import { IsString, IsOptional, IsEnum, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({ example: 'CNC Machine spindle overheating fault' })
  @IsString()
  @MinLength(5)
  @MaxLength(250)
  title!: string;

  @ApiProperty({ example: 'Machine stops after 30 minutes with E-01 fault code. Customer reports spindle temperature exceeds 85°C.' })
  @IsString()
  @MinLength(10)
  description!: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  priority?: string = 'MEDIUM';

  @ApiPropertyOptional({ enum: ['CUSTOMER', 'EMPLOYEE'], default: 'EMPLOYEE' })
  @IsOptional()
  @IsEnum(['CUSTOMER', 'EMPLOYEE'])
  raisedBy?: string = 'EMPLOYEE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  raisedForCustomerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerAssetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedToUserId?: string;
}

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_CUSTOMER', 'RESOLVED', 'CLOSED', 'CANCELLED'] })
  @IsEnum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_CUSTOMER', 'RESOLVED', 'CLOSED', 'CANCELLED'])
  status!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class AssignTicketDto {
  @ApiProperty()
  @IsString()
  assignedToUserId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class AddTicketNoteDto {
  @ApiProperty({ example: 'Visited site. Found coolant pump blocked. Ordered replacement part.' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  note!: string;
}

export class UpdateTicketPriorityDto {
  @ApiProperty({ enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  priority!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
