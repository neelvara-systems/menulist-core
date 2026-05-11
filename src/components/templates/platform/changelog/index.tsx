'use client';

import { deleteChangelogEntry, loadOlderChangelogPage } from '@database/changelog';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useChangelogCache } from '@hook/useChangelogCache';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { Button, Divider, Flex, Layout, Modal, Steps, Typography, message } from 'antd';
import { useCallback, useContext, useEffect, useState } from 'react';
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
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingEntry, setEditingEntry] = useState<ChangelogEntry | null>(null);
    const [previewingEntry, setPreviewingEntry] = useState<ChangelogEntry | null>(null);
    const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
    const [changelogPage, setChangelogPage] = useState<ChangelogPage | null>(null);
    const [entries, setEntries] = useState<any[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const { clearCache: clearChangelogCache, getItem: getCachedChangelog } = useChangelogCache();
    const dispatch = useAppDispatch();

    const sortEntries = (entriesToSort: any[]) => {
        return entriesToSort.sort((a, b) => {
            const dateA = a.releasedOn?.toDate ? a.releasedOn.toDate() : new Date(a.releasedOn);
            const dateB = b.releasedOn?.toDate ? b.releasedOn.toDate() : new Date(b.releasedOn);
            return dateB.getTime() - dateA.getTime();
        });
    };

    const fetchLatestPage = useCallback(async (forceRefresh = false) => {
        if (!storeDetails) return;
        dispatch(startLoader('Fetching Changelog'));
        try {
            const data = await getCachedChangelog({ forceRefresh });
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
    }, [dispatch, getCachedChangelog, storeDetails]);

    useEffect(() => {
        fetchLatestPage();
    }, [fetchLatestPage]);

    const loadMore = async () => {
        if (!changelogPage || !storeDetails) return;

        dispatch(startLoader('Loading More...'));
        try {
            const olderPage: ChangelogPage | null = await loadOlderChangelogPage(changelogPage.pageNumber);
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
    };

    const handleDelete = (entryId: string) => {
        Modal.confirm({
            title: 'Are you sure you want to delete this entry?',
            content: 'This action cannot be undone.',
            okText: 'Yes, Delete It',
            okType: 'danger',
            cancelText: 'No, Cancel',
            onOk: async () => {
                dispatch(startLoader('Deleting Entry...'));
                try {
                    await deleteChangelogEntry(entryId);
                    setEntries(prev => prev.filter(entry => entry.id !== entryId));
                    clearChangelogCache();
                    message.success('Entry deleted successfully!');
                } catch (error) {
                    message.error('Failed to delete entry.');
                } finally {
                    dispatch(stopLoader('Deleting Entry...'));
                }
            },
        });
    };

    return (
        <Layout style={{ height: '100%', padding: 24 }}>
            <Content>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <Title level={3}>Changelog Management</Title>
                    <Flex gap={16}>
                        <Button icon={<LuBookOpen />} onClick={() => setIsPreviewModalVisible(true)}>View Preview</Button>
                        <Button type="primary" icon={<LuPlus />} onClick={() => { setEditingEntry(null); setIsModalVisible(true); }}>Add New Entry</Button>
                    </Flex>
                </div>

                {isModalVisible ? (
                    <AddEditChangelog
                        open={isModalVisible}
                        onClose={() => {
                            setIsModalVisible(false);
                            setEditingEntry(null);
                        }}
                        onSave={handleSave}
                        initialData={editingEntry}
                    />
                ) : null}

                <div id="scrollableDiv" style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}>
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
                                            <Flex justify="space-between" align="center">
                                                <Flex gap={16} align="center">
                                                    {item.version && <Typography.Text strong>V{item.version}</Typography.Text>}
                                                    <DateTimeDisplay value={item.releasedOn} />
                                                    <Flex gap={8}>
                                                        {item.tags?.map((tag: string) => <ChangelogTagRenderer key={tag} tag={tag} />)}
                                                    </Flex>
                                                </Flex>
                                                <Flex gap={16} align="center">
                                                    <Flex>
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
                    width="80vw"
                    centered
                >
                    <DisplayChangelog pageData={changelogPage} />
                </Modal>

                {previewingEntry && (
                    <Modal
                        open={!!previewingEntry}
                        onCancel={() => setPreviewingEntry(null)}
                        footer={null}
                        width="60vw"
                        centered
                    >
                        <ChangelogPreview item={previewingEntry} mode="modal" pageId={changelogPage?.id || ''} />
                    </Modal>
                )}
            </Content>
        </Layout>
    );
}

export default ChangelogTemplate;
