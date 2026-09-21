import { IsString, IsNotEmpty, IsOptional, Length, IsBoolean, IsInt, Min, Max, IsUUID } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  modelNumber!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 80)
  category!: string;

  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  description?: string;

  @IsBoolean()
  @IsOptional()
  hasWarranty?: boolean;

  @IsInt()
  @Min(0)
  @Max(120)
  @IsOptional()
  warrantyPeriodMonths?: number;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  @Length(2, 150)
  name?: string;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  modelNumber?: string;

  @IsString()
  @IsOptional()
  @Length(2, 80)
  category?: string;

  @IsUUID()
  @IsOptional()
  departmentId?: string | null;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  description?: string;

  @IsBoolean()
  @IsOptional()
  hasWarranty?: boolean;

  @IsInt()
  @Min(0)
  @Max(120)
  @IsOptional()
  warrantyPeriodMonths?: number;
}
