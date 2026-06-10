'use client'

import { FEATURE_FLAGS } from '@config/features';
import { useOwnerBusinessAssistantAction } from '@hook/ownerBusinessAssistant/useOwnerBusinessAssistantAction';
import { useOwnerBusinessAssistantAnswer } from '@hook/ownerBusinessAssistant/useOwnerBusinessAssistantAnswer';
import { useOwnerBusinessAssistantThread } from '@hook/ownerBusinessAssistant/useOwnerBusinessAssistantThread';
import { useOwnerBusinessAnalyticsIndex } from '@hook/ownerBusinessAssistant/useOwnerBusinessAnalyticsIndex';
import { useOwnerBusinessHealthCurrent } from '@hook/ownerBusinessAssistant/useOwnerBusinessHealthCurrent';
import { useOwnerBusinessLocationsSummary } from '@hook/ownerBusinessAssistant/useOwnerBusinessLocationsSummary';
import { buildOwnerBusinessHealthCheckStateKey } from '@lib/ownerBusinessAssistant/checkStateStorage';
import { OWNER_BUSINESS_HEALTH_STATUS_LABELS } from '@lib/ownerBusinessAssistant/constants';
import { formatOwnerBusinessHealthDateKey, getOwnerBusinessHealthFreshnessNote } from '@lib/ownerBusinessAssistant/freshness';
import type {
    OwnerBusinessAssistantActionOption,
    OwnerBusinessAnalyticsIndexDoc,
    OwnerBusinessAnalyticsPeriod,
    OwnerBusinessHealthCheck,
    OwnerBusinessHealthCurrentDoc,
    OwnerBusinessHealthQuestion,
} from '@lib/ownerBusinessAssistant/types';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { theme } from 'antd';
import { useRouter } from 'next/navigation';
import { type ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuActivity, LuCheckCheck, LuCheckCircle2, LuExternalLink, LuLayers, LuSend, LuSparkles, LuUser, LuX } from 'react-icons/lu';
import { ProjectSelectorList, ProjectSelectorTrigger, type ProjectSelectorItem } from '../../shared/ProjectSelector';
import { Button, Card, Flex, Input, Popup, Tag, Text, Title, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import { useMobileProjects } from '../providers/MobileProjectsProvider';
import MobileBusinessHealthActionSheet from '../sheets/MobileBusinessHealthActionSheet';

interface MobileBusinessHealthScreenProps {
    onBack: () => void;
}

const numberFormatter = new Intl.NumberFormat('en');
const ALL_MENUS_SCOPE = '__all_menus__';

const formatCount = (value?: number) => numberFormatter.format(
    typeof value === 'number' && Number.isFinite(value) ? value : 0,
);

const firstAvailablePeriod = (
    periods: OwnerBusinessAnalyticsIndexDoc['periods'] | undefined,
) => periods?.today
    || periods?.thisWeek
    || periods?.last7Days
    || periods?.yesterday
    || null;

const buildMobileAnalyticsMetrics = (
    period: OwnerBusinessAnalyticsPeriod | undefined,
) => {
    if (!period) return [];
    const topItem = period.topItems?.[0];
    return [
        { key: 'primary', label: period.label, value: `${formatCount(period.metrics.menuVisits)} visits` },
        topItem ? {
            key: 'top-item',
            label: 'Top item',
            value: topItem.name || topItem.itemId,
            delta: `${formatCount(topItem.value)} ${topItem.signal}`,
        } : null,
    ].filter(Boolean) as Array<{ key: string; label: string; value: string; delta?: string }>;
};

const getFeedbackSummaryLine = (current?: OwnerBusinessHealthCurrentDoc | null) => {
    const feedback = current?.feedbackSummary;
    if (!feedback) return null;
    const needsAttention = feedback.periods?.last30Days?.needsAttentionCount ?? feedback.latestNeedsAttention?.length ?? 0;
    if (needsAttention > 0) {
        return `${needsAttention} guest feedback ${needsAttention === 1 ? 'item needs' : 'items need'} checking`;
    }
    const total = feedback.periods?.last30Days?.totalCount ?? feedback.sampledCount ?? 0;
    return total > 0 ? 'Guest feedback is clear' : null;
};

export default function MobileBusinessHealthScreen({ onBack }: MobileBusinessHealthScreenProps) {
    const { token } = theme.useToken();
    const router = useRouter();
    const { storeDetails, tenantDetails } = useContext(PlatformGlobalDataContext);
    const { isLoading: isProjectsLoading, projectsList, selectedProjectId } = useMobileProjects();
    const [businessHealthProjectId, setBusinessHealthProjectId] = useState<string | null>(selectedProjectId || null);
    const [isScopeSelectorOpen, setIsScopeSelectorOpen] = useState(false);
    const scopeTouchedRef = useRef(false);
    const scopeStoreRef = useRef<string | number | null>(null);
    const scopedProjectId = businessHealthProjectId || undefined;
    const { current, isLoading, refresh } = useOwnerBusinessHealthCurrent(undefined, storeDetails?.storeId);
    const isHealthReady = Boolean(current && current.status !== 'not_ready' && current.sourceRefs?.length);
    const { analytics } = useOwnerBusinessAnalyticsIndex(scopedProjectId, storeDetails?.storeId, { enabled: isHealthReady });
    const { answer, ask, threadId, lastQuestion, isLoading: isAnswering } = useOwnerBusinessAssistantAnswer(scopedProjectId, {
        currentRoute: '/business-health',
        mobileTab: 'more',
        selectedProjectId: scopedProjectId,
    }, storeDetails?.storeId);
    const { messages, refresh: refreshThread } = useOwnerBusinessAssistantThread(threadId, storeDetails?.storeId);
    const { runAction, isLoading: isActioning } = useOwnerBusinessAssistantAction(scopedProjectId, storeDetails?.storeId);
    const hasMultipleStores = Array.isArray(tenantDetails?.storesList)
        && tenantDetails.storesList.filter((store: any) => store?.active !== false && store?.storeDetails?.active !== false).length > 1;
    const { stores: locationStores, isLoading: isLocationsLoading } = useOwnerBusinessLocationsSummary(
        hasMultipleStores,
        storeDetails?.tenantId || storeDetails?.storeId,
        storeDetails?.storeId,
    );
    const [question, setQuestion] = useState('');
    const [actionSheetOpen, setActionSheetOpen] = useState(false);
    const [suppressedCheckIds, setSuppressedCheckIds] = useState<Set<string>>(() => new Set());
    const scopeProjects = useMemo(
        () => (projectsList || []).filter((project: any) => project?.projectId && project?.deleted !== true),
        [projectsList],
    );
    const selectedScopeProject = useMemo(
        () => businessHealthProjectId
            ? scopeProjects.find((project: any) => project.projectId === businessHealthProjectId) || null
            : null,
        [businessHealthProjectId, scopeProjects],
    );
    const selectedScopeProjectName = selectedScopeProject?.name || 'Selected menu';
    const scopeSelectorProjects = useMemo<ProjectSelectorItem[]>(() => [
        {
            id: ALL_MENUS_SCOPE,
            name: 'All menus',
            active: true,
            secondaryLabel: scopeProjects.length ? `${scopeProjects.length} menus in this location` : 'Location-level view',
        },
        ...scopeProjects.map((project: any) => ({
            id: project.projectId,
            active: project.active !== false,
            deleted: project.deleted === true,
            isDefault: project.isDefault,
            isSpecialMenu: project.isSpecialMenu === true,
            name: project.name || 'Untitled',
            projectImage: project.projectImage || null,
            secondaryLabel: project.active === false ? 'Inactive menu' : undefined,
            specialMenuBaseProjectId: project.specialMenuBaseProjectId,
            specialMenuBaseProjectName: project.specialMenuBaseProjectId
                ? scopeProjects.find((candidate: any) => candidate.projectId === project.specialMenuBaseProjectId)?.name
                : undefined,
            specialMenuEndsAt: project.specialMenuEndsAt,
            specialMenuStatus: project.specialMenuStatus,
        })),
    ], [scopeProjects]);
    const isFreeTextAskEnabled = FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_FREE_TEXT && isHealthReady;
    const isSuggestedAskEnabled = FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_SUGGESTED_QUESTIONS && isHealthReady;
    const canUpdateChecks = FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_ACTION_SUPPORT
        && FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_ACTION_CHECK_WORKFLOW;
    const canNavigateChecks = FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_ACTION_SUPPORT
        && FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_ACTION_NAVIGATION;
    const canSendQuestion = isFreeTextAskEnabled && Boolean(question.trim()) && !isAnswering;
    const askPlaceholder = isHealthReady ? 'Ask about today or this week' : 'Available after the latest check';
    const freshnessNote = getOwnerBusinessHealthFreshnessNote(current);
    const feedbackSummaryLine = getFeedbackSummaryLine(current);
    const recentMessages = messages.slice(-8);
    const pendingQuestion = lastQuestion?.question.trim();
    const pendingQuestionInMessages = Boolean(pendingQuestion)
        && recentMessages.some((message: any) => message.role === 'user' && message.content === pendingQuestion);
    const answerInMessages = Boolean(answer?.answerId)
        && recentMessages.some((message: any) => message.answerId === answer?.answerId);
    const chatMessages = [
        ...recentMessages,
        ...(pendingQuestion && !pendingQuestionInMessages ? [{
            id: 'pending-user-question',
            role: 'user',
            content: pendingQuestion,
        }] : []),
        ...(answer && !answerInMessages ? [{
            id: `answer-${answer.answerId}`,
            role: 'assistant',
            content: answer.text,
            answerId: answer.answerId,
            freshnessLabel: answer.freshnessLabel,
            suggestedQuestions: answer.suggestedQuestions,
        }] : []),
    ];
    const showStarterQuestions = !answer && !messages.length && !pendingQuestion;
    const latestAssistantMessageIndex = chatMessages.reduce((latest, message: any, index: number) => (
        message.role === 'user' ? latest : index
    ), -1);
    const showNoActionNeeded = Boolean(
        current?.summary.noActionNeeded &&
        current.status !== 'not_ready' &&
        current.sourceRefs?.length,
    );
    const statusIconColor = current?.status === 'needs_review'
        ? token.colorError
        : current?.status === 'watch' || current?.status === 'stale'
            ? token.colorWarning
            : isHealthReady
                ? token.colorSuccess
                : token.colorInfo;
    const statusIconBg = current?.status === 'needs_review'
        ? token.colorErrorBg
        : current?.status === 'watch' || current?.status === 'stale'
            ? token.colorWarningBg
            : isHealthReady
                ? token.colorSuccessBg
                : token.colorInfoBg;
    const visibleChecks = useMemo(
        () => (current?.suggestedChecks || []).filter((check) => !suppressedCheckIds.has(check.id)),
        [current?.suggestedChecks, suppressedCheckIds],
    );
    const analyticsMetrics = useMemo(
        () => buildMobileAnalyticsMetrics(firstAvailablePeriod(analytics?.periods)),
        [analytics?.periods],
    );
    const getLocationStatusColor = (status: string) => {
        if (status === 'stable') return 'success';
        if (status === 'needs_review') return 'danger';
        if (status === 'watch' || status === 'stale') return 'warning';
        return 'default';
    };
    const getLocationFreshnessLabel = (localDate?: string) => {
        const formatted = formatOwnerBusinessHealthDateKey(localDate);
        return formatted ? `Checked ${formatted}` : null;
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setSuppressedCheckIds(new Set((current?.suggestedChecks || [])
            .filter((check) => window.localStorage.getItem(buildOwnerBusinessHealthCheckStateKey({
                checkId: check.id,
                localDate: current?.localDate,
                projectId: scopedProjectId,
                storeId: storeDetails?.storeId,
            })))
            .map((check) => check.id)));
    }, [current?.localDate, current?.suggestedChecks, scopedProjectId, storeDetails?.storeId]);

    useEffect(() => {
        const storeId = storeDetails?.storeId || null;
        if (scopeStoreRef.current !== storeId) {
            scopeStoreRef.current = storeId;
            scopeTouchedRef.current = false;
            setBusinessHealthProjectId(selectedProjectId || null);
            return;
        }

        if (!scopeTouchedRef.current) {
            setBusinessHealthProjectId(selectedProjectId || null);
        }
    }, [selectedProjectId, storeDetails?.storeId]);

    useEffect(() => {
        if (!businessHealthProjectId || isProjectsLoading) return;
        const stillAvailable = scopeProjects.some((project: any) => project.projectId === businessHealthProjectId);
        if (!stillAvailable) {
            setBusinessHealthProjectId(null);
            setQuestion('');
        }
    }, [businessHealthProjectId, isProjectsLoading, scopeProjects]);

    const handleScopeSelect = (projectId: string) => {
        scopeTouchedRef.current = true;
        setBusinessHealthProjectId(projectId === ALL_MENUS_SCOPE ? null : projectId);
        setIsScopeSelectorOpen(false);
        setQuestion('');
    };

    const handleAsk = async (value: string, suggestedQuestionId?: string) => {
        const normalized = value.trim();
        if (!normalized) return;
        if (!isHealthReady) {
            Toast.show({ content: 'Business Health will answer after the latest check finishes.', duration: 1800 });
            return;
        }
        if (suggestedQuestionId && !isSuggestedAskEnabled) {
            Toast.show({ content: 'Suggested questions are not available right now.', duration: 1800 });
            return;
        }
        if (!suggestedQuestionId && !isFreeTextAskEnabled) {
            Toast.show({ content: 'Free-text questions are not available right now.', duration: 1800 });
            return;
        }
        try {
            const result = await ask(normalized, suggestedQuestionId);
            if (threadId || result?.threadId) void refreshThread();
            setQuestion('');
        } catch (error) {
            Toast.show({ content: error instanceof Error ? error.message : 'Business Health could not answer that', duration: 2200 });
        }
    };

    const handleSuggested = (suggested: OwnerBusinessHealthQuestion) => {
        void handleAsk(suggested.question, suggested.id);
    };

    const handleAction = async (action: OwnerBusinessAssistantActionOption) => {
        try {
            const result = await runAction({
                operation: action.riskLevel === 'navigate' ? 'navigate' : 'prepare',
                actionType: action.actionType,
                targetKind: action.targetKind,
                targetId: action.targetId,
                payload: { source: 'mobile_business_health' },
            });
            setActionSheetOpen(false);
            Toast.show({ content: result.message, duration: 1600 });
            if (result.href) router.push(result.href);
        } catch (error) {
            Toast.show({ content: error instanceof Error ? error.message : 'Action could not be completed', duration: 2200 });
        }
    };

    const handleCheckAction = async (
        check: OwnerBusinessHealthCheck,
        operation: 'mark_reviewed' | 'dismiss',
    ) => {
        try {
            await runAction({
                operation,
                actionType: operation === 'dismiss' ? 'dismiss_health_check' : 'mark_health_check_reviewed',
                targetKind: 'store',
                targetId: check.id,
                payload: { checkId: check.id, source: 'mobile_business_health' },
            });
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(buildOwnerBusinessHealthCheckStateKey({
                    checkId: check.id,
                    localDate: current?.localDate,
                    projectId: scopedProjectId,
                    storeId: storeDetails?.storeId,
                }), operation);
            }
            setSuppressedCheckIds((previous) => new Set(previous).add(check.id));
            Toast.show({ content: operation === 'dismiss' ? 'Dismissed' : 'Marked as reviewed', duration: 1600 });
        } catch (error) {
            Toast.show({ content: error instanceof Error ? error.message : 'Action could not be completed', duration: 2200 });
        }
    };

    const handleCheckOpen = async (check: OwnerBusinessHealthCheck) => {
        if (!check.actionType) return;
        try {
            const result = await runAction({
                operation: 'navigate',
                actionType: check.actionType,
                targetKind: 'store',
                targetId: check.id,
                payload: { checkId: check.id, source: 'mobile_business_health' },
            });
            if (result.href) router.push(result.href);
        } catch (error) {
            Toast.show({ content: error instanceof Error ? error.message : 'Screen could not be opened', duration: 2200 });
        }
    };

    const renderFollowUpQuestions = (questions?: OwnerBusinessHealthQuestion[]) => {
        if (!questions?.length) return null;

        return (
            <Flex
                gap={8}
                style={{
                    borderTop: `1px solid ${token.colorBorderSecondary}`,
                    marginTop: 10,
                    paddingTop: 10,
                }}
                vertical
            >
                <Flex align="center" gap={6}>
                    <LuSparkles color={token.colorPrimary} size={14} />
                    <Text type="secondary" style={{ fontSize: 12 }}>You can ask next</Text>
                </Flex>
                <Flex gap={7} vertical>
                    {questions.slice(0, 3).map((suggested) => (
                        <Button
                            block
                            disabled={!isSuggestedAskEnabled}
                            fill="outline"
                            key={suggested.id}
                            loading={isAnswering}
                            onClick={() => handleSuggested(suggested)}
                            style={{
                                background: token.colorBgContainer,
                                borderColor: token.colorBorderSecondary,
                                borderRadius: 12,
                                color: token.colorText,
                                justifyContent: 'flex-start',
                                lineHeight: 1.35,
                                minHeight: 44,
                                textAlign: 'left',
                                whiteSpace: 'normal',
                            }}
                        >
                            {suggested.label}
                        </Button>
                    ))}
                </Flex>
            </Flex>
        );
    };

    const renderChatBubble = ({
        children,
        content,
        id,
        role,
    }: {
        children?: ReactNode;
        content?: string;
        id: string;
        role: 'user' | 'assistant';
    }) => {
        const isUser = role === 'user';

        return (
            <Flex
                align="flex-start"
                gap={8}
                key={id}
                justify={isUser ? 'flex-end' : 'flex-start'}
                style={{ width: '100%' }}
            >
                {!isUser ? (
                    <Flex
                        align="center"
                        justify="center"
                        style={{
                            background: token.colorSuccessBg,
                            border: `1px solid ${token.colorSuccessBorder}`,
                            borderRadius: 999,
                            color: token.colorSuccess,
                            flex: '0 0 30px',
                            height: 30,
                            width: 30,
                        }}
                    >
                        <LuActivity size={15} />
                    </Flex>
                ) : null}
                <Flex
                    gap={6}
                    style={{
                        alignItems: 'stretch',
                        background: isUser ? token.colorPrimaryBg : token.colorBgContainer,
                        border: `1px solid ${isUser ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
                        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        boxShadow: '0 8px 20px rgba(15, 23, 42, 0.05)',
                        maxWidth: isUser ? '86%' : 'calc(100% - 38px)',
                        minWidth: 0,
                        padding: 12,
                    }}
                    vertical
                >
                    <Flex align="center" gap={5}>
                        {isUser ? <LuUser color={token.colorTextSecondary} size={13} /> : <LuActivity color={token.colorTextSecondary} size={13} />}
                        <Text type="secondary" style={{ fontSize: 12 }}>{isUser ? 'You' : 'Business Health'}</Text>
                    </Flex>
                    {content ? <Text style={{ lineHeight: 1.55, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>{content}</Text> : null}
                    {children}
                </Flex>
            </Flex>
        );
    };

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description="Daily business status, checks, and owner questions."
                onBack={onBack}
                title="Business Health"
            />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <ProjectSelectorTrigger
                    clickable
                    currentProject={selectedScopeProject ? {
                        active: selectedScopeProject.active !== false,
                        deleted: selectedScopeProject.deleted === true,
                        id: selectedScopeProject.projectId,
                        isDefault: selectedScopeProject.isDefault,
                        isSpecialMenu: selectedScopeProject.isSpecialMenu === true,
                        name: selectedScopeProjectName,
                        projectImage: selectedScopeProject.projectImage || null,
                        specialMenuBaseProjectId: selectedScopeProject.specialMenuBaseProjectId,
                        specialMenuBaseProjectName: selectedScopeProject.specialMenuBaseProjectId
                            ? scopeProjects.find((project: any) => project.projectId === selectedScopeProject.specialMenuBaseProjectId)?.name
                            : undefined,
                        specialMenuEndsAt: selectedScopeProject.specialMenuEndsAt,
                        specialMenuStatus: selectedScopeProject.specialMenuStatus,
                    } : {
                        id: ALL_MENUS_SCOPE,
                        name: 'All menus',
                        active: true,
                    }}
                    helperText={selectedScopeProject ? 'Questions and analytics use this menu.' : 'Questions and analytics use all menus in this location.'}
                    onClick={() => setIsScopeSelectorOpen(true)}
                    rightContent={!selectedScopeProject ? <Tag color="processing"><LuLayers size={12} /> All</Tag> : undefined}
                />

                <Card>
                    <Flex gap={12} vertical>
                        <Flex align="center" gap={12}>
                            <Flex
                                align="center"
                                justify="center"
                                style={{
                                    background: statusIconBg,
                                    borderRadius: 8,
                                    color: statusIconColor,
                                    height: 40,
                                    width: 40,
                                }}
                            >
                                <LuActivity size={22} />
                            </Flex>
                            <Flex flex={1} style={{ minWidth: 0 }} vertical>
                                <Title level={4} style={{ margin: 0 }}>{current?.summary.headline || 'Latest check'}</Title>
                                <Text type="secondary">{current?.sourceRefs?.[0]?.freshnessLabel || current?.localDate || 'Loading'}</Text>
                            </Flex>
                        </Flex>
                        <Text>{current?.summary.ownerMessage || (isLoading ? 'Loading Business Health...' : 'Business Health is not ready yet.')}</Text>
                        {feedbackSummaryLine ? <Text type="secondary" style={{ fontSize: 13 }}>{feedbackSummaryLine}</Text> : null}
                        {freshnessNote ? <Text type="secondary" style={{ fontSize: 13 }}>{freshnessNote}</Text> : null}
                        {showNoActionNeeded ? (
                            <Tag color="success"><LuCheckCircle2 size={14} /> No action needed</Tag>
                        ) : null}
                        <Button block fill="outline" onClick={() => void refresh()}>
                            Refresh
                        </Button>
                    </Flex>
                </Card>

                {isHealthReady && analyticsMetrics.length ? (
                    <Card title="Analytics">
                        <Flex gap={8} vertical>
                            {analyticsMetrics.map((metric) => (
                                <Metric
                                    key={metric.key}
                                    label={metric.label}
                                    value={metric.delta ? `${metric.value} - ${metric.delta}` : metric.value}
                                />
                            ))}
                        </Flex>
                    </Card>
                ) : null}

                {hasMultipleStores ? (
                    <Card title="Locations">
                        <Flex gap={8} vertical>
                            {isLocationsLoading && !locationStores.length ? <Text type="secondary">Loading locations...</Text> : null}
                            {locationStores.slice(0, 6).map((store) => (
                                <Flex
                                    align="flex-start"
                                    gap={8}
                                    justify="space-between"
                                    key={store.sId}
                                    style={{
                                        borderBottom: `1px solid ${token.colorBorderSecondary}`,
                                        padding: '8px 0',
                                    }}
                                >
                                    <Flex style={{ minWidth: 0 }} vertical>
                                        <Text strong>{store.storeName || `Store ${store.sId}`}</Text>
                                        {store.topReason ? <Text type="secondary" style={{ fontSize: 12 }}>{store.topReason}</Text> : null}
                                        {getLocationFreshnessLabel(store.localDate) ? (
                                            <Text type="secondary" style={{ fontSize: 12 }}>{getLocationFreshnessLabel(store.localDate)}</Text>
                                        ) : null}
                                    </Flex>
                                    <Tag color={getLocationStatusColor(store.status)}>
                                        {OWNER_BUSINESS_HEALTH_STATUS_LABELS[store.status] || store.status}
                                    </Tag>
                                </Flex>
                            ))}
                        </Flex>
                    </Card>
                ) : null}

                {visibleChecks.length ? (
                    <Card title="Checks">
                        <Flex gap={8} vertical>
                            {visibleChecks.slice(0, 4).map((check) => (
                                <Flex
                                    gap={8}
                                    key={check.id}
                                    style={{
                                        border: `1px solid ${token.colorBorder}`,
                                        borderRadius: 8,
                                        padding: 12,
                                    }}
                                    vertical
                                >
                                    <Flex align="center" justify="space-between">
                                        <Text strong>{check.title}</Text>
                                        <Tag color={check.priority === 'high' ? 'error' : check.priority === 'medium' ? 'warning' : 'default'}>{check.priority}</Tag>
                                    </Flex>
                                    <Text>{check.message}</Text>
                                    {check.actionType && canNavigateChecks ? (
                                        <Button
                                            block
                                            fill="solid"
                                            loading={isActioning}
                                            onClick={() => void handleCheckOpen(check)}
                                            style={{ minHeight: 44 }}
                                        >
                                            <LuExternalLink size={16} /> Open
                                        </Button>
                                    ) : null}
                                    {canUpdateChecks ? (
                                        <Flex gap={8}>
                                            <Button
                                                block
                                                fill="outline"
                                                loading={isActioning}
                                                onClick={() => void handleCheckAction(check, 'mark_reviewed')}
                                                style={{ minHeight: 44 }}
                                            >
                                                <LuCheckCheck size={16} /> Reviewed
                                            </Button>
                                            <Button
                                                block
                                                fill="outline"
                                                loading={isActioning}
                                                onClick={() => void handleCheckAction(check, 'dismiss')}
                                                style={{ minHeight: 44 }}
                                            >
                                                <LuX size={16} /> Dismiss
                                            </Button>
                                        </Flex>
                                    ) : null}
                                </Flex>
                            ))}
                        </Flex>
                    </Card>
                ) : null}

                {isHealthReady ? (
                    <Card title="Ask">
                        <Flex gap={10} vertical>
                            {showStarterQuestions && FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_SUGGESTED_QUESTIONS ? current?.suggestedQuestions?.slice(0, 5).map((suggested) => (
                                <Button
                                    block
                                    disabled={!isSuggestedAskEnabled}
                                    fill="outline"
                                    key={suggested.id}
                                    loading={isAnswering}
                                    onClick={() => handleSuggested(suggested)}
                                    style={{
                                        justifyContent: 'flex-start',
                                        lineHeight: 1.35,
                                        minHeight: 44,
                                        textAlign: 'left',
                                        whiteSpace: 'normal',
                                    }}
                                >
                                    {suggested.label}
                                </Button>
                            )) : null}
                            <Flex gap={8}>
                                <Input
                                    disabled={!isFreeTextAskEnabled}
                                    onChange={setQuestion}
                                    placeholder={askPlaceholder}
                                    value={question}
                                />
                                <Button
                                    ariaLabel="Send question"
                                    disabled={!canSendQuestion}
                                    icon={<LuSend size={18} />}
                                    loading={isAnswering}
                                    onClick={() => void handleAsk(question)}
                                    style={{
                                        alignItems: 'center',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        minWidth: 48,
                                        paddingInline: 0,
                                        width: 48,
                                    }}
                                    title="Send question"
                                />
                            </Flex>
                            {chatMessages.length ? (
                                <Flex gap={8} vertical>
                                    {chatMessages.map((message: any, index: number) => {
                                        const isLatestAssistant = message.role !== 'user' && index === latestAssistantMessageIndex;
                                        const isCurrentAnswer = Boolean(answer?.answerId && message.answerId === answer.answerId);

                                        return renderChatBubble({
                                            content: message.content,
                                            id: message.id || `${message.role || 'message'}-${index}`,
                                            role: message.role === 'user' ? 'user' : 'assistant',
                                            children: isLatestAssistant ? (
                                                <>
                                                    {message.freshnessLabel ? <Text type="secondary">{message.freshnessLabel}</Text> : null}
                                                    {renderFollowUpQuestions(message.suggestedQuestions)}
                                                    {isCurrentAnswer && FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_ACTION_SUPPORT && answer?.actions?.length ? (
                                                        <Button
                                                            block
                                                            fill="outline"
                                                            icon={<LuExternalLink />}
                                                            loading={isActioning}
                                                            onClick={() => setActionSheetOpen(true)}
                                                        >
                                                            Open action
                                                        </Button>
                                                    ) : null}
                                                </>
                                            ) : null,
                                        });
                                    })}
                                </Flex>
                            ) : null}
                        </Flex>
                    </Card>
                ) : null}
            </Flex>
            <MobileBusinessHealthActionSheet
                actions={answer?.actions}
                onClose={() => setActionSheetOpen(false)}
                onSelect={(action) => void handleAction(action)}
                open={actionSheetOpen}
            />
            <Popup
                bodyStyle={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
                onMaskClick={() => setIsScopeSelectorOpen(false)}
                visible={isScopeSelectorOpen}
            >
                <Flex gap={16} style={{ maxHeight: 'min(78vh, 680px)', overflowY: 'auto' }} vertical>
                    <Flex align="flex-start" justify="space-between" gap={12}>
                        <Flex gap={4} style={{ flex: 1, minWidth: 0 }} vertical>
                            <Title level={3} style={{ margin: 0, textAlign: 'left' }}>
                                Business Health scope
                            </Title>
                            <Text type="secondary" style={{ textAlign: 'left' }}>
                                Choose all menus or one menu for analytics and questions.
                            </Text>
                        </Flex>
                        <Button
                            ariaLabel="Close"
                            fill="none"
                            onClick={() => setIsScopeSelectorOpen(false)}
                            size="small"
                            style={{ padding: 4 }}
                        >
                            <LuX size={18} />
                        </Button>
                    </Flex>
                    <ProjectSelectorList
                        currentProjectId={businessHealthProjectId || ALL_MENUS_SCOPE}
                        onSelect={handleScopeSelect}
                        projects={scopeSelectorProjects}
                    />
                </Flex>
            </Popup>
        </Flex>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <Flex align="center" justify="space-between">
            <Text type="secondary">{label}</Text>
            <Text strong>{value}</Text>
        </Flex>
    );
}
