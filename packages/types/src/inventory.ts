// ==============================================================================
// Kalpak Solutions - Shared Inventory & Spare Parts Contracts
// ==============================================================================

export enum InventoryTransactionType {
  PURCHASE_RECEIPT = 'PURCHASE_RECEIPT',
  WORK_ORDER_CONSUMPTION = 'WORK_ORDER_CONSUMPTION',
  TICKET_CONSUMPTION = 'TICKET_CONSUMPTION',
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
  TRANSFER = 'TRANSFER',
  RETURN = 'RETURN',
}

export interface SparePartDto {
  id: string;
  tenantId: string;
  partNumber: string;
  name: string;
  description?: string | null;
  category: string;
  unitOfMeasure: string;
  unitPrice: number;
  costPrice?: number | null;
  minStockAlert: number;
  compatibleModels: string[];
  isActive: boolean;
  totalStock?: number;
  isLowStock?: boolean;
  inventory?: PartInventoryDto[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateSparePartDto {
  partNumber: string;
  name: string;
  description?: string;
  category: string;
  unitOfMeasure?: string;
  unitPrice: number;
  costPrice?: number;
  minStockAlert?: number;
  compatibleModels?: string[];
  initialStock?: number;
  initialLocationId?: string;
}

export interface UpdateSparePartDto {
  name?: string;
  description?: string;
  category?: string;
  unitOfMeasure?: string;
  unitPrice?: number;
  costPrice?: number;
  minStockAlert?: number;
  compatibleModels?: string[];
  isActive?: boolean;
}

export interface StorageLocationDto {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  type: string;
  address?: string | null;
  isActive: boolean;
  totalItems?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateStorageLocationDto {
  name: string;
  code: string;
  type?: string;
  address?: string;
}

export interface PartInventoryDto {
  id: string;
  tenantId: string;
  partId: string;
  locationId: string;
  quantityOnHand: number;
  quantityReserved: number;
  binLocation?: string | null;
  lastRestockedAt?: Date | string | null;
  part?: SparePartDto;
  location?: StorageLocationDto;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AdjustStockDto {
  partId: string;
  locationId: string;
  transactionType: InventoryTransactionType;
  quantityDelta: number;
  unitCost?: number;
  notes?: string;
}

export interface TransferStockDto {
  partId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  notes?: string;
}

export interface InventorySummaryDto {
  totalSkus: number;
  totalUnitsOnHand: number;
  totalValuation: number;
  lowStockCount: number;
  storageLocationsCount: number;
}

export interface TicketPartConsumptionDto {
  id: string;
  tenantId: string;
  ticketId: string;
  workOrderId?: string | null;
  partId: string;
  locationId?: string | null;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  isWarrantyCovered: boolean;
  consumedByUserId?: string | null;
  consumedAt: Date | string;
  notes?: string | null;
  part?: SparePartDto;
  location?: StorageLocationDto;
  consumedByUser?: {
    id: string;
    fullName: string;
    email: string;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ConsumePartDto {
  ticketId: string;
  workOrderId?: string;
  partId: string;
  locationId?: string;
  quantity: number;
  unitPrice?: number;
  isWarrantyCovered?: boolean;
  notes?: string;
}

export interface PartsBillingSummaryDto {
  consumptions: TicketPartConsumptionDto[];
  subtotal: number;
  warrantyDiscount: number;
  totalBillable: number;
  partsCount: number;
}
