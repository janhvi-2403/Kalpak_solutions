import { IsArray, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AcceptInvitationDto {
  @ApiProperty({ description: 'Secure employee invitation token received via email' })
  @IsString()
  @IsNotEmpty({ message: 'Invitation token is required' })
  @MinLength(16, { message: 'Invitation token is invalid' })
  token!: string;

  @ApiProperty({ example: 'Bob Miller', description: 'Full name of the employee joining the organization' })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  fullName!: string;

  @ApiProperty({ example: 'BobSecureP@ss123!', description: 'Initial account password for the employee' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' })
  password!: string;

  @ApiPropertyOptional({ example: '+91 98765 43210', description: 'Phone number of the employee' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: '123456', description: '6-digit TOTP verification code for 2-step authentication' })
  @IsString()
  @IsOptional()
  totpCode?: string;

  @ApiPropertyOptional({ description: 'Raw TOTP secret key for setup' })
  @IsString()
  @IsOptional()
  totpSecret?: string;

  @ApiPropertyOptional({ description: 'Emergency backup recovery codes' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  backupCodes?: string[];
}
