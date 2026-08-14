'use client';

import { FEATURE_FLAGS } from '@config/features';
import { buildMenuSetupProgress } from '@lib/menuSetupProgress/buildMenuSetupProgress';
import type { Project } from '@template/main-app/projects/types';
import type { StoreDataType } from '@type/platform/store';
import { Button, Card, Flex, Skeleton, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import React, { useMemo } from 'react';
import { LuExternalLink, LuListChecks } from 'react-icons/lu';

const { Text } = Typography;
const { useToken } = theme;

interface MenuSetupProgressProps {
    loading?: boolean;
    project?: (Project & Record<string, any>) | null;
    storeDetails?: StoreDataType | null;
}

export default function MenuSetupProgress({ loading = false, project, storeDetails }: MenuSetupProgressProps) {
    const router = useRouter();
    const { token } = useToken();
    const t = useTranslations('Dashboard.owner.menuSetup');
    const tOwner = useTranslations('Dashboard.owner');
    const summary = useMemo(
        () => buildMenuSetupProgress({ project, storeDetails, translate: t }),
        [project, storeDetails, t],
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

    const title = FEATURE_FLAGS.ENABLE_LOCATION_LAUNCH_READINESS && summary.context === 'location_launch'
        ? `${tOwner('businessHealth.locations.title')} · ${t('title')}`
        : t('title');

    return (
        <Card
            size="small"
            style={{ borderRadius: token.borderRadiusLG }}
            title={(
                <Flex align="center" gap={8}>
                    <LuListChecks size={16} color={token.colorPrimary} />
                    <Text strong style={{ fontSize: 14 }}>{title}</Text>
                </Flex>
            )}
        >
            <Flex vertical gap={12}>
                <Flex align="center" justify="space-between" gap={12} wrap="wrap">
                    <Flex vertical gap={2} style={{ flex: '1 1 260px', minWidth: 0 }}>
                        <Text strong style={{ fontSize: 13 }}>
                            {summary.nextStep?.label || title}
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
            </Flex>
        </Card>
    );
}
