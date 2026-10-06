import { SupportEmailVerificationStatus } from './enums';

export interface SupportEmailDto {
  id: string;
  tenantId: string;
  email: string;
  displayName: string;
  isDefault: boolean;
  isActive: boolean;
  verificationStatus: SupportEmailVerificationStatus;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupportEmailInput {
  email: string;
  displayName: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UpdateSupportEmailInput {
  email?: string;
  displayName?: string;
  isDefault?: boolean;
  isActive?: boolean;
}
