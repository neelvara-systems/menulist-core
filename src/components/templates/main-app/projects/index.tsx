'use client';

import LoadingMessage from '@antdComponent/loadingMessage';
import { FEATURE_FLAGS } from '@config/features';
import { REFRESH_INTERVALS } from '@constant/metrics';
import { assertStoreUpdateSucceeded, updateStore } from '@database/stores';
import GlobalLanguagesList from '@data/languages';
import { getSuggestionValue } from '@data/shared/extractedBusinessProfile';
import { addProject, assertProjectDeleteSucceeded, assertProjectUpdateSucceeded, deleteProject, duplicateProject, getMetadataProjectsList, getProjectData, getProjectDataWithoutLoader, setProjectActive, updateProject, updateProjectMetadata, updateProjectWithoutLoader, uploadFile } from '@database/projects';
import { canHaveLinkedOutlets } from '@database/multiOutlet';
import { deleteFileByUrl } from '@database/storage/deleteFromStorage';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import useDeviceType from '@hook/useDeviceType';
import { useImageBatchJobListener } from '@hook/useImageBatchJobListener';
import { useMenuProcessingJob } from '@hook/useMenuProcessingJob';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { MenuFileToProcess } from '@lib/firebase/menuProcessing';
import {
    getBoundedMenuProcessingStringContext,
    getMenuProcessingJobLogContext,
    getMenuProcessingProjectLogContext,
    logMenuProcessingFailure,
} from '@lib/firebase/menuProcessingDiagnostics';
import { MENU_IMAGE_CONFIG, optimizeImage } from '@lib/image/optimizeImage';
import { applyLocalizedProjectDraftMap, getLocalizedProjectValue, getProjectManagedLanguages, getProjectPreferredLanguage, hasMissingProjectPublicDraftContent } from '@lib/localization/projectContent';
import { normalizeProjectLanguages } from '@lib/localization/languagePolicy';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { createMenuLinkImportJob } from '@lib/menu-link-import/client';
import { runMenuIntakeIdentityPreflight } from '@lib/menu-intake-identity/client';
import { buildExtractedProfileHighlights, buildOwnerDetectedUploadDetails, buildOwnerUploadConcernDetails, type OwnerDetectedDetail } from '@lib/menu-intake-identity/ownerPresentation';
import { buildBusinessIdentitySuggestions, buildBusinessIdentityUpdatePayload, type BusinessIdentitySuggestion, type BusinessIdentitySuggestionField } from '@lib/menu-intake-identity/suggestionAcceptance';
import {
    clearExpiredMenuProcessingJobDismissals,
    getDismissedMenuProcessingJobIds,
    markMenuProcessingJobAsDismissed,
} from '@lib/extraction/menuProcessingDismissal';
import { getBusinessAttributesWithMenuDefaults } from '@lib/obp/inferBusinessAttributesFromMenu';
import { hasStarterWorkspaceAccess } from '@lib/onboarding/starterActivation';
import translateProjectPublicContent from '@services/ai/projectPublicContent/translateProjectPublicContent';
import { slugify } from '@lib/utils/slugify';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import ProjectsDataProvider from '@providers/projectsDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { hasValidSubscriptionAccess } from '@util/razorpay';
import { getBase64, removeObjRef } from '@util/utils';
import { Button, Checkbox, Flex, Form, Input, message, Modal, Spin, Tag, theme, Tooltip, Typography, Upload } from 'antd';
import type { UploadFileStatus, UploadProps } from 'antd/es/upload/interface';
import DOMPurify from 'isomorphic-dompurify';
import { useTranslations } from 'next-intl';
// pdfjs-dist is lazy loaded in processsPdf() to reduce initial bundle size
import useMasterJobStatus from '@hook/useMasterJobStatus';
import { runComparisonEngine } from '@lib/extraction/comparisonEngine';
import type { ComparisonEngineOutput, ComparisonMode } from '@lib/extraction/comparisonEngine.types';
import { buildComparisonProjectInput, getLinkedMasterComparisonInput } from '@lib/extraction/projectInput';
import { generateProjectImageCandidate, generateAndSaveProjectImageIfMissing, getProjectImageDataFromComparisonPreview } from '@lib/image/projectImageGeneration';
import type { PreparedMediaImage } from '@lib/media/prepareMediaImage';
import { DEFAULT_OUTLET_POLICY, type OutletPolicy } from '@type/multiOutlet.types';
import MasterUpdateBanner from '@organisms/MasterUpdateBanner';
import { lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuArrowRight, LuFileImage, LuFilePlus, LuFileText, LuGlobe2, LuInfo, LuRocket, LuSparkles, LuUpload, LuZap } from 'react-icons/lu';
import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import NoSubscriptionView from '../billing/NoSubscriptionView';
import PreviewModal from './b2cView/previewModal';
import ShareModal from './b2cView/shareModal';
import { DeviceTypes } from './b2cView/types';
import { MAX_MENU_EXTRACTION_FILES, MAX_PDF_PAGES, PROCESSING_TIMEOUT, WARN_PDF_PAGES } from './constants';
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
import {
    getBoundedProjectPageStringContext,
    getProjectPageProjectLogContext,
    getProjectPageStoreLogContext,
    logProjectPageFailure,
} from './utils/projectPageDiagnostics';
import { validateFile } from './validation';
import { WelcomeModal } from './WelcomeModal';

type MenuIntakeDecisionResult =
    | { action: 'continue'; files: MenuFileToProcess[]; ignoredFiles: MenuFileToProcess[]; identityOverrideConfirmed?: boolean }
    | { action: 'cancel' }
    | { action: 'create_new_project'; projectId: string; projectMetadata: ProjectMetadata; files: MenuFileToProcess[]; ignoredFiles: MenuFileToProcess[]; identityOverrideConfirmed?: boolean };

type ProjectCreationPayload = Parameters<typeof addProject>[0] & {
    defaultLanguage?: string;
    languages?: string[];
};

const getPendingMenuExtractionFileCount = (files?: ProjectFileType[] | null): number => (
    (files || []).filter((file) => !file?.extractedData).length
);

const showMenuUploadFileLimitError = (incomingCount: number, existingPendingCount = 0) => {
    const totalCount = incomingCount + existingPendingCount;
    message.error(
        `Upload up to ${MAX_MENU_EXTRACTION_FILES} menu pages at a time. ` +
        `You selected ${totalCount}. Clear or process some files before adding more.`,
    );
};

type PendingQualityAction = {
    action: string;
    createdAt: number;
    projectId?: string | null;
};

const PENDING_QUALITY_ACTION_STORAGE_KEY = 'menulist:pendingQualityAction';
const PENDING_QUALITY_ACTION_MAX_AGE_MS = 5 * 60 * 1000;

const normalizeProjectsList = (projects: unknown): ProjectMetadata[] => {
    if (Array.isArray(projects)) {
        return projects.filter(Boolean) as ProjectMetadata[];
    }

    if (!projects || typeof projects !== 'object') {
        return [];
    }

    return Object.entries(projects as Record<string, any>)
        .filter(([, project]) => project && typeof project === 'object')
        .map(([projectId, project]) => ({
            ...project,
            projectId: project.projectId || projectId,
        })) as ProjectMetadata[];
};

const normalizeProjectsData = (data: any) => ({
    ...(data || {}),
    projects: normalizeProjectsList(data?.projects),
    lastDoc: data?.lastDoc ?? null,
});

function mergeProjectWithExtractedProfileDefaults(projectData: any, profile: any): any {
    if (!profile) return projectData;
    const imageBackgroundColor = getSuggestionValue(profile?.visualBrand?.imageBackgroundColor, 'medium');
    if (!imageBackgroundColor) return projectData;

    return {
        ...(projectData || {}),
        aiPreferences: {
            ...(projectData?.aiPreferences || {}),
            image: {
                ...(projectData?.aiPreferences?.image || {}),
                backgroundColor: projectData?.aiPreferences?.image?.backgroundColor || imageBackgroundColor,
            },
        },
    };
}

function buildExtractedProfileProjectPatch(projectData: any, profile: any): Partial<Project> | null {
    if (!projectData?.projectId || !profile) return null;

    const patch: any = { projectId: projectData.projectId };
    if (projectData.masterProjectId) {
        patch.masterProjectId = projectData.masterProjectId;
    }
    const brandAccentColor = getSuggestionValue(profile?.visualBrand?.brandAccentColor, 'medium');
    const imageBackgroundColor = getSuggestionValue(profile?.visualBrand?.imageBackgroundColor, 'medium');

    if (brandAccentColor && !projectData?.config?.design?.brand?.accentColor) {
        patch.config = {
            ...(projectData?.config || {}),
            design: {
                ...(projectData?.config?.design || {}),
                brand: {
                    ...(projectData?.config?.design?.brand || {}),
                    accentColor: brandAccentColor,
                },
            },
        };
    }

    if (imageBackgroundColor && !projectData?.aiPreferences?.image?.backgroundColor) {
        patch.aiPreferences = {
            ...(projectData?.aiPreferences || {}),
            image: {
                ...(projectData?.aiPreferences?.image || {}),
                backgroundColor: imageBackgroundColor,
            },
        };
    }

    return patch.config || patch.aiPreferences ? patch : null;
}

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
            <Typography.Text>
                We found these details in the upload. Save only what should update this location.
            </Typography.Text>
            <OwnerDetectedDetails details={details || []} />
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
                        <Tag key={detail.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginInlineEnd: 0 }}>
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
                        <Typography.Text key={concern} type="warning">
                            {concern}
                        </Typography.Text>
                    ))}
                </Flex>
            ) : null}
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
    const searchParams = useSearchParams();
    const labels = useOfferingLabels();
    const offeringName = labels.offeringPhrase.charAt(0).toUpperCase() + labels.offeringPhrase.slice(1);
    // T4-N-04: divergence advisory modal (G-13) copy.
    const tDivergence = useTranslations('Projects.divergence');
    const loggedInSession = useClientAuthSession();
    const { hasMounted } = useDeviceType();
    const [selectedProject, setSelectedProject] = useState<ProjectMetadata | null>(null);
    const [fileProcessingId, setFileProcessingId] = useState(null)
    const [currentView, setCurrentView] = useState(1);
    const [pendingQualityAction, setPendingQualityAction] = useState<PendingQualityAction | null>(() => {
        if (typeof window === 'undefined') return null;
        try {
            const raw = window.sessionStorage.getItem(PENDING_QUALITY_ACTION_STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed?.action || typeof parsed.createdAt !== 'number') return null;
            return parsed;
        } catch {
            return null;
        }
    });
    const deepLinkIntentHandledRef = useRef<string | null>(null);
    const projectIdQuery = searchParams.get('projectId') || '';
    const viewQuery = searchParams.get('view') || '';
    const focusQuery = searchParams.get('focus') || '';
    const qualityActionQuery = searchParams.get('qualityAction') || '';
    const [activeDeviceType, setActiveDeviceType] = useState<DeviceTypes>('mobile');
    const [uiEditorHasChanges, setUiEditorHasChanges] = useState(false);
    const b2cViewRef = useRef<B2CViewRef>(null);
    const [activeBatchImageJob, setActiveBatchImageJob] = useState<BatchImageGenerationJobType | null>(null);
    const [pdfFiles, setPdfFiles] = useState<{ images: ConvertedImageType[]; action: string } | null>({ images: [], action: "" });
    const { tenantDetails, storeDetails, setStoreDetails, activeSubscription, activeSubscriptionLoading, userPermissions, isMasterUser } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const storeContextName = useMemo(() => getStoreContextName(storeDetails as any, 'Business'), [storeDetails]);
    const outletPolicy = useMemo<OutletPolicy | null>(() => {
        if (isMasterUser || storeDetails?.isMaster !== false) return null;
        return {
            ...DEFAULT_OUTLET_POLICY,
            ...((userPermissions as any)?.outletPolicy || {}),
        };
    }, [isMasterUser, storeDetails?.isMaster, userPermissions]);
    const canCreateLocalProjects = !outletPolicy || outletPolicy.allowLocalProjects !== false;
    const canDeactivateLinkedProjects = !outletPolicy || outletPolicy.allowProjectDeactivate !== false;
    const skipLinkedOutletDeleteCheck = !canHaveLinkedOutlets(tenantDetails as any);
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
    const [projectFormSourceData, setProjectFormSourceData] = useState<any | null>(null);
    const [projectImagePreparedForSave, setProjectImagePreparedForSave] = useState<PreparedMediaImage | null>(null);
    const [isTranslatingProjectPublicContent, setIsTranslatingProjectPublicContent] = useState(false);
    const [confirmActionVisible, setConfirmActionVisible] = useState(false);
    const [confirmActionType, setConfirmActionType] = useState<'reset' | 'delete' | null>(null);
    const [isFirstTime, setIsFirstTime] = useState(false);
    const [failedFiles, setFailedFiles] = useState<FailedFile[]>([]);
    const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
    const [menuLinkUrl, setMenuLinkUrl] = useState('');
    const [menuLinkPermissionConfirmed, setMenuLinkPermissionConfirmed] = useState(false);
    const [menuLinkImporting, setMenuLinkImporting] = useState(false);
    const [menuLinkImportModalOpen, setMenuLinkImportModalOpen] = useState(false);
    const projectImageAutoGenerationAttemptRef = useRef<Set<string>>(new Set());
    const clearPendingQualityAction = useCallback(() => {
        if (typeof window !== 'undefined') {
            window.sessionStorage.removeItem(PENDING_QUALITY_ACTION_STORAGE_KEY);
        }
        setPendingQualityAction(null);
    }, []);

    // Job Queue: Track active menu processing job
    // Persist in sessionStorage so it survives page reloads mid-processing
    const [activeProcessingJobId, setActiveProcessingJobIdState] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            clearExpiredMenuProcessingJobDismissals();
            const dismissedJobIds = new Set(getDismissedMenuProcessingJobIds());
            const storedJobId = sessionStorage.getItem('activeProcessingJobId');

            if (storedJobId && dismissedJobIds.has(storedJobId)) {
                sessionStorage.removeItem('activeProcessingJobId');
                return null;
            }

            return storedJobId || null;
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

            clearExpiredMenuProcessingJobDismissals();
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
    const hasPaidAccess = hasValidSubscriptionAccess(activeSubscription);
    const hasStarterAccess = hasStarterWorkspaceAccess(storeDetails, hasPaidAccess);

    const resolveProjectImageForSave = useCallback(async (
        projectImage?: string | null,
        fallbackUid?: string,
        prepared?: PreparedMediaImage | null,
    ) => {
        if (!projectImage) return null;
        if (!projectImage.includes('base64')) return projectImage;

        const mimeMatch = projectImage.match(/^data:(.*?);base64,/);
        const uploadedUrl = await uploadFile({
            blob: prepared?.blob,
            mediaChecksum: prepared?.checksum,
            mediaId: prepared?.mediaId,
            mediaProfile: 'projectImage',
            mediaVariant: prepared?.primaryVariant,
            mediaVersion: prepared?.version,
            preparedMedia: prepared,
            uid: fallbackUid || `project-image-${Date.now()}`,
            url: projectImage,
            type: prepared?.mimeType || mimeMatch?.[1] || 'image/jpeg',
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
    const hasMissingProjectPublicDrafts = useMemo(() => (
        hasMissingProjectPublicDraftContent({
            descriptionDrafts: projectDescriptionDrafts,
            languages: projectFormLanguages,
            nameDrafts: projectNameDrafts,
        })
    ), [projectDescriptionDrafts, projectFormLanguages, projectNameDrafts]);

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

    const shouldEnableDesktopProjectsData = hasMounted;

    // SWR cache key for projects list
    const effectiveTenantId = storeDetails?.tenantId || loggedInSession?.tId;
    const effectiveStoreId = storeDetails?.storeId || loggedInSession?.sId;

    const projectsListCacheKey = shouldEnableDesktopProjectsData && effectiveTenantId && effectiveStoreId
        ? `projects-${effectiveTenantId}-${effectiveStoreId}`
        : null;

    // SWR cache key for individual project
    const selectedProjectStoreId = selectedProject?.projectId
        ? String(selectedProject.projectId).split('-').filter(Boolean).pop()
        : null;
    const selectedProjectMatchesStore = Boolean(
        effectiveStoreId &&
        selectedProjectStoreId &&
        selectedProjectStoreId === String(effectiveStoreId),
    );
    const projectDataCacheKey = shouldEnableDesktopProjectsData && selectedProjectMatchesStore && selectedProject?.projectId
        ? `project-${effectiveStoreId}-${selectedProject.projectId}`
        : null;

    // Fetch projects list with SWR (automatic caching & deduplication)
    const { data: projectsData, error: projectsError, isLoading: projectsLoading, mutate: mutateProjects } = useSWR(
        projectsListCacheKey,
        async () => {
            if (!loggedInSession) return { projects: [], lastDoc: null };
            const result = await getMetadataProjectsList();
            return normalizeProjectsData(result);
        },
        {
            dedupingInterval: REFRESH_INTERVALS.SWR_DEDUPE, // 60 seconds
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            revalidateOnMount: true
        }
    );
    const projectsList = useMemo(() => normalizeProjectsList(projectsData?.projects), [projectsData?.projects]);

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
    const hasPendingLocalUploadFiles = Boolean(activeProject?.files?.some((file) => (
        !file.extractedData && typeof file.url === 'string' && file.url.includes('base64')
    )));

    useEffect(() => {
        const hasDeepLinkIntent = Boolean(projectIdQuery || viewQuery === 'editor' || viewQuery === 'b2c' || focusQuery === 'menu-readiness' || qualityActionQuery);
        if (!hasDeepLinkIntent || projectsList.length === 0) return;

        const targetProject = projectIdQuery
            ? projectsList.find((project) => String(project.projectId) === String(projectIdQuery))
            : selectedProject || projectsList[0];
        if (!targetProject?.projectId) return;

        const intentKey = [
            targetProject.projectId,
            viewQuery,
            focusQuery,
            qualityActionQuery,
        ].join(':');
        if (deepLinkIntentHandledRef.current === intentKey) return;
        deepLinkIntentHandledRef.current = intentKey;

        if (selectedProject?.projectId !== targetProject.projectId) {
            setSelectedProject(targetProject);
        }
        if (viewQuery === 'editor' || focusQuery === 'menu-readiness' || qualityActionQuery) {
            setCurrentView(2);
        } else if (viewQuery === 'b2c') {
            setCurrentView(3);
        }

        const allowedQualityActions = new Set([
            'categoryIcons',
            'descriptions',
            'editor',
            'hidden',
            'images',
            'priceOutliers',
            'prices',
            'projectContent',
            'translations',
        ]);
        const qualityAction = allowedQualityActions.has(qualityActionQuery)
            ? qualityActionQuery
            : focusQuery === 'menu-readiness'
                ? 'editor'
                : '';
        if (!qualityAction) return;

        const nextAction = {
            action: qualityAction,
            createdAt: Date.now(),
            projectId: targetProject.projectId,
        };
        setPendingQualityAction(nextAction);
        if (typeof window !== 'undefined') {
            window.sessionStorage.setItem(PENDING_QUALITY_ACTION_STORAGE_KEY, JSON.stringify(nextAction));
        }
    }, [focusQuery, projectIdQuery, projectsList, qualityActionQuery, selectedProject, viewQuery]);

    useEffect(() => {
        setSelectedProject(null);
        setCurrentView(1);
    }, [effectiveStoreId]);

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

                const ignoredJobIds = getDismissedMenuProcessingJobIds();
                const activeJobId = await checkExistingActiveJob(activeProject.projectId, ignoredJobIds);
                if (activeJobId) {
                    setActiveProcessingJobId(activeJobId);
                    return;
                }
            } catch (error) {
                logMenuProcessingFailure('menu_upload_existing_job_check_failed', error, {
                    ...getMenuProcessingProjectLogContext(activeProject.projectId),
                });
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
    const activeJobProjectId = activeJob?.projectId ? String(activeJob.projectId) : null;
    const isActiveProcessingJob = Boolean(activeProcessingJobId && activeJob?.id === activeProcessingJobId);
    const activeJobMatchesActiveProject = Boolean(
        activeJobProjectId &&
        selectedProject?.projectId === activeJobProjectId &&
        activeProject?.projectId === activeJobProjectId,
    );

    useEffect(() => {
        if (!activeProcessingJobId) {
            return;
        }

        if (!activeJobProjectId || selectedProject?.projectId === activeJobProjectId) return;

        const matchingProject = projectsList.find((project) => project.projectId === activeJobProjectId);
        if (!matchingProject) return;

        setSelectedProject(matchingProject);
        setShowReviewScreen(false);
        setComparisonResult(null);
    }, [activeJobProjectId, projectsList, selectedProject?.projectId, activeProcessingJobId]);

    // ═══════════════════════════════════════════════════════════════════════════
    // MASTER JOB MONITORING: For outlet projects, listen to master's active job
    // When master job is running, outlet UI is blocked
    // ═══════════════════════════════════════════════════════════════════════════
    const masterProjectId = activeProject?.masterProjectId || null;
    const {
        isMasterJobActive,
        blockingMessage: masterBlockingMessage,
    } = useMasterJobStatus(masterProjectId, activeProject?.projectId || null);
    const isTrackedJobProcessing = isActiveProcessingJob && jobIsProcessing;
    const isTrackedJobPending = isActiveProcessingJob && activeJob?.status === 'pending';

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
        profileHighlights?: OwnerDetectedDetail[];
    } | null>(null);

    const updateProjectImageInLocalState = useCallback((projectId: string, projectImage: string) => {
        setSelectedProject((current) => (
            current?.projectId === projectId ? { ...current, projectImage } : current
        ));
        mutateProjects(
            (current) => current ? {
                ...current,
                projects: normalizeProjectsList(current.projects).map((project) => (
                    project.projectId === projectId ? { ...project, projectImage } : project
                )),
            } : current,
            { revalidate: false },
        );
    }, [mutateProjects]);

    const handleGenerateProjectImageForForm = useCallback(async () => {
        const localizedName = applyLocalizedProjectDraftMap(projectFormSourceData?.name, projectNameDrafts);
        const localizedDescription = applyLocalizedProjectDraftMap(projectFormSourceData?.description, projectDescriptionDrafts);
        const projectName = getLocalizedText(
            localizedName,
            undefined,
            getPrimaryLocalizedLanguage(localizedName, projectFormSelectedLanguage || DefaultLanguage),
            '',
        ).trim();

        if (!projectName) {
            throw new Error(`Enter a ${labels.offeringPhrase} name first.`);
        }

        const candidate = await generateProjectImageCandidate({
            allowNameOnly: true,
            businessCategory: storeDetails?.businessCategory,
            businessType: storeDetails?.businessType,
            project: {
                ...(projectFormSourceData || {}),
                ...(editingProject || {}),
                description: localizedDescription,
                name: localizedName,
                projectId: editingProject?.projectId || 'project-draft',
            },
            storeName: storeContextName,
        });

        return candidate?.dataUrl || null;
    }, [
        DefaultLanguage,
        editingProject,
        labels.offeringPhrase,
        projectDescriptionDrafts,
        projectFormSelectedLanguage,
        projectFormSourceData,
        projectNameDrafts,
        storeDetails?.businessCategory,
        storeDetails?.businessType,
        storeContextName,
    ]);

    const maybeAutoGenerateProjectImage = useCallback(async ({
        categories,
        items,
        projectData,
        projectId,
        projectSummary,
    }: {
        categories?: any[];
        items?: any[];
        projectData?: any;
        projectId?: string | null;
        projectSummary?: any;
    }) => {
        if (!projectId) return;
        if (projectSummary?.projectImage || projectData?.projectImage) return;
        if (projectImageAutoGenerationAttemptRef.current.has(projectId)) return;
        projectImageAutoGenerationAttemptRef.current.add(projectId);

        try {
            const result = await generateAndSaveProjectImageIfMissing({
                businessCategory: storeDetails?.businessCategory,
                businessType: storeDetails?.businessType,
                categories,
                items,
                project: {
                    ...(projectData || {}),
                    ...(projectSummary || {}),
                    projectId,
                },
                storeName: storeContextName,
                summaryData: projectSummary || null,
            });

            if (result.imageUrl) {
                updateProjectImageInLocalState(projectId, result.imageUrl);
            }
        } catch (error) {
            logMenuProcessingFailure('menu_upload_project_image_generation_skipped', error, {
                ...getMenuProcessingProjectLogContext(projectId),
            });
        }
    }, [storeDetails?.businessCategory, storeDetails?.businessType, storeContextName, updateProjectImageInLocalState]);

    const applyMenuDerivedBusinessAttributeDefaults = useCallback(async (menuData: { businessAttributeSuggestions?: unknown; categories?: any[]; items?: any[] } | null | undefined) => {
        if (!storeDetails?.storeId || !menuData?.items?.length) return;
        const nextBusinessAttributes = getBusinessAttributesWithMenuDefaults(menuData, storeDetails as any);
        if (!nextBusinessAttributes) return;

        try {
            const writeResult = await updateStore({
                id: storeDetails.storeId,
                storeId: storeDetails.storeId,
                tenantId: storeDetails.tenantId,
                businessAttributes: nextBusinessAttributes,
            });
            assertStoreUpdateSucceeded(
                writeResult,
                storeDetails.storeId,
                'menu_upload_business_attributes_store_update_rejected',
            );
            setStoreDetails((previous: any) => previous
                ? { ...previous, businessAttributes: nextBusinessAttributes }
                : previous);
        } catch (error) {
            logMenuProcessingFailure('menu_upload_business_attributes_apply_failed', error, {
                ...getMenuProcessingProjectLogContext(storeDetails.storeId),
            });
        }
    }, [setStoreDetails, storeDetails]);

    const applyExtractedProfileProjectDefaults = useCallback(async (profile: any) => {
        const projectId = activeProject?.projectId || selectedProject?.projectId;
        if (!projectId || !profile) return;

        const projectData = {
            ...(activeProject || {}),
            projectId,
        };
        const patch = buildExtractedProfileProjectPatch(projectData, profile);
        if (!patch) return;

        try {
            const savedProject = await updateProjectWithoutLoader(patch);
            assertProjectUpdateSucceeded(
                savedProject,
                projectId,
                'menu_upload_extracted_profile_defaults_project_update_rejected',
            );
            mutateProject((current: any) => current ? {
                ...current,
                ...patch,
            } : current, false);
        } catch (error) {
            logMenuProcessingFailure('menu_upload_extracted_profile_defaults_apply_failed', error, {
                ...getMenuProcessingProjectLogContext(projectId),
            });
        }
    }, [activeProject, mutateProject, selectedProject?.projectId]);

    // Handle job completion - refetch project data since server saved results
    useEffect(() => {
        if (!activeProcessingJobId) {
            return;
        }
        if (!isActiveProcessingJob) {
            return;
        }
        if (activeJobProjectId && !activeJobMatchesActiveProject) {
            return;
        }

        if (jobIsCompleted) {
            // Capture extraction stats from job result before clearing
            const result = activeJob?.result;
            if (result) {
                const extractedProfile = result.extractedBusinessProfile || result.combinedData?.extractedBusinessProfile;
                const resultSummary = result.summary || {};
                setExtractionStats({
                    qualityScore: result.qualityScore,
                    qualityDetails: result.qualityDetails,
                    categoriesCount: result.combinedData?.categories?.length || Number(resultSummary.categoriesCount || 0),
                    itemsCount: result.combinedData?.items?.length || Number(resultSummary.itemsCount || 0),
                    profileHighlights: buildExtractedProfileHighlights(extractedProfile),
                });
                void maybeAutoGenerateProjectImage({
                    categories: result.combinedData?.categories || [],
                    items: result.combinedData?.items || [],
                    projectData: mergeProjectWithExtractedProfileDefaults(
                        activeProject,
                        result.extractedBusinessProfile || result.combinedData?.extractedBusinessProfile,
                    ),
                    projectId: selectedProject?.projectId || activeProject?.projectId,
                    projectSummary: selectedProject,
                });
                void applyMenuDerivedBusinessAttributeDefaults(result.combinedData);
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
            void (async () => {
                // Capture extraction stats for the success modal (after review save)
                const previewResult = activeJob.result;
                if (previewResult) {
                    const extractedProfile = previewResult.extractedBusinessProfile || previewResult.combinedData?.extractedBusinessProfile;
                    setExtractionStats({
                        qualityScore: previewResult.qualityScore,
                        qualityDetails: previewResult.qualityDetails,
                        categoriesCount: previewResult.combinedData?.categories?.length || 0,
                        itemsCount: previewResult.combinedData?.items?.length || 0,
                        profileHighlights: buildExtractedProfileHighlights(extractedProfile),
                    });
                }
                // Re-extraction: raw data ready for client-side comparison
                try {
                    const storeProject = buildComparisonProjectInput(activeProject);
                    const masterProject = masterProjectId
                        ? await getLinkedMasterComparisonInput(activeProject)
                        : undefined;

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
                        storeProject,
                        masterProject,
                        mode: comparisonMode,
                        primaryLang,
                    });

                    setComparisonResult(comparison);
                    setShowReviewScreen(true);
                } catch (error) {
                    logMenuProcessingFailure('menu_upload_comparison_engine_failed', error, {
                        ...getMenuProcessingJobLogContext(activeProcessingJobId),
                        ...getMenuProcessingProjectLogContext(activeJobProjectId || selectedProject?.projectId || activeProject?.projectId),
                    });
                    message.error('Failed to compare extracted data');
                }
            })();
        }

        if (jobIsFailed) {
            logMenuProcessingFailure('menu_upload_job_failed', jobError, {
                ...getMenuProcessingJobLogContext(activeProcessingJobId),
                ...getMenuProcessingProjectLogContext(activeJobProjectId || selectedProject?.projectId || activeProject?.projectId),
            });
            setActiveProcessingJobId(null);
            setFileProcessingId(null);
            setShowReviewScreen(false);
            setComparisonResult(null);
            // Show failure modal
            setFailureMessage('Processing could not be completed. Please try again.');
            setShowFailureModal(true);
        }

        if (jobIsCancelled) {
            setActiveProcessingJobId(null);
            setFileProcessingId(null);
            setShowReviewScreen(false);
            setComparisonResult(null);
            message.info('Processing was cancelled');
        }
    }, [activeProcessingJobId, isActiveProcessingJob, activeJobMatchesActiveProject, activeJobProjectId, jobIsCompleted, jobIsPreviewReady, jobIsFailed, jobIsCancelled, jobError, maybeAutoGenerateProjectImage, mutateProject, showReviewScreen, activeJob, activeProject, selectedProject, applyMenuDerivedBusinessAttributeDefaults]);

    // ═══════════════════════════════════════════════════════════════════════════
    // EXTRACTION REVIEW SCREEN HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════

    const handleReviewSaveComplete = useCallback(() => {
        const previewData = getProjectImageDataFromComparisonPreview(comparisonResult);
        const extractedProfile = activeJob?.result?.extractedBusinessProfile || activeJob?.result?.combinedData?.extractedBusinessProfile;
        void maybeAutoGenerateProjectImage({
            categories: previewData.categories,
            items: previewData.items,
            projectData: mergeProjectWithExtractedProfileDefaults(activeProject, extractedProfile),
            projectId: selectedProject?.projectId || activeProject?.projectId,
            projectSummary: selectedProject,
        });
        void applyExtractedProfileProjectDefaults(extractedProfile);
        const attributePreviewData = {
            ...previewData,
            businessAttributeSuggestions: activeJob?.result?.combinedData?.businessAttributeSuggestions,
        };
        void applyMenuDerivedBusinessAttributeDefaults(attributePreviewData);
        setShowReviewScreen(false);
        setComparisonResult(null);
        setActiveProcessingJobId(null);
        setFileProcessingId(null);
        mutateProject(); // Refetch to get updated data
        setShowSuccessModal(true);
    }, [activeJob?.result, activeProject, applyExtractedProfileProjectDefaults, comparisonResult, maybeAutoGenerateProjectImage, mutateProject, selectedProject, applyMenuDerivedBusinessAttributeDefaults]);

    const handleReviewDiscard = useCallback(() => {
        if (activeProcessingJobId) {
            markMenuProcessingJobAsDismissed(activeProcessingJobId);
        }
        setShowReviewScreen(false);
        setComparisonResult(null);
        setActiveProcessingJobId(null);
        setFileProcessingId(null);
        setExtractionStats(null);
        message.info('Changes discarded');
    }, [activeProcessingJobId, setActiveProcessingJobId]);

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
        if (normalizeProjectsList(projectsData?.projects).length === 0) {
            openModal();
        }
    };

    const handleWelcomeClose = () => {
        setIsFirstTime(false);
        localStorage.setItem('projects_visited', 'true');
    };

    const isLinkedOutletProject = async (project?: ProjectMetadata | Project | null) => {
        if (!project?.projectId) return false;
        if ((project as any).masterProjectId) return true;
        if (activeProject?.projectId === project.projectId && activeProject?.masterProjectId) return true;

        const detailedProject = await getProjectDataWithoutLoader(project.projectId);
        return Boolean(detailedProject?.masterProjectId);
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
            const existingProjects = normalizeProjectsList(projectsData?.projects);
            const editingProjectId = editingProject?.projectId;
            const otherDefault = existingProjects.find(
                (p: any) => p?.isDefault === true && p?.projectId !== editingProjectId,
            );
            const otherDefaultName = otherDefault
                ? getLocalizedText(
                    otherDefault.name,
                    undefined,
                    getPrimaryLocalizedLanguage(otherDefault.name, 'en'),
                    'Untitled',
                )
                : '';
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
                                    <strong>&ldquo;{otherDefaultName}&rdquo;</strong>
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
                                        <strong>{otherDefaultName}</strong>
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
                projectImagePreparedForSave,
            );

            if (editingProject) {
                if (
                    values.active === false &&
                    (editingProject as any).active !== false &&
                    !canDeactivateLinkedProjects &&
                    await isLinkedOutletProject(editingProject)
                ) {
                    message.info("Deactivating inherited menus is not enabled for this store.");
                    return;
                }

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
                const metadataResult = await updateProjectMetadata(editingProject.projectId!, updatePayload, {
                    defaultHandoff: {
                        unsetProjectId: shouldBeDefault ? otherDefault?.projectId : undefined,
                        setProjectId: defaultReplacement?.projectId,
                    },
                });
                assertProjectUpdateSucceeded(
                    metadataResult,
                    editingProject.projectId!,
                    'projects_page_project_metadata_update_rejected',
                );
                const languageResult = await updateProjectWithoutLoader({
                    projectId: editingProject.projectId!,
                    languages: projectFormLanguages,
                    defaultLanguage: nextDefaultLanguage,
                });
                assertProjectUpdateSucceeded(
                    languageResult,
                    editingProject.projectId!,
                    'projects_page_project_language_update_rejected',
                );
                if (activeChanged) {
                    const activeResult = await setProjectActive(editingProject.projectId!, nextActive);
                    assertProjectUpdateSucceeded(
                        activeResult,
                        editingProject.projectId!,
                        'projects_page_project_active_update_rejected',
                    );
                }

                // Update selected project if editing current
                if (selectedProject?.projectId === editingProject.projectId) {
                    setSelectedProject(updatedProject);
                }
                // Update SWR cache (single source of truth)
                mutateProjects(
                    (current) => current ? {
                        ...current,
                        projects: normalizeProjectsList(current.projects).map((p) => {
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
                if (!canCreateLocalProjects) {
                    message.info("New local menus are not enabled for this store.");
                    return;
                }

                const shouldBeDefault = promoteThisAsDefault || nextIsDefault;
                const newProject = await addProject({
                    name: localizedName,
                    description: localizedDescription,
                    projectImage: savedProjectImage,
                    active: values.active !== false,
                    businessCategory: storeDetails?.businessCategory,
                    businessType: storeDetails?.businessType,
                    isDefault: shouldBeDefault,
                    defaultLanguage: projectFormSelectedLanguage,
                }, {
                    defaultHandoff: {
                        unsetProjectId: shouldBeDefault ? otherDefault?.projectId : undefined,
                    },
                });
                assertProjectUpdateSucceeded(
                    newProject,
                    undefined,
                    'projects_page_create_project_update_rejected',
                );
                if (!newProject.projectId) {
                    throw new Error('projects_page_create_project_update_rejected');
                }
                const projectMetadata = {
                    ...newProject.summaryData,
                    projectId: newProject.projectId,
                } as ProjectMetadata;
                setSelectedProject(projectMetadata);
                // Update SWR cache (single source of truth)
                mutateProjects(
                    (current) => current ? {
                        ...current,
                        projects: [
                            ...normalizeProjectsList(current.projects).map((p) => shouldBeDefault && p.projectId === otherDefault?.projectId
                                ? { ...p, isDefault: false }
                                : p),
                            projectMetadata,
                        ]
                    } : { projects: [projectMetadata], lastDoc: null },
                    { revalidate: false }
                );
                message.success(`${offeringName} created successfully`);
            }
            setIsModalOpen(false);
            form.resetFields();
            setEditingProject(null);
            setProjectImagePreparedForSave(null);
        } catch (error) {
            logProjectPageFailure('projects_page_project_save_failed', error, {
                ...getProjectPageProjectLogContext(editingProject?.projectId, (editingProject as any)?.masterProjectId),
                ...getProjectPageStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                isEditing: Boolean(editingProject),
                languageCount: projectFormLanguages.length,
                isDefault: Boolean((editingProject as any)?.isDefault),
                canCreateLocalProjects,
            });
            message.error(`Failed to ${editingProject ? 'update' : 'create'} ${labels.offeringPhrase}`);
        }
    };

    const handleDelete = async () => {
        if (editingProject) {
            try {
                if (!canDeactivateLinkedProjects && await isLinkedOutletProject(editingProject)) {
                    message.info("Removing inherited menus is not enabled for this store.");
                    return;
                }

                dispatch(startLoader("Deleting project"))
                const deleteResult = await deleteProject(editingProject.projectId, { skipLinkedOutletCheck: skipLinkedOutletDeleteCheck });
                assertProjectDeleteSucceeded(
                    deleteResult,
                    editingProject.projectId,
                    'projects_page_modal_delete_rejected',
                );
                message.success(`${offeringName} deleted successfully`);
                if (selectedProject?.projectId === editingProject.projectId) {
                    setSelectedProject(null);
                }
                // Update SWR cache (single source of truth)
                mutateProjects(
                    (current) => current ? {
                        ...current,
                        projects: normalizeProjectsList(current.projects).filter(p => p.projectId !== editingProject.projectId)
                    } : current,
                    { revalidate: false }
                );
                onCloseModal();
            } catch (error) {
                logProjectPageFailure('projects_page_modal_delete_failed', error, {
                    ...getProjectPageProjectLogContext(editingProject.projectId, (editingProject as any).masterProjectId),
                    ...getProjectPageStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                    skipLinkedOutletDeleteCheck,
                    canDeactivateLinkedProjects,
                });
                message.error(`Failed to delete ${labels.offeringPhrase}`);
            }
            dispatch(stopLoader("Deleting project"))
        }
    };

    const handleReset = async () => {
        if (selectedProject && activeProject) {
            try {
                dispatch(startLoader("Resetting project"))
                const isLinkedProject = Boolean(activeProject.masterProjectId)
                    || await isLinkedOutletProject(activeProject);
                const resetPatch = {
                    projectId: selectedProject.projectId,
                    files: [],
                    ...(isLinkedProject ? { overrides: { items: {}, categories: {}, attributes: {} } } : {}),
                } as Partial<Project>;
                // Optimistically update cache
                mutateProject({ ...activeProject, ...resetPatch }, false);
                setCurrentView(1);
                const resetResult = await updateProject(resetPatch);
                assertProjectUpdateSucceeded(
                    resetResult,
                    selectedProject.projectId,
                    'projects_page_reset_project_update_rejected',
                );
                // Revalidate cache after mutation
                mutateProject();
                message.success(`${offeringName} has been reset`);
            } catch (error) {
                logProjectPageFailure('projects_page_project_reset_failed', error, {
                    ...getProjectPageProjectLogContext(selectedProject.projectId, activeProject.masterProjectId),
                    ...getProjectPageStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                    isLinkedProject: Boolean(activeProject.masterProjectId),
                    fileCount: activeProject.files?.length ?? 0,
                });
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
            if (!canCreateLocalProjects) {
                message.info("New local menus are not enabled for this store.");
                return;
            }
            if (await isLinkedOutletProject(projectToDuplicate)) {
                message.info("Inherited menus cannot be duplicated in this store.");
                return;
            }

            dispatch(startLoader("Duplicating project"));
            const result = await duplicateProject(
                projectToDuplicate.projectId,
                newName,
                newDescription,
                localizedName,
                localizedDescription,
            );
            assertProjectUpdateSucceeded(
                result,
                undefined,
                'projects_page_duplicate_project_update_rejected',
            );
            if (!result.projectId) {
                throw new Error('projects_page_duplicate_project_update_rejected');
            }

            // Auto-select the new project and update local state
            if (result?.summaryData) {
                const newProjectMetadata = {
                    ...result.summaryData,
                    projectId: result.projectId,
                };
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
            logProjectPageFailure('projects_page_project_duplicate_failed', error, {
                ...getProjectPageProjectLogContext(projectToDuplicate.projectId, (projectToDuplicate as any).masterProjectId),
                ...getProjectPageStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                localizedNameCount: localizedName ? Object.keys(localizedName).length : 0,
                localizedDescriptionCount: localizedDescription ? Object.keys(localizedDescription).length : 0,
            });
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
            if (!canDeactivateLinkedProjects && await isLinkedOutletProject(project)) {
                message.info("Removing inherited menus is not enabled for this store.");
                return;
            }

            dispatch(startLoader("Deleting project"));
            const deleteResult = await deleteProject(project.projectId, { skipLinkedOutletCheck: skipLinkedOutletDeleteCheck });
            assertProjectDeleteSucceeded(
                deleteResult,
                project.projectId,
                'projects_page_selector_delete_rejected',
            );

            // Update local state directly instead of refetching
            mutateProjects(
                (current) => current ? {
                    ...current,
                    projects: normalizeProjectsList(current.projects).filter(p => p.projectId !== project.projectId)
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
            logProjectPageFailure('projects_page_selector_delete_failed', error, {
                ...getProjectPageProjectLogContext(project.projectId, (project as any).masterProjectId),
                ...getProjectPageStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                skipLinkedOutletDeleteCheck,
                canDeactivateLinkedProjects,
            });
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
        setProjectFormSourceData(null);
        setProjectImagePreparedForSave(null);
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
            setProjectFormSourceData(detailedProject || project);
            setProjectFormLanguages(languages);
            setProjectFormSelectedLanguage(selectedLanguage);
            setProjectNameDrafts(nextNameDrafts);
            setProjectDescriptionDrafts(nextDescriptionDrafts);
            setProjectImagePreparedForSave(null);
            form.setFieldsValue({
                active: (project as any).active !== false,
                isDefault: project.isDefault === true,
                projectImage: project.projectImage || null,
            });
        } else {
            if (!canCreateLocalProjects) {
                message.info("New local menus are not enabled for this store.");
                return;
            }

            const defaultLanguage = storeDetails?.defaultLanguage || DefaultLanguage;
            setEditingProject(null);
            setProjectFormSourceData(null);
            setProjectFormLanguages([defaultLanguage]);
            setProjectFormSelectedLanguage(defaultLanguage);
            setProjectNameDrafts({ [defaultLanguage]: '' });
            setProjectDescriptionDrafts({ [defaultLanguage]: '' });
            setProjectImagePreparedForSave(null);
            form.resetFields();
            form.setFieldsValue({
                active: true,
                isDefault: !normalizeProjectsList(projectsData?.projects).some((project: any) => project?.isDefault === true),
                projectImage: null,
            });
        }
        setIsModalOpen(true);
    };

    const handleTranslateProjectPublicContent = async () => {
        if (!editingProject?.projectId) return;

        const currentNameDrafts = projectNameDrafts;
        const currentDescriptionDrafts = projectDescriptionDrafts;
        const hasUnsavedDrafts = JSON.stringify(currentNameDrafts) !== JSON.stringify(
            buildProjectLocalizedDrafts(editingProject?.name, projectFormLanguages),
        ) || JSON.stringify(currentDescriptionDrafts) !== JSON.stringify(
            buildProjectLocalizedDrafts(editingProject?.description, projectFormLanguages),
        );

        if (hasUnsavedDrafts) {
            message.info('Save the current project content first, then translate the missing public content.');
            return;
        }

        try {
            setIsTranslatingProjectPublicContent(true);
            const detailedProject = activeProject?.projectId === editingProject.projectId
                ? activeProject
                : await getProjectDataWithoutLoader(editingProject.projectId);
            const translated = await translateProjectPublicContent({
                projectDetails: detailedProject,
                projectId: editingProject.projectId,
                storeDetails,
            });

            if (!translated) {
                message.info('No missing project public content translations found.');
                return;
            }

            const projectTranslationResult = await updateProjectWithoutLoader({
                projectId: editingProject.projectId,
                ...(translated.name ? { name: translated.name } : {}),
                ...(translated.description ? { description: translated.description } : {}),
                ...(translated.specialNote ? {
                    menuSettings: {
                        ...(detailedProject?.menuSettings || {}),
                        specialNote: translated.specialNote,
                    },
                } : {}),
                ...(translated.specialMenuDisplayName ? {
                    _specialMenu: {
                        ...(detailedProject?._specialMenu || {}),
                        displayName: translated.specialMenuDisplayName,
                    },
                } : {}),
            } as any);
            assertProjectUpdateSucceeded(
                projectTranslationResult,
                editingProject.projectId,
                'projects_page_public_content_translation_project_update_rejected',
            );

            const nextSummaryUpdate: any = {};
            if (translated.name) nextSummaryUpdate.name = translated.name;
            if (translated.description) nextSummaryUpdate.description = translated.description;
            if (translated.specialMenuDisplayName) nextSummaryUpdate.specialMenuDisplayName = translated.specialMenuDisplayName;
            if (Object.keys(nextSummaryUpdate).length > 0) {
                const metadataTranslationResult = await updateProjectMetadata(editingProject.projectId, nextSummaryUpdate);
                assertProjectUpdateSucceeded(
                    metadataTranslationResult,
                    editingProject.projectId,
                    'projects_page_public_content_translation_metadata_update_rejected',
                );
            }

            const resolvedName = translated.name || detailedProject?.name || editingProject?.name;
            const resolvedDescription = translated.description || detailedProject?.description || editingProject?.description;
            setProjectNameDrafts(buildProjectLocalizedDrafts(resolvedName, projectFormLanguages));
            setProjectDescriptionDrafts(buildProjectLocalizedDrafts(resolvedDescription, projectFormLanguages));
            setEditingProject((previous) => previous ? {
                ...previous,
                ...(translated.name ? { name: translated.name } : {}),
                ...(translated.description ? { description: translated.description } : {}),
            } : previous);
            mutateProjects(
                (current) => current ? {
                    ...current,
                    projects: normalizeProjectsList(current.projects).map((project) => (
                        project.projectId === editingProject.projectId
                            ? {
                                ...project,
                                ...(translated.name ? { name: translated.name } : {}),
                                ...(translated.description ? { description: translated.description } : {}),
                                ...(translated.specialMenuDisplayName ? { specialMenuDisplayName: translated.specialMenuDisplayName } : {}),
                            }
                            : project
                    )),
                } : current,
                { revalidate: false },
            );
            message.success('Project public content translations added.');
        } catch (error) {
            logProjectPageFailure('projects_page_public_content_translation_failed', error, {
                ...getProjectPageProjectLogContext(editingProject?.projectId, (editingProject as any)?.masterProjectId),
                ...getProjectPageStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                languageCount: projectFormLanguages.length,
            });
            message.error('Could not translate project public content.');
        } finally {
            setIsTranslatingProjectPublicContent(false);
        }
    };

    useImageBatchJobListener({
        project: selectedProjectMatchesStore ? (selectedProject as Project) : null,
        setActiveBatchImageJob,
    });

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

        const existingPendingCount = getPendingMenuExtractionFileCount(projectDataCopy.files);
        if (existingPendingCount + files.length > MAX_MENU_EXTRACTION_FILES) {
            showMenuUploadFileLimitError(files.length, existingPendingCount);
            return;
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
        }, 3000);
    };

    // Auto-select first project + handle SWR errors
    useEffect(() => {
        if (pendingQualityAction && projectsList.length > 0) {
            if (Date.now() - pendingQualityAction.createdAt > PENDING_QUALITY_ACTION_MAX_AGE_MS) {
                clearPendingQualityAction();
            } else {
                const targetProject = projectsList.find((project) => (
                    String(project.projectId) === String(pendingQualityAction.projectId)
                )) || projectsList[0];

                if (targetProject) {
                    if (selectedProject?.projectId !== targetProject.projectId) {
                        setSelectedProject(targetProject);
                    }
                    if (currentView !== 2) {
                        setCurrentView(2);
                    }
                    return;
                }
            }
        }

        // Auto-select first project if none selected
        if (!selectedProject && projectsList.length > 0) {
            setSelectedProject(projectsList[0]);
        }
        // Handle errors
        if (projectsError) {
            logProjectPageFailure('projects_page_projects_load_failed', projectsError, {
                ...getProjectPageStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                projectCount: projectsList.length,
                selectedProjectPresent: Boolean(selectedProject?.projectId),
            });
            message.error(`Failed to load ${labels.offeringPhrase} data`);
        }
        if (projectError) {
            logProjectPageFailure('projects_page_project_load_failed', projectError, {
                ...getProjectPageProjectLogContext(selectedProject?.projectId, (selectedProject as any)?.masterProjectId),
                ...getProjectPageStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                projectCount: projectsList.length,
            });
            message.error(`Failed to load ${labels.offeringPhrase} data`);
        }
    }, [clearPendingQualityAction, currentView, labels.offeringPhrase, pendingQualityAction, projectError, projectsError, projectsList, selectedProject, storeDetails?.storeId, storeDetails?.tenantId]);

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
     * @see assessment-01-upload.md Task 14: Processing Timeout
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
        const detectedDetails = buildOwnerDetectedUploadDetails(result);

        let selectedFields = suggestions.map((suggestion) => suggestion.field);
        await new Promise<void>((resolve) => {
            Modal.confirm({
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
                        const writeResult = await updateStore({
                            storeId: storeDetails.storeId,
                            tenantId: storeDetails.tenantId,
                            ...updates,
                        });
                        assertStoreUpdateSucceeded(
                            writeResult,
                            storeDetails.storeId,
                            'projects_page_upload_business_details_store_update_rejected',
                        );
                        setStoreDetails((previous: any) => ({ ...previous, ...updates }));
                        message.success('Business details updated');
                    } catch (error) {
                        logProjectPageFailure('projects_page_upload_business_details_update_failed', error, {
                            ...getProjectPageProjectLogContext(activeProject?.projectId, (activeProject as any)?.masterProjectId),
                            ...getProjectPageStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                            selectedFieldCount: selectedFields.length,
                            suggestionCount: suggestions.length,
                        });
                        message.error('Could not update business details.');
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
                const detectedDetails = buildOwnerDetectedUploadDetails(result);
                const concernDetails = buildOwnerUploadConcernDetails(result);
                Modal.confirm({
                    title: decision.title,
                    content: (
                        <Flex gap={8} vertical>
                            <Typography.Text>{decision.message}</Typography.Text>
                            <OwnerDetectedDetails details={detectedDetails} concerns={concernDetails} />
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
                        resolve({ action: 'continue', files: filesForExtraction, ignoredFiles, identityOverrideConfirmed: true });
                    },
                    onCancel: async () => {
                        if (!canCreateNewProject) {
                            resolve({ action: 'cancel' });
                            return;
                        }

                        try {
                            if (!canCreateLocalProjects) {
                                message.info("New local menus are not enabled for this store.");
                                resolve({ action: 'cancel' });
                                return;
                            }

                            const projectPayload: ProjectCreationPayload = {
                                name: result?.identity?.businessName || 'New menu',
                                businessCategory: storeDetails?.businessCategory,
                                businessType: storeDetails?.businessType,
                                ...(sourceProject.languages?.length ? { languages: sourceProject.languages } : {}),
                                ...(sourceProject.defaultLanguage ? { defaultLanguage: sourceProject.defaultLanguage } : {}),
                            };
                            const newProject = await addProject(projectPayload);
                            assertProjectUpdateSucceeded(
                                newProject,
                                undefined,
                                'projects_page_upload_create_project_update_rejected',
                            );
                            if (!newProject?.projectId) {
                                throw new Error('projects_page_upload_create_project_update_rejected');
                            }

                            const projectMetadata = {
                                ...newProject.summaryData,
                                projectId: newProject.projectId,
                            } as ProjectMetadata;
                            setSelectedProject(projectMetadata);
                            mutateProjects(
                                (current) => current ? {
                                    ...current,
                                    projects: normalizeProjectsList(current.projects).some((project) => project.projectId === projectMetadata.projectId)
                                        ? normalizeProjectsList(current.projects)
                                        : [...normalizeProjectsList(current.projects), projectMetadata],
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
                                identityOverrideConfirmed: true,
                            });
                        } catch (error) {
                            logProjectPageFailure('projects_page_upload_new_menu_create_failed', error, {
                                ...getProjectPageProjectLogContext(sourceProject.projectId, (sourceProject as any)?.masterProjectId),
                                ...getProjectPageStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                                fileCount: filesForExtraction.length,
                                ignoredFileCount: ignoredFiles.length,
                                canCreateLocalProjects,
                            });
                            message.error('Could not create a new menu.');
                            resolve({ action: 'cancel' });
                        }
                    },
                });
            });
        } catch (error: any) {
            logMenuProcessingFailure('menu_upload_intake_preflight_skipped', error, {
                ...getMenuProcessingProjectLogContext(projectId),
                fileCount: files.length,
            });
            return { action: 'continue', files, ignoredFiles: [] };
        }
    }, [
        canCreateLocalProjects,
        maybeAcceptBusinessIdentitySuggestions,
        mutateProjects,
        storeDetails?.businessCategory,
        storeDetails?.businessType,
    ]);

    const uploadAndCreateJob = async (
        filesToProcess: ProjectFileType[],
        projectDataCopy: Project
    ): Promise<{ jobId: string; uploadedUrls: Map<string, string>; projectId: string } | null> => {
        const cleanupUploadedMenuFiles = async (
            files: MenuFileToProcess[],
            cleanupReason: string,
            projectId?: string | null,
        ) => {
            if (files.length === 0) return;

            const cleanupResults = await Promise.allSettled(files.map(file => deleteFileByUrl(file.url)));
            const failedCleanups = cleanupResults.filter((result) => result.status === 'rejected') as PromiseRejectedResult[];

            if (failedCleanups.length > 0) {
                logMenuProcessingFailure('menu_upload_uploaded_file_cleanup_failed', failedCleanups[0]?.reason, {
                    ...getMenuProcessingProjectLogContext(projectId),
                    ...getBoundedMenuProcessingStringContext('cleanupReason', cleanupReason),
                    attemptedCleanupCount: files.length,
                    failedCleanupCount: failedCleanups.length,
                });
            }
        };

        // Step 1: Upload ALL files to Firebase Storage in parallel
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
                logMenuProcessingFailure('menu_upload_file_upload_failed', (result as any).error, {
                    ...getMenuProcessingProjectLogContext(projectDataCopy.projectId),
                    ...getBoundedMenuProcessingStringContext('fileUid', result.file.uid),
                    ...getBoundedMenuProcessingStringContext('fileType', result.file.type),
                    fileSize: Number(result.file.size || 0),
                });
            }
        });

        if (successfulUploads.length !== filesToProcess.length) {
            throw new Error(`${filesToProcess.length - successfulUploads.length} file(s) failed to upload. Please check storage quota and try again.`);
        }

        if (successfulUploads.length === 0) {
            throw new Error('All file uploads failed');
        }

        const intakeDecision = await confirmMenuIntakeDecision(projectDataCopy.projectId, successfulUploads, projectDataCopy);
        if (intakeDecision.action === 'cancel') {
            await cleanupUploadedMenuFiles(successfulUploads, 'intake_cancelled', projectDataCopy.projectId);
            return null;
        }
        await cleanupUploadedMenuFiles(intakeDecision.ignoredFiles, 'intake_ignored_files', projectDataCopy.projectId);
        const filesForJob = intakeDecision.files;
        if (filesForJob.length === 0) {
            await cleanupUploadedMenuFiles(successfulUploads, 'no_files_for_job', projectDataCopy.projectId);
            return null;
        }
        const targetProjectId = intakeDecision.action === 'create_new_project'
            ? intakeDecision.projectId
            : projectDataCopy.projectId;

        // Step 2: Create job with uploaded files
        const targetLanguages = GlobalLanguagesList.filter(lang => projectDataCopy.languages.includes(lang.code));

        const { checkExistingActiveJob } = await import('@lib/firebase/menuProcessing');
        const existingJobId = await checkExistingActiveJob(targetProjectId);
        if (existingJobId) {
            await cleanupUploadedMenuFiles(filesForJob, 'existing_active_job', targetProjectId);
            return { jobId: existingJobId, uploadedUrls, projectId: targetProjectId };
        }

        const { jobId } = await withTimeout(
            createProcessingJob({
                files: filesForJob,
                targetLanguages,
                projectId: targetProjectId,
                businessCategory: storeDetails?.businessCategory,
                businessType: storeDetails?.businessType,
                identityOverrideConfirmed: intakeDecision.identityOverrideConfirmed,
            }),
            PROCESSING_TIMEOUT * filesToProcess.length,
        );

        return { jobId, uploadedUrls, projectId: targetProjectId };
    };

    const handleMenuLinkImport = useCallback(async () => {
        if (!FEATURE_FLAGS.ENABLE_MENU_LINK_IMPORT) return;
        if (!selectedProject?.projectId) {
            message.info('Create a menu before importing from a link.');
            return;
        }
        if (!menuLinkUrl.trim()) {
            message.error('Paste a public menu link.');
            return;
        }
        if (!menuLinkPermissionConfirmed) {
            message.error('Confirm you have permission to import this menu.');
            return;
        }
        if (hasPendingLocalUploadFiles) {
            message.info('Upload or clear selected files before importing a link.');
            return;
        }
        if (activeProcessingJobId) {
            message.info('Wait for the current import to finish.');
            return;
        }

        try {
            setMenuLinkImporting(true);
            const result = await createMenuLinkImportJob({
                permissionConfirmed: menuLinkPermissionConfirmed,
                projectId: selectedProject.projectId,
                url: menuLinkUrl.trim(),
            });

            setActiveProcessingJobId(result.jobId);
            setMenuLinkUrl('');
            setMenuLinkPermissionConfirmed(false);
            setMenuLinkImportModalOpen(false);
            message.success(result.reusedExistingJob ? 'Existing import is still running.' : 'Menu link import started.');
        } catch (error) {
            logProjectPageFailure('projects_page_menu_link_import_failed', error, {
                ...getProjectPageProjectLogContext(selectedProject?.projectId, (selectedProject as any)?.masterProjectId),
                ...getBoundedProjectPageStringContext('menuLinkUrl', menuLinkUrl),
                permissionConfirmed: Boolean(menuLinkPermissionConfirmed),
            });
            message.error('We could not read this menu link. Upload a photo/PDF or add the menu manually.');
        } finally {
            setMenuLinkImporting(false);
        }
    }, [activeProcessingJobId, hasPendingLocalUploadFiles, menuLinkPermissionConfirmed, menuLinkUrl, selectedProject?.projectId, setActiveProcessingJobId]);

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

            if (filesToProcess.length > MAX_MENU_EXTRACTION_FILES) {
                showMenuUploadFileLimitError(filesToProcess.length);
                return;
            }

            setFileProcessingId(filesToProcess[0].uid);

            // Upload files and create job
            const jobPayload = await uploadAndCreateJob(filesToProcess, projectDataCopy);
            if (!jobPayload) {
                setFileProcessingId(null);
                return;
            }
            const { jobId, projectId: targetProjectId } = jobPayload;

            // Server already saved files + extractedData to the project doc
            // (the callable blocks until processing is complete)
            // Just refetch project data to pick up backend changes
            if (targetProjectId === projectDataCopy.projectId) {
                await mutateProject();
            }

            // Set active job ID - the useEffect will handle completion
            setActiveProcessingJobId(jobId);

            // NOTE: Don't clear fileProcessingId here - it will be cleared when job completes

        } catch (error: any) {
            logMenuProcessingFailure('menu_upload_job_create_failed', error, {
                ...getMenuProcessingProjectLogContext(projectDataCopy.projectId),
            });
            setFileProcessingId(null);
            message.error('Processing could not be completed. Please try again.');
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
                            logMenuProcessingFailure('menu_upload_image_optimization_resized', undefined, {
                                ...getBoundedMenuProcessingStringContext('fileUid', file.uid),
                                originalWidth: optimized.originalWidth,
                                originalHeight: optimized.originalHeight,
                                optimizedWidth: optimized.width,
                                optimizedHeight: optimized.height,
                                compressionPercent: Math.round(optimized.compressionRatio * 100),
                            });
                        }
                    } catch (err) {
                        // Fallback to original if optimization fails
                        logMenuProcessingFailure('menu_upload_image_optimization_failed', err, {
                            ...getBoundedMenuProcessingStringContext('fileUid', file.uid),
                            ...getBoundedMenuProcessingStringContext('fileType', file.type),
                            fileSize: Number(file.size || 0),
                        });
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

        const existingPendingCount = getPendingMenuExtractionFileCount(projectDataCopy.files);
        if (existingPendingCount + newFileList.length > MAX_MENU_EXTRACTION_FILES) {
            showMenuUploadFileLimitError(newFileList.length, existingPendingCount);
            return;
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

                    if (pdf.numPages > MAX_PDF_PAGES) {
                        message.error({
                            content: `"${file.name}" has ${pdf.numPages} pages. Upload up to ${MAX_PDF_PAGES} pages at a time. Please split the PDF into smaller files.`,
                            duration: 8,
                        });
                        pdf.cleanup?.();
                        setFileProcessingId(null);
                        resolve(null);
                        return;
                    }

                    if (pdf.numPages > WARN_PDF_PAGES) {
                        message.warning({
                            content: `"${file.name}" has ${pdf.numPages} pages. This will take a few minutes to process and may use significant AI credits.`,
                            duration: 8,
                        });
                    }

                    setPdfPagesCount(prev => prev + pdf.numPages);

                    for (let i = 1; i <= pdf.numPages; i++) {
                        // Check cancel flag during page processing (use ref)
                        if (cancelPdfRef.current) {
                            pdf.cleanup?.();
                            setFileProcessingId(null);
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
                        page.cleanup?.();
                        canvas.width = 0;
                        canvas.height = 0;
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
                            pdf.cleanup?.();
                            resolve(false);
                        }
                    }
                } catch (error) {
                    logMenuProcessingFailure('menu_upload_pdf_conversion_failed', error, {
                        ...getBoundedMenuProcessingStringContext('fileUid', file.uid),
                        ...getBoundedMenuProcessingStringContext('fileType', file.type),
                        fileSize: Number(file.size || 0),
                    });
                    setFileProcessingId(null);
                    resolve(null);
                }
            };

            script.onerror = () => {
                logMenuProcessingFailure('menu_upload_pdf_library_load_failed');
                setFileProcessingId(null);
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

    const menuLinkImportPanel = FEATURE_FLAGS.ENABLE_MENU_LINK_IMPORT ? (
        <Flex
            gap={10}
            vertical
            style={{
                background: token.colorBgContainer,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: 8,
                padding: 16,
                width: '100%',
            }}
        >
            <Flex align="center" gap={10}>
                <LuGlobe2 size={20} color={token.colorPrimary} />
                <Typography.Text strong>Import from existing menu link</Typography.Text>
            </Flex>
            <Typography.Text type="secondary">
                We&apos;ll create a draft for review before anything is published.
            </Typography.Text>
            {hasPendingLocalUploadFiles ? (
                <Typography.Text type="secondary">
                    Upload or clear selected files before importing a link.
                </Typography.Text>
            ) : null}
            <Input
                disabled={menuLinkImporting || Boolean(activeProcessingJobId) || hasPendingLocalUploadFiles}
                onChange={(event) => setMenuLinkUrl(event.target.value)}
                onPressEnter={handleMenuLinkImport}
                placeholder="https://example.com/menu"
                value={menuLinkUrl}
            />
            <Checkbox
                checked={menuLinkPermissionConfirmed}
                disabled={menuLinkImporting || Boolean(activeProcessingJobId) || hasPendingLocalUploadFiles}
                onChange={(event) => setMenuLinkPermissionConfirmed(event.target.checked)}
            >
                I confirm this is my business menu or I have permission to import it.
            </Checkbox>
            <Flex justify="flex-end">
                <Button
                    disabled={!selectedProject?.projectId || !menuLinkUrl.trim() || !menuLinkPermissionConfirmed || Boolean(activeProcessingJobId) || hasPendingLocalUploadFiles}
                    icon={<LuGlobe2 size={18} />}
                    loading={menuLinkImporting}
                    onClick={handleMenuLinkImport}
                    type="primary"
                >
                    Import link
                </Button>
            </Flex>
        </Flex>
    ) : null;

    return (
        <Flex vertical gap={10}>
            {activeSubscriptionLoading ? <Spin style={{ display: 'block', marginTop: 80, textAlign: 'center' }} /> : (hasPaidAccess || hasStarterAccess) ? <>

                <ProjectsDataProvider
                    contextData={{ activeProject, setActiveProject: (data: Project) => mutateProject(data, { revalidate: false }), currentView, setCurrentView, activeBatchImageJob, setActiveBatchImageJob }}>
                    <LoadingMessage
                        open={Boolean(fileProcessingId) || isTrackedJobProcessing || isTrackedJobPending}
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
                    <Modal
                        destroyOnHidden
                        footer={null}
                        onCancel={() => setMenuLinkImportModalOpen(false)}
                        open={menuLinkImportModalOpen}
                        title="Import menu link"
                    >
                        {menuLinkImportPanel}
                    </Modal>

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
                                    <Flex gap={14} style={{ width: '100%' }} vertical>
                                        <Dragger {...uploadProps} style={{ minWidth: 700, width: "100%" }}>
                                            <Flex vertical gap={16} align='center' justify='center' style={{ width: '100%', padding: '40px 20px' }}>
                                                <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 8, fontWeight: 600 }}>{labels.uploadLabel}</Typography.Title>
                                                <Typography.Text type="secondary" style={{ textAlign: 'center', fontSize: '16px', maxWidth: 500 }}>
                                                    Drag and drop your {labels.offeringLower} photos or PDFs here, or click below to browse
                                                </Typography.Text>
                                                <Typography.Text type="secondary" style={{ textAlign: 'center', fontSize: '13px', color: token.colorTextTertiary }}>
                                                    We&apos;ll extract the items in a few minutes
                                                </Typography.Text>
                                                <Flex gap={20} align='center' justify='center'>
                                                    <Tooltip title="Upload JPG or PNG images">
                                                        <Button shape='circle' type='text' size='large' icon={<LuFileImage size={32} />} style={{ height: 56, width: 56, color: token.colorPrimaryTextActive, backgroundColor: token.colorPrimaryBg }} />
                                                    </Tooltip>
                                                    <Tooltip title="Upload PDF documents">
                                                        <Button shape='circle' type='text' size='large' icon={<LuFileText size={32} />} style={{ height: 56, width: 56, color: token.colorErrorTextActive, backgroundColor: token.colorErrorBg }} />
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
                                        {menuLinkImportPanel}
                                    </Flex>
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
                                    {menuLinkImportPanel}

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
                                            disabled={!selectedProject || fileProcessingId !== null || Boolean(activeProcessingJobId)}
                                            loading={fileProcessingId !== null || Boolean(activeProcessingJobId)}
                                        >
                                            {fileProcessingId !== null || Boolean(activeProcessingJobId)
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
                                        initialQualityAction={
                                            pendingQualityAction && (!pendingQualityAction.projectId || String(pendingQualityAction.projectId) === String(selectedProject?.projectId))
                                                ? pendingQualityAction.action
                                                : null
                                        }
                                        onQualityActionHandled={clearPendingQualityAction}
                                        addFileButton={
                                            <Flex gap={8} align="center">
                                                <Upload {...uploadProps} id="quick-action-upload" onChange={(info) => onSelectFile(info, 'quick-action-upload')}>
                                                    <Button icon={<LuFilePlus />}>Add Menu</Button>
                                                </Upload>
                                                {FEATURE_FLAGS.ENABLE_MENU_LINK_IMPORT ? (
                                                    <Tooltip title="Import from existing menu link">
                                                        <Button
                                                            disabled={menuLinkImporting || Boolean(activeProcessingJobId) || hasPendingLocalUploadFiles}
                                                            icon={<LuGlobe2 />}
                                                            onClick={() => setMenuLinkImportModalOpen(true)}
                                                        >
                                                            Import link
                                                        </Button>
                                                    </Tooltip>
                                                ) : null}
                                            </Flex>
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
                        const currentDefaultProject = normalizeProjectsList(projectsData?.projects).find((project: any) => project?.isDefault === true);
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
                    onGenerateProjectImage={handleGenerateProjectImageForForm}
                    onProjectImagePrepared={setProjectImagePreparedForSave}
                    onTranslatePublicContent={hasMissingProjectPublicDrafts ? () => void handleTranslateProjectPublicContent() : undefined}
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
                    translateActionDisabled={isTranslatingProjectPublicContent}
                    translateActionLoading={isTranslatingProjectPublicContent}
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
                        storeName={storeContextName}
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
                        storeData={storeDetails as any}
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
                        currencyCode={storeDetails?.currencyCode || (storeDetails as any)?.currency}
                        businessType={storeDetails?.businessType}
                        businessCategory={storeDetails?.businessCategory}
                        brandColor={(storeDetails as any)?.publicPresence?.accentColor
                            || (storeDetails as any)?.primaryColor
                            || (storeDetails as any)?.brandColor
                            || (storeDetails as any)?.themeColor}
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
                {showReviewScreen && comparisonResult && activeProcessingJobId && activeJobMatchesActiveProject && activeJobProjectId && (
                    <ExtractionJobReviewModal
                        open={showReviewScreen}
                        projectId={activeJobProjectId}
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
                    visible={(isTrackedJobProcessing && !showReviewScreen) || isMasterJobActive}
                    isLocalJob={isTrackedJobProcessing && !isMasterJobActive}
                    progress={jobProgress}
                    currentStep={jobCurrentStep}
                    blockingMessage={masterBlockingMessage}
                    onCancel={cancelJob}
                    canCancel={isTrackedJobProcessing}
                />
            </> : <NoSubscriptionView />}

        </Flex>
    );
}

export default ProjectsPage;
