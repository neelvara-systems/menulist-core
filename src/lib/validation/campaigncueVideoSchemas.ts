import { CAMPAIGNCUE_VIDEO_STUDIO } from "@constant/campaigncue/videoReel";
import { z } from "zod";

const id = z.string().trim().regex(/^[a-zA-Z0-9_-]+$/).min(3).max(160);
const idempotencyKey = z.string().trim().regex(/^[a-zA-Z0-9_-]+$/).min(8).max(120);
const aspectRatio = z.enum(["9:16", "1:1", "16:9"]);
const audioTrack = z.object({
    mode: z.enum(["none", "asset", "session_file"]),
    assetId: id.optional(),
    volume: z.number().finite().min(0).max(1),
}).strict().superRefine((track, context) => {
    if (track.mode === "asset" && !track.assetId) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Select an audio asset", path: ["assetId"] });
    }
    if (track.mode !== "asset" && track.assetId) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Audio asset is only valid in asset mode", path: ["assetId"] });
    }
});

export const CampaignCueVideoAudioMixSchema = z.object({
    voiceover: audioTrack,
    backgroundMusic: audioTrack,
    ducking: z.boolean(),
}).strict();

export const CampaignCueVideoSceneSchema = z.object({
    id,
    enabled: z.boolean(),
    purpose: z.enum(["hook", "proof", "detail", "cta"]),
    script: z.string().trim().min(1).max(1200),
    overlay: z.string().trim().min(1).max(240),
    caption: z.string().trim().max(500),
    durationSeconds: z.number().finite()
        .min(CAMPAIGNCUE_VIDEO_STUDIO.MIN_SCENE_SECONDS)
        .max(CAMPAIGNCUE_VIDEO_STUDIO.MAX_SCENE_SECONDS),
    motion: z.enum(["none", "pan_left", "pan_right", "zoom_in", "zoom_out"]),
    transition: z.enum(["cut", "fade", "slide"]),
    assetId: id.optional(),
    sourceReferences: z.array(z.string().trim().min(1).max(500)).max(40),
}).strict();

const create = z.object({
    action: z.literal("create"),
    campaignId: id,
    outputId: id,
    aspectRatio: aspectRatio.optional(),
    idempotencyKey,
}).strict();

const save = z.object({
    action: z.literal("save"),
    projectId: id,
    expectedVersion: z.number().int().min(1).max(10_000),
    title: z.string().trim().min(3).max(120),
    aspectRatio,
    selectedVariantId: id,
    scenes: z.array(CampaignCueVideoSceneSchema)
        .min(CAMPAIGNCUE_VIDEO_STUDIO.MIN_SCENES)
        .max(CAMPAIGNCUE_VIDEO_STUDIO.MAX_SCENES),
    captions: z.object({
        enabled: z.boolean(),
        position: z.enum(["top", "center", "bottom"]),
    }).strict(),
    audio: CampaignCueVideoAudioMixSchema,
    idempotencyKey,
}).strict().superRefine((input, context) => {
    const total = input.scenes.reduce((sum, scene) => sum + (scene.enabled ? scene.durationSeconds : 0), 0);
    if (total > CAMPAIGNCUE_VIDEO_STUDIO.MAX_TOTAL_SECONDS) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Video duration must be ${CAMPAIGNCUE_VIDEO_STUDIO.MAX_TOTAL_SECONDS} seconds or less`,
            path: ["scenes"],
        });
    }
    if (new Set(input.scenes.map((scene) => scene.id)).size !== input.scenes.length) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Scene ids must be unique",
            path: ["scenes"],
        });
    }
    if (!input.scenes.some((scene) => scene.enabled)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "At least one scene must be included",
            path: ["scenes"],
        });
    }
});

const approval = z.object({
    action: z.enum(["approve", "reject"]),
    projectId: id,
    expectedVersion: z.number().int().min(1).max(10_000),
    note: z.string().trim().max(400).optional(),
    idempotencyKey,
}).strict().superRefine((input, context) => {
    if (input.action === "reject" && !input.note) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Add a short reason before rejecting the video",
            path: ["note"],
        });
    }
});

const addReviewNote = z.object({
    action: z.literal("add_review_note"),
    projectId: id,
    expectedVersion: z.number().int().min(1).max(10_000),
    sceneId: id.optional(),
    message: z.string().trim().min(2).max(500),
    idempotencyKey,
}).strict();

const resolveReviewNote = z.object({
    action: z.literal("resolve_review_note"),
    projectId: id,
    expectedVersion: z.number().int().min(1).max(10_000),
    noteId: id,
    idempotencyKey,
}).strict();

const renderReceiptBase = {
    id,
    attempt: z.number().int().min(1).max(100),
    projectVersion: z.number().int().min(1).max(10_000),
    versionBinding: z.literal("exact"),
    aspectRatio,
    durationSeconds: z.number().finite().min(1).max(CAMPAIGNCUE_VIDEO_STUDIO.MAX_TOTAL_SECONDS),
    rightsEvidence: z.object({
        assetIds: z.array(id).max(CAMPAIGNCUE_VIDEO_STUDIO.MAX_SCENES + 2),
        sessionMediaUsed: z.boolean(),
        sessionMediaRightsConfirmed: z.boolean(),
    }).strict(),
    credit: z.object({
        estimated: z.literal(0),
        reserved: z.literal(0),
        captured: z.literal(0),
        refunded: z.literal(0),
        currency: z.literal("credits"),
    }).strict(),
};

const renderReceipt = z.object({
    action: z.literal("render_receipt"),
    projectId: id,
    expectedVersion: z.number().int().min(1).max(10_000),
    receipt: z.discriminatedUnion("status", [
        z.object({
            ...renderReceiptBase,
            status: z.literal("started"),
            progressPercent: z.literal(0),
        }).strict(),
        z.object({
            ...renderReceiptBase,
            status: z.literal("completed"),
            progressPercent: z.literal(100),
            mimeType: z.enum(["video/mp4", "video/webm"]),
            sizeBytes: z.number().int().min(1).max(CAMPAIGNCUE_VIDEO_STUDIO.MAX_RENDER_SIZE_BYTES),
        }).strict(),
        z.object({
            ...renderReceiptBase,
            status: z.literal("failed"),
            progressPercent: z.number().int().min(0).max(99),
            errorCode: z.enum(["browser_unsupported", "media_decode_failed", "recording_failed", "download_failed", "render_interrupted"]),
        }).strict(),
        z.object({
            ...renderReceiptBase,
            status: z.literal("cancelled"),
            progressPercent: z.number().int().min(0).max(99),
            errorCode: z.literal("render_cancelled"),
        }).strict(),
    ]),
    idempotencyKey,
}).strict();

const renderProgress = z.object({
    action: z.literal("render_progress"),
    projectId: id,
    expectedVersion: z.number().int().min(1).max(10_000),
    receiptId: id,
    attempt: z.number().int().min(1).max(100),
    progressPercent: z.union([z.literal(25), z.literal(50), z.literal(75)]),
    idempotencyKey,
}).strict();

const recordResult = z.object({
    action: z.literal("record_result"),
    projectId: id,
    expectedVersion: z.number().int().min(1).max(10_000),
    renderReceiptId: id,
    signalId: z.enum(["useful", "not_useful", "not_used"]),
    note: z.string().trim().max(1000).optional(),
    idempotencyKey,
}).strict();

export const CampaignCueVideoProjectMutationSchema = z.union([
    create,
    save,
    approval,
    addReviewNote,
    resolveReviewNote,
    renderReceipt,
    renderProgress,
    recordResult,
]);

export type CampaignCueVideoProjectMutationData = z.infer<typeof CampaignCueVideoProjectMutationSchema>;
