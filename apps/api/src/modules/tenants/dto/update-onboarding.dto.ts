import { IsArray, IsBoolean, IsInt, IsObject, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOnboardingDto {
  @ApiPropertyOptional({ example: 2, description: 'Current active wizard step (1 to 9)' })
  @IsInt()
  @Min(1)
  @Max(9)
  @IsOptional()
  currentStep?: number;

  @ApiPropertyOptional({ example: false, description: 'Whether onboarding has been marked completed' })
  @IsBoolean()
  @IsOptional()
  completed?: boolean;

  @ApiPropertyOptional({ description: 'Organization profile details' })
  @IsObject()
  @IsOptional()
  profile?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Configured department names' })
  @IsArray()
  @IsOptional()
  departments?: string[];

  @ApiPropertyOptional({ description: 'Invited employees during wizard' })
  @IsArray()
  @IsOptional()
  invitedEmployees?: Array<{ email: string; role: string; department?: string }>;

  @ApiPropertyOptional({ description: 'Initial products or services catalog' })
  @IsArray()
  @IsOptional()
  productsServices?: Array<{ name: string; category: string; description?: string }>;

  @ApiPropertyOptional({ description: 'Initial ticket priority & SLA defaults' })
  @IsObject()
  @IsOptional()
  ticketPreferences?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Notification preference flags' })
  @IsObject()
  @IsOptional()
  notificationPreferences?: Record<string, any>;
}
