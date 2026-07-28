import { FEATURE_FLAGS } from '@config/features';
import { getBoundedAnswerlatticeStringContext, logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import {
    AnswerlatticeIntakeReviewItemSchema,
    AnswerlatticeKnowledgeIntakeJobSchema,
    AnswerlatticeKnowledgeSourceSchema,
    AnswerlatticeSourceGovernanceSchema,
} from '@lib/answerlattice/knowledgeIntakeContracts';
import { normalizeAnswerlatticeKnowledgeIntakeSourceId } from '@lib/answerlattice/knowledgeIntakeIdBoundary';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { createLatestRequestGuard } from '@lib/runtime/latestRequestGuard';
import { useAnswerlatticeAccess } from '@providers/answerlatticeAccessProvider';
import {
    ANSWERLATTICE_KNOWLEDGE_INTAKE_CONSTRAINTS,
    type AnswerlatticeIntakeReviewItem,
    type AnswerlatticeKnowledgeIntakeJob,
    type AnswerlatticeKnowledgeSource,
} from '@type/answerlattice';
import { message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    getAnswerlatticeKnowledgeIntakeScopeKey,
    isAnswerlatticeKnowledgeIntakeScopeCurrent,
} from './knowledgeIntakeScopeState';

type IntakeBundle = {
    job: AnswerlatticeKnowledgeIntakeJob | null;
    sources: AnswerlatticeKnowledgeSource[];
    reviewItems: AnswerlatticeIntakeReviewItem[];
};

export type KnowledgeIntakeEntityOption = {
    id: string;
    name: string;
    type?: string;
    description?: string;
    status?: string;
};

const ANSWERLATTICE_INTAKE_JOBS_LOAD_FAILED = 'Could not load intake jobs.';
const ANSWERLATTICE_INTAKE_JOB_LOAD_FAILED = 'Could not load intake job.';
const ANSWERLATTICE_INTAKE_JOB_CREATE_FAILED = 'Could not create intake job.';
const ANSWERLATTICE_INTAKE_SOURCE_ADD_FAILED = 'Could not add source.';
const ANSWERLATTICE_INTAKE_SOURCE_GOVERNANCE_UPDATE_FAILED = 'Could not update source governance.';
const ANSWERLATTICE_INTAKE_MEDIA_SOURCE_EXTRACT_FAILED = 'Could not extract media source.';
const ANSWERLATTICE_INTAKE_LINKS_DISCOVER_FAILED = 'Could not inspect URL.';
const ANSWERLATTICE_INTAKE_ENTITIES_SEARCH_FAILED = 'Could not search product entities.';
const ANSWERLATTICE_INTAKE_REVIEW_DRAFTS_GENERATE_FAILED = 'Could not generate review drafts.';
const ANSWERLATTICE_INTAKE_REVIEW_ITEM_UPDATE_FAILED = 'Could not update review item.';
const ANSWERLATTICE_INTAKE_ITEMS_PUBLISH_FAILED = 'Could not publish intake items.';
const ANSWERLATTICE_KNOWLEDGE_INTAKE_RESPONSE_JSON_MAX_BYTES = 64 * 1024;
const ANSWERLATTICE_SOURCE_GOVERNANCE_MAX_PENDING_ATTEMPTS = 20;
const ANSWERLATTICE_KNOWLEDGE_INTAKE_REQUEST_POLICY: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};

type KnowledgeIntakeResponseKind =
    | 'jobs_load'
    | 'job_load'
    | 'job_create'
    | 'source_add'
    | 'source_governance_update'
    | 'media_source_add'
    | 'links_discover'
    | 'entities_search'
    | 'job_analyze'
    | 'review_item_update'
    | 'job_publish';

type KnowledgeIntakeResponseOptions<T> = {
    fallbackMessage: string;
    isValid: (value: unknown) => value is T;
    responseKind: KnowledgeIntakeResponseKind;
};

type KnowledgeIntakeJobsResponse = { jobs: AnswerlatticeKnowledgeIntakeJob[] };
type KnowledgeIntakeJobResponse = { job: AnswerlatticeKnowledgeIntakeJob };
type KnowledgeIntakeBundleResponse = { bundle: IntakeBundle };
type KnowledgeIntakeSourceResponse = { source: AnswerlatticeKnowledgeSource };
type KnowledgeIntakeSourceGovernanceResponse = {
    source: AnswerlatticeKnowledgeSource;
    governanceUpdates: Array<{
        sourceId: string;
        governance: NonNullable<AnswerlatticeKnowledgeSource['governance']>;
    }>;
};
type KnowledgeIntakeMediaSourceResponse = {
    source: AnswerlatticeKnowledgeSource;
    usage: { unitsConsumed: number };
};
type KnowledgeIntakeDiscoverLinksResponse = {
    links: Array<{ url: string; title: string; role: string; reason: string }>;
};
type KnowledgeIntakeEntitiesResponse = { entities: KnowledgeIntakeEntityOption[] };
type KnowledgeIntakeAnalyzeResponse = { result: { created: number } };
type KnowledgeIntakeReviewItemResponse = { item: AnswerlatticeIntakeReviewItem };
type KnowledgeIntakePublishResponse = {
    result: { published: Array<{ itemId: string; target: string; id: string }> };
};
type SourceGovernancePendingAttempt = {
    fingerprint: string;
    requestId: string;
};

const beginKnowledgeIntakeSavingOperation = (
    counter: { current: number },
    setSaving: (value: boolean) => void,
) => {
    counter.current += 1;
    setSaving(true);
};

const finishKnowledgeIntakeSavingOperation = (
    counter: { current: number },
    setSaving: (value: boolean) => void,
) => {
    counter.current = Math.max(0, counter.current - 1);
    setSaving(counter.current > 0);
};

const isRecord = (value: unknown): value is Record<string, any> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const stableKnowledgeIntakeRequestValue = (value: unknown): string => {
    if (value === undefined) return 'undefined';
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value) ?? `${typeof value}:${String(value)}`;
    }
    if (Array.isArray(value)) {
        return `[${value.map(stableKnowledgeIntakeRequestValue).join(',')}]`;
    }
    return `{${Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => `${JSON.stringify(key)}:${stableKnowledgeIntakeRequestValue(nested)}`)
        .join(',')}}`;
};

const isIntakeJob = (value: unknown): value is AnswerlatticeKnowledgeIntakeJob => (
    AnswerlatticeKnowledgeIntakeJobSchema.safeParse(value).success
);
const isKnowledgeSource = (value: unknown): value is AnswerlatticeKnowledgeSource => (
    AnswerlatticeKnowledgeSourceSchema.safeParse(value).success
);
const isReviewItem = (value: unknown): value is AnswerlatticeIntakeReviewItem => (
    AnswerlatticeIntakeReviewItemSchema.safeParse(value).success
);

const isEntityOption = (value: unknown): value is KnowledgeIntakeEntityOption => (
    isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
);

const isDiscoverLink = (value: unknown): value is KnowledgeIntakeDiscoverLinksResponse['links'][number] => (
    isRecord(value)
    && typeof value.url === 'string'
    && typeof value.title === 'string'
    && typeof value.role === 'string'
    && typeof value.reason === 'string'
);

const isPublishedItem = (value: unknown): value is KnowledgeIntakePublishResponse['result']['published'][number] => (
    isRecord(value)
    && typeof value.itemId === 'string'
    && typeof value.target === 'string'
    && typeof value.id === 'string'
);

const isKnowledgeIntakeJobsResponse = (value: unknown): value is KnowledgeIntakeJobsResponse => (
    isRecord(value) && Array.isArray(value.jobs) && value.jobs.every(isIntakeJob)
);

const isKnowledgeIntakeJobResponse = (value: unknown): value is KnowledgeIntakeJobResponse => (
    isRecord(value) && isIntakeJob(value.job)
);

const isKnowledgeIntakeBundleResponse = (value: unknown): value is KnowledgeIntakeBundleResponse => (
    isRecord(value)
    && isRecord(value.bundle)
    && (value.bundle.job === null || isIntakeJob(value.bundle.job))
    && Array.isArray(value.bundle.sources)
    && value.bundle.sources.every(isKnowledgeSource)
    && Array.isArray(value.bundle.reviewItems)
    && value.bundle.reviewItems.every(isReviewItem)
);

const isKnowledgeIntakeSourceResponse = (value: unknown): value is KnowledgeIntakeSourceResponse => (
    isRecord(value) && isKnowledgeSource(value.source)
);

const isKnowledgeIntakeSourceGovernanceResponse = (
    value: unknown,
): value is KnowledgeIntakeSourceGovernanceResponse => {
    if (
        !isRecord(value)
        || !isKnowledgeSource(value.source)
        || !Array.isArray(value.governanceUpdates)
        || value.governanceUpdates.length < 1
        || value.governanceUpdates.length > (
            ANSWERLATTICE_KNOWLEDGE_INTAKE_CONSTRAINTS.MAX_SOURCE_GOVERNANCE_CONFLICTS * 2
            + 1
        )
    ) {
        return false;
    }
    const seenSourceIds = new Set<string>();
    for (const update of value.governanceUpdates) {
        if (
            !isRecord(update)
            || typeof update.sourceId !== 'string'
            || normalizeAnswerlatticeKnowledgeIntakeSourceId(update.sourceId) !== update.sourceId
            || seenSourceIds.has(update.sourceId)
            || !AnswerlatticeSourceGovernanceSchema.safeParse(update.governance).success
        ) {
            return false;
        }
        seenSourceIds.add(update.sourceId);
    }
    const targetUpdate = value.governanceUpdates.find(update => update.sourceId === value.source.id);
    return Boolean(
        value.source.governance
        && targetUpdate
        && stableKnowledgeIntakeRequestValue(targetUpdate.governance)
            === stableKnowledgeIntakeRequestValue(value.source.governance)
    );
};

const isKnowledgeIntakeMediaSourceResponse = (value: unknown): value is KnowledgeIntakeMediaSourceResponse => (
    isRecord(value)
    && isKnowledgeSource(value.source)
    && isRecord(value.usage)
    && typeof value.usage.unitsConsumed === 'number'
    && Number.isFinite(value.usage.unitsConsumed)
    && value.usage.unitsConsumed >= 0
);

const isKnowledgeIntakeDiscoverLinksResponse = (value: unknown): value is KnowledgeIntakeDiscoverLinksResponse => (
    isRecord(value) && Array.isArray(value.links) && value.links.every(isDiscoverLink)
);

const isKnowledgeIntakeEntitiesResponse = (value: unknown): value is KnowledgeIntakeEntitiesResponse => (
    isRecord(value) && Array.isArray(value.entities) && value.entities.every(isEntityOption)
);

const isKnowledgeIntakeAnalyzeResponse = (value: unknown): value is KnowledgeIntakeAnalyzeResponse => (
    isRecord(value)
    && isRecord(value.result)
    && typeof value.result.created === 'number'
    && Number.isFinite(value.result.created)
);

const isKnowledgeIntakeReviewItemResponse = (value: unknown): value is KnowledgeIntakeReviewItemResponse => (
    isRecord(value) && isReviewItem(value.item)
);

const isKnowledgeIntakePublishResponse = (value: unknown): value is KnowledgeIntakePublishResponse => (
    isRecord(value)
    && isRecord(value.result)
    && Array.isArray(value.result.published)
    && value.result.published.every(isPublishedItem)
);

const getKnowledgeIntakeResponseLogContext = (
    responseKind: KnowledgeIntakeResponseKind,
    response: Response,
) => ({
    ...getBoundedAnswerlatticeStringContext('responseKind', responseKind),
    responseOk: response.ok,
    responseStatus: response.status,
});

const readKnowledgeIntakeResponse = async <T>(
    response: Response,
    options: KnowledgeIntakeResponseOptions<T>,
): Promise<T> => {
    let payload: unknown = null;
    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            ANSWERLATTICE_KNOWLEDGE_INTAKE_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logAnswerlatticeFailure(
            'answerlattice_knowledge_intake_response_parse_failed',
            error,
            getKnowledgeIntakeResponseLogContext(options.responseKind, response),
        );
        throw new Error(options.fallbackMessage);
    }

    if (!response.ok) {
        logAnswerlatticeFailure(
            'answerlattice_knowledge_intake_response_rejected',
            undefined,
            getKnowledgeIntakeResponseLogContext(options.responseKind, response),
        );
        throw new Error(options.fallbackMessage);
    }

    if (!options.isValid(payload)) {
        logAnswerlatticeFailure(
            'answerlattice_knowledge_intake_response_invalid',
            undefined,
            getKnowledgeIntakeResponseLogContext(options.responseKind, response),
        );
        throw new Error(options.fallbackMessage);
    }

    return payload;
};

const apiJson = async <T>(
    url: string,
    options: KnowledgeIntakeResponseOptions<T>,
    init?: RequestInit,
): Promise<T> => {
    const response = await fetch(url, {
        ...init,
        ...ANSWERLATTICE_KNOWLEDGE_INTAKE_REQUEST_POLICY,
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
        },
    });
    return readKnowledgeIntakeResponse(response, options);
};

export function useKnowledgeIntake() {
    const enabled = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE === true;
    const { access } = useAnswerlatticeAccess();
    const scopeKey = getAnswerlatticeKnowledgeIntakeScopeKey(
        access?.scope.tenantId,
        access?.scope.storeId,
    );
    const [jobs, setJobs] = useState<AnswerlatticeKnowledgeIntakeJob[]>([]);
    const [jobsScopeKey, setJobsScopeKey] = useState<string | null>(null);
    const [bundle, setBundle] = useState<IntakeBundle>({ job: null, sources: [], reviewItems: [] });
    const [bundleScopeKey, setBundleScopeKey] = useState<string | null>(null);
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [jobsLoading, setJobsLoading] = useState(false);
    const [bundleLoading, setBundleLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const entityOptionCacheRef = useRef<Map<string, KnowledgeIntakeEntityOption[]>>(new Map());
    const sourceGovernancePendingAttemptRef = useRef<Map<string, SourceGovernancePendingAttempt>>(new Map());
    const jobsRequestGuardRef = useRef(createLatestRequestGuard());
    const bundleRequestGuardRef = useRef(createLatestRequestGuard());
    const scopeKeyRef = useRef(scopeKey);
    const savingOperationCountRef = useRef(0);
    scopeKeyRef.current = scopeKey;

    const visibleJobs = jobsScopeKey === scopeKey ? jobs : [];
    const visibleBundle = bundleScopeKey === scopeKey
        ? bundle
        : { job: null, sources: [], reviewItems: [] };
    const visibleActiveJobId = jobsScopeKey === scopeKey ? activeJobId : null;
    const activeJob = visibleBundle.job;

    const refreshJobs = useCallback(async () => {
        const requestGuard = jobsRequestGuardRef.current;
        const requestId = requestGuard.begin();
        if (!enabled || !scopeKey) {
            setJobs([]);
            setJobsScopeKey(null);
            setJobsLoading(false);
            return;
        }
        setJobsLoading(true);
        setError(null);
        try {
            const data = await apiJson<KnowledgeIntakeJobsResponse>('/api/answerlattice/knowledge-intake/jobs', {
                fallbackMessage: ANSWERLATTICE_INTAKE_JOBS_LOAD_FAILED,
                isValid: isKnowledgeIntakeJobsResponse,
                responseKind: 'jobs_load',
            });
            if (!requestGuard.isCurrent(requestId)) return;
            setJobs(data.jobs || []);
            setActiveJobId((current) => current || data.jobs?.[0]?.id || null);
            setJobsScopeKey(scopeKey);
        } catch {
            if (!requestGuard.isCurrent(requestId)) return;
            const nextError = ANSWERLATTICE_INTAKE_JOBS_LOAD_FAILED;
            setError(nextError);
            message.error(nextError);
        } finally {
            if (requestGuard.isCurrent(requestId)) setJobsLoading(false);
        }
    }, [enabled, scopeKey]);

    const refreshBundle = useCallback(async (jobId?: string | null) => {
        const requestGuard = bundleRequestGuardRef.current;
        const requestId = requestGuard.begin();
        const id = jobId || visibleActiveJobId;
        if (!enabled || !scopeKey || !id) {
            setBundle({ job: null, sources: [], reviewItems: [] });
            setBundleScopeKey(null);
            setBundleLoading(false);
            return;
        }
        setBundleLoading(true);
        setError(null);
        try {
            const data = await apiJson<KnowledgeIntakeBundleResponse>(`/api/answerlattice/knowledge-intake/jobs/${encodeURIComponent(id)}`, {
                fallbackMessage: ANSWERLATTICE_INTAKE_JOB_LOAD_FAILED,
                isValid: isKnowledgeIntakeBundleResponse,
                responseKind: 'job_load',
            });
            if (!requestGuard.isCurrent(requestId)) return;
            setBundle(data.bundle || { job: null, sources: [], reviewItems: [] });
            setBundleScopeKey(scopeKey);
        } catch {
            if (!requestGuard.isCurrent(requestId)) return;
            const nextError = ANSWERLATTICE_INTAKE_JOB_LOAD_FAILED;
            setError(nextError);
            message.error(nextError);
        } finally {
            if (requestGuard.isCurrent(requestId)) setBundleLoading(false);
        }
    }, [enabled, scopeKey, visibleActiveJobId]);

    useEffect(() => {
        jobsRequestGuardRef.current.invalidate();
        bundleRequestGuardRef.current.invalidate();
        setJobs([]);
        setJobsScopeKey(null);
        setBundle({ job: null, sources: [], reviewItems: [] });
        setBundleScopeKey(null);
        setActiveJobId(null);
        setError(null);
        entityOptionCacheRef.current.clear();
        sourceGovernancePendingAttemptRef.current.clear();
        void refreshJobs();
        return () => {
            jobsRequestGuardRef.current.invalidate();
            bundleRequestGuardRef.current.invalidate();
        };
    }, [refreshJobs, scopeKey]);

    useEffect(() => {
        if (visibleActiveJobId) refreshBundle(visibleActiveJobId);
    }, [refreshBundle, visibleActiveJobId]);

    const createJob = useCallback(async (input: Record<string, any>) => {
        const operationScopeKey = scopeKeyRef.current;
        if (!operationScopeKey) return null;
        beginKnowledgeIntakeSavingOperation(savingOperationCountRef, setSaving);
        try {
            const data = await apiJson<KnowledgeIntakeJobResponse>('/api/answerlattice/knowledge-intake/jobs', {
                fallbackMessage: ANSWERLATTICE_INTAKE_JOB_CREATE_FAILED,
                isValid: isKnowledgeIntakeJobResponse,
                responseKind: 'job_create',
            }, {
                method: 'POST',
                body: JSON.stringify(input),
            });
            if (!isAnswerlatticeKnowledgeIntakeScopeCurrent(operationScopeKey, scopeKeyRef.current)) return null;
            setActiveJobId(data.job.id);
            await refreshJobs();
            await refreshBundle(data.job.id);
            message.success('Knowledge intake created');
            return data.job;
        } catch {
            if (!isAnswerlatticeKnowledgeIntakeScopeCurrent(operationScopeKey, scopeKeyRef.current)) return null;
            message.error(ANSWERLATTICE_INTAKE_JOB_CREATE_FAILED);
            return null;
        } finally {
            finishKnowledgeIntakeSavingOperation(savingOperationCountRef, setSaving);
        }
    }, [refreshBundle, refreshJobs]);

    const addSource = useCallback(async (jobId: string, input: Record<string, any>) => {
        const operationScopeKey = scopeKeyRef.current;
        if (!operationScopeKey) return null;
        beginKnowledgeIntakeSavingOperation(savingOperationCountRef, setSaving);
        try {
            const data = await apiJson<KnowledgeIntakeSourceResponse>(`/api/answerlattice/knowledge-intake/jobs/${encodeURIComponent(jobId)}/sources`, {
                fallbackMessage: ANSWERLATTICE_INTAKE_SOURCE_ADD_FAILED,
                isValid: isKnowledgeIntakeSourceResponse,
                responseKind: 'source_add',
            }, {
                method: 'POST',
                body: JSON.stringify(input),
            });
            if (scopeKeyRef.current !== operationScopeKey) return null;
            await refreshBundle(jobId);
            if (scopeKeyRef.current !== operationScopeKey) return null;
            message.success(data.source?.['duplicate'] ? 'Source already exists in this intake' : 'Source added');
            return data.source;
        } catch {
            if (scopeKeyRef.current !== operationScopeKey) return null;
            message.error(ANSWERLATTICE_INTAKE_SOURCE_ADD_FAILED);
            return null;
        } finally {
            finishKnowledgeIntakeSavingOperation(savingOperationCountRef, setSaving);
        }
    }, [refreshBundle]);

    const updateSourceGovernance = useCallback(async (
        jobId: string,
        sourceId: string,
        input: Record<string, any>,
    ) => {
        const operationScopeKey = scopeKeyRef.current;
        if (!operationScopeKey) return null;
        beginKnowledgeIntakeSavingOperation(savingOperationCountRef, setSaving);
        const attemptKey = `${jobId}:${sourceId}`;
        const fingerprint = stableKnowledgeIntakeRequestValue(input);
        const pendingAttempt = sourceGovernancePendingAttemptRef.current.get(attemptKey);
        const requestId = (
            pendingAttempt?.fingerprint === fingerprint
                ? pendingAttempt.requestId
                : crypto.randomUUID()
        );
        if (
            !sourceGovernancePendingAttemptRef.current.has(attemptKey)
            && sourceGovernancePendingAttemptRef.current.size
                >= ANSWERLATTICE_SOURCE_GOVERNANCE_MAX_PENDING_ATTEMPTS
        ) {
            const oldestAttemptKey = sourceGovernancePendingAttemptRef.current.keys().next().value;
            if (oldestAttemptKey) {
                sourceGovernancePendingAttemptRef.current.delete(oldestAttemptKey);
            }
        }
        sourceGovernancePendingAttemptRef.current.set(attemptKey, { fingerprint, requestId });
        try {
            const data = await apiJson<KnowledgeIntakeSourceGovernanceResponse>(
                `/api/answerlattice/knowledge-intake/jobs/${encodeURIComponent(jobId)}/sources/${encodeURIComponent(sourceId)}/governance`,
                {
                    fallbackMessage: ANSWERLATTICE_INTAKE_SOURCE_GOVERNANCE_UPDATE_FAILED,
                    isValid: isKnowledgeIntakeSourceGovernanceResponse,
                    responseKind: 'source_governance_update',
                },
                {
                    method: 'PATCH',
                    body: JSON.stringify({
                        ...input,
                        requestId,
                    }),
                },
            );
            if (scopeKeyRef.current !== operationScopeKey) return null;
            const currentAttempt = sourceGovernancePendingAttemptRef.current.get(attemptKey);
            if (
                currentAttempt?.fingerprint !== fingerprint
                || currentAttempt.requestId !== requestId
            ) {
                return null;
            }
            const governanceBySourceId = new Map(
                data.governanceUpdates.map(update => [update.sourceId, update.governance]),
            );
            setBundle(current => (
                current.job?.id === jobId
                    ? {
                        ...current,
                        sources: current.sources.map(source => (
                            governanceBySourceId.has(source.id)
                                ? {
                                    ...source,
                                    governance: governanceBySourceId.get(source.id),
                                }
                                : source
                        )),
                    }
                    : current
            ));
            sourceGovernancePendingAttemptRef.current.delete(attemptKey);
            message.success('Source governance updated');
            return data.source;
        } catch {
            if (scopeKeyRef.current !== operationScopeKey) return null;
            message.error(ANSWERLATTICE_INTAKE_SOURCE_GOVERNANCE_UPDATE_FAILED);
            return null;
        } finally {
            finishKnowledgeIntakeSavingOperation(savingOperationCountRef, setSaving);
        }
    }, []);

    const addMediaSource = useCallback(async (jobId: string, file: File, input: Record<string, any> = {}) => {
        const operationScopeKey = scopeKeyRef.current;
        if (!operationScopeKey) return null;
        beginKnowledgeIntakeSavingOperation(savingOperationCountRef, setSaving);
        try {
            const formData = new FormData();
            formData.append('file', file);
            if (input.title) formData.append('title', String(input.title));
            if (input.tags?.length) formData.append('tags', JSON.stringify(input.tags));
            if (input.contextKeys?.length) formData.append('contextKeys', JSON.stringify(input.contextKeys));
            if (input.entityIds?.length) formData.append('entityIds', JSON.stringify(input.entityIds));

            const response = await fetch(`/api/answerlattice/knowledge-intake/jobs/${encodeURIComponent(jobId)}/media`, {
                ...ANSWERLATTICE_KNOWLEDGE_INTAKE_REQUEST_POLICY,
                method: 'POST',
                body: formData,
            });
            const data = await readKnowledgeIntakeResponse<KnowledgeIntakeMediaSourceResponse>(response, {
                fallbackMessage: ANSWERLATTICE_INTAKE_MEDIA_SOURCE_EXTRACT_FAILED,
                isValid: isKnowledgeIntakeMediaSourceResponse,
                responseKind: 'media_source_add',
            });
            if (scopeKeyRef.current !== operationScopeKey) return null;
            await refreshBundle(jobId);
            if (scopeKeyRef.current !== operationScopeKey) return null;
            const units = Number(data.usage?.unitsConsumed || 0);
            message.success(units > 0
                ? `Media extracted and ${units} support credit${units === 1 ? '' : 's'} recorded`
                : 'Media extracted');
            return data;
        } catch {
            if (scopeKeyRef.current !== operationScopeKey) return null;
            message.error(ANSWERLATTICE_INTAKE_MEDIA_SOURCE_EXTRACT_FAILED);
            return null;
        } finally {
            finishKnowledgeIntakeSavingOperation(savingOperationCountRef, setSaving);
        }
    }, [refreshBundle]);

    const discoverLinks = useCallback(async (url: string) => {
        const operationScopeKey = scopeKeyRef.current;
        if (!operationScopeKey) return [];
        const data = await apiJson<KnowledgeIntakeDiscoverLinksResponse>('/api/answerlattice/knowledge-intake/discover', {
            fallbackMessage: ANSWERLATTICE_INTAKE_LINKS_DISCOVER_FAILED,
            isValid: isKnowledgeIntakeDiscoverLinksResponse,
            responseKind: 'links_discover',
        }, {
            method: 'POST',
            body: JSON.stringify({ url }),
        });
        if (scopeKeyRef.current !== operationScopeKey) return [];
        return data.links || [];
    }, []);

    const searchEntityOptions = useCallback(async (queryText: string) => {
        const operationScopeKey = scopeKeyRef.current;
        if (!operationScopeKey) return [];
        const normalizedQuery = String(queryText || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (normalizedQuery.length < 3) return [];

        const cached = entityOptionCacheRef.current.get(normalizedQuery);
        if (cached) return cached;

        const data = await apiJson<KnowledgeIntakeEntitiesResponse>(
            `/api/answerlattice/knowledge-intake/entities?q=${encodeURIComponent(normalizedQuery)}`,
            {
                fallbackMessage: ANSWERLATTICE_INTAKE_ENTITIES_SEARCH_FAILED,
                isValid: isKnowledgeIntakeEntitiesResponse,
                responseKind: 'entities_search',
            },
        );
        if (scopeKeyRef.current !== operationScopeKey) return [];
        const entities = data.entities || [];
        if (entityOptionCacheRef.current.size >= 50) {
            const oldestKey = entityOptionCacheRef.current.keys().next().value;
            if (oldestKey) entityOptionCacheRef.current.delete(oldestKey);
        }
        entityOptionCacheRef.current.set(normalizedQuery, entities);
        return entities;
    }, []);

    const analyzeJob = useCallback(async (jobId: string) => {
        const operationScopeKey = scopeKeyRef.current;
        if (!operationScopeKey) return null;
        beginKnowledgeIntakeSavingOperation(savingOperationCountRef, setSaving);
        try {
            const data = await apiJson<KnowledgeIntakeAnalyzeResponse>(`/api/answerlattice/knowledge-intake/jobs/${encodeURIComponent(jobId)}/analyze`, {
                fallbackMessage: ANSWERLATTICE_INTAKE_REVIEW_DRAFTS_GENERATE_FAILED,
                isValid: isKnowledgeIntakeAnalyzeResponse,
                responseKind: 'job_analyze',
            }, {
                method: 'POST',
                body: JSON.stringify({}),
            });
            if (scopeKeyRef.current !== operationScopeKey) return null;
            await refreshBundle(jobId);
            if (scopeKeyRef.current !== operationScopeKey) return null;
            message.success(`${data.result.created} review draft${data.result.created === 1 ? '' : 's'} prepared`);
            return data.result;
        } catch {
            if (scopeKeyRef.current !== operationScopeKey) return null;
            message.error(ANSWERLATTICE_INTAKE_REVIEW_DRAFTS_GENERATE_FAILED);
            return null;
        } finally {
            finishKnowledgeIntakeSavingOperation(savingOperationCountRef, setSaving);
        }
    }, [refreshBundle]);

    const updateReviewItem = useCallback(async (jobId: string, itemId: string, patch: Record<string, any>) => {
        const operationScopeKey = scopeKeyRef.current;
        if (!operationScopeKey) return false;
        beginKnowledgeIntakeSavingOperation(savingOperationCountRef, setSaving);
        try {
            await apiJson<KnowledgeIntakeReviewItemResponse>(`/api/answerlattice/knowledge-intake/jobs/${encodeURIComponent(jobId)}/review-items/${encodeURIComponent(itemId)}`, {
                fallbackMessage: ANSWERLATTICE_INTAKE_REVIEW_ITEM_UPDATE_FAILED,
                isValid: isKnowledgeIntakeReviewItemResponse,
                responseKind: 'review_item_update',
            }, {
                method: 'PATCH',
                body: JSON.stringify(patch),
            });
            if (scopeKeyRef.current !== operationScopeKey) return false;
            await refreshBundle(jobId);
            if (scopeKeyRef.current !== operationScopeKey) return false;
            return true;
        } catch {
            if (scopeKeyRef.current !== operationScopeKey) return false;
            message.error(ANSWERLATTICE_INTAKE_REVIEW_ITEM_UPDATE_FAILED);
            return false;
        } finally {
            finishKnowledgeIntakeSavingOperation(savingOperationCountRef, setSaving);
        }
    }, [refreshBundle]);

    const publishJob = useCallback(async (jobId: string, itemIds?: string[]) => {
        const operationScopeKey = scopeKeyRef.current;
        if (!operationScopeKey) return null;
        beginKnowledgeIntakeSavingOperation(savingOperationCountRef, setSaving);
        try {
            const data = await apiJson<KnowledgeIntakePublishResponse>(`/api/answerlattice/knowledge-intake/jobs/${encodeURIComponent(jobId)}/publish`, {
                fallbackMessage: ANSWERLATTICE_INTAKE_ITEMS_PUBLISH_FAILED,
                isValid: isKnowledgeIntakePublishResponse,
                responseKind: 'job_publish',
            }, {
                method: 'POST',
                body: JSON.stringify({ itemIds }),
            });
            if (scopeKeyRef.current !== operationScopeKey) return null;
            await refreshJobs();
            await refreshBundle(jobId);
            if (scopeKeyRef.current !== operationScopeKey) return null;
            message.success(`${data.result.published.length} approved item${data.result.published.length === 1 ? '' : 's'} published`);
            return data.result;
        } catch {
            if (scopeKeyRef.current !== operationScopeKey) return null;
            message.error(ANSWERLATTICE_INTAKE_ITEMS_PUBLISH_FAILED);
            return null;
        } finally {
            finishKnowledgeIntakeSavingOperation(savingOperationCountRef, setSaving);
        }
    }, [refreshBundle, refreshJobs]);

    const counts = useMemo(() => {
        const sourcesReady = visibleBundle.sources.filter(source => source.status === 'ready').length;
        const accepted = visibleBundle.reviewItems.filter(item => item.status === 'accepted').length;
        const published = visibleBundle.reviewItems.filter(item => item.status === 'published').length;
        return {
            sourcesReady,
            accepted,
            published,
            drafts: visibleBundle.reviewItems.filter(item => item.status === 'draft').length,
        };
    }, [visibleBundle.reviewItems, visibleBundle.sources]);

    return {
        activeJob,
        activeJobId: visibleActiveJobId,
        addMediaSource,
        addSource,
        analyzeJob,
        bundle: visibleBundle,
        counts,
        createJob,
        discoverLinks,
        enabled,
        error,
        jobs: visibleJobs,
        loading: jobsLoading || bundleLoading,
        publishJob,
        refreshBundle,
        refreshJobs,
        saving,
        searchEntityOptions,
        setActiveJobId,
        workspaceScopeKey: scopeKey,
        updateReviewItem,
        updateSourceGovernance,
    };
}
