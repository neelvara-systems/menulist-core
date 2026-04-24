'use client'

import { FEATURE_FLAGS } from '@config/features';
import { getScreenState } from '@database/campaigns';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { buildScreenUrl } from '@lib/screen/utils';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useCallback, useContext, useEffect, useState } from 'react';
import { Flex, NavBar } from '../antd';
import MobilePresenceMonitor from '../components/PresenceMonitor';

interface MobilePresenceMonitorScreenProps {
    onBack: () => void;
}

export default function MobilePresenceMonitorScreen({ onBack }: MobilePresenceMonitorScreenProps) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const [hasScreen, setHasScreen] = useState(false);
    const [obpLink, setObpLink] = useState('');

    const loadState = useCallback(async () => {
        if (!storeDetails) return;

        const subdomain = storeDetails.subdomain || '';
        const customDomain = storeDetails.customDomain;
        const obpLink = generateOBPUrl(subdomain, customDomain);
        setObpLink(obpLink);

        try {
            const screenState = await getScreenState();
            setHasScreen(Boolean(screenState?.screenToken && buildScreenUrl(screenState.screenToken, obpLink)));
        } catch {
            setHasScreen(false);
        }
    }, [storeDetails]);

    useEffect(() => {
        if (!storeDetails) return;
        void loadState();
    }, [loadState, storeDetails]);

    if (!FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR || !storeDetails) return null;

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <NavBar onBack={onBack} />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <MobilePresenceMonitor
                    hasFeedbackEnabled={storeDetails.feedbackEnabled !== false}
                    hasPublishedMenu={Boolean(storeDetails.subdomain || storeDetails.customDomain)}
                    hasScreen={hasScreen}
                    obpLink={obpLink}
                    storeDetails={storeDetails as any}
                />
            </Flex>
        </Flex>
    );
}
