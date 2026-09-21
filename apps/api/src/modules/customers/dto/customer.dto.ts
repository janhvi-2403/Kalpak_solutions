import { IsString, IsNotEmpty, IsEmail, IsOptional, Length, IsBoolean, IsIn } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  companyName!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  contactPerson!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Length(5, 30)
  phone!: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  address?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  city?: string;

  @IsString()
  @IsOptional()
  @Length(0, 20)
  pincode?: string;

  @IsString()
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;

  @IsBoolean()
  @IsOptional()
  portalAccessEnabled?: boolean;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  notes?: string;
}

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  @Length(2, 150)
  companyName?: string;

  @IsString()
  @IsOptional()
  @Length(2, 100)
  contactPerson?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @Length(5, 30)
  phone?: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  address?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  city?: string;

  @IsString()
  @IsOptional()
  @Length(0, 20)
  pincode?: string;

  @IsString()
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;

  @IsBoolean()
  @IsOptional()
  portalAccessEnabled?: boolean;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  notes?: string;
}
