'use client';

import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_GOVERNANCE_TABS, ANSWERLATTICE_ROUTES, getAnswerlatticeGovernanceRoute } from '@constant/answerlattice/navigations';
import { getAnswerVersionHistory } from '@database/answerlattice/auditLogs';
import { getReleases } from '@database/answerlattice/releases';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import {
    ANSWERLATTICE_ANSWER_TEST_MAX_FULL_RUNTIME_CASES,
    ANSWERLATTICE_ANSWER_TEST_MAX_CASES,
    ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES,
    AnswerlatticeAnswerTestRollbackResponseSchema,
    AnswerlatticeAnswerTestRunClientSchema,
    createEmptyAnswerlatticeAnswerTestSummary,
    isAnswerlatticeAnswerTestRunCurrent,
    parseAnswerlatticeAnswerTestSummaryForClient,
    type AnswerlatticeAnswerTestCase,
    type AnswerlatticeAnswerTestCaseResult,
    type AnswerlatticeAnswerTestCitationPolicy,
    type AnswerlatticeAnswerTestMode,
    type AnswerlatticeAnswerTestRiskLevel,
    type AnswerlatticeAnswerTestRun,
    type AnswerlatticeAnswerTestSource,
    type AnswerlatticeAnswerTestSummary,
} from '@lib/answerlattice/answerTestContracts';
import {
    ANSWERLATTICE_FIRST_TRUSTED_ANSWER_CASE_IDS,
    countAnswerlatticeFirstTrustedAnswerCases,
    createAnswerlatticeFirstTrustedAnswerCases,
    getAnswerlatticeFirstTrustedAnswerCases,
    replaceAnswerlatticeFirstTrustedAnswerCases,
} from '@lib/answerlattice/answerTestStarterPack';
import {
    AnswerlatticeProductStarterPackResponseSchema,
    isAnswerlatticeProductStarterPackCaseId,
} from '@lib/answerlattice/firstTrustedAnswerPackContracts';
import { AnswerlatticeKnowledgeIntakeJobSchema } from '@lib/answerlattice/knowledgeIntakeContracts';
import {
    getAnswerlatticeAnswerContextRoute,
    normalizeAnswerlatticeOwnerReleaseContext,
} from '@lib/answerlattice/ownerDecisionNavigation';
import { normalizeAnswerlatticeVersionLabel } from '@lib/answerlattice/releaseContracts';
import {
    parseAnswerlatticeScopeCoverageMatrixForClient,
    type AnswerlatticeScopeCoverageMatrix,
    type AnswerlatticeScopeCoverageRow,
    type AnswerlatticeScopeCoverageStatus,
} from '@lib/answerlattice/scopeCoverageMatrix';
import { createRuntimeId } from '@lib/runtime/randomId';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import type {
    AnswerlatticeActivationAnswerTestSummary,
    AnswerlatticeAuditLog,
    AnswerlatticeKnowledgeIntakeJob,
    AnswerlatticeRelease,
} from '@type/answerlattice';
import {
    Alert,
    App,
    Button,
    Card,
    Checkbox,
    Empty,
    Flex,
    Form,
    Grid,
    Input,
    List,
    Modal,
    Popconfirm,
    Select,
    Space,
    Statistic,
    Table,
    Tag,
    Tooltip,
    Typography,
    message,
    theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    LuArchiveRestore,
    LuCheck,
    LuClipboardCheck,
    LuExternalLink,
    LuFlaskConical,
    LuPencil,
    LuPlay,
    LuPlus,
    LuRefreshCw,
    LuRocket,
    LuShieldCheck,
    LuSparkles,
    LuTrash2,
    LuX,
} from 'react-icons/lu';

const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;
const RESPONSE_MAX_BYTES = 512 * 1024;
const ACTION_BUTTON_STYLE = { minHeight: 44 };
const ICON_ACTION_BUTTON_STYLE = { width: 44, minWidth: 44, height: 44, padding: 0 };

type AnswerTestResponse = {
    summary?: AnswerlatticeAnswerTestSummary;
    run?: AnswerlatticeAnswerTestRun;
    launchProof?: AnswerlatticeActivationAnswerTestSummary;
    scopeCoverageMatrix?: unknown;
    proposalId?: string;
    error?: string;
};

type IntakeJobsResponse = {
    jobs?: AnswerlatticeKnowledgeIntakeJob[];
    error?: string;
};

type ScopeCoverageDisplayRow = AnswerlatticeScopeCoverageRow & {
    testCase: AnswerlatticeAnswerTestCase;
};

type TestFormValues = {
    title: string;
    query: string;
    expectedSource: AnswerlatticeAnswerTestSource;
    expectedAnswerId?: string;
    expectedFaqId?: string;
    minimumConfidence?: 'high' | 'medium' | 'low' | 'none';
    citationPolicy: AnswerlatticeAnswerTestCitationPolicy;
    referenceIds?: string;
    mustInclude?: string;
    mustNotInclude?: string;
    riskLevel: AnswerlatticeAnswerTestRiskLevel;
    relatedEntityIds?: string;
    contextKey?: string;
    path?: string;
    feature?: string;
    workflow?: string;
    plan?: string;
    role?: string;
    state?: string;
    version?: string;
    active: boolean;
};

const SOURCE_LABELS: Record<AnswerlatticeAnswerTestSource, string> = {
    canonical: 'Trusted answer',
    faq: 'Published FAQ',
    rag: 'Knowledge fallback',
    escalation: 'Ticket escalation',
    no_answer: 'No approved answer',
};

const SOURCE_COLORS: Record<AnswerlatticeAnswerTestSource, string> = {
    canonical: 'green',
    faq: 'cyan',
    rag: 'blue',
    escalation: 'orange',
    no_answer: 'default',
};

const CITATION_POLICY_LABELS: Record<AnswerlatticeAnswerTestCitationPolicy, string> = {
    not_required: 'No reference check',
    at_least_one: 'Require a supporting reference',
    specific_sources: 'Require specific references',
};

const PROOF_STATUS_LABELS = {
    ready: 'Ready',
    review: 'Review',
    blocked: 'Blocked',
} as const;

const PROOF_STATUS_COLORS = {
    ready: 'green',
    review: 'orange',
    blocked: 'red',
} as const;

const SCOPE_COVERAGE_LABELS: Record<AnswerlatticeScopeCoverageStatus, string> = {
    covered: 'Covered',
    needs_review: 'Needs review',
    missing: 'Approved answer missing',
    unverified: 'Not verified',
    other_route: 'Different expected route',
};

const SCOPE_COVERAGE_COLORS: Record<AnswerlatticeScopeCoverageStatus, string> = {
    covered: 'green',
    needs_review: 'orange',
    missing: 'red',
    unverified: 'default',
    other_route: 'blue',
};

const splitLines = (value?: string, maxItems = 8) => (
    Array.from(new Set(String(value || '')
        .split(/[\n,]/)
        .map(item => item.trim())
        .filter(Boolean)))
        .slice(0, maxItems)
);

const getErrorMessage = (payload: AnswerTestResponse | null, fallback: string) => (
    typeof payload?.error === 'string' && payload.error.trim() ? payload.error : fallback
);

const readResponse = async (response: Response): Promise<AnswerTestResponse | null> => (
    readJsonResponseWithLimit<AnswerTestResponse>(response, RESPONSE_MAX_BYTES)
);

const normalizeLaunchProof = (value: unknown): AnswerlatticeActivationAnswerTestSummary | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const candidate = value as Record<string, unknown>;
    const activeCaseCount = candidate.activeCaseCount;
    const firstTenCount = candidate.firstTenCount;
    const latestCriticalFailureCount = candidate.latestCriticalFailureCount;
    const latestProofStatus = candidate.latestProofStatus;
    const lastRunAt = candidate.lastRunAt;
    if (
        !Number.isInteger(activeCaseCount)
        || Number(activeCaseCount) < 0
        || !Number.isInteger(firstTenCount)
        || Number(firstTenCount) < 0
        || Number(firstTenCount) > 10
        || !Number.isInteger(latestCriticalFailureCount)
        || Number(latestCriticalFailureCount) < 0
        || Number(latestCriticalFailureCount) > 10
        || typeof candidate.latestProofStale !== 'boolean'
        || ![null, 'ready', 'review', 'blocked'].includes(latestProofStatus as null | string)
        || Number(activeCaseCount) < Number(firstTenCount)
        || (Number(firstTenCount) < 10 && latestProofStatus !== null)
        || (candidate.latestProofStale === true && latestProofStatus !== null)
        || (latestProofStatus === 'blocked' && Number(latestCriticalFailureCount) === 0)
        || (latestProofStatus !== 'blocked' && Number(latestCriticalFailureCount) > 0)
        || (lastRunAt !== null && (
            typeof lastRunAt !== 'string'
            || !Number.isFinite(Date.parse(lastRunAt))
            || new Date(lastRunAt).toISOString() !== lastRunAt
        ))
    ) {
        return null;
    }
    return {
        activeCaseCount: Number(activeCaseCount),
        firstTenCount: Number(firstTenCount),
        latestCriticalFailureCount: Number(latestCriticalFailureCount),
        latestProofStale: candidate.latestProofStale,
        latestProofStatus: latestProofStatus as AnswerlatticeActivationAnswerTestSummary['latestProofStatus'],
        lastRunAt: lastRunAt as string | null,
    };
};

const formatDateTime = (value?: string | null) => {
    if (!value) return 'Not run';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
};

const getScopeValue = (value?: string | null) => value?.trim() || 'Not specified';

const buildFormValues = (testCase?: AnswerlatticeAnswerTestCase | null): TestFormValues => ({
    title: testCase?.title || '',
    query: testCase?.query || '',
    expectedSource: testCase?.expected.source || 'canonical',
    expectedAnswerId: testCase?.expected.answerId || '',
    expectedFaqId: testCase?.expected.faqId || '',
    minimumConfidence: testCase?.expected.minimumConfidence,
    citationPolicy: testCase?.expected.citationPolicy || 'not_required',
    referenceIds: testCase?.expected.referenceIds.join('\n') || '',
    mustInclude: testCase?.expected.mustInclude.join('\n') || '',
    mustNotInclude: testCase?.expected.mustNotInclude.join('\n') || '',
    riskLevel: testCase?.riskLevel || 'standard',
    relatedEntityIds: testCase?.relatedEntityIds.join('\n') || '',
    contextKey: testCase?.context?.contextKey || '',
    path: testCase?.context?.path || '',
    feature: testCase?.context?.feature || '',
    workflow: testCase?.context?.workflow || '',
    plan: testCase?.context?.plan || '',
    role: testCase?.context?.userRole || testCase?.context?.role || '',
    state: testCase?.context?.state || '',
    version: testCase?.context?.version || '',
    active: testCase?.active !== false,
});

const buildContext = (values: TestFormValues) => {
    const context = {
        contextVersion: 1,
        ...(values.contextKey?.trim() ? { contextKey: values.contextKey.trim() } : {}),
        ...(values.path?.trim() ? { path: values.path.trim() } : {}),
        ...(values.feature?.trim() ? { feature: values.feature.trim() } : {}),
        ...(values.workflow?.trim() ? { workflow: values.workflow.trim() } : {}),
        ...(values.plan?.trim() ? { plan: values.plan.trim() } : {}),
        ...(values.role?.trim() ? { role: values.role.trim() } : {}),
        ...(values.state?.trim() ? { state: values.state.trim() } : {}),
        ...(values.version?.trim() ? { version: values.version.trim() } : {}),
    };
    return Object.keys(context).length > 1 ? context : undefined;
};

type AnswerlatticeAnswerTestsProps = {
    entryMode?: 'suite' | 'launch';
};

export default function AnswerlatticeAnswerTests({ entryMode = 'suite' }: AnswerlatticeAnswerTestsProps) {
    const { modal } = App.useApp();
    const session = useClientAuthSession();
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const routeContextQuery = searchParams?.toString() ?? '';
    const requestedReleaseId = normalizeAnswerlatticeOwnerReleaseContext(searchParams?.get('release')) || '';
    const isMobile = screens.md !== true;
    const isLaunchMode = entryMode === 'launch';
    const launchProofQuery = isLaunchMode ? '?includeLaunchProof=1' : '';
    const scopeCoverageEnabled = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SCOPE_COVERAGE_MATRIX
        && !isLaunchMode;
    const answerTestProofQuery = scopeCoverageEnabled
        ? '?includeScopeCoverage=1'
        : launchProofQuery;
    const tId = Number(session?.tId || 0);
    const sId = Number(session?.sId || 0);
    const [form] = Form.useForm<TestFormValues>();
    const selectedRiskLevel = Form.useWatch('riskLevel', form);
    const selectedCaseIsActive = Form.useWatch('active', form);
    const [summary, setSummary] = useState<AnswerlatticeAnswerTestSummary>(() => createEmptyAnswerlatticeAnswerTestSummary(0, 0));
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [runningMode, setRunningMode] = useState<AnswerlatticeAnswerTestMode | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [editingCase, setEditingCase] = useState<AnswerlatticeAnswerTestCase | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [releaseModalOpen, setReleaseModalOpen] = useState(false);
    const [releases, setReleases] = useState<AnswerlatticeRelease[]>([]);
    const [selectedReleaseId, setSelectedReleaseId] = useState<string>();
    const [releaseLoading, setReleaseLoading] = useState(false);
    const [rollbackResult, setRollbackResult] = useState<AnswerlatticeAnswerTestCaseResult | null>(null);
    const [rollbackHistory, setRollbackHistory] = useState<AnswerlatticeAuditLog[]>([]);
    const [selectedAuditLogId, setSelectedAuditLogId] = useState<string>();
    const [rollbackReason, setRollbackReason] = useState('Restore the last known answer version after a failed regression test.');
    const [rollbackLoading, setRollbackLoading] = useState(false);
    const [intakeJobs, setIntakeJobs] = useState<AnswerlatticeKnowledgeIntakeJob[]>([]);
    const [selectedIntakeJobId, setSelectedIntakeJobId] = useState<string>();
    const [intakeJobsLoading, setIntakeJobsLoading] = useState(false);
    const [productPackGenerating, setProductPackGenerating] = useState(false);
    const [lastPackWasCached, setLastPackWasCached] = useState<boolean | null>(null);
    const [currentLaunchProof, setCurrentLaunchProof] = useState<AnswerlatticeActivationAnswerTestSummary | null>(null);
    const [scopeCoverageMatrix, setScopeCoverageMatrix] = useState<AnswerlatticeScopeCoverageMatrix | null>(null);
    const handledReleaseContextRef = useRef('');

    const loadSummary = useCallback(async () => {
        if (!tId || !sId || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ANSWER_TESTS) return;
        setLoading(true);
        try {
            const response = await fetch(`/api/answerlattice/answer-tests${answerTestProofQuery}`, {
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
            });
            const payload = await readResponse(response);
            const parsedSummary = parseAnswerlatticeAnswerTestSummaryForClient(
                payload?.summary,
                { tId, sId },
            );
            if (!response.ok || !parsedSummary) throw new Error(getErrorMessage(payload, 'Could not load answer tests.'));
            setSummary(parsedSummary);
            setCurrentLaunchProof(normalizeLaunchProof(payload?.launchProof));
            setScopeCoverageMatrix(scopeCoverageEnabled
                ? parseAnswerlatticeScopeCoverageMatrixForClient(
                    payload?.scopeCoverageMatrix,
                    parsedSummary,
                )
                : null);
        } catch (error) {
            setScopeCoverageMatrix(null);
            message.error(error instanceof Error ? error.message : 'Could not load answer tests.');
        } finally {
            setLoading(false);
        }
    }, [answerTestProofQuery, sId, scopeCoverageEnabled, tId]);

    useEffect(() => {
        void loadSummary();
    }, [loadSummary]);

    const loadIntakeJobs = useCallback(async () => {
        if (
            entryMode !== 'launch'
            || !tId
            || !sId
            || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PRODUCT_STARTER_PACK
            || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE
        ) return;
        setIntakeJobsLoading(true);
        try {
            const response = await fetch('/api/answerlattice/knowledge-intake/jobs', {
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
            });
            const payload = await readJsonResponseWithLimit<IntakeJobsResponse>(response, RESPONSE_MAX_BYTES);
            if (!response.ok || !Array.isArray(payload?.jobs)) {
                throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not load product sources.');
            }
            const jobs = payload.jobs.flatMap((job) => {
                const parsed = AnswerlatticeKnowledgeIntakeJobSchema.safeParse(job);
                return parsed.success
                    && parsed.data.tId === tId
                    && parsed.data.sId === sId
                    ? [parsed.data as AnswerlatticeKnowledgeIntakeJob]
                    : [];
            });
            setIntakeJobs(jobs);
            setSelectedIntakeJobId(current => (
                current && jobs.some(job => (
                    job.id === current
                    && Number(job.readySourceCount || 0) > 0
                    && !['publishing', 'published', 'cancelled'].includes(job.status)
                ))
                    ? current
                    : jobs.find(job => (
                        Number(job.readySourceCount || 0) > 0
                        && !['publishing', 'published', 'cancelled'].includes(job.status)
                    ))?.id
            ));
        } catch (error) {
            message.warning(error instanceof Error ? error.message : 'Could not load product sources.');
        } finally {
            setIntakeJobsLoading(false);
        }
    }, [entryMode, sId, tId]);

    useEffect(() => {
        void loadIntakeJobs();
    }, [loadIntakeJobs]);

    const saveCases = useCallback(async (cases: AnswerlatticeAnswerTestCase[]) => {
        setSaving(true);
        try {
            const response = await fetch(`/api/answerlattice/answer-tests${answerTestProofQuery}`, {
                method: 'PUT',
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ revision: summary.revision, cases }),
            });
            const payload = await readResponse(response);
            const parsedSummary = parseAnswerlatticeAnswerTestSummaryForClient(
                payload?.summary,
                { tId, sId },
            );
            if (!response.ok || !parsedSummary) throw new Error(getErrorMessage(payload, 'Could not save answer tests.'));
            setSummary(parsedSummary);
            setCurrentLaunchProof(normalizeLaunchProof(payload?.launchProof));
            setScopeCoverageMatrix(scopeCoverageEnabled
                ? parseAnswerlatticeScopeCoverageMatrixForClient(
                    payload?.scopeCoverageMatrix,
                    parsedSummary,
                )
                : null);
            return true;
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not save answer tests.');
            return false;
        } finally {
            setSaving(false);
        }
    }, [answerTestProofQuery, sId, scopeCoverageEnabled, summary.revision, tId]);

    const openCreate = useCallback(() => {
        setEditingCase(null);
        form.setFieldsValue(buildFormValues());
        setEditorOpen(true);
    }, [form]);

    const openEdit = useCallback((testCase: AnswerlatticeAnswerTestCase) => {
        setEditingCase(testCase);
        form.setFieldsValue(buildFormValues(testCase));
        setEditorOpen(true);
    }, [form]);

    const submitCase = useCallback(async () => {
        const values = await form.validateFields();
        if (
            values.riskLevel === 'critical'
            && values.expectedSource === 'rag'
            && (values.active !== false || !editingCase)
        ) {
            message.error(
                'Critical tests must use approved canonical or FAQ truth, ticket escalation, or no approved answer.',
            );
            return;
        }
        const now = new Date().toISOString();
        const nextCase: AnswerlatticeAnswerTestCase = {
            id: editingCase?.id || createRuntimeId('case'),
            title: values.title.trim(),
            query: values.query.trim(),
            ...(buildContext(values) ? { context: buildContext(values) } : {}),
            expected: {
                source: values.expectedSource,
                ...(values.expectedAnswerId?.trim() ? { answerId: values.expectedAnswerId.trim() } : {}),
                ...(values.expectedFaqId?.trim() ? { faqId: values.expectedFaqId.trim() } : {}),
                ...(values.minimumConfidence ? { minimumConfidence: values.minimumConfidence } : {}),
                citationPolicy: values.citationPolicy,
                referenceIds: splitLines(values.referenceIds),
                mustInclude: splitLines(values.mustInclude),
                mustNotInclude: splitLines(values.mustNotInclude),
            },
            riskLevel: values.riskLevel,
            relatedEntityIds: splitLines(values.relatedEntityIds, 10),
            ...(editingCase?.launchPack ? { launchPack: editingCase.launchPack } : {}),
            active: values.active !== false,
            createdAt: editingCase?.createdAt || now,
            updatedAt: now,
        };
        const cases = editingCase
            ? summary.cases.map(testCase => testCase.id === editingCase.id ? nextCase : testCase)
            : [...summary.cases, nextCase];
        if (await saveCases(cases)) {
            setEditorOpen(false);
            setEditingCase(null);
            form.resetFields();
            message.success(editingCase ? 'Answer test updated.' : 'Answer test added.');
        }
    }, [editingCase, form, saveCases, summary.cases]);

    const deleteCase = useCallback(async (caseId: string) => {
        if (await saveCases(summary.cases.filter(testCase => testCase.id !== caseId))) {
            setSelectedIds(ids => ids.filter(id => id !== caseId));
            message.success('Answer test removed.');
        }
    }, [saveCases, summary.cases]);

    const addStarterCases = useCallback(() => {
        if (summary.cases.some(testCase => isAnswerlatticeProductStarterPackCaseId(testCase.id))) {
            message.info('The product-specific starter set already replaces the general fallback questions.');
            return;
        }
        const availableSlots = Math.max(ANSWERLATTICE_ANSWER_TEST_MAX_CASES - summary.cases.length, 0);
        const starterCases = createAnswerlatticeFirstTrustedAnswerCases(
            summary.cases.map(testCase => testCase.id),
        ).slice(0, availableSlots);

        if (starterCases.length === 0) {
            message.info(summary.cases.length >= ANSWERLATTICE_ANSWER_TEST_MAX_CASES
                ? 'The answer-test suite is already at its 100-case limit.'
                : 'The editable starter questions are already in this suite.');
            return;
        }

        modal.confirm({
            title: `Add ${starterCases.length} editable starter question${starterCases.length === 1 ? '' : 's'}?`,
            content: 'These are prompts for onboarding, billing, access, integrations, errors, and releases. Review every question before treating the suite as launch proof.',
            okText: 'Add starter questions',
            onOk: async () => {
                const saved = await saveCases([...summary.cases, ...starterCases]);
                if (saved) {
                    message.success(`${starterCases.length} starter question${starterCases.length === 1 ? '' : 's'} added.`);
                }
            },
        });
    }, [modal, saveCases, summary.cases]);

    const performProductStarterPackGeneration = useCallback(async () => {
        if (!selectedIntakeJobId) {
            message.warning('Choose a knowledge intake with readable product sources first.');
            return;
        }
        if (summary.cases.length > ANSWERLATTICE_ANSWER_TEST_MAX_CASES - 10) {
            const genericStarterIds = new Set<string>(ANSWERLATTICE_FIRST_TRUSTED_ANSWER_CASE_IDS);
            const replaceableCount = summary.cases.filter(testCase => (
                isAnswerlatticeProductStarterPackCaseId(testCase.id)
                || genericStarterIds.has(testCase.id)
            )).length;
            if (summary.cases.length - replaceableCount > ANSWERLATTICE_ANSWER_TEST_MAX_CASES - 10) {
                message.warning('Remove some Answer Tests before adding the ten-question product pack.');
                return;
            }
        }

        setProductPackGenerating(true);
        try {
            const response = await fetch(
                `/api/answerlattice/knowledge-intake/jobs/${encodeURIComponent(selectedIntakeJobId)}/launch-pack`,
                {
                    method: 'POST',
                    cache: 'no-store',
                    credentials: 'same-origin',
                    redirect: 'manual',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requestId: createRuntimeId('product_pack') }),
                },
            );
            const payload = await readJsonResponseWithLimit<unknown>(response, RESPONSE_MAX_BYTES);
            if (!response.ok) {
                const error = payload && typeof payload === 'object' && !Array.isArray(payload)
                    ? (payload as { error?: unknown }).error
                    : null;
                throw new Error(typeof error === 'string' && error.trim()
                    ? error
                    : 'Could not generate the product-specific starter pack.');
            }
            const parsed = AnswerlatticeProductStarterPackResponseSchema.safeParse(payload);
            if (!parsed.success) throw new Error('The product-specific starter pack response was invalid.');
            const nextCases = replaceAnswerlatticeFirstTrustedAnswerCases(summary.cases, parsed.data.pack.cases);
            const casesChanged = JSON.stringify(nextCases) !== JSON.stringify(summary.cases);
            if (casesChanged && !await saveCases(nextCases)) {
                message.warning('The answer drafts are safe in Knowledge Intake. Retry this unchanged pack to add its tests.');
                return;
            }
            setLastPackWasCached(parsed.data.pack.cached);
            setSelectedIds(parsed.data.pack.cases.map(testCase => testCase.id));
            message.success(parsed.data.pack.cached
                ? 'Saved the existing product-specific set. No support credit was used.'
                : `Prepared ten product-specific questions and review drafts. ${parsed.data.pack.usage.unitsConsumed} support credit used.`);
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not generate the product-specific starter pack.');
        } finally {
            setProductPackGenerating(false);
        }
    }, [saveCases, selectedIntakeJobId, summary.cases]);

    const generateProductStarterPack = useCallback(() => {
        const hasExistingProductPack = summary.cases.some(testCase => isAnswerlatticeProductStarterPackCaseId(testCase.id));
        if (!hasExistingProductPack) {
            void performProductStarterPackGeneration();
            return;
        }
        modal.confirm({
            title: 'Refresh the product-specific set?',
            content: 'Unchanged product inputs reuse the saved pack and preserve your test edits. If the included sources or launch context changed, one support credit prepares new review drafts and replaces only the ten product-launch tests. Custom tests stay unchanged.',
            okText: 'Refresh set',
            onOk: performProductStarterPackGeneration,
        });
    }, [modal, performProductStarterPackGeneration, summary.cases]);

    const executeRun = useCallback(async (
        mode: AnswerlatticeAnswerTestMode,
        options?: { releaseId?: string; caseIds?: string[] },
    ) => {
        const requestedCaseIds = options?.caseIds ?? selectedIds;
        const selectedCount = requestedCaseIds.length || summary.cases.filter(testCase => testCase.active).length;
        if (!options?.releaseId && selectedCount > ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES) {
            message.warning(`Select no more than ${ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES} tests for one run.`);
            return;
        }
        setRunningMode(mode);
        try {
            const endpointPath = options?.releaseId
                ? '/api/answerlattice/answer-tests/release-check'
                : '/api/answerlattice/answer-tests/run';
            const endpoint = `${endpointPath}${answerTestProofQuery}`;
            const body = options?.releaseId
                ? { requestId: createRuntimeId('release_check'), releaseId: options.releaseId, mode }
                : { requestId: createRuntimeId('answer_test'), caseIds: requestedCaseIds, mode };
            const response = await fetch(endpoint, {
                method: 'POST',
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const payload = await readResponse(response);
            const parsedSummary = parseAnswerlatticeAnswerTestSummaryForClient(
                payload?.summary,
                { tId, sId },
            );
            const parsedRun = AnswerlatticeAnswerTestRunClientSchema.safeParse(payload?.run);
            if (!response.ok || !parsedRun.success || !parsedSummary) {
                throw new Error(getErrorMessage(payload, 'Could not complete the answer test run.'));
            }
            setSummary(parsedSummary);
            setCurrentLaunchProof(normalizeLaunchProof(payload?.launchProof));
            setScopeCoverageMatrix(scopeCoverageEnabled
                ? parseAnswerlatticeScopeCoverageMatrixForClient(
                    payload?.scopeCoverageMatrix,
                    parsedSummary,
                )
                : null);
            setReleaseModalOpen(false);
            const run = parsedRun.data as AnswerlatticeAnswerTestRun;
            const runIsCurrent = isAnswerlatticeAnswerTestRunCurrent(run, parsedSummary);
            message[runIsCurrent && run.proofStatus === 'ready' ? 'success' : 'warning'](
                !runIsCurrent
                    ? 'The test suite changed while this run was in progress. Review the result, then rerun the current suite.'
                    : run.proofStatus === 'ready'
                    ? `${run.passedCount} answer tests passed. The latest run proof is ready.`
                    : run.proofStatus === 'blocked'
                        ? `${run.criticalFailureCount} critical answer tests failed; the latest proof is blocked.`
                        : `${run.failedCount} answer tests need review in the latest run.`,
            );
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not complete the answer test run.');
        } finally {
            setRunningMode(null);
        }
    }, [answerTestProofQuery, sId, scopeCoverageEnabled, selectedIds, summary.cases, tId]);

    const runFirstTrustedAnswers = useCallback(() => {
        const launchCases = getAnswerlatticeFirstTrustedAnswerCases(summary.cases, { activeOnly: true });
        if (launchCases.length !== 10) {
            message.warning('Complete and activate one valid ten-question launch set before running launch proof.');
            return;
        }
        void executeRun('canonical_only', { caseIds: launchCases.map(testCase => testCase.id) });
    }, [executeRun, summary.cases]);

    const updateSelectedIds = useCallback((nextIds: string[]) => {
        const uniqueActiveIds = Array.from(new Set(nextIds)).filter(id => (
            summary.cases.some(testCase => testCase.id === id && testCase.active)
        ));
        if (uniqueActiveIds.length > ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES) {
            message.warning(`A run can include up to ${ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES} tests.`);
        }
        setSelectedIds(uniqueActiveIds.slice(0, ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES));
    }, [summary.cases]);

    const runFullRuntime = useCallback(() => {
        const selectedCount = selectedIds.length || summary.cases.filter(testCase => testCase.active).length;
        if (selectedCount > ANSWERLATTICE_ANSWER_TEST_MAX_FULL_RUNTIME_CASES) {
            message.warning(`Select no more than ${ANSWERLATTICE_ANSWER_TEST_MAX_FULL_RUNTIME_CASES} tests for a full-runtime run.`);
            return;
        }
        modal.confirm({
            title: 'Run the full support pipeline?',
            content: `Canonical and FAQ matches use no provider credits. This run can use at most ${selectedCount} support credit${selectedCount === 1 ? '' : 's'} if every selected case reaches an AI provider.`,
            okText: 'Run tests',
            onOk: () => executeRun('full_runtime'),
        });
    }, [executeRun, modal, selectedIds.length, summary.cases]);

    const openReleaseCheck = useCallback(async (preferredReleaseId?: string) => {
        const normalizedPreferredReleaseId = normalizeAnswerlatticeOwnerReleaseContext(preferredReleaseId);
        setReleaseModalOpen(true);
        if (releases.length > 0) {
            setSelectedReleaseId(current => (
                normalizedPreferredReleaseId && releases.some(release => release.id === normalizedPreferredReleaseId)
                    ? normalizedPreferredReleaseId
                    : current || releases[0]?.id
            ));
            return;
        }
        if (!tId || !sId) return;
        setReleaseLoading(true);
        try {
            const list = await getReleases(tId, sId);
            setReleases(list || []);
            setSelectedReleaseId(
                normalizedPreferredReleaseId && list?.some(release => release.id === normalizedPreferredReleaseId)
                    ? normalizedPreferredReleaseId
                    : list?.[0]?.id,
            );
        } catch {
            message.error('Could not load releases.');
        } finally {
            setReleaseLoading(false);
        }
    }, [releases, sId, tId]);

    useEffect(() => {
        if (!requestedReleaseId) {
            handledReleaseContextRef.current = '';
            return;
        }
        if (!tId || !sId || isLaunchMode) return;
        const contextKey = `${tId}:${sId}:${requestedReleaseId}`;
        if (handledReleaseContextRef.current === contextKey) return;
        handledReleaseContextRef.current = contextKey;
        void openReleaseCheck(requestedReleaseId);
    }, [isLaunchMode, openReleaseCheck, requestedReleaseId, sId, tId]);

    const closeReleaseCheck = useCallback(() => {
        setReleaseModalOpen(false);
        if (!searchParams?.has('release')) return;
        const nextParams = new URLSearchParams(routeContextQuery);
        nextParams.delete('release');
        router.replace(`${pathname}${nextParams.size ? `?${nextParams.toString()}` : ''}`, { scroll: false });
    }, [pathname, routeContextQuery, router, searchParams]);

    const applyResultAsExpectation = useCallback(async (result: AnswerlatticeAnswerTestCaseResult) => {
        const target = summary.cases.find(testCase => testCase.id === result.caseId);
        if (!target) return;
        const next: AnswerlatticeAnswerTestCase = {
            ...target,
            expected: {
                source: result.source,
                ...(result.confidence ? { minimumConfidence: result.confidence } : {}),
                mustInclude: target.expected.mustInclude,
                mustNotInclude: target.expected.mustNotInclude,
                citationPolicy: result.referenceIds.length > 0 ? 'specific_sources' : 'not_required',
                referenceIds: result.referenceIds,
                ...(result.answerId ? { answerId: result.answerId } : {}),
                ...(result.faqId ? { faqId: result.faqId } : {}),
            },
            relatedEntityIds: result.relatedEntityIds.length > 0 ? result.relatedEntityIds : target.relatedEntityIds,
            updatedAt: new Date().toISOString(),
        };
        if (await saveCases(summary.cases.map(testCase => testCase.id === target.id ? next : testCase))) {
            const unresolvedClaimCheck = result.failures.some(failure => (
                failure.startsWith('Answer did not include required phrase:')
                || failure.startsWith('Answer included blocked phrase:')
            ));
            message[unresolvedClaimCheck ? 'warning' : 'success'](unresolvedClaimCheck
                ? 'Current route, answer IDs, confidence, and evidence were saved. Required and blocked phrase checks still need review.'
                : 'Current route, answer IDs, confidence, and evidence were saved as the expected contract.');
        }
    }, [saveCases, summary.cases]);

    const openRollback = useCallback(async (result: AnswerlatticeAnswerTestCaseResult) => {
        if (!result.answerId || !tId || !sId) return;
        setRollbackResult(result);
        setRollbackHistory([]);
        setSelectedAuditLogId(undefined);
        setRollbackLoading(true);
        try {
            const history = await getAnswerVersionHistory(tId, sId, result.answerId);
            const restorable = (history || []).filter(log => Boolean(log.previousState?.answerSnapshot));
            setRollbackHistory(restorable);
            setSelectedAuditLogId(restorable[0]?.id);
        } catch {
            message.error('Could not load answer history.');
        } finally {
            setRollbackLoading(false);
        }
    }, [sId, tId]);

    const createRollbackProposal = useCallback(async () => {
        if (!rollbackResult?.answerId || !selectedAuditLogId) return;
        setRollbackLoading(true);
        try {
            const response = await fetch('/api/answerlattice/answer-tests/rollback', {
                method: 'POST',
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    answerId: rollbackResult.answerId,
                    auditLogId: selectedAuditLogId,
                    reason: rollbackReason,
                }),
            });
            const payload = await readResponse(response);
            const parsedRollback = AnswerlatticeAnswerTestRollbackResponseSchema.safeParse(payload);
            if (!response.ok || !parsedRollback.success) {
                throw new Error(getErrorMessage(payload, 'Could not create rollback proposal.'));
            }
            setRollbackResult(null);
            message.success('Rollback proposal added to the governance review queue.');
            router.push(getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.SIGNAL_QUEUE));
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not create rollback proposal.');
        } finally {
            setRollbackLoading(false);
        }
    }, [rollbackReason, rollbackResult, router, selectedAuditLogId]);

    const activeCount = summary.cases.filter(testCase => testCase.active).length;
    const latestRun = summary.runs[0];
    const latestRunStale = Boolean(latestRun && !isAnswerlatticeAnswerTestRunCurrent(latestRun, summary));
    const selectedActiveCount = selectedIds.filter(id => summary.cases.some(testCase => testCase.id === id && testCase.active)).length;
    const starterCaseCount = Math.min(10, countAnswerlatticeFirstTrustedAnswerCases(
        summary.cases,
        { activeOnly: true },
    ));
    const hasProductStarterPack = summary.cases.some(testCase => isAnswerlatticeProductStarterPackCaseId(testCase.id));
    const scopeCoverageRows = useMemo<ScopeCoverageDisplayRow[]>(() => {
        if (!scopeCoverageMatrix) return [];
        const casesById = new Map(summary.cases.map(testCase => [testCase.id, testCase]));
        return scopeCoverageMatrix.rows.flatMap((row) => {
            const testCase = casesById.get(row.caseId);
            return testCase ? [{ ...row, testCase }] : [];
        });
    }, [scopeCoverageMatrix, summary.cases]);
    const selectedIntakeJob = intakeJobs.find(job => job.id === selectedIntakeJobId);
    const productPackEnabled = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PRODUCT_STARTER_PACK
        && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE;
    const currentLaunchProofAlert = (() => {
        if (!currentLaunchProof) {
            return {
                type: 'warning' as const,
                message: 'Current First 10 proof could not be verified',
                description: 'Refresh this screen before relying on the latest run. The retained run result is historical and never publishes support truth.',
            };
        }
        if (currentLaunchProof.firstTenCount < 10) {
            return {
                type: 'info' as const,
                message: `${currentLaunchProof.firstTenCount}/10 launch questions are ready`,
                description: 'Complete the First 10 set, approve the required support truth, then run all ten checks to establish current launch proof.',
            };
        }
        if (currentLaunchProof.latestProofStale) {
            return {
                type: 'warning' as const,
                message: 'First 10 proof is stale',
                description: 'A launch question or governed source changed after the saved run. Run all ten checks again; no content is published automatically.',
            };
        }
        if (currentLaunchProof.latestProofStatus === 'ready') {
            return {
                type: 'success' as const,
                message: 'Current First 10 proof is ready',
                description: 'All ten launch questions passed against the current governed sources. This proof is advisory and does not publish or approve content.',
            };
        }
        if (currentLaunchProof.latestProofStatus === 'blocked') {
            return {
                type: 'error' as const,
                message: 'Current First 10 proof is blocked',
                description: `${currentLaunchProof.latestCriticalFailureCount} critical launch answer${currentLaunchProof.latestCriticalFailureCount === 1 ? '' : 's'} failed. Review the latest result, correct the governed source, and rerun all ten checks.`,
            };
        }
        if (currentLaunchProof.latestProofStatus === 'review') {
            return {
                type: 'warning' as const,
                message: 'Current First 10 proof needs review',
                description: 'At least one launch answer did not meet its expected source, evidence, or response rule. Correct it and rerun all ten checks.',
            };
        }
        return {
            type: 'info' as const,
            message: 'Run the First 10 checks',
            description: 'Run all ten launch questions together to establish current proof against the governed sources.',
        };
    })();

    const columns = useMemo<ColumnsType<AnswerlatticeAnswerTestCase>>(() => [
        {
            title: 'Test',
            key: 'test',
            render: (_, testCase) => (
                <Flex vertical gap={2}>
                    <Text strong>{testCase.title}</Text>
                    <Text type="secondary" ellipsis={{ tooltip: testCase.query }}>{testCase.query}</Text>
                </Flex>
            ),
        },
        {
            title: 'Expected',
            key: 'expected',
            width: 180,
            render: (_, testCase) => (
                <Space size={[4, 4]} wrap>
                    <Tag color={SOURCE_COLORS[testCase.expected.source]}>{SOURCE_LABELS[testCase.expected.source]}</Tag>
                    {testCase.riskLevel === 'critical' && <Tag color="red">Critical</Tag>}
                    {testCase.expected.citationPolicy !== 'not_required' && <Tag color="geekblue">Evidence checked</Tag>}
                </Space>
            ),
        },
        {
            title: 'Context',
            key: 'context',
            width: 170,
            render: (_, testCase) => (
                <Space size={[4, 4]} wrap>
                    {testCase.context?.page && <Tag>{testCase.context.page}</Tag>}
                    {testCase.context?.feature && <Tag>{testCase.context.feature}</Tag>}
                    {testCase.relatedEntityIds.length > 0 && <Tag>{testCase.relatedEntityIds.length} entities</Tag>}
                    {!testCase.context && testCase.relatedEntityIds.length === 0 && <Text type="secondary">Any page</Text>}
                </Space>
            ),
        },
        {
            title: 'Status',
            key: 'status',
            width: 100,
            render: (_, testCase) => <Tag color={testCase.active ? 'green' : 'default'}>{testCase.active ? 'Active' : 'Paused'}</Tag>,
        },
        {
            title: '',
            key: 'actions',
            width: 96,
            render: (_, testCase) => (
                <Space size={2}>
                    <Button type="text" icon={<LuPencil />} aria-label={`Edit ${testCase.title}`} onClick={() => openEdit(testCase)} style={ICON_ACTION_BUTTON_STYLE} />
                    <Popconfirm
                        title="Remove this answer test?"
                        onConfirm={() => deleteCase(testCase.id)}
                        okButtonProps={{ danger: true, style: ACTION_BUTTON_STYLE }}
                        cancelButtonProps={{ style: ACTION_BUTTON_STYLE }}
                    >
                        <Button type="text" danger icon={<LuTrash2 />} aria-label={`Remove ${testCase.title}`} style={ICON_ACTION_BUTTON_STYLE} />
                    </Popconfirm>
                </Space>
            ),
        },
    ], [deleteCase, openEdit]);

    const scopeCoverageColumns = useMemo<ColumnsType<ScopeCoverageDisplayRow>>(() => [
        {
            title: 'Important question',
            key: 'question',
            width: 270,
            render: (_, row) => (
                <Flex vertical gap={2}>
                    <Space size={6} wrap>
                        <Text strong>{row.testCase.title}</Text>
                        {row.testCase.riskLevel === 'critical' && <Tag color="red">Critical</Tag>}
                    </Space>
                    <Text type="secondary" ellipsis={{ tooltip: row.testCase.query }}>
                        {row.testCase.query}
                    </Text>
                </Flex>
            ),
        },
        {
            title: 'Plan',
            key: 'plan',
            width: 115,
            render: (_, row) => <Text>{getScopeValue(row.testCase.context?.plan)}</Text>,
        },
        {
            title: 'Role',
            key: 'role',
            width: 135,
            render: (_, row) => (
                <Text>{getScopeValue(row.testCase.context?.userRole || row.testCase.context?.role)}</Text>
            ),
        },
        {
            title: 'Product state',
            key: 'state',
            width: 135,
            render: (_, row) => <Text>{getScopeValue(row.testCase.context?.state)}</Text>,
        },
        {
            title: 'Version',
            key: 'version',
            width: 105,
            render: (_, row) => <Text>{getScopeValue(row.testCase.context?.version)}</Text>,
        },
        {
            title: 'Coverage',
            key: 'coverage',
            width: 205,
            render: (_, row) => (
                <Flex vertical gap={4} align="start">
                    <Tag color={SCOPE_COVERAGE_COLORS[row.status]}>
                        {SCOPE_COVERAGE_LABELS[row.status]}
                    </Tag>
                    {row.actualSource && row.actualSource !== 'canonical' && (
                        <Text type="secondary">Current route: {SOURCE_LABELS[row.actualSource]}</Text>
                    )}
                </Flex>
            ),
        },
        {
            title: 'Last verified',
            key: 'verifiedAt',
            width: 165,
            render: (_, row) => <Text type="secondary">{formatDateTime(row.verifiedAt)}</Text>,
        },
        {
            title: '',
            key: 'actions',
            width: 142,
            fixed: 'right',
            render: (_, row) => (
                <Space size={2}>
                    <Tooltip title="Edit question and context">
                        <Button
                            type="text"
                            icon={<LuPencil />}
                            aria-label={`Edit scope for ${row.testCase.title}`}
                            onClick={() => openEdit(row.testCase)}
                            style={ICON_ACTION_BUTTON_STYLE}
                        />
                    </Tooltip>
                    {row.status !== 'other_route' && (
                        <Tooltip title="Run this check">
                            <Button
                                type="text"
                                icon={<LuPlay />}
                                aria-label={`Run coverage check for ${row.testCase.title}`}
                                onClick={() => void executeRun('canonical_only', { caseIds: [row.caseId] })}
                                loading={runningMode === 'canonical_only'}
                                style={ICON_ACTION_BUTTON_STYLE}
                            />
                        </Tooltip>
                    )}
                    {(row.status === 'missing' || row.status === 'needs_review') && (
                        <Tooltip title={row.answerId ? 'Review this approved answer' : 'Review approved answers'}>
                            <Button
                                type="text"
                                icon={<LuExternalLink />}
                                aria-label={row.answerId
                                    ? `Review approved answer for ${row.testCase.title}`
                                    : `Review approved answers for ${row.testCase.title}`}
                                onClick={() => router.push(row.answerId
                                    ? getAnswerlatticeAnswerContextRoute(
                                        getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.ANSWERS),
                                        row.answerId,
                                    )
                                    : getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.ANSWERS))}
                                style={ICON_ACTION_BUTTON_STYLE}
                            />
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ], [executeRun, openEdit, router, runningMode]);

    const answerTestCaseEmptyState = (
        <Empty
            description="Add the questions that must keep working after every release."
            image={(
                <ContextualStateIllustration
                    color={token.colorPrimary}
                    size={isMobile ? 88 : 96}
                    treatment="softHalo"
                    variant="feedbackContext"
                />
            )}
            styles={{ image: { height: isMobile ? 88 : 96 } }}
        />
    );

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ANSWER_TESTS) return null;

    return (
        <Flex vertical gap={20} style={{ width: '100%', maxWidth: 1240, margin: '0 auto', padding: isMobile ? 12 : 24 }}>
            <Flex justify="space-between" align={isMobile ? 'stretch' : 'center'} gap={12} vertical={isMobile}>
                <div>
                    <Space align="center">
                        <LuClipboardCheck size={22} color={token.colorPrimary} />
                        <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>
                            {isLaunchMode ? 'First 10 Trusted Answers' : 'Answer Tests'}
                        </Title>
                    </Space>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0', maxWidth: 760 }}>
                        {isLaunchMode
                            ? 'Define the ten questions most likely to interrupt your launch, approve the required support truth, and prove the expected answer or safe escalation before users depend on it.'
                            : 'Prove important support answers before releases. Tests use the same canonical-first retrieval path and can verify claims, evidence references, safe abstention, and escalation without creating customer search history or support signals.'}
                    </Paragraph>
                </div>
                <Space wrap>
                    <Button icon={<LuRefreshCw />} onClick={loadSummary} loading={loading} style={ACTION_BUTTON_STYLE}>Refresh</Button>
                    <Button type="primary" icon={<LuPlus />} onClick={openCreate} style={ACTION_BUTTON_STYLE}>Add test</Button>
                </Space>
            </Flex>

            {isLaunchMode ? (
                <Card>
                    <Flex vertical gap={16}>
                        <Flex justify="space-between" align={isMobile ? 'stretch' : 'center'} vertical={isMobile} gap={12}>
                            <Flex vertical gap={5}>
                                <Space wrap>
                                    <LuSparkles size={18} color={token.colorPrimary} />
                                    <Text strong>Founder launch path</Text>
                                    <Tag color={starterCaseCount >= 10 ? 'green' : 'processing'}>{starterCaseCount}/10 starter questions</Tag>
                                </Space>
                                <Text type="secondary">
                                    Generate the first ten from your approved product sources. Drafts stay in Knowledge Intake until you review them, and trusted answers still require owner approval in Answer Quality.
                                </Text>
                            </Flex>
                        </Flex>
                        {productPackEnabled ? (
                            <Card size="small" styles={{ body: { padding: isMobile ? 12 : 16 } }}>
                                <Flex vertical gap={12}>
                                    <Flex justify="space-between" align={isMobile ? 'stretch' : 'center'} vertical={isMobile} gap={12}>
                                        <Flex vertical gap={3}>
                                            <Text strong>Product-specific launch pack</Text>
                                            <Text type="secondary">
                                                One new source or launch-context version uses one support credit. Reopening unchanged inputs uses the saved pack for free.
                                            </Text>
                                        </Flex>
                                        {lastPackWasCached !== null ? (
                                            <Tag color={lastPackWasCached ? 'green' : 'blue'}>
                                                {lastPackWasCached ? 'Saved pack reused' : 'New pack generated'}
                                            </Tag>
                                        ) : null}
                                    </Flex>
                                    <Flex gap={10} vertical={isMobile} align={isMobile ? 'stretch' : 'center'}>
                                        <Select
                                            aria-label="Knowledge intake for product-specific questions"
                                            loading={intakeJobsLoading}
                                            value={selectedIntakeJobId}
                                            onChange={setSelectedIntakeJobId}
                                            placeholder="Choose product sources"
                                            style={{ flex: 1, minWidth: isMobile ? 0 : 300 }}
                                            options={intakeJobs.map(job => ({
                                                value: job.id,
                                                label: `${job.title} (${Number(job.readySourceCount || 0)} ready source${Number(job.readySourceCount || 0) === 1 ? '' : 's'})`,
                                                disabled: Number(job.readySourceCount || 0) === 0
                                                    || ['publishing', 'published', 'cancelled'].includes(job.status),
                                            }))}
                                        />
                                        <Button
                                            type="primary"
                                            icon={<LuSparkles />}
                                            onClick={generateProductStarterPack}
                                            loading={productPackGenerating}
                                            disabled={
                                                !selectedIntakeJobId
                                                || Number(selectedIntakeJob?.readySourceCount || 0) === 0
                                                || ['publishing', 'published', 'cancelled'].includes(String(selectedIntakeJob?.status || ''))
                                            }
                                            style={ACTION_BUTTON_STYLE}
                                        >
                                            Generate product-specific set
                                        </Button>
                                        <Button icon={<LuRefreshCw />} onClick={loadIntakeJobs} loading={intakeJobsLoading} style={ICON_ACTION_BUTTON_STYLE} aria-label="Refresh knowledge intakes" />
                                    </Flex>
                                    {intakeJobs.length === 0 ? (
                                        <Alert
                                            type="warning"
                                            showIcon
                                            message="Add product sources first"
                                            description="Teach Answerlattice from your website, docs, notes, releases, screenshots, or recordings before generating product-specific questions."
                                            action={<Button onClick={() => router.push(ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE)}>Open Knowledge Intake</Button>}
                                        />
                                    ) : null}
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Generated answers are draft evidence, never approved truth. Review them in Knowledge Intake, then use the existing Governance queue for canonical approval.
                                    </Text>
                                </Flex>
                            </Card>
                        ) : null}
                        <Flex justify="space-between" align={isMobile ? 'stretch' : 'center'} vertical={isMobile} gap={10}>
                            <Text type="secondary">
                                No product intake yet? Use the general questions as an editable fallback and replace anything that does not apply.
                            </Text>
                            <Button
                                icon={<LuClipboardCheck />}
                                onClick={addStarterCases}
                                loading={saving}
                                disabled={hasProductStarterPack}
                                style={ACTION_BUTTON_STYLE}
                            >
                                Use general starter set
                            </Button>
                        </Flex>
                        <Flex gap={10} wrap="wrap">
                            <Button onClick={() => router.push(ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE)} style={ACTION_BUTTON_STYLE}>1. Teach Answerlattice</Button>
                            <Button onClick={() => router.push(ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE)} style={ACTION_BUTTON_STYLE}>2. Review answer drafts</Button>
                            <Button onClick={() => router.push(getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.ANSWERS))} style={ACTION_BUTTON_STYLE}>3. Approve support truth</Button>
                            <Button
                                onClick={runFirstTrustedAnswers}
                                disabled={starterCaseCount !== 10}
                                loading={runningMode === 'canonical_only'}
                                style={ACTION_BUTTON_STYLE}
                            >
                                4. Run First 10 checks
                            </Button>
                            <Button onClick={() => router.push(ANSWERLATTICE_ROUTES.INSTALL_CENTER)} style={ACTION_BUTTON_STYLE}>5. Verify install</Button>
                        </Flex>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            A failed case is useful evidence: fix the answer, FAQ, article, context, or escalation rule in its existing governed screen, then run the same case again.
                        </Text>
                    </Flex>
                </Card>
            ) : null}

            {isLaunchMode ? (
                <Alert
                    type={currentLaunchProofAlert.type}
                    showIcon
                    message={currentLaunchProofAlert.message}
                    description={currentLaunchProofAlert.description}
                />
            ) : null}

            <Alert
                type="info"
                showIcon
                message="Deterministic checks are free"
                description="Canonical-only runs check the source, answer ID, configured phrases, confidence, abstention, and evidence rules you define. They are regression evidence, not an independent factual-correctness guarantee. Full-runtime runs continue into knowledge fallback and use one support credit only when an AI provider is reached. Proof status is advisory and never publishes content or changes a deployment."
            />

            <Flex gap={12} wrap="wrap">
                <Card size="small" style={{ flex: '1 1 180px' }}><Statistic title="Active tests" value={activeCount} /></Card>
                <Card size="small" style={{ flex: '1 1 180px' }}><Statistic title="Latest pass rate" value={latestRun?.caseCount ? Math.round((latestRun.passedCount / latestRun.caseCount) * 100) : 0} suffix="%" /></Card>
                <Card size="small" style={{ flex: '1 1 180px' }}><Statistic title="Needs review" value={latestRun?.failedCount || 0} valueStyle={{ color: latestRun?.failedCount ? token.colorWarning : token.colorSuccess }} /></Card>
                <Card size="small" style={{ flex: '1 1 180px' }}>
                    <Statistic
                        title="Latest run proof"
                        value={latestRunStale ? 'Stale' : latestRun ? PROOF_STATUS_LABELS[latestRun.proofStatus] : 'Not run'}
                        valueStyle={{
                            color: latestRunStale
                                ? token.colorWarning
                                : latestRun?.proofStatus === 'blocked'
                                ? token.colorError
                                : latestRun?.proofStatus === 'review'
                                    ? token.colorWarning
                                    : token.colorSuccess,
                            fontSize: 18,
                        }}
                    />
                </Card>
                <Card size="small" style={{ flex: '1 1 220px' }}><Statistic title="Last run" value={formatDateTime(latestRun?.completedAt)} valueStyle={{ fontSize: 16 }} /></Card>
            </Flex>

            {scopeCoverageEnabled ? (
                <Card
                    title="Scope coverage"
                >
                    <Flex vertical gap={14}>
                        <Text type="secondary">
                            This view uses only active questions and customer contexts you defined. Empty context fields are not treated as proof for every possible value, and Answerlattice does not invent missing combinations.
                        </Text>
                        {!scopeCoverageMatrix && !loading ? (
                            <Alert
                                type="warning"
                                showIcon
                                message="Scope coverage is unavailable"
                                description="Refresh Answer Tests before relying on this view. Existing tests and saved results remain available."
                            />
                        ) : null}
                        {scopeCoverageMatrix ? (
                            <>
                                <Text strong>
                                    {scopeCoverageMatrix.coveredCount}/{scopeCoverageMatrix.canonicalTargetCount} approved-answer questions covered
                                </Text>
                                <Space size={[6, 6]} wrap>
                                    <Tag color="green">{scopeCoverageMatrix.coveredCount} covered</Tag>
                                    <Tag color="red">{scopeCoverageMatrix.missingCount} missing</Tag>
                                    <Tag color="orange">{scopeCoverageMatrix.needsReviewCount} need review</Tag>
                                    <Tag>{scopeCoverageMatrix.unverifiedCount} not verified</Tag>
                                    {scopeCoverageMatrix.otherRouteCount > 0 && (
                                        <Tag color="blue">{scopeCoverageMatrix.otherRouteCount} different expected route</Tag>
                                    )}
                                </Space>
                                {scopeCoverageRows.length === 0 ? (
                                    <Text type="secondary">Add and activate an Answer Test to review its customer context.</Text>
                                ) : isMobile ? (
                                    <List
                                        dataSource={scopeCoverageRows}
                                        renderItem={row => (
                                            <List.Item>
                                                <Flex vertical gap={10} style={{ width: '100%' }}>
                                                    <Flex justify="space-between" align="start" gap={8} wrap="wrap">
                                                        <Flex vertical gap={2} style={{ minWidth: 0 }}>
                                                            <Space size={6} wrap>
                                                                <Text strong>{row.testCase.title}</Text>
                                                                {row.testCase.riskLevel === 'critical' && <Tag color="red">Critical</Tag>}
                                                            </Space>
                                                            <Text type="secondary">{row.testCase.query}</Text>
                                                        </Flex>
                                                        <Tag color={SCOPE_COVERAGE_COLORS[row.status]}>
                                                            {SCOPE_COVERAGE_LABELS[row.status]}
                                                        </Tag>
                                                    </Flex>
                                                    <Flex gap={12} wrap="wrap">
                                                        <Text><Text type="secondary">Plan:</Text> {getScopeValue(row.testCase.context?.plan)}</Text>
                                                        <Text><Text type="secondary">Role:</Text> {getScopeValue(row.testCase.context?.userRole || row.testCase.context?.role)}</Text>
                                                        <Text><Text type="secondary">State:</Text> {getScopeValue(row.testCase.context?.state)}</Text>
                                                        <Text><Text type="secondary">Version:</Text> {getScopeValue(row.testCase.context?.version)}</Text>
                                                    </Flex>
                                                    {row.actualSource && row.actualSource !== 'canonical' && (
                                                        <Text type="secondary">Current route: {SOURCE_LABELS[row.actualSource]}</Text>
                                                    )}
                                                    <Text type="secondary">Last verified: {formatDateTime(row.verifiedAt)}</Text>
                                                    <Flex gap={8} vertical>
                                                        {row.status !== 'other_route' && (
                                                            <Button
                                                                icon={<LuPlay />}
                                                                onClick={() => void executeRun('canonical_only', { caseIds: [row.caseId] })}
                                                                loading={runningMode === 'canonical_only'}
                                                                block
                                                                style={ACTION_BUTTON_STYLE}
                                                            >
                                                                Run check
                                                            </Button>
                                                        )}
                                                        {(row.status === 'missing' || row.status === 'needs_review') && (
                                                            <Button
                                                                icon={<LuExternalLink />}
                                                                onClick={() => router.push(row.answerId
                                                                    ? getAnswerlatticeAnswerContextRoute(
                                                                        getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.ANSWERS),
                                                                        row.answerId,
                                                                    )
                                                                    : getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.ANSWERS))}
                                                                block
                                                                style={ACTION_BUTTON_STYLE}
                                                            >
                                                                {row.answerId ? 'Review this approved answer' : 'Review approved answers'}
                                                            </Button>
                                                        )}
                                                        <Button
                                                            icon={<LuPencil />}
                                                            onClick={() => openEdit(row.testCase)}
                                                            block
                                                            style={ACTION_BUTTON_STYLE}
                                                        >
                                                            Edit question and context
                                                        </Button>
                                                    </Flex>
                                                </Flex>
                                            </List.Item>
                                        )}
                                    />
                                ) : (
                                    <Table
                                        rowKey="caseId"
                                        dataSource={scopeCoverageRows}
                                        columns={scopeCoverageColumns}
                                        pagination={false}
                                        scroll={{ x: 1270 }}
                                    />
                                )}
                            </>
                        ) : null}
                    </Flex>
                </Card>
            ) : null}

            <Card
                title="Regression cases"
                extra={<Text type="secondary">{selectedActiveCount || activeCount} selected for the next run</Text>}
            >
                <Flex gap={8} wrap="wrap" style={{ marginBottom: 16 }}>
                    <Button
                        icon={<LuShieldCheck />}
                        onClick={() => executeRun('canonical_only')}
                        loading={runningMode === 'canonical_only'}
                        disabled={activeCount === 0}
                        style={ACTION_BUTTON_STYLE}
                    >
                        Run canonical checks
                    </Button>
                    <Button
                        icon={<LuFlaskConical />}
                        onClick={runFullRuntime}
                        loading={runningMode === 'full_runtime'}
                        disabled={activeCount === 0}
                        style={ACTION_BUTTON_STYLE}
                    >
                        Run full runtime
                    </Button>
                    <Button icon={<LuRocket />} onClick={() => void openReleaseCheck()} disabled={activeCount === 0} style={ACTION_BUTTON_STYLE}>Check a release</Button>
                </Flex>
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    Canonical and release checks use 0 provider credits. {(selectedActiveCount || activeCount) > ANSWERLATTICE_ANSWER_TEST_MAX_FULL_RUNTIME_CASES
                        ? `Select no more than ${ANSWERLATTICE_ANSWER_TEST_MAX_FULL_RUNTIME_CASES} cases before a full-runtime run; the current selection cannot be submitted.`
                        : `A full-runtime run uses at most ${selectedActiveCount || activeCount} support credit${(selectedActiveCount || activeCount) === 1 ? '' : 's'} for the current selection.`}
                </Text>

                {isMobile ? (
                    <List
                        loading={loading}
                        dataSource={summary.cases}
                        locale={{ emptyText: answerTestCaseEmptyState }}
                        renderItem={testCase => (
                            <List.Item>
                                <Flex vertical gap={10} style={{ width: '100%' }}>
                                    <Flex justify="space-between" align="start" gap={8}>
                                        <Checkbox
                                            checked={selectedIds.includes(testCase.id)}
                                            disabled={!testCase.active}
                                            onChange={event => updateSelectedIds(
                                                event.target.checked
                                                    ? [...selectedIds, testCase.id]
                                                    : selectedIds.filter(id => id !== testCase.id),
                                            )}
                                        >
                                            <Text strong>{testCase.title}</Text>
                                        </Checkbox>
                                        <Tag color={testCase.active ? 'green' : 'default'}>{testCase.active ? 'Active' : 'Paused'}</Tag>
                                    </Flex>
                                    <Text type="secondary">{testCase.query}</Text>
                                    <Space wrap>
                                        <Tag color={SOURCE_COLORS[testCase.expected.source]}>{SOURCE_LABELS[testCase.expected.source]}</Tag>
                                        {testCase.riskLevel === 'critical' && <Tag color="red">Critical</Tag>}
                                        {testCase.expected.citationPolicy !== 'not_required' && <Tag color="geekblue">Evidence checked</Tag>}
                                        {testCase.relatedEntityIds.length > 0 && <Tag>{testCase.relatedEntityIds.length} entities</Tag>}
                                    </Space>
                                    <Flex gap={8}>
                                        <Button icon={<LuPencil />} onClick={() => openEdit(testCase)} block style={ACTION_BUTTON_STYLE}>Edit</Button>
                                        <Popconfirm
                                            title="Remove this answer test?"
                                            onConfirm={() => deleteCase(testCase.id)}
                                            okButtonProps={{ danger: true, style: ACTION_BUTTON_STYLE }}
                                            cancelButtonProps={{ style: ACTION_BUTTON_STYLE }}
                                        >
                                            <Button danger icon={<LuTrash2 />} block style={ACTION_BUTTON_STYLE}>Remove</Button>
                                        </Popconfirm>
                                    </Flex>
                                </Flex>
                            </List.Item>
                        )}
                    />
                ) : (
                    <Table
                        rowKey="id"
                        loading={loading}
                        dataSource={summary.cases}
                        columns={columns}
                        pagination={false}
                        rowSelection={{
                            selectedRowKeys: selectedIds,
                            onChange: keys => updateSelectedIds(keys.map(String)),
                            getCheckboxProps: testCase => ({ disabled: !testCase.active }),
                        }}
                        locale={{ emptyText: answerTestCaseEmptyState }}
                        scroll={{ x: 850 }}
                    />
                )}
            </Card>

            <Card title="Latest result">
                {!latestRun ? (
                    <Empty
                        description="Run the active tests to create the first result."
                        image={(
                            <ContextualStateIllustration
                                color={token.colorPrimary}
                                size={96}
                                treatment="softHalo"
                                variant="analyticsContext"
                            />
                        )}
                        styles={{ image: { height: 96 } }}
                    />
                ) : (
                    <Flex vertical gap={16}>
                        <Flex gap={8} wrap="wrap">
                            <Tag color={latestRun.status === 'passed' ? 'green' : latestRun.status === 'failed' ? 'red' : 'orange'}>
                                {latestRun.status === 'passed' ? 'Passed' : latestRun.status === 'failed' ? 'Failed' : 'Needs review'}
                            </Tag>
                            <Tag>{latestRun.mode === 'full_runtime' ? 'Full runtime' : 'Canonical only'}</Tag>
                            <Tag color={latestRunStale ? 'orange' : PROOF_STATUS_COLORS[latestRun.proofStatus]}>
                                Latest run proof: {latestRunStale ? 'Stale' : PROOF_STATUS_LABELS[latestRun.proofStatus]}
                            </Tag>
                            {latestRun.releaseVersion && <Tag color="purple">Release {latestRun.releaseVersion}</Tag>}
                            <Text type="secondary">{latestRun.passedCount}/{latestRun.caseCount} passed · {latestRun.providerCaseCount} provider-backed</Text>
                        </Flex>
                        {latestRunStale && (
                            <Alert
                                type="warning"
                                showIcon
                                message="This result no longer matches the current test suite"
                                description="One or more test definitions changed before or after this run. Keep the historical result for review, then rerun the current suite before relying on its proof status."
                            />
                        )}
                        <List
                            dataSource={latestRun.results}
                            renderItem={result => (
                                <List.Item>
                                    <Flex vertical gap={8} style={{ width: '100%' }}>
                                        <Flex justify="space-between" align="start" gap={8} wrap="wrap">
                                            <Space>
                                                {result.passed ? <LuCheck color={token.colorSuccess} /> : <LuX color={token.colorError} />}
                                                <Text strong>{result.title}</Text>
                                            </Space>
                                            <Space wrap>
                                                <Tag color={SOURCE_COLORS[result.source]}>{SOURCE_LABELS[result.source]}</Tag>
                                                {result.riskLevel === 'critical' && <Tag color="red">Critical</Tag>}
                                                {result.citationPolicy !== 'not_required' && (
                                                    <Tag color={result.citationPassed ? 'green' : 'red'}>
                                                        Evidence {result.citationPassed ? 'passed' : 'failed'}
                                                    </Tag>
                                                )}
                                                <Text type="secondary">{result.durationMs} ms</Text>
                                            </Space>
                                        </Flex>
                                        {result.answerPreview && <Text>{result.answerPreview}</Text>}
                                        {result.referenceIds.length > 0 && (
                                            <Text type="secondary">References: {result.referenceIds.join(', ')}</Text>
                                        )}
                                        {result.failures.map(failure => <Text key={failure} type="danger">{failure}</Text>)}
                                        <Space wrap>
                                            {!result.passed && result.answerId && (
                                                <Button
                                                    icon={<LuExternalLink />}
                                                    onClick={() => router.push(getAnswerlatticeAnswerContextRoute(
                                                        getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.ANSWERS),
                                                        result.answerId,
                                                    ))}
                                                    style={ACTION_BUTTON_STYLE}
                                                >
                                                    Review approved answer
                                                </Button>
                                            )}
                                            {!result.passed && (
                                                <Popconfirm
                                                    title="Adopt the current route and evidence?"
                                                    description="Use this only after confirming the current answer is correct. It updates source, answer IDs, confidence, and evidence; required and blocked phrase checks stay unchanged. The live answer is not changed."
                                                    onConfirm={() => applyResultAsExpectation(result)}
                                                    okText="Adopt contract"
                                                >
                                                    <Button style={ACTION_BUTTON_STYLE}>
                                                        Adopt current route and evidence
                                                    </Button>
                                                </Popconfirm>
                                            )}
                                            {!result.passed && result.answerId && (
                                                <Button icon={<LuArchiveRestore />} onClick={() => openRollback(result)} style={ACTION_BUTTON_STYLE}>
                                                    Prepare rollback proposal
                                                </Button>
                                            )}
                                        </Space>
                                    </Flex>
                                </List.Item>
                            )}
                        />
                    </Flex>
                )}
            </Card>

            <Modal
                title={editingCase ? 'Edit answer test' : 'Add answer test'}
                open={editorOpen}
                onCancel={() => setEditorOpen(false)}
                onOk={submitCase}
                okText={editingCase ? 'Save changes' : 'Add test'}
                confirmLoading={saving}
                okButtonProps={{ style: ACTION_BUTTON_STYLE }}
                cancelButtonProps={{ style: ACTION_BUTTON_STYLE }}
                width={720}
                destroyOnHidden
                styles={{
                    body: {
                        maxHeight: isMobile ? 'calc(100dvh - 168px)' : 'calc(100vh - 220px)',
                        overflowY: 'auto',
                    },
                }}
            >
                <Form form={form} layout="vertical" initialValues={buildFormValues()}>
                    <Form.Item name="title" label="Test name" rules={[{ required: true, message: 'Enter a short test name.' }]}>
                        <Input maxLength={120} placeholder="Failed invoice explanation" />
                    </Form.Item>
                    <Form.Item name="query" label="User question" rules={[{ required: true, min: 2, message: 'Enter the question users ask.' }]}>
                        <TextArea rows={3} maxLength={500} placeholder="Why did my invoice fail?" />
                    </Form.Item>
                    <Flex gap={12} vertical={isMobile}>
                        <Form.Item
                            name="expectedSource"
                            label="Expected route"
                            style={{ flex: 1 }}
                            dependencies={['riskLevel', 'active']}
                            extra={selectedRiskLevel === 'critical'
                                ? 'Critical proof requires owner-approved truth or a safe fallback route.'
                                : undefined}
                            rules={[
                                { required: true },
                                ({ getFieldValue }) => ({
                                    validator: async (_, value) => {
                                        const blocksCriticalRag = getFieldValue('riskLevel') === 'critical'
                                            && value === 'rag'
                                            && (getFieldValue('active') !== false || !editingCase);
                                        if (blocksCriticalRag) {
                                            throw new Error(
                                                'Knowledge fallback cannot certify an active critical answer test.',
                                            );
                                        }
                                    },
                                }),
                            ]}
                        >
                            <Select
                                options={Object.entries(SOURCE_LABELS).map(([value, label]) => ({
                                    value,
                                    label: value === 'rag' && selectedRiskLevel === 'critical'
                                        ? `${label} - not valid for critical proof`
                                        : label,
                                    disabled: value === 'rag'
                                        && selectedRiskLevel === 'critical'
                                        && (selectedCaseIsActive !== false || !editingCase),
                                }))}
                            />
                        </Form.Item>
                        <Form.Item name="minimumConfidence" label="Minimum confidence" style={{ flex: 1 }}>
                            <Select allowClear options={['high', 'medium', 'low', 'none'].map(value => ({ value, label: value }))} />
                        </Form.Item>
                    </Flex>
                    <Flex gap={12} vertical={isMobile}>
                        <Form.Item name="riskLevel" label="Release importance" style={{ flex: 1 }} rules={[{ required: true }]}>
                            <Select options={[
                                { value: 'standard', label: 'Standard - review failures' },
                                { value: 'critical', label: 'Critical - mark release proof blocked' },
                            ]} />
                        </Form.Item>
                        <Form.Item name="citationPolicy" label="Evidence requirement" style={{ flex: 1 }} rules={[{ required: true }]}>
                            <Select options={Object.entries(CITATION_POLICY_LABELS).map(([value, label]) => ({ value, label }))} />
                        </Form.Item>
                    </Flex>
                    <Form.Item
                        name="referenceIds"
                        label="Expected reference IDs"
                        dependencies={['citationPolicy']}
                        extra="Use article IDs returned by the support answer. Trusted Answers can be verified by their answer ID without a separate reference."
                        rules={[({ getFieldValue }) => ({
                            validator: async (_, value) => {
                                if (getFieldValue('citationPolicy') === 'specific_sources' && splitLines(value).length === 0) {
                                    throw new Error('Add at least one expected reference ID.');
                                }
                            },
                        })]}
                    >
                        <TextArea rows={3} maxLength={1400} placeholder="One reference ID per line" />
                    </Form.Item>
                    <Flex gap={12} vertical={isMobile}>
                        <Form.Item name="expectedAnswerId" label="Expected trusted answer" style={{ flex: 1 }}>
                            <Input maxLength={160} placeholder="Optional" />
                        </Form.Item>
                        <Form.Item name="expectedFaqId" label="Expected FAQ ID" style={{ flex: 1 }}>
                            <Input maxLength={160} placeholder="Optional" />
                        </Form.Item>
                    </Flex>
                    <Flex gap={12} vertical={isMobile}>
                        <Form.Item name="mustInclude" label="Required phrases" style={{ flex: 1 }}>
                            <TextArea rows={3} placeholder="One phrase per line" />
                        </Form.Item>
                        <Form.Item name="mustNotInclude" label="Blocked phrases" style={{ flex: 1 }}>
                            <TextArea rows={3} placeholder="One phrase per line" />
                        </Form.Item>
                    </Flex>
                    <Title level={5}>Page context</Title>
                    <Flex gap={12} vertical={isMobile}>
                        <Form.Item name="path" label="Route" style={{ flex: 1 }}><Input placeholder="/billing/invoices" /></Form.Item>
                        <Form.Item name="contextKey" label="Context key" style={{ flex: 1 }}><Input placeholder="billing_invoices" /></Form.Item>
                    </Flex>
                    <Flex gap={12} vertical={isMobile}>
                        <Form.Item name="feature" label="Feature" style={{ flex: 1 }}><Input placeholder="billing" /></Form.Item>
                        <Form.Item name="workflow" label="Workflow" style={{ flex: 1 }}><Input placeholder="invoice_payment" /></Form.Item>
                    </Flex>
                    <Flex gap={12} vertical={isMobile}>
                        <Form.Item name="plan" label="Plan" style={{ flex: 1 }}><Input placeholder="growth" /></Form.Item>
                        <Form.Item name="role" label="User role" style={{ flex: 1 }}><Input placeholder="workspace_owner" /></Form.Item>
                    </Flex>
                    {FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SCOPE_COVERAGE_MATRIX ? (
                        <Flex gap={12} vertical={isMobile}>
                            <Form.Item name="state" label="Product state" style={{ flex: 1 }}>
                                <Input placeholder="trial_expired" />
                            </Form.Item>
                            <Form.Item
                                name="version"
                                label="Product version"
                                style={{ flex: 1 }}
                                rules={[{
                                    validator: async (_, value) => {
                                        if (value && !normalizeAnswerlatticeVersionLabel(value)) {
                                            throw new Error('Use a numeric version such as 2.4.1');
                                        }
                                    },
                                }]}
                            >
                                <Input placeholder="2.4.1" />
                            </Form.Item>
                        </Flex>
                    ) : null}
                    <Form.Item name="relatedEntityIds" label="Related entity IDs" extra="Add one per line so release checks can run only affected tests.">
                        <TextArea rows={3} placeholder="billing_invoices" />
                    </Form.Item>
                    <Form.Item name="active" valuePropName="checked"><Checkbox>Include in test runs</Checkbox></Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Check release safety"
                open={releaseModalOpen}
                onCancel={closeReleaseCheck}
                onOk={() => selectedReleaseId && executeRun('canonical_only', { releaseId: selectedReleaseId })}
                okText="Run affected tests"
                confirmLoading={releaseLoading || runningMode === 'canonical_only'}
                okButtonProps={{ disabled: !selectedReleaseId, style: ACTION_BUTTON_STYLE }}
                cancelButtonProps={{ style: ACTION_BUTTON_STYLE }}
            >
                <Paragraph type="secondary">
                    Answerlattice runs only tests linked to entities changed by the selected release. Critical failures mark the proof as blocked, but no product state or deployment is changed automatically.
                </Paragraph>
                <Select
                    loading={releaseLoading}
                    value={selectedReleaseId}
                    onChange={setSelectedReleaseId}
                    style={{ width: '100%' }}
                    placeholder="Select a release"
                    options={releases.map(release => ({
                        value: release.id,
                        label: `${release.versionLabel} · ${release.entityChanges?.length || 0} changed entities`,
                    }))}
                />
            </Modal>

            <Modal
                title="Prepare rollback proposal"
                open={Boolean(rollbackResult)}
                onCancel={() => setRollbackResult(null)}
                onOk={createRollbackProposal}
                okText="Create review proposal"
                confirmLoading={rollbackLoading}
                okButtonProps={{ disabled: !selectedAuditLogId || rollbackReason.trim().length < 8, style: ACTION_BUTTON_STYLE }}
                cancelButtonProps={{ style: ACTION_BUTTON_STYLE }}
            >
                <Alert
                    type="warning"
                    showIcon
                    message="This does not change the live answer"
                    description="The selected prior version is copied into a version-update proposal. A governance reviewer must approve and implement it."
                    style={{ marginBottom: 16 }}
                />
                <Flex vertical gap={14}>
                    <Select
                        loading={rollbackLoading}
                        value={selectedAuditLogId}
                        onChange={setSelectedAuditLogId}
                        placeholder="Select a prior version"
                        options={rollbackHistory.map(log => ({
                            value: log.id,
                            label: `${formatDateTime(log.timestamp?.toDate?.()?.toISOString?.())} · ${log.performedBy || 'team member'}`,
                        }))}
                    />
                    {rollbackHistory.length === 0 && !rollbackLoading && (
                        <Alert type="info" message="No restorable version is available yet. New answer edits will retain a rollback snapshot." />
                    )}
                    <TextArea
                        value={rollbackReason}
                        onChange={event => setRollbackReason(event.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder="Why should this prior answer be restored?"
                    />
                </Flex>
            </Modal>
        </Flex>
    );
}
