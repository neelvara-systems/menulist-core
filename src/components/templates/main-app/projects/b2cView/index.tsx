import { assertProjectUpdateSucceeded, publishProject, uploadFile } from "@database/projects";
import { deleteOBPPhotos } from "@database/stores/uploadOBPPhoto";
import { collectObpMediaReferences } from "@lib/media/obpMediaReferences";
import { getDataUrlMimeType } from "@lib/media/imageProfiles";
import { isDataUrl } from "@lib/media/mediaStorage";
import { assertStoreUpdateSucceeded, updateStore } from "@database/stores";
import { useAppDispatch } from "@hook/useAppDispatch";
import { resolveRenderLanguage } from "@lib/localization/languageResolver";
import { getProjectDefaultLanguage } from "@lib/localization/projectContent";
import { normalizeOwnerPublicPresenceLinks } from "@lib/obp/ownerPublicPresenceBoundary";
import { getStoreDeepDifference } from "@lib/store/storeNestedUpdateProjection";
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from "@providers/platformProviders/platformGlobalDataProvider";
import { ProjectsDataContext, ProjectsDataProviderType } from "@providers/projectsDataProvider";
import { startLoader, stopLoader } from "@reduxSlices/loader";
import { showSuccessToast } from "@reduxSlices/toast";
import { buildBusinessCopyManualOverrideMeta } from "@services/ai/businessCopy/metadata";
import MainContentRenderer from "@template/website/mainContentRenderer";
import { StoreDataType } from "@type/platform/store";
import { removeObjRef } from "@util/utils";
import { generateProjectUrl } from "@lib/utils/slugify";
import {
    MENULIST_ANSWERLATTICE_EVENTS,
    emitMenuListAnswerlatticeWorkflowEvent,
    isVerifiedMenuPublishResult,
} from "@lib/answerlattice/referenceClients/menuListGuidedResolution";
import { Flex, message } from "antd";
import { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useRef, useState } from "react";
import { resolveMenuDesignConfig } from "./designSystem";
import { getBoundedProjectPageStringContext, getProjectPageProjectLogContext, getProjectPageStoreLogContext, logProjectPageFailure } from "../utils/projectPageDiagnostics";
import { Project } from '../types';
import PreviewModal from "./previewModal";
import B2CSidebar from "./sidebar";
import { DeviceTypes, PageType } from "./types";

interface B2CViewProps {
    activeDeviceType: DeviceTypes;
    setHasChanges?: (hasChanges: boolean) => void;
}

export interface B2CViewRef {
    publish: () => Promise<void>;
    openPreview: () => void;
}

const B2CView = forwardRef<B2CViewRef, B2CViewProps>(({ activeDeviceType, setHasChanges }, ref) => {

    const [activePage, setActivePage] = useState<PageType>(PageType.OBP);
    const { activeProject, setActiveProject } = useContext<ProjectsDataProviderType>(ProjectsDataContext)
    const { storeDetails, setStoreDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);

    // Multi-chain language governance: Resolve initial language using priority system
    // Priority: 1. URL ?lang= (not applicable in preview), 2. store.defaultLanguage, 3. 'en' fallback
    const [activeLanguage, setActiveLanguage] = useState(() =>
        resolveRenderLanguage(
            null,
            getProjectDefaultLanguage(activeProject, storeDetails),
            activeProject.languages || ['en'],
        )
    );
    const [projectData, setProjectData] = useState<Project>(removeObjRef(activeProject));
    const [storeDraft, setStoreDraft] = useState<StoreDataType | null>(storeDetails ? removeObjRef(storeDetails) : null);
    const [lastPublishedStoreDraft, setLastPublishedStoreDraft] = useState<StoreDataType | null>(storeDetails ? removeObjRef(storeDetails) : null);
    const [obpPhotoDeleteQueue, setObpPhotoDeleteQueue] = useState<string[]>([]);
    const obpPhotoDeleteQueueRef = useRef<string[]>([]);
    const persistedPublicPresenceRef = useRef(storeDetails?.publicPresence);
    const [obpPhotoDeleteResetToken, setObpPhotoDeleteResetToken] = useState(0);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [lastPublishedState, setLastPublishedState] = useState<Project | null>(null);
    const dispatch = useAppDispatch();

    const hasProjectChanges = () => {
        if (!projectData || !lastPublishedState) return false;
        return JSON.stringify(projectData) !== JSON.stringify(lastPublishedState);
    };

    const hasOfficialPageChanges = () => (
        JSON.stringify(storeDraft?.publicPresence || {}) !== JSON.stringify(lastPublishedStoreDraft?.publicPresence || {})
    );

    const hasBusinessCopyPresenceChanges = () => {
        const draftPresence = storeDraft?.publicPresence || {};
        const savedPresence = lastPublishedStoreDraft?.publicPresence || {};
        return ['descriptor', 'knownFor', 'specialNote'].some((field) => (
            JSON.stringify(draftPresence[field]) !== JSON.stringify(savedPresence[field])
        ));
    };

    const handleObpPhotoDeleteQueueChange = useCallback((photoUrls: string[]) => {
        obpPhotoDeleteQueueRef.current = [...photoUrls];
        setObpPhotoDeleteQueue((previous) => {
            const previousKey = JSON.stringify(previous);
            const nextKey = JSON.stringify(photoUrls);
            return previousKey === nextKey ? previous : [...photoUrls];
        });
    }, []);

    useEffect(() => {
        obpPhotoDeleteQueueRef.current = obpPhotoDeleteQueue;
    }, [obpPhotoDeleteQueue]);

    useEffect(() => {
        persistedPublicPresenceRef.current = lastPublishedStoreDraft?.publicPresence;
    }, [lastPublishedStoreDraft?.publicPresence]);

    useEffect(() => () => {
        if (obpPhotoDeleteQueueRef.current.length === 0) return;
        void deleteOBPPhotos(
            obpPhotoDeleteQueueRef.current,
            collectObpMediaReferences(persistedPublicPresenceRef.current),
        );
    }, []);

    // Expose functions to parent via ref
    useImperativeHandle(ref, () => ({
        openPreview: () => setPreviewModalOpen(true),
        publish: async () => {
            const loaderId = "Publishing public page changes";
            dispatch(startLoader(loaderId));
            try {
                let updatedProjectCopy: Project | null = null;
                const hasOfficialChanges = hasOfficialPageChanges();
                const queuedObpPhotoDeletes = [...obpPhotoDeleteQueue];
                const normalizedOfficialLinks = hasOfficialChanges
                    ? normalizeOwnerPublicPresenceLinks(storeDraft?.publicPresence || {})
                    : null;
                if (normalizedOfficialLinks?.invalidKeys.length) {
                    message.error('Enter valid HTTPS public-page links before publishing.');
                    return;
                }

                if (hasProjectChanges()) {
                    const projectCopy: Project = removeObjRef(projectData);
                    if (projectCopy?.config?.design?.menu) {
                        projectCopy.config.design.menu = resolveMenuDesignConfig(projectCopy.config.design.menu);
                    }

                    const menuBg = projectCopy?.config?.design?.menu?.backgroundImage;
                    if (isDataUrl(menuBg)) {
                        projectCopy.config.design.menu.backgroundImage = await uploadFile({ url: menuBg, type: getDataUrlMimeType(menuBg, 'image/jpeg'), uid: projectData.projectId }, 'assets');
                    }

                    const updatedProject: Project = await publishProject(projectCopy, {
                        expectedModifiedOn: (projectCopy as Project & { modifiedOn?: unknown }).modifiedOn,
                    });
                    assertProjectUpdateSucceeded(
                        updatedProject,
                        projectCopy.projectId,
                        'projects_b2c_publish_project_update_rejected',
                    );
                    updatedProjectCopy = removeObjRef(updatedProject);
                    setProjectData(updatedProjectCopy);
                    setActiveProject(updatedProjectCopy);
                    setLastPublishedState(updatedProjectCopy);
                    if (updatedProjectCopy.lastPublishedAt) {
                        setStoreDetails((current: StoreDataType | null) => (
                            current && String(current.storeId) === String(storeDetails?.storeId)
                                ? { ...current, lastPublishedAt: updatedProjectCopy?.lastPublishedAt }
                                : current
                        ));
                        setStoreDraft((current) => current
                            ? { ...current, lastPublishedAt: updatedProjectCopy?.lastPublishedAt }
                            : current);
                        setLastPublishedStoreDraft((current) => current
                            ? { ...current, lastPublishedAt: updatedProjectCopy?.lastPublishedAt }
                            : current);
                    }

                    // 🩺 Post-publish health verification (fire-and-forget)
                    // Runs in background — does NOT block UI or affect success toast
                    let verificationPublicMenuUrl: string | undefined;
                    try {
                        const { verifyMenuPublish } = await import('@lib/firebase/functions');
                        const hasTenantUrl = Boolean(storeDetails?.subdomain || storeDetails?.customDomain);
                        if (hasTenantUrl && storeDetails?.storeId && storeDetails?.tenantId) {
                            verificationPublicMenuUrl = generateProjectUrl(
                                storeDetails?.subdomain,
                                storeDetails?.customDomain,
                                updatedProjectCopy?.name || projectCopy.name,
                                Boolean(updatedProjectCopy?.isDefault ?? projectCopy.isDefault),
                            );
                            void verifyMenuPublish({
                                storeId: String(storeDetails.storeId),
                                tenantId: String(storeDetails.tenantId),
                                publicMenuUrl: verificationPublicMenuUrl,
                            }).then((verificationResult) => {
                                if (isVerifiedMenuPublishResult(verificationResult)) {
                                    emitMenuListAnswerlatticeWorkflowEvent(MENULIST_ANSWERLATTICE_EVENTS.MENU_PUBLISH_VERIFIED);
                                }
                            }).catch((verificationError) => {
                                logProjectPageFailure('projects_b2c_publish_verification_failed', verificationError, {
                                    ...getProjectPageProjectLogContext(projectData?.projectId, projectData?.masterProjectId),
                                    ...getProjectPageStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                                    ...getBoundedProjectPageStringContext('publicMenuUrl', verificationPublicMenuUrl),
                                });
                            });
                        }
                    } catch (verificationSetupError) {
                        logProjectPageFailure('projects_b2c_publish_verification_setup_failed', verificationSetupError, {
                            ...getProjectPageProjectLogContext(projectData?.projectId, projectData?.masterProjectId),
                            ...getProjectPageStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                            ...getBoundedProjectPageStringContext('storeSlug', storeDetails?.subdomain),
                            ...getBoundedProjectPageStringContext('customDomain', storeDetails?.customDomain),
                            ...getBoundedProjectPageStringContext('publicMenuUrl', verificationPublicMenuUrl),
                        });
                    }
                }

                if (hasOfficialChanges && storeDraft?.storeId) {
                    const storeUpdate: any = {
                        storeId: storeDraft.storeId,
                        publicPresence: normalizedOfficialLinks?.presence || storeDraft.publicPresence || {},
                    };

                    if (hasBusinessCopyPresenceChanges()) {
                        storeUpdate.businessCopyMeta = buildBusinessCopyManualOverrideMeta({
                            existingMeta: storeDetails?.businessCopyMeta,
                            fieldKeys: ['descriptor', 'knownFor', 'specialNote'],
                        });
                    }

                    const writeResult = await updateStore({
                        ...getStoreDeepDifference(storeUpdate, storeDetails || {}),
                        storeId: storeDraft.storeId,
                    });
                    assertStoreUpdateSucceeded(
                        writeResult,
                        storeDraft.storeId,
                        'projects_b2c_official_page_store_update_rejected',
                    );
                    const nextStoreDetails = removeObjRef({
                        ...(storeDetails || {}),
                        ...storeUpdate,
                        ...(updatedProjectCopy?.lastPublishedAt
                            ? { lastPublishedAt: updatedProjectCopy.lastPublishedAt }
                            : {}),
                    });
                    persistedPublicPresenceRef.current = nextStoreDetails.publicPresence;
                    setStoreDetails(nextStoreDetails);
                    setStoreDraft(nextStoreDetails);
                    setLastPublishedStoreDraft(removeObjRef(nextStoreDetails));
                }

                if (queuedObpPhotoDeletes.length > 0) {
                    const failedPhotoDeletes = await deleteOBPPhotos(
                        queuedObpPhotoDeletes,
                        collectObpMediaReferences(storeDraft?.publicPresence),
                    );
                    obpPhotoDeleteQueueRef.current = failedPhotoDeletes;
                    setObpPhotoDeleteQueue(failedPhotoDeletes);
                    if (failedPhotoDeletes.length === 0) {
                        setObpPhotoDeleteResetToken((token) => token + 1);
                    }
                }

                if (updatedProjectCopy || hasOfficialChanges || queuedObpPhotoDeletes.length > 0) {
                    dispatch(showSuccessToast("Public page changes published"));
                }
                if (updatedProjectCopy) {
                    emitMenuListAnswerlatticeWorkflowEvent(MENULIST_ANSWERLATTICE_EVENTS.MENU_PUBLISH_COMPLETED);
                }
                setHasChanges?.(false);
            } catch (error) {
                logProjectPageFailure('projects_b2c_publish_failed', error, {
                    ...getProjectPageProjectLogContext(projectData?.projectId, projectData?.masterProjectId),
                    ...getProjectPageStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                    hasProjectChanges: hasProjectChanges(),
                    hasOfficialPageChanges: hasOfficialPageChanges(),
                    queuedObpPhotoDeleteCount: obpPhotoDeleteQueue.length,
                });
                message.error('Could not publish public page changes.');
            } finally {
                dispatch(stopLoader(loaderId));
            }
        }
    }), [projectData, lastPublishedState, storeDraft, lastPublishedStoreDraft, obpPhotoDeleteQueue, dispatch, setActiveProject, setHasChanges, setStoreDetails, storeDetails]);

    // Track project changes and notify parent
    useEffect(() => {
        if (!projectData) return;

        if (!lastPublishedState) {
            setLastPublishedState(removeObjRef(projectData));
        }

        setHasChanges?.(hasProjectChanges() || hasOfficialPageChanges() || obpPhotoDeleteQueue.length > 0);
    }, [projectData, lastPublishedState, storeDraft, lastPublishedStoreDraft, obpPhotoDeleteQueue, setHasChanges]);

    useEffect(() => {
        const abandonedPhotoCandidates = [...obpPhotoDeleteQueueRef.current];
        if (abandonedPhotoCandidates.length > 0) {
            void deleteOBPPhotos(
                abandonedPhotoCandidates,
                collectObpMediaReferences(persistedPublicPresenceRef.current),
            );
        }
        if (!storeDetails) {
            obpPhotoDeleteQueueRef.current = [];
            persistedPublicPresenceRef.current = undefined;
            setStoreDraft(null);
            setLastPublishedStoreDraft(null);
            return;
        }
        const clonedStore = removeObjRef(storeDetails);
        obpPhotoDeleteQueueRef.current = [];
        persistedPublicPresenceRef.current = clonedStore.publicPresence;
        setStoreDraft(clonedStore);
        setLastPublishedStoreDraft(removeObjRef(clonedStore));
        setObpPhotoDeleteQueue([]);
        setObpPhotoDeleteResetToken((token) => token + 1);
    }, [storeDetails?.storeId]);

    return (
        <Flex vertical style={{ width: '100%', position: 'relative' }} gap={10}>
            <Flex style={{ width: '100%' }} gap={16}>
                <MainContentRenderer
                    activeDeviceType={activeDeviceType}
                    projectData={projectData}
                    storeDetails={storeDraft || storeDetails}
                    activePage={activePage}
                    setActivePage={setActivePage}
                    activeLanguage={activeLanguage}
                    setActiveLanguage={setActiveLanguage}
                    fromPage="b2c"
                    previewMode
                />
                <B2CSidebar
                    activePage={activePage}
                    setActivePage={setActivePage}
                    projectData={projectData}
                    setProjectData={setProjectData}
                    storeDraft={storeDraft}
                    setStoreDraft={setStoreDraft}
                    obpPhotoDeleteResetToken={obpPhotoDeleteResetToken}
                    onObpPhotoDeleteQueueChange={handleObpPhotoDeleteQueueChange}
                    setActiveLanguage={setActiveLanguage}
                />
                <PreviewModal
                    projectData={projectData}
                    storeDetails={storeDraft || storeDetails}
                    previewModalOpen={previewModalOpen}
                    setPreviewModalOpen={setPreviewModalOpen}
                    editorActivePage={activePage}
                    activeLanguage={activeLanguage}
                    setActiveLanguage={setActiveLanguage}
                />
            </Flex>
        </Flex>
    );
});

B2CView.displayName = 'B2CView';

export default B2CView
