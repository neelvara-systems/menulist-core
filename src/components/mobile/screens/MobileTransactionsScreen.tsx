'use client'

import { AI_ACTIONS_TYPES } from '@constant/common';
import { getPaginatedAiOperations } from '@database/aiOperations';
import { getFormatedDateAndTime } from '@util/dateTime';
import { formatCurrency, formatProcessingTime } from '@util/formatters';
import { Card, DotLoading, InfiniteScroll, List, NavBar, Toast } from 'antd-mobile';
import { useFormatter, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LuReceipt, LuRefreshCw } from 'react-icons/lu';

interface MobileTransactionsScreenProps {
    onBack: () => void;
}

interface TransactionItem {
    id: string;
    action: string;
    totalCharge: number;
    processingTime: number;
    createdOn: string;
    projectId?: string;
}

/**
 * Mobile Transactions Screen — zero desktop dependency
 * 
 * View AI credit usage history with infinite scroll.
 * Uses same DAL: getPaginatedAiOperations
 */
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
                pageSize: 15,
                pageNumber: pageRef.current,
                lastVisibleDoc: lastVisibleRef.current,
                dateRange: null,
                action: null,
            });

            lastVisibleRef.current = response.lastVisibleDoc;

            if (response.data.length === 0) {
                setHasMore(false);
                return;
            }

            setHasMore(response.hasMore);

            if (reset || pageRef.current === 1) {
                setTransactions(response.data);
            } else {
                setTransactions((prev) => [...prev, ...response.data]);
            }

            pageRef.current += 1;
        } catch {
            Toast.show({ content: t('failedToLoad'), duration: 2000 });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPage(true);
    }, [fetchPage]);

    const getActionColor = (action: string) => {
        if (action === AI_ACTIONS_TYPES.IMAGE_PROCESSING) return '#3b82f6';
        if (action === AI_ACTIONS_TYPES.LANGUAGE_ADDITION || action === AI_ACTIONS_TYPES.IMAGE_TRANSLATION) return '#22c55e';
        if (action === AI_ACTIONS_TYPES.ADD_DESCRIPTION || action === AI_ACTIONS_TYPES.REWRITE_DESCRIPTION) return '#a855f7';
        return '#6b7280';
    };

    const formatActionLabel = (action: string) => {
        return action
            .split('_')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
    };

    const loadMore = async () => {
        if (!hasMore) return;
        await fetchPage(false);
    };

    return (
        <div className="flex flex-col h-full">
            <NavBar
                onBack={onBack}
                right={
                    <button
                        onClick={() => { setLoading(true); fetchPage(true); }}
                        className="p-2 active:opacity-60"
                    >
                        <LuRefreshCw size={18} className="text-gray-500" />
                    </button>
                }
                style={{ '--height': '48px' } as React.CSSProperties}
            >
                Transactions
            </NavBar>

            <div className="flex-1 overflow-y-auto">
                {loading && transactions.length === 0 ? (
                    <div className="flex items-center justify-center py-20"><DotLoading color="primary" /></div>
                ) : transactions.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 pt-16 px-6">
                        <LuReceipt size={36} className="text-gray-300" />
                        <p className="text-sm text-gray-500 text-center">No AI transactions yet.</p>
                    </div>
                ) : (
                    <div className="px-4 pt-3 pb-4">
                        <Card style={{ padding: 0 }} className="rounded-xl">
                            <List style={{ '--border-inner': '1px solid var(--adm-color-border, #eee)' } as React.CSSProperties}>
                                {transactions.map((tx) => (
                                    <List.Item
                                        key={tx.id}
                                        description={
                                            <span className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-gray-400">{getFormatedDateAndTime(formatter, tx.createdOn)}</span>
                                                <span className="text-xs text-gray-400">{formatProcessingTime(tx.processingTime)}</span>
                                            </span>
                                        }
                                        extra={
                                            <span className="text-sm font-semibold text-green-600">
                                                {formatCurrency(tx.totalCharge, 'INR')}
                                            </span>
                                        }
                                        style={{ minHeight: '48px' }}
                                    >
                                        <span className="flex items-center gap-2">
                                            <span
                                                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: getActionColor(tx.action) }}
                                            />
                                            <span className="text-sm font-medium">{formatActionLabel(tx.action)}</span>
                                        </span>
                                    </List.Item>
                                ))}
                            </List>
                        </Card>
                        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
                    </div>
                )}
            </div>
        </div>
    );
}
