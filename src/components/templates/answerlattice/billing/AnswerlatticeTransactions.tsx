'use client';

import { ANSWERLATTICE_ROUTES, toAnswerlatticeDashboardRoute } from '@constant/answerlattice/navigations';
import { getPaginatedAnswerlatticeAiOperations } from '@database/answerlattice/aiOperations';
import { getAnswerlatticeBillingHistoryForStore } from '@database/answerlattice/billing';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { formatAiOperationActionLabel, formatAiOperationCredits, getAiOperationOwnerSummary, getAiOperationTone } from '@lib/ai/operationPresentation';
import type { AiOperationHistoryRow } from '@lib/ai/operationHistoryClientContract';
import { formatBillingHistoryEvents } from '@lib/billing/billingHistoryFormatter';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { createLatestRequestGuard } from '@lib/runtime/latestRequestGuard';
import type { BillingHistoryItem } from '@type/razorpay';
import { Alert, Button, Card, Flex, Grid, Space, Spin, Table, Tag, Typography, message } from 'antd';
import { useSession } from 'next-auth/react';
import { useFormatter } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuArrowLeft, LuRefreshCw } from 'react-icons/lu';
import BillingHistory from '@/components/templates/main-app/billing/BillingHistory';

const { Title, Text } = Typography;
const AI_OPERATIONS_PAGE_SIZE = 12;
const ANSWERLATTICE_BILLING_HISTORY_LOAD_FAILED = 'answerlattice_billing_history_load_failed';
const ANSWERLATTICE_SUPPORT_CREDIT_USAGE_LOAD_FAILED = 'answerlattice_support_credit_usage_load_failed';
const ANSWERLATTICE_SUPPORT_CREDIT_USAGE_MORE_LOAD_FAILED = 'answerlattice_support_credit_usage_more_load_failed';

type AnswerlatticeTransactionsDiagnosticScope = {
    tenantId?: unknown;
    storeId?: unknown;
} | null | undefined;

const getTransactionsLoadContext = (scope: AnswerlatticeTransactionsDiagnosticScope) => ({
    ...getBoundedRuntimeStringContext('tenantId', scope?.tenantId),
    ...getBoundedRuntimeStringContext('storeId', scope?.storeId),
});

const getAiOperationsLoadMoreContext = (
    scope: AnswerlatticeTransactionsDiagnosticScope,
    options: {
        aiOperationCount: number;
        hasCursor: boolean;
        hasMoreAiOperations: boolean;
    },
) => ({
    ...getTransactionsLoadContext(scope),
    aiOperationCount: options.aiOperationCount,
    hasCursor: options.hasCursor,
    hasMoreAiOperations: options.hasMoreAiOperations,
});

const getCurrentHostname = () => (typeof window === 'undefined' ? undefined : window.location.hostname);

const getActionTagColor = (action?: string | null) => {
    const tone = getAiOperationTone(action);
    if (tone === 'content') return 'blue';
    if (tone === 'extraction') return 'geekblue';
    if (tone === 'image') return 'purple';
    if (tone === 'language') return 'cyan';
    return 'default';
};

const formatSourceLabel = (source?: string | null) => (
    String(source || 'answerlattice')
        .replace(/^answerlattice_/, '')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, char => char.toUpperCase())
);

const formatTokens = (value?: number | null) => {
    const tokens = Number(value || 0);
    return tokens > 0 ? `${tokens.toLocaleString()} tokens` : 'No tokens';
};

export default function AnswerlatticeTransactions() {
    const { data: session, status } = useSession();
    const scope = useMemo(() => resolveAnswerlatticeSessionScope(session), [session]);
    const scopeKey = scope ? `${scope.tenantId}:${scope.storeId}` : null;
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;
    const formatter = useFormatter();
    const router = useRouter();
    const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const currentHostname = getCurrentHostname();
    const [aiOperations, setAiOperations] = useState<AiOperationHistoryRow[]>([]);
    const [aiOperationsCursor, setAiOperationsCursor] = useState<{ id: string } | null>(null);
    const [hasMoreAiOperations, setHasMoreAiOperations] = useState(false);
    const [isLoadingMoreAiOperations, setIsLoadingMoreAiOperations] = useState(false);
    const [dataScopeKey, setDataScopeKey] = useState<string | null>(null);
    const requestGuardRef = useRef<ReturnType<typeof createLatestRequestGuard> | null>(null);
    if (!requestGuardRef.current) {
        requestGuardRef.current = createLatestRequestGuard();
    }
    const visibleBillingHistory = dataScopeKey === scopeKey ? billingHistory : [];
    const visibleAiOperations = dataScopeKey === scopeKey ? aiOperations : [];

    const fetchBillingHistory = useCallback(async () => {
        const requestGuard = requestGuardRef.current;
        if (!requestGuard) return;
        const requestId = requestGuard.begin();
        const tenantId = scope?.tenantId;
        const storeId = scope?.storeId;

        if (!tenantId || !storeId) {
            setBillingHistory([]);
            setAiOperations([]);
            setAiOperationsCursor(null);
            setHasMoreAiOperations(false);
            setDataScopeKey(null);
            setIsLoading(false);
            return;
        }

        setDataScopeKey(null);
        setIsLoading(true);
        try {
            const [billingResult, aiOperationsResult] = await Promise.allSettled([
                getAnswerlatticeBillingHistoryForStore(tenantId, storeId),
                getPaginatedAnswerlatticeAiOperations({
                    pageNumber: 1,
                    pageSize: AI_OPERATIONS_PAGE_SIZE,
                }),
            ]);
            if (!requestGuard.isCurrent(requestId)) return;

            if (billingResult.status === 'fulfilled') {
                setBillingHistory(formatBillingHistoryEvents(billingResult.value, {
                    formatBillingCycle: (startSeconds, endSeconds) => {
                        if (!startSeconds || !endSeconds) return undefined;
                        const startDate = formatter.dateTime(new Date(startSeconds * 1000), { year: 'numeric', month: 'short', day: 'numeric' });
                        const endDate = formatter.dateTime(new Date(endSeconds * 1000), { year: 'numeric', month: 'short', day: 'numeric' });
                        return `${startDate}-${endDate}`;
                    },
                }));
            } else {
                setBillingHistory([]);
                logRuntimeFailure(ANSWERLATTICE_BILLING_HISTORY_LOAD_FAILED, billingResult.reason, getTransactionsLoadContext({ tenantId, storeId }));
                message.error('Could not load Answerlattice transactions.');
            }

            if (aiOperationsResult.status === 'fulfilled') {
                setAiOperations(aiOperationsResult.value.data);
                setAiOperationsCursor(aiOperationsResult.value.lastVisibleDoc);
                setHasMoreAiOperations(aiOperationsResult.value.hasMore);
            } else {
                setAiOperations([]);
                setAiOperationsCursor(null);
                setHasMoreAiOperations(false);
                logRuntimeFailure(ANSWERLATTICE_SUPPORT_CREDIT_USAGE_LOAD_FAILED, aiOperationsResult.reason, getTransactionsLoadContext({ tenantId, storeId }));
                message.error('Could not load support credit usage.');
            }
            setDataScopeKey(scopeKey);
        } finally {
            if (requestGuard.isCurrent(requestId)) {
                setIsLoading(false);
            }
        }
    }, [formatter, scope?.tenantId, scope?.storeId, scopeKey]);

    const loadMoreAiOperations = useCallback(async () => {
        const requestGuard = requestGuardRef.current;
        if (!requestGuard) return;
        const tenantId = scope?.tenantId;
        const storeId = scope?.storeId;

        if (
            !tenantId
            || !storeId
            || dataScopeKey !== scopeKey
            || !hasMoreAiOperations
            || isLoadingMoreAiOperations
        ) return;
        const requestId = requestGuard.begin();
        setIsLoadingMoreAiOperations(true);
        try {
            const response = await getPaginatedAnswerlatticeAiOperations({
                pageNumber: Math.floor(visibleAiOperations.length / AI_OPERATIONS_PAGE_SIZE) + 1,
                pageSize: AI_OPERATIONS_PAGE_SIZE,
                lastVisibleDoc: aiOperationsCursor,
            });
            if (!requestGuard.isCurrent(requestId)) return;
            setAiOperations(prev => [...prev, ...response.data]);
            setAiOperationsCursor(response.lastVisibleDoc);
            setHasMoreAiOperations(response.hasMore);
        } catch (error) {
            logRuntimeFailure(ANSWERLATTICE_SUPPORT_CREDIT_USAGE_MORE_LOAD_FAILED, error, getAiOperationsLoadMoreContext(
                { tenantId, storeId },
                {
                    aiOperationCount: visibleAiOperations.length,
                    hasCursor: Boolean(aiOperationsCursor?.id),
                    hasMoreAiOperations,
                },
            ));
            message.error('Could not load more support credit usage.');
        } finally {
            if (requestGuard.isCurrent(requestId)) {
                setIsLoadingMoreAiOperations(false);
            }
        }
    }, [aiOperationsCursor, dataScopeKey, hasMoreAiOperations, isLoadingMoreAiOperations, scope?.tenantId, scope?.storeId, scopeKey, visibleAiOperations.length]);

    const aiOperationSummary = useMemo(() => (
        visibleAiOperations.reduce((summary, operation) => {
            summary.credits += Number(operation.unitsConsumed || 0);
            summary.tokens += Number(operation.totalTokenCount || 0);
            return summary;
        }, { credits: 0, tokens: 0 })
    ), [visibleAiOperations]);

    const aiOperationColumns = useMemo(() => [
        {
            title: 'Date',
            dataIndex: 'createdOn',
            key: 'createdOn',
            width: 150,
            render: (value: string) => {
                const date = value ? new Date(value) : null;
                return date && Number.isFinite(date.getTime())
                    ? formatter.dateTime(date, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                    : '-';
            },
        },
        {
            title: 'Action',
            dataIndex: 'action',
            key: 'action',
            width: 210,
            render: (action: string) => <Tag color={getActionTagColor(action)}>{formatAiOperationActionLabel(action)}</Tag>,
        },
        {
            title: 'Result',
            key: 'result',
            render: (_: unknown, record: AiOperationHistoryRow) => (
                <Flex vertical gap={2}>
                    <Text>{getAiOperationOwnerSummary(record)}</Text>
                    <Text type="secondary">{formatSourceLabel(record.source)}</Text>
                </Flex>
            ),
        },
        {
            title: 'Credits',
            dataIndex: 'unitsConsumed',
            key: 'unitsConsumed',
            width: 120,
            align: 'right' as const,
            render: (value: number) => <Text>{formatAiOperationCredits(Number(value || 0))}</Text>,
        },
        {
            title: 'Tokens',
            dataIndex: 'totalTokenCount',
            key: 'totalTokenCount',
            width: 150,
            align: 'right' as const,
            render: (value: number, record: AiOperationHistoryRow) => (
                <Space size={4}>
                    <Text>{formatTokens(value)}</Text>
                    {record.tokenCountSource === 'estimated' ? <Tag color="default">est.</Tag> : null}
                </Space>
            ),
        },
        {
            title: 'Time',
            dataIndex: 'processingTime',
            key: 'processingTime',
            width: 100,
            align: 'right' as const,
            render: (value: number) => {
                const ms = Number(value || 0);
                return ms > 0 ? `${(ms / 1000).toFixed(1)}s` : '-';
            },
        },
    ], [formatter]);

    useEffect(() => {
        if (status === 'loading') return;
        void fetchBillingHistory();
        return () => {
            requestGuardRef.current?.invalidate();
        };
    }, [fetchBillingHistory, status]);

    return (
        <Flex vertical gap={16} style={{ width: '100%', paddingBottom: isMobile ? 'calc(24px + env(safe-area-inset-bottom))' : 0 }}>
            <Flex align={isMobile ? 'stretch' : 'flex-start'} justify="space-between" gap={16} vertical={isMobile} wrap={!isMobile}>
                <Flex vertical gap={4}>
                    <Title level={isMobile ? 4 : 2} style={{ margin: 0 }}>Transactions</Title>
                    <Text type="secondary">Invoices, subscription charges, and Answerlattice support credit purchases.</Text>
                </Flex>
                <Flex gap={8} wrap>
                    <Button icon={<LuArrowLeft />} onClick={() => router.push(toAnswerlatticeDashboardRoute(ANSWERLATTICE_ROUTES.BILLING, currentHostname))}>
                        Billing
                    </Button>
                    <Button icon={<LuRefreshCw />} onClick={() => void fetchBillingHistory()}>
                        Refresh
                    </Button>
                </Flex>
            </Flex>

            {!scope ? (
                <Alert type="warning" showIcon message="Answerlattice account scope is missing" />
            ) : null}

            {isLoading ? (
                <Card>
                    <Flex align="center" justify="center" gap={12} style={{ minHeight: 160 }}>
                        <Spin />
                        <Text type="secondary">Loading transactions...</Text>
                    </Flex>
                </Card>
            ) : (
                <Flex vertical gap={16}>
                    <Card>
                        <Flex align={isMobile ? 'stretch' : 'center'} justify="space-between" gap={16} vertical={isMobile}>
                            <Flex vertical gap={4}>
                                <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>Support credit usage</Title>
                                <Text type="secondary">
                                    {formatAiOperationCredits(aiOperationSummary.credits)} / {formatTokens(aiOperationSummary.tokens)}
                                </Text>
                            </Flex>
                            <Button
                                disabled={!hasMoreAiOperations}
                                loading={isLoadingMoreAiOperations}
                                onClick={() => void loadMoreAiOperations()}
                            >
                                Load more
                            </Button>
                        </Flex>
                        <Table
                            columns={aiOperationColumns}
                            dataSource={visibleAiOperations}
                            locale={{ emptyText: 'No support credit usage yet.' }}
                            pagination={false}
                            rowKey={(record) => record.id}
                            scroll={{ x: 760 }}
                            size={isMobile ? 'small' : 'middle'}
                            style={{ marginTop: 16 }}
                        />
                    </Card>
                    <BillingHistory billingHistory={visibleBillingHistory} fetchBillingHistory={fetchBillingHistory} />
                </Flex>
            )}
        </Flex>
    );
}
