import { z } from 'zod';
import { emailSchema, passwordSchema, uuidSchema } from './common';

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  tenantSlug: z.string().trim().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const mfaVerifySchema = z.object({
  mfaSessionToken: z.string().min(1, 'MFA session token is required'),
  code: z.string().regex(/^\d{6}$/, 'MFA code must be exactly 6 digits'),
});

export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;

export const switchTenantSchema = z.object({
  tenantId: uuidSchema,
});

export type SwitchTenantInput = z.infer<typeof switchTenantSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const registerOrganizationSchema = z.object({
  companyName: z.string().trim().min(2, 'Company name must be at least 2 characters').max(150),
  slug: z
    .string()
    .trim()
    .min(3, 'Organization slug must be at least 3 characters')
    .max(60, 'Organization slug must not exceed 60 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must only contain lowercase alphanumeric characters and hyphens'),
  businessEmail: emailSchema.optional(),
  phoneNumber: z.string().trim().max(30).optional(),
  country: z.string().trim().max(100).optional(),
  timezone: z.string().trim().max(50).optional(),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(150),
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterOrganizationInput = z.infer<typeof registerOrganizationSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(16, 'Verification token is invalid or missing'),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(16, 'Reset token is invalid or missing'),
  password: passwordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const createInvitationSchema = z.object({
  email: emailSchema,
  role: z.enum(['CLIENT_ADMIN', 'DEPARTMENT_ADMIN', 'SUPPORT_EMPLOYEE', 'CUSTOMER']),
  department: z.string().trim().max(100).optional(),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

export const acceptInvitationSchema = z.object({
  token: z.string().min(16, 'Invitation token is invalid or missing'),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(150),
  password: passwordSchema,
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

export const onboardingUpdateSchema = z.object({
  currentStep: z.number().int().min(1).max(9).optional(),
  completed: z.boolean().optional(),
  profile: z
    .object({
      industry: z.string().trim().max(100).optional(),
      size: z.string().trim().max(50).optional(),
      address: z.string().trim().max(255).optional(),
      website: z.string().trim().max(255).optional(),
    })
    .optional(),
  departments: z.array(z.string().trim().min(1).max(100)).optional(),
  invitedEmployees: z
    .array(
      z.object({
        email: emailSchema,
        role: z.string().trim(),
        department: z.string().trim().optional(),
      })
    )
    .optional(),
  productsServices: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        category: z.string().trim(),
        description: z.string().trim().optional(),
      })
    )
    .optional(),
  ticketPreferences: z
    .object({
      defaultPriority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
      defaultSlaHours: z.number().int().positive().optional(),
      allowCustomerPortal: z.boolean().optional(),
    })
    .optional(),
  notificationPreferences: z
    .object({
      emailAlerts: z.boolean().optional(),
      dailyDigest: z.boolean().optional(),
    })
    .optional(),
});

export type OnboardingUpdateInput = z.infer<typeof onboardingUpdateSchema>;
