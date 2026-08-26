import { Button, Flex, Spin, theme, Tooltip, Typography } from 'antd';
import Image from 'next/image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LuInfo, LuMinus, LuPlus, LuRotateCcw } from 'react-icons/lu';
import { TbLanguageHiragana } from 'react-icons/tb';
import {
    getBoundedMenuEditorStringContext,
    logMenuEditorFailure,
} from '../utils/editorDiagnostics';

const { Text } = Typography;

// Local storage key for first-time hint
const ZOOM_HINT_SHOWN_KEY = 'zoomableImage_hintShown';
const ZOOM_HINT_SHOWN_MARKER = 'v1';
let reportedZoomHintStorageFailure = false;

interface ZoomableImageProps {
    isLoading: boolean;
    src?: string | null;
    alt: string;
    retryTranslations: () => void;
    retryDescription: () => void;
}

export function ZoomableImage({ isLoading, src, alt, retryTranslations, retryDescription }: ZoomableImageProps) {
    const { token } = theme.useToken();
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [showZoomHint, setShowZoomHint] = useState(false);
    const hasImage = typeof src === 'string' && src.trim().length > 0;

    // Show first-time zoom hint
    useEffect(() => {
        if (!hasImage) {
            setShowZoomHint(false);
            return;
        }

        let hintShown = false;
        try {
            const marker = localStorage.getItem(ZOOM_HINT_SHOWN_KEY);
            hintShown = marker === ZOOM_HINT_SHOWN_MARKER || marker === 'true';
            if (
                marker !== null
                && marker !== ZOOM_HINT_SHOWN_MARKER
                && marker !== 'true'
            ) {
                localStorage.removeItem(ZOOM_HINT_SHOWN_KEY);
            }
        } catch (error) {
            logZoomHintStorageFailure('read', error);
        }

        if (!hintShown) {
            setShowZoomHint(true);
            // Auto-hide after 5 seconds
            const timer = setTimeout(() => {
                setShowZoomHint(false);
                persistZoomHintShown();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [hasImage]);

    const [zoom, setZoom] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });

    const handleZoomIn = useCallback(() => {
        setZoom(prev => Math.min(prev + 0.5, 4));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoom(prev => Math.max(prev - 0.5, 1));
    }, []);

    const handleResetZoom = useCallback(() => {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
    }, []);

    // Scroll wheel zoom handler (native event for passive: false)
    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.25 : 0.25;
        setZoom(prev => Math.min(Math.max(prev + delta, 1), 4));
        // Dismiss hint on first interaction
        if (showZoomHint) {
            setShowZoomHint(false);
            persistZoomHintShown();
        }
    }, [showZoomHint]);

    // Attach wheel listener with passive: false to allow preventDefault
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, [handleWheel]);

    // Keyboard shortcuts for zoom
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            setZoom(prev => Math.min(prev + 0.5, 4));
        } else if (e.key === '-' || e.key === '_') {
            e.preventDefault();
            setZoom(prev => Math.max(prev - 0.5, 1));
        } else if (e.key === '0') {
            e.preventDefault();
            handleResetZoom();
        }
    }, [handleResetZoom]);

    // Double-click to zoom to 200% or reset
    const handleDoubleClick = useCallback(() => {
        if (zoom === 1) {
            setZoom(2);
        } else {
            handleResetZoom();
        }
    }, [zoom, handleResetZoom]);

    const getBoundedPosition = useCallback((x: number, y: number) => {
        if (!containerRef.current || !imageRef.current) return { x, y };

        const container = containerRef.current.getBoundingClientRect();
        // offset dimensions exclude the ancestor transform. Using the bounding
        // rectangle here would apply the current zoom a second time.
        const scaledWidth = imageRef.current.offsetWidth * zoom;
        const scaledHeight = imageRef.current.offsetHeight * zoom;

        // Calculate the maximum allowed movement in each direction
        const maxX = Math.max(0, (scaledWidth - container.width) / 2);
        const maxY = Math.max(0, (scaledHeight - container.height) / 2);

        return {
            x: Math.min(Math.max(x, -maxX), maxX),
            y: Math.min(Math.max(y, -maxY), maxY)
        };
    }, [zoom]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (zoom > 1) {
            e.preventDefault();
            setIsDragging(true);
            setDragStart({ x: e.clientX, y: e.clientY });
            setStartPosition({ ...position });
        }
    }, [zoom, position]);

    const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (zoom > 1) {
            e.preventDefault();
            setIsDragging(true);
            setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
            setStartPosition({ ...position });
        }
    }, [zoom, position]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDragging && zoom > 1) {
            const deltaX = e.clientX - dragStart.x;
            const deltaY = e.clientY - dragStart.y;
            const newPosition = getBoundedPosition(
                startPosition.x + deltaX,
                startPosition.y + deltaY
            );
            setPosition(newPosition);
        }
    }, [isDragging, dragStart, startPosition, zoom, getBoundedPosition]);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (isDragging && zoom > 1) {
            e.preventDefault();
            const deltaX = e.touches[0].clientX - dragStart.x;
            const deltaY = e.touches[0].clientY - dragStart.y;
            const newPosition = getBoundedPosition(
                startPosition.x + deltaX,
                startPosition.y + deltaY
            );
            setPosition(newPosition);
        }
    }, [isDragging, dragStart, startPosition, zoom, getBoundedPosition]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (zoom === 1) {
            setPosition({ x: 0, y: 0 });
        }
    }, [zoom]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

    return (
        <Flex gap={10} vertical style={{ position: 'relative', width: '100%', minWidth: 300, paddingRight: 10 }}>
            <div
                ref={containerRef}
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    overflow: 'hidden',
                    cursor: isDragging ? 'grabbing' : (zoom > 1 ? 'grab' : 'default'),
                    userSelect: 'none',
                    touchAction: 'none',
                    position: 'relative'
                }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onDragStart={e => e.preventDefault()}
                onKeyDown={handleKeyDown}
                onDoubleClick={handleDoubleClick}
                tabIndex={0}
            >
                {/* First-time zoom hint */}
                {showZoomHint && hasImage && !isLoading && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: 'rgba(0,0,0,0.75)',
                            color: '#fff',
                            padding: '12px 20px',
                            borderRadius: 8,
                            zIndex: 10,
                            textAlign: 'center',
                            backdropFilter: 'blur(4px)',
                            animation: 'fadeIn 0.3s ease'
                        }}
                        onClick={() => {
                            setShowZoomHint(false);
                            persistZoomHintShown();
                        }}
                    >
                        <Text style={{ color: '#fff', fontSize: 13 }}>
                            🔍 Scroll or use +/- to zoom • Double-click to zoom in
                        </Text>
                    </div>
                )}
                {isLoading && <div className='animate__animated animate__fadeIn animate__faster'
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: token.colorBgMask,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 20,
                        zIndex: 1
                    }}>
                    <Spin size="large" />
                </div>}
                {hasImage ? (
                    <>
                        <div style={{
                            position: 'relative',
                            width: '100%',
                            minWidth: 300,
                            height: 400, // Set a fixed height or use aspect-ratio if known
                            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                            transformOrigin: '0 0',
                            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                            pointerEvents: 'none'
                        }}>
                            <Image
                                ref={imageRef}
                                src={src.trim()}
                                alt={alt}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                style={{
                                    objectFit: 'contain',
                                }}
                                draggable={false}
                            />
                        </div>
                        <Flex
                            gap={4}
                            style={{
                                position: 'absolute',
                                bottom: 10,
                                right: 10,
                                background: token.colorBgContainer,
                                padding: '4px 8px',
                                borderRadius: 8,
                                boxShadow: token.boxShadowSecondary,
                                zIndex: 9,
                                opacity: 0.9,
                                backdropFilter: 'blur(8px)',
                                transition: 'opacity 0.3s ease'
                            }}
                            className="zoom-controls"
                        >
                            <Tooltip title="Zoom out (-)">
                                <Button
                                    aria-label="Zoom out"
                                    type="text"
                                    icon={<LuMinus />}
                                    onClick={handleZoomOut}
                                    size="small"
                                    disabled={zoom <= 1}
                                />
                            </Tooltip>
                            <Tooltip title="Click to reset zoom">
                                <button
                                    type="button"
                                    aria-label="Reset zoom to 100%"
                                    onClick={handleResetZoom}
                                    disabled={zoom <= 1}
                                    style={{
                                        background: 'transparent',
                                        borderTop: 0,
                                        borderBottom: 0,
                                        color: token.colorTextSecondary,
                                        minWidth: 50,
                                        textAlign: 'center',
                                        borderLeft: `1px solid ${token.colorBorder}`,
                                        borderRight: `1px solid ${token.colorBorder}`,
                                        cursor: zoom > 1 ? 'pointer' : 'default',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0 4px'
                                    }}
                                >
                                    {Math.round(zoom * 100)}%
                                </button>
                            </Tooltip>
                            <Tooltip title="Zoom in (+)">
                                <Button
                                    aria-label="Zoom in"
                                    type="text"
                                    icon={<LuPlus />}
                                    onClick={handleZoomIn}
                                    size="small"
                                    disabled={zoom >= 4}
                                />
                            </Tooltip>
                            {zoom > 1 && (
                                <Tooltip title="Reset zoom (0)">
                                    <Button
                                        aria-label="Reset zoom"
                                        type="text"
                                        icon={<LuRotateCcw size={14} />}
                                        onClick={handleResetZoom}
                                        size="small"
                                    />
                                </Tooltip>
                            )}
                        </Flex>
                    </>
                ) : (
                    <Flex
                        align="center"
                        justify="center"
                        vertical
                        gap={8}
                        style={{
                            border: `1px dashed ${token.colorBorder}`,
                            borderRadius: 8,
                            color: token.colorTextSecondary,
                            height: 400,
                            minWidth: 300,
                            width: '100%',
                        }}
                    >
                        <LuInfo size={22} />
                        <Text type="secondary">No source image saved for this file.</Text>
                    </Flex>
                )}
            </div>
            <Flex gap={10}>
                <Tooltip title="This will improve translations for all items from this menu image">
                    <Button onClick={retryTranslations} block icon={<TbLanguageHiragana />}>
                        Fix Translations
                    </Button>
                </Tooltip>
                <Tooltip title="This will create descriptions for items that don&apos;t have one">
                    <Button onClick={retryDescription} block icon={<LuInfo />}>
                        Add Descriptions
                    </Button>
                </Tooltip>
            </Flex>
            <style jsx global>{`
                .zoom-controls {
                    opacity: 0.9;
                    border: 1px solid ${token.colorBorder};
                }
                .zoom-controls:hover {
                    opacity: 1;
                }
            `}</style>
        </Flex>
    );
}

export default ZoomableImage;

function persistZoomHintShown(): void {
    try {
        localStorage.setItem(ZOOM_HINT_SHOWN_KEY, ZOOM_HINT_SHOWN_MARKER);
    } catch (error) {
        logZoomHintStorageFailure('write', error);
    }
}

function logZoomHintStorageFailure(operation: 'read' | 'write', error: unknown): void {
    if (reportedZoomHintStorageFailure) return;
    reportedZoomHintStorageFailure = true;
    logMenuEditorFailure('menu_editor_zoom_hint_storage_failed', error, {
        operation,
        ...getBoundedMenuEditorStringContext('storageKey', ZOOM_HINT_SHOWN_KEY),
    });
}
