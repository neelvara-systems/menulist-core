'use client'

import { theme } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, DotLoading, Flex, Text } from '../antd';

interface AiActionProgressPanelProps {
    detail?: string;
    helperText?: string;
    labels: string[];
    title: string;
}

export default function AiActionProgressPanel({
    detail,
    helperText = 'This can take a little time. Keep this screen open while we finish.',
    labels,
    title,
}: AiActionProgressPanelProps) {
    const { token } = theme.useToken();
    const safeLabels = useMemo(
        () => (labels.length > 0 ? labels : ['Working on it...']),
        [labels]
    );
    const [labelIndex, setLabelIndex] = useState(0);

    useEffect(() => {
        if (safeLabels.length <= 1) return;

        const intervalId = window.setInterval(() => {
            setLabelIndex((current) => (current + 1) % safeLabels.length);
        }, 2200);

        return () => window.clearInterval(intervalId);
    }, [safeLabels]);

    return (
        <Card
            size="small"
            style={{
                backgroundColor: token.colorPrimaryBg,
                border: `1px solid ${token.colorPrimaryBorder}`,
                borderRadius: 14,
            }}
        >
            <Flex align="center" gap={12}>
                <Flex
                    align="center"
                    justify="center"
                    style={{
                        backgroundColor: token.colorBgContainer,
                        borderRadius: 999,
                        height: 40,
                        minWidth: 40,
                        width: 40,
                    }}
                >
                    <DotLoading color="primary" />
                </Flex>
                <Flex gap={2} style={{ flex: 1, minWidth: 0 }} vertical>
                    <Text strong>{title}</Text>
                    <Text>{safeLabels[labelIndex]}</Text>
                    {detail ? <Text type="secondary">{detail}</Text> : null}
                    <Text type="secondary">{helperText}</Text>
                </Flex>
            </Flex>
        </Card>
    );
}
