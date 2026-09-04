import { z } from 'zod';

export const optionalStaffEmailSchema = z.string()
    .trim()
    .toLowerCase()
    .max(254)
    .optional()
    .default('')
    .refine(
        (value) => !value || z.string().email().safeParse(value).success,
        'Invalid email address',
    );

export const isValidOptionalStaffEmail = (value: string): boolean => (
    optionalStaffEmailSchema.safeParse(value).success
);
