'use client';

import DateTimeDisplay from '@atoms/DateTimeDisplay';
import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import {
    ANSWERLATTICE_PERMISSION_KEYS,
    getAnswerlatticeRouteRequiredPermission,
} from '@constant/answerlattice/permissions';
import { ANSWERLATTICE_ROUTES, toAnswerlatticeDashboardRoute } from '@constant/answerlattice/routes';
import { useAnswerlatticePublicContentRequestScope } from '@hook/answerlattice/useAnswerlatticeCacheScope';
import {
    type AnswerlatticeWeeklySummary,
    getAnswerlatticeWeeklySummaryFreshness,
    parseAnswerlatticeWeeklySummary,
} from '@lib/answerlattice/analyticsIntelligenceContracts';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { useAnswerlatticeAccess } from '@providers/answerlatticeAccessProvider';
import { Alert, Button, Card, Col, Empty, Flex, Grid, Row, Skeleton, Space, Statistic, Tag, Typography, message, theme } from 'antd';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuArrowDownRight, LuArrowUpRight, LuDownload, LuGauge, LuListChecks, LuMessagesSquare, LuRefreshCw } from 'react-icons/lu';

const { Paragraph, Text, Title } = Typography;
const ANSWERLATTICE_WEEKLY_DIGEST_LOAD_FAILED = 'Could not load weekly digest';
const ANSWERLATTICE_WEEKLY_DIGEST_EXPORT_FAILED = 'Could not export weekly digest';
const ANSWERLATTICE_WEEKLY_DIGEST_PREPARE_FAILED = 'Could not prepare weekly digest';
const ANSWERLATTICE_WEEKLY_DIGEST_NO_DATA = 'No completed conversation analytics are available for the latest week yet.';
const WEEKLY_DIGEST_RESPONSE_MAX_BYTES = 32 * 1024;
const WEEKLY_DIGEST_PREPARE_REQUEST_POLICY: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};

type WeeklyDigestPrepareResponse = {
    success: true;
    data: {
        weekStart: string;
        weekEnd: string;
        narrativeLength: number;
        highlightsCount: number;
        written: boolean;
    };
} | {
    status: 'no_data';
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isPrepareResponse = (value: unknown): value is WeeklyDigestPrepareResponse => {
    if (!isRecord(value)) return false;
    if (value.status === 'no_data') return true;
    return value.success === true
        && isRecord(value.data)
        && typeof value.data.weekStart === 'string'
        && typeof value.data.weekEnd === 'string'
        && typeof value.data.narrativeLength === 'number'
        && Number.isSafeInteger(value.data.narrativeLength)
        && value.data.narrativeLength >= 0
        && typeof value.data.highlightsCount === 'number'
        && Number.isSafeInteger(value.data.highlightsCount)
        && value.data.highlightsCount >= 0
        && typeof value.data.written === 'boolean';
};

const formatSignedPercentage = (value: number): string => (
    `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
);

const buildWeeklyDigestExport = (digest: AnswerlatticeWeeklySummary): string => [
    'Answerlattice Weekly Digest',
    `${digest.weekStart} to ${digest.weekEnd}`,
    '',
    'Summary',
    digest.narrative,
    '',
    'Highlights',
    ...digest.highlights.map((highlight, index) => `${index + 1}. ${highlight}`),
    '',
    'Recommended review',
    ...digest.recommendations.map((recommendation, index) => `${index + 1}. ${recommendation}`),
    '',
    'Weekly comparison',
    `Conversation volume: ${digest.sourceCompleteness.comparisonComplete && digest.keyMetrics.volumeChangePercent !== null ? formatSignedPercentage(digest.keyMetrics.volumeChangePercent) : 'Not available'}`,
    `Positive feedback share: ${digest.sourceCompleteness.comparisonComplete && digest.keyMetrics.positiveFeedbackSharePointChange !== null ? `${digest.keyMetrics.positiveFeedbackSharePointChange > 0 ? '+' : ''}${digest.keyMetrics.positiveFeedbackSharePointChange.toFixed(1)} percentage points` : 'Not available'}`,
    `Top repeated question: ${digest.keyMetrics.topCategory}`,
    `Current source days: ${digest.sourceCompleteness.currentDays ?? 'Not recorded'}/7`,
    `Comparison source days: ${digest.sourceCompleteness.previousDays ?? 'Not recorded'}/7`,
    '',
    `Generated: ${digest.generatedAt}`,
].join('\n');

export default function AnswerlatticeWeeklyDigest() {
    const { token } = theme.useToken();
    const requestScope = useAnswerlatticePublicContentRequestScope();
    const { access } = useAnswerlatticeAccess();
    const router = useRouter();
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const [digest, setDigest] = useState<AnswerlatticeWeeklySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [preparing, setPreparing] = useState(false);
    const [loadError, setLoadError] = useState(false);

    const loadDigest = useCallback(async (silent = false) => {
        if (!requestScope) {
            setDigest(null);
            setLoadError(false);
            setLoading(false);
            setRefreshing(false);
            return;
        }

        if (silent) setRefreshing(true);
        else setLoading(true);
        setLoadError(false);

        try {
            const digestSnapshot = await getDoc(doc(
                answerlatticeFirebaseClient,
                'insights',
                String(requestScope.tId),
                'stores',
                String(requestScope.sId),
                'ai',
                'weekly',
            ));
            if (!digestSnapshot.exists()) {
                setDigest(null);
                return;
            }
            const parsed = parseAnswerlatticeWeeklySummary(digestSnapshot.data(), {
                tenantId: requestScope.tId,
                storeId: requestScope.sId,
            });
            if (!parsed) throw new Error('answerlattice_weekly_digest_contract_invalid');
            setDigest(parsed);
        } catch (error) {
            logRuntimeFailure('answerlattice_weekly_digest_load_failed', error);
            setDigest(null);
            setLoadError(true);
            message.error(ANSWERLATTICE_WEEKLY_DIGEST_LOAD_FAILED);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [requestScope]);

    useEffect(() => {
        void loadDigest();
    }, [loadDigest]);

    const freshness = useMemo(() => (
        digest ? getAnswerlatticeWeeklySummaryFreshness(digest) : null
    ), [digest]);
    const canPrepareDigest = access?.permissions[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT] === true;
    const canOpenRoute = useCallback((route: string) => {
        if (!access) return false;
        if (access.isPlatformAdmin) return true;
        const pathname = route.split(/[?#]/, 1)[0];
        const requiredPermission = getAnswerlatticeRouteRequiredPermission(pathname);
        return !requiredPermission || access.permissions[requiredPermission] === true;
    }, [access]);

    const openRoute = useCallback((route: string) => {
        router.push(toAnswerlatticeDashboardRoute(route, currentHostname));
    }, [currentHostname, router]);

    const exportDigest = useCallback(() => {
        if (!digest) return;
        try {
            const url = URL.createObjectURL(new Blob([buildWeeklyDigestExport(digest)], { type: 'text/plain;charset=utf-8' }));
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `answerlattice-weekly-digest-${digest.weekStart}.txt`;
            anchor.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            logRuntimeFailure('answerlattice_weekly_digest_export_failed', error);
            message.error(ANSWERLATTICE_WEEKLY_DIGEST_EXPORT_FAILED);
        }
    }, [digest]);

    const prepareDigest = useCallback(async () => {
        if (!canPrepareDigest || preparing) return;
        setPreparing(true);
        try {
            const response = await fetch('/api/analytics/weekly-narrative/generate-local', {
                ...WEEKLY_DIGEST_PREPARE_REQUEST_POLICY,
                method: 'POST',
            });
            const payload = await readJsonResponseWithLimit<unknown>(response, WEEKLY_DIGEST_RESPONSE_MAX_BYTES);
            if (!response.ok || !isPrepareResponse(payload)) {
                throw new Error('answerlattice_weekly_digest_prepare_response_invalid');
            }
            if ('status' in payload) {
                message.warning(ANSWERLATTICE_WEEKLY_DIGEST_NO_DATA);
                return;
            }
            message.success(payload.data.written ? 'Weekly digest prepared.' : 'Weekly digest is already current.');
            await loadDigest(true);
        } catch (error) {
            logRuntimeFailure('answerlattice_weekly_digest_prepare_failed', error);
            message.error(ANSWERLATTICE_WEEKLY_DIGEST_PREPARE_FAILED);
        } finally {
            setPreparing(false);
        }
    }, [canPrepareDigest, loadDigest, preparing]);

    if (loading) return <Skeleton active paragraph={{ rows: 10 }} />;

    if (!digest) {
        return (
            <Flex vertical gap={16} style={{ paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : 0 }}>
                <Flex align={isMobile ? 'stretch' : 'center'} justify="space-between" gap={12} vertical={isMobile}>
                    <div>
                        <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>Weekly Digest</Title>
                        <Text type="secondary">A completed-week view of repeated questions, answer gaps, and support outcomes.</Text>
                    </div>
                    <Button icon={<LuRefreshCw />} loading={refreshing} onClick={() => void loadDigest(true)} style={{ minHeight: 44 }}>
                        Refresh
                    </Button>
                </Flex>
                {loadError ? (
                    <Alert
                        type="error"
                        showIcon
                        message={ANSWERLATTICE_WEEKLY_DIGEST_LOAD_FAILED}
                        description="The digest could not be admitted from the current workspace. Retry before using it for support decisions."
                    />
                ) : null}
                <Empty
                    description="No completed weekly digest is available yet. Answerlattice prepares the first digest after conversation analytics settle and the Sunday UTC scheduler runs."
                    image={(
                        <ContextualStateIllustration
                            color={token.colorPrimary}
                            size={isMobile ? 96 : 128}
                            treatment="softHalo"
                            variant="analyticsContext"
                        />
                    )}
                    styles={{ image: { height: isMobile ? 96 : 128 } }}
                >
                    <Space wrap>
                        {canPrepareDigest ? (
                            <Button type="primary" loading={preparing} onClick={() => void prepareDigest()}>
                                Prepare latest week
                            </Button>
                        ) : null}
                        {canOpenRoute(ANSWERLATTICE_ROUTES.CONVERSATIONS) ? (
                            <Button onClick={() => openRoute(ANSWERLATTICE_ROUTES.CONVERSATIONS)}>
                                Review conversations
                            </Button>
                        ) : null}
                        {canOpenRoute(ANSWERLATTICE_ROUTES.ANSWER_TESTS) ? (
                            <Button onClick={() => openRoute(ANSWERLATTICE_ROUTES.ANSWER_TESTS)}>
                                Check approved answers
                            </Button>
                        ) : null}
                    </Space>
                </Empty>
            </Flex>
        );
    }

    return (
        <Flex vertical gap={isMobile ? 14 : 20} style={{ paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : 0 }}>
            <Flex align={isMobile ? 'stretch' : 'center'} justify="space-between" gap={12} vertical={isMobile}>
                <div>
                    <Space size={8} wrap>
                        <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>Weekly Digest</Title>
                        <Tag color="blue">Deterministic</Tag>
                        <Tag color={freshness?.state === 'current' ? 'success' : 'warning'}>
                            {freshness?.state === 'future'
                                ? 'Invalid timestamp'
                                : freshness?.state === 'stale'
                                    ? 'Needs refresh'
                                    : 'Current'}
                        </Tag>
                    </Space>
                    <Text type="secondary">{digest.weekStart} to {digest.weekEnd} · latest completed UTC week</Text>
                </div>
                <Space wrap>
                    <Button icon={<LuDownload />} onClick={exportDigest} style={{ minHeight: 44 }}>Export</Button>
                    {canPrepareDigest ? (
                        <Button loading={preparing} onClick={() => void prepareDigest()} style={{ minHeight: 44 }}>Prepare latest week</Button>
                    ) : null}
                    <Button icon={<LuRefreshCw />} loading={refreshing} onClick={() => void loadDigest(true)} style={{ minHeight: 44 }}>Refresh</Button>
                </Space>
            </Flex>

            {freshness?.state !== 'current' || !digest.sourceCompleteness.currentWeekComplete ? (
                <Alert
                    type="warning"
                    showIcon
                    message={freshness?.state === 'future'
                        ? 'Weekly digest timestamp is invalid'
                        : freshness?.state === 'stale'
                            ? 'Weekly digest needs refresh'
                            : 'Weekly digest uses partial source days'}
                    description={digest.sourceCompleteness.currentDays === null
                        ? 'Source-completeness evidence was not recorded for this stored digest. Use the underlying review screens before making a support decision.'
                        : `${digest.sourceCompleteness.currentDays}/7 current-week days and ${digest.sourceCompleteness.previousDays}/7 comparison days were admitted. Comparisons stay hidden until both weeks are complete.`}
                />
            ) : null}

            <Row gutter={[12, 12]}>
                <Col xs={24} md={8}>
                    <Card style={{ height: '100%' }}>
                        <Statistic
                            title="Conversation volume"
                            value={digest.sourceCompleteness.comparisonComplete
                                && digest.keyMetrics.volumeChangePercent !== null
                                ? digest.keyMetrics.volumeChangePercent
                                : 'Not available'}
                            precision={digest.sourceCompleteness.comparisonComplete && digest.keyMetrics.volumeChangePercent !== null ? 1 : undefined}
                            suffix={digest.sourceCompleteness.comparisonComplete && digest.keyMetrics.volumeChangePercent !== null ? '%' : undefined}
                            prefix={digest.sourceCompleteness.comparisonComplete && digest.keyMetrics.volumeChangePercent !== null
                                ? digest.keyMetrics.volumeChangePercent >= 0
                                    ? <LuArrowUpRight />
                                    : <LuArrowDownRight />
                                : undefined}
                        />
                        <Text type="secondary">Shown only when both completed weeks have seven admitted source days.</Text>
                    </Card>
                </Col>
                <Col xs={24} md={8}>
                    <Card style={{ height: '100%' }}>
                        <Statistic
                            title="Positive feedback share change"
                            value={digest.sourceCompleteness.comparisonComplete
                                && digest.keyMetrics.positiveFeedbackSharePointChange !== null
                                ? digest.keyMetrics.positiveFeedbackSharePointChange
                                : 'Not available'}
                            precision={digest.sourceCompleteness.comparisonComplete && digest.keyMetrics.positiveFeedbackSharePointChange !== null ? 1 : undefined}
                            suffix={digest.sourceCompleteness.comparisonComplete && digest.keyMetrics.positiveFeedbackSharePointChange !== null ? 'pp' : undefined}
                            prefix={digest.sourceCompleteness.comparisonComplete && digest.keyMetrics.positiveFeedbackSharePointChange !== null ? <LuGauge /> : undefined}
                            valueStyle={digest.sourceCompleteness.comparisonComplete && digest.keyMetrics.positiveFeedbackSharePointChange !== null ? {
                                color: digest.keyMetrics.positiveFeedbackSharePointChange > 0
                                    ? '#389e0d'
                                    : digest.keyMetrics.positiveFeedbackSharePointChange < 0
                                        ? '#cf1322'
                                        : undefined,
                            } : undefined}
                        />
                        <Text type="secondary">Based on recorded feedback, not inferred customer satisfaction.</Text>
                    </Card>
                </Col>
                <Col xs={24} md={8}>
                    <Card style={{ height: '100%' }}>
                        <Flex vertical gap={8}>
                            <Text type="secondary">Top repeated question</Text>
                            <Flex gap={8} align="start">
                                <LuMessagesSquare style={{ marginTop: 4, flexShrink: 0 }} />
                                <Text strong style={{ overflowWrap: 'anywhere' }}>
                                    {digest.keyMetrics.topCategory}
                                </Text>
                            </Flex>
                        </Flex>
                    </Card>
                </Col>
            </Row>

            <Card title="Completed-week summary">
                <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{digest.narrative}</Paragraph>
            </Card>

            <Row gutter={[12, 12]}>
                <Col xs={24} lg={12}>
                    <Card title="What happened" style={{ height: '100%' }}>
                        <Flex vertical gap={10}>
                            {digest.highlights.map((highlight, index) => (
                                <Flex key={`${index}-${highlight}`} gap={10} align="start">
                                    <Tag color="blue">{index + 1}</Tag>
                                    <Text>{highlight}</Text>
                                </Flex>
                            ))}
                        </Flex>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="What to review" style={{ height: '100%' }}>
                        <Flex vertical gap={10}>
                            {digest.recommendations.map((recommendation, index) => (
                                <Flex key={`${index}-${recommendation}`} gap={10} align="start">
                                    <LuListChecks style={{ marginTop: 3, flexShrink: 0 }} />
                                    <Text>{recommendation}</Text>
                                </Flex>
                            ))}
                        </Flex>
                    </Card>
                </Col>
            </Row>

            <Card>
                <Flex justify="space-between" align={isMobile ? 'stretch' : 'center'} vertical={isMobile} gap={12}>
                    <Flex vertical gap={3}>
                        <Text strong>Turn the summary into governed review work</Text>
                        <Text type="secondary">The digest is advisory. Review evidence before changing an approved answer.</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            <DateTimeDisplay value={digest.generatedAt} mode="datetime" label="Generated" />
                        </Text>
                    </Flex>
                    <Space wrap>
                        {canOpenRoute(ANSWERLATTICE_ROUTES.SUPPORT_BOARD) ? (
                            <Button onClick={() => openRoute(ANSWERLATTICE_ROUTES.SUPPORT_BOARD)}>
                                Open Support Board
                            </Button>
                        ) : null}
                        {canOpenRoute(ANSWERLATTICE_ROUTES.ANSWER_TESTS) ? (
                            <Button type="primary" onClick={() => openRoute(ANSWERLATTICE_ROUTES.ANSWER_TESTS)}>
                                Run Answer Tests
                            </Button>
                        ) : null}
                    </Space>
                </Flex>
            </Card>
        </Flex>
    );
}
