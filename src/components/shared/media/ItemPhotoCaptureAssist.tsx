'use client';

import { Button, Flex, Typography, theme } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LuCamera, LuCheckCircle, LuRefreshCcw, LuVideoOff } from 'react-icons/lu';
import {
    buildCapturedItemPhotoName,
    ITEM_PHOTO_CAPTURE_MODES,
    type ItemPhotoCaptureMode,
    type ItemPhotoReadinessResult,
} from '@lib/media/itemPhotoCaptureAssist';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';

const { Text } = Typography;
const ITEM_PHOTO_CAPTURE_FAILED_MESSAGE = 'Photo could not be used.';

interface ItemPhotoCaptureAssistProps {
    disabled?: boolean;
    itemName?: string;
    onCapture: (file: File, mode: ItemPhotoCaptureMode) => Promise<ItemPhotoReadinessResult | null | undefined>;
}

type CameraState = 'idle' | 'starting' | 'ready' | 'blocked';

const ItemPhotoCaptureAssist: React.FC<ItemPhotoCaptureAssistProps> = ({
    disabled,
    itemName,
    onCapture,
}) => {
    const { token } = theme.useToken();
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const previewUrlRef = useRef<string | null>(null);
    const [mode, setMode] = useState<ItemPhotoCaptureMode>('topDown');
    const [cameraState, setCameraState] = useState<CameraState>('idle');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<ItemPhotoReadinessResult | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const activeMode = ITEM_PHOTO_CAPTURE_MODES.find((entry) => entry.id === mode) || ITEM_PHOTO_CAPTURE_MODES[0];

    const clearPreview = useCallback(() => {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
        setPreviewUrl(null);
    }, []);

    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const closeCamera = useCallback(() => {
        stopCamera();
        setCameraState('idle');
    }, [stopCamera]);

    useEffect(() => () => {
        stopCamera();
        clearPreview();
    }, [clearPreview, stopCamera]);

    const startCamera = useCallback(async () => {
        if (disabled || cameraState === 'starting') return;

        setFeedback(null);
        setErrorMessage(null);
        clearPreview();

        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
            setCameraState('blocked');
            setErrorMessage('Camera is not available here. Use upload below.');
            return;
        }

        setCameraState('starting');

        try {
            stopCamera();
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    facingMode: { ideal: 'environment' },
                    height: { ideal: 960 },
                    width: { ideal: 1280 },
                },
            });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            setCameraState('ready');
        } catch (error) {
            logRuntimeFailure('item_photo_camera_start_failed', error, {
                ...getBoundedRuntimeStringContext('captureMode', mode),
                ...getBoundedRuntimeStringContext('itemName', itemName),
                hasMediaDevices: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia),
                hasVideoRef: Boolean(videoRef.current),
            });
            stopCamera();
            setCameraState('blocked');
            setErrorMessage('Camera is blocked. Use upload below.');
        }
    }, [cameraState, clearPreview, disabled, itemName, mode, stopCamera]);

    const handleRetake = useCallback(() => {
        setFeedback(null);
        setErrorMessage(null);
        void startCamera();
    }, [startCamera]);

    const handleCapture = useCallback(async () => {
        if (isCapturing || disabled) return;
        const video = videoRef.current;
        const width = video?.videoWidth || 0;
        const height = video?.videoHeight || 0;

        if (!video || width <= 0 || height <= 0) {
            setErrorMessage('Camera is not ready. Try again.');
            return;
        }

        setIsCapturing(true);
        setErrorMessage(null);

        try {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                throw new Error('Could not use camera image.');
            }

            ctx.drawImage(video, 0, 0, width, height);
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((result) => {
                    if (result) resolve(result);
                    else reject(new Error('Could not use camera image.'));
                }, 'image/jpeg', 0.9);
            });

            canvas.width = 0;
            canvas.height = 0;
            const nextPreviewUrl = URL.createObjectURL(blob);
            clearPreview();
            previewUrlRef.current = nextPreviewUrl;
            setPreviewUrl(nextPreviewUrl);
            stopCamera();
            setCameraState('idle');

            const file = new File([blob], buildCapturedItemPhotoName(itemName, mode), { type: 'image/jpeg' });
            const nextFeedback = await onCapture(file, mode);
            setFeedback(nextFeedback || null);
        } catch (error) {
            logRuntimeFailure('item_photo_capture_failed', error, {
                ...getBoundedRuntimeStringContext('captureMode', mode),
                ...getBoundedRuntimeStringContext('itemName', itemName),
                videoHeight: height,
                videoWidth: width,
            });
            setErrorMessage(ITEM_PHOTO_CAPTURE_FAILED_MESSAGE);
        } finally {
            setIsCapturing(false);
        }
    }, [clearPreview, disabled, isCapturing, itemName, mode, onCapture, stopCamera]);

    const frameStyle: React.CSSProperties = {
        alignItems: 'center',
        aspectRatio: '4 / 3',
        background: token.colorFillQuaternary,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        display: 'flex',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
    };

    const overlay = mode === 'topDown' ? (
        <>
            <div style={{ border: '2px solid rgba(255,255,255,0.9)', borderRadius: '50%', height: '52%', position: 'absolute', width: '52%' }} />
            {[33.33, 66.66].map((value) => (
                <React.Fragment key={value}>
                    <div style={{ background: 'rgba(255,255,255,0.32)', height: '100%', left: `${value}%`, position: 'absolute', top: 0, width: 1 }} />
                    <div style={{ background: 'rgba(255,255,255,0.32)', height: 1, left: 0, position: 'absolute', top: `${value}%`, width: '100%' }} />
                </React.Fragment>
            ))}
        </>
    ) : (
        <div style={{ border: '2px solid rgba(255,255,255,0.9)', borderRadius: token.borderRadiusLG, height: '68%', position: 'absolute', width: '78%' }} />
    );

    return (
        <div
            style={{
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadiusLG,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                padding: 12,
                width: '100%',
            }}
        >
            <Flex align="center" justify="space-between" gap={12} wrap="wrap">
                <Flex gap={2} vertical>
                    <Text strong>Take item photo</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{activeMode.helper}</Text>
                </Flex>
                <Flex gap={6} wrap="wrap">
                    {ITEM_PHOTO_CAPTURE_MODES.map((entry) => (
                        <Button
                            disabled={disabled || isCapturing}
                            key={entry.id}
                            onClick={() => setMode(entry.id)}
                            size="small"
                            type={mode === entry.id ? 'primary' : 'default'}
                        >
                            {entry.label}
                        </Button>
                    ))}
                </Flex>
            </Flex>

            <div style={frameStyle}>
                <video
                    muted
                    playsInline
                    ref={videoRef}
                    style={{
                        display: cameraState === 'ready' || cameraState === 'starting' ? 'block' : 'none',
                        height: '100%',
                        objectFit: 'cover',
                        width: '100%',
                    }}
                />
                {previewUrl ? (
                    <img
                        alt="Captured item"
                        src={previewUrl}
                        style={{ display: 'block', height: '100%', objectFit: 'cover', width: '100%' }}
                    />
                ) : null}
                {!previewUrl && (cameraState === 'ready' || cameraState === 'starting') ? overlay : null}
                {!previewUrl && cameraState === 'idle' ? (
                    <Flex align="center" gap={8} vertical>
                        <LuCamera color={token.colorTextSecondary} size={28} />
                        <Text type="secondary">Camera guide is ready.</Text>
                    </Flex>
                ) : null}
                {!previewUrl && cameraState === 'blocked' ? (
                    <Flex align="center" gap={8} vertical>
                        <LuVideoOff color={token.colorTextSecondary} size={28} />
                        <Text type="secondary">Use upload below.</Text>
                    </Flex>
                ) : null}
            </div>

            {feedback ? (
                <Flex
                    align="center"
                    gap={8}
                    style={{
                        background: feedback.status === 'ready' ? token.colorSuccessBg : token.colorWarningBg,
                        border: `1px solid ${feedback.status === 'ready' ? token.colorSuccessBorder : token.colorWarningBorder}`,
                        borderRadius: token.borderRadius,
                        padding: '8px 10px',
                    }}
                >
                    <LuCheckCircle color={feedback.status === 'ready' ? token.colorSuccess : token.colorWarning} size={16} />
                    <Flex gap={0} vertical>
                        <Text strong>{feedback.title}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{feedback.detail}</Text>
                    </Flex>
                </Flex>
            ) : null}

            {errorMessage ? (
                <Text type="secondary" style={{ fontSize: 12 }}>{errorMessage}</Text>
            ) : null}

            <Flex gap={8} wrap="wrap">
                {cameraState === 'ready' ? (
                    <Button
                        disabled={disabled || isCapturing}
                        icon={<LuCamera />}
                        loading={isCapturing}
                        onClick={() => { void handleCapture(); }}
                        type="primary"
                    >
                        Use photo
                    </Button>
                ) : (
                    <Button
                        disabled={disabled || isCapturing || cameraState === 'starting'}
                        icon={previewUrl ? <LuRefreshCcw /> : <LuCamera />}
                        loading={cameraState === 'starting'}
                        onClick={previewUrl ? handleRetake : () => { void startCamera(); }}
                    >
                        {previewUrl ? 'Retake' : 'Start camera'}
                    </Button>
                )}
                {cameraState === 'ready' ? (
                    <Button disabled={disabled || isCapturing} onClick={closeCamera}>
                        Close camera
                    </Button>
                ) : null}
            </Flex>
        </div>
    );
};

export default ItemPhotoCaptureAssist;
