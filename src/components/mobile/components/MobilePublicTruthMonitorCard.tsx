'use client'

import { FEATURE_FLAGS } from '@config/features';
import { getPublicTruthMonitorExportText } from '@database/publicTruthMonitor';
import { usePublicTruthMonitor } from '@hook/publicTruthTools/usePublicTruthMonitor';
import type { PublicTruthMonitorHistoryEntry } from '@type/publicTruthMonitor';
import { formatDateTime } from '@util/dateTime';
import { theme } from 'antd';
import { useMemo, useState } from 'react';
import { LuDownload, LuHistory, LuRefreshCw } from 'react-icons/lu';
import { Button, Card, Flex, Tag, Text, Toast } from '../antd';

function formatDate(value?: string): string {
    if (!value) return 'Not run yet';
    return formatDateTime(value, 'date');
}

function statusTag(entry?: PublicTruthMonitorHistoryEntry | null) {
    if (!entry) return { color: 'default' as const, label: 'Not run' };
    if (entry.status === 'ready') return { color: 'success' as const, label: 'Ready' };
    if (entry.status === 'missing_basics') return { color: 'danger' as const, label: 'Missing basics' };
    return { color: 'warning' as const, label: 'Needs checking' };
}

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
}: {
    selectedProjectId?: string | null;
    storeId?: string | number | null;
}) {
    const { token } = theme.useToken();
    const isEnabled = FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
        && FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_OWNER_CHECK
        && FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_MONITOR_ADDON;
    const { entitlement, isLoading, refresh, summary } = usePublicTruthMonitor({
        enabled: isEnabled,
        selectedProjectId,
        storeId,
    });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const latest = summary?.latest || null;
    const status = statusTag(latest);
    const history = useMemo(() => (summary?.history || []).slice(0, 3), [summary?.history]);

    if (!isEnabled) return null;
    if (!entitlement.allowed && !summary && !isLoading) return null;

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refresh();
        } catch {
            Toast.show({ content: 'Public truth history could not refresh.', duration: 1800 });
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
                            <Text type="secondary" style={{ fontSize: 12 }}>Public truth history</Text>
                            <Tag color={status.color}>{status.label}</Tag>
                        </Flex>
                        <Text strong>{latest ? `Last saved ${formatDate(latest.generatedAt)}` : 'No saved report yet.'}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            MenuList facts only. No external sites scanned.
                        </Text>
                    </Flex>
                </Flex>

                {latest ? (
                    <Flex gap={8} wrap>
                        <Tag color="success">Ready {latest.readyModuleCount}/{latest.totalModuleCount}</Tag>
                        {latest.missingFactCount ? <Tag color="danger">Missing {latest.missingFactCount}</Tag> : null}
                        <Tag color="default">Saved {summary?.history.length || 0}/{summary?.historyLimit || 0}</Tag>
                    </Flex>
                ) : null}

                {latest?.primaryFix ? (
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
                        <Text strong>{latest.primaryFix.title}</Text>
                        <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35 }}>
                            {latest.primaryFix.evidenceText}
                        </Text>
                    </Flex>
                ) : null}

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
                                <Text>{formatDate(entry.generatedAt)}</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {entry.readyModuleCount}/{entry.totalModuleCount} ready
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
                            <Text>Download</Text>
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
                            <Text style={{ color: 'inherit' }}>Run check</Text>
                        </Flex>
                    </Button>
                </Flex>
            </Flex>
        </Card>
    );
}
