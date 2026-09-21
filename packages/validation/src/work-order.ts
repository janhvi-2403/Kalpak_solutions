import { z } from 'zod';

// ============================================================================
// Work Order & Checklist Zod Schemas
// ============================================================================

export const WorkOrderStatusSchema = z.enum([
  'SCHEDULED',
  'DISPATCHED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const ChecklistStatusSchema = z.enum([
  'PENDING',
  'PASSED',
  'FAILED',
  'NOT_APPLICABLE',
]);

export const CreateWorkOrderSchema = z.object({
  ticketId: z.string().uuid('Invalid ticket ID'),
  assignedTechnicianId: z.string().uuid('Invalid technician ID'),
  scheduledDate: z.string().datetime().or(z.string().min(10)),
  serviceType: z.string().max(50).default('ON_SITE_REPAIR'),
  technicianNotes: z.string().optional(),
  checklistTemplates: z
    .array(
      z.object({
        itemCode: z.string().min(1),
        taskTitle: z.string().min(1),
        description: z.string().optional(),
        targetValue: z.string().optional(),
      }),
    )
    .optional(),
});

export const UpdateChecklistItemSchema = z.object({
  status: ChecklistStatusSchema,
  readingValue: z.string().max(100).optional(),
  remarks: z.string().optional(),
});

export const CompleteWorkOrderSchema = z.object({
  customerSignerName: z.string().min(2, 'Customer signer name is required'),
  customerSignerTitle: z.string().min(2, 'Customer signer designation is required'),
  customerSignature: z.string().min(5, 'Customer digital signature is required'),
  customerRating: z.number().int().min(1).max(5).optional(),
  customerFeedback: z.string().optional(),
  resolutionSummary: z.string().optional(),
  autoResolveTicket: z.boolean().default(true),
});

export const WorkOrderListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  ticketId: z.string().uuid().optional(),
  status: WorkOrderStatusSchema.optional(),
  assignedTechnicianId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
});

export type CreateWorkOrderInput = z.infer<typeof CreateWorkOrderSchema>;
export type UpdateChecklistItemInput = z.infer<typeof UpdateChecklistItemSchema>;
export type CompleteWorkOrderInput = z.infer<typeof CompleteWorkOrderSchema>;
export type WorkOrderListQueryInput = z.infer<typeof WorkOrderListQuerySchema>;
