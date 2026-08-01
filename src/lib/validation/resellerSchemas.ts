import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// Reseller Dashboard — Zod Validation Schemas
// @see __docs__/reseller-dashboard/reseller-dashboard_impl.md §4
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/reseller/onboard — Create store + subscription
 */
export const ResellerOnboardSchema = z.object({
    operationId: z.string().uuid(),
    businessName: z.string().trim().min(2, 'Business name must be at least 2 characters').max(100, 'Business name too long'),
    businessType: z.string().trim().min(2).max(50),
    ownerCountryCode: z.string().trim().max(8).optional(),
    ownerDialCode: z.string().trim().max(12).optional(),
    ownerPhone: z.string().trim().min(6, 'Phone number is required').max(40, 'Phone number too long'),
    ownerEmail: z.string().trim().email('Invalid email address').optional(),
    ownerPassword: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password too long'),
    pricingTier: z.enum(['FOUNDER_400', 'FOUNDER_500', 'STANDARD']),
    billingInterval: z.enum(['MONTH', 'YEAR']).optional().default('MONTH'),
    commitmentMonths: z.number().int().refine(v => [3, 6, 12].includes(v), 'Must be 3, 6, or 12').optional(),
    locationCount: z.number().int().min(1).max(30).optional().default(1),
    paymentMode: z.enum(['online', 'offline']),
    skipMenuUpload: z.boolean().optional().default(true),
}).strict();

export type ResellerOnboardInput = z.infer<typeof ResellerOnboardSchema>;

/**
 * POST /api/reseller/confirm-payment — Offline payment confirmation
 */
export const ResellerConfirmPaymentSchema = z.object({
    subscriptionId: z.string().min(1, 'Subscription ID required'),
    confirmed: z.literal(true),
}).strict();

export type ResellerConfirmPaymentInput = z.infer<typeof ResellerConfirmPaymentSchema>;

/**
 * POST /api/reseller/renew — Renew offline license
 */
export const ResellerRenewSchema = z.object({
    operationId: z.string().uuid(),
    storeId: z.number().int().positive(),
    tenantId: z.number().int().positive(),
    pricingTier: z.enum(['FOUNDER_400', 'FOUNDER_500', 'STANDARD']),
    durationMonths: z.number().int().refine(v => [3, 6, 12].includes(v), 'Must be 3, 6, or 12'),
    paymentMode: z.enum(['online', 'offline']),
}).strict();

export type ResellerRenewInput = z.infer<typeof ResellerRenewSchema>;

/**
 * POST /api/reseller/add-location-capacity — Record offline prepaid capacity
 * before a manual/reseller client creates another outlet.
 */
export const ResellerAddLocationCapacitySchema = z.object({
    operationId: z.string().uuid(),
    storeId: z.number().int().positive(),
    tenantId: z.number().int().positive(),
    locationCount: z.number().int().min(1).max(30).default(1),
}).strict();

export type ResellerAddLocationCapacityInput = z.infer<typeof ResellerAddLocationCapacitySchema>;
