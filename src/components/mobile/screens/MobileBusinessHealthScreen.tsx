'use client'

import { FEATURE_FLAGS } from '@config/features';
import { useOwnerBusinessAssistantAnswer } from '@hook/ownerBusinessAssistant/useOwnerBusinessAssistantAnswer';
import { useOwnerBusinessAssistantThread } from '@hook/ownerBusinessAssistant/useOwnerBusinessAssistantThread';
import { useOwnerBusinessAnalyticsIndex } from '@hook/ownerBusinessAssistant/useOwnerBusinessAnalyticsIndex';
import { useOwnerBusinessHealthCurrent } from '@hook/ownerBusinessAssistant/useOwnerBusinessHealthCurrent';
import { useOwnerBusinessLocationsSummary } from '@hook/ownerBusinessAssistant/useOwnerBusinessLocationsSummary';
import { useOwnerPublicTruthReadiness } from '@hook/publicTruthTools/useOwnerPublicTruthReadiness';
import {
    buildOwnerBusinessActivityMetrics,
    getOwnerBusinessCheckActionLabel,
    getOwnerBusinessCheckOwnerMessage,
    getOwnerBusinessPrimaryAnalyticsPeriod,
} from '@lib/ownerBusinessAssistant/businessSignals';
import { OWNER_BUSINESS_HEALTH_STATUS_LABELS } from '@lib/ownerBusinessAssistant/constants';
import { formatOwnerBusinessHealthDateKey, getOwnerBusinessHealthFreshnessNote } from '@lib/ownerBusinessAssistant/freshness';
import type {
    OwnerBusinessHealthCurrentDoc,
    OwnerBusinessHealthQuestion,
} from '@lib/ownerBusinessAssistant/types';
import type { OwnerPublicTruthReadinessMobileFixTarget } from '@lib/public-truth-tools/ownerPublicTruthReadiness';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { theme } from 'antd';
import { type ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuActivity, LuCheckCircle2, LuLayers, LuSend, LuSparkles, LuUser, LuX } from 'react-icons/lu';
import { ProjectSelectorList, ProjectSelectorTrigger, type ProjectSelectorItem } from '../../shared/ProjectSelector';
import { Button, Card, Flex, Input, Popup, Tag, Text, Title, Toast } from '../antd';
import MobilePublicTruthMonitorCard from '../components/MobilePublicTruthMonitorCard';
import MobilePublicTruthOwnerCheckCard from '../components/MobilePublicTruthOwnerCheckCard';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import { useMobileProjects } from '../providers/MobileProjectsProvider';
import {
    getBoundedMobileOwnerStringContext,
    getMobileOwnerStoreLogContext,
    logMobileOwnerFailure,
} from '../utils/mobileOwnerDiagnostics';

interface MobileBusinessHealthScreenProps {
    onBack: () => void;
    onOpenMenuTab?: () => void;
    onOpenMoreScreen?: (screen: 'basicSettings' | 'domainSettings' | 'hoursEdit' | 'officialPage' | 'presenceMonitor') => void;
    onOpenShareTab?: () => void;
}

const ALL_MENUS_SCOPE = '__all_menus__';

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

export default function MobileBusinessHealthScreen({ onBack, onOpenMenuTab, onOpenMoreScreen, onOpenShareTab }: MobileBusinessHealthScreenProps) {
    const { token } = theme.useToken();
    const { storeDetails, tenantDetails } = useContext(PlatformGlobalDataContext);
    const { isLoading: isProjectsLoading, projectsById, projectsList, selectedProjectId } = useMobileProjects();
    const [businessHealthProjectId, setBusinessHealthProjectId] = useState<string | null>(selectedProjectId || null);
    const [isScopeSelectorOpen, setIsScopeSelectorOpen] = useState(false);
    const scopeTouchedRef = useRef(false);
    const scopeStoreRef = useRef<string | number | null>(null);
    const scopedProjectId = businessHealthProjectId || undefined;
    const { current, isLoading, refresh } = useOwnerBusinessHealthCurrent(undefined, storeDetails?.storeId);
    const {
        isLoading: isPublicTruthLoading,
        report: publicTruthReport,
    } = useOwnerPublicTruthReadiness({
        projectDataById: projectsById,
        projectSummaries: projectsList,
        selectedProjectId: scopedProjectId,
        storeDetails,
    });
    const isHealthReady = Boolean(current && current.status !== 'not_ready' && current.sourceRefs?.length);
    const { analytics } = useOwnerBusinessAnalyticsIndex(scopedProjectId, storeDetails?.storeId, { enabled: isHealthReady });
    const { answer, ask, threadId, lastQuestion, isLoading: isAnswering } = useOwnerBusinessAssistantAnswer(scopedProjectId, {
        currentRoute: '/business-health',
        mobileTab: 'more',
        selectedProjectId: scopedProjectId,
    }, storeDetails?.storeId);
    const { messages, refresh: refreshThread } = useOwnerBusinessAssistantThread(threadId, storeDetails?.storeId);
    const hasMultipleStores = Array.isArray(tenantDetails?.storesList)
        && tenantDetails.storesList.filter((store: any) => store?.active !== false && store?.storeDetails?.active !== false).length > 1;
    const { stores: locationStores, isLoading: isLocationsLoading } = useOwnerBusinessLocationsSummary(
        hasMultipleStores,
        storeDetails?.tenantId || storeDetails?.storeId,
        storeDetails?.storeId,
    );
    const [question, setQuestion] = useState('');
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
    const visibleChecks = current?.suggestedChecks || [];
    const analyticsMetrics = useMemo(
        () => buildOwnerBusinessActivityMetrics(getOwnerBusinessPrimaryAnalyticsPeriod(analytics?.periods)),
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
            logMobileOwnerFailure('mobile_business_health_answer_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                ...getBoundedMobileOwnerStringContext('projectId', scopedProjectId),
                hasSuggestedQuestionId: Boolean(suggestedQuestionId),
                questionLength: normalized.length,
            });
            Toast.show({ content: 'Business Health could not answer that.', duration: 2200 });
        }
    };

    const handleSuggested = (suggested: OwnerBusinessHealthQuestion) => {
        void handleAsk(suggested.question, suggested.id);
    };

    const handlePublicTruthFixTarget = (target: OwnerPublicTruthReadinessMobileFixTarget) => {
        if (target === 'menu_tab') {
            onOpenMenuTab?.();
            return;
        }
        if (target === 'share_tab') {
            onOpenShareTab?.();
            return;
        }

        const moreTarget = target === 'basic_settings'
            ? 'basicSettings'
            : target === 'domain_settings'
                ? 'domainSettings'
                : target === 'hours_edit'
                    ? 'hoursEdit'
                    : target === 'official_page'
                        ? 'officialPage'
                        : target === 'presence_monitor'
                            ? 'presenceMonitor'
                            : null;

        if (moreTarget) {
            onOpenMoreScreen?.(moreTarget);
            return;
        }

        Toast.show({ content: 'Open this from desktop settings.', duration: 1600 });
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

                <MobilePublicTruthOwnerCheckCard
                    isLoading={isPublicTruthLoading}
                    onFixTarget={handlePublicTruthFixTarget}
                    report={publicTruthReport}
                />

                <MobilePublicTruthMonitorCard
                    selectedProjectId={scopedProjectId}
                    storeId={storeDetails?.storeId}
                />

                {isHealthReady && analyticsMetrics.length ? (
                    <Card title="Today">
                        <Flex gap={8} vertical>
                            {analyticsMetrics.map((metric) => (
                                <Metric
                                    key={metric.key}
                                    label={metric.label}
                                    value={metric.detail ? `${metric.value} - ${metric.detail}` : metric.value}
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
                    <Card title="Needs attention">
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
                                        <Tag color={check.priority === 'high' ? 'error' : check.priority === 'medium' ? 'warning' : 'primary'}>
                                            {getOwnerBusinessCheckActionLabel(check)}
                                        </Tag>
                                    </Flex>
                                    <Text>{getOwnerBusinessCheckOwnerMessage(check)}</Text>
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

                                        return renderChatBubble({
                                            content: message.content,
                                            id: message.id || `${message.role || 'message'}-${index}`,
                                            role: message.role === 'user' ? 'user' : 'assistant',
                                            children: isLatestAssistant ? (
                                                <>
                                                    {message.freshnessLabel ? <Text type="secondary">{message.freshnessLabel}</Text> : null}
                                                    {renderFollowUpQuestions(message.suggestedQuestions)}
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
