
'use client'
import { SyncOutlined } from '@ant-design/icons';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { getPaginatedAiOperations } from '@database/aiOperations';
import { getMetadataProjectsList } from '@database/projects';
import { getFormatedDateAndTime } from '@util/dateTime';
import { formatCurrency, formatProcessingTime } from '@util/formatters';
import { Button, Card, DatePicker, Empty, Flex, Row, Select, Spin, Table, Tag, Tooltip, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { LuArrowRight } from 'react-icons/lu';
import { ProjectMetadata } from '../projects/types';
import TransactionDetailsModal, { TransactionDetails } from './TransactionDetailsModal';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface TransactionData {
    id: string;
    projectId: string;
    fileId: string;
    action: string;
    clientResponse: any;
    geminiResponse: string;
    generationConfig: any;
    model: string;
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
    processingTime: number;
    tokenPerCredit: number;
    chargePerCredit: number;
    totalCredits: number;
    totalCharge: number;
    createdOn: string;
    storeId: string;
    // Fields for language operations
    inputStrings?: Record<string, string>;
    targetLang?: { code: string; name: string };
    sourceLang?: { code: string; name: string };
    // Fields for image processing
    files?: Array<{ uid: string; name: string; type: string; url: string }>;
    targetLanguages?: Array<{ code: string; name: string }>;
}

// Define the pagination state interface
interface PaginationState {
    current: number;
    pageSize: number;
    total: number;
    hasMore?: boolean;
}

function TransactionPage() {
    const t = useTranslations('Transactions');
    const [transactions, setTransactions] = useState<TransactionData[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<TransactionData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
    const [actionFilter, setActionFilter] = useState<string | null>(null);
    const [pagination, setPagination] = useState<PaginationState>({
        current: 1,
        pageSize: 10,
        total: 0,
        hasMore: false
    });

    const formatter = useFormatter();

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetails | null>(null);
    const [projectsList, setProjectsList] = useState<ProjectMetadata[]>([])
    // Reference to the last document for pagination
    const lastVisibleRef = useRef<any>(null);


    // Fetch transactions with pagination and filters
    const fetchTransactions = async (page = 1, filters = { dateRange: null, action: null }) => {

        try {
            setLoading(true);

            // Always reset when filters change
            if (page === 1) {
                lastVisibleRef.current = null;
                setTransactions([]);
                setFilteredTransactions([]);
            }

            // Call our paginated API function
            const response = await getPaginatedAiOperations({
                pageSize: pagination.pageSize,
                pageNumber: page,
                lastVisibleDoc: lastVisibleRef.current,
                dateRange: filters.dateRange,
                action: filters.action
            });

            // Update the last visible document reference for next pagination
            lastVisibleRef.current = response.lastVisibleDoc;

            // If no results on first page
            if (response.data.length === 0 && page === 1) {
                setTransactions([]);
                setFilteredTransactions([]);
                setPagination({
                    ...pagination,
                    current: 1,
                    total: 0,
                });
                setLoading(false);
                return;
            }

            // If no results on a subsequent page, we've reached the end
            if (response.data.length === 0 && page > 1) {
                message.info(t('noMoreTransactions'));
                setPagination({
                    ...pagination,
                    current: page - 1, // Stay on current page
                });
                setLoading(false);
                return;
            }

            // Process results
            const newTransactions: TransactionData[] = response.data;
            console.log("newTransactions", newTransactions)
            // For the first page, replace transactions
            if (page === 1) {
                setTransactions(newTransactions);
                setFilteredTransactions(newTransactions);
            } else {
                // For subsequent pages, append to existing transactions
                setTransactions(prev => [...prev, ...newTransactions]);
                setFilteredTransactions(prev => [...prev, ...newTransactions]);
            }

            // Update pagination with more accurate total calculation
            // For server-side pagination in Ant Design, three approaches:

            // Option 1: Don't specify total at all, which enables simple "previous/next" navigation
            // Option 2: Set total to exact count of items we have (but this limits to current data)
            // Option 3: Use a reasonable estimate that avoids the warning

            if (response.hasMore) {
                // If we have more data, set total to current items plus one more page
                // This prevents the warning while allowing pagination to work
                setPagination({
                    ...pagination,
                    current: page,
                    hasMore: true,
                    total: Math.max(
                        transactions.length + newTransactions.length, // Total items we've fetched
                        page * pagination.pageSize // At least current page * items per page
                    )
                });
            } else {
                // If we don't have more data, set total to exactly what we have
                setPagination({
                    ...pagination,
                    current: page,
                    hasMore: false,
                    total: page === 1 ?
                        newTransactions.length : // First page, just what we loaded
                        transactions.length + newTransactions.length // All pages combined
                });
            }

            setLoading(false);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            message.error(t('failedToLoad'));
            setLoading(false);
        }
    };

    const fetchProjectsList = async () => {
        const fetchedProjects = await getMetadataProjectsList();
        setProjectsList(fetchedProjects)
        console.log("fetchedProjects", fetchedProjects)
    }

    // Apply filters when they change
    useEffect(() => {

        if (projectsList.length === 0) {
            fetchProjectsList()
        }
        // Reset pagination to first page and apply filters
        setPagination({ ...pagination, current: 1 });

        // Fetch with new filters
        fetchTransactions(1, { dateRange, action: actionFilter });
    }, [dateRange, actionFilter]);

    const handleDateRangeChange = (dates: any) => {
        setDateRange(dates);
    };

    const handleTableChange = (newPagination: any) => {
        // Fetch the next page of data when pagination changes
        fetchTransactions(newPagination.current, {
            dateRange,
            action: actionFilter
        });
    };

    const handleActionFilterChange = (value: string | null) => {
        setActionFilter(value);
    };

    const resetFilters = () => {
        setDateRange(null);
        setActionFilter(null);

        // Reset to page 1 with no filters
        fetchTransactions(1);
    };

    const refreshData = () => {
        // Reset to page 1 with current filters
        fetchTransactions(1, {
            dateRange,
            action: actionFilter
        });
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
                return new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime();
            },
        },
        {
            title: t('action'),
            dataIndex: 'action',
            key: 'action',
            render: (action: string) => {
                let color = 'blue';
                if (action === 'translation') color = 'green';
                if (action === 'generation') color = 'purple';
                return <Tag color={color}>{action}</Tag>;
            },
        },
        {
            title: t('project'),
            dataIndex: 'projectId',
            key: 'projectId',
            render: (projectId: string) => {
                const project = projectsList.find(p => p.projectId === projectId);
                return project ? project.name : t('unknownProject');
            },
        },
        {
            title: t('totalCharge'),
            dataIndex: 'totalCharge',
            key: 'totalCharge',
            render: (charge: number) => (
                <Text type="success">{formatCurrency(charge, 'INR')}</Text>
            ),
            sorter: (a: TransactionData, b: TransactionData) => a.totalCharge - b.totalCharge,
        },
        {
            title: t('processingTime'),
            dataIndex: 'processingTime',
            key: 'processingTime',
            render: (time: number) => formatProcessingTime(time),
            sorter: (a: TransactionData, b: TransactionData) => a.processingTime - b.processingTime,
        },
        {
            title: t('details'),
            key: 'details',
            render: (_: any, record: TransactionData) => (
                <Button
                    type="text"
                    icon={<LuArrowRight />}
                    onClick={() => showTransactionDetails(record)}
                />
            ),
        },
    ];

    // Use predefined action types from constants
    const actionOptions = Object.entries(AI_ACTIONS_TYPES).map(([key, value]: [string, string]) => ({
        value: value,
        label: value.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }));

    // Show transaction details in modal
    const showTransactionDetails = (transaction: TransactionData) => {
        setSelectedTransaction(transaction as unknown as TransactionDetails);
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
                icon={<SyncOutlined />}
                onClick={refreshData}
                loading={loading}
            >
                {t('refresh')}
            </Button>}>

            <Row gutter={[16, 24]} style={{ marginBottom: 24 }}>
                <Flex style={{ width: '100%' }} gap={16} justify='flex-end'>
                    <RangePicker
                        style={{ width: 300 }}
                        onChange={handleDateRangeChange}
                        value={dateRange}
                        allowClear
                    />
                    <Select
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
                </Flex>
            </Row>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Spin size="large" />
                </div>
            ) : filteredTransactions.length === 0 ? (
                <Empty description={t('noTransactions')} />
            ) : (
                <Table
                    dataSource={filteredTransactions}
                    columns={columns}
                    rowKey="id"
                    onRow={(record) => ({
                        onClick: () => showTransactionDetails(record)
                    })}
                    pagination={{
                        ...pagination,
                        showTotal: (total) => `Total ${total} items`,
                        showSizeChanger: false,
                        // Always show pagination if we have data or if there might be more data
                        total: pagination.hasMore ?
                            // If there might be more data, use our estimate
                            Math.max(pagination.total, filteredTransactions.length + pagination.pageSize) :
                            // Otherwise use the exact count of items we have
                            Math.max(filteredTransactions.length, pagination.pageSize + 1)
                    }}
                    onChange={handleTableChange}
                    scroll={{ x: 'max-content' }}
                />
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