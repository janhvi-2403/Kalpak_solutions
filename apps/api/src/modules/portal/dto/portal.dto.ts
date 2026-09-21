import { IsString, IsNotEmpty, IsOptional, Length, IsIn, IsUUID } from 'class-validator';
import { TicketPriorityEnum } from '@kalpak/types';

export class RaisePortalTicketDto {
  @IsString()
  @IsNotEmpty()
  @Length(5, 250)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 5000)
  description!: string;

  @IsString()
  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  priority?: TicketPriorityEnum;

  @IsUUID()
  @IsOptional()
  customerAssetId?: string;
}

export class PortalTicketQueryDto {
  @IsString()
  @IsOptional()
  @IsIn(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_CUSTOMER', 'RESOLVED', 'CLOSED', 'CANCELLED'])
  status?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  search?: string;
}
