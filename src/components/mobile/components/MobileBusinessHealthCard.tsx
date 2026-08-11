'use client'

import type { OwnerBusinessHealthCurrentDoc } from '@lib/ownerBusinessAssistant/types';
import { getOwnerBusinessHealthDashboardPresentation } from '@lib/ownerBusinessAssistant/dashboardPresentation';
import { theme } from 'antd';
import { useFormatter, useTranslations } from 'next-intl';
import { LuActivity, LuArrowRight, LuCheckCircle2 } from 'react-icons/lu';
import { Button, Card, Flex, Tag, Text } from '../antd';

type MobileBusinessHealthMetric = {
    key: string;
    label: string;
    value: string;
    delta?: string;
};

export default function MobileBusinessHealthCard({
    current,
    metrics = [],
    onClick,
}: {
    current?: OwnerBusinessHealthCurrentDoc | null;
    metrics?: MobileBusinessHealthMetric[];
    onClick?: () => void;
}) {
    const { token } = theme.useToken();
    const formatter = useFormatter();
    const t = useTranslations('Dashboard.owner');

    if (!current) return null;

    const status = current?.status || 'not_ready';
    const isReady = Boolean(current && current.status !== 'not_ready' && current.sourceRefs?.length);
    const statusColor = status === 'needs_review'
        ? 'danger'
        : status === 'watch' || status === 'stale'
            ? 'warning'
            : isReady
                ? 'success'
                : 'default';
    const presentation = getOwnerBusinessHealthDashboardPresentation(current, formatter, t);

    return (
        <Card>
            <Flex gap={12} vertical>
                <Flex align="flex-start" gap={12}>
                    <Flex
                        align="center"
                        justify="center"
                        style={{
                            background: isReady ? token.colorSuccessBg : token.colorInfoBg,
                            border: `1px solid ${isReady ? token.colorSuccessBorder : token.colorInfoBorder}`,
                            borderRadius: 8,
                            color: isReady ? token.colorSuccess : token.colorInfo,
                            flex: '0 0 40px',
                            height: 40,
                            width: 40,
                        }}
                    >
                        <LuActivity size={22} />
                    </Flex>
                    <Flex flex={1} gap={6} style={{ minWidth: 0 }} vertical>
                        <Flex align="center" gap={8} justify="space-between">
                            <Text type="secondary" style={{ fontSize: 12 }}>{presentation.title}</Text>
                            <Tag color={statusColor}>
                                {presentation.statusLabel}
                            </Tag>
                        </Flex>
                        <Text strong>{presentation.headline}</Text>
                        <Text type="secondary">{presentation.message}</Text>
                        {presentation.firstSignal ? (
                            <Flex
                                gap={6}
                                style={{
                                    background: token.colorFillAlter,
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                    borderRadius: 8,
                                    padding: 8,
                                }}
                                vertical
                            >
                                <Text strong>{presentation.firstSignal.action}</Text>
                                <Text type="secondary">{presentation.firstSignal.message}</Text>
                            </Flex>
                        ) : null}
                        {presentation.feedbackLine ? <Text type="secondary">{presentation.feedbackLine}</Text> : null}
                        <Text type="secondary" style={{ fontSize: 12 }}>{presentation.freshnessNote}</Text>
                    </Flex>
                </Flex>

                {current?.summary.noActionNeeded && isReady ? (
                    <Tag color="success"><LuCheckCircle2 size={14} /> {presentation.noActionLabel}</Tag>
                ) : null}

                {isReady && metrics.length ? (
                    <Flex gap={8} wrap>
                        {metrics.map((metric) => (
                            <Flex
                                gap={4}
                                key={metric.key}
                                style={{
                                    background: token.colorFillAlter,
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                    borderRadius: 8,
                                    flex: '1 1 132px',
                                    minHeight: 72,
                                    minWidth: 0,
                                    padding: 10,
                                }}
                                vertical
                            >
                                <Text type="secondary" style={{ fontSize: 12 }}>{metric.label}</Text>
                                <Text strong>{metric.value}</Text>
                                {metric.delta ? <Text type="secondary" style={{ fontSize: 12 }}>{metric.delta}</Text> : null}
                            </Flex>
                        ))}
                    </Flex>
                ) : null}

                {onClick ? (
                    <Button block fill="outline" onClick={onClick} style={{ justifyContent: 'center', minHeight: 44 }}>
                        {t('businessHealth.open')} <LuArrowRight size={16} />
                    </Button>
                ) : null}
            </Flex>
        </Card>
    );
}
