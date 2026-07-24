import {
    ANSWERLATTICE_DEFAULT_BUSINESS_DAY_END_TIME,
    ANSWERLATTICE_DEFAULT_TIME_ZONE,
    isValidAnswerlatticeTimeZone,
    normalizeAnswerlatticeBusinessDayEndTime,
    normalizeAnswerlatticeTimeZone,
} from './schedulerSettings';
import { z } from 'zod';

export const ANSWERLATTICE_WORKSPACE_BILLING_MODELS = [
    'subscription',
    'usage',
    'one_time',
    'not_sure',
] as const;

export const ANSWERLATTICE_WORKSPACE_PROFILE_REVISION_FIELD = 'answerlatticeWorkspaceProfileRevision';
export const ANSWERLATTICE_WORKSPACE_PROFILE_MAX_SURFACES = 8;

export const isSafeAnswerlatticeProductUrl = (value: string): boolean => {
    try {
        const parsed = new URL(value);
        return (parsed.protocol === 'https:' || parsed.protocol === 'http:')
            && parsed.username === ''
            && parsed.password === ''
            && parsed.hostname.length > 0;
    } catch {
        return false;
    }
};

export const isValidAnswerlatticeSupportEmail = (value: string): boolean => (
    value.length <= 160
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
);

const ProductUrlSchema = z.string().trim().max(300).refine(
    value => value === '' || isSafeAnswerlatticeProductUrl(value),
    { message: 'Product URL must be an HTTP or HTTPS URL without credentials.' },
);

const SupportEmailSchema = z.string().trim().max(160).refine(
    value => value === '' || isValidAnswerlatticeSupportEmail(value),
    { message: 'Invalid support email.' },
);

const TimeZoneSchema = z.string()
    .trim()
    .min(1)
    .max(80)
    .refine(isValidAnswerlatticeTimeZone, { message: 'Invalid IANA timezone.' });

const BusinessDayEndTimeSchema = z.string()
    .trim()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/);

const PrimarySurfacesSchema = z.array(
    z.string().trim().min(1).max(80),
).max(ANSWERLATTICE_WORKSPACE_PROFILE_MAX_SURFACES);

export const AnswerlatticeWorkspaceProfileSchema = z.object({
    productName: z.string().trim().min(1).max(120),
    productUrl: ProductUrlSchema,
    supportEmail: SupportEmailSchema,
    billingModel: z.enum(ANSWERLATTICE_WORKSPACE_BILLING_MODELS),
    primarySurfaces: PrimarySurfacesSchema,
    timeZone: TimeZoneSchema,
    businessDayEndTime: BusinessDayEndTimeSchema,
}).strict();

export const AnswerlatticeWorkspaceProfileSaveSchema = AnswerlatticeWorkspaceProfileSchema.extend({
    expectedRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
}).strict();

export const AnswerlatticeWorkspaceProfileResponseSchema = z.object({
    profile: AnswerlatticeWorkspaceProfileSchema,
    revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
}).strict();

export type AnswerlatticeWorkspaceProfile = {
    productName: string;
    productUrl: string;
    supportEmail: string;
    billingModel: typeof ANSWERLATTICE_WORKSPACE_BILLING_MODELS[number];
    primarySurfaces: string[];
    timeZone: string;
    businessDayEndTime: string;
};

export type AnswerlatticeWorkspaceProfileSave = AnswerlatticeWorkspaceProfile & {
    expectedRevision: number;
};

export type AnswerlatticeWorkspaceProfileResponse = {
    profile: AnswerlatticeWorkspaceProfile;
    revision: number;
};

export const parseAnswerlatticeWorkspaceProfile = (
    value: unknown,
): AnswerlatticeWorkspaceProfile => (
    AnswerlatticeWorkspaceProfileSchema.parse(value) as AnswerlatticeWorkspaceProfile
);

export const parseAnswerlatticeWorkspaceProfileSave = (
    value: unknown,
): AnswerlatticeWorkspaceProfileSave => (
    AnswerlatticeWorkspaceProfileSaveSchema.parse(value) as AnswerlatticeWorkspaceProfileSave
);

export const parseAnswerlatticeWorkspaceProfileResponse = (
    value: unknown,
): AnswerlatticeWorkspaceProfileResponse => (
    AnswerlatticeWorkspaceProfileResponseSchema.parse(value) as AnswerlatticeWorkspaceProfileResponse
);

export const normalizeAnswerlatticeWorkspaceProfileRevision = (value: unknown): number => (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
        ? value
        : 0
);

export const normalizeAnswerlatticePrimarySurfaces = (values: unknown): string[] => {
    if (!Array.isArray(values)) return [];
    return Array.from(new Set(
        values
            .filter((value): value is string => typeof value === 'string')
            .map(value => value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 80))
            .filter(Boolean),
    )).slice(0, ANSWERLATTICE_WORKSPACE_PROFILE_MAX_SURFACES);
};

const normalizePersistedString = (value: unknown, maxLength: number): string => (
    typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
);

const firstPersistedString = (values: unknown[], maxLength: number): string => {
    for (const value of values) {
        const normalized = normalizePersistedString(value, maxLength);
        if (normalized) return normalized;
    }
    return '';
};

export const buildAnswerlatticeWorkspaceProfileFromStore = (
    storeData: Record<string, unknown>,
): AnswerlatticeWorkspaceProfile => {
    const productName = firstPersistedString(
        [storeData.productName, storeData.name, storeData.companyName],
        120,
    );
    const productUrlCandidate = normalizePersistedString(storeData.productUrl, 300);
    const supportEmailCandidate = normalizePersistedString(storeData.supportEmail, 160);
    const billingModelCandidate = normalizePersistedString(storeData.billingModel, 40);

    const productUrl = productUrlCandidate && isSafeAnswerlatticeProductUrl(productUrlCandidate)
        ? productUrlCandidate
        : '';
    const supportEmail = SupportEmailSchema.safeParse(supportEmailCandidate).success
        ? supportEmailCandidate
        : '';
    const billingModel = ANSWERLATTICE_WORKSPACE_BILLING_MODELS.includes(
        billingModelCandidate as typeof ANSWERLATTICE_WORKSPACE_BILLING_MODELS[number],
    )
        ? billingModelCandidate as typeof ANSWERLATTICE_WORKSPACE_BILLING_MODELS[number]
        : 'subscription';

    return {
        productName,
        productUrl,
        supportEmail,
        billingModel,
        primarySurfaces: normalizeAnswerlatticePrimarySurfaces(storeData.primarySurfaces),
        timeZone: normalizeAnswerlatticeTimeZone(normalizePersistedString(storeData.timeZone, 80)),
        businessDayEndTime: normalizeAnswerlatticeBusinessDayEndTime(
            normalizePersistedString(storeData.businessDayEndTime, 5),
        ),
    };
};

export type AnswerlatticeCompiledWorkspaceProduct = {
    name: string;
    url: string | null;
    supportEmail: string | null;
    billingModel: typeof ANSWERLATTICE_WORKSPACE_BILLING_MODELS[number];
    timeZone: string;
    businessDayEndTime: string;
};

export const projectAnswerlatticeCompiledWorkspaceProduct = (
    value: unknown,
): AnswerlatticeCompiledWorkspaceProduct => {
    const storeData = value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
    const profile = buildAnswerlatticeWorkspaceProfileFromStore(storeData);
    return {
        name: profile.productName || 'Product',
        url: profile.productUrl || null,
        supportEmail: profile.supportEmail || null,
        billingModel: profile.billingModel,
        timeZone: profile.timeZone,
        businessDayEndTime: profile.businessDayEndTime,
    };
};

export const normalizeAnswerlatticeWorkspaceProfileInput = (
    input: AnswerlatticeWorkspaceProfile,
): AnswerlatticeWorkspaceProfile => ({
    ...input,
    productName: input.productName.trim(),
    productUrl: input.productUrl?.trim() || '',
    supportEmail: input.supportEmail?.trim() || '',
    primarySurfaces: normalizeAnswerlatticePrimarySurfaces(input.primarySurfaces),
    timeZone: input.timeZone,
    businessDayEndTime: input.businessDayEndTime,
});

export const answerlatticeWorkspaceProfilesEqual = (
    left: AnswerlatticeWorkspaceProfile,
    right: AnswerlatticeWorkspaceProfile,
): boolean => JSON.stringify(left) === JSON.stringify(right);
