import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'Acme Corporation', description: 'Name of the business organization' })
  @IsString()
  @IsNotEmpty({ message: 'Company name is required' })
  @MinLength(2, { message: 'Company name must be at least 2 characters' })
  @MaxLength(150, { message: 'Company name must not exceed 150 characters' })
  companyName!: string;

  @ApiProperty({ example: 'acme-corp', description: 'Unique URL identifier for the tenant organization' })
  @IsString()
  @IsNotEmpty({ message: 'Organization slug is required' })
  @MinLength(3, { message: 'Slug must be at least 3 characters' })
  @MaxLength(60, { message: 'Slug must not exceed 60 characters' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must only contain lowercase letters, numbers, and single hyphens',
  })
  slug!: string;

  @ApiPropertyOptional({ example: 'contact@acme.com', description: 'Business support/billing email' })
  @IsEmail({}, { message: 'Invalid business email format' })
  @IsOptional()
  businessEmail?: string;

  @ApiPropertyOptional({ example: '+1-555-0199', description: 'Company phone number' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'United States', description: 'Country of operation' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: 'America/New_York', description: 'Primary timezone' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({ example: 'Alice Johnson', description: 'Full name of the organization administrator' })
  @IsString()
  @IsNotEmpty({ message: 'Administrator full name is required' })
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  fullName!: string;

  @ApiProperty({ example: 'alice@acme.com', description: 'Administrator work email' })
  @IsEmail({}, { message: 'A valid email address is required' })
  email!: string;

  @ApiProperty({ example: 'SecureP@ssw0rd123!', description: 'Strong password for administrator account' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' })
  password!: string;
}
