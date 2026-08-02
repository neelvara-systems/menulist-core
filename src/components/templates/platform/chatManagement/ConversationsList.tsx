'use client';

import { REFRESH_INTERVALS } from '@constant/metrics';
import { getConversationsPaginated } from '@database/chatAnalytics';
import { assertChatSessionBatchMetadataUpdateSucceeded, batchUpdateSessionMetadata } from '@database/chatSessions';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { useDebounceValue } from '@hook/useDebounce';
import {
    getAnswerlatticeChatWorkspaceScopeKey,
    isAnswerlatticeChatWorkspaceScopeAcknowledgement,
} from '@lib/answerlattice/chatAnalyticsContracts';
import { getAnswerlatticeCustomerIdentity } from '@lib/answerlattice/customerIdentity';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { ChatSession, ConversationFilters } from '@type/chatSession';
import { escapeCSVValue } from '@util/exportUtils';
import { calculateQualityFlags } from '@util/qualityMetrics';
import { Button, Card, Checkbox, Dropdown, Flex, Input, message, Popover, Skeleton, Splitter, Tooltip, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuCheckSquare, LuFilter, LuSearch } from 'react-icons/lu';
import useSWR from 'swr';
import ConversationCard from './ConversationCard';
import ConversationDetail from './ConversationDetail';
import ConversationFiltersPopover from './ConversationFiltersPopover';

const { Text } = Typography;

function ConversationsList() {
    const loggedInSession = useClientAuthSession();
    const resolvedScope = resolveAnswerlatticeSessionScope(loggedInSession);
    const workspaceScope = resolvedScope
        ? { tId: resolvedScope.tenantId, sId: resolvedScope.storeId }
        : null;
    const scopeKey = getAnswerlatticeChatWorkspaceScopeKey(workspaceScope);
    const scopeKeyRef = useRef(scopeKey);
    scopeKeyRef.current = scopeKey;
    const [searchQuery, setSearchQuery] = useState('');
    // Single filter state object (managed by child component)
    const [filters, setFilters] = useState<ConversationFilters>({
        mode: 'all',
        feedback: 'all',
        status: 'all',
        priority: 'all',
        quality: 'all',
        tags: [],
        hasNotes: false,
        isUnread: false,
        dateRange: null
    });
    const [activeFilterCount, setActiveFilterCount] = useState(0);

    // Debounce search query to avoid hitting database on every keystroke (500ms delay)
    const debouncedSearchQuery = useDebounceValue(searchQuery, 500);

    // Selected conversation state
    const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);

    // Batch selection state
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Pagination state
    const [allSessions, setAllSessions] = useState<ChatSession[]>([]);
    const [allSessionsScopeKey, setAllSessionsScopeKey] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [lastCursor, setLastCursor] = useState<string | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const loadMoreOwnerRef = useRef(0);
    const batchActionOwnerRef = useRef(0);
    const batchActionInProgressRef = useRef(false);

    // Generate SWR cache key (only for initial load)
    // NOTE: cacheKey will be null if session hasn't loaded yet, preventing SWR from fetching
    // Use debouncedSearchQuery to prevent database hits on every keystroke (500ms delay)
    const cacheKey = scopeKey
        ? `${scopeKey}:${filters.mode}:${filters.feedback}:${filters.dateRange?.[0]?.valueOf() || 'null'}:${filters.dateRange?.[1]?.valueOf() || 'null'}:${debouncedSearchQuery || 'empty'}`
        : null;

    // Fetch initial conversations with SWR (20 at a time for cost efficiency)
    const { data, error, isLoading, mutate } = useSWR(
        cacheKey,
        async () => {
            if (!loggedInSession || !workspaceScope) {
                throw new Error('answerlattice_chat_workspace_scope_missing');
            }

            const dbFilters: NonNullable<Parameters<typeof getConversationsPaginated>[2]> = {};

            if (filters.mode !== 'all') {
                dbFilters.mode = filters.mode;
            }

            if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
                dbFilters.dateRange = {
                    start: filters.dateRange[0].toDate(),
                    end: filters.dateRange[1].toDate()
                };
            }

            // Add search query (server-side filtering on title/userName)
            if (debouncedSearchQuery) {
                dbFilters.searchQuery = debouncedSearchQuery;
            }

            const result = await getConversationsPaginated(
                loggedInSession,
                20, // Start with 20 conversations (cost-efficient)
                dbFilters
            );
            if (!isAnswerlatticeChatWorkspaceScopeAcknowledgement(result, workspaceScope)) {
                throw new Error('answerlattice_chat_workspace_acknowledgement_invalid');
            }
            return result;
        },
        {
            dedupingInterval: REFRESH_INTERVALS.SWR_DEDUPE,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            revalidateOnMount: true,
            keepPreviousData: false // Don't keep previous data when filter changes
        }
    );

    useEffect(() => {
        if (error && scopeKey) {
            message.error('Unable to fetch chat data. Please check your connection and try again');
        }
    }, [error, scopeKey]);

    // Update allSessions when initial data loads or filters change
    useEffect(() => {
        if (
            data?.sessions
            && !isLoading
            && scopeKey
            && workspaceScope
            && isAnswerlatticeChatWorkspaceScopeAcknowledgement(data, workspaceScope)
        ) {
            // Always update when loading completes to ensure fresh data
            setAllSessions(data.sessions);
            setAllSessionsScopeKey(scopeKey);
            setHasMore(data.hasNextPage || false);
            setLastCursor(data.nextPageCursor || null);

        }
    }, [data, isLoading, scopeKey, workspaceScope?.tId, workspaceScope?.sId]);

    // Reset pagination when filters change (but not on initial mount)
    const isInitialMount = useRef(true);
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return; // Skip on initial mount
        }

        setAllSessions([]);
        setAllSessionsScopeKey(null);
        setHasMore(true);
        setIsLoadingMore(false);
        setLastCursor(null);
        setSelectedSession(null);
        setSelectedIds([]);
        setSelectMode(false);
        loadMoreOwnerRef.current += 1;
        batchActionOwnerRef.current += 1;
        batchActionInProgressRef.current = false;
    }, [scopeKey, filters.mode, filters.feedback, filters.dateRange, debouncedSearchQuery]);

    // Apply client-side filters (memoized to prevent infinite loops)
    const sessions = useMemo(() => {
        let filtered = allSessionsScopeKey === scopeKey ? allSessions : [];

        // Feedback filter
        if (filters.feedback === 'positive') {
            filtered = filtered.filter(session =>
                (session.messages || []).some(msg => msg.feedback?.isGood === true)
            );
        } else if (filters.feedback === 'negative') {
            filtered = filtered.filter(session =>
                (session.messages || []).some(msg => msg.feedback?.isGood === false)
            );
        } else if (filters.feedback === 'none') {
            filtered = filtered.filter(session =>
                !(session.messages || []).some(msg => msg.feedback)
            );
        }

        // Status filter
        if (filters.status !== 'all') {
            filtered = filtered.filter(session => session.adminStatus === filters.status);
        }

        // Priority filter
        if (filters.priority !== 'all') {
            filtered = filtered.filter(session => session.priority === filters.priority);
        }

        // Tags filter (match ANY selected tag)
        if (filters.tags.length > 0) {
            filtered = filtered.filter(session =>
                session.adminTags?.some(tag => filters.tags.includes(tag))
            );
        }

        // Has Notes filter
        if (filters.hasNotes) {
            filtered = filtered.filter(session =>
                session.internalNotes && session.internalNotes.length > 0 && session.internalNotes[0]?.content
            );
        }

        // Unread filter
        if (filters.isUnread) {
            filtered = filtered.filter(session => session.isUnread === true);
        }

        // Quality filter (based on AI response similarity scores)
        if (filters.quality !== 'all') {
            filtered = filtered.filter(session => {
                // Check all AI messages in the conversation
                const aiMessages = (session.messages || []).filter(msg => msg.role === 'assistant');

                // If no AI messages, exclude from quality filters
                if (aiMessages.length === 0) return false;

                // Check if ANY AI message matches the quality criteria
                return aiMessages.some(msg => {
                    const qualityFlags = calculateQualityFlags(msg.references);
                    if (!qualityFlags) return false;

                    switch (filters.quality) {
                        case 'very_low':
                            return qualityFlags.veryLowConfidence;
                        case 'low':
                            return qualityFlags.lowConfidence && !qualityFlags.veryLowConfidence;
                        case 'good':
                            return !qualityFlags.lowConfidence;
                        default:
                            return true;
                    }
                });
            });
        }

        return filtered;
    }, [allSessions, allSessionsScopeKey, scopeKey, filters.feedback, filters.status, filters.priority, filters.quality, filters.tags, filters.hasNotes, filters.isUnread]);
    const visibleSelectedSession = allSessionsScopeKey === scopeKey ? selectedSession : null;

    const handleExport = () => {
        if (filteredSessions.length === 0) {
            message.warning('No conversations found. Try adjusting your filters');
            return;
        }

        // Generate CSV content
        const csvRows: string[] = [];

        // Header
        csvRows.push([
            'ID',
            'Conversation Title',
            'Customer Name',
            'Customer Email',
            'Type',
            'Messages',
            'Helpful',
            'Not Helpful',
            'Positive Feedback Share',
            'Started',
            'Last Activity'
        ].map(escapeCSVValue).join(','));

        // Data rows (with null safety)
        filteredSessions.forEach(session => {
            const requester = getAnswerlatticeCustomerIdentity(session);
            const messages = session.messages || [];
            const positiveFeedback = messages.filter(msg => msg.feedback?.isGood === true).length;
            const negativeFeedback = messages.filter(msg => msg.feedback?.isGood === false).length;
            const totalFeedback = positiveFeedback + negativeFeedback;
            const positiveFeedbackShare = totalFeedback > 0
                ? Math.round((positiveFeedback / totalFeedback) * 100)
                : null;

            const row = [
                session.id || 'N/A',
                session.title || 'Untitled Chat',
                requester.displayName,
                requester.email || 'N/A',
                session.mode === 'qna' ? 'Quick Answer' : 'Chat',
                messages.length,
                positiveFeedback,
                negativeFeedback,
                positiveFeedbackShare === null ? 'N/A' : `${positiveFeedbackShare}%`,
                session.createdOn?.toDate().toLocaleString() || 'N/A',
                session.modifiedOn?.toDate().toLocaleString() || 'N/A'
            ].map(escapeCSVValue);

            csvRows.push(row.join(','));
        });

        // Create and download CSV file
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `conversations-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        message.success(`${filteredSessions.length} conversation${filteredSessions.length === 1 ? '' : 's'} saved to your downloads folder`);
    };

    // Filter sessions locally by search query (memoized to prevent infinite loops)
    // NOTE: title and userName are already filtered server-side, so we only search in messages here
    const filteredSessions = useMemo(() => {
        return sessions.filter(session => {
            if (!debouncedSearchQuery) return true;
            const searchLower = debouncedSearchQuery.toLowerCase();

            // Server-side already filtered by title and userName
            // Here we only search in requester metadata and message content (nested data that can't be efficiently queried in Firestore)
            const requester = getAnswerlatticeCustomerIdentity(session);
            if (requester.email?.toLowerCase().includes(searchLower)) return true;
            if (requester.displayName.toLowerCase().includes(searchLower)) return true;
            if (requester.userId?.toLowerCase().includes(searchLower)) return true;
            return session.messages.some(msg => {
                const content = msg.content || msg.craftedAnswer || '';
                return content.toLowerCase().includes(searchLower);
            });
        });
    }, [sessions, debouncedSearchQuery]);

    // Load more conversations (infinite scroll)
    const loadMoreConversations = async () => {
        if (!hasMore || isLoadingMore || !lastCursor || !loggedInSession || !workspaceScope || !scopeKey) return;

        const actionOwner = ++loadMoreOwnerRef.current;
        const expectedScope = workspaceScope;
        const expectedScopeKey = scopeKey;
        setIsLoadingMore(true);
        try {
            const dbFilters: NonNullable<Parameters<typeof getConversationsPaginated>[2]> = {
                lastDocId: lastCursor,
            };

            if (filters.mode !== 'all') {
                dbFilters.mode = filters.mode;
            }

            if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
                dbFilters.dateRange = {
                    start: filters.dateRange[0].toDate(),
                    end: filters.dateRange[1].toDate()
                };
            }

            const result = await getConversationsPaginated(
                loggedInSession,
                20,
                dbFilters
            );

            if (
                result?.sessions
                && isAnswerlatticeChatWorkspaceScopeAcknowledgement(result, expectedScope)
                && scopeKeyRef.current === expectedScopeKey
                && loadMoreOwnerRef.current === actionOwner
            ) {
                setAllSessions(prev => Array.from(
                    new Map([...prev, ...result.sessions].map((session) => [session.id, session])).values(),
                ));
                setAllSessionsScopeKey(expectedScopeKey);
                setHasMore(result.hasNextPage || false);
                setLastCursor(result.nextPageCursor || null);
            }
        } catch {
            if (scopeKeyRef.current === expectedScopeKey && loadMoreOwnerRef.current === actionOwner) {
                message.error('Failed to load more conversations');
            }
        } finally {
            if (scopeKeyRef.current === expectedScopeKey && loadMoreOwnerRef.current === actionOwner) {
                setIsLoadingMore(false);
            }
        }
    };

    // Detect scroll near bottom (infinite scroll trigger)
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        // Load more when scrolled 80% down
        if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasMore && !isLoadingMore) {
            loadMoreConversations();
        }
    };

    // Memoized click handler to prevent re-creating functions
    const handleSessionClick = useCallback((session: ChatSession) => {
        setSelectedSession(session);
    }, []);

    // Handle note update - update both allSessions and selectedSession
    const handleNoteUpdate = useCallback(() => {
        void mutate();
    }, [mutate]);

    // Callback when session metadata is updated (status, priority, tags)
    const handleSessionUpdate = useCallback((sessionId: string, updates: Partial<ChatSession>) => {
        // Update in allSessions array
        setAllSessions(prev => prev.map(session =>
            session.id === sessionId
                ? { ...session, ...updates }
                : session
        ));

        // Update selectedSession if it's the one being updated
        setSelectedSession(prev =>
            prev && prev.id === sessionId
                ? { ...prev, ...updates }
                : prev
        );
    }, []);

    // Auto-select first conversation if none selected
    useEffect(() => {
        if (!selectedSession && filteredSessions.length > 0) {
            setSelectedSession(filteredSessions[0]);
        } else if (selectedSession && !filteredSessions.find(s => s.id === selectedSession.id)) {
            // If selected session is no longer in filtered list, select first one
            setSelectedSession(filteredSessions.length > 0 ? filteredSessions[0] : null);
        }
    }, [filteredSessions, selectedSession]);

    // Filter popover state
    const [filtersPopoverOpen, setFiltersPopoverOpen] = useState(false);

    // Show loading state while session is initializing
    if (!loggedInSession || !workspaceScope) {
        return (
            <Card>
                <Flex vertical justify="center" align="center" style={{ height: 400 }}>
                    <Skeleton active paragraph={{ rows: 4 }} />
                </Flex>
            </Card>
        );
    }

    // Callback when filters change in popover
    const handleFiltersChange = (newFilters: ConversationFilters, newActiveCount: number) => {
        setFilters(newFilters);
        setActiveFilterCount(newActiveCount);
    };

    const toggleSelectMode = () => {
        setSelectMode(!selectMode);
        setSelectedIds([]);
    };

    const handleBatchStatusUpdate = async (status: string) => {
        if (
            selectedIds.length === 0
            || !workspaceScope
            || !scopeKey
            || batchActionInProgressRef.current
        ) return;
        batchActionInProgressRef.current = true;
        const actionOwner = ++batchActionOwnerRef.current;
        const expectedIds = [...selectedIds];
        const expectedScope = workspaceScope;
        const expectedScopeKey = scopeKey;
        try {
            const batchUpdateResult = await batchUpdateSessionMetadata(
                expectedIds,
                { adminStatus: status },
                expectedScope,
            );
            assertChatSessionBatchMetadataUpdateSucceeded(
                batchUpdateResult,
                expectedIds,
                'platform_chat_batch_status_update_rejected',
            );
            if (
                scopeKeyRef.current !== expectedScopeKey
                || batchActionOwnerRef.current !== actionOwner
            ) return;
            setAllSessions(prev => prev.map(s =>
                expectedIds.includes(s.id!) ? { ...s, adminStatus: status as ChatSession['adminStatus'] } : s
            ));
            message.success(`${expectedIds.length} conversation(s) updated to "${status}"`);
            setSelectedIds([]);
            setSelectMode(false);
        } catch {
            if (
                scopeKeyRef.current === expectedScopeKey
                && batchActionOwnerRef.current === actionOwner
            ) {
                message.error('Failed to update conversations');
            }
        } finally {
            if (batchActionOwnerRef.current === actionOwner) {
                batchActionInProgressRef.current = false;
            }
        }
    };

    const batchStatusItems = [
        { key: 'new', label: 'New' },
        { key: 'in_progress', label: 'In Progress' },
        { key: 'resolved', label: 'Resolved' },
        { key: 'follow_up', label: 'Follow-up' },
        { key: 'closed', label: 'Closed' },
    ];

    return (
        <Flex vertical gap={16}>
            {/* Master-Detail Layout with Resizable Splitter */}
            <Splitter style={{ height: 'calc(100vh - 72px)' }}>
                <Splitter.Panel defaultSize="30%" min={300} max="50%">
                    <Card
                        title={
                            <Flex vertical gap={10} style={{ width: '100%' }}>
                                {/* Header Row */}
                                <Flex justify="space-between" align="center">
                                    <Text strong style={{ fontSize: 16, fontWeight: 600, lineHeight: '24px' }}>
                                        Conversations <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>({filteredSessions.length})</Text>
                                    </Text>
                                    {filteredSessions.length > 0 && (
                                        <Button
                                            size="small"
                                            type={selectMode ? 'primary' : 'text'}
                                            icon={<LuCheckSquare size={14} />}
                                            onClick={toggleSelectMode}
                                        >
                                            {selectMode ? 'Done' : 'Select'}
                                        </Button>
                                    )}
                                </Flex>

                                {/* Batch Actions Bar (visible when items selected) */}
                                {selectMode && selectedIds.length > 0 && (
                                    <Dropdown
                                        menu={{
                                            items: batchStatusItems,
                                            onClick: ({ key }) => handleBatchStatusUpdate(key),
                                        }}
                                        placement="bottomLeft"
                                    >
                                        <Button size="small" type="primary">
                                            Set Status ({selectedIds.length})
                                        </Button>
                                    </Dropdown>
                                )}

                                {/* Compact Search + Filter Row */}
                                <Flex gap={8} style={{ overflow: 'visible' }}>
                                    {/* Search Input */}
                                    <Input
                                        placeholder="Search..."
                                        prefix={<LuSearch size={14} />}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        allowClear
                                        style={{ flex: 1, minWidth: 0 }}
                                    />

                                    {/* Filter Popover Button */}
                                    <Popover
                                        content={
                                            <ConversationFiltersPopover
                                                initialFilters={filters}
                                                onFiltersChange={handleFiltersChange}
                                                onExport={handleExport}
                                                onClose={() => setFiltersPopoverOpen(false)}
                                            />
                                        }
                                        title="Filter & Export"
                                        trigger="click"
                                        open={filtersPopoverOpen}
                                        onOpenChange={setFiltersPopoverOpen}
                                        placement="bottomRight"
                                    >
                                        <Tooltip title="Filter & Export">
                                            <Button
                                                type={activeFilterCount > 0 ? 'primary' : 'default'}
                                            >
                                                <Flex gap={6} align="center">
                                                    {activeFilterCount > 0 && (
                                                        <span style={{
                                                            fontSize: 12,
                                                            fontWeight: 600
                                                        }}>
                                                            {activeFilterCount}
                                                        </span>
                                                    )}
                                                    <LuFilter size={14} />
                                                </Flex>
                                            </Button>
                                        </Tooltip>
                                    </Popover>
                                </Flex>
                            </Flex>
                        }
                        style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                        styles={{ body: { flex: 1, overflowY: 'auto', padding: '12px 8px' }, header: { padding: 12 } }}
                        loading={isLoading}
                    >
                        <div
                            ref={scrollContainerRef}
                            onScroll={handleScroll}
                            style={{ height: '100%', overflowY: 'auto' }}
                        >
                            {filteredSessions.length === 0 && !isLoading ? (
                                <Flex
                                    vertical
                                    justify="center"
                                    align="center"
                                    style={{ height: '100%', padding: 20 }}
                                >
                                    <Text type="secondary" style={{ fontSize: 14, textAlign: 'center' }}>
                                        {searchQuery || activeFilterCount > 0
                                            ? 'No matches found. Try different filters or search terms.'
                                            : 'No conversations yet. Chats will appear here once customers start asking questions.'}
                                    </Text>
                                </Flex>
                            ) : (
                                <>
                                    {filteredSessions.map((session) => (
                                        <Flex key={session.id} align="center" gap={4}>
                                            {selectMode && (
                                                <Checkbox
                                                    checked={selectedIds.includes(session.id!)}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedIds(prev =>
                                                            prev.includes(session.id!)
                                                                ? prev.filter(id => id !== session.id)
                                                                : [...prev, session.id!]
                                                        );
                                                    }}
                                                    style={{ marginLeft: 4 }}
                                                />
                                            )}
                                            <div style={{ flex: 1 }}>
                                                <ConversationCard
                                                    session={session}
                                                    isActive={visibleSelectedSession?.id === session.id}
                                                    onClick={selectMode ? undefined : handleSessionClick}
                                                />
                                            </div>
                                        </Flex>
                                    ))}

                                    {/* Loading More Skeleton */}
                                    {isLoadingMore && (
                                        <Card
                                            style={{
                                                marginBottom: 8,
                                                borderRadius: 12
                                            }}
                                            styles={{ body: { padding: 14 } }}
                                        >
                                            <Skeleton active paragraph={{ rows: 2 }} title={false} />
                                        </Card>
                                    )}

                                    {/* End of list indicator */}
                                    {!hasMore && filteredSessions.length > 0 && (
                                        <Flex justify="center" style={{ padding: 16 }}>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                All conversations loaded
                                            </Text>
                                        </Flex>
                                    )}
                                </>
                            )}
                        </div>
                    </Card>
                </Splitter.Panel>

                {/* Right Panel - Conversation Detail (70%) */}
                <Splitter.Panel min={400}>
                    <ConversationDetail
                        session={visibleSelectedSession}
                        scope={workspaceScope}
                        onNoteUpdate={handleNoteUpdate}
                        onSessionUpdate={handleSessionUpdate}
                    />
                </Splitter.Panel>
            </Splitter>
        </Flex>
    );
}

export default ConversationsList;
