'use client'

import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import { FEATURE_FLAGS } from '@config/features';
import GlobalLanguagesList from '@data/languages';
import { addProject, assertProjectUpdateSucceeded, uploadFile } from '@database/projects';
import { deleteFileByUrl } from '@database/storage/deleteFromStorage';
import { assertStoreUpdateSucceeded, updateStore } from '@database/stores';
import { checkExistingActiveJob } from '@lib/firebase/menuProcessing';
import {
    getBoundedMenuProcessingStringContext,
    getMenuProcessingProjectLogContext,
    logMenuProcessingFailure,
} from '@lib/firebase/menuProcessingDiagnostics';
import { createRandomIdSegment } from '@lib/runtime/randomId';
import { MENU_IMAGE_CONFIG, optimizeImage } from '@lib/image/optimizeImage';
import { createMenuLinkImportJob } from '@lib/menu-link-import/client';
import { shouldCleanupUploadedFilesAfterJobStartError } from '@lib/menu-extraction/jobStartFailure';
import {
    MENULIST_ANSWERLATTICE_TARGETS,
    getMenuListAnswerlatticeTargetProps,
} from '@lib/answerlattice/referenceClients/menuListGuidedResolution';
import { runMenuIntakeIdentityPreflight } from '@lib/menu-intake-identity/client';
import { buildOwnerDetectedUploadDetails, buildOwnerUploadConcernDetails, type OwnerDetectedDetail } from '@lib/menu-intake-identity/ownerPresentation';
import { buildBusinessIdentitySuggestions, buildBusinessIdentityUpdatePayload, mergeBusinessIdentityUpdatesForCurrentStore, type BusinessIdentitySuggestion, type BusinessIdentitySuggestionField } from '@lib/menu-intake-identity/suggestionAcceptance';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { MAX_MENU_EXTRACTION_FILES } from '@template/main-app/projects/constants';
import createProcessingJob from '@template/main-app/projects/getProcessedFile';
import type { ProjectFileType } from '@template/main-app/projects/types';
import { generateMenuFileUid } from '@template/main-app/projects/utils';
import { validateFile } from '@template/main-app/projects/validation';
import { DEFAULT_OUTLET_POLICY, type OutletPolicy } from '@type/multiOutlet.types';
import type { UploadProps } from 'antd';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuFileText, LuGlobe2, LuTrash2, LuUpload } from 'react-icons/lu';
import { Button, Card, Checkbox, Dialog, DotLoading, Flex, Image, Input, NavBar, Popup, ProgressBar, Result, Tag, Text, Title, Toast, Upload } from '../antd';
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

type PreparedFileUploadResult =
    | { error: null; file: PreparedFile }
    | { error: unknown; file: null };

type MenuIntakeDecisionResult =
    | { action: 'continue'; files: PreparedFile[]; ignoredFiles: PreparedFile[]; identityOverrideConfirmed?: boolean }
    | { action: 'cancel' }
    | { action: 'create_new_project'; projectId: string; files: PreparedFile[]; ignoredFiles: PreparedFile[]; identityOverrideConfirmed?: boolean };

type ProjectCreationPayload = Parameters<typeof addProject>[0] & {
    defaultLanguage?: string;
    languages?: string[];
};

const EMPTY_UPLOAD_FILE_LIST: NonNullable<UploadProps['fileList']> = [];

const getPendingMenuExtractionFileCount = (files?: ProjectFileType[] | null): number => (
    (files || []).filter((file) => !file?.extractedData).length
);

function BusinessIdentitySuggestionList({
    details,
    onSelectionChange,
    suggestions,
}: {
    details?: OwnerDetectedDetail[];
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
            <Text>We found these details in the upload. Save only what should update this location.</Text>
            <OwnerDetectedDetails details={details || []} />
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

function OwnerDetectedDetails({
    concerns = [],
    details,
}: {
    concerns?: string[];
    details: OwnerDetectedDetail[];
}) {
    if (!details.length && !concerns.length) return null;

    return (
        <Flex gap={8} vertical>
            {details.length ? (
                <Flex gap={6} wrap="wrap">
                    {details.map((detail) => (
                        <Tag key={detail.key} style={{ alignItems: 'center', display: 'inline-flex', gap: 6 }}>
                            {detail.color ? (
                                <span
                                    aria-hidden="true"
                                    style={{
                                        background: detail.color,
                                        border: '1px solid rgba(0,0,0,0.12)',
                                        borderRadius: 999,
                                        display: 'inline-block',
                                        height: 10,
                                        width: 10,
                                    }}
                                />
                            ) : null}
                            {detail.label}: {detail.value}
                        </Tag>
                    ))}
                </Flex>
            ) : null}
            {concerns.length ? (
                <Flex gap={4} vertical>
                    {concerns.map((concern) => (
                        <Text key={concern} style={{ color: 'var(--adm-color-warning)' }}>
                            {concern}
                        </Text>
                    ))}
                </Flex>
            ) : null}
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
    const [linkUrl, setLinkUrl] = useState('');
    const [linkPermissionConfirmed, setLinkPermissionConfirmed] = useState(false);
    const [linkImporting, setLinkImporting] = useState(false);
    const selectedFileCountRef = useRef(0);
    const selectedFilesRef = useRef<SelectedUploadFile[]>([]);

    useEffect(() => {
        return () => {
            selectedFilesRef.current.forEach((file) => {
                if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
            });
        };
    }, []);

    useEffect(() => {
        selectedFileCountRef.current = selectedFiles.length;
    }, [selectedFiles.length]);

    const totalSelectedBytes = useMemo(
        () => selectedFiles.reduce((sum, file) => sum + file.size, 0),
        [selectedFiles]
    );
    const existingPendingFileCount = useMemo(
        () => getPendingMenuExtractionFileCount(existingFiles),
        [existingFiles],
    );
    const outletPolicy = useMemo<OutletPolicy | null>(() => {
        if (isMasterUser || storeDetails?.isMaster !== false) return null;
        return {
            ...DEFAULT_OUTLET_POLICY,
            ...(userPermissions?.outletPolicy || {}),
        };
    }, [isMasterUser, storeDetails?.isMaster, userPermissions]);
    const canCreateLocalProjects = !outletPolicy || outletPolicy.allowLocalProjects !== false;
    const canUseMenuExtraction = userPermissions?.canUseMenuExtraction === true;
    const canManageStore = userPermissions?.canManageStore === true;
    const canUploadToCurrentContext = Boolean(currentProjectId) || canCreateLocalProjects;

    const hasSelectedFiles = selectedFiles.length > 0;
    const totalSelectedMb = (totalSelectedBytes / (1024 * 1024)).toFixed(1);

    const getRemainingMenuUploadSlots = useCallback(
        () => Math.max(0, MAX_MENU_EXTRACTION_FILES - existingPendingFileCount - selectedFileCountRef.current),
        [existingPendingFileCount],
    );

    const showMenuUploadFileLimitError = useCallback(() => {
        const remainingSlots = getRemainingMenuUploadSlots();
        Toast.show({
            content: remainingSlots > 0
                ? `Upload up to ${MAX_MENU_EXTRACTION_FILES} menu photos or PDF pages at a time. You can add ${remainingSlots} more.`
                : `Upload up to ${MAX_MENU_EXTRACTION_FILES} menu photos or PDF pages at a time. Remove one before adding another.`,
            duration: 2600,
        });
    }, [getRemainingMenuUploadSlots]);

    const reserveMenuUploadSlots = useCallback((incomingFileCount: number) => {
        if (incomingFileCount <= 0) return true;
        if (incomingFileCount > getRemainingMenuUploadSlots()) {
            showMenuUploadFileLimitError();
            return false;
        }
        selectedFileCountRef.current += incomingFileCount;
        return true;
    }, [getRemainingMenuUploadSlots, showMenuUploadFileLimitError]);

    const updateSelectedFiles = useCallback((updater: (current: SelectedUploadFile[]) => SelectedUploadFile[]) => {
        setSelectedFiles((current) => {
            const next = updater(current);

            current.forEach((file) => {
                if (file.previewUrl && !next.some((candidate) => candidate.id === file.id)) {
                    URL.revokeObjectURL(file.previewUrl);
                }
            });

            selectedFilesRef.current = next;
            return next;
        });
    }, []);

    const handleSelectedFile = useCallback(async (file: File, fileList: File[]) => {
        if (!canUseMenuExtraction) {
            Toast.show({ content: 'Menu extraction is not enabled for this location.', duration: 1800 });
            return false;
        }
        if (!canUploadToCurrentContext) {
            Toast.show({ content: 'New local menus are not enabled for this location.', duration: 1800 });
            return false;
        }

        const incomingSelectionCount = fileList?.length || 1;
        if (incomingSelectionCount > 1 && incomingSelectionCount > getRemainingMenuUploadSlots()) {
            showMenuUploadFileLimitError();
            return false;
        }

        const validationResult = await validateFile(file, fileList, existingFiles);
        if (validationResult) {
            return validationResult;
        }

        if (file.type === 'application/pdf') {
            try {
                const remainingPageSlots = getRemainingMenuUploadSlots();
                if (remainingPageSlots <= 0) {
                    showMenuUploadFileLimitError();
                    return false;
                }

                setProgress(0);
                setStatusText(t('uploadConvertingPdf'));
                setStep('uploading');

                const { convertPdfToImages } = await import('@template/main-app/projects/utils/pdfUtils');
                const convertedPdfImages = await convertPdfToImages([
                    {
                        uid: `${Date.now()}-${createRandomIdSegment(8)}`,
                        name: file.name,
                        arrayBuffer: () => file.arrayBuffer(),
                    },
                ], 'mobile', 'mobile', { maxPages: remainingPageSlots });

                if (!convertedPdfImages.length) {
                    throw new Error(t('menuUploadNoFilesPrepared'));
                }

                if (!reserveMenuUploadSlots(convertedPdfImages.length)) {
                    setStatusText('');
                    setStep(selectedFileCountRef.current > 0 ? 'review' : 'select');
                    return false;
                }

                updateSelectedFiles((current) => [
                    ...current,
                    ...convertedPdfImages.map((page) => ({
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
            } catch (error: unknown) {
                logMenuProcessingFailure('mobile_menu_upload_pdf_conversion_failed', error, {
                    ...getBoundedMenuProcessingStringContext('fileType', file.type),
                    fileSize: Number(file.size || 0),
                });
                setErrorMessage(t('menuUploadRetry'));
                setStep('error');
                return false;
            }
        }

        if (!reserveMenuUploadSlots(1)) {
            return false;
        }

        const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
        const nextFile: SelectedUploadFile = {
            id: `${Date.now()}-${createRandomIdSegment(8)}`,
            name: file.name,
            previewUrl,
            size: file.size,
            sourceFile: file,
            type: file.type,
        };

        updateSelectedFiles((current) => [...current, nextFile]);
        setStep('review');

        return false;
    }, [
        canUploadToCurrentContext,
        canUseMenuExtraction,
        existingFiles,
        existingPendingFileCount,
        getRemainingMenuUploadSlots,
        reserveMenuUploadSlots,
        showMenuUploadFileLimitError,
        t,
        updateSelectedFiles,
    ]);

    const uploadProps: UploadProps = useMemo(() => ({
        accept: '.pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf',
        beforeUpload: async (file, fileList) => {
            const result = await handleSelectedFile(file, fileList);
            return result ?? false;
        },
        fileList: EMPTY_UPLOAD_FILE_LIST,
        multiple: true,
        showUploadList: false,
    }), [handleSelectedFile]);

    const handleRemoveFile = useCallback((fileId: string) => {
        if (selectedFiles.some((file) => file.id === fileId)) {
            selectedFileCountRef.current = Math.max(0, selectedFileCountRef.current - 1);
        }
        updateSelectedFiles((current) => {
            const next = current.filter((file) => file.id !== fileId);
            if (next.length === 0) {
                setStep('select');
            }
            return next;
        });
    }, [selectedFiles, updateSelectedFiles]);

    const handleReset = useCallback(() => {
        selectedFileCountRef.current = 0;
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
        if (!canManageStore) return;
        const suggestions = buildBusinessIdentitySuggestions(result, storeDetails);
        if (!suggestions.length || !storeDetails?.storeId) return;
        const detectedDetails = buildOwnerDetectedUploadDetails(result);

        let selectedFields = suggestions.map((suggestion) => suggestion.field);
        await Dialog.confirm({
            title: 'Save detected business details?',
            content: (
                <BusinessIdentitySuggestionList
                    details={detectedDetails}
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
                    const expectedStoreId = storeDetails.storeId;
                    const expectedTenantId = storeDetails.tenantId;
                    const writeResult = await updateStore({
                        storeId: expectedStoreId,
                        tenantId: expectedTenantId,
                        ...updates,
                    });
                    assertStoreUpdateSucceeded(
                        writeResult,
                        expectedStoreId,
                        'mobile_menu_upload_business_details_store_update_rejected',
                    );
                    setStoreDetails((previous) => mergeBusinessIdentityUpdatesForCurrentStore(
                        previous,
                        { storeId: expectedStoreId, tenantId: expectedTenantId },
                        updates,
                    ));
                    Toast.show({ content: 'Business details updated', duration: 1400 });
                } catch (error) {
                    logMenuProcessingFailure('mobile_menu_upload_business_details_update_failed', error, {
                        ...getBoundedMenuProcessingStringContext('storeId', storeDetails.storeId),
                        ...getBoundedMenuProcessingStringContext('tenantId', storeDetails.tenantId),
                        selectedFieldCount: selectedFields.length,
                    });
                    Toast.show({ content: 'Could not update business details.', duration: 2200 });
                }
            },
        });
    }, [canManageStore, setStoreDetails, storeDetails]);

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
            const detectedDetails = buildOwnerDetectedUploadDetails(result);
            const concernDetails = buildOwnerUploadConcernDetails(result);
            const confirmed = await Dialog.confirm({
                title: decision.title,
                content: (
                    <Flex gap={8} vertical>
                        <Text>{decision.message}</Text>
                        <OwnerDetectedDetails details={detectedDetails} concerns={concernDetails} />
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
                return { action: 'continue', files: filesForExtraction, ignoredFiles, identityOverrideConfirmed: true };
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
                assertProjectUpdateSucceeded(
                    newProject,
                    undefined,
                    'mobile_menu_upload_create_project_update_rejected',
                );
                if (!newProject?.projectId) {
                    throw new Error('mobile_menu_upload_create_project_update_rejected');
                }

                Toast.show({ content: 'Created a new menu for this upload', duration: 1600 });
                return {
                    action: 'create_new_project',
                    projectId: newProject.projectId,
                    files: filesForExtraction,
                    ignoredFiles,
                    identityOverrideConfirmed: true,
                };
            } catch {
                Toast.show({
                    content: t('menuUploadCreateProjectFailed'),
                    duration: 2400,
                });
                return { action: 'cancel' };
            }
        } catch (error: unknown) {
            logMenuProcessingFailure('mobile_menu_upload_intake_preflight_skipped', error, {
                ...getMenuProcessingProjectLogContext(projectId),
                fileCount: files.length,
            });
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

    const cleanupUploadedMenuFiles = useCallback(async (
        files: PreparedFile[],
        cleanupReason: string,
        projectId?: string | null,
    ) => {
        if (files.length === 0) return;

        const cleanupResults = await Promise.allSettled(files.map(file => deleteFileByUrl(file.url)));
        const failedCleanupCount = cleanupResults.filter((result) => (
            result.status === 'rejected' || result.value.success !== true
        )).length;

        if (failedCleanupCount > 0) {
            logMenuProcessingFailure('mobile_menu_upload_uploaded_file_cleanup_failed', new Error('storage_cleanup_failed'), {
                ...getMenuProcessingProjectLogContext(projectId),
                ...getBoundedMenuProcessingStringContext('cleanupReason', cleanupReason),
                attemptedCleanupCount: files.length,
                failedCleanupCount,
            });
        }
    }, []);

    const handleUploadAndProcess = useCallback(async () => {
        if (!canUseMenuExtraction) {
            Toast.show({ content: 'Menu extraction is not enabled for this location.', duration: 1800 });
            return;
        }
        if (!selectedFiles.length) return;
        if (existingPendingFileCount + selectedFiles.length > MAX_MENU_EXTRACTION_FILES) {
            showMenuUploadFileLimitError();
            return;
        }

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
                assertProjectUpdateSucceeded(
                    newProject,
                    undefined,
                    'mobile_menu_upload_create_project_update_rejected',
                );
                if (!newProject?.projectId) {
                    throw new Error('mobile_menu_upload_create_project_update_rejected');
                }
                projectId = newProject.projectId;
            }

            const preparedFiles = await prepareFilesForUpload();
            if (!preparedFiles.length) {
                throw new Error(t('menuUploadNoFilesPrepared'));
            }
            if (existingPendingFileCount + preparedFiles.length > MAX_MENU_EXTRACTION_FILES) {
                showMenuUploadFileLimitError();
                setStep('review');
                setProgress(0);
                setStatusText('');
                return;
            }

            setProgress(35);
            setStatusText(t('uploadUploadingFiles'));

            let completedUploads = 0;
            const uploadResults = await Promise.all(preparedFiles.map(async (file): Promise<PreparedFileUploadResult> => {
                try {
                    const uploadedUrl = await uploadFile({
                        uid: file.uid,
                        url: file.url,
                        type: file.type,
                        name: file.name,
                        size: file.size,
                    });

                    if (!uploadedUrl) throw new Error(t('menuUploadFailed'));

                    completedUploads += 1;
                    setProgress(35 + Math.round((completedUploads / preparedFiles.length) * 45));

                    return {
                        error: null,
                        file: {
                            uid: file.uid,
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            url: uploadedUrl,
                        },
                    };
                } catch (error) {
                    return { error, file: null };
                }
            }));
            const uploadedFiles = uploadResults
                .map((result) => result.file)
                .filter((file): file is PreparedFile => file !== null);
            const failedUploadCount = uploadResults.filter((result) => result.error !== null).length;
            if (failedUploadCount > 0) {
                await cleanupUploadedMenuFiles(uploadedFiles, 'partial_upload_failure', projectId);
                throw new Error(t('menuUploadFailed'));
            }

            const intakeDecision = await confirmMenuIntakeDecision(projectId, uploadedFiles);
            if (intakeDecision.action === 'cancel') {
                await cleanupUploadedMenuFiles(uploadedFiles, 'intake_cancelled', projectId);
                setStep('review');
                setProgress(0);
                setStatusText('');
                return;
            }
            await cleanupUploadedMenuFiles(intakeDecision.ignoredFiles, 'intake_ignored_files', projectId);
            const filesForJob = intakeDecision.files;
            if (filesForJob.length === 0) {
                await cleanupUploadedMenuFiles(uploadedFiles, 'no_files_for_job', projectId);
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
                await cleanupUploadedMenuFiles(filesForJob, 'existing_active_job', targetProjectId);
                Toast.show({ content: t('menuUploadProcessingInProgress'), duration: 1800 });
                onJobCreated({ jobId: existingJobId, projectId: targetProjectId });
                return;
            }

            setProgress(85);
            setStatusText(t('uploadCreatingJob'));

            const languageCodes = currentProjectLanguages?.length ? currentProjectLanguages : ['en'];
            const targetLanguages = GlobalLanguagesList.filter((language) => languageCodes.includes(language.code));
            let jobId: string;
            try {
                ({ jobId } = await createProcessingJob({
                    files: filesForJob,
                    targetLanguages: targetLanguages.length
                        ? targetLanguages
                        : [{ code: 'en', name: 'English' }],
                    projectId: targetProjectId,
                    businessCategory: storeDetails?.businessCategory,
                    businessType: storeDetails?.businessType,
                    identityOverrideConfirmed: intakeDecision.identityOverrideConfirmed,
                }));
            } catch (error) {
                if (shouldCleanupUploadedFilesAfterJobStartError(error)) {
                    await cleanupUploadedMenuFiles(filesForJob, 'job_start_rejected', targetProjectId);
                }
                throw error;
            }

            setProgress(100);
            onJobCreated({ jobId, projectId: targetProjectId });
        } catch (error: unknown) {
            logMenuProcessingFailure('mobile_menu_upload_job_create_failed', error, {
                ...getMenuProcessingProjectLogContext(currentProjectId),
                fileCount: selectedFiles.length,
            });
            setErrorMessage(t('menuUploadRetry'));
            setStep('error');
        }
    }, [
        canCreateLocalProjects,
        canUseMenuExtraction,
        cleanupUploadedMenuFiles,
        confirmMenuIntakeDecision,
        currentProjectId,
        currentProjectLanguages,
        existingPendingFileCount,
        onJobCreated,
        prepareFilesForUpload,
        selectedFiles,
        showMenuUploadFileLimitError,
        storeDetails?.businessCategory,
        storeDetails?.businessType,
        t,
    ]);

    const handleMenuLinkImport = useCallback(async () => {
        if (!FEATURE_FLAGS.ENABLE_MENU_LINK_IMPORT) return;
        if (!canUseMenuExtraction) {
            Toast.show({ content: 'Menu extraction is not enabled for this location.', duration: 1800 });
            return;
        }
        if (!linkUrl.trim()) {
            Toast.show({ content: 'Paste a public menu link.', duration: 1800 });
            return;
        }
        if (!linkPermissionConfirmed) {
            Toast.show({ content: 'Confirm you have permission to import this menu.', duration: 2200 });
            return;
        }

        try {
            setLinkImporting(true);
            setStep('uploading');
            setProgress(10);
            setStatusText('Reading menu link');

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
                assertProjectUpdateSucceeded(
                    newProject,
                    undefined,
                    'mobile_menu_upload_create_project_update_rejected',
                );
                if (!newProject?.projectId) {
                    throw new Error('mobile_menu_upload_create_project_update_rejected');
                }
                projectId = newProject.projectId;
            }

            setProgress(55);
            setStatusText('Creating review draft');
            const result = await createMenuLinkImportJob({
                permissionConfirmed: linkPermissionConfirmed,
                projectId,
                url: linkUrl.trim(),
            });

            setProgress(100);
            setLinkUrl('');
            setLinkPermissionConfirmed(false);
            onJobCreated({ jobId: result.jobId, projectId: result.projectId });
        } catch (error: unknown) {
            logMenuProcessingFailure('mobile_menu_upload_link_import_failed', error, {
                ...getMenuProcessingProjectLogContext(currentProjectId),
                ...getBoundedMenuProcessingStringContext('linkUrl', linkUrl),
            });
            setErrorMessage('We could not read this menu link. Upload a photo/PDF or add the menu manually.');
            setStep('error');
        } finally {
            setLinkImporting(false);
        }
    }, [
        canCreateLocalProjects,
        canUseMenuExtraction,
        currentProjectId,
        linkPermissionConfirmed,
        linkUrl,
        onJobCreated,
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
                        <>
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
                                            {...getMenuListAnswerlatticeTargetProps(MENULIST_ANSWERLATTICE_TARGETS.MENU_IMPORT_CHOOSE_SOURCE)}
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
                        {FEATURE_FLAGS.ENABLE_MENU_LINK_IMPORT ? (
                            <Card
                                style={{
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                    borderRadius: 18,
                                }}
                            >
                                <Flex gap={12} vertical>
                                    <Flex align="center" gap={10}>
                                        <Flex
                                            align="center"
                                            justify="center"
                                            style={{
                                                backgroundColor: token.colorPrimaryBg,
                                                border: `1px solid ${token.colorPrimaryBorder}`,
                                                borderRadius: 14,
                                                color: token.colorPrimary,
                                                height: 44,
                                                minWidth: 44,
                                                width: 44,
                                            }}
                                        >
                                            <LuGlobe2 size={20} />
                                        </Flex>
                                        <Flex gap={2} style={{ flex: 1 }} vertical>
                                            <Text strong>Import from existing menu link</Text>
                                            <Text style={{ color: token.colorTextSecondary }}>
                                                We&apos;ll create a draft for review before anything is published.
                                            </Text>
                                        </Flex>
                                    </Flex>
                                    <Input
                                        disabled={!canUploadToCurrentContext || linkImporting}
                                        onChange={setLinkUrl}
                                        placeholder="https://example.com/menu"
                                        value={linkUrl}
                                    />
                                    <Checkbox
                                        checked={linkPermissionConfirmed}
                                        disabled={!canUploadToCurrentContext || linkImporting}
                                        onChange={setLinkPermissionConfirmed}
                                    >
                                        I confirm this is my business menu or I have permission to import it.
                                    </Checkbox>
                                    <Button
                                        {...getMenuListAnswerlatticeTargetProps(MENULIST_ANSWERLATTICE_TARGETS.MENU_IMPORT_START)}
                                        block
                                        color="primary"
                                        disabled={!canUploadToCurrentContext || !linkUrl.trim() || !linkPermissionConfirmed}
                                        icon={<LuGlobe2 size={18} />}
                                        loading={linkImporting}
                                        onClick={handleMenuLinkImport}
                                        size="large"
                                        style={{ borderRadius: 16, minHeight: 52 }}
                                    >
                                        Import link
                                    </Button>
                                </Flex>
                            </Card>
                        ) : null}
                        </>
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
                            </Flex>
                        </Card>
                    ) : null}

                    {step === 'error' ? (
                        <Result
                            icon={(
                                <ContextualStateIllustration
                                    color={token.colorTextQuaternary}
                                    size={112}
                                    variant="photoErrorContext"
                                />
                            )}
                            extra={[
                                <Button key="cancel" block fill="outline" onClick={onClose} size="large">
                                    {t('cancel')}
                                </Button>,
                                <Button
                                    {...getMenuListAnswerlatticeTargetProps(MENULIST_ANSWERLATTICE_TARGETS.MENU_IMPORT_RETRY)}
                                    key="retry"
                                    block
                                    color="primary"
                                    onClick={handleReset}
                                    size="large"
                                >
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
                                        disabled={!canUploadToCurrentContext || selectedFiles.length >= MAX_MENU_EXTRACTION_FILES}
                                        fill="outline"
                                        icon={<LuUpload size={16} />}
                                        size="large"
                                        style={{ borderRadius: 16, minHeight: 52, width: '100%' }}
                                    >
                                        {t('addMoreFiles')}
                                    </Button>
                                </Upload>

                                <Button
                                    {...getMenuListAnswerlatticeTargetProps(MENULIST_ANSWERLATTICE_TARGETS.MENU_IMPORT_START)}
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
