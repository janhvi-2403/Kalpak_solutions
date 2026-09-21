import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InitBootstrapDto {
  @ApiProperty({ example: 'Kalpak System Administrator', description: 'Full name of the initial Super Admin' })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  @MaxLength(150, { message: 'Full name must not exceed 150 characters' })
  fullName!: string;

  @ApiProperty({ example: 'admin@kalpaksolutions.com', description: 'Official email of the initial Super Admin' })
  @IsEmail({}, { message: 'A valid email address is required' })
  @IsNotEmpty({ message: 'Email address is required' })
  email!: string;

  @ApiPropertyOptional({ example: '+91 93730 28030', description: 'Official contact phone number (stored without phone OTP verification)' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: 'SuperSecure@Kalpak2026!', description: 'Strong password for initial Super Admin' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' })
  password!: string;

  @ApiPropertyOptional({ description: 'Server deployment authorization secret (can also be passed in X-Bootstrap-Secret header)' })
  @IsString()
  @IsOptional()
  secret?: string;
}
