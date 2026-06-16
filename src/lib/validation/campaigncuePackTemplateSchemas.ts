import { z } from "zod";
import { BUSINESS_CATEGORIES } from "@data/shared/businessTypes";
import {
    CAMPAIGNCUE_CHANNELS,
    CAMPAIGNCUE_PACK_TEMPLATE_KINDS,
    CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY,
    CAMPAIGNCUE_PACK_TEMPLATE_STATUSES,
} from "@constant/campaigncue";

const campaignCueDailyDeskOwnerGoals = [
    "bring_people_today",
    "fill_slots",
    "sell_product",
    "book_service",
    "remind_customers",
    "prepare_local_pack",
] as const;

const safeIdSchema = z.string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, hyphen, or underscore only");

const storagePathSchema = z.string()
    .min(1)
    .max(420)
    .regex(/^campaigncue\/templates\//, "Template assets must live under campaigncue/templates");

export const campaignCuePackTemplateBusinessCategorySchema = z.enum(
    BUSINESS_CATEGORIES.map((category) => category.value) as [string, ...string[]],
);

export const campaignCuePackTemplateSummarySchema = z.object({
    businessCategory: campaignCuePackTemplateBusinessCategorySchema,
    channels: z.array(z.enum(CAMPAIGNCUE_CHANNELS)).max(12),
    createdAt: z.number().int().nonnegative(),
    description: z.string().trim().min(1).max(260),
    editorDocumentPath: storagePathSchema.optional(),
    eventTags: z.array(safeIdSchema).max(16),
    optionalFactTypes: z.array(safeIdSchema).max(16),
    outputTypes: z.array(z.string().min(1).max(80)).max(20),
    ownerGoals: z.array(z.enum(campaignCueDailyDeskOwnerGoals)).max(12),
    payloadPath: storagePathSchema,
    previewPath: storagePathSchema.optional(),
    priority: z.number().int().min(0).max(10_000),
    qualityTier: z.enum(["platform_curated", "workspace_saved"]),
    recipeIds: z.array(safeIdSchema).max(20),
    requiredFactTypes: z.array(safeIdSchema).max(20),
    schemaVersion: z.literal(CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.SCHEMA_VERSION),
    searchTokens: z.array(z.string().trim().min(1).max(80)).max(60),
    status: z.enum(CAMPAIGNCUE_PACK_TEMPLATE_STATUSES),
    styleTags: z.array(safeIdSchema).max(20),
    supportedBusinessTypes: z.array(z.string().trim().min(1).max(80)).max(30),
    templateId: safeIdSchema,
    templateKind: z.enum(CAMPAIGNCUE_PACK_TEMPLATE_KINDS),
    templateType: z.enum(["platform", "workspace"]),
    title: z.string().trim().min(1).max(100),
    trustChecks: z.array(safeIdSchema).max(20),
    updatedAt: z.number().int().nonnegative(),
});

export const campaignCuePlatformPackTemplateCatalogSchema = z.object({
    businessCategory: campaignCuePackTemplateBusinessCategorySchema,
    catalogId: safeIdSchema,
    catalogStatus: z.enum(["active", "hidden"]),
    data: z.array(campaignCuePackTemplateSummarySchema)
        .max(CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.MAX_ACTIVE_PLATFORM_TEMPLATES_PER_DOC),
    overflowDocIds: z.array(safeIdSchema).max(10).optional(),
    schemaVersion: z.literal(CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.SCHEMA_VERSION),
    updatedAt: z.number().int().nonnegative(),
    updatedBy: z.string().trim().min(1).max(120),
});

export const campaignCueWorkspacePackTemplateIndexSchema = z.object({
    data: z.array(campaignCuePackTemplateSummarySchema)
        .max(CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.MAX_WORKSPACE_TEMPLATES),
    id: z.literal(CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.WORKSPACE_INDEX_DOC_ID),
    schemaVersion: z.literal(CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.SCHEMA_VERSION),
    updatedAt: z.number().int().nonnegative(),
    updatedBy: z.string().trim().max(120).optional(),
    workspaceId: safeIdSchema,
});

export const campaignCuePackTemplatePayloadSchema = z.object({
    decisionSeed: z.object({
        ownerGoal: z.enum(campaignCueDailyDeskOwnerGoals),
        recipeId: safeIdSchema,
        whyNow: z.array(z.string().trim().min(1).max(180)).max(8),
        whyThis: z.array(z.string().trim().min(1).max(180)).max(8),
    }),
    factSlots: z.array(z.object({
        ownerQuestion: z.string().trim().min(1).max(180),
        protected: z.boolean(),
        required: z.boolean(),
        type: safeIdSchema,
    })).max(20),
    outputPackShape: z.object({
        channels: z.array(z.string().trim().min(1).max(80)).max(16),
        copyBlocks: z.array(z.string().trim().min(1).max(80)).max(24),
        deliveryCards: z.array(z.string().trim().min(1).max(80)).max(16),
        printFormats: z.array(z.string().trim().min(1).max(80)).max(16),
        resultQuestion: z.string().trim().min(1).max(180),
    }),
    reuseRules: z.object({
        allowCueLayersSource: z.boolean(),
        allowSavedAssetSource: z.boolean(),
        staleFactPolicy: z.literal("rehydrate_or_block"),
    }),
    schemaVersion: z.literal(CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.SCHEMA_VERSION),
    templateId: safeIdSchema,
    trustChecks: z.array(safeIdSchema).max(20),
});

export const campaignCueWorkspacePackTemplateSaveSchema = z.object({
    businessCategory: campaignCuePackTemplateBusinessCategorySchema,
    editorDocument: z.unknown().optional(),
    payload: campaignCuePackTemplatePayloadSchema,
    previewDataUrl: z.string().max(CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.MAX_PREVIEW_BYTES).optional(),
    summary: campaignCuePackTemplateSummarySchema.omit({
        createdAt: true,
        editorDocumentPath: true,
        payloadPath: true,
        previewPath: true,
        updatedAt: true,
    }).extend({
        createdAt: z.number().int().nonnegative().optional(),
        editorDocumentPath: storagePathSchema.optional(),
        payloadPath: storagePathSchema.optional(),
        previewPath: storagePathSchema.optional(),
        updatedAt: z.number().int().nonnegative().optional(),
    }),
    workspaceId: safeIdSchema,
});

export type CampaignCuePackTemplateSummaryInput = z.infer<typeof campaignCuePackTemplateSummarySchema>;
export type CampaignCuePackTemplatePayloadInput = z.infer<typeof campaignCuePackTemplatePayloadSchema>;
