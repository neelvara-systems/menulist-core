'use client';

import { FEATURE_FLAGS } from '@config/features';
import {
    buildMenuSetupProgress,
    type MenuSetupProgressAction,
} from '@lib/menuSetupProgress/buildMenuSetupProgress';
import type { Project } from '@template/main-app/projects/types';
import type { StoreDataType } from '@type/platform/store';
import { theme } from 'antd';
import React, { useMemo } from 'react';
import { LuListChecks } from 'react-icons/lu';
import { Button, Card, Flex, Text } from '../antd';

interface MobileMenuSetupProgressProps {
    hideUntilPublished?: boolean;
    onOpenMenu?: () => void;
    onOpenOfficialPage?: () => void;
    onOpenShare?: () => void;
    project?: (Project & Record<string, unknown>) | null;
    storeDetails?: StoreDataType | null;
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
    if (hideUntilPublished && summary.phase !== 'place') return null;

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

    return (
        <Card style={{ borderRadius: 16 }}>
            <Flex gap={12} vertical>
                <Flex align="center" gap={8}>
                    <LuListChecks color={token.colorPrimary} size={17} />
                    <Text strong>Menu setup</Text>
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
            </Flex>
        </Card>
    );
}
