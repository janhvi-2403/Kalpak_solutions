import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SystemRole } from '@kalpak/types';

export class CreateInvitationDto {
  @ApiProperty({ example: 'technician@acme.com', description: 'Employee work email address to invite' })
  @IsEmail({}, { message: 'A valid employee email address is required' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    enum: SystemRole,
    example: SystemRole.SUPPORT_EMPLOYEE,
    description: 'System role to grant upon acceptance',
  })
  @IsEnum(SystemRole, { message: 'A valid role must be selected' })
  role!: SystemRole;

  @ApiPropertyOptional({ example: 'Field Support', description: 'Department or unit within the company' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  department?: string;
}
