// ============================================================================
// Customer Self-Service Portal — Shared TypeScript Contracts
// ============================================================================

import { TicketPriorityEnum, TicketStatusEnum } from './ticket';

export interface PortalCustomerProfile {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
}

export interface PortalUserProfile {
  id: string;
  email: string;
  fullName: string;
}

export interface PortalTenantProfile {
  id: string;
  name: string;
  slug: string;
}

export interface PortalProfile {
  customer: PortalCustomerProfile;
  user: PortalUserProfile;
  tenant: PortalTenantProfile;
}

export interface PortalTicketSummary {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: TicketStatusEnum;
  priority: TicketPriorityEnum;
  customerAssetId?: string | null;
  assetName?: string | null;
  assetSerialNumber?: string | null;
  assignedToName?: string | null;
  createdAt: string;
  updatedAt: string;
  dueAt?: string | null;
  resolvedAt?: string | null;
}

export interface PortalTicketTimelineEvent {
  id: string;
  eventType: string;
  note?: string | null;
  createdAt: string;
  actorName?: string | null;
}

export interface PortalWorkOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  scheduledDate?: string | null;
  technicianName?: string | null;
  summary?: string | null;
}

export interface PortalPartBillingItem {
  id: string;
  partName: string;
  partNumber: string;
  quantity: number;
  unitPrice: number;
  billedAmount: number;
  isWarrantyCovered: boolean;
}

export interface PortalTicketBillingSummary {
  items: PortalPartBillingItem[];
  subtotal: number;
  warrantyDiscount: number;
  netBillable: number;
}

export interface PortalTicketDetail extends PortalTicketSummary {
  timeline: PortalTicketTimelineEvent[];
  workOrders: PortalWorkOrderSummary[];
  billing: PortalTicketBillingSummary;
}

export interface PortalAssetProduct {
  id: string;
  name: string;
  modelNumber: string;
  category: string;
  hasWarranty: boolean;
}

export interface PortalAsset {
  id: string;
  serialNumber: string;
  status: string;
  installationDate?: string | null;
  warrantyEndDate?: string | null;
  location?: string | null;
  product: PortalAssetProduct;
  ticketCount?: number;
}

export interface RaisePortalTicketDto {
  title: string;
  description: string;
  priority?: TicketPriorityEnum;
  customerAssetId?: string;
}

export interface PortalDashboardStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  totalAssets: number;
}

export interface EnablePortalAccessResponse {
  success: boolean;
  customerId: string;
  userId: string;
  email: string;
  temporaryPassword?: string;
  message: string;
}
