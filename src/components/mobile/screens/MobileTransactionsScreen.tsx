'use client'

import { AI_ACTIONS_TYPES } from '@constant/common';
import { getPaginatedAiOperations } from '@database/aiOperations';
import { getFormatedDateAndTime, type DateLike } from '@util/dateTime';
import { formatCurrency, formatProcessingTime } from '@util/formatters';
import dayjs from 'dayjs';
import { useFormatter, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuFilter, LuReceipt, LuRefreshCw, LuX } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, InfiniteScroll, Input, List, NavBar, Popup, Tag, Text, Title, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

interface MobileTransactionsScreenProps {
    onBack: () => void;
}

interface TransactionItem {
    action: string;
    candidatesTokenCount?: number;
    chargePerCredit?: number;
    clientResponse?: any;
    contentLength?: 'Small' | 'Medium' | 'Large';
    createdOn: DateLike;
    fileId?: string;
    files?: Array<{ uid?: string; name?: string; type?: string; url?: string }>;
    generationConfig?: any;
    geminiResponse?: string;
    id: string;
    inputStrings?: Record<string, string>;
    itemsList?: Array<{ id?: string; name?: string; description?: Record<string, string> }>;
    model?: string;
    processingTime: number;
    promptTokenCount?: number;
    projectId?: string;
    sourceLang?: LanguageValue;
    storeId?: string;
    targetLang?: LanguageValue | LanguageValue[];
    targetLanguages?: LanguageValue[];
    tokenPerCredit?: number;
    totalCharge?: number;
    totalCredits?: number;
    totalTokenCount?: number;
    unitsConsumed?: number;
}

type LanguageValue = {
    code?: string;
    name?: string;
} | string | null | undefined;

const PAGE_SIZE = 15;

const formatActionLabel = (action: string) => action.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

const formatLanguage = (language: LanguageValue) => {
    if (!language) return 'Not recorded';
    if (typeof language === 'string') return language;
    if (language.name && language.code) return `${language.name} (${language.code})`;
    return language.name || language.code || 'Not recorded';
};

const getDescriptionRows = (tx: TransactionItem) => {
    const rows: Array<{ description: string; itemId: string; itemName: string; language: string }> = [];
    if (!tx.clientResponse || typeof tx.clientResponse !== 'object') return rows;

    Object.entries(tx.clientResponse).forEach(([itemId, langDescriptions]) => {
        if (!langDescriptions || typeof langDescriptions !== 'object') return;

        Object.entries(langDescriptions as Record<string, unknown>).forEach(([language, description]) => {
            const item = tx.itemsList?.find((entry) => entry.id === itemId);
            rows.push({
                description: typeof description === 'string' ? description : JSON.stringify(description),
                itemId,
                itemName: item?.name || 'Unknown item',
                language,
            });
        });
    });

    return rows;
};

const getTranslationRows = (tx: TransactionItem) => {
    if (!tx.inputStrings || typeof tx.inputStrings !== 'object') return [];
    return Object.entries(tx.inputStrings).map(([key, sourceText]) => ({
        key,
        sourceText,
        translatedText: tx.clientResponse?.translations?.[key] || 'Not recorded',
    }));
};

const getExtractedItems = (tx: TransactionItem) => {
    const items = tx.clientResponse?.data?.items;
    return Array.isArray(items) ? items : [];
};

const getExtractedCategories = (tx: TransactionItem) => {
    const categories = tx.clientResponse?.data?.categories;
    return Array.isArray(categories) ? categories : [];
};

export default function MobileTransactionsScreen({ onBack }: MobileTransactionsScreenProps) {
    const t = useTranslations('Transactions');
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [actionFilter, setActionFilter] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
    const [draftActionFilter, setDraftActionFilter] = useState<string | null>(null);
    const [draftStartDate, setDraftStartDate] = useState('');
    const [draftEndDate, setDraftEndDate] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionItem | null>(null);
    const lastVisibleRef = useRef<any>(null);
    const pageRef = useRef(1);
    const formatter = useFormatter();

    const fetchPage = useCallback(async (reset = false) => {
        try {
            if (reset) {
                lastVisibleRef.current = null;
                pageRef.current = 1;
                setTransactions([]);
                setHasMore(true);
            }

            const response = await getPaginatedAiOperations({
                action: actionFilter,
                dateRange,
                lastVisibleDoc: lastVisibleRef.current,
                pageNumber: pageRef.current,
                pageSize: PAGE_SIZE,
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
    }, [actionFilter, dateRange, t]);

    useEffect(() => {
        setLoading(true);
        void fetchPage(true);
    }, [fetchPage]);

    const actionOptions = useMemo(() => (
        Object.values(AI_ACTIONS_TYPES as Record<string, string>).map((value) => ({
            label: formatActionLabel(value),
            value,
        }))
    ), []);

    const hasActiveFilters = Boolean(actionFilter || dateRange);

    const getActionColor = (action: string) => {
        if (action === AI_ACTIONS_TYPES.IMAGE_PROCESSING) return '#3b82f6';
        if (action === AI_ACTIONS_TYPES.LANGUAGE_ADDITION || action === AI_ACTIONS_TYPES.IMAGE_TRANSLATION) return '#22c55e';
        if (action === AI_ACTIONS_TYPES.ADD_DESCRIPTION || action === AI_ACTIONS_TYPES.REWRITE_DESCRIPTION) return '#a855f7';
        return '#6b7280';
    };

    const formatCreditsUsed = (tx: TransactionItem) => {
        const units = Number(tx.unitsConsumed || 0);
        return units > 0 ? `${units} used` : 'No credits';
    };

    const openFilterSheet = () => {
        setDraftActionFilter(actionFilter);
        setDraftStartDate(dateRange?.[0]?.format('YYYY-MM-DD') || '');
        setDraftEndDate(dateRange?.[1]?.format('YYYY-MM-DD') || '');
        setFilterOpen(true);
    };

    const applyFilters = () => {
        if ((draftStartDate && !draftEndDate) || (!draftStartDate && draftEndDate)) {
            Toast.show({ content: 'Choose both start and end dates.', duration: 1800 });
            return;
        }

        if (draftStartDate && draftEndDate && dayjs(draftEndDate).isBefore(dayjs(draftStartDate), 'day')) {
            Toast.show({ content: 'End date must be after the start date.', duration: 1800 });
            return;
        }

        setActionFilter(draftActionFilter);
        setDateRange(
            draftStartDate && draftEndDate
                ? [dayjs(draftStartDate), dayjs(draftEndDate)]
                : null,
        );
        setFilterOpen(false);
    };

    const resetFilters = () => {
        setDraftActionFilter(null);
        setDraftStartDate('');
        setDraftEndDate('');
        setActionFilter(null);
        setDateRange(null);
        setFilterOpen(false);
    };

    const renderDetailRows = (tx: TransactionItem) => {
        if (tx.action === AI_ACTIONS_TYPES.ADD_DESCRIPTION || tx.action === AI_ACTIONS_TYPES.REWRITE_DESCRIPTION) {
            const rows = getDescriptionRows(tx);

            return (
                <Card>
                    <Flex gap={12} vertical>
                        <Title level={5} style={{ margin: 0 }}>Descriptions</Title>
                        <Flex gap={8} wrap="wrap">
                            <Tag>Source: {formatLanguage(tx.sourceLang)}</Tag>
                            {Array.isArray(tx.targetLang) ? tx.targetLang.map((language) => (
                                <Tag key={formatLanguage(language)}>{formatLanguage(language)}</Tag>
                            )) : null}
                            {tx.contentLength ? <Tag>{tx.contentLength}</Tag> : null}
                        </Flex>
                        {rows.length === 0 ? (
                            <Text type="secondary">No descriptions recorded.</Text>
                        ) : rows.slice(0, 8).map((row) => (
                            <Card key={`${row.itemId}-${row.language}`} style={{ backgroundColor: '#f8fafc' }}>
                                <Flex gap={4} vertical>
                                    <Text strong>{row.itemName}</Text>
                                    <Text type="secondary">{row.language}</Text>
                                    <Text>{row.description}</Text>
                                </Flex>
                            </Card>
                        ))}
                        {rows.length > 8 ? <Text type="secondary">{rows.length - 8} more descriptions are saved in desktop details.</Text> : null}
                    </Flex>
                </Card>
            );
        }

        if (tx.action === AI_ACTIONS_TYPES.LANGUAGE_ADDITION || tx.action === AI_ACTIONS_TYPES.IMAGE_TRANSLATION) {
            const rows = getTranslationRows(tx);
            const targetLanguage = Array.isArray(tx.targetLang) ? tx.targetLang.map(formatLanguage).join(', ') : formatLanguage(tx.targetLang);

            return (
                <Card>
                    <Flex gap={12} vertical>
                        <Title level={5} style={{ margin: 0 }}>Language Details</Title>
                        <Flex gap={8} wrap="wrap">
                            <Tag>Source: {formatLanguage(tx.sourceLang)}</Tag>
                            <Tag>Target: {targetLanguage}</Tag>
                        </Flex>
                        {rows.length === 0 ? (
                            <Text type="secondary">No translation rows recorded.</Text>
                        ) : rows.slice(0, 8).map((row) => (
                            <Card key={row.key} style={{ backgroundColor: '#f8fafc' }}>
                                <Flex gap={4} vertical>
                                    <Text strong>{row.key}</Text>
                                    <Text>{row.sourceText}</Text>
                                    <Text type="secondary">{row.translatedText}</Text>
                                </Flex>
                            </Card>
                        ))}
                        {rows.length > 8 ? <Text type="secondary">{rows.length - 8} more rows are saved in desktop details.</Text> : null}
                    </Flex>
                </Card>
            );
        }

        if (tx.action === AI_ACTIONS_TYPES.IMAGE_PROCESSING) {
            const items = getExtractedItems(tx);
            const categories = getExtractedCategories(tx);

            return (
                <Card>
                    <Flex gap={12} vertical>
                        <Title level={5} style={{ margin: 0 }}>Image Processing</Title>
                        {tx.files?.length ? (
                            <Flex gap={8} vertical>
                                <Text strong>Input files</Text>
                                {tx.files.slice(0, 4).map((file, index) => (
                                    <Text key={`${file.uid || file.name || index}`} type="secondary">{file.name || `File ${index + 1}`}</Text>
                                ))}
                            </Flex>
                        ) : null}
                        {tx.targetLanguages?.length ? (
                            <Flex gap={8} wrap="wrap">
                                {tx.targetLanguages.map((language) => <Tag key={formatLanguage(language)}>{formatLanguage(language)}</Tag>)}
                            </Flex>
                        ) : null}
                        <Text>{items.length.toLocaleString()} items and {categories.length.toLocaleString()} categories were extracted.</Text>
                    </Flex>
                </Card>
            );
        }

        return (
            <Card>
                <Flex gap={6} vertical>
                    <Title level={5} style={{ margin: 0 }}>Operation Details</Title>
                    <Text type="secondary">No extra details are recorded for this action.</Text>
                </Flex>
            </Card>
        );
    };

    const renderTransactionDetails = () => {
        if (!selectedTransaction) return null;
        const tx = selectedTransaction;

        return (
            <Popup bodyStyle={{ maxHeight: '88vh', overflow: 'hidden', padding: 0 }} destroyOnClose onMaskClick={() => setSelectedTransaction(null)} visible={!!selectedTransaction}>
                <NavBar backIcon={<LuX size={18} />} onBack={() => setSelectedTransaction(null)}>
                    Transaction details
                </NavBar>
                <Flex gap={12} style={{ maxHeight: 'calc(88vh - 57px)', overflowY: 'auto', padding: 16 }} vertical>
                    <Card>
                        <Flex gap={12} vertical>
                            <Flex align="center" gap={8} justify="space-between">
                                <Tag color="primary">{formatActionLabel(tx.action)}</Tag>
                                <Text strong style={{ color: Number(tx.unitsConsumed || 0) > 0 ? '#16a34a' : '#64748b' }}>{formatCreditsUsed(tx)}</Text>
                            </Flex>
                            <List>
                                <List.Item title="Created on" extra={<Text>{getFormatedDateAndTime(formatter, tx.createdOn)}</Text>} />
                                <List.Item title="Processing time" extra={<Text>{formatProcessingTime(tx.processingTime)}</Text>} />
                                <List.Item title="Total charge" extra={<Text>{formatCurrency(tx.totalCharge, 'INR')}</Text>} />
                                <List.Item title="Tokens" extra={<Text>{Number(tx.totalTokenCount || 0).toLocaleString()}</Text>} />
                                {tx.promptTokenCount !== undefined ? <List.Item title="Prompt tokens" extra={<Text>{Number(tx.promptTokenCount || 0).toLocaleString()}</Text>} /> : null}
                                {tx.candidatesTokenCount !== undefined ? <List.Item title="Output tokens" extra={<Text>{Number(tx.candidatesTokenCount || 0).toLocaleString()}</Text>} /> : null}
                                {tx.model ? <List.Item title="Model" extra={<Text>{tx.model}</Text>} /> : null}
                                {tx.projectId ? <List.Item title="Project ID" extra={<Text>{tx.projectId}</Text>} /> : null}
                                {tx.fileId ? <List.Item title="File ID" extra={<Text>{tx.fileId}</Text>} /> : null}
                            </List>
                        </Flex>
                    </Card>
                    {renderDetailRows(tx)}
                </Flex>
            </Popup>
        );
    };

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description={t('subtitle')}
                onBack={onBack}
                right={(
                    <Flex align="center" gap={4}>
                        <Button fill="none" onClick={openFilterSheet}>
                            <LuFilter color={hasActiveFilters ? '#0051d1' : '#64748b'} size={18} />
                        </Button>
                        <Button fill="none" loading={loading && transactions.length > 0} onClick={() => { setLoading(true); void fetchPage(true); }}>
                            <LuRefreshCw color="#64748b" size={18} />
                        </Button>
                    </Flex>
                )}
                title={t('title')}
            />

            <Flex gap={12} style={{ padding: 16 }} vertical>
                {hasActiveFilters ? (
                    <Card>
                        <Flex align="center" justify="space-between">
                            <Flex gap={6} wrap="wrap">
                                {actionFilter ? <Tag color="primary">{formatActionLabel(actionFilter)}</Tag> : null}
                                {dateRange ? <Tag>{`${dateRange[0]?.format('DD MMM YYYY')} - ${dateRange[1]?.format('DD MMM YYYY')}`}</Tag> : null}
                            </Flex>
                            <Button fill="none" onClick={resetFilters} size="small">
                                {t('reset')}
                            </Button>
                        </Flex>
                    </Card>
                ) : null}

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
                                        arrow
                                        description={(
                                            <Flex gap={8} wrap="wrap">
                                                <Text type="secondary">{getFormatedDateAndTime(formatter, tx.createdOn)}</Text>
                                                <Text type="secondary">{formatProcessingTime(tx.processingTime)}</Text>
                                                {typeof tx.totalTokenCount === 'number' ? (
                                                    <Text type="secondary">{tx.totalTokenCount.toLocaleString()} tokens</Text>
                                                ) : null}
                                            </Flex>
                                        )}
                                        extra={<Text strong style={{ color: Number(tx.unitsConsumed || 0) > 0 ? '#16a34a' : '#64748b' }}>{formatCreditsUsed(tx)}</Text>}
                                        key={tx.id}
                                        onClick={() => setSelectedTransaction(tx)}
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

            <Popup bodyStyle={{ maxHeight: '88vh', overflow: 'hidden', padding: 0 }} destroyOnClose onMaskClick={() => setFilterOpen(false)} visible={filterOpen}>
                <NavBar backIcon={<LuX size={18} />} onBack={() => setFilterOpen(false)}>
                    Filter transactions
                </NavBar>
                <Flex gap={12} style={{ maxHeight: 'calc(88vh - 57px)', overflowY: 'auto', padding: 16, paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }} vertical>
                    <Card>
                        <Flex gap={12} vertical>
                            <Title level={5} style={{ margin: 0 }}>{t('filterByAction')}</Title>
                            <Flex gap={8} wrap="wrap">
                                <Button color={!draftActionFilter ? 'primary' : undefined} fill={!draftActionFilter ? 'solid' : 'outline'} onClick={() => setDraftActionFilter(null)} size="small">
                                    All actions
                                </Button>
                                {actionOptions.map((option) => (
                                    <Button
                                        color={draftActionFilter === option.value ? 'primary' : undefined}
                                        fill={draftActionFilter === option.value ? 'solid' : 'outline'}
                                        key={option.value}
                                        onClick={() => setDraftActionFilter(option.value)}
                                        size="small"
                                    >
                                        {option.label}
                                    </Button>
                                ))}
                            </Flex>
                        </Flex>
                    </Card>
                    <Card>
                        <Flex gap={12} vertical>
                            <Title level={5} style={{ margin: 0 }}>Date range</Title>
                            <Flex gap={10} vertical>
                                <Flex gap={6} vertical>
                                    <Text strong>Start date</Text>
                                    <Input onChange={setDraftStartDate} type="date" value={draftStartDate} />
                                </Flex>
                                <Flex gap={6} vertical>
                                    <Text strong>End date</Text>
                                    <Input min={draftStartDate || undefined} onChange={setDraftEndDate} type="date" value={draftEndDate} />
                                </Flex>
                            </Flex>
                        </Flex>
                    </Card>
                    <Flex gap={8}>
                        <Button block fill="outline" onClick={resetFilters}>
                            {t('reset')}
                        </Button>
                        <Button block onClick={applyFilters}>
                            Apply
                        </Button>
                    </Flex>
                </Flex>
            </Popup>
            {renderTransactionDetails()}
        </Flex>
    );
}
