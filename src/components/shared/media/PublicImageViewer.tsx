'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { LuChevronLeft, LuChevronRight, LuMinus, LuPlus, LuRotateCcw, LuX } from 'react-icons/lu';

export interface PublicImageViewerImage {
    alt: string;
    url: string;
}

interface PublicImageViewerProps {
    accentColor?: string;
    closeLabel?: string;
    direction?: 'ltr' | 'rtl';
    images: PublicImageViewerImage[];
    initialIndex?: number;
    language?: string;
    nextLabel?: string;
    onClose: () => void;
    onIndexChange?: (index: number) => void;
    open: boolean;
    positionLabelTemplate?: string;
    previousLabel?: string;
    resetZoomLabel?: string;
    title?: string;
    zoomInLabel?: string;
    zoomOutLabel?: string;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const SWIPE_DISTANCE_PX = 48;
const SWIPE_AXIS_LOCK_RATIO = 1.2;

function clampZoom(value: number): number {
    if (!Number.isFinite(value)) return MIN_ZOOM;
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function getTouchDistance(touches: { length: number; [index: number]: { clientX: number; clientY: number } | undefined }): number {
    if (touches.length < 2) return 0;
    const first = touches[0];
    const second = touches[1];
    if (!first || !second) return 0;
    return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
}

export default function PublicImageViewer({
    accentColor = '#14b8c4',
    closeLabel = 'Close image viewer',
    direction = 'ltr',
    images,
    initialIndex = 0,
    language,
    nextLabel = 'Next image',
    onClose,
    onIndexChange,
    open,
    positionLabelTemplate,
    previousLabel = 'Previous image',
    resetZoomLabel = 'Reset image zoom',
    title = 'Image viewer',
    zoomInLabel = 'Zoom in',
    zoomOutLabel = 'Zoom out',
}: PublicImageViewerProps) {
    const normalizedImages = useMemo(
        () => images.filter((image) => image?.url),
        [images],
    );
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [zoom, setZoom] = useState(MIN_ZOOM);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
    const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
    const stageRef = useRef<HTMLDivElement | null>(null);
    const swipeRef = useRef<{ x: number; y: number } | null>(null);
    const currentImage = normalizedImages[currentIndex] || normalizedImages[0] || null;
    const canNavigate = normalizedImages.length > 1;
    const positionLabel = positionLabelTemplate
        ? positionLabelTemplate
            .replace('{index}', String(currentIndex + 1))
            .replace('{total}', String(normalizedImages.length))
        : `${currentIndex + 1}/${normalizedImages.length}`;

    const resetViewer = useCallback(() => {
        setZoom(MIN_ZOOM);
        setPan({ x: 0, y: 0 });
        dragRef.current = null;
        pinchRef.current = null;
        swipeRef.current = null;
    }, []);

    const goToIndex = useCallback((nextIndex: number) => {
        if (normalizedImages.length === 0) return;
        const resolvedIndex = (nextIndex + normalizedImages.length) % normalizedImages.length;
        setCurrentIndex(resolvedIndex);
        onIndexChange?.(resolvedIndex);
        resetViewer();
    }, [normalizedImages.length, onIndexChange, resetViewer]);

    const showPrevious = useCallback(() => goToIndex(currentIndex - 1), [currentIndex, goToIndex]);
    const showNext = useCallback(() => goToIndex(currentIndex + 1), [currentIndex, goToIndex]);

    const setViewerZoom = useCallback((nextZoom: number | ((current: number) => number)) => {
        setZoom((current) => {
            const resolved = typeof nextZoom === 'function' ? nextZoom(current) : nextZoom;
            const clamped = clampZoom(resolved);
            if (clamped === MIN_ZOOM) {
                setPan({ x: 0, y: 0 });
                dragRef.current = null;
            }
            return clamped;
        });
    }, []);

    const startPan = useCallback((clientX: number, clientY: number) => {
        if (zoom <= MIN_ZOOM) return;
        dragRef.current = {
            x: clientX,
            y: clientY,
            panX: pan.x,
            panY: pan.y,
        };
    }, [pan.x, pan.y, zoom]);

    const movePan = useCallback((clientX: number, clientY: number) => {
        const dragState = dragRef.current;
        if (!dragState || zoom <= MIN_ZOOM) return;
        setPan({
            x: dragState.panX + clientX - dragState.x,
            y: dragState.panY + clientY - dragState.y,
        });
    }, [zoom]);

    const endPan = useCallback(() => {
        dragRef.current = null;
    }, []);

    const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
        if (event.touches.length >= 2) {
            const distance = getTouchDistance(event.touches);
            if (distance > 0) {
                dragRef.current = null;
                swipeRef.current = null;
                pinchRef.current = { distance, zoom };
            }
            return;
        }

        if (event.touches.length !== 1) {
            dragRef.current = null;
            pinchRef.current = null;
            swipeRef.current = null;
            return;
        }

        const touch = event.touches[0];
        if (!touch) return;

        if (zoom > MIN_ZOOM) {
            startPan(touch.clientX, touch.clientY);
            swipeRef.current = null;
            return;
        }

        swipeRef.current = {
            x: touch.clientX,
            y: touch.clientY,
        };
    };

    const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
        if (event.touches.length >= 2) {
            const pinchState = pinchRef.current;
            const distance = getTouchDistance(event.touches);
            if (!pinchState || distance <= 0) return;

            setViewerZoom(pinchState.zoom * (distance / pinchState.distance));
            return;
        }

        if (event.touches.length !== 1) {
            dragRef.current = null;
            pinchRef.current = null;
            swipeRef.current = null;
            return;
        }

        if (zoom <= MIN_ZOOM) return;
        const touch = event.touches[0];
        if (touch) movePan(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
        if (event.touches.length < 2) {
            pinchRef.current = null;
        }

        if (event.touches.length > 0) return;

        if (zoom > MIN_ZOOM) {
            endPan();
            return;
        }

        const start = swipeRef.current;
        swipeRef.current = null;
        if (!start || !canNavigate) return;

        const touch = event.changedTouches[0];
        if (!touch) return;

        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;
        if (
            Math.abs(deltaX) < SWIPE_DISTANCE_PX ||
            Math.abs(deltaX) < Math.abs(deltaY) * SWIPE_AXIS_LOCK_RATIO
        ) {
            return;
        }

        if (deltaX < 0) {
            if (direction === 'rtl') showPrevious();
            else showNext();
        } else if (direction === 'rtl') {
            showNext();
        } else {
            showPrevious();
        }
    };

    const handleTouchCancel = () => {
        dragRef.current = null;
        pinchRef.current = null;
        swipeRef.current = null;
    };

    useEffect(() => {
        if (!open) return;
        const boundedIndex = Math.min(Math.max(initialIndex, 0), Math.max(normalizedImages.length - 1, 0));
        setCurrentIndex(boundedIndex);
        resetViewer();
    }, [initialIndex, normalizedImages.length, open, resetViewer]);

    useEffect(() => {
        if (!open || typeof window === 'undefined') return undefined;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
                return;
            }
            if (event.key === 'ArrowRight' && canNavigate) {
                event.preventDefault();
                if (direction === 'rtl') showPrevious();
                else showNext();
                return;
            }
            if (event.key === 'ArrowLeft' && canNavigate) {
                event.preventDefault();
                if (direction === 'rtl') showNext();
                else showPrevious();
            }
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
    }, [canNavigate, direction, onClose, open, showNext, showPrevious]);

    useEffect(() => {
        if (!open) return undefined;
        const stage = stageRef.current;
        if (!stage) return undefined;

        const handleWheel = (event: WheelEvent) => {
            event.preventDefault();
            setViewerZoom((current) => current + (event.deltaY < 0 ? 0.2 : -0.2));
        };

        stage.addEventListener('wheel', handleWheel, { passive: false });
        return () => stage.removeEventListener('wheel', handleWheel);
    }, [open, setViewerZoom]);

    if (!open || !currentImage) return null;

    const controlStyle = (disabled = false): CSSProperties => ({
        alignItems: 'center',
        background: '#ffffff',
        border: '1px solid rgba(255,255,255,0.42)',
        borderRadius: 999,
        boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
        color: accentColor,
        cursor: disabled ? 'default' : 'pointer',
        display: 'inline-flex',
        height: 36,
        justifyContent: 'center',
        opacity: disabled ? 0.45 : 1,
        padding: 0,
        width: 36,
    });

    return (
        <div
            aria-label={title}
            aria-modal="true"
            dir={direction}
            lang={language}
            onClick={onClose}
            role="dialog"
            style={{
                alignItems: 'center',
                background: 'rgba(0, 0, 0, 0.92)',
                display: 'flex',
                inset: 0,
                justifyContent: 'center',
                padding: 'calc(16px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom))',
                position: 'fixed',
                zIndex: 10030,
            }}
        >
            <div
                onClick={(event) => event.stopPropagation()}
                style={{
                    alignItems: 'center',
                    background: 'rgba(10, 14, 24, 0.68)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    borderRadius: 999,
                    bottom: 'calc(14px + env(safe-area-inset-bottom))',
                    boxShadow: '0 12px 28px rgba(0,0,0,0.28)',
                    display: 'inline-flex',
                    gap: 6,
                    left: '50%',
                    padding: 6,
                    position: 'absolute',
                    transform: 'translateX(-50%)',
                    zIndex: 3,
                }}
            >
                <button
                    aria-label={zoomOutLabel}
                    disabled={zoom <= MIN_ZOOM}
                    onClick={() => setViewerZoom((current) => current - 0.25)}
                    style={controlStyle(zoom <= MIN_ZOOM)}
                    type="button"
                >
                    <LuMinus aria-hidden="true" size={17} strokeWidth={2.4} />
                </button>
                <button
                    aria-label={resetZoomLabel}
                    onClick={resetViewer}
                    style={controlStyle()}
                    type="button"
                >
                    <LuRotateCcw aria-hidden="true" size={16} strokeWidth={2.4} />
                </button>
                <button
                    aria-label={zoomInLabel}
                    disabled={zoom >= MAX_ZOOM}
                    onClick={() => setViewerZoom((current) => current + 0.25)}
                    style={controlStyle(zoom >= MAX_ZOOM)}
                    type="button"
                >
                    <LuPlus aria-hidden="true" size={17} strokeWidth={2.4} />
                </button>
                <button
                    aria-label={closeLabel}
                    onClick={onClose}
                    style={controlStyle()}
                    type="button"
                >
                    <LuX aria-hidden="true" size={17} strokeWidth={2.4} />
                </button>
            </div>

            {canNavigate ? (
                <>
                    <button
                        aria-label={previousLabel}
                        onClick={(event) => {
                            event.stopPropagation();
                            showPrevious();
                        }}
                        style={{
                            ...controlStyle(),
                            insetInlineStart: `calc(12px + env(safe-area-inset-${direction === 'rtl' ? 'right' : 'left'}))`,
                            position: 'absolute',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 2,
                        }}
                        type="button"
                    >
                        {direction === 'rtl'
                            ? <LuChevronRight aria-hidden="true" size={22} strokeWidth={2.7} />
                            : <LuChevronLeft aria-hidden="true" size={22} strokeWidth={2.7} />}
                    </button>
                    <button
                        aria-label={nextLabel}
                        onClick={(event) => {
                            event.stopPropagation();
                            showNext();
                        }}
                        style={{
                            ...controlStyle(),
                            position: 'absolute',
                            insetInlineEnd: `calc(12px + env(safe-area-inset-${direction === 'rtl' ? 'left' : 'right'}))`,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 2,
                        }}
                        type="button"
                    >
                        {direction === 'rtl'
                            ? <LuChevronLeft aria-hidden="true" size={22} strokeWidth={2.7} />
                            : <LuChevronRight aria-hidden="true" size={22} strokeWidth={2.7} />}
                    </button>
                </>
            ) : null}

            <div
                onClick={(event) => event.stopPropagation()}
                onDoubleClick={() => setViewerZoom((current) => current > MIN_ZOOM ? MIN_ZOOM : 2)}
                onMouseDown={(event) => {
                    event.preventDefault();
                    startPan(event.clientX, event.clientY);
                }}
                onMouseLeave={endPan}
                onMouseMove={(event) => movePan(event.clientX, event.clientY)}
                onMouseUp={endPan}
                onTouchCancel={handleTouchCancel}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                onTouchStart={handleTouchStart}
                ref={stageRef}
                style={{
                    cursor: zoom > MIN_ZOOM ? 'grab' : 'default',
                    height: '100%',
                    maxHeight: 'calc(100dvh - 48px - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
                    maxWidth: 'min(100%, 980px)',
                    overflow: 'hidden',
                    position: 'relative',
                    touchAction: 'none',
                    userSelect: 'none',
                    width: '100%',
                }}
            >
                <img
                    alt={currentImage.alt}
                    draggable={false}
                    src={currentImage.url}
                    style={{
                        display: 'block',
                        height: '100%',
                        objectFit: 'contain',
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transition: dragRef.current || pinchRef.current ? 'none' : 'transform 0.12s ease',
                        width: '100%',
                    }}
                />
            </div>

            {canNavigate ? (
                <div
                    aria-live="polite"
                    style={{
                        background: 'rgba(255,255,255,0.94)',
                        borderRadius: 999,
                        color: '#111827',
                        fontSize: 12,
                        fontWeight: 800,
                        lineHeight: 1,
                        padding: '8px 10px',
                        position: 'absolute',
                        insetInlineEnd: `calc(14px + env(safe-area-inset-${direction === 'rtl' ? 'left' : 'right'}))`,
                        top: 'calc(14px + env(safe-area-inset-top))',
                        zIndex: 3,
                    }}
                >
                    {positionLabel}
                </div>
            ) : null}
        </div>
    );
}
