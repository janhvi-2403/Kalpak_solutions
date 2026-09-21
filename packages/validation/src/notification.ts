import { z } from 'zod';

// ============================================================================
// Notification Zod Validation Schemas
// ============================================================================

export const NotificationTypeSchema = z.enum([
  'TICKET_CREATED',
  'TICKET_ASSIGNED',
  'STATUS_CHANGED',
  'NOTE_ADDED',
  'SLA_BREACH',
  'TICKET_RESOLVED',
  'TICKET_CLOSED',
]);

export const NotificationDeliveryChannelSchema = z.enum(['IN_APP', 'EMAIL', 'WHATSAPP']);

export const NotificationListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().optional(),
});

export const TestNotificationDispatchSchema = z.object({
  channel: NotificationDeliveryChannelSchema,
  recipient: z.string().min(1, 'Recipient is required'),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  link: z.string().optional(),
});

export type NotificationListQueryInput = z.infer<typeof NotificationListQuerySchema>;
export type TestNotificationDispatchInput = z.infer<typeof TestNotificationDispatchSchema>;
