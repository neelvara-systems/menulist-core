'use client';

import { FEATURE_FLAGS } from '@config/features';
import {
    buildMenuSetupProgress,
    type MenuSetupProgressStep,
    type MenuSetupProgressStepStatus,
} from '@lib/menuSetupProgress/buildMenuSetupProgress';
import type { Project } from '@template/main-app/projects/types';
import type { StoreDataType } from '@type/platform/store';
import { Button, Card, Flex, Progress, Skeleton, Tag, Typography, theme } from 'antd';
import { useRouter } from 'next/navigation';
import React, { useMemo } from 'react';
import { LuAlertCircle, LuCheck, LuCircle, LuExternalLink, LuFlag, LuListChecks } from 'react-icons/lu';

const { Text } = Typography;
const { useToken } = theme;

interface MenuSetupProgressProps {
    loading?: boolean;
    project?: (Project & Record<string, any>) | null;
    storeDetails?: StoreDataType | null;
}

const getStepColor = (status: MenuSetupProgressStepStatus, token: ReturnType<typeof useToken>['token']) => {
    if (status === 'done') return token.colorSuccess;
    if (status === 'needs_attention') return token.colorWarning;
    if (status === 'next') return token.colorPrimary;
    return token.colorTextTertiary;
};

const renderStepIcon = (step: MenuSetupProgressStep, token: ReturnType<typeof useToken>['token']) => {
    const color = getStepColor(step.status, token);
    if (step.status === 'done') return <LuCheck size={14} color={color} />;
    if (step.status === 'needs_attention') return <LuAlertCircle size={14} color={color} />;
    if (step.status === 'next') return <LuFlag size={14} color={color} />;
    return <LuCircle size={14} color={color} />;
};

export default function MenuSetupProgress({ loading = false, project, storeDetails }: MenuSetupProgressProps) {
    const router = useRouter();
    const { token } = useToken();
    const summary = useMemo(
        () => buildMenuSetupProgress({ project, storeDetails }),
        [project, storeDetails],
    );

    if (!FEATURE_FLAGS.ENABLE_MENU_SETUP_PROGRESS) return null;

    if (loading) {
        return (
            <Card size="small" style={{ borderRadius: token.borderRadiusLG }}>
                <Skeleton active paragraph={{ rows: 2 }} title={{ width: 180 }} />
            </Card>
        );
    }

    if (!summary.shouldShow) return null;

    const incompleteOptional = summary.optionalSteps.filter((step) => !step.done).slice(0, 3);

    return (
        <Card
            size="small"
            style={{ borderRadius: token.borderRadiusLG }}
            title={(
                <Flex align="center" gap={8}>
                    <LuListChecks size={16} color={token.colorPrimary} />
                    <Text strong style={{ fontSize: 14 }}>Menu setup</Text>
                </Flex>
            )}
            extra={(
                <Tag color={summary.requiredDone === summary.requiredTotal ? 'success' : 'processing'} style={{ marginInlineEnd: 0 }}>
                    {summary.requiredDone} of {summary.requiredTotal}
                </Tag>
            )}
        >
            <Flex vertical gap={12}>
                <Flex vertical gap={6}>
                    <Flex align="center" justify="space-between" gap={12}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Required setup</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{summary.progressPercent}%</Text>
                    </Flex>
                    <Progress
                        percent={summary.progressPercent}
                        showInfo={false}
                        size="small"
                        strokeColor={summary.requiredDone === summary.requiredTotal ? token.colorSuccess : token.colorPrimary}
                        trailColor={token.colorBorderSecondary}
                    />
                </Flex>

                <Flex gap={8} wrap="wrap">
                    {summary.requiredSteps.map((step) => (
                        <Flex
                            align="center"
                            gap={6}
                            key={step.id}
                            style={{
                                background: step.status === 'next' ? token.colorPrimaryBg : token.colorFillQuaternary,
                                border: `1px solid ${step.status === 'next' ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
                                borderRadius: 999,
                                padding: '5px 9px',
                            }}
                        >
                            {renderStepIcon(step, token)}
                            <Text style={{ color: step.status === 'blocked' ? token.colorTextTertiary : token.colorText, fontSize: 12 }}>
                                {step.label}
                            </Text>
                        </Flex>
                    ))}
                </Flex>

                <Flex align="center" justify="space-between" gap={12} wrap="wrap">
                    <Flex vertical gap={2} style={{ flex: '1 1 260px', minWidth: 0 }}>
                        <Text strong style={{ fontSize: 13 }}>
                            {summary.nextStep?.label || 'Menu setup'}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {summary.compactCopy}
                        </Text>
                    </Flex>
                    {summary.nextAction ? (
                        <Button
                            icon={<LuExternalLink size={14} />}
                            onClick={() => router.push(summary.nextAction!.href)}
                            size="small"
                            type="primary"
                        >
                            {summary.nextAction.label}
                        </Button>
                    ) : null}
                </Flex>

                {incompleteOptional.length > 0 ? (
                    <Flex align="center" gap={8} wrap="wrap">
                        <Text type="secondary" style={{ fontSize: 12 }}>Optional:</Text>
                        {incompleteOptional.map((step) => (
                            <Tag key={step.id} style={{ marginInlineEnd: 0 }}>
                                {step.label}
                            </Tag>
                        ))}
                    </Flex>
                ) : null}
            </Flex>
        </Card>
    );
}
