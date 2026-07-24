import { SIGNALDESK_PRODUCT_CODE } from "@constant/signaldesk/product";
import type { SignalDeskSourcePolicy } from "@type/signaldesk";
import { z } from "zod";

export const SIGNALDESK_SOURCE_POLICY_PROVIDERS = [
    "manual",
    "google-places",
    "foursquare",
    "apify",
    "fhrs-fhis",
    "apollo",
    "hunter",
    "zerobounce",
    "firecrawl",
    "tavily",
    "exa",
    "postmark",
    "resend",
    "owned-email",
    "smartlead",
    "instantly",
    "lemlist",
    "gemini",
    "openai",
    "anthropic",
] as const;

export const SIGNALDESK_SOURCE_POLICY_CONTACT_CHANNELS = [
    "email",
    "whatsapp",
    "instagram",
    "messenger",
    "manual",
] as const;

const SOURCE_TYPES = ["manual-csv", "manual-research", "owned-demand", "provider", "other"] as const;
const SOURCE_STATUSES = ["active", "approved", "inactive", "review_required", "blocked"] as const;
const ACCESS_METHODS = [
    "owner-supplied",
    "permissioned-referral",
    "licensed-api",
    "open-data",
    "manual-public-research",
    "other",
] as const;
const RAW_PAYLOAD_POLICIES = ["never-store", "transient-only", "retention-bound"] as const;
const REFRESH_METHODS = ["manual-review", "provider-refresh", "owner-refresh", "no-refresh"] as const;
const DAY_MS = 24 * 60 * 60 * 1_000;
const CLOCK_SKEW_MS = 5 * 60 * 1_000;

const boundedString = (minimum: number, maximum: number) => z.string().trim().min(minimum).max(maximum);
const boundedList = (itemMaximum: number, maximum: number, minimum = 0) => (
    z.array(boundedString(1, itemMaximum)).min(minimum).max(maximum)
        .transform((items) => Array.from(new Set(items.map((item) => item.trim()))))
);

const canonicalHttpUrl = z.string().trim().max(500).superRefine((value, context) => {
    try {
        const parsed = new URL(value);
        if ((parsed.protocol !== "https:" && parsed.protocol !== "http:") || parsed.username || parsed.password) {
            context.addIssue({ code: z.ZodIssueCode.custom, message: "URL must be credential-free HTTP(S)." });
        }
    } catch {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "URL is invalid." });
    }
}).transform((value) => {
    const parsed = new URL(value);
    parsed.hash = "";
    return parsed.toString();
});

const offsetDateTime = z.string().trim().datetime({ offset: true }).transform((value) => new Date(value).toISOString());

const contactFieldByChannel: Partial<Record<(typeof SIGNALDESK_SOURCE_POLICY_CONTACT_CHANNELS)[number], string>> = {
    email: "email",
    instagram: "instagram",
    messenger: "messengerRecipientId",
    whatsapp: "phone",
};

export const SignalDeskSourcePolicyCreateSchema = z.object({
    accessMethod: z.enum(ACCESS_METHODS),
    allowContact: z.boolean(),
    allowEvidence: z.boolean(),
    allowPersonalization: z.boolean(),
    allowedContactChannels: z.array(z.enum(SIGNALDESK_SOURCE_POLICY_CONTACT_CHANNELS)).max(5)
        .transform((items) => Array.from(new Set(items))),
    allowedFields: boundedList(80, 30, 1),
    attributionRequirements: boundedList(240, 10),
    blockedFields: boundedList(80, 30),
    expiresAt: offsetDateTime,
    idempotencyKey: boundedString(8, 180),
    lastReviewedAt: offsetDateTime,
    name: boundedString(2, 120),
    notes: boundedString(1, 500).optional(),
    policyOwner: boundedString(2, 180),
    prohibitedUses: boundedList(240, 20, 1),
    provider: z.enum(SIGNALDESK_SOURCE_POLICY_PROVIDERS).optional(),
    rawPayloadPolicy: z.enum(RAW_PAYLOAD_POLICIES),
    refreshMethod: z.enum(REFRESH_METHODS),
    retentionDays: z.number().int().min(1).max(365),
    sourceType: z.enum(SOURCE_TYPES),
    termsUrl: canonicalHttpUrl.optional(),
    termsVersion: boundedString(1, 120).optional(),
}).strict().superRefine((value, context) => {
    const now = Date.now();
    const expiry = Date.parse(value.expiresAt);
    const reviewed = Date.parse(value.lastReviewedAt);
    if (expiry <= now) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["expiresAt"], message: "Expiry must be in the future." });
    }
    if (expiry > now + (value.retentionDays * DAY_MS) + CLOCK_SKEW_MS) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["expiresAt"], message: "Expiry exceeds the retention window." });
    }
    if (reviewed > now + CLOCK_SKEW_MS) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["lastReviewedAt"], message: "Review time cannot be in the future." });
    }
    if (value.sourceType === "provider" && !value.provider) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["provider"], message: "Provider policy requires a provider." });
    }
    if (value.sourceType !== "provider" && value.provider) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["provider"], message: "Provider is only valid for provider policies." });
    }
    if (value.refreshMethod === "provider-refresh" && value.sourceType !== "provider") {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["refreshMethod"], message: "Provider refresh requires a provider policy." });
    }
    if (value.sourceType === "provider" && value.refreshMethod !== "provider-refresh") {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["refreshMethod"], message: "Provider policies require provider refresh." });
    }
    if (!value.termsUrl && !value.notes) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["notes"], message: "Terms URL or review notes are required." });
    }
    const allowed = new Set(value.allowedFields.map((field) => field.toLowerCase()));
    const blocked = new Set(value.blockedFields.map((field) => field.toLowerCase()));
    for (const field of Array.from(allowed)) {
        if (blocked.has(field)) {
            context.addIssue({ code: z.ZodIssueCode.custom, path: ["blockedFields"], message: `Field ${field} cannot be allowed and blocked.` });
        }
    }
    if (!allowed.has("displayname")) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["allowedFields"], message: "displayName must be allowed." });
    }
    if (value.allowPersonalization && !value.allowEvidence) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["allowPersonalization"], message: "Personalization requires evidence authority." });
    }
    const contactAuthorityMethods = new Set(["owner-supplied", "permissioned-referral", "licensed-api"]);
    if (value.allowContact) {
        if (!value.allowEvidence || !contactAuthorityMethods.has(value.accessMethod)) {
            context.addIssue({ code: z.ZodIssueCode.custom, path: ["allowContact"], message: "Contact requires explicit bounded source authority." });
        }
        if (!value.allowedContactChannels.length) {
            context.addIssue({ code: z.ZodIssueCode.custom, path: ["allowedContactChannels"], message: "At least one contact channel is required." });
        }
    } else if (value.allowedContactChannels.length) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["allowedContactChannels"], message: "Contact channels require contact authority." });
    }
    for (const channel of value.allowedContactChannels) {
        const field = contactFieldByChannel[channel];
        if (field && (!allowed.has(field.toLowerCase()) || blocked.has(field.toLowerCase()))) {
            context.addIssue({ code: z.ZodIssueCode.custom, path: ["allowedContactChannels"], message: `${channel} requires its contact field to be allowed.` });
        }
    }
});

export type SignalDeskSourcePolicyCreateInput = z.infer<typeof SignalDeskSourcePolicyCreateSchema>;

export const SignalDeskSourcePolicyRenewSchema = z.object({
    expiresAt: offsetDateTime,
    idempotencyKey: boundedString(8, 180),
    lastReviewedAt: offsetDateTime,
    sourcePolicyId: boundedString(3, 160),
}).strict().superRefine((value, context) => {
    const now = Date.now();
    const expiry = Date.parse(value.expiresAt);
    const reviewed = Date.parse(value.lastReviewedAt);
    if (reviewed > now + CLOCK_SKEW_MS) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["lastReviewedAt"], message: "Review time cannot be in the future." });
    }
    if (expiry <= now || expiry <= reviewed) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["expiresAt"], message: "Renewed expiry must follow the current review." });
    }
});

export type SignalDeskSourcePolicyRenewInput = z.infer<typeof SignalDeskSourcePolicyRenewSchema>;
export type SignalDeskSourcePolicyContactChannel = (typeof SIGNALDESK_SOURCE_POLICY_CONTACT_CHANNELS)[number];

const timestampToIso = (value: unknown): string | null => {
    if (typeof value !== "object" || value === null || !("toDate" in value) || typeof value.toDate !== "function") {
        return null;
    }
    try {
        const date = value.toDate();
        return date instanceof Date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
    } catch {
        return null;
    }
};

const persistedPolicySchema = z.object({
    accessMethod: z.enum(ACCESS_METHODS),
    allowedContactChannels: z.array(z.enum(SIGNALDESK_SOURCE_POLICY_CONTACT_CHANNELS)).max(5),
    allowedFields: z.array(boundedString(1, 80)).min(1).max(30),
    allowedUse: z.object({
        contact: z.boolean(),
        evidence: z.boolean(),
        import: z.boolean(),
        personalization: z.boolean(),
        providerRun: z.boolean(),
        storage: z.boolean(),
    }).strict(),
    approvedAt: z.unknown(),
    attributionRequirements: z.array(boundedString(1, 240)).max(10),
    blockedFields: z.array(boundedString(1, 80)).max(30),
    createdAt: z.unknown(),
    expiresAt: z.unknown(),
    lastReviewedAt: z.unknown(),
    name: boundedString(2, 120),
    notes: z.string().trim().max(500).nullable().optional(),
    pId: z.literal(SIGNALDESK_PRODUCT_CODE),
    policyOwner: boundedString(2, 180),
    prohibitedUses: z.array(boundedString(1, 240)).min(1).max(20),
    provider: z.enum(SIGNALDESK_SOURCE_POLICY_PROVIDERS).nullable().optional(),
    rawPayloadPolicy: z.enum(RAW_PAYLOAD_POLICIES),
    refreshMethod: z.enum(REFRESH_METHODS),
    retentionDays: z.number().int().min(1).max(365),
    sourcePolicyId: boundedString(3, 160),
    sourceType: z.enum(SOURCE_TYPES),
    status: z.enum(SOURCE_STATUSES),
    termsUrl: z.string().trim().max(500).nullable().optional(),
    termsVersion: z.string().trim().max(120).nullable().optional(),
    updatedAt: z.unknown().optional(),
}).passthrough();

export const parseSignalDeskSourcePolicyDocument = (raw: unknown, documentId: string): SignalDeskSourcePolicy => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("SOURCE_POLICY_SHAPE_INVALID");
    const identity = raw as Record<string, unknown>;
    if (identity.pId !== SIGNALDESK_PRODUCT_CODE) throw new Error("SOURCE_POLICY_PRODUCT_MISMATCH");
    if (identity.sourcePolicyId !== documentId) throw new Error("SOURCE_POLICY_IDENTITY_MISMATCH");
    const parsed = persistedPolicySchema.safeParse(raw);
    if (!parsed.success) throw new Error("SOURCE_POLICY_SHAPE_INVALID");
    if (parsed.data.sourcePolicyId !== documentId) throw new Error("SOURCE_POLICY_IDENTITY_MISMATCH");
    const approvedAt = timestampToIso(parsed.data.approvedAt);
    const createdAt = timestampToIso(parsed.data.createdAt);
    const expiresAt = timestampToIso(parsed.data.expiresAt);
    const lastReviewedAt = timestampToIso(parsed.data.lastReviewedAt);
    const updatedAt = timestampToIso(parsed.data.updatedAt);
    if (!approvedAt || !createdAt || !expiresAt || !lastReviewedAt) throw new Error("SOURCE_POLICY_SHAPE_INVALID");
    if (parsed.data.updatedAt !== undefined && parsed.data.updatedAt !== null && !updatedAt) {
        throw new Error("SOURCE_POLICY_SHAPE_INVALID");
    }
    const expiry = Date.parse(expiresAt);
    const approved = Date.parse(approvedAt);
    const reviewed = Date.parse(lastReviewedAt);
    const currentTime = Date.now();
    if (approved > currentTime + CLOCK_SKEW_MS || reviewed > currentTime + CLOCK_SKEW_MS) {
        throw new Error("SOURCE_POLICY_SHAPE_INVALID");
    }
    if (expiry > approved + (parsed.data.retentionDays * DAY_MS) + CLOCK_SKEW_MS) {
        throw new Error("SOURCE_POLICY_SHAPE_INVALID");
    }
    const canonicalTermsUrl = parsed.data.termsUrl
        ? canonicalHttpUrl.safeParse(parsed.data.termsUrl)
        : null;
    if (canonicalTermsUrl && !canonicalTermsUrl.success) throw new Error("SOURCE_POLICY_SHAPE_INVALID");
    const provider = parsed.data.provider || null;
    if ((parsed.data.sourceType === "provider") !== Boolean(provider)) throw new Error("SOURCE_POLICY_SHAPE_INVALID");
    if ((parsed.data.sourceType === "provider") !== (parsed.data.refreshMethod === "provider-refresh")) {
        throw new Error("SOURCE_POLICY_SHAPE_INVALID");
    }
    const allowed = new Set(parsed.data.allowedFields.map((field) => field.toLowerCase()));
    const blocked = new Set(parsed.data.blockedFields.map((field) => field.toLowerCase()));
    if (!allowed.has("displayname") || Array.from(allowed).some((field) => blocked.has(field))) {
        throw new Error("SOURCE_POLICY_SHAPE_INVALID");
    }
    if (parsed.data.allowedUse.personalization && !parsed.data.allowedUse.evidence) throw new Error("SOURCE_POLICY_SHAPE_INVALID");
    if ((parsed.data.allowedUse.import || parsed.data.allowedUse.storage) && !parsed.data.allowedUse.evidence) {
        throw new Error("SOURCE_POLICY_SHAPE_INVALID");
    }
    if (parsed.data.allowedUse.providerRun !== (parsed.data.sourceType === "provider" && parsed.data.allowedUse.evidence)) {
        throw new Error("SOURCE_POLICY_SHAPE_INVALID");
    }
    if (parsed.data.allowedUse.contact !== (parsed.data.allowedContactChannels.length > 0)) {
        throw new Error("SOURCE_POLICY_SHAPE_INVALID");
    }
    const contactAuthorityMethods = new Set(["owner-supplied", "permissioned-referral", "licensed-api"]);
    if (parsed.data.allowedUse.contact && (!parsed.data.allowedUse.evidence || !contactAuthorityMethods.has(parsed.data.accessMethod))) {
        throw new Error("SOURCE_POLICY_SHAPE_INVALID");
    }
    for (const channel of parsed.data.allowedContactChannels) {
        const field = contactFieldByChannel[channel];
        if (field && (!allowed.has(field.toLowerCase()) || blocked.has(field.toLowerCase()))) {
            throw new Error("SOURCE_POLICY_SHAPE_INVALID");
        }
    }
    if (!canonicalTermsUrl?.success && !parsed.data.notes?.trim()) throw new Error("SOURCE_POLICY_SHAPE_INVALID");
    return {
        accessMethod: parsed.data.accessMethod,
        allowedContactChannels: Array.from(new Set(parsed.data.allowedContactChannels)),
        allowedFields: Array.from(new Set(parsed.data.allowedFields)),
        allowedUse: {
            contact: parsed.data.allowedUse.contact,
            evidence: parsed.data.allowedUse.evidence,
            import: parsed.data.allowedUse.import,
            personalization: parsed.data.allowedUse.personalization,
            providerRun: parsed.data.allowedUse.providerRun,
            storage: parsed.data.allowedUse.storage,
        },
        approvedAt,
        attributionRequirements: Array.from(new Set(parsed.data.attributionRequirements)),
        blockedFields: Array.from(new Set(parsed.data.blockedFields)),
        createdAt,
        expiresAt,
        lastReviewedAt,
        name: parsed.data.name,
        notes: parsed.data.notes || null,
        policyOwner: parsed.data.policyOwner,
        prohibitedUses: Array.from(new Set(parsed.data.prohibitedUses)),
        provider,
        rawPayloadPolicy: parsed.data.rawPayloadPolicy,
        refreshMethod: parsed.data.refreshMethod,
        retentionDays: parsed.data.retentionDays,
        sourcePolicyId: parsed.data.sourcePolicyId,
        sourceType: parsed.data.sourceType,
        status: parsed.data.status,
        termsUrl: canonicalTermsUrl?.success ? canonicalTermsUrl.data : null,
        termsVersion: parsed.data.termsVersion || null,
        updatedAt,
    };
};

export const sourcePolicyAllowsContactChannel = (
    policy: Pick<SignalDeskSourcePolicy, "allowedContactChannels" | "allowedUse">,
    channel: SignalDeskSourcePolicyContactChannel,
) => policy.allowedUse.contact === true && policy.allowedContactChannels.includes(channel);
