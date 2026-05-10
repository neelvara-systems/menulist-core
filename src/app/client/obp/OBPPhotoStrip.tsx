'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LuChevronLeft, LuChevronRight, LuMinus, LuPlus, LuRotateCcw, LuX } from 'react-icons/lu';
import styles from './obp.module.scss';

interface OBPPhotoStripProps {
    closePreviewLabel: string;
    nextPhotoLabel: string;
    photoLabelTemplate: string;
    photoPositionTemplate: string;
    previousPhotoLabel: string;
    previewLabel: string;
    photos: string[];
    storeName: string;
}

export default function OBPPhotoStrip({
    closePreviewLabel,
    nextPhotoLabel,
    photoLabelTemplate,
    photoPositionTemplate,
    previousPhotoLabel,
    previewLabel,
    photos,
    storeName,
}: OBPPhotoStripProps) {
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
    const galleryPhotos = photos.filter(Boolean);
    const visiblePhotos = galleryPhotos.slice(0, 3);
    const formatPhotoLabel = (index: number) => photoLabelTemplate.replace('{index}', String(index));
    const formatPhotoPosition = (index: number) => photoPositionTemplate
        .replace('{index}', String(index))
        .replace('{total}', String(galleryPhotos.length));
    const previewUrl = previewIndex !== null ? galleryPhotos[previewIndex] : null;
    const canNavigate = galleryPhotos.length > 1;
    const resetViewer = useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        dragRef.current = null;
    }, []);
    const closePreview = useCallback(() => {
        setPreviewIndex(null);
        resetViewer();
    }, [resetViewer]);
    const showPreviousPhoto = useCallback(() => setPreviewIndex((current) => {
        if (current === null) return current;
        resetViewer();
        return current === 0 ? galleryPhotos.length - 1 : current - 1;
    }), [galleryPhotos.length, resetViewer]);
    const showNextPhoto = useCallback(() => setPreviewIndex((current) => {
        if (current === null) return current;
        resetViewer();
        return current === galleryPhotos.length - 1 ? 0 : current + 1;
    }), [galleryPhotos.length, resetViewer]);
    const setViewerZoom = useCallback((nextZoom: number | ((current: number) => number)) => {
        setZoom((current) => {
            const resolved = typeof nextZoom === 'function' ? nextZoom(current) : nextZoom;
            const clamped = Math.min(3, Math.max(1, resolved));
            if (clamped === 1) {
                setPan({ x: 0, y: 0 });
                dragRef.current = null;
            }
            return clamped;
        });
    }, []);
    const startPan = useCallback((clientX: number, clientY: number) => {
        if (zoom <= 1) return;
        dragRef.current = {
            x: clientX,
            y: clientY,
            panX: pan.x,
            panY: pan.y,
        };
    }, [pan.x, pan.y, zoom]);
    const movePan = useCallback((clientX: number, clientY: number) => {
        const dragState = dragRef.current;
        if (!dragState || zoom <= 1) return;
        setPan({
            x: dragState.panX + clientX - dragState.x,
            y: dragState.panY + clientY - dragState.y,
        });
    }, [zoom]);
    const endPan = useCallback(() => {
        dragRef.current = null;
    }, []);

    useEffect(() => {
        if (previewIndex === null || typeof window === 'undefined') return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closePreview();
            if (event.key === 'ArrowRight' && canNavigate) showNextPhoto();
            if (event.key === 'ArrowLeft' && canNavigate) showPreviousPhoto();
        };

        const html = document.documentElement;
        const body = document.body;
        const previousStyles = {
            htmlOverflow: html.style.overflow,
            htmlOverscrollBehavior: html.style.overscrollBehavior,
            bodyOverflow: body.style.overflow,
            bodyOverscrollBehavior: body.style.overscrollBehavior,
        };

        html.style.overflow = 'hidden';
        html.style.overscrollBehavior = 'none';
        body.style.overflow = 'hidden';
        body.style.overscrollBehavior = 'none';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            html.style.overflow = previousStyles.htmlOverflow;
            html.style.overscrollBehavior = previousStyles.htmlOverscrollBehavior;
            body.style.overflow = previousStyles.bodyOverflow;
            body.style.overscrollBehavior = previousStyles.bodyOverscrollBehavior;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [canNavigate, closePreview, previewIndex, showNextPhoto, showPreviousPhoto]);

    if (galleryPhotos.length === 0) return null;

    return (
        <>
            <div className={styles.photoStrip}>
                {visiblePhotos.map((url, index) => (
                    <button
                        aria-label={`${storeName} ${formatPhotoLabel(index + 1)}`}
                        className={styles.photoButton}
                        key={url}
                        onClick={() => {
                            resetViewer();
                            setPreviewIndex(index);
                        }}
                        type="button"
                    >
                        <img
                            src={url}
                            alt={`${storeName} ${formatPhotoLabel(index + 1)}`}
                            loading="lazy"
                        />
                    </button>
                ))}
            </div>
            {previewUrl ? (
                <div
                    aria-label={`${storeName} ${previewLabel}`}
                    className={styles.photoPreviewBackdrop}
                    onClick={closePreview}
                    role="dialog"
                >
                    <div className={styles.photoPreviewFrame} onClick={(event) => event.stopPropagation()}>
                        <div className={styles.photoPreviewToolbar}>
                            <button
                                aria-label="Zoom out"
                                className={styles.photoPreviewToolbarButton}
                                disabled={zoom <= 1}
                                onClick={() => setViewerZoom((current) => current - 0.25)}
                                type="button"
                            >
                                <LuMinus aria-hidden="true" size={17} strokeWidth={2.4} />
                            </button>
                            <button
                                aria-label="Reset image zoom"
                                className={styles.photoPreviewToolbarButton}
                                onClick={resetViewer}
                                type="button"
                            >
                                <LuRotateCcw aria-hidden="true" size={16} strokeWidth={2.4} />
                            </button>
                            <button
                                aria-label="Zoom in"
                                className={styles.photoPreviewToolbarButton}
                                disabled={zoom >= 3}
                                onClick={() => setViewerZoom((current) => current + 0.25)}
                                type="button"
                            >
                                <LuPlus aria-hidden="true" size={17} strokeWidth={2.4} />
                            </button>
                            <button
                                aria-label={closePreviewLabel}
                                className={styles.photoPreviewToolbarButton}
                                onClick={closePreview}
                                type="button"
                            >
                                <LuX aria-hidden="true" size={17} strokeWidth={2.4} />
                            </button>
                        </div>
                        {canNavigate ? (
                            <button
                                aria-label={previousPhotoLabel}
                                className={`${styles.photoPreviewControl} ${styles.photoPreviewPrev}`}
                                onClick={showPreviousPhoto}
                                type="button"
                            >
                                <LuChevronLeft aria-hidden="true" size={26} strokeWidth={2.7} />
                            </button>
                        ) : null}
                        <div
                            className={`${styles.photoPreviewImageStage} ${zoom > 1 ? styles.photoPreviewImageStageZoomed : ''}`}
                            onDoubleClick={() => setViewerZoom((current) => current > 1 ? 1 : 2)}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                startPan(event.clientX, event.clientY);
                            }}
                            onMouseLeave={endPan}
                            onMouseMove={(event) => movePan(event.clientX, event.clientY)}
                            onMouseUp={endPan}
                            onTouchEnd={endPan}
                            onTouchMove={(event) => {
                                if (zoom <= 1) return;
                                event.preventDefault();
                                const touch = event.touches[0];
                                if (touch) movePan(touch.clientX, touch.clientY);
                            }}
                            onTouchStart={(event) => {
                                const touch = event.touches[0];
                                if (touch) startPan(touch.clientX, touch.clientY);
                            }}
                            onWheel={(event) => {
                                event.preventDefault();
                                setViewerZoom((current) => current + (event.deltaY < 0 ? 0.2 : -0.2));
                            }}
                        >
                            <img
                                src={previewUrl}
                                alt={`${storeName} ${formatPhotoLabel((previewIndex || 0) + 1)}`}
                                draggable={false}
                                style={{
                                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                    transition: dragRef.current ? 'none' : 'transform 0.12s ease',
                                }}
                            />
                        </div>
                        {canNavigate ? (
                            <button
                                aria-label={nextPhotoLabel}
                                className={`${styles.photoPreviewControl} ${styles.photoPreviewNext}`}
                                onClick={showNextPhoto}
                                type="button"
                            >
                                <LuChevronRight aria-hidden="true" size={26} strokeWidth={2.7} />
                            </button>
                        ) : null}
                        {previewIndex !== null ? (
                            <div className={styles.photoPreviewCounter}>
                                {formatPhotoPosition(previewIndex + 1)}
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </>
    );
}
