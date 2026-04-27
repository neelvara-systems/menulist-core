'use client';

import { FEATURE_FLAGS } from '@config/features';
import { computeQualitySignals, getVisibleSignals, isAllClear, QualitySignal } from '@lib/mce/qualitySignals';
import type { ProjectFileType } from '@template/main-app/projects/types/project.types';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';
import { LuAlertCircle, LuCheckCircle, LuDollarSign, LuEyeOff, LuFileText, LuImage, LuLanguages, LuSparkles, LuTrendingDown } from 'react-icons/lu';
import { Collapse, Flex, List, Tag, Text } from '../antd';

const SIGNAL_ICONS: Record<string, React.ReactNode> = {
    descriptions: <LuFileText size={16} />,
    hidden: <LuEyeOff size={16} />,
    images: <LuImage size={16} />,
    priceOutliers: <LuTrendingDown size={16} />,
    prices: <LuDollarSign size={16} />,
    translations: <LuLanguages size={16} />,
};

interface MobileMenuQualitySignalsProps {
    activeKey?: string[];
    files: ProjectFileType[] | undefined;
    projectLanguages?: string[];
    onExpandedChange?: (expanded: boolean) => void;
    onReviewSignal?: (signal: QualitySignal) => void;
}

export default function MobileMenuQualitySignals({ activeKey, files, projectLanguages, onExpandedChange, onReviewSignal }: MobileMenuQualitySignalsProps) {
    const t = useTranslations('MobileMenuQualitySignals');
    const { token } = theme.useToken();
    const allSignals = useMemo(() => computeQualitySignals(files, projectLanguages), [files, projectLanguages]);
    const signals = useMemo(() => getVisibleSignals(allSignals), [allSignals]);
    const allClear = useMemo(() => isAllClear(allSignals), [allSignals]);

    if (!FEATURE_FLAGS.ENABLE_MENU_QUALITY_SIGNALS || signals.length === 0) {
        return null;
    }

    return (
        <div
            style={{
                backgroundColor: allClear ? token.colorSuccessBg : token.colorWarningBg,
                border: `1px solid ${allClear ? token.colorSuccessBorder : token.colorWarningBorder}`,
                borderRadius: 16,
            }}
        >
            <Collapse
                accordion
                activeKey={activeKey}
                onChange={(key) => {
                    const nextKey = Array.isArray(key) ? key : (key ? [key] : []);
                    onExpandedChange?.(nextKey.includes('menu-quality'));
                }}
            >
                <Collapse.Panel
                    key="menu-quality"
                    title={(
                        <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                            <Flex align="center" gap={8}>
                                <LuSparkles color={allClear ? token.colorSuccess : token.colorWarning} size={16} />
                                <Text strong>{t('title')}</Text>
                            </Flex>
                            <Tag color={allClear ? 'success' : 'warning'}>
                                {allClear ? t('allClearTitle') : signals.length}
                            </Tag>
                        </Flex>
                    )}
                >
                    {allClear ? (
                        <Flex align="center" gap={12}>
                            <LuCheckCircle color={token.colorSuccess} size={24} />
                            <Flex gap={2} vertical>
                                <Text type="secondary">{t('allClearDesc')}</Text>
                            </Flex>
                        </Flex>
                    ) : (
                        <Flex gap={8} vertical>
                            <Text type="secondary">{t('tapHint')}</Text>
                            <List>
                                {signals.map((signal) => (
                                    <List.Item
                                        arrow={signal.status === 'warning'}
                                        description={signal.helpText ? <Text type="secondary">{signal.helpText}</Text> : undefined}
                                        key={signal.id}
                                        onClick={signal.status === 'warning' ? () => onReviewSignal?.(signal) : undefined}
                                        title={(
                                            <Flex align="center" gap={8}>
                                                {SIGNAL_ICONS[signal.id]}
                                                <Text>{signal.label}</Text>
                                            </Flex>
                                        )}
                                        prefix={signal.status === 'ok' ? <LuCheckCircle color={token.colorSuccess} size={16} /> : <LuAlertCircle color={token.colorWarning} size={16} />}
                                    />
                                ))}
                            </List>
                        </Flex>
                    )}
                </Collapse.Panel>
            </Collapse>
        </div>
    );
}
