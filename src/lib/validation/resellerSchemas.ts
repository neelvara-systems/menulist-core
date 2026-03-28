import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// Reseller Dashboard — Zod Validation Schemas
// @see __docs__/reseller-dashboard/reseller-dashboard_impl.md §4
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/reseller/onboard — Create store + subscription
 */
export const ResellerOnboardSchema = z.object({
    businessName: z.string().min(2, 'Business name must be at least 2 characters').max(100, 'Business name too long'),
    businessType: z.string().min(2).max(50),
    ownerPhone: z.string().min(10, 'Phone number must be at least 10 digits').max(15, 'Phone number too long'),
    ownerEmail: z.string().email('Invalid email address').optional(),
    pricingTier: z.enum(['FOUNDER_400', 'FOUNDER_500', 'STANDARD']),
    billingInterval: z.enum(['MONTH', 'YEAR']).optional().default('MONTH'),
    commitmentMonths: z.coerce.number().refine(v => [3, 6, 12].includes(v), 'Must be 3, 6, or 12').optional(),
    paymentMode: z.enum(['online', 'offline']),
    skipMenuUpload: z.boolean().optional().default(true),
});

export type ResellerOnboardInput = z.infer<typeof ResellerOnboardSchema>;

/**
 * POST /api/reseller/confirm-payment — Offline payment confirmation
 */
export const ResellerConfirmPaymentSchema = z.object({
    subscriptionId: z.string().min(1, 'Subscription ID required'),
    confirmed: z.literal(true),
});

export type ResellerConfirmPaymentInput = z.infer<typeof ResellerConfirmPaymentSchema>;

/**
 * POST /api/reseller/renew — Renew offline license
 */
export const ResellerRenewSchema = z.object({
    storeId: z.coerce.number().int().positive(),
    tenantId: z.coerce.number().int().positive(),
    pricingTier: z.enum(['FOUNDER_400', 'FOUNDER_500', 'STANDARD']),
    durationMonths: z.coerce.number().refine(v => [3, 6, 12].includes(v), 'Must be 3, 6, or 12'),
    paymentMode: z.enum(['online', 'offline']),
});

export type ResellerRenewInput = z.infer<typeof ResellerRenewSchema>;
