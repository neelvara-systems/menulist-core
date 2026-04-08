'use client'

import GlobalLanguagesList from '@data/languages';
import { addProject, uploadFile } from '@database/projects';
import { checkExistingActiveJob } from '@lib/firebase/menuProcessing';
import { MENU_IMAGE_CONFIG, optimizeImage } from '@lib/image/optimizeImage';
import createProcessingJob from '@template/main-app/projects/getProcessedFile';
import type { ProjectFileType } from '@template/main-app/projects/types';
import { validateFile } from '@template/main-app/projects/validation';
import type { UploadProps } from 'antd';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuFileText, LuUpload } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, Image, NavBar, Popup, ProgressBar, Result, Text, Title, Toast, Upload } from '../antd';

interface MenuUploadSheetProps {
    currentProjectId?: string | null;
    currentProjectLanguages?: string[] | null;
    existingFiles?: ProjectFileType[];
    onClose: () => void;
    onJobCreated: (payload: { jobId: string; projectId: string }) => void;
}

type UploadStep = 'select' | 'review' | 'uploading' | 'error';

type SelectedUploadFile = {
    id: string;
    name: string;
    previewUrl?: string;
    size: number;
    sourceFile: File;
    type: string;
};

type PreparedFile = {
    name: string;
    size: number;
    type: string;
    uid: string;
    url: string;
};

export default function MenuUploadSheet({
    currentProjectId,
    currentProjectLanguages,
    existingFiles = [],
    onClose,
    onJobCreated,
}: MenuUploadSheetProps) {
    const { token } = theme.useToken();
    const t = useTranslations('MobileMenu');
    const [step, setStep] = useState<UploadStep>('select');
    const [selectedFiles, setSelectedFiles] = useState<SelectedUploadFile[]>([]);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        return () => {
            selectedFiles.forEach((file) => {
                if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
            });
        };
    }, [selectedFiles]);

    const totalSelectedBytes = useMemo(
        () => selectedFiles.reduce((sum, file) => sum + file.size, 0),
        [selectedFiles]
    );

    const hasSelectedFiles = selectedFiles.length > 0;
    const totalSelectedMb = (totalSelectedBytes / (1024 * 1024)).toFixed(1);
    const updateSelectedFiles = useCallback((updater: (current: SelectedUploadFile[]) => SelectedUploadFile[]) => {
        setSelectedFiles((current) => {
            const next = updater(current);

            current.forEach((file) => {
                if (file.previewUrl && !next.some((candidate) => candidate.id === file.id)) {
                    URL.revokeObjectURL(file.previewUrl);
                }
            });

            return next;
        });
    }, []);

    const handleSelectedFile = useCallback(async (file: File, fileList: File[]) => {
        const validationResult = await validateFile(file, fileList, existingFiles);
        if (validationResult) {
            return validationResult;
        }

        const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
        const nextFile: SelectedUploadFile = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            previewUrl,
            size: file.size,
            sourceFile: file,
            type: file.type,
        };

        updateSelectedFiles((current) => [...current, nextFile]);
        setStep('review');

        return false;
    }, [existingFiles, updateSelectedFiles]);

    const uploadProps: UploadProps = useMemo(() => ({
        accept: '.pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf',
        beforeUpload: async (file, fileList) => {
            const result = await handleSelectedFile(file as File, fileList as File[]);
            return result ?? false;
        },
        fileList: [],
        multiple: true,
        showUploadList: false,
    }), [handleSelectedFile]);

    const handleRemoveFile = useCallback((fileId: string) => {
        updateSelectedFiles((current) => {
            const next = current.filter((file) => file.id !== fileId);
            if (next.length === 0) {
                setStep('select');
            }
            return next;
        });
    }, [updateSelectedFiles]);

    const handleReset = useCallback(() => {
        setStep('select');
        setProgress(0);
        setStatusText('');
        setErrorMessage('');
        updateSelectedFiles(() => []);
    }, [updateSelectedFiles]);

    const prepareFilesForUpload = useCallback(async () => {
        const imageCandidates = selectedFiles.filter((file) => file.type !== 'application/pdf');
        const pdfCandidates = selectedFiles.filter((file) => file.type === 'application/pdf');
        const preparedFiles: PreparedFile[] = [];

        if (imageCandidates.length > 0) {
            for (let index = 0; index < imageCandidates.length; index += 1) {
                const candidate = imageCandidates[index];
                setStatusText(t('uploadPreparingImages', {
                    current: index + 1,
                    total: imageCandidates.length,
                }));
                const optimized = await optimizeImage(candidate.sourceFile, MENU_IMAGE_CONFIG);
                preparedFiles.push({
                    uid: `mobile-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
                    name: candidate.name.replace(/\.[^.]+$/, '') + '.jpg',
                    size: optimized.optimizedSize,
                    type: 'image/jpeg',
                    url: optimized.dataUrl,
                });
            }
        }

        if (pdfCandidates.length > 0) {
            setStatusText(t('uploadConvertingPdf'));
            const { convertPdfToImages } = await import('@template/main-app/projects/utils/pdfUtils');
            const pdfFilesForConversion = pdfCandidates.map((file) => ({
                uid: file.id,
                name: file.sourceFile.name,
                size: file.sourceFile.size,
                type: file.sourceFile.type,
                arrayBuffer: () => file.sourceFile.arrayBuffer(),
            }));
            const convertedPdfImages = await convertPdfToImages(pdfFilesForConversion, 'mobile', 'mobile') as any[];
            convertedPdfImages.forEach((file: any) => {
                preparedFiles.push({
                    uid: file.uid,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    url: file.url,
                });
            });
        }

        return preparedFiles;
    }, [selectedFiles, t]);

    const handleUploadAndProcess = useCallback(async () => {
        if (!selectedFiles.length) return;

        try {
            setStep('uploading');
            setProgress(5);

            let projectId = currentProjectId || null;
            if (!projectId) {
                setStatusText(t('menuUploadCreatingProject'));
                const newProject = await addProject({ name: t('myMenu') });
                if (!newProject?.projectId) {
                    throw new Error(t('menuUploadCreateProjectFailed'));
                }
                projectId = newProject.projectId;
            }

            const existingJobId = await checkExistingActiveJob(projectId);
            if (existingJobId) {
                Toast.show({ content: t('menuUploadProcessingInProgress'), duration: 1800 });
                onJobCreated({ jobId: existingJobId, projectId });
                return;
            }

            const preparedFiles = await prepareFilesForUpload();
            if (!preparedFiles.length) {
                throw new Error(t('menuUploadNoFilesPrepared'));
            }

            setProgress(35);
            setStatusText(t('uploadUploadingFiles'));

            let completedUploads = 0;
            const uploadedFiles = await Promise.all(preparedFiles.map(async (file) => {
                const uploadedUrl = await uploadFile({
                    uid: file.uid,
                    url: file.url,
                    type: file.type,
                    name: file.name,
                    size: file.size,
                });

                if (!uploadedUrl) {
                    throw new Error(t('menuUploadFailed'));
                }

                completedUploads += 1;
                setProgress(35 + Math.round((completedUploads / preparedFiles.length) * 45));

                return {
                    uid: file.uid,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    url: uploadedUrl,
                };
            }));

            setProgress(85);
            setStatusText(t('uploadCreatingJob'));

            const languageCodes = currentProjectLanguages?.length ? currentProjectLanguages : ['en'];
            const targetLanguages = GlobalLanguagesList.filter((language) => languageCodes.includes(language.code));
            const { jobId } = await createProcessingJob({
                files: uploadedFiles,
                targetLanguages: targetLanguages.length
                    ? targetLanguages
                    : [{ code: 'en', name: 'English' }],
                projectId,
            });

            setProgress(100);
            onJobCreated({ jobId, projectId });
        } catch (error: any) {
            console.error('[MobileMenuUpload] Failed:', error);
            setErrorMessage(error?.message || t('menuUploadRetry'));
            setStep('error');
        }
    }, [currentProjectId, currentProjectLanguages, onJobCreated, prepareFilesForUpload, selectedFiles, t]);

    return (
        <Popup
            bodyStyle={{ borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '82vh', overflow: 'hidden', padding: 0 }}
            destroyOnClose
            onMaskClick={step === 'select' || step === 'review' || step === 'error' ? onClose : undefined}
            position="bottom"
            visible
        >
            <Flex
                gap={16}
                style={{ maxHeight: 'calc(82vh - 16px)', overflowY: 'auto', paddingBottom: 8 }}
                vertical
            >
                {(step === 'select' || step === 'review') ? (
                    <NavBar onBack={onClose}>{t('uploadAndProcess')}</NavBar>
                ) : null}

                {step === 'select' ? (
                    <>
                        <Card
                            style={{
                                background: `linear-gradient(165deg, ${token.colorBgContainer} 0%, ${token.colorFillAlter} 55%, ${token.colorBgElevated} 100%)`,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: 24,
                                overflow: 'hidden',
                            }}
                        >
                            <Flex gap={18} vertical>
                                <Flex align="center" gap={14}>
                                    <Flex
                                        align="center"
                                        justify="center"
                                        style={{
                                            backgroundColor: token.colorPrimaryBg,
                                            border: `1px solid ${token.colorPrimaryBorder}`,
                                            borderRadius: 16,
                                            color: token.colorPrimary,
                                            height: 52,
                                            minWidth: 52,
                                            width: 52,
                                        }}
                                    >
                                        <LuFileText size={22} />
                                    </Flex>
                                    <Flex gap={4} style={{ flex: 1 }} vertical>
                                        <Text style={{ color: token.colorTextSecondary }}>
                                            {t('menuUploadSubtitleDetailed')}
                                        </Text>
                                    </Flex>
                                </Flex>

                                <Flex gap={8} wrap="wrap">
                                    <Text
                                        style={{
                                            backgroundColor: token.colorBgElevated,
                                            border: `1px solid ${token.colorBorderSecondary}`,
                                            borderRadius: 999,
                                            color: token.colorTextSecondary,
                                            padding: '6px 12px',
                                        }}
                                    >
                                        {t('menuUploadFormatsDetailed')}
                                    </Text>
                                </Flex>

                                <Flex align="center" justify="center" style={{ width: '100%' }}>
                                    <Upload {...uploadProps}>
                                        <Button
                                            block
                                            color="primary"
                                            size="large"
                                            style={{
                                                borderRadius: 16,
                                                display: 'flex',
                                                justifyContent: 'center',
                                                minHeight: 52,
                                                paddingInline: 16,
                                                width: '100%',
                                            }}
                                        >
                                            <Flex align="center" gap={8} justify="center" style={{ width: '100%' }}>
                                                <LuUpload size={18} />
                                                <Text style={{ color: 'inherit' }}>{t('chooseFiles')}</Text>
                                            </Flex>
                                        </Button>
                                    </Upload>
                                </Flex>
                            </Flex>
                        </Card>
                    </>
                ) : null}

                {step === 'review' ? (
                    <>
                        <Card
                            size="small"
                            style={{
                                background: 'linear-gradient(135deg, #f8fafc 0%, #f3f4f6 100%)',
                                borderRadius: 18,
                            }}
                        >
                            <Flex gap={8} vertical>
                                <Title level={4} style={{ margin: 0 }}>
                                    {t('menuUploadReadyTitle')}
                                </Title>
                                <Text type="secondary">
                                    {t('menuUploadReadyDesc', { count: selectedFiles.length })}
                                </Text>
                                <Text strong>
                                    {t('menuUploadSelectedSummary', {
                                        count: selectedFiles.length,
                                        size: `${totalSelectedMb}MB`,
                                    })}
                                </Text>
                            </Flex>
                        </Card>

                        <Flex gap={10} vertical>
                            {selectedFiles.map((file) => (
                                <Card key={file.id} size="small" style={{ borderRadius: 16 }}>
                                    <Flex align="center" gap={12}>
                                        {file.previewUrl ? (
                                            <Image
                                                preview={false}
                                                src={file.previewUrl}
                                                style={{ borderRadius: 12, height: 72, objectFit: 'cover', width: 72 }}
                                            />
                                        ) : (
                                            <Flex align="center" gap={12}>
                                                <Flex
                                                    align="center"
                                                    justify="center"
                                                    style={{
                                                        backgroundColor: '#f5f5f5',
                                                        borderRadius: 12,
                                                        height: 72,
                                                        width: 72,
                                                    }}
                                                >
                                                    <LuFileText size={28} />
                                                </Flex>
                                            </Flex>
                                        )}
                                        <Flex gap={2} style={{ flex: 1, minWidth: 0 }} vertical>
                                            <Text strong>{file.name}</Text>
                                            <Text type="secondary">
                                                {file.type === 'application/pdf' ? t('pdfDocument') : t('imageFile')}
                                            </Text>
                                            <Text type="secondary">
                                                {(file.size / (1024 * 1024)).toFixed(1)}MB
                                            </Text>
                                        </Flex>
                                        <Button fill="outline" onClick={() => handleRemoveFile(file.id)} size="small">
                                            {t('remove')}
                                        </Button>
                                    </Flex>
                                </Card>
                            ))}
                        </Flex>

                        <Button block color="primary" onClick={handleUploadAndProcess} size="large" style={{ borderRadius: 16, minHeight: 52 }}>
                            <Flex align="center" gap={6}>
                                <LuUpload size={16} />
                                <Text style={{ color: 'inherit' }}>{t('uploadAndProcess')}</Text>
                            </Flex>
                        </Button>

                        {hasSelectedFiles ? (
                            <Button block fill="none" onClick={handleReset} size="small">
                                <Flex align="center" gap={6}>
                                    <Text>{t('clearAll')}</Text>
                                </Flex>
                            </Button>
                        ) : null}
                    </>
                ) : null}

                {step === 'uploading' ? (
                    <Card style={{ borderRadius: 18 }}>
                        <Flex align="center" gap={16} vertical>
                            <DotLoading color="primary" />
                            <Title level={4} style={{ margin: 0 }}>
                                {t('workingOnUpload')}
                            </Title>
                            <Text style={{ textAlign: 'center' }} type="secondary">
                                {statusText || t('uploadingDesc')}
                            </Text>
                            <ProgressBar percent={progress} />
                        </Flex>
                    </Card>
                ) : null}

                {step === 'error' ? (
                    <Result
                        extra={[
                            <Button key="cancel" block fill="outline" onClick={onClose} size="large">
                                {t('cancel')}
                            </Button>,
                            <Button key="retry" block color="primary" onClick={handleReset} size="large">
                                {t('tryAgain')}
                            </Button>,
                        ]}
                        status="error"
                        subTitle={errorMessage}
                        title={t('menuUploadFailedTitle')}
                    />
                ) : null}
            </Flex>
        </Popup>
    );
}
