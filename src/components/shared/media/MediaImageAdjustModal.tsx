import { Button as MobileButton, Flex as MobileFlex, NavBar, Popup, Text as MobileText } from '@/components/mobile/antd';
import useDeviceType from '@hook/useDeviceType';
import { getMediaImageProfile, getSafeMediaAspectRatio, isMediaImageSystemEnabled, parseMediaAspectRatio, type MediaImageType } from '@lib/media/imageProfiles';
import {
    drawMediaImagePreview,
    getMediaImagePreviewDragDelta,
    prepareMediaImage,
    type MediaImageCropIntent,
    type PreparedMediaImage,
} from '@lib/media/prepareMediaImage';
import { Button, Flex, Modal, Typography, message, theme } from 'antd';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuCheck, LuRefreshCcw, LuRotateCcw, LuRotateCw, LuX } from 'react-icons/lu';

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

function normalizeCrop(crop?: MediaImageCropIntent): Required<MediaImageCropIntent> {
    return {
        centerX: typeof crop?.centerX === 'number' ? crop.centerX : DEFAULT_CROP.centerX,
        centerY: typeof crop?.centerY === 'number' ? crop.centerY : DEFAULT_CROP.centerY,
        rotation: typeof crop?.rotation === 'number' ? crop.rotation : DEFAULT_CROP.rotation,
        zoom: typeof crop?.zoom === 'number' ? crop.zoom : DEFAULT_CROP.zoom,
    };
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
    const [crop, setCrop] = useState<Required<MediaImageCropIntent>>(normalizeCrop(initialCrop));
    const [isApplying, setIsApplying] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const profile = useMemo(() => getMediaImageProfile(imageType), [imageType]);
    const mediaSystemEnabled = isMediaImageSystemEnabled();
    const aspectRatio = useMemo(() => getSafeMediaAspectRatio(imageType, undefined), [imageType]);
    const numericAspectRatio = useMemo(() => parseMediaAspectRatio(aspectRatio), [aspectRatio]);

    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (!canvas || !img) return;
        drawMediaImagePreview(canvas, img, profile, aspectRatio, crop);
    }, [aspectRatio, crop, profile]);

    useEffect(() => {
        if (!open) return;
        setCrop(normalizeCrop(initialCrop));
        setLoadError(null);
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
        dragRef.current = {
            crop,
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
        };
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
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
        if (dragRef.current?.pointerId === event.pointerId) {
            dragRef.current = null;
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
                    aspectRatio: numericAspectRatio,
                    background: token.colorFillAlter,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    borderRadius: 8,
                    cursor: 'grab',
                    touchAction: 'none',
                    width: '100%',
                }}
            />
            {loadError ? (
                <Typography.Text type="danger">{loadError}</Typography.Text>
            ) : (
                <Typography.Text type="secondary">
                    Drag the image to frame it. MenuList keeps the final size and compression fixed.
                </Typography.Text>
            )}
            <Flex gap={10} vertical>
                <Flex align="center" gap={10}>
                    <Typography.Text style={{ flex: '0 0 48px' }}>Zoom</Typography.Text>
                    <input
                        aria-label="Zoom"
                        max={3}
                        min={1}
                        onChange={(event) => setCrop((current) => ({ ...current, zoom: Number(event.target.value) }))}
                        step={0.05}
                        style={{ width: '100%' }}
                        type="range"
                        value={crop.zoom}
                    />
                </Flex>
                <Flex align="center" gap={10} wrap="wrap">
                    <Typography.Text style={{ flex: '0 0 48px' }}>Rotate</Typography.Text>
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
                    <NavBar onBack={isApplying ? undefined : onClose} right={<MobileButton disabled={isApplying} fill="none" onClick={onClose} style={{ minHeight: 40, minWidth: 40, paddingInline: 0 }}><LuX size={18} /></MobileButton>}>
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
