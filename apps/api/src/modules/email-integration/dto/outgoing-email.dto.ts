import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOutgoingEmailDto {
  @ApiPropertyOptional({ example: 'ABC Support', description: 'Sender display name' })
  @IsOptional()
  @IsString({ message: 'Sender name must be a string' })
  @MaxLength(150, { message: 'Sender name cannot exceed 150 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  senderName?: string;

  @ApiPropertyOptional({ example: 'support@abc.com', description: 'From email address' })
  @IsOptional()
  @IsEmail({}, { message: 'From email must be a valid email address' })
  @MaxLength(255, { message: 'From email cannot exceed 255 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  fromEmail?: string;

  @ApiPropertyOptional({ example: 'support@abc.com', description: 'Reply-To email address' })
  @IsOptional()
  @IsEmail({}, { message: 'Reply-To email must be a valid email address' })
  @MaxLength(255, { message: 'Reply-To email cannot exceed 255 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  replyToEmail?: string;
}

export class SendTestEmailDto {
  @ApiProperty({ example: 'recipient@example.com', description: 'Recipient email address for the test email' })
  @IsNotEmpty({ message: 'Recipient email address is required' })
  @IsEmail({}, { message: 'Must be a valid recipient email address' })
  @MaxLength(255, { message: 'Recipient email cannot exceed 255 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  recipientEmail!: string;
}
