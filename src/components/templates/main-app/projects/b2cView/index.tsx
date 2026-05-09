import { publishProject, uploadFile } from "@database/projects";
import { getDataUrlMimeType } from "@lib/media/imageProfiles";
import { updateStore } from "@database/stores";
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
import { Flex } from "antd";
import { forwardRef, useContext, useEffect, useImperativeHandle, useState } from "react";
import { resolveMenuDesignConfig } from "./designSystem";
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

    // Expose functions to parent via ref
    useImperativeHandle(ref, () => ({
        openPreview: () => setPreviewModalOpen(true),
        publish: async () => {
            const loaderId = "Publishing public page changes";
            dispatch(startLoader(loaderId));
            try {
                let updatedProjectCopy: Project | null = null;

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
                    updatedProjectCopy = removeObjRef(updatedProject);
                    setProjectData(updatedProjectCopy);
                    setActiveProject(updatedProjectCopy);
                    setLastPublishedState(updatedProjectCopy);

                    // 🩺 Post-publish health verification (fire-and-forget)
                    // Runs in background — does NOT block UI or affect success toast
                    try {
                        const { verifyMenuPublish } = await import('@lib/firebase/functions');
                        const slug = storeDetails?.subdomain;
                        if (slug && storeDetails?.storeId && storeDetails?.tenantId) {
                            const { getMenuUrl } = await import('@constant/urls');
                            const publicMenuUrl = getMenuUrl(slug);
                            verifyMenuPublish({
                                storeId: String(storeDetails.storeId),
                                tenantId: String(storeDetails.tenantId),
                                publicMenuUrl,
                            });
                        }
                    } catch { /* non-blocking */ }
                }

                if (hasOfficialPageChanges() && storeDraft?.storeId) {
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

                    await updateStore(storeUpdate);
                    const nextStoreDetails = removeObjRef({
                        ...(storeDetails || {}),
                        ...storeUpdate,
                    });
                    setStoreDetails(nextStoreDetails);
                    setStoreDraft(nextStoreDetails);
                    setLastPublishedStoreDraft(removeObjRef(nextStoreDetails));
                }

                if (updatedProjectCopy || hasOfficialPageChanges()) {
                    dispatch(showSuccessToast("Public page changes published"));
                }
                setHasChanges?.(false);
            } finally {
                dispatch(stopLoader(loaderId));
            }
        }
    }), [projectData, lastPublishedState, storeDraft, lastPublishedStoreDraft, dispatch, setActiveProject, setHasChanges, setStoreDetails, storeDetails]);

    // Track project changes and notify parent
    useEffect(() => {
        if (!projectData) return;

        if (!lastPublishedState) {
            setLastPublishedState(removeObjRef(projectData));
        }

        setHasChanges?.(hasProjectChanges() || hasOfficialPageChanges());
    }, [projectData, lastPublishedState, storeDraft, lastPublishedStoreDraft, setHasChanges]);

    useEffect(() => {
        if (!storeDetails) {
            setStoreDraft(null);
            setLastPublishedStoreDraft(null);
            return;
        }
        const clonedStore = removeObjRef(storeDetails);
        setStoreDraft(clonedStore);
        setLastPublishedStoreDraft(removeObjRef(clonedStore));
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
                />
                <B2CSidebar
                    activePage={activePage}
                    setActivePage={setActivePage}
                    projectData={projectData}
                    setProjectData={setProjectData}
                    storeDraft={storeDraft}
                    setStoreDraft={setStoreDraft}
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
