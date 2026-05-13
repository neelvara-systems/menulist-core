'use client'

import { AI_ACTIONS_TYPES } from '@constant/common';
import { getPaginatedAiOperations } from '@database/aiOperations';
import { getFormatedDateAndTime } from '@util/dateTime';
import { formatProcessingTime } from '@util/formatters';
import { useFormatter, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LuReceipt, LuRefreshCw } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, InfiniteScroll, List, NavBar, Text, Title, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

interface MobileTransactionsScreenProps {
    onBack: () => void;
}

interface TransactionItem {
    action: string;
    createdOn: string;
    id: string;
    processingTime: number;
    projectId?: string;
    totalTokenCount?: number;
    unitsConsumed?: number;
}

export default function MobileTransactionsScreen({ onBack }: MobileTransactionsScreenProps) {
    const t = useTranslations('Transactions');
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const lastVisibleRef = useRef<any>(null);
    const pageRef = useRef(1);
    const formatter = useFormatter();

    const fetchPage = useCallback(async (reset = false) => {
        try {
            if (reset) {
                lastVisibleRef.current = null;
                pageRef.current = 1;
                setTransactions([]);
            }

            const response = await getPaginatedAiOperations({
                action: null,
                dateRange: null,
                lastVisibleDoc: lastVisibleRef.current,
                pageNumber: pageRef.current,
                pageSize: 15,
            });

            lastVisibleRef.current = response.lastVisibleDoc;
            if (response.data.length === 0) {
                setHasMore(false);
                return;
            }

            setHasMore(response.hasMore);
            setTransactions((previous) => (reset || pageRef.current === 1 ? response.data : [...previous, ...response.data]));
            pageRef.current += 1;
        } catch {
            Toast.show({ content: t('failedToLoad'), duration: 2000 });
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void fetchPage(true);
    }, [fetchPage]);

    const getActionColor = (action: string) => {
        if (action === AI_ACTIONS_TYPES.IMAGE_PROCESSING) return '#3b82f6';
        if (action === AI_ACTIONS_TYPES.LANGUAGE_ADDITION || action === AI_ACTIONS_TYPES.IMAGE_TRANSLATION) return '#22c55e';
        if (action === AI_ACTIONS_TYPES.ADD_DESCRIPTION || action === AI_ACTIONS_TYPES.REWRITE_DESCRIPTION) return '#a855f7';
        return '#6b7280';
    };

    const formatActionLabel = (action: string) => action.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    const formatCreditsUsed = (tx: TransactionItem) => {
        const units = Number(tx.unitsConsumed || 0);
        return units > 0 ? `${units} used` : 'No credits';
    };

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description={t('subtitle')}
                onBack={onBack}
                right={(
                    <Button fill="none" onClick={() => { setLoading(true); void fetchPage(true); }}>
                        <LuRefreshCw color="#64748b" size={18} />
                    </Button>
                )}
                title={t('title')}
            />

            <Flex gap={12} style={{ padding: 16 }} vertical>
                {loading && transactions.length === 0 ? (
                    <Flex align="center" justify="center" style={{ padding: 48 }}>
                        <DotLoading color="primary" />
                    </Flex>
                ) : transactions.length === 0 ? (
                    <Card>
                        <Flex align="center" gap={12} vertical>
                            <LuReceipt color="#d1d5db" size={36} />
                            <Title level={5} style={{ margin: 0 }}>No enhancement activity yet.</Title>
                        </Flex>
                    </Card>
                ) : (
                    <>
                        <Card>
                            <List>
                                {transactions.map((tx) => (
                                    <List.Item
                                        description={(
                                            <Flex gap={8}>
                                                <Text type="secondary">{getFormatedDateAndTime(formatter, tx.createdOn)}</Text>
                                                <Text type="secondary">{formatProcessingTime(tx.processingTime)}</Text>
                                                {typeof tx.totalTokenCount === 'number' ? (
                                                    <Text type="secondary">{tx.totalTokenCount.toLocaleString()} tokens</Text>
                                                ) : null}
                                            </Flex>
                                        )}
                                        extra={<Text strong style={{ color: Number(tx.unitsConsumed || 0) > 0 ? '#16a34a' : '#64748b' }}>{formatCreditsUsed(tx)}</Text>}
                                        key={tx.id}
                                        title={(
                                            <Flex align="center" gap={8}>
                                                <Card style={{ backgroundColor: getActionColor(tx.action), borderRadius: '50%', height: 8, minWidth: 8, padding: 0, width: 8 }} />
                                                <Text strong>{formatActionLabel(tx.action)}</Text>
                                            </Flex>
                                        )}
                                    />
                                ))}
                            </List>
                        </Card>
                        <InfiniteScroll hasMore={hasMore} loadMore={async () => { await fetchPage(false); }} />
                    </>
                )}
            </Flex>
        </Flex>
    );
}
