import {
  BusinessType,
  PurposeOfUse,
  AssignmentStrategy,
  ClosureAuthority,
  NotificationChannel,
  PlatformAccess,
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
export interface CustomerDto {
  id: string;
  tenantId: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  status: string;
  portalAccessEnabled: boolean;
  userId?: string | null;
  notes?: string | null;
  assetCount?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateCustomerDto {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  pincode?: string;
  status?: string;
  portalAccessEnabled?: boolean;
  notes?: string;
}

export interface UpdateCustomerDto {
  companyName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  pincode?: string;
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
