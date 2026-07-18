import {
    CAMPAIGNCUE_CUE_LAYER_ALLOWED_EDITOR_ELEMENT_TYPES,
    CAMPAIGNCUE_CUE_LAYER_JOB_OUTCOMES,
    CAMPAIGNCUE_CUE_LAYER_SOURCE_KINDS,
    CAMPAIGNCUE_CUE_LAYERS,
} from "@constant/campaigncue/cueLayers";
import { CAMPAIGNCUE_PRODUCT_CODE } from "@constant/campaigncue/product";
import { z } from "zod";
import { CREATIVE_EDITOR_SCHEMA_VERSION } from "@/modules/creative-editor/types";

const idPattern = /^[a-zA-Z0-9_-]+$/;
const cueAssetUriPattern = /^cue-asset:\/\/[a-zA-Z0-9_-]+$/;

export const CampaignCueCueLayerIdSchema = z.string().trim().regex(idPattern).min(3).max(160);

const dataUrlSchema = z.string()
    .trim()
    .max(Math.ceil(CAMPAIGNCUE_CUE_LAYERS.MAX_UPLOAD_BYTES * 1.38) + 128)
    .regex(/^data:image\/(png|jpeg|jpg|webp);base64,[a-zA-Z0-9+/=]+$/);

const renderedExportDataUrlSchema = z.string()
    .trim()
    .max(Math.ceil(CAMPAIGNCUE_CUE_LAYERS.MAX_EXPORT_BYTES * 1.38) + 128)
    .regex(/^data:image\/(png|jpeg|jpg|webp);base64,[a-zA-Z0-9+/=]+$/);

const colorSchema = z.string().trim().min(1).max(120);
const durableSourceRefValueSchema = z.string().trim().max(500).superRefine((value, ctx) => {
    if (/^(?:data|https?|javascript):/i.test(value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Editor source references cannot persist external URLs." });
    }
});
const strokeStyleSchema = z.enum(["solid", "dashed", "dashed-round", "dash-dot", "dash-dot-round", "dotted", "dotted-round", "long-dashed", "long-dashed-round"]);
const strokeLineCapSchema = z.enum(["butt", "round", "square"]);
const gradientSchema = z.object({
    angle: z.number().min(-360).max(360),
    enabled: z.boolean(),
    from: colorSchema,
    stops: z.array(z.object({
        color: colorSchema,
        offset: z.number().min(0).max(1),
    })).max(8).optional(),
    to: colorSchema,
}).strip();

const shadowSchema = z.object({
    blur: z.number().min(0).max(80),
    color: colorSchema,
    offsetX: z.number().min(-2000).max(2000),
    offsetY: z.number().min(-2000).max(2000),
}).strip();

const imageFilterAdjustmentSchema = z.object({
    blur: z.number().min(0).max(40).optional(),
    brightness: z.number().min(-1).max(1).optional(),
    contrast: z.number().min(-1).max(1).optional(),
    gammaBlue: z.number().min(0).max(3).optional(),
    gammaGreen: z.number().min(0).max(3).optional(),
    gammaRed: z.number().min(0).max(3).optional(),
    grayscaleMode: z.enum(["average", "lightness", "luminosity"]).optional(),
    hueRotation: z.number().min(-1).max(1).optional(),
    noise: z.number().min(0).max(1000).optional(),
    pixelate: z.number().min(1).max(80).optional(),
    removeColor: colorSchema.optional(),
    removeColorDistance: z.number().min(0).max(1).optional(),
    saturation: z.number().min(-1).max(1).optional(),
    vibrance: z.number().min(-1).max(1).optional(),
}).strip();

export const CampaignCueCueLayerUploadSchema = z.object({
    dataUrl: dataUrlSchema,
    fileName: z.string().trim().min(1).max(180),
    height: z.number().int().min(1).max(CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE).optional(),
    idempotencyKey: z.string().trim().regex(idPattern).min(8).max(120).optional(),
    mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
    sourceKind: z.enum(CAMPAIGNCUE_CUE_LAYER_SOURCE_KINDS).default("user_upload"),
    title: z.string().trim().min(2).max(120).optional(),
    width: z.number().int().min(1).max(CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE).optional(),
});

export const CampaignCueCueLayerGeneratedSourceSchema = z.object({
    generatedAssetId: CampaignCueCueLayerIdSchema.optional(),
    imageUrl: z.string().trim().url().max(1200).optional(),
    intendedText: z.array(z.string().trim().min(1).max(160)).max(24).optional(),
    sourceKind: z.enum(["generated_flat_image", "generated_design"]),
    title: z.string().trim().min(2).max(120).optional(),
});

const CreativeEditorSourceRefSchema = z.object({
    campaignId: CampaignCueCueLayerIdSchema.optional(),
    channel: z.string().trim().max(80).optional(),
    label: z.string().trim().min(1).max(160),
    locked: z.boolean().optional(),
    outputId: CampaignCueCueLayerIdSchema.optional(),
    productId: z.string().trim().max(80).optional(),
    sourceRef: durableSourceRefValueSchema.optional(),
    value: z.string().trim().max(1000).optional(),
}).strip();

const CreativeEditorElementBaseSchema = z.object({
    align: z.enum(["left", "center", "right"]).optional(),
    alt: z.string().trim().max(180).optional(),
    arrowStyle: z.enum(["none", "arrow", "thin-tail-arrow"]).optional(),
    blur: z.number().min(0).max(40).optional(),
    charSpacing: z.number().min(-1000).max(4000).optional(),
    color: colorSchema.optional(),
    darkColor: colorSchema.optional(),
    editorGuide: z.boolean().optional(),
    errorCorrectionLevel: z.enum(["L", "M", "Q", "H"]).optional(),
    excludeFromExport: z.boolean().optional(),
    fill: colorSchema.optional(),
    filter: z.enum(["none", "blackwhite", "brownie", "grayscale", "invert", "kodachrome", "polaroid", "sepia", "technicolor", "vintage"]).optional(),
    filterAdjustments: imageFilterAdjustmentSchema.optional(),
    fit: z.enum(["cover", "contain"]).optional(),
    flipX: z.boolean().optional(),
    flipY: z.boolean().optional(),
    fontFamily: z.string().trim().max(160).optional(),
    fontSize: z.number().min(4).max(320).optional(),
    fontStyle: z.enum(["italic", "normal"]).optional(),
    fontWeight: z.enum(["400", "600", "700", "800", "900", "bold", "normal"]).optional(),
    gradient: gradientSchema.optional(),
    height: z.number().min(1).max(CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE),
    id: z.string().trim().regex(idPattern).min(2).max(160),
    lightColor: colorSchema.optional(),
    lineHeight: z.number().min(0.5).max(3).optional(),
    linethrough: z.boolean().optional(),
    locked: z.boolean().optional(),
    margin: z.number().int().min(0).max(64).optional(),
    name: z.string().trim().min(1).max(160),
    opacity: z.number().min(0).max(1).optional(),
    outlineColor: colorSchema.optional(),
    outlineEnabled: z.boolean().optional(),
    outlineOnly: z.boolean().optional(),
    outlineWidth: z.number().min(0).max(120).optional(),
    path: z.string().trim().max(20000).optional(),
    pathStroke: colorSchema.optional(),
    pathVisible: z.boolean().optional(),
    points: z.array(z.object({
        x: z.number().min(-CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE).max(CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE),
        y: z.number().min(-CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE).max(CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE),
    }).strip()).min(3).max(80).optional(),
    printFrameId: z.string().trim().regex(idPattern).min(2).max(160).optional(),
    printFrameLocked: z.boolean().optional(),
    radius: z.number().min(0).max(CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE).optional(),
    rotation: z.number().min(-360).max(360).optional(),
    shadow: shadowSchema.optional(),
    sourceRefs: z.array(CreativeEditorSourceRefSchema).max(20).optional(),
    src: z.string().trim().max(2000).optional(),
    stroke: colorSchema.optional(),
    strokeLineCap: strokeLineCapSchema.optional(),
    strokeStyle: strokeStyleSchema.optional(),
    strokeWidth: z.number().min(0).max(200).optional(),
    text: z.string().max(4000).optional(),
    textBackgroundColor: colorSchema.optional(),
    type: z.enum(CAMPAIGNCUE_CUE_LAYER_ALLOWED_EDITOR_ELEMENT_TYPES),
    underline: z.boolean().optional(),
    value: z.string().trim().max(1000).optional(),
    visible: z.boolean().optional(),
    width: z.number().min(1).max(CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE),
    x: z.number().min(-CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE).max(CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE),
    y: z.number().min(-CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE).max(CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE),
}).strip();

const CreativeEditorElementSchema = CreativeEditorElementBaseSchema.superRefine((element, ctx) => {
    const record = element as Record<string, unknown>;
    if (element.type === "image") {
        const src = typeof record.src === "string" ? record.src.trim() : "";
        const sourceRef = Array.isArray(record.sourceRefs)
            ? (record.sourceRefs as Array<{ sourceRef?: string }>).find((ref) => ref.sourceRef?.startsWith("cue-asset://"))?.sourceRef
            : "";
        const isHydratedUrl = src.startsWith("https://") || src.startsWith("http://");
        const isCueAssetUri = cueAssetUriPattern.test(src);
        if (!src || (!isHydratedUrl && !isCueAssetUri)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Image element requires a product-owned asset ref or hydrated URL." });
        }
        if (!isCueAssetUri && !sourceRef) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Image element requires a product-owned source reference." });
        }
        if (/^(javascript|data):/i.test(src)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Image element URL is not allowed." });
        }
    }
    if ((element.type === "text" || element.type === "pathText") && typeof record.text !== "string") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Text element requires text." });
    }
    if ((element.type === "text" || element.type === "pathText") && typeof record.color !== "string") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Text element requires color." });
    }
    if ((element.type === "text" || element.type === "pathText") && typeof record.fontSize !== "number") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Text element requires font size." });
    }
    if (["rect", "ellipse", "triangle", "polygon", "path"].includes(element.type) && typeof record.fill !== "string") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Shape element requires fill." });
    }
    if (element.type === "line" && typeof record.stroke !== "string") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Line element requires stroke." });
    }
    if ((element.type === "path" || element.type === "pathText") && typeof record.path !== "string") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Path element requires path data." });
    }
    if (element.type === "polygon" && !Array.isArray(record.points)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Polygon element requires points." });
    }
    if (element.type === "qr" && typeof record.value !== "string") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "QR element requires value." });
    }
});

const CreativeEditorCanvasSchema = z.object({
    backgroundColor: z.string().trim().min(1).max(80),
    backgroundGradient: gradientSchema.optional(),
    height: z.number().int().min(1).max(CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE),
    width: z.number().int().min(1).max(CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE),
}).strip().superRefine((canvas, ctx) => {
    if (canvas.width * canvas.height > CAMPAIGNCUE_CUE_LAYERS.MAX_CANVAS_PIXELS) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Editor canvas is too large." });
    }
});

const CreativeEditorPageSchema = z.object({
    canvas: CreativeEditorCanvasSchema,
    elements: z.array(CreativeEditorElementSchema).max(CAMPAIGNCUE_CUE_LAYERS.MAX_FINAL_LAYERS),
    id: CampaignCueCueLayerIdSchema,
    locked: z.boolean().optional(),
    title: z.string().trim().min(1).max(160),
    updatedAt: z.string().datetime({ offset: true }).optional(),
}).strip();

const CreativeEditorMetadataSchema = z.object({
    brand: z.object({
        accentColor: colorSchema.optional(),
        fontFamily: z.string().trim().max(160).optional(),
        name: z.string().trim().max(160).optional(),
        primaryColor: colorSchema.optional(),
        secondaryColor: colorSchema.optional(),
        voice: z.string().trim().max(500).optional(),
    }).strip().optional(),
    campaignId: CampaignCueCueLayerIdSchema.optional(),
    channel: z.string().trim().max(80).optional(),
    createdAt: z.string().datetime({ offset: true }).optional(),
    cueLayers: z.object({
        designId: CampaignCueCueLayerIdSchema,
        jobId: CampaignCueCueLayerIdSchema.optional(),
        outcome: z.enum(CAMPAIGNCUE_CUE_LAYER_JOB_OUTCOMES),
        reconstructionId: CampaignCueCueLayerIdSchema,
        revision: z.number().int().min(0),
        sourcePackageId: CampaignCueCueLayerIdSchema,
    }).strip().optional(),
    outputId: CampaignCueCueLayerIdSchema.optional(),
    printFrames: z.array(z.object({
        height: z.number().min(1).max(CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE),
        id: CampaignCueCueLayerIdSchema,
        label: z.string().trim().min(1).max(160),
        locked: z.boolean().optional(),
        width: z.number().min(1).max(CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE),
        x: z.number().min(-CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE).max(CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE),
        y: z.number().min(-CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE).max(CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE),
    }).strip()).max(24).optional(),
    sourceRefs: z.array(CreativeEditorSourceRefSchema).max(40).optional(),
    templateId: z.string().trim().max(160).optional(),
    textPlaceholders: z.array(z.object({
        id: CampaignCueCueLayerIdSchema,
        label: z.string().trim().min(1).max(160),
        sourceRef: durableSourceRefValueSchema.optional(),
        value: z.string().max(4000),
    }).strip()).max(40).optional(),
    trustGate: z.string().trim().max(120).optional(),
    updatedAt: z.string().datetime({ offset: true }).optional(),
    visibleWatermark: z.object({
        color: colorSchema,
        enabled: z.boolean(),
        fontFamily: z.string().trim().max(160).optional(),
        fontSize: z.number().min(4).max(320),
        opacity: z.number().min(0).max(1),
        position: z.enum(["bottom-left", "bottom-right", "center", "top-left", "top-right", "tiled"]),
        rotation: z.number().min(-360).max(360).optional(),
        text: z.string().max(500),
    }).strip().optional(),
}).strip();

const CampaignCueCreativeEditorDocumentBaseSchema = z.object({
    activePageId: CampaignCueCueLayerIdSchema.optional(),
    canvas: CreativeEditorCanvasSchema,
    elements: z.array(CreativeEditorElementSchema).min(1).max(CAMPAIGNCUE_CUE_LAYERS.MAX_FINAL_LAYERS),
    id: CampaignCueCueLayerIdSchema,
    metadata: CreativeEditorMetadataSchema.optional(),
    pages: z.array(CreativeEditorPageSchema).min(1).max(CAMPAIGNCUE_CUE_LAYERS.MAX_EDITOR_PAGES).optional(),
    productContext: z.object({
        productId: z.literal(CAMPAIGNCUE_PRODUCT_CODE),
        sourceSurface: z.string().trim().max(120).optional(),
        workspaceId: z.string().trim().max(160).optional(),
    }),
    schemaVersion: z.literal(CREATIVE_EDITOR_SCHEMA_VERSION),
    title: z.string().trim().min(1).max(160),
});

const refineCampaignCueCreativeEditorDocument = (
    documentValue: z.infer<typeof CampaignCueCreativeEditorDocumentBaseSchema>,
    ctx: z.RefinementCtx,
    requireCueLayersMetadata: boolean,
) => {
    if (requireCueLayersMetadata && !documentValue.metadata?.cueLayers) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CueLayers editor metadata is required." });
    }
    if (documentValue.pages?.length) {
        const pageIds = new Set(documentValue.pages.map((page) => page.id));
        if (pageIds.size !== documentValue.pages.length) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Editor page ids must be unique." });
        }
        if (!documentValue.activePageId || !pageIds.has(documentValue.activePageId)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Active editor page is invalid." });
        }
    } else if (documentValue.activePageId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Active editor page requires pages." });
    }
    if (new TextEncoder().encode(JSON.stringify(documentValue)).length > CAMPAIGNCUE_CUE_LAYERS.MAX_EDITOR_DOCUMENT_BYTES) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Editor document is too large." });
    }
};

export const CampaignCuePackTemplateEditorDocumentSchema = CampaignCueCreativeEditorDocumentBaseSchema.superRefine(
    (documentValue, ctx) => refineCampaignCueCreativeEditorDocument(documentValue, ctx, false),
);

export const CampaignCueCueLayerEditorDocumentSchema = CampaignCueCreativeEditorDocumentBaseSchema.superRefine(
    (documentValue, ctx) => refineCampaignCueCreativeEditorDocument(documentValue, ctx, true),
);

export const CampaignCueCueLayerAutosaveSchema = z.object({
    document: CampaignCueCueLayerEditorDocumentSchema,
    expectedRevision: z.number().int().min(0).optional(),
    idempotencyKey: z.string().trim().regex(idPattern).min(8).max(120).optional(),
});

export const CampaignCueCueLayerRepairSchema = z.object({
    correctionType: z.enum([
        "restore_fallback",
        "text_downgraded",
        "mask_repaired",
        "vector_rejected",
        "background_repaired",
        "z_order_changed",
        "layer_deleted",
        "image_replaced",
    ]).default("restore_fallback"),
    expectedRevision: z.number().int().min(0),
    idempotencyKey: z.string().trim().regex(idPattern).min(8).max(120).optional(),
    layerId: z.string().trim().regex(idPattern).min(2).max(160).optional(),
});

export const CampaignCueCueLayerExportSchema = z.object({
    document: CampaignCueCueLayerEditorDocumentSchema,
    format: z.enum(["png", "jpeg", "webp", "pdf_flattened", "json"]).default("png"),
    idempotencyKey: z.string().trim().regex(idPattern).min(8).max(120).optional(),
    mimeType: z.string().trim().max(120).optional(),
    renderedDataUrl: renderedExportDataUrlSchema.optional(),
    sizeBytes: z.number().int().min(0).max(250 * 1024 * 1024).optional(),
    sourceRevision: z.number().int().min(0),
});

export const CampaignCueCueLayerJobOutcomeSchema = z.enum(CAMPAIGNCUE_CUE_LAYER_JOB_OUTCOMES);

export type CampaignCueCueLayerUploadInput = z.infer<typeof CampaignCueCueLayerUploadSchema>;
export type CampaignCueCueLayerGeneratedSourceInput = z.infer<typeof CampaignCueCueLayerGeneratedSourceSchema>;
export type CampaignCueCueLayerAutosaveInput = z.infer<typeof CampaignCueCueLayerAutosaveSchema>;
export type CampaignCueCueLayerRepairInput = z.infer<typeof CampaignCueCueLayerRepairSchema>;
export type CampaignCueCueLayerExportInput = z.infer<typeof CampaignCueCueLayerExportSchema>;
