import { assertProjectUpdateSucceeded, publishProject, uploadFile } from "@database/projects";
import { deleteOBPPhotos } from "@database/stores/uploadOBPPhoto";
import { getDataUrlMimeType } from "@lib/media/imageProfiles";
import { assertStoreUpdateSucceeded, updateStore } from "@database/stores";
import { useAppDispatch } from "@hook/useAppDispatch";
import { resolveRenderLanguage } from "@lib/localization/languageResolver";
import { getProjectDefaultLanguage } from "@lib/localization/projectContent";
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from "@providers/platformProviders/platformGlobalDataProvider";
import { ProjectsDataContext, ProjectsDataProviderType } from "@providers/projectsDataProvider";
import { startLoader, stopLoader } from "@reduxSlices/loader";
import { showSuccessToast } from "@reduxSlices/toast";
import { buildBusinessCopyManualOverrideMeta } from "@services/ai/businessCopy/metadata";
import MainContentRenderer from "@template/website/mainContentRenderer";
import { StoreDataType } from "@type/platform/store";
import { removeObjRef } from "@util/utils";
import { generateProjectUrl } from "@lib/utils/slugify";
import { Flex, message } from "antd";
import { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useState } from "react";
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
        setObpPhotoDeleteQueue((previous) => {
            const previousKey = JSON.stringify(previous);
            const nextKey = JSON.stringify(photoUrls);
            return previousKey === nextKey ? previous : [...photoUrls];
        });
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

                if (hasProjectChanges()) {
                    const projectCopy: Project = removeObjRef(projectData);
                    if (projectCopy?.config?.design?.menu) {
                        projectCopy.config.design.menu = resolveMenuDesignConfig(projectCopy.config.design.menu);
                    }

                    const menuBg = projectCopy?.config?.design?.menu?.backgroundImage;
                    if (menuBg && menuBg.includes('base64')) {
                        projectCopy.config.design.menu.backgroundImage = await uploadFile({ url: menuBg, type: getDataUrlMimeType(menuBg, 'image/jpeg'), uid: projectData.projectId }, 'assets');
                    }

                    const updatedProject: Project = await publishProject(projectCopy);
                    assertProjectUpdateSucceeded(
                        updatedProject,
                        projectCopy.projectId,
                        'projects_b2c_publish_project_update_rejected',
                    );
                    updatedProjectCopy = removeObjRef(updatedProject);
                    setProjectData(updatedProjectCopy);
                    setActiveProject(updatedProjectCopy);
                    setLastPublishedState(updatedProjectCopy);

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
                            verifyMenuPublish({
                                storeId: String(storeDetails.storeId),
                                tenantId: String(storeDetails.tenantId),
                                publicMenuUrl: verificationPublicMenuUrl,
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
                        publicPresence: storeDraft.publicPresence || {},
                    };

                    if (hasBusinessCopyPresenceChanges()) {
                        storeUpdate.businessCopyMeta = buildBusinessCopyManualOverrideMeta({
                            existingMeta: storeDetails?.businessCopyMeta,
                            fieldKeys: ['descriptor', 'knownFor', 'specialNote'],
                        });
                    }

                    const writeResult = await updateStore(storeUpdate);
                    assertStoreUpdateSucceeded(
                        writeResult,
                        storeDraft.storeId,
                        'projects_b2c_official_page_store_update_rejected',
                    );
                    const nextStoreDetails = removeObjRef({
                        ...(storeDetails || {}),
                        ...storeUpdate,
                    });
                    setStoreDetails(nextStoreDetails);
                    setStoreDraft(nextStoreDetails);
                    setLastPublishedStoreDraft(removeObjRef(nextStoreDetails));
                }

                if (queuedObpPhotoDeletes.length > 0) {
                    await deleteOBPPhotos(queuedObpPhotoDeletes);
                    setObpPhotoDeleteQueue([]);
                    setObpPhotoDeleteResetToken((token) => token + 1);
                }

                if (updatedProjectCopy || hasOfficialChanges || queuedObpPhotoDeletes.length > 0) {
                    dispatch(showSuccessToast("Public page changes published"));
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
        if (!storeDetails) {
            setStoreDraft(null);
            setLastPublishedStoreDraft(null);
            return;
        }
        const clonedStore = removeObjRef(storeDetails);
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
