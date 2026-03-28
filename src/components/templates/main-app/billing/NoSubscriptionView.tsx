'use client'

import { useOfferingLabels } from '@hook/useOfferingLabels';
import { Alert, Button, Card, Flex, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import React from 'react';

const { Text } = Typography;

/**
 * Component displayed when a user has no active subscription.
 * Directs them to the billing page to subscribe via Razorpay.
 */
const NoSubscriptionView: React.FC = () => {
    const router = useRouter();
    const labels = useOfferingLabels();

    return (
        <>
            <Alert
                message="No Active Subscription"
                description={`You currently don't have any active subscription plan. ${labels.subscribeDesc}`}
                type="info"
                showIcon
                style={{ marginBottom: '10px' }}
            />
            <Card variant="borderless" style={{ marginBottom: '10px' }}>
                <Flex vertical align="center" gap={16}>
                    <Text type="secondary">Choose a plan to unlock all features.</Text>
                    <Button type="primary" size="large" onClick={() => router.push('/billing')}>
                        View Plans
                    </Button>
                </Flex>
            </Card>
        </>
    );
};

export default NoSubscriptionView;
