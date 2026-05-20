'use client'

import { useOfferingLabels } from '@hook/useOfferingLabels';
import { isStarterActivationStore } from '@lib/onboarding/starterActivation';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Alert, Button, Card, Flex, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import React, { useContext } from 'react';

const { Text } = Typography;

/**
 * Component displayed when a user has no active subscription.
 * Directs them to the billing page to subscribe via Razorpay.
 */
const NoSubscriptionView: React.FC = () => {
    const router = useRouter();
    const labels = useOfferingLabels();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const isStarterStore = isStarterActivationStore(storeDetails);

    return (
        <>
            <Alert
                message={isStarterStore ? "Keep Your Menu Live" : "No Active Subscription"}
                description={isStarterStore
                    ? "Your starter setup needs an active plan to keep updates and customer-facing surfaces available."
                    : `You currently don't have any active subscription plan. ${labels.subscribeDesc}`}
                type="info"
                showIcon
                style={{ marginBottom: '10px' }}
            />
            <Card variant="borderless" style={{ marginBottom: '10px' }}>
                <Flex vertical align="center" gap={16}>
                    <Text type="secondary">
                        {isStarterStore ? 'Choose a plan to keep your official menu live and updated.' : 'Choose a plan to unlock all features.'}
                    </Text>
                    <Button type="primary" size="large" onClick={() => router.push('/billing')}>
                        View Plans
                    </Button>
                </Flex>
            </Card>
        </>
    );
};

export default NoSubscriptionView;
