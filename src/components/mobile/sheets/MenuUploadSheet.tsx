'use client'

import { AI_ACTIONS_TYPES } from '@constant/common';
import GlobalLanguagesList from '@data/languages';
import { addProject, getProjectsList, updateProject, uploadFile } from '@database/projects';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { checkExistingActiveJob, createMenuProcessingJob } from '@lib/firebase/menuProcessing';
import { MENU_IMAGE_CONFIG, optimizeImage } from '@lib/image/optimizeImage';
import type { UploadFile, UploadProps } from 'antd';
import { useCallback, useMemo, useState } from 'react';
import { LuCamera, LuImage, LuUpload } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, Image, Popup, ProgressBar, Result, Text, Title, Toast, Upload } from '../antd';

interface MenuUploadSheetProps {
    onClose: () => void;
    onComplete: () => void;
}

type UploadStep = 'select' | 'preview' | 'uploading' | 'processing' | 'done' | 'error';

export default function MenuUploadSheet({ onClose, onComplete }: MenuUploadSheetProps) {
    const labels = useOfferingLabels();
    const [step, setStep] = useState<UploadStep>('select');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');

    const handleSelectedFile = useCallback((file: File) => {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
        if (!validTypes.includes(file.type)) {
            Toast.show({ content: 'Please select a photo in JPG, PNG, or WebP format', duration: 2000 });
            return false;
        }

        if (file.size > 20 * 1024 * 1024) {
            Toast.show({ content: 'Photo is too large. Max 20MB.', duration: 2000 });
            return false;
        }

        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setStep('preview');
        return false;
    }, [previewUrl]);

    const uploadProps: UploadProps = useMemo(() => ({
        accept: 'image/jpeg,image/png,image/webp,image/heic,image/heif,image/*',
        beforeUpload: (file) => handleSelectedFile(file as File),
        fileList: selectedFile
            ? [{ uid: 'menu-upload', name: selectedFile.name, status: 'done' } as UploadFile]
            : [],
        maxCount: 1,
        showUploadList: false,
    }), [handleSelectedFile, selectedFile]);

    const handleUploadAndProcess = useCallback(async () => {
        if (!selectedFile) return;

        try {
            setStep('uploading');
            setProgress(10);

            const optimized = await optimizeImage(selectedFile, MENU_IMAGE_CONFIG);
            setProgress(30);

            const projectsResult = await getProjectsList();
            const projects = projectsResult?.projects || [];
            let projectId: string;

            if (projects.length === 0) {
                const newProject = await addProject({ name: 'My Menu' });
                if (!newProject?.projectId) throw new Error('Failed to create project');
                projectId = newProject.projectId;
            } else {
                const defaultProject = projects.find((project: any) => project.isDefault) || projects[0];
                projectId = defaultProject.projectId;
            }
            setProgress(50);

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

            setStep('processing');
            setProgress(80);

            const existingJob = await checkExistingActiveJob(projectId);
            if (!existingJob) {
                const defaultLang = GlobalLanguagesList.find((language) => language.code === 'en') || { code: 'en', name: 'English' };
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
            setTimeout(() => {
                onComplete();
            }, 1500);
        } catch (error: any) {
            console.error('[MobileUpload] Failed:', error);
            setErrorMessage(error?.message || 'Upload failed. Please try again.');
            setStep('error');
        }
    }, [onComplete, selectedFile]);

    const handleRetry = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setStep('select');
        setPreviewUrl(null);
        setSelectedFile(null);
        setProgress(0);
        setErrorMessage('');
    };

    return (
        <Popup
            bodyStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '90vh' }}
            destroyOnClose
            onMaskClick={step === 'select' || step === 'preview' || step === 'error' ? onClose : undefined}
            position="bottom"
            visible
        >
            <Flex gap={16} vertical>
                {step === 'select' ? (
                    <Flex gap={16} vertical>
                        <Flex gap={4} vertical>
                            <Title level={4} style={{ margin: 0 }}>
                                {labels.uploadLabel}
                            </Title>
                            <Text type="secondary">Upload a menu photo from your phone. The device picker can use camera or gallery.</Text>
                        </Flex>

                        <Flex gap={12}>
                            <Upload {...uploadProps}>
                                <Button block color="primary" size="large">
                                    <Flex align="center" gap={8}>
                                        <LuCamera size={18} />
                                        <Text>Take Photo</Text>
                                    </Flex>
                                </Button>
                            </Upload>
                            <Upload {...uploadProps}>
                                <Button block fill="outline" size="large">
                                    <Flex align="center" gap={8}>
                                        <LuImage size={18} />
                                        <Text>Choose Photo</Text>
                                    </Flex>
                                </Button>
                            </Upload>
                        </Flex>

                        <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                            <Text type="secondary">Supports JPG, PNG, WebP, HEIC, and HEIF. Max 20MB.</Text>
                        </Card>
                    </Flex>
                ) : null}

                {step === 'preview' && previewUrl ? (
                    <Flex gap={16} vertical>
                        <Flex gap={4} vertical>
                            <Title level={4} style={{ margin: 0 }}>
                                Preview
                            </Title>
                            <Text type="secondary">Check the image before we upload and process it.</Text>
                        </Flex>

                        <Card size="small">
                            <Image
                                preview={false}
                                src={previewUrl}
                                style={{ maxHeight: '50vh', objectFit: 'contain', width: '100%' }}
                            />
                        </Card>

                        <Flex gap={12}>
                            <Button block fill="outline" onClick={handleRetry} size="large">
                                Retake
                            </Button>
                            <Button block color="primary" onClick={handleUploadAndProcess} size="large">
                                <Flex align="center" gap={6}>
                                    <LuUpload size={16} />
                                    <Text>Upload and Process</Text>
                                </Flex>
                            </Button>
                        </Flex>
                    </Flex>
                ) : null}

                {step === 'uploading' || step === 'processing' ? (
                    <Card>
                        <Flex align="center" gap={16} vertical>
                            <DotLoading color="primary" />
                            <Title level={4} style={{ margin: 0 }}>
                                {step === 'uploading' ? 'Uploading...' : `Processing your ${labels.offeringLower}...`}
                            </Title>
                            <Text type="secondary" style={{ textAlign: 'center' }}>
                                {step === 'uploading'
                                    ? 'Optimizing and uploading your photo.'
                                    : `AI is extracting ${labels.itemsPlural}. This may take a minute.`}
                            </Text>
                            <ProgressBar percent={progress} />
                        </Flex>
                    </Card>
                ) : null}

                {step === 'done' ? (
                    <Result
                        status="success"
                        subTitle={`Your ${labels.offeringLower} is being processed. ${labels.itemsPlural.charAt(0).toUpperCase() + labels.itemsPlural.slice(1)} will appear shortly.`}
                        title="Uploaded"
                    />
                ) : null}

                {step === 'error' ? (
                    <Result
                        extra={[
                            <Button key="cancel" block fill="outline" onClick={onClose} size="large">
                                Cancel
                            </Button>,
                            <Button key="retry" block color="primary" onClick={handleRetry} size="large">
                                Try Again
                            </Button>,
                        ]}
                        status="error"
                        subTitle={errorMessage}
                        title="Upload Failed"
                    />
                ) : null}
            </Flex>
        </Popup>
    );
}
