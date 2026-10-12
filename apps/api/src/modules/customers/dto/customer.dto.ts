import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  Length,
  IsBoolean,
  IsIn,
  IsEnum,
} from 'class-validator';
import { CustomerType } from '@kalpak/types';

export class CreateCustomerDto {
  @IsEnum(CustomerType)
  @IsOptional()
  customerType?: CustomerType;

  @IsString()
  @IsOptional()
  @Length(2, 60)
  customerCode?: string;

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
  @Length(0, 30)
  alternatePhone?: string;

  @IsString()
  @IsOptional()
  @Length(0, 80)
  businessType?: string;

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
  @Length(0, 100)
  state?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  country?: string;

  @IsString()
  @IsOptional()
  @Length(0, 20)
  pincode?: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  billingAddress?: string;

  @IsString()
  @IsOptional()
  @Length(0, 50)
  taxId?: string;

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
  @IsEnum(CustomerType)
  @IsOptional()
  customerType?: CustomerType;

  @IsString()
  @IsOptional()
  @Length(2, 60)
  customerCode?: string;

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
  @Length(0, 30)
  alternatePhone?: string;

  @IsString()
  @IsOptional()
  @Length(0, 80)
  businessType?: string;

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
  @Length(0, 100)
  state?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  country?: string;

  @IsString()
  @IsOptional()
  @Length(0, 20)
  pincode?: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  billingAddress?: string;

  @IsString()
  @IsOptional()
  @Length(0, 50)
  taxId?: string;

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

export class CreateCustomerBranchDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  branchName!: string;

  @IsString()
  @IsOptional()
  @Length(0, 50)
  branchCode?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  contactPerson?: string;

  @IsString()
  @IsOptional()
  @Length(0, 30)
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

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
  @Length(0, 100)
  state?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  country?: string;

  @IsString()
  @IsOptional()
  @Length(0, 20)
  pincode?: string;

  @IsBoolean()
  @IsOptional()
  isHeadquarters?: boolean;

  @IsString()
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;
}

export class UpdateCustomerBranchDto {
  @IsString()
  @IsOptional()
  @Length(2, 150)
  branchName?: string;

  @IsString()
  @IsOptional()
  @Length(0, 50)
  branchCode?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  contactPerson?: string;

  @IsString()
  @IsOptional()
  @Length(0, 30)
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

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
  @Length(0, 100)
  state?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  country?: string;

  @IsString()
  @IsOptional()
  @Length(0, 20)
  pincode?: string;

  @IsBoolean()
  @IsOptional()
  isHeadquarters?: boolean;

  @IsString()
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;
}

export class CreateCustomerContactDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  name!: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  designation?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  department?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  @Length(5, 30)
  phone!: string;

  @IsString()
  @IsOptional()
  @Length(0, 30)
  alternatePhone?: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsString()
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  notes?: string;
}

export class UpdateCustomerContactDto {
  @IsString()
  @IsOptional()
  @Length(2, 150)
  name?: string;

  @IsString()
  @IsOptional()
  branchId?: string | null;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  designation?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  department?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @Length(5, 30)
  phone?: string;

  @IsString()
  @IsOptional()
  @Length(0, 30)
  alternatePhone?: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsString()
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  notes?: string;
}

export class AssignCustomerUserDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @Length(2, 150)
  fullName?: string;

  @IsString()
  @IsOptional()
  @Length(5, 30)
  phone?: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  roleTitle?: string;
}

export class LinkCustomerAssetDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  serialNumber!: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  installationDate?: string;

  @IsString()
  @IsOptional()
  warrantyEndDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
