'use client'

import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { RECENTLY_VIEWED_EVENT, RecentlyViewedEntry, getRecentlyViewedEntries } from '@lib/recentlyViewed';
import ArticleViewModal from '@organisms/ArticleViewModal';
import ChangelogPreview from '@template/platform/changelog/ChangelogPreview';
import { ChangelogEntry } from '@type/changelog';
import { KnowledgeBaseArticleMeta } from '@type/knowledgeBase';
import { Card, Empty, Flex, List, Modal, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuClock3, LuFileText, LuInfo, LuSparkles, LuWorkflow } from 'react-icons/lu';

const { Title, Text } = Typography;

// TYPE_LABEL moved inside component to use translations

const TYPE_ICON: Record<RecentlyViewedEntry['type'], JSX.Element> = {
    article: <LuFileText size={16} />,
    changelog: <LuSparkles size={16} />,
    faq: <LuInfo size={16} />,
    workflow: <LuWorkflow size={16} />,
};

function RecentlyViewed() {
    const t = useTranslations('HelpCenter');
    const { token } = theme.useToken();

    const TYPE_LABEL: Record<RecentlyViewedEntry['type'], string> = {
        article: t('typeArticle'),
        changelog: t('typeChangelog'),
        faq: t('typeFaq'),
        workflow: t('typeWorkflow'),
    };

    const EMPTY_STATE = (
        <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('noRecentViews')}
        />
    );
    const { user } = useClientAuthSession() || {};
    const [entries, setEntries] = useState<RecentlyViewedEntry[]>([]);
    const [selectedArticle, setSelectedArticle] = useState<KnowledgeBaseArticleMeta | null>(null);
    const [selectedChangelog, setSelectedChangelog] = useState<{ entry: ChangelogEntry; pageId: string } | null>(null);
    const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
    const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);

    const loadEntries = useCallback(() => {
        if (!user?.id) {
            setEntries([]);
            return;
        }
        const items = getRecentlyViewedEntries(user.id);
        setEntries(items);
    }, [user?.id]);

    useEffect(() => {
        loadEntries();
    }, [loadEntries]);

    useEffect(() => {
        if (!user?.id) return;
        const key = `recentlyViewed:${user.id}`;

        const handleCustom = (event: Event) => {
            const detail = (event as CustomEvent).detail as { storageKey?: string } | undefined;
            if (detail?.storageKey === key) {
                loadEntries();
            }
        };

        const handleStorage = (event: StorageEvent) => {
            if (event.key === key) {
                loadEntries();
            }
        };

        window.addEventListener(RECENTLY_VIEWED_EVENT, handleCustom);
        window.addEventListener('storage', handleStorage);

        return () => {
            window.removeEventListener(RECENTLY_VIEWED_EVENT, handleCustom);
            window.removeEventListener('storage', handleStorage);
        };
    }, [loadEntries, user?.id]);

    const handleEntryClick = (entry: RecentlyViewedEntry) => {
        if (entry.type === 'article') {
            // Set article metadata - ArticleViewModal will handle caching/fetching
            setSelectedArticle({
                id: entry.id,
                title: entry.title,
                // Pass original item if available (cached data), otherwise just metadata
                ...(entry.meta?.originalItem || {})
            } as KnowledgeBaseArticleMeta);
            setIsArticleModalOpen(true);
        } else if (entry.type === 'changelog') {
            if (entry.meta?.originalItem) {
                setSelectedChangelog({
                    entry: entry.meta.originalItem,
                    pageId: entry.meta.pageId || ''
                });
                setIsChangelogModalOpen(true);
            }
        }
    };

    const handleArticleModalClose = () => {
        setIsArticleModalOpen(false);
        setSelectedArticle(null);
    };

    const handleChangelogModalClose = () => {
        setIsChangelogModalOpen(false);
        setSelectedChangelog(null);
    };

    const renderMeta = (entry: RecentlyViewedEntry) => {
        if (entry.type === 'article') {
            const category = entry.meta?.categoryTitle;
            const section = entry.meta?.sectionTitle;
            if (category && section) {
                return `${category} • ${section}`;
            }
            return category || section || TYPE_LABEL.article;
        }

        if (entry.type === 'changelog') {
            if (entry.meta?.version) {
                return `Version ${entry.meta.version}`;
            }
            const tags: string[] | undefined = entry.meta?.tags;
            if (tags && tags.length > 0) {
                return tags.join(' · ');
            }
            return TYPE_LABEL.changelog;
        }

        return TYPE_LABEL[entry.type];
    };

    // Memoize all styles to prevent re-renders
    const cardStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);
    const titleStyle = useMemo(() => ({ margin: 0 }), []);
    const headerIconStyle = useMemo(() => ({ color: token.colorTextSecondary }), [token.colorTextSecondary]);
    const textMarginStyle = useMemo(() => ({ margin: 0 }), []);
    const listItemIconStyle = useMemo(() => ({
        width: 32,
        height: 32,
        borderRadius: 10,
        background: token.colorFillQuaternary,
        color: token.colorTextSecondary,
    }), [token.colorFillQuaternary, token.colorTextSecondary]);
    const flexFullWidth = useMemo(() => ({ width: '100%' }), []);
    const flex1Style = useMemo(() => ({ flex: 1 }), []);
    const titleColorStyle = useMemo(() => ({ color: token.colorPrimary }), [token.colorPrimary]);
    const smallFontStyle = useMemo(() => ({ fontSize: 12 }), []);
    const modalTopStyle = useMemo(() => ({ top: 20 }), []);
    const spinnerStyle = useMemo(() => ({ minHeight: 300 }), []);

    // Memoize list item style generator
    const getListItemStyle = useCallback((isLast: boolean) => ({
        padding: '12px 0',
        borderBlockEnd: isLast ? 'none' : `1px solid ${token.colorBorderSecondary}`,
        cursor: 'pointer',
    }), [token.colorBorderSecondary]);

    return (
        <Card variant="borderless" style={cardStyle}>
            <Flex vertical gap="large">
                <Flex justify="space-between" align="center">
                    <Title level={4} style={titleStyle} ellipsis={false}>{t('recentlyViewedTitle')}</Title>
                    <Flex align="center" gap={8} style={headerIconStyle}>
                        <LuClock3 size={16} />
                        <Text type="secondary" style={textMarginStyle}>{t('last10Items')}</Text>
                    </Flex>
                </Flex>

                {entries.length === 0 ? (
                    EMPTY_STATE
                ) : (
                    <List
                        dataSource={entries}
                        renderItem={(entry, index) => (
                            <List.Item
                                onClick={() => handleEntryClick(entry)}
                                style={getListItemStyle(index === entries.length - 1)}
                            >
                                <Flex justify="space-between" align="center" style={flexFullWidth}>
                                    <Flex align="center" gap={12} style={flex1Style}>
                                        <Flex
                                            align="center"
                                            justify="center"
                                            style={listItemIconStyle}
                                        >
                                            {TYPE_ICON[entry.type]}
                                        </Flex>
                                        <Flex vertical gap={4} style={flex1Style}>
                                            <Text strong style={titleColorStyle} ellipsis={false}>
                                                {entry.title}
                                            </Text>
                                            <Text type="secondary" style={smallFontStyle} ellipsis={false}>
                                                {renderMeta(entry)}
                                            </Text>
                                        </Flex>
                                    </Flex>
                                    <Text type="secondary" style={smallFontStyle}>
                                        <DateTimeDisplay value={entry.viewedAt} mode="fromnow" />
                                    </Text>
                                </Flex>
                            </List.Item>
                        )}
                        split={false}
                    />
                )}
            </Flex>

            {/* Article Modal with built-in caching */}
            <ArticleViewModal
                open={isArticleModalOpen}
                onClose={handleArticleModalClose}
                article={selectedArticle}
            />

            {isChangelogModalOpen && selectedChangelog && (
                <Modal
                    open={true}
                    onCancel={handleChangelogModalClose}
                    footer={null}
                    width={900}
                    style={modalTopStyle}
                    destroyOnHidden
                >
                    <ChangelogPreview
                        key={selectedChangelog.entry.id}
                        item={selectedChangelog.entry}
                        mode="modal"
                        pageId={selectedChangelog.pageId}
                        disableTracking={true}
                    />
                </Modal>
            )}
        </Card>
    );
}

export default RecentlyViewed;
