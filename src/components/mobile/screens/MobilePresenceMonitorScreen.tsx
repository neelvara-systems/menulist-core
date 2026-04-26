'use client'

import { FEATURE_FLAGS } from '@config/features';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useContext, useMemo } from 'react';
import { Flex, NavBar } from '../antd';
import MobilePresenceMonitor from '../components/PresenceMonitor';

interface MobilePresenceMonitorScreenProps {
    onBack: () => void;
}

export default function MobilePresenceMonitorScreen({ onBack }: MobilePresenceMonitorScreenProps) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const obpLink = useMemo(() => {
        if (!storeDetails) return '';
        return generateOBPUrl(storeDetails.subdomain || '', storeDetails.customDomain);
    }, [storeDetails]);

    if (!FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR || !storeDetails) return null;

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <NavBar onBack={onBack} />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <MobilePresenceMonitor
                    hasFeedbackEnabled={storeDetails.feedbackEnabled !== false}
                    hasPublishedMenu={Boolean(storeDetails.subdomain || storeDetails.customDomain)}
                    obpLink={obpLink}
                    storeDetails={storeDetails as any}
                />
            </Flex>
        </Flex>
    );
}
