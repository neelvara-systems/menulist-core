'use client'

import KnowledgeBaseExplorer from '@organisms/KnowledgeBaseExplorer';
import { Card, Flex, Typography } from 'antd';

const { Title, Text } = Typography;

export default function CanonicaDocsPage() {
    return (
        <Flex vertical gap={16} style={{ width: '100%', maxWidth: 1180, margin: '0 auto' }}>
            <Flex vertical gap={4}>
                <Title level={3} style={{ margin: 0 }}>Documentation</Title>
                <Text type="secondary">Browse help articles and guides.</Text>
            </Flex>
            <Card styles={{ body: { padding: 12 } }}>
                <KnowledgeBaseExplorer />
            </Card>
        </Flex>
    );
}
