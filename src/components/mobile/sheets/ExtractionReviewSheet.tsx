'use client'

import { applyExtractionChanges, discardExtractionChanges } from '@lib/extraction/applyChanges';
import { updateApplyPlan } from '@lib/extraction/comparisonEngine';
import type {
    ComparisonEngineOutput,
    PreviewCategoryRow,
    PreviewItemRow,
} from '@lib/extraction/comparisonEngine.types';
import {
    countApprovedChanges,
    hasAnyPreviewChanges,
    setAllPreviewApprovals,
    setSafePreviewApprovals,
} from '@lib/extraction/reviewPreview';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { LuAlertTriangle, LuCheck, LuChevronDown, LuChevronRight, LuDollarSign, LuPlus, LuRefreshCw, LuX } from 'react-icons/lu';
import { Button, Card, Checkbox, Collapse, Dialog, Empty, Flex, Popup, Tag, Text, Title, Toast } from '../antd';

interface ExtractionReviewSheetProps {
    comparisonResult: ComparisonEngineOutput;
    jobId: string;
    onDiscard: () => void;
    onSaveComplete: () => void;
    primaryLang: string;
    projectId: string;
    visible: boolean;
}

type ItemGroup = 'new' | 'updated' | 'override';

function ChangeTypeTag({ type }: { type: 'NEW' | 'UPDATE' | 'OVERRIDE' }) {
    const color = type === 'NEW' ? 'success' : type === 'UPDATE' ? 'processing' : 'warning';
    return <Tag color={color}>{type}</Tag>;
}

function MatchTag({ score, matchType }: { score?: number; matchType?: string }) {
    if (!score || score >= 1) return null;
    return (
        <Tag color={matchType === 'weak' ? 'warning' : 'success'}>
            {`${Math.round(score * 100)}%`}
        </Tag>
    );
}

function CategoryRow({
    category,
    onToggle,
    primaryLang,
}: {
    category: PreviewCategoryRow;
    onToggle: (approved: boolean) => void;
    primaryLang: string;
}) {
    const t = useTranslations('MobileMenu');
    const name = category.extractedCategory.name[primaryLang]
        || Object.values(category.extractedCategory.name)[0]
        || t('unnamedItem');

    return (
        <Card size="small">
            <Flex align="center" gap={10}>
                <Checkbox checked={category.approved} onChange={onToggle} />
                <Flex gap={8} style={{ flex: 1, minWidth: 0 }} vertical>
                    <Flex align="center" gap={6} wrap="wrap">
                        <ChangeTypeTag type={category.changeType} />
                        <Text strong>{name}</Text>
                        <MatchTag matchType={category.matchType} score={category.matchScore} />
                    </Flex>
                    {category.warnings?.length ? (
                        <Tag color="warning">{category.warnings[0]}</Tag>
                    ) : null}
                </Flex>
            </Flex>
        </Card>
    );
}

function ItemRow({
    item,
    onToggle,
    primaryLang,
}: {
    item: PreviewItemRow;
    onToggle: (approved: boolean) => void;
    primaryLang: string;
}) {
    const t = useTranslations('MobileMenu');
    const name = item.extractedItem.name[primaryLang]
        || Object.values(item.extractedItem.name)[0]
        || t('unnamedItem');

    return (
        <Card size="small">
            <Flex align="center" gap={10}>
                <Checkbox checked={item.approved} onChange={onToggle} />
                <Flex gap={8} style={{ flex: 1, minWidth: 0 }} vertical>
                    <Flex align="center" gap={6} wrap="wrap">
                        <ChangeTypeTag type={item.changeType} />
                        <Text strong>{name}</Text>
                        <MatchTag matchType={item.matchType} score={item.matchScore} />
                        {item.isLocalOnly ? <Tag>{t('localOnly')}</Tag> : null}
                    </Flex>
                    <Text type="secondary">{t('inCategory', { category: item.extractedItem.categoryName || t('uncategorized') })}</Text>
                    {item.changes?.price ? (
                        <Text type="secondary">
                            {t('priceChange', {
                                from: item.changes.price.from || '0',
                                to: item.changes.price.to || '0',
                            })}
                        </Text>
                    ) : null}
                    {item.warnings?.length ? (
                        <Tag color="warning">{item.warnings[0]}</Tag>
                    ) : null}
                </Flex>
            </Flex>
        </Card>
    );
}

export default function ExtractionReviewSheet({
    comparisonResult,
    jobId,
    onDiscard,
    onSaveComplete,
    primaryLang,
    projectId,
    visible,
}: ExtractionReviewSheetProps) {
    const t = useTranslations('MobileMenu');
    const [preview, setPreview] = useState(comparisonResult.preview);
    const [isSaving, setIsSaving] = useState(false);
    const [isDiscarding, setIsDiscarding] = useState(false);

    const totalChanges = useMemo(() => countApprovedChanges(preview), [preview]);

    const hasAnyChanges = useMemo(() => hasAnyPreviewChanges(preview), [preview]);

    const setAllApproved = useCallback((approved: boolean) => {
        setPreview((current) => setAllPreviewApprovals(current, approved));
    }, []);

    const approveSafeOnly = useCallback(() => {
        setPreview((current) => setSafePreviewApprovals(current));
    }, []);

    const toggleCategory = useCallback((index: number, group: 'new' | 'updated', approved: boolean) => {
        setPreview((current) => {
            const key = group === 'new' ? 'newCategories' : 'updatedCategories';
            const next = [...current[key]];
            next[index] = { ...next[index], approved };
            return { ...current, [key]: next };
        });
    }, []);

    const toggleItem = useCallback((index: number, group: ItemGroup, approved: boolean) => {
        setPreview((current) => {
            const key = group === 'new'
                ? 'newItems'
                : group === 'updated'
                    ? 'updatedItems'
                    : 'overrideSuggestions';
            const next = [...current[key]];
            next[index] = { ...next[index], approved };
            return { ...current, [key]: next };
        });
    }, []);

    const handleSave = useCallback(async () => {
        if (!totalChanges) {
            Toast.show({ content: t('noChangesSelected'), duration: 1600 });
            return;
        }

        setIsSaving(true);
        try {
            const updatedOutput: ComparisonEngineOutput = {
                ...comparisonResult,
                preview,
            };
            const applyPlan = updateApplyPlan(updatedOutput);
            const result = await applyExtractionChanges({
                projectId,
                applyPlan,
                jobId,
                primaryLang,
            });

            if (!result.success) {
                throw new Error(result.error || t('applyChangesFailed'));
            }

            Toast.show({
                content: t('changesAppliedCount', { count: totalChanges }),
                duration: 1800,
                icon: 'success',
            });
            onSaveComplete();
        } catch (error: any) {
            console.error('[MobileExtractionReview] Failed to apply changes:', error);
            Toast.show({
                content: error?.message || t('applyChangesFailed'),
                duration: 2200,
            });
        } finally {
            setIsSaving(false);
        }
    }, [comparisonResult, jobId, onSaveComplete, preview, primaryLang, projectId, t, totalChanges]);

    const handleDiscard = useCallback(async () => {
        const confirmed = await Dialog.confirm({
            cancelText: t('cancel'),
            confirmText: t('discardAll'),
            content: t('discardChangesConfirmDesc'),
            title: t('discardChangesConfirmTitle'),
        });

        if (!confirmed) return;

        setIsDiscarding(true);
        try {
            await discardExtractionChanges(jobId);
            Toast.show({ content: t('changesDiscarded'), duration: 1600 });
            onDiscard();
        } catch (error) {
            console.error('[MobileExtractionReview] Failed to discard changes:', error);
            Toast.show({ content: t('discardChangesFailed'), duration: 2200 });
        } finally {
            setIsDiscarding(false);
        }
    }, [jobId, onDiscard, t]);

    if (!visible) return null;

    return (
        <Popup
            bodyStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '88vh', overflow: 'hidden', padding: 0 }}
            visible={visible}
        >
            <Flex style={{ maxHeight: '88vh' }} vertical>
                <Flex gap={4} style={{ borderBottom: `1px solid var(--adm-color-border)`, flexShrink: 0, padding: 16 }} vertical>
                    <Title level={4} style={{ margin: 0 }}>
                        {t('reviewExtractedChanges')}
                    </Title>
                    <Text type="secondary">
                        {t('reviewChangesSelected', {
                            selected: totalChanges,
                            unchanged: preview.unchangedCount,
                        })}
                    </Text>
                </Flex>

                <Flex gap={16} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }} vertical>
                    {!hasAnyChanges ? (
                        <Card>
                            <Empty description={t('noChangesDetected')}>
                                <Button onClick={onDiscard}>{t('close')}</Button>
                            </Empty>
                        </Card>
                    ) : (
                        <>
                        <Flex gap={8}>
                            <Button block fill="outline" onClick={approveSafeOnly}>
                                {t('approveSafeOnly')}
                            </Button>
                        </Flex>

                        <Flex gap={8}>
                            <Button block fill="outline" onClick={() => setAllApproved(true)}>
                                {t('selectAll')}
                            </Button>
                            <Button block fill="outline" onClick={() => setAllApproved(false)}>
                                {t('deselectAll')}
                            </Button>
                        </Flex>

                        {preview.warnings.length > 0 ? (
                            <Card size="small">
                                <Flex align="center" gap={8} style={{ marginBottom: 8 }}>
                                    <LuAlertTriangle size={16} />
                                    <Text strong>{t('warningsCount', { count: preview.warnings.length })}</Text>
                                </Flex>
                                <Flex gap={8} vertical>
                                    {preview.warnings.map((warning, index) => (
                                        <Text key={`${warning.name}-${index}`} type="secondary">
                                            {warning.name}: {warning.reason}
                                        </Text>
                                    ))}
                                </Flex>
                            </Card>
                        ) : null}

                        <Collapse defaultActiveKey={['newCategories', 'updatedCategories', 'newItems', 'updatedItems', 'overrideSuggestions']}>
                            <Collapse.Panel
                                key="newCategories"
                                title={<SectionTitle count={preview.newCategories.length} icon={<LuPlus size={16} />} title={t('newCategories')} />}
                            >
                                <Flex gap={8} vertical>
                                    {preview.newCategories.map((category, index) => (
                                        <CategoryRow
                                            category={category}
                                            key={category.generatedId || category.extractedCategory.id}
                                            onToggle={(approved) => toggleCategory(index, 'new', approved)}
                                            primaryLang={primaryLang}
                                        />
                                    ))}
                                </Flex>
                            </Collapse.Panel>
                            <Collapse.Panel
                                key="updatedCategories"
                                title={<SectionTitle count={preview.updatedCategories.length} icon={<LuRefreshCw size={16} />} title={t('updatedCategories')} />}
                            >
                                <Flex gap={8} vertical>
                                    {preview.updatedCategories.map((category, index) => (
                                        <CategoryRow
                                            category={category}
                                            key={category.existingCategoryId || category.generatedId || category.extractedCategory.id}
                                            onToggle={(approved) => toggleCategory(index, 'updated', approved)}
                                            primaryLang={primaryLang}
                                        />
                                    ))}
                                </Flex>
                            </Collapse.Panel>
                            <Collapse.Panel
                                key="newItems"
                                title={<SectionTitle count={preview.newItems.length} icon={<LuPlus size={16} />} title={t('newItems')} />}
                            >
                                <Flex gap={8} vertical>
                                    {preview.newItems.map((item, index) => (
                                        <ItemRow
                                            item={item}
                                            key={item.generatedId || item.extractedItem.id}
                                            onToggle={(approved) => toggleItem(index, 'new', approved)}
                                            primaryLang={primaryLang}
                                        />
                                    ))}
                                </Flex>
                            </Collapse.Panel>
                            <Collapse.Panel
                                key="updatedItems"
                                title={<SectionTitle count={preview.updatedItems.length} icon={<LuRefreshCw size={16} />} title={t('updatedItems')} />}
                            >
                                <Flex gap={8} vertical>
                                    {preview.updatedItems.map((item, index) => (
                                        <ItemRow
                                            item={item}
                                            key={item.existingItemId || item.generatedId || item.extractedItem.id}
                                            onToggle={(approved) => toggleItem(index, 'updated', approved)}
                                            primaryLang={primaryLang}
                                        />
                                    ))}
                                </Flex>
                            </Collapse.Panel>
                            <Collapse.Panel
                                key="overrideSuggestions"
                                title={<SectionTitle count={preview.overrideSuggestions.length} icon={<LuDollarSign size={16} />} title={t('priceOverrides')} />}
                            >
                                <Flex gap={8} vertical>
                                    {preview.overrideSuggestions.map((item, index) => (
                                        <ItemRow
                                            item={item}
                                            key={item.masterItemId || item.generatedId || item.extractedItem.id}
                                            onToggle={(approved) => toggleItem(index, 'override', approved)}
                                            primaryLang={primaryLang}
                                        />
                                    ))}
                                </Flex>
                            </Collapse.Panel>
                        </Collapse>

                        {preview.ignored.length > 0 ? (
                            <Card size="small">
                                <Flex align="center" gap={8} style={{ marginBottom: 8 }}>
                                    <LuX size={16} />
                                    <Text strong>{t('ignoredCount', { count: preview.ignored.length })}</Text>
                                </Flex>
                                <Flex gap={6} vertical>
                                    {preview.ignored.map((item, index) => (
                                        <Text key={`${item.name}-${index}`} type="secondary">
                                            {item.name}: {item.reason}
                                        </Text>
                                    ))}
                                </Flex>
                            </Card>
                        ) : null}

                        </>
                    )}
                </Flex>

                {hasAnyChanges ? (
                    <div
                        style={{
                            backdropFilter: 'blur(10px)',
                            backgroundColor: 'var(--adm-color-background)',
                            borderTop: `1px solid var(--adm-color-border)`,
                            flexShrink: 0,
                            padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
                            zIndex: 5,
                        }}
                    >
                        <Flex gap={8}>
                            <Button block disabled={isSaving} fill="outline" loading={isDiscarding} onClick={handleDiscard} size="large">
                                {t('discardAll')}
                            </Button>
                            <Button
                                block
                                color="primary"
                                disabled={isDiscarding || totalChanges === 0}
                                loading={isSaving}
                                onClick={handleSave}
                                size="large"
                            >
                                <Flex align="center" gap={6} justify="center">
                                    <LuCheck size={16} />
                                    <Text>{t('applyChanges', { count: totalChanges })}</Text>
                                </Flex>
                            </Button>
                        </Flex>
                    </div>
                ) : null}
            </Flex>
        </Popup>
    );
}

function SectionTitle({
    count,
    icon,
    title,
}: {
    count: number;
    icon: ReactNode;
    title: string;
}) {
    return (
        <Flex align="center" gap={8}>
            {icon}
            <Text strong>{title}</Text>
            <Tag>{count}</Tag>
        </Flex>
    );
}
