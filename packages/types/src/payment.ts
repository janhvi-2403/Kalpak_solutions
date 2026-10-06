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
  isMockMode?: boolean;
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
