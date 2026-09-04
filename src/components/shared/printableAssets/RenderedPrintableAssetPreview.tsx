'use client';

import { renderPrintableAsset } from '@lib/printable-asset-templates/renderPrintableAsset';
import type {
    PrintableAssetRenderInput,
    PrintableAssetTypeId,
    PrintableTemplateFamilyId,
} from '@lib/printable-asset-templates/types';
import { useEffect, useRef, useState } from 'react';
import styles from './RenderedPrintableAssetPreview.module.scss';

type RenderedPrintableAssetPreviewProps = {
    alt: string;
    assetTypeId: PrintableAssetTypeId;
    className?: string;
    eager?: boolean;
    emptyLabel?: string;
    previewVersion: string;
    renderInput: () => Promise<PrintableAssetRenderInput | null>;
    templateFamilyId: PrintableTemplateFamilyId;
};

type PreviewPayload = {
    blob: Blob;
    mimeType: string;
};

type PreviewJob = {
    reject: (reason?: unknown) => void;
    resolve: (payload: PreviewPayload | null) => void;
    run: () => Promise<PreviewPayload | null>;
};

const MAX_CACHED_PREVIEWS = 12;
const MAX_CONCURRENT_PREVIEWS = 2;
const MAX_PREVIEW_LONG_EDGE = 1200;
const previewCache = new Map<string, Promise<PreviewPayload | null>>();
const previewQueue: PreviewJob[] = [];
let activePreviewJobs = 0;

function drainPreviewQueue(): void {
    while (activePreviewJobs < MAX_CONCURRENT_PREVIEWS && previewQueue.length > 0) {
        const job = previewQueue.shift();
        if (!job) return;
        activePreviewJobs += 1;
        void job.run()
            .then(job.resolve, job.reject)
            .finally(() => {
                activePreviewJobs -= 1;
                drainPreviewQueue();
            });
    }
}

function enqueuePreview(run: PreviewJob['run'], priority: boolean): Promise<PreviewPayload | null> {
    return new Promise((resolve, reject) => {
        const job = { reject, resolve, run };
        if (priority) previewQueue.unshift(job);
        else previewQueue.push(job);
        drainPreviewQueue();
    });
}

function trimPreviewCache(): void {
    while (previewCache.size > MAX_CACHED_PREVIEWS) {
        const oldestKey = previewCache.keys().next().value as string | undefined;
        if (!oldestKey) return;
        previewCache.delete(oldestKey);
    }
}

function hashPreviewVersion(value: string): string {
    let first = 2166136261;
    let second = 0x9e3779b9;
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        first = Math.imul(first ^ code, 16777619);
        second = Math.imul(second ^ code, 2246822519);
    }
    return `${value.length.toString(36)}-${(first >>> 0).toString(36)}-${(second >>> 0).toString(36)}`;
}

async function createScreenPreviewBlob(blob: Blob, mimeType: string): Promise<Blob> {
    if (
        !mimeType.startsWith('image/')
        || typeof document === 'undefined'
        || typeof createImageBitmap !== 'function'
    ) {
        return blob;
    }

    let bitmap: ImageBitmap | null = null;
    try {
        bitmap = await createImageBitmap(blob);
        const longEdge = Math.max(bitmap.width, bitmap.height);
        if (longEdge <= MAX_PREVIEW_LONG_EDGE) return blob;

        const scale = MAX_PREVIEW_LONG_EDGE / longEdge;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext('2d');
        if (!context) return blob;
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        return await new Promise<Blob>((resolve) => {
            canvas.toBlob((screenBlob) => resolve(screenBlob || blob), 'image/png');
        });
    } catch {
        return blob;
    } finally {
        bitmap?.close();
    }
}

function getPreviewPayload(
    cacheKey: string,
    priority: boolean,
    renderInput: () => Promise<PrintableAssetRenderInput | null>,
): Promise<PreviewPayload | null> {
    const cached = previewCache.get(cacheKey);
    if (cached) {
        previewCache.delete(cacheKey);
        previewCache.set(cacheKey, cached);
        return cached;
    }

    const pending = enqueuePreview(async () => {
        const input = await renderInput();
        if (!input) return null;
        const result = await renderPrintableAsset({ ...input, outputFormat: 'png' });
        const blob = await createScreenPreviewBlob(result.blob, result.mimeType);
        return { blob, mimeType: blob.type || result.mimeType };
    }, priority);

    previewCache.set(cacheKey, pending);
    trimPreviewCache();
    void pending.catch(() => {
        if (previewCache.get(cacheKey) === pending) previewCache.delete(cacheKey);
    });
    return pending;
}

/**
 * Shows the canonical PNG produced by the same renderer used for downloads.
 * Catalogue previews render lazily, downscale for screen display, share a bounded
 * cache, and never crop. Download output remains at the renderer's print size.
 */
export default function RenderedPrintableAssetPreview({
    alt,
    assetTypeId,
    className,
    eager = false,
    emptyLabel = 'Add the required details to preview this asset.',
    previewVersion,
    renderInput,
    templateFamilyId,
}: RenderedPrintableAssetPreviewProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const renderInputRef = useRef(renderInput);
    const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [shouldRender, setShouldRender] = useState(eager);
    const cacheKey = `${assetTypeId}:${templateFamilyId}:${hashPreviewVersion(previewVersion)}`;

    useEffect(() => {
        renderInputRef.current = renderInput;
    }, [renderInput]);

    useEffect(() => {
        if (eager || typeof IntersectionObserver === 'undefined') {
            setShouldRender(true);
            return undefined;
        }

        const node = containerRef.current;
        if (!node) return undefined;
        const observer = new IntersectionObserver((entries) => {
            setShouldRender(entries.some((entry) => entry.isIntersecting));
        }, { rootMargin: '240px' });
        observer.observe(node);
        return () => observer.disconnect();
    }, [cacheKey, eager]);

    useEffect(() => {
        if (!shouldRender) return undefined;
        let cancelled = false;
        let objectUrl: string | null = null;
        setPreviewUrl(null);
        setPreviewState('loading');

        void getPreviewPayload(cacheKey, eager, () => renderInputRef.current())
            .then((payload) => {
                if (cancelled) return;
                if (!payload) {
                    setPreviewState('empty');
                    return;
                }
                objectUrl = URL.createObjectURL(
                    payload.blob.type
                        ? payload.blob
                        : new Blob([payload.blob], { type: payload.mimeType }),
                );
                setPreviewUrl(objectUrl);
                setPreviewState('ready');
            })
            .catch(() => {
                if (!cancelled) setPreviewState('error');
            });

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [cacheKey, eager, shouldRender]);

    return (
        <div className={`${styles.preview} ${className || ''}`} ref={containerRef}>
            {previewState === 'ready' && previewUrl ? (
                <img alt={alt} className={styles.image} src={previewUrl} />
            ) : previewState === 'empty' ? (
                <span className={styles.message} role="status">{emptyLabel}</span>
            ) : previewState === 'error' ? (
                <span className={styles.message} role="status">Preview unavailable</span>
            ) : (
                <span aria-label={`Loading ${alt}`} className={styles.skeleton} role="status" />
            )}
        </div>
    );
}
