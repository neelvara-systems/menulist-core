/**
 * Editor Quality Banner
 * 
 * Lightweight banner shown at the top of the editor when actionable
 * quality signals exist. Uses higher thresholds than dashboard to
 * avoid noise during active editing.
 * 
 * @see __docs__/menu-quality-signals/
 */

import { FEATURE_FLAGS } from '@config/features';
import { computeQualitySignals, getActionableSignals, getPrimaryQualitySignal, isRepairMenuSignal, QualitySignal } from '@lib/mce/qualitySignals';
import { Alert, Button, Flex, Typography } from 'antd';
import React, { useMemo } from 'react';
import type { Project } from '../types';

const { Text } = Typography;

interface EditorQualityBannerProps {
    projectData: Project;
    onAction: (actionRoute: string) => void;
}

const EditorQualityBanner: React.FC<EditorQualityBannerProps> = ({ projectData, onAction }) => {
    const actionableSignals = useMemo(() => {
        if (!FEATURE_FLAGS.ENABLE_MENU_QUALITY_SIGNALS || !projectData?.files) return [];
        const all = computeQualitySignals(projectData.files, projectData.languages, {
            projectPublicContent: projectData,
            showCategoryIcons: projectData?.config?.design?.menu?.showCategoryIcons ?? true,
            showItemPrices: projectData?.config?.design?.menu?.showItemPrices ?? true,
        });
        return getActionableSignals(all);
    }, [projectData, projectData?.config?.design?.menu?.showCategoryIcons, projectData?.config?.design?.menu?.showItemPrices, projectData?.files, projectData?.languages]);

    if (actionableSignals.length === 0) return null;

    const summaryParts = actionableSignals.map(s => s.label).join(' · ');
    const primarySignal = getPrimaryQualitySignal(actionableSignals);

    return (
        <Alert
            type="info"
            banner
            closable
            message={
                <Flex align="center" justify="space-between" wrap="wrap" gap={8}>
                    <Text style={{ fontSize: 12 }}>
                        <Text strong style={{ fontSize: 12 }}>Menu Check:</Text> {summaryParts}
                    </Text>
                    <Flex gap={6}>
                        {primarySignal ? (
                            <Button
                                type="link"
                                size="small"
                                onClick={() => onAction(primarySignal.id)}
                                style={{ fontSize: 12, padding: '0 4px' }}
                            >
                                {isRepairMenuSignal(primarySignal) ? 'Repair Menu' : 'Review'}
                            </Button>
                        ) : null}
                    </Flex>
                </Flex>
            }
        />
    );
};

export default EditorQualityBanner;
