'use client';

import { TimeSlotPreset } from '@type/platform/store';
import { Badge, Button, Divider, Flex, InputNumber, Popover, Select, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { LuFilter, LuX } from 'react-icons/lu';

const { Text } = Typography;

export interface EditorFilters {
    category: string | null;
    priceRange: { min: number | null; max: number | null };
    hasImage: boolean | null;
    activeStatus: boolean | null;
    timeSlotPreset: string | null; // Filter by assigned time slot preset ID
}

interface EditorFiltersPopoverProps {
    categories: { id: string; name: Record<string, string> }[];
    activeLanguage: string;
    filters: EditorFilters;
    onFiltersChange: (filters: EditorFilters) => void;
    showItemPrices?: boolean;
    timeSlotPresets?: TimeSlotPreset[]; // Store-level time slot presets
}

/**
 * EditorFiltersPopover Component
 * 
 * User-friendly filter popover for Editor view
 * 
 * Features:
 * - Category filter (dropdown)
 * - Price range filter (min/max inputs)
 * - Has image filter (Yes/No/All)
 * - Active status filter (Active/Inactive/All)
 * - Clear all filters button
 * - Badge showing active filter count
 * 
 * @see ASSESSMENT-06-UX-USABILITY.md Task 17: Search/Filter in Editor Lists
 */
export default function EditorFiltersPopover({
    categories,
    activeLanguage,
    filters,
    onFiltersChange,
    showItemPrices = true,
    timeSlotPresets = []
}: EditorFiltersPopoverProps) {
    const [open, setOpen] = useState(false);
    const [localFilters, setLocalFilters] = useState<EditorFilters>(filters);
    const effectiveFilters = useMemo<EditorFilters>(() => (
        showItemPrices
            ? filters
            : { ...filters, priceRange: { min: null, max: null } }
    ), [filters, showItemPrices]);
    const effectiveLocalFilters = showItemPrices
        ? localFilters
        : { ...localFilters, priceRange: { min: null, max: null } };

    useEffect(() => {
        if (
            showItemPrices ||
            (filters.priceRange.min === null && filters.priceRange.max === null)
        ) {
            return;
        }

        onFiltersChange({
            ...filters,
            priceRange: { min: null, max: null },
        });
        setLocalFilters((prev) => ({
            ...prev,
            priceRange: { min: null, max: null },
        }));
    }, [filters, onFiltersChange, showItemPrices]);

    // Count applied filters (from props, not local state)
    // Badge should only show count of filters that are actually applied
    const appliedFilterCount = [
        effectiveFilters.category !== null,
        showItemPrices && (effectiveFilters.priceRange.min !== null || effectiveFilters.priceRange.max !== null),
        effectiveFilters.hasImage !== null,
        effectiveFilters.activeStatus !== null,
        effectiveFilters.timeSlotPreset !== null,
    ].filter(Boolean).length;

    // Count pending filters in local state (for Apply button)
    const pendingFilterCount = [
        effectiveLocalFilters.category !== null,
        showItemPrices && (effectiveLocalFilters.priceRange.min !== null || effectiveLocalFilters.priceRange.max !== null),
        effectiveLocalFilters.hasImage !== null,
        effectiveLocalFilters.activeStatus !== null,
        effectiveLocalFilters.timeSlotPreset !== null,
    ].filter(Boolean).length;

    const handleApply = () => {
        onFiltersChange(effectiveLocalFilters);
        setOpen(false);
    };

    const handleClearAll = () => {
        const clearedFilters: EditorFilters = {
            category: null,
            priceRange: { min: null, max: null },
            hasImage: null,
            activeStatus: null,
            timeSlotPreset: null,
        };
        setLocalFilters(clearedFilters);
        onFiltersChange(clearedFilters);
    };

    const filterContent = (
        <Flex vertical gap={16} style={{ width: 280 }}>
            {/* Header */}
            <Flex justify="space-between" align="center">
                <Text strong style={{ fontSize: 16 }}>Filters</Text>
            </Flex>

            <Divider style={{ margin: 0 }} />

            {/* Category Filter */}
            <Flex vertical gap={8}>
                <Text strong style={{ fontSize: 13 }}>Category</Text>
                <Select
                    placeholder="All categories"
                    allowClear
                    value={localFilters.category}
                    onChange={(value) => setLocalFilters({ ...localFilters, category: value || null })}
                    style={{ width: '100%' }}
                    options={[
                        ...categories.map(cat => ({
                            label: cat.name[activeLanguage] || Object.values(cat.name)[0],
                            value: cat.id
                        }))
                    ]}
                />
            </Flex>

            <Divider style={{ margin: 0 }} />

            {/* Price Range Filter */}
            {showItemPrices ? (
                <>
                    <Flex vertical gap={8}>
                        <Text strong style={{ fontSize: 13 }}>Price Range</Text>
                        <Flex gap={8} align="center">
                            <InputNumber
                                placeholder="Min"
                                min={0}
                                value={localFilters.priceRange.min}
                                onChange={(value) => setLocalFilters({
                                    ...localFilters,
                                    priceRange: { ...localFilters.priceRange, min: value }
                                })}
                                style={{ width: '100%' }}
                                prefix="$"
                            />
                            <Text type="secondary">to</Text>
                            <InputNumber
                                placeholder="Max"
                                min={0}
                                value={localFilters.priceRange.max}
                                onChange={(value) => setLocalFilters({
                                    ...localFilters,
                                    priceRange: { ...localFilters.priceRange, max: value }
                                })}
                                style={{ width: '100%' }}
                                prefix="$"
                            />
                        </Flex>
                    </Flex>

                    <Divider style={{ margin: 0 }} />
                </>
            ) : null}

            {/* Has Image Filter */}
            <Flex vertical gap={8}>
                <Text strong style={{ fontSize: 13 }}>Images</Text>
                <Select
                    placeholder="All items"
                    allowClear
                    value={localFilters.hasImage}
                    onChange={(value) => setLocalFilters({ ...localFilters, hasImage: value ?? null })}
                    style={{ width: '100%' }}
                    options={[
                        { label: 'Has image', value: true },
                        { label: 'No image', value: false },
                    ]}
                />
            </Flex>

            <Divider style={{ margin: 0 }} />

            {/* Active Status Filter */}
            <Flex vertical gap={8}>
                <Text strong style={{ fontSize: 13 }}>Status</Text>
                <Select
                    placeholder="All statuses"
                    allowClear
                    value={localFilters.activeStatus}
                    onChange={(value) => setLocalFilters({ ...localFilters, activeStatus: value ?? null })}
                    style={{ width: '100%' }}
                    options={[
                        { label: 'Active', value: true },
                        { label: 'Inactive', value: false },
                    ]}
                />
            </Flex>

            {/* Time Slot Preset Filter - only show if presets exist */}
            {timeSlotPresets.length > 0 && (
                <>
                    <Divider style={{ margin: 0 }} />
                    <Flex vertical gap={8}>
                        <Text strong style={{ fontSize: 13 }}>Time Slot</Text>
                        <Select
                            placeholder="All time slots"
                            allowClear
                            value={localFilters.timeSlotPreset}
                            onChange={(value) => setLocalFilters({ ...localFilters, timeSlotPreset: value ?? null })}
                            style={{ width: '100%' }}
                            options={[
                                { label: 'No time slot assigned', value: 'none' },
                                ...timeSlotPresets.map(preset => ({
                                    label: preset.label,
                                    value: preset.id
                                }))
                            ]}
                        />
                    </Flex>
                </>
            )}

            <Divider style={{ margin: 0 }} />

            {/* Footer Buttons */}
            <Flex gap={8}>
                {pendingFilterCount > 0 && (
                    <Button
                        type="text"
                        icon={<LuX />}
                        onClick={handleClearAll}
                    >
                        Clear All
                    </Button>
                )}
                <Button
                    type="primary"
                    block
                    onClick={handleApply}
                >
                    Apply Filters
                    {pendingFilterCount > 0 && ` (${pendingFilterCount})`}
                </Button>
            </Flex>
        </Flex>
    );

    return (
        <Popover
            content={filterContent}
            title={null}
            trigger="click"
            open={open}
            onOpenChange={setOpen}
            placement="bottomRight"
        >
            <Badge count={appliedFilterCount} offset={[-5, 5]}>
                <Button
                    icon={<LuFilter />}
                    type={appliedFilterCount > 0 ? 'primary' : 'default'}
                >
                    Filters
                </Button>
            </Badge>
        </Popover>
    );
}
