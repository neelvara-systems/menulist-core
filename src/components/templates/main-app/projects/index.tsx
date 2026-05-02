'use client';

import LoadingMessage from '@antdComponent/loadingMessage';
import { FEATURE_FLAGS } from '@config/features';
import { REFRESH_INTERVALS } from '@constant/metrics';
import { updateStore } from '@database/stores';
import GlobalLanguagesList from '@data/languages';
import { addProject, deleteProject, duplicateProject, getMetadataProjectsList, getProjectData, getProjectDataWithoutLoader, setProjectActive, updateProject, updateProjectMetadata, updateProjectWithoutLoader, uploadFile } from '@database/projects';
import { deleteFileByUrl } from '@database/storage/deleteFromStorage';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import useDeviceType from '@hook/useDeviceType';
import { useImageBatchJobListener } from '@hook/useImageBatchJobListener';
import { useMenuProcessingJob } from '@hook/useMenuProcessingJob';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { MenuFileToProcess } from '@lib/firebase/menuProcessing';
import { MENU_IMAGE_CONFIG, optimizeImage } from '@lib/image/optimizeImage';
import { applyLocalizedProjectDraftMap, getLocalizedProjectValue, getProjectManagedLanguages, getProjectPreferredLanguage } from '@lib/localization/projectContent';
import { normalizeProjectLanguages } from '@lib/localization/languagePolicy';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { runMenuIntakeIdentityPreflight } from '@lib/menu-intake-identity/client';
import { buildBusinessIdentitySuggestions, buildBusinessIdentityUpdatePayload, type BusinessIdentitySuggestion, type BusinessIdentitySuggestionField } from '@lib/menu-intake-identity/suggestionAcceptance';
import { slugify } from '@lib/utils/slugify';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import ProjectsDataProvider from '@providers/projectsDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { hasValidSubscriptionAccess } from '@util/razorpay';
import { getBase64, removeObjRef } from '@util/utils';
import { Button, Checkbox, Flex, Form, message, Modal, Spin, theme, Tooltip, Typography, Upload } from 'antd';
import type { UploadFileStatus, UploadProps } from 'antd/es/upload/interface';
import DOMPurify from 'isomorphic-dompurify';
import { useTranslations } from 'next-intl';
// pdfjs-dist is lazy loaded in processsPdf() to reduce initial bundle size
import useMasterJobStatus from '@hook/useMasterJobStatus';
import { runComparisonEngine } from '@lib/extraction/comparisonEngine';
import type { ComparisonEngineOutput, ComparisonMode } from '@lib/extraction/comparisonEngine.types';
import MasterUpdateBanner from '@organisms/MasterUpdateBanner';
import { lazy, Suspense, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { LuArrowRight, LuFilePlus, LuGlobe2, LuInfo, LuRocket, LuSparkles, LuUpload, LuZap } from 'react-icons/lu';
import { TbFileTypeJpg, TbFileTypePdf } from 'react-icons/tb';
import useSWR from 'swr';
import NoSubscriptionView from '../billing/NoSubscriptionView';
import PreviewModal from './b2cView/previewModal';
import ShareModal from './b2cView/shareModal';
import { DeviceTypes } from './b2cView/types';
import { PROCESSING_TIMEOUT } from './constants';
import { EmptyProjectState } from './EmptyProjectState';
import ErrorRecoveryAlert, { FailedFile } from './ErrorRecoveryAlert';
import { FileList } from './FileList';
import createProcessingJob from './getProcessedFile';
import {
    ExtractionJobBlockingOverlay,
    ExtractionJobFailureModal,
    ExtractionJobReviewModal,
    ExtractionJobSuccessModal
} from './jobScreens';
import LanguageSelector from './LanguageSelector';
import { PdfViewer } from './PdfViewer';
import { ProcessGuideModal } from './ProcessGuideModal';
import { ProjectConfirmModal } from './ProjectDetails/ProjectConfirmModal';
import { ProjectDuplicateModal } from './ProjectDetails/ProjectDuplicateModal';
import { ProjectEditModal, ProjectFormData } from './ProjectDetails/ProjectEditModal';
import ProjectsSubHeader from './ProjectsSubHeader';
import SpecialMenuCard from './SpecialMenuCard';
import { BatchImageGenerationJobType, ConvertedImageType, Project, ProjectFileType, ProjectMetadata } from './types';
import { generateMenuFileUid } from './utils';
import { validateFile } from './validation';
import { WelcomeModal } from './WelcomeModal';

type MenuIntakeDecisionResult =
    | { action: 'continue'; files: MenuFileToProcess[]; ignoredFiles: MenuFileToProcess[] }
    | { action: 'cancel' }
    | { action: 'create_new_project'; projectId: string; projectMetadata: ProjectMetadata; files: MenuFileToProcess[]; ignoredFiles: MenuFileToProcess[] };

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
            <Typography.Text>
                We found business details in the upload. Save only the details you want to use.
            </Typography.Text>
            {suggestions.map((suggestion) => (
                <Checkbox
                    checked={selectedFields.includes(suggestion.field)}
                    key={suggestion.field}
                    onChange={(event) => {
                        setSelectedFields((current) => event.target.checked
                            ? [...current, suggestion.field]
                            : current.filter((field) => field !== suggestion.field));
                    }}
                >
                    <Flex gap={2} vertical>
                        <Typography.Text strong>{suggestion.label}: {suggestion.value}</Typography.Text>
                        {suggestion.currentValue ? (
                            <Typography.Text type="secondary">Current: {suggestion.currentValue}</Typography.Text>
                        ) : null}
                    </Flex>
                </Checkbox>
            ))}
        </Flex>
    );
}

// B2CView ref interface for calling functions from parent
interface B2CViewRef {
    publish: () => Promise<void>;
    openPreview: () => void;
}

const B2BView = lazy(() => import('./b2bView'));
const B2CView = lazy(() => import('./b2cView'));
const Editor = lazy(() => import('./editorView/Editor'));

const { Dragger } = Upload;
const { useToken } = theme;

function ProjectsPage() {
    const { token } = useToken();
    const labels = useOfferingLabels();
    const offeringName = labels.offeringPhrase.charAt(0).toUpperCase() + labels.offeringPhrase.slice(1);
    // T4-N-04: divergence advisory modal (G-13) copy.
    const tDivergence = useTranslations('Projects.divergence');
    const loggedInSession = useClientAuthSession();
    const { hasMounted, isMobile } = useDeviceType();
    const [selectedProject, setSelectedProject] = useState<ProjectMetadata | null>(null);
    const [fileProcessingId, setFileProcessingId] = useState(null)
    const [currentView, setCurrentView] = useState(1);
    const [activeDeviceType, setActiveDeviceType] = useState<DeviceTypes>('mobile');
    const [uiEditorHasChanges, setUiEditorHasChanges] = useState(false);
    const b2cViewRef = useRef<B2CViewRef>(null);
    const [activeBatchImageJob, setActiveBatchImageJob] = useState<BatchImageGenerationJobType | null>(null);
    const [pdfFiles, setPdfFiles] = useState<{ images: ConvertedImageType[]; action: string } | null>({ images: [], action: "" });
    const { tenantDetails, storeDetails, setStoreDetails, activeSubscription } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const [pdfPagesCount, setPdfPagesCount] = useState(null);
    const cancelPdfRef = useRef(false); // Ref for immediate access in async operations
    const dispatch = useAppDispatch()
    const DefaultLanguage = 'en';

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm<ProjectFormData>();
    const [editingProject, setEditingProject] = useState<ProjectMetadata | null>(null);
    const [projectFormLanguages, setProjectFormLanguages] = useState<string[]>([DefaultLanguage]);
    const [projectFormSelectedLanguage, setProjectFormSelectedLanguage] = useState(DefaultLanguage);
    const [projectNameDrafts, setProjectNameDrafts] = useState<Record<string, string>>({});
    const [projectDescriptionDrafts, setProjectDescriptionDrafts] = useState<Record<string, string>>({});
    const [confirmActionVisible, setConfirmActionVisible] = useState(false);
    const [confirmActionType, setConfirmActionType] = useState<'reset' | 'delete' | null>(null);
    const [isFirstTime, setIsFirstTime] = useState(false);
    const [failedFiles, setFailedFiles] = useState<FailedFile[]>([]);
    const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

    // Job Queue: Track active menu processing job
    // Persist in sessionStorage so it survives page reloads mid-processing
    const [activeProcessingJobId, setActiveProcessingJobIdState] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return sessionStorage.getItem('activeProcessingJobId') || null;
        }
        return null;
    });
    const setActiveProcessingJobId = useCallback((id: string | null) => {
        setActiveProcessingJobIdState(id);
        if (typeof window !== 'undefined') {
            if (id) {
                sessionStorage.setItem('activeProcessingJobId', id);
            } else {
                sessionStorage.removeItem('activeProcessingJobId');
            }
        }
    }, []);

    // Duplicate modal state
    const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
    const [projectToDuplicate, setProjectToDuplicate] = useState<ProjectMetadata | null>(null);

    // Share modal state (for ProjectsSubHeader)
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    // Preview modal state (for Upload view)
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewLanguage, setPreviewLanguage] = useState('en');

    const resolveProjectImageForSave = useCallback(async (
        projectImage?: string | null,
        fallbackUid?: string,
    ) => {
        if (!projectImage) return null;
        if (!projectImage.includes('base64')) return projectImage;

        const mimeMatch = projectImage.match(/^data:(.*?);base64,/);
        const uploadedUrl = await uploadFile({
            uid: fallbackUid || `project-image-${Date.now()}`,
            url: projectImage,
            type: mimeMatch?.[1] || 'image/jpeg',
        } as any, 'project-images');

        return uploadedUrl || null;
    }, []);

    const buildProjectLocalizedDrafts = useCallback((value: any, languages: string[]) => (
        Object.fromEntries(
            languages.map((languageCode) => [
                languageCode,
                getLocalizedProjectValue(value, languageCode, ''),
            ])
        )
    ), []);

    // Mount effect: Preload lazy components + first-time visit check
    useEffect(() => {
        // Preload lazy components in background for instant navigation
        import('./editorView/Editor');
        import('./b2cView');
        import('./b2bView');

        // First-time visit check (welcome modal disabled, just mark as visited)
        if (!localStorage.getItem('projects_visited')) {
            localStorage.setItem('projects_visited', 'true');
        }
    }, []);

    // Preview - both views use modal
    const handlePreview = () => {
        if (currentView === 3 && b2cViewRef.current) {
            // UI Editor - open preview modal with current design (via B2CView)
            b2cViewRef.current.openPreview();
        } else if (activeProject?.projectId) {
            // Upload/Editor view - open preview modal with published data
            setIsPreviewModalOpen(true);
        }
    };

    // Publish - calls B2CView's publish function via ref
    const handlePublish = async () => {
        if (b2cViewRef.current) {
            await b2cViewRef.current.publish();
        }
    };

    const forceDesktop = typeof window !== 'undefined' && localStorage.getItem('forceDesktopMode') === 'true';
    const shouldEnableDesktopProjectsData = hasMounted && (!FEATURE_FLAGS.ENABLE_MOBILE_UI || !isMobile || forceDesktop);

    // SWR cache key for projects list
    const projectsListCacheKey = shouldEnableDesktopProjectsData && loggedInSession?.sId
        ? `projects-${loggedInSession.tId}-${loggedInSession.sId}`
        : null;

    // SWR cache key for individual project
    const projectDataCacheKey = shouldEnableDesktopProjectsData && selectedProject?.projectId
        ? `project-${selectedProject.projectId}`
        : null;

    // Fetch projects list with SWR (automatic caching & deduplication)
    const { data: projectsData, error: projectsError, isLoading: projectsLoading, mutate: mutateProjects } = useSWR(
        projectsListCacheKey,
        async () => {
            if (!loggedInSession) return { projects: [], lastDoc: null };
            const result = await getMetadataProjectsList();
            return result || { projects: [] };
        },
        {
            dedupingInterval: REFRESH_INTERVALS.SWR_DEDUPE, // 60 seconds
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            revalidateOnMount: true
        }
    );

    // Fetch individual project data with SWR
    const { data: activeProject, error: projectError, isLoading: projectLoading, mutate: mutateProject } = useSWR(
        projectDataCacheKey,
        async () => {
            if (!selectedProject?.projectId) return null;
            const project = await getProjectData(selectedProject.projectId);

            // Check if the project already has defined languages
            if (!Boolean(project?.languages?.length)) {
                project.languages = normalizeProjectLanguages([storeDetails?.defaultLanguage || DefaultLanguage]);
            }
            if (!project?.defaultLanguage) {
                project.defaultLanguage = storeDetails?.defaultLanguage || DefaultLanguage;
            }
            return project;
        },
        {
            dedupingInterval: REFRESH_INTERVALS.SWR_DEDUPE,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            revalidateOnMount: true
        }
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // CHECK FOR EXISTING ACTIVE JOB ON PROJECT LOAD
    // ═══════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        if (!activeProject?.projectId) {
            return;
        }

        // Don't check for existing jobs if we already have an active job from user action
        // This prevents the job check from clearing a job that was just created
        if (activeProcessingJobId) {
            return;
        }

        const checkExistingJob = async () => {
            try {
                const { checkExistingActiveJob } = await import('@lib/firebase/menuProcessing');

                const activeJobId = await checkExistingActiveJob(activeProject.projectId);
                if (activeJobId) {
                    setActiveProcessingJobId(activeJobId);
                    return;
                }
            } catch (error) {
                console.error('[ProjectsPage] Failed to check existing job:', error);
            }
        };

        checkExistingJob();
    }, [activeProject?.projectId, activeProcessingJobId]);

    // ═══════════════════════════════════════════════════════════════════════════
    // JOB QUEUE: Listen to active processing job status
    // ═══════════════════════════════════════════════════════════════════════════
    const {
        job: activeJob,
        isProcessing: jobIsProcessing,
        isCompleted: jobIsCompleted,
        isFailed: jobIsFailed,
        isCancelled: jobIsCancelled,
        isPreviewReady: jobIsPreviewReady,
        isFirstExtraction: jobIsFirstExtraction,
        progress: jobProgress,
        currentStep: jobCurrentStep,
        result: jobResult,
        error: jobError,
        cancel: cancelJob,
    } = useMenuProcessingJob(activeProcessingJobId);

    // ═══════════════════════════════════════════════════════════════════════════
    // MASTER JOB MONITORING: For outlet projects, listen to master's active job
    // When master job is running, outlet UI is blocked
    // ═══════════════════════════════════════════════════════════════════════════
    const masterProjectId = activeProject?.masterProjectId || null;
    const {
        isMasterJobActive,
        blockingMessage: masterBlockingMessage,
    } = useMasterJobStatus(masterProjectId);

    // State for extraction review screen
    const [showReviewScreen, setShowReviewScreen] = useState(false);
    const [comparisonResult, setComparisonResult] = useState<ComparisonEngineOutput | null>(null);

    // State for success/failure modals
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showFailureModal, setShowFailureModal] = useState(false);
    const [failureMessage, setFailureMessage] = useState<string>('');
    const [extractionStats, setExtractionStats] = useState<{
        qualityScore?: number;
        qualityDetails?: { categoryQuality: number; itemQuality: number; priceQuality: number; descriptionQuality: number };
        categoriesCount?: number;
        itemsCount?: number;
    } | null>(null);

    // Handle job completion - refetch project data since server saved results
    useEffect(() => {
        if (!activeProcessingJobId) {
            return;
        }

        if (jobIsCompleted) {
            // Capture extraction stats from job result before clearing
            const result = activeJob?.result;
            if (result) {
                setExtractionStats({
                    qualityScore: result.qualityScore,
                    qualityDetails: result.qualityDetails,
                    categoriesCount: result.combinedData?.categories?.length || 0,
                    itemsCount: result.combinedData?.items?.length || 0,
                });
            }
            // Server has already saved the data to the project (first extraction)
            mutateProject(); // Refetch to get updated data
            setActiveProcessingJobId(null);
            setFileProcessingId(null);
            setShowReviewScreen(false);
            setComparisonResult(null);
            // Show success modal instead of navigating directly
            setShowSuccessModal(true);
        }

        if (jobIsPreviewReady && !showReviewScreen && activeJob?.result) {
            // Capture extraction stats for the success modal (after review save)
            const previewResult = activeJob.result;
            if (previewResult) {
                setExtractionStats({
                    qualityScore: previewResult.qualityScore,
                    qualityDetails: previewResult.qualityDetails,
                    categoriesCount: previewResult.combinedData?.categories?.length || 0,
                    itemsCount: previewResult.combinedData?.items?.length || 0,
                });
            }
            // Re-extraction: raw data ready for client-side comparison
            try {
                // Get existing project data for comparison
                const existingItems = activeProject?.files?.flatMap(f => f.extractedData?.data?.items || []) || [];
                const existingCategories = activeProject?.files?.flatMap(f => f.extractedData?.data?.categories || []) || [];

                // Get extracted data from job result
                const extractedItems = activeJob.result.combinedData?.items || [];
                const extractedCategories = activeJob.result.combinedData?.categories || [];
                const primaryLang = activeProject?.languages?.[0] || 'en';

                // Determine comparison mode based on project type
                const comparisonMode: ComparisonMode = masterProjectId
                    ? 'OUTLET_LINKED'
                    : 'SINGLE_STORE'; // MASTER_PROJECT mode is same as SINGLE_STORE for comparison

                // Run comparison engine
                const comparison = runComparisonEngine({
                    extracted: {
                        categories: extractedCategories,
                        items: extractedItems,
                    },
                    storeProject: {
                        categories: existingCategories,
                        items: existingItems,
                    },
                    mode: comparisonMode,
                    primaryLang,
                });

                setComparisonResult(comparison);
                setShowReviewScreen(true);
            } catch (error) {
                console.error('[JobQueue] Comparison engine error:', error);
                message.error('Failed to compare extracted data');
            }
        }

        if (jobIsFailed) {
            console.error('[JobQueue] Job failed:', jobError);
            setActiveProcessingJobId(null);
            setFileProcessingId(null);
            setShowReviewScreen(false);
            setComparisonResult(null);
            // Show failure modal
            setFailureMessage(jobError?.message || 'Processing could not be completed. Please try again.');
            setShowFailureModal(true);
        }

        if (jobIsCancelled) {
            setActiveProcessingJobId(null);
            setFileProcessingId(null);
            setShowReviewScreen(false);
            setComparisonResult(null);
            message.info('Processing was cancelled');
        }
    }, [activeProcessingJobId, jobIsCompleted, jobIsPreviewReady, jobIsFailed, jobIsCancelled, jobError, mutateProject, showReviewScreen, activeJob, activeProject]);

    // ═══════════════════════════════════════════════════════════════════════════
    // EXTRACTION REVIEW SCREEN HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════

    const handleReviewSaveComplete = useCallback(() => {
        console.log('[ExtractionReview] Save complete');
        setShowReviewScreen(false);
        setComparisonResult(null);
        setActiveProcessingJobId(null);
        setFileProcessingId(null);
        mutateProject(); // Refetch to get updated data
        setShowSuccessModal(true);
    }, [mutateProject]);

    const handleReviewDiscard = useCallback(() => {
        console.log('[ExtractionReview] Changes discarded');
        setShowReviewScreen(false);
        setComparisonResult(null);
        setActiveProcessingJobId(null);
        setFileProcessingId(null);
        setExtractionStats(null);
        message.info('Changes discarded');
    }, []);

    // Success modal handler - navigate to editor
    const handleSuccessModalClose = useCallback(() => {
        setShowSuccessModal(false);
        setExtractionStats(null);
        setCurrentView(2); // Go to editor view
    }, []);

    // Failure modal handler - close and allow retry
    const handleFailureModalClose = useCallback(() => {
        setShowFailureModal(false);
        setFailureMessage('');
    }, []);

    const handleWelcomeStart = () => {
        setIsFirstTime(false);
        localStorage.setItem('projects_visited', 'true');
        if ((projectsData?.projects?.length || 0) === 0) {
            openModal();
        }
    };

    const handleWelcomeClose = () => {
        setIsFirstTime(false);
        localStorage.setItem('projects_visited', 'true');
    };

    const handleProjectEdit = async (values: ProjectFormData) => {
        try {
            const sanitizedNameDrafts = Object.fromEntries(
                Object.entries(projectNameDrafts).map(([languageCode, draftValue]) => [
                    languageCode,
                    DOMPurify.sanitize(draftValue, { ALLOWED_TAGS: [], KEEP_CONTENT: true }).trim(),
                ])
            ) as Record<string, string>;
            const sanitizedDescriptionDrafts = Object.fromEntries(
                Object.entries(projectDescriptionDrafts).map(([languageCode, draftValue]) => [
                    languageCode,
                    DOMPurify.sanitize(draftValue, { ALLOWED_TAGS: [], KEEP_CONTENT: true }).trim(),
                ])
            ) as Record<string, string>;
            const sanitizedName = sanitizedNameDrafts[projectFormSelectedLanguage] || '';
            const sanitizedDescription = sanitizedDescriptionDrafts[projectFormSelectedLanguage] || undefined;
            const localizedName = applyLocalizedProjectDraftMap(editingProject?.name, sanitizedNameDrafts);
            const localizedDescription = applyLocalizedProjectDraftMap(editingProject?.description, sanitizedDescriptionDrafts);

            if (!localizedName || !Object.values(sanitizedNameDrafts).some((value) => value.trim().length > 0)) {
                message.error(`Please enter a ${labels.offeringPhrase} name`);
                return;
            }

            // G-13 (§11 + §9 PUBLIC-ROUTING-DOCTRINE): surface the
            // Layer-1-vs-isDefault divergence so owners choose intentionally.
            // Scenario: owner names this project "Menu" (proposed slug = 'menu')
            // but the isDefault project on this store is a DIFFERENT project.
            // Customers typing /menu will see THIS project (Layer 1); clicks
            // from OBP's "View Menu" CTA will open the DEFAULT project. Both
            // behaviors are legitimate (stable-URL + rotating feature pattern)
            // but owners usually only want that intentionally, so we ask.
            const proposedSlug = slugify(sanitizedName);
            const existingProjects = projectsData?.projects || [];
            const editingProjectId = editingProject?.projectId;
            const otherDefault = existingProjects.find(
                (p: any) => p?.isDefault === true && p?.projectId !== editingProjectId,
            );
            const thisIsDefault = editingProject?.isDefault === true;
            const nextIsDefault = values.isDefault === true;
            let promoteThisAsDefault = false;
            if (proposedSlug === 'menu' && otherDefault && !nextIsDefault && !thisIsDefault) {
                const decision = await new Promise<'promote' | 'keep'>((resolve) => {
                    Modal.confirm({
                        title: tDivergence('title'),
                        content: (
                            <Flex vertical gap={8}>
                                <Typography.Paragraph style={{ margin: 0 }}>
                                    {tDivergence('namingLineBefore', {
                                        offeringLower: labels.offeringLower,
                                    })}
                                    <strong>&ldquo;{sanitizedName}&rdquo;</strong>
                                    {tDivergence('namingLineAfter')}
                                    <code>/menu</code>.
                                </Typography.Paragraph>
                                <Typography.Paragraph style={{ margin: 0 }}>
                                    {tDivergence('defaultLineBefore', {
                                        offeringLower: labels.offeringLower,
                                    })}
                                    <strong>&ldquo;{otherDefault.name}&rdquo;</strong>
                                    {tDivergence('defaultLineAfter')}
                                </Typography.Paragraph>
                                <ul style={{ paddingLeft: 20, margin: 0 }}>
                                    <li>
                                        {tDivergence('bulletTypingBefore')}
                                        <code>/menu</code>
                                        {tDivergence('bulletArrow')}
                                        <strong>{sanitizedName}</strong>
                                    </li>
                                    <li>
                                        {tDivergence('bulletTappingBefore')}
                                        {tDivergence('bulletArrow')}
                                        <strong>{otherDefault.name}</strong>
                                    </li>
                                </ul>
                                <Typography.Paragraph style={{ margin: 0 }}>
                                    {tDivergence('closingGuidance')}
                                </Typography.Paragraph>
                            </Flex>
                        ),
                        okText: tDivergence('setAsDefaultButton', { name: sanitizedName }),
                        cancelText: tDivergence('keepAsIsButton'),
                        width: 520,
                        onOk: () => resolve('promote'),
                        onCancel: () => resolve('keep'),
                    });
                });
                promoteThisAsDefault = decision === 'promote';
            }

            const savedProjectImage = await resolveProjectImageForSave(
                values.projectImage ?? null,
                editingProject?.projectId || sanitizedName,
            );

            if (editingProject) {
                const defaultReplacement = thisIsDefault && !nextIsDefault
                    ? existingProjects.find((project: any) => (
                        project?.projectId !== editingProject.projectId &&
                        project?.isSpecialMenu !== true &&
                        project?.active !== false
                    )) || existingProjects.find((project: any) => (
                        project?.projectId !== editingProject.projectId &&
                        project?.isSpecialMenu !== true
                    )) || null
                    : null;

                if (thisIsDefault && !nextIsDefault && !defaultReplacement) {
                    message.error(`Add another regular ${labels.offeringPhrase} before removing the default one.`);
                    return;
                }

                const updatePayload: { name?: any; description?: any; isDefault?: boolean; projectImage?: string | null } = {
                    name: localizedName,
                    description: localizedDescription,
                    projectImage: savedProjectImage,
                };
                const nextActive = values.active !== false;
                const nextDefaultLanguage = projectFormSelectedLanguage;
                const activeChanged = (editingProject as any).active !== nextActive;
                const shouldBeDefault = promoteThisAsDefault || nextIsDefault;
                updatePayload.isDefault = shouldBeDefault;
                const updatedProject = {
                    ...editingProject,
                    ...updatePayload,
                    active: nextActive,
                    defaultLanguage: nextDefaultLanguage,
                };
                await updateProjectMetadata(editingProject.projectId!, updatePayload);
                await updateProjectWithoutLoader({
                    projectId: editingProject.projectId!,
                    languages: projectFormLanguages,
                    defaultLanguage: nextDefaultLanguage,
                });
                if (activeChanged) {
                    await setProjectActive(editingProject.projectId!, nextActive);
                }
                if (shouldBeDefault && otherDefault?.projectId) {
                    await updateProjectMetadata(otherDefault.projectId, { isDefault: false });
                }
                if (defaultReplacement?.projectId) {
                    await updateProjectMetadata(defaultReplacement.projectId, { isDefault: true });
                }

                // Update selected project if editing current
                if (selectedProject?.projectId === editingProject.projectId) {
                    setSelectedProject(updatedProject);
                }
                // Update SWR cache (single source of truth)
                mutateProjects(
                    (current) => current ? {
                        ...current,
                        projects: current.projects.map((p) => {
                            if (p.projectId === editingProject.projectId) return updatedProject;
                            if (shouldBeDefault && p.projectId === otherDefault?.projectId) {
                                return { ...p, isDefault: false };
                            }
                            if (defaultReplacement?.projectId === p.projectId) {
                                return { ...p, isDefault: true };
                            }
                            return p;
                        })
                    } : current,
                    { revalidate: false }
                );
                message.success(`${offeringName} updated successfully`);
            } else {
                const shouldBeDefault = promoteThisAsDefault || nextIsDefault;
                const newProject = await addProject({
                    name: localizedName,
                    description: localizedDescription,
                    projectImage: savedProjectImage,
                    active: values.active !== false,
                    isDefault: shouldBeDefault,
                    defaultLanguage: projectFormSelectedLanguage,
                });
                if (newProject) {
                    if (shouldBeDefault && otherDefault?.projectId) {
                        await updateProjectMetadata(otherDefault.projectId, { isDefault: false });
                    }
                    setSelectedProject(newProject.summaryData);
                    // Update SWR cache (single source of truth)
                    mutateProjects(
                        (current) => current ? {
                            ...current,
                            projects: [
                                ...current.projects.map((p) => shouldBeDefault && p.projectId === otherDefault?.projectId
                                    ? { ...p, isDefault: false }
                                    : p),
                                newProject.summaryData,
                            ]
                        } : { projects: [newProject.summaryData], lastDoc: null },
                        { revalidate: false }
                    );
                    message.success(`${offeringName} created successfully`);
                }
            }
            setIsModalOpen(false);
            form.resetFields();
            setEditingProject(null);
        } catch (error) {
            console.error('Error handling project:', error);
            message.error(`Failed to ${editingProject ? 'update' : 'create'} ${labels.offeringPhrase}`);
        }
    };

    const handleDelete = async () => {
        if (editingProject) {
            try {
                dispatch(startLoader("Deleting project"))
                await deleteProject(editingProject.projectId);
                message.success(`${offeringName} deleted successfully`);
                if (selectedProject?.projectId === editingProject.projectId) {
                    setSelectedProject(null);
                }
                // Update SWR cache (single source of truth)
                mutateProjects(
                    (current) => current ? {
                        ...current,
                        projects: current.projects.filter(p => p.projectId !== editingProject.projectId)
                    } : current,
                    { revalidate: false }
                );
                onCloseModal();
            } catch (error) {
                console.error("Error deleting project:", error);
                message.error(`Failed to delete ${labels.offeringPhrase}`);
            }
            dispatch(stopLoader("Deleting project"))
        }
    };

    const handleReset = async () => {
        if (selectedProject && activeProject) {
            try {
                dispatch(startLoader("Resetting project"))
                // Optimistically update cache
                mutateProject({ ...activeProject, files: [] }, false);
                setCurrentView(1);
                await updateProject({ projectId: selectedProject.projectId, files: [] });
                // Revalidate cache after mutation
                mutateProject();
                message.success(`${offeringName} has been reset`);
            } catch (error) {
                console.error("Error resetting project:", error);
                message.error(`Failed to reset ${labels.offeringPhrase}`);
                // Revert on error
                mutateProject();
            }
            dispatch(stopLoader("Resetting project"))
            onCloseModal();
        }
    };

    const handleDuplicateProject = (project: ProjectMetadata) => {
        setProjectToDuplicate(project);
        setDuplicateModalOpen(true);
    };

    const handleDuplicateSubmit = async (
        newName: string,
        newDescription?: string,
        localizedName?: Record<string, string>,
        localizedDescription?: Record<string, string>,
    ) => {
        if (!projectToDuplicate?.projectId) {
            message.error(`Invalid ${labels.offeringPhrase} data`);
            return;
        }

        try {
            dispatch(startLoader("Duplicating project"));
            const result = await duplicateProject(
                projectToDuplicate.projectId,
                newName,
                newDescription,
                localizedName,
                localizedDescription,
            );

            // Auto-select the new project and update local state
            if (result?.summaryData) {
                const newProjectMetadata = result.summaryData;
                setSelectedProject(newProjectMetadata);

                // Update local state directly instead of refetching
                mutateProjects(
                    (current) => current ? {
                        ...current,
                        projects: [...current.projects, newProjectMetadata]
                    } : { projects: [newProjectMetadata], lastDoc: null },
                    { revalidate: false }
                );
            }

            message.success(`"${newName}" created successfully!`);

        } catch (error) {
            console.error("Error duplicating project:", error);
            message.error(`Failed to duplicate ${labels.offeringPhrase}`);
        } finally {
            dispatch(stopLoader("Duplicating project"));
            setDuplicateModalOpen(false);
            setProjectToDuplicate(null);
        }
    };

    // NOTE: Archive/Unarchive functions removed - use active flag instead

    const handleDeleteProjectFromSelector = async (project: ProjectMetadata) => {
        if (!project.projectId) {
            message.error(`Invalid ${labels.offeringPhrase} data`);
            return;
        }

        try {
            dispatch(startLoader("Deleting project"));
            await deleteProject(project.projectId);

            // Update local state directly instead of refetching
            mutateProjects(
                (current) => current ? {
                    ...current,
                    projects: current.projects.filter(p => p.projectId !== project.projectId)
                } : current,
                { revalidate: false }
            );

            const projectName = getLocalizedText(project.name, undefined, getPrimaryLocalizedLanguage(project.name, 'en'), 'Untitled');
            message.success(`"${projectName}" deleted successfully`);

            // If deleted project was selected, clear selection
            if (selectedProject?.projectId === project.projectId) {
                setSelectedProject(null);
                setCurrentView(1);
            }
        } catch (error) {
            console.error("Error deleting project:", error);
            message.error(`Failed to delete ${labels.offeringPhrase}`);
        } finally {
            dispatch(stopLoader("Deleting project"));
        }
    };

    const onCloseModal = () => {
        const defaultLanguage = storeDetails?.defaultLanguage || DefaultLanguage;
        setConfirmActionVisible(false);
        setConfirmActionType(null);
        setIsModalOpen(false);
        setProjectFormLanguages([defaultLanguage]);
        setProjectFormSelectedLanguage(defaultLanguage);
        setProjectNameDrafts({});
        setProjectDescriptionDrafts({});
    }

    const openModal = async (project?: ProjectMetadata) => {
        if (project) {
            const detailedProject = activeProject?.projectId === project.projectId
                ? activeProject
                : await getProjectDataWithoutLoader(project.projectId!);
            const languages = getProjectManagedLanguages(detailedProject, storeDetails);
            const selectedLanguage = getProjectPreferredLanguage(detailedProject, storeDetails);
            const nextNameDrafts = buildProjectLocalizedDrafts(detailedProject?.name || project.name, languages);
            const nextDescriptionDrafts = buildProjectLocalizedDrafts(detailedProject?.description || project.description, languages);
            setEditingProject(project);
            setProjectFormLanguages(languages);
            setProjectFormSelectedLanguage(selectedLanguage);
            setProjectNameDrafts(nextNameDrafts);
            setProjectDescriptionDrafts(nextDescriptionDrafts);
            form.setFieldsValue({
                active: (project as any).active !== false,
                isDefault: project.isDefault === true,
                projectImage: project.projectImage || null,
            });
        } else {
            const defaultLanguage = storeDetails?.defaultLanguage || DefaultLanguage;
            setEditingProject(null);
            setProjectFormLanguages([defaultLanguage]);
            setProjectFormSelectedLanguage(defaultLanguage);
            setProjectNameDrafts({ [defaultLanguage]: '' });
            setProjectDescriptionDrafts({ [defaultLanguage]: '' });
            form.resetFields();
            form.setFieldsValue({
                active: true,
                isDefault: !(projectsData?.projects || []).some((project: any) => project?.isDefault === true),
                projectImage: null,
            });
        }
        setIsModalOpen(true);
    };

    useImageBatchJobListener({ project: selectedProject, setActiveBatchImageJob });

    const handleLanguageToggle = (newLanguages: string[]) => {
        if (!activeProject) return;
        // Update cache optimistically
        mutateProject({ ...activeProject, languages: newLanguages }, false);
    };

    const handlePdfSave = (files: any[], action: string) => {
        const projectDataCopy = { ...activeProject };
        if (!Boolean(projectDataCopy.files?.length)) {
            projectDataCopy.files = [];
        }
        projectDataCopy.files = [...projectDataCopy.files, ...files];
        if (action == "quick-action-upload") {
            handleUploadAndContinue(projectDataCopy);
        } else {
            mutateProject(projectDataCopy, false);
        }
        setPdfFiles({ images: [], action: "" });
    };

    const handlePdfCancel = () => {
        cancelPdfRef.current = true;
        setPdfFiles({ images: [], action: "" });
        setPdfPagesCount(null);
        setFileProcessingId(null);
        message.success('PDF processing cancelled - all remaining files skipped');
        // Reset cancel flag after a longer delay to ensure all files are skipped
        setTimeout(() => {
            cancelPdfRef.current = false;
            console.log('Cancel flag reset - ready for new uploads');
        }, 3000);
    };

    // Derived projects list from SWR (single source of truth)
    const projectsList = projectsData?.projects || [];

    // Auto-select first project + handle SWR errors
    useEffect(() => {
        // Auto-select first project if none selected
        if (!selectedProject && projectsList.length > 0) {
            setSelectedProject(projectsList[0]);
        }
        // Handle errors
        if (projectsError) {
            console.error('[ProjectsPage] Projects error:', projectsError);
            message.error(`Failed to load ${labels.offeringPhrase} data`);
        }
        if (projectError) {
            console.error('[ProjectsPage] Project error:', projectError);
            message.error(`Failed to load ${labels.offeringPhrase} data`);
        }
    }, [projectsList.length, projectsError, projectError]);

    // Smart initial view: Auto-navigate to Editor if project has processed files
    useEffect(() => {
        if (!activeProject?.files?.length) return;

        // If ALL files are processed → go to Editor (view 2)
        const allProcessed = activeProject.files.every(f => f.extractedData);
        if (allProcessed && currentView === 1) {
            setCurrentView(2);
        }
    }, [activeProject?.projectId]); // Only run when project changes, not on every file update

    useEffect(() => {
        // Guard: Only process when PDF conversion is complete AND we have a target count
        if (pdfPagesCount && pdfFiles.images.length === pdfPagesCount) {
            setFileProcessingId(null);
            setPdfPagesCount(null);
            const sortedList = pdfFiles.images.filter((page) => page.url).sort((a, b) => a.fileId.localeCompare(b.fileId));
            setPdfFiles({ images: sortedList, action: pdfFiles.action });
        }
    }, [pdfFiles.images.length, pdfPagesCount]);

    /**
     * Timeout wrapper - wraps a promise with a timeout
     * If promise doesn't resolve within PROCESSING_TIMEOUT (2 minutes), it rejects
     * 
     * @see ASSESSMENT-01-UPLOAD.md Task 14: Processing Timeout
     */
    const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = PROCESSING_TIMEOUT): Promise<T> => {
        return Promise.race([
            promise,
            new Promise<T>((_, reject) =>
                setTimeout(() => reject(new Error(`Processing timeout after ${timeoutMs / 1000} seconds`)), timeoutMs)
            )
        ]);
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // UPLOAD & CREATE JOB - Job Queue Only (No legacy code)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Upload files and create processing job
     * 
     * Flow:
     * 1. Upload ALL files to Firebase Storage in parallel
     * 2. Create job document with uploaded file URLs
     * 3. Return job ID for tracking
     * 
     * Server handles:
     * - AI extraction
     * - Data redistribution
     * - Saving to project
     */
    const maybeAcceptBusinessIdentitySuggestions = useCallback(async (
        result: Awaited<ReturnType<typeof runMenuIntakeIdentityPreflight>> | null,
    ) => {
        const suggestions = buildBusinessIdentitySuggestions(result, storeDetails);
        if (!suggestions.length || !storeDetails?.storeId) return;

        let selectedFields = suggestions.map((suggestion) => suggestion.field);
        await new Promise<void>((resolve) => {
            Modal.confirm({
                title: 'Save detected business details?',
                content: (
                    <BusinessIdentitySuggestionList
                        suggestions={suggestions}
                        onSelectionChange={(fields) => {
                            selectedFields = fields;
                        }}
                    />
                ),
                okText: 'Save selected',
                cancelText: 'Skip',
                onCancel: () => resolve(),
                onOk: async () => {
                    if (!selectedFields.length) {
                        resolve();
                        return;
                    }

                    const updates = buildBusinessIdentityUpdatePayload(suggestions, selectedFields);
                    if (!Object.keys(updates).length) {
                        resolve();
                        return;
                    }

                    try {
                        await updateStore({
                            storeId: storeDetails.storeId,
                            tenantId: storeDetails.tenantId,
                            ...updates,
                        });
                        setStoreDetails((previous: any) => ({ ...previous, ...updates }));
                        message.success('Business details updated');
                    } catch (error: any) {
                        message.error(error?.message || 'Could not update business details.');
                    } finally {
                        resolve();
                    }
                },
            });
        });
    }, [setStoreDetails, storeDetails]);

    const confirmMenuIntakeDecision = useCallback(async (
        projectId: string,
        files: MenuFileToProcess[],
        sourceProject: Project,
    ): Promise<MenuIntakeDecisionResult> => {
        try {
            const result = await runMenuIntakeIdentityPreflight({ projectId, files });
            const decision = result?.decision;
            const validIndexes = new Set(result?.validation?.validMenuFileIndexes || files.map((_, index) => index + 1));
            const filesForExtraction = files.filter((_, index) => validIndexes.has(index + 1));
            const ignoredFiles = files.filter((_, index) => !validIndexes.has(index + 1));

            if (filesForExtraction.length === 0) {
                message.error('We could not find a clear menu or price list in this upload.');
                return { action: 'cancel' };
            }

            if (!decision || decision.severity === 'none') {
                await maybeAcceptBusinessIdentitySuggestions(result);
                return { action: 'continue', files: filesForExtraction, ignoredFiles };
            }

            if (decision.severity === 'block') {
                message.error(decision.message);
                return { action: 'cancel' };
            }

            return await new Promise<MenuIntakeDecisionResult>((resolve) => {
                const canCreateNewProject = decision.secondaryAction === 'create_new_project';
                Modal.confirm({
                    title: decision.title,
                    content: (
                        <Flex gap={8} vertical>
                            <Typography.Text>{decision.message}</Typography.Text>
                            {result?.identity?.businessName ? (
                                <Typography.Text type="secondary">
                                    Uploaded menu: {result.identity.businessName}
                                </Typography.Text>
                            ) : null}
                        </Flex>
                    ),
                    okText: decision.severity === 'confirm' ? 'Add here anyway' : 'Continue',
                    cancelText: canCreateNewProject
                        ? 'Create new menu'
                        : decision.primaryAction === 'upload_more'
                            ? 'Upload more files'
                            : 'Cancel',
                    onOk: async () => {
                        await maybeAcceptBusinessIdentitySuggestions(result);
                        resolve({ action: 'continue', files: filesForExtraction, ignoredFiles });
                    },
                    onCancel: async () => {
                        if (!canCreateNewProject) {
                            resolve({ action: 'cancel' });
                            return;
                        }

                        try {
                            const projectPayload: ProjectCreationPayload = {
                                name: result?.identity?.businessName || 'New menu',
                                ...(sourceProject.languages?.length ? { languages: sourceProject.languages } : {}),
                                ...(sourceProject.defaultLanguage ? { defaultLanguage: sourceProject.defaultLanguage } : {}),
                            };
                            const newProject = await addProject(projectPayload);
                            if (!newProject?.projectId) {
                                throw new Error('Could not create a new menu.');
                            }

                            const projectMetadata = {
                                ...newProject.summaryData,
                                projectId: newProject.projectId,
                            } as ProjectMetadata;
                            setSelectedProject(projectMetadata);
                            mutateProjects(
                                (current) => current ? {
                                    ...current,
                                    projects: current.projects.some((project) => project.projectId === projectMetadata.projectId)
                                        ? current.projects
                                        : [...current.projects, projectMetadata],
                                } : { projects: [projectMetadata], lastDoc: null },
                                { revalidate: false },
                            );
                            message.success('Created a new menu for this upload');
                            resolve({
                                action: 'create_new_project',
                                projectId: newProject.projectId,
                                projectMetadata,
                                files: filesForExtraction,
                                ignoredFiles,
                            });
                        } catch (error: any) {
                            message.error(error?.message || 'Could not create a new menu.');
                            resolve({ action: 'cancel' });
                        }
                    },
                });
            });
        } catch (error: any) {
            console.warn('[MenuIntakeIdentity] Preflight skipped:', error?.message || error);
            return { action: 'continue', files, ignoredFiles: [] };
        }
    }, [maybeAcceptBusinessIdentitySuggestions, mutateProjects]);

    const uploadAndCreateJob = async (
        filesToProcess: ProjectFileType[],
        projectDataCopy: Project
    ): Promise<{ jobId: string; uploadedUrls: Map<string, string>; projectId: string } | null> => {
        const startTime = Date.now();
        console.log('[JobQueue] Starting uploadAndCreateJob with', filesToProcess.length, 'files');

        // Step 1: Upload ALL files to Firebase Storage in parallel
        console.log(`[JobQueue] Uploading ${filesToProcess.length} files in parallel...`);
        const uploadPromises = filesToProcess.map(file =>
            uploadFile({ url: file.url, type: file.type, uid: file.uid })
                .then(url => ({ uid: file.uid, url, file }))
                .catch(err => ({ uid: file.uid, url: null, file, error: err }))
        );

        const uploadResults = await Promise.all(uploadPromises);
        const uploadedUrls = new Map<string, string>();
        const successfulUploads: MenuFileToProcess[] = [];

        uploadResults.forEach(result => {
            if (result.url) {
                uploadedUrls.set(result.uid, result.url);
                successfulUploads.push({
                    url: result.url,
                    type: result.file.type,
                    uid: result.file.uid,
                    name: result.file.name,
                    size: result.file.size || 0
                });
            } else {
                console.error(`[JobQueue] Failed to upload ${result.file.name}:`, (result as any).error);
            }
        });

        if (successfulUploads.length !== filesToProcess.length) {
            throw new Error(`${filesToProcess.length - successfulUploads.length} file(s) failed to upload. Please check storage quota and try again.`);
        }

        if (successfulUploads.length === 0) {
            throw new Error('All file uploads failed');
        }

        console.log(`[JobQueue] ${successfulUploads.length}/${filesToProcess.length} files uploaded in ${Date.now() - startTime}ms`);

        const intakeDecision = await confirmMenuIntakeDecision(projectDataCopy.projectId, successfulUploads, projectDataCopy);
        if (intakeDecision.action === 'cancel') {
            await Promise.allSettled(successfulUploads.map(file => deleteFileByUrl(file.url)));
            return null;
        }
        await Promise.allSettled(intakeDecision.ignoredFiles.map(file => deleteFileByUrl(file.url)));
        const filesForJob = intakeDecision.files;
        if (filesForJob.length === 0) {
            await Promise.allSettled(successfulUploads.map(file => deleteFileByUrl(file.url)));
            return null;
        }
        const targetProjectId = intakeDecision.action === 'create_new_project'
            ? intakeDecision.projectId
            : projectDataCopy.projectId;

        // Step 2: Create job with uploaded files
        const targetLanguages = GlobalLanguagesList.filter(lang => projectDataCopy.languages.includes(lang.code));

        console.log(`[JobQueue] Creating processing job...`);
        const { checkExistingActiveJob } = await import('@lib/firebase/menuProcessing');
        const existingJobId = await checkExistingActiveJob(targetProjectId);
        if (existingJobId) {
            await Promise.allSettled(filesForJob.map(file => deleteFileByUrl(file.url)));
            return { jobId: existingJobId, uploadedUrls, projectId: targetProjectId };
        }

        const { jobId } = await withTimeout(
            createProcessingJob({
                files: filesForJob,
                targetLanguages,
                projectId: targetProjectId,
                businessType: storeDetails?.businessType,
            }),
            PROCESSING_TIMEOUT * filesToProcess.length,
        );

        console.log(`[JobQueue] Job created: ${jobId} - createProcessingJob should have already triggered it`);
        return { jobId, uploadedUrls, projectId: targetProjectId };
    };

    /**
     * Handle "Continue" button click
     * 
     * Flow:
     * 1. Upload files to Storage
     * 2. Create job document in Firestore
     * 3. Update project with uploaded URLs
     * 4. Set active job ID for tracking
     * 5. useEffect handles job completion (refetches project data)
     */
    const handleUploadAndContinue = async (activeProject: Project | null) => {
        if (!activeProject || !selectedProject) return;

        const projectDataCopy: Project = removeObjRef(activeProject);

        // Check if all files are already processed (have extractedData)
        const allFilesProcessed = projectDataCopy.files?.length > 0 &&
            projectDataCopy.files.every(f => f.extractedData);

        if (allFilesProcessed) {
            // All files already processed - just navigate to editor
            setCurrentView(2);
            return;
        }

        try {
            // Get files that need processing (base64 = not yet uploaded)
            const filesToProcess = projectDataCopy.files?.filter(f => f.url?.includes('base64')) || [];

            if (filesToProcess.length === 0) {
                // No new files to upload, but some files may not have extractedData
                // This can happen if files were uploaded but processing failed
                // Navigate to editor anyway so user can see what's there
                setCurrentView(2);
                return;
            }

            console.log(`[JobQueue] Processing ${filesToProcess.length} files...`);
            setFileProcessingId(filesToProcess[0].uid);

            // Upload files and create job
            const jobPayload = await uploadAndCreateJob(filesToProcess, projectDataCopy);
            if (!jobPayload) {
                setFileProcessingId(null);
                return;
            }
            const { jobId, projectId: targetProjectId } = jobPayload;

            console.log(`[JobQueue] Job created: ${jobId}, waiting for server processing...`);

            // Server already saved files + extractedData to the project doc
            // (the callable blocks until processing is complete)
            // Just refetch project data to pick up backend changes
            if (targetProjectId === projectDataCopy.projectId) {
                await mutateProject();
            }

            // Set active job ID - the useEffect will handle completion
            console.log('[JobQueue] Setting activeProcessingJobId from job creation:', jobId);
            setActiveProcessingJobId(jobId);

            // NOTE: Don't clear fileProcessingId here - it will be cleared when job completes

        } catch (error: any) {
            console.error('[JobQueue] Failed:', error);
            setFileProcessingId(null);
            message.error(`Processing failed: ${error.message || 'Unknown error'}`);
        }
    };

    const handleRemove = (id: string) => {
        if (activeProject?.files) {
            const updatedFiles = activeProject.files.filter(file => file.uid !== id);
            const projectDataCopy: Project = removeObjRef(activeProject);
            projectDataCopy.files = updatedFiles;
            mutateProject(projectDataCopy, false);

            // If no files left, move back to view 1
            if (updatedFiles.length === 0) {
                setCurrentView(1);
            }
        }
    };

    // Clear all unprocessed files (files without extractedData)
    const handleClearAll = () => {
        if (activeProject?.files) {
            // Keep only files that have been processed (have extractedData)
            const updatedFiles = activeProject.files.filter(file => file.extractedData);
            const projectDataCopy: Project = removeObjRef(activeProject);
            projectDataCopy.files = updatedFiles;
            mutateProject(projectDataCopy, false);

            // Show success message
            const removedCount = activeProject.files.length - updatedFiles.length;
            message.success(`Removed ${removedCount} unprocessed ${removedCount === 1 ? 'file' : 'files'}`);

            // If no files left, move back to view 1
            if (updatedFiles.length === 0) {
                setCurrentView(1);
            }
        }
    };

    // Error Recovery: Retry single failed file
    const handleRetryFailedFile = async (fileUid: string) => {
        const failedFile = failedFiles.find(f => f.uid === fileUid);
        if (!failedFile) return;

        message.info(`Retrying ${failedFile.name}...`);

        // Remove from failed files list
        setFailedFiles(prev => prev.filter(f => f.uid !== fileUid));

        // Note: The actual file data is lost, so we can't retry automatically
        // User needs to re-upload. Show helpful message.
        message.warning(`Please re-upload "${failedFile.name}" to try again`);
    };

    // Error Recovery: Retry all failed files
    const handleRetryAllFailed = async () => {
        if (failedFiles.length === 0) return;

        message.info(`Please re-upload ${failedFiles.length} failed file(s) to try again`);

        // Clear failed files list
        setFailedFiles([]);
    };

    // Error Recovery: Dismiss all failures
    const handleDismissFailures = () => {
        setFailedFiles([]);
        message.info('Failed files cleared. You can try uploading them again.');
    };

    /**
     * Comprehensive file validation with:
     * - File type validation (JPG, PNG, WebP, PDF only)
     * - File size validation (10MB for images, 50MB for PDFs)
     * - Magic bytes validation (prevents fake file extensions)
     * - Duplicate detection
     * - Total upload size limit (200MB per session)
     */
    const validateSelectedFile = async (file: any, fileList: any[] = []) => {
        // Get all files in current upload session
        const allFiles = fileList.map(f => f.originFileObj || f).filter(Boolean);

        // Run comprehensive validation
        const isValid = await validateFile(
            file,
            allFiles,
            activeProject?.files || []
        );

        if (isValid === Upload.LIST_IGNORE) {
            return Upload.LIST_IGNORE;
        }

        // Generate unique file ID
        file.uid = generateMenuFileUid(tenantDetails.tenantId, storeDetails.storeId);

        return false; // Don't auto-upload
    }

    const onSelectFile = async (info: any, action: string = "") => {
        const file = info.file;

        // Handle PDF files differently
        if (file.type === 'application/pdf') {
            setPdfFiles(prev => ({
                images: [...(prev?.images || []), file],
                action
            }));
            return;
        }

        const newFileList = [];
        const projectDataCopy: Project = removeObjRef(activeProject)

        // Generate preview URLs for new files with optimization
        await Promise.all(
            [...info.fileList].map(async (file) => {
                if (!file.url && file.originFileObj && file.type?.startsWith('image/')) {
                    // Get base64 first
                    const rawBase64 = await getBase64(file.originFileObj);

                    // Optimize image: resize to max 1500px and compress to 70% JPEG
                    // This reduces upload time and storage costs while maintaining OCR quality
                    try {
                        const optimized = await optimizeImage(rawBase64, MENU_IMAGE_CONFIG);
                        file.url = optimized.dataUrl;

                        if (optimized.wasResized) {
                            console.log(`[Image Optimization] ${file.name}: ${optimized.originalWidth}x${optimized.originalHeight} → ${optimized.width}x${optimized.height}, ${Math.round(optimized.compressionRatio * 100)}% of original size`);
                        }
                    } catch (err) {
                        // Fallback to original if optimization fails
                        console.warn(`[Image Optimization] Failed for ${file.name}, using original:`, err);
                        file.url = rawBase64;
                    }

                    newFileList.push({
                        uid: file.uid,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        url: file.url || ""
                    })
                }
            })
        );

        if (!Boolean(projectDataCopy.files?.length)) {
            projectDataCopy.files = [];
        }

        projectDataCopy.files = [...projectDataCopy.files, ...newFileList];

        if (action == "quick-action-upload") {
            handleUploadAndContinue(projectDataCopy)
        } else {
            mutateProject(projectDataCopy, false);
        }
    }

    const processsPdf = async (file: any, action: string) => {
        // Check if user cancelled processing (use ref)
        if (cancelPdfRef.current) {
            console.log('PDF processing cancelled by user');
            return null;
        }

        setFileProcessingId(file.uid)

        // Load from CDN to avoid webpack issues
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;

        return new Promise(async (resolve) => {
            script.onload = async () => {
                try {
                    const pdfjsLib = (window as any).pdfjsLib;
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

                    const fileArrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: fileArrayBuffer }).promise;
                    setPdfPagesCount(prev => prev + pdf.numPages);

                    for (let i = 1; i <= pdf.numPages; i++) {
                        // Check cancel flag during page processing (use ref)
                        if (cancelPdfRef.current) {
                            console.log('PDF processing cancelled during page conversion');
                            resolve(null);
                            return;
                        }

                        const page = await pdf.getPage(i);
                        const viewport = page.getViewport({ scale: 1.5 });

                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;

                        await page.render({ canvasContext: context!, viewport: viewport } as any).promise;
                        const pageUrl = canvas.toDataURL('image/jpeg', 0.8);
                        const imageData = {
                            uid: generateMenuFileUid(tenantDetails.tenantId, storeDetails.storeId),
                            name: `${file.name.replace('.pdf', '')}-page-${i + 1}.jpg`,
                            size: Math.round(pageUrl.length * 0.75), // Approximate size from base64
                            type: 'image/jpeg',
                            url: pageUrl,
                            fileId: file.uid
                        }

                        setPdfFiles(prev => ({ images: [...(prev?.images || []), imageData], action }));

                        if (pdf.numPages === i) {
                            resolve(false);
                        }
                    }
                } catch (error) {
                    console.error("error while uploading file", error)
                    resolve(null);
                }
            };

            script.onerror = () => {
                console.error("Failed to load pdfjs-dist from CDN");
                resolve(null);
            };

            document.head.appendChild(script);
        });
    }

    const uploadProps: UploadProps = {
        id: "default-action-upload",
        name: 'file',
        multiple: true,
        disabled: fileProcessingId !== null,
        style: { background: token.colorBgContainer, borderRadius: 15 },
        fileList: activeProject?.files?.map((file) => ({
            uid: file.uid,  // Use src/url as id or generate random
            name: file.name || 'Untitled',
            size: file.size,
            type: file.type,
            status: 'done' as UploadFileStatus,
            url: file.url,
        })),
        accept: '.pdf,.jpg,.jpeg,.png',
        beforeUpload: async (file, fileList) => {
            // Check if user has cancelled PDF processing (use ref for immediate access)
            if (cancelPdfRef.current) {
                console.log('Skipping file due to cancel flag:', file.name);
                return Upload.LIST_IGNORE;
            }

            // Validate file first
            const validationResult = await validateSelectedFile(file, fileList);

            if (validationResult === Upload.LIST_IGNORE) {
                return Upload.LIST_IGNORE;
            }

            // Handle PDF files separately
            if (file.type === 'application/pdf') {
                // Double-check cancel flag before processing (use ref)
                if (cancelPdfRef.current) {
                    console.log('Skipping PDF due to cancel flag:', file.name);
                    return Upload.LIST_IGNORE;
                }
                await processsPdf(file, currentView == 1 ? '' : 'quick-action-upload');
                return Upload.LIST_IGNORE; // Prevent file from being added to the list
            }

            return false; // Don't auto-upload
        },
        onChange: onSelectFile,
        itemRender: (file) => null
    };

    // Debug logging for job state
    // console.log('[ProjectsPage] Render state:', {
    //     fileProcessingId,
    //     jobIsProcessing,
    //     activeProcessingJobId,
    //     jobProgress,
    //     jobCurrentStep,
    //     jobStatus: activeJob?.status,
    //     shouldShowLoadingMessage: Boolean(fileProcessingId) || jobIsProcessing || activeJob?.status === 'pending'
    // });

    return (
        <Flex vertical gap={10}>
            {hasValidSubscriptionAccess(activeSubscription) ? <>

                <ProjectsDataProvider
                    contextData={{ activeProject, setActiveProject: (data: Project) => mutateProject(data, { revalidate: false }), currentView, setCurrentView, activeBatchImageJob, setActiveBatchImageJob }}>
                    <LoadingMessage
                        open={Boolean(fileProcessingId) || jobIsProcessing || activeJob?.status === 'pending'}
                        progress={activeProcessingJobId ? jobProgress : undefined}
                        message={activeProcessingJobId ? jobCurrentStep : undefined}
                        onCancel={activeProcessingJobId ? cancelJob : undefined}
                    />
                    <PdfViewer
                        pdfPagesCount={pdfPagesCount}
                        pdfFiles={pdfFiles}
                        setPdfFiles={setPdfFiles}
                        onSave={handlePdfSave}
                        onCancel={handlePdfCancel}
                    />

                    {/* Master Updates Awareness: Banner + quiet history link for outlet projects */}
                    <MasterUpdateBanner />

                    {/* Show EmptyProjectState only when no projects exist */}
                    {currentView == 1 && projectsList.length === 0 && !Boolean(selectedProject) && (
                        <EmptyProjectState onCreate={() => openModal()} />
                    )}

                    {/* ProjectsSubHeader - Show only in Upload (1) and UI Editor (3) views, Editor (2) has its own header */}
                    {(projectsList.length > 0 || Boolean(selectedProject)) && currentView !== 2 && (
                        <ProjectsSubHeader
                            currentView={currentView}
                            setCurrentView={setCurrentView}
                            projects={projectsList}
                            selectedProject={selectedProject}
                            setSelectedProject={setSelectedProject}
                            onOpenModal={openModal}
                            onDuplicateProject={handleDuplicateProject}
                            onDeleteProject={handleDeleteProjectFromSelector}
                            activeDeviceType={activeDeviceType}
                            setActiveDeviceType={setActiveDeviceType}
                            onPreview={selectedProject?.projectId ? handlePreview : undefined}
                            onShare={selectedProject?.projectId ? () => setIsShareModalOpen(true) : undefined}
                            onPublish={handlePublish}
                            hasChanges={uiEditorHasChanges}
                        />
                    )}

                    {/* Special Menu Card — shown in upload view when a project is selected */}
                    {currentView === 1 && selectedProject?.projectId && activeProject?.files?.length > 0 && (
                        <div style={{ width: '100%', maxWidth: 900, margin: '0 auto 8px' }}>
                            <SpecialMenuCard
                                baseProjectId={selectedProject.projectId}
                                baseProjectLanguages={activeProject?.languages || []}
                                baseProjectName={getLocalizedText(selectedProject.name, undefined, getPrimaryLocalizedLanguage(selectedProject.name, 'en'), 'Untitled')}
                            />
                        </div>
                    )}

                    <Flex vertical style={{ width: '100%' }} align='center' justify='center'>

                        {currentView == 1 && projectsList.length > 0 && <>
                            <Flex gap={20} vertical align='center' justify='center' style={{ width: '100%', maxWidth: 900 }}>

                                {/* When NO files: Show big prominent upload area */}
                                {!activeProject?.files?.length && (
                                    <Dragger {...uploadProps} style={{ minWidth: 700, width: "100%" }}>
                                        <Flex vertical gap={16} align='center' justify='center' style={{ width: '100%', padding: '40px 20px' }}>
                                            <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 8, fontWeight: 600 }}>{labels.uploadLabel}</Typography.Title>
                                            <Typography.Text type="secondary" style={{ textAlign: 'center', fontSize: '16px', maxWidth: 500 }}>
                                                Drag and drop your {labels.offeringLower} photos or PDFs here, or click below to browse
                                            </Typography.Text>
                                            <Typography.Text type="secondary" style={{ textAlign: 'center', fontSize: '13px', color: token.colorTextTertiary }}>
                                                ⚡ We&apos;ll automatically extract items in ~3 minutes
                                            </Typography.Text>
                                            <Flex gap={20} align='center' justify='center'>
                                                <Tooltip title="Upload JPG or PNG images">
                                                    <Button shape='circle' type='text' size='large' icon={<TbFileTypeJpg size={32} />} style={{ height: 56, width: 56, color: token.colorPrimaryTextActive, backgroundColor: token.colorPrimaryBg || '#e6f7ff' }} />
                                                </Tooltip>
                                                <Tooltip title="Upload PDF documents">
                                                    <Button shape='circle' type='text' size='large' icon={<TbFileTypePdf size={32} />} style={{ height: 56, width: 56, color: token.colorErrorTextActive, backgroundColor: token.colorErrorBg || '#fff1f0' }} />
                                                </Tooltip>
                                            </Flex>
                                            <Button
                                                type="primary"
                                                ghost
                                                size="large"
                                                icon={<LuUpload size={20} />}
                                                style={{ paddingLeft: 32, paddingRight: 32, height: 48, fontSize: '16px', fontWeight: 500, marginTop: 8, borderRadius: 12 }}
                                            >
                                                Choose Files to Upload
                                            </Button>
                                        </Flex>
                                        <Typography.Text type="secondary" style={{ fontSize: '13px', display: 'block', textAlign: 'center', padding: '16px 0 12px 0' }}>
                                            Upload multiple files at once • Maximum 10MB per file
                                        </Typography.Text>
                                    </Dragger>
                                )}

                                {/* Error Recovery: Show failed files with retry options */}
                                <ErrorRecoveryAlert
                                    failedFiles={failedFiles}
                                    onRetry={handleRetryFailedFile}
                                    onRetryAll={handleRetryAllFailed}
                                    onDismiss={handleDismissFailures}
                                />

                                {/* When files EXIST: Show file list first, compact upload second */}
                                {activeProject?.files?.length > 0 && (<>
                                    {/* File List - Primary focus when files exist */}
                                    <FileList
                                        fileProcessingId={fileProcessingId}
                                        files={activeProject.files}
                                        onRemove={handleRemove}
                                        onClearAll={handleClearAll}
                                    />

                                    {/* Compact "Add More" upload area */}
                                    <Dragger {...uploadProps} style={{ width: "100%" }}>
                                        <Flex gap={12} align='center' justify='center' style={{ padding: '16px 20px' }}>
                                            <LuFilePlus size={24} style={{ color: token.colorTextSecondary }} />
                                            <Typography.Text type="secondary">
                                                Add more {labels.offeringLower} pages (optional)
                                            </Typography.Text>
                                        </Flex>
                                    </Dragger>

                                    {/* Language Selector */}
                                    <LanguageSelector
                                        description={`Select languages for your ${labels.offeringLower} (you can add more later)`}
                                        selectedLanguages={activeProject?.languages || []}
                                        onLanguageToggle={handleLanguageToggle}
                                        storeActiveLanguages={storeDetails?.activeLanguages}
                                    />
                                </>)}

                                {/* Fixed Continue Button - Always visible at bottom */}
                                {activeProject?.files?.length > 0 && (
                                    <Flex
                                        justify="center"
                                        align="center"
                                        style={{
                                            zIndex: 14,
                                            position: "fixed",
                                            width: "max-content",
                                            right: '50%',
                                            transform: 'translateX(50%)',
                                            bottom: 24,
                                            background: token.colorBgContainer,
                                            padding: "8px 12px",
                                            borderRadius: 8,
                                            boxShadow: token.boxShadow,
                                        }}
                                    >
                                        <Button
                                            onClick={() => handleUploadAndContinue(activeProject)}
                                            type="primary"
                                            icon={activeProject?.files?.some(file => !file.extractedData) ? <LuUpload size={20} /> : <LuArrowRight size={20} />}
                                            size='large'
                                            shape='round'
                                            disabled={!selectedProject || fileProcessingId !== null}
                                            loading={fileProcessingId !== null}
                                        >
                                            {fileProcessingId !== null
                                                ? 'Processing...'
                                                : activeProject?.files?.some(file => !file.extractedData)
                                                    ? 'Upload & Continue'
                                                    : 'Continue to Editor'}
                                        </Button>
                                    </Flex>
                                )}

                                {/* Only show tips when no files uploaded yet */}
                                {!activeProject?.files?.length && (
                                    <Flex
                                        vertical
                                        gap={16}
                                        style={{
                                            marginTop: 32,
                                            width: '100%',
                                            maxWidth: 700
                                        }}
                                    >

                                        {/* Simple Process Flow - Only show when no files */}
                                        <Flex
                                            vertical
                                            gap={16}
                                            style={{
                                                marginTop: 24,
                                                width: '100%',
                                                maxWidth: 700,
                                                padding: '24px 20px',
                                                background: token.colorBgContainer,
                                                borderRadius: 16,
                                                border: `1px solid ${token.colorBorder}`
                                            }}
                                        >
                                            <Typography.Text strong style={{ fontSize: 14, textAlign: 'center' }}>
                                                Simple 3-Step Process
                                            </Typography.Text>

                                            <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                                                {/* Step 1 */}
                                                <Flex vertical gap={8} align="center" style={{ flex: 1 }}>
                                                    <div style={{
                                                        width: 48,
                                                        height: 48,
                                                        borderRadius: '50%',
                                                        background: `linear-gradient(135deg, ${token.colorPrimaryBg}, ${token.colorPrimaryBgHover})`,
                                                        border: `2px solid ${token.colorPrimary}`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <LuUpload size={22} color={token.colorPrimary} />
                                                    </div>
                                                    <Typography.Text strong style={{ fontSize: 13 }}>
                                                        Upload Menu
                                                    </Typography.Text>
                                                    <Typography.Text type="secondary" style={{ fontSize: 11, textAlign: 'center' }}>
                                                        Photos or PDFs
                                                    </Typography.Text>
                                                </Flex>

                                                {/* Arrow 1 */}
                                                <LuArrowRight size={20} color={token.colorTextTertiary} style={{ margin: '0 8px' }} />

                                                {/* Step 2 */}
                                                <Flex vertical gap={8} align="center" style={{ flex: 1 }}>
                                                    <div style={{
                                                        width: 48,
                                                        height: 48,
                                                        borderRadius: '50%',
                                                        background: `linear-gradient(135deg, ${token.colorSuccessBg}, ${token.colorSuccessBgHover})`,
                                                        border: `2px solid ${token.colorSuccess}`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <LuZap size={22} color={token.colorSuccess} />
                                                    </div>
                                                    <Typography.Text strong style={{ fontSize: 13 }}>
                                                        We Extract
                                                    </Typography.Text>
                                                    <Typography.Text type="secondary" style={{ fontSize: 11, textAlign: 'center' }}>
                                                        Automatic digitization
                                                    </Typography.Text>
                                                </Flex>

                                                {/* Arrow 2 */}
                                                <LuArrowRight size={20} color={token.colorTextTertiary} style={{ margin: '0 8px' }} />

                                                {/* Step 3 */}
                                                <Flex vertical gap={8} align="center" style={{ flex: 1 }}>
                                                    <div style={{
                                                        width: 48,
                                                        height: 48,
                                                        borderRadius: '50%',
                                                        background: `linear-gradient(135deg, ${token.colorWarningBg}, ${token.colorWarningBgHover})`,
                                                        border: `2px solid ${token.colorWarning}`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <LuRocket size={22} color={token.colorWarning} />
                                                    </div>
                                                    <Typography.Text strong style={{ fontSize: 13 }}>
                                                        Go Live
                                                    </Typography.Text>
                                                    <Typography.Text type="secondary" style={{ fontSize: 11, textAlign: 'center' }}>
                                                        Share with customers
                                                    </Typography.Text>
                                                </Flex>
                                            </Flex>
                                        </Flex>

                                        {/* Quick Tips */}
                                        <Flex vertical gap={8} align="center">
                                            <Typography.Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                                                ✨ What You&apos;ll Get
                                            </Typography.Text>
                                        </Flex>

                                        <Flex gap={12} wrap="wrap" justify="center">
                                            {/* Feature 1 */}
                                            <Flex
                                                gap={12}
                                                align="center"
                                                style={{
                                                    padding: '12px 20px',
                                                    background: token.colorBgContainer,
                                                    borderRadius: 12,
                                                    border: `1px solid ${token.colorBorderSecondary}`,
                                                    flex: '1 1 200px',
                                                    minWidth: 200
                                                }}
                                            >
                                                <div style={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: '50%',
                                                    background: token.colorPrimaryBg,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    <LuZap size={18} color={token.colorPrimary} />
                                                </div>
                                                <Flex vertical gap={2}>
                                                    <Typography.Text strong style={{ fontSize: 13 }}>
                                                        Automatic Extraction
                                                    </Typography.Text>
                                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                                        Automatic menu digitization
                                                    </Typography.Text>
                                                </Flex>
                                            </Flex>

                                            {/* Feature 2 */}
                                            <Flex
                                                gap={12}
                                                align="center"
                                                style={{
                                                    padding: '12px 20px',
                                                    background: token.colorBgContainer,
                                                    borderRadius: 12,
                                                    border: `1px solid ${token.colorBorderSecondary}`,
                                                    flex: '1 1 200px',
                                                    minWidth: 200
                                                }}
                                            >
                                                <div style={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: '50%',
                                                    background: token.colorSuccessBg,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    <LuGlobe2 size={18} color={token.colorSuccess} />
                                                </div>
                                                <Flex vertical gap={2}>
                                                    <Typography.Text strong style={{ fontSize: 13 }}>
                                                        Multi-Language
                                                    </Typography.Text>
                                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                                        Instant translations
                                                    </Typography.Text>
                                                </Flex>
                                            </Flex>

                                            {/* Feature 3 */}
                                            <Flex
                                                gap={12}
                                                align="center"
                                                style={{
                                                    padding: '12px 20px',
                                                    background: token.colorBgContainer,
                                                    borderRadius: 12,
                                                    border: `1px solid ${token.colorBorderSecondary}`,
                                                    flex: '1 1 200px',
                                                    minWidth: 200
                                                }}
                                            >
                                                <div style={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: '50%',
                                                    background: token.colorWarningBg,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    <LuSparkles size={18} color={token.colorWarning} />
                                                </div>
                                                <Flex vertical gap={2}>
                                                    <Typography.Text strong style={{ fontSize: 13 }}>
                                                        {offeringName}
                                                    </Typography.Text>
                                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                                        {labels.digitalLabel.charAt(0).toUpperCase() + labels.digitalLabel.slice(1)} ready
                                                    </Typography.Text>
                                                </Flex>
                                            </Flex>
                                        </Flex>
                                    </Flex>
                                )}
                            </Flex>
                        </>}

                        {currentView == 2 && <>
                            <Flex gap={10} vertical align='center' justify='center' style={{ width: '100%' }}>
                                <Suspense fallback={<Spin size="large" />}>
                                    <Editor
                                        selectedProject={selectedProject}
                                        onRemove={handleRemove}
                                        addFileButton={
                                            <Upload {...uploadProps} id="quick-action-upload" onChange={(info) => onSelectFile(info, 'quick-action-upload')}>
                                                <Button icon={<LuFilePlus />}>Add Menu</Button>
                                            </Upload>
                                        }
                                    />
                                </Suspense>
                            </Flex>
                        </>}

                        {currentView == 3 && <>
                            <Flex gap={10} vertical align='center' justify='center' style={{ width: '100%' }}>
                                <Suspense fallback={<Spin size="large" />}>
                                    {tenantDetails?.businessEntityType == 'B2B' ?
                                        <B2BView />
                                        :
                                        <B2CView
                                            ref={b2cViewRef}
                                            activeDeviceType={activeDeviceType}
                                            setHasChanges={setUiEditorHasChanges}
                                        />
                                    }
                                </Suspense>
                            </Flex>
                        </>}
                    </Flex>
                    {/* Help button - Fixed at bottom right */}
                    {currentView == 1 && !activeProject?.files?.length && (
                        <Tooltip title="Learn how the process works" placement="left">
                            <Button
                                shape='circle'
                                icon={<LuInfo size={20} />}
                                size="large"
                                onClick={() => setIsGuideModalOpen(true)}
                                style={{
                                    position: "fixed",
                                    right: 24,
                                    bottom: 24,
                                    zIndex: 1,
                                    width: 56,
                                    height: 56,
                                    boxShadow: token.boxShadow
                                }}
                            />
                        </Tooltip>
                    )}
                </ProjectsDataProvider>
                <ProjectEditModal
                    currentDefaultProjectName={(() => {
                        const currentDefaultProject = (projectsData?.projects || []).find((project: any) => project?.isDefault === true);
                        if (!currentDefaultProject) return null;
                        return getLocalizedText(
                            currentDefaultProject.name,
                            undefined,
                            getPrimaryLocalizedLanguage(currentDefaultProject.name, 'en'),
                            ''
                        );
                    })()}
                    isOpen={isModalOpen}
                    editingProject={editingProject}
                    form={form}
                    languages={projectFormLanguages}
                    nameValue={projectNameDrafts[projectFormSelectedLanguage] || ''}
                    descriptionValue={projectDescriptionDrafts[projectFormSelectedLanguage] || ''}
                    onCancel={onCloseModal}
                    onDescriptionChange={(value) => setProjectDescriptionDrafts((previous) => ({
                        ...previous,
                        [projectFormSelectedLanguage]: value,
                    }))}
                    onLanguageChange={(languageCode) => setProjectFormSelectedLanguage(languageCode)}
                    onNameChange={(value) => setProjectNameDrafts((previous) => ({
                        ...previous,
                        [projectFormSelectedLanguage]: value,
                    }))}
                    onSubmit={() => form.validateFields().then(handleProjectEdit)}
                    onReset={() => {
                        setConfirmActionType('reset');
                        setConfirmActionVisible(true);
                    }}
                    referenceDescription={projectDescriptionDrafts[getProjectPreferredLanguage({
                        description: editingProject?.description,
                        languages: projectFormLanguages,
                        name: editingProject?.name,
                    }, storeDetails)] || ''}
                    referenceLanguage={getProjectPreferredLanguage({
                        description: editingProject?.description,
                        languages: projectFormLanguages,
                        name: editingProject?.name,
                    }, storeDetails)}
                    referenceName={projectNameDrafts[getProjectPreferredLanguage({
                        description: editingProject?.description,
                        languages: projectFormLanguages,
                        name: editingProject?.name,
                    }, storeDetails)] || ''}
                    selectedLanguage={projectFormSelectedLanguage}
                />
                <ProjectConfirmModal
                    isOpen={confirmActionVisible}
                    actionType={confirmActionType}
                    onDelete={handleDelete}
                    onReset={handleReset}
                    onCancel={onCloseModal}
                    fileCount={activeProject?.files?.length || 0}
                    projectName={editingProject ? getLocalizedText(editingProject.name, undefined, getPrimaryLocalizedLanguage(editingProject.name, 'en'), 'Untitled') : undefined}
                />
                <WelcomeModal
                    isOpen={isFirstTime}
                    onClose={handleWelcomeClose}
                    onStart={handleWelcomeStart}
                />
                <ProcessGuideModal
                    isOpen={isGuideModalOpen}
                    onClose={() => setIsGuideModalOpen(false)}
                />
                <ProjectDuplicateModal
                    open={duplicateModalOpen}
                    project={projectToDuplicate}
                    onCancel={() => {
                        setDuplicateModalOpen(false);
                        setProjectToDuplicate(null);
                    }}
                    onDuplicate={handleDuplicateSubmit}
                />
                {selectedProject?.projectId && (
                    <ShareModal
                        open={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        projectId={selectedProject.projectId}
                        projectName={getLocalizedText(selectedProject.name, undefined, getPrimaryLocalizedLanguage(selectedProject.name, 'en'), 'Untitled')}
                        isDefaultProject={selectedProject.isDefault}
                        storeName={storeDetails?.name}
                        storeDescription={getLocalizedText(
                            storeDetails?.metaDescription,
                            storeDetails?.defaultLanguage || storeDetails?.activeLanguages?.[0] || storeDetails?.language || 'en',
                            getPrimaryLocalizedLanguage(
                                storeDetails?.metaDescription,
                                storeDetails?.defaultLanguage || storeDetails?.activeLanguages?.[0] || storeDetails?.language || 'en',
                            ),
                            getLocalizedText(
                                storeDetails?.tagline,
                                storeDetails?.defaultLanguage || storeDetails?.activeLanguages?.[0] || storeDetails?.language || 'en',
                                getPrimaryLocalizedLanguage(
                                    storeDetails?.tagline,
                                    storeDetails?.defaultLanguage || storeDetails?.activeLanguages?.[0] || storeDetails?.language || 'en',
                                ),
                                '',
                            ),
                        )}
                        storeLogo={storeDetails?.logo}
                        subdomain={storeDetails?.subdomain}
                        customDomain={storeDetails?.customDomain}
                        // PDF freshness awareness
                        menuModifiedOn={selectedProject?.modifiedOn}
                        // PDF Export data
                        items={activeProject?.files?.flatMap(f => f.extractedData?.data?.items || []) || []}
                        categories={activeProject?.files?.flatMap(f => f.extractedData?.data?.categories || []) || []}
                        language={activeProject?.languages?.[0] || 'en'}
                        languages={activeProject?.languages || []}
                        currency={storeDetails?.currencySymbol || ''}
                        businessType={storeDetails?.businessType}
                    />
                )}
                {/* Preview modal for Upload/Editor views (UI Editor has its own in B2CView) */}
                {activeProject?.projectId && currentView !== 3 && (
                    <PreviewModal
                        projectData={activeProject}
                        storeDetails={storeDetails}
                        previewModalOpen={isPreviewModalOpen}
                        setPreviewModalOpen={setIsPreviewModalOpen}
                        activeLanguage={previewLanguage}
                        setActiveLanguage={setPreviewLanguage}
                    />
                )}

                {/* Extraction Review Modal - shown when re-extraction needs user approval */}
                {showReviewScreen && comparisonResult && activeProcessingJobId && selectedProject?.projectId && (
                    <ExtractionJobReviewModal
                        open={showReviewScreen}
                        projectId={selectedProject.projectId}
                        jobId={activeProcessingJobId}
                        comparisonResult={comparisonResult}
                        primaryLang={activeProject?.languages?.[0] || 'en'}
                        onSaveComplete={handleReviewSaveComplete}
                        onDiscard={handleReviewDiscard}
                    />
                )}

                {/* Success Modal - shown when extraction job completes */}
                <ExtractionJobSuccessModal
                    open={showSuccessModal}
                    onClose={handleSuccessModalClose}
                    extractionStats={extractionStats}
                />

                {/* Failure Modal - shown when extraction job fails */}
                <ExtractionJobFailureModal
                    open={showFailureModal}
                    message={failureMessage}
                    onClose={handleFailureModalClose}
                />

                {/* Blocking Overlay - hard-blocks UI when job is running */}
                <ExtractionJobBlockingOverlay
                    visible={(jobIsProcessing && !showReviewScreen) || isMasterJobActive}
                    isLocalJob={jobIsProcessing && !isMasterJobActive}
                    progress={jobProgress}
                    currentStep={jobCurrentStep}
                    blockingMessage={masterBlockingMessage}
                    onCancel={cancelJob}
                    canCancel={jobIsProcessing}
                />
            </> : <NoSubscriptionView />}

        </Flex>
    );
}

export default ProjectsPage;
