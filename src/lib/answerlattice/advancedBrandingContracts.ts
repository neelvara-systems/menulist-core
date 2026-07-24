import {
    ANSWERLATTICE_DEFAULT_BRANDING,
    type AnswerlatticeBrandingConfig,
} from '@type/answerlattice';
import { z } from 'zod';

const HexColorSchema = z.string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .transform(value => value.toLowerCase());

// Keep these policies expressible in Firestore Rules so an acknowledged direct
// client write cannot persist a profile that the browser later rejects.
const HttpsUrlPattern = /^https:\/\/(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)*[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:[/?][A-Za-z0-9._~!$&()*+,;=:@%/?-]*)?$/;
const SupportEmailPattern = /^[A-Za-z0-9!#$%&*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

const HttpsUrlSchema = z.string()
    .trim()
    .max(500)
    .superRefine((value, context) => {
        if (!HttpsUrlPattern.test(value)) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Use a valid HTTPS URL without credentials, fragments, ports, or whitespace.',
            });
            return;
        }
        try {
            const parsed = new URL(value);
            if (
                parsed.protocol !== 'https:'
                || parsed.username
                || parsed.password
                || parsed.hash
            ) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Use an HTTPS URL without credentials or a fragment.',
                });
            }
        } catch {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Use a valid HTTPS URL.',
            });
        }
    });

export const AnswerlatticeAdvancedBrandingSchema = z.object({
    companyName: z.string().trim().min(1).max(100),
    logoUrl: HttpsUrlSchema.optional(),
    faviconUrl: HttpsUrlSchema.optional(),
    primaryColor: HexColorSchema,
    accentColor: HexColorSchema.optional(),
    backgroundColor: HexColorSchema.optional(),
    textColor: HexColorSchema.optional(),
    headerBackground: HexColorSchema.optional(),
    headerTextColor: HexColorSchema.optional(),
    poweredByVisible: z.boolean(),
    supportEmail: z.string().trim().max(160).regex(SupportEmailPattern).optional(),
    privacyPolicyUrl: HttpsUrlSchema.optional(),
    termsUrl: HttpsUrlSchema.optional(),
}).strict();

export function isAnswerlatticeAdvancedBrandingHttpsUrl(value: unknown): value is string {
    return HttpsUrlSchema.safeParse(value).success;
}

const removeUndefinedFields = (
    value: Record<string, unknown>,
): AnswerlatticeBrandingConfig => {
    if (
        typeof value.companyName !== 'string'
        || typeof value.primaryColor !== 'string'
        || typeof value.poweredByVisible !== 'boolean'
    ) {
        throw new TypeError('Answerlattice branding profile is incomplete.');
    }

    const optionalText = (field: keyof AnswerlatticeBrandingConfig) => (
        typeof value[field] === 'string' && value[field]
            ? value[field] as string
            : undefined
    );

    return {
        companyName: value.companyName,
        primaryColor: value.primaryColor,
        poweredByVisible: value.poweredByVisible,
        ...(optionalText('logoUrl') ? { logoUrl: optionalText('logoUrl') } : {}),
        ...(optionalText('faviconUrl') ? { faviconUrl: optionalText('faviconUrl') } : {}),
        ...(optionalText('accentColor') ? { accentColor: optionalText('accentColor') } : {}),
        ...(optionalText('backgroundColor') ? { backgroundColor: optionalText('backgroundColor') } : {}),
        ...(optionalText('textColor') ? { textColor: optionalText('textColor') } : {}),
        ...(optionalText('headerBackground') ? { headerBackground: optionalText('headerBackground') } : {}),
        ...(optionalText('headerTextColor') ? { headerTextColor: optionalText('headerTextColor') } : {}),
        ...(optionalText('supportEmail') ? { supportEmail: optionalText('supportEmail') } : {}),
        ...(optionalText('privacyPolicyUrl') ? { privacyPolicyUrl: optionalText('privacyPolicyUrl') } : {}),
        ...(optionalText('termsUrl') ? { termsUrl: optionalText('termsUrl') } : {}),
    };
};

export function parseAnswerlatticeAdvancedBranding(
    value: unknown,
): AnswerlatticeBrandingConfig {
    return removeUndefinedFields(AnswerlatticeAdvancedBrandingSchema.parse(value));
}

export function normalizeStoredAnswerlatticeAdvancedBranding(
    value: unknown,
): AnswerlatticeBrandingConfig {
    const parsed = AnswerlatticeAdvancedBrandingSchema.safeParse(value);
    return parsed.success
        ? removeUndefinedFields(parsed.data)
        : { ...ANSWERLATTICE_DEFAULT_BRANDING };
}
