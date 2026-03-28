'use client';

import { ADMIN_PRIORITY_OPTIONS, ADMIN_QUALITY_OPTIONS, ADMIN_STATUS_OPTIONS, ADMIN_TAG_OPTIONS, ConversationFilters } from '@type/chatSession';
import { Button, Checkbox, DatePicker, Divider, Flex, Select, Space, Typography } from 'antd';
import { useState } from 'react';
import { LuDownload } from 'react-icons/lu';

const { RangePicker } = DatePicker;
const { Text } = Typography;

// Default filter values
const DEFAULT_FILTERS: ConversationFilters = {
    mode: 'all',
    feedback: 'all',
    status: 'all',
    priority: 'all',
    quality: 'all',
    tags: [],
    hasNotes: false,
    isUnread: false,
    dateRange: null
};

interface ConversationFiltersPopoverProps {
    initialFilters?: ConversationFilters; // Optional: restore previous filters
    onFiltersChange: (filters: ConversationFilters, activeCount: number) => void;
    onExport?: () => void;
    onClose?: () => void;
}

/**
 * ConversationFiltersPopover Component
 * Compact popover content for filtering conversations
 * Manages all filter state internally and exposes via callback
 */
function ConversationFiltersPopover({
    initialFilters = DEFAULT_FILTERS,
    onFiltersChange,
    onExport,
    onClose
}: ConversationFiltersPopoverProps) {
    // Manage ALL filter state internally
    const [filters, setFilters] = useState<ConversationFilters>(initialFilters);

    // Calculate active filter count
    const activeFilterCount = [
        filters.mode !== 'all',
        filters.feedback !== 'all',
        filters.status !== 'all',
        filters.priority !== 'all',
        filters.quality !== 'all',
        filters.tags.length > 0,
        filters.hasNotes,
        filters.isUnread,
        filters.dateRange !== null
    ].filter(Boolean).length;

    // Update filters and notify parent
    const updateFilters = (newFilters: Partial<ConversationFilters>) => {
        const updated = { ...filters, ...newFilters };
        setFilters(updated);
        // Compute count from updated filters (not stale activeFilterCount)
        const updatedCount = [
            updated.mode !== 'all',
            updated.feedback !== 'all',
            updated.status !== 'all',
            updated.priority !== 'all',
            updated.quality !== 'all',
            updated.tags.length > 0,
            updated.hasNotes,
            updated.isUnread,
            updated.dateRange !== null
        ].filter(Boolean).length;
        onFiltersChange(updated, updatedCount);
    };

    // Clear all filters
    const handleClear = () => {
        setFilters(DEFAULT_FILTERS);
        onFiltersChange(DEFAULT_FILTERS, 0);
        onClose?.();
    };
    return (
        <div style={{ width: 600, maxWidth: '90vw' }}>
            {/* Two-column grid for filters */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px 12px',
                marginBottom: 12
            }}>
                {/* Chat Type Filter */}
                <div>
                    <Text strong style={{ fontSize: 12, color: '#8c8c8c', display: 'block', marginBottom: 8 }}>
                        CHAT TYPE
                    </Text>
                    <Select
                        style={{ width: '100%' }}
                        value={filters.mode}
                        onChange={(value) => updateFilters({ mode: value })}
                        options={[
                            { label: 'All Types', value: 'all' },
                            { label: 'Quick Answers', value: 'qna' },
                            { label: 'Chats', value: 'assistant' }
                        ]}
                    />
                </div>

                {/* Feedback Filter */}
                <div>
                    <Text strong style={{ fontSize: 12, color: '#8c8c8c', display: 'block', marginBottom: 8 }}>
                        FEEDBACK
                    </Text>
                    <Select
                        style={{ width: '100%' }}
                        value={filters.feedback}
                        onChange={(value) => updateFilters({ feedback: value })}
                        options={[
                            { label: 'All Feedback', value: 'all' },
                            { label: '👍 Helpful', value: 'positive' },
                            { label: '👎 Not Helpful', value: 'negative' },
                            { label: 'No Feedback', value: 'none' }
                        ]}
                    />
                </div>

                {/* Status Filter */}
                <div>
                    <Text strong style={{ fontSize: 12, color: '#8c8c8c', display: 'block', marginBottom: 8 }}>
                        STATUS
                    </Text>
                    <Select
                        style={{ width: '100%' }}
                        value={filters.status}
                        onChange={(value) => updateFilters({ status: value })}
                        options={[
                            { label: 'All Status', value: 'all' },
                            ...ADMIN_STATUS_OPTIONS
                        ]}
                    />
                </div>

                {/* Priority Filter */}
                <div>
                    <Text strong style={{ fontSize: 12, color: '#8c8c8c', display: 'block', marginBottom: 8 }}>
                        PRIORITY
                    </Text>
                    <Select
                        style={{ width: '100%' }}
                        value={filters.priority}
                        onChange={(value) => updateFilters({ priority: value })}
                        options={[
                            { label: 'All Priority', value: 'all' },
                            ...ADMIN_PRIORITY_OPTIONS
                        ]}
                    />
                </div>

                {/* Quality Filter */}
                <div>
                    <Text strong style={{ fontSize: 12, color: '#8c8c8c', display: 'block', marginBottom: 8 }}>
                        AI QUALITY
                    </Text>
                    <Select
                        style={{ width: '100%' }}
                        value={filters.quality}
                        onChange={(value) => updateFilters({ quality: value })}
                        options={[
                            { label: 'All Quality', value: 'all' },
                            ...ADMIN_QUALITY_OPTIONS
                        ]}
                    />
                </div>

                {/* Tags Filter */}
                <div>
                    <Text strong style={{ fontSize: 12, color: '#8c8c8c', display: 'block', marginBottom: 8 }}>
                        TAGS
                    </Text>
                    <Select
                        mode="multiple"
                        style={{ width: '100%' }}
                        placeholder="Select tags..."
                        value={filters.tags}
                        onChange={(value) => updateFilters({ tags: value })}
                        options={ADMIN_TAG_OPTIONS.map(tag => ({ label: tag, value: tag }))}
                        maxTagCount="responsive"
                    />
                </div>

                {/* Special Filters */}
                <div>
                    <Text strong style={{ fontSize: 12, color: '#8c8c8c', display: 'block', marginBottom: 8 }}>
                        SPECIAL FILTERS
                    </Text>
                    <Space direction="vertical" size={8}>
                        <Checkbox
                            checked={filters.hasNotes}
                            onChange={(e) => updateFilters({ hasNotes: e.target.checked })}
                        >
                            Has Internal Notes
                        </Checkbox>
                        <Checkbox
                            checked={filters.isUnread}
                            onChange={(e) => updateFilters({ isUnread: e.target.checked })}
                        >
                            Unread Conversations
                        </Checkbox>
                    </Space>
                </div>

                {/* Date Range Filter */}
                <div>
                    <Text strong style={{ fontSize: 12, color: '#8c8c8c', display: 'block', marginBottom: 8 }}>
                        DATE RANGE
                    </Text>
                    <RangePicker
                        style={{ width: '100%' }}
                        value={filters.dateRange}
                        onChange={(value) => updateFilters({ dateRange: value })}
                        format="MMM DD"
                        placeholder={['Start', 'End']}
                    />
                </div>
            </div>

            <Divider style={{ margin: '12px 0 8px' }} />

            {/* Actions - Single row with Export on left, Clear/Apply on right */}
            <Flex justify="space-between" align="center" gap={8}>
                {/* Export button on the left */}
                {onExport && (
                    <Button icon={<LuDownload size={14} />}
                        onClick={() => {
                            onExport();
                            onClose?.();
                        }}
                    >Export</Button>
                )}

                {/* Clear All and Apply on the right */}
                <Flex gap={8} style={{ marginLeft: 'auto' }}>
                    <Button onClick={handleClear}>Clear All</Button>
                    <Button type="primary" onClick={onClose}>Apply</Button>
                </Flex>
            </Flex>
        </div>
    );
}

export default ConversationFiltersPopover;
