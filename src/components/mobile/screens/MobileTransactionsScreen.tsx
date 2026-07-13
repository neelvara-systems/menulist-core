'use client'

import { AI_ACTIONS_TYPES } from '@constant/common';
import { getPaginatedAiOperations } from '@database/aiOperations';
import { formatAiOperationActionLabel, formatAiOperationCredits, getAiOperationOwnerSummary } from '@lib/ai/operationPresentation';
import { formatDateRange, getFormatedDateAndTime, type DateLike } from '@util/dateTime';
import { formatInrPaise, formatProcessingTime } from '@util/formatters';
import { theme } from 'antd';
import dayjs from 'dayjs';
import { useSession } from 'next-auth/react';
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
    marginPaise?: number;
    ourChargePaise?: number;
    processingTime: number;
    promptTokenCount?: number;
    projectId?: string;
    realCostPaise?: number;
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

const formatLanguage = (language: LanguageValue, notRecorded: string) => {
    if (!language) return notRecorded;
    if (typeof language === 'string') return language;
    if (language.name && language.code) return `${language.name} (${language.code})`;
    return language.name || language.code || notRecorded;
};

const getDescriptionRows = (tx: TransactionItem, unknownItem: string) => {
    const rows: Array<{ description: string; itemId: string; itemName: string; language: string }> = [];
    if (!tx.clientResponse || typeof tx.clientResponse !== 'object') return rows;

    Object.entries(tx.clientResponse).forEach(([itemId, langDescriptions]) => {
        if (!langDescriptions || typeof langDescriptions !== 'object') return;

        Object.entries(langDescriptions as Record<string, unknown>).forEach(([language, description]) => {
            const item = tx.itemsList?.find((entry) => entry.id === itemId);
            rows.push({
                description: typeof description === 'string' ? description : JSON.stringify(description),
                itemId,
                itemName: item?.name || unknownItem,
                language,
            });
        });
    });

    return rows;
};

const getTranslationRows = (tx: TransactionItem, notRecorded: string) => {
    if (!tx.inputStrings || typeof tx.inputStrings !== 'object') return [];
    return Object.entries(tx.inputStrings).map(([key, sourceText]) => ({
        key,
        sourceText,
        translatedText: tx.clientResponse?.translations?.[key] || notRecorded,
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
    const { token } = theme.useToken();
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [manualFilterContinuation, setManualFilterContinuation] = useState(false);
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
    const { data: session } = useSession();
    const platformRole = (session as any)?.platformRole || (session?.user as any)?.platformRole;
    const isPlatform = platformRole === 'PLATFORM';

    const fetchPage = useCallback(async (reset = false) => {
        try {
            if (reset) {
                lastVisibleRef.current = null;
                pageRef.current = 1;
                setTransactions([]);
                setHasMore(true);
                setManualFilterContinuation(false);
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
                if (
                    response.requiresManualContinuation
                    && response.hasMore
                    && response.lastVisibleDoc
                ) {
                    pageRef.current += 1;
                    setHasMore(false);
                    setManualFilterContinuation(true);
                    return;
                }
                setHasMore(false);
                setManualFilterContinuation(false);
                return;
            }

            setHasMore(response.hasMore);
            setManualFilterContinuation(false);
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
            label: formatAiOperationActionLabel(value, t),
            value,
        }))
    ), [t]);

    const hasActiveFilters = Boolean(actionFilter || dateRange);
    const loadedCreditsUsed = useMemo(() => (
        transactions.reduce((total, tx) => total + Math.max(0, Number(tx.unitsConsumed || 0)), 0)
    ), [transactions]);
    const loadedNoCreditActions = useMemo(() => (
        transactions.filter((tx) => Number(tx.unitsConsumed || 0) <= 0).length
    ), [transactions]);

    const getActionColor = (action: string) => {
        if (action === AI_ACTIONS_TYPES.IMAGE_PROCESSING) return token.colorPrimary;
        if (action === AI_ACTIONS_TYPES.LANGUAGE_ADDITION || action === AI_ACTIONS_TYPES.IMAGE_TRANSLATION) return token.colorSuccess;
        if (action === AI_ACTIONS_TYPES.ADD_DESCRIPTION || action === AI_ACTIONS_TYPES.REWRITE_DESCRIPTION) return token.colorInfo;
        return token.colorTextSecondary;
    };

    const formatCreditsUsed = (tx: TransactionItem) => {
        return formatAiOperationCredits(Number(tx.unitsConsumed || 0), t);
    };

    const formatOptionalPaise = (value?: number) => (
        value === undefined || value === null ? t('notRecorded') : formatInrPaise(value)
    );

    const openFilterSheet = () => {
        setDraftActionFilter(actionFilter);
        setDraftStartDate(dateRange?.[0]?.format('YYYY-MM-DD') || '');
        setDraftEndDate(dateRange?.[1]?.format('YYYY-MM-DD') || '');
        setFilterOpen(true);
    };

    const applyFilters = () => {
        if ((draftStartDate && !draftEndDate) || (!draftStartDate && draftEndDate)) {
            Toast.show({ content: t('chooseBothDates'), duration: 1800 });
            return;
        }

        if (draftStartDate && draftEndDate && dayjs(draftEndDate).isBefore(dayjs(draftStartDate), 'day')) {
            Toast.show({ content: t('endDateAfterStart'), duration: 1800 });
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
            const rows = getDescriptionRows(tx, t('unknownItem'));

            return (
                <Card>
                    <Flex gap={12} vertical>
                        <Title level={5} style={{ margin: 0 }}>{t('descriptions')}</Title>
                        <Flex gap={8} wrap="wrap">
                            <Tag>{t('sourceWithValue', { value: formatLanguage(tx.sourceLang, t('notRecorded')) })}</Tag>
                            {Array.isArray(tx.targetLang) ? tx.targetLang.map((language) => (
                                <Tag key={formatLanguage(language, t('notRecorded'))}>{formatLanguage(language, t('notRecorded'))}</Tag>
                            )) : null}
                            {tx.contentLength ? <Tag>{tx.contentLength}</Tag> : null}
                        </Flex>
                        {rows.length === 0 ? (
                            <Text type="secondary">{t('noDescriptionsRecorded')}</Text>
                        ) : rows.slice(0, 8).map((row) => (
                            <Card key={`${row.itemId}-${row.language}`} style={{ backgroundColor: token.colorFillQuaternary }}>
                                <Flex gap={4} vertical>
                                    <Text strong>{row.itemName}</Text>
                                    <Text type="secondary">{row.language}</Text>
                                    <Text>{row.description}</Text>
                                </Flex>
                            </Card>
                        ))}
                        {rows.length > 8 ? <Text type="secondary">{t('moreDescriptionsSaved', { count: rows.length - 8 })}</Text> : null}
                    </Flex>
                </Card>
            );
        }

        if (tx.action === AI_ACTIONS_TYPES.LANGUAGE_ADDITION || tx.action === AI_ACTIONS_TYPES.IMAGE_TRANSLATION) {
            const rows = getTranslationRows(tx, t('notRecorded'));
            const targetLanguage = Array.isArray(tx.targetLang)
                ? tx.targetLang.map((language) => formatLanguage(language, t('notRecorded'))).join(', ')
                : formatLanguage(tx.targetLang, t('notRecorded'));

            return (
                <Card>
                    <Flex gap={12} vertical>
                        <Title level={5} style={{ margin: 0 }}>{t('languageDetails')}</Title>
                        <Flex gap={8} wrap="wrap">
                            <Tag>{t('sourceWithValue', { value: formatLanguage(tx.sourceLang, t('notRecorded')) })}</Tag>
                            <Tag>{t('targetWithValue', { value: targetLanguage })}</Tag>
                        </Flex>
                        {rows.length === 0 ? (
                            <Text type="secondary">{t('noTranslationRowsRecorded')}</Text>
                        ) : rows.slice(0, 8).map((row) => (
                            <Card key={row.key} style={{ backgroundColor: token.colorFillQuaternary }}>
                                <Flex gap={4} vertical>
                                    <Text strong>{row.key}</Text>
                                    <Text>{row.sourceText}</Text>
                                    <Text type="secondary">{row.translatedText}</Text>
                                </Flex>
                            </Card>
                        ))}
                        {rows.length > 8 ? <Text type="secondary">{t('moreRowsSaved', { count: rows.length - 8 })}</Text> : null}
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
                        <Title level={5} style={{ margin: 0 }}>{t('imageProcessing')}</Title>
                        {tx.files?.length ? (
                            <Flex gap={8} vertical>
                                <Text strong>{t('inputFiles')}</Text>
                                {tx.files.slice(0, 4).map((file, index) => (
                                    <Text key={`${file.uid || file.name || index}`} type="secondary">{file.name || t('fileNumber', { number: index + 1 })}</Text>
                                ))}
                            </Flex>
                        ) : null}
                        {tx.targetLanguages?.length ? (
                            <Flex gap={8} wrap="wrap">
                                {tx.targetLanguages.map((language) => <Tag key={formatLanguage(language, t('notRecorded'))}>{formatLanguage(language, t('notRecorded'))}</Tag>)}
                            </Flex>
                        ) : null}
                        <Text>{t('itemsCategoriesExtracted', { items: items.length.toLocaleString(), categories: categories.length.toLocaleString() })}</Text>
                    </Flex>
                </Card>
            );
        }

        return (
            <Card>
                <Flex gap={6} vertical>
                    <Title level={5} style={{ margin: 0 }}>{t('operationDetails')}</Title>
                    <Text type="secondary">{t('noExtraDetails')}</Text>
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
                    {t('transactionDetails')}
                </NavBar>
                <Flex gap={12} style={{ maxHeight: 'calc(88vh - 57px)', overflowY: 'auto', padding: 16 }} vertical>
                    <Card>
                        <Flex gap={12} vertical>
                            <Flex align="center" gap={8} justify="space-between">
                                <Tag color="primary">{formatAiOperationActionLabel(tx.action, t)}</Tag>
                                <Text strong style={{ color: Number(tx.unitsConsumed || 0) > 0 ? token.colorSuccess : token.colorTextSecondary }}>{formatCreditsUsed(tx)}</Text>
                            </Flex>
                            <Text>{getAiOperationOwnerSummary(tx, t)}</Text>
                            <List>
                                <List.Item title={t('createdOn')} extra={<Text>{getFormatedDateAndTime(formatter, tx.createdOn)}</Text>} />
                                <List.Item title={t('processingTime')} extra={<Text>{formatProcessingTime(tx.processingTime)}</Text>} />
                            </List>
                        </Flex>
                    </Card>
                    {renderDetailRows(tx)}
                    {isPlatform ? (
                        <Card>
                            <Flex gap={10} vertical>
                                <Title level={5} style={{ margin: 0 }}>{t('platformDebug')}</Title>
                                <List>
                                    <List.Item title={t('ownerChargeRecorded')} extra={<Text>{formatOptionalPaise(tx.totalCharge)}</Text>} />
                                    <List.Item title={t('actualProviderCost')} extra={<Text>{formatOptionalPaise(tx.realCostPaise)}</Text>} />
                                    <List.Item title={t('configuredOwnerCharge')} extra={<Text>{formatOptionalPaise(tx.ourChargePaise)}</Text>} />
                                    <List.Item title={t('configuredMargin')} extra={<Text>{formatOptionalPaise(tx.marginPaise)}</Text>} />
                                    <List.Item title={t('tokenCredits')} extra={<Text>{Number(tx.totalCredits || 0).toLocaleString()}</Text>} />
                                    <List.Item title={t('tokens')} extra={<Text>{Number(tx.totalTokenCount || 0).toLocaleString()}</Text>} />
                                    <List.Item title={t('promptTokens')} extra={<Text>{Number(tx.promptTokenCount || 0).toLocaleString()}</Text>} />
                                    <List.Item title={t('outputTokens')} extra={<Text>{Number(tx.candidatesTokenCount || 0).toLocaleString()}</Text>} />
                                    {tx.model ? <List.Item title={t('model')} extra={<Text>{tx.model}</Text>} /> : null}
                                    {tx.projectId ? <List.Item title={t('projectId')} extra={<Text>{tx.projectId}</Text>} /> : null}
                                    {tx.fileId ? <List.Item title={t('fileId')} extra={<Text>{tx.fileId}</Text>} /> : null}
                                </List>
                            </Flex>
                        </Card>
                    ) : null}
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
                        <Button fill="none" onClick={openFilterSheet} style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}>
                            <LuFilter color={hasActiveFilters ? token.colorPrimary : token.colorTextSecondary} size={18} />
                        </Button>
                        <Button fill="none" loading={loading && transactions.length > 0} onClick={() => { setLoading(true); void fetchPage(true); }} style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}>
                            <LuRefreshCw color={token.colorTextSecondary} size={18} />
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
                                {actionFilter ? <Tag color="primary">{formatAiOperationActionLabel(actionFilter, t)}</Tag> : null}
                                {dateRange ? <Tag>{formatDateRange(dateRange[0]?.toDate(), dateRange[1]?.toDate(), formatter)}</Tag> : null}
                            </Flex>
                            <Button fill="none" onClick={resetFilters} size="small" style={{ minHeight: 44 }}>
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
                            <LuReceipt color={token.colorTextTertiary} size={36} />
                            <Title level={5} style={{ margin: 0 }}>{t('noEnhancementActivityYet')}</Title>
                            {manualFilterContinuation ? (
                                <Button
                                    color="primary"
                                    fill="solid"
                                    loading={loading}
                                    onClick={() => {
                                        setLoading(true);
                                        setManualFilterContinuation(false);
                                        void fetchPage(false);
                                    }}
                                    style={{ minHeight: 44 }}
                                >
                                    {t('next')}
                                </Button>
                            ) : null}
                        </Flex>
                    </Card>
                ) : (
                    <>
                        <Card>
                            <Flex gap={8} vertical>
                                <Flex justify="space-between">
                                    <Text type="secondary">{t('loaded')}</Text>
                                    <Text strong>{transactions.length.toLocaleString()}</Text>
                                </Flex>
                                <Flex justify="space-between">
                                    <Text type="secondary">{t('creditsUsed')}</Text>
                                    <Text strong>{loadedCreditsUsed.toLocaleString()}</Text>
                                </Flex>
                                <Flex justify="space-between">
                                    <Text type="secondary">{t('noCreditActions')}</Text>
                                    <Text strong>{loadedNoCreditActions.toLocaleString()}</Text>
                                </Flex>
                            </Flex>
                        </Card>
                        <Card>
                            <List>
                                {transactions.map((tx) => (
                                    <List.Item
                                        arrow
                                        description={(
                                            <Flex gap={4} vertical>
                                                <Text type="secondary">{getAiOperationOwnerSummary(tx, t)}</Text>
                                                <Flex gap={8} wrap="wrap">
                                                    <Text type="secondary">{getFormatedDateAndTime(formatter, tx.createdOn)}</Text>
                                                    <Text type="secondary">{formatProcessingTime(tx.processingTime)}</Text>
                                                </Flex>
                                            </Flex>
                                        )}
                                        extra={<Text strong style={{ color: Number(tx.unitsConsumed || 0) > 0 ? token.colorSuccess : token.colorTextSecondary }}>{formatCreditsUsed(tx)}</Text>}
                                        key={tx.id}
                                        onClick={() => setSelectedTransaction(tx)}
                                        title={(
                                            <Flex align="center" gap={8}>
                                                <span style={{ backgroundColor: getActionColor(tx.action), borderRadius: '50%', display: 'inline-block', height: 8, minWidth: 8, width: 8 }} />
                                                <Text strong>{formatAiOperationActionLabel(tx.action, t)}</Text>
                                            </Flex>
                                        )}
                                    />
                                ))}
                            </List>
                        </Card>
                        {manualFilterContinuation ? (
                            <Button
                                block
                                color="primary"
                                fill="outline"
                                loading={loading}
                                onClick={() => {
                                    setLoading(true);
                                    setManualFilterContinuation(false);
                                    void fetchPage(false);
                                }}
                                style={{ minHeight: 44 }}
                            >
                                {t('next')}
                            </Button>
                        ) : null}
                        <InfiniteScroll hasMore={hasMore} loadMore={async () => { await fetchPage(false); }} />
                    </>
                )}
            </Flex>

            <Popup bodyStyle={{ maxHeight: '88vh', overflow: 'hidden', padding: 0 }} destroyOnClose onMaskClick={() => setFilterOpen(false)} visible={filterOpen}>
                <NavBar backIcon={<LuX size={18} />} onBack={() => setFilterOpen(false)}>
                    {t('filterTransactions')}
                </NavBar>
                <Flex gap={12} style={{ maxHeight: 'calc(88vh - 57px)', overflowY: 'auto', padding: 16, paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }} vertical>
                    <Card>
                        <Flex gap={12} vertical>
                            <Title level={5} style={{ margin: 0 }}>{t('filterByAction')}</Title>
                            <Flex gap={8} wrap="wrap">
                                <Button color={!draftActionFilter ? 'primary' : undefined} fill={!draftActionFilter ? 'solid' : 'outline'} onClick={() => setDraftActionFilter(null)} size="small">
                                    {t('allActions')}
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
                            <Title level={5} style={{ margin: 0 }}>{t('dateRange')}</Title>
                            <Flex gap={10} vertical>
                                <Flex gap={6} vertical>
                                    <Text strong>{t('startDate')}</Text>
                                    <Input onChange={setDraftStartDate} type="date" value={draftStartDate} />
                                </Flex>
                                <Flex gap={6} vertical>
                                    <Text strong>{t('endDate')}</Text>
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
                            {t('apply')}
                        </Button>
                    </Flex>
                </Flex>
            </Popup>
            {renderTransactionDetails()}
        </Flex>
    );
}
