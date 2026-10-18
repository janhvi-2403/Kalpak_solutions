import { PlanTier } from '@kalpak/types';

export interface PlanDetails {
  key: PlanTier;
  code: string;
  name: string;
  tagline: string;
  badge?: string;
  isPopular?: boolean;
  description: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  annualTotalPrice: number;
  discountPercent: number;
  maxTechnicians: number;
  maxTechniciansText: string;
  features: string[];
}

export const ALL_PLANS: Record<PlanTier, PlanDetails> = {
  STARTER: {
    key: 'STARTER',
    code: 'starter',
    name: 'Starter Plan',
    tagline: 'Core Service Management',
    badge: 'Starter Friendly',
    description: 'Perfect for small teams and workshops establishing structured field service workflows.',
    monthlyPrice: 2999,
    annualMonthlyPrice: 2399,
    annualTotalPrice: 28788,
    discountPercent: 20,
    maxTechnicians: 5,
    maxTechniciansText: 'Up to 5 Technicians',
    features: [
      'Up to 5 Technicians / Staff',
      'Unlimited Tickets & Service Calls',
      'Customer Profiles & Equipment History',
      'Centralized Status & SLA Tracking',
      'Standard SLA Escalation Rules',
      '2FA Security & Audit Logs',
      'Email Alerts & Real-Time Notifications',
    ],
  },
  PROFESSIONAL: {
    key: 'PROFESSIONAL',
    code: 'professional',
    name: 'Professional Plan',
    tagline: 'Automated Routing & Scale',
    badge: 'Most Popular',
    isPopular: true,
    description: 'Ideal for growing service networks needing automated routing and precision SLA control.',
    monthlyPrice: 6999,
    annualMonthlyPrice: 5599,
    annualTotalPrice: 67188,
    discountPercent: 20,
    maxTechnicians: 25,
    maxTechniciansText: 'Up to 25 Technicians',
    features: [
      'Up to 25 Technicians / Staff',
      'Everything in Starter Plan',
      'Automatic Skill & Dept Ticket Routing',
      'Technician Workload Balancing & Aging Alerts',
      'Multi-Tier SLA Escalations & Alerts',
      'Department-Level Analytics & Reports',
      'Priority Email & Chat Support',
    ],
  },
  ENTERPRISE: {
    key: 'ENTERPRISE',
    code: 'enterprise',
    name: 'Enterprise Plan',
    tagline: 'Enterprise Fleet & Multi-Org',
    badge: 'Maximum Scale',
    description: 'For large enterprises and multi-location field operations requiring dedicated scale.',
    monthlyPrice: 14999,
    annualMonthlyPrice: 11999,
    annualTotalPrice: 143988,
    discountPercent: 20,
    maxTechnicians: 9999,
    maxTechniciansText: 'Unlimited Technicians',
    features: [
      'Unlimited Technicians & Fleet',
      'Everything in Professional Plan',
      'Multi-Location & Multi-Org Hierarchy',
      'Custom ERP, Webhooks & REST API Integrations',
      'Dedicated Account Manager & SLA Guarantee',
      'Custom Role & Permission Matrix',
      '24/7 Dedicated Priority Phone Support',
    ],
  },
};

export function getPlanDetails(tier?: string | null): PlanDetails {
  const normalized = (tier || 'STARTER').toUpperCase();
  if (normalized === 'PROFESSIONAL') return ALL_PLANS.PROFESSIONAL;
  if (normalized === 'ENTERPRISE') return ALL_PLANS.ENTERPRISE;
  return ALL_PLANS.STARTER;
}
