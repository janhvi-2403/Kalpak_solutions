import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BillingAddressDto {
  @ApiPropertyOptional({ example: '123 Tech Park, Karve Nagar' })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional({ example: 'Pune' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Maharashtra' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '411052' })
  @IsOptional()
  @IsString()
  pincode?: string;

  @ApiPropertyOptional({ example: 'India' })
  @IsOptional()
  @IsString()
  country?: string;
}

export class CreatePaymentOrderDto {
  @ApiProperty({ example: 'STARTER', description: 'Plan code (STARTER, PROFESSIONAL, ENTERPRISE, or custom created plan)' })
  @IsString()
  @IsNotEmpty()
  plan!: string;

  @ApiProperty({ enum: ['MONTHLY', 'ANNUAL'], example: 'ANNUAL' })
  @IsEnum(['MONTHLY', 'ANNUAL'])
  @IsNotEmpty()
  billingCycle!: 'MONTHLY' | 'ANNUAL';

  @ApiPropertyOptional({ example: '27ABCDE1234F1Z5' })
  @IsOptional()
  @IsString()
  gstin?: string;

  @ApiPropertyOptional({ type: () => BillingAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BillingAddressDto)
  billingAddress?: BillingAddressDto;

  @ApiProperty({ example: true, description: 'Mandatory agreement to Terms of Service' })
  @IsBoolean()
  @IsNotEmpty()
  agreedToTerms!: boolean;
}
