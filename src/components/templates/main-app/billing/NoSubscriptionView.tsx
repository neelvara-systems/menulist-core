'use client'

import { isStarterActivationStore } from '@lib/onboarding/starterActivation';
import { resolveOwnerAccessRecoveryState } from '@lib/onboarding/ownerAccessRecovery';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Alert, Button, Card, Flex, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useContext } from 'react';

const { Text } = Typography;

/**
 * Component displayed when a user has no active subscription.
 * Directs them to the billing page to subscribe via Razorpay.
 */
const NoSubscriptionView: React.FC = () => {
    const router = useRouter();
    const billingT = useTranslations('Billing');
    const dashboardT = useTranslations('Dashboard');
    const starterT = useTranslations('StarterActivation');
    const { activeSubscription, storeDetails } = useContext(PlatformGlobalDataContext);
    const isStarterStore = isStarterActivationStore(storeDetails);
    const recoveryState = resolveOwnerAccessRecoveryState({ activeSubscription, storeDetails });
    const title = recoveryState === 'payment_pending'
        ? billingT('subscriptionPayment')
        : recoveryState === 'starter_expired'
            ? billingT('statusExpired')
            : recoveryState === 'workspace_missing'
                ? dashboardT('noStoreSelected')
                : billingT('noActiveSubscription');
    const description = recoveryState === 'payment_pending'
        ? billingT('subtitle')
        : recoveryState === 'starter_expired'
            ? starterT('noSubscriptionDescription')
            : billingT('noActiveSubscriptionDesc');

    return (
        <>
            <Alert
                message={title}
                description={description}
                type={recoveryState === 'payment_pending' ? 'warning' : 'info'}
                showIcon
                style={{ marginBottom: '10px' }}
            />
            <Card variant="borderless" style={{ marginBottom: '10px' }}>
                <Flex vertical align="center" gap={16}>
                    <Text type="secondary">
                        {isStarterStore ? starterT('choosePlanDescription') : billingT('noSubscriptionFound')}
                    </Text>
                    <Button type="primary" size="large" onClick={() => router.push('/billing')}>
                        {recoveryState === 'payment_pending' ? billingT('retryPayment') : billingT('viewPlans')}
                    </Button>
                </Flex>
            </Card>
        </>
    );
};

export default NoSubscriptionView;
