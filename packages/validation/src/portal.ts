import { z } from 'zod';
import { TicketPrioritySchema, TicketStatusSchema } from './ticket';

// ============================================================================
// Customer Portal Zod Validation Schemas
// ============================================================================

export const RaisePortalTicketSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(250),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: TicketPrioritySchema.optional().default('MEDIUM'),
  customerAssetId: z.string().uuid('Invalid machine/asset ID').optional().or(z.literal('')),
});

export const PortalTicketFilterSchema = z.object({
  status: TicketStatusSchema.optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const EnablePortalAccessSchema = z.object({
  temporaryPassword: z
    .string()
    .min(8, 'Temporary password must be at least 8 characters')
    .optional(),
});
