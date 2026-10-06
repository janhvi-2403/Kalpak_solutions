import { z } from 'zod';

export const planTierSchema = z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE'], {
  errorMap: () => ({ message: 'Plan must be STARTER, PROFESSIONAL, or ENTERPRISE' }),
});

export const billingCycleSchema = z.enum(['MONTHLY', 'ANNUAL'], {
  errorMap: () => ({ message: 'Billing cycle must be MONTHLY or ANNUAL' }),
});

export const createPaymentOrderSchema = z.object({
  plan: planTierSchema,
  billingCycle: billingCycleSchema,
  gstin: z
    .string()
    .trim()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
      message: 'Invalid GSTIN format (e.g. 27ABCDE1234F1Z5)',
    })
    .optional()
    .or(z.literal('')),
  billingAddress: z
    .object({
      street: z.string().trim().max(200).optional(),
      city: z.string().trim().max(100).optional(),
      state: z.string().trim().max(100).optional(),
      pincode: z.string().trim().max(20).optional(),
      country: z.string().trim().max(100).optional(),
    })
    .optional(),
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the Terms of Service to proceed with subscription',
  }),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, 'Order ID is required'),
  razorpay_payment_id: z.string().min(1, 'Payment ID is required'),
  razorpay_signature: z.string().min(1, 'Payment signature is required'),
});

export type CreatePaymentOrderDto = z.infer<typeof createPaymentOrderSchema>;
export type VerifyPaymentDto = z.infer<typeof verifyPaymentSchema>;
