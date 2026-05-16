'use client'

import ChangelogView from '@template/main-app/helpCenter/ChangelogView';
import { Card, Flex, Typography } from 'antd';

const { Title, Text } = Typography;

export default function CanonicaReleaseNotesPage() {
    return (
        <Flex vertical gap={16} style={{ width: '100%', maxWidth: 1180, margin: '0 auto' }}>
            <Flex vertical gap={4}>
                <Title level={3} style={{ margin: 0 }}>Release Notes</Title>
                <Text type="secondary">See recent fixes and product updates.</Text>
            </Flex>
            <Card styles={{ body: { padding: 12 } }}>
                <ChangelogView />
            </Card>
        </Flex>
    );
}
