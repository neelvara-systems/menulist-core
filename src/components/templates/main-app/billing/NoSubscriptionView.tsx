'use client'

import { isStarterActivationStore } from '@lib/onboarding/starterActivation';
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
    const starterT = useTranslations('StarterActivation');
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const isStarterStore = isStarterActivationStore(storeDetails);

    return (
        <>
            <Alert
                message={isStarterStore ? starterT('endingSoonTitle') : billingT('noActiveSubscription')}
                description={isStarterStore
                    ? starterT('noSubscriptionDescription')
                    : billingT('noActiveSubscriptionDesc')}
                type="info"
                showIcon
                style={{ marginBottom: '10px' }}
            />
            <Card variant="borderless" style={{ marginBottom: '10px' }}>
                <Flex vertical align="center" gap={16}>
                    <Text type="secondary">
                        {isStarterStore ? starterT('choosePlanDescription') : billingT('chooseAPlan')}
                    </Text>
                    <Button type="primary" size="large" onClick={() => router.push('/billing')}>
                        {billingT('viewPlans')}
                    </Button>
                </Flex>
            </Card>
        </>
    );
};

export default NoSubscriptionView;
