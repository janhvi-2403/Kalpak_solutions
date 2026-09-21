// ============================================================================
// Service Contracts, AMCs & Preventive Maintenance (PM) — Shared Contracts
// ============================================================================

export enum ContractTypeEnum {
  COMPREHENSIVE = 'COMPREHENSIVE',
  NON_COMPREHENSIVE = 'NON_COMPREHENSIVE',
  LABOR_ONLY = 'LABOR_ONLY',
}

export enum ContractStatusEnum {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
}

export enum PmFrequencyEnum {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  BI_ANNUAL = 'BI_ANNUAL',
  ANNUAL = 'ANNUAL',
}

export interface ContractAssetInfo {
  id: string;
  assetId: string;
  serialNumber: string;
  productName: string;
  modelNumber: string;
  location?: string | null;
}

export interface ServiceContractSummary {
  id: string;
  contractNumber: string;
  title: string;
  customerId: string;
  customerName: string;
  contractType: ContractTypeEnum;
  status: ContractStatusEnum;
  startDate: string;
  endDate: string;
  billingFrequency: string;
  totalAmount: number;
  coveredAssetsCount: number;
  activePmSchedulesCount: number;
  createdAt: string;
}

export interface ServiceContractDetail extends ServiceContractSummary {
  notes?: string | null;
  termsAndConditions?: string | null;
  coveredAssets: ContractAssetInfo[];
  pmSchedules: PmScheduleSummary[];
}

export interface PmScheduleSummary {
  id: string;
  contractId?: string | null;
  contractNumber?: string | null;
  assetId: string;
  assetName: string;
  assetSerialNumber: string;
  title: string;
  description?: string | null;
  frequency: PmFrequencyEnum;
  nextDueDate: string;
  lastServicedDate?: string | null;
  totalVisitsQuota: number;
  visitsCompletedCount: number;
  isActive: boolean;
}

export interface CreateServiceContractDto {
  customerId: string;
  contractNumber?: string;
  title: string;
  contractType: ContractTypeEnum;
  startDate: string;
  endDate: string;
  billingFrequency?: string;
  totalAmount?: number;
  notes?: string;
  termsAndConditions?: string;
  assetIds: string[];
}

export interface CreatePmScheduleDto {
  contractId?: string;
  assetId: string;
  departmentId?: string;
  title: string;
  description?: string;
  frequency: PmFrequencyEnum;
  nextDueDate: string;
  totalVisitsQuota?: number;
}

export interface TriggerPmVisitResponse {
  success: boolean;
  ticketId: string;
  ticketNumber: string;
  workOrderId?: string;
  workOrderNumber?: string;
  scheduleId: string;
  nextDueDate: string;
  message: string;
}

export interface ContractsDashboardStats {
  totalActiveContracts: number;
  expiringIn30DaysCount: number;
  upcomingPmVisitsThisMonth: number;
  totalContractValue: number;
}

export interface CustomerPortalContractsResponse {
  contracts: ServiceContractDetail[];
  pmSchedules: PmScheduleSummary[];
}

