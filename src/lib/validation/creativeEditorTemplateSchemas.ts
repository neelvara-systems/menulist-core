import { z } from "zod";
import type { CreativeEditorDocument } from "@/modules/creative-editor/types";
import { BUSINESS_CATEGORIES } from "@data/shared/businessTypes";

const safeKeySchema = z.string()
    .min(1)
    .max(80)
    .regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, hyphen, or underscore only");

const sourceSurfaceSchema = z.string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, hyphen, or underscore only");

export const creativeEditorTemplateTypeSchema = z.enum(["platform", "user", "all"]);
export const creativeEditorPlatformBusinessCategorySchema = z.string()
    .min(1)
    .max(80)
    .refine((value) => (
        value === "generic"
        || BUSINESS_CATEGORIES.some((category) => category.value === value)
    ), "Use a supported business category");

const creativeEditorDocumentSchema = z.object({
    canvas: z.object({
        backgroundColor: z.string().max(120),
        height: z.number().int().positive().max(10000),
        width: z.number().int().positive().max(10000),
    }).passthrough(),
    elements: z.array(z.object({
        height: z.number().min(0).max(10000),
        id: z.string().min(1).max(140),
        name: z.string().min(1).max(180),
        type: z.string().min(1).max(40),
        width: z.number().min(0).max(10000),
        x: z.number().finite(),
        y: z.number().finite(),
    }).passthrough().superRefine((element, ctx) => {
        if (element.width <= 0 && element.height <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Element must have width or height",
                path: ["width"],
            });
        }
    })).max(300),
    id: z.string().min(1).max(160),
    productContext: z.object({
        productId: z.string().min(1).max(80),
        sourceSurface: z.string().max(100).optional(),
        workspaceId: z.string().max(160).optional(),
    }).passthrough(),
    schemaVersion: z.literal("creative-editor.v1"),
    title: z.string().min(1).max(160),
}).passthrough();

export const creativeEditorTemplateListQuerySchema = z.object({
    assetTypeId: safeKeySchema.optional(),
    businessCategory: creativeEditorPlatformBusinessCategorySchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(100),
    productId: safeKeySchema,
    sourceSurface: sourceSurfaceSchema,
    templateType: creativeEditorTemplateTypeSchema.default("user"),
});

export const creativeEditorTemplateGetQuerySchema = z.object({
    assetTypeId: safeKeySchema.optional(),
    businessCategory: creativeEditorPlatformBusinessCategorySchema.optional(),
    includeUnpublished: z.boolean().optional(),
    productId: safeKeySchema,
    sourceSurface: sourceSurfaceSchema,
    templateType: z.enum(["platform", "user"]).default("user"),
});

export const creativeEditorTemplateSaveSchema = z.object({
    assetTypeId: safeKeySchema.optional(),
    description: z.string().trim().max(220).optional(),
    document: creativeEditorDocumentSchema,
    productId: safeKeySchema,
    sourceSurface: sourceSurfaceSchema,
    status: z.enum(["draft", "published", "archived"]).optional(),
    templateFamilyId: safeKeySchema.optional(),
    templateId: safeKeySchema.optional(),
    thumbnailDataUrl: z.string().max(750_000).optional(),
    title: z.string().trim().min(1).max(90),
});

export type CreativeEditorTemplateListQuery = {
    assetTypeId?: string;
    businessCategory?: string;
    limit: number;
    productId: string;
    sourceSurface: string;
    templateType: "platform" | "user" | "all";
};

export type CreativeEditorTemplateGetQuery = {
    assetTypeId?: string;
    businessCategory?: string;
    includeUnpublished?: boolean;
    productId: string;
    sourceSurface: string;
    templateType: "platform" | "user";
};

export type CreativeEditorTemplateSaveInput = CreativeEditorTemplateGetQuery & {
    description?: string;
    document: CreativeEditorDocument;
    status?: "draft" | "published" | "archived";
    templateFamilyId?: string;
    templateId?: string;
    thumbnailDataUrl?: string;
    title: string;
};
