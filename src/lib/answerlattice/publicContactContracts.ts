import { z } from 'zod';

export const ANSWERLATTICE_PUBLIC_CONTACT_TOPICS = [
    'setup',
    'demo',
    'pricing',
    'partnership',
    'security',
    'other',
] as const;

const normalizeContactText = (value: string): string => (
    value.replace(/<[^>]*>/g, '').trim()
);

const requiredContactText = (minimum: number, maximum: number) => (
    z.string()
        .trim()
        .min(minimum)
        .max(maximum)
        .transform(normalizeContactText)
        .pipe(z.string().min(minimum).max(maximum))
);

const optionalContactText = (maximum: number) => (
    z.string()
        .trim()
        .max(maximum)
        .transform((value) => normalizeContactText(value) || null)
        .optional()
        .nullable()
);

const optionalHttpUrl = z.string()
    .trim()
    .max(240)
    .refine((value) => {
        try {
            const parsed = new URL(value);
            return parsed.protocol === 'https:' || parsed.protocol === 'http:';
        } catch {
            return false;
        }
    }, 'Product URL must use HTTP or HTTPS')
    .optional()
    .nullable();

export const AnswerlatticePublicContactRequestSchema = z.object({
    name: requiredContactText(2, 120),
    workEmail: z.string().trim().email().max(180).transform((value) => value.toLowerCase()),
    phoneNumber: optionalContactText(40),
    productUrl: optionalHttpUrl,
    helpTopic: z.enum(ANSWERLATTICE_PUBLIC_CONTACT_TOPICS),
    message: requiredContactText(10, 2000),
    consent: z.boolean().refine((value) => value === true),
    sourcePath: optionalContactText(240),
    website: z.string().max(500).optional().nullable(),
    captchaToken: z.string().max(2048).optional(),
}).strict();

export type AnswerlatticePublicContactRequest = z.infer<typeof AnswerlatticePublicContactRequestSchema>;
