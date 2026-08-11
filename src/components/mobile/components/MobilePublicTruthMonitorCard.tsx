'use client'

import { FEATURE_FLAGS } from '@config/features';
import { getPublicTruthMonitorExportText } from '@database/publicTruthMonitor';
import { usePublicTruthMonitor } from '@hook/publicTruthTools/usePublicTruthMonitor';
import { formatDateTime } from '@util/dateTime';
import {
    getOwnerPublicTruthModulePresentation,
    getOwnerPublicTruthStatusPresentation,
} from '@lib/public-truth-tools/ownerPublicTruthPresentation';
import { theme } from 'antd';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { LuDownload, LuHistory, LuRefreshCw } from 'react-icons/lu';
import { Button, Card, Flex, Tag, Text, Toast } from '../antd';

function downloadTextFile(filename: string, text: string) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

export default function MobilePublicTruthMonitorCard({
    selectedProjectId,
    storeId,
    tenantId,
}: {
    selectedProjectId?: string | null;
    storeId?: string | number | null;
    tenantId?: string | number | null;
}) {
    const { token } = theme.useToken();
    const formatter = useFormatter();
    const t = useTranslations('Dashboard.owner');
    const isEnabled = FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
        && FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_OWNER_CHECK
        && FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_MONITOR_ADDON;
    const { entitlement, isLoading, refresh, summary } = usePublicTruthMonitor({
        enabled: isEnabled,
        selectedProjectId,
        storeId,
        tenantId,
    });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const latest = summary?.latest || null;
    const status = latest
        ? getOwnerPublicTruthStatusPresentation(latest.status, t)
        : { label: t('businessHealth.publicTruth.notRun'), tone: 'default' as const };
    const history = useMemo(() => (summary?.history || []).slice(0, 3), [summary?.history]);

    if (!isEnabled) return null;
    if (!entitlement.allowed && !summary && !isLoading) return null;

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refresh();
        } catch {
            Toast.show({ content: t('businessHealth.publicTruth.historyRefreshError'), duration: 1800 });
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleDownload = () => {
        const dateKey = new Date().toISOString().slice(0, 10);
        downloadTextFile(`menulist-public-truth-report-${dateKey}.txt`, getPublicTruthMonitorExportText(summary));
    };

    return (
        <Card>
            <Flex gap={12} vertical>
                <Flex align="flex-start" gap={12}>
                    <Flex
                        align="center"
                        justify="center"
                        style={{
                            background: token.colorInfoBg,
                            border: `1px solid ${token.colorInfoBorder}`,
                            borderRadius: 8,
                            color: token.colorInfo,
                            flex: '0 0 40px',
                            height: 40,
                            width: 40,
                        }}
                    >
                        <LuHistory size={20} />
                    </Flex>
                    <Flex flex={1} gap={6} style={{ minWidth: 0 }} vertical>
                        <Flex align="center" gap={8} justify="space-between">
                            <Text type="secondary" style={{ fontSize: 12 }}>{t('businessHealth.publicTruth.historyTitle')}</Text>
                            <Tag color={status.tone === 'error' ? 'danger' : status.tone}>{status.label}</Tag>
                        </Flex>
                        <Text strong>{latest
                            ? t('businessHealth.publicTruth.lastSaved', { date: formatDateTime(latest.generatedAt, 'date', formatter) })
                            : t('businessHealth.publicTruth.noSavedReport')}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {t('businessHealth.publicTruth.historyBoundaryShort')}
                        </Text>
                    </Flex>
                </Flex>

                {latest ? (
                    <Flex gap={8} wrap>
                        <Tag color="success">{t('businessHealth.publicTruth.readyModuleCount', {
                            count: latest.readyModuleCount,
                            total: latest.totalModuleCount,
                        })}</Tag>
                        {latest.missingFactCount ? <Tag color="danger">{t('businessHealth.publicTruth.missingCount', { count: latest.missingFactCount })}</Tag> : null}
                        <Tag color="default">{t('businessHealth.publicTruth.savedCount', {
                            count: summary?.history.length || 0,
                            total: summary?.historyLimit || 0,
                        })}</Tag>
                    </Flex>
                ) : null}

                {latest?.primaryFix ? (() => {
                    const snapshot = latest.moduleSummaries.find((module) => module.id === latest.primaryFix?.id);
                    const presentation = getOwnerPublicTruthModulePresentation(snapshot || {
                        id: latest.primaryFix.id,
                        mobileFixTarget: 'basic_settings',
                        status: 'not_checked',
                    }, t);
                    return (
                    <Flex
                        gap={6}
                        style={{
                            background: token.colorBgContainer,
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderRadius: 10,
                            padding: 10,
                        }}
                        vertical
                    >
                        <Text strong>{presentation.title}</Text>
                        <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35 }}>
                            {presentation.evidence}
                        </Text>
                    </Flex>
                    );
                })() : null}

                {history.length > 1 ? (
                    <Flex gap={7} vertical>
                        {history.map((entry) => (
                            <Flex
                                align="center"
                                gap={8}
                                justify="space-between"
                                key={entry.id}
                                style={{
                                    borderTop: `1px solid ${token.colorBorderSecondary}`,
                                    paddingTop: 8,
                                }}
                            >
                                <Text>{formatDateTime(entry.generatedAt, 'date', formatter)}</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {t('businessHealth.publicTruth.modulesReady', {
                                        count: entry.readyModuleCount,
                                        total: entry.totalModuleCount,
                                    })}
                                </Text>
                            </Flex>
                        ))}
                    </Flex>
                ) : null}

                <Flex gap={8}>
                    <Button
                        disabled={!latest}
                        fill="outline"
                        onClick={handleDownload}
                        style={{ flex: 1, minHeight: 44 }}
                    >
                        <Flex align="center" gap={6} justify="center">
                            <LuDownload size={15} />
                            <Text>{t('businessHealth.publicTruth.downloadEnglishShort')}</Text>
                        </Flex>
                    </Button>
                    <Button
                        color="primary"
                        fill="solid"
                        loading={isRefreshing || isLoading}
                        onClick={handleRefresh}
                        style={{ flex: 1, minHeight: 44 }}
                    >
                        <Flex align="center" gap={6} justify="center">
                            <LuRefreshCw size={15} />
                            <Text style={{ color: 'inherit' }}>{t('businessHealth.publicTruth.runCheck')}</Text>
                        </Flex>
                    </Button>
                </Flex>
            </Flex>
        </Card>
    );
}
