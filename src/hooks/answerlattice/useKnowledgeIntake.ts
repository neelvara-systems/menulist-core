import { FEATURE_FLAGS } from '@config/features';
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

const apiJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(url, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
        },
        cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || 'Answerlattice request failed.');
    }
    return data as T;
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
            const data = await apiJson<{ jobs: AnswerlatticeKnowledgeIntakeJob[] }>('/api/answerlattice/knowledge-intake/jobs');
            setJobs(data.jobs || []);
            setActiveJobId((current) => current || data.jobs?.[0]?.id || null);
        } catch (err) {
            const nextError = err instanceof Error ? err.message : 'Could not load intake jobs.';
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
            const data = await apiJson<{ bundle: IntakeBundle }>(`/api/answerlattice/knowledge-intake/jobs/${encodeURIComponent(id)}`);
            setBundle(data.bundle || { job: null, sources: [], reviewItems: [] });
        } catch (err) {
            const nextError = err instanceof Error ? err.message : 'Could not load intake job.';
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
            const data = await apiJson<{ job: AnswerlatticeKnowledgeIntakeJob }>('/api/answerlattice/knowledge-intake/jobs', {
                method: 'POST',
                body: JSON.stringify(input),
            });
            setActiveJobId(data.job.id);
            await refreshJobs();
            await refreshBundle(data.job.id);
            message.success('Knowledge intake created');
            return data.job;
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Could not create intake job.');
            return null;
        } finally {
            setSaving(false);
        }
    }, [refreshBundle, refreshJobs]);

    const addSource = useCallback(async (jobId: string, input: Record<string, any>) => {
        setSaving(true);
        try {
            const data = await apiJson<{ source: AnswerlatticeKnowledgeSource }>(`/api/answerlattice/knowledge-intake/jobs/${encodeURIComponent(jobId)}/sources`, {
                method: 'POST',
                body: JSON.stringify(input),
            });
            await refreshBundle(jobId);
            message.success(data.source?.['duplicate'] ? 'Source already exists in this intake' : 'Source added');
            return data.source;
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Could not add source.');
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
                method: 'POST',
                body: formData,
                cache: 'no-store',
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || 'Could not extract media source.');
            }
            await refreshBundle(jobId);
            const units = Number(data.usage?.unitsConsumed || 0);
            message.success(units > 0
                ? `Media extracted and ${units} support credit${units === 1 ? '' : 's'} recorded`
                : 'Media extracted');
            return data as { source: AnswerlatticeKnowledgeSource; usage?: Record<string, any> };
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Could not extract media source.');
            return null;
        } finally {
            setSaving(false);
        }
    }, [refreshBundle]);

    const discoverLinks = useCallback(async (url: string) => {
        const data = await apiJson<{ links: Array<{ url: string; title: string; role: string; reason: string }> }>('/api/answerlattice/knowledge-intake/discover', {
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

        const data = await apiJson<{ entities: KnowledgeIntakeEntityOption[] }>(
            `/api/answerlattice/knowledge-intake/entities?q=${encodeURIComponent(normalizedQuery)}`,
        );
        const entities = data.entities || [];
        entityOptionCacheRef.current.set(normalizedQuery, entities);
        return entities;
    }, []);

    const analyzeJob = useCallback(async (jobId: string) => {
        setSaving(true);
        try {
            const data = await apiJson<{ result: { created: number } }>(`/api/answerlattice/knowledge-intake/jobs/${encodeURIComponent(jobId)}/analyze`, {
                method: 'POST',
                body: JSON.stringify({}),
            });
            await refreshBundle(jobId);
            message.success(`${data.result.created} review draft${data.result.created === 1 ? '' : 's'} prepared`);
            return data.result;
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Could not generate review drafts.');
            return null;
        } finally {
            setSaving(false);
        }
    }, [refreshBundle]);

    const updateReviewItem = useCallback(async (jobId: string, itemId: string, patch: Record<string, any>) => {
        setSaving(true);
        try {
            await apiJson(`/api/answerlattice/knowledge-intake/jobs/${encodeURIComponent(jobId)}/review-items/${encodeURIComponent(itemId)}`, {
                method: 'PATCH',
                body: JSON.stringify(patch),
            });
            await refreshBundle(jobId);
            return true;
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Could not update review item.');
            return false;
        } finally {
            setSaving(false);
        }
    }, [refreshBundle]);

    const publishJob = useCallback(async (jobId: string, itemIds?: string[]) => {
        setSaving(true);
        try {
            const data = await apiJson<{ result: { published: Array<{ itemId: string; target: string; id: string }> } }>(`/api/answerlattice/knowledge-intake/jobs/${encodeURIComponent(jobId)}/publish`, {
                method: 'POST',
                body: JSON.stringify({ itemIds }),
            });
            await refreshJobs();
            await refreshBundle(jobId);
            message.success(`${data.result.published.length} approved item${data.result.published.length === 1 ? '' : 's'} published`);
            return data.result;
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Could not publish intake items.');
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
