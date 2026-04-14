'use client'

import { getFeedbackList, updateFeedbackStatus } from '@database/guestFeedback';
import { getFeedbackUrl } from '@lib/utils/feedbackQrCode';
import { buildQrCodeFilename } from '@lib/utils/qrCode';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useCallback, useContext, useEffect, useState } from 'react';
import { LuCopy, LuExternalLink, LuQrCode, LuStar } from 'react-icons/lu';
import { Button, Card, DotLoading, Empty, Flex, List, NavBar, PullToRefresh, Tabs, Tag, Text, Title, Toast } from '../antd';
import MobileQrCodeSheet from '../components/MobileQrCodeSheet';
import MobileScreenIntro from '../components/MobileScreenIntro';
import { useMobileProjects } from '../providers/MobileProjectsProvider';
import type { MobileFeedbackItemType as FeedbackItem } from '../types';

const MobileFeedbackDetail = dynamic(() => import('./MobileFeedbackDetail'), { ssr: false });

interface MobileFeedbackScreenProps {
    onBack?: () => void;
}

const DEFAULT_FEEDBACK_FILTER: 'all' | 'needs_attention' | 'resolved' = 'all';

const FEEDBACK_LIST_CARD_STYLE = {
    borderRadius: 20,
    overflow: 'hidden' as const,
};

export default function MobileFeedbackScreen({ onBack }: MobileFeedbackScreenProps) {
    const t = useTranslations('FeedbackInbox');
    const { token } = theme.useToken();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const { selectedProjectId } = useMobileProjects();
    const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
    const [filter, setFilter] = useState<'all' | 'needs_attention' | 'resolved'>(DEFAULT_FEEDBACK_FILTER);
    const [isQrOpen, setIsQrOpen] = useState(false);

    const fetchFeedback = useCallback(async (targetFilter = filter) => {
        try {
            setIsLoading(true);
            const result = await getFeedbackList(targetFilter, 50);
            const items: FeedbackItem[] = (result?.items || []).map((fb: any) => ({
                createdAt: fb.createdOn?.toDate?.()?.toLocaleDateString?.() || '',
                customerName: fb.customerName || 'Anonymous',
                email: fb.customerEmail || '',
                id: fb.id || fb.feedbackId,
                message: fb.message || '',
                needsAttention: fb.needsAttention || false,
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
    }, [filter]);

    useEffect(() => {
        if (storeDetails?.storeId) {
            void fetchFeedback();
        }
    }, [fetchFeedback, storeDetails?.storeId]);

    const handleStatusUpdate = useCallback((feedbackId: string, newStatus: 'new' | 'resolved') => {
        setFeedbackList((previous) => previous.map((item) => item.id === feedbackId ? { ...item, status: newStatus } : item));
        Toast.show({ content: newStatus === 'resolved' ? t('resolved') : t('new'), duration: 1000 });
    }, [t]);

    const handleQuickResolve = useCallback(async (feedbackId: string) => {
        handleStatusUpdate(feedbackId, 'resolved');
        try {
            await updateFeedbackStatus(feedbackId, 'resolved');
        } catch {
            Toast.show({ content: t('failedToUpdate'), duration: 1500 });
        }
    }, [handleStatusUpdate, t]);

    const handleOpenQr = () => {
        if (!selectedProjectId) {
            Toast.show({ content: t('noFeedback'), duration: 1500 });
            return;
        }
        setIsQrOpen(true);
    };

    const feedbackUrl = selectedProjectId ? getFeedbackUrl(selectedProjectId) : '';

    const handleCopyFeedbackLink = async () => {
        if (!feedbackUrl) return;
        try {
            await navigator.clipboard.writeText(feedbackUrl);
            Toast.show({ content: t('linkCopied'), duration: 1500 });
        } catch {
            Toast.show({ content: t('failedToUpdate'), duration: 1500 });
        }
    };

    const handleOpenFeedbackLink = () => {
        if (!feedbackUrl) return;
        window.open(feedbackUrl, '_blank', 'noopener,noreferrer');
    };

    const stars = (rating: number) => (
        <Flex align="center" gap={2}>
            {[1, 2, 3, 4, 5].map((star) => (
                <LuStar color={star <= rating ? '#fbbf24' : '#d1d5db'} fill={star <= rating ? '#fbbf24' : 'none'} key={star} size={14} />
            ))}
        </Flex>
    );

    const getInitials = (name?: string) => {
        const trimmedName = name?.trim();
        if (!trimmedName) return 'A';
        const parts = trimmedName.split(/\s+/).filter(Boolean);
        return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
    };

    const badge = (status: string, needsAttention?: boolean) => {
        if (needsAttention) return <Tag color="warning">{t('needsAttention')}</Tag>;
        if (status === 'new') return <Tag color="primary">{t('new')}</Tag>;
        if (status === 'resolved') return <Tag color="success">{t('resolved')}</Tag>;
        return <Tag color="default">{t('new')}</Tag>;
    };

    if (selectedFeedback) {
        return <MobileFeedbackDetail feedback={selectedFeedback} onBack={() => setSelectedFeedback(null)} onStatusUpdate={handleStatusUpdate} />;
    }

    if (isLoading) {
        return (
            <Flex style={{ minHeight: '100%' }} vertical>
                {onBack ? <NavBar onBack={onBack} /> : null}
                <Flex align="center" flex={1} justify="center">
                    <DotLoading color="primary" />
                </Flex>
            </Flex>
        );
    }

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            {onBack ? <NavBar onBack={onBack} /> : null}
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <MobileScreenIntro
                    subtitle={t('subtitle')}
                    title={t('title')}
                />

                <Card style={{ borderRadius: 20 }}>
                    <Flex gap={12} vertical>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={10}>
                                <Flex
                                    align="center"
                                    justify="center"
                                    style={{
                                        background: '#ecfeff',
                                        borderRadius: 12,
                                        color: '#0891b2',
                                        height: 40,
                                        width: 40,
                                    }}
                                >
                                    <LuQrCode size={18} />
                                </Flex>
                                <Flex gap={2} vertical>
                                    <Text strong>{t('feedbackQrTitle')}</Text>
                                    <Text type="secondary">{t('feedbackQrDesc')}</Text>
                                </Flex>
                            </Flex>
                            <Button
                                fill="none"
                                onClick={handleOpenFeedbackLink}
                                size="small"
                                style={{ minHeight: 36, minWidth: 36, paddingInline: 0 }}
                            >
                                <LuExternalLink size={16} />
                            </Button>
                        </Flex>
                        <Flex gap={8}>
                            <Button fill="outline" onClick={handleCopyFeedbackLink} size="small" style={{ flex: 1 }}>
                                <Flex align="center" gap={6} justify="center">
                                    <LuCopy size={14} />
                                    <Text>{t('copyLink')}</Text>
                                </Flex>
                            </Button>
                            <Button onClick={handleOpenQr} size="small" style={{ flex: 1 }}>
                                {t('showQr')}
                            </Button>
                        </Flex>
                    </Flex>
                </Card>

                <Card style={FEEDBACK_LIST_CARD_STYLE}>
                    <Flex gap={12} vertical>
                        <Tabs activeKey={filter} onChange={(key) => { setFilter(key as any); void fetchFeedback(key as any); }}>
                            <Tabs.Tab key="all" title={t('all')} />
                            <Tabs.Tab key="needs_attention" title={t('needsAttention')} />
                            <Tabs.Tab key="resolved" title={t('resolved')} />
                        </Tabs>
                        <PullToRefresh onRefresh={() => fetchFeedback()}>
                            {feedbackList.length === 0 ? (
                                <Empty description={t('noFeedback')} />
                            ) : (
                                <List>
                                    {feedbackList.map((feedback) => (
                                        <List.Item
                                            arrow
                                            description={(
                                                <Flex gap={8} vertical>
                                                    <Flex align="center" gap={8}>
                                                        {stars(feedback.rating)}
                                                        <Text type="secondary">{feedback.createdAt}</Text>
                                                    </Flex>
                                                    <Text
                                                        style={{
                                                            color: token.colorTextSecondary,
                                                            display: '-webkit-box',
                                                            overflow: 'hidden',
                                                            WebkitBoxOrient: 'vertical',
                                                            WebkitLineClamp: 2,
                                                        }}
                                                    >
                                                        {feedback.message || t('noFeedback')}
                                                    </Text>
                                                </Flex>
                                            )}
                                            extra={feedback.status !== 'resolved' ? (
                                                <Button
                                                    fill="outline"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        void handleQuickResolve(feedback.id);
                                                    }}
                                                    size="small"
                                                    style={{ borderColor: '#16a34a', color: '#16a34a', flexShrink: 0 }}
                                                >
                                                    {t('resolved')}
                                                </Button>
                                            ) : null}
                                            key={feedback.id}
                                            onClick={() => setSelectedFeedback(feedback)}
                                            prefix={(
                                                <Flex
                                                    align="center"
                                                    justify="center"
                                                    style={{
                                                        background: feedback.needsAttention ? '#fff7ed' : '#eff6ff',
                                                        borderRadius: 14,
                                                        color: feedback.needsAttention ? '#ea580c' : '#2563eb',
                                                        fontSize: 13,
                                                        fontWeight: 700,
                                                        height: 40,
                                                        width: 40,
                                                    }}
                                                >
                                                    {getInitials(feedback.customerName)}
                                                </Flex>
                                            )}
                                            title={(
                                                <Flex align="center" justify="space-between" style={{ gap: 12 }}>
                                                    <Text strong style={{ color: token.colorText }}>{feedback.customerName || 'Anonymous'}</Text>
                                                    {badge(feedback.status, feedback.needsAttention)}
                                                </Flex>
                                            )}
                                        />
                                    ))}
                                </List>
                            )}
                        </PullToRefresh>
                    </Flex>
                </Card>
            </Flex>

            <MobileQrCodeSheet
                copyErrorMessage={t('failedToUpdate')}
                copySuccessMessage={t('linkCopied')}
                downloadSuccessMessage={t('qrDownloaded')}
                filename={buildQrCodeFilename(storeDetails?.name || 'feedback', 'feedback-qr')}
                generatingLabel={t('generatingQr')}
                helperText={t('feedbackQrTip')}
                imageAlt={t('feedbackQrTitle')}
                onClose={() => setIsQrOpen(false)}
                qrErrorMessage={t('failedToUpdate')}
                title={t('feedbackQrTitle')}
                url={feedbackUrl}
                visible={isQrOpen}
            />
        </Flex>
    );
}
