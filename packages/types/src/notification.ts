// ============================================================================
// Multi-Channel Notifications & SLA Alerts — Shared Contracts
// ============================================================================

export enum NotificationType {
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_ASSIGNED = 'TICKET_ASSIGNED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  NOTE_ADDED = 'NOTE_ADDED',
  SLA_BREACH = 'SLA_BREACH',
  TICKET_RESOLVED = 'TICKET_RESOLVED',
  TICKET_CLOSED = 'TICKET_CLOSED',
}

export enum NotificationDeliveryChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
}

export interface NotificationDto {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  channel: NotificationDeliveryChannel;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  readAt?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationCountDto {
  unreadCount: number;
}

export interface NotificationListQueryDto {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
}

export interface PaginatedNotificationsDto {
  data: NotificationDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  unreadCount: number;
}
