import type { CampaignCueVideoAspectRatio } from "@type/campaigncueVideo";

export const CAMPAIGNCUE_VIDEO_STUDIO = {
    SCHEMA_VERSION: "campaigncue-video-project.v1",
    TRUST_RULE_VERSION: "campaigncue-video-trust-v1",
    MAX_PROJECTS_PER_LOAD: 12,
    MAX_SCENES: 8,
    MIN_SCENES: 1,
    MAX_VARIANTS: 3,
    MAX_HISTORY: 10,
    MAX_RENDER_RECEIPTS: 12,
    MAX_REVIEW_NOTES: 20,
    RENDER_PROGRESS_CHECKPOINTS: [25, 50, 75] as const,
    MIN_SCENE_SECONDS: 1,
    MAX_SCENE_SECONDS: 12,
    MAX_TOTAL_SECONDS: 60,
    FPS: 30,
    MAX_RENDER_SIZE_BYTES: 250 * 1024 * 1024,
} as const;

export const CAMPAIGNCUE_VIDEO_ASPECT_PRESETS: Record<CampaignCueVideoAspectRatio, {
    height: number;
    label: string;
    safeArea: number;
    width: number;
}> = {
    "9:16": { height: 1280, label: "Portrait 9:16", safeArea: 72, width: 720 },
    "1:1": { height: 1080, label: "Square 1:1", safeArea: 72, width: 1080 },
    "16:9": { height: 720, label: "Landscape 16:9", safeArea: 64, width: 1280 },
};

export const CAMPAIGNCUE_VIDEO_MIME_CANDIDATES = [
    { extension: "mp4", mimeType: "video/mp4;codecs=h264,aac", outputMimeType: "video/mp4" },
    { extension: "mp4", mimeType: "video/mp4", outputMimeType: "video/mp4" },
    { extension: "webm", mimeType: "video/webm;codecs=vp9,opus", outputMimeType: "video/webm" },
    { extension: "webm", mimeType: "video/webm;codecs=vp8,opus", outputMimeType: "video/webm" },
    { extension: "webm", mimeType: "video/webm", outputMimeType: "video/webm" },
] as const;

export const CAMPAIGNCUE_VIDEO_PROJECT_ID_PREFIX = "cc_video";
