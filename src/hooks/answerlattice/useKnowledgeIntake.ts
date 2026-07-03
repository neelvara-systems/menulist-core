import { FEATURE_FLAGS } from '@config/features';
import { getBoundedAnswerlatticeStringContext, logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import type {
    AnswerlatticeIntakeReviewItem,
    AnswerlatticeKnowledgeIntakeJob,
    AnswerlatticeKnowledgeSource,
} from '@type/answerlattice';
import { message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
const ANSWERLATTICE_INTAKE_MEDIA_SOURCE_EXTRACT_FAILED = 'Could not extract media source.';
const ANSWERLATTICE_INTAKE_LINKS_DISCOVER_FAILED = 'Could not inspect URL.';
const ANSWERLATTICE_INTAKE_ENTITIES_SEARCH_FAILED = 'Could not search product entities.';
const ANSWERLATTICE_INTAKE_REVIEW_DRAFTS_GENERATE_FAILED = 'Could not generate review drafts.';
const ANSWERLATTICE_INTAKE_REVIEW_ITEM_UPDATE_FAILED = 'Could not update review item.';
const ANSWERLATTICE_INTAKE_ITEMS_PUBLISH_FAILED = 'Could not publish intake items.';
const ANSWERLATTICE_KNOWLEDGE_INTAKE_RESPONSE_JSON_MAX_BYTES = 64 * 1024;
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
type KnowledgeIntakeMediaSourceResponse = {
    source: AnswerlatticeKnowledgeSource;
    usage?: Record<string, any>;
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

const isRecord = (value: unknown): value is Record<string, any> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const hasStringId = (value: unknown): value is { id: string } => (
    isRecord(value) && typeof value.id === 'string' && value.id.length > 0
);

const isIntakeJob = (value: unknown): value is AnswerlatticeKnowledgeIntakeJob => hasStringId(value);
const isKnowledgeSource = (value: unknown): value is AnswerlatticeKnowledgeSource => hasStringId(value);
const isReviewItem = (value: unknown): value is AnswerlatticeIntakeReviewItem => hasStringId(value);

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

const isKnowledgeIntakeMediaSourceResponse = (value: unknown): value is KnowledgeIntakeMediaSourceResponse => (
    isRecord(value)
    && isKnowledgeSource(value.source)
    && (value.usage === undefined || isRecord(value.usage))
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
    const [jobs, setJobs] = useState<AnswerlatticeKnowledgeIntakeJob[]>([]);
    const [bundle, setBundle] = useState<IntakeBundle>({ job: null, sources: [], reviewItems: [] });
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const entityOptionCacheRef = useRef<Map<string, KnowledgeIntakeEntityOption[]>>(new Map());

    const activeJob = bundle.job;

    const refreshJobs = useCallback(async () => {
        if (!enabled) return;
        setLoading(true);
        setError(null);
        try {
            const data = await apiJson<KnowledgeIntakeJobsResponse>('/api/answerlattice/knowledge-intake/jobs', {
                fallbackMessage: ANSWERLATTICE_INTAKE_JOBS_LOAD_FAILED,
                isValid: isKnowledgeIntakeJobsResponse,
                responseKind: 'jobs_load',
            });
            setJobs(data.jobs || []);
            setActiveJobId((current) => current || data.jobs?.[0]?.id || null);
        } catch {
            const nextError = ANSWERLATTICE_INTAKE_JOBS_LOAD_FAILED;
            setError(nextError);
            message.error(nextError);
        } finally {
            setLoading(false);
        }
    }, [enabled]);

    const refreshBundle = useCallback(async (jobId?: string | null) => {
        const id = jobId || activeJobId;
        if (!enabled || !id) {
            setBundle({ job: null, sources: [], reviewItems: [] });
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await apiJson<KnowledgeIntakeBundleResponse>(`/api/answerlattice/knowledge-intake/jobs/${encodeURIComponent(id)}`, {
                fallbackMessage: ANSWERLATTICE_INTAKE_JOB_LOAD_FAILED,
                isValid: isKnowledgeIntakeBundleResponse,
                responseKind: 'job_load',
            });
            setBundle(data.bundle || { job: null, sources: [], reviewItems: [] });
        } catch {
            const nextError = ANSWERLATTICE_INTAKE_JOB_LOAD_FAILED;
            setError(nextError);
            message.error(nextError);
        } finally {
            setLoading(false);
        }
    }, [activeJobId, enabled]);

    useEffect(() => {
        refreshJobs();
    }, [refreshJobs]);

    useEffect(() => {
        if (activeJobId) refreshBundle(activeJobId);
    }, [activeJobId, refreshBundle]);

    const createJob = useCallback(async (input: Record<string, any>) => {
        setSaving(true);
        try {
            const data = await apiJson<KnowledgeIntakeJobResponse>('/api/answerlattice/knowledge-intake/jobs', {
                fallbackMessage: ANSWERLATTICE_INTAKE_JOB_CREATE_FAILED,
                isValid: isKnowledgeIntakeJobResponse,
                responseKind: 'job_create',
            }, {
                method: 'POST',
                body: JSON.stringify(input),
            });
            setActiveJobId(data.job.id);
            await refreshJobs();
            await refreshBundle(data.job.id);
            message.success('Knowledge intake created');
            return data.job;
        } catch {
            message.error(ANSWERLATTICE_INTAKE_JOB_CREATE_FAILED);
            return null;
        } finally {
            setSaving(false);
        }
    }, [refreshBundle, refreshJobs]);

    const addSource = useCallback(async (jobId: string, input: Record<string, any>) => {
        setSaving(true);
        try {
            const data = await apiJson<KnowledgeIntakeSourceResponse>(`/api/answerlattice/knowledge-intake/jobs/${encodeURIComponent(jobId)}/sources`, {
                fallbackMessage: ANSWERLATTICE_INTAKE_SOURCE_ADD_FAILED,
                isValid: isKnowledgeIntakeSourceResponse,
                responseKind: 'source_add',
            }, {
                method: 'POST',
                body: JSON.stringify(input),
            });
            await refreshBundle(jobId);
            message.success(data.source?.['duplicate'] ? 'Source already exists in this intake' : 'Source added');
            return data.source;
        } catch {
            message.error(ANSWERLATTICE_INTAKE_SOURCE_ADD_FAILED);
            return null;
        } finally {
            setSaving(false);
        }
    }, [refreshBundle]);

    const addMediaSource = useCallback(async (jobId: string, file: File, input: Record<string, any> = {}) => {
        setSaving(true);
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
            await refreshBundle(jobId);
            const units = Number(data.usage?.unitsConsumed || 0);
            message.success(units > 0
                ? `Media extracted and ${units} support credit${units === 1 ? '' : 's'} recorded`
                : 'Media extracted');
            return data;
        } catch {
            message.error(ANSWERLATTICE_INTAKE_MEDIA_SOURCE_EXTRACT_FAILED);
            return null;
        } finally {
            setSaving(false);
        }
    }, [refreshBundle]);

    const discoverLinks = useCallback(async (url: string) => {
        const data = await apiJson<KnowledgeIntakeDiscoverLinksResponse>('/api/answerlattice/knowledge-intake/discover', {
            fallbackMessage: ANSWERLATTICE_INTAKE_LINKS_DISCOVER_FAILED,
            isValid: isKnowledgeIntakeDiscoverLinksResponse,
            responseKind: 'links_discover',
        }, {
            method: 'POST',
            body: JSON.stringify({ url }),
        });
        return data.links || [];
    }, []);

    const searchEntityOptions = useCallback(async (queryText: string) => {
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
        const entities = data.entities || [];
        entityOptionCacheRef.current.set(normalizedQuery, entities);
        return entities;
    }, []);

    const analyzeJob = useCallback(async (jobId: string) => {
        setSaving(true);
        try {
            const data = await apiJson<KnowledgeIntakeAnalyzeResponse>(`/api/answerlattice/knowledge-intake/jobs/${encodeURIComponent(jobId)}/analyze`, {
                fallbackMessage: ANSWERLATTICE_INTAKE_REVIEW_DRAFTS_GENERATE_FAILED,
                isValid: isKnowledgeIntakeAnalyzeResponse,
                responseKind: 'job_analyze',
            }, {
                method: 'POST',
                body: JSON.stringify({}),
            });
            await refreshBundle(jobId);
            message.success(`${data.result.created} review draft${data.result.created === 1 ? '' : 's'} prepared`);
            return data.result;
        } catch {
            message.error(ANSWERLATTICE_INTAKE_REVIEW_DRAFTS_GENERATE_FAILED);
            return null;
        } finally {
            setSaving(false);
        }
    }, [refreshBundle]);

    const updateReviewItem = useCallback(async (jobId: string, itemId: string, patch: Record<string, any>) => {
        setSaving(true);
        try {
            await apiJson<KnowledgeIntakeReviewItemResponse>(`/api/answerlattice/knowledge-intake/jobs/${encodeURIComponent(jobId)}/review-items/${encodeURIComponent(itemId)}`, {
                fallbackMessage: ANSWERLATTICE_INTAKE_REVIEW_ITEM_UPDATE_FAILED,
                isValid: isKnowledgeIntakeReviewItemResponse,
                responseKind: 'review_item_update',
            }, {
                method: 'PATCH',
                body: JSON.stringify(patch),
            });
            await refreshBundle(jobId);
            return true;
        } catch {
            message.error(ANSWERLATTICE_INTAKE_REVIEW_ITEM_UPDATE_FAILED);
            return false;
        } finally {
            setSaving(false);
        }
    }, [refreshBundle]);

    const publishJob = useCallback(async (jobId: string, itemIds?: string[]) => {
        setSaving(true);
        try {
            const data = await apiJson<KnowledgeIntakePublishResponse>(`/api/answerlattice/knowledge-intake/jobs/${encodeURIComponent(jobId)}/publish`, {
                fallbackMessage: ANSWERLATTICE_INTAKE_ITEMS_PUBLISH_FAILED,
                isValid: isKnowledgeIntakePublishResponse,
                responseKind: 'job_publish',
            }, {
                method: 'POST',
                body: JSON.stringify({ itemIds }),
            });
            await refreshJobs();
            await refreshBundle(jobId);
            message.success(`${data.result.published.length} approved item${data.result.published.length === 1 ? '' : 's'} published`);
            return data.result;
        } catch {
            message.error(ANSWERLATTICE_INTAKE_ITEMS_PUBLISH_FAILED);
            return null;
        } finally {
            setSaving(false);
        }
    }, [refreshBundle, refreshJobs]);

    const counts = useMemo(() => {
        const sourcesReady = bundle.sources.filter(source => source.status === 'ready').length;
        const accepted = bundle.reviewItems.filter(item => item.status === 'accepted').length;
        const published = bundle.reviewItems.filter(item => item.status === 'published').length;
        return {
            sourcesReady,
            accepted,
            published,
            drafts: bundle.reviewItems.filter(item => item.status === 'draft').length,
        };
    }, [bundle.reviewItems, bundle.sources]);

    return {
        activeJob,
        activeJobId,
        addMediaSource,
        addSource,
        analyzeJob,
        bundle,
        counts,
        createJob,
        discoverLinks,
        enabled,
        error,
        jobs,
        loading,
        publishJob,
        refreshBundle,
        refreshJobs,
        saving,
        searchEntityOptions,
        setActiveJobId,
        updateReviewItem,
    };
}
