import { z } from 'zod';
import {
  BusinessType,
  PurposeOfUse,
  AssignmentStrategy,
  ClosureAuthority,
  NotificationChannel,
  PlatformAccess,
} from '@kalpak/types';

// ------------------------------------------------------------------------------
// Tenant Configuration & Policy Schemas
// ------------------------------------------------------------------------------
export const updateTenantPolicySchema = z.object({
  businessType: z.nativeEnum(BusinessType).optional(),
  purposeOfUse: z.nativeEnum(PurposeOfUse).optional(),
  allowCustomerToRaise: z.boolean().optional(),
  allowEmployeeOnBehalf: z.boolean().optional(),
  assignmentStrategy: z.nativeEnum(AssignmentStrategy).optional(),
  closureAuthority: z.nativeEnum(ClosureAuthority).optional(),
  tolerableOpenDays: z.number().int().min(1).max(90).optional(),
  notificationChannels: z.nativeEnum(NotificationChannel).optional(),
  platformAccess: z.nativeEnum(PlatformAccess).optional(),
  pushNotifications: z.boolean().optional(),
  maxUsersQuota: z.number().int().min(1).max(1000).optional(),
  subscriptionEndsAt: z.string().datetime({ offset: true }).nullable().optional(),
});

// ------------------------------------------------------------------------------
// Department Schemas
// ------------------------------------------------------------------------------
export const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters').max(100),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(50)
    .regex(/^[A-Z0-9_-]+$/i, 'Code can only contain letters, numbers, hyphens, and underscores'),
  description: z.string().max(500).optional(),
  headUserId: z.string().uuid().optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

// ------------------------------------------------------------------------------
// Customer Directory Schemas
// ------------------------------------------------------------------------------
export const createCustomerSchema = z.object({
  companyName: z.string().min(2, 'Company name is required').max(150),
  contactPerson: z.string().min(2, 'Contact person is required').max(100),
  email: z.string().email('Valid email is required').max(255),
  phone: z.string().min(5, 'Valid phone number is required').max(30),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  pincode: z.string().max(20).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  portalAccessEnabled: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

// ------------------------------------------------------------------------------
// Product Catalog Schemas
// ------------------------------------------------------------------------------
export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name is required').max(150),
  modelNumber: z.string().min(1, 'Model number is required').max(100),
  category: z.string().min(2, 'Category is required').max(80),
  departmentId: z.string().uuid().optional(),
  description: z.string().max(1000).optional(),
  hasWarranty: z.boolean().default(true),
  warrantyPeriodMonths: z.number().int().min(0).max(120).default(12),
});

export const updateProductSchema = createProductSchema.partial();

// ------------------------------------------------------------------------------
// Customer Installed Asset Schemas
// ------------------------------------------------------------------------------
export const createCustomerAssetSchema = z.object({
  customerId: z.string().uuid('Valid customer ID is required'),
  productId: z.string().uuid('Valid product ID is required'),
  serialNumber: z.string().min(1, 'Serial number is required').max(100),
  installationDate: z.string().optional(),
  warrantyEndDate: z.string().optional(),
  location: z.string().max(150).optional(),
  status: z.enum(['OPERATIONAL', 'UNDER_MAINTENANCE', 'DECOMMISSIONED']).default('OPERATIONAL'),
  notes: z.string().max(1000).optional(),
});

export const updateCustomerAssetSchema = createCustomerAssetSchema.partial();

// ------------------------------------------------------------------------------
// Employee / Technician Profile Schemas
// ------------------------------------------------------------------------------
export const updateEmployeeProfileSchema = z.object({
  departmentId: z.string().uuid().nullable().optional(),
  designation: z.string().max(100).optional(),
  skills: z.array(z.string()).optional(),
  phone: z.string().max(30).optional(),
  isAvailable: z.boolean().optional(),
});
