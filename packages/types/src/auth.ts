import { TenantMembershipInfo } from './tenant';
import { SystemRole } from './enums';

export interface UserPrincipal {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  mfaEnabled: boolean;
  isSuperAdmin: boolean;
  emailVerified?: boolean;
}

export interface SessionData {
  sessionId: string;
  userId: string;
  activeTenantId: string | null;
  email: string;
  fullName: string;
  isSuperAdmin: boolean;
  roles: string[];
  permissions: string[];
  mfaVerified: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface AuthLoginResponse {
  user: UserPrincipal;
  activeTenantId: string | null;
  memberships: TenantMembershipInfo[];
  mfaRequired?: boolean;
  tenantSelectionRequired?: boolean;
  token?: string;
}

export interface RegisterOrganizationDto {
  // Organization Details
  companyName: string;
  slug: string;
  businessEmail?: string;
  phoneNumber?: string;
  country?: string;
  timezone?: string;
  // Administrator Details
  fullName: string;
  email: string;
  password: string;
}

export interface VerifyEmailDto {
  token: string;
}

export interface ResendVerificationDto {
  email: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface CreateInvitationDto {
  email: string;
  role: SystemRole;
  department?: string;
}

export interface AcceptInvitationDto {
  token: string;
  fullName: string;
  password: string;
}

export interface PublicInvitationInfo {
  email: string;
  role: string;
  department: string | null;
  tenantName: string;
  tenantSlug: string;
  isExpired: boolean;
}

export interface OnboardingState {
  completed: boolean;
  currentStep: number;
  profile?: {
    industry?: string;
    size?: string;
    address?: string;
    website?: string;
  };
  departments?: string[];
  invitedEmployees?: Array<{ email: string; role: string; department?: string }>;
  productsServices?: Array<{ name: string; category: string; description?: string }>;
  ticketPreferences?: {
    defaultPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    defaultSlaHours?: number;
    allowCustomerPortal?: boolean;
  };
  notificationPreferences?: {
    emailAlerts?: boolean;
    dailyDigest?: boolean;
  };
}
