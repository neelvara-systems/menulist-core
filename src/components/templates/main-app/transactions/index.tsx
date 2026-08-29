
'use client'
import { AI_ACTIONS_TYPES } from '@constant/common';
import { getPaginatedAiOperations } from '@database/aiOperations';
import { getExistingProjectsListWithoutLoader } from '@database/projects';
import { formatAiOperationActionLabel, formatAiOperationCredits, getAiOperationOwnerSummary, getAiOperationTone, MENULIST_OWNER_AI_ACTIONS } from '@lib/ai/operationPresentation';
import type { AiOperationHistoryRow } from '@lib/ai/operationHistoryClientContract';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { getFormatedDateAndTime, toDate } from '@util/dateTime';
import { formatNumber, formatProcessingTime } from '@util/formatters';
import { Button, Card, DatePicker, Empty, Flex, Row, Select, Spin, Table, Tag, Tooltip, Typography, App } from 'antd';
import dayjs from 'dayjs';
import { useFormatter, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuArrowLeft, LuArrowRight, LuRefreshCw } from 'react-icons/lu';
import { ProjectMetadata } from '../projects/types';
import TransactionDetailsModal, { TransactionDetails } from './TransactionDetailsModal';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const AI_TRANSACTIONS_PAGE_LOAD_FAILED = 'ai_transactions_page_load_failed';
const AI_TRANSACTIONS_PROJECTS_LOAD_FAILED = 'ai_transactions_projects_load_failed';

const getTransactionsPageLogContext = (input: {
    actionFilter?: unknown;
    cursorId?: unknown;
    hasDateRange?: boolean;
    pageNumber?: number;
    pageSize?: number;
    projectLookupAttempted?: boolean;
}) => ({
    hasDateRange: Boolean(input.hasDateRange),
    pageNumber: input.pageNumber,
    pageSize: input.pageSize,
    projectLookupAttempted: input.projectLookupAttempted,
    ...getBoundedRuntimeStringContext('actionFilter', input.actionFilter),
    ...getBoundedRuntimeStringContext('cursorId', input.cursorId),
});

type TransactionData = AiOperationHistoryRow;

interface PaginationState {
    current: number;
    pageSize: number;
    hasMore: boolean;
    requiresManualContinuation: boolean;
}

function TransactionPage() {
    const { message: messageApi } = App.useApp();
    const t = useTranslations('Transactions');
    const [transactions, setTransactions] = useState<TransactionData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
    const [actionFilter, setActionFilter] = useState<string | null>(null);
    const [pagination, setPagination] = useState<PaginationState>({
        current: 1,
        pageSize: 15,
        hasMore: false,
        requiresManualContinuation: false,
    });

    const formatter = useFormatter();

    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetails | null>(null);
    const [projectsList, setProjectsList] = useState<ProjectMetadata[]>([])
    const [projectsLoaded, setProjectsLoaded] = useState(false);
    const pageCursorsRef = useRef<Record<number, { id?: string } | null>>({ 1: null });
    const requestIdRef = useRef(0);

    const fetchTransactions = useCallback(async (page = 1, options?: { resetCursors?: boolean }) => {
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;
        try {
            setLoading(true);
            if (options?.resetCursors) {
                pageCursorsRef.current = { 1: null };
                setTransactions([]);
            }

            const response = await getPaginatedAiOperations({
                pageSize: pagination.pageSize,
                pageNumber: page,
                lastVisibleDoc: page <= 1 ? null : pageCursorsRef.current[page] || null,
                dateRange,
                action: actionFilter
            });

            if (requestId !== requestIdRef.current) return;

            if (response.hasMore && response.lastVisibleDoc) {
                pageCursorsRef.current[page + 1] = response.lastVisibleDoc;
            } else {
                delete pageCursorsRef.current[page + 1];
            }

            if (
                response.data.length === 0
                && page > 1
                && (!response.hasMore || !response.lastVisibleDoc)
            ) {
                messageApi.info(t('noMoreTransactions'));
                setPagination((previous) => ({
                    ...previous,
                    current: Math.max(1, page - 1),
                    hasMore: false,
                    requiresManualContinuation: false,
                }));
                return;
            }

            setTransactions(response.data);
            setPagination((previous) => ({
                ...previous,
                current: page,
                hasMore: response.hasMore,
                requiresManualContinuation: response.requiresManualContinuation,
            }));
        } catch (error) {
            if (requestId !== requestIdRef.current) return;
            logRuntimeFailure(AI_TRANSACTIONS_PAGE_LOAD_FAILED, error, getTransactionsPageLogContext({
                actionFilter,
                cursorId: page <= 1 ? null : pageCursorsRef.current[page]?.id,
                hasDateRange: Boolean(dateRange?.[0] || dateRange?.[1]),
                pageNumber: page,
                pageSize: pagination.pageSize,
            }));
            messageApi.error(t('failedToLoad'));
        } finally {
            if (requestId === requestIdRef.current) {
                setLoading(false);
            }
        }
    }, [actionFilter, dateRange, pagination.pageSize, t]);

    const fetchProjectsList = useCallback(async () => {
        try {
            const fetchedProjects = await getExistingProjectsListWithoutLoader();
            setProjectsList(fetchedProjects.projects);
        } catch (error) {
            logRuntimeFailure(AI_TRANSACTIONS_PROJECTS_LOAD_FAILED, error, getTransactionsPageLogContext({
                actionFilter,
                hasDateRange: Boolean(dateRange?.[0] || dateRange?.[1]),
                pageNumber: pagination.current,
                pageSize: pagination.pageSize,
                projectLookupAttempted: true,
            }));
        } finally {
            setProjectsLoaded(true);
        }
    }, [actionFilter, dateRange, pagination.current, pagination.pageSize]);

    useEffect(() => {
        void fetchTransactions(1, { resetCursors: true });
    }, [fetchTransactions]);

    useEffect(() => {
        const pageHasProjectIds = transactions.some((transaction) => Boolean(transaction.projectId));
        if (!projectsLoaded && pageHasProjectIds) {
            void fetchProjectsList();
        }
    }, [fetchProjectsList, projectsLoaded, transactions]);

    const handleDateRangeChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
        setDateRange(dates);
    };

    const handleActionFilterChange = (value: string | null) => {
        setActionFilter(value);
    };

    const resetFilters = () => {
        const hasFilters = Boolean(dateRange || actionFilter);
        setDateRange(null);
        setActionFilter(null);

        if (!hasFilters) {
            void fetchTransactions(1, { resetCursors: true });
        }
    };

    const refreshData = () => {
        void fetchTransactions(1, { resetCursors: true });
    };

    const goToPreviousPage = () => {
        if (pagination.current <= 1) return;
        void fetchTransactions(pagination.current - 1);
    };

    const goToNextPage = () => {
        if (!pagination.hasMore) return;
        void fetchTransactions(pagination.current + 1);
    };

    const pageCreditsUsed = useMemo(() => (
        transactions.reduce((total, transaction) => total + Math.max(0, Number(transaction.unitsConsumed || 0)), 0)
    ), [transactions]);

    const freeOperationsOnPage = useMemo(() => (
        transactions.filter((transaction) => Number(transaction.unitsConsumed || 0) <= 0).length
    ), [transactions]);

    const hasActiveFilters = Boolean(dateRange || actionFilter);

    const getActionTagColor = (action?: string) => {
        const tone = getAiOperationTone(action);
        if (tone === 'extraction') return 'blue';
        if (tone === 'language') return 'green';
        if (tone === 'image') return 'purple';
        if (tone === 'content') return 'cyan';
        return 'default';
    };

    const getProjectName = (projectId?: string) => {
        if (!projectId) return t('unknownProject');
        const project = projectsList.find(p => p.projectId === projectId);
        return project
            ? getLocalizedText(project.name, undefined, getPrimaryLocalizedLanguage(project.name, 'en'), t('unknownProject'))
            : t('unknownProject');
    };

    const columns = [
        {
            title: t('date'),
            dataIndex: 'createdOn',
            key: 'createdOn',
            render: (date: string) => (
                <Tooltip title={getFormatedDateAndTime(formatter, date)}>
                    {getFormatedDateAndTime(formatter, date)}
                </Tooltip>
            ),
            sorter: (a: TransactionData, b: TransactionData) => {
                return toDate(b.createdOn).getTime() - toDate(a.createdOn).getTime();
            },
        },
        {
            title: t('action'),
            dataIndex: 'action',
            key: 'action',
            render: (action: string) => <Tag color={getActionTagColor(action)}>{formatAiOperationActionLabel(action, t)}</Tag>,
        },
        {
            title: t('project'),
            dataIndex: 'projectId',
            key: 'projectId',
            render: (projectId: string) => getProjectName(projectId),
        },
        {
            title: t('result'),
            key: 'result',
            render: (_: unknown, record: TransactionData) => (
                <Text>{getAiOperationOwnerSummary(record, t)}</Text>
            ),
        },
        {
            title: t('creditsUsed'),
            dataIndex: 'unitsConsumed',
            key: 'unitsConsumed',
            render: (units: number) => {
                const consumed = Number(units ?? 0);
                if (consumed <= 0) {
                    return <Tag color="default">{formatAiOperationCredits(consumed, t)}</Tag>;
                }
                return <Tag color="green">{formatAiOperationCredits(consumed, t)}</Tag>;
            },
            sorter: (a: TransactionData, b: TransactionData) => Number(a.unitsConsumed || 0) - Number(b.unitsConsumed || 0),
        },
        {
            title: t('processingTime'),
            dataIndex: 'processingTime',
            key: 'processingTime',
            render: (time: number) => formatProcessingTime(Number(time || 0)),
            sorter: (a: TransactionData, b: TransactionData) => Number(a.processingTime || 0) - Number(b.processingTime || 0),
        },
        {
            title: t('details'),
            key: 'details',
            render: (_: unknown, record: TransactionData) => (
                <Button
                    aria-label={`${t('details')}: ${formatAiOperationActionLabel(record.action, t)}`}
                    type="text"
                    icon={<LuArrowRight />}
                    onClick={(event) => {
                        event.stopPropagation();
                        showTransactionDetails(record);
                    }}
                />
            ),
        },
    ];

    const actionOptions = useMemo(() => MENULIST_OWNER_AI_ACTIONS.map((value) => ({
        value,
        label: formatAiOperationActionLabel(value, t),
    })), [t]);

    // Show transaction details in modal
    const showTransactionDetails = (transaction: TransactionData) => {
        setSelectedTransaction(transaction);
        setIsModalOpen(true);
    };

    // Handle modal close
    const handleModalClose = () => {
        setIsModalOpen(false);
    };

    return (
        <Card variant="borderless" className="transaction-page" title={t('title')}
            extra={<Button
                type="primary"
                icon={<LuRefreshCw />}
                onClick={refreshData}
                loading={loading}
            >
                {t('refresh')}
            </Button>}>

            <Row gutter={[16, 24]} style={{ marginBottom: 24 }}>
                <Flex style={{ width: '100%' }} gap={12} justify='flex-end' wrap="wrap">
                    <label className="sr-only" htmlFor="transaction-start-date">{t('startDate')}</label>
                    <label className="sr-only" htmlFor="transaction-end-date">{t('endDate')}</label>
                    <RangePicker
                        id={{ start: 'transaction-start-date', end: 'transaction-end-date' }}
                        style={{ width: 300 }}
                        onChange={handleDateRangeChange}
                        value={dateRange}
                        allowClear
                    />
                    <Select
                        aria-label={t('filterByAction')}
                        placeholder={t('filterByAction')}
                        allowClear
                        style={{ width: '200px' }}
                        onChange={handleActionFilterChange}
                        value={actionFilter}
                        options={actionOptions}
                    />
                    <Button
                        onClick={resetFilters}
                    >
                        {t('reset')}
                    </Button>
                    {hasActiveFilters ? <Tag color="blue">{t('filtered')}</Tag> : null}
                </Flex>
            </Row>

            {!loading && transactions.length > 0 ? (
                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 16 }}>
                    <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
                        <Text type="secondary">{t('shownOnThisPage')}</Text>
                        <div><Text strong style={{ fontSize: 20 }}>{formatNumber(transactions.length)}</Text></div>
                    </div>
                    <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
                        <Text type="secondary">{t('creditsUsedOnPage')}</Text>
                        <div><Text strong style={{ fontSize: 20 }}>{formatNumber(pageCreditsUsed)}</Text></div>
                    </div>
                    <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
                        <Text type="secondary">{t('noCreditActions')}</Text>
                        <div><Text strong style={{ fontSize: 20 }}>{formatNumber(freeOperationsOnPage)}</Text></div>
                    </div>
                </div>
            ) : null}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Spin size="large" />
                </div>
            ) : transactions.length === 0 ? (
                <Flex vertical gap={16}>
                    <Empty description={pagination.requiresManualContinuation ? t('continueFilteredHistory') : t('noTransactions')} />
                    {pagination.hasMore ? (
                        <Flex justify="flex-end" gap={8}>
                            <Button icon={<LuArrowLeft />} onClick={goToPreviousPage} disabled={loading || pagination.current <= 1}>
                                {t('previous')}
                            </Button>
                            <Button type="primary" icon={<LuArrowRight />} onClick={goToNextPage} disabled={loading || !pagination.hasMore}>
                                {t('next')}
                            </Button>
                        </Flex>
                    ) : null}
                </Flex>
            ) : (
                <>
                    <Table
                        dataSource={transactions}
                        columns={columns}
                        rowKey="id"
                        onRow={(record) => ({
                            onClick: () => showTransactionDetails(record)
                        })}
                        pagination={false}
                        scroll={{ x: 'max-content' }}
                    />
                    <Flex align="center" justify="space-between" style={{ marginTop: 16 }} wrap="wrap" gap={12}>
                        <Text type="secondary">
                            {t('pageSummary', {
                                page: formatNumber(pagination.current),
                                count: formatNumber(transactions.length),
                            })}
                            {pagination.hasMore ? ` ${t('moreAvailable')}` : ''}
                        </Text>
                        <Flex gap={8}>
                            <Button icon={<LuArrowLeft />} onClick={goToPreviousPage} disabled={loading || pagination.current <= 1}>
                                {t('previous')}
                            </Button>
                            <Button type="primary" icon={<LuArrowRight />} onClick={goToNextPage} disabled={loading || !pagination.hasMore}>
                                {t('next')}
                            </Button>
                        </Flex>
                    </Flex>
                </>
            )}
            <TransactionDetailsModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                transaction={selectedTransaction}
            />
        </Card>
    );
}

export default TransactionPage;
