import { CAMPAIGNCUE_CHANNELS } from "@constant/campaigncue/channels";
import { CAMPAIGNCUE_MAX_ASSET_SIZE_BYTES } from "@constant/campaigncue/database";
import { CAMPAIGNCUE_EXPORT_ACTIONS } from "@constant/campaigncue/delivery";
import { CAMPAIGNCUE_OUTPUT_PICKER_ITEM_IDS } from "@constant/campaigncue/outputPicker";
import {
    CAMPAIGNCUE_PATTERN_CUE_MAX_NOTES_LENGTH,
    CAMPAIGNCUE_PATTERN_CUE_MAX_TAKEAWAY_LENGTH,
    normalizeCampaignCuePatternCueUrl,
} from "@lib/campaigncue/patternCue";
import { z } from "zod";

const idPattern = /^[a-zA-Z0-9_-]+$/;
const isHttpUrl = (value: string) => {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
};

const optionalUrl = (maxLength: number) => z.preprocess(
    (value) => {
        if (typeof value !== "string") return value;
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
    },
    z.string().trim().url().max(maxLength).refine(isHttpUrl, "Only http and https links are allowed").optional().nullable(),
);

const optionalText = (maxLength: number) => z.preprocess(
    (value) => {
        if (typeof value !== "string") return value;
        const trimmed = value.trim();
        return trimmed ? trimmed : undefined;
    },
    z.string().trim().max(maxLength).optional(),
);

const optionalTextList = (maxItems: number, maxLength: number) => z.preprocess(
    (value) => {
        if (Array.isArray(value)) return value;
        if (typeof value !== "string") return value;
        return value
            .split(/[\n,;]+/)
            .map((item) => item.trim())
            .filter(Boolean);
    },
    z.array(z.string().trim().min(1).max(maxLength)).max(maxItems).optional(),
);

const isValidLocale = (value: string) => {
    try {
        new Intl.Locale(value);
        return true;
    } catch {
        return false;
    }
};

const localeSchema = z.string().trim().min(2).max(12).refine(isValidLocale, "Invalid locale");

const optionalLocaleList = z.preprocess(
    (value) => {
        if (Array.isArray(value)) return value;
        if (typeof value !== "string") return value;
        return value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
    },
    z.array(localeSchema).max(8).optional(),
);

const optionalNumber = (minimum: number, maximum: number) => z.preprocess(
    (value) => {
        if (value === "" || value == null) return undefined;
        if (typeof value === "string") return Number(value);
        return value;
    },
    z.number().finite().min(minimum).max(maximum).optional(),
);

const optionalDateTime = z.preprocess(
    (value) => value === "" || value == null ? undefined : value,
    z.string().datetime().optional(),
);

const isValidTimeZone = (value: string) => {
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: value });
        return true;
    } catch {
        return false;
    }
};

const timeZoneSchema = z.string()
    .trim()
    .min(2)
    .max(80)
    .refine(isValidTimeZone, "Invalid timezone");

const containsLikelyPhoneNumber = (value: string) => {
    const candidates: string[] = value.match(/\+?[0-9][0-9 ()-]{7,}[0-9]/g) || [];
    return candidates.some((candidate) => candidate.replace(/\D/g, "").length >= 10);
};

const containsCustomerContactPayload = (label: string, value: string) => {
    const text = `${label} ${value}`;
    const audienceContext = /\b(customer|customers|audience|client|clients|member|members|past buyer|recent buyer|return)\b/i.test(text);
    if (!audienceContext) return false;
    return /\b(?:paste|import|upload|store|save|attach)\b.{0,32}\b(?:contacts?|customers?|clients?|phone numbers?|email addresses?|csv|spreadsheet)\b/i.test(text)
        || /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)
        || containsLikelyPhoneNumber(text);
};

export const CampaignCueIdSchema = z.string().regex(idPattern).min(3).max(120);

export const CampaignCueChannelSchema = z.enum(CAMPAIGNCUE_CHANNELS);

export const CampaignCueCreateCampaignSchema = z.object({
    opportunityId: CampaignCueIdSchema.optional(),
    reuseCampaignId: CampaignCueIdSchema.optional(),
    businessBrainId: CampaignCueIdSchema.optional(),
    title: z.string().trim().min(3).max(120).optional(),
    brief: z.string().trim().max(1200).optional(),
    channels: z.array(CampaignCueChannelSchema).min(1).max(7).optional(),
    sourceTemplateId: CampaignCueIdSchema.optional(),
    outputIntentId: z.enum(CAMPAIGNCUE_OUTPUT_PICKER_ITEM_IDS).optional(),
    idempotencyKey: z.string().trim().regex(idPattern).min(8).max(120),
}).strict().superRefine((value, ctx) => {
    if (value.reuseCampaignId && (value.outputIntentId || value.sourceTemplateId)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Campaign reuse cannot be combined with a template or output-intent request",
            path: ["reuseCampaignId"],
        });
    }
});

export const CampaignCueCampaignActionSchema = z.object({
    action: z.enum(CAMPAIGNCUE_EXPORT_ACTIONS),
    outputId: CampaignCueIdSchema.optional(),
    channel: CampaignCueChannelSchema.optional(),
    scheduledAt: z.string().datetime().optional(),
    note: z.string().trim().max(400).optional(),
    resultSignalId: z.string().trim().regex(/^[a-zA-Z0-9_-]+$/).min(2).max(80).optional(),
    resultReceipt: z.object({
        usedAt: optionalDateTime,
        metrics: z.object({
            replies: z.number().int().min(0).max(1_000_000).optional(),
            calls: z.number().int().min(0).max(1_000_000).optional(),
            bookings: z.number().int().min(0).max(1_000_000).optional(),
            orders: z.number().int().min(0).max(1_000_000).optional(),
            walkIns: z.number().int().min(0).max(1_000_000).optional(),
            linkClicks: z.number().int().min(0).max(1_000_000).optional(),
        }).strict().optional(),
        evidenceNote: optionalText(400),
        experimentVariable: z.enum(["channel", "timing", "offer", "photo", "cta", "format"]).optional(),
    }).strict().optional(),
    staffAssignee: optionalText(80),
    taskType: z.enum(["post", "print", "staff_share", "follow_up", "result_check"]).optional(),
    idempotencyKey: z.string().trim().regex(idPattern).min(8).max(120),
}).strict().superRefine((input, context) => {
    if (input.action === "record_outcome" && !input.resultSignalId) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Choose a result before recording the outcome",
            path: ["resultSignalId"],
        });
    }
    if (input.action === "schedule" && !input.scheduledAt) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Choose a date and time for the manual task",
            path: ["scheduledAt"],
        });
    }
    if (input.action === "reject" && !input.note) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Add a short reason before rejecting the campaign",
            path: ["note"],
        });
    }
});

export const CampaignCueAssetSchema = z.object({
    idempotencyKey: z.string().trim().regex(idPattern).min(8).max(120),
    name: z.string().trim().min(2).max(120),
    assetType: z.enum(["image", "video", "audio", "document", "logo", "export"]),
    source: z.enum(["upload", "generated", "imported", "manual"]).default("manual"),
    rightsStatus: z.enum(["confirmed", "needs_review", "restricted"]).default("needs_review"),
    rightsNote: z.string().trim().max(400).optional(),
    consentType: z.enum(["not_applicable", "owner_confirmed", "creator_release", "customer_release", "unknown"])
        .default("unknown"),
    tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    storagePath: z.string().trim().regex(/^[a-zA-Z0-9/_:.-]+$/).max(500).optional(),
    mimeType: z.string().trim().max(120).optional(),
    sizeBytes: z.number().int().min(0).max(CAMPAIGNCUE_MAX_ASSET_SIZE_BYTES).optional(),
    previewStoragePath: z.string().trim().regex(/^[a-zA-Z0-9/_:.-]+$/).max(500).optional(),
    previewMimeType: z.enum(["image/png", "image/webp", "image/jpeg"]).optional(),
    previewSizeBytes: z.number().int().min(1).max(1024 * 1024).optional(),
    width: z.number().int().min(1).max(16_384).optional(),
    height: z.number().int().min(1).max(16_384).optional(),
    durationSeconds: z.number().finite().min(0).max(6 * 60 * 60).optional(),
    campaignId: CampaignCueIdSchema.optional(),
    outputId: CampaignCueIdSchema.optional(),
    channel: CampaignCueChannelSchema.optional(),
}).strict().superRefine((value, ctx) => {
    if (value.previewStoragePath && !value.storagePath) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A preview requires a source file", path: ["previewStoragePath"] });
    }
    if (value.previewStoragePath && (!value.previewMimeType || value.previewSizeBytes === undefined)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Preview type and size are required", path: ["previewStoragePath"] });
    }
    if (!value.campaignId && (value.outputId || value.channel)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Campaign asset output and channel references require a campaign",
            path: [value.outputId ? "outputId" : "channel"],
        });
    }
});

export const CampaignCueBusinessPatchSchema = z.object({
    idempotencyKey: z.string().trim().regex(idPattern).min(8).max(120),
    name: z.string().trim().min(2).max(120).optional(),
    businessType: z.enum([
        "restaurant",
        "salon",
        "retail",
        "local_service",
        "fitness",
        "clinic",
        "multi_location",
        "agency_client",
        "other",
    ]).optional(),
    locality: z.string().trim().max(120).optional(),
    website: optionalUrl(500),
    phone: z.string().trim().max(40).optional(),
    whatsapp: z.string().trim().max(40).optional(),
    bookingUrl: optionalUrl(500),
    publicMenuUrl: optionalUrl(500),
    logoUrl: optionalUrl(1000),
    primaryColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    voice: z.enum(["calm", "friendly", "premium", "direct"]).optional(),
    targetAudience: optionalText(180),
    brandFeel: optionalTextList(8, 40),
    inspirationNotes: optionalTextList(8, 80),
    visualMotifs: optionalTextList(8, 60),
    avoidList: optionalTextList(10, 80),
    productFocus: optionalTextList(10, 80),
    typographyNotes: optionalText(180),
    locale: localeSchema.optional(),
    timezone: timeZoneSchema.optional(),
    operatingPulse: z.object({
        businessState: z.enum(["normal", "quiet", "busy", "closed"]).optional(),
        capacityStatus: z.enum(["unknown", "available", "limited", "full"]).optional(),
        stockStatus: z.enum(["unknown", "available", "low", "unavailable"]).optional(),
        localMoment: optionalText(120),
        note: optionalText(240),
        validUntil: optionalDateTime,
    }).strict().optional(),
    commercialPolicy: z.object({
        promotionsAllowed: z.boolean().optional(),
        discountsAllowed: z.boolean().optional(),
        discountApprovalRequired: z.boolean().optional(),
        maxDiscountPercent: optionalNumber(0, 100),
        minimumPromotedPrice: optionalNumber(0, 1_000_000_000),
        currencyCode: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(),
        doNotPromote: optionalTextList(20, 80),
    }).strict().optional(),
    presence: z.object({
        googleBusinessProfileUrl: optionalUrl(500),
        googleReviewUrl: optionalUrl(500),
        appleBusinessConnectUrl: optionalUrl(500),
        instagramUrl: optionalUrl(500),
        facebookUrl: optionalUrl(500),
        whatsappCatalogUrl: optionalUrl(500),
    }).strict().optional(),
    targetLocales: optionalLocaleList,
    agencyMode: z.boolean().optional(),
    multiLocationMode: z.boolean().optional(),
}).strict();

export const CampaignCueSourceInputSchema = z.object({
    idempotencyKey: z.string().trim().regex(idPattern).min(8).max(120),
    sourceType: z.enum(["manual_note", "menu_link", "booking_link", "offer", "event", "upload_metadata", "inspiration_pattern"]),
    label: z.string().trim().min(2).max(120),
    value: z.string().trim().min(2).max(1200),
    status: z.enum(["active", "needs_review"]).default("needs_review"),
    expiresAt: z.string().datetime().optional(),
    inspiration: z.object({
        sourceUrl: z.string().trim().min(8).max(1000),
        transcriptOrNotes: z.string().trim().min(20).max(CAMPAIGNCUE_PATTERN_CUE_MAX_NOTES_LENGTH),
        ownerTakeaway: optionalText(CAMPAIGNCUE_PATTERN_CUE_MAX_TAKEAWAY_LENGTH),
        platform: z.enum(["instagram", "tiktok", "youtube", "other"]).default("other"),
        rightsStatus: z.enum(["reference_only", "owner_authorized"]).default("reference_only"),
        durationSeconds: optionalNumber(1, 600),
    }).strict().optional(),
}).strict().superRefine((input, context) => {
    if (input.sourceType === "inspiration_pattern") {
        if (!input.inspiration) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Add the public example link and the transcript or notes to learn from.",
                path: ["inspiration"],
            });
            return;
        }
        if (!normalizeCampaignCuePatternCueUrl(input.inspiration.sourceUrl)) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Use a public HTTPS link. Local, private-network, credentialed, and non-HTTPS links are not allowed.",
                path: ["inspiration", "sourceUrl"],
            });
        }
        if (containsCustomerContactPayload(input.label, input.inspiration.transcriptOrNotes)) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Do not paste customer names, phone numbers, email addresses, contact lists, or private conversations.",
                path: ["inspiration", "transcriptOrNotes"],
            });
        }
        return;
    }
    if (input.inspiration) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Example-pattern details are allowed only for an inspiration pattern input.",
            path: ["inspiration"],
        });
    }
    if (containsCustomerContactPayload(input.label, input.value)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Describe the owner-managed audience without customer names, phone numbers, email addresses, or pasted contact data.",
            path: ["value"],
        });
    }
});

export const CampaignCueLocationSchema = z.object({
    idempotencyKey: z.string().trim().regex(idPattern).min(8).max(120),
    name: z.string().trim().min(2).max(120),
    locality: z.string().trim().max(120).optional(),
    status: z.enum(["active", "draft"]).default("draft"),
});

export type CampaignCueCreateCampaignInput = z.infer<typeof CampaignCueCreateCampaignSchema>;
export type CampaignCueCampaignActionInput = z.infer<typeof CampaignCueCampaignActionSchema>;
export type CampaignCueAssetInput = z.infer<typeof CampaignCueAssetSchema>;
export type CampaignCueBusinessPatchInput = z.infer<typeof CampaignCueBusinessPatchSchema>;
export type CampaignCueSourceInputData = z.infer<typeof CampaignCueSourceInputSchema>;
export type CampaignCueLocationInput = z.infer<typeof CampaignCueLocationSchema>;
