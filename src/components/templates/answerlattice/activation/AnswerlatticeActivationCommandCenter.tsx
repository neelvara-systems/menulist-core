'use client';

import { ANSWERLATTICE_GOVERNANCE_TABS, ANSWERLATTICE_ROUTES, getAnswerlatticeGovernanceRoute, toAnswerlatticeDashboardRoute } from '@constant/answerlattice/navigations';
import { ANSWERLATTICE_CUSTOMER_LANGUAGE } from '@constant/answerlattice/customerLanguage';
import {
    ANSWERLATTICE_ACTIVATION_DASHBOARD_REQUEST_POLICY,
    isAnswerlatticeActivationSummaryResponse,
    isAnswerlatticeCompiledContextRebuildResponse,
    isAnswerlatticeNotificationTestResponse,
    readAnswerlatticeActivationDashboardResponse,
} from '@lib/answerlattice/activationDashboardResponseClient';
import type { AnswerlatticeActivationStep, AnswerlatticeActivationStepStatus, AnswerlatticeActivationSummary } from '@type/answerlattice';
import { useAnswerlatticeCacheScope } from '@hook/answerlattice/useAnswerlatticeCacheScope';
import AnswerlatticeCustomerFlowChecklist from '@template/answerlattice/content/AnswerlatticeCustomerFlowChecklist';
import AnswerlatticeContentWorkbench from '@template/answerlattice/content/AnswerlatticeContentWorkbench';
import AnswerlatticePreOnboardingPromptModal from '@/app/sites/answerlattice/pre-onboarding/PromptModal';
import AnswerlatticeOperationsPanel from './AnswerlatticeOperationsPanel';
import {
    Alert,
    Button,
    Card,
    Col,
    Collapse,
    Flex,
    Grid,
    List,
    Progress,
    Row,
    Skeleton,
    Space,
    Statistic,
    Tag,
    Typography,
    message,
    theme,
} from 'antd';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    LuAlertTriangle,
    LuBookOpen,
    LuBoxes,
    LuCheckCircle2,
    LuHelpCircle,
    LuCircle,
    LuCode,
    LuDatabase,
    LuExternalLink,
    LuFileInput,
    LuLayers,
    LuListChecks,
    LuMail,
    LuRadioTower,
    LuRefreshCw,
    LuRocket,
    LuShield,
    LuShieldCheck,
    LuTicket,
} from 'react-icons/lu';

const { Title, Text, Paragraph } = Typography;
const ANSWERLATTICE_ACTIVATION_SUMMARY_LOAD_FAILED = 'Could not load activation summary';
const ANSWERLATTICE_ACTIVATION_NOTIFICATION_TEST_FAILED = 'Could not send test notification';
const ANSWERLATTICE_COMPILED_CONTEXT_REBUILD_FAILED = 'Could not rebuild compiled context';
const ANSWERLATTICE_COMPILED_CONTEXT_REBUILD_NEEDS_REVIEW = 'Compiled context rebuild needs review';
const ANSWERLATTICE_SUPPORT_LOOP = [
    'Add product knowledge',
    'Approve important answers',
    'Test as a customer',
    'Install support',
    'Return when attention is needed',
] as const;
const ANSWERLATTICE_INPUT_PREPARATION_STEPS = [
    'Copy prompt',
    'Paste into your AI tool',
    'Review the package',
    'Upload selected sources',
] as const;

const STATUS_META = {
    complete: { color: 'success', label: 'Done', icon: LuCheckCircle2 },
    attention: { color: 'warning', label: 'Needs review', icon: LuAlertTriangle },
    pending: { color: 'default', label: 'Pending', icon: LuCircle },
    optional: { color: 'processing', label: 'Optional', icon: LuCircle },
} as const;

type ActivationJourneyCheck = {
    key: string;
    title: string;
    description: string;
    status: AnswerlatticeActivationStepStatus;
};

type ActivationJourneyGroup = {
    key: string;
    title: string;
    description: string;
    status: AnswerlatticeActivationStepStatus;
    statusLabel?: string;
    checks: ActivationJourneyCheck[];
    completeCount: number;
    totalCount: number;
    route?: string;
    actionLabel: string;
    includesCustomerCheck?: boolean;
};

const stageLabel: Record<string, string> = {
    setup: 'Set up workspace',
    knowledge: 'Add knowledge',
    install: 'Install widget',
    live: 'Launch checks complete',
};

const formatDateTime = (value: unknown): string => {
    if (!value) return 'Not seen yet';
    const timestampLike = typeof value === 'object' && value !== null
        ? value as { seconds?: unknown; toDate?: unknown }
        : null;
    const dateInput = typeof value === 'string' || typeof value === 'number' || value instanceof Date
        ? value
        : Number.NaN;
    const date = typeof timestampLike?.toDate === 'function'
        ? timestampLike.toDate()
        : typeof timestampLike?.seconds === 'number'
            ? new Date(timestampLike.seconds * 1000)
            : new Date(dateInput);
    if (Number.isNaN(date.getTime())) return 'Not seen yet';
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getStepIcon = (step: AnswerlatticeActivationStep) => {
    if (step.key.includes('entities')) return <LuBoxes />;
    if (step.key.includes('canonical')) return <LuShield />;
    if (step.key.includes('knowledge')) return <LuBookOpen />;
    if (step.key.includes('help-center')) return <LuBookOpen />;
    if (step.key.includes('surface') || step.key.includes('context')) return <LuLayers />;
    if (step.key.includes('widget')) return <LuCode />;
    if (step.key.includes('origin')) return <LuShieldCheck />;
    if (step.key.includes('ticket')) return <LuTicket />;
    return <LuCircle />;
};

const getLaunchProofIcon = (key: string) => {
    if (key.includes('setup')) return <LuRocket />;
    if (key.includes('knowledge')) return <LuBookOpen />;
    if (key.includes('ontology')) return <LuBoxes />;
    if (key.includes('widget')) return <LuCode />;
    if (key.includes('governance')) return <LuShieldCheck />;
    if (key.includes('signal')) return <LuTicket />;
    return <LuCircle />;
};

const combineActivationStepStatus = (
    steps: AnswerlatticeActivationStep[],
    keys: string[],
): AnswerlatticeActivationStepStatus => {
    const statuses = keys
        .map(key => steps.find(step => step.key === key)?.status)
        .filter((status): status is AnswerlatticeActivationStepStatus => Boolean(status));
    if (!statuses.length) return 'pending';
    if (statuses.every(status => status === 'complete')) return 'complete';
    if (statuses.some(status => status === 'complete' || status === 'attention')) return 'attention';
    return 'pending';
};

const findFirstIncompleteActivationStep = (
    steps: AnswerlatticeActivationStep[],
    keys: string[],
): AnswerlatticeActivationStep | null => {
    for (const key of keys) {
        const step = steps.find(candidate => candidate.key === key);
        if (step && step.status !== 'complete') return step;
    }
    return null;
};

const getActivationCheckDescription = (
    steps: AnswerlatticeActivationStep[],
    keys: string[],
    completeDescription: string,
): string => {
    const incompleteStep = findFirstIncompleteActivationStep(steps, keys);
    if (incompleteStep) return incompleteStep.description;
    return completeDescription;
};

export default function AnswerlatticeActivationCommandCenter() {
    const cacheScopeKey = useAnswerlatticeCacheScope();
    const screens = Grid.useBreakpoint();
    const router = useRouter();
    const { token } = theme.useToken();
    const isMobile = screens.md !== true;
    const [summary, setSummary] = useState<AnswerlatticeActivationSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [testingNotification, setTestingNotification] = useState(false);
    const [rebuildingContext, setRebuildingContext] = useState(false);
    const [technicalDetailsLoaded, setTechnicalDetailsLoaded] = useState(false);
    const [loadedScopeKey, setLoadedScopeKey] = useState<string | null>(null);
    const currentScopeKeyRef = useRef(cacheScopeKey);
    const loadRequestRef = useRef(0);
    const technicalDetailsRef = useRef<HTMLDetailsElement>(null);
    const technicalNotificationsRef = useRef<HTMLDivElement>(null);
    currentScopeKeyRef.current = cacheScopeKey;
    const scopeIsCurrent = Boolean(cacheScopeKey && loadedScopeKey === cacheScopeKey);

    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;

    const loadSummary = useCallback(async (silent = false) => {
        const requestScopeKey = cacheScopeKey;
        const requestId = loadRequestRef.current + 1;
        loadRequestRef.current = requestId;
        if (!requestScopeKey) {
            setSummary(null);
            setLoadedScopeKey(null);
            setLoading(false);
            setRefreshing(false);
            return;
        }
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
            setSummary(null);
            setLoadedScopeKey(null);
            setTestingNotification(false);
            setRebuildingContext(false);
            setTechnicalDetailsLoaded(false);
        }

        try {
            const response = await fetch('/api/answerlattice/activation/summary', {
                ...ANSWERLATTICE_ACTIVATION_DASHBOARD_REQUEST_POLICY,
                method: 'GET',
            });
            const data = await readAnswerlatticeActivationDashboardResponse(
                response,
                'activation_summary_load',
                isAnswerlatticeActivationSummaryResponse,
                ANSWERLATTICE_ACTIVATION_SUMMARY_LOAD_FAILED,
            );
            if (currentScopeKeyRef.current !== requestScopeKey || loadRequestRef.current !== requestId) return;
            setSummary(data.summary);
            setLoadedScopeKey(requestScopeKey);
        } catch {
            if (currentScopeKeyRef.current !== requestScopeKey || loadRequestRef.current !== requestId) return;
            setSummary(null);
            setLoadedScopeKey(requestScopeKey);
            message.error(ANSWERLATTICE_ACTIVATION_SUMMARY_LOAD_FAILED);
        } finally {
            if (currentScopeKeyRef.current === requestScopeKey && loadRequestRef.current === requestId) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [cacheScopeKey]);

    useEffect(() => {
        loadSummary();
    }, [loadSummary]);

    const requiredSteps = useMemo(() => summary?.steps?.filter(step => step.required) || [], [summary]);
    const completeRequired = requiredSteps.filter(step => step.status === 'complete').length;
    const needsReview = summary?.steps?.filter(step => step.status === 'attention') || [];
    const nextProofItem = summary?.launchProof?.items?.find(item => item.status !== 'complete') || null;
    const activationGroups = useMemo<ActivationJourneyGroup[]>(() => {
        if (!summary) return [];
        const steps = summary.steps || [];
        const createCheck = (
            key: string,
            title: string,
            keys: string[],
            completeDescription: string,
        ): ActivationJourneyCheck => ({
            key,
            title,
            description: getActivationCheckDescription(steps, keys, completeDescription),
            status: combineActivationStepStatus(steps, keys),
        });
        const createStepGroup = (input: {
            key: string;
            title: string;
            description: string;
            stepKeys: string[];
            checks: ActivationJourneyCheck[];
            fallbackRoute: string;
            reviewLabel: string;
        }): ActivationJourneyGroup => {
            const incompleteStep = findFirstIncompleteActivationStep(steps, input.stepKeys);
            return {
                key: input.key,
                title: input.title,
                description: input.description,
                status: combineActivationStepStatus(steps, input.stepKeys),
                checks: input.checks,
                completeCount: input.checks.filter(check => check.status === 'complete').length,
                totalCount: input.checks.length,
                route: incompleteStep?.route || input.fallbackRoute,
                actionLabel: incompleteStep?.actionLabel || input.reviewLabel,
            };
        };

        const productKnowledgeChecks = [
            createCheck(
                'workspace-profile',
                'Workspace and product details',
                ['workspace', 'product-profile', 'license'],
                'Workspace, current plan, product URL, and support email are present.',
            ),
            createCheck(
                'knowledge-content',
                'Reviewed help content',
                ['knowledge', 'help-center'],
                'Reviewed knowledge and published help content are available.',
            ),
            createCheck(
                'product-surfaces',
                ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.productPagesAndFlows,
                ['product-surfaces'],
                'Initial product pages and workflows are mapped to support context.',
            ),
        ];
        const trustedAnswerChecks = [
            createCheck(
                'first-ten',
                'First 10 questions',
                ['answer-tests'],
                'The First 10 launch questions have current retained test evidence.',
            ),
            createCheck(
                'product-entities',
                ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.productTopics,
                ['entities'],
                'Reviewed product topics are available for support context.',
            ),
            createCheck(
                'canonical-answers',
                'Approved answers',
                ['canonical-answers'],
                'Approved trusted answers are available for customer support.',
            ),
        ];
        const customerSupportChecks = [
            createCheck(
                'widget-access',
                'Secure widget access',
                ['widget-key', 'allowed-origins'],
                'A widget key and allowed product origins are configured.',
            ),
            createCheck(
                'widget-context',
                'Current widget and page context',
                ['widget-install', 'page-context'],
                'Recent widget runtime and page-context evidence are available.',
            ),
            createCheck(
                'ticket-fallback',
                'Human fallback',
                ['notifications'],
                'Ticket notifications are configured for unresolved questions.',
            ),
        ];
        const proofItems = summary.launchProof.items || [];
        const proofStatus = (keys: string[]) => {
            const selected = keys
                .map(key => proofItems.find(item => item.key === key)?.status)
                .filter((status): status is AnswerlatticeActivationStepStatus => Boolean(status));
            if (!selected.length) return 'pending' as const;
            if (selected.every(status => status === 'complete')) return 'complete' as const;
            if (selected.some(status => status === 'complete' || status === 'attention')) return 'attention' as const;
            return 'pending' as const;
        };
        const verificationChecks: ActivationJourneyCheck[] = [
            {
                key: 'support-truth-proof',
                title: 'Required support truth',
                description: 'Workspace, knowledge, approved answers, and First 10 evidence must all be current.',
                status: proofStatus(['self-serve-setup', 'knowledge-surfaces', 'ontology-canonical', 'priority-answer-checks']),
            },
            {
                key: 'runtime-proof',
                title: 'Widget and context evidence',
                description: 'Recent widget runtime and safe page context must be visible before customer testing.',
                status: proofStatus(['widget-runtime']),
            },
            {
                key: 'governance-signal-proof',
                title: 'Answer quality and fallback evidence',
                description: 'Answer-quality summaries and one fallback evidence source must be ready for review.',
                status: proofStatus(['governance-summaries', 'signal-loop-test']),
            },
        ];
        const launchProofStatus: AnswerlatticeActivationStepStatus = summary.launchProof.ready
            ? 'complete'
            : summary.launchProof.completeCount > 0
                ? 'attention'
                : 'pending';

        return [
            createStepGroup({
                key: 'product-knowledge',
                title: 'Add product knowledge',
                description: 'Give AnswerLattice the minimum reviewed product truth needed to support real customer questions.',
                stepKeys: ['workspace', 'product-profile', 'license', 'knowledge', 'help-center', 'product-surfaces'],
                checks: productKnowledgeChecks,
                fallbackRoute: ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE,
                reviewLabel: 'Review product knowledge',
            }),
            createStepGroup({
                key: 'trusted-answers',
                title: 'Approve your first answers',
                description: 'Protect the questions most likely to interrupt launch with reviewed entities, approved answers, and tests.',
                stepKeys: ['answer-tests', 'entities', 'canonical-answers'],
                checks: trustedAnswerChecks,
                fallbackRoute: ANSWERLATTICE_ROUTES.LAUNCH_ANSWERS,
                reviewLabel: 'Review trusted answers',
            }),
            createStepGroup({
                key: 'customer-support',
                title: 'Connect customer support',
                description: 'Connect the widget safely, pass current page context, and prepare a human fallback for unknown questions.',
                stepKeys: ['widget-key', 'allowed-origins', 'widget-install', 'page-context', 'notifications'],
                checks: customerSupportChecks,
                fallbackRoute: ANSWERLATTICE_ROUTES.INSTALL_CENTER,
                reviewLabel: 'Review support connection',
            }),
            {
                key: 'verify-launch',
                title: 'Verify and go live',
                description: 'Confirm the strict launch evidence, then manually exercise one approved answer, one contextual question, and one unresolved fallback.',
                status: launchProofStatus,
                statusLabel: summary.launchProof.ready ? 'Ready to test' : undefined,
                checks: verificationChecks,
                completeCount: summary.launchProof.completeCount,
                totalCount: summary.launchProof.totalCount,
                route: nextProofItem?.route || ANSWERLATTICE_ROUTES.SUPPORT_ASSISTANT,
                actionLabel: nextProofItem?.actionLabel || 'Open Today\'s Brief',
                includesCustomerCheck: true,
            },
        ];
    }, [nextProofItem, summary]);
    const currentActivationGroup = activationGroups.find(group => group.status !== 'complete') || null;
    const modeCards = [
        {
            key: 'launch',
            title: ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.getLive,
            description: 'Product details, knowledge, customer pages, support install, and launch checks.',
            route: ANSWERLATTICE_ROUTES.ACTIVATION,
            action: 'Open Setup',
            icon: <LuRocket />,
        },
        {
            key: 'support',
            title: ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.runSupport,
            description: 'Help center, knowledge base, changelog, tickets, conversations, and widget operations.',
            route: ANSWERLATTICE_ROUTES.KNOWLEDGE_BASE,
            action: 'Open Knowledge Base',
            icon: <LuTicket />,
        },
        {
            key: 'governance',
            title: ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.answerQuality,
            description: 'Trusted answers, product topics, answers to recheck, suggested updates, and evidence.',
            route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.ANSWERS),
            action: 'Review Answer Quality',
            icon: <LuShieldCheck />,
        },
    ];

    const openRoute = useCallback((route?: string) => {
        if (!route) return;
        router.push(toAnswerlatticeDashboardRoute(route, currentHostname));
    }, [currentHostname, router]);

    const revealTechnicalDetails = useCallback((focus: 'details' | 'notifications' = 'details') => {
        setTechnicalDetailsLoaded(true);
        if (technicalDetailsRef.current) technicalDetailsRef.current.open = true;

        const scrollToTarget = () => {
            const target = focus === 'notifications'
                ? technicalNotificationsRef.current || technicalDetailsRef.current
                : technicalDetailsRef.current;
            target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };

        if (typeof window === 'undefined') {
            scrollToTarget();
            return;
        }
        window.requestAnimationFrame(scrollToTarget);
    }, []);

    const openActivationAction = useCallback((route?: string) => {
        if (!route) return;
        if (route === ANSWERLATTICE_ROUTES.ACTIVATION) {
            revealTechnicalDetails('notifications');
            return;
        }
        openRoute(route);
    }, [openRoute, revealTechnicalDetails]);

    const testNotifications = useCallback(async () => {
        const requestScopeKey = cacheScopeKey;
        if (!requestScopeKey || !scopeIsCurrent) return;
        setTestingNotification(true);
        try {
            const response = await fetch('/api/answerlattice/notifications/test', {
                ...ANSWERLATTICE_ACTIVATION_DASHBOARD_REQUEST_POLICY,
                method: 'POST',
            });
            const data = await readAnswerlatticeActivationDashboardResponse(
                response,
                'notification_test',
                isAnswerlatticeNotificationTestResponse,
                ANSWERLATTICE_ACTIVATION_NOTIFICATION_TEST_FAILED,
            );
            if (currentScopeKeyRef.current !== requestScopeKey) return;
            message.success(`Test email sent to ${data.recipientEmail}`);
            await loadSummary(true);
        } catch {
            if (currentScopeKeyRef.current === requestScopeKey) {
                message.error(ANSWERLATTICE_ACTIVATION_NOTIFICATION_TEST_FAILED);
            }
        } finally {
            if (currentScopeKeyRef.current === requestScopeKey) setTestingNotification(false);
        }
    }, [cacheScopeKey, loadSummary, scopeIsCurrent]);

    const rebuildCompiledContext = useCallback(async () => {
        const requestScopeKey = cacheScopeKey;
        if (!requestScopeKey || !scopeIsCurrent) return;
        setRebuildingContext(true);
        try {
            const response = await fetch('/api/answerlattice/bundles/rebuild', {
                ...ANSWERLATTICE_ACTIVATION_DASHBOARD_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'activation_manual_rebuild', force: true }),
            });
            const data = await readAnswerlatticeActivationDashboardResponse(
                response,
                'compiled_context_rebuild',
                isAnswerlatticeCompiledContextRebuildResponse,
                ANSWERLATTICE_COMPILED_CONTEXT_REBUILD_FAILED,
            );
            if (currentScopeKeyRef.current !== requestScopeKey) return;
            if (data.ok && data.manifest.status === 'ready') {
                message.success(`Compiled context v${data.manifest.bundleVersion} is ready`);
            } else {
                message.warning(ANSWERLATTICE_COMPILED_CONTEXT_REBUILD_NEEDS_REVIEW);
            }
            await loadSummary(true);
        } catch {
            if (currentScopeKeyRef.current === requestScopeKey) {
                message.error(ANSWERLATTICE_COMPILED_CONTEXT_REBUILD_FAILED);
            }
        } finally {
            if (currentScopeKeyRef.current === requestScopeKey) setRebuildingContext(false);
        }
    }, [cacheScopeKey, loadSummary, scopeIsCurrent]);

    if (loading || !scopeIsCurrent) {
        return <Skeleton active paragraph={{ rows: 10 }} />;
    }

    if (!summary) {
        return (
            <Alert
                type="warning"
                message="Activation summary is unavailable"
                description="We could not read this workspace's saved setup. Retry once. If it continues, sign out and back in before changing any settings."
                showIcon
                action={<Button onClick={() => loadSummary(true)} style={{ minHeight: 44 }}>Retry</Button>}
            />
        );
    }

    const bundleStatus = summary.compiledContext?.status || 'empty';
    const bundleStatusColor: Record<string, string> = {
        ready: 'success',
        stale: 'warning',
        building: 'processing',
        failed: 'error',
        superseded: 'warning',
        empty: 'default',
    };
    const launchProofStatus = summary.launchProof?.ready
        ? STATUS_META.complete
        : nextProofItem?.status === 'pending'
            ? STATUS_META.pending
            : STATUS_META.attention;
    const LaunchProofStatusIcon = launchProofStatus.icon;
    const firstValueEvidence = [
        { key: 'knowledge', label: 'Product knowledge ready', value: summary.firstValueEvidence.knowledgeReadyObservedAt },
        { key: 'answer', label: 'First trusted answer ready', value: summary.firstValueEvidence.trustedAnswerReadyObservedAt },
        { key: 'tests', label: 'First 10 proof ready', value: summary.firstValueEvidence.answerTestProofReadyObservedAt },
        { key: 'widget', label: 'Support connection verified', value: summary.firstValueEvidence.widgetRuntimeVerifiedObservedAt },
        { key: 'launch', label: 'Launch proof ready', value: summary.firstValueEvidence.launchProofReadyObservedAt },
    ];

    return (
        <Flex vertical gap={isMobile ? 14 : 20} style={{ paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : 0 }}>
            <Flex align={isMobile ? 'stretch' : 'center'} justify="space-between" gap={12} vertical={isMobile}>
                <div>
                    <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
                        Set up support for {summary.workspace.productName || summary.workspace.companyName || 'this product'}
                    </Title>
                    <Text type="secondary">
                        Follow one guided path. AnswerLattice checks each setup step using this workspace&apos;s current saved status.
                    </Text>
                </div>
                <Space wrap>
                    <Button
                        icon={<LuRefreshCw />}
                        loading={refreshing}
                        onClick={() => loadSummary(true)}
                        style={{ minHeight: 44 }}
                    >
                        Refresh
                    </Button>
                    {summary.launchProof.ready && (
                        <Button
                            icon={<LuListChecks />}
                            onClick={() => openRoute(ANSWERLATTICE_ROUTES.SUPPORT_ASSISTANT)}
                            style={{ minHeight: 44 }}
                        >
                            Today&apos;s Brief
                        </Button>
                    )}
                    {currentActivationGroup?.route && (
                        <Button
                            type="primary"
                            icon={currentActivationGroup.route === ANSWERLATTICE_ROUTES.ACTIVATION ? <LuListChecks /> : <LuExternalLink />}
                            onClick={() => openActivationAction(currentActivationGroup.route)}
                            style={{ minHeight: 44 }}
                        >
                            {currentActivationGroup.actionLabel}
                        </Button>
                    )}
                </Space>
            </Flex>

            <section
                aria-labelledby="answerlattice-support-loop-title"
                style={{
                    paddingBlock: 14,
                    borderBlock: `1px solid ${token.colorBorderSecondary}`,
                }}
            >
                <Flex vertical gap={10}>
                    <div>
                        <Title id="answerlattice-support-loop-title" level={5} style={{ margin: 0 }}>
                            How support stays manageable
                        </Title>
                        <Text type="secondary">
                            Complete the launch path once. After launch, Daily Brief brings back only work that needs a decision.
                        </Text>
                    </div>
                    <Flex gap={8} vertical={isMobile} wrap={!isMobile ? 'wrap' : undefined}>
                        {ANSWERLATTICE_SUPPORT_LOOP.map((step, index) => (
                            <Flex
                                key={step}
                                align="center"
                                gap={8}
                                style={{ flex: isMobile ? undefined : '1 1 150px', minWidth: 0 }}
                            >
                                <Flex
                                    align="center"
                                    justify="center"
                                    style={{
                                        width: 28,
                                        height: 28,
                                        flex: '0 0 28px',
                                        borderRadius: '50%',
                                        background: token.colorPrimaryBg,
                                        color: token.colorPrimaryText,
                                        fontWeight: 600,
                                    }}
                                >
                                    {index + 1}
                                </Flex>
                                <Text strong>{step}</Text>
                            </Flex>
                        ))}
                    </Flex>
                </Flex>
            </section>

            <Alert
                type={summary.launchProof.ready ? 'success' : needsReview.length ? 'warning' : 'info'}
                showIcon
                message={summary.launchProof.ready
                    ? 'Ready for controlled customer testing'
                    : `${summary.launchProof.blockers.length} launch check${summary.launchProof.blockers.length === 1 ? '' : 's'} remain`}
                description={summary.launchProof.ready
                    ? 'Configuration and retained evidence checks are complete. Run the manual customer path before depending on the support layer.'
                    : summary.launchProof.blockers[0]
                        ? `Start with ${summary.launchProof.blockers[0].toLowerCase()}. The ordered launch path keeps the remaining work in one flow.`
                        : 'Follow the ordered launch path before customer traffic depends on support.'}
            />

            <section aria-labelledby="answerlattice-launch-path-title">
                <Flex vertical gap={12}>
                    <Flex align={isMobile ? 'stretch' : 'end'} justify="space-between" gap={10} vertical={isMobile}>
                        <div>
                            <Title id="answerlattice-launch-path-title" level={4} style={{ margin: 0 }}>Launch path</Title>
                            <Text type="secondary">
                                {summary.launchProof.completeCount}/{summary.launchProof.totalCount} setup checks complete
                            </Text>
                        </div>
                        <Text type="secondary">One current action at a time</Text>
                    </Flex>
                    <Progress
                        aria-label={`${summary.launchProof.completeCount} of ${summary.launchProof.totalCount} setup checks complete`}
                        percent={summary.launchProof.score}
                        showInfo={false}
                        status={summary.launchProof.ready ? 'success' : 'active'}
                        strokeColor={summary.launchProof.ready ? token.colorSuccess : token.colorPrimary}
                    />
                    <Collapse
                        key={`${cacheScopeKey}:${currentActivationGroup?.key || 'complete'}`}
                        accordion
                        defaultActiveKey={currentActivationGroup?.key}
                        items={activationGroups.map((group, index) => {
                            const groupMeta = STATUS_META[group.status];
                            const GroupStatusIcon = groupMeta.icon;
                            return {
                                key: group.key,
                                label: (
                                    <Flex align="center" gap={10} style={{ width: '100%', minWidth: 0 }}>
                                        <Flex
                                            align="center"
                                            justify="center"
                                            style={{
                                                width: 28,
                                                height: 28,
                                                flex: '0 0 28px',
                                                borderRadius: '50%',
                                                background: group.status === 'complete' ? token.colorSuccessBg : token.colorPrimaryBg,
                                                color: group.status === 'complete' ? token.colorSuccessText : token.colorPrimaryText,
                                                fontWeight: 600,
                                            }}
                                        >
                                            {index + 1}
                                        </Flex>
                                        <Flex vertical gap={2} style={{ flex: 1, minWidth: 0 }}>
                                            <Text strong>{group.title}</Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                {group.completeCount}/{group.totalCount} {group.key === 'verify-launch' ? 'launch checks complete' : 'parts ready'}
                                            </Text>
                                        </Flex>
                                        <Tag color={groupMeta.color} icon={<GroupStatusIcon />} style={{ marginInlineEnd: 0 }}>
                                            {group.statusLabel || groupMeta.label}
                                        </Tag>
                                    </Flex>
                                ),
                                children: (
                                    <Flex vertical gap={14}>
                                        <Text type="secondary">{group.description}</Text>
                                        {group.key === 'product-knowledge' && group.status !== 'complete' ? (
                                            <section
                                                aria-labelledby="answerlattice-input-preparation-title"
                                                style={{
                                                    padding: isMobile ? 14 : 16,
                                                    border: `1px solid ${token.colorPrimaryBorder}`,
                                                    borderRadius: token.borderRadiusLG,
                                                    background: token.colorPrimaryBg,
                                                }}
                                            >
                                                <Flex vertical gap={14}>
                                                    <Flex align="flex-start" gap={12}>
                                                        <Flex
                                                            align="center"
                                                            justify="center"
                                                            style={{
                                                                width: 40,
                                                                height: 40,
                                                                flex: '0 0 40px',
                                                                borderRadius: token.borderRadiusLG,
                                                                background: token.colorBgContainer,
                                                                color: token.colorPrimaryText,
                                                            }}
                                                        >
                                                            <LuFileInput aria-hidden size={20} />
                                                        </Flex>
                                                        <Flex vertical gap={3} style={{ minWidth: 0 }}>
                                                            <Text id="answerlattice-input-preparation-title" strong>
                                                                Prepare your product inputs with one prompt
                                                            </Text>
                                                            <Text type="secondary">
                                                                Give the prompt to Codex, Cursor, Claude Code, or another capable AI tool. It prepares a review-ready Answerlattice input package from the sources you allow it to inspect.
                                                            </Text>
                                                        </Flex>
                                                    </Flex>
                                                    <Flex gap={8} vertical={isMobile} wrap={!isMobile ? 'wrap' : undefined}>
                                                        {ANSWERLATTICE_INPUT_PREPARATION_STEPS.map((step, stepIndex) => (
                                                            <Flex
                                                                key={step}
                                                                align="center"
                                                                gap={8}
                                                                style={{ flex: isMobile ? undefined : '1 1 150px', minWidth: 0 }}
                                                            >
                                                                <Flex
                                                                    align="center"
                                                                    justify="center"
                                                                    style={{
                                                                        width: 24,
                                                                        height: 24,
                                                                        flex: '0 0 24px',
                                                                        borderRadius: '50%',
                                                                        background: token.colorBgContainer,
                                                                        color: token.colorPrimaryText,
                                                                        fontSize: 12,
                                                                        fontWeight: 600,
                                                                    }}
                                                                >
                                                                    {stepIndex + 1}
                                                                </Flex>
                                                                <Text style={{ fontSize: 13 }}>{step}</Text>
                                                            </Flex>
                                                        ))}
                                                    </Flex>
                                                    <Flex align={isMobile ? 'stretch' : 'center'} justify="space-between" gap={10} vertical={isMobile}>
                                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                                            Review privacy, accuracy, and product boundaries before using the Knowledge Intake action below.
                                                        </Text>
                                                        <AnswerlatticePreOnboardingPromptModal
                                                            directPromptUrl="https://answerlattice.com/pre-onboarding.md"
                                                            promptUrl="/sites/answerlattice/pre-onboarding.md"
                                                            trigger={(openPrompt) => (
                                                                <Button
                                                                    icon={<LuFileInput />}
                                                                    onClick={openPrompt}
                                                                    style={{ minHeight: 44, width: isMobile ? '100%' : undefined }}
                                                                >
                                                                    Copy preparation prompt
                                                                </Button>
                                                            )}
                                                        />
                                                    </Flex>
                                                </Flex>
                                            </section>
                                        ) : null}
                                        <List
                                            split={false}
                                            dataSource={group.checks}
                                            renderItem={(check) => {
                                                const checkMeta = STATUS_META[check.status];
                                                const CheckStatusIcon = checkMeta.icon;
                                                return (
                                                    <List.Item style={{ paddingInline: 0 }}>
                                                        <Flex align="flex-start" gap={10} style={{ width: '100%' }}>
                                                            <span style={{ display: 'inline-flex', marginTop: 3, color: check.status === 'complete' ? token.colorSuccess : token.colorTextSecondary }}>
                                                                <CheckStatusIcon size={17} />
                                                            </span>
                                                            <Flex vertical gap={2} style={{ flex: 1, minWidth: 0 }}>
                                                                <Flex align="center" gap={8} wrap="wrap">
                                                                    <Text strong>{check.title}</Text>
                                                                    <Tag color={checkMeta.color}>{checkMeta.label}</Tag>
                                                                </Flex>
                                                                <Text type="secondary">{check.description}</Text>
                                                            </Flex>
                                                        </Flex>
                                                    </List.Item>
                                                );
                                            }}
                                        />
                                        {group.includesCustomerCheck ? (
                                            <AnswerlatticeCustomerFlowChecklist
                                                embedded
                                                summary={summary}
                                                isMobile={isMobile}
                                                onOpen={openActivationAction}
                                            />
                                        ) : null}
                                        {group.route ? (
                                            <Flex justify={isMobile ? 'stretch' : 'end'}>
                                                <Button
                                                    type={group.status === 'complete' ? 'default' : 'primary'}
                                                    icon={group.route === ANSWERLATTICE_ROUTES.ACTIVATION ? <LuListChecks /> : <LuExternalLink />}
                                                    onClick={() => openActivationAction(group.route)}
                                                    style={{ minHeight: 44, width: isMobile ? '100%' : undefined }}
                                                >
                                                    {group.actionLabel}
                                                </Button>
                                            </Flex>
                                        ) : null}
                                    </Flex>
                                ),
                            };
                        })}
                    />
                </Flex>
            </section>

            <details
                ref={technicalDetailsRef}
                onToggle={(event) => {
                    if (event.currentTarget.open) setTechnicalDetailsLoaded(true);
                }}
                style={{
                    border: `1px solid ${token.colorBorderSecondary}`,
                    borderRadius: token.borderRadiusLG,
                    background: token.colorBgContainer,
                    overflow: 'hidden',
                }}
            >
                <summary
                    style={{
                        minHeight: 52,
                        padding: '13px 16px',
                        cursor: 'pointer',
                        fontWeight: 600,
                    }}
                >
                    Technical evidence and setup details
                </summary>
                {technicalDetailsLoaded ? (
                    <Flex vertical gap={isMobile ? 14 : 20} style={{ padding: isMobile ? 12 : 16, paddingTop: 4 }}>

            {summary.launchProof && (
                <Card>
                    <Flex vertical gap={14}>
                        <Flex align={isMobile ? 'stretch' : 'center'} justify="space-between" gap={12} vertical={isMobile}>
                            <div>
                                <Flex align="center" gap={8} wrap="wrap">
                                    <Text strong>Launch verification</Text>
                                    <Tag color={launchProofStatus.color} icon={<LaunchProofStatusIcon />}>
                                        {summary.launchProof.ready ? 'Ready' : launchProofStatus.label}
                                    </Tag>
                                </Flex>
                                <Text type="secondary">
                                    {summary.launchProof.completeCount}/{summary.launchProof.totalCount} factual checks complete. Verified {formatDateTime(summary.computedAtIso)}.
                                </Text>
                            </div>
                            {nextProofItem?.route && (
                                <Button
                                    type="primary"
                                    icon={<LuExternalLink />}
                                    onClick={() => openRoute(nextProofItem.route)}
                                    style={{ minHeight: 44 }}
                                >
                                    {nextProofItem.actionLabel || 'Continue'}
                                </Button>
                            )}
                        </Flex>
                        <Progress
                            percent={summary.launchProof.score}
                            status={summary.launchProof.ready ? 'success' : 'active'}
                            strokeColor={summary.launchProof.ready ? token.colorSuccess : token.colorPrimary}
                        />
                        <List
                            dataSource={summary.launchProof.items}
                            renderItem={(item) => {
                                const meta = STATUS_META[item.status];
                                const StatusIcon = meta.icon;
                                return (
                                    <List.Item
                                        actions={item.route ? [
                                            <Button
                                                key="action"
                                                type={item.status === 'complete' ? 'text' : 'link'}
                                                icon={<LuExternalLink />}
                                                aria-label={item.actionLabel || `Open ${item.title}`}
                                                onClick={() => openRoute(item.route)}
                                                style={{ minHeight: 44, minWidth: 44 }}
                                            >
                                                {isMobile ? '' : item.actionLabel || 'Open'}
                                            </Button>,
                                        ] : undefined}
                                    >
                                        <List.Item.Meta
                                            avatar={<span style={{ fontSize: 20 }}>{getLaunchProofIcon(item.key)}</span>}
                                            title={(
                                                <Flex align="center" gap={8} wrap="wrap">
                                                    <Text strong>{item.title}</Text>
                                                    <Tag color={meta.color} icon={<StatusIcon />}>{meta.label}</Tag>
                                                </Flex>
                                            )}
                                            description={<Text type="secondary">{item.description}</Text>}
                                        />
                                    </List.Item>
                                );
                            }}
                        />
                    </Flex>
                </Card>
            )}

            <Card>
                <Flex vertical gap={14}>
                    <div>
                        <Text strong>First-value evidence</Text>
                        <br />
                        <Text type="secondary">
                            First observed from retained setup evidence. These timestamps do not prove customer resolution.
                        </Text>
                    </div>
                    <Row gutter={[12, 12]}>
                        {firstValueEvidence.map(item => (
                            <Col xs={24} sm={12} lg={8} key={item.key}>
                                <Flex vertical gap={2} style={{ minWidth: 0 }}>
                                    <Text type="secondary">{item.label}</Text>
                                    <Text strong>{item.value ? formatDateTime(item.value) : 'Not observed yet'}</Text>
                                </Flex>
                            </Col>
                        ))}
                    </Row>
                </Flex>
            </Card>

            <Row gutter={[12, 12]}>
                {modeCards.map((mode) => (
                    <Col xs={24} md={8} key={mode.key}>
                        <Card>
                            <Flex vertical gap={10}>
                                <Flex align="center" gap={8}>
                                    <span style={{ display: 'inline-flex', fontSize: 18 }}>{mode.icon}</span>
                                    <Text strong>{mode.title}</Text>
                                </Flex>
                                <Text type="secondary">{mode.description}</Text>
                                <Button
                                    onClick={() => mode.route === ANSWERLATTICE_ROUTES.ACTIVATION
                                        ? revealTechnicalDetails()
                                        : openRoute(mode.route)}
                                    style={{ minHeight: 44 }}
                                >
                                    {mode.action}
                                </Button>
                            </Flex>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row gutter={[12, 12]}>
                <Col xs={24} md={9}>
                    <Card>
                        <Flex align="center" gap={16}>
                            <Progress
                                type="circle"
                                percent={summary.readinessScore}
                                size={isMobile ? 84 : 104}
                                strokeColor={summary.launchProof.ready ? token.colorSuccess : token.colorPrimary}
                            />
                            <div>
                                <Text type="secondary">Required steps</Text>
                                <Title level={4} style={{ margin: '4px 0' }}>{completeRequired}/{requiredSteps.length}</Title>
                                <Text>{stageLabel[summary.stage] || summary.stage}</Text>
                            </div>
                        </Flex>
                    </Card>
                </Col>
                <Col xs={12} md={3}>
                    <Card>
                        <Statistic title="Articles" value={summary.content.articleCount} prefix={<LuBookOpen />} />
                    </Card>
                </Col>
                <Col xs={12} md={3}>
                    <Card>
                        <Statistic title="FAQs" value={summary.content.faqCount || 0} prefix={<LuHelpCircle />} />
                    </Card>
                </Col>
                <Col xs={12} md={3}>
                    <Card>
                        <Statistic title="Surfaces" value={summary.content.surfaceCount} prefix={<LuLayers />} />
                    </Card>
                </Col>
                <Col xs={12} md={3}>
                    <Card>
                        <Statistic title="Releases" value={summary.content.changelogCount} prefix={<LuRadioTower />} />
                    </Card>
                </Col>
                <Col xs={12} md={3}>
                    <Card>
                        <Statistic title="Tickets" value={summary.content.ticketCount} prefix={<LuTicket />} />
                    </Card>
                </Col>
            </Row>

            <AnswerlatticeContentWorkbench
                summary={summary}
                isMobile={isMobile}
                onOpen={openRoute}
            />

            <Row gutter={[12, 12]}>
                <Col xs={24} lg={16}>
                    <Card title="Launch Checklist">
                        <List
                            dataSource={summary.steps}
                            renderItem={(step) => {
                                const meta = STATUS_META[step.status];
                                const StatusIcon = meta.icon;
                                return (
                                    <List.Item
                                        actions={step.route ? [
                                            <Button
                                                key="action"
                                                type={step.status === 'complete' ? 'text' : 'link'}
                                                icon={<LuExternalLink />}
                                                aria-label={step.actionLabel || `Open ${step.title}`}
                                                onClick={() => openRoute(step.route)}
                                                style={{ minHeight: 44, minWidth: 44 }}
                                            >
                                                {isMobile ? '' : step.actionLabel || 'Open'}
                                            </Button>,
                                        ] : undefined}
                                    >
                                        <List.Item.Meta
                                            avatar={<span style={{ fontSize: 20 }}>{getStepIcon(step)}</span>}
                                            title={(
                                                <Flex align="center" gap={8} wrap="wrap">
                                                    <Text strong>{step.title}</Text>
                                                    <Tag color={meta.color} icon={<StatusIcon />}>{meta.label}</Tag>
                                                    {!step.required && <Tag>Optional</Tag>}
                                                </Flex>
                                            )}
                                            description={(
                                                <Space direction="vertical" size={4}>
                                                    <Text type="secondary">{step.description}</Text>
                                                </Space>
                                            )}
                                        />
                                    </List.Item>
                                );
                            }}
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Flex vertical gap={12}>
                        <AnswerlatticeOperationsPanel
                            isMobile={isMobile}
                            onOpenSettings={() => openRoute(ANSWERLATTICE_ROUTES.SETTINGS)}
                        />
                        <Card title="Widget Runtime">
                            <Space direction="vertical" size={10} style={{ width: '100%' }}>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Key</Text>
                                    <Tag color={summary.widget.hasWidgetKey ? 'success' : 'default'}>
                                        {summary.widget.hasWidgetKey ? summary.widget.keyPrefix || 'Created' : 'Missing'}
                                    </Tag>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Allowed origins</Text>
                                    <Text>{summary.widget.allowedOriginCount}</Text>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Last seen</Text>
                                    <Text style={{ textAlign: 'right' }}>{formatDateTime(summary.widget.runtimeStatus?.lastSeenAt)}</Text>
                                </Flex>
                                {summary.widget.runtimeStatus?.lastPath && (
                                    <Flex justify="space-between" gap={12}>
                                        <Text type="secondary">Route</Text>
                                        <Text code style={{ whiteSpace: 'normal', textAlign: 'right' }}>{summary.widget.runtimeStatus.lastPath}</Text>
                                    </Flex>
                                )}
                            </Space>
                        </Card>
                        <Card title="Compiled Context">
                            <Space direction="vertical" size={10} style={{ width: '100%' }}>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Status</Text>
                                    <Tag color={bundleStatusColor[bundleStatus] || 'default'}>
                                        {bundleStatus}
                                    </Tag>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Version</Text>
                                    <Text>{summary.compiledContext?.activeVersion || summary.compiledContext?.bundleVersion || 0}</Text>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Context size</Text>
                                    <Text>{Math.round((summary.compiledContext?.stats?.bytesTotal || 0) / 1024)} KB</Text>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Routes</Text>
                                    <Text>{summary.compiledContext?.stats?.routes || 0}</Text>
                                </Flex>
                                {summary.compiledContext?.lastBuildError && (
                                    <Text type="danger">{summary.compiledContext.lastBuildError}</Text>
                                )}
                                <Button
                                    block
                                    icon={<LuDatabase />}
                                    loading={rebuildingContext}
                                    onClick={rebuildCompiledContext}
                                    style={{ minHeight: 44 }}
                                >
                                    Rebuild Context
                                </Button>
                            </Space>
                        </Card>
                        <div ref={technicalNotificationsRef}>
                            <Card title="Ticket Notifications">
                                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                                    <Flex justify="space-between" gap={12}>
                                        <Text type="secondary">Email events</Text>
                                        <Tag color={summary.notifications.enabled ? 'success' : 'default'}>
                                            {summary.notifications.enabled ? 'Enabled' : 'Off'}
                                        </Tag>
                                    </Flex>
                                    <Flex justify="space-between" gap={12}>
                                        <Text type="secondary">Sender</Text>
                                        <Tag color={summary.notifications.smtpConfigured ? 'success' : 'warning'}>
                                            {summary.notifications.smtpConfigured ? 'Configured' : 'Missing'}
                                        </Tag>
                                    </Flex>
                                    <Flex justify="space-between" gap={12}>
                                        <Text type="secondary">From</Text>
                                        <Text style={{ textAlign: 'right', wordBreak: 'break-all' }}>
                                            {summary.notifications.fromAddress || 'Not set'}
                                        </Text>
                                    </Flex>
                                    <Button
                                        block
                                        icon={<LuMail />}
                                        loading={testingNotification}
                                        disabled={!summary.notifications.enabled || !summary.notifications.smtpConfigured || !summary.workspace.supportEmail}
                                        onClick={testNotifications}
                                        style={{ minHeight: 44 }}
                                    >
                                        Send Test Email
                                    </Button>
                                </Space>
                            </Card>
                        </div>
                        <Card title="License">
                            <Statistic
                                title={summary.subscription?.planName || 'Plan'}
                                value={summary.subscription?.status || 'Not recorded'}
                            />
                            {summary.subscription?.amount !== null && summary.subscription?.amount !== undefined && (
                                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                                    {summary.subscription.currency || 'INR'} {summary.subscription.amount}
                                </Paragraph>
                            )}
                        </Card>
                        <Card title="Workspace Profile">
                            <Space direction="vertical" size={10} style={{ width: '100%' }}>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Product URL</Text>
                                    <Text style={{ textAlign: 'right', wordBreak: 'break-all' }}>{summary.workspace.productUrl || 'Missing'}</Text>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Support email</Text>
                                    <Text style={{ textAlign: 'right', wordBreak: 'break-all' }}>{summary.workspace.supportEmail || 'Missing'}</Text>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Billing model</Text>
                                    <Text>{summary.workspace.billingModel || 'Not set'}</Text>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Initial surfaces</Text>
                                    <Text>{summary.workspace.primarySurfaceCount || 0}</Text>
                                </Flex>
                            </Space>
                        </Card>
                        <Card title="Answer Evidence">
                            <Space direction="vertical" size={10} style={{ width: '100%' }}>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Trusted-answer coverage</Text>
                                    <Text>
                                        {summary.governance.canonicalCoverageRate !== null && summary.governance.canonicalCoverageRate !== undefined
                                            ? `${summary.governance.canonicalCoverageRate}%`
                                            : 'Pending'}
                                    </Text>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Covered answers</Text>
                                    <Text>{summary.governance.canonicalCoverageTotal ?? 0}</Text>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">No escalation</Text>
                                    <Text>{summary.governance.noEscalationRate !== null && summary.governance.noEscalationRate !== undefined
                                        ? `${summary.governance.noEscalationRate}%`
                                        : 'Pending'}</Text>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Confirmed resolved</Text>
                                    <Text>{summary.governance.confirmedResolutionRate !== null && summary.governance.confirmedResolutionRate !== undefined
                                        ? `${summary.governance.confirmedResolutionRate}% (${summary.governance.confirmedResolutionTotal || 0} outcomes)`
                                        : 'Not enough explicit outcomes'}</Text>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Product-topic coverage</Text>
                                    <Text>{summary.governance.entityAnswerCoverageRate !== null && summary.governance.entityAnswerCoverageRate !== undefined
                                        ? `${summary.governance.entityAnswerCoverageRate}%`
                                        : 'Pending'}</Text>
                                </Flex>
                            </Space>
                        </Card>
                    </Flex>
                </Col>
            </Row>

            <Flex justify={isMobile ? 'stretch' : 'end'} gap={8} vertical={isMobile}>
                <Button onClick={() => openRoute(ANSWERLATTICE_ROUTES.PRODUCT_SURFACES)} style={{ minHeight: 44 }}>
                    {ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.productPagesAndFlows}
                </Button>
                <Button onClick={() => openRoute(ANSWERLATTICE_ROUTES.WIDGET)} style={{ minHeight: 44 }}>
                    Widget Settings
                </Button>
            </Flex>
                    </Flex>
                ) : null}
            </details>
        </Flex>
    );
}
