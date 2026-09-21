import { z } from 'zod';

// ============================================================================
// Ticket Zod Validation Schemas
// ============================================================================

export const TicketStatusSchema = z.enum([
  'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_CUSTOMER',
  'RESOLVED', 'CLOSED', 'CANCELLED',
]);

export const TicketPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const TicketRaisedBySchema = z.enum(['CUSTOMER', 'EMPLOYEE']);

export const CreateTicketSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(250),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: TicketPrioritySchema.optional().default('MEDIUM'),
  raisedBy: TicketRaisedBySchema.optional().default('EMPLOYEE'),
  raisedForCustomerId: z.string().optional(),
  departmentId: z.string().optional(),
  customerAssetId: z.string().optional(),
  assignedToUserId: z.string().optional(),
});

export const UpdateTicketStatusSchema = z.object({
  status: TicketStatusSchema,
  note: z.string().max(1000).optional(),
});

export const AssignTicketSchema = z.object({
  assignedToUserId: z.string().min(1, 'User ID is required'),
  departmentId: z.string().optional(),
  note: z.string().max(500).optional(),
});

export const AddTicketNoteSchema = z.object({
  note: z.string().min(1, 'Note cannot be empty').max(2000),
});

export const UpdateTicketPrioritySchema = z.object({
  priority: TicketPrioritySchema,
  note: z.string().max(500).optional(),
});

export const TicketListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  status: TicketStatusSchema.optional(),
  priority: TicketPrioritySchema.optional(),
  departmentId: z.string().uuid().optional(),
  assignedToUserId: z.string().uuid().optional(),
  raisedForCustomerId: z.string().uuid().optional(),
  isOverdue: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status', 'ticketNumber']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;
export type UpdateTicketStatusInput = z.infer<typeof UpdateTicketStatusSchema>;
export type AssignTicketInput = z.infer<typeof AssignTicketSchema>;
export type AddTicketNoteInput = z.infer<typeof AddTicketNoteSchema>;
export type UpdateTicketPriorityInput = z.infer<typeof UpdateTicketPrioritySchema>;
export type TicketListQueryInput = z.infer<typeof TicketListQuerySchema>;
