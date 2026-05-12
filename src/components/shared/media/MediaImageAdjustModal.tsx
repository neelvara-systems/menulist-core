import { Button as MobileButton, Flex as MobileFlex, NavBar, Popup, Text as MobileText } from '@/components/mobile/antd';
import useDeviceType from '@hook/useDeviceType';
import { getMediaImageProfile, getSafeMediaAspectRatio, isMediaImageSystemEnabled, parseMediaAspectRatio, type MediaImageType } from '@lib/media/imageProfiles';
import {
    drawMediaImagePreview,
    getMediaImageFitToFrameZoom,
    getMediaImagePreviewDragDelta,
    prepareMediaImage,
    type MediaImageCropIntent,
    type PreparedMediaImage,
} from '@lib/media/prepareMediaImage';
import { Button, Flex, Modal, Typography, message, theme } from 'antd';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuCheck, LuMaximize2, LuRefreshCcw, LuRotateCcw, LuRotateCw, LuX } from 'react-icons/lu';

interface MediaImageAdjustModalProps {
    fileName?: string;
    imageType: MediaImageType;
    initialCrop?: MediaImageCropIntent;
    onApply: (prepared: PreparedMediaImage, crop: Required<MediaImageCropIntent>) => void | Promise<void>;
    onClose: () => void;
    open: boolean;
    sourceDataUrl?: string | null;
}

const DEFAULT_CROP: Required<MediaImageCropIntent> = {
    centerX: 0.5,
    centerY: 0.5,
    rotation: 0,
    zoom: 1,
};

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;

function clampZoom(value: number, minZoom = MIN_ZOOM): number {
    if (!Number.isFinite(value)) return DEFAULT_CROP.zoom;
    return Math.min(MAX_ZOOM, Math.max(minZoom, value));
}

function normalizeCrop(crop?: MediaImageCropIntent): Required<MediaImageCropIntent> {
    return {
        centerX: typeof crop?.centerX === 'number' ? crop.centerX : DEFAULT_CROP.centerX,
        centerY: typeof crop?.centerY === 'number' ? crop.centerY : DEFAULT_CROP.centerY,
        rotation: typeof crop?.rotation === 'number' ? crop.rotation : DEFAULT_CROP.rotation,
        zoom: clampZoom(typeof crop?.zoom === 'number' ? crop.zoom : DEFAULT_CROP.zoom),
    };
}

function getPointerDistance(points: Array<{ x: number; y: number }>): number {
    if (points.length < 2) return 0;
    const [first, second] = points;
    return Math.hypot(second.x - first.x, second.y - first.y);
}

const MediaImageAdjustModal: React.FC<MediaImageAdjustModalProps> = ({
    fileName,
    imageType,
    initialCrop,
    onApply,
    onClose,
    open,
    sourceDataUrl,
}) => {
    const { token } = theme.useToken();
    const { isMobile } = useDeviceType();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const dragRef = useRef<{
        crop: Required<MediaImageCropIntent>;
        pointerId: number;
        x: number;
        y: number;
    } | null>(null);
    const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
    const pinchRef = useRef<{
        crop: Required<MediaImageCropIntent>;
        distance: number;
    } | null>(null);
    const cropRef = useRef<Required<MediaImageCropIntent>>(normalizeCrop(initialCrop));
    const [crop, setCrop] = useState<Required<MediaImageCropIntent>>(normalizeCrop(initialCrop));
    const [isApplying, setIsApplying] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const profile = useMemo(() => getMediaImageProfile(imageType), [imageType]);
    const mediaSystemEnabled = isMediaImageSystemEnabled();
    const aspectRatio = useMemo(() => getSafeMediaAspectRatio(imageType, undefined), [imageType]);
    const numericAspectRatio = useMemo(() => parseMediaAspectRatio(aspectRatio), [aspectRatio]);
    const previewMaxWidth = numericAspectRatio < 1 ? (isMobile ? 260 : 320) : undefined;

    const getPreviewFrame = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(1, rect.width || canvas.clientWidth || 320);
        return {
            height: Math.max(1, width / numericAspectRatio),
            width,
        };
    }, [numericAspectRatio]);

    const getFitZoom = useCallback((nextCrop: Required<MediaImageCropIntent> = cropRef.current) => {
        const img = imageRef.current;
        const frame = getPreviewFrame();
        if (!img || !frame) return MIN_ZOOM;
        return getMediaImageFitToFrameZoom(img, profile, frame.width, frame.height, nextCrop);
    }, [getPreviewFrame, profile]);

    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (!canvas || !img) return;
        drawMediaImagePreview(canvas, img, profile, aspectRatio, crop);
    }, [aspectRatio, crop, profile]);

    useEffect(() => {
        cropRef.current = crop;
    }, [crop]);

    useEffect(() => {
        if (!open) return;
        setCrop(normalizeCrop(initialCrop));
        setLoadError(null);
        dragRef.current = null;
        pinchRef.current = null;
        pointersRef.current.clear();
    }, [initialCrop, open]);

    useEffect(() => {
        if (!open || !sourceDataUrl || !mediaSystemEnabled) return;
        const img = new Image();
        img.onload = () => {
            imageRef.current = img;
            setLoadError(null);
            requestAnimationFrame(redraw);
        };
        img.onerror = () => {
            imageRef.current = null;
            setLoadError('Could not load image.');
        };
        img.src = sourceDataUrl;

        return () => {
            if (imageRef.current === img) {
                imageRef.current = null;
            }
        };
    }, [mediaSystemEnabled, open, redraw, sourceDataUrl]);

    useEffect(() => {
        if (!open || !mediaSystemEnabled) return;
        requestAnimationFrame(redraw);
    }, [mediaSystemEnabled, open, redraw]);

    useEffect(() => {
        if (!open || !mediaSystemEnabled || typeof ResizeObserver === 'undefined') return undefined;
        const canvas = canvasRef.current;
        if (!canvas) return undefined;
        const observer = new ResizeObserver(() => redraw());
        observer.observe(canvas);
        return () => observer.disconnect();
    }, [mediaSystemEnabled, open, redraw]);

    const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!imageRef.current || !canvasRef.current) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        pointersRef.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
        });

        if (pointersRef.current.size >= 2) {
            const distance = getPointerDistance(Array.from(pointersRef.current.values()));
            pinchRef.current = {
                crop: cropRef.current,
                distance,
            };
            dragRef.current = null;
            return;
        }

        dragRef.current = {
            crop: cropRef.current,
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
        };
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (pointersRef.current.has(event.pointerId)) {
            pointersRef.current.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY,
            });
        }

        const pinch = pinchRef.current;
        if (pinch && pointersRef.current.size >= 2) {
            const distance = getPointerDistance(Array.from(pointersRef.current.values()));
            if (pinch.distance > 0 && distance > 0) {
                setCrop((current) => ({
                    ...current,
                    zoom: clampZoom(pinch.crop.zoom * (distance / pinch.distance), getFitZoom(current)),
                }));
            }
            return;
        }

        const drag = dragRef.current;
        const img = imageRef.current;
        const canvas = canvasRef.current;
        if (!drag || !img || !canvas || drag.pointerId !== event.pointerId) return;
        const rect = canvas.getBoundingClientRect();
        const nextCenter = getMediaImagePreviewDragDelta(
            img,
            profile,
            Math.max(1, rect.width),
            Math.max(1, rect.width / numericAspectRatio),
            drag.crop,
            event.clientX - drag.x,
            event.clientY - drag.y,
        );

        setCrop((current) => ({
            ...current,
            centerX: nextCenter.centerX ?? current.centerX,
            centerY: nextCenter.centerY ?? current.centerY,
        }));
    };

    const handlePointerEnd = (event: React.PointerEvent<HTMLCanvasElement>) => {
        pointersRef.current.delete(event.pointerId);
        pinchRef.current = null;
        if (dragRef.current?.pointerId === event.pointerId) {
            dragRef.current = null;
        }
        if (pointersRef.current.size === 1) {
            const [remainingPointerId, remainingPoint] = Array.from(pointersRef.current.entries())[0];
            dragRef.current = {
                crop: cropRef.current,
                pointerId: remainingPointerId,
                x: remainingPoint.x,
                y: remainingPoint.y,
            };
        }
    };

    const handleApply = async () => {
        if (!sourceDataUrl) return;
        setIsApplying(true);
        try {
            const prepared = await prepareMediaImage(sourceDataUrl, imageType, {
                crop,
                fileName,
            });
            await onApply(prepared, crop);
            onClose();
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not adjust image.');
        } finally {
            setIsApplying(false);
        }
    };

    const handleFitToFrame = () => {
        setCrop((current) => {
            const nextCrop = {
                ...current,
                centerX: 0.5,
                centerY: 0.5,
            };
            return {
                ...nextCrop,
                zoom: getFitZoom(nextCrop),
            };
        });
    };

    const preview = (
        <Flex gap={14} vertical>
            <canvas
                aria-label="Image adjustment preview"
                onPointerCancel={handlePointerEnd}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                ref={canvasRef}
                style={{
                    alignSelf: previewMaxWidth ? 'center' : undefined,
                    aspectRatio: numericAspectRatio,
                    background: token.colorFillAlter,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    borderRadius: 8,
                    cursor: 'grab',
                    touchAction: 'none',
                    maxWidth: previewMaxWidth,
                    width: '100%',
                }}
            />
            {loadError ? (
                <Typography.Text type="danger">{loadError}</Typography.Text>
            ) : (
                <Typography.Text type="secondary">
                    Drag the image to frame it. On mobile, pinch with two fingers to zoom. MenuList keeps the final size and compression fixed.
                </Typography.Text>
            )}
            <Flex gap={10} vertical>
                <Flex align="center" gap={12}>
                    <Typography.Text style={{ flex: '0 0 48px' }}>Zoom</Typography.Text>
                    <input
                        aria-label="Zoom"
                        max={MAX_ZOOM}
                        min={MIN_ZOOM}
                        onChange={(event) => setCrop((current) => ({ ...current, zoom: clampZoom(Number(event.target.value), getFitZoom(current)) }))}
                        step={0.05}
                        style={{
                            accentColor: token.colorPrimary,
                            flex: 1,
                            height: 28,
                            minWidth: isMobile ? 190 : 320,
                        }}
                        type="range"
                        value={crop.zoom}
                    />
                </Flex>
                <Flex align="center" gap={8} justify="space-between" wrap="nowrap">
                    <Button icon={<LuMaximize2 size={16} />} onClick={handleFitToFrame}>
                        Fit
                    </Button>
                    <Button icon={<LuRotateCcw size={16} />} onClick={() => setCrop((current) => ({ ...current, rotation: current.rotation - 90 }))}>
                        Left
                    </Button>
                    <Button icon={<LuRotateCw size={16} />} onClick={() => setCrop((current) => ({ ...current, rotation: current.rotation + 90 }))}>
                        Right
                    </Button>
                    <Button icon={<LuRefreshCcw size={16} />} onClick={() => setCrop(DEFAULT_CROP)}>
                        Reset
                    </Button>
                </Flex>
            </Flex>
        </Flex>
    );

    if (!mediaSystemEnabled) return null;

    if (isMobile) {
        return (
            <Popup
                bodyStyle={{ height: '88vh', maxHeight: '88vh', padding: 0 }}
                destroyOnClose
                onMaskClick={isApplying ? undefined : onClose}
                visible={open}
            >
                <MobileFlex style={{ height: '100%' }} vertical>
                    <NavBar right={<MobileButton disabled={isApplying} fill="none" onClick={onClose} style={{ minHeight: 40, minWidth: 40, paddingInline: 0 }}><LuX size={18} /></MobileButton>}>
                        Adjust image
                    </NavBar>
                    <MobileFlex flex={1} gap={14} style={{ minHeight: 0, overflowY: 'auto', padding: 16 }} vertical>
                        {preview}
                    </MobileFlex>
                    <MobileFlex gap={10} style={{ borderTop: `1px solid ${token.colorBorderSecondary}`, padding: 16 }}>
                        <MobileButton block disabled={isApplying} fill="outline" onClick={() => setCrop(DEFAULT_CROP)}>
                            Reset
                        </MobileButton>
                        <MobileButton block disabled={Boolean(loadError) || !sourceDataUrl} loading={isApplying} onClick={() => void handleApply()}>
                            <MobileFlex align="center" gap={6} justify="center">
                                <LuCheck size={16} />
                                <MobileText>Save</MobileText>
                            </MobileFlex>
                        </MobileButton>
                    </MobileFlex>
                </MobileFlex>
            </Popup>
        );
    }

    return (
        <Modal
            centered
            destroyOnHidden
            maskClosable={!isApplying}
            onCancel={isApplying ? undefined : onClose}
            open={open}
            title="Adjust image"
            width={640}
            footer={[
                <Button key="reset" disabled={isApplying} icon={<LuRefreshCcw size={16} />} onClick={() => setCrop(DEFAULT_CROP)}>
                    Reset
                </Button>,
                <Button key="cancel" disabled={isApplying} onClick={onClose}>
                    Cancel
                </Button>,
                <Button key="save" disabled={Boolean(loadError) || !sourceDataUrl} icon={<LuCheck size={16} />} loading={isApplying} onClick={() => void handleApply()} type="primary">
                    Save
                </Button>,
            ]}
        >
            {preview}
        </Modal>
    );
};

export default MediaImageAdjustModal;
