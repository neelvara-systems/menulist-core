'use client'

import { Card, Flex, Text, Title } from '../antd';

interface MobileScreenIntroProps {
    subtitle: string;
    title: string;
}

export default function MobileScreenIntro({ subtitle, title }: MobileScreenIntroProps) {
    return (
        <Card size="small">
            <Flex gap={4} vertical>
                <Title level={4} style={{ margin: 0 }}>{title}</Title>
                <Text type="secondary">{subtitle}</Text>
            </Flex>
        </Card>
    );
}
