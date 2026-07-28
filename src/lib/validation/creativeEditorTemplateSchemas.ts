import { z } from "zod";
import type {
    CreativeEditorDocument,
    CreativeEditorElement,
} from "@/modules/creative-editor/types";
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

const boundedColorSchema = z.string().max(120);
const boundedElementStringSchema = z.string().max(20_000);
const finiteNumberSchema = z.number().finite();
const dimensionSchema = finiteNumberSchema.min(0).max(10_000);
const positiveCanvasDimensionSchema = z.number().int().positive().max(10_000);

const creativeEditorGradientSchema = z.object({
    angle: finiteNumberSchema,
    enabled: z.boolean(),
    from: boundedColorSchema,
    stops: z.array(z.object({
        color: boundedColorSchema,
        offset: finiteNumberSchema.min(0).max(1),
    }).strict()).max(20).optional(),
    to: boundedColorSchema,
}).strict();

const creativeEditorCanvasSchema = z.object({
    backgroundColor: boundedColorSchema,
    backgroundGradient: creativeEditorGradientSchema.optional(),
    height: positiveCanvasDimensionSchema,
    width: positiveCanvasDimensionSchema,
}).passthrough();

const creativeEditorElementBaseShape = {
    blur: finiteNumberSchema.min(0).max(1_000).optional(),
    editorGuide: z.boolean().optional(),
    excludeFromExport: z.boolean().optional(),
    flipX: z.boolean().optional(),
    flipY: z.boolean().optional(),
    height: dimensionSchema,
    id: z.string().min(1).max(140),
    locked: z.boolean().optional(),
    name: z.string().min(1).max(180),
    opacity: finiteNumberSchema.min(0).max(1).optional(),
    printFrameId: z.string().max(160).optional(),
    printFrameLocked: z.boolean().optional(),
    rotation: finiteNumberSchema.optional(),
    shadow: z.object({
        blur: finiteNumberSchema.min(0).max(1_000),
        color: boundedColorSchema,
        offsetX: finiteNumberSchema,
        offsetY: finiteNumberSchema,
    }).strict().optional(),
    sourceRefs: z.array(z.object({
        campaignId: z.string().max(160).optional(),
        channel: z.string().max(100).optional(),
        label: z.string().min(1).max(180),
        locked: z.boolean().optional(),
        outputId: z.string().max(160).optional(),
        productId: z.string().max(80).optional(),
        sourceRef: z.string().max(500).optional(),
        value: z.string().max(20_000).optional(),
    }).strict()).max(100).optional(),
    visible: z.boolean().optional(),
    width: dimensionSchema,
    x: finiteNumberSchema,
    y: finiteNumberSchema,
};

const strokeShape = {
    strokeLineCap: z.enum(["butt", "round", "square"]).optional(),
    strokeStyle: z.enum([
        "solid",
        "dashed",
        "dashed-round",
        "dash-dot",
        "dash-dot-round",
        "dotted",
        "dotted-round",
        "long-dashed",
        "long-dashed-round",
    ]).optional(),
    strokeWidth: finiteNumberSchema.min(0).max(1_000).optional(),
};

const textShape = {
    align: z.enum(["left", "center", "right"]).optional(),
    charSpacing: finiteNumberSchema.optional(),
    color: boundedColorSchema,
    fontFamily: z.string().max(180).optional(),
    fontSize: finiteNumberSchema.positive().max(1_000),
    fontStyle: z.enum(["italic", "normal"]).optional(),
    fontWeight: z.enum(["400", "600", "700", "800", "900", "bold", "normal"]).optional(),
    gradient: creativeEditorGradientSchema.optional(),
    lineHeight: finiteNumberSchema.positive().max(20).optional(),
    linethrough: z.boolean().optional(),
    text: boundedElementStringSchema,
    textBackgroundColor: boundedColorSchema.optional(),
    underline: z.boolean().optional(),
};

const fillShape = {
    fill: boundedColorSchema,
    gradient: creativeEditorGradientSchema.optional(),
    stroke: boundedColorSchema.optional(),
    ...strokeShape,
};

const creativeEditorElementSchemaRaw = z.discriminatedUnion("type", [
    z.object({ ...creativeEditorElementBaseShape, ...textShape, type: z.literal("text") }).passthrough(),
    z.object({
        ...creativeEditorElementBaseShape,
        ...textShape,
        path: boundedElementStringSchema,
        pathStroke: boundedColorSchema.optional(),
        pathVisible: z.boolean().optional(),
        stroke: boundedColorSchema.optional(),
        ...strokeShape,
        type: z.literal("pathText"),
    }).passthrough(),
    z.object({
        ...creativeEditorElementBaseShape,
        ...fillShape,
        radius: finiteNumberSchema.min(0).max(5_000).optional(),
        type: z.literal("rect"),
    }).passthrough(),
    z.object({ ...creativeEditorElementBaseShape, ...fillShape, type: z.literal("ellipse") }).passthrough(),
    z.object({ ...creativeEditorElementBaseShape, ...fillShape, type: z.literal("triangle") }).passthrough(),
    z.object({
        ...creativeEditorElementBaseShape,
        ...fillShape,
        points: z.array(z.object({
            x: finiteNumberSchema,
            y: finiteNumberSchema,
        }).strict()).min(3).max(1_000),
        type: z.literal("polygon"),
    }).passthrough(),
    z.object({
        ...creativeEditorElementBaseShape,
        ...fillShape,
        path: boundedElementStringSchema,
        type: z.literal("path"),
    }).passthrough(),
    z.object({
        ...creativeEditorElementBaseShape,
        arrowStyle: z.enum(["none", "arrow", "thin-tail-arrow"]).optional(),
        stroke: boundedColorSchema,
        ...strokeShape,
        type: z.literal("line"),
    }).passthrough(),
    z.object({
        ...creativeEditorElementBaseShape,
        alt: z.string().max(500).optional(),
        filter: z.enum([
            "none",
            "blackwhite",
            "brownie",
            "grayscale",
            "invert",
            "kodachrome",
            "polaroid",
            "sepia",
            "technicolor",
            "vintage",
        ]).optional(),
        filterAdjustments: z.object({
            blur: finiteNumberSchema.optional(),
            brightness: finiteNumberSchema.optional(),
            contrast: finiteNumberSchema.optional(),
            gammaBlue: finiteNumberSchema.optional(),
            gammaGreen: finiteNumberSchema.optional(),
            gammaRed: finiteNumberSchema.optional(),
            grayscaleMode: z.enum(["average", "lightness", "luminosity"]).optional(),
            hueRotation: finiteNumberSchema.optional(),
            noise: finiteNumberSchema.optional(),
            pixelate: finiteNumberSchema.optional(),
            removeColor: boundedColorSchema.optional(),
            removeColorDistance: finiteNumberSchema.optional(),
            saturation: finiteNumberSchema.optional(),
            vibrance: finiteNumberSchema.optional(),
        }).strict().optional(),
        fit: z.enum(["cover", "contain"]).optional(),
        outlineColor: boundedColorSchema.optional(),
        outlineEnabled: z.boolean().optional(),
        outlineOnly: z.boolean().optional(),
        outlineWidth: finiteNumberSchema.min(0).max(1_000).optional(),
        src: z.string().min(1).max(2_000_000),
        stroke: boundedColorSchema.optional(),
        ...strokeShape,
        type: z.literal("image"),
    }).passthrough(),
    z.object({
        ...creativeEditorElementBaseShape,
        darkColor: boundedColorSchema.optional(),
        errorCorrectionLevel: z.enum(["L", "M", "Q", "H"]).optional(),
        lightColor: boundedColorSchema.optional(),
        margin: finiteNumberSchema.min(0).max(100).optional(),
        type: z.literal("qr"),
        value: z.string().min(1).max(4_000),
    }).passthrough(),
]).superRefine((element, ctx) => {
    if (element.width <= 0 && element.height <= 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Element must have width or height",
            path: ["width"],
        });
    }
});

const creativeEditorElementSchema = creativeEditorElementSchemaRaw.pipe(
    z.custom<CreativeEditorElement>(
        (value): value is CreativeEditorElement => creativeEditorElementSchemaRaw.safeParse(value).success,
        "Invalid creative editor element",
    ),
);

const creativeEditorPageSchema = z.object({
    canvas: creativeEditorCanvasSchema,
    elements: z.array(creativeEditorElementSchema).max(300),
    id: z.string().min(1).max(160),
    locked: z.boolean().optional(),
    title: z.string().min(1).max(160),
    updatedAt: z.string().max(80).optional(),
}).passthrough();

const creativeEditorDocumentSchemaRaw = z.object({
    activePageId: z.string().max(160).optional(),
    canvas: creativeEditorCanvasSchema,
    elements: z.array(creativeEditorElementSchema).max(300),
    id: z.string().min(1).max(160),
    metadata: z.object({
        brand: z.object({
            accentColor: boundedColorSchema.optional(),
            fontFamily: z.string().max(180).optional(),
            logoUrl: z.string().max(2_000).optional(),
            name: z.string().max(180).optional(),
            primaryColor: boundedColorSchema.optional(),
            secondaryColor: boundedColorSchema.optional(),
            voice: z.string().max(500).optional(),
        }).strict().optional(),
        campaignId: z.string().max(160).optional(),
        channel: z.string().max(100).optional(),
        createdAt: z.string().max(80).optional(),
        outputId: z.string().max(160).optional(),
        printFrames: z.array(z.object({
            height: dimensionSchema,
            id: z.string().min(1).max(160),
            label: z.string().min(1).max(180),
            locked: z.boolean().optional(),
            width: dimensionSchema,
            x: finiteNumberSchema,
            y: finiteNumberSchema,
        }).strict()).max(100).optional(),
        sourceRefs: z.array(z.object({
            campaignId: z.string().max(160).optional(),
            channel: z.string().max(100).optional(),
            label: z.string().min(1).max(180),
            locked: z.boolean().optional(),
            outputId: z.string().max(160).optional(),
            productId: z.string().max(80).optional(),
            sourceRef: z.string().max(500).optional(),
            value: z.string().max(20_000).optional(),
        }).strict()).max(100).optional(),
        templateId: z.string().max(160).optional(),
        textPlaceholders: z.array(z.object({
            id: z.string().min(1).max(160),
            label: z.string().min(1).max(180),
            sourceRef: z.string().max(500).optional(),
            value: z.string().max(20_000),
        }).strict()).max(100).optional(),
        trustGate: z.string().max(500).optional(),
        updatedAt: z.string().max(80).optional(),
        visibleWatermark: z.object({
            color: boundedColorSchema,
            enabled: z.boolean(),
            fontFamily: z.string().max(180).optional(),
            fontSize: finiteNumberSchema.positive().max(1_000),
            opacity: finiteNumberSchema.min(0).max(1),
            position: z.enum(["bottom-left", "bottom-right", "center", "top-left", "top-right", "tiled"]),
            rotation: finiteNumberSchema.optional(),
            text: z.string().max(500),
        }).strict().optional(),
    }).passthrough().optional(),
    pages: z.array(creativeEditorPageSchema).max(100).optional(),
    productContext: z.object({
        productId: z.string().min(1).max(80),
        sourceSurface: z.string().max(100).optional(),
        workspaceId: z.string().max(160).optional(),
    }).passthrough(),
    schemaVersion: z.literal("creative-editor.v1"),
    title: z.string().min(1).max(160),
}).passthrough();

export const creativeEditorDocumentSchema = creativeEditorDocumentSchemaRaw.pipe(
    z.custom<CreativeEditorDocument>(
        (value): value is CreativeEditorDocument => creativeEditorDocumentSchemaRaw.safeParse(value).success,
        "Invalid creative editor document",
    ),
);

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
