'use client';

import AnimatedGradientBubbles from '@atoms/AnimatedGradientBubbles';
import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { CHANGELOG_TAG_CONFIG, CHANGELOG_TAG_OPTIONS } from '@constant/changelog';
import { helpCenterTabRouting } from '@constant/navigations';
import { loadOlderChangelogPage } from '@database/changelog';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useChangelogCache } from '@hook/useChangelogCache';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { getTextFromTiptapJson } from '@lib/tiptap';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { ChangelogEntry, ChangelogPage } from '@type/changelog';
import { generateGradientFromHex } from '@util/utils';
import { Badge, Button, Empty, Flex, Grid, Input, Layout, List, Popover, Typography, message, theme } from 'antd';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { LuFilter, LuSearch } from 'react-icons/lu';
import AnimatedVersionNumber from './AnimatedVersionNumber';
import ChangelogPreview from './ChangelogPreview';

const { Title, Text } = Typography;
const { Content, Sider } = Layout;

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: 'spring',
            stiffness: 100,
        },
    },
};

const { useToken } = theme;

const LAST_VIEWED_KEY = 'changelog_last_viewed_at';

function isNewEntry(entry: ChangelogEntry, lastViewedAt: number): boolean {
    if (!lastViewedAt) return false;
    try {
        const entryDate = entry.releasedOn?.toDate ? entry.releasedOn.toDate().getTime() : new Date(entry.releasedOn as any).getTime();
        return entryDate > lastViewedAt;
    } catch { return false; }
}

function DisplayChangelog({
    initialEntryId,
    loadOlderPage,
    pageData = null,
    useInternalFallback = true,
}: {
    initialEntryId?: string;
    loadOlderPage?: (currentPageNumber: number) => Promise<ChangelogPage | null>;
    pageData: ChangelogPage | null;
    useInternalFallback?: boolean;
}) {
    const { getItem } = useChangelogCache();
    const [changelogPage, setChangelogPage] = useState<ChangelogPage | null>(null);
    const [entries, setEntries] = useState<ChangelogEntry[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const dispatch = useAppDispatch();
    const { token } = useToken();
    const screens = Grid.useBreakpoint();
    const isNarrow = screens.md !== true;

    // Track last viewed time for "New" badge
    const lastViewedRef = useRef<number>(0);
    useEffect(() => {
        try {
            const stored = localStorage.getItem(LAST_VIEWED_KEY);
            lastViewedRef.current = stored ? parseInt(stored, 10) : 0;
        } catch (error) {
            logRuntimeFailure('platform_changelog_last_viewed_read_failed', error, {
                surface: 'platform_changelog_display',
            });
        }

        // Update lastViewed after 2s delay so user sees "New" badges first
        const timer = setTimeout(() => {
            try {
                localStorage.setItem(LAST_VIEWED_KEY, Date.now().toString());
            } catch (error) {
                logRuntimeFailure('platform_changelog_last_viewed_write_failed', error, {
                    surface: 'platform_changelog_display',
                });
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    const handleTagChange = (tag: string, checked: boolean) => {
        const nextSelectedTags = checked
            ? [...selectedTags, tag]
            : selectedTags.filter(t => t !== tag);
        setSelectedTags(nextSelectedTags);
    };

    const filteredEntries = useMemo(() => {
        return entries
            .filter(entry => {
                const query = searchQuery.toLowerCase();
                const titleMatch = entry?.title?.toLowerCase().includes(query);
                const descriptionText = getTextFromTiptapJson(entry.description as any);
                const descriptionMatch = descriptionText.toLowerCase().includes(query);
                return titleMatch || descriptionMatch;
            })
            .filter(entry => {
                if (selectedTags.length === 0) return true;
                return selectedTags.some(tag => (entry?.tags || []).includes(tag));
            });
    }, [entries, searchQuery, selectedTags]);

    const fetchLatestPage = useCallback(async () => {
        const shouldFetchInternalFallback = !pageData && useInternalFallback;

        if (!pageData && !useInternalFallback) {
            setChangelogPage(null);
            setEntries([]);
            setHasMore(false);
            return;
        }

        if (shouldFetchInternalFallback) {
            dispatch(startLoader('Fetching Changelog...'));
        }

        try {
            let page = pageData;
            if (!pageData) {
                page = await getItem();
            }
            if (page) {
                setChangelogPage(page as ChangelogPage);
                setEntries(page.entries || []);
                setHasMore(page.nextPageId !== null);
            } else {
                setEntries([]);
                setHasMore(false);
            }
        } catch (error) {
            message.error('Failed to fetch changelog.');
        } finally {
            if (shouldFetchInternalFallback) {
                dispatch(stopLoader('Fetching Changelog...'));
            }
        }
    }, [dispatch, getItem, pageData, useInternalFallback]);

    useEffect(() => {
        void fetchLatestPage();
    }, [fetchLatestPage]);

    useEffect(() => {
        if (!initialEntryId || entries.length === 0) return;

        const scrollTimer = window.setTimeout(() => {
            document.getElementById(`changelog-entry-${initialEntryId}`)?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 150);

        return () => window.clearTimeout(scrollTimer);
    }, [entries.length, initialEntryId]);

    const loadMore = async () => {
        if (!changelogPage) return;
        dispatch(startLoader('Loading More...'));
        try {
            const olderPage = loadOlderPage
                ? await loadOlderPage(changelogPage.pageNumber)
                : await loadOlderChangelogPage(changelogPage.pageNumber);
            if (olderPage) {
                setChangelogPage(olderPage as ChangelogPage);
                setEntries(prev => [...prev, ...olderPage.entries]);
                setHasMore(olderPage.nextPageId !== null);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            message.error('Failed to load more entries.');
        } finally {
            dispatch(stopLoader('Loading More...'));
        }
    };

    const tagFilterList = (
        <List
            dataSource={CHANGELOG_TAG_OPTIONS}
            renderItem={tag => {
                const config = CHANGELOG_TAG_CONFIG[tag];
                const Icon = config?.icon;
                const color = config?.color;
                const isSelected = selectedTags.includes(tag);

                return (
                    <List.Item
                        onClick={() => handleTagChange(tag, !isSelected)}
                        style={{
                            cursor: 'pointer',
                            padding: '8px 12px',
                            borderRadius: token.borderRadius,
                            background: isSelected ? token.colorPrimaryBg : 'transparent',
                            borderLeft: isSelected ? `3px solid ${token.colorPrimary}` : '3px solid transparent',
                            marginBottom: 4,
                        }}
                    >
                        <Flex align="center" gap={8}>
                            {Icon && <Icon style={{ color }} />}
                            <Typography.Text style={{ color: isSelected ? token.colorPrimary : token.colorText }}>
                                {tag}
                            </Typography.Text>
                        </Flex>
                    </List.Item>
                );
            }}
        />
    );

    const mobileFilterDropdown = (
        <div
            style={{
                maxHeight: 360,
                maxWidth: 'calc(100vw - 48px)',
                overflowY: 'auto',
                width: 280,
            }}
        >
            <Flex align="center" justify="space-between" style={{ marginBottom: 8 }}>
                <Text strong>Filter by tags</Text>
                {selectedTags.length > 0 ? (
                    <Button size="small" type="link" onClick={() => setSelectedTags([])}>
                        Clear
                    </Button>
                ) : null}
            </Flex>
            {tagFilterList}
        </div>
    );

    const mobileFilterPanel = (
        <Flex align="center" gap={8} style={{ marginBottom: 12, width: '100%' }}>
            <Input
                className="changelog-mobile-search-input"
                placeholder="Search changelog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, minWidth: 0 }}
                prefix={<LuSearch size={16} aria-hidden="true" />}
                allowClear
            />
            <Popover
                content={mobileFilterDropdown}
                onOpenChange={setFiltersOpen}
                open={filtersOpen}
                placement="bottomRight"
                trigger="click"
            >
                <Badge count={selectedTags.length} size="small">
                    <Button
                        aria-label="Filter changelog by tags"
                        icon={<LuFilter size={18} />}
                        style={{
                            alignItems: 'center',
                            display: 'inline-flex',
                            height: 44,
                            justifyContent: 'center',
                            minWidth: 44,
                        }}
                    />
                </Badge>
            </Popover>
        </Flex>
    );

    const filterPanel = (
        <>
            <Input.Search
                placeholder="Search changelog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ marginBottom: 24 }}
                allowClear
            />

            <Title level={5} style={{ marginBottom: 16 }}>Filter by Tags</Title>
            {tagFilterList}
        </>
    );

    return (
        <Layout style={{ background: token.colorBgContainer, height: '100%', padding: isNarrow ? 8 : 12 }}>
            <Content >
                <Flex
                    align="center"
                    justify="center"
                    style={{
                        position: 'relative',
                        height: isNarrow ? 96 : 120,
                        background: `linear-gradient(90deg, ${token.colorPrimaryBorder} 0%, ${token.colorPrimaryBg} 100%)`,
                        borderRadius: token.borderRadiusLG,
                        marginBottom: isNarrow ? 16 : 24,
                        overflow: 'hidden',
                        padding: isNarrow ? '0 16px' : undefined,
                    }}
                >
                    <AnimatedGradientBubbles colors={['#ffbe0b', '#fb5607', '#8338ec']} count={6} speed="fast" />
                    <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                        <Title level={isNarrow ? 3 : 2} style={{ color: 'white', margin: 0 }}>What&apos;s New?</Title>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: isNarrow ? 13 : undefined }}>Recent product fixes and updates.</Text>
                    </div>
                </Flex>

                <Layout style={{ background: token.colorBgContainer }}>
                    {isNarrow ? mobileFilterPanel : null}
                    <Content>
                        {/* <div id="scrollableDivPublic" style={{ height: 'calc(100vh - 260px)', overflow: 'auto' }}> */}
                        <div id="scrollableDivPublic" style={{}}>
                            <InfiniteScroll
                                dataLength={filteredEntries.length}
                                next={loadMore}
                                hasMore={hasMore}
                                loader={<h4>Loading...</h4>}
                                scrollableTarget="scrollableDivPublic"
                                endMessage={
                                    <>
                                        {(searchQuery || selectedTags.length > 0) &&
                                            <Empty
                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                description={
                                                    <Flex vertical align='center'>
                                                        <Text>No results found for your search.</Text>
                                                        <Text>
                                                            Can&apos;t find what you&apos;re looking for? Check out our{' '}
                                                            <Link href={helpCenterTabRouting('kb')}>
                                                                knowledge base
                                                            </Link>
                                                            .
                                                        </Text>
                                                    </Flex>
                                                }
                                            />
                                        }
                                    </>
                                }
                            >
                                <motion.div
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    {filteredEntries.map((item, index) => (
                                        <motion.div
                                            key={item.id}
                                            id={`changelog-entry-${item.id}`}
                                            variants={itemVariants}
                                            style={{
                                                marginBottom: isNarrow ? 16 : 24,
                                                display: 'flex',
                                                flexDirection: isNarrow ? 'column' : 'row',
                                                alignItems: isNarrow ? 'stretch' : 'flex-start',
                                            }}
                                        >
                                            {/* Left Column: Decorative Date and Version */}
                                            <Flex
                                                vertical
                                                align={isNarrow ? "flex-start" : "flex-end"}
                                                justify="space-between"
                                                style={{
                                                    width: isNarrow ? '100%' : 120,
                                                    flexShrink: 0,
                                                    padding: isNarrow ? '12px 14px' : '16px 24px 16px 0',
                                                    // background: GRADIENTS[index % GRADIENTS.length],
                                                    background: generateGradientFromHex(token[CHANGELOG_TAG_CONFIG[item.tags[0]]?.color] || token.colorPrimary),
                                                    borderRadius: isNarrow ? `${token.borderRadiusLG}px ${token.borderRadiusLG}px 0 0` : `${token.borderRadiusLG}px 0 0 ${token.borderRadiusLG}px`,
                                                    borderRight: isNarrow ? undefined : `1px solid ${token.colorBorderSecondary}`,
                                                    textAlign: isNarrow ? 'left' : 'right',
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    height: isNarrow ? 'auto' : '-webkit-fill-available',
                                                }}
                                            >
                                                <Flex vertical align={isNarrow ? "flex-start" : "flex-end"}>
                                                    <DateTimeDisplay value={item.releasedOn} />
                                                    {item.version && <Text strong>V{item.version}</Text>}
                                                </Flex>
                                                {!isNarrow ? <AnimatedVersionNumber version={item.version} /> : null}
                                            </Flex>

                                            {/* Center Column: Timeline Axis */}
                                            <Flex vertical align="center" style={{ display: isNarrow ? 'none' : undefined, flexShrink: 0, alignSelf: 'stretch', position: 'relative' }}>
                                                {/* This div creates the continuous line */}
                                                <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, backgroundColor: token.colorBorder, transform: 'translateX(-50%)' }} />
                                                {/* This is the dot for the current item — with "New" badge for unread entries */}
                                                <Badge dot={isNewEntry(item, lastViewedRef.current)} offset={[2, 0]} color={token.colorSuccess}>
                                                    <div style={{ width: 10, height: 10, background: token.colorPrimary, borderRadius: '50%', zIndex: 1, border: `2px solid ${token.colorBgContainer}`, marginTop: 5 }} />
                                                </Badge>
                                            </Flex>

                                            {/* Right Column: Content */}
                                            <div style={{ paddingLeft: isNarrow ? 0 : 24, paddingBottom: isNarrow ? 0 : 24, flex: 1, minWidth: 0 }}>
                                                <ChangelogPreview mode="inline" item={item} pageId={changelogPage?.id || ''} />
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </InfiniteScroll>
                        </div>
                    </Content>
                    {!isNarrow ? (
                        <Sider width={280} style={{ background: token.colorBgContainer, paddingLeft: 24, borderLeft: `1px solid ${token.colorBorderSecondary}` }}>
                            {filterPanel}
                        </Sider>
                    ) : null}
                </Layout>
            </Content>
        </Layout>
    );
}

export default DisplayChangelog;
