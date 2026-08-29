import { z } from 'zod';

export const ANSWERLATTICE_EARLY_ACCESS_STAGES = [
    'planning',
    'building',
    'beta',
    'live',
] as const;

export const ANSWERLATTICE_EARLY_ACCESS_SUPPORT_AREAS = [
    'onboarding_setup',
    'billing_plans',
    'account_settings',
    'releases_changes',
    'technical_errors',
    'other',
] as const;

export const ANSWERLATTICE_EARLY_ACCESS_STATUSES = [
    'pending',
    'approved',
    'invited',
    'activated',
    'declined',
    'withdrawn',
] as const;

export type AnswerlatticeEarlyAccessStage = typeof ANSWERLATTICE_EARLY_ACCESS_STAGES[number];
export type AnswerlatticeEarlyAccessSupportArea = typeof ANSWERLATTICE_EARLY_ACCESS_SUPPORT_AREAS[number];
export type AnswerlatticeEarlyAccessStatus = typeof ANSWERLATTICE_EARLY_ACCESS_STATUSES[number];

const normalizeText = (value: string): string => (
    value
        .replace(/<[^>]*>/g, '')
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
);

const requiredText = (minimum: number, maximum: number) => z.string()
    .trim()
    .min(minimum)
    .max(maximum)
    .transform(normalizeText)
    .pipe(z.string().min(minimum).max(maximum));

const optionalText = (maximum: number) => z.string()
    .trim()
    .max(maximum)
    .transform((value) => normalizeText(value) || null)
    .optional()
    .nullable();

const productUrlSchema = z.string()
    .trim()
    .max(300)
    .refine((value) => {
        try {
            const parsed = new URL(value);
            return ['https:', 'http:'].includes(parsed.protocol)
                && !parsed.username
                && !parsed.password;
        } catch {
            return false;
        }
    }, 'Product URL must use HTTP or HTTPS');

export const AnswerlatticeEarlyAccessPublicRequestSchema = z.object({
    name: requiredText(2, 120),
    workEmail: z.string().trim().email().max(180).transform((value) => value.toLowerCase()),
    productUrl: productUrlSchema,
    productStage: z.enum(ANSWERLATTICE_EARLY_ACCESS_STAGES),
    supportArea: z.enum(ANSWERLATTICE_EARLY_ACCESS_SUPPORT_AREAS),
    supportQuestions: requiredText(10, 1600),
    featureIdea: optionalText(1200),
    consent: z.boolean().refine((value) => value === true),
    sourcePath: optionalText(240),
    website: z.string().max(500).optional().nullable(),
    captchaToken: z.string().max(2048).optional(),
}).strict();

export const AnswerlatticeEarlyAccessAdminQuerySchema = z.object({
    cursor: z.string().trim().min(1).max(160).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
    status: z.enum(ANSWERLATTICE_EARLY_ACCESS_STATUSES).optional(),
}).strict();

export const AnswerlatticeEarlyAccessAdminUpdateSchema = z.object({
    requestId: z.string().trim().min(20).max(160).regex(/^[A-Za-z0-9_-]+$/),
    status: z.enum(ANSWERLATTICE_EARLY_ACCESS_STATUSES),
    internalNotes: optionalText(2000),
}).strict();

export type AnswerlatticeEarlyAccessPublicRequest = z.infer<typeof AnswerlatticeEarlyAccessPublicRequestSchema>;
export type AnswerlatticeEarlyAccessAdminUpdate = z.infer<typeof AnswerlatticeEarlyAccessAdminUpdateSchema>;

export const ANSWERLATTICE_EARLY_ACCESS_STAGE_LABELS: Record<AnswerlatticeEarlyAccessStage, string> = {
    planning: 'Planning',
    building: 'Building',
    beta: 'Beta',
    live: 'Live',
};
export const ANSWERLATTICE_EARLY_ACCESS_SUPPORT_AREA_LABELS: Record<AnswerlatticeEarlyAccessSupportArea, string> = {
    onboarding_setup: 'Onboarding and setup',
    billing_plans: 'Billing and plans',
    account_settings: 'Accounts and settings',
    releases_changes: 'Releases and product changes',
    technical_errors: 'Technical errors',
    other: 'Something else',
};

export const ANSWERLATTICE_EARLY_ACCESS_STATUS_LABELS: Record<AnswerlatticeEarlyAccessStatus, string> = {
    pending: 'Pending review',
    approved: 'Approved',
    invited: 'Invited',
    activated: 'Activated',
    declined: 'Declined',
    withdrawn: 'Withdrawn',
};
