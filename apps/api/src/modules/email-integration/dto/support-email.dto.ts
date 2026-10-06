import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupportEmailDto {
  @ApiProperty({ example: 'support@abc.com', description: 'Support email address' })
  @IsNotEmpty({ message: 'Support email address is required' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @MaxLength(255, { message: 'Email address cannot exceed 255 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email!: string;

  @ApiProperty({ example: 'ABC Support', description: 'Display name for this support address' })
  @IsNotEmpty({ message: 'Display name is required' })
  @IsString({ message: 'Display name must be a string' })
  @MaxLength(150, { message: 'Display name cannot exceed 150 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  displayName!: string;

  @ApiPropertyOptional({ default: false, description: 'Mark this address as the default support email' })
  @IsOptional()
  @IsBoolean({ message: 'isDefault must be a boolean' })
  isDefault?: boolean = false;

  @ApiPropertyOptional({ default: true, description: 'Whether this support address is active' })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean = true;
}

export class UpdateSupportEmailDto {
  @ApiPropertyOptional({ example: 'support@abc.com', description: 'Updated support email address' })
  @IsOptional()
  @IsEmail({}, { message: 'Must be a valid email address' })
  @MaxLength(255, { message: 'Email address cannot exceed 255 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email?: string;

  @ApiPropertyOptional({ example: 'ABC Support Team', description: 'Updated display name' })
  @IsOptional()
  @IsString({ message: 'Display name must be a string' })
  @MaxLength(150, { message: 'Display name cannot exceed 150 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  displayName?: string;

  @ApiPropertyOptional({ description: 'Mark as default support email' })
  @IsOptional()
  @IsBoolean({ message: 'isDefault must be a boolean' })
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Whether this support address is active' })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}
