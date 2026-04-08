'use client'

import { getFeedbackList, updateFeedbackStatus } from '@database/guestFeedback';
import { downloadQrCode, generateFeedbackQrCode, getFeedbackUrl, getQrCodeFilename } from '@lib/utils/feedbackQrCode';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useCallback, useContext, useEffect, useState } from 'react';
import { LuCopy, LuDownload, LuMessageSquare, LuQrCode, LuStar, LuX } from 'react-icons/lu';
import { Button, Card, DotLoading, Empty, Flex, Image, List, NavBar, Popup, PullToRefresh, Tabs, Tag, Text, Title, Toast } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';
import { useMobileProjects } from '../providers/MobileProjectsProvider';
import type { MobileFeedbackItemType as FeedbackItem } from '../types';

const MobileFeedbackDetail = dynamic(() => import('./MobileFeedbackDetail'), { ssr: false });

interface MobileFeedbackScreenProps {
    onBack?: () => void;
}

export default function MobileFeedbackScreen({ onBack }: MobileFeedbackScreenProps) {
    const t = useTranslations('FeedbackInbox');
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const { selectedProjectId } = useMobileProjects();
    const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
    const [filter, setFilter] = useState<'all' | 'needs_attention' | 'resolved'>('all');
    const [isQrOpen, setIsQrOpen] = useState(false);
    const [isQrLoading, setIsQrLoading] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

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

    const handleOpenQr = async () => {
        if (!selectedProjectId) {
            Toast.show({ content: t('noFeedback'), duration: 1500 });
            return;
        }
        setIsQrOpen(true);
        if (qrDataUrl || isQrLoading) return;
        setIsQrLoading(true);
        try {
            const dataUrl = await generateFeedbackQrCode(selectedProjectId);
            setQrDataUrl(dataUrl);
        } catch {
            Toast.show({ content: t('failedToUpdate'), duration: 1500 });
            setIsQrOpen(false);
        } finally {
            setIsQrLoading(false);
        }
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

    const handleDownloadQr = () => {
        if (!qrDataUrl || !storeDetails?.name) return;
        const filename = getQrCodeFilename(storeDetails.name);
        downloadQrCode(qrDataUrl, filename);
        Toast.show({ content: t('qrDownloaded'), duration: 1500 });
    };

    const stars = (rating: number) => (
        <Flex align="center" gap={2}>
            {[1, 2, 3, 4, 5].map((star) => (
                <LuStar color={star <= rating ? '#fbbf24' : '#d1d5db'} fill={star <= rating ? '#fbbf24' : 'none'} key={star} size={14} />
            ))}
        </Flex>
    );

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

                <Card>
                    <Tabs activeKey={filter} onChange={(key) => { setFilter(key as any); void fetchFeedback(key as any); }}>
                        <Tabs.Tab key="all" title={t('all')} />
                        <Tabs.Tab key="needs_attention" title={t('needsAttention')} />
                        <Tabs.Tab key="resolved" title={t('resolved')} />
                    </Tabs>
                </Card>

                <Card>
                    <Flex align="center" justify="space-between">
                        <Flex align="center" gap={8}>
                            <LuQrCode size={18} />
                            <Text strong>{t('feedbackQrTitle')}</Text>
                        </Flex>
                        <Flex gap={8}>
                            <Button fill="outline" onClick={handleCopyFeedbackLink} size="small">
                                <Flex align="center" gap={6}>
                                    <LuCopy size={14} />
                                    <Text>{t('copyLink')}</Text>
                                </Flex>
                            </Button>
                            <Button onClick={handleOpenQr} size="small">{t('showQr')}</Button>
                        </Flex>
                    </Flex>
                    <Text type="secondary">{t('feedbackQrDesc')}</Text>
                </Card>

                <PullToRefresh onRefresh={() => fetchFeedback()}>
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
                                        extra={feedback.status !== 'resolved' ? (
                                            <Button
                                                fill="outline"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    void handleQuickResolve(feedback.id);
                                                }}
                                                size="small"
                                                style={{ borderColor: '#16a34a', color: '#16a34a' }}
                                            >
                                                {t('resolved')}
                                            </Button>
                                        ) : null}
                                        key={feedback.id}
                                        onClick={() => setSelectedFeedback(feedback)}
                                        title={(
                                            <Flex align="center" justify="space-between">
                                                <Text strong>{feedback.customerName || 'Anonymous'}</Text>
                                                {badge(feedback.status, feedback.needsAttention)}
                                            </Flex>
                                        )}
                                    />
                                ))}
                            </List>
                        </Card>
                    )}
                </PullToRefresh>
            </Flex>

            <Popup
                bodyStyle={{ maxHeight: '70vh', overflow: 'hidden', padding: 0 }}
                onMaskClick={() => setIsQrOpen(false)}
                position="bottom"
                visible={isQrOpen}
            >
                <Flex style={{ height: '100%' }} vertical>
                    <NavBar backIcon={<LuX size={20} />} onBack={() => setIsQrOpen(false)}>
                        {t('feedbackQrTitle')}
                    </NavBar>

                    <Flex gap={12} style={{ overflowY: 'auto', padding: 12 }} vertical>
                        {isQrLoading ? (
                            <Flex align="center" gap={8} justify="center">
                            <DotLoading color="primary" />
                            <Text type="secondary">{t('generatingQr')}</Text>
                            </Flex>
                        ) : qrDataUrl ? (
                            <Flex align="center" gap={12} vertical>
                                <Card size="small">
                                    <Image alt="Feedback QR" preview={false} src={qrDataUrl} width={180} />
                                </Card>
                                <Flex gap={6} vertical>
                                    <Text type="secondary">{t('feedbackQrTip')}</Text>
                                </Flex>
                                {feedbackUrl ? <Text type="secondary">{feedbackUrl}</Text> : null}
                                <Flex gap={8}>
                                    <Button block fill="outline" onClick={handleCopyFeedbackLink}>
                                        <Flex align="center" gap={6}>
                                            <LuCopy size={14} />
                                            <Text>{t('copyLink')}</Text>
                                        </Flex>
                                    </Button>
                                    <Button block onClick={handleDownloadQr}>
                                        <Flex align="center" gap={6}>
                                            <LuDownload size={14} />
                                            <Text>{t('download')}</Text>
                                        </Flex>
                                    </Button>
                                </Flex>
                            </Flex>
                        ) : null}
                    </Flex>
                </Flex>
            </Popup>
        </Flex>
    );
}
