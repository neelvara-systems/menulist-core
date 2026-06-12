import {
    CAMPAIGNCUE_CUE_LAYER_ALLOWED_EDITOR_ELEMENT_TYPES,
    CAMPAIGNCUE_CUE_LAYER_JOB_OUTCOMES,
    CAMPAIGNCUE_CUE_LAYER_SOURCE_KINDS,
    CAMPAIGNCUE_CUE_LAYERS,
} from "@constant/campaigncue/cueLayers";
import { z } from "zod";

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
    sourceRef: z.string().trim().max(500).optional(),
    value: z.string().trim().max(1000).optional(),
});

const CreativeEditorElementBaseSchema = z.object({
    align: z.enum(["left", "center", "right"]).optional(),
    alt: z.string().trim().max(180).optional(),
    arrowStyle: z.enum(["none", "arrow", "thin-tail-arrow"]).optional(),
    blur: z.number().min(0).max(40).optional(),
    charSpacing: z.number().min(-1000).max(4000).optional(),
    color: colorSchema.optional(),
    darkColor: colorSchema.optional(),
    fill: colorSchema.optional(),
    filter: z.enum(["none", "blackwhite", "brownie", "grayscale", "invert", "kodachrome", "polaroid", "sepia", "technicolor", "vintage"]).optional(),
    filterAdjustments: imageFilterAdjustmentSchema.optional(),
    fit: z.enum(["cover", "contain"]).optional(),
    flipX: z.boolean().optional(),
    flipY: z.boolean().optional(),
    fontFamily: z.string().trim().max(160).optional(),
    fontSize: z.number().min(4).max(320).optional(),
    fontStyle: z.enum(["italic", "normal"]).optional(),
    fontWeight: z.enum(["400", "600", "700", "800", "bold", "normal"]).optional(),
    gradient: gradientSchema.optional(),
    height: z.number().min(1).max(CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE),
    id: z.string().trim().regex(idPattern).min(2).max(160),
    lightColor: colorSchema.optional(),
    lineHeight: z.number().min(0.5).max(3).optional(),
    linethrough: z.boolean().optional(),
    locked: z.boolean().optional(),
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

export const CampaignCueCueLayerEditorDocumentSchema = z.object({
    canvas: z.object({
        backgroundColor: z.string().trim().min(1).max(80),
        height: z.number().int().min(1).max(CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE),
        width: z.number().int().min(1).max(CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE),
    }),
    elements: z.array(CreativeEditorElementSchema).min(1).max(CAMPAIGNCUE_CUE_LAYERS.MAX_FINAL_LAYERS),
    id: CampaignCueCueLayerIdSchema,
    metadata: z.record(z.unknown()).optional(),
    productContext: z.object({
        productId: z.string().trim().min(1).max(80),
        sourceSurface: z.string().trim().max(120).optional(),
        workspaceId: z.string().trim().max(160).optional(),
    }),
    schemaVersion: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(160),
}).superRefine((documentValue, ctx) => {
    if (Buffer.byteLength(JSON.stringify(documentValue), "utf8") > CAMPAIGNCUE_CUE_LAYERS.MAX_EDITOR_DOCUMENT_BYTES) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Editor document is too large." });
    }
});

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
    layerId: z.string().trim().regex(idPattern).min(2).max(160).optional(),
});

export const CampaignCueCueLayerExportSchema = z.object({
    document: CampaignCueCueLayerEditorDocumentSchema.optional(),
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
