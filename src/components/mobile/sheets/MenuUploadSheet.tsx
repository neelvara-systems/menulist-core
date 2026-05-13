'use client'

import GlobalLanguagesList from '@data/languages';
import { addProject, uploadFile } from '@database/projects';
import { deleteFileByUrl } from '@database/storage/deleteFromStorage';
import { updateStore } from '@database/stores';
import { checkExistingActiveJob } from '@lib/firebase/menuProcessing';
import { MENU_IMAGE_CONFIG, optimizeImage } from '@lib/image/optimizeImage';
import { runMenuIntakeIdentityPreflight } from '@lib/menu-intake-identity/client';
import { buildBusinessIdentitySuggestions, buildBusinessIdentityUpdatePayload, type BusinessIdentitySuggestion, type BusinessIdentitySuggestionField } from '@lib/menu-intake-identity/suggestionAcceptance';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import createProcessingJob from '@template/main-app/projects/getProcessedFile';
import type { ProjectFileType } from '@template/main-app/projects/types';
import { generateMenuFileUid } from '@template/main-app/projects/utils';
import { validateFile } from '@template/main-app/projects/validation';
import { DEFAULT_OUTLET_POLICY, type OutletPolicy } from '@type/multiOutlet.types';
import type { UploadProps } from 'antd';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LuFileText, LuTrash2, LuUpload } from 'react-icons/lu';
import { Button, Card, Checkbox, Dialog, DotLoading, Flex, Image, NavBar, Popup, ProgressBar, Result, Tag, Text, Title, Toast, Upload } from '../antd';
import { MENU_SHEET_CONTAINER_STYLE, MENU_SHEET_BODY_STYLE } from './menuSheetLayout';

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
    preparedUrl?: string;
    size: number;
    sourceFile?: File;
    type: string;
};

type PreparedFile = {
    name: string;
    size: number;
    type: string;
    uid: string;
    url: string;
};

type MenuIntakeDecisionResult =
    | { action: 'continue'; files: PreparedFile[]; ignoredFiles: PreparedFile[] }
    | { action: 'cancel' }
    | { action: 'create_new_project'; projectId: string; files: PreparedFile[]; ignoredFiles: PreparedFile[] };

type ProjectCreationPayload = Parameters<typeof addProject>[0] & {
    defaultLanguage?: string;
    languages?: string[];
};

function BusinessIdentitySuggestionList({
    onSelectionChange,
    suggestions,
}: {
    onSelectionChange: (fields: BusinessIdentitySuggestionField[]) => void;
    suggestions: BusinessIdentitySuggestion[];
}) {
    const [selectedFields, setSelectedFields] = useState<BusinessIdentitySuggestionField[]>(
        suggestions.map((suggestion) => suggestion.field),
    );

    useEffect(() => {
        onSelectionChange(selectedFields);
    }, [onSelectionChange, selectedFields]);

    return (
        <Flex gap={10} vertical>
            <Text>We found business details in the upload. Save only the details you want to use.</Text>
            {suggestions.map((suggestion) => (
                <Checkbox
                    checked={selectedFields.includes(suggestion.field)}
                    key={suggestion.field}
                    onChange={(checked) => {
                        setSelectedFields((current) => checked
                            ? [...current, suggestion.field]
                            : current.filter((field) => field !== suggestion.field));
                    }}
                >
                    <Flex gap={2} vertical>
                        <Text strong>{suggestion.label}: {suggestion.value}</Text>
                        {suggestion.currentValue ? (
                            <Text type="secondary">Current: {suggestion.currentValue}</Text>
                        ) : null}
                    </Flex>
                </Checkbox>
            ))}
        </Flex>
    );
}

export default function MenuUploadSheet({
    currentProjectId,
    currentProjectLanguages,
    existingFiles = [],
    onClose,
    onJobCreated,
}: MenuUploadSheetProps) {
    const { token } = theme.useToken();
    const t = useTranslations('MobileMenu');
    const { storeDetails, setStoreDetails, userPermissions, isMasterUser } = useContext(PlatformGlobalDataContext);
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
    const outletPolicy = useMemo<OutletPolicy | null>(() => {
        if (isMasterUser || storeDetails?.isMaster !== false) return null;
        return {
            ...DEFAULT_OUTLET_POLICY,
            ...((userPermissions as any)?.outletPolicy || {}),
        };
    }, [isMasterUser, storeDetails?.isMaster, userPermissions]);
    const canCreateLocalProjects = !outletPolicy || outletPolicy.allowLocalProjects !== false;
    const canUploadToCurrentContext = Boolean(currentProjectId) || canCreateLocalProjects;

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
        if (!canUploadToCurrentContext) {
            Toast.show({ content: 'New local menus are not enabled for this location.', duration: 1800 });
            return false;
        }

        const validationResult = await validateFile(file, fileList, existingFiles);
        if (validationResult) {
            return validationResult;
        }

        if (file.type === 'application/pdf') {
            try {
                setProgress(0);
                setStatusText(t('uploadConvertingPdf'));
                setStep('uploading');

                const { convertPdfToImages } = await import('@template/main-app/projects/utils/pdfUtils');
                const convertedPdfImages = await convertPdfToImages([
                    {
                        uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        arrayBuffer: () => file.arrayBuffer(),
                    },
                ], 'mobile', 'mobile') as any[];

                if (!convertedPdfImages.length) {
                    throw new Error(t('menuUploadNoFilesPrepared'));
                }

                updateSelectedFiles((current) => [
                    ...current,
                    ...convertedPdfImages.map((page: any) => ({
                        id: page.uid,
                        name: page.name,
                        previewUrl: page.url,
                        preparedUrl: page.url,
                        size: page.size,
                        type: page.type,
                    })),
                ]);
                setStatusText('');
                setStep('review');
                return false;
            } catch (error: any) {
                console.error('[MobileMenuUpload] PDF conversion failed:', error);
                setErrorMessage(error?.message || t('menuUploadRetry'));
                setStep('error');
                return false;
            }
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
    }, [canUploadToCurrentContext, existingFiles, t, updateSelectedFiles]);

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
        if (storeDetails?.tenantId === undefined || storeDetails?.storeId === undefined) {
            throw new Error('Store context is required to prepare menu files.');
        }

        const preparedFiles: PreparedFile[] = [];

        if (selectedFiles.length > 0) {
            for (let index = 0; index < selectedFiles.length; index += 1) {
                const candidate = selectedFiles[index];
                setStatusText(t('uploadPreparingImages', {
                    current: index + 1,
                    total: selectedFiles.length,
                }));

                if (candidate.preparedUrl) {
                    preparedFiles.push({
                        uid: generateMenuFileUid(storeDetails.tenantId, storeDetails.storeId),
                        name: candidate.name,
                        size: candidate.size,
                        type: candidate.type,
                        url: candidate.preparedUrl,
                    });
                    continue;
                }

                if (!candidate.sourceFile) continue;

                const optimized = await optimizeImage(candidate.sourceFile, MENU_IMAGE_CONFIG);
                preparedFiles.push({
                    uid: generateMenuFileUid(storeDetails.tenantId, storeDetails.storeId),
                    name: candidate.name.replace(/\.[^.]+$/, '') + '.jpg',
                    size: optimized.optimizedSize,
                    type: 'image/jpeg',
                    url: optimized.dataUrl,
                });
            }
        }

        return preparedFiles;
    }, [selectedFiles, storeDetails?.storeId, storeDetails?.tenantId, t]);

    const maybeAcceptBusinessIdentitySuggestions = useCallback(async (
        result: Awaited<ReturnType<typeof runMenuIntakeIdentityPreflight>> | null,
    ) => {
        const suggestions = buildBusinessIdentitySuggestions(result, storeDetails);
        if (!suggestions.length || !storeDetails?.storeId) return;

        let selectedFields = suggestions.map((suggestion) => suggestion.field);
        await Dialog.confirm({
            title: 'Save detected business details?',
            content: (
                <BusinessIdentitySuggestionList
                    suggestions={suggestions}
                    onSelectionChange={(fields) => {
                        selectedFields = fields;
                    }}
                />
            ),
            confirmText: 'Save selected',
            cancelText: 'Skip',
            onConfirm: async () => {
                if (!selectedFields.length) return;
                const updates = buildBusinessIdentityUpdatePayload(suggestions, selectedFields);
                if (!Object.keys(updates).length) return;

                try {
                    await updateStore({
                        storeId: storeDetails.storeId,
                        tenantId: storeDetails.tenantId,
                        ...updates,
                    });
                    setStoreDetails((previous: any) => ({ ...previous, ...updates }));
                    Toast.show({ content: 'Business details updated', duration: 1400 });
                } catch (error: any) {
                    Toast.show({ content: error?.message || 'Could not update business details.', duration: 2200 });
                }
            },
        });
    }, [setStoreDetails, storeDetails]);

    const confirmMenuIntakeDecision = useCallback(async (
        projectId: string,
        files: PreparedFile[],
    ): Promise<MenuIntakeDecisionResult> => {
        try {
            const result = await runMenuIntakeIdentityPreflight({ projectId, files });
            const decision = result?.decision;
            const validIndexes = new Set(result?.validation?.validMenuFileIndexes || files.map((_, index) => index + 1));
            const filesForExtraction = files.filter((_, index) => validIndexes.has(index + 1));
            const ignoredFiles = files.filter((_, index) => !validIndexes.has(index + 1));

            if (filesForExtraction.length === 0) {
                Toast.show({ content: 'We could not find a clear menu or price list in this upload.', duration: 2400 });
                return { action: 'cancel' };
            }

            if (!decision || decision.severity === 'none') {
                await maybeAcceptBusinessIdentitySuggestions(result);
                return { action: 'continue', files: filesForExtraction, ignoredFiles };
            }

            if (decision.severity === 'block') {
                Toast.show({ content: decision.message, duration: 2400 });
                return { action: 'cancel' };
            }

            const canCreateNewProject = decision.secondaryAction === 'create_new_project';
            const confirmed = await Dialog.confirm({
                title: decision.title,
                content: (
                    <Flex gap={8} vertical>
                        <Text>{decision.message}</Text>
                        {result?.identity?.businessName ? (
                            <Text style={{ color: token.colorTextSecondary }}>
                                Uploaded menu: {result.identity.businessName}
                            </Text>
                        ) : null}
                    </Flex>
                ),
                confirmText: decision.severity === 'confirm' ? 'Add here anyway' : 'Continue',
                cancelText: canCreateNewProject
                    ? 'Create new menu'
                    : decision.primaryAction === 'upload_more'
                        ? 'Upload more files'
                        : 'Cancel',
            });
            if (confirmed) {
                await maybeAcceptBusinessIdentitySuggestions(result);
                return { action: 'continue', files: filesForExtraction, ignoredFiles };
            }
            if (!canCreateNewProject) return { action: 'cancel' };

            try {
                if (!canCreateLocalProjects) {
                    Toast.show({ content: 'New local menus are not enabled for this location.', duration: 1800 });
                    return { action: 'cancel' };
                }

                const languageCodes = currentProjectLanguages?.length ? currentProjectLanguages : ['en'];
                const projectPayload: ProjectCreationPayload = {
                    name: result?.identity?.businessName || t('myMenu'),
                    businessCategory: storeDetails?.businessCategory,
                    businessType: storeDetails?.businessType,
                    languages: languageCodes,
                    defaultLanguage: languageCodes[0] || 'en',
                };
                const newProject = await addProject(projectPayload);
                if (!newProject?.projectId) {
                    throw new Error(t('menuUploadCreateProjectFailed'));
                }

                Toast.show({ content: 'Created a new menu for this upload', duration: 1600 });
                return {
                    action: 'create_new_project',
                    projectId: newProject.projectId,
                    files: filesForExtraction,
                    ignoredFiles,
                };
            } catch (createError: any) {
                Toast.show({
                    content: createError?.message || t('menuUploadCreateProjectFailed'),
                    duration: 2400,
                });
                return { action: 'cancel' };
            }
        } catch (error: any) {
            console.warn('[MobileMenuUpload] Intake preflight skipped:', error?.message || error);
            return { action: 'continue', files, ignoredFiles: [] };
        }
    }, [
        canCreateLocalProjects,
        currentProjectLanguages,
        maybeAcceptBusinessIdentitySuggestions,
        storeDetails?.businessCategory,
        storeDetails?.businessType,
        t,
        token.colorTextSecondary,
    ]);

    const handleUploadAndProcess = useCallback(async () => {
        if (!selectedFiles.length) return;

        try {
            setStep('uploading');
            setProgress(5);

            let projectId = currentProjectId || null;
            if (!projectId) {
                if (!canCreateLocalProjects) {
                    throw new Error('New local menus are not enabled for this location.');
                }

                setStatusText(t('menuUploadCreatingProject'));
                const newProject = await addProject({
                    businessCategory: storeDetails?.businessCategory,
                    businessType: storeDetails?.businessType,
                    name: t('myMenu'),
                });
                if (!newProject?.projectId) {
                    throw new Error(t('menuUploadCreateProjectFailed'));
                }
                projectId = newProject.projectId;
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

            const intakeDecision = await confirmMenuIntakeDecision(projectId, uploadedFiles);
            if (intakeDecision.action === 'cancel') {
                await Promise.allSettled(uploadedFiles.map(file => deleteFileByUrl(file.url)));
                setStep('review');
                setProgress(0);
                setStatusText('');
                return;
            }
            await Promise.allSettled(intakeDecision.ignoredFiles.map(file => deleteFileByUrl(file.url)));
            const filesForJob = intakeDecision.files;
            if (filesForJob.length === 0) {
                await Promise.allSettled(uploadedFiles.map(file => deleteFileByUrl(file.url)));
                setStep('review');
                setProgress(0);
                setStatusText('');
                return;
            }
            const targetProjectId = intakeDecision.action === 'create_new_project'
                ? intakeDecision.projectId
                : projectId;
            projectId = targetProjectId;

            const existingJobId = await checkExistingActiveJob(targetProjectId);
            if (existingJobId) {
                await Promise.allSettled(filesForJob.map(file => deleteFileByUrl(file.url)));
                Toast.show({ content: t('menuUploadProcessingInProgress'), duration: 1800 });
                onJobCreated({ jobId: existingJobId, projectId: targetProjectId });
                return;
            }

            setProgress(85);
            setStatusText(t('uploadCreatingJob'));

            const languageCodes = currentProjectLanguages?.length ? currentProjectLanguages : ['en'];
            const targetLanguages = GlobalLanguagesList.filter((language) => languageCodes.includes(language.code));
            const { jobId } = await createProcessingJob({
                files: filesForJob,
                targetLanguages: targetLanguages.length
                    ? targetLanguages
                    : [{ code: 'en', name: 'English' }],
                projectId: targetProjectId,
                businessCategory: storeDetails?.businessCategory,
                businessType: storeDetails?.businessType,
            });

            setProgress(100);
            onJobCreated({ jobId, projectId: targetProjectId });
        } catch (error: any) {
            console.error('[MobileMenuUpload] Failed:', error);
            setErrorMessage(error?.message || t('menuUploadRetry'));
            setStep('error');
        }
    }, [
        canCreateLocalProjects,
        confirmMenuIntakeDecision,
        currentProjectId,
        currentProjectLanguages,
        onJobCreated,
        prepareFilesForUpload,
        selectedFiles,
        storeDetails?.businessCategory,
        storeDetails?.businessType,
        t,
    ]);

    return (
        <Popup
            bodyStyle={MENU_SHEET_BODY_STYLE}
            destroyOnClose
            onMaskClick={step === 'select' || step === 'review' || step === 'error' ? onClose : undefined}
            position="bottom"
            visible
        >
            <Flex
                gap={16}
                style={MENU_SHEET_CONTAINER_STYLE}
                vertical
            >
                {(step === 'select' || step === 'review') ? (
                    <NavBar onBack={onClose}>{t('uploadAndProcess')}</NavBar>
                ) : null}

                <Flex gap={16} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 12px 12px' }} vertical>
                    {step === 'select' ? (
                        <Card
                            style={{
                                background: `linear-gradient(165deg, ${token.colorBgContainer} 0%, ${token.colorFillAlter} 55%, ${token.colorBgElevated} 100%)`,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: 22,
                                overflow: 'hidden',
                            }}
                        >
                            <Flex gap={16} vertical>
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
                                            lineHeight: 1.4,
                                            padding: '8px 12px',
                                        }}
                                    >
                                        {t('menuUploadFormatsDetailed')}
                                    </Text>
                                </Flex>

                                <Flex style={{ width: '100%' }} align='center' justify='center'>
                                    <Upload {...uploadProps}>
                                        <Button
                                            block
                                            color="primary"
                                            disabled={!canUploadToCurrentContext}
                                            icon={<LuUpload size={18} />}
                                            size="large"
                                            style={{
                                                borderRadius: 16,
                                                minHeight: 52,
                                                paddingInline: 16,
                                                width: '100%',
                                            }}
                                        >
                                            {t('chooseFiles')}
                                        </Button>
                                    </Upload>
                                </Flex>
                            </Flex>
                        </Card>
                    ) : null}

                    {step === 'review' ? (
                        <>
                        <Card
                            size="small"
                            style={{
                                background: `linear-gradient(165deg, ${token.colorBgContainer} 0%, ${token.colorFillAlter} 55%, ${token.colorBgElevated} 100%)`,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: 18,
                            }}
                        >
                            <Flex gap={8} vertical>
                                <Title level={4} style={{ color: token.colorTextHeading, margin: 0 }}>
                                    {t('menuUploadReadyTitle')}
                                </Title>
                                <Text style={{ color: token.colorTextSecondary }}>
                                    {t('menuUploadReadyDesc', { count: selectedFiles.length })}
                                </Text>
                                <Text strong style={{ color: token.colorText }}>
                                    {t('menuUploadSelectedSummary', {
                                        count: selectedFiles.length,
                                        size: `${totalSelectedMb}MB`,
                                        })}
                                    </Text>
                                </Flex>
                            </Card>

                            <Flex gap={10} vertical>
                                {selectedFiles.map((file) => (
                                    <Card key={file.id} size="small" style={{ borderRadius: 16, position: 'relative' }}>
                                        <Button
                                            color="danger"
                                            fill="none"
                                            icon={<LuTrash2 size={16} />}
                                            onClick={() => handleRemoveFile(file.id)}
                                            size="small"
                                            style={{
                                                minHeight: 28,
                                                minWidth: 28,
                                                paddingInline: 0,
                                                position: 'absolute',
                                                right: 10,
                                                bottom: 10,
                                                zIndex: 1,
                                            }}
                                        />

                                        <Flex align="center" gap={12}>
                                            {file.previewUrl ? (
                                                <Image
                                                    preview
                                                    src={file.previewUrl}
                                                    style={{ borderRadius: 12, height: 72, objectFit: 'cover', width: 72 }}
                                                />
                                            ) : (
                                                <Flex align="center" gap={12}>
                                                    <Flex
                                                        align="center"
                                                        justify="center"
                                                        style={{
                                                            backgroundColor: token.colorBgElevated,
                                                            border: `1px solid ${token.colorBorderSecondary}`,
                                                            borderRadius: 12,
                                                            height: 72,
                                                            width: 72,
                                                        }}
                                                    >
                                                        <LuFileText size={28} />
                                                    </Flex>
                                                </Flex>
                                            )}
                                            <Flex gap={8} style={{ flex: 1, minWidth: 0, paddingRight: 32 }} vertical>
                                                <Flex gap={8} wrap="wrap">
                                                    <Tag>{file.type === 'application/pdf' ? t('pdfDocument') : t('imageFile')}</Tag>
                                                    <Tag>{(file.size / (1024 * 1024)).toFixed(1)}MB</Tag>
                                                </Flex>
                                                <Text
                                                    strong
                                                    style={{
                                                        color: token.colorText,
                                                        lineHeight: 1.35,
                                                        wordBreak: 'break-word',
                                                    }}
                                                >
                                                    {file.name}
                                                </Text>
                                            </Flex>
                                        </Flex>
                                    </Card>
                                ))}
                            </Flex>

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
                                <Button block fill="outline" onClick={onClose} size="large">
                                    {t('cancel')}
                                </Button>
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

                {step === 'review' ? (
                    <div
                        style={{
                            backdropFilter: 'blur(10px)',
                            backgroundColor: token.colorBgContainer,
                            borderTop: `1px solid ${token.colorBorderSecondary}`,
                            flexShrink: 0,
                            padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
                            zIndex: 5,
                        }}
                    >
                        <Flex gap={10} vertical>
                            <Flex gap={10}>
                                <Upload {...uploadProps}>
                                    <Button
                                        block
                                        disabled={!canUploadToCurrentContext}
                                        fill="outline"
                                        icon={<LuUpload size={16} />}
                                        size="large"
                                        style={{ borderRadius: 16, minHeight: 52, width: '100%' }}
                                    >
                                        {t('addMoreFiles')}
                                    </Button>
                                </Upload>

                                <Button
                                    block
                                    color="primary"
                                    disabled={!canUploadToCurrentContext}
                                    icon={<LuUpload size={16} />}
                                    onClick={handleUploadAndProcess}
                                    size="large"
                                    style={{ borderRadius: 16, minHeight: 52 }}
                                >
                                    {t('uploadAndProcess')}
                                </Button>
                            </Flex>

                            {hasSelectedFiles ? (
                                <Button block fill="none" onClick={handleReset} size="small">
                                    {t('clearAll')}
                                </Button>
                            ) : null}
                        </Flex>
                    </div>
                ) : null}
            </Flex>
        </Popup>
    );
}
