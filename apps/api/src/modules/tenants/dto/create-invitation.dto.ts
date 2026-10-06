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

  @ApiPropertyOptional({ example: 'Rahul Sharma', description: 'Full name of the invited employee / department head' })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  fullName?: string;

  @ApiPropertyOptional({ example: '+91 98765 43210', description: 'Phone number of the invited member' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'Head of Maintenance', description: 'Designation / job title' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  designation?: string;
}
