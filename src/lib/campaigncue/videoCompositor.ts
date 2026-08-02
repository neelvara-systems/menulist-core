import {
    CAMPAIGNCUE_VIDEO_ASPECT_PRESETS,
    CAMPAIGNCUE_VIDEO_MIME_CANDIDATES,
    CAMPAIGNCUE_VIDEO_STUDIO,
} from "@constant/campaigncue/videoReel";
import { FEATURE_FLAGS } from "@config/features";
import {
    buildCampaignCueVideoStoryboardText,
    getCampaignCueVideoDuration,
} from "@lib/campaigncue/videoReel";
import type { CampaignCueVideoProject, CampaignCueVideoScene } from "@type/campaigncueVideo";

export type CampaignCueVideoMediaSource = string | { kind: "image" | "video"; url: string };
export type CampaignCueVideoMediaMap = Record<string, CampaignCueVideoMediaSource | undefined>;

export interface CampaignCueVideoRenderResult {
    blob: Blob;
    durationSeconds: number;
    extension: "mp4" | "webm";
    mimeType: "video/mp4" | "video/webm";
}

export class CampaignCueVideoRenderError extends Error {
    code: "browser_unsupported" | "media_decode_failed" | "recording_failed" | "download_failed" | "render_cancelled";

    constructor(
        code: CampaignCueVideoRenderError["code"],
        message: string,
    ) {
        super(message);
        this.code = code;
        this.name = "CampaignCueVideoRenderError";
    }
}

export const getCampaignCueVideoRecordingCapability = () => {
    if (
        typeof window === "undefined"
        || typeof document === "undefined"
        || typeof MediaRecorder === "undefined"
        || typeof HTMLCanvasElement === "undefined"
        || typeof HTMLCanvasElement.prototype.captureStream !== "function"
    ) {
        return null;
    }
    const candidate = CAMPAIGNCUE_VIDEO_MIME_CANDIDATES.find(({ mimeType }) => (
        MediaRecorder.isTypeSupported(mimeType)
    ));
    return candidate || null;
};

const loadImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new CampaignCueVideoRenderError(
        "media_decode_failed",
        "One selected image could not be opened for this render.",
    ));
    image.src = url;
});

const loadVideo = (url: string): Promise<HTMLVideoElement> => new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadeddata = () => resolve(video);
    video.onerror = () => reject(new CampaignCueVideoRenderError(
        "media_decode_failed",
        "One selected video could not be opened for this render.",
    ));
    video.src = url;
});

const hexToRgb = (value: string) => {
    const match = value.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!match) return { b: 252, g: 93, r: 109 };
    return {
        r: Number.parseInt(match[1], 16),
        g: Number.parseInt(match[2], 16),
        b: Number.parseInt(match[3], 16),
    };
};

const contrastColor = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    return ((r * 299) + (g * 587) + (b * 114)) / 1000 > 150 ? "#11131a" : "#ffffff";
};

const ease = (value: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, value)), 3);

const drawImageCover = (
    context: CanvasRenderingContext2D,
    image: CanvasImageSource,
    intrinsicWidth: number,
    intrinsicHeight: number,
    scene: CampaignCueVideoScene,
    progress: number,
    width: number,
    height: number,
) => {
    const baseScale = Math.max(width / intrinsicWidth, height / intrinsicHeight);
    const motion = ease(progress);
    const zoom = scene.motion === "zoom_in"
        ? 1 + (motion * 0.12)
        : scene.motion === "zoom_out"
            ? 1.12 - (motion * 0.12)
            : 1.06;
    const drawWidth = intrinsicWidth * baseScale * zoom;
    const drawHeight = intrinsicHeight * baseScale * zoom;
    const travel = Math.max(0, drawWidth - width) * 0.42;
    const xOffset = scene.motion === "pan_left"
        ? travel * (0.5 - motion)
        : scene.motion === "pan_right"
            ? travel * (motion - 0.5)
            : 0;
    context.drawImage(
        image,
        ((width - drawWidth) / 2) + xOffset,
        (height - drawHeight) / 2,
        drawWidth,
        drawHeight,
    );
};

const wrapText = (
    context: CanvasRenderingContext2D,
    value: string,
    maxWidth: number,
    maxLines: number,
) => {
    const words = value.trim().split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (context.measureText(candidate).width <= maxWidth || !current) {
            current = candidate;
            continue;
        }
        lines.push(current);
        current = word;
        if (lines.length === maxLines - 1) break;
    }
    if (current && lines.length < maxLines) lines.push(current);
    if (lines.join(" ").split(/\s+/).length < words.length && lines.length) {
        lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.…,;:!?-]*$/, "")}…`;
    }
    return lines;
};

const drawFrame = (params: {
    context: CanvasRenderingContext2D;
    media?: HTMLImageElement | HTMLVideoElement;
    project: CampaignCueVideoProject;
    scene: CampaignCueVideoScene;
    sceneProgress: number;
}) => {
    const { context, media, project, scene } = params;
    const { width, height } = context.canvas;
    const preset = CAMPAIGNCUE_VIDEO_ASPECT_PRESETS[project.aspectRatio];
    const brandColor = project.brand.primaryColor;
    const { r, g, b } = hexToRgb(brandColor);
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, brandColor);
    gradient.addColorStop(1, `rgb(${Math.max(0, r - 70)} ${Math.max(0, g - 70)} ${Math.max(0, b - 70)})`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    if (media) {
        context.save();
        drawImageCover(
            context,
            media,
            media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth,
            media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight,
            scene,
            params.sceneProgress,
            width,
            height,
        );
        context.fillStyle = "rgba(4, 7, 18, 0.42)";
        context.fillRect(0, 0, width, height);
        context.restore();
    } else {
        context.save();
        context.globalAlpha = 0.13;
        context.fillStyle = contrastColor(brandColor);
        const radius = Math.min(width, height) * 0.34;
        context.beginPath();
        context.arc(width * (0.72 + (params.sceneProgress * 0.04)), height * 0.2, radius, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }

    const transitionAlpha = scene.transition === "fade"
        ? Math.min(1, params.sceneProgress * 6, (1 - params.sceneProgress) * 6)
        : 1;
    const slideOffset = scene.transition === "slide"
        ? (1 - ease(Math.min(1, params.sceneProgress * 3))) * width * 0.08
        : 0;
    context.save();
    context.globalAlpha = Math.max(0, transitionAlpha);
    context.translate(slideOffset, 0);
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillStyle = "#ffffff";
    const headlineSize = Math.max(34, Math.round(width * 0.062));
    context.font = `700 ${headlineSize}px Inter, Arial, sans-serif`;
    const headlineLines = wrapText(context, scene.overlay, width - (preset.safeArea * 2), 4);
    const lineHeight = headlineSize * 1.12;
    const headlineHeight = headlineLines.length * lineHeight;
    const headlineY = Math.max(preset.safeArea, (height - headlineHeight) * 0.46);
    headlineLines.forEach((line, index) => {
        context.fillText(line, preset.safeArea, headlineY + (index * lineHeight));
    });

    context.font = `600 ${Math.max(18, Math.round(width * 0.026))}px Inter, Arial, sans-serif`;
    context.fillStyle = "rgba(255,255,255,0.92)";
    context.fillText(project.brand.businessName, preset.safeArea, preset.safeArea);

    if (project.captions.enabled && scene.caption) {
        const captionSize = Math.max(18, Math.round(width * 0.028));
        context.font = `600 ${captionSize}px Inter, Arial, sans-serif`;
        const captionLines = wrapText(context, scene.caption, width - (preset.safeArea * 2.6), 3);
        const captionLineHeight = captionSize * 1.25;
        const captionHeight = captionLines.length * captionLineHeight;
        const captionY = project.captions.position === "top"
            ? preset.safeArea * 1.8
            : project.captions.position === "center"
                ? (height - captionHeight) / 2
                : height - preset.safeArea - captionHeight - 22;
        context.fillStyle = "rgba(4,7,18,0.74)";
        const boxY = captionY - 14;
        context.fillRect(preset.safeArea * 0.75, boxY, width - (preset.safeArea * 1.5), captionHeight + 28);
        context.fillStyle = "#ffffff";
        captionLines.forEach((line, index) => {
            context.fillText(line, preset.safeArea, captionY + (index * captionLineHeight));
        });
    }
    context.restore();
};

const waitForRecorderStop = (recorder: MediaRecorder, chunks: Blob[]) => new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new CampaignCueVideoRenderError("recording_failed", "The browser could not finish this recording."));
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType }));
    recorder.stop();
});

const cleanupCampaignCueRenderResources = async (params: {
    audioContext?: AudioContext;
    audioElements: HTMLAudioElement[];
    objectUrls: string[];
    videoElements: HTMLVideoElement[];
    stream: MediaStream;
}) => {
    params.stream.getTracks().forEach((track) => track.stop());
    params.audioElements.forEach((element) => element.pause());
    params.videoElements.forEach((element) => element.pause());
    params.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    await params.audioContext?.close().catch(() => undefined);
};

export async function renderCampaignCueVideo(params: {
    audioFile?: File;
    audioFiles?: { backgroundMusic?: File; voiceover?: File };
    audioUrls?: { backgroundMusic?: string; voiceover?: string };
    mediaBySceneId?: CampaignCueVideoMediaMap;
    onProgress?: (progress: number) => void;
    project: CampaignCueVideoProject;
    signal?: AbortSignal;
}): Promise<CampaignCueVideoRenderResult> {
    if (
        params.project.status !== "approved"
        || params.project.approval?.version !== params.project.version
        || params.project.trustGate === "blocked"
        || params.project.trustGate === "needs_fix"
    ) {
        throw new CampaignCueVideoRenderError(
            "recording_failed",
            "Approve the current checked video version before rendering.",
        );
    }
    const capability = getCampaignCueVideoRecordingCapability();
    if (!capability || !FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_IN_HOUSE_VIDEO_RENDER) {
        throw new CampaignCueVideoRenderError("browser_unsupported", "This browser cannot record a CampaignCue video.");
    }
    const renderScenes = params.project.scenes.filter((scene) => scene.enabled);
    const durationSeconds = getCampaignCueVideoDuration(renderScenes);
    if (durationSeconds <= 0 || durationSeconds > CAMPAIGNCUE_VIDEO_STUDIO.MAX_TOTAL_SECONDS) {
        throw new CampaignCueVideoRenderError("recording_failed", "The video duration is outside the supported range.");
    }
    const preset = CAMPAIGNCUE_VIDEO_ASPECT_PRESETS[params.project.aspectRatio];
    const canvas = document.createElement("canvas");
    canvas.width = preset.width;
    canvas.height = preset.height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new CampaignCueVideoRenderError("browser_unsupported", "Canvas rendering is unavailable.");

    const renderSceneIds = new Set(renderScenes.map((scene) => scene.id));
    const mediaEntries = Object.entries(params.mediaBySceneId || {}).filter((entry): entry is [string, CampaignCueVideoMediaSource] => (
        renderSceneIds.has(entry[0]) && Boolean(entry[1])
    ));
    const loadedMedia = new Map<string, HTMLImageElement | HTMLVideoElement>();
    await Promise.all(mediaEntries.map(async ([sceneId, source]) => {
        const descriptor = typeof source === "string" ? { kind: "image" as const, url: source } : source;
        loadedMedia.set(sceneId, descriptor.kind === "video" ? await loadVideo(descriptor.url) : await loadImage(descriptor.url));
    }));
    const videoElements = Array.from(loadedMedia.values()).filter((item): item is HTMLVideoElement => item instanceof HTMLVideoElement);
    await Promise.all(videoElements.map((video) => video.play().catch(() => {
        throw new CampaignCueVideoRenderError("media_decode_failed", "A selected scene video could not start.");
    })));

    const stream = canvas.captureStream(CAMPAIGNCUE_VIDEO_STUDIO.FPS);
    let audioContext: AudioContext | undefined;
    const audioElements: HTMLAudioElement[] = [];
    const objectUrls: string[] = [];
    const audioSources = {
        voiceover: params.audioUrls?.voiceover || (params.audioFiles?.voiceover ? URL.createObjectURL(params.audioFiles.voiceover) : undefined),
        backgroundMusic: params.audioUrls?.backgroundMusic || (params.audioFiles?.backgroundMusic
            ? URL.createObjectURL(params.audioFiles.backgroundMusic)
            : params.audioFile ? URL.createObjectURL(params.audioFile) : undefined),
    };
    if (params.audioFiles?.voiceover && audioSources.voiceover) objectUrls.push(audioSources.voiceover);
    if ((params.audioFiles?.backgroundMusic || params.audioFile) && audioSources.backgroundMusic) objectUrls.push(audioSources.backgroundMusic);
    if (audioSources.voiceover || audioSources.backgroundMusic) {
        try {
            audioContext = new AudioContext();
            const destination = audioContext.createMediaStreamDestination();
            const connect = (url: string, track: "voiceover" | "backgroundMusic") => {
                const element = new Audio(url);
                element.crossOrigin = "anonymous";
                element.loop = track === "backgroundMusic";
                const source = audioContext!.createMediaElementSource(element);
                const gain = audioContext!.createGain();
                const configuredVolume = params.project.audio[track].volume;
                gain.gain.value = track === "backgroundMusic" && params.project.audio.ducking && audioSources.voiceover
                    ? configuredVolume * 0.35
                    : configuredVolume;
                source.connect(gain);
                gain.connect(destination);
                audioElements.push(element);
            };
            if (audioSources.voiceover) connect(audioSources.voiceover, "voiceover");
            if (audioSources.backgroundMusic) connect(audioSources.backgroundMusic, "backgroundMusic");
            destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
            await audioContext.resume();
            await Promise.all(audioElements.map((element) => element.play()));
        } catch {
            stream.getAudioTracks().forEach((track) => track.stop());
            audioElements.forEach((element) => element.pause());
            objectUrls.forEach((url) => URL.revokeObjectURL(url));
            await audioContext?.close().catch(() => undefined);
            throw new CampaignCueVideoRenderError("media_decode_failed", "The selected audio file could not be used.");
        }
    }

    const chunks: Blob[] = [];
    let recorder: MediaRecorder;
    try {
        recorder = new MediaRecorder(stream, {
            mimeType: capability.mimeType,
            videoBitsPerSecond: 6_000_000,
        });
    } catch {
        await cleanupCampaignCueRenderResources({
            audioContext,
            audioElements,
            objectUrls,
            videoElements,
            stream,
        });
        throw new CampaignCueVideoRenderError("recording_failed", "The browser rejected the selected recording format.");
    }
    recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.start(1000);
    const startedAt = performance.now();
    const sceneOffsets = renderScenes.reduce<number[]>((offsets, scene, index) => {
        offsets[index] = index === 0 ? 0 : offsets[index - 1] + renderScenes[index - 1].durationSeconds;
        return offsets;
    }, []);

    try {
        await new Promise<void>((resolve, reject) => {
            const frame = (now: number) => {
                try {
                    if (params.signal?.aborted) {
                        reject(new CampaignCueVideoRenderError("render_cancelled", "Video rendering was cancelled."));
                        return;
                    }
                    const elapsed = Math.min(durationSeconds, (now - startedAt) / 1000);
                    const matchingSceneIndex = renderScenes.findIndex((scene, index) => (
                        elapsed < sceneOffsets[index] + scene.durationSeconds
                    ));
                    const sceneIndex = matchingSceneIndex === -1
                        ? renderScenes.length - 1
                        : matchingSceneIndex;
                    const scene = renderScenes[sceneIndex];
                    const sceneElapsed = elapsed - sceneOffsets[sceneIndex];
                    drawFrame({
                        context,
                        media: loadedMedia.get(scene.id),
                        project: params.project,
                        scene,
                        sceneProgress: Math.max(0, Math.min(1, sceneElapsed / scene.durationSeconds)),
                    });
                    params.onProgress?.(Math.min(1, elapsed / durationSeconds));
                    if (elapsed >= durationSeconds) {
                        resolve();
                        return;
                    }
                    requestAnimationFrame(frame);
                } catch {
                    reject(new CampaignCueVideoRenderError(
                        "recording_failed",
                        "The browser could not finish drawing this video.",
                    ));
                }
            };
            requestAnimationFrame(frame);
        });
        const blob = await waitForRecorderStop(recorder, chunks);
        if (!blob.size) throw new CampaignCueVideoRenderError("recording_failed", "The browser created an empty recording.");
        if (blob.size > CAMPAIGNCUE_VIDEO_STUDIO.MAX_RENDER_SIZE_BYTES) {
            throw new CampaignCueVideoRenderError("recording_failed", "The browser recording is larger than the supported download limit.");
        }
        return {
            blob,
            durationSeconds,
            extension: capability.extension,
            mimeType: capability.outputMimeType,
        };
    } finally {
        await cleanupCampaignCueRenderResources({
            audioContext,
            audioElements,
            objectUrls,
            videoElements,
            stream,
        });
    }
}

const downloadCampaignCueBrowserBlob = (blob: Blob, fileName: string) => {
    if (typeof document === "undefined" || typeof window === "undefined" || typeof URL === "undefined") {
        throw new CampaignCueVideoRenderError("download_failed", "Video download is unavailable.");
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    try {
        anchor.click();
    } catch {
        throw new CampaignCueVideoRenderError("download_failed", "The browser blocked the video download.");
    } finally {
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }
};

export function downloadCampaignCueVideo(blob: Blob, fileName: string) {
    downloadCampaignCueBrowserBlob(blob, fileName);
}

export function downloadCampaignCueVideoStoryboard(
    project: CampaignCueVideoProject,
    fileName: string,
) {
    downloadCampaignCueBrowserBlob(
        new Blob([buildCampaignCueVideoStoryboardText(project)], { type: "text/plain;charset=utf-8" }),
        fileName,
    );
}
