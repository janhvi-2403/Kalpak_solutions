import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCompanyProfileDto {
  @ApiPropertyOptional({ example: 'Acme Corporation', description: 'Official company or organization name' })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: 'data:image/png;base64,... or https://example.com/logo.png', description: 'Company logo image URL or base64 data' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'Plot 42, MIDC Industrial Area, Pune 411019', description: 'Physical / headquarters address' })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ example: '+91 98765 43210', description: 'Official customer support or corporate phone number' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'https://acmecorp.com', description: 'Company official website URL' })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ example: 'support@acmecorp.com', description: 'Official customer support email' })
  @IsString()
  @IsOptional()
  supportEmail?: string;

  @ApiPropertyOptional({ example: '#f97316', description: 'Brand theme color hex code' })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiPropertyOptional({ example: 'Pune', description: 'City' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'Maharashtra', description: 'State / Province' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: 'India', description: 'Country' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: '411019', description: 'Postal / Pincode' })
  @IsString()
  @IsOptional()
  pincode?: string;

  @ApiPropertyOptional({ example: 'Asia/Kolkata', description: 'Company operating timezone' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ example: 'DD/MM/YYYY hh:mm A', description: 'Company date and time display format' })
  @IsString()
  @IsOptional()
  dateTimeFormat?: string;

  @ApiPropertyOptional({ example: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], description: 'Standard working days' })
  @IsOptional()
  workingDays?: string[];

  @ApiPropertyOptional({ example: '09:00 AM - 06:00 PM', description: 'Daily business operating hours' })
  @IsString()
  @IsOptional()
  businessHours?: string;

  @ApiPropertyOptional({ example: '09:00', description: 'Business start time' })
  @IsString()
  @IsOptional()
  businessHoursStart?: string;

  @ApiPropertyOptional({ example: '18:00', description: 'Business end time' })
  @IsString()
  @IsOptional()
  businessHoursEnd?: string;

  @ApiPropertyOptional({ example: [{ name: 'Independence Day', date: '2026-08-15' }], description: 'Company holidays list' })
  @IsOptional()
  holidays?: Array<{ name: string; date: string }>;

  @ApiPropertyOptional({ description: 'Configured ticket service categories with subcategories and issue types' })
  @IsOptional()
  serviceCategories?: any[];

  @ApiPropertyOptional({ description: 'Configured priority levels and SLA response/resolution targets' })
  @IsOptional()
  priorities?: any[];

  @ApiPropertyOptional({ description: 'Automated ticket assignment and routing rules' })
  @IsOptional()
  assignmentRules?: any[];

  @ApiPropertyOptional({ description: 'Company notification channels and alert preferences' })
  @IsOptional()
  notificationPreferences?: Record<string, any>;

  @ApiPropertyOptional({ description: 'SaaS support requests logged with Kalpak Solutions' })
  @IsOptional()
  supportRequests?: any[];

  @ApiPropertyOptional({ description: 'Customer channels configuration (Phone, Email, WhatsApp, Website)' })
  @IsOptional()
  customerChannels?: Record<string, any>;
}
