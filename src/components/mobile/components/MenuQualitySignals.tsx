'use client';

import { FEATURE_FLAGS } from '@config/features';
import { computeQualitySignals, getVisibleSignals, isAllClear, QualitySignal } from '@lib/mce/qualitySignals';
import type { ProjectFileType } from '@template/main-app/projects/types/project.types';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';
import { LuAlertCircle, LuCheckCircle, LuDollarSign, LuEyeOff, LuFileText, LuImage, LuSparkles, LuTrendingDown } from 'react-icons/lu';
import { Button, Card, Flex, List, Text, Toast } from '../antd';

const SIGNAL_ICONS: Record<string, React.ReactNode> = {
    descriptions: <LuFileText size={16} />,
    hidden: <LuEyeOff size={16} />,
    images: <LuImage size={16} />,
    priceOutliers: <LuTrendingDown size={16} />,
    prices: <LuDollarSign size={16} />,
};

interface MobileMenuQualitySignalsProps {
    files: ProjectFileType[] | undefined;
}

export default function MobileMenuQualitySignals({ files }: MobileMenuQualitySignalsProps) {
    const t = useTranslations('MobileMenuQualitySignals');
    const allSignals = useMemo(() => computeQualitySignals(files), [files]);
    const signals = useMemo(() => getVisibleSignals(allSignals), [allSignals]);
    const allClear = useMemo(() => isAllClear(allSignals), [allSignals]);

    if (!FEATURE_FLAGS.ENABLE_MENU_QUALITY_SIGNALS || signals.length === 0) {
        return null;
    }

    const handleAction = (signal: QualitySignal) => {
        Toast.show({
            content: signal.actionRoute === 'descriptions' || signal.actionRoute === 'images'
                ? t('openDesktopGenerate')
                : t('openDesktopReview'),
            duration: 2000,
        });
    };

    return (
        <Card
            title={(
                <Flex align="center" gap={8}>
                    <LuSparkles color={allClear ? '#16a34a' : '#d97706'} size={16} />
                    <Text strong>{t('title')}</Text>
                </Flex>
            )}
        >
            {allClear ? (
                <Flex align="center" gap={12}>
                    <LuCheckCircle color="#16a34a" size={24} />
                    <Flex gap={2} vertical>
                        <Text strong>{t('allClearTitle')}</Text>
                        <Text type="secondary">{t('allClearDesc')}</Text>
                    </Flex>
                </Flex>
            ) : (
                <List>
                    {signals.map((signal) => (
                        <List.Item
                            key={signal.id}
                            description={(
                                <Flex gap={8} vertical>
                                    <Flex align="center" gap={8}>
                                        {SIGNAL_ICONS[signal.id]}
                                        <Text>{signal.label}</Text>
                                    </Flex>
                                    {signal.helpText ? <Text type="secondary">{signal.helpText}</Text> : null}
                                </Flex>
                            )}
                            extra={signal.actionLabel && signal.actionRoute ? (
                                <Button fill="outline" onClick={() => handleAction(signal)} size="small">
                                    {signal.actionLabel}
                                </Button>
                            ) : null}
                            prefix={signal.status === 'ok' ? <LuCheckCircle color="#16a34a" size={16} /> : <LuAlertCircle color="#d97706" size={16} />}
                        />
                    ))}
                </List>
            )}
        </Card>
    );
}
