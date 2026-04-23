'use client'

import { FEATURE_FLAGS } from '@config/features';
import { getScreenState } from '@database/campaigns';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { buildScreenUrl } from '@lib/screen/utils';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useCallback, useContext, useEffect, useState } from 'react';
import { Flex, NavBar } from '../antd';
import MobilePresenceMonitor from '../components/PresenceMonitor';
import { useMobileProjects } from '../providers/MobileProjectsProvider';

interface MobilePresenceMonitorScreenProps {
    onBack: () => void;
}

export default function MobilePresenceMonitorScreen({ onBack }: MobilePresenceMonitorScreenProps) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const { isLoading: loadingProjects, projectsList, selectedProjectId } = useMobileProjects();
    const [hasScreen, setHasScreen] = useState(false);
    const [menuLink, setMenuLink] = useState('');

    const loadState = useCallback(async () => {
        if (!storeDetails) return;

        const defaultProject = projectsList.find((project: any) => project.projectId === selectedProjectId) || projectsList[0] || null;
        if (!defaultProject) return;

        const subdomain = storeDetails.subdomain || '';
        const customDomain = storeDetails.customDomain;
        const obpLink = generateOBPUrl(subdomain, customDomain);
        setMenuLink(generateProjectUrl(subdomain, customDomain, defaultProject.name, false));

        try {
            const screenState = await getScreenState();
            setHasScreen(Boolean(screenState?.screenToken && buildScreenUrl(screenState.screenToken, obpLink)));
        } catch {
            setHasScreen(false);
        }
    }, [projectsList, selectedProjectId, storeDetails]);

    useEffect(() => {
        if (!storeDetails || loadingProjects) return;
        void loadState();
    }, [loadState, loadingProjects, storeDetails]);

    if (!FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR || !storeDetails) return null;

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <NavBar onBack={onBack} />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <MobilePresenceMonitor
                    hasFeedbackEnabled={storeDetails.feedbackEnabled !== false}
                    hasPublishedMenu={Boolean(storeDetails.subdomain || storeDetails.customDomain)}
                    hasScreen={hasScreen}
                    menuLink={menuLink}
                    storeDetails={storeDetails as any}
                />
            </Flex>
        </Flex>
    );
}
