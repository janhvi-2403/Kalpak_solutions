import { z } from 'zod';

// ==============================================================================
// Kalpak Solutions - Inventory & Spare Parts Zod Validation Schemas
// ==============================================================================

export const InventoryTransactionTypeSchema = z.enum([
  'PURCHASE_RECEIPT',
  'WORK_ORDER_CONSUMPTION',
  'TICKET_CONSUMPTION',
  'MANUAL_ADJUSTMENT',
  'TRANSFER',
  'RETURN',
]);

export const CreateSparePartSchema = z.object({
  partNumber: z.string().min(2).max(50),
  name: z.string().min(2).max(150),
  description: z.string().optional(),
  category: z.string().min(2).max(80),
  unitOfMeasure: z.string().max(20).default('PIECE'),
  unitPrice: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0).optional(),
  minStockAlert: z.coerce.number().int().min(0).default(5),
  compatibleModels: z.array(z.string()).default([]),
  initialStock: z.coerce.number().int().min(0).optional(),
  initialLocationId: z.string().uuid().optional(),
});

export const UpdateSparePartSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  description: z.string().optional(),
  category: z.string().min(2).max(80).optional(),
  unitOfMeasure: z.string().max(20).optional(),
  unitPrice: z.coerce.number().min(0).optional(),
  costPrice: z.coerce.number().min(0).optional(),
  minStockAlert: z.coerce.number().int().min(0).optional(),
  compatibleModels: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const CreateStorageLocationSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(50),
  type: z.string().max(50).default('WAREHOUSE'),
  address: z.string().max(255).optional(),
});

export const AdjustStockSchema = z.object({
  partId: z.string().uuid('Invalid part ID'),
  locationId: z.string().uuid('Invalid location ID'),
  transactionType: InventoryTransactionTypeSchema,
  quantityDelta: z.coerce.number().int(),
  unitCost: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

export const TransferStockSchema = z.object({
  partId: z.string().uuid('Invalid part ID'),
  fromLocationId: z.string().uuid('Invalid source location ID'),
  toLocationId: z.string().uuid('Invalid destination location ID'),
  quantity: z.coerce.number().int().min(1, 'Quantity to transfer must be at least 1'),
  notes: z.string().optional(),
}).refine((data) => data.fromLocationId !== data.toLocationId, {
  message: 'Source and destination locations cannot be the same',
  path: ['toLocationId'],
});

export const ConsumePartSchema = z.object({
  ticketId: z.string().uuid('Invalid ticket ID'),
  workOrderId: z.string().uuid().optional(),
  partId: z.string().uuid('Invalid part ID'),
  locationId: z.string().uuid().optional(),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.coerce.number().min(0).optional(),
  isWarrantyCovered: z.boolean().default(false),
  notes: z.string().optional(),
});

export const ListPartsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  category: z.string().optional(),
  lowStockOnly: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
});

export type CreateSparePartInput = z.infer<typeof CreateSparePartSchema>;
export type UpdateSparePartInput = z.infer<typeof UpdateSparePartSchema>;
export type CreateStorageLocationInput = z.infer<typeof CreateStorageLocationSchema>;
export type AdjustStockInput = z.infer<typeof AdjustStockSchema>;
export type TransferStockInput = z.infer<typeof TransferStockSchema>;
export type ConsumePartInput = z.infer<typeof ConsumePartSchema>;
export type ListPartsQueryInput = z.infer<typeof ListPartsQuerySchema>;
