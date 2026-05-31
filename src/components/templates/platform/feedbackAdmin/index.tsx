'use client';

import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { FEATURE_FLAGS } from '@config/features';
import { getProductSurfacesForSession } from '@database/answerlattice/productSurfaces';
import { createAnswerlatticeSupportBoardCard } from '@database/answerlattice/supportBoard';
import { getAllFeedback, getFeedbackForWorkspace, updateFeedbackSurfaceForWorkspace } from '@database/feedback';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import {
    AnswerlatticeProductSurface,
    ANSWERLATTICE_SUPPORT_BOARD_PRIORITY,
    ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE,
    ANSWERLATTICE_SUPPORT_BOARD_STATUS,
} from '@type/answerlattice';
import { Feedback } from '@type/feedback';
import { Button, Card, Col, Descriptions, Empty, Flex, Layout, List, message, Modal, Rate, Row, Select, Statistic, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { LuLayers, LuLightbulb, LuMessageSquare, LuStar } from 'react-icons/lu';

const { Title, Text } = Typography;
const { Content } = Layout;

const TYPE_COLORS: Record<string, string> = { general: 'blue', feature_usage: 'orange', feature_request: 'purple', feature_requests: 'purple' };
const TYPE_LABELS: Record<string, string> = { general: 'General', feature_usage: 'Feature Usage', feature_request: 'Feature Request', feature_requests: 'Feature Request' };

const cleanText = (value: unknown, maxLength = 500) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
};

const getFeedbackCardTitle = (feedback: Feedback) => {
    const label = TYPE_LABELS[feedback.type] || feedback.type || 'Feedback';
    const rating = feedback.rating ? ` (${feedback.rating}/5)` : '';
    return cleanText(`${label}${rating}`, 140);
};

const getFeedbackCardDescription = (feedback: Feedback) => {
    const parts = [
        feedback.surfaceLabel || feedback.contextKey ? `Product surface: ${feedback.surfaceLabel || feedback.contextKey}` : '',
        feedback.comment ? `Comment: ${feedback.comment}` : '',
        feedback.featureComment ? `Feature feedback: ${feedback.featureComment}` : '',
        feedback.featureIssues?.length ? `Product areas: ${feedback.featureIssues.join(', ')}` : '',
        feedback.featureRequest ? `Request: ${feedback.featureRequest}` : '',
        feedback.votedPopularRequests?.length
            ? `Votes: ${feedback.votedPopularRequests.map(v => `${v.feature} (${v.interested ? 'interested' : 'not interested'})`).join(', ')}`
            : '',
    ].filter(Boolean);

    return cleanText(parts.join('\n'), 1200) || 'Help Center feedback needs review.';
};

const getFeedbackCardPriority = (feedback: Feedback) => {
    if (feedback.rating && feedback.rating <= 2) return ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.HIGH;
    if (feedback.rating && feedback.rating >= 4 && !feedback.featureRequest) return ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.LOW;
    return ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.MEDIUM;
};

const getFeedbackCardTags = (feedback: Feedback) => ([
    feedback.type,
    feedback.rating ? `rating:${feedback.rating}` : '',
    feedback.featureRequest ? 'feature-request' : '',
    feedback.contextKey ? `surface:${feedback.contextKey}` : '',
    ...(feedback.featureIssues || []).slice(0, 4),
].filter(Boolean) as string[]);

const getFeedbackContextKeys = (feedback: Feedback) => (
    Array.from(new Set([
        feedback.contextKey,
        ...(feedback.featureIssues || []),
    ].filter(Boolean) as string[]))
);

const getSurfaceDisplayLabel = (feedback: Feedback) => (
    cleanText(feedback.surfaceLabel || feedback.contextKey || '', 120)
);

const isFeedbackSurfacePatch = (value: unknown, feedbackId: string): value is Partial<Feedback> => (
    Boolean(value && !Array.isArray(value) && typeof value === 'object' && (value as Feedback).id === feedbackId)
);

const isCreatedSupportCard = (value: unknown) => (
    Boolean(value && !Array.isArray(value) && typeof value === 'object' && (value as any).id)
);

type FeedbackAdminTemplateProps = {
    scope?: {
        tId: number;
        sId: number;
    };
    title?: string;
    description?: string;
    embedded?: boolean;
};

function FeedbackAdminTemplate({
    scope,
    title = 'Feedback Analytics',
    description = 'Review ratings, product feedback, feature requests, and suggestions submitted from the Help Center.',
    embedded = false,
}: FeedbackAdminTemplateProps) {
    const dispatch = useAppDispatch();
    const session = useClientAuthSession();
    const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
    const [surfaces, setSurfaces] = useState<AnswerlatticeProductSurface[]>([]);
    const [surfaceFilter, setSurfaceFilter] = useState<string | undefined>();
    const [selected, setSelected] = useState<Feedback | null>(null);
    const [creatingCard, setCreatingCard] = useState(false);
    const [surfaceUpdating, setSurfaceUpdating] = useState(false);
    const canCreateSupportCard = Boolean(scope && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SUPPORT_BOARD);

    useEffect(() => {
        const fetch = async () => {
            dispatch(startLoader('Loading feedback...'));
            try {
                const [result, surfaceResult] = await Promise.all([
                    scope
                        ? getFeedbackForWorkspace(scope.tId, scope.sId, 200)
                        : getAllFeedback(200),
                    scope
                        ? getProductSurfacesForSession(scope).catch(() => [])
                        : Promise.resolve([]),
                ]);
                setFeedbackList(result || []);
                setSurfaces(surfaceResult || []);
            } catch { message.error('Failed to load feedback'); }
            finally { dispatch(stopLoader('Loading feedback...')); }
        };
        fetch();
    }, [dispatch, scope?.sId, scope?.tId]);

    const surfaceOptions = useMemo(() => (
        surfaces
            .filter(surface => surface.active !== false)
            .map(surface => ({
                value: surface.key,
                label: surface.label || surface.key,
                surface,
            }))
    ), [surfaces]);

    const filteredFeedbackList = useMemo(() => {
        if (!surfaceFilter) return feedbackList;
        if (surfaceFilter === '__unsorted__') {
            return feedbackList.filter(item => !item.contextKey && !item.surfaceId);
        }
        return feedbackList.filter(item => item.contextKey === surfaceFilter || item.surfaceId === surfaceFilter);
    }, [feedbackList, surfaceFilter]);

    const stats = useMemo(() => {
        const total = feedbackList.length;
        const rated = feedbackList.filter(f => f.rating);
        const avgRating = rated.length > 0 ? rated.reduce((s, f) => s + (f.rating || 0), 0) / rated.length : 0;
        const featureRequests = feedbackList.filter(f => f.type === 'feature_request' || f.type === 'feature_requests' || f.featureRequest).length;
        const linkedSurfaces = new Set(feedbackList.map(f => f.contextKey || f.surfaceId).filter(Boolean)).size;
        const unsorted = feedbackList.filter(f => !f.contextKey && !f.surfaceId).length;
        return { total, avgRating, featureRequests, linkedSurfaces, unsorted };
    }, [feedbackList]);

    const updateFeedbackInState = (feedbackId: string, patch: Partial<Feedback>) => {
        setFeedbackList(prev => prev.map(item => item.id === feedbackId ? { ...item, ...patch } : item));
        setSelected(prev => prev?.id === feedbackId ? { ...prev, ...patch } : prev);
    };

    const handleSurfaceChange = async (contextKey?: string) => {
        if (!scope || !selected?.id) return;
        const nextSurface = contextKey ? surfaces.find(surface => surface.key === contextKey) : null;
        if (contextKey && !nextSurface) {
            message.error('Select an available product surface');
            return;
        }

        setSurfaceUpdating(true);
        try {
            const patch = await updateFeedbackSurfaceForWorkspace(selected.id, {
                contextKey: nextSurface?.key || null,
                surfaceId: nextSurface?.id || null,
                surfaceLabel: nextSurface?.label || null,
            });
            if (!isFeedbackSurfacePatch(patch, selected.id)) {
                throw new Error('Surface update did not complete.');
            }
            updateFeedbackInState(selected.id, patch);
            message.success(nextSurface ? 'Feedback linked to product surface' : 'Feedback moved to unsorted');
        } catch {
            message.error('Could not update product surface');
        } finally {
            setSurfaceUpdating(false);
        }
    };

    const createSupportCardFromFeedback = async () => {
        if (!scope || !selected) return;
        setCreatingCard(true);
        try {
            const createdCard = await createAnswerlatticeSupportBoardCard({
                tId: scope.tId,
                sId: scope.sId,
                title: getFeedbackCardTitle(selected),
                description: getFeedbackCardDescription(selected),
                status: ANSWERLATTICE_SUPPORT_BOARD_STATUS.NEEDS_TRIAGE,
                priority: getFeedbackCardPriority(selected),
                sourceType: ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE.FEEDBACK,
                sourceId: selected.id || null,
                relatedSurfaceId: selected.surfaceId || null,
                relatedContextKeys: getFeedbackContextKeys(selected),
                tags: getFeedbackCardTags(selected),
                statusActorId: session?.uId || session?.user?.id || 'unknown',
                statusActorName: session?.user?.name || session?.user?.email || 'Team member',
                statusActorEmail: session?.user?.email || 'team@answerlattice.internal',
                statusRemark: 'Card created from feedback review',
            });
            if (!isCreatedSupportCard(createdCard)) {
                throw new Error('Support Board card was not created.');
            }
            message.success('Feedback added to Support Board');
            setSelected(null);
        } catch {
            message.error('Could not add feedback to Support Board');
        } finally {
            setCreatingCard(false);
        }
    };

    return (
        <Layout style={{ height: '100%', padding: embedded ? 0 : 24 }}>
            <Content>
                <Title level={3}>{title}</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>{description}</Text>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={12} md={6}><Card><Statistic title="Total Feedback" value={stats.total} prefix={<LuMessageSquare />} /></Card></Col>
                    <Col xs={12} md={6}><Card><Statistic title="Avg Rating" value={stats.avgRating} precision={1} suffix="/ 5" prefix={<LuStar />} /></Card></Col>
                    <Col xs={12} md={6}><Card><Statistic title="Surfaces" value={stats.linkedSurfaces} prefix={<LuLayers />} /></Card></Col>
                    <Col xs={12} md={6}><Card><Statistic title="Requests" value={stats.featureRequests} prefix={<LuLightbulb />} /></Card></Col>
                </Row>
                {scope ? (
                    <Flex justify="space-between" align="center" gap={12} style={{ marginBottom: 12, flexWrap: 'wrap' }}>
                        <Text type="secondary">{stats.unsorted} feedback item{stats.unsorted === 1 ? '' : 's'} waiting for a product surface.</Text>
                        <Select
                            allowClear
                            style={{ minWidth: 240 }}
                            placeholder="Filter by product surface"
                            value={surfaceFilter}
                            onChange={setSurfaceFilter}
                            options={[
                                { value: '__unsorted__', label: 'Unsorted' },
                                ...surfaceOptions.map(({ value, label }) => ({ value, label })),
                            ]}
                        />
                    </Flex>
                ) : null}
                <Card title={`${scope ? 'Workspace Feedback' : 'All Feedback'} (${filteredFeedbackList.length})`}>
                    <List
                        dataSource={filteredFeedbackList}
                        locale={{ emptyText: <Empty description="No feedback submitted yet" /> }}
                        renderItem={(item) => (
                            <List.Item onClick={() => setSelected(item)} style={{ cursor: 'pointer' }}>
                                <List.Item.Meta
                                    title={<Flex gap={8} align="center" style={{ flexWrap: 'wrap' }}>
                                        <Tag color={TYPE_COLORS[item.type]}>{TYPE_LABELS[item.type] || item.type}</Tag>
                                        {item.rating && <Rate disabled value={item.rating} style={{ fontSize: 14 }} />}
                                        {getSurfaceDisplayLabel(item) ? <Tag color="geekblue">{getSurfaceDisplayLabel(item)}</Tag> : <Tag>Unsorted</Tag>}
                                    </Flex>}
                                    description={<Flex vertical gap={2}>
                                        {item.comment && <Text ellipsis style={{ maxWidth: 500 }}>{item.comment}</Text>}
                                        {item.featureRequest && <Text type="secondary" ellipsis style={{ maxWidth: 500 }}>Request: {item.featureRequest}</Text>}
                                        <Text type="secondary" style={{ fontSize: 11 }}><DateTimeDisplay value={item.createdOn} mode="datetime" /></Text>
                                    </Flex>}
                                />
                            </List.Item>
                        )}
                    />
                </Card>
                <Modal open={!!selected} onCancel={() => setSelected(null)} footer={null} width={600} title="Feedback Detail">
                    {selected && (
                        <Flex vertical gap={16}>
                            <Descriptions column={1} bordered size="small">
                                <Descriptions.Item label="Type"><Tag color={TYPE_COLORS[selected.type] || 'default'}>{TYPE_LABELS[selected.type] || selected.type}</Tag></Descriptions.Item>
                                {selected.rating && <Descriptions.Item label="Rating"><Rate disabled value={selected.rating} /></Descriptions.Item>}
                                {selected.comment && <Descriptions.Item label="Comment">{selected.comment}</Descriptions.Item>}
                                {selected.featureComment && <Descriptions.Item label="Feature Comment">{selected.featureComment}</Descriptions.Item>}
                                {selected.featureIssues?.length > 0 && <Descriptions.Item label="Feature Issues">{selected.featureIssues.join(', ')}</Descriptions.Item>}
                                {selected.featureRequest && <Descriptions.Item label="Feature Request">{selected.featureRequest}</Descriptions.Item>}
                                {selected.votedPopularRequests?.length > 0 && <Descriptions.Item label="Voted On">{selected.votedPopularRequests.map(v => `${v.feature} (${v.interested ? 'interested' : 'not interested'})`).join(', ')}</Descriptions.Item>}
                                <Descriptions.Item label="Product Surface">{getSurfaceDisplayLabel(selected) || 'Unsorted'}</Descriptions.Item>
                                <Descriptions.Item label="Submitted"><DateTimeDisplay value={selected.createdOn} mode="datetime" /></Descriptions.Item>
                            </Descriptions>
                            {scope ? (
                                <Flex vertical gap={6}>
                                    <Text strong>Product surface</Text>
                                    <Select
                                        allowClear
                                        placeholder="Assign product surface"
                                        value={selected.contextKey || undefined}
                                        onChange={handleSurfaceChange}
                                        loading={surfaceUpdating}
                                        disabled={surfaceUpdating}
                                        options={surfaceOptions.map(({ value, label }) => ({ value, label }))}
                                    />
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Optional. Use this to keep feedback grouped by the product area it belongs to.
                                    </Text>
                                </Flex>
                            ) : null}
                            {canCreateSupportCard ? (
                                <Flex justify="end">
                                    <Button type="primary" onClick={createSupportCardFromFeedback} loading={creatingCard}>
                                        Add to Support Board
                                    </Button>
                                </Flex>
                            ) : null}
                        </Flex>
                    )}
                </Modal>
            </Content>
        </Layout>
    );
}

export default FeedbackAdminTemplate;
