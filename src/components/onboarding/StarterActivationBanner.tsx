'use client';

import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { hasValidSubscriptionAccess } from '@util/razorpay';
import { Alert, Button, Space, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { useContext, useMemo } from 'react';
import {
    STARTER_DISTRIBUTION_ACTIVATION_TARGET,
    getStarterActivationSignalCount,
    getStarterActivationRemainingDays,
    hasStarterWorkspaceAccess,
} from '@lib/onboarding/starterActivation';

const { Text } = Typography;

export default function StarterActivationBanner() {
    const router = useRouter();
    const { activeSubscription, storeDetails } = useContext(PlatformGlobalDataContext);
    const hasPaidAccess = hasValidSubscriptionAccess(activeSubscription);
    const hasStarterAccess = hasStarterWorkspaceAccess(storeDetails, hasPaidAccess);
    const remainingDays = useMemo(
        () => getStarterActivationRemainingDays(storeDetails),
        [storeDetails?.activationDeadline],
    );
    const activationSignalCount = useMemo(
        () => getStarterActivationSignalCount(storeDetails),
        [storeDetails?.menuPresence, storeDetails?.starterActivationSignals?.lastSignalAt],
    );

    if (!hasStarterAccess) return null;

    const remainingCopy = remainingDays === null
        ? 'Starter setup is active.'
        : remainingDays <= 1
            ? 'Starter setup ends today.'
            : `${remainingDays} days left in starter setup.`;
    const activationCopy = activationSignalCount >= STARTER_DISTRIBUTION_ACTIVATION_TARGET
        ? 'Sharing steps are set.'
        : `${Math.min(activationSignalCount, STARTER_DISTRIBUTION_ACTIVATION_TARGET)} of ${STARTER_DISTRIBUTION_ACTIVATION_TARGET} sharing steps recorded.`;

    return (
        <Alert
            action={(
                <Button onClick={() => router.push('/billing')} size="small" type="primary">
                    Keep live
                </Button>
            )}
            banner
            description={(
                <Space size={8} wrap>
                    <Text>Your public menu and QR are active.</Text>
                    <Text type="secondary">{remainingCopy}</Text>
                    <Text type="secondary">{activationCopy}</Text>
                </Space>
            )}
            message="Starter setup active"
            showIcon
            type="info"
        />
    );
}
