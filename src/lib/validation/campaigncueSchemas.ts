import { CAMPAIGNCUE_CHANNELS } from "@constant/campaigncue/channels";
import { CAMPAIGNCUE_MAX_ASSET_SIZE_BYTES } from "@constant/campaigncue/database";
import { CAMPAIGNCUE_EXPORT_ACTIONS } from "@constant/campaigncue/delivery";
import { z } from "zod";

const idPattern = /^[a-zA-Z0-9_-]+$/;
const optionalUrl = (maxLength: number): z.ZodEffects<z.ZodNullable<z.ZodOptional<z.ZodString>>, string | null | undefined, unknown> => z.preprocess(
    (value) => {
        if (typeof value !== "string") return value;
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
    },
    z.string().trim().url().max(maxLength).optional().nullable(),
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

export const CampaignCueIdSchema = z.string().regex(idPattern).min(3).max(120);

export const CampaignCueChannelSchema = z.enum(CAMPAIGNCUE_CHANNELS);

export const CampaignCueCreateCampaignSchema = z.object({
    opportunityId: CampaignCueIdSchema.optional(),
    businessBrainId: CampaignCueIdSchema.optional(),
    title: z.string().trim().min(3).max(120).optional(),
    brief: z.string().trim().max(1200).optional(),
    channels: z.array(CampaignCueChannelSchema).min(1).max(7).optional(),
    idempotencyKey: z.string().trim().regex(idPattern).min(8).max(120).optional(),
});

export const CampaignCueCampaignActionSchema = z.object({
    action: z.enum(CAMPAIGNCUE_EXPORT_ACTIONS),
    outputId: CampaignCueIdSchema.optional(),
    channel: CampaignCueChannelSchema.optional(),
    scheduledAt: z.string().datetime().optional(),
    note: z.string().trim().max(400).optional(),
    resultSignalId: z.string().trim().regex(/^[a-zA-Z0-9_-]+$/).min(2).max(80).optional(),
    idempotencyKey: z.string().trim().regex(idPattern).min(8).max(120).optional(),
});

export const CampaignCueAssetSchema = z.object({
    name: z.string().trim().min(2).max(120),
    assetType: z.enum(["image", "video", "document", "logo", "export"]),
    source: z.enum(["upload", "generated", "imported", "manual"]).default("manual"),
    rightsStatus: z.enum(["confirmed", "needs_review", "restricted"]).default("needs_review"),
    rightsNote: z.string().trim().max(400).optional(),
    consentType: z.enum(["not_applicable", "owner_confirmed", "creator_release", "customer_release", "unknown"])
        .default("unknown"),
    tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    storagePath: z.string().trim().regex(/^[a-zA-Z0-9/_:.-]+$/).max(500).optional(),
    downloadUrl: z.string().trim().url().max(1000).optional(),
    mimeType: z.string().trim().max(120).optional(),
    sizeBytes: z.number().int().min(0).max(CAMPAIGNCUE_MAX_ASSET_SIZE_BYTES).optional(),
    campaignId: CampaignCueIdSchema.optional(),
    outputId: CampaignCueIdSchema.optional(),
    channel: CampaignCueChannelSchema.optional(),
});

export const CampaignCueBusinessPatchSchema = z.object({
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
    locale: z.string().trim().min(2).max(12).optional(),
    timezone: timeZoneSchema.optional(),
    agencyMode: z.boolean().optional(),
    multiLocationMode: z.boolean().optional(),
});

export const CampaignCueSourceInputSchema = z.object({
    sourceType: z.enum(["manual_note", "menu_link", "booking_link", "offer", "event", "upload_metadata"]),
    label: z.string().trim().min(2).max(120),
    value: z.string().trim().min(2).max(1200),
    status: z.enum(["active", "needs_review"]).default("needs_review"),
    expiresAt: z.string().datetime().optional(),
});

export const CampaignCueLocationSchema = z.object({
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
