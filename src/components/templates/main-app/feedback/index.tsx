'use client';

/**
 * FeedbackInbox Page Component
 *
 * Main dashboard page for viewing and managing guest feedback.
 * Uses client-side Firebase via DAL pattern.
 *
 * @see __docs__/projects/internal-feedback-system/
 */

import {
    assertFeedbackCountLoadSucceeded,
    assertFeedbackListLoadSucceeded,
    assertFeedbackStatusUpdateSucceeded,
    getFeedbackCount,
    getFeedbackList,
    updateFeedbackStatus,
} from '@database/guestFeedback';
import { useAppDispatch } from '@hook/useAppDispatch';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { GuestFeedback, GuestFeedbackFilter } from '@type/guestFeedback';
import { Button, Card, Empty, Flex, Spin, Typography, theme, notification } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { FeedbackCard } from './FeedbackCard';
import { FeedbackFilters } from './FeedbackFilters';
import { FeedbackQrDownload } from './FeedbackQrDownload';
import { getBoundedFeedbackInboxStringContext, logFeedbackInboxFailure } from './feedbackInboxDiagnostics';

const { Title, Text, Paragraph } = Typography;

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
    const { token } = theme.useToken();

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
            assertFeedbackListLoadSucceeded(
                result,
                'feedback_inbox_list_load_rejected',
            );

            if (loadMore) {
                setFeedbackItems(prev => [...prev, ...result.items]);
            } else {
                setFeedbackItems(result.items);
                // Get needs attention count for badge
                const count = await getFeedbackCount('needs_attention');
                assertFeedbackCountLoadSucceeded(
                    count,
                    'feedback_inbox_count_load_rejected',
                );
                setNeedsAttentionCount(count);
            }
            setHasMore(result.hasMore);
            setLastDocId(result.lastDocId);
        } catch (error) {
            logFeedbackInboxFailure('feedback_inbox_load_failed', error, {
                ...getBoundedFeedbackInboxStringContext('projectId', projectId),
                ...getBoundedFeedbackInboxStringContext('filter', filter),
                ...getBoundedFeedbackInboxStringContext('cursorId', cursorId),
                loadMore,
            });
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
    }, [dispatch, filter, projectId]);

    useEffect(() => {
        setLastDocId(null);
        fetchFeedback(false, null);
    }, [fetchFeedback]);

    const handleStatusUpdate = async (feedbackId: string, status: 'new' | 'resolved') => {
        try {
            // Call DAL directly - session handled internally by DAL
            const updated = await updateFeedbackStatus(feedbackId, status);
            assertFeedbackStatusUpdateSucceeded(
                updated,
                feedbackId,
                status,
                'feedback_inbox_status_update_rejected',
            );

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
        } catch (error) {
            logFeedbackInboxFailure('feedback_inbox_status_update_failed', error, {
                ...getBoundedFeedbackInboxStringContext('feedbackId', feedbackId),
                ...getBoundedFeedbackInboxStringContext('projectId', projectId),
                ...getBoundedFeedbackInboxStringContext('status', status),
                visibleFeedbackCount: feedbackItems.length,
            });
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
        <div className="feedback-inbox p-4 md:p-6 mx-auto" style={{ maxWidth: 1180, width: '100%' }}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <Title level={3} style={{ color: token.colorText, margin: 0 }}>
                        Guest Feedback
                    </Title>
                    <Paragraph style={{ color: token.colorTextSecondary, margin: '4px 0 0' }}>
                        Private customer reports that help you keep the public menu correct.
                    </Paragraph>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
                <Card>
                    <Flex align="center" justify="space-between" gap={16} wrap="wrap" style={{ marginBottom: 20 }}>
                        <FeedbackFilters
                            value={filter}
                            onChange={handleFilterChange}
                            needsAttentionCount={needsAttentionCount}
                            disabled={isLoading}
                        />
                        <Text type="secondary">
                            {isLoading ? 'Loading feedback...' : `${feedbackItems.length} visible`}
                        </Text>
                    </Flex>

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
                        <div>
                            {feedbackItems.map((feedback) => (
                                <FeedbackCard
                                    key={feedback.id}
                                    feedback={feedback}
                                    onStatusUpdate={handleStatusUpdate}
                                    storeName={storeName}
                                />
                            ))}

                            {hasMore && (
                                <Flex justify="center" style={{ paddingTop: 16 }}>
                                    <Button
                                        onClick={() => fetchFeedback(true, lastDocId)}
                                        disabled={isLoadingMore}
                                        loading={isLoadingMore}
                                    >
                                        Load more
                                    </Button>
                                </Flex>
                            )}
                        </div>
                    )}
                </Card>

                <Flex vertical gap={16}>
                    <Card size="small">
                        <Flex vertical gap={4}>
                            <Text type="secondary">Needs attention</Text>
                            <Title level={3} style={{ margin: 0, color: needsAttentionCount > 0 ? token.colorError : token.colorText }}>
                                {needsAttentionCount}
                            </Title>
                            <Text type="secondary">
                                Low-rating feedback remains here until the owner marks it resolved.
                            </Text>
                        </Flex>
                    </Card>

                    {projectId ? (
                        <Card size="small" title="Feedback QR">
                            <Flex vertical gap={12}>
                                <Text type="secondary">
                                    Place this near tables, counters, bills, or packaging so customers can report issues privately.
                                </Text>
                                <FeedbackQrDownload
                                    projectId={projectId}
                                    storeName={storeName}
                                />
                            </Flex>
                        </Card>
                    ) : null}

                    <Card size="small" title="How to use this inbox">
                        <Flex vertical gap={10}>
                            <Text>Review low ratings first.</Text>
                            <Text>Use phone or email only when the customer shared it.</Text>
                            <Text>Correct the approved menu source when feedback points to wrong prices, missing items, or old details.</Text>
                        </Flex>
                    </Card>
                </Flex>
            </div>
        </div>
    );
};

export default FeedbackInbox;
