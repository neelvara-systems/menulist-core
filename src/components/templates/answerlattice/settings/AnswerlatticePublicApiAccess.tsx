'use client';

import { FEATURE_FLAGS } from '@config/features';
import { Alert, Flex, Typography } from 'antd';
import AnswerlatticePublicApiManagement from './AnswerlatticePublicApiManagement';

const { Text, Title } = Typography;

export default function AnswerlatticePublicApiAccess() {
    return (
        <Flex vertical gap={16}>
            <div>
                <Title level={4} style={{ margin: 0 }}>Public API</Title>
                <Text type="secondary">
                    Manage server-side access to approved answers, public entities, and governed support-signal intake.
                </Text>
            </div>
            {FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PUBLIC_API ? (
                <AnswerlatticePublicApiManagement />
            ) : (
                <Alert
                    type="info"
                    showIcon
                    message="Public API access is not available"
                    description="This workspace cannot create or use Public API credentials while the feature is disabled. No action is needed."
                />
            )}
        </Flex>
    );
}
