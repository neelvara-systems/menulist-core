'use client';

import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { hasValidSubscriptionAccess } from '@util/razorpay';
import { Alert, Button, Space, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { useContext, useMemo } from 'react';
import {
    buildStarterActivationSummary,
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
    const activationSummary = useMemo(
        () => buildStarterActivationSummary(storeDetails),
        [
            storeDetails?.activePlanType,
            storeDetails?.activationDeadline,
            storeDetails?.menuPresence,
            storeDetails?.onboardingSource,
            storeDetails?.starterActivationSignals?.lastSignalAt,
            storeDetails?.starterActivationStatus,
        ],
    );

    if (!hasStarterAccess) return null;

    const remainingCopy = remainingDays === null
        ? 'Starter setup is active.'
        : remainingDays <= 1
            ? 'Starter setup ends today.'
            : `${remainingDays} days left in starter setup.`;
    const activationCopy = activationSummary.activated
        ? 'Sharing steps are set.'
        : `${Math.min(activationSummary.signalCount, activationSummary.target)} of ${activationSummary.target} sharing steps recorded.`;
    const evidenceCopy = activationSummary.signalCount > 0
        ? `How we know: MenuList recorded ${activationSummary.systemRecordedCount}, owner confirmed ${activationSummary.ownerConfirmedCount}.`
        : 'Copy, share, download QR, or mark an external placement to complete setup.';

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
                    <Text type="secondary">{evidenceCopy}</Text>
                </Space>
            )}
            message="Starter setup active"
            showIcon
            type="info"
        />
    );
}
