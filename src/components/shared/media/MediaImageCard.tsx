import React, { useCallback, useRef, useState } from 'react';
import { LuClipboard, LuCrop, LuImagePlus, LuRefreshCcw, LuTrash2, LuUpload } from 'react-icons/lu';
import { isMediaImageSystemEnabled } from '@lib/media/imageProfiles';

interface MediaImageCardProps {
    accept?: string;
    adjustLabel?: string;
    alt?: string;
    aspectRatio?: string;
    canAdjust?: boolean;
    canPaste?: boolean;
    disabled?: boolean;
    helperText?: React.ReactNode;
    imageFit?: 'contain' | 'cover';
    imageUrl?: string | null;
    isBusy?: boolean;
    onAdjust?: () => void;
    onRemove?: () => void;
    onReset?: () => void;
    onSelectFile?: (file: File) => void | Promise<void>;
    placeholderDescription?: React.ReactNode;
    placeholderTitle?: React.ReactNode;
    removeLabel?: string;
    replaceLabel?: string;
    resetLabel?: string;
    showDropHint?: boolean;
    size?: 'compact' | 'default';
    style?: React.CSSProperties;
    uploadLabel?: string;
}

const actionButtonStyle: React.CSSProperties = {
    alignItems: 'center',
    background: 'rgba(255,255,255,0.94)',
    border: '1px solid rgba(15, 23, 42, 0.12)',
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
    color: '#111827',
    cursor: 'pointer',
    display: 'inline-flex',
    font: 'inherit',
    fontSize: 12,
    fontWeight: 500,
    gap: 6,
    minHeight: 32,
    padding: '6px 9px',
};

function getFirstImageFile(fileList?: FileList | null): File | null {
    if (!fileList) return null;
    return Array.from(fileList).find((file) => file.type.startsWith('image/')) || null;
}

const MediaImageCard: React.FC<MediaImageCardProps> = ({
    accept,
    adjustLabel = 'Adjust',
    alt = 'Image preview',
    aspectRatio = '16 / 9',
    canAdjust,
    canPaste = true,
    disabled,
    helperText,
    imageFit = 'cover',
    imageUrl,
    isBusy,
    onAdjust,
    onRemove,
    onReset,
    onSelectFile,
    placeholderDescription = 'Drop an image here, paste one, or choose a file.',
    placeholderTitle = 'Upload image',
    removeLabel = 'Remove',
    replaceLabel = 'Replace',
    resetLabel = 'Reset',
    showDropHint = true,
    size = 'default',
    style,
    uploadLabel = 'Upload',
}) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const hasImage = Boolean(imageUrl);
    const canUpload = Boolean(onSelectFile) && !disabled && !isBusy;
    const canShowAdjust = isMediaImageSystemEnabled() && canAdjust && onAdjust;
    const compact = size === 'compact';

    const selectFile = useCallback((file: File | null) => {
        if (!file || !canUpload) return;
        void onSelectFile?.(file);
    }, [canUpload, onSelectFile]);

    const openPicker = useCallback(() => {
        if (!canUpload) return;
        inputRef.current?.click();
    }, [canUpload]);

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        selectFile(getFirstImageFile(event.dataTransfer.files));
    };

    const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
        if (!canPaste || !canUpload) return;
        const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith('image/'));
        const file = imageItem?.getAsFile();
        if (file) {
            event.preventDefault();
            selectFile(file);
        }
    };

    const borderColor = isDragging ? '#1677ff' : 'rgba(15, 23, 42, 0.14)';
    const minHeight = compact ? 112 : 160;

    return (
        <div
            onDragEnter={(event) => {
                event.preventDefault();
                if (canUpload) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(event) => {
                if (!canUpload) return;
                event.preventDefault();
            }}
            onDrop={handleDrop}
            onPaste={handlePaste}
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                minWidth: 0,
                width: '100%',
                ...style,
            }}
            tabIndex={canPaste && canUpload ? 0 : undefined}
        >
            <input
                accept={accept}
                onChange={(event) => {
                    selectFile(getFirstImageFile(event.currentTarget.files));
                    event.currentTarget.value = '';
                }}
                ref={inputRef}
                style={{ display: 'none' }}
                type="file"
            />

            <div
                aria-label={hasImage ? alt : String(placeholderTitle)}
                onClick={!hasImage ? openPicker : undefined}
                role={!hasImage && canUpload ? 'button' : undefined}
                style={{
                    alignItems: 'center',
                    aspectRatio,
                    background: hasImage ? '#f8fafc' : isDragging ? 'rgba(22, 119, 255, 0.08)' : '#f8fafc',
                    border: hasImage ? `1px solid ${borderColor}` : `1px dashed ${borderColor}`,
                    borderRadius: 10,
                    color: '#64748b',
                    cursor: !hasImage && canUpload ? 'pointer' : 'default',
                    display: 'flex',
                    justifyContent: 'center',
                    minHeight,
                    overflow: 'hidden',
                    position: 'relative',
                    transition: 'border-color 0.16s ease, background 0.16s ease',
                    width: '100%',
                }}
            >
                {hasImage ? (
                    <>
                        <img
                            alt={alt}
                            src={imageUrl || undefined}
                            style={{
                                display: 'block',
                                height: '100%',
                                objectFit: imageFit,
                                width: '100%',
                            }}
                        />
                        <div
                            style={{
                                alignItems: 'center',
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 6,
                                inset: 'auto 8px 8px 8px',
                                justifyContent: 'center',
                                pointerEvents: 'none',
                                position: 'absolute',
                            }}
                        >
                            {canUpload ? (
                                <button
                                    disabled={disabled || isBusy}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        openPicker();
                                    }}
                                    style={{ ...actionButtonStyle, pointerEvents: 'auto' }}
                                    type="button"
                                >
                                    <LuImagePlus size={14} />
                                    {replaceLabel}
                                </button>
                            ) : null}
                            {canShowAdjust ? (
                                <button
                                    disabled={disabled || isBusy}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onAdjust();
                                    }}
                                    style={{ ...actionButtonStyle, pointerEvents: 'auto' }}
                                    type="button"
                                >
                                    <LuCrop size={14} />
                                    {adjustLabel}
                                </button>
                            ) : null}
                            {onReset ? (
                                <button
                                    disabled={disabled || isBusy}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onReset();
                                    }}
                                    style={{ ...actionButtonStyle, pointerEvents: 'auto' }}
                                    type="button"
                                >
                                    <LuRefreshCcw size={14} />
                                    {resetLabel}
                                </button>
                            ) : null}
                            {onRemove ? (
                                <button
                                    disabled={disabled || isBusy}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onRemove();
                                    }}
                                    style={{
                                        ...actionButtonStyle,
                                        color: '#dc2626',
                                        pointerEvents: 'auto',
                                    }}
                                    type="button"
                                >
                                    <LuTrash2 size={14} />
                                    {removeLabel}
                                </button>
                            ) : null}
                        </div>
                    </>
                ) : (
                    <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'column', gap: 8, padding: 16, textAlign: 'center' }}>
                        <LuUpload size={compact ? 22 : 28} />
                        <div style={{ color: '#111827', fontWeight: 600 }}>{isBusy ? 'Preparing image...' : placeholderTitle}</div>
                        {placeholderDescription ? (
                            <div style={{ fontSize: 12, maxWidth: 260 }}>{placeholderDescription}</div>
                        ) : null}
                        {showDropHint && canUpload ? (
                            <div style={{ alignItems: 'center', display: 'inline-flex', fontSize: 12, gap: 6 }}>
                                <LuClipboard size={14} />
                                {uploadLabel}
                            </div>
                        ) : null}
                    </div>
                )}
            </div>

            {helperText ? (
                <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.45 }}>
                    {helperText}
                </div>
            ) : null}
        </div>
    );
};

export default MediaImageCard;
