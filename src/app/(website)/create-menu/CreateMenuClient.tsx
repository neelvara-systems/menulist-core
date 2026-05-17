'use client';

/**
 * Public Menu Entry — Upload Client Component
 * 
 * Handles image upload, optimization, API call, and redirect to preview.
 * Mobile-first design with camera capture support.
 * 
 * @see __docs__/public-menu-entry/public-menu-entry_impl.md §6.1
 */

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LuAlertCircle, LuCamera, LuCheck, LuLoader, LuUpload } from 'react-icons/lu';
import WebsiteHeadline from '@/components/website/shared/WebsiteHeadline';

type UploadState = 'idle' | 'optimizing' | 'uploading' | 'processing' | 'success' | 'error';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function CreateMenuClient() {
    const t = useTranslations('Website');
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [state, setState] = useState<UploadState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    // Cleanup objectURL on unmount or when preview changes to prevent memory leak
    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    const handleFileSelect = useCallback(async (file: File) => {
        setError(null);

        // Validate type
        if (!ALLOWED_TYPES.includes(file.type)) {
            setError(t('CreateMenu.invalidType'));
            return;
        }

        // Validate size
        if (file.size > MAX_FILE_SIZE) {
            setError(t('CreateMenu.fileTooLarge'));
            return;
        }

        // Show preview
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);

        try {
            // Step 1: Optimize image client-side
            setState('optimizing');
            const optimizedFile = await optimizeImage(file);

            // Step 2: Upload to API
            setState('uploading');
            const formData = new FormData();
            formData.append('image', optimizedFile);

            const response = await fetch('/api/public/create-menu', {
                method: 'POST',
                body: formData,
            });

            if (response.status === 429) {
                setError(t('CreateMenu.uploadLimit'));
                setState('error');
                return;
            }

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                setError(data.error || t('CreateMenu.uploadFailed'));
                setState('error');
                return;
            }

            const data = await response.json();

            // Step 3: Redirect to preview page
            setState('success');
            router.push(`/create-menu/preview/${data.draftId}`);

        } catch (err) {
            setError(t('CreateMenu.genericError'));
            setState('error');
        }
    }, [router, t]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    }, [handleFileSelect]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileSelect(file);
    }, [handleFileSelect]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const isProcessing = state === 'optimizing' || state === 'uploading' || state === 'processing';

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '40px 20px 60px',
            minHeight: '70vh',
            maxWidth: '560px',
            margin: '0 auto',
        }}>
            {/* Hero */}
            <WebsiteHeadline
                as="h1"
                size="compact"
                text={t('CreateMenu.title')}
                highlightedText={t('CreateMenu.titleHighlight')}
                style={{
                    textAlign: 'center',
                    marginBottom: '12px',
                    lineHeight: 1.2,
                }}
            />
            <p style={{
                fontSize: '16px',
                color: 'var(--ws-text-secondary)',
                textAlign: 'center',
                marginBottom: '32px',
                maxWidth: '420px',
                lineHeight: 1.5,
            }}>
                {t('CreateMenu.subtitle')}
            </p>

            {/* Upload Area */}
            <div
                onClick={!isProcessing ? triggerFileInput : undefined}
                onDrop={!isProcessing ? handleDrop : undefined}
                onDragOver={handleDragOver}
                style={{
                    width: '100%',
                    minHeight: '240px',
                    border: `2px dashed ${error ? 'var(--ws-error)' : state === 'success' ? 'var(--ws-success)' : 'var(--ws-border-default)'}`,
                    borderRadius: 'var(--ws-radius-xl)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                    padding: '32px 24px',
                    cursor: isProcessing ? 'default' : 'pointer',
                    backgroundColor: isProcessing ? 'var(--ws-bg-subtle)' : 'var(--ws-bg-primary)',
                    transition: 'all var(--ws-transition-normal)',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleInputChange}
                    style={{ display: 'none' }}
                />

                {/* Preview image background */}
                {preview && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${preview})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: 0.15,
                        borderRadius: '14px',
                    }} />
                )}

                {/* State-based content */}
                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                    {state === 'idle' && (
                        <>
                            <LuCamera size={48} color="var(--ws-brand-secondary)" style={{ marginBottom: '12px' }} />
                            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ws-text-primary)', marginBottom: '4px' }}>
                                {t('CreateMenu.uploadTitle')}
                            </p>
                            <p style={{ fontSize: '14px', color: 'var(--ws-text-muted)' }}>
                                {t('CreateMenu.uploadHint')}
                            </p>
                        </>
                    )}

                    {state === 'optimizing' && (
                        <>
                            <LuLoader size={40} color="var(--ws-brand-secondary)" style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                            <p style={{ fontSize: '15px', color: 'var(--ws-text-secondary)' }}>{t('CreateMenu.preparing')}</p>
                        </>
                    )}

                    {state === 'uploading' && (
                        <>
                            <LuUpload size={40} color="var(--ws-brand-secondary)" style={{ marginBottom: '12px' }} />
                            <p style={{ fontSize: '15px', color: 'var(--ws-text-secondary)' }}>{t('CreateMenu.uploading')}</p>
                        </>
                    )}

                    {state === 'success' && (
                        <>
                            <LuCheck size={40} color="var(--ws-success)" style={{ marginBottom: '12px' }} />
                            <p style={{ fontSize: '15px', color: 'var(--ws-success)' }}>{t('CreateMenu.redirecting')}</p>
                        </>
                    )}

                    {state === 'error' && (
                        <>
                            <LuAlertCircle size={40} color="var(--ws-error)" style={{ marginBottom: '12px' }} />
                            <p style={{ fontSize: '15px', color: 'var(--ws-error)', marginBottom: '12px' }}>{error}</p>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setState('idle');
                                    setError(null);
                                    setPreview(null);
                                }}
                                style={{
                                    padding: '10px 24px',
                                    backgroundColor: 'var(--ws-cta-default)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 'var(--ws-radius-lg)',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                {t('CreateMenu.tryAgain')}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Value props */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginTop: '28px',
                width: '100%',
            }}>
                {[
                    { icon: '✓', text: t('CreateMenu.proof0') },
                    { icon: '✓', text: t('CreateMenu.proof1') },
                    { icon: '✓', text: t('CreateMenu.proof2') },
                ].map((item, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '14px',
                        color: 'var(--ws-text-secondary)',
                    }}>
                        <span style={{ color: 'var(--ws-success)', fontWeight: 700, fontSize: '16px' }}>{item.icon}</span>
                        {item.text}
                    </div>
                ))}
            </div>

            {/* How it works */}
            <div style={{
                marginTop: '40px',
                width: '100%',
                padding: '24px',
                backgroundColor: 'var(--ws-bg-subtle)',
                borderRadius: 'var(--ws-radius-xl)',
            }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ws-text-primary)', marginBottom: '16px' }}>
                    {t('CreateMenu.howTitle')}
                </h2>
                {[
                    { step: '1', title: t('CreateMenu.step0Title'), desc: t('CreateMenu.step0Desc') },
                    { step: '2', title: t('CreateMenu.step1Title'), desc: t('CreateMenu.step1Desc') },
                    { step: '3', title: t('CreateMenu.step2Title'), desc: t('CreateMenu.step2Desc') },
                ].map((item, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        gap: '14px',
                        marginBottom: i < 2 ? '16px' : 0,
                    }}>
                        <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--ws-brand-secondary)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                            fontWeight: 700,
                            flexShrink: 0,
                        }}>
                            {item.step}
                        </div>
                        <div>
                            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ws-text-primary)', marginBottom: '2px' }}>
                                {item.title}
                            </p>
                            <p style={{ fontSize: '13px', color: 'var(--ws-text-secondary)' }}>{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Spin animation CSS */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

/**
 * Client-side image optimization using Compressor.js
 * Max 1920px wide, 80% JPEG quality — same as existing menu upload pipeline
 */
async function optimizeImage(file: File): Promise<File> {
    try {
        const Compressor = (await import('compressorjs')).default;
        return new Promise((resolve, reject) => {
            new Compressor(file, {
                maxWidth: 1920,
                maxHeight: 1920,
                quality: 0.8,
                convertTypes: ['image/png', 'image/webp'],
                convertSize: 1000000, // Convert to JPEG if > 1MB
                success: (result) => {
                    const optimized = new File([result], file.name, { type: result.type });
                    resolve(optimized);
                },
                error: (err) => {
                    // Fallback: use original file if optimization fails
                    resolve(file);
                },
            });
        });
    } catch {
        // Compressor.js not available — use original
        return file;
    }
}
