'use client';

import { FEATURE_FLAGS } from '@config/features';
import {
    buildMenuSetupProgress,
    type MenuSetupProgressAction,
    type MenuSetupProgressStep,
} from '@lib/menuSetupProgress/buildMenuSetupProgress';
import type { Project } from '@template/main-app/projects/types';
import type { StoreDataType } from '@type/platform/store';
import { theme } from 'antd';
import React, { useMemo } from 'react';
import { LuAlertCircle, LuCheck, LuCircle, LuFlag, LuListChecks } from 'react-icons/lu';
import { Button, Card, Flex, ProgressBar, Tag, Text } from '../antd';

interface MobileMenuSetupProgressProps {
    hideUntilPublished?: boolean;
    onOpenMenu?: () => void;
    onOpenOfficialPage?: () => void;
    onOpenShare?: () => void;
    project?: (Project & Record<string, any>) | null;
    storeDetails?: StoreDataType | null;
}

function renderStepIcon(step: MenuSetupProgressStep, color: string) {
    if (step.status === 'done') return <LuCheck color={color} size={13} />;
    if (step.status === 'needs_attention') return <LuAlertCircle color={color} size={13} />;
    if (step.status === 'next') return <LuFlag color={color} size={13} />;
    return <LuCircle color={color} size={13} />;
}

export default function MobileMenuSetupProgress({
    hideUntilPublished = false,
    onOpenMenu,
    onOpenOfficialPage,
    onOpenShare,
    project,
    storeDetails,
}: MobileMenuSetupProgressProps) {
    const { token } = theme.useToken();
    const summary = useMemo(
        () => buildMenuSetupProgress({ project, storeDetails }),
        [project, storeDetails],
    );

    if (!FEATURE_FLAGS.ENABLE_MENU_SETUP_PROGRESS || !summary.shouldShow) return null;
    if (hideUntilPublished && summary.phase !== 'place' && summary.phase !== 'improve') return null;

    const getColor = (step: MenuSetupProgressStep) => {
        if (step.status === 'done') return token.colorSuccess;
        if (step.status === 'needs_attention') return token.colorWarning;
        if (step.status === 'next') return token.colorPrimary;
        return token.colorTextTertiary;
    };

    const handleAction = (action?: MenuSetupProgressAction) => {
        if (!action) return;
        if (action.id === 'open_share') {
            onOpenShare?.();
            return;
        }
        if (action.id === 'open_public_presence' || action.id === 'open_public_photos') {
            onOpenOfficialPage?.();
            return;
        }
        onOpenMenu?.();
    };

    const incompleteOptional = summary.optionalSteps.filter((step) => !step.done).slice(0, 2);

    return (
        <Card style={{ borderRadius: 16 }}>
            <Flex gap={12} vertical>
                <Flex align="center" justify="space-between" gap={10}>
                    <Flex align="center" gap={8}>
                        <LuListChecks color={token.colorPrimary} size={17} />
                        <Text strong>Menu setup</Text>
                    </Flex>
                    <Tag color={summary.requiredDone === summary.requiredTotal ? 'success' : 'primary'}>
                        {summary.requiredDone}/{summary.requiredTotal}
                    </Tag>
                </Flex>

                <ProgressBar percent={summary.progressPercent} />

                <Flex gap={7} wrap="wrap">
                    {summary.requiredSteps.map((step) => {
                        const color = getColor(step);
                        return (
                            <Flex
                                align="center"
                                gap={5}
                                key={step.id}
                                style={{
                                    backgroundColor: step.status === 'next' ? token.colorPrimaryBg : token.colorFillQuaternary,
                                    border: `1px solid ${step.status === 'next' ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
                                    borderRadius: 999,
                                    padding: '5px 8px',
                                }}
                            >
                                {renderStepIcon(step, color)}
                                <Text style={{ color: step.status === 'blocked' ? token.colorTextTertiary : token.colorText, fontSize: 11 }}>
                                    {step.label}
                                </Text>
                            </Flex>
                        );
                    })}
                </Flex>

                <Flex gap={3} vertical>
                    <Text strong>{summary.nextStep?.label || 'Menu setup'}</Text>
                    <Text type="secondary">{summary.compactCopy}</Text>
                </Flex>

                {summary.nextAction ? (
                    <Button block color="primary" onClick={() => handleAction(summary.nextAction)} size="middle">
                        {summary.nextAction.label}
                    </Button>
                ) : null}

                {incompleteOptional.length > 0 ? (
                    <Flex align="center" gap={6} wrap="wrap">
                        <Text type="secondary" style={{ fontSize: 12 }}>Optional</Text>
                        {incompleteOptional.map((step) => (
                            <Tag key={step.id}>{step.label}</Tag>
                        ))}
                    </Flex>
                ) : null}
            </Flex>
        </Card>
    );
}
