'use client'

import { getFeedbackList } from '@database/guestFeedback';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useCallback, useContext, useEffect, useState } from 'react';
import { LuMessageSquare, LuStar } from 'react-icons/lu';
import { Card, DotLoading, Empty, Flex, List, PullToRefresh, Tag, Text, Title, Toast } from '../antd';
import type { MobileFeedbackItemType as FeedbackItem } from '../types';

const MobileFeedbackDetail = dynamic(() => import('./MobileFeedbackDetail'), { ssr: false });

export default function MobileFeedbackScreen() {
    const t = useTranslations('FeedbackInbox');
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);

    const fetchFeedback = useCallback(async () => {
        try {
            setIsLoading(true);
            const result = await getFeedbackList('all', 50);
            const items: FeedbackItem[] = (result?.items || []).map((fb: any) => ({
                createdAt: fb.createdOn?.toDate?.()?.toLocaleDateString?.() || '',
                customerName: fb.customerName || 'Anonymous',
                email: fb.customerEmail || '',
                id: fb.id || fb.feedbackId,
                message: fb.message || '',
                phone: fb.customerPhone || '',
                rating: fb.rating || 0,
                status: fb.status || 'new',
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
            void fetchFeedback();
        }
    }, [fetchFeedback, storeDetails?.storeId]);

    const handleStatusUpdate = useCallback((feedbackId: string, newStatus: 'new' | 'resolved') => {
        setFeedbackList((previous) => previous.map((item) => item.id === feedbackId ? { ...item, status: newStatus } : item));
        Toast.show({ content: newStatus === 'resolved' ? t('resolved') : t('new'), duration: 1000 });
    }, [t]);

    const stars = (rating: number) => (
        <Flex align="center" gap={2}>
            {[1, 2, 3, 4, 5].map((star) => (
                <LuStar color={star <= rating ? '#fbbf24' : '#d1d5db'} fill={star <= rating ? '#fbbf24' : 'none'} key={star} size={14} />
            ))}
        </Flex>
    );

    const badge = (status: string) => {
        if (status === 'new') return <Tag color="primary">{t('new')}</Tag>;
        if (status === 'resolved') return <Tag color="success">{t('resolved')}</Tag>;
        return <Tag color="default">Seen</Tag>;
    };

    if (selectedFeedback) {
        return <MobileFeedbackDetail feedback={selectedFeedback} onBack={() => setSelectedFeedback(null)} onStatusUpdate={handleStatusUpdate} />;
    }

    if (isLoading) {
        return (
            <Flex align="center" justify="center" style={{ minHeight: '100%' }}>
                <DotLoading color="primary" />
            </Flex>
        );
    }

    return (
        <Flex gap={12} style={{ padding: 16 }} vertical>
            <Card>
                <Flex align="center" gap={8}>
                    <LuMessageSquare size={20} />
                    <Title level={4} style={{ margin: 0 }}>{t('title')}</Title>
                </Flex>
            </Card>

            <PullToRefresh onRefresh={fetchFeedback}>
                {feedbackList.length === 0 ? (
                    <Card>
                        <Empty description={t('noFeedback')} />
                    </Card>
                ) : (
                    <Card>
                        <List>
                            {feedbackList.map((feedback) => (
                                <List.Item
                                    arrow
                                    description={(
                                        <Flex gap={6} vertical>
                                            {stars(feedback.rating)}
                                            <Text type="secondary">{feedback.message}</Text>
                                            <Text type="secondary">{feedback.createdAt}</Text>
                                        </Flex>
                                    )}
                                    key={feedback.id}
                                    onClick={() => setSelectedFeedback(feedback)}
                                    title={(
                                        <Flex align="center" justify="space-between">
                                            <Text strong>{feedback.customerName || 'Anonymous'}</Text>
                                            {badge(feedback.status)}
                                        </Flex>
                                    )}
                                />
                            ))}
                        </List>
                    </Card>
                )}
            </PullToRefresh>
        </Flex>
    );
}
