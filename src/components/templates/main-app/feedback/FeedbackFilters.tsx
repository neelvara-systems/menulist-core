'use client';

/**
 * FeedbackFilters Component
 * 
 * Filter controls for the feedback inbox.
 * 
 * @see __docs__/projects/internal-feedback-system/
 */

import React from 'react';
import { Radio, Badge } from 'antd';
import { GuestFeedbackFilter } from '@type/guestFeedback';

interface FeedbackFiltersProps {
    /** Current filter value */
    value: GuestFeedbackFilter;
    /** Callback when filter changes */
    onChange: (filter: GuestFeedbackFilter) => void;
    /** Count of items needing attention (for badge) */
    needsAttentionCount?: number;
    /** Disable interaction */
    disabled?: boolean;
}

export const FeedbackFilters: React.FC<FeedbackFiltersProps> = ({
    value,
    onChange,
    needsAttentionCount = 0,
    disabled = false,
}) => {
    return (
        <Radio.Group
            value={value}
            onChange={(e) => onChange(e.target.value)}
            buttonStyle="solid"
            disabled={disabled}
            className="feedback-filters"
        >
            <Radio.Button value="all">All</Radio.Button>
            <Radio.Button value="needs_attention">
                <span className="flex items-center gap-2">
                    Needs Attention
                    {needsAttentionCount > 0 && (
                        <Badge 
                            count={needsAttentionCount} 
                            size="small"
                            style={{ 
                                backgroundColor: '#ff4d4f',
                                boxShadow: 'none',
                            }}
                        />
                    )}
                </span>
            </Radio.Button>
            <Radio.Button value="resolved">Resolved</Radio.Button>
        </Radio.Group>
    );
};

export default FeedbackFilters;
