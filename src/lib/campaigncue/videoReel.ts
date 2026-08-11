import { CAMPAIGNCUE_VIDEO_STUDIO } from "@constant/campaigncue/videoReel";
import type {
    CampaignCueAsset,
    CampaignCueBusinessBrain,
    CampaignCueCampaign,
    CampaignCueOutput,
    CampaignCueTrustGate,
} from "@type/campaigncue";
import type {
    CampaignCueVideoAudioMix,
    CampaignCueVideoCaptureTask,
    CampaignCueVideoContentCoach,
    CampaignCueVideoContentCoachCheck,
    CampaignCueVideoCopyVariant,
    CampaignCueVideoFormatLearning,
    CampaignCueVideoFormatSnapshot,
    CampaignCueVideoProject,
    CampaignCueVideoRenderReceipt,
    CampaignCueVideoResultSignal,
    CampaignCueVideoScene,
    CampaignCueVideoTrustFinding,
    CampaignCueVideoVersionSnapshot,
} from "@type/campaigncueVideo";
import { z } from "zod";
import { CampaignCueVideoSceneSchema } from "@lib/validation/campaigncueVideoSchemas";

const boundedId = z.string().trim().regex(/^[a-zA-Z0-9_-]+$/).min(3).max(160);
const boundedText = (max: number) => z.string().trim().min(1).max(max);
const timestamp = z.unknown().optional();

const copyVariantSchema = z.object({
    id: boundedId,
    label: boundedText(80),
    hook: boundedText(240),
    caption: boundedText(500),
    cta: boundedText(240),
}).strict();

const trustFindingSchema = z.object({
    id: boundedId,
    severity: z.enum(["info", "warning", "needs_fix", "blocked"]),
    message: boundedText(500),
    recommendation: boundedText(500),
}).strict();

const audioTrackSchema = z.object({
    mode: z.enum(["none", "asset", "session_file"]),
    assetId: boundedId.optional(),
    volume: z.number().finite().min(0).max(1),
}).strict();

const audioMixSchema = z.object({
    voiceover: audioTrackSchema,
    backgroundMusic: audioTrackSchema,
    ducking: z.boolean(),
}).strict();

const zeroCreditSchema = z.object({
    estimated: z.literal(0),
    reserved: z.literal(0),
    captured: z.literal(0),
    refunded: z.literal(0),
    currency: z.literal("credits"),
}).strict();

const rightsEvidenceSchema = z.object({
    assetIds: z.array(boundedId).max(CAMPAIGNCUE_VIDEO_STUDIO.MAX_SCENES + 2),
    sessionMediaUsed: z.boolean(),
    sessionMediaRightsConfirmed: z.boolean(),
}).strict();

const persistedRenderReceiptBase = {
    id: boundedId,
    attempt: z.number().int().min(1).max(100),
    projectVersion: z.number().int().min(1).max(10_000).optional(),
    versionBinding: z.enum(["exact", "legacy_unverified"]),
    aspectRatio: z.enum(["9:16", "1:1", "16:9"]),
    durationSeconds: z.number().finite().min(1).max(CAMPAIGNCUE_VIDEO_STUDIO.MAX_TOTAL_SECONDS),
    progressPercent: z.number().int().min(0).max(100),
    heartbeatAt: timestamp,
    rightsEvidence: rightsEvidenceSchema,
    credit: zeroCreditSchema,
    createdAt: timestamp,
};

const renderReceiptStatusSchema = z.discriminatedUnion("status", [
    z.object({
        ...persistedRenderReceiptBase,
        status: z.literal("started"),
    }).strict(),
    z.object({
        ...persistedRenderReceiptBase,
        status: z.literal("completed"),
        mimeType: z.enum(["video/mp4", "video/webm"]),
        sizeBytes: z.number().int().min(1).max(CAMPAIGNCUE_VIDEO_STUDIO.MAX_RENDER_SIZE_BYTES),
        completedAt: timestamp,
    }).strict(),
    z.object({
        ...persistedRenderReceiptBase,
        status: z.literal("failed"),
        errorCode: z.enum(["browser_unsupported", "media_decode_failed", "recording_failed", "download_failed", "render_interrupted"]),
        completedAt: timestamp,
    }).strict(),
    z.object({
        ...persistedRenderReceiptBase,
        status: z.literal("cancelled"),
        errorCode: z.literal("render_cancelled"),
        completedAt: timestamp,
    }).strict(),
]);

const renderReceiptVersionBindingSchema = z.discriminatedUnion("versionBinding", [
    z.object({
        versionBinding: z.literal("exact"),
        projectVersion: z.number().int().min(1).max(10_000),
    }),
    z.object({
        versionBinding: z.literal("legacy_unverified"),
        projectVersion: z.never().optional(),
    }),
]);

const renderReceiptSchema = renderReceiptStatusSchema.and(renderReceiptVersionBindingSchema);

const videoFormatSnapshotSchema = z.object({
    projectVersion: z.number().int().min(1).max(10_000),
    aspectRatio: z.enum(["9:16", "1:1", "16:9"]),
    hookType: z.enum(["question", "curiosity", "demonstration", "offer", "story", "direct_benefit"]).optional(),
    format: z.enum(["talking_head", "demonstration", "montage", "screen_recording", "mixed"]).optional(),
    pacing: z.enum(["calm", "steady", "fast"]).optional(),
    durationBand: z.enum(["under_15_seconds", "15_to_30_seconds", "31_to_60_seconds"]),
    scenePurposes: z.array(z.enum(["hook", "proof", "detail", "cta"])).min(1).max(CAMPAIGNCUE_VIDEO_STUDIO.MAX_SCENES),
    durationSeconds: z.number().finite().min(1).max(CAMPAIGNCUE_VIDEO_STUDIO.MAX_TOTAL_SECONDS),
}).strict();

const getCampaignCueVideoDurationBand = (
    durationSeconds: number,
): CampaignCueVideoFormatSnapshot["durationBand"] => {
    if (durationSeconds < 15) return "under_15_seconds";
    if (durationSeconds <= 30) return "15_to_30_seconds";
    return "31_to_60_seconds";
};

const serializeCampaignCueVideoFormatSignature = (snapshot: CampaignCueVideoFormatSnapshot): string => [
    "campaigncue-video-format.v1",
    snapshot.aspectRatio,
    snapshot.hookType || "owner_original",
    snapshot.format || "custom",
    snapshot.pacing || "custom",
    snapshot.durationBand,
    snapshot.scenePurposes.join(">"),
].join("|");

const persistedResultMemoryBase = {
    signalId: z.enum(["useful", "not_useful", "not_used"]),
    renderReceiptId: boundedId,
    note: z.string().trim().max(1000).optional(),
    recordedBy: boundedId,
    recordedAt: timestamp,
};

const resultMemorySchema = z.discriminatedUnion("versionBinding", [
    z.object({
        ...persistedResultMemoryBase,
        versionBinding: z.literal("exact"),
        projectVersion: z.number().int().min(1).max(10_000),
        formatSignature: boundedText(500),
        formatSnapshot: videoFormatSnapshotSchema,
    }).strict(),
    z.object({
        ...persistedResultMemoryBase,
        versionBinding: z.literal("legacy_unverified"),
    }).strict(),
]).superRefine((memory, context) => {
    if (memory.versionBinding !== "exact") return;
    if (memory.projectVersion !== memory.formatSnapshot.projectVersion) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Exact video result version evidence does not match",
            path: ["formatSnapshot", "projectVersion"],
        });
    }
    if (memory.formatSnapshot.durationBand !== getCampaignCueVideoDurationBand(memory.formatSnapshot.durationSeconds)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Video format duration evidence does not match",
            path: ["formatSnapshot", "durationBand"],
        });
    }
    if (memory.formatSignature !== serializeCampaignCueVideoFormatSignature(memory.formatSnapshot)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Video format signature does not match its evidence",
            path: ["formatSignature"],
        });
    }
});

const versionSchema = z.object({
    version: z.number().int().min(1).max(10_000),
    aspectRatio: z.enum(["9:16", "1:1", "16:9"]),
    selectedVariantId: boundedId,
    scenes: z.array(CampaignCueVideoSceneSchema).min(1).max(CAMPAIGNCUE_VIDEO_STUDIO.MAX_SCENES),
    captions: z.object({ enabled: z.boolean(), position: z.enum(["top", "center", "bottom"]) }).strict(),
    audio: audioMixSchema,
    trustGate: z.enum(["clear", "warning", "needs_fix", "blocked"]),
    trustFindings: z.array(trustFindingSchema).max(30),
    reviewedAssetIds: z.array(boundedId).max(CAMPAIGNCUE_VIDEO_STUDIO.MAX_SCENES + 2),
    createdAt: timestamp,
    createdByUserId: boundedId,
}).strict();

const projectSchema = z.object({
    id: boundedId,
    workspaceId: boundedId,
    campaignId: boundedId,
    outputId: boundedId,
    title: boundedText(120),
    status: z.enum(["draft", "approved", "rejected"]),
    version: z.number().int().min(1).max(10_000),
    aspectRatio: z.enum(["9:16", "1:1", "16:9"]),
    selectedVariantId: boundedId,
    variants: z.array(copyVariantSchema).min(1).max(CAMPAIGNCUE_VIDEO_STUDIO.MAX_VARIANTS),
    scenes: z.array(CampaignCueVideoSceneSchema).min(1).max(CAMPAIGNCUE_VIDEO_STUDIO.MAX_SCENES),
    brand: z.object({
        businessName: boundedText(120),
        primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        voice: z.enum(["calm", "friendly", "premium", "direct"]),
    }).strict(),
    captions: z.object({ enabled: z.boolean(), position: z.enum(["top", "center", "bottom"]) }).strict(),
    audio: audioMixSchema,
    sourceReferences: z.array(boundedText(500)).min(1).max(80),
    patternCue: z.object({
        sourceInputId: boundedId,
        sourceHash: boundedText(160),
        platform: z.enum(["instagram", "tiktok", "youtube", "other"]),
        rightsStatus: z.enum(["reference_only", "owner_authorized"]),
        hookType: z.enum(["question", "curiosity", "demonstration", "offer", "story", "direct_benefit"]).optional(),
        format: z.enum(["talking_head", "demonstration", "montage", "screen_recording", "mixed"]).optional(),
        pacing: z.enum(["calm", "steady", "fast"]).optional(),
        durationBand: z.enum(["under_15_seconds", "15_to_30_seconds", "31_to_60_seconds", "over_60_seconds", "unknown"]).optional(),
    }).strict().optional(),
    trustGate: z.enum(["clear", "warning", "needs_fix", "blocked"]),
    trustFindings: z.array(trustFindingSchema).max(30),
    approval: z.object({
        actorId: boundedId,
        version: z.number().int().min(1).max(10_000),
        note: z.string().trim().max(400).optional(),
        decidedAt: timestamp,
    }).strict().optional(),
    reviewNotes: z.array(z.object({
        id: boundedId,
        sceneId: boundedId.optional(),
        message: boundedText(500),
        status: z.enum(["open", "resolved"]),
        authorId: boundedId,
        createdAt: timestamp,
        resolvedAt: timestamp,
        resolvedBy: boundedId.optional(),
    }).strict()).max(CAMPAIGNCUE_VIDEO_STUDIO.MAX_REVIEW_NOTES),
    versions: z.array(versionSchema).max(CAMPAIGNCUE_VIDEO_STUDIO.MAX_HISTORY),
    renderReceipts: z.array(renderReceiptSchema).max(CAMPAIGNCUE_VIDEO_STUDIO.MAX_RENDER_RECEIPTS),
    resultMemory: resultMemorySchema.optional(),
    reusableBlueprint: z.object({
        sourceProjectId: boundedId,
        sourceVersion: z.number().int().min(1).max(10_000),
        label: boundedText(120),
        aspectRatio: z.enum(["9:16", "1:1", "16:9"]),
        captions: z.object({ enabled: z.boolean(), position: z.enum(["top", "center", "bottom"]) }).strict(),
        scenes: z.array(z.object({
            purpose: z.enum(["hook", "proof", "detail", "cta"]),
            enabled: z.boolean(),
            durationSeconds: z.number().finite().min(1).max(CAMPAIGNCUE_VIDEO_STUDIO.MAX_SCENE_SECONDS),
            motion: z.enum(["none", "pan_left", "pan_right", "zoom_in", "zoom_out"]),
            transition: z.enum(["cut", "fade", "slide"]),
        }).strict()).min(1).max(CAMPAIGNCUE_VIDEO_STUDIO.MAX_SCENES),
    }).strict().optional(),
    cost: z.object({
        providerCalls: z.literal(0),
        providerCredits: z.literal(0),
        renderer: z.literal("campaigncue_browser_compositor"),
    }).strict(),
    createdByUserId: boundedId,
    createdAt: timestamp,
    updatedAt: timestamp,
}).strict();

const compact = (value: unknown, max: number, fallback: string) => {
    const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
    return (text || fallback).slice(0, max);
};

const unique = (values: Array<string | undefined>, max = 80) => (
    Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).slice(0, max)
);

export const emptyCampaignCueVideoAudioMix = (): CampaignCueVideoAudioMix => ({
    voiceover: { mode: "none", volume: 0.9 },
    backgroundMusic: { mode: "none", volume: 0.45 },
    ducking: true,
});

export const getCampaignCueVideoAssetIds = (
    scenes: CampaignCueVideoScene[],
    audio: CampaignCueVideoAudioMix,
) => unique([
    ...scenes.filter((scene) => scene.enabled).map((scene) => scene.assetId),
    audio.voiceover.mode === "asset" ? audio.voiceover.assetId : undefined,
    audio.backgroundMusic.mode === "asset" ? audio.backgroundMusic.assetId : undefined,
], CAMPAIGNCUE_VIDEO_STUDIO.MAX_SCENES + 2);

const sentenceCandidates = (value: string) => (
    value
        .split(/(?:\n+|(?<=[.!?])\s+)/)
        .map((item) => item.trim().replace(/^[-*•\d.()\s]+/, ""))
        .filter(Boolean)
);

const trustRank: Record<CampaignCueTrustGate, number> = {
    clear: 0,
    warning: 1,
    needs_fix: 2,
    blocked: 3,
};

const gateFromFindings = (findings: CampaignCueVideoTrustFinding[]): CampaignCueTrustGate => {
    if (findings.some((finding) => finding.severity === "blocked")) return "blocked";
    if (findings.some((finding) => finding.severity === "needs_fix")) return "needs_fix";
    if (findings.some((finding) => finding.severity === "warning")) return "warning";
    return "clear";
};

export const getCampaignCueVideoSourceTrustGate = (
    campaignGate: CampaignCueTrustGate,
    outputGate: CampaignCueTrustGate,
): CampaignCueTrustGate => (
    trustRank[outputGate] > trustRank[campaignGate] ? outputGate : campaignGate
);

export const getCampaignCueVideoDuration = (scenes: CampaignCueVideoScene[]) => (
    Number(scenes.reduce((sum, scene) => sum + (scene.enabled ? scene.durationSeconds : 0), 0).toFixed(2))
);

export function buildCampaignCueVideoFormatSnapshot(
    project: CampaignCueVideoProject,
    version: CampaignCueVideoVersionSnapshot,
): CampaignCueVideoFormatSnapshot {
    const includedScenes = version.scenes.filter((scene) => scene.enabled);
    const durationSeconds = getCampaignCueVideoDuration(includedScenes);
    return videoFormatSnapshotSchema.parse({
        projectVersion: version.version,
        aspectRatio: version.aspectRatio,
        hookType: project.patternCue?.hookType,
        format: project.patternCue?.format,
        pacing: project.patternCue?.pacing,
        durationBand: getCampaignCueVideoDurationBand(durationSeconds),
        scenePurposes: includedScenes.map((scene) => scene.purpose),
        durationSeconds,
    });
}

export function buildCampaignCueVideoFormatSignature(snapshot: CampaignCueVideoFormatSnapshot): string {
    return serializeCampaignCueVideoFormatSignature(snapshot);
}

export function buildCampaignCueVideoFormatLearning(
    projects: CampaignCueVideoProject[],
): CampaignCueVideoFormatLearning[] {
    const grouped = new Map<string, {
        formatSignature: string;
        label: string;
        usefulCount: number;
        notUsefulCount: number;
        notUsedCount: number;
    }>();

    projects.forEach((project) => {
        const memory = project.resultMemory;
        if (
            !memory
            || memory.versionBinding !== "exact"
            || !memory.formatSignature
            || !memory.formatSnapshot
        ) return;
        const snapshot = memory.formatSnapshot;
        const current = grouped.get(memory.formatSignature) || {
            formatSignature: memory.formatSignature,
            label: `${(snapshot.format || "custom").replace(/_/g, " ")} - ${snapshot.aspectRatio} - ${snapshot.scenePurposes.length} scenes`,
            usefulCount: 0,
            notUsefulCount: 0,
            notUsedCount: 0,
        };
        if (memory.signalId === "useful") current.usefulCount += 1;
        else if (memory.signalId === "not_useful") current.notUsefulCount += 1;
        else current.notUsedCount += 1;
        grouped.set(memory.formatSignature, current);
    });

    return Array.from(grouped.values()).map((item): CampaignCueVideoFormatLearning => {
        const status = item.usefulCount > item.notUsefulCount
            ? "use_again"
            : item.notUsefulCount > item.usefulCount
                ? "avoid_for_now"
                : "insufficient_evidence";
        const summary = status === "use_again"
            ? `Useful ${item.usefulCount} time${item.usefulCount === 1 ? "" : "s"}; keep this as a starting structure.`
            : status === "avoid_for_now"
                ? `Marked not useful ${item.notUsefulCount} time${item.notUsefulCount === 1 ? "" : "s"}; try a different structure.`
                : "There is not enough owner-reported evidence to prefer this structure yet.";
        return { ...item, status, summary };
    }).sort((left, right) => {
        const leftEvidence = left.usefulCount + left.notUsefulCount + left.notUsedCount;
        const rightEvidence = right.usefulCount + right.notUsefulCount + right.notUsedCount;
        return rightEvidence - leftEvidence || left.label.localeCompare(right.label);
    });
}

const coachCheck = (
    check: CampaignCueVideoContentCoachCheck,
): CampaignCueVideoContentCoachCheck => check;

export function evaluateCampaignCueVideoContentCoach(params: {
    project: CampaignCueVideoProject;
    assets?: CampaignCueAsset[];
    sessionMediaSceneIds?: string[];
    sessionMediaUsed?: boolean;
    sessionMediaRightsConfirmed?: boolean;
}): CampaignCueVideoContentCoach {
    const { project } = params;
    const includedScenes = project.scenes.filter((scene) => scene.enabled);
    const firstScene = includedScenes[0];
    const lastScene = includedScenes[includedScenes.length - 1];
    const sessionMediaSceneIds = new Set(params.sessionMediaSceneIds || []);
    const assetsById = new Map((params.assets || []).map((asset) => [asset.id, asset]));
    const totalDuration = getCampaignCueVideoDuration(includedScenes);
    const checks: CampaignCueVideoContentCoachCheck[] = [];

    if (!firstScene || firstScene.purpose !== "hook") {
        checks.push(coachCheck({
            id: "opening_clarity",
            label: "Opening",
            status: "fix",
            summary: "The video does not open with a clear hook.",
            recommendation: "Move a short, truthful hook into the first scene.",
            sceneId: firstScene?.id,
        }));
    } else if (firstScene.durationSeconds > 5 || firstScene.overlay.length > 90) {
        checks.push(coachCheck({
            id: "opening_clarity",
            label: "Opening",
            status: "review",
            summary: "The opening may take too long to understand.",
            recommendation: "Keep the first scene near five seconds and make its visible line easier to scan.",
            sceneId: firstScene.id,
        }));
    } else {
        checks.push(coachCheck({
            id: "opening_clarity",
            label: "Opening",
            status: "ready",
            summary: "The video starts with a short, visible hook.",
            recommendation: "Keep the opening tied to the checked campaign promise.",
            sceneId: firstScene.id,
        }));
    }

    const proofScene = includedScenes.find((scene) => {
        if (scene.purpose !== "proof" && scene.purpose !== "detail") return false;
        if (sessionMediaSceneIds.has(scene.id)) return Boolean(params.sessionMediaRightsConfirmed);
        if (!scene.assetId) return false;
        const asset = assetsById.get(scene.assetId);
        return Boolean(
            asset
            && (asset.assetType === "image" || asset.assetType === "video")
            && (asset.source === "upload" || asset.source === "imported")
            && asset.status === "ready"
            && asset.rights.status === "confirmed"
        );
    });
    checks.push(coachCheck(proofScene ? {
        id: "real_business_proof",
        label: "Real proof",
        status: "ready",
        summary: "An owner-controlled business image or clip is linked to the story.",
        recommendation: "Prefer the real product, service, place, or owner-controlled demonstration.",
        sceneId: proofScene.id,
    } : {
        id: "real_business_proof",
        label: "Real proof",
        status: "review",
        summary: "The story currently relies on text and brand motion.",
        recommendation: "Add one real product, service, place, or demonstration shot when available.",
        sceneId: includedScenes.find((scene) => scene.purpose === "proof" || scene.purpose === "detail")?.id,
    }));

    const longScene = includedScenes.find((scene) => scene.durationSeconds > 8);
    checks.push(coachCheck(totalDuration < 6 || totalDuration > 45 ? {
        id: "pacing",
        label: "Pacing",
        status: "fix",
        summary: `The included runtime is ${totalDuration} seconds.`,
        recommendation: "Keep a useful short-video structure between 6 and 45 seconds.",
        sceneId: longScene?.id,
    } : longScene || totalDuration > 30 ? {
        id: "pacing",
        label: "Pacing",
        status: "review",
        summary: `The ${totalDuration}-second story may feel slow in places.`,
        recommendation: "Keep most scenes between two and eight seconds and remove repeated detail.",
        sceneId: longScene?.id,
    } : {
        id: "pacing",
        label: "Pacing",
        status: "ready",
        summary: `The ${totalDuration}-second story is within the focused short-video range.`,
        recommendation: "Watch the final render once for pauses and repeated information.",
    }));

    const denseScene = includedScenes.find((scene) => (
        scene.overlay.length > 160
        || scene.overlay.length / Math.max(1, scene.durationSeconds) > 28
    ));
    const reviewDensityScene = includedScenes.find((scene) => (
        scene.overlay.length > 100
        || scene.overlay.length / Math.max(1, scene.durationSeconds) > 18
    ));
    checks.push(coachCheck(denseScene ? {
        id: "text_density",
        label: "Readable text",
        status: "fix",
        summary: "At least one visible line is too dense for its scene time.",
        recommendation: "Shorten the overlay or give the scene more time. Keep supporting detail in the caption or narration.",
        sceneId: denseScene.id,
    } : reviewDensityScene ? {
        id: "text_density",
        label: "Readable text",
        status: "review",
        summary: "One visible line may be difficult to scan on a phone.",
        recommendation: "Shorten the line and keep only the main offer or action on screen.",
        sceneId: reviewDensityScene.id,
    } : {
        id: "text_density",
        label: "Readable text",
        status: "ready",
        summary: "Visible lines fit their scene time.",
        recommendation: "Check the exported file on a phone before public use.",
    }));

    const ctaScene = includedScenes.find((scene) => scene.purpose === "cta" && scene.overlay.trim());
    checks.push(coachCheck(!ctaScene ? {
        id: "cta_visibility",
        label: "Next action",
        status: "fix",
        summary: "The video has no visible final action.",
        recommendation: "Add one checked call to action, such as call, message, visit, book, or order.",
    } : lastScene?.id !== ctaScene.id ? {
        id: "cta_visibility",
        label: "Next action",
        status: "review",
        summary: "The action appears before the final scene.",
        recommendation: "End with the checked action so the owner or customer knows what to do next.",
        sceneId: ctaScene.id,
    } : {
        id: "cta_visibility",
        label: "Next action",
        status: "ready",
        summary: "The video ends with a visible checked action.",
        recommendation: "Confirm the destination still matches the campaign pack before export.",
        sceneId: ctaScene.id,
    }));

    const selectedAssetIds = getCampaignCueVideoAssetIds(project.scenes, project.audio);
    const unavailableAsset = selectedAssetIds
        .map((assetId) => assetsById.get(assetId))
        .find((asset) => !asset || asset.status !== "ready" || asset.rights.status === "restricted");
    const assetNeedsRightsReview = selectedAssetIds
        .map((assetId) => assetsById.get(assetId))
        .find((asset) => asset?.rights.status === "needs_review");
    const sessionRightsMissing = Boolean(params.sessionMediaUsed && !params.sessionMediaRightsConfirmed);
    checks.push(coachCheck(project.trustGate === "blocked" || project.trustGate === "needs_fix" || sessionRightsMissing || unavailableAsset ? {
        id: "source_and_rights",
        label: "Facts and rights",
        status: "fix",
        summary: sessionRightsMissing
            ? "Session media rights have not been confirmed."
            : unavailableAsset
                ? "A selected saved asset is unavailable, blocked, or restricted."
            : "The current project has a blocking fact or rights check.",
        recommendation: sessionRightsMissing
            ? "Confirm permission for every image, clip, person, logo, narration, and music file used in this render."
            : unavailableAsset
                ? "Remove the asset or choose an available asset with confirmed rights."
            : "Resolve the Trust Center findings before approval or export.",
    } : project.trustGate === "warning" || assetNeedsRightsReview ? {
        id: "source_and_rights",
        label: "Facts and rights",
        status: "review",
        summary: assetNeedsRightsReview
            ? "A selected saved asset still needs a rights review."
            : "The project has a fact or rights warning to review.",
        recommendation: assetNeedsRightsReview
            ? "Confirm permission for the selected media before approval or export."
            : "Review the current Trust Center warning before approval.",
    } : {
        id: "source_and_rights",
        label: "Facts and rights",
        status: "ready",
        summary: "The saved project has no blocking fact or rights finding.",
        recommendation: "Recheck the downloaded file before posting it manually.",
    }));

    const readyCount = checks.filter((check) => check.status === "ready").length;
    const reviewCount = checks.filter((check) => check.status === "review").length;
    const fixCount = checks.filter((check) => check.status === "fix").length;
    return {
        projectVersion: project.version,
        status: fixCount ? "needs_fix" : reviewCount ? "needs_review" : "ready",
        readyCount,
        reviewCount,
        fixCount,
        checks,
    };
}

export function buildCampaignCueVideoCaptureChecklist(
    project: CampaignCueVideoProject,
    sessionMediaSceneIds: string[] = [],
): CampaignCueVideoCaptureTask[] {
    const sessionIds = new Set(sessionMediaSceneIds);
    const titles: Record<CampaignCueVideoScene["purpose"], string> = {
        hook: "Record the opening",
        proof: "Show real proof",
        detail: "Show the useful detail",
        cta: "Record the final action",
    };
    return project.scenes.filter((scene) => scene.enabled).map((scene) => ({
        id: `capture_${scene.id}`,
        sceneId: scene.id,
        title: titles[scene.purpose],
        direction: scene.assetId || sessionIds.has(scene.id)
            ? `Media is ready for: ${scene.overlay}`
            : `Capture one steady owner-controlled shot for: ${scene.overlay}`,
        durationSeconds: scene.durationSeconds,
        status: scene.assetId || sessionIds.has(scene.id) ? "ready" : "record",
    }));
}

export function getCampaignCueVideoResultCounterDelta(
    previous: CampaignCueVideoResultSignal | undefined,
    next: CampaignCueVideoResultSignal,
): { usefulDelta: number; notUsefulDelta: number; newOutcomeDelta: 0 | 1 } {
    return {
        usefulDelta: Number(next === "useful") - Number(previous === "useful"),
        notUsefulDelta: Number(next === "not_useful") - Number(previous === "not_useful"),
        newOutcomeDelta: previous ? 0 : 1,
    };
}

const sameBoundedIds = (left: string[], right: string[]): boolean => {
    if (new Set(left).size !== left.length || new Set(right).size !== right.length) return false;
    const sortedLeft = [...left].sort();
    const sortedRight = [...right].sort();
    return sortedLeft.length === sortedRight.length
        && sortedLeft.every((value, index) => value === sortedRight[index]);
};

export function isCampaignCueVideoRenderEvidenceConsistent(params: {
    project: CampaignCueVideoProject;
    receipt: Pick<
        Extract<CampaignCueVideoRenderReceipt, { versionBinding: "exact" }>,
        "aspectRatio" | "durationSeconds" | "projectVersion" | "rightsEvidence" | "versionBinding"
    >;
    existing?: CampaignCueVideoRenderReceipt;
}): boolean {
    const { existing, project, receipt } = params;
    const expectedAssetIds = getCampaignCueVideoAssetIds(project.scenes, project.audio);
    const expectedDuration = getCampaignCueVideoDuration(project.scenes);
    const requiresSessionAudio = project.audio.voiceover.mode === "session_file"
        || project.audio.backgroundMusic.mode === "session_file";
    if (
        receipt.projectVersion !== project.version
        || receipt.aspectRatio !== project.aspectRatio
        || Math.abs(receipt.durationSeconds - expectedDuration) > 0.01
        || !sameBoundedIds(receipt.rightsEvidence.assetIds, expectedAssetIds)
        || (requiresSessionAudio && !receipt.rightsEvidence.sessionMediaUsed)
        || (receipt.rightsEvidence.sessionMediaUsed && !receipt.rightsEvidence.sessionMediaRightsConfirmed)
    ) return false;
    if (!existing) return true;
    return existing.versionBinding === "exact"
        && existing.projectVersion === receipt.projectVersion
        && existing.aspectRatio === receipt.aspectRatio
        && Math.abs(existing.durationSeconds - receipt.durationSeconds) <= 0.01
        && sameBoundedIds(existing.rightsEvidence.assetIds, receipt.rightsEvidence.assetIds)
        && existing.rightsEvidence.sessionMediaUsed === receipt.rightsEvidence.sessionMediaUsed
        && existing.rightsEvidence.sessionMediaRightsConfirmed === receipt.rightsEvidence.sessionMediaRightsConfirmed;
}

export function buildCampaignCueVideoStoryboardText(project: CampaignCueVideoProject): string {
    const includedSceneCount = project.scenes.filter((scene) => scene.enabled).length;
    const lines = [
        "CampaignCue video storyboard",
        "",
        `Project: ${project.title}`,
        `Business: ${project.brand.businessName}`,
        `Version: ${project.version}`,
        `Format: ${project.aspectRatio}`,
        `Included runtime: ${getCampaignCueVideoDuration(project.scenes)} seconds`,
        `Scenes: ${includedSceneCount} included of ${project.scenes.length}`,
        `Review: ${project.status}${project.approval?.version === project.version ? ` for version ${project.version}` : ""}`,
        `Checks: ${project.trustGate.replace(/_/g, " ")}`,
        "",
        "This storyboard is source-linked. Recheck business details, media rights, and the final file before posting manually.",
        "",
    ];

    project.scenes.forEach((scene, index) => {
        lines.push(
            `Scene ${index + 1} - ${scene.purpose} - ${scene.enabled ? "included" : "skipped"}`,
            `Duration: ${scene.durationSeconds} seconds`,
            `Overlay: ${scene.overlay}`,
            `Script: ${scene.script}`,
            `Caption: ${scene.caption || "None"}`,
            `Motion: ${scene.motion.replace(/_/g, " ")}`,
            `Transition: ${scene.transition}`,
            `Media: ${scene.assetId ? "CampaignCue Asset Library image" : "Brand motion or session-local owner media"}`,
            `Source links: ${scene.sourceReferences.length}`,
            "",
        );
    });

    lines.push(
        "Delivery boundary",
        "CampaignCue does not post this video, connect a social account, or change ad spend.",
        "Session-local image and audio files are not embedded in this storyboard.",
    );
    return `${lines.join("\n")}\n`;
}

export const canApplyCampaignCueVideoRenderReceipt = (
    existing: CampaignCueVideoProject["renderReceipts"][number] | undefined,
    next: Pick<CampaignCueVideoProject["renderReceipts"][number], "attempt" | "status" | "projectVersion" | "versionBinding">,
): boolean => {
    if (next.versionBinding !== "exact" || !next.projectVersion) return false;
    if (next.status === "started") return existing === undefined;
    return existing?.status === "started"
        && existing.versionBinding === "exact"
        && existing.projectVersion === next.projectVersion
        && existing.attempt === next.attempt;
};

export function regenerateCampaignCueVideoScene(
    project: CampaignCueVideoProject,
    sceneId: string,
): CampaignCueVideoScene[] {
    const scene = project.scenes.find((item) => item.id === sceneId);
    if (!scene) return project.scenes;
    const variants = project.variants.map((variant) => (
        scene.purpose === "hook" ? variant.hook : scene.purpose === "cta" ? variant.cta : variant.caption
    )).filter(Boolean);
    const currentIndex = variants.findIndex((candidate) => (
        candidate === scene.overlay || candidate === scene.script || candidate === scene.caption
    ));
    const nextLine = variants[(currentIndex + 1 + variants.length) % variants.length] || scene.script;
    const motions: CampaignCueVideoScene["motion"][] = ["zoom_in", "pan_left", "pan_right", "zoom_out", "none"];
    const transitions: CampaignCueVideoScene["transition"][] = ["fade", "slide", "cut"];
    return project.scenes.map((item) => item.id === sceneId ? {
        ...item,
        script: nextLine.slice(0, 1200),
        overlay: nextLine.slice(0, 240),
        caption: nextLine.slice(0, 500),
        motion: motions[(motions.indexOf(item.motion) + 1) % motions.length],
        transition: transitions[(transitions.indexOf(item.transition) + 1) % transitions.length],
        durationSeconds: Math.min(
            CAMPAIGNCUE_VIDEO_STUDIO.MAX_SCENE_SECONDS,
            Math.max(CAMPAIGNCUE_VIDEO_STUDIO.MIN_SCENE_SECONDS, Math.round((nextLine.length / 16) * 2) / 2),
        ),
    } : item);
}

export function evaluateCampaignCueVideoTrust(params: {
    assets?: CampaignCueAsset[];
    campaignTrustGate?: CampaignCueTrustGate;
    scenes: CampaignCueVideoScene[];
    sourceReferences: string[];
}): { findings: CampaignCueVideoTrustFinding[]; gate: CampaignCueTrustGate } {
    const findings: CampaignCueVideoTrustFinding[] = [];
    const includedScenes = params.scenes.filter((scene) => scene.enabled);
    if (params.campaignTrustGate === "blocked") {
        findings.push({
            id: "campaign_blocked",
            severity: "blocked",
            message: "The source campaign is blocked by its current checks.",
            recommendation: "Fix the campaign checks and create a fresh video project.",
        });
    } else if (params.campaignTrustGate && trustRank[params.campaignTrustGate] >= trustRank.needs_fix) {
        findings.push({
            id: "campaign_needs_fix",
            severity: "needs_fix",
            message: "The source campaign still needs a factual or delivery correction.",
            recommendation: "Resolve the campaign finding before approving this video.",
        });
    }
    if (!includedScenes.length) {
        findings.push({
            id: "scene_missing",
            severity: "needs_fix",
            message: "The video does not include any scenes.",
            recommendation: "Include at least one checked scene before approval.",
        });
    }
    if (!params.sourceReferences.length || includedScenes.some((scene) => !scene.sourceReferences.length)) {
        findings.push({
            id: "source_refs_missing",
            severity: "needs_fix",
            message: "One or more scenes are not linked to an approved source.",
            recommendation: "Keep every scene tied to the campaign output or a checked business fact.",
        });
    }
    if (!includedScenes.some((scene) => scene.purpose === "cta" && scene.overlay.trim())) {
        findings.push({
            id: "cta_missing",
            severity: "needs_fix",
            message: "The video does not have a clear final action.",
            recommendation: "Add a truthful call to action in the final scene.",
        });
    }
    const fullText = includedScenes.map((scene) => `${scene.script} ${scene.overlay} ${scene.caption}`).join(" ");
    if (/\b(guaranteed|number\s*one|best\s+in|instant\s+results?|viral|everyone\s+loves?|customers?\s+say)\b/i.test(fullText)) {
        findings.push({
            id: "unsupported_claim",
            severity: "blocked",
            message: "The video contains a result, ranking, testimonial, or virality claim that is not safe to infer.",
            recommendation: "Replace it with a checked business fact or plain offer detail.",
        });
    }
    const assets = new Map((params.assets || []).map((asset) => [asset.id, asset]));
    for (const assetId of unique(includedScenes.map((scene) => scene.assetId))) {
        const asset = assets.get(assetId);
        if (!asset || asset.status === "blocked" || asset.rights.status === "restricted") {
            findings.push({
                id: `asset_blocked_${assetId}`.slice(0, 160),
                severity: "blocked",
                message: "A selected scene asset is unavailable or restricted.",
                recommendation: "Remove it or choose an available asset with confirmed rights.",
            });
        } else if (asset.rights.status !== "confirmed") {
            findings.push({
                id: `asset_rights_${assetId}`.slice(0, 160),
                severity: "warning",
                message: "A selected scene asset still needs a rights check.",
                recommendation: "Confirm permission for the image, people, logo, and music before public use.",
            });
        }
    }
    if (!findings.length) {
        findings.push({
            id: "source_locked",
            severity: "info",
            message: "Scenes are linked to the checked campaign output.",
            recommendation: "Review the final file before posting it manually.",
        });
    }
    return { findings, gate: gateFromFindings(findings) };
}

export function buildCampaignCueVideoProject(params: {
    actorId: string;
    aspectRatio?: CampaignCueVideoProject["aspectRatio"];
    businessBrain: CampaignCueBusinessBrain;
    campaign: CampaignCueCampaign;
    id: string;
    now: unknown;
    output: CampaignCueOutput;
}): CampaignCueVideoProject {
    const { businessBrain, campaign, output } = params;
    const cta = compact(output.fields.cta, 180, "Learn more");
    const headline = compact(output.fields.headline, 180, campaign.title);
    const body = compact(output.fields.body || output.text, 800, campaign.brief);
    const detailCandidates = sentenceCandidates(body);
    const sourceReferences = unique([
        ...output.sourceReferences,
        ...(campaign.pack?.sourceFactIds || []),
        campaign.sourceSnapshotId,
        "campaign_output",
    ]);
    const variants: CampaignCueVideoCopyVariant[] = [
        { id: "direction_direct", label: "Direct", hook: headline, caption: body.slice(0, 500), cta },
        { id: "direction_question", label: "Question", hook: compact(`Looking for ${headline.toLowerCase()}?`, 240, headline), caption: compact(`${body} ${cta}`, 500, body), cta },
        { id: "direction_local", label: "Local", hook: compact(`${businessBrain.name}: ${headline}`, 240, headline), caption: compact(`${headline}. ${body}`, 500, body), cta },
    ];
    const scenes: CampaignCueVideoScene[] = [
        {
            id: "scene_hook",
            enabled: true,
            purpose: "hook",
            script: variants[0].hook,
            overlay: variants[0].hook,
            caption: variants[0].hook,
            durationSeconds: 3,
            motion: "zoom_in",
            transition: "fade",
            sourceReferences,
        },
        {
            id: "scene_detail_1",
            enabled: true,
            purpose: "detail",
            script: compact(detailCandidates[0], 600, body),
            overlay: compact(detailCandidates[0], 180, headline),
            caption: compact(detailCandidates[0], 300, body),
            durationSeconds: 4,
            motion: "pan_left",
            transition: "slide",
            sourceReferences,
        },
        {
            id: "scene_detail_2",
            enabled: true,
            purpose: "proof",
            script: compact(detailCandidates[1], 600, output.fields.imageBrief || businessBrain.name),
            overlay: compact(detailCandidates[1], 180, businessBrain.name),
            caption: compact(detailCandidates[1], 300, businessBrain.name),
            durationSeconds: 4,
            motion: "pan_right",
            transition: "fade",
            sourceReferences,
        },
        {
            id: "scene_cta",
            enabled: true,
            purpose: "cta",
            script: cta,
            overlay: cta,
            caption: compact(`${businessBrain.name}. ${cta}`, 300, cta),
            durationSeconds: 3,
            motion: "zoom_out",
            transition: "fade",
            sourceReferences,
        },
    ];
    const trust = evaluateCampaignCueVideoTrust({
        campaignTrustGate: getCampaignCueVideoSourceTrustGate(campaign.trustGate, output.trustGate),
        scenes,
        sourceReferences,
    });
    const project: CampaignCueVideoProject = {
        id: params.id,
        workspaceId: campaign.workspaceId,
        campaignId: campaign.id,
        outputId: output.id,
        title: compact(`${campaign.title} video`, 120, "Campaign video"),
        status: "draft",
        version: 1,
        aspectRatio: params.aspectRatio || "9:16",
        selectedVariantId: variants[0].id,
        variants,
        scenes,
        brand: {
            businessName: compact(businessBrain.name, 120, "Business"),
            primaryColor: typeof businessBrain.brandKit.primaryColor === "string"
                && /^#[0-9a-fA-F]{6}$/.test(businessBrain.brandKit.primaryColor)
                ? businessBrain.brandKit.primaryColor
                : "#6d5dfc",
            voice: businessBrain.brandKit.voice,
        },
        captions: { enabled: true, position: "bottom" },
        audio: emptyCampaignCueVideoAudioMix(),
        sourceReferences,
        patternCue: projectSchema.shape.patternCue.parse(output.metadata?.patternCue),
        trustGate: trust.gate,
        trustFindings: trust.findings,
        reviewNotes: [],
        versions: [],
        renderReceipts: [],
        cost: { providerCalls: 0, providerCredits: 0, renderer: "campaigncue_browser_compositor" },
        createdByUserId: params.actorId,
        createdAt: params.now,
        updatedAt: params.now,
    };
    project.versions = [{
        version: project.version,
        aspectRatio: project.aspectRatio,
        selectedVariantId: project.selectedVariantId,
        scenes: project.scenes,
        captions: project.captions,
        audio: project.audio,
        trustGate: project.trustGate,
        trustFindings: project.trustFindings,
        reviewedAssetIds: getCampaignCueVideoAssetIds(project.scenes, project.audio),
        createdAt: params.now,
        createdByUserId: params.actorId,
    }];
    return projectSchema.parse(project);
}

export function parseCampaignCueVideoProjectRecord(
    value: unknown,
    params: { projectId?: string; workspaceId: string },
): CampaignCueVideoProject {
    const record = value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
    const legacyAudio = record.audio && typeof record.audio === "object" && !Array.isArray(record.audio)
        ? record.audio as Record<string, unknown>
        : null;
    const audio = legacyAudio && "voiceover" in legacyAudio
        ? legacyAudio
        : {
            voiceover: { mode: "none", volume: 0.9 },
            backgroundMusic: {
                mode: legacyAudio?.mode === "owner_file" ? "session_file" : "none",
                volume: typeof legacyAudio?.volume === "number" ? legacyAudio.volume : 0.45,
            },
            ducking: true,
        };
    const reviewedAssetIds = getCampaignCueVideoAssetIds(
        Array.isArray(record.scenes) ? record.scenes as CampaignCueVideoScene[] : [],
        audio as unknown as CampaignCueVideoAudioMix,
    );
    const versions = Array.isArray(record.versions) ? record.versions.map((version) => {
        const snapshot = version && typeof version === "object" && !Array.isArray(version)
            ? version as Record<string, unknown>
            : {};
        const snapshotAudio = (snapshot.audio || audio) as unknown as CampaignCueVideoAudioMix;
        const snapshotScenes = Array.isArray(snapshot.scenes) ? snapshot.scenes as CampaignCueVideoScene[] : [];
        return {
            ...snapshot,
            captions: snapshot.captions || record.captions,
            audio: snapshotAudio,
            trustFindings: snapshot.trustFindings || [],
            reviewedAssetIds: snapshot.reviewedAssetIds || getCampaignCueVideoAssetIds(snapshotScenes, snapshotAudio),
        };
    }) : [];
    const renderReceipts = Array.isArray(record.renderReceipts) ? record.renderReceipts.map((receipt) => {
        const item = receipt && typeof receipt === "object" && !Array.isArray(receipt)
            ? receipt as Record<string, unknown>
            : {};
        const versionBinding = item.versionBinding === "exact" ? "exact" : "legacy_unverified";
        return {
            ...item,
            projectVersion: versionBinding === "exact" ? item.projectVersion : undefined,
            versionBinding,
            progressPercent: item.progressPercent ?? (item.status === "completed" ? 100 : 0),
            rightsEvidence: item.rightsEvidence || {
                assetIds: reviewedAssetIds,
                sessionMediaUsed: false,
                sessionMediaRightsConfirmed: false,
            },
            credit: item.credit || { estimated: 0, reserved: 0, captured: 0, refunded: 0, currency: "credits" },
        };
    }) : [];
    const rawResultMemory = record.resultMemory && typeof record.resultMemory === "object" && !Array.isArray(record.resultMemory)
        ? record.resultMemory as Record<string, unknown>
        : undefined;
    const resultMemory = rawResultMemory?.versionBinding === "exact"
        ? rawResultMemory
        : rawResultMemory
            ? {
                signalId: rawResultMemory.signalId,
                renderReceiptId: rawResultMemory.renderReceiptId,
                versionBinding: "legacy_unverified",
                note: rawResultMemory.note,
                recordedBy: rawResultMemory.recordedBy,
                recordedAt: rawResultMemory.recordedAt,
            }
            : undefined;
    const project = projectSchema.parse({
        ...record,
        audio,
        reviewNotes: record.reviewNotes || [],
        versions,
        renderReceipts,
        resultMemory,
    });
    if (project.renderReceipts.some((receipt) => (
        receipt.versionBinding === "exact" && receipt.projectVersion > project.version
    ))) {
        throw new Error("CampaignCue video render version exceeds the project version");
    }
    if (
        project.resultMemory?.versionBinding === "exact"
        && project.resultMemory.projectVersion > project.version
    ) {
        throw new Error("CampaignCue video result version exceeds the project version");
    }
    if (project.workspaceId !== params.workspaceId || (params.projectId && project.id !== params.projectId)) {
        throw new Error("CampaignCue video project scope mismatch");
    }
    return project;
}
