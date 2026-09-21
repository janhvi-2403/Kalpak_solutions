import { z } from 'zod';

export const ContractTypeSchema = z.enum([
  'COMPREHENSIVE',
  'NON_COMPREHENSIVE',
  'LABOR_ONLY',
]);

export const ContractStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'EXPIRED',
  'TERMINATED',
]);

export const PmFrequencySchema = z.enum([
  'MONTHLY',
  'QUARTERLY',
  'BI_ANNUAL',
  'ANNUAL',
]);

export const CreateServiceContractSchema = z.object({
  customerId: z.string().uuid('Valid customer ID is required'),
  contractNumber: z.string().min(3).max(50).optional(),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  contractType: ContractTypeSchema.default('COMPREHENSIVE'),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  billingFrequency: z.string().max(30).optional().default('ANNUAL'),
  totalAmount: z.coerce.number().min(0).optional().default(0),
  notes: z.string().max(2000).optional(),
  termsAndConditions: z.string().max(5000).optional(),
  assetIds: z.array(z.string().uuid()).min(1, 'At least one covered asset must be selected'),
});

export const CreatePmScheduleSchema = z.object({
  contractId: z.string().uuid().optional(),
  assetId: z.string().uuid('Valid asset ID is required'),
  departmentId: z.string().uuid().optional(),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().max(2000).optional(),
  frequency: PmFrequencySchema.default('QUARTERLY'),
  nextDueDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  totalVisitsQuota: z.coerce.number().int().min(1).max(52).optional().default(4),
});

export const ContractFilterSchema = z.object({
  status: ContractStatusSchema.optional(),
  customerId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
  expiringSoon: z.coerce.boolean().optional(),
});
