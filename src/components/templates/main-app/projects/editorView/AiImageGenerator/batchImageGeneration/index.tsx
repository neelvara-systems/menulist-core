import { ItemForDropdown } from '@template/main-app/projects/types';
import useDeviceType from '@hook/useDeviceType';
import { CONTENT_CREDIT_OPERATION_COSTS } from '@data/shared/contentCreditPolicy';
import { IMAGE_BATCH_PROJECT_SELECTION_MAX_ITEMS } from '@lib/ai/imageBatchProjectSelection';
import { Button, Checkbox, Divider, Flex, Image, Input, App, Switch, theme, Typography } from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import React, { useMemo, useState } from 'react';
import { LuArrowLeft, LuEye, LuImageOff, LuSparkles } from 'react-icons/lu';

const { Text } = Typography;

interface BatchSetupViewProps {
    allItemsForBatch: ItemForDropdown[];
    selectedItemsForBatch: string[];
    setSelectedItemsForBatch: (ids: string[]) => void;
    onProceedToConfig: () => void;
    onBackToChoices: () => void;
}

const BatchSetupView: React.FC<BatchSetupViewProps> = ({
    allItemsForBatch,
    selectedItemsForBatch,
    setSelectedItemsForBatch,
    onProceedToConfig,
    onBackToChoices,
}) => {
    const { message: messageApi } = App.useApp();
    const { token } = theme.useToken();
    const { isMobile } = useDeviceType();
    const [batchSearchTerm, setBatchSearchTerm] = useState('');
    const [showOnlyItemsWithoutImages, setShowOnlyItemsWithoutImages] = useState(false);

    const filteredBatchItems = useMemo(() => {
        let items = allItemsForBatch;
        if (batchSearchTerm) {
            const searchTerm = batchSearchTerm.toLowerCase();
            items = items.filter(item =>
                item.itemName.toLowerCase().includes(searchTerm) ||
                item.categoryName.toLowerCase().includes(searchTerm)
            );
        }
        if (showOnlyItemsWithoutImages) {
            items = items.filter(item => !item.images || item.images.length === 0);
        }
        return items;
    }, [allItemsForBatch, batchSearchTerm, showOnlyItemsWithoutImages]);

    const groupedItemsByCategory = useMemo(() => {
        const groups: { [key: string]: ItemForDropdown[] } = {};
        filteredBatchItems.forEach(item => {
            const category = item.categoryName || 'Uncategorized'; // Handle items with no category
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(item);
        });
        // Sort items within each category by itemName
        for (const category in groups) {
            groups[category].sort((a, b) => a.itemName.localeCompare(b.itemName));
        }
        return groups;
    }, [filteredBatchItems]);

    const sortedCategories = useMemo(() => Object.keys(groupedItemsByCategory).sort((a, b) => a.localeCompare(b)), [groupedItemsByCategory]);

    const applySelectionLimit = (candidateIds: string[]): string[] => {
        const uniqueIds = Array.from(new Set(candidateIds));
        const nextIds = uniqueIds.slice(0, IMAGE_BATCH_PROJECT_SELECTION_MAX_ITEMS);
        setSelectedItemsForBatch(nextIds);
        if (uniqueIds.length > IMAGE_BATCH_PROJECT_SELECTION_MAX_ITEMS) {
            messageApi.warning(`Choose up to ${IMAGE_BATCH_PROJECT_SELECTION_MAX_ITEMS} items per batch. The first ${IMAGE_BATCH_PROJECT_SELECTION_MAX_ITEMS} are selected.`);
        }
        return nextIds;
    };

    const handleCategorySelectAllChange = (categoryName: string, select: boolean) => {
        const currentCategoryItemIds = groupedItemsByCategory[categoryName]?.map(item => item.id) || [];
        let newSelectedItems: string[];

        if (select) {
            // Start with a copy of the current selection.
            newSelectedItems = [...selectedItemsForBatch];
            // Add all items from the current category that are not already selected.
            currentCategoryItemIds.forEach(itemId => {
                if (!newSelectedItems.includes(itemId)) {
                    newSelectedItems.push(itemId);
                }
            });
        } else {
            // Filter out items that belong to the current category.
            newSelectedItems = selectedItemsForBatch.filter(id => !currentCategoryItemIds.includes(id));
        }
        applySelectionLimit(newSelectedItems);
    };

    const handleIndividualItemChange = (itemId: string, isChecked: boolean) => {
        let newSelectedItems = [...selectedItemsForBatch];
        if (isChecked) {
            if (!newSelectedItems.includes(itemId)) {
                if (newSelectedItems.length >= IMAGE_BATCH_PROJECT_SELECTION_MAX_ITEMS) {
                    messageApi.warning(`Choose up to ${IMAGE_BATCH_PROJECT_SELECTION_MAX_ITEMS} items per batch.`);
                    return;
                }
                newSelectedItems.push(itemId);
            }
        } else {
            newSelectedItems = newSelectedItems.filter(id => id !== itemId);
        }
        setSelectedItemsForBatch(newSelectedItems);
    };

    const onSelectAllChange = (e: CheckboxChangeEvent) => {
        const visibleItemIds = filteredBatchItems.map(item => item.id);
        if (e.target.checked) {
            applySelectionLimit([...selectedItemsForBatch, ...visibleItemIds]);
        } else {
            setSelectedItemsForBatch(selectedItemsForBatch.filter(id => !visibleItemIds.includes(id)));
        }
    };


    const selectedVisibleItemsCount = filteredBatchItems.filter(item => selectedItemsForBatch.includes(item.id)).length;

    return (
        <Flex vertical gap={16} >
            <Flex vertical gap={4}>
                <Typography.Title level={4} style={{ textAlign: 'center', margin: 0 }}>Select Items for Batch Generation</Typography.Title>
                <Typography.Text type="secondary" style={{ textAlign: 'center', marginTop: 0 }}>Choose one or more items to generate photos for.</Typography.Text>
            </Flex>

            <Input.Search
                placeholder="Search items by name or category..."
                value={batchSearchTerm}
                onChange={(e) => setBatchSearchTerm(e.target.value)}
                allowClear
                style={{ marginBottom: token.marginSM }}
            />

            {allItemsForBatch.length > 0 && (
                <Flex vertical gap={12} style={{ width: '100%' }}>
                    {/* Quick Action: Generate All Missing */}
                    {allItemsForBatch.filter(item => !item.images || item.images.length === 0).length > 0 && (
                        <Button
                            type="primary"
                            ghost
                            icon={<LuSparkles />}
                            onClick={() => {
                                const itemsWithoutImages = allItemsForBatch.filter(item => !item.images || item.images.length === 0);
                                const selectedIds = applySelectionLimit(itemsWithoutImages.map(item => item.id));
                                messageApi.success(`Selected ${selectedIds.length} item${selectedIds.length === 1 ? '' : 's'} without images`);
                            }}
                            style={{ width: '100%' }}
                        >
                            Quick Select: All {allItemsForBatch.filter(item => !item.images || item.images.length === 0).length} Items Without Images
                        </Button>
                    )}
                    <Flex gap="small" style={{ width: '100%' }} justify='space-between' align="center">
                        <Checkbox
                            indeterminate={selectedVisibleItemsCount > 0 && selectedVisibleItemsCount < filteredBatchItems.length}
                            checked={filteredBatchItems.length > 0 && selectedVisibleItemsCount === filteredBatchItems.length}
                            onChange={onSelectAllChange}
                            disabled={filteredBatchItems.length === 0}
                        >
                            Select All Visible ({selectedVisibleItemsCount}/{filteredBatchItems.length})
                        </Checkbox>
                        <Flex align="center" gap={token.paddingXS}>
                            <Switch
                                size="small"
                                checked={showOnlyItemsWithoutImages}
                                onChange={(checked) => {
                                    setShowOnlyItemsWithoutImages(checked);
                                    setSelectedItemsForBatch([]);
                                }}
                                disabled={allItemsForBatch.every(item => item.images && item.images.length > 0)}
                            />
                            <Text
                                onClick={() => {
                                    if (!allItemsForBatch.every(item => item.images && item.images.length > 0)) {
                                        setShowOnlyItemsWithoutImages(!showOnlyItemsWithoutImages);
                                        setSelectedItemsForBatch([]);
                                    }
                                }}
                                style={{
                                    cursor: !allItemsForBatch.every(item => item.images && item.images.length > 0) ? 'pointer' : 'default',
                                    color: allItemsForBatch.every(item => item.images && item.images.length > 0) ? token.colorTextDisabled : token.colorText
                                }}
                            >
                                Only show items without images
                            </Text>
                        </Flex>
                    </Flex>
                </Flex>
            )}
            {allItemsForBatch.length > 0 && <Divider style={{ margin: `${token.marginXXS}px 0` }} />}

            {allItemsForBatch.length === 0 ? (
                <Typography.Text style={{ textAlign: 'center', padding: 20 }}>No items available for selection.</Typography.Text>
            ) : filteredBatchItems.length === 0 ? (
                <Typography.Text style={{ textAlign: 'center', padding: 20 }}>No items match your search {batchSearchTerm}.</Typography.Text>
            ) : (
                // Checkbox.Group removed, item selection handled manually
                <Flex vertical gap="middle" style={{ paddingRight: 5, width: '100%' }}>
                    {sortedCategories.map(categoryName => {
                        const itemsInCategory = groupedItemsByCategory[categoryName] || [];
                        const itemIdsInCategory = itemsInCategory.map(item => item.id);
                        const selectedInCategoryCount = itemIdsInCategory.filter(id => selectedItemsForBatch.includes(id)).length;
                        const allInCategorySelected = itemIdsInCategory.length > 0 && selectedInCategoryCount === itemIdsInCategory.length;
                        const someInCategorySelected = selectedInCategoryCount > 0 && selectedInCategoryCount < itemIdsInCategory.length;

                        return (
                            <div key={categoryName}>
                                <Flex align="center" gap={token.paddingXS} style={{ marginBottom: token.marginXS, marginTop: token.marginSM }}>
                                    <Checkbox
                                        onChange={(e) => {
                                            handleCategorySelectAllChange(categoryName, e.target.checked);
                                            e.stopPropagation();
                                        }}
                                        checked={allInCategorySelected}
                                        indeterminate={someInCategorySelected}
                                        disabled={itemIdsInCategory.length === 0} // Disable if category (after filtering) is empty
                                    >
                                        <Typography.Title level={5} style={{ margin: 0 }}>
                                            {categoryName} ({selectedInCategoryCount}/{itemIdsInCategory.length})
                                        </Typography.Title>
                                    </Checkbox>
                                </Flex>
                                <Flex vertical gap="small" style={{ paddingLeft: token.paddingMD }}> {/* Indent items under category checkbox */}
                                    {itemsInCategory.map(item => (
                                        <Checkbox
                                            key={item.id}
                                            // value prop is not needed when not in a Checkbox.Group for value collection
                                            checked={selectedItemsForBatch.includes(item.id)}
                                            onChange={(e) => handleIndividualItemChange(item.id, e.target.checked)}
                                            style={{ width: '100%', border: `1px solid ${selectedItemsForBatch.includes(item.id) ? token.colorPrimary : token.colorBorder}`, padding: '10px', borderRadius: token.borderRadiusLG, transition: 'border-color 0.3s' }}
                                        >
                                            <Flex gap={8} align="center">
                                                {item.images && item.images.length > 0 ? (
                                                    <Image
                                                        src={item.images[0]?.url}
                                                        width={50} height={50}
                                                        preview={{ mask: <LuEye /> }}
                                                        style={{ borderRadius: token.borderRadiusSM, objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <Flex justify="center" align="center" style={{ width: 50, height: 50, backgroundColor: token.colorBgContainerDisabled, borderRadius: token.borderRadiusSM }}>
                                                        <LuImageOff size={24} color={token.colorTextDisabled} />
                                                    </Flex>
                                                )}
                                                <Flex vertical gap={2}>
                                                    <Text style={{ fontWeight: selectedItemsForBatch.includes(item.id) ? 600 : 400, color: selectedItemsForBatch.includes(item.id) ? token.colorPrimary : token.colorText }}>{item.itemName}</Text>
                                                </Flex>
                                            </Flex>
                                        </Checkbox>
                                    ))}
                                </Flex>
                            </div>
                        );
                    })}
                </Flex>
                // Closing Checkbox.Group removed
            )}

            <Flex gap="middle" justify="center" style={{
                marginTop: 20,
                position: 'sticky',
                bottom: -10,
                width: '100%',
                backgroundColor: token.colorBgContainer,
                padding: token.paddingSM
            }} vertical={isMobile}>
                <Button icon={<LuArrowLeft />} onClick={() => { onBackToChoices(); setBatchSearchTerm(''); }}>Back to Choices</Button>
                <Flex vertical align="center" gap={4}>
                    <Button
                        icon={<LuSparkles />}
                        type="primary"
                        disabled={selectedItemsForBatch.length === 0}
                        onClick={() => {
                            if (selectedItemsForBatch.length > 0) {
                                onProceedToConfig();
                            } else {
                                messageApi.warning('Please select at least one item.');
                            }
                        }}
                    >
                        Next: Configure ({selectedItemsForBatch.length} items)
                    </Button>
                    {selectedItemsForBatch.length > 0 && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {selectedItemsForBatch.length}/{IMAGE_BATCH_PROJECT_SELECTION_MAX_ITEMS} items • {selectedItemsForBatch.length} image{selectedItemsForBatch.length !== 1 ? 's' : ''} • from {selectedItemsForBatch.length * CONTENT_CREDIT_OPERATION_COSTS.GENERATED_MENU_IMAGE} credits
                        </Text>
                    )}
                </Flex>
            </Flex>
        </Flex>
    );
};

export default BatchSetupView;
