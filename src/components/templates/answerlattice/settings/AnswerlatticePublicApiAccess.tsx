'use client';

import { Flex, Typography } from 'antd';
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
            <AnswerlatticePublicApiManagement />
        </Flex>
    );
}
