'use client'

import { FEATURE_FLAGS } from '@config/features';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import {
    hasFeedbackPresenceReadiness,
    hasPublishedMenuProject,
} from '@lib/menuPresence/presenceReadiness';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useContext, useMemo } from 'react';
import { Flex } from '../antd';
import MobilePresenceMonitor from '../components/PresenceMonitor';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import { useMobileProjects } from '../providers/MobileProjectsProvider';

interface MobilePresenceMonitorScreenProps {
    onBack: () => void;
}

export default function MobilePresenceMonitorScreen({ onBack }: MobilePresenceMonitorScreenProps) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const { projectsList } = useMobileProjects();
    const obpLink = useMemo(() => {
        if (!storeDetails) return '';
        return generateOBPUrl(storeDetails.subdomain || '', storeDetails.customDomain);
    }, [storeDetails]);
    const hasPublishedMenu = useMemo(
        () => hasPublishedMenuProject(projectsList),
        [projectsList],
    );

    if (!FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR || !storeDetails) return null;

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description="Check where your menu is already visible and confirm the online surfaces where you have placed your official link."
                onBack={onBack}
                title="Presence Monitor"
            />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <MobilePresenceMonitor
                    hasFeedbackEnabled={hasFeedbackPresenceReadiness({
                        feedbackEnabled: storeDetails.feedbackEnabled,
                        hasPublishedMenu,
                    })}
                    hidePageSummary
                    hasPublishedMenu={hasPublishedMenu}
                    obpLink={obpLink}
                    storeDetails={storeDetails as any}
                />
            </Flex>
        </Flex>
    );
}
