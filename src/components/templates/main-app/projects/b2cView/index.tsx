import { publishProject, uploadFile } from "@database/projects";
import { useAppDispatch } from "@hook/useAppDispatch";
import { resolveRenderLanguage } from "@lib/localization/languageResolver";
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from "@providers/platformProviders/platformGlobalDataProvider";
import { ProjectsDataContext, ProjectsDataProviderType } from "@providers/projectsDataProvider";
import { startLoader, stopLoader } from "@reduxSlices/loader";
import { showSuccessToast } from "@reduxSlices/toast";
import MainContentRenderer from "@template/website/mainContentRenderer";
import { removeObjRef } from "@util/utils";
import { Flex } from "antd";
import { forwardRef, useContext, useEffect, useImperativeHandle, useState } from "react";
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

    const [activePage, setActivePage] = useState<PageType>(PageType.HOME);
    const { activeProject, setActiveProject } = useContext<ProjectsDataProviderType>(ProjectsDataContext)
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);

    // Multi-chain language governance: Resolve initial language using priority system
    // Priority: 1. URL ?lang= (not applicable in preview), 2. store.defaultLanguage, 3. 'en' fallback
    const [activeLanguage, setActiveLanguage] = useState(() =>
        resolveRenderLanguage(null, storeDetails?.defaultLanguage, activeProject.languages || ['en'])
    );
    const [projectData, setProjectData] = useState<Project>(removeObjRef(activeProject));
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [lastPublishedState, setLastPublishedState] = useState<Project | null>(null);
    const dispatch = useAppDispatch();

    // Expose functions to parent via ref
    useImperativeHandle(ref, () => ({
        openPreview: () => setPreviewModalOpen(true),
        publish: async () => {
            dispatch(startLoader("Project publishing started"));
            const projectCopy: Project = removeObjRef(projectData);

            // Handle background images (convert base64 to Firebase Storage URL)
            const homeBg = projectCopy?.config?.design?.home?.backgroundImage;
            if (homeBg && homeBg.includes('base64')) {
                projectCopy.config.design.home.backgroundImage = await uploadFile({ url: homeBg, type: 'image/png', uid: projectData.projectId }, 'assets');
            }

            const menuBg = projectCopy?.config?.design?.menu?.backgroundImage;
            if (menuBg && menuBg.includes('base64')) {
                projectCopy.config.design.menu.backgroundImage = await uploadFile({ url: menuBg, type: 'image/png', uid: projectData.projectId }, 'assets');
            }

            const updatedProject: Project = await publishProject(projectCopy);

            dispatch(stopLoader("Project publishing completed"));
            dispatch(showSuccessToast("Project published successfully"));

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

            // Update project data with the latest from server
            const updatedProjectCopy = removeObjRef(updatedProject);
            setProjectData(updatedProjectCopy);
            setActiveProject(updatedProjectCopy);

            // Update the last published state to match the current state
            setLastPublishedState(updatedProjectCopy);
            setHasChanges?.(false);
        }
    }), [projectData, dispatch, setActiveProject, setHasChanges]);

    // Track project changes and notify parent
    useEffect(() => {
        if (!projectData) return;

        if (!lastPublishedState) {
            setLastPublishedState(removeObjRef(projectData));
            setHasChanges?.(false);
            return;
        }

        const currentJSON = JSON.stringify(projectData);
        const publishedJSON = JSON.stringify(lastPublishedState);
        const projectChanged = currentJSON !== publishedJSON;
        setHasChanges?.(projectChanged);
    }, [projectData, lastPublishedState, setHasChanges]);

    return (
        <Flex vertical style={{ width: '100%', position: 'relative' }} gap={10}>
            <Flex style={{ width: '100%' }} gap={16}>
                <MainContentRenderer
                    activeDeviceType={activeDeviceType}
                    projectData={projectData}
                    storeDetails={storeDetails}
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
                />
                <PreviewModal
                    projectData={projectData}
                    storeDetails={storeDetails}
                    previewModalOpen={previewModalOpen}
                    setPreviewModalOpen={setPreviewModalOpen}
                    activeLanguage={activeLanguage}
                    setActiveLanguage={setActiveLanguage}
                />
            </Flex>
        </Flex>
    );
});

B2CView.displayName = 'B2CView';

export default B2CView