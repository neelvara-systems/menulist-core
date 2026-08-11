'use client';

import {
    listAnswerlatticePostChangeCandidates,
    reviewAnswerlatticePostChangeEvidence,
} from '@lib/answerlattice/postChangeEvidenceClient';
import type {
    AnswerlatticePostChangeCandidate,
    AnswerlatticePostChangeDirection,
    AnswerlatticePostChangeReviewResponse,
} from '@lib/answerlattice/postChangeEvidence';
import {
    Alert,
    Button,
    Descriptions,
    Divider,
    Flex,
    Grid,
    Select,
    Tag,
    Typography,
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuHistory, LuRefreshCw } from 'react-icons/lu';

const { Paragraph, Text, Title } = Typography;

interface PostChangeSupportEvidenceReviewProps {
    tId: number;
    sId: number;
}

const candidateKey = (candidate: AnswerlatticePostChangeCandidate): string => (
    `${candidate.changeType}:${encodeURIComponent(candidate.changeId)}`
);

const formatDate = (value: string): string => {
    const date = new Date(value);
    return Number.isFinite(date.getTime())
        ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
        : 'Unavailable';
};

const formatDateTime = (value: string): string => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString() : 'Unavailable';
};

const directionLabel = (direction: AnswerlatticePostChangeDirection): string => {
    if (direction === 'lower_observed') return 'Lower observed support evidence';
    if (direction === 'higher_observed') return 'Higher observed support evidence';
    return 'Same observed support evidence';
};

const directionColor = (direction: AnswerlatticePostChangeDirection): string => {
    if (direction === 'lower_observed') return 'green';
    if (direction === 'higher_observed') return 'orange';
    return 'default';
};

const signedValue = (value: number, suffix = ''): string => (
    `${value > 0 ? '+' : ''}${value}${suffix}`
);

function ReviewStatus({ review }: { review: AnswerlatticePostChangeReviewResponse }) {
    if (review.status === 'waiting_for_post_window') {
        return (
            <Alert
                showIcon
                type="info"
                message="The after window is still collecting"
                description={`A complete comparison is available after ${formatDateTime(review.eligibleAt)}.`}
            />
        );
    }
    if (review.status === 'outside_retention') {
        return (
            <Alert
                showIcon
                type="warning"
                message="The complete before window is no longer available"
                description="This change falls outside the retained support-signal history, so Answerlattice will not present an incomplete comparison."
            />
        );
    }
    if (review.status === 'source_window_saturated') {
        return (
            <Alert
                showIcon
                type="warning"
                message="This bounded review cannot interpret the complete window"
                description={`At least one window exceeded the ${review.sourceCapPerWindow}-record source cap. No partial comparison is shown.`}
            />
        );
    }
    if (review.status === 'insufficient_evidence') {
        return (
            <Alert
                showIcon
                type="info"
                message="Not enough before-window evidence for a direction"
                description="The exact counts are shown below, but fewer than five admitted events were observed before the change."
            />
        );
    }
    if (!review.comparison?.direction) return null;
    return (
        <Alert
            showIcon
            type="info"
            message={directionLabel(review.comparison.direction)}
            description={`${signedValue(review.comparison.eventDelta)} events (${signedValue(review.comparison.relativeChangePercent ?? 0, '%')}) across the two complete windows. This is observed association, not proof of cause.`}
        />
    );
}

function EvidenceComparison({ review }: { review: AnswerlatticePostChangeReviewResponse }) {
    const screens = Grid.useBreakpoint();
    const comparison = review.comparison;
    if (!comparison) return null;

    return (
        <Descriptions
            bordered
            column={screens.md === true ? 2 : 1}
            size="small"
            items={[
                {
                    key: 'before-window',
                    label: 'Before window',
                    children: `${review.beforeWindow.startDate} to ${review.beforeWindow.endDate}`,
                },
                {
                    key: 'after-window',
                    label: 'After window',
                    children: `${review.afterWindow.startDate} to ${review.afterWindow.endDate}`,
                },
                { key: 'before-total', label: 'Before events', children: comparison.before.total },
                { key: 'after-total', label: 'After events', children: comparison.after.total },
                { key: 'before-tickets', label: 'Before tickets', children: comparison.before.ticketCount },
                { key: 'after-tickets', label: 'After tickets', children: comparison.after.ticketCount },
                { key: 'before-negative', label: 'Before negative feedback', children: comparison.before.chatNegativeCount },
                { key: 'after-negative', label: 'After negative feedback', children: comparison.after.chatNegativeCount },
                { key: 'before-escalations', label: 'Before escalations', children: comparison.before.escalationCount },
                { key: 'after-escalations', label: 'After escalations', children: comparison.after.escalationCount },
                {
                    key: 'delta',
                    label: 'Observed event difference',
                    children: signedValue(comparison.eventDelta),
                },
                {
                    key: 'direction',
                    label: 'Direction',
                    children: comparison.direction ? (
                        <Tag color={directionColor(comparison.direction)}>
                            {directionLabel(comparison.direction)}
                        </Tag>
                    ) : 'Not assigned',
                },
            ]}
        />
    );
}

export default function PostChangeSupportEvidenceReview({
    tId,
    sId,
}: PostChangeSupportEvidenceReviewProps) {
    const screens = Grid.useBreakpoint();
    const [candidates, setCandidates] = useState<AnswerlatticePostChangeCandidate[] | null>(null);
    const [selectedKey, setSelectedKey] = useState<string>();
    const [review, setReview] = useState<AnswerlatticePostChangeReviewResponse | null>(null);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [loadingReview, setLoadingReview] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const candidateRequestRef = useRef(0);
    const reviewRequestRef = useRef(0);

    useEffect(() => {
        candidateRequestRef.current += 1;
        reviewRequestRef.current += 1;
        setCandidates(null);
        setSelectedKey(undefined);
        setReview(null);
        setError(null);
        setLoadingCandidates(false);
        setLoadingReview(false);
    }, [tId, sId]);

    const selectedCandidate = useMemo(() => (
        candidates?.find(candidate => candidateKey(candidate) === selectedKey) || null
    ), [candidates, selectedKey]);

    const loadCandidates = useCallback(async () => {
        const requestId = candidateRequestRef.current + 1;
        candidateRequestRef.current = requestId;
        reviewRequestRef.current += 1;
        setLoadingCandidates(true);
        setLoadingReview(false);
        setError(null);
        setReview(null);
        try {
            const response = await listAnswerlatticePostChangeCandidates();
            if (candidateRequestRef.current !== requestId) return;
            setCandidates(response.candidates);
            setSelectedKey(current => (
                response.candidates.some(candidate => candidateKey(candidate) === current)
                    ? current
                    : undefined
            ));
        } catch {
            if (candidateRequestRef.current !== requestId) return;
            setError('Could not load recent completed changes. Try again.');
        } finally {
            if (candidateRequestRef.current === requestId) setLoadingCandidates(false);
        }
    }, []);

    const compareEvidence = useCallback(async () => {
        if (!selectedCandidate) return;
        const requestId = reviewRequestRef.current + 1;
        reviewRequestRef.current = requestId;
        setLoadingReview(true);
        setError(null);
        setReview(null);
        try {
            const response = await reviewAnswerlatticePostChangeEvidence(
                selectedCandidate.changeType,
                selectedCandidate.changeId,
            );
            if (reviewRequestRef.current !== requestId) return;
            setReview(response);
        } catch {
            if (reviewRequestRef.current !== requestId) return;
            setError('Could not compare support evidence for this change. Try again.');
        } finally {
            if (reviewRequestRef.current === requestId) setLoadingReview(false);
        }
    }, [selectedCandidate]);

    const isNarrow = screens.md !== true;

    return (
        <section aria-labelledby="post-change-support-evidence-title">
            <Divider style={{ marginBlock: 24 }} />
            <Title id="post-change-support-evidence-title" level={5} style={{ marginBottom: 4 }}>
                Support evidence after a change
            </Title>
            <Paragraph type="secondary" style={{ maxWidth: 760, marginBottom: 16 }}>
                Compare complete 14-day support-evidence windows around an activated release or implemented knowledge correction. Counts show association, not cause.
            </Paragraph>

            {candidates === null ? (
                <Button
                    icon={<LuHistory />}
                    loading={loadingCandidates}
                    onClick={loadCandidates}
                    style={{ minHeight: 44 }}
                    type="primary"
                >
                    Review recent changes
                </Button>
            ) : (
                <Flex vertical={isNarrow} align={isNarrow ? 'stretch' : 'end'} gap={10}>
                    <Flex vertical gap={4} style={{ flex: 1, minWidth: 0 }}>
                        <Text strong>Completed change</Text>
                        <Select
                            aria-label="Completed release or knowledge correction"
                            disabled={candidates.length === 0}
                            onChange={(value) => {
                                setSelectedKey(value);
                                setReview(null);
                                setError(null);
                            }}
                            options={candidates.map(candidate => ({
                                value: candidateKey(candidate),
                                label: `${candidate.label} - ${formatDate(candidate.changedAt)} - ${candidate.entityCount} topic${candidate.entityCount === 1 ? '' : 's'}`,
                            }))}
                            placeholder="Choose a completed change"
                            size="large"
                            style={{ width: '100%', minHeight: 44 }}
                            value={selectedKey}
                        />
                    </Flex>
                    <Flex gap={8} style={isNarrow ? { width: '100%' } : undefined}>
                        <Button
                            disabled={!selectedCandidate}
                            loading={loadingReview}
                            onClick={compareEvidence}
                            style={{ minHeight: 44, ...(isNarrow ? { flex: 1 } : {}) }}
                            type="primary"
                        >
                            Compare evidence
                        </Button>
                        <Button
                            aria-label="Reload recent changes"
                            icon={<LuRefreshCw />}
                            loading={loadingCandidates}
                            onClick={loadCandidates}
                            style={{ minHeight: 44, minWidth: 44 }}
                        />
                    </Flex>
                </Flex>
            )}

            {candidates?.length === 0 ? (
                <Alert
                    message="No activated releases or implemented knowledge corrections are available."
                    showIcon
                    style={{ marginTop: 16 }}
                    type="info"
                />
            ) : null}
            {error ? <Alert message={error} showIcon style={{ marginTop: 16 }} type="error" /> : null}

            {review ? (
                <Flex vertical gap={14} style={{ marginTop: 18 }}>
                    <Flex align="center" gap={8} wrap>
                        <Text strong>{review.change.label}</Text>
                        <Tag>{review.change.changeType === 'release' ? 'Release' : 'Knowledge correction'}</Tag>
                        <Text type="secondary">
                            {formatDate(review.change.changedAt)} - {review.change.entityCount} directly linked topic{review.change.entityCount === 1 ? '' : 's'}
                        </Text>
                    </Flex>
                    <ReviewStatus review={review} />
                    <EvidenceComparison review={review} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Change day excluded: {review.excludedUtcDate}. {review.limitations.join(' ')}
                    </Text>
                </Flex>
            ) : null}
        </section>
    );
}
