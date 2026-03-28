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
import { useCallback, useEffect, useRef, useState } from 'react';
import { LuAlertCircle, LuCamera, LuCheck, LuLoader, LuUpload } from 'react-icons/lu';

type UploadState = 'idle' | 'optimizing' | 'uploading' | 'processing' | 'success' | 'error';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function CreateMenuClient() {
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
            setError('Please upload a JPEG, PNG, or WebP image.');
            return;
        }

        // Validate size
        if (file.size > MAX_FILE_SIZE) {
            setError('Image is too large. Maximum size is 10MB.');
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
                setError('You\'ve reached the upload limit. Please try again in 24 hours.');
                setState('error');
                return;
            }

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                setError(data.error || 'Upload failed. Please try again.');
                setState('error');
                return;
            }

            const data = await response.json();

            // Step 3: Redirect to preview page
            setState('success');
            router.push(`/create-menu/preview/${data.draftId}`);

        } catch (err) {
            setError('Something went wrong. Please try again.');
            setState('error');
        }
    }, [router]);

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
            <h1 style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#1a1a2e',
                textAlign: 'center',
                marginBottom: '12px',
                lineHeight: 1.3,
            }}>
                Your menu, live in 60 seconds
            </h1>
            <p style={{
                fontSize: '16px',
                color: '#64748b',
                textAlign: 'center',
                marginBottom: '32px',
                maxWidth: '420px',
                lineHeight: 1.5,
            }}>
                Upload a photo of your menu. We turn it into a page your customers can use.
            </p>

            {/* Upload Area */}
            <div
                onClick={!isProcessing ? triggerFileInput : undefined}
                onDrop={!isProcessing ? handleDrop : undefined}
                onDragOver={handleDragOver}
                style={{
                    width: '100%',
                    minHeight: '240px',
                    border: `2px dashed ${error ? '#ef4444' : state === 'success' ? '#22c55e' : '#d1d5db'}`,
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                    padding: '32px 24px',
                    cursor: isProcessing ? 'default' : 'pointer',
                    backgroundColor: isProcessing ? '#f8fafc' : '#ffffff',
                    transition: 'all 0.2s ease',
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
                            <LuCamera size={48} color="#6366f1" style={{ marginBottom: '12px' }} />
                            <p style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a2e', marginBottom: '4px' }}>
                                Upload menu photo
                            </p>
                            <p style={{ fontSize: '14px', color: '#94a3b8' }}>
                                Tap to take a photo or choose a file
                            </p>
                        </>
                    )}

                    {state === 'optimizing' && (
                        <>
                            <LuLoader size={40} color="#6366f1" style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                            <p style={{ fontSize: '15px', color: '#475569' }}>Preparing your image...</p>
                        </>
                    )}

                    {state === 'uploading' && (
                        <>
                            <LuUpload size={40} color="#6366f1" style={{ marginBottom: '12px' }} />
                            <p style={{ fontSize: '15px', color: '#475569' }}>Uploading...</p>
                        </>
                    )}

                    {state === 'success' && (
                        <>
                            <LuCheck size={40} color="#22c55e" style={{ marginBottom: '12px' }} />
                            <p style={{ fontSize: '15px', color: '#16a34a' }}>Redirecting to preview...</p>
                        </>
                    )}

                    {state === 'error' && (
                        <>
                            <LuAlertCircle size={40} color="#ef4444" style={{ marginBottom: '12px' }} />
                            <p style={{ fontSize: '15px', color: '#dc2626', marginBottom: '12px' }}>{error}</p>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setState('idle');
                                    setError(null);
                                    setPreview(null);
                                }}
                                style={{
                                    padding: '10px 24px',
                                    backgroundColor: '#6366f1',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Try Again
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
                    { icon: '✓', text: 'No account needed' },
                    { icon: '✓', text: 'Ready in 60 seconds' },
                    { icon: '✓', text: 'Works for any business' },
                ].map((item, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '14px',
                        color: '#475569',
                    }}>
                        <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '16px' }}>{item.icon}</span>
                        {item.text}
                    </div>
                ))}
            </div>

            {/* How it works */}
            <div style={{
                marginTop: '40px',
                width: '100%',
                padding: '24px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
            }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a2e', marginBottom: '16px' }}>
                    How it works
                </h2>
                {[
                    { step: '1', title: 'Take a photo', desc: 'Upload from your phone camera or choose a file' },
                    { step: '2', title: 'See your menu page', desc: 'Your menu appears as a clean, structured page' },
                    { step: '3', title: 'Publish and share', desc: 'Create a free account to get your QR code and shareable link' },
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
                            backgroundColor: '#6366f1',
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
                            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '2px' }}>
                                {item.title}
                            </p>
                            <p style={{ fontSize: '13px', color: '#64748b' }}>{item.desc}</p>
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
