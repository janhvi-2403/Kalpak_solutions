export type PlanTier = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
export type BillingCycle = 'MONTHLY' | 'ANNUAL';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'TRIAL' | 'PAST_DUE';
export type PaymentStatus = 'CREATED' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';

export interface PlanPricing {
  plan: PlanTier;
  monthlyPrice: number; // in INR
  annualMonthlyPrice: number; // in INR per month when billed annually
  annualTotalPrice: number; // in INR for full year
  discountPercent: number;
  maxTechnicians: number;
  features: string[];
}

export interface CreatePaymentOrderRequest {
  plan: PlanTier;
  billingCycle: BillingCycle;
  gstin?: string;
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
}

export interface CreatePaymentOrderResponse {
  orderId: string;
  amount: number; // in paise
  amountInRupees: number;
  baseAmount: number;
  gstAmount: number;
  currency: string;
  keyId: string;
  plan: PlanTier;
  billingCycle: BillingCycle;
  companyName: string;
  customerEmail: string;
  customerPhone?: string;
}

export interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  subscriptionId: string;
  plan: PlanTier;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  startsAt: string;
  endsAt: string;
  redirectUrl: string;
}

export interface CurrentSubscriptionResponse {
  hasActiveSubscription: boolean;
  subscription: {
    id: string;
    plan: PlanTier;
    billingCycle: BillingCycle;
    status: SubscriptionStatus;
    startsAt: string;
    endsAt: string;
    amount: number;
    currency: string;
  } | null;
  policy: {
    maxUsersQuota: number;
    platformAccess: string;
    allowCustomerToRaise: boolean;
  } | null;
}

export type PlanStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED';

export interface PlanLimits {
  maxUsers: number | 'Unlimited';
  maxDepartments: number | 'Unlimited';
  maxTicketsMonthly: number | 'Unlimited';
  storageGb: number | 'Unlimited';
  maxIntegrations: number | 'Unlimited';
}

export interface PlanFeatures {
  ticketManagement: boolean;
  customerPortal: boolean;
  manualAssignment: boolean;
  autoAssignment: boolean;
  workloadBalancing: boolean;
  employeeOnBehalf: boolean;
  ticketAgingAlerts: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  whatsappNotifications: boolean;
  mobileAccess: boolean;
  basicReports: boolean;
  advancedReports: boolean;
  apiIntegration: boolean;
  bulkImportExport: boolean;
  customWorkflows: boolean;
  customSla: boolean;
  multiLocation: boolean;
  ssoSaml: boolean;
  dedicatedManager: boolean;
  slaUptime999: boolean;
  [key: string]: boolean | string | undefined;
}

export interface PlanDefinition {
  id: string;
  code: string;
  name: string;
  badge?: string;
  description?: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  annualTotalPrice: number;
  discountPercent: number;
  currency: string;
  billingIntervals?: ('MONTHLY' | 'ANNUAL')[];
  trialDays: number;
  isFreeTrialAllowed: boolean;
  effectiveDate?: string;
  status: PlanStatus;
  isRecommended: boolean;
  displayOrder: number;
  limits: PlanLimits;
  features: PlanFeatures;
  highlights: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePlanRequest {
  code: string;
  name: string;
  badge?: string;
  description?: string;
  monthlyPrice: number;
  annualMonthlyPrice?: number;
  annualTotalPrice?: number;
  discountPercent?: number;
  currency?: string;
  trialDays?: number;
  isFreeTrialAllowed?: boolean;
  status?: PlanStatus;
  isRecommended?: boolean;
  displayOrder?: number;
  limits?: Partial<PlanLimits>;
  features?: Partial<PlanFeatures>;
  highlights?: string[];
}

export interface UpdatePlanRequest extends Partial<CreatePlanRequest> {}
