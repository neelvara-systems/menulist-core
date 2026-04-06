'use client'

import { updateProject } from '@database/projects';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import type { PricingConfig, PricingMethod } from '../../templates/main-app/projects/types/commandCenter.types';
import {
    applyBulkActiveInactive,
    applyBulkAvailability,
    applyBulkMoveCategory,
    applyBulkPricing,
    computeActiveInactivePreview,
    computeAvailabilityPreview,
    computeMoveCategoryPreview,
    computePricingPreview,
    getAllCategories,
} from '../../templates/main-app/projects/editorView/CommandCenterModal/utils/bulkOperations';
import { removeObjRef } from '@util/utils';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useMemo, useState } from 'react';
import { InputNumber, Segmented } from 'antd';
import { LuCheck, LuDollarSign, LuEye, LuEyeOff, LuFolderInput, LuToggleRight } from 'react-icons/lu';
import { Button, Card, Checkbox, Collapse, Dialog, Empty, Flex, NavBar, Picker, Popup, SearchBar, Tag, Text, Toast } from '../antd';
import type { Project } from '../../templates/main-app/projects/types';

interface BulkActionsSheetProps {
    visible: boolean;
    onClose: () => void;
    onApply: (updatedProject: Project) => void;
    projectData: Project | null;
    initialAction?: BulkAction;
}

type BulkAction = 'availability' | 'showHide' | 'pricing' | 'moveCategory' | null;
type ItemEntry = {
    id: string;
    name: string;
    price: string;
    category: string;
    categoryName: string;
    available: boolean;
    active: boolean;
    fileUid: string;
    attributes?: { id: string; name: string; price: string }[];
};

export default function BulkActionsSheet({ visible, onApply, onClose, projectData, initialAction = null }: BulkActionsSheetProps) {
    const t = useTranslations('MobileMenu');
    useContext(PlatformGlobalDataContext);
    const [workingProject, setWorkingProject] = useState<Project | null>(projectData);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [action, setAction] = useState<BulkAction>(null);
    const [search, setSearch] = useState('');
    const [applying, setApplying] = useState(false);
    const [pricingMethod, setPricingMethod] = useState<PricingMethod>('increasePercent');
    const [pricingValue, setPricingValue] = useState<number | null>(null);
    const [destinationCategoryId, setDestinationCategoryId] = useState<string | null>(null);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setWorkingProject(projectData ? removeObjRef(projectData) : null);
        setSelectedIds(new Set());
        setAction(initialAction);
        setSearch('');
        setPricingMethod('increasePercent');
        setPricingValue(null);
        setDestinationCategoryId(null);
        setShowCategoryPicker(false);
    }, [initialAction, projectData, visible]);

    const items: ItemEntry[] = useMemo(() => {
        if (!workingProject) return [];
        const result: ItemEntry[] = [];
        const activeLang = workingProject.languages?.[0] || 'en';

        workingProject.files?.forEach((file: any) => {
            if (!file.extractedData?.data) return;
            const catMap: Record<string, string> = {};
            (file.extractedData.data.categories || []).forEach((category: any) => {
                catMap[category.id] = category.name?.[activeLang] || category.name?.en || 'Untitled';
            });

            (file.extractedData.data.items || []).forEach((item: any) => {
                result.push({
                    id: item.id,
                    name: item.name?.[activeLang] || item.name?.en || 'Untitled',
                    price: item.price || '',
                    category: item.category,
                    categoryName: catMap[item.category] || 'Uncategorized',
                    available: item.available !== false,
                    active: item.active ?? true,
                    fileUid: file.uid,
                    attributes: item.attributes?.map((attr: any) => ({
                        id: attr.id,
                        name: attr.name?.[activeLang] || attr.name?.en || 'Variant',
                        price: attr.price || '',
                    })),
                });
            });
        });

        return result;
    }, [workingProject]);

    const filteredItems = useMemo(() => {
        if (!search.trim()) return items;
        const term = search.toLowerCase();
        return items.filter((item) => item.name.toLowerCase().includes(term) || item.categoryName.toLowerCase().includes(term));
    }, [items, search]);

    const categories = useMemo(() => {
        const map = new Map<string, ItemEntry[]>();
        filteredItems.forEach((item) => {
            if (!map.has(item.categoryName)) map.set(item.categoryName, []);
            map.get(item.categoryName)?.push(item);
        });
        return map;
    }, [filteredItems]);

    const activeLang = useMemo(() => workingProject?.languages?.[0] || 'en', [workingProject?.languages]);

    const destinationCategories = useMemo(() => {
        if (!workingProject) return [];
        return getAllCategories(workingProject, activeLang).map((category) => ({
            label: category.name,
            value: category.id,
        }));
    }, [activeLang, workingProject]);

    const selectedItems = useMemo(
        () => items.filter((item) => selectedIds.has(item.id)).map((item) => ({ ...item, isLocked: false })),
        [items, selectedIds]
    );

    const pricingConfig = useMemo<PricingConfig | null>(() => {
        if (action !== 'pricing' || pricingValue === null || Number.isNaN(pricingValue) || pricingValue <= 0) return null;
        return {
            method: pricingMethod,
            value: pricingValue,
        };
    }, [action, pricingMethod, pricingValue]);

    const preview = useMemo(() => {
        if (selectedItems.length === 0 || !action) return null;
        if (action === 'availability') return computeAvailabilityPreview(selectedItems, 'available');
        if (action === 'showHide') return computeActiveInactivePreview(selectedItems, 'show');
        if (action === 'pricing' && pricingConfig) return computePricingPreview(selectedItems, pricingConfig);
        if (action === 'moveCategory' && destinationCategoryId) {
            const destinationName = destinationCategories.find((category) => category.value === destinationCategoryId)?.label || t('selectedCategory');
            return computeMoveCategoryPreview(selectedItems, destinationCategoryId, destinationName);
        }
        return null;
    }, [action, destinationCategories, destinationCategoryId, pricingConfig, selectedItems, t]);

    const toggleItem = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleAll = () => {
        if (selectedIds.size === filteredItems.length) {
            setSelectedIds(new Set());
            return;
        }
        setSelectedIds(new Set(filteredItems.map((item) => item.id)));
    };

    const toggleCategory = (categoryName: string, checked: boolean) => {
        const next = new Set(selectedIds);
        const categoryItems = categories.get(categoryName) || [];
        categoryItems.forEach((item) => {
            if (checked) next.add(item.id);
            else next.delete(item.id);
        });
        setSelectedIds(next);
    };

    const handleApply = async (target?: string) => {
        if (selectedIds.size === 0) return;

        let actionLabel = t('updateItems');
        if (action === 'availability') {
            actionLabel = target === 'available' ? t('markAvailable') : t('markSoldOut');
        } else if (action === 'showHide') {
            actionLabel = target === 'show' ? t('showOnMenu') : t('hideFromMenu');
        } else if (action === 'pricing') {
            actionLabel = t('updatePrices');
        } else if (action === 'moveCategory') {
            actionLabel = t('moveItems');
        }

        Dialog.confirm({
            content: t('bulkActionConfirm', { action: actionLabel, count: selectedIds.size }),
            onConfirm: async () => {
                if (!workingProject) return;
                setApplying(true);
                try {
                    let updated = removeObjRef(workingProject);
                    if (action === 'availability' && (target === 'available' || target === 'unavailable')) {
                        updated = applyBulkAvailability(updated, selectedIds, target);
                    } else if (action === 'showHide' && (target === 'show' || target === 'hide')) {
                        updated = applyBulkActiveInactive(updated, selectedIds, target);
                    } else if (action === 'pricing' && pricingConfig) {
                        updated = applyBulkPricing(updated, selectedIds, pricingConfig);
                    } else if (action === 'moveCategory' && destinationCategoryId) {
                        updated = applyBulkMoveCategory(updated, selectedIds, destinationCategoryId);
                    } else {
                        setApplying(false);
                        return;
                    }

                    await updateProject(updated);
                    setWorkingProject(updated);
                    onApply(updated);
                    setSelectedIds(new Set());
                    setAction(null);
                    onClose();
                    Toast.show({ content: t('itemsUpdated', { count: selectedIds.size }), duration: 1500 });
                } catch {
                    Toast.show({ content: t('bulkApplyFailed'), duration: 2000 });
                } finally {
                    setApplying(false);
                }
            },
        });
    };

    if (!visible) return null;

    if (!action) return null;

    const actionTitle = action === 'availability'
        ? t('availability')
        : action === 'showHide'
            ? t('showAndHide')
            : action === 'pricing'
                ? t('updatePrices')
                : t('moveToCategory');

    const pricingMethodOptions = [
        { label: '+ %', value: 'increasePercent' },
        { label: '- %', value: 'decreasePercent' },
        { label: '+ Flat', value: 'addFlat' },
        { label: '- Flat', value: 'reduceFlat' },
        { label: t('setPrice'), value: 'setFixed' },
    ] satisfies { label: string; value: PricingMethod }[];

    return (
        <Popup
            bodyStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, minHeight: '68vh', maxHeight: '90vh', overflowX: 'hidden' }}
            destroyOnClose
            onMaskClick={onClose}
            position="bottom"
            visible={visible}
        >
            <Flex style={{ height: '100%' }} vertical>
                <NavBar
                    onBack={onClose}
                    right={<Tag color="processing">{t('selectedCount', { count: selectedIds.size })}</Tag>}
                >
                    {actionTitle}
                </NavBar>

                <Flex gap={12} style={{ padding: 16 }} vertical>
                    {action === 'pricing' ? (
                        <Card size="small">
                            <Flex gap={12} vertical>
                                <Flex align="center" gap={8}>
                                    <LuDollarSign size={16} />
                                    <Text strong>{t('pricingRule')}</Text>
                                </Flex>
                                <Segmented
                                    block
                                    onChange={(value) => setPricingMethod(value as PricingMethod)}
                                    options={pricingMethodOptions}
                                    value={pricingMethod}
                                />
                                <InputNumber
                                    min={0}
                                    onChange={(value) => setPricingValue(typeof value === 'number' ? value : null)}
                                    placeholder={pricingMethod.includes('Percent') ? t('enterPercentage') : t('enterAmount')}
                                    style={{ width: '100%' }}
                                    value={pricingValue}
                                />
                                {pricingConfig && preview && 'itemsAffected' in preview ? (
                                    <Flex gap={8} wrap="wrap">
                                        <Tag color="processing">{t('itemsAffected', { count: preview.itemsAffected })}</Tag>
                                        <Tag>{t('itemsSkipped', { count: preview.itemsSkipped })}</Tag>
                                        <Tag color={preview.netChangePercent >= 0 ? 'success' : 'warning'}>
                                            {preview.netChangePercent >= 0 ? '+' : ''}{preview.netChangePercent}%
                                        </Tag>
                                    </Flex>
                                ) : (
                                    <Text type="secondary">{t('pricingRuleHelp')}</Text>
                                )}
                            </Flex>
                        </Card>
                    ) : null}

                    {action === 'moveCategory' ? (
                        <Card size="small">
                            <Flex gap={12} vertical>
                                <Flex align="center" gap={8}>
                                    <LuFolderInput size={16} />
                                    <Text strong>{t('destinationCategory')}</Text>
                                </Flex>
                                <Button block fill="outline" onClick={() => setShowCategoryPicker(true)} style={{ justifyContent: 'flex-start', minHeight: 44 }}>
                                    {destinationCategories.find((category) => category.value === destinationCategoryId)?.label || t('chooseCategory')}
                                </Button>
                                <Text type="secondary">{t('destinationCategoryHelp')}</Text>
                            </Flex>
                        </Card>
                    ) : null}

                    <Flex align="center" gap={12} wrap>
                        <Flex style={{ flex: 1, minWidth: 180 }}>
                            <SearchBar
                                onChange={setSearch}
                                placeholder={t('smartRecommendationsSearchItems')}
                                value={search}
                            />
                        </Flex>
                        <Checkbox
                            checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                            indeterminate={selectedIds.size > 0 && selectedIds.size < filteredItems.length}
                            onChange={toggleAll}
                        >
                            <Text style={{ whiteSpace: 'nowrap' }}>{t('selectAllCount', { count: filteredItems.length })}</Text>
                        </Checkbox>
                    </Flex>
                </Flex>

                <Flex style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }} vertical>
                    {!workingProject ? (
                        <Card>
                            <Text type="secondary">{t('loadingItems')}</Text>
                        </Card>
                    ) : categories.size === 0 ? (
                        <Empty description={t('noMatchingItems')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                        <Card size="small">
                            <Collapse
                                defaultActiveKey={Array.from(categories.keys())[0] ? [Array.from(categories.keys())[0]] : undefined}
                            >
                                {Array.from(categories.entries()).map(([categoryName, categoryItems]) => {
                                    const selectedCount = categoryItems.filter((item) => selectedIds.has(item.id)).length;
                                    const allCategorySelected = categoryItems.length > 0 && selectedCount === categoryItems.length;
                                    const someCategorySelected = selectedCount > 0 && !allCategorySelected;

                                    return (
                                        <Collapse.Panel
                                            key={categoryName}
                                            title={(
                                                <Flex align="center" gap={8} justify="space-between" style={{ width: '100%' }}>
                                                    <Flex align="center" gap={8} style={{ flex: 1, minWidth: 0 }}>
                                                        <Checkbox
                                                            checked={allCategorySelected}
                                                            indeterminate={someCategorySelected}
                                                            onChange={(checked) => toggleCategory(categoryName, checked)}
                                                        />
                                                        <Text strong>{categoryName}</Text>
                                                    </Flex>
                                                    <Tag color={selectedCount > 0 ? 'processing' : undefined}>
                                                        {selectedCount}/{categoryItems.length}
                                                    </Tag>
                                                </Flex>
                                            )}
                                        >
                                            <Flex gap={8} vertical>
                                                {categoryItems.map((item) => (
                                                    <Card key={item.id} size="small" style={{ margin: 0 }}>
                                                        <Flex
                                                            align="center"
                                                            gap={10}
                                                            justify="space-between"
                                                            onClick={() => toggleItem(item.id)}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            <Flex align="center" gap={10} style={{ flex: 1, minWidth: 0 }}>
                                                                <Checkbox
                                                                    checked={selectedIds.has(item.id)}
                                                                    onChange={() => toggleItem(item.id)}
                                                                />
                                                                <Flex gap={4} style={{ flex: 1, minWidth: 0 }} vertical>
                                                                    <Text>{item.name}</Text>
                                                                    <Flex gap={8} wrap="wrap">
                                                                        {item.price ? <Text type="secondary">{item.price}</Text> : null}
                                                                        {!item.available ? <Tag color="warning">{t('soldOut')}</Tag> : null}
                                                                        {!item.active ? <Tag>{t('hidden')}</Tag> : null}
                                                                        {item.attributes?.length ? <Tag>{t('variantsCount', { count: item.attributes.length })}</Tag> : null}
                                                                    </Flex>
                                                                </Flex>
                                                            </Flex>
                                                        </Flex>
                                                    </Card>
                                                ))}
                                            </Flex>
                                        </Collapse.Panel>
                                    );
                                })}
                            </Collapse>
                        </Card>
                    )}
                </Flex>

                {selectedIds.size > 0 ? (
                    <Card style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderBottom: 0 }}>
                        {action === 'availability' ? (
                            <Flex gap={12}>
                                <Button block color="primary" loading={applying} onClick={() => handleApply('available')} size="large">
                                    <Flex align="center" gap={6}>
                                        <LuCheck size={16} />
                                        <Text>{t('available')}</Text>
                                    </Flex>
                                </Button>
                                <Button block color="warning" loading={applying} onClick={() => handleApply('unavailable')} size="large">
                                    {t('soldOut')}
                                </Button>
                            </Flex>
                        ) : action === 'showHide' ? (
                            <Flex gap={12}>
                                <Button block color="primary" loading={applying} onClick={() => handleApply('show')} size="large">
                                    <Flex align="center" gap={6}>
                                        <LuEye size={16} />
                                        <Text>{t('show')}</Text>
                                    </Flex>
                                </Button>
                                <Button block color="danger" loading={applying} onClick={() => handleApply('hide')} size="large">
                                    <Flex align="center" gap={6}>
                                        <LuEyeOff size={16} />
                                        <Text>{t('hide')}</Text>
                                    </Flex>
                                </Button>
                            </Flex>
                        ) : (
                            <Button
                                block
                                color="primary"
                                disabled={(action === 'pricing' && !pricingConfig) || (action === 'moveCategory' && !destinationCategoryId)}
                                loading={applying}
                                onClick={() => handleApply()}
                                size="large"
                            >
                                {action === 'pricing' ? t('applyPriceUpdate') : t('moveSelectedItems')}
                            </Button>
                        )}
                    </Card>
                ) : null}
            </Flex>

            {action === 'moveCategory' ? (
                <Picker
                    columns={[destinationCategories]}
                    onClose={() => setShowCategoryPicker(false)}
                    onConfirm={(value) => value[0] && setDestinationCategoryId(value[0] as string)}
                    searchPlaceholder={t('searchCategories')}
                    title={t('moveToCategory')}
                    value={destinationCategoryId ? [destinationCategoryId] : []}
                    visible={showCategoryPicker}
                />
            ) : null}
        </Popup>
    );
}
