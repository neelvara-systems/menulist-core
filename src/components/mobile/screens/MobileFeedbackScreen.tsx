'use client'

import { getFeedbackList } from '@database/guestFeedback';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { DotLoading, Empty, List, PullToRefresh, Tag, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useCallback, useContext, useEffect, useState } from 'react';
import { LuMessageSquare, LuStar } from 'react-icons/lu';
import type { MobileFeedbackItemType as FeedbackItem } from '../types';

const MobileFeedbackDetail = dynamic(() => import('./MobileFeedbackDetail'), { ssr: false });

export default function MobileFeedbackScreen() {
    const t = useTranslations('FeedbackInbox');
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);

    // Fetch feedback using existing DAL
    const fetchFeedback = useCallback(async () => {
        try {
            setIsLoading(true);
            const result = await getFeedbackList('all', 50);
            const items: FeedbackItem[] = (result?.items || []).map((fb: any) => ({
                id: fb.id || fb.feedbackId,
                customerName: fb.customerName || 'Anonymous',
                rating: fb.rating || 0,
                message: fb.message || '',
                status: fb.status || 'new',
                createdAt: fb.createdOn?.toDate?.()?.toLocaleDateString?.() || '',
                email: fb.customerEmail || '',
                phone: fb.customerPhone || '',
            }));
            setFeedbackList(items);
        } catch (err) {
            console.error('Failed to load feedback:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (storeDetails?.storeId) {
            fetchFeedback();
        }
    }, [storeDetails?.storeId, fetchFeedback]);

    const handleRefresh = async () => {
        await fetchFeedback();
    };

    const handleStatusUpdate = useCallback((feedbackId: string, newStatus: 'new' | 'resolved') => {
        // Optimistic update (Law 8)
        setFeedbackList(prev =>
            prev.map(item =>
                item.id === feedbackId ? { ...item, status: newStatus } : item
            )
        );
        Toast.show({ content: newStatus === 'resolved' ? t('resolved') : t('new'), duration: 1000 });
    }, []);

    // Star rating display
    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <LuStar
                        key={star}
                        size={14}
                        className={star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                    />
                ))}
            </div>
        );
    };

    const statusBadge = (status: string) => {
        switch (status) {
            case 'new':
                return <Tag color="primary" fill="outline" style={{ fontSize: '11px' }}>{t('new')}</Tag>;
            case 'read':
                return <Tag color="default" fill="outline" style={{ fontSize: '11px' }}>Read</Tag>;
            case 'resolved':
                return <Tag color="success" fill="outline" style={{ fontSize: '11px' }}>{t('resolved')}</Tag>;
            default:
                return null;
        }
    };

    // If viewing detail, show detail screen
    if (selectedFeedback) {
        return (
            <MobileFeedbackDetail
                feedback={selectedFeedback}
                onBack={() => setSelectedFeedback(null)}
                onStatusUpdate={handleStatusUpdate}
            />
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <DotLoading color="primary" />
            </div>
        );
    }

    return (
        <div className="px-4 pt-3 pb-4">
            {/* Page Title */}
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <LuMessageSquare size={20} />
                {t('title')}
            </h1>

            <PullToRefresh onRefresh={handleRefresh}>
                {feedbackList.length === 0 ? (
                    <div className="pt-20">
                        <Empty description={t('noFeedback')} />
                    </div>
                ) : (
                    <List style={{ '--border-inner': '1px solid var(--adm-color-border, #eee)' } as React.CSSProperties}>
                        {feedbackList.map((feedback) => (
                            <List.Item
                                key={feedback.id}
                                onClick={() => setSelectedFeedback(feedback)}
                                title={
                                    <div className="flex items-center justify-between">
                                        <span className="text-[15px] font-medium text-gray-900 dark:text-gray-100">
                                            {feedback.customerName || 'Anonymous'}
                                        </span>
                                        {statusBadge(feedback.status)}
                                    </div>
                                }
                                description={
                                    <div className="space-y-1 mt-1">
                                        {renderStars(feedback.rating)}
                                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                            {feedback.message}
                                        </p>
                                        <span className="text-xs text-gray-400">
                                            {feedback.createdAt}
                                        </span>
                                    </div>
                                }
                                arrow
                                style={{ minHeight: '48px' }}
                            />
                        ))}
                    </List>
                )}
            </PullToRefresh>
        </div>
    );
}
