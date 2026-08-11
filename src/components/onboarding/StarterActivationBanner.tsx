'use client';

import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { hasValidSubscriptionAccess } from '@util/razorpay';
import { Alert, Button, Space, Typography } from 'antd';
import { useTranslations } from 'next-intl';
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
    const t = useTranslations('StarterActivation');
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
        ? t('activeRemaining')
        : t('daysRemaining', { days: remainingDays });
    const activationCopy = activationSummary.activated
        ? t('sharingComplete')
        : t('sharingProgress', {
            count: Math.min(activationSummary.signalCount, activationSummary.target),
            target: activationSummary.target,
        });
    const evidenceCopy = activationSummary.signalCount > 0
        ? t('evidenceRecorded', {
            ownerCount: activationSummary.ownerConfirmedCount,
            systemCount: activationSummary.systemRecordedCount,
        })
        : t('evidenceEmpty');
    const isEndingSoon = remainingDays !== null && remainingDays <= 3;

    return (
        <Alert
            action={(
                <Button
                    onClick={() => router.push('/billing')}
                    style={{ height: 'auto', minHeight: 44, whiteSpace: 'normal' }}
                    type="primary"
                >
                    {t('keepLiveAction')}
                </Button>
            )}
            banner
            description={(
                <Space size={8} wrap>
                    <Text>{t('publicMenuQrActive')}</Text>
                    <Text type="secondary">{remainingCopy}</Text>
                    <Text type="secondary">{activationCopy}</Text>
                    <Text type="secondary">{evidenceCopy}</Text>
                </Space>
            )}
            message={isEndingSoon ? t('endingSoonTitle') : t('activeTitle')}
            showIcon
            type={isEndingSoon ? 'warning' : 'info'}
        />
    );
}
