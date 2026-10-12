import {
  BusinessType,
  PurposeOfUse,
  AssignmentStrategy,
  ClosureAuthority,
  NotificationChannel,
  PlatformAccess,
  CustomerType,
} from './enums';

// ------------------------------------------------------------------------------
// Tenant Configuration & Policy Contracts
// ------------------------------------------------------------------------------
export interface TenantPolicyDto {
  id: string;
  tenantId: string;
  businessType: BusinessType;
  purposeOfUse: PurposeOfUse;
  allowCustomerToRaise: boolean;
  allowEmployeeOnBehalf: boolean;
  assignmentStrategy: AssignmentStrategy;
  closureAuthority: ClosureAuthority;
  tolerableOpenDays: number;
  notificationChannels: NotificationChannel;
  platformAccess: PlatformAccess;
  pushNotifications: boolean;
  maxUsersQuota: number;
  subscriptionStartsAt: Date | string;
  subscriptionEndsAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UpdateTenantPolicyDto {
  businessType?: BusinessType;
  purposeOfUse?: PurposeOfUse;
  allowCustomerToRaise?: boolean;
  allowEmployeeOnBehalf?: boolean;
  assignmentStrategy?: AssignmentStrategy;
  closureAuthority?: ClosureAuthority;
  tolerableOpenDays?: number;
  notificationChannels?: NotificationChannel;
  platformAccess?: PlatformAccess;
  pushNotifications?: boolean;
  maxUsersQuota?: number;
  subscriptionEndsAt?: Date | string | null;
}

// ------------------------------------------------------------------------------
// Department Contracts
// ------------------------------------------------------------------------------
export interface DepartmentDto {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string | null;
  headUserId?: string | null;
  headUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  memberCount?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateDepartmentDto {
  name: string;
  code: string;
  description?: string;
  headUserId?: string;
}

export interface UpdateDepartmentDto {
  name?: string;
  code?: string;
  description?: string;
  headUserId?: string | null;
}

// ------------------------------------------------------------------------------
// Customer Directory Contracts
// ------------------------------------------------------------------------------
export interface CustomerBranchDto {
  id: string;
  tenantId: string;
  customerId: string;
  branchName: string;
  branchCode?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  isHeadquarters: boolean;
  status: string;
  assetCount?: number;
  contactCount?: number;
  ticketCount?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateCustomerBranchDto {
  branchName: string;
  branchCode?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  isHeadquarters?: boolean;
  status?: string;
}

export interface UpdateCustomerBranchDto {
  branchName?: string;
  branchCode?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  isHeadquarters?: boolean;
  status?: string;
}

export interface CustomerContactDto {
  id: string;
  tenantId: string;
  customerId: string;
  branchId?: string | null;
  branchName?: string | null;
  name: string;
  designation?: string | null;
  department?: string | null;
  email?: string | null;
  phone: string;
  alternatePhone?: string | null;
  isPrimary: boolean;
  status: string;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateCustomerContactDto {
  name: string;
  branchId?: string | null;
  designation?: string;
  department?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  isPrimary?: boolean;
  status?: string;
  notes?: string;
}

export interface UpdateCustomerContactDto {
  name?: string;
  branchId?: string | null;
  designation?: string;
  department?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  isPrimary?: boolean;
  status?: string;
  notes?: string;
}

export interface CustomerUserDto {
  id: string;
  tenantId: string;
  customerId: string;
  userId: string;
  branchId?: string | null;
  roleTitle?: string | null;
  status: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    isActive: boolean;
  } | null;
  branch?: {
    id: string;
    branchName: string;
  } | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AssignCustomerUserDto {
  userId?: string;
  email?: string;
  fullName?: string;
  phone?: string;
  branchId?: string | null;
  roleTitle?: string;
}

export interface CustomerStatsDto {
  total: number;
  active: number;
  individual: number;
  businessPartner: number;
  corporate: number;
}

export interface CustomerDto {
  id: string;
  tenantId: string;
  customerType: CustomerType;
  customerCode?: string | null;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  alternatePhone?: string | null;
  businessType?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  billingAddress?: string | null;
  taxId?: string | null;
  status: string;
  portalAccessEnabled: boolean;
  userId?: string | null;
  notes?: string | null;
  assetCount?: number;
  branchCount?: number;
  contactCount?: number;
  userCount?: number;
  ticketCount?: number;
  branches?: CustomerBranchDto[];
  contacts?: CustomerContactDto[];
  portalUsers?: CustomerUserDto[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateCustomerDto {
  customerType?: CustomerType;
  customerCode?: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  businessType?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  billingAddress?: string;
  taxId?: string;
  status?: string;
  portalAccessEnabled?: boolean;
  notes?: string;
}

export interface UpdateCustomerDto {
  customerType?: CustomerType;
  customerCode?: string;
  companyName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  businessType?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  billingAddress?: string;
  taxId?: string;
  status?: string;
  portalAccessEnabled?: boolean;
  notes?: string;
}

// ------------------------------------------------------------------------------
// Product & Service Catalog Contracts
// ------------------------------------------------------------------------------
export interface ProductDto {
  id: string;
  tenantId: string;
  departmentId?: string | null;
  departmentName?: string | null;
  name: string;
  modelNumber: string;
  category: string;
  description?: string | null;
  hasWarranty: boolean;
  warrantyPeriodMonths: number;
  assetCount?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateProductDto {
  name: string;
  modelNumber: string;
  category: string;
  departmentId?: string;
  description?: string;
  hasWarranty?: boolean;
  warrantyPeriodMonths?: number;
}

export interface UpdateProductDto {
  name?: string;
  modelNumber?: string;
  category?: string;
  departmentId?: string | null;
  description?: string;
  hasWarranty?: boolean;
  warrantyPeriodMonths?: number;
}

// ------------------------------------------------------------------------------
// Customer Installed Asset Contracts
// ------------------------------------------------------------------------------
export interface CustomerAssetDto {
  id: string;
  tenantId: string;
  customerId: string;
  customerName?: string;
  productId: string;
  productName?: string;
  modelNumber?: string;
  serialNumber: string;
  installationDate?: Date | string | null;
  warrantyEndDate?: Date | string | null;
  location?: string | null;
  status: string;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateCustomerAssetDto {
  customerId: string;
  productId: string;
  serialNumber: string;
  installationDate?: string;
  warrantyEndDate?: string;
  location?: string;
  status?: string;
  notes?: string;
}

export interface UpdateCustomerAssetDto {
  serialNumber?: string;
  installationDate?: string;
  warrantyEndDate?: string;
  location?: string;
  status?: string;
  notes?: string;
}

// ------------------------------------------------------------------------------
// Employee & Technician Profile Contracts
// ------------------------------------------------------------------------------
export interface EmployeeProfileDto {
  id: string;
  tenantId: string;
  userId: string;
  fullName: string;
  email: string;
  role: string;
  departmentId?: string | null;
  departmentName?: string | null;
  designation?: string | null;
  skills: string[];
  phone?: string | null;
  isAvailable: boolean;
  activeTicketsCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UpdateEmployeeProfileDto {
  departmentId?: string | null;
  designation?: string;
  skills?: string[];
  phone?: string;
  isAvailable?: boolean;
}
