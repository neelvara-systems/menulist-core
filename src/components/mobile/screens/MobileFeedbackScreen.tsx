'use client'

import { getFeedbackList } from '@database/guestFeedback';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { getFeedbackUrl } from '@lib/utils/feedbackQrCode';
import { buildQrCodeFilename } from '@lib/utils/qrCode';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { theme } from 'antd';
import { useFormatter, useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useCallback, useContext, useEffect, useState } from 'react';
import { LuCopy, LuExternalLink, LuQrCode, LuShare2, LuStar } from 'react-icons/lu';
import { ProjectSelectorTrigger } from '../../shared/ProjectSelector';
import { Button, Card, DotLoading, Empty, Flex, List, PullToRefresh, Tabs, Tag, Text, Toast } from '../antd';
import MobileProjectSelectorSheet from '../components/MobileProjectSelectorSheet';
import MobileQrCodeSheet from '../components/MobileQrCodeSheet';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
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
    const common = useTranslations('Common');
    const { token } = theme.useToken();
    const format = useFormatter();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const { projectsList, selectedProjectId, selectedProjectSummary, selectProject } = useMobileProjects();
    const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
    const [filter, setFilter] = useState<'all' | 'needs_attention' | 'resolved'>(DEFAULT_FEEDBACK_FILTER);
    const [isQrOpen, setIsQrOpen] = useState(false);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [supportsNativeShare, setSupportsNativeShare] = useState(false);
    const publicBaseUrl = generateOBPUrl(
        storeDetails?.subdomain || '',
        storeDetails?.customDomain
    );

    const fetchFeedback = useCallback(async (targetFilter = filter) => {
        try {
            setIsLoading(true);
            const result = await getFeedbackList(targetFilter, 50);
            const items: FeedbackItem[] = (result?.items || []).map((fb: any) => ({
                createdAt: fb.createdOn?.toDate?.()?.toISOString?.() || '',
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

    useEffect(() => {
        setSupportsNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    }, []);

    const handleStatusUpdate = useCallback((feedbackId: string, newStatus: 'new' | 'resolved') => {
        setFeedbackList((previous) => previous.map((item) => item.id === feedbackId
            ? { ...item, needsAttention: newStatus === 'new' ? item.rating <= 3 : false, status: newStatus }
            : item
        ));
        Toast.show({ content: newStatus === 'resolved' ? t('resolved') : t('new'), duration: 1000 });
    }, [t]);

    const handleOpenQr = () => {
        if (!selectedProjectId) {
            Toast.show({ content: t('noFeedback'), duration: 1500 });
            return;
        }
        setIsQrOpen(true);
    };

    const feedbackUrl = selectedProjectId ? getFeedbackUrl(selectedProjectId, 'direct_link', publicBaseUrl) : '';
    const feedbackQrUrl = selectedProjectId ? getFeedbackUrl(selectedProjectId, 'feedback_qr', publicBaseUrl) : '';
    const feedbackEnabled = storeDetails?.feedbackEnabled !== false;
    const feedbackReady = feedbackEnabled && Boolean(selectedProjectId);

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

    const handleNativeShare = async () => {
        if (!feedbackUrl || typeof navigator === 'undefined' || typeof navigator.share !== 'function') return;

        try {
            await navigator.share({
                text: t('feedbackQrDesc'),
                title: t('feedbackQrTitle'),
                url: feedbackUrl,
            });
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            Toast.show({ content: t('failedToUpdate'), duration: 1500 });
        }
    };

    const stars = (rating: number) => (
        <Flex align="center" gap={2}>
            {[1, 2, 3, 4, 5].map((star) => (
                <LuStar
                    color={star <= rating ? token.colorWarning : token.colorTextDisabled}
                    fill={star <= rating ? token.colorWarning : 'none'}
                    key={star}
                    size={14}
                />
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
                {onBack ? (
                    <MobileSettingsScreenHeader
                        description={t('subtitle')}
                        onBack={onBack}
                        title={t('title')}
                    />
                ) : null}
                <Flex align="center" flex={1} justify="center">
                    <DotLoading color="primary" />
                </Flex>
            </Flex>
        );
    }

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            {onBack ? (
                <MobileSettingsScreenHeader
                    description={t('subtitle')}
                    onBack={onBack}
                    title={t('title')}
                />
            ) : null}
            <Flex gap={12} style={{ padding: 16, paddingTop: onBack ? 16 : 24 }} vertical>
                {projectsList.length > 1 && selectedProjectId ? (
                    <ProjectSelectorTrigger
                        clickable
                        currentProject={{
                            active: selectedProjectSummary?.active !== false,
                            deleted: selectedProjectSummary?.deleted === true,
                            id: selectedProjectId,
                            isDefault: selectedProjectSummary?.isDefault,
                            isSpecialMenu: selectedProjectSummary?.isSpecialMenu === true,
                            name: selectedProjectSummary?.name || 'Untitled',
                            projectImage: selectedProjectSummary?.projectImage || null,
                            specialMenuBaseProjectId: selectedProjectSummary?.specialMenuBaseProjectId,
                            specialMenuBaseProjectName: selectedProjectSummary?.specialMenuBaseProjectId
                                ? projectsList.find((project: any) => project.projectId === selectedProjectSummary.specialMenuBaseProjectId)?.name
                                : undefined,
                            specialMenuEndsAt: selectedProjectSummary?.specialMenuEndsAt,
                            specialMenuStatus: selectedProjectSummary?.specialMenuStatus,
                        }}
                        onClick={() => setIsProjectSelectorOpen(true)}
                    />
                ) : null}

                <FeedbackLinkCard
                    description={t('feedbackQrDesc')}
                    disabled={!feedbackReady}
                    helperText={!feedbackReady ? (feedbackEnabled ? t('selectMenuForFeedback') : t('feedbackDisabledHelp')) : undefined}
                    label={t('feedbackQrTitle')}
                    onCopy={feedbackReady ? handleCopyFeedbackLink : undefined}
                    onOpen={feedbackReady ? handleOpenFeedbackLink : undefined}
                    onShare={feedbackReady && supportsNativeShare ? () => void handleNativeShare() : undefined}
                    onShowQr={feedbackReady ? handleOpenQr : undefined}
                    statusLabel={feedbackReady ? common('enabled') : common('disabled')}
                    value={feedbackUrl}
                />

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
                                                        <Text type="secondary">{feedback.createdAt ? format.dateTime(new Date(feedback.createdAt), 'date') : ''}</Text>
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
                                            extra={null}
                                            key={feedback.id}
                                            onClick={() => setSelectedFeedback(feedback)}
                                            prefix={(
                                                <Flex
                                                    align="center"
                                                    justify="center"
                                                    style={{
                                                        background: feedback.needsAttention ? token.colorWarningBg : token.colorInfoBg,
                                                        borderRadius: 14,
                                                        color: feedback.needsAttention ? token.colorWarningText : token.colorInfoText,
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
                filename={buildQrCodeFilename(getStoreContextName(storeDetails as any, 'feedback'), 'feedback-qr')}
                generatingLabel={t('generatingQr')}
                helperText={t('feedbackQrTip')}
                imageAlt={t('feedbackQrTitle')}
                onClose={() => setIsQrOpen(false)}
                qrErrorMessage={t('failedToUpdate')}
                title={t('feedbackQrTitle')}
                url={feedbackQrUrl}
                visible={isQrOpen}
            />
            <MobileProjectSelectorSheet
                currentProjectId={selectedProjectId}
                currentProjectName={selectedProjectSummary?.name || null}
                onClose={() => setIsProjectSelectorOpen(false)}
                onProjectsChanged={async (preferredProjectId) => {
                    await selectProject(preferredProjectId || null);
                    setIsProjectSelectorOpen(false);
                }}
                visible={isProjectSelectorOpen}
            />
        </Flex>
    );
}

function FeedbackLinkCard({
    description,
    disabled,
    helperText,
    label,
    onCopy,
    onOpen,
    onShare,
    onShowQr,
    statusLabel,
    value,
}: {
    description: string;
    disabled?: boolean;
    helperText?: string;
    label: string;
    onCopy?: () => void;
    onOpen?: () => void;
    onShare?: () => void;
    onShowQr?: () => void;
    statusLabel: string;
    value: string;
}) {
    const { token } = theme.useToken();

    return (
        <Card style={{ borderRadius: 24 }}>
            <Flex gap={14} vertical>
                <Flex align="center" justify="space-between">
                    <Flex align="center" gap={12} style={{ flex: 1, minWidth: 0 }}>
                        <FeedbackIconBadge>
                            <LuQrCode color={token.colorInfoText} size={18} />
                        </FeedbackIconBadge>
                        <Flex gap={2} style={{ flex: 1, minWidth: 0 }} vertical>
                            <Flex align="center" gap={8} wrap="wrap">
                                <Text strong style={{ color: token.colorText, fontSize: 14 }}>
                                    {label}
                                </Text>
                                <Tag color={disabled ? 'default' : 'success'}>{statusLabel}</Tag>
                            </Flex>
                            <Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>{description}</Text>
                        </Flex>
                    </Flex>
                </Flex>

                {disabled ? (
                    helperText ? <Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>{helperText}</Text> : null
                ) : (
                    <>
                        <Card
                            size="small"
                            style={{
                                backgroundColor: token.colorFillAlter,
                                borderColor: token.colorBorderSecondary,
                                borderRadius: 16,
                            }}
                        >
                            <Text style={{ color: token.colorText, fontSize: 12, wordBreak: 'break-all' }}>
                                {value}
                            </Text>
                        </Card>

                        <Flex gap={10}>
                            {onCopy ? <FeedbackActionTile icon={<LuCopy size={18} />} onClick={onCopy} /> : null}
                            {onShare ? <FeedbackActionTile icon={<LuShare2 size={18} />} onClick={onShare} /> : null}
                            {onShowQr ? <FeedbackActionTile icon={<LuQrCode size={18} />} onClick={onShowQr} /> : null}
                            {onOpen ? <FeedbackActionTile icon={<LuExternalLink size={18} />} onClick={onOpen} /> : null}
                        </Flex>
                    </>
                )}
            </Flex>
        </Card>
    );
}

function FeedbackActionTile({ icon, onClick }: { icon: React.ReactNode; onClick: () => void }) {
    const { token } = theme.useToken();

    return (
        <Button
            fill="outline"
            onClick={onClick}
            size="small"
            style={{
                borderColor: token.colorBorderSecondary,
                borderRadius: 16,
                flex: 1,
                minHeight: 48,
                minWidth: 0,
                paddingBlock: 0,
                paddingInline: 0,
            }}
        >
            <Flex align="center" justify="center" style={{ color: token.colorText, minHeight: 20 }}>
                {icon}
            </Flex>
        </Button>
    );
}

function FeedbackIconBadge({ children }: { children: React.ReactNode }) {
    const { token } = theme.useToken();

    return (
        <Flex
            align="center"
            justify="center"
            style={{
                backgroundColor: token.colorInfoBg,
                borderRadius: 16,
                height: 44,
                minWidth: 44,
                width: 44,
            }}
        >
            {children}
        </Flex>
    );
}
