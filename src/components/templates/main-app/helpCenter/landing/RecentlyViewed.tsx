'use client'

import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import {
    RECENTLY_VIEWED_EVENT,
    getRecentlyViewedEntries,
    getRecentlyViewedStorageKey,
    type RecentlyViewedEntry,
} from '@lib/recentlyViewed';
import { Card, Empty, Flex, List, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { LuClock3, LuFileText, LuInfo, LuSparkles, LuWorkflow } from 'react-icons/lu';

const { Title, Text } = Typography;

// TYPE_LABEL moved inside component to use translations

const TYPE_ICON: Record<RecentlyViewedEntry['type'], ReactElement> = {
    article: <LuFileText size={16} />,
    changelog: <LuSparkles size={16} />,
    faq: <LuInfo size={16} />,
    workflow: <LuWorkflow size={16} />,
};

function RecentlyViewed() {
    const t = useTranslations('HelpCenter');
    const router = useRouter();
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
    const session = useClientAuthSession();
    const { user } = session || {};
    const scope = resolveAnswerlatticeSessionScope(session);
    const [entries, setEntries] = useState<RecentlyViewedEntry[]>([]);

    const loadEntries = useCallback(() => {
        if (!user?.id || !scope) {
            setEntries([]);
            return;
        }
        const items = getRecentlyViewedEntries({ tId: scope.tenantId, sId: scope.storeId }, user.id);
        setEntries(items);
    }, [scope?.storeId, scope?.tenantId, user?.id]);

    useEffect(() => {
        loadEntries();
    }, [loadEntries]);

    useEffect(() => {
        if (!user?.id || !scope) return;
        const key = getRecentlyViewedStorageKey({ tId: scope.tenantId, sId: scope.storeId }, user.id);

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
    }, [loadEntries, scope?.storeId, scope?.tenantId, user?.id]);

    const handleEntryClick = (entry: RecentlyViewedEntry) => {
        router.push(entry.href);
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

        </Card>
    );
}

export default RecentlyViewed;
