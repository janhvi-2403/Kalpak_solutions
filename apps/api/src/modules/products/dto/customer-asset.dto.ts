import { IsString, IsNotEmpty, IsOptional, Length, IsUUID, IsIn, IsDateString } from 'class-validator';

export class CreateCustomerAssetDto {
  @IsUUID()
  @IsNotEmpty()
  customerId!: string;

  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  serialNumber!: string;

  @IsDateString()
  @IsOptional()
  installationDate?: string;

  @IsDateString()
  @IsOptional()
  warrantyEndDate?: string;

  @IsString()
  @IsOptional()
  @Length(0, 150)
  location?: string;

  @IsString()
  @IsOptional()
  @IsIn(['OPERATIONAL', 'UNDER_MAINTENANCE', 'DECOMMISSIONED'])
  status?: string;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  notes?: string;
}

export class UpdateCustomerAssetDto {
  @IsString()
  @IsOptional()
  @Length(1, 100)
  serialNumber?: string;

  @IsDateString()
  @IsOptional()
  installationDate?: string;

  @IsDateString()
  @IsOptional()
  warrantyEndDate?: string;

  @IsString()
  @IsOptional()
  @Length(0, 150)
  location?: string;

  @IsString()
  @IsOptional()
  @IsIn(['OPERATIONAL', 'UNDER_MAINTENANCE', 'DECOMMISSIONED'])
  status?: string;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  notes?: string;
}
