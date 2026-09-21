// ============================================================================
// Field Service & Work Orders — Shared Type Contracts
// ============================================================================

export enum WorkOrderStatus {
  SCHEDULED = 'SCHEDULED',
  DISPATCHED = 'DISPATCHED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ChecklistStatus {
  PENDING = 'PENDING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export interface WorkOrderChecklistItemDto {
  id: string;
  tenantId: string;
  workOrderId: string;
  itemCode: string;
  taskTitle: string;
  description?: string | null;
  status: ChecklistStatus;
  readingValue?: string | null;
  targetValue?: string | null;
  remarks?: string | null;
  sortOrder: number;
  verifiedByUserId?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderDto {
  id: string;
  tenantId: string;
  orderNumber: string;
  ticketId: string;
  assignedTechnicianId: string;
  customerId: string;
  customerAssetId?: string | null;
  status: WorkOrderStatus;
  serviceType: string;
  scheduledDate: string;
  workStartedAt?: string | null;
  workCompletedAt?: string | null;
  technicianNotes?: string | null;
  resolutionSummary?: string | null;
  customerSignerName?: string | null;
  customerSignerTitle?: string | null;
  customerSignature?: string | null;
  customerRating?: number | null;
  customerFeedback?: string | null;
  isSigned: boolean;
  signedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTechnician?: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber?: string | null;
  };
  customer?: {
    id: string;
    companyName: string;
    contactPerson: string;
    phone: string;
    email: string;
  };
  customerAsset?: {
    id: string;
    serialNumber: string;
    product?: {
      name: string;
      modelNumber: string;
    };
  } | null;
  checklistItems?: WorkOrderChecklistItemDto[];
}

export interface CreateWorkOrderDto {
  ticketId: string;
  assignedTechnicianId: string;
  scheduledDate: string;
  serviceType?: string;
  technicianNotes?: string;
  checklistTemplates?: Array<{
    itemCode: string;
    taskTitle: string;
    description?: string;
    targetValue?: string;
  }>;
}

export interface UpdateChecklistItemDto {
  status: ChecklistStatus;
  readingValue?: string;
  remarks?: string;
}

export interface CompleteWorkOrderDto {
  customerSignerName: string;
  customerSignerTitle: string;
  customerSignature: string; // digital canvas data URL or confirmation token
  customerRating?: number; // 1 to 5
  customerFeedback?: string;
  resolutionSummary?: string;
  autoResolveTicket?: boolean;
}

export interface WorkOrderListQueryDto {
  page?: number;
  pageSize?: number;
  ticketId?: string;
  status?: WorkOrderStatus;
  assignedTechnicianId?: string;
  customerId?: string;
}
