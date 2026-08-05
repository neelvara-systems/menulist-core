'use client';

import { deleteChangelogEntry, loadOlderChangelogPage } from '@database/changelog';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useAnswerlatticePublicContentRequestScope } from '@hook/answerlattice/useAnswerlatticeCacheScope';
import { useChangelogCache } from '@hook/useChangelogCache';
import { ANSWERLATTICE_ROUTES } from '@constant/answerlattice/navigations';
import {
    consumeAnswerlatticeReleaseEvidenceHandoff,
    type AnswerlatticeReleaseEvidenceHandoff,
} from '@lib/answerlattice/releaseEvidenceHandoff';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { Button, Divider, Flex, Grid, Layout, Modal, Steps, Typography, message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LuBookOpen, LuDot, LuEye, LuPencil, LuPlus, LuTrash2 } from 'react-icons/lu';
import InfiniteScroll from 'react-infinite-scroll-component';
import AddEditChangelog from './addEditChangelog';
import ChangelogPreview from './ChangelogPreview';
import ChangelogTagRenderer from './ChangelogTagRenderer';
import DisplayChangelog from './displayChangelog';

const { Title } = Typography;
const { Content } = Layout;

import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { ChangelogEntry, ChangelogPage } from '@type/changelog';

function ChangelogTemplate() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingEntry, setEditingEntry] = useState<ChangelogEntry | null>(null);
    const [previewingEntry, setPreviewingEntry] = useState<ChangelogEntry | null>(null);
    const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
    const [preparedDraft, setPreparedDraft] = useState<AnswerlatticeReleaseEvidenceHandoff | null>(null);
    const [changelogPage, setChangelogPage] = useState<ChangelogPage | null>(null);
    const [entries, setEntries] = useState<ChangelogEntry[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const { clearCache: clearChangelogCache, getItem: getCachedChangelog } = useChangelogCache();
    const requestScope = useAnswerlatticePublicContentRequestScope();
    const requestScopeKey = requestScope ? `${requestScope.tId}:${requestScope.sId}` : null;
    const currentScopeKeyRef = useRef(requestScopeKey);
    currentScopeKeyRef.current = requestScopeKey;
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;
    const dispatch = useAppDispatch();
    const createRequestKeyRef = useRef<string | null>(null);

    const sortEntries = (entriesToSort: ChangelogEntry[]) => {
        return [...entriesToSort].sort((a, b) => {
            const dateA = a.releasedOn.toDate();
            const dateB = b.releasedOn.toDate();
            return dateB.getTime() - dateA.getTime();
        });
    };

    const fetchLatestPage = useCallback(async (forceRefresh = false) => {
        const expectedScopeKey = requestScopeKey;
        if (!expectedScopeKey) {
            setChangelogPage(null);
            setEntries([]);
            setHasMore(false);
            return;
        }
        dispatch(startLoader('Fetching Changelog'));
        try {
            const data = await getCachedChangelog({ forceRefresh });
            if (currentScopeKeyRef.current !== expectedScopeKey) return;
            if (data) {
                setChangelogPage(data);
                setEntries(sortEntries(data.entries || []));
                setHasMore(data.nextPageId !== null);
            } else {
                setEntries([]);
                setHasMore(false);
            }
        } catch (error) {
            message.error('Failed to fetch changelog.');
        } finally {
            dispatch(stopLoader('Fetching Changelog'));
        }
    }, [dispatch, getCachedChangelog, requestScopeKey]);

    useEffect(() => {
        setChangelogPage(null);
        setEntries([]);
        setHasMore(Boolean(requestScopeKey));
        setEditingEntry(null);
        setPreparedDraft(null);
        setPreviewingEntry(null);
        setIsModalVisible(false);
        setIsPreviewModalVisible(false);
    }, [requestScopeKey]);

    useEffect(() => {
        if (searchParams?.get('create') !== '1') {
            createRequestKeyRef.current = null;
            return;
        }
        if (!requestScopeKey) return;

        const requestKey = `${requestScopeKey}:${searchParams.toString()}`;
        if (createRequestKeyRef.current === requestKey) return;
        createRequestKeyRef.current = requestKey;

        const fromIntake = searchParams.get('from') === 'intake';
        const nextPreparedDraft = fromIntake
            ? consumeAnswerlatticeReleaseEvidenceHandoff(requestScopeKey)
            : null;
        setPreparedDraft(nextPreparedDraft);
        setEditingEntry(null);
        setIsModalVisible(true);
        if (fromIntake && !nextPreparedDraft) {
            message.warning('The prepared release draft is unavailable. Create the entry manually from the saved intake evidence.');
        }

        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.delete('create');
        if (fromIntake) nextParams.delete('from');
        const nextQuery = nextParams.toString();
        const currentPathname = pathname ?? ANSWERLATTICE_ROUTES.CHANGELOG;
        router.replace(nextQuery ? `${currentPathname}?${nextQuery}` : currentPathname, { scroll: false });
    }, [pathname, requestScopeKey, router, searchParams]);

    useEffect(() => {
        fetchLatestPage();
    }, [fetchLatestPage]);

    const loadMore = async () => {
        if (!changelogPage || !requestScope) return;
        const expectedScope = requestScope;
        const expectedScopeKey = requestScopeKey;
        if (!expectedScopeKey) return;

        dispatch(startLoader('Loading More...'));
        try {
            const olderPage: ChangelogPage | null = await loadOlderChangelogPage(
                changelogPage.pageNumber,
                expectedScope,
            );
            if (currentScopeKeyRef.current !== expectedScopeKey) return;
            if (olderPage) {
                setChangelogPage(olderPage as ChangelogPage);
                setEntries(prev => sortEntries([...prev, ...olderPage.entries]));
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

    const handleSave = (savedEntry: ChangelogEntry | null) => {
        clearChangelogCache();
        if (editingEntry && savedEntry) {
            // Update both the flat entries list and the nested entries in changelogPage
            setEntries(prev => sortEntries(prev.map(entry => entry.id === savedEntry.id ? savedEntry : entry)));
            setChangelogPage(prevPage => {
                if (!prevPage) return null;
                const updatedEntries = prevPage.entries.map(entry => entry.id === savedEntry.id ? savedEntry : entry);
                return { ...prevPage, entries: updatedEntries };
            });
        } else {
            // Re-fetch the latest page to show the new entry at the top
            void fetchLatestPage(true);
        }
        setEditingEntry(null);
        setPreparedDraft(null);
    };

    const handleDelete = (entryId: string) => {
        Modal.confirm({
            title: 'Are you sure you want to delete this entry?',
            content: 'This action cannot be undone.',
            okText: 'Yes, Delete It',
            okType: 'danger',
            cancelText: 'No, Cancel',
            onOk: async () => {
                const expectedScope = requestScope;
                const expectedScopeKey = requestScopeKey;
                if (!expectedScope || !expectedScopeKey) {
                    message.error('Answerlattice workspace scope is required.');
                    return;
                }
                dispatch(startLoader('Deleting Entry...'));
                try {
                    await deleteChangelogEntry(entryId, expectedScope);
                    if (currentScopeKeyRef.current !== expectedScopeKey) return;
                    setEntries(prev => prev.filter(entry => entry.id !== entryId));
                    clearChangelogCache();
                    message.success('Entry deleted successfully!');
                } catch (error) {
                    if (currentScopeKeyRef.current !== expectedScopeKey) return;
                    message.error('Failed to delete entry.');
                } finally {
                    dispatch(stopLoader('Deleting Entry...'));
                }
            },
        });
    };

    return (
        <Layout style={{ height: '100%', padding: isMobile ? 12 : 24 }}>
            <Content>
                <Flex
                    justify="space-between"
                    align={isMobile ? 'stretch' : 'center'}
                    gap={12}
                    vertical={isMobile}
                    style={{ marginBottom: isMobile ? 16 : 24 }}
                >
                    <div>
                        <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>Changelog</Title>
                        <Typography.Text type="secondary">
                            Publish release notes and connect them to affected product surfaces and articles.
                        </Typography.Text>
                    </div>
                    <Flex gap={8} vertical={isMobile}>
                        <Button icon={<LuBookOpen />} onClick={() => setIsPreviewModalVisible(true)}>View Preview</Button>
                        <Button type="primary" icon={<LuPlus />} onClick={() => { setEditingEntry(null); setPreparedDraft(null); setIsModalVisible(true); }}>Add New Entry</Button>
                    </Flex>
                </Flex>

                {isModalVisible ? (
                    <AddEditChangelog
                        open={isModalVisible}
                        onClose={() => {
                            setIsModalVisible(false);
                            setEditingEntry(null);
                            setPreparedDraft(null);
                        }}
                        onSave={handleSave}
                        initialData={editingEntry}
                        preparedDraft={preparedDraft}
                    />
                ) : null}

                <div id="scrollableDiv" style={{ height: isMobile ? 'auto' : 'calc(100vh - 200px)', overflow: isMobile ? 'visible' : 'auto' }}>
                    <InfiniteScroll
                        dataLength={entries.length}
                        next={loadMore}
                        hasMore={hasMore}
                        loader={<h4>Loading...</h4>}
                        scrollableTarget="scrollableDiv"
                    >
                        <Steps direction="vertical">
                            {entries.map(item => (
                                <Steps.Step
                                    icon={<LuDot />}
                                    status="finish"
                                    key={item.id}
                                    title={item.title}
                                    description={
                                        <Flex vertical>
                                            <Flex justify="space-between" align={isMobile ? 'flex-start' : 'center'} gap={8} vertical={isMobile}>
                                                <Flex gap={8} align="center" wrap="wrap">
                                                    {item.version && <Typography.Text strong>V{item.version}</Typography.Text>}
                                                    <DateTimeDisplay value={item.releasedOn} />
                                                    <Flex gap={8} wrap="wrap">
                                                        {item.tags?.map((tag: string) => <ChangelogTagRenderer key={tag} tag={tag} />)}
                                                    </Flex>
                                                </Flex>
                                                <Flex gap={isMobile ? 8 : 16} align={isMobile ? 'flex-start' : 'center'} vertical={isMobile}>
                                                    <Flex style={{ display: isMobile ? 'none' : undefined }}>
                                                        <DateTimeDisplay value={item.createdOn} mode="datetime" label="Created On" style={{ fontStyle: 'italic' }} />
                                                    </Flex>
                                                    <Flex gap={8}>
                                                        <Button key={item.id + 'view'} type="text" shape='circle' icon={<LuEye />} onClick={() => setPreviewingEntry(item)} />
                                                        <Button key={item.id + 'edit'} type="text" shape='circle' icon={<LuPencil />} onClick={() => { setEditingEntry(item); setIsModalVisible(true); }} />
                                                        <Button key={item.id + 'delete'} type="text" shape='circle' danger icon={<LuTrash2 />} onClick={() => handleDelete(item.id)} />
                                                    </Flex>
                                                </Flex>
                                            </Flex>
                                            <Divider style={{ margin: '8px 0' }} />
                                        </Flex>
                                    }
                                />
                            ))}
                        </Steps>
                    </InfiniteScroll>
                </div>
                <Modal
                    open={isPreviewModalVisible}
                    onCancel={() => setIsPreviewModalVisible(false)}
                    footer={null}
                    width={isMobile ? '96vw' : '80vw'}
                    centered
                >
                    <DisplayChangelog pageData={changelogPage} useInternalFallback={false} />
                </Modal>

                {previewingEntry && (
                    <Modal
                        open={!!previewingEntry}
                        onCancel={() => setPreviewingEntry(null)}
                        footer={null}
                        width={isMobile ? '96vw' : '60vw'}
                        centered
                    >
                        <ChangelogPreview item={previewingEntry} mode="modal" pageId={changelogPage?.id || ''} showFeedbackDetails />
                    </Modal>
                )}
            </Content>
        </Layout>
    );
}

export default ChangelogTemplate;
