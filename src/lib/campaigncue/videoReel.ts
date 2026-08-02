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
    CampaignCueVideoCopyVariant,
    CampaignCueVideoProject,
    CampaignCueVideoScene,
    CampaignCueVideoTrustFinding,
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
    aspectRatio: z.enum(["9:16", "1:1", "16:9"]),
    durationSeconds: z.number().finite().min(1).max(CAMPAIGNCUE_VIDEO_STUDIO.MAX_TOTAL_SECONDS),
    progressPercent: z.number().int().min(0).max(100),
    heartbeatAt: timestamp,
    rightsEvidence: rightsEvidenceSchema,
    credit: zeroCreditSchema,
    createdAt: timestamp,
};

const renderReceiptSchema = z.discriminatedUnion("status", [
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
    resultMemory: z.object({
        signalId: z.enum(["useful", "not_useful", "not_used"]),
        renderReceiptId: boundedId,
        note: z.string().trim().max(1000).optional(),
        recordedBy: boundedId,
        recordedAt: timestamp,
    }).strict().optional(),
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
    next: Pick<CampaignCueVideoProject["renderReceipts"][number], "attempt" | "status">,
): boolean => {
    if (next.status === "started") return existing === undefined;
    return existing?.status === "started" && existing.attempt === next.attempt;
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
        return {
            ...item,
            progressPercent: item.progressPercent ?? (item.status === "completed" ? 100 : 0),
            rightsEvidence: item.rightsEvidence || {
                assetIds: reviewedAssetIds,
                sessionMediaUsed: false,
                sessionMediaRightsConfirmed: false,
            },
            credit: item.credit || { estimated: 0, reserved: 0, captured: 0, refunded: 0, currency: "credits" },
        };
    }) : [];
    const project = projectSchema.parse({
        ...record,
        audio,
        reviewNotes: record.reviewNotes || [],
        versions,
        renderReceipts,
    });
    if (project.workspaceId !== params.workspaceId || (params.projectId && project.id !== params.projectId)) {
        throw new Error("CampaignCue video project scope mismatch");
    }
    return project;
}
