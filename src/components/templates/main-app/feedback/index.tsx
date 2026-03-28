'use client';

/**
 * FeedbackInbox Page Component
 * 
 * Main dashboard page for viewing and managing guest feedback.
 * Uses client-side Firebase via DAL pattern.
 * 
 * @see __docs__/projects/internal-feedback-system/
 */

import { getFeedbackCount, getFeedbackList, updateFeedbackStatus } from '@database/guestFeedback';
import { useAppDispatch } from '@hook/useAppDispatch';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { GuestFeedback, GuestFeedbackFilter } from '@type/guestFeedback';
import { Empty, Spin, notification } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { FeedbackCard } from './FeedbackCard';
import { FeedbackFilters } from './FeedbackFilters';
import { FeedbackQrDownload } from './FeedbackQrDownload';

interface FeedbackInboxProps {
    /** Project ID for QR code generation */
    projectId?: string;
    /** Store name for display */
    storeName?: string;
}

export const FeedbackInbox: React.FC<FeedbackInboxProps> = ({
    projectId,
    storeName,
}) => {
    const dispatch = useAppDispatch();

    const [feedbackItems, setFeedbackItems] = useState<GuestFeedback[]>([]);
    const [filter, setFilter] = useState<GuestFeedbackFilter>('all');
    const [needsAttentionCount, setNeedsAttentionCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [lastDocId, setLastDocId] = useState<string | null>(null);

    const fetchFeedback = useCallback(async (loadMore = false, cursorId?: string | null) => {
        if (loadMore) {
            setIsLoadingMore(true);
        } else {
            dispatch(startLoader('feedbackInbox'));
            setIsLoading(true);
        }

        try {
            // Call DAL directly - session handled internally by DAL
            const result = await getFeedbackList(filter, 50, cursorId || undefined);

            if (loadMore) {
                setFeedbackItems(prev => [...prev, ...result.items]);
            } else {
                setFeedbackItems(result.items);
                // Get needs attention count for badge
                const count = await getFeedbackCount('needs_attention');
                setNeedsAttentionCount(count);
            }
            setHasMore(result.hasMore);
            setLastDocId(result.lastDocId);
        } catch (error) {
            console.error('[FeedbackInbox] Fetch error:', error);
            notification.error({
                message: 'Error',
                description: 'Failed to load feedback',
            });
        } finally {
            if (loadMore) {
                setIsLoadingMore(false);
            } else {
                dispatch(stopLoader('feedbackInbox'));
                setIsLoading(false);
            }
        }
    }, [filter, dispatch]);

    useEffect(() => {
        setLastDocId(null);
        fetchFeedback(false, null);
    }, [filter]);

    const handleStatusUpdate = async (feedbackId: string, status: 'new' | 'resolved') => {
        try {
            // Call DAL directly - session handled internally by DAL
            const updated = await updateFeedbackStatus(feedbackId, status);

            if (updated) {
                // Update local state
                setFeedbackItems(prev =>
                    prev.map(item =>
                        item.id === feedbackId
                            ? { ...item, status, needsAttention: updated.needsAttention, modifiedOn: updated.modifiedOn }
                            : item
                    )
                );

                // Update needs attention count
                const updatedItem = feedbackItems.find(f => f.id === feedbackId);
                if (updatedItem && updatedItem.rating <= 3) {
                    if (status === 'resolved') {
                        setNeedsAttentionCount(prev => Math.max(0, prev - 1));
                    } else {
                        setNeedsAttentionCount(prev => prev + 1);
                    }
                }

                notification.success({
                    message: status === 'resolved' ? 'Marked as resolved' : 'Marked as new',
                    duration: 2,
                });
            } else {
                throw new Error('Feedback not found or access denied');
            }
        } catch (error) {
            console.error('[FeedbackInbox] Update error:', error);
            notification.error({
                message: 'Error',
                description: 'Failed to update feedback',
            });
            throw error;
        }
    };

    const handleFilterChange = (newFilter: GuestFeedbackFilter) => {
        setFilter(newFilter);
    };

    return (
        <div className="feedback-inbox p-4 md:p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Guest Feedback
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Private feedback from your guests
                    </p>
                </div>

                {/* QR Code Download */}
                {projectId && (
                    <FeedbackQrDownload
                        projectId={projectId}
                        storeName={storeName}
                    />
                )}
            </div>

            {/* Filters */}
            <div className="mb-6">
                <FeedbackFilters
                    value={filter}
                    onChange={handleFilterChange}
                    needsAttentionCount={needsAttentionCount}
                    disabled={isLoading}
                />
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Spin size="large" />
                </div>
            ) : feedbackItems.length === 0 ? (
                <Empty
                    description={
                        filter === 'all'
                            ? 'No feedback yet'
                            : filter === 'needs_attention'
                                ? 'No feedback needs attention'
                                : 'No resolved feedback'
                    }
                    className="py-12"
                />
            ) : (
                <div className="space-y-4">
                    {feedbackItems.map((feedback) => (
                        <FeedbackCard
                            key={feedback.id}
                            feedback={feedback}
                            onStatusUpdate={handleStatusUpdate}
                            storeName={storeName}
                        />
                    ))}

                    {hasMore && (
                        <div className="text-center py-4">
                            <button
                                className="text-blue-600 hover:underline text-sm disabled:opacity-50"
                                onClick={() => fetchFeedback(true, lastDocId)}
                                disabled={isLoadingMore}
                            >
                                {isLoadingMore ? 'Loading...' : 'Load more'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FeedbackInbox;
