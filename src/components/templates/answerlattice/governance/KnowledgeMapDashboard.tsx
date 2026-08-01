'use client';

import { FEATURE_FLAGS } from '@config/features';
import {
    ANSWERLATTICE_GOVERNANCE_TABS,
    getAnswerlatticeGovernanceRoute,
} from '@constant/answerlattice/navigations';
import {
    getAnswerlatticeKnowledgeMap,
    type AnswerlatticeKnowledgeMapData,
} from '@database/answerlattice/knowledgeMap';
import { normalizeAnswerlatticeEntityId } from '@lib/answerlattice/governanceIdBoundary';
import { getAnswerlatticeEntityContextRoute } from '@lib/answerlattice/ownerDecisionNavigation';
import type {
    AnswerlatticeEntityGraphNode,
} from '@type/answerlattice';
import {
    ANSWERLATTICE_RELATION_TYPES,
    denormalizeVersion,
} from '@type/answerlattice';
import { Alert, Button, Empty, Select, Spin, Tag, Typography, theme } from 'antd';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    LuBoxes,
    LuChevronDown,
    LuChevronRight,
    LuGitBranch,
    LuGitPullRequest,
    LuRefreshCw,
    LuSearch,
    LuShieldAlert,
} from 'react-icons/lu';
import styles from './KnowledgeMapDashboard.module.scss';

const { Paragraph, Text, Title } = Typography;

type QualityFilter = 'all' | 'uncovered' | 'drift' | 'review';

interface KnowledgeMapDashboardProps {
    tId: number;
    sId: number;
}

interface MapEntry {
    id: string;
    node: AnswerlatticeEntityGraphNode;
}

interface RelationGroup {
    direction: 'incoming' | 'outgoing' | 'legacy';
    type: string;
    entries: MapEntry[];
}

const RELATION_TYPE_ORDER = Object.values(ANSWERLATTICE_RELATION_TYPES);

const getTimestampMillis = (value: unknown): number | null => {
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
    if (!value || typeof value !== 'object') return null;
    const timestamp = value as { toDate?: () => Date; seconds?: number };
    try {
        const date = timestamp.toDate?.();
        if (date instanceof Date && Number.isFinite(date.getTime())) return date.getTime();
    } catch {
        return null;
    }
    return Number.isFinite(timestamp.seconds) ? Number(timestamp.seconds) * 1_000 : null;
};

const formatRelationType = (value: string): string => value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, character => character.toUpperCase());

const getRelationGroupLabel = (
    direction: RelationGroup['direction'],
    type: string,
): string => {
    if (direction === 'legacy') return type === 'related' ? 'Related' : `Related by ${formatRelationType(type)}`;
    const labels: Record<string, { incoming: string; outgoing: string }> = {
        requires: { incoming: 'Required by', outgoing: 'Requires' },
        part_of: { incoming: 'Contains', outgoing: 'Part of' },
        available_in: { incoming: 'Includes', outgoing: 'Available in' },
        restricted_by: { incoming: 'Restricts', outgoing: 'Restricted by' },
        transitions_to: { incoming: 'Transitions from', outgoing: 'Transitions to' },
        triggers: { incoming: 'Triggered by', outgoing: 'Triggers' },
    };
    return labels[type]?.[direction] || `${direction === 'incoming' ? 'Incoming' : 'Outgoing'} ${formatRelationType(type)}`;
};

const getQualityRank = (node: AnswerlatticeEntityGraphNode) => (
    (node.driftedAnswerCount || 0) * 10_000
    + (node.reviewRequiredAnswerCount || 0) * 1_000
    + (node.answerCount === 0 ? 100 : 0)
    + node.related.length
);

export default function KnowledgeMapDashboard({ tId, sId }: KnowledgeMapDashboardProps) {
    const { token } = theme.useToken();
    const searchParams = useSearchParams();
    const requestedEntityId = normalizeAnswerlatticeEntityId(searchParams?.get('entity')) || '';
    const [data, setData] = useState<AnswerlatticeKnowledgeMapData | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [selectedId, setSelectedId] = useState('');
    const [query, setQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [qualityFilter, setQualityFilter] = useState<QualityFilter>('all');
    const [relationshipsExpanded, setRelationshipsExpanded] = useState(true);

    const load = useCallback(async () => {
        if (!tId || !sId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setLoadFailed(false);
        try {
            const result = await getAnswerlatticeKnowledgeMap(tId, sId);
            setData(result);
            if (result) {
                const entries = Object.entries(result.graph)
                    .map(([id, node]) => ({ id, node }))
                    .sort((a, b) => getQualityRank(b.node) - getQualityRank(a.node) || a.node.name.localeCompare(b.node.name));
                setSelectedId(current => (
                    requestedEntityId && result.graph[requestedEntityId]
                        ? requestedEntityId
                        : current && result.graph[current]
                            ? current
                            : entries[0]?.id || ''
                ));
            }
        } catch {
            setLoadFailed(true);
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [requestedEntityId, sId, tId]);

    useEffect(() => {
        void load();
    }, [load]);

    const entries = useMemo<MapEntry[]>(() => (
        Object.entries(data?.graph || {})
            .map(([id, node]) => ({ id, node }))
            .sort((a, b) => a.node.name.localeCompare(b.node.name))
    ), [data]);
    const entityTypes = useMemo(() => (
        Array.from(new Set(entries.map(entry => entry.node.type))).sort()
    ), [entries]);
    const filteredEntries = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return entries.filter(({ node }) => {
            if (typeFilter !== 'all' && node.type !== typeFilter) return false;
            if (qualityFilter === 'uncovered' && node.answerCount > 0) return false;
            if (qualityFilter === 'drift' && (node.driftedAnswerCount || 0) === 0) return false;
            if (qualityFilter === 'review' && (node.reviewRequiredAnswerCount || 0) === 0) return false;
            return !normalizedQuery || `${node.name} ${node.type}`.toLowerCase().includes(normalizedQuery);
        });
    }, [entries, qualityFilter, query, typeFilter]);

    useEffect(() => {
        if (filteredEntries.some(entry => entry.id === selectedId)) return;
        setSelectedId(filteredEntries[0]?.id || '');
    }, [filteredEntries, selectedId]);

    const selectedNode = selectedId ? data?.graph[selectedId] : undefined;
    const relatedEntries = useMemo(() => (
        selectedNode
            ? selectedNode.related
                .map(id => ({ id, node: data?.graph[id] }))
                .filter((entry): entry is MapEntry => Boolean(entry.node))
                .slice(0, 20)
            : []
    ), [data, selectedNode]);
    const relationGroups = useMemo<RelationGroup[]>(() => {
        if (!selectedNode) return [];

        const groups: RelationGroup[] = [];
        const relatedIds = new Set(relatedEntries.map(entry => entry.id));
        const representedIds = new Set<string>();
        let renderedEdges = 0;
        const hasDirectionalRelations = Boolean(
            selectedNode.outgoingRelationTypes && selectedNode.incomingRelationTypes,
        );
        const relationEntries = (hasDirectionalRelations
            ? [
                ...Object.entries(selectedNode.incomingRelationTypes || {})
                    .map(([type, ids]) => ({ direction: 'incoming' as const, ids, type })),
                ...Object.entries(selectedNode.outgoingRelationTypes || {})
                    .map(([type, ids]) => ({ direction: 'outgoing' as const, ids, type })),
            ]
            : Object.entries(selectedNode.relationTypes)
                .map(([type, ids]) => ({ direction: 'legacy' as const, ids, type })))
            .sort((left, right) => {
                if (left.direction !== right.direction) return left.direction.localeCompare(right.direction);
                const leftRank = RELATION_TYPE_ORDER.indexOf(left.type as typeof RELATION_TYPE_ORDER[number]);
                const rightRank = RELATION_TYPE_ORDER.indexOf(right.type as typeof RELATION_TYPE_ORDER[number]);
                const normalizedLeftRank = leftRank === -1 ? Number.MAX_SAFE_INTEGER : leftRank;
                const normalizedRightRank = rightRank === -1 ? Number.MAX_SAFE_INTEGER : rightRank;
                return normalizedLeftRank - normalizedRightRank || left.type.localeCompare(right.type);
            });

        for (const { direction, ids, type } of relationEntries) {
            if (renderedEdges >= 20) break;
            const entriesForType: MapEntry[] = [];
            for (const id of ids) {
                if (renderedEdges >= 20 || !relatedIds.has(id)) continue;
                const node = data?.graph[id];
                if (!node) continue;
                entriesForType.push({ id, node });
                representedIds.add(id);
                renderedEdges += 1;
            }
            if (entriesForType.length > 0) groups.push({ direction, type, entries: entriesForType });
        }

        const untypedEntries = relatedEntries
            .filter(entry => !representedIds.has(entry.id))
            .slice(0, Math.max(0, 20 - renderedEdges));
        if (untypedEntries.length > 0) groups.push({ direction: 'legacy', type: 'related', entries: untypedEntries });
        return groups;
    }, [data, relatedEntries, selectedNode]);
    const hasDirectionalGroups = relationGroups.some(group => group.direction !== 'legacy');
    const leftGroups = relationGroups.filter((group, index) => (
        hasDirectionalGroups ? group.direction === 'incoming' : index % 2 === 0
    ));
    const rightGroups = relationGroups.filter((group, index) => (
        hasDirectionalGroups ? group.direction === 'outgoing' : index % 2 === 1
    ));
    const totalUncovered = entries.filter(entry => entry.node.answerCount === 0).length;
    const totalDrift = entries.filter(entry => (entry.node.driftedAnswerCount || 0) > 0).length;
    const totalReview = entries.filter(entry => (entry.node.reviewRequiredAnswerCount || 0) > 0).length;
    const lastRebuiltAt = getTimestampMillis(data?.lastRebuiltAt);
    const ageWarning = Boolean(lastRebuiltAt && Date.now() - lastRebuiltAt > 36 * 60 * 60 * 1_000);
    const cssVariables = {
        '--knowledge-map-active': token.colorPrimary,
        '--knowledge-map-border': token.colorBorderSecondary,
        '--knowledge-map-border-strong': token.colorBorder,
        '--knowledge-map-canvas': token.colorBgLayout,
        '--knowledge-map-connector': token.colorBorder,
        '--knowledge-map-focus': token.colorPrimaryBorder,
        '--knowledge-map-grid': token.colorBorderSecondary,
        '--knowledge-map-muted': token.colorTextSecondary,
        '--knowledge-map-node': token.colorBgContainer,
    } as CSSProperties;

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_MAP) return null;

    if (loading) {
        return <div style={{ display: 'grid', minHeight: 320, placeItems: 'center' }}><Spin size="large" /></div>;
    }

    if (!data || entries.length === 0) {
        return (
            <Empty
                description={loadFailed
                    ? 'The knowledge map could not be loaded.'
                    : data
                        ? 'No active product entities are available for this map.'
                        : 'The map will appear after the existing nightly ontology index has completed.'}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: 48 }}
            >
                {loadFailed ? <Button icon={<LuRefreshCw />} onClick={() => void load()}>Try again</Button> : null}
            </Empty>
        );
    }

    const renderQualityTags = (node: AnswerlatticeEntityGraphNode) => (
        <span className={styles.nodeStatus}>
            {node.answerCount > 0 ? (
                <Tag color="success">{node.answerCount} approved</Tag>
            ) : (
                <Tag color="warning">Missing answer</Tag>
            )}
            {(node.driftedAnswerCount || 0) > 0 ? (
                <Tag color="error">{node.driftedAnswerCount} drifted</Tag>
            ) : null}
            {(node.reviewRequiredAnswerCount || 0) > 0 ? (
                <Tag color="warning">{node.reviewRequiredAnswerCount} need review</Tag>
            ) : null}
        </span>
    );

    const renderBranch = ({ id, node }: MapEntry) => {
        const version = node.currentVersion ? denormalizeVersion(node.currentVersion) : '';
        return (
            <li key={id}>
                <button
                    aria-label={`Focus ${node.name}`}
                    className={styles.nodeButton}
                    onClick={() => setSelectedId(id)}
                    type="button"
                >
                    <span className={styles.nodeTitle}>{node.name}</span>
                    <span className={styles.nodeMeta}>
                        {node.type}{version ? ` · Version ${version}` : ''}
                    </span>
                    {renderQualityTags(node)}
                </button>
            </li>
        );
    };

    const renderRelationGroup = ({ direction, type, entries: groupEntries }: RelationGroup) => {
        const labelId = `knowledge-map-relation-${direction}-${type}`;
        return (
            <section aria-labelledby={labelId} className={styles.relationGroup} key={`${direction}:${type}`}>
                <h3 className={styles.relationGroupLabel} id={labelId}>{getRelationGroupLabel(direction, type)}</h3>
                <ul className={styles.relationList}>{groupEntries.map(renderBranch)}</ul>
            </section>
        );
    };

    const selectedVersion = selectedNode?.currentVersion
        ? denormalizeVersion(selectedNode.currentVersion)
        : '';

    return (
        <section className={styles.shell} style={cssVariables}>
            <header className={styles.header}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Knowledge Map</Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0', maxWidth: 720 }}>
                        Explore approved product relationships and find answer coverage or review gaps without changing support truth.
                    </Paragraph>
                </div>
                <Button icon={<LuRefreshCw />} onClick={() => void load()}>Refresh</Button>
            </header>

            {data.freshness === 'stale' ? (
                <Alert
                    message="Knowledge changed after this map was rebuilt"
                    description="The current map remains read-only. Rebuild the nightly graph before relying on it for governance decisions."
                    showIcon
                    type="warning"
                />
            ) : data.freshness === 'unverified' ? (
                <Alert
                    message="Map freshness is not yet verified"
                    description="The next graph rebuild will attach the source-version evidence needed to verify freshness."
                    showIcon
                    type="info"
                />
            ) : ageWarning ? (
                <Alert
                    message="This map is older than 36 hours"
                    description="Review the nightly scheduler before relying on it for current governance work."
                    showIcon
                    type="warning"
                />
            ) : null}

            <div className={styles.summary}>
                <Tag icon={<LuBoxes />}>{entries.length} entities</Tag>
                <Tag icon={<LuGitBranch />}>{data.relationCount} relationships</Tag>
                <Tag color={totalUncovered ? 'warning' : 'success'}>{totalUncovered} without approved answers</Tag>
                <Tag color={totalDrift ? 'error' : 'success'}>{totalDrift} with drift</Tag>
                <Tag color={totalReview ? 'warning' : 'success'}>{totalReview} requiring review</Tag>
                <Tag color={data.freshness === 'current' ? 'success' : data.freshness === 'stale' ? 'warning' : 'default'}>
                    {data.freshness === 'current' ? 'Freshness verified' : data.freshness === 'stale' ? 'Rebuild needed' : 'Freshness pending'}
                </Tag>
                {lastRebuiltAt ? <Text type="secondary">Rebuilt {new Date(lastRebuiltAt).toLocaleString()}</Text> : null}
            </div>

            <div className={styles.controls}>
                <Select
                    aria-label="Select map entity"
                    filterOption={false}
                    onChange={setSelectedId}
                    onSearch={setQuery}
                    options={filteredEntries.map(entry => ({
                        label: `${entry.node.name} · ${entry.node.type}`,
                        value: entry.id,
                    }))}
                    placeholder="Search and select an entity"
                    showSearch
                    suffixIcon={<LuSearch />}
                    value={selectedId || undefined}
                />
                <Select
                    aria-label="Filter by entity type"
                    onChange={setTypeFilter}
                    options={[
                        { label: 'All entity types', value: 'all' },
                        ...entityTypes.map(type => ({ label: type, value: type })),
                    ]}
                    value={typeFilter}
                />
                <Select
                    aria-label="Filter by answer quality"
                    onChange={setQualityFilter}
                    options={[
                        { label: 'All quality states', value: 'all' },
                        { label: 'No approved answer', value: 'uncovered' },
                        { label: 'Drift detected', value: 'drift' },
                        { label: 'Review required', value: 'review' },
                    ]}
                    value={qualityFilter}
                />
            </div>

            {selectedNode ? (
                <>
                    <div className={styles.canvas}>
                        <div
                            className={`${styles.branch} ${styles.branchLeft} ${relationshipsExpanded ? '' : styles.mobileCollapsed}`}
                            id="knowledge-map-left-branches"
                        >
                            {leftGroups.map(renderRelationGroup)}
                        </div>
                        <div className={styles.rootColumn}>
                            <div className={styles.rootNode}>
                                <span className={styles.nodeTitle}>{selectedNode.name}</span>
                                <span className={styles.nodeMeta}>
                                    {selectedNode.type}{selectedVersion ? ` · Version ${selectedVersion}` : ''}
                                </span>
                                {renderQualityTags(selectedNode)}
                            </div>
                            {relatedEntries.length > 0 ? (
                                <Button
                                    aria-controls="knowledge-map-left-branches knowledge-map-right-branches"
                                    aria-expanded={relationshipsExpanded}
                                    block
                                    className={styles.mobileDisclosure}
                                    icon={relationshipsExpanded ? <LuChevronDown /> : <LuChevronRight />}
                                    onClick={() => setRelationshipsExpanded(current => !current)}
                                >
                                    {relationshipsExpanded ? 'Hide relationships' : 'Show relationships'}
                                </Button>
                            ) : null}
                            {relatedEntries.length === 0 ? <Text type="secondary">No governed relationships yet.</Text> : null}
                        </div>
                        <div
                            className={`${styles.branch} ${styles.branchRight} ${relationshipsExpanded ? '' : styles.mobileCollapsed}`}
                            id="knowledge-map-right-branches"
                        >
                            {rightGroups.map(renderRelationGroup)}
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <Link href={getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.ENTITIES)}>
                            <Button icon={<LuBoxes />}>Manage relationships</Button>
                        </Link>
                        <Link href={getAnswerlatticeEntityContextRoute(
                            getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.ANSWERS),
                            selectedId,
                        )}>
                            <Button>Review canonical answers</Button>
                        </Link>
                        <Link href={getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.CANDIDATES)}>
                            <Button icon={<LuGitPullRequest />}>Review entity candidates</Button>
                        </Link>
                        {(selectedNode.driftedAnswerCount || 0) > 0 ? (
                            <Link href={getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.DRIFT)}>
                                <Button danger icon={<LuShieldAlert />}>Open drift review</Button>
                            </Link>
                        ) : null}
                    </div>
                </>
            ) : (
                <Empty description="No entity matches the current filters." />
            )}
        </section>
    );
}
