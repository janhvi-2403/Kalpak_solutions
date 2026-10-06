import { IsBoolean, IsOptional, IsEmail, MaxLength, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEmailConfigDto {
  @ApiPropertyOptional({ example: 'support@acme-corp.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  supportEmail?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  autoCreateTicket?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  autoRoute?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  customerRepliesEnabled?: boolean = true;

  @ApiPropertyOptional({ default: 'AUTO_CREATE', enum: ['AUTO_CREATE', 'REQUIRE_APPROVAL'] })
  @IsOptional()
  @IsString()
  @IsIn(['AUTO_CREATE', 'REQUIRE_APPROVAL'])
  unknownCustomerPolicy?: 'AUTO_CREATE' | 'REQUIRE_APPROVAL' = 'AUTO_CREATE';

  @ApiPropertyOptional({ example: '85b87259-79a3-44a3-93de-53a2b55b8148', nullable: true })
  @IsOptional()
  @IsString()
  defaultDepartmentId?: string | null;

  @ApiPropertyOptional({ default: 'MEDIUM', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  defaultPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  notifyTicketCreated?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  notifyTicketAssigned?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  notifyTicketStatusChanged?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  notifyCustomerReply?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  notifyTicketResolved?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  notifyTicketClosed?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  notifyLongOpenTicket?: boolean = true;
}
