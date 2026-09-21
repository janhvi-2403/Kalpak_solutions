import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SwitchTenantDto {
  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111', description: 'Target Tenant UUID' })
  @IsUUID('4', { message: 'Invalid tenant UUID format' })
  @IsNotEmpty()
  tenantId!: string;
}
