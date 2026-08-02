"use client";

import { FEATURE_FLAGS } from "@config/features";
import {
    CAMPAIGNCUE_VIDEO_ASPECT_PRESETS,
    CAMPAIGNCUE_VIDEO_STUDIO,
} from "@constant/campaigncue/videoReel";
import {
    CAMPAIGNCUE_API_ROUTES,
    getCampaignCueAssetDownloadApiPath,
    getCampaignCueAssetPreviewApiPath,
} from "@constant/campaigncue/routes";
import {
    CampaignCueVideoRenderError,
    downloadCampaignCueVideo,
    downloadCampaignCueVideoStoryboard,
    getCampaignCueVideoRecordingCapability,
    renderCampaignCueVideo,
} from "@lib/campaigncue/videoCompositor";
import type { CampaignCueVideoMediaMap } from "@lib/campaigncue/videoCompositor";
import { uploadCampaignCueMediaAsset } from "@lib/campaigncue/assetUploadClient";
import {
    getCampaignCueVideoAssetIds,
    getCampaignCueVideoDuration,
    parseCampaignCueVideoProjectRecord,
    regenerateCampaignCueVideoScene,
} from "@lib/campaigncue/videoReel";
import { parseCampaignCueAssetRecord } from "@lib/campaigncue/assetBoundary";
import { createTimestampedRuntimeId } from "@lib/runtime/randomId";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import type { CampaignCueAsset, CampaignCueCampaign } from "@type/campaigncue";
import type {
    CampaignCueVideoAspectRatio,
    CampaignCueVideoProject,
    CampaignCueVideoProjectMutationInput,
    CampaignCueVideoScene,
} from "@type/campaigncueVideo";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
    LuArrowDown,
    LuArrowUp,
    LuCheck,
    LuDownload,
    LuImage,
    LuMic,
    LuMusic,
    LuPlus,
    LuRefreshCw,
    LuSave,
    LuTrash2,
    LuVideo,
    LuX,
} from "react-icons/lu";
import styles from "./CampaignCueWorkspaceApp.module.scss";

const RESPONSE_LIMIT = 4 * 1024 * 1024;
const MAX_SESSION_AUDIO_SIZE_BYTES = 50 * 1024 * 1024;

type ApiFailure = { message: string; status: number };
type WithoutIdempotencyKey<T> = T extends unknown ? Omit<T, "idempotencyKey"> : never;
type CampaignCueVideoMutationPayload = WithoutIdempotencyKey<CampaignCueVideoProjectMutationInput>;

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const safeFileName = (value: string) => (
    value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "campaigncue-video"
);

const cloneProject = (project: CampaignCueVideoProject): CampaignCueVideoProject => ({
    ...project,
    scenes: project.scenes.map((scene) => ({ ...scene, sourceReferences: [...scene.sourceReferences] })),
    variants: project.variants.map((variant) => ({ ...variant })),
    sourceReferences: [...project.sourceReferences],
    trustFindings: project.trustFindings.map((finding) => ({ ...finding })),
    reviewNotes: project.reviewNotes.map((note) => ({ ...note })),
    versions: project.versions.map((version) => ({
        ...version,
        scenes: version.scenes.map((scene) => ({ ...scene, sourceReferences: [...scene.sourceReferences] })),
        trustFindings: version.trustFindings.map((finding) => ({ ...finding })),
        reviewedAssetIds: [...version.reviewedAssetIds],
    })),
    renderReceipts: project.renderReceipts.map((receipt) => ({
        ...receipt,
        rightsEvidence: { ...receipt.rightsEvidence, assetIds: [...receipt.rightsEvidence.assetIds] },
        credit: { ...receipt.credit },
    })),
});

const readPayload = async (response: Response) => {
    let payload: unknown;
    try {
        payload = await readJsonResponseWithLimit<unknown>(response, RESPONSE_LIMIT);
    } catch {
        throw { message: "CampaignCue returned an unreadable response.", status: response.status } satisfies ApiFailure;
    }
    if (!response.ok) {
        throw {
            message: isRecord(payload) && typeof payload.error === "string"
                ? payload.error.slice(0, 240)
                : "CampaignCue video request failed.",
            status: response.status,
        } satisfies ApiFailure;
    }
    if (!isRecord(payload) || !("data" in payload)) {
        throw { message: "CampaignCue returned an invalid video response.", status: response.status } satisfies ApiFailure;
    }
    return payload.data;
};

const asProject = (value: unknown, workspaceId: string) => (
    parseCampaignCueVideoProjectRecord(value, { workspaceId })
);

const newScene = (project: CampaignCueVideoProject): CampaignCueVideoScene => ({
    id: createTimestampedRuntimeId("scene", 5),
    enabled: true,
    purpose: "detail",
    script: "Add one checked detail from this campaign.",
    overlay: "Checked campaign detail",
    caption: "Checked campaign detail",
    durationSeconds: 3,
    motion: "zoom_in",
    transition: "fade",
    sourceReferences: [...project.sourceReferences],
});

const trustTone = (gate: CampaignCueVideoProject["trustGate"]) => (
    gate === "blocked" || gate === "needs_fix" ? "red" : gate === "warning" ? "amber" : "green"
);

function CampaignCueAssetPreview({ asset }: { asset?: CampaignCueAsset }) {
    const [url, setUrl] = useState("");
    useEffect(() => {
        let active = true;
        if (!asset?.file?.previewStoragePath) {
            setUrl("");
            return () => { active = false; };
        }
        void fetch(getCampaignCueAssetPreviewApiPath(asset.id), { credentials: "include" })
            .then(readPayload)
            .then((data) => {
                if (active && isRecord(data) && typeof data.url === "string") setUrl(data.url);
            })
            .catch(() => undefined);
        return () => { active = false; };
    }, [asset]);
    if (!url) return null;
    // Private signed URL is short-lived and cannot be admitted through the static image optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={`${asset?.name || "Media"} preview`} className={styles.videoAssetPreview} src={url} />;
}

export default function CampaignCueVideoStudio({
    assets,
    campaigns,
    onAssetRegistered,
    onNotice,
    workspaceId,
}: {
    assets: CampaignCueAsset[];
    campaigns: CampaignCueCampaign[];
    onAssetRegistered: (asset: CampaignCueAsset) => void;
    onNotice: (notice: string) => void;
    workspaceId: string;
}) {
    const [projects, setProjects] = useState<CampaignCueVideoProject[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [draft, setDraft] = useState<CampaignCueVideoProject | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState("");
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");
    const [mediaBySceneId, setMediaBySceneId] = useState<CampaignCueVideoMediaMap>({});
    const [voiceoverFile, setVoiceoverFile] = useState<File | undefined>();
    const [backgroundMusicFile, setBackgroundMusicFile] = useState<File | undefined>();
    const [recordingNarration, setRecordingNarration] = useState(false);
    const [reviewMessage, setReviewMessage] = useState("");
    const [reviewSceneId, setReviewSceneId] = useState("");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadRightsConfirmed, setUploadRightsConfirmed] = useState(false);
    const [sessionMediaRightsConfirmed, setSessionMediaRightsConfirmed] = useState(false);
    const idempotencyKeys = useRef(new Map<string, string>());
    const objectUrls = useRef(new Set<string>());
    const narrationRecorder = useRef<MediaRecorder | null>(null);
    const narrationStream = useRef<MediaStream | null>(null);
    const narrationChunks = useRef<Blob[]>([]);
    const renderController = useRef<AbortController | null>(null);
    const activeWorkspaceRef = useRef(workspaceId);
    const mountedRef = useRef(true);
    const isActiveWorkspace = () => mountedRef.current && activeWorkspaceRef.current === workspaceId;
    const notify = (notice: string) => {
        if (isActiveWorkspace()) onNotice(notice);
    };
    const registerAsset = (asset: CampaignCueAsset) => {
        if (isActiveWorkspace()) onAssetRegistered(asset);
    };

    const videoOutputs = useMemo(() => campaigns.flatMap((campaign) => (
        campaign.outputs
            .filter((output) => output.channel === "video")
            .map((output) => ({ campaign, output }))
    )), [campaigns]);
    const reusableVisuals = useMemo(() => assets.filter((asset) => (
        (asset.assetType === "image" || asset.assetType === "logo" || asset.assetType === "video")
        && asset.status === "ready"
    )), [assets]);
    const reusableAudio = useMemo(() => assets.filter((asset) => (
        asset.assetType === "audio" && asset.status === "ready"
    )), [assets]);
    const reusableBlueprints = useMemo(() => projects.filter((project) => Boolean(project.reusableBlueprint)), [projects]);
    const capability = getCampaignCueVideoRecordingCapability();
    const activeSceneIds = useMemo(() => new Set(
        (draft?.scenes || []).filter((scene) => scene.enabled).map((scene) => scene.id),
    ), [draft]);
    const hasSessionMedia = Boolean(voiceoverFile || backgroundMusicFile) || Object.entries(mediaBySceneId).some(([sceneId, source]) => (
        activeSceneIds.has(sceneId) && Boolean(source)
    ));

    const clearSessionMedia = () => {
        if (narrationRecorder.current?.state === "recording") {
            narrationRecorder.current.onstop = null;
            narrationRecorder.current.stop();
        }
        narrationStream.current?.getTracks().forEach((track) => track.stop());
        narrationRecorder.current = null;
        narrationStream.current = null;
        setRecordingNarration(false);
        objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
        objectUrls.current.clear();
        setMediaBySceneId({});
        setVoiceoverFile(undefined);
        setBackgroundMusicFile(undefined);
        setSessionMediaRightsConfirmed(false);
    };

    const rememberProject = (project: CampaignCueVideoProject) => {
        setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)]
            .slice(0, CAMPAIGNCUE_VIDEO_STUDIO.MAX_PROJECTS_PER_LOAD));
        setSelectedProjectId(project.id);
        setDraft(cloneProject(project));
    };

    const mutationKey = (payload: CampaignCueVideoMutationPayload) => {
        const fingerprint = JSON.stringify(payload);
        const existing = idempotencyKeys.current.get(fingerprint);
        if (existing) return { fingerprint, key: existing };
        const key = createTimestampedRuntimeId("cc_video_mutation", 8);
        idempotencyKeys.current.set(fingerprint, key);
        return { fingerprint, key };
    };

    const mutate = async (payload: CampaignCueVideoMutationPayload) => {
        const requestWorkspaceId = workspaceId;
        const identity = mutationKey(payload);
        const response = await fetch(CAMPAIGNCUE_API_ROUTES.VIDEO_PROJECTS, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, idempotencyKey: identity.key }),
        });
        try {
            const data = await readPayload(response);
            if (!isRecord(data) || !("project" in data)) throw new Error("Invalid video mutation response");
            const project = asProject(data.project, requestWorkspaceId);
            if (!mountedRef.current || activeWorkspaceRef.current !== requestWorkspaceId) {
                throw new Error("CampaignCue workspace changed before the video mutation completed");
            }
            idempotencyKeys.current.delete(identity.fingerprint);
            rememberProject(project);
            return project;
        } catch (caught) {
            const status = isRecord(caught) && typeof caught.status === "number" ? caught.status : response.status;
            if (status >= 400 && status < 500 && status !== 409) {
                idempotencyKeys.current.delete(identity.fingerprint);
            }
            throw caught;
        }
    };

    const load = async () => {
        const requestWorkspaceId = workspaceId;
        setLoading(true);
        setError("");
        try {
            const response = await fetch(CAMPAIGNCUE_API_ROUTES.VIDEO_PROJECTS, { credentials: "include" });
            const data = await readPayload(response);
            if (!Array.isArray(data)) throw new Error("Invalid video project list");
            const next = data.map((item) => asProject(item, requestWorkspaceId));
            if (!mountedRef.current || activeWorkspaceRef.current !== requestWorkspaceId) return;
            setProjects(next);
            const selected = next.find((item) => item.id === selectedProjectId) || next[0];
            setSelectedProjectId(selected?.id || "");
            setDraft(selected ? cloneProject(selected) : null);
        } catch (caught) {
            if (!mountedRef.current || activeWorkspaceRef.current !== requestWorkspaceId) return;
            setError(isRecord(caught) && typeof caught.message === "string" ? caught.message : "Video projects could not be loaded.");
        } finally {
            if (mountedRef.current && activeWorkspaceRef.current === requestWorkspaceId) setLoading(false);
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        activeWorkspaceRef.current = workspaceId;
        clearSessionMedia();
        void load();
        return () => {
            mountedRef.current = false;
            renderController.current?.abort();
            renderController.current = null;
            objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
            objectUrls.current.clear();
        };
        // Load once per scoped workspace mount. Selection changes must not refetch.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId]);

    const selectProject = (projectId: string) => {
        const project = projects.find((item) => item.id === projectId);
        setSelectedProjectId(projectId);
        setDraft(project ? cloneProject(project) : null);
        setError("");
        clearSessionMedia();
    };

    const createProject = async (campaignId: string, outputId: string) => {
        setBusy(`create:${campaignId}:${outputId}`);
        setError("");
        try {
            await mutate({ action: "create", campaignId, outputId, aspectRatio: "9:16" });
            notify("Video project created from checked campaign facts.");
        } catch (caught) {
            setError(isRecord(caught) && typeof caught.message === "string" ? caught.message : "Video project could not be created.");
        } finally {
            setBusy("");
        }
    };

    const patchScene = (sceneId: string, patch: Partial<CampaignCueVideoScene>) => {
        setDraft((current) => current ? {
            ...current,
            status: "draft",
            scenes: current.scenes.map((scene) => scene.id === sceneId ? { ...scene, ...patch } : scene),
        } : current);
    };

    const moveScene = (index: number, direction: -1 | 1) => {
        setDraft((current) => {
            if (!current) return current;
            const target = index + direction;
            if (target < 0 || target >= current.scenes.length) return current;
            const scenes = [...current.scenes];
            [scenes[index], scenes[target]] = [scenes[target], scenes[index]];
            return { ...current, scenes, status: "draft" };
        });
    };

    const chooseVariant = (variantId: string) => {
        setDraft((current) => {
            if (!current) return current;
            const variant = current.variants.find((item) => item.id === variantId);
            if (!variant) return current;
            return {
                ...current,
                selectedVariantId: variantId,
                status: "draft",
                scenes: current.scenes.map((scene) => (
                    scene.purpose === "hook"
                        ? { ...scene, script: variant.hook, overlay: variant.hook, caption: variant.hook }
                        : scene.purpose === "cta"
                            ? { ...scene, script: variant.cta, overlay: variant.cta, caption: variant.caption }
                            : scene
                )),
            };
        });
    };

    const tryAnotherSceneLine = (sceneId: string) => {
        setDraft((current) => current ? {
            ...current,
            status: "draft",
            scenes: regenerateCampaignCueVideoScene(current, sceneId),
        } : current);
    };

    const save = async () => {
        if (!draft) return;
        setBusy("save");
        setError("");
        try {
            await mutate({
                action: "save",
                projectId: draft.id,
                expectedVersion: draft.version,
                title: draft.title,
                aspectRatio: draft.aspectRatio,
                selectedVariantId: draft.selectedVariantId,
                scenes: draft.scenes,
                captions: draft.captions,
                audio: draft.audio,
            });
            notify("Video project saved. Review the current checks before approval.");
        } catch (caught) {
            setError(isRecord(caught) && typeof caught.message === "string" ? caught.message : "Video project could not be saved.");
        } finally {
            setBusy("");
        }
    };

    const decide = async (action: "approve" | "reject") => {
        if (!draft) return;
        const note = action === "reject" ? "Owner requested changes." : undefined;
        setBusy(action);
        setError("");
        try {
            await mutate({ action, projectId: draft.id, expectedVersion: draft.version, note });
            notify(action === "approve" ? "Current video version approved." : "Video returned for changes.");
        } catch (caught) {
            setError(isRecord(caught) && typeof caught.message === "string" ? caught.message : "Video approval could not be updated.");
        } finally {
            setBusy("");
        }
    };

    const chooseLocalMedia = (sceneId: string, event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        const kind = file.type.startsWith("video/") ? "video" : "image";
        if (!/^(?:image\/(?:jpeg|png|webp|gif)|video\/(?:mp4|quicktime|webm))$/i.test(file.type) || file.size > 250 * 1024 * 1024) {
            setError("Choose a supported image or video up to 250 MB.");
            return;
        }
        const oldSource = mediaBySceneId[sceneId];
        const oldUrl = typeof oldSource === "string" ? oldSource : oldSource?.url;
        if (oldUrl && objectUrls.current.has(oldUrl)) {
            URL.revokeObjectURL(oldUrl);
            objectUrls.current.delete(oldUrl);
        }
        const url = URL.createObjectURL(file);
        objectUrls.current.add(url);
        setMediaBySceneId((current) => ({ ...current, [sceneId]: { kind, url } }));
        setSessionMediaRightsConfirmed(false);
        setDraft((current) => current ? {
            ...current,
            status: "draft",
            scenes: current.scenes.map((scene) => scene.id === sceneId
                ? { ...scene, assetId: undefined }
                : scene),
        } : current);
    };

    const clearLocalSceneImage = (sceneId: string) => {
        setMediaBySceneId((current) => {
            const source = current[sceneId];
            const url = typeof source === "string" ? source : source?.url;
            if (url && objectUrls.current.has(url)) {
                URL.revokeObjectURL(url);
                objectUrls.current.delete(url);
            }
            const next = { ...current };
            delete next[sceneId];
            return next;
        });
    };

    const chooseLibraryImage = (sceneId: string, assetId: string) => {
        clearLocalSceneImage(sceneId);
        setSessionMediaRightsConfirmed(false);
        patchScene(sceneId, { assetId: assetId || undefined });
    };

    const removeScene = (sceneId: string) => {
        clearLocalSceneImage(sceneId);
        setDraft((current) => current ? {
            ...current,
            scenes: current.scenes.filter((scene) => scene.id !== sceneId),
            status: "draft",
        } : current);
    };

    const chooseAudio = (track: "voiceover" | "backgroundMusic", event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!file.type.startsWith("audio/") || file.size > MAX_SESSION_AUDIO_SIZE_BYTES) {
            setError("Choose an audio file up to 50 MB.");
            return;
        }
        if (track === "voiceover") setVoiceoverFile(file);
        else setBackgroundMusicFile(file);
        setSessionMediaRightsConfirmed(false);
        setDraft((current) => current ? {
            ...current,
            audio: { ...current.audio, [track]: { ...current.audio[track], mode: "session_file", assetId: undefined } },
            status: "draft",
        } : current);
    };

    const clearAudio = (track: "voiceover" | "backgroundMusic") => {
        if (track === "voiceover") setVoiceoverFile(undefined);
        else setBackgroundMusicFile(undefined);
        setSessionMediaRightsConfirmed(false);
        setDraft((current) => current ? {
            ...current,
            audio: { ...current.audio, [track]: { ...current.audio[track], mode: "none", assetId: undefined } },
            status: "draft",
        } : current);
    };

    const chooseLibraryAudio = (track: "voiceover" | "backgroundMusic", assetId: string) => {
        if (track === "voiceover") setVoiceoverFile(undefined);
        else setBackgroundMusicFile(undefined);
        setDraft((current) => current ? {
            ...current,
            status: "draft",
            audio: {
                ...current.audio,
                [track]: assetId
                    ? { ...current.audio[track], mode: "asset", assetId }
                    : { ...current.audio[track], mode: "none", assetId: undefined },
            },
        } : current);
    };

    const startNarration = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (!isActiveWorkspace()) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }
            const recorder = new MediaRecorder(stream);
            narrationChunks.current = [];
            narrationStream.current = stream;
            narrationRecorder.current = recorder;
            recorder.ondataavailable = (event) => { if (event.data.size) narrationChunks.current.push(event.data); };
            recorder.onstop = () => {
                const blob = new Blob(narrationChunks.current, { type: recorder.mimeType || "audio/webm" });
                setVoiceoverFile(new File([blob], "campaigncue-narration.webm", { type: blob.type }));
                setDraft((current) => current ? {
                    ...current,
                    status: "draft",
                    audio: { ...current.audio, voiceover: { ...current.audio.voiceover, mode: "session_file", assetId: undefined } },
                } : current);
                stream.getTracks().forEach((track) => track.stop());
                setRecordingNarration(false);
            };
            recorder.start();
            setRecordingNarration(true);
        } catch {
            setError("Microphone access is required to record narration.");
        }
    };

    const stopNarration = () => narrationRecorder.current?.state === "recording" && narrationRecorder.current.stop();

    const uploadReusableMedia = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!uploadRightsConfirmed) {
            setError("Confirm that you can use this media before uploading it to the private Asset Library.");
            return;
        }
        setBusy("media-upload");
        setUploadProgress(0);
        setError("");
        try {
            const asset = await uploadCampaignCueMediaAsset({ file, workspaceId, onProgress: setUploadProgress });
            registerAsset(asset);
            notify("Private media uploaded with a generated preview.");
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Private media upload failed.");
        } finally {
            setBusy("");
        }
    };

    const downloadStoryboard = () => {
        if (!draft) return;
        try {
            downloadCampaignCueVideoStoryboard(draft, `${safeFileName(draft.title)}-storyboard.txt`);
            notify("Storyboard downloaded for manual use.");
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Storyboard download failed.");
        }
    };

    const resolveProjectMedia = async (project: CampaignCueVideoProject) => {
        const resolved = { ...mediaBySceneId };
        await Promise.all(project.scenes.filter((scene) => scene.enabled).map(async (scene) => {
            if (resolved[scene.id] || !scene.assetId) return;
            const response = await fetch(getCampaignCueAssetDownloadApiPath(scene.assetId), { credentials: "include" });
            const data = await readPayload(response);
            if (!isRecord(data) || typeof data.url !== "string") {
                throw new CampaignCueVideoRenderError("media_decode_failed", "A saved scene image could not be opened.");
            }
            const asset = assets.find((item) => item.id === scene.assetId);
            resolved[scene.id] = { kind: asset?.assetType === "video" ? "video" : "image", url: data.url };
        }));
        return resolved;
    };

    const resolveAudioUrls = async (project: CampaignCueVideoProject) => {
        const result: { backgroundMusic?: string; voiceover?: string } = {};
        await Promise.all((["voiceover", "backgroundMusic"] as const).map(async (track) => {
            const assetId = project.audio[track].mode === "asset" ? project.audio[track].assetId : undefined;
            if (!assetId) return;
            const response = await fetch(getCampaignCueAssetDownloadApiPath(assetId), { credentials: "include" });
            const data = await readPayload(response);
            if (!isRecord(data) || typeof data.url !== "string") {
                throw new CampaignCueVideoRenderError("media_decode_failed", "A saved audio track could not be opened.");
            }
            result[track] = data.url;
        }));
        return result;
    };

    const addReviewNote = async () => {
        if (!draft || reviewMessage.trim().length < 2) return;
        setBusy("review-note");
        try {
            await mutate({
                action: "add_review_note",
                projectId: draft.id,
                expectedVersion: draft.version,
                message: reviewMessage.trim(),
                sceneId: reviewSceneId || undefined,
            });
            setReviewMessage("");
            setReviewSceneId("");
            notify("Review note added. Approval is paused until open notes are resolved.");
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Review note could not be added.");
        } finally {
            setBusy("");
        }
    };

    const resolveReviewNote = async (noteId: string) => {
        if (!draft) return;
        setBusy(`resolve-note:${noteId}`);
        try {
            await mutate({ action: "resolve_review_note", projectId: draft.id, expectedVersion: draft.version, noteId });
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Review note could not be resolved.");
        } finally {
            setBusy("");
        }
    };

    const recoverInterruptedRender = async (receiptId: string, attempt: number, progressPercent: number) => {
        if (!draft) return;
        setBusy(`recover:${receiptId}`);
        try {
            const evidence = draft.renderReceipts.find((item) => item.id === receiptId)?.rightsEvidence || {
                assetIds: getCampaignCueVideoAssetIds(draft.scenes, draft.audio),
                sessionMediaUsed: false,
                sessionMediaRightsConfirmed: false,
            };
            await mutate({
                action: "render_receipt",
                projectId: draft.id,
                expectedVersion: draft.version,
                receipt: {
                    id: receiptId,
                    attempt,
                    status: "failed",
                    progressPercent,
                    aspectRatio: draft.aspectRatio,
                    durationSeconds: getCampaignCueVideoDuration(draft.scenes),
                    errorCode: "render_interrupted",
                    rightsEvidence: evidence,
                    credit: { estimated: 0, reserved: 0, captured: 0, refunded: 0, currency: "credits" },
                },
            });
            notify("Interrupted render closed safely. No credits were captured.");
        } catch (caught) {
            setError(isRecord(caught) && typeof caught.message === "string" ? caught.message : "Interrupted render could not be closed.");
        } finally {
            setBusy("");
        }
    };

    const recordResult = async (signalId: "useful" | "not_useful" | "not_used") => {
        if (!draft) return;
        const completed = [...draft.renderReceipts].reverse().find((receipt) => receipt.status === "completed");
        if (!completed) return;
        setBusy("record-result");
        try {
            await mutate({
                action: "record_result",
                projectId: draft.id,
                expectedVersion: draft.version,
                renderReceiptId: completed.id,
                signalId,
            });
            notify(signalId === "useful" ? "Useful result saved with a reusable structure." : "Video result saved.");
        } catch (caught) {
            setError(isRecord(caught) && typeof caught.message === "string" ? caught.message : "Video result could not be saved.");
        } finally {
            setBusy("");
        }
    };

    const applyReusableBlueprint = (sourceProjectId: string) => {
        const blueprint = projects.find((project) => project.id === sourceProjectId)?.reusableBlueprint;
        if (!draft || !blueprint) return;
        const scenes = blueprint.scenes.map((structure, index) => {
            const source = draft.scenes[index] || newScene(draft);
            return { ...source, ...structure, id: source.id, assetId: source.assetId, sourceReferences: [...draft.sourceReferences] };
        });
        setDraft({ ...draft, status: "draft", aspectRatio: blueprint.aspectRatio, captions: blueprint.captions, scenes });
        notify("Reusable structure applied. Current copy, source links, and media remain under this project.");
    };

    const registerRenderReceiptAsset = async (
        project: CampaignCueVideoProject,
        result: { extension: string; mimeType: string; blob: Blob },
    ) => {
        const payload = {
            name: `${project.title} local ${project.aspectRatio} export`,
            assetType: "export" as const,
            source: "generated" as const,
            rightsStatus: "needs_review" as const,
            rightsNote: "Local browser render receipt. The downloadable binary remains on the owner's device.",
            consentType: "unknown" as const,
            tags: ["video-studio", "local-export", project.aspectRatio.replace(":", "x"), result.extension],
            mimeType: result.mimeType,
            sizeBytes: result.blob.size,
            campaignId: project.campaignId,
            outputId: project.outputId,
            channel: "video" as const,
        };
        const fingerprint = `asset:${JSON.stringify(payload)}`;
        const idempotencyKey = idempotencyKeys.current.get(fingerprint) || createTimestampedRuntimeId("cc_video_asset", 8);
        idempotencyKeys.current.set(fingerprint, idempotencyKey);
        const response = await fetch(CAMPAIGNCUE_API_ROUTES.ASSETS, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, idempotencyKey }),
        });
        const data = await readPayload(response);
        if (!isRecord(data) || typeof data.id !== "string") throw new Error("Invalid asset receipt");
        const asset = parseCampaignCueAssetRecord({ assetId: data.id, value: data, workspaceId });
        idempotencyKeys.current.delete(fingerprint);
        registerAsset(asset);
    };

    const render = async () => {
        if (!draft) return;
        if (draft.audio.voiceover.mode === "session_file" && !voiceoverFile) {
            setError("Choose or record the narration again before rendering. Session media is not retained.");
            return;
        }
        if (draft.audio.backgroundMusic.mode === "session_file" && !backgroundMusicFile) {
            setError("Choose the background music again before rendering. Session media is not retained.");
            return;
        }
        if (hasSessionMedia && !sessionMediaRightsConfirmed) {
            setError("Confirm that you can use the image and audio selected for this render.");
            return;
        }
        const attempt = Math.max(0, ...draft.renderReceipts.map((receipt) => receipt.attempt)) + 1;
        const receiptId = createTimestampedRuntimeId("cc_video_render", 8);
        setBusy("render");
        setProgress(0);
        setError("");
        let current = draft;
        let downloaded = false;
        let lastProgressPercent = 0;
        let checkpointChain: Promise<CampaignCueVideoProject> = Promise.resolve(current);
        const controller = new AbortController();
        renderController.current = controller;
        const rightsEvidence = {
            assetIds: getCampaignCueVideoAssetIds(current.scenes, current.audio),
            sessionMediaUsed: hasSessionMedia,
            sessionMediaRightsConfirmed: !hasSessionMedia || sessionMediaRightsConfirmed,
        };
        const credit = { estimated: 0 as const, reserved: 0 as const, captured: 0 as const, refunded: 0 as const, currency: "credits" as const };
        try {
            current = await mutate({
                action: "render_receipt",
                projectId: current.id,
                expectedVersion: current.version,
                receipt: {
                    id: receiptId,
                    attempt,
                    status: "started",
                    progressPercent: 0,
                    aspectRatio: current.aspectRatio,
                    durationSeconds: getCampaignCueVideoDuration(current.scenes),
                    rightsEvidence,
                    credit,
                },
            });
            const resolvedMedia = await resolveProjectMedia(current);
            const audioUrls = await resolveAudioUrls(current);
            if (!isActiveWorkspace()) return;
            const sentCheckpoints = new Set<number>();
            checkpointChain = Promise.resolve(current);
            const result = await renderCampaignCueVideo({
                project: current,
                mediaBySceneId: resolvedMedia,
                audioFiles: { voiceover: voiceoverFile, backgroundMusic: backgroundMusicFile },
                audioUrls,
                signal: controller.signal,
                onProgress: (value) => {
                    setProgress(value);
                    const percent = Math.round(value * 100);
                    lastProgressPercent = percent;
                    CAMPAIGNCUE_VIDEO_STUDIO.RENDER_PROGRESS_CHECKPOINTS.forEach((checkpoint) => {
                        if (percent < checkpoint || sentCheckpoints.has(checkpoint)) return;
                        sentCheckpoints.add(checkpoint);
                        checkpointChain = checkpointChain.then((project) => mutate({
                            action: "render_progress",
                            projectId: project.id,
                            expectedVersion: project.version,
                            receiptId,
                            attempt,
                            progressPercent: checkpoint,
                        }));
                    });
                },
            });
            if (!isActiveWorkspace()) return;
            current = await checkpointChain;
            if (!isActiveWorkspace()) return;
            downloadCampaignCueVideo(
                result.blob,
                `${safeFileName(current.title)}-${current.aspectRatio.replace(":", "x")}.${result.extension}`,
            );
            downloaded = true;
            current = await mutate({
                action: "render_receipt",
                projectId: current.id,
                expectedVersion: current.version,
                receipt: {
                    id: receiptId,
                    attempt,
                    status: "completed",
                    progressPercent: 100,
                    aspectRatio: current.aspectRatio,
                    durationSeconds: result.durationSeconds,
                    mimeType: result.mimeType,
                    sizeBytes: result.blob.size,
                    rightsEvidence,
                    credit,
                },
            });
            try {
                await registerRenderReceiptAsset(current, result);
                notify("Video downloaded. A local-export receipt was added to Asset Library.");
            } catch {
                notify("Video downloaded. The optional Asset Library receipt could not be saved.");
            }
        } catch (caught) {
            if (downloaded) {
                setError("Video downloaded, but CampaignCue could not confirm its render receipt. Refresh before rendering again.");
                notify("Video downloaded to this device.");
                return;
            }
            const code = caught instanceof CampaignCueVideoRenderError ? caught.code : "recording_failed";
            try {
                current = await checkpointChain.catch(() => current);
                if (current.renderReceipts.some((receipt) => receipt.id === receiptId && receipt.status === "started")) {
                    await mutate({
                        action: "render_receipt",
                        projectId: current.id,
                        expectedVersion: current.version,
                        receipt: {
                            id: receiptId,
                            attempt,
                            status: code === "render_cancelled" ? "cancelled" : "failed",
                            progressPercent: Math.min(99, lastProgressPercent),
                            aspectRatio: current.aspectRatio,
                            durationSeconds: getCampaignCueVideoDuration(current.scenes),
                            errorCode: code,
                            rightsEvidence,
                            credit,
                        },
                    });
                }
            } catch {
                // The owner-facing error remains the render failure; the next load reconciles server receipts.
            }
            setError(caught instanceof Error ? caught.message : "Video rendering failed. Your project is still saved.");
        } finally {
            renderController.current = null;
            setBusy("");
        }
    };

    if (!FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_VIDEO_STUDIO) {
        return <div className={styles.empty}><p>CampaignCue Video Studio is currently off.</p></div>;
    }

    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <div>
                    <span className={styles.eyebrow}>In-house video studio</span>
                    <h2>Checked campaign to short video</h2>
                    <p>Build and download real motion from CampaignCue copy and media you control. No Topview call, social connection, or provider credits.</p>
                </div>
                <button className={styles.ghostButton} disabled={loading || Boolean(busy)} onClick={() => void load()} type="button">
                    <LuRefreshCw size={16} /> Refresh
                </button>
            </div>

            <div aria-live="polite" className={styles.videoStudioStatus}>
                {error ? <span data-tone="red">{error}</span> : null}
                {busy === "render" ? <span>Rendering on this device · {Math.round(progress * 100)}%</span> : null}
            </div>

            {!draft ? (
                <div className={styles.videoProjectPicker}>
                    <div className={styles.noteBox}>
                        <strong>Create from a checked video output</strong>
                        <p>CampaignCue will create an editable source-linked storyboard. You can still use the existing shoot brief.</p>
                    </div>
                    <div className={styles.list}>
                        {videoOutputs.map(({ campaign, output }) => (
                            <article className={styles.output} key={`${campaign.id}:${output.id}`}>
                                <div className={styles.row}>
                                    <div className={styles.titleBlock}>
                                        <h3>{campaign.title}</h3>
                                        <p>{output.fields.headline}</p>
                                    </div>
                                    <span className={styles.chip} data-tone={trustTone(output.trustGate)}>{output.trustGate.replace(/_/g, " ")}</span>
                                </div>
                                <button
                                    className={styles.primaryButton}
                                    disabled={Boolean(busy) || output.trustGate === "blocked"}
                                    onClick={() => void createProject(campaign.id, output.id)}
                                    type="button"
                                >
                                    <LuVideo size={16} /> Create video project
                                </button>
                            </article>
                        ))}
                        {!videoOutputs.length ? <div className={styles.empty}><p>Create a campaign pack with a Reels output first.</p></div> : null}
                    </div>
                </div>
            ) : (
                <div className={styles.videoStudioLayout}>
                    <aside className={styles.videoProjectSidebar}>
                        <label htmlFor="campaigncue-video-project">Video project</label>
                        <select id="campaigncue-video-project" onChange={(event) => selectProject(event.target.value)} value={selectedProjectId}>
                            {projects.map((project) => <option key={project.id} value={project.id}>{project.title} · v{project.version}</option>)}
                        </select>
                        <button className={styles.ghostButton} onClick={() => { clearSessionMedia(); setDraft(null); setSelectedProjectId(""); }} type="button">
                            <LuPlus size={16} /> New from campaign
                        </button>
                        <div className={styles.noteBox}>
                            <strong>{draft.status === "approved" ? "Approved" : draft.status === "rejected" ? "Changes requested" : "Draft"} · version {draft.version}</strong>
                            <p>{draft.trustFindings[0]?.message || "Review before use."}</p>
                            <span className={styles.chip} data-tone={trustTone(draft.trustGate)}>{draft.trustGate.replace(/_/g, " ")}</span>
                        </div>
                        <div className={styles.noteBox}>
                            <strong>0 provider credits</strong>
                            <p>The browser creates the file. The final binary downloads to this device.</p>
                        </div>
                        <div className={styles.noteBox}>
                            <strong>Version history</strong>
                            <p>{draft.versions.slice(-5).map((version) => `v${version.version} · ${version.aspectRatio} · ${version.reviewedAssetIds.length} media · ${version.trustGate.replace(/_/g, " ")}`).join(" · ")}</p>
                        </div>
                        <div className={styles.noteBox}>
                            <strong>Render attempts</strong>
                            {draft.renderReceipts.length ? draft.renderReceipts.slice(-3).map((receipt) => (
                                <div className={styles.row} key={receipt.id}>
                                    <span>#{receipt.attempt} {receipt.status} · {receipt.progressPercent}% · 0 credits</span>
                                    {receipt.status === "started" ? (
                                        <button className={styles.ghostButton} disabled={Boolean(busy)} onClick={() => void recoverInterruptedRender(receipt.id, receipt.attempt, receipt.progressPercent)} type="button">Close interrupted</button>
                                    ) : null}
                                </div>
                            )) : <p>No render attempts yet.</p>}
                        </div>
                    </aside>

                    <div className={styles.videoProjectEditor}>
                        <div className={styles.videoProjectControls}>
                            <div className={styles.noteBox}>
                                <strong>Private Asset Library upload</strong>
                                <label className={styles.videoRightsConfirmation}>
                                    <input checked={uploadRightsConfirmed} onChange={(event) => setUploadRightsConfirmed(event.target.checked)} type="checkbox" />
                                    <span>I confirm I can use this media.</span>
                                </label>
                                <label className={styles.videoFileControl}>
                                    <LuPlus size={16} /> Upload image, video, or audio{busy === "media-upload" ? ` · ${uploadProgress}%` : ""}
                                    <input accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm" disabled={Boolean(busy)} onChange={(event) => void uploadReusableMedia(event)} type="file" />
                                </label>
                            </div>
                            <label>
                                Project name
                                <input maxLength={120} onChange={(event) => setDraft({ ...draft, title: event.target.value, status: "draft" })} value={draft.title} />
                            </label>
                            <label>
                                Direction
                                <select onChange={(event) => chooseVariant(event.target.value)} value={draft.selectedVariantId}>
                                    {draft.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label} · {variant.hook}</option>)}
                                </select>
                            </label>
                            <label>
                                Format
                                <select
                                    onChange={(event) => setDraft({ ...draft, aspectRatio: event.target.value as CampaignCueVideoAspectRatio, status: "draft" })}
                                    value={draft.aspectRatio}
                                >
                                    {Object.entries(CAMPAIGNCUE_VIDEO_ASPECT_PRESETS).map(([ratio, preset]) => (
                                        <option key={ratio} value={ratio}>{preset.label}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                Captions
                                <select
                                    onChange={(event) => setDraft({
                                        ...draft,
                                        captions: { ...draft.captions, enabled: event.target.value !== "off" },
                                        status: "draft",
                                    })}
                                    value={draft.captions.enabled ? "on" : "off"}
                                >
                                    <option value="on">Burn in captions</option>
                                    <option value="off">No captions</option>
                                </select>
                            </label>
                            <label>
                                Narration
                                <select onChange={(event) => chooseLibraryAudio("voiceover", event.target.value)} value={draft.audio.voiceover.mode === "asset" ? draft.audio.voiceover.assetId : ""}>
                                    <option value="">No saved narration</option>
                                    {reusableAudio.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
                                </select>
                                <input accept="audio/*" onChange={(event) => chooseAudio("voiceover", event)} type="file" />
                            </label>
                            <button className={styles.ghostButton} onClick={() => recordingNarration ? stopNarration() : void startNarration()} type="button">
                                <LuMic size={16} /> {recordingNarration ? "Stop narration" : "Record narration"}
                            </button>
                            <label>Narration volume<input aria-label="Narration volume" max="1" min="0" onChange={(event) => setDraft({ ...draft, status: "draft", audio: { ...draft.audio, voiceover: { ...draft.audio.voiceover, volume: Number(event.target.value) } } })} step="0.05" type="range" value={draft.audio.voiceover.volume} /></label>
                            {draft.audio.voiceover.mode !== "none" ? <button className={styles.ghostButton} onClick={() => clearAudio("voiceover")} type="button"><LuX size={16} /> Remove narration</button> : null}
                            <label>
                                Background music
                                <select onChange={(event) => chooseLibraryAudio("backgroundMusic", event.target.value)} value={draft.audio.backgroundMusic.mode === "asset" ? draft.audio.backgroundMusic.assetId : ""}>
                                    <option value="">No saved music</option>
                                    {reusableAudio.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
                                </select>
                                <input accept="audio/*" onChange={(event) => chooseAudio("backgroundMusic", event)} type="file" />
                            </label>
                            {draft.audio.backgroundMusic.mode !== "none" ? <button className={styles.ghostButton} onClick={() => clearAudio("backgroundMusic")} type="button"><LuMusic size={16} /> Remove music</button> : null}
                            <label>Music volume<input aria-label="Music volume" max="1" min="0" onChange={(event) => setDraft({ ...draft, status: "draft", audio: { ...draft.audio, backgroundMusic: { ...draft.audio.backgroundMusic, volume: Number(event.target.value) } } })} step="0.05" type="range" value={draft.audio.backgroundMusic.volume} /></label>
                            <label>Music ducking<select onChange={(event) => setDraft({ ...draft, status: "draft", audio: { ...draft.audio, ducking: event.target.value === "on" } })} value={draft.audio.ducking ? "on" : "off"}><option value="on">Lower music under narration</option><option value="off">Keep selected volume</option></select></label>
                        </div>

                        <div className={styles.videoTimelineHeader}>
                            <div>
                                <strong>Scenes</strong>
                                <span>{draft.scenes.length} scenes · {getCampaignCueVideoDuration(draft.scenes)} seconds</span>
                            </div>
                            <button
                                className={styles.ghostButton}
                                disabled={draft.scenes.length >= CAMPAIGNCUE_VIDEO_STUDIO.MAX_SCENES}
                                onClick={() => setDraft({ ...draft, scenes: [...draft.scenes, newScene(draft)], status: "draft" })}
                                type="button"
                            >
                                <LuPlus size={16} /> Add scene
                            </button>
                        </div>

                        <div className={styles.videoSceneList}>
                            {draft.scenes.map((scene, index) => (
                                <article className={styles.videoSceneCard} key={scene.id}>
                                    <div className={styles.row}>
                                        <div className={styles.titleBlock}>
                                            <strong>Scene {index + 1} · {scene.enabled ? scene.purpose : "skipped"}</strong>
                                            <span>{scene.durationSeconds}s · {scene.motion.replace(/_/g, " ")}</span>
                                        </div>
                                        <div className={styles.chips}>
                                            <button aria-label={`Regenerate checked scene ${index + 1}`} className={styles.iconButton} onClick={() => tryAnotherSceneLine(scene.id)} title="Regenerate checked scene" type="button"><LuRefreshCw size={16} /></button>
                                            <button aria-label={`Move scene ${index + 1} up`} className={styles.iconButton} disabled={index === 0} onClick={() => moveScene(index, -1)} type="button"><LuArrowUp size={16} /></button>
                                            <button aria-label={`Move scene ${index + 1} down`} className={styles.iconButton} disabled={index === draft.scenes.length - 1} onClick={() => moveScene(index, 1)} type="button"><LuArrowDown size={16} /></button>
                                            <button aria-label={`Remove scene ${index + 1}`} className={styles.iconButton} disabled={draft.scenes.length <= 1} onClick={() => removeScene(scene.id)} type="button"><LuTrash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <div className={styles.videoSceneFields}>
                                        <label>Overlay<input maxLength={240} onChange={(event) => patchScene(scene.id, { overlay: event.target.value })} value={scene.overlay} /></label>
                                        <label>Voice/script<textarea maxLength={1200} onChange={(event) => patchScene(scene.id, { script: event.target.value })} rows={2} value={scene.script} /></label>
                                        <label>Caption<textarea maxLength={500} onChange={(event) => patchScene(scene.id, { caption: event.target.value })} rows={2} value={scene.caption} /></label>
                                        <label>Include<select onChange={(event) => patchScene(scene.id, { enabled: event.target.value === "yes" })} value={scene.enabled ? "yes" : "no"}><option value="yes">Include in video</option><option value="no">Skip this scene</option></select></label>
                                        <label>Seconds<input max={CAMPAIGNCUE_VIDEO_STUDIO.MAX_SCENE_SECONDS} min={CAMPAIGNCUE_VIDEO_STUDIO.MIN_SCENE_SECONDS} onChange={(event) => patchScene(scene.id, { durationSeconds: Number(event.target.value) })} step="0.5" type="number" value={scene.durationSeconds} /></label>
                                        <label>Motion<select onChange={(event) => patchScene(scene.id, { motion: event.target.value as CampaignCueVideoScene["motion"] })} value={scene.motion}><option value="none">None</option><option value="zoom_in">Zoom in</option><option value="zoom_out">Zoom out</option><option value="pan_left">Pan left</option><option value="pan_right">Pan right</option></select></label>
                                        <label>Transition<select onChange={(event) => patchScene(scene.id, { transition: event.target.value as CampaignCueVideoScene["transition"] })} value={scene.transition}><option value="cut">Cut</option><option value="fade">Fade</option><option value="slide">Slide</option></select></label>
                                        <label>
                                            Asset Library media
                                            <select onChange={(event) => chooseLibraryImage(scene.id, event.target.value)} value={scene.assetId || ""}>
                                                <option value="">Brand motion only</option>
                                                {reusableVisuals.map((asset) => <option key={asset.id} value={asset.id}>{asset.name} · {asset.assetType}{asset.rights.status !== "confirmed" ? " · rights review" : ""}</option>)}
                                            </select>
                                        </label>
                                        <CampaignCueAssetPreview asset={assets.find((asset) => asset.id === scene.assetId)} />
                                        <label className={styles.videoFileControl}>
                                            <LuImage size={16} /> Image or video for this render only{mediaBySceneId[scene.id] ? " · selected" : ""}
                                            <input accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm" onChange={(event) => chooseLocalMedia(scene.id, event)} type="file" />
                                        </label>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <div className={styles.noteBox}>
                            <strong>Review notes</strong>
                            <div className={styles.row}>
                                <select aria-label="Review note scene" onChange={(event) => setReviewSceneId(event.target.value)} value={reviewSceneId}>
                                    <option value="">Whole video</option>
                                    {draft.scenes.map((scene, index) => <option key={scene.id} value={scene.id}>Scene {index + 1}</option>)}
                                </select>
                                <input maxLength={500} onChange={(event) => setReviewMessage(event.target.value)} placeholder="Add a bounded review note" value={reviewMessage} />
                                <button className={styles.ghostButton} disabled={Boolean(busy) || reviewMessage.trim().length < 2} onClick={() => void addReviewNote()} type="button">Add note</button>
                            </div>
                            {draft.reviewNotes.length ? draft.reviewNotes.map((note) => (
                                <div className={styles.row} key={note.id}>
                                    <span>{note.status === "open" ? "Open" : "Resolved"}{note.sceneId ? ` · scene ${draft.scenes.findIndex((scene) => scene.id === note.sceneId) + 1}` : " · whole video"} · {note.message}</span>
                                    {note.status === "open" ? <button className={styles.ghostButton} disabled={Boolean(busy)} onClick={() => void resolveReviewNote(note.id)} type="button">Resolve</button> : null}
                                </div>
                            )) : <p>No review notes.</p>}
                        </div>

                        {reusableBlueprints.length ? (
                            <label>
                                Reuse a proven structure
                                <select defaultValue="" onChange={(event) => { if (event.target.value) applyReusableBlueprint(event.target.value); event.target.value = ""; }}>
                                    <option value="">Choose structure</option>
                                    {reusableBlueprints.map((project) => <option key={project.id} value={project.id}>{project.reusableBlueprint?.label}</option>)}
                                </select>
                            </label>
                        ) : null}

                        {hasSessionMedia ? (
                            <label className={styles.videoRightsConfirmation}>
                                <input
                                    checked={sessionMediaRightsConfirmed}
                                    onChange={(event) => setSessionMediaRightsConfirmed(event.target.checked)}
                                    type="checkbox"
                                />
                                <span>I confirm I can use the image and audio selected for this render.</span>
                            </label>
                        ) : null}

                        <div className={styles.videoStudioActions}>
                            <button className={styles.ghostButton} disabled={Boolean(busy)} onClick={downloadStoryboard} type="button"><LuDownload size={16} /> Download storyboard</button>
                            <button className={styles.ghostButton} disabled={Boolean(busy)} onClick={() => void save()} type="button"><LuSave size={16} /> Save new version</button>
                            <button className={styles.ghostButton} disabled={Boolean(busy) || draft.status === "approved" || draft.trustGate === "blocked" || draft.trustGate === "needs_fix" || draft.reviewNotes.some((note) => note.status === "open")} onClick={() => void decide("approve")} type="button"><LuCheck size={16} /> Approve current version</button>
                            <button className={styles.ghostButton} disabled={Boolean(busy)} onClick={() => void decide("reject")} type="button"><LuX size={16} /> Request changes</button>
                            {busy === "render" ? (
                                <button className={styles.primaryButton} onClick={() => renderController.current?.abort()} type="button"><LuX size={16} /> Cancel render</button>
                            ) : (
                                <button
                                    className={styles.primaryButton}
                                    disabled={Boolean(busy) || draft.status !== "approved" || draft.reviewNotes.some((note) => note.status === "open") || !capability || !FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_IN_HOUSE_VIDEO_RENDER}
                                    onClick={() => void render()}
                                    type="button"
                                >
                                    <LuDownload size={16} /> Render and download {capability ? capability.extension.toUpperCase() : "video"}
                                </button>
                            )}
                        </div>
                        {draft.renderReceipts.some((receipt) => receipt.status === "completed") ? (
                            <div className={styles.noteBox}>
                                <strong>How did the latest video work?</strong>
                                <div className={styles.chips}>
                                    <button className={styles.ghostButton} disabled={Boolean(busy)} onClick={() => void recordResult("useful")} type="button">Useful</button>
                                    <button className={styles.ghostButton} disabled={Boolean(busy)} onClick={() => void recordResult("not_useful")} type="button">Not useful</button>
                                    <button className={styles.ghostButton} disabled={Boolean(busy)} onClick={() => void recordResult("not_used")} type="button">Not used</button>
                                </div>
                                {draft.resultMemory ? <p>Saved: {draft.resultMemory.signalId.replace(/_/g, " ")}{draft.reusableBlueprint ? " · structure reusable" : ""}</p> : null}
                            </div>
                        ) : null}
                        {!capability ? <p className={styles.muted}>This browser cannot record the canvas. Download the storyboard for manual use; the saved project remains available here.</p> : null}
                    </div>
                </div>
            )}
        </section>
    );
}
