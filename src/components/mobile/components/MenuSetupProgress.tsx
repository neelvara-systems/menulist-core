'use client';

import { FEATURE_FLAGS } from '@config/features';
import {
    buildMenuSetupProgress,
    type MenuSetupProgressAction,
} from '@lib/menuSetupProgress/buildMenuSetupProgress';
import type { Project } from '@template/main-app/projects/types';
import type { StoreDataType } from '@type/platform/store';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';
import { LuListChecks } from 'react-icons/lu';
import { Button, Card, Flex, Text } from '../antd';

interface MobileMenuSetupProgressProps {
    actionLoading?: boolean;
    hideUntilPublished?: boolean;
    onOpenMenu?: () => void;
    onOpenOfficialPage?: () => void;
    onPublish?: () => void;
    onOpenShare?: () => void;
    project?: (Project & Record<string, unknown>) | null;
    storeDetails?: StoreDataType | null;
}

export default function MobileMenuSetupProgress({
    actionLoading = false,
    hideUntilPublished = false,
    onOpenMenu,
    onOpenOfficialPage,
    onPublish,
    onOpenShare,
    project,
    storeDetails,
}: MobileMenuSetupProgressProps) {
    const { token } = theme.useToken();
    const t = useTranslations('Dashboard.owner.menuSetup');
    const tOwner = useTranslations('Dashboard.owner');
    const summary = useMemo(
        () => buildMenuSetupProgress({ project, storeDetails, translate: t }),
        [project, storeDetails, t],
    );

    if (!FEATURE_FLAGS.ENABLE_MENU_SETUP_PROGRESS || !summary.shouldShow) return null;
    if (hideUntilPublished && summary.phase !== 'place') return null;

    const title = FEATURE_FLAGS.ENABLE_LOCATION_LAUNCH_READINESS && summary.context === 'location_launch'
        ? `${tOwner('businessHealth.locations.title')} · ${t('title')}`
        : t('title');

    const handleAction = (action?: MenuSetupProgressAction) => {
        if (!action) return;
        if (action.id === 'open_share') {
            onOpenShare?.();
            return;
        }
        if (action.id === 'open_publish' && onPublish) {
            onPublish();
            return;
        }
        if (action.id === 'open_public_presence' || action.id === 'open_public_photos') {
            onOpenOfficialPage?.();
            return;
        }
        onOpenMenu?.();
    };

    return (
        <Card style={{ borderRadius: 16 }}>
            <Flex gap={12} vertical>
                <Flex align="center" gap={8}>
                    <LuListChecks color={token.colorPrimary} size={17} />
                    <Text strong>{title}</Text>
                </Flex>

                <Flex gap={3} vertical>
                    <Text strong>{summary.nextStep?.label || title}</Text>
                    <Text type="secondary">{summary.compactCopy}</Text>
                </Flex>

                {summary.nextAction ? (
                    <Button
                        block
                        color="primary"
                        disabled={actionLoading}
                        loading={actionLoading}
                        onClick={() => handleAction(summary.nextAction)}
                        size="middle"
                    >
                        {summary.nextAction.label}
                    </Button>
                ) : null}
            </Flex>
        </Card>
    );
}
