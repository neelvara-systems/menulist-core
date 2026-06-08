'use client'

import type { OwnerBusinessHealthCurrentDoc } from '@lib/ownerBusinessAssistant/types';
import { LuActivity } from 'react-icons/lu';
import { Card, Flex, Text } from '../antd';

export default function MobileBusinessHealthCard({ current, onClick }: {
    current?: OwnerBusinessHealthCurrentDoc | null;
    onClick?: () => void;
}) {
    if (!current) return null;

    return (
        <Card onClick={onClick}>
            <Flex align="center" gap={12}>
                <LuActivity size={22} />
                <Flex style={{ minWidth: 0 }} vertical>
                    <Text strong>{current.summary.headline}</Text>
                    <Text type="secondary">{current.summary.ownerMessage}</Text>
                </Flex>
            </Flex>
        </Card>
    );
}
