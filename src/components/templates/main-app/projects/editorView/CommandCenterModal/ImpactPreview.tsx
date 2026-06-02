import { Alert, Collapse, Flex, Statistic, Tag, Typography, theme } from 'antd';
import { formatMenuPrice } from '@lib/pricing/formatMenuPrice';
import { useState } from 'react';
import { LuArrowDown, LuArrowRight, LuArrowUp, LuFileText, LuLanguages, LuSparkles } from 'react-icons/lu';
import type {
    ActiveInactivePreview,
    AvailabilityPreview,
    CommandCenterAction,
    ImpactSummary,
    MoveCategoryPreview,
    PriceChangePreview,
    RepairMenuSummary,
    SelectedItemInfo,
} from '../../types/commandCenter.types';
import type { TextCasePreview } from '../textCase.shared';

const { Text } = Typography;
const { Panel } = Collapse;

interface ImpactPreviewProps {
    activeAction: CommandCenterAction | null;
    pricingPreview: ImpactSummary | null;
    availabilityPreview: AvailabilityPreview | null;
    moveCategoryPreview: MoveCategoryPreview | null;
    activeInactivePreview: ActiveInactivePreview | null;
    repairSummary: RepairMenuSummary;
    textCasePreview: TextCasePreview | null;
    lastApplyMessage: string | null;
    selectedItems: SelectedItemInfo[];
    currencySymbol: string;
}

export default function ImpactPreview({
    activeAction,
    pricingPreview,
    availabilityPreview,
    moveCategoryPreview,
    activeInactivePreview,
    repairSummary,
    textCasePreview,
    lastApplyMessage,
    selectedItems,
    currencySymbol,
}: ImpactPreviewProps) {
    const { token } = theme.useToken();
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

    // Get category names based on current action
    const getCategoryNames = () => {
        if (activeAction === 'pricing' && pricingPreview) {
            return Array.from(new Set(pricingPreview.allChanges.map(c => c.categoryName)));
        }
        if (selectedItems.length > 0) {
            return Array.from(new Set(selectedItems.map(i => i.categoryName)));
        }
        return [];
    };

    const categoryNames = getCategoryNames();
    const allExpanded = expandedCategories.length === categoryNames.length && categoryNames.length > 0;
    const someExpanded = expandedCategories.length > 0 && !allExpanded;

    const handleExpandAll = () => {
        setExpandedCategories(categoryNames);
    };

    const handleCollapseAll = () => {
        setExpandedCategories([]);
    };

    // Show success message if just applied
    if (lastApplyMessage && !activeAction) {
        return (
            <Flex
                vertical
                align="center"
                justify="center"
                gap={12}
                style={{ height: '100%', padding: 24 }}
            >
                <Text style={{ fontSize: 14, color: token.colorSuccess }}>
                    {lastApplyMessage}
                </Text>
                <Text type="secondary" style={{ fontSize: 12, textAlign: 'center' }}>
                    Choose another action or close the command center.
                </Text>
            </Flex>
        );
    }

    // Empty state
    if (!activeAction) {
        return (
            <Flex
                vertical
                align="center"
                justify="center"
                gap={8}
                style={{ height: '100%', padding: 24, opacity: 0.5 }}
            >
                <Text type="secondary" style={{ fontSize: 13 }}>
                    Select an action to preview impact
                </Text>
            </Flex>
        );
    }

    if (activeAction === 'repairMenu') {
        return (
            <Flex vertical gap={12} style={{ padding: 16, height: '100%', overflowY: 'auto' }}>
                <Text strong style={{ fontSize: 14 }}>Repair Preview</Text>
                <Flex
                    gap={16}
                    wrap="wrap"
                    style={{
                        padding: '12px',
                        backgroundColor: token.colorBgLayout,
                        borderRadius: 8,
                        border: `1px solid ${token.colorBorderSecondary}`,
                    }}
                >
                    <Statistic
                        title={<Text type="secondary" style={{ fontSize: 10 }}>Fixable now</Text>}
                        value={repairSummary.fixableNowCount}
                        valueStyle={{ fontSize: 16 }}
                        formatter={(value) => value?.toLocaleString()}
                    />
                    <Statistic
                        title={<Text type="secondary" style={{ fontSize: 10 }}>Manual review</Text>}
                        value={repairSummary.manualReviewCount}
                        valueStyle={{ fontSize: 16 }}
                        formatter={(value) => value?.toLocaleString()}
                    />
                </Flex>

                <Flex vertical gap={8}>
                    <Flex align="center" gap={8}>
                        <LuSparkles style={{ color: token.colorSuccess }} />
                        <Text strong style={{ fontSize: 12 }}>Will repair</Text>
                    </Flex>
                    {repairSummary.fixableNowCount > 0 ? (
                        <Flex gap={8} wrap="wrap">
                            {repairSummary.descriptionsToGenerate > 0 ? (
                                <Tag color="success">{repairSummary.descriptionsToGenerate} descriptions</Tag>
                            ) : null}
                            {repairSummary.languageIssueCount > 0 ? (
                                <Tag color="processing">{repairSummary.languageIssueCount} language issues</Tag>
                            ) : null}
                            {repairSummary.projectContentIssueCount > 0 ? (
                                <Tag color="processing">{repairSummary.projectContentIssueCount} project details</Tag>
                            ) : null}
                            {repairSummary.categoryIconsToRepair > 0 ? (
                                <Tag color="processing">{repairSummary.categoryIconsToRepair} category icons</Tag>
                            ) : null}
                        </Flex>
                    ) : (
                        <Text type="secondary" style={{ fontSize: 12 }}>No action needed.</Text>
                    )}
                </Flex>

                {repairSummary.manualReviewCount > 0 ? (
                    <Flex vertical gap={8}>
                        <Flex align="center" gap={8}>
                            <LuFileText style={{ color: token.colorWarning }} />
                            <Text strong style={{ fontSize: 12 }}>Will not change automatically</Text>
                        </Flex>
                        <Flex gap={8} wrap="wrap">
                            {repairSummary.missingPrices > 0 ? (
                                <Tag>{repairSummary.missingPrices} missing prices</Tag>
                            ) : null}
                            {repairSummary.missingImages > 0 ? (
                                <Tag>{repairSummary.missingImages} missing photos</Tag>
                            ) : null}
                        </Flex>
                    </Flex>
                ) : null}

                {repairSummary.projectContentLanguagesToRepair > 0 ? (
                    <Flex align="center" gap={8}>
                        <LuLanguages style={{ color: token.colorPrimary }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Project details will be filled for {repairSummary.projectContentLanguagesToRepair} language{repairSummary.projectContentLanguagesToRepair !== 1 ? 's' : ''}.
                        </Text>
                    </Flex>
                ) : null}
            </Flex>
        );
    }

    if (activeAction === 'textCase') {
        return (
            <Flex vertical gap={12} style={{ padding: 16, height: '100%', overflowY: 'auto' }}>
                <Text strong style={{ fontSize: 14 }}>Text Case Preview</Text>
                {textCasePreview ? (
                    <>
                        <Flex
                            gap={16}
                            wrap="wrap"
                            style={{
                                padding: '12px',
                                backgroundColor: token.colorBgLayout,
                                borderRadius: 8,
                                border: `1px solid ${token.colorBorderSecondary}`,
                            }}
                        >
                            <Statistic
                                title={<Text type="secondary" style={{ fontSize: 10 }}>Text values</Text>}
                                value={textCasePreview.totalFields}
                                valueStyle={{ fontSize: 16 }}
                                formatter={(value) => value?.toLocaleString()}
                            />
                        </Flex>
                        <Flex gap={8} wrap="wrap">
                            {textCasePreview.categories > 0 ? (
                                <Tag>{textCasePreview.categories} category names</Tag>
                            ) : null}
                            {textCasePreview.items > 0 ? (
                                <Tag>{textCasePreview.items} item names</Tag>
                            ) : null}
                            {textCasePreview.attributes > 0 ? (
                                <Tag>{textCasePreview.attributes} attribute names</Tag>
                            ) : null}
                            {textCasePreview.descriptions > 0 ? (
                                <Tag>{textCasePreview.descriptions} descriptions</Tag>
                            ) : null}
                        </Flex>
                    </>
                ) : (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Choose at least one text area to preview the change.
                    </Text>
                )}
            </Flex>
        );
    }

    // Pricing preview
    if (activeAction === 'pricing') {
        if (!pricingPreview) {
            return (
                <Flex
                    align="center"
                    justify="center"
                    style={{ height: '100%', opacity: 0.5 }}
                >
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Enter a value to see preview
                    </Text>
                </Flex>
            );
        }

        const isPositive = pricingPreview.netChangePercent > 0;

        // Group changes by category
        const changesByCategory = pricingPreview.allChanges.reduce((acc, change) => {
            if (!acc[change.categoryName]) acc[change.categoryName] = [];
            acc[change.categoryName].push(change);
            return acc;
        }, {} as Record<string, PriceChangePreview[]>);

        return (
            <Flex vertical gap={12} style={{ padding: 16, height: '100%', overflowY: 'auto' }}>
                {/* Header */}
                <Flex justify="space-between" align="center">
                    <Text strong style={{ fontSize: 14 }}>Impact Preview</Text>
                    {Object.keys(changesByCategory).length > 1 && (
                        <Tag
                            style={{ cursor: 'pointer', fontSize: 10 }}
                            onClick={allExpanded ? handleCollapseAll : handleExpandAll}
                        >
                            {allExpanded ? 'Collapse All' : someExpanded ? 'Collapse' : 'Expand All'}
                        </Tag>
                    )}
                </Flex>

                {/* Summary stats */}
                <Flex
                    gap={16}
                    wrap="wrap"
                    style={{
                        padding: '12px',
                        backgroundColor: token.colorBgLayout,
                        borderRadius: 8,
                        border: `1px solid ${token.colorBorderSecondary}`,
                    }}
                >
                    <Statistic
                        title={<Text type="secondary" style={{ fontSize: 10 }}>Items affected</Text>}
                        value={pricingPreview.itemsAffected}
                        valueStyle={{ fontSize: 16 }}
                        formatter={(value) => value?.toLocaleString()}
                    />
                    <Statistic
                        title={<Text type="secondary" style={{ fontSize: 10 }}>Avg before</Text>}
                        value={pricingPreview.avgPriceBefore}
                        prefix={currencySymbol}
                        valueStyle={{ fontSize: 16 }}
                        precision={0}
                    />
                    <Statistic
                        title={<Text type="secondary" style={{ fontSize: 10 }}>Avg after</Text>}
                        value={pricingPreview.avgPriceAfter}
                        prefix={currencySymbol}
                        valueStyle={{ fontSize: 16, color: isPositive ? token.colorError : token.colorSuccess }}
                        precision={0}
                    />
                    <Statistic
                        title={<Text type="secondary" style={{ fontSize: 10 }}>Net change</Text>}
                        value={Math.round(pricingPreview.netChangePercent * 10) / 10}
                        suffix="%"
                        prefix={isPositive ? <LuArrowUp style={{ fontSize: 12 }} /> : <LuArrowDown style={{ fontSize: 12 }} />}
                        valueStyle={{ fontSize: 16, color: isPositive ? token.colorPrimary : token.colorWarning }}
                    />
                </Flex>

                {pricingPreview.itemsSkipped > 0 && (
                    <Alert
                        message={`${pricingPreview.itemsSkipped} items skipped (no price or locked)`}
                        type="warning"
                        style={{ fontSize: 11 }}
                    />
                )}

                {/* Category-wise accordion */}
                <Flex vertical gap={8}>
                    <Flex justify="space-between" align="center">
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            All changes ({pricingPreview.allChanges.length.toLocaleString()} items)
                        </Text>
                        {Object.keys(changesByCategory).length > 0 && (
                            <Text type="secondary" style={{ fontSize: 10 }}>
                                {Object.keys(changesByCategory).length} categories
                            </Text>
                        )}
                    </Flex>
                    <Collapse
                        ghost
                        size="small"
                        activeKey={expandedCategories}
                        onChange={(keys) => setExpandedCategories(keys as string[])}
                        style={{
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderRadius: 8,
                            backgroundColor: token.colorBgContainer,
                        }}
                    >
                        {Object.entries(changesByCategory).map(([categoryName, changes]) => (
                            <Panel
                                key={categoryName}
                                header={
                                    <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                                        <Text strong style={{ fontSize: 12 }}>{categoryName}</Text>
                                        <Tag color="blue" style={{ fontSize: 9 }}>
                                            {changes.length} items
                                        </Tag>
                                    </Flex>
                                }
                                style={{
                                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                                }}
                            >
                                <Flex vertical gap={2} style={{ padding: '4px 0' }}>
                                    {changes.map((change) => (
                                        <Flex
                                            key={`${change.itemId}-${change.attributeName || 'base'}`}
                                            justify="space-between"
                                            align="center"
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: 6,
                                                backgroundColor: token.colorBgLayout,
                                                border: `1px solid ${token.colorBorderSecondary}`,
                                            }}
                                        >
                                            <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                                                <Text style={{ fontSize: 11 }} ellipsis>
                                                    {change.itemName}
                                                    {change.attributeName && (
                                                        <Text type="secondary" style={{ fontSize: 10 }}>
                                                            {' '}({change.attributeName})
                                                        </Text>
                                                    )}
                                                </Text>
                                            </Flex>
                                            <Flex align="center" gap={8}>
                                                <Text type="secondary" style={{ fontSize: 10 }}>
                                                    {formatMenuPrice(change.oldPrice, currencySymbol)}
                                                </Text>
                                                <LuArrowRight style={{ fontSize: 10, color: token.colorTextQuaternary }} />
                                                <Text strong style={{ fontSize: 11 }}>
                                                    {formatMenuPrice(change.newPrice, currencySymbol)}
                                                </Text>
                                                <Tag
                                                    color={change.changePercent > 0 ? 'blue' : 'orange'}
                                                    style={{ fontSize: 9 }}
                                                >
                                                    {change.changePercent > 0 ? '+' : ''}{Math.round(change.changePercent * 10) / 10}%
                                                </Tag>
                                            </Flex>
                                        </Flex>
                                    ))}
                                </Flex>
                            </Panel>
                        ))}
                    </Collapse>
                </Flex>
            </Flex>
        );
    }

    // Availability preview
    if (activeAction === 'availability') {
        if (!availabilityPreview) {
            return (
                <Flex
                    align="center"
                    justify="center"
                    style={{ height: '100%', opacity: 0.5 }}
                >
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Select an option to see preview
                    </Text>
                </Flex>
            );
        }

        return (
            <Flex vertical gap={12} style={{ padding: 16, height: '100%', overflowY: 'auto' }}>
                {/* Header */}
                <Flex justify="space-between" align="center">
                    <Text strong style={{ fontSize: 14 }}>Impact Preview</Text>
                    {categoryNames.length > 1 && (
                        <Tag
                            style={{ cursor: 'pointer', fontSize: 10 }}
                            onClick={allExpanded ? handleCollapseAll : handleExpandAll}
                        >
                            {allExpanded ? 'Collapse All' : someExpanded ? 'Collapse' : 'Expand All'}
                        </Tag>
                    )}
                </Flex>

                {/* Summary stats */}
                <Flex
                    gap={16}
                    wrap="wrap"
                    style={{
                        padding: '12px',
                        backgroundColor: token.colorBgLayout,
                        borderRadius: 8,
                        border: `1px solid ${token.colorBorderSecondary}`,
                    }}
                >
                    <Statistic
                        title={<Text type="secondary" style={{ fontSize: 10 }}>Items will change</Text>}
                        value={availabilityPreview.itemsToChange}
                        valueStyle={{ fontSize: 16 }}
                        formatter={(value) => value?.toLocaleString()}
                    />
                    <Statistic
                        title={<Text type="secondary" style={{ fontSize: 10 }}>Already in target state</Text>}
                        value={availabilityPreview.itemsAlreadyInState}
                        valueStyle={{ fontSize: 16 }}
                        formatter={(value) => value?.toLocaleString()}
                    />
                </Flex>

                {/* Category-wise item list */}
                {selectedItems.length > 0 && (
                    <Flex vertical gap={8}>
                        <Flex justify="space-between" align="center">
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                Items to be marked {availabilityPreview.itemsToChange > 0 ? 'unavailable' : 'available'}:
                            </Text>
                            <Text type="secondary" style={{ fontSize: 10 }}>
                                {selectedItems.length.toLocaleString()} items
                            </Text>
                        </Flex>
                        <Collapse
                            ghost
                            size="small"
                            activeKey={expandedCategories}
                            onChange={(keys) => setExpandedCategories(keys as string[])}
                            style={{
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: 8,
                                backgroundColor: token.colorBgContainer,
                            }}
                        >
                            {Object.entries(
                                selectedItems.reduce((acc, item) => {
                                    if (!acc[item.categoryName]) acc[item.categoryName] = [];
                                    acc[item.categoryName].push(item);
                                    return acc;
                                }, {} as Record<string, SelectedItemInfo[]>)
                            ).map(([categoryName, items]) => (
                                <Panel
                                    key={categoryName}
                                    header={
                                        <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                                            <Text strong style={{ fontSize: 12 }}>{categoryName}</Text>
                                            <Tag color="blue" style={{ fontSize: 9 }}>
                                                {items.length} items
                                            </Tag>
                                        </Flex>
                                    }
                                    style={{
                                        borderBottom: `1px solid ${token.colorBorderSecondary}`,
                                    }}
                                >
                                    <Flex vertical gap={2} style={{ padding: '4px 0' }}>
                                        {items.map((item) => (
                                            <Flex
                                                key={item.id}
                                                justify="space-between"
                                                align="center"
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: 6,
                                                    backgroundColor: token.colorBgLayout,
                                                    border: `1px solid ${token.colorBorderSecondary}`,
                                                }}
                                            >
                                                <Text style={{ fontSize: 11 }}>{item.name}</Text>
                                                <Text type="secondary" style={{ fontSize: 10 }}>
                                                    {item.price ? formatMenuPrice(item.price, currencySymbol) : 'No price'}
                                                </Text>
                                            </Flex>
                                        ))}
                                    </Flex>
                                </Panel>
                            ))}
                        </Collapse>
                    </Flex>
                )}
            </Flex>
        );
    }

    // Move category preview
    if (activeAction === 'moveCategory') {
        if (!moveCategoryPreview) {
            return (
                <Flex
                    align="center"
                    justify="center"
                    style={{ height: '100%', opacity: 0.5 }}
                >
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Select a category to see preview
                    </Text>
                </Flex>
            );
        }

        return (
            <Flex vertical gap={12} style={{ padding: 16, height: '100%', overflowY: 'auto' }}>
                {/* Header */}
                <Flex justify="space-between" align="center">
                    <Text strong style={{ fontSize: 14 }}>Impact Preview</Text>
                    {categoryNames.length > 1 && (
                        <Tag
                            style={{ cursor: 'pointer', fontSize: 10 }}
                            onClick={allExpanded ? handleCollapseAll : handleExpandAll}
                        >
                            {allExpanded ? 'Collapse All' : someExpanded ? 'Collapse' : 'Expand All'}
                        </Tag>
                    )}
                </Flex>

                {/* Summary stats */}
                <Flex
                    gap={16}
                    wrap="wrap"
                    style={{
                        padding: '12px',
                        backgroundColor: token.colorBgLayout,
                        borderRadius: 8,
                        border: `1px solid ${token.colorBorderSecondary}`,
                    }}
                >
                    <Statistic
                        title={<Text type="secondary" style={{ fontSize: 10 }}>Items will move</Text>}
                        value={moveCategoryPreview.itemsToMove}
                        valueStyle={{ fontSize: 16 }}
                        formatter={(value) => value?.toLocaleString()}
                    />
                </Flex>

                {/* Category mapping */}
                {moveCategoryPreview.sourceCategories.length > 0 && (
                    <Flex vertical gap={4} style={{
                        padding: '12px',
                        backgroundColor: token.colorBgLayout,
                        borderRadius: 8,
                        border: `1px solid ${token.colorBorderSecondary}`,
                    }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            From: {moveCategoryPreview.sourceCategories.join(', ')}
                        </Text>
                        <Flex align="center" gap={8}>
                            <LuArrowRight style={{ color: token.colorTextQuaternary }} />
                            <Tag color="blue">{moveCategoryPreview.destinationCategory}</Tag>
                        </Flex>
                    </Flex>
                )}

                {/* Category-wise item list */}
                {selectedItems.length > 0 && (
                    <Flex vertical gap={8}>
                        <Flex justify="space-between" align="center">
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                Items to be moved:
                            </Text>
                            <Text type="secondary" style={{ fontSize: 10 }}>
                                {selectedItems.length.toLocaleString()} items
                            </Text>
                        </Flex>
                        <Collapse
                            ghost
                            size="small"
                            activeKey={expandedCategories}
                            onChange={(keys) => setExpandedCategories(keys as string[])}
                            style={{
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: 8,
                                backgroundColor: token.colorBgContainer,
                            }}
                        >
                            {Object.entries(
                                selectedItems.reduce((acc, item) => {
                                    if (!acc[item.categoryName]) acc[item.categoryName] = [];
                                    acc[item.categoryName].push(item);
                                    return acc;
                                }, {} as Record<string, SelectedItemInfo[]>)
                            ).map(([categoryName, items]) => (
                                <Panel
                                    key={categoryName}
                                    header={
                                        <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                                            <Text strong style={{ fontSize: 12 }}>{categoryName}</Text>
                                            <Tag color="blue" style={{ fontSize: 9 }}>
                                                {items.length} items
                                            </Tag>
                                        </Flex>
                                    }
                                    style={{
                                        borderBottom: `1px solid ${token.colorBorderSecondary}`,
                                    }}
                                >
                                    <Flex vertical gap={2} style={{ padding: '4px 0' }}>
                                        {items.map((item) => (
                                            <Flex
                                                key={item.id}
                                                justify="space-between"
                                                align="center"
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: 6,
                                                    backgroundColor: token.colorBgLayout,
                                                    border: `1px solid ${token.colorBorderSecondary}`,
                                                }}
                                            >
                                                <Text style={{ fontSize: 11 }}>{item.name}</Text>
                                                <Text type="secondary" style={{ fontSize: 10 }}>
                                                    {item.price ? formatMenuPrice(item.price, currencySymbol) : 'No price'}
                                                </Text>
                                            </Flex>
                                        ))}
                                    </Flex>
                                </Panel>
                            ))}
                        </Collapse>
                    </Flex>
                )}
            </Flex>
        );
    }

    // Active/inactive preview
    if (activeAction === 'activeInactive') {
        if (!activeInactivePreview) {
            return (
                <Flex
                    align="center"
                    justify="center"
                    style={{ height: '100%', opacity: 0.5 }}
                >
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Select an option to see preview
                    </Text>
                </Flex>
            );
        }

        return (
            <Flex vertical gap={12} style={{ padding: 16, height: '100%', overflowY: 'auto' }}>
                {/* Header */}
                <Flex justify="space-between" align="center">
                    <Text strong style={{ fontSize: 14 }}>Impact Preview</Text>
                    {categoryNames.length > 1 && (
                        <Tag
                            style={{ cursor: 'pointer', fontSize: 10 }}
                            onClick={allExpanded ? handleCollapseAll : handleExpandAll}
                        >
                            {allExpanded ? 'Collapse All' : someExpanded ? 'Collapse' : 'Expand All'}
                        </Tag>
                    )}
                </Flex>

                {/* Summary stats */}
                <Flex
                    gap={16}
                    wrap="wrap"
                    style={{
                        padding: '12px',
                        backgroundColor: token.colorBgLayout,
                        borderRadius: 8,
                        border: `1px solid ${token.colorBorderSecondary}`,
                    }}
                >
                    <Statistic
                        title={<Text type="secondary" style={{ fontSize: 10 }}>Items will change</Text>}
                        value={activeInactivePreview.itemsToChange}
                        valueStyle={{ fontSize: 16 }}
                        formatter={(value) => value?.toLocaleString()}
                    />
                    <Statistic
                        title={<Text type="secondary" style={{ fontSize: 10 }}>Already in target state</Text>}
                        value={activeInactivePreview.itemsAlreadyInState}
                        valueStyle={{ fontSize: 16 }}
                        formatter={(value) => value?.toLocaleString()}
                    />
                </Flex>

                {/* Category-wise item list */}
                {selectedItems.length > 0 && (
                    <Flex vertical gap={8}>
                        <Flex justify="space-between" align="center">
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                Items to be {activeInactivePreview.itemsToChange > 0 ? 'hidden' : 'shown'}:
                            </Text>
                            <Text type="secondary" style={{ fontSize: 10 }}>
                                {selectedItems.length.toLocaleString()} items
                            </Text>
                        </Flex>
                        <Collapse
                            ghost
                            size="small"
                            activeKey={expandedCategories}
                            onChange={(keys) => setExpandedCategories(keys as string[])}
                            style={{
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: 8,
                                backgroundColor: token.colorBgContainer,
                            }}
                        >
                            {Object.entries(
                                selectedItems.reduce((acc, item) => {
                                    if (!acc[item.categoryName]) acc[item.categoryName] = [];
                                    acc[item.categoryName].push(item);
                                    return acc;
                                }, {} as Record<string, SelectedItemInfo[]>)
                            ).map(([categoryName, items]) => (
                                <Panel
                                    key={categoryName}
                                    header={
                                        <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                                            <Text strong style={{ fontSize: 12 }}>{categoryName}</Text>
                                            <Tag color="blue" style={{ fontSize: 9 }}>
                                                {items.length} items
                                            </Tag>
                                        </Flex>
                                    }
                                    style={{
                                        borderBottom: `1px solid ${token.colorBorderSecondary}`,
                                    }}
                                >
                                    <Flex vertical gap={2} style={{ padding: '4px 0' }}>
                                        {items.map((item) => (
                                            <Flex
                                                key={item.id}
                                                justify="space-between"
                                                align="center"
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: 6,
                                                    backgroundColor: token.colorBgLayout,
                                                    border: `1px solid ${token.colorBorderSecondary}`,
                                                }}
                                            >
                                                <Text style={{ fontSize: 11 }}>{item.name}</Text>
                                                <Text type="secondary" style={{ fontSize: 10 }}>
                                                    {item.price ? formatMenuPrice(item.price, currencySymbol) : 'No price'}
                                                </Text>
                                            </Flex>
                                        ))}
                                    </Flex>
                                </Panel>
                            ))}
                        </Collapse>
                    </Flex>
                )}
            </Flex>
        );
    }

    return null;
}
