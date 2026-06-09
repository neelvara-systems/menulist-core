'use client'

import type { OwnerBusinessHealthCurrentDoc } from '@lib/ownerBusinessAssistant/types';
import { OWNER_BUSINESS_HEALTH_STATUS_LABELS } from '@lib/ownerBusinessAssistant/constants';
import { theme } from 'antd';
import { LuActivity, LuArrowRight, LuCheckCircle2 } from 'react-icons/lu';
import { Button, Card, Flex, Tag, Text } from '../antd';

type MobileBusinessHealthMetric = {
    key: string;
    label: string;
    value: string;
    delta?: string;
};

const getFeedbackLine = (current: OwnerBusinessHealthCurrentDoc) => {
    const feedback = current.feedbackSummary;
    if (!feedback) return null;
    const needsAttention = feedback.periods.last30Days?.needsAttentionCount ?? feedback.latestNeedsAttention.length;
    if (needsAttention > 0) {
        return `${needsAttention} guest feedback ${needsAttention === 1 ? 'item needs' : 'items need'} checking`;
    }
    const total = feedback.periods.last30Days?.totalCount ?? feedback.sampledCount;
    return total > 0 ? 'Guest feedback is clear' : null;
};

export default function MobileBusinessHealthCard({
    current,
    freshnessNote,
    metrics = [],
    onClick,
}: {
    current?: OwnerBusinessHealthCurrentDoc | null;
    freshnessNote?: string | null;
    metrics?: MobileBusinessHealthMetric[];
    onClick?: () => void;
}) {
    const { token } = theme.useToken();

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
    const headline = current?.summary.headline || 'Latest check';
    const ownerMessage = current?.summary.ownerMessage || 'MenuList will show Business Health after the first store check finishes.';
    const displayFreshness = freshnessNote || current?.sourceRefs?.[0]?.freshnessLabel || current?.localDate || null;
    const feedbackLine = getFeedbackLine(current);

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
                            <Text type="secondary" style={{ fontSize: 12 }}>Business Health</Text>
                            <Tag color={statusColor}>
                                {OWNER_BUSINESS_HEALTH_STATUS_LABELS[status] || status}
                            </Tag>
                        </Flex>
                        <Text strong>{headline}</Text>
                        <Text type="secondary">{ownerMessage}</Text>
                        {feedbackLine ? <Text type="secondary">{feedbackLine}</Text> : null}
                        {displayFreshness ? <Text type="secondary" style={{ fontSize: 12 }}>{displayFreshness}</Text> : null}
                    </Flex>
                </Flex>

                {current?.summary.noActionNeeded && isReady ? (
                    <Tag color="success"><LuCheckCircle2 size={14} /> No action needed</Tag>
                ) : null}

                {metrics.length ? (
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
                        Open Business Health <LuArrowRight size={16} />
                    </Button>
                ) : null}
            </Flex>
        </Card>
    );
}
