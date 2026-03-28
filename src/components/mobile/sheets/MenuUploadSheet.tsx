'use client'

import { AI_ACTIONS_TYPES } from '@constant/common';
import GlobalLanguagesList from '@data/languages';
import { addProject, getProjectsList, updateProject, uploadFile } from '@database/projects';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { checkExistingActiveJob, createMenuProcessingJob } from '@lib/firebase/menuProcessing';
import { MENU_IMAGE_CONFIG, optimizeImage } from '@lib/image/optimizeImage';
import { Button, DotLoading, Popup, ProgressBar, Toast } from 'antd-mobile';
import { useCallback, useRef, useState } from 'react';
import { LuCamera, LuImage, LuUpload, LuX } from 'react-icons/lu';

interface MenuUploadSheetProps {
    onClose: () => void;
    onComplete: () => void;
}

type UploadStep = 'select' | 'preview' | 'uploading' | 'processing' | 'done' | 'error';

/**
 * Mobile Menu Upload Sheet
 * 
 * Enables PWA-only users to upload menu photos from camera/gallery.
 * Uses the SAME DAL infrastructure as desktop:
 * - optimizeImage() for client-side optimization
 * - uploadFile() for Firebase Storage upload
 * - createMenuProcessingJob() for server-side AI extraction
 * 
 * Flow: Select image → Preview → Optimize → Upload → Process → Done
 */
export default function MenuUploadSheet({ onClose, onComplete }: MenuUploadSheetProps) {
    const labels = useOfferingLabels();
    const [step, setStep] = useState<UploadStep>('select');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
        if (!validTypes.includes(file.type)) {
            Toast.show({ content: 'Please select a photo (JPG, PNG, or WebP)', duration: 2000 });
            return;
        }

        // Validate file size (max 20MB before optimization)
        if (file.size > 20 * 1024 * 1024) {
            Toast.show({ content: 'Photo is too large. Max 20MB.', duration: 2000 });
            return;
        }

        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setStep('preview');
    }, []);

    const handleUploadAndProcess = useCallback(async () => {
        if (!selectedFile) return;

        try {
            setStep('uploading');
            setProgress(10);

            // Step 1: Optimize image
            const optimized = await optimizeImage(selectedFile, MENU_IMAGE_CONFIG);
            setProgress(30);

            // Step 2: Get or create project
            const projectsResult = await getProjectsList();
            const projects = projectsResult?.projects || [];
            let projectId: string;

            if (projects.length === 0) {
                // First-time user: auto-create a default project
                const newProject = await addProject({ name: 'My Menu' });
                if (!newProject?.projectId) throw new Error('Failed to create project');
                projectId = newProject.projectId;
            } else {
                // Use existing default project
                const defaultProject = projects.find((p: any) => p.isDefault) || projects[0];
                projectId = defaultProject.projectId;
            }
            setProgress(50);

            // Step 3: Upload to Firebase Storage
            const uid = `mobile-${Date.now()}`;
            const uploadedUrl = await uploadFile({
                url: optimized.dataUrl,
                type: 'image/jpeg',
                uid,
                name: selectedFile.name || 'menu-photo.jpg',
                size: optimized.optimizedSize,
            });

            if (!uploadedUrl) throw new Error('Upload failed');
            setProgress(70);

            // Step 4: Save file reference to project
            await updateProject({
                projectId,
                files: [{
                    uid,
                    name: selectedFile.name || 'menu-photo.jpg',
                    type: 'image/jpeg',
                    url: uploadedUrl,
                    size: optimized.optimizedSize,
                }],
            });

            // Step 5: Create processing job
            setStep('processing');
            setProgress(80);

            // Check for existing active job
            const existingJob = await checkExistingActiveJob(projectId);
            if (!existingJob) {
                const defaultLang = GlobalLanguagesList.find(l => l.code === 'en') || { code: 'en', name: 'English' };
                await createMenuProcessingJob({
                    projectId,
                    files: [{
                        uid,
                        name: selectedFile.name || 'menu-photo.jpg',
                        type: 'image/jpeg',
                        url: uploadedUrl,
                        size: optimized.optimizedSize,
                    }],
                    targetLanguages: [{ code: defaultLang.code, name: defaultLang.name }],
                    action: AI_ACTIONS_TYPES.IMAGE_PROCESSING,
                });
            }

            setProgress(100);
            setStep('done');

            // Brief delay then complete
            setTimeout(() => {
                onComplete();
            }, 1500);

        } catch (error: any) {
            console.error('[MobileUpload] Failed:', error);
            setErrorMessage(error?.message || 'Upload failed. Please try again.');
            setStep('error');
        }
    }, [selectedFile, onComplete]);

    const handleRetry = () => {
        setStep('select');
        setPreviewUrl(null);
        setSelectedFile(null);
        setProgress(0);
        setErrorMessage('');
    };

    return (
        <Popup
            visible
            onMaskClick={step === 'select' || step === 'preview' || step === 'error' ? onClose : undefined}
            position="bottom"
            bodyStyle={{
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
                maxHeight: '90vh',
            }}
            destroyOnClose
        >
            <div className="px-4 pt-4 pb-6">
                {/* Drag Handle */}
                <div className="flex justify-center mb-4">
                    <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                </div>

                {/* Step: Select Photo */}
                {step === 'select' && (
                    <div className="space-y-4">
                        <div className="text-center">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {labels.uploadLabel}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Take a photo or select from gallery
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                block
                                color="primary"
                                fill="solid"
                                size="large"
                                onClick={() => cameraInputRef.current?.click()}
                                style={{ minHeight: '56px' }}
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <LuCamera size={22} />
                                    <span className="text-sm">Take Photo</span>
                                </div>
                            </Button>

                            <Button
                                block
                                fill="outline"
                                size="large"
                                onClick={() => fileInputRef.current?.click()}
                                style={{ minHeight: '56px' }}
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <LuImage size={22} />
                                    <span className="text-sm">Gallery</span>
                                </div>
                            </Button>
                        </div>

                        {/* Hidden file inputs */}
                        <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        <p className="text-xs text-gray-400 text-center">
                            Supports JPG, PNG, WebP. Max 20MB.
                        </p>
                    </div>
                )}

                {/* Step: Preview */}
                {step === 'preview' && previewUrl && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Preview
                            </h2>
                            <button onClick={handleRetry} className="p-2 rounded-lg active:bg-gray-100">
                                <LuX size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                            <img
                                src={previewUrl}
                                alt="Menu preview"
                                className="w-full max-h-[50vh] object-contain bg-gray-50 dark:bg-gray-900"
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button
                                block
                                fill="outline"
                                size="large"
                                onClick={handleRetry}
                                style={{ minHeight: '44px' }}
                            >
                                Retake
                            </Button>
                            <Button
                                block
                                color="primary"
                                fill="solid"
                                size="large"
                                onClick={handleUploadAndProcess}
                                style={{ minHeight: '44px' }}
                            >
                                <LuUpload size={16} className="inline mr-1" />
                                Upload & Process
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step: Uploading / Processing */}
                {(step === 'uploading' || step === 'processing') && (
                    <div className="space-y-4 text-center py-6">
                        <DotLoading color="primary" />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {step === 'uploading' ? 'Uploading...' : `Processing your ${labels.offeringLower}...`}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {step === 'uploading'
                                ? 'Optimizing and uploading your photo'
                                : `AI is extracting ${labels.itemsPlural}. This may take a minute.`}
                        </p>
                        <ProgressBar percent={progress} style={{ '--fill-color': 'var(--ant-color-primary, #1677ff)' } as React.CSSProperties} />
                    </div>
                )}

                {/* Step: Done */}
                {step === 'done' && (
                    <div className="space-y-4 text-center py-6">
                        <div className="text-4xl">✅</div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Uploaded!
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Your {labels.offeringLower} is being processed. {labels.itemsPlural.charAt(0).toUpperCase() + labels.itemsPlural.slice(1)} will appear shortly.
                        </p>
                    </div>
                )}

                {/* Step: Error */}
                {step === 'error' && (
                    <div className="space-y-4 text-center py-6">
                        <div className="text-4xl">❌</div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Upload Failed
                        </h2>
                        <p className="text-sm text-red-500">
                            {errorMessage}
                        </p>
                        <div className="flex gap-3">
                            <Button block fill="outline" size="large" onClick={onClose} style={{ minHeight: '44px' }}>
                                Cancel
                            </Button>
                            <Button block color="primary" fill="solid" size="large" onClick={handleRetry} style={{ minHeight: '44px' }}>
                                Try Again
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Popup>
    );
}
