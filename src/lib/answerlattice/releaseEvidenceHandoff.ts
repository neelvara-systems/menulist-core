import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { normalizeAnswerlatticeKnowledgeIntakePublicUrl } from '@lib/answerlattice/knowledgeIntakeDiscoveryContracts';
import {
    ANSWERLATTICE_RELEASE_MAX_ENTITY_CHANGES,
    normalizeAnswerlatticeVersionLabel,
} from '@lib/answerlattice/releaseContracts';
import type { JSONContent } from '@tiptap/core';

export const ANSWERLATTICE_RELEASE_EVIDENCE_HANDOFF_STORAGE_KEY = 'answerlattice:release-evidence-handoff:v1';
export const ANSWERLATTICE_RELEASE_EVIDENCE_HANDOFF_TTL_MS = 30 * 60 * 1000;
export const ANSWERLATTICE_RELEASE_EVIDENCE_MAX_TEXT_CHARS = 40_000;
const ANSWERLATTICE_RELEASE_EVIDENCE_MAX_SERIALIZED_CHARS = 128 * 1024;
const ANSWERLATTICE_RELEASE_EVIDENCE_MAX_PARAGRAPHS = 250;

export type AnswerlatticeReleaseEvidenceProvider = 'github_export' | 'manual';

export interface AnswerlatticeReleaseEvidenceHandoff {
    schemaVersion: 1;
    scopeKey: string;
    sourceJobId: string;
    sourceId: string;
    sourceTitle: string;
    provider: AnswerlatticeReleaseEvidenceProvider;
    title: string;
    contentText: string;
    versionLabel: string;
    releasedAt: string;
    entityIds: string[];
    originUrl?: string;
    preparedAt: string;
    expiresAt: string;
}

export type PrepareAnswerlatticeReleaseEvidenceHandoffInput = Omit<
    AnswerlatticeReleaseEvidenceHandoff,
    'schemaVersion' | 'preparedAt' | 'expiresAt'
>;

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const cleanSingleLine = (value: unknown, maxLength: number): string => (
    typeof value === 'string'
        ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength)
        : ''
);

const isValidScopeKey = (value: unknown): value is string => {
    if (typeof value !== 'string' || !/^[1-9]\d*:[1-9]\d*$/.test(value)) return false;
    const [tenantId, storeId] = value.split(':').map(Number);
    return Number.isSafeInteger(tenantId)
        && tenantId > 0
        && Number.isSafeInteger(storeId)
        && storeId > 0;
};

const normalizePublicUrl = (value: unknown): string | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string' || value.length > 500) return undefined;
    const normalized = normalizeAnswerlatticeKnowledgeIntakePublicUrl(value);
    return normalized && normalized.length <= 500 ? normalized : undefined;
};

const normalizeIsoDate = (value: unknown): string | null => {
    if (typeof value !== 'string' || value.length > 40) return null;
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) return null;
    return new Date(timestamp).toISOString();
};

const normalizeEntityIds = (value: unknown): string[] | null => {
    if (!Array.isArray(value) || value.length < 1 || value.length > ANSWERLATTICE_RELEASE_MAX_ENTITY_CHANGES) {
        return null;
    }
    const normalized = value.map(item => typeof item === 'string' ? item.trim() : '');
    if (normalized.some(item => !isValidFirestoreDocumentId(item))) return null;
    return new Set(normalized).size === normalized.length ? normalized : null;
};

const resolveSessionStorage = (storage?: BrowserStorage): BrowserStorage | null => {
    if (storage) return storage;
    if (typeof window === 'undefined') return null;
    try {
        return window.sessionStorage;
    } catch {
        return null;
    }
};

export function createAnswerlatticeReleaseEvidenceHandoff(
    input: PrepareAnswerlatticeReleaseEvidenceHandoffInput,
    nowMs = Date.now(),
): AnswerlatticeReleaseEvidenceHandoff | null {
    if (!Number.isSafeInteger(nowMs) || nowMs <= 0 || !isValidScopeKey(input.scopeKey)) return null;
    if (!isValidFirestoreDocumentId(input.sourceJobId) || !isValidFirestoreDocumentId(input.sourceId)) return null;
    if (!['github_export', 'manual'].includes(input.provider)) return null;

    const sourceTitle = cleanSingleLine(input.sourceTitle, 180);
    const title = cleanSingleLine(input.title, 180);
    const contentText = typeof input.contentText === 'string' ? input.contentText.trim() : '';
    const normalizedVersion = normalizeAnswerlatticeVersionLabel(input.versionLabel);
    const releasedAt = normalizeIsoDate(input.releasedAt);
    const entityIds = normalizeEntityIds(input.entityIds);
    const originUrl = normalizePublicUrl(input.originUrl);

    if (!sourceTitle || !title || !contentText || contentText.length > ANSWERLATTICE_RELEASE_EVIDENCE_MAX_TEXT_CHARS) return null;
    if (!normalizedVersion || !releasedAt || !entityIds) return null;
    if (input.originUrl && !originUrl) return null;

    return {
        schemaVersion: 1,
        scopeKey: input.scopeKey,
        sourceJobId: input.sourceJobId.trim(),
        sourceId: input.sourceId.trim(),
        sourceTitle,
        provider: input.provider,
        title,
        contentText,
        versionLabel: normalizedVersion.label,
        releasedAt,
        entityIds,
        ...(originUrl ? { originUrl } : {}),
        preparedAt: new Date(nowMs).toISOString(),
        expiresAt: new Date(nowMs + ANSWERLATTICE_RELEASE_EVIDENCE_HANDOFF_TTL_MS).toISOString(),
    };
}

const parseStoredHandoff = (value: unknown): AnswerlatticeReleaseEvidenceHandoff | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const candidate = value as Record<string, unknown>;
    if (candidate.schemaVersion !== 1 || !isValidScopeKey(candidate.scopeKey)) return null;
    if (!isValidFirestoreDocumentId(candidate.sourceJobId) || !isValidFirestoreDocumentId(candidate.sourceId)) return null;
    if (candidate.provider !== 'github_export' && candidate.provider !== 'manual') return null;

    const sourceTitle = cleanSingleLine(candidate.sourceTitle, 180);
    const title = cleanSingleLine(candidate.title, 180);
    const contentText = typeof candidate.contentText === 'string' ? candidate.contentText.trim() : '';
    const normalizedVersion = normalizeAnswerlatticeVersionLabel(candidate.versionLabel);
    const releasedAt = normalizeIsoDate(candidate.releasedAt);
    const preparedAt = normalizeIsoDate(candidate.preparedAt);
    const expiresAt = normalizeIsoDate(candidate.expiresAt);
    const entityIds = normalizeEntityIds(candidate.entityIds);
    const originUrl = normalizePublicUrl(candidate.originUrl);

    if (!sourceTitle || !title || !contentText || contentText.length > ANSWERLATTICE_RELEASE_EVIDENCE_MAX_TEXT_CHARS) return null;
    if (!normalizedVersion || candidate.versionLabel !== normalizedVersion.label) return null;
    if (!releasedAt || candidate.releasedAt !== releasedAt || !preparedAt || !expiresAt || !entityIds) return null;
    if (candidate.originUrl && !originUrl) return null;

    return {
        schemaVersion: 1,
        scopeKey: candidate.scopeKey,
        sourceJobId: candidate.sourceJobId.trim(),
        sourceId: candidate.sourceId.trim(),
        sourceTitle,
        provider: candidate.provider,
        title,
        contentText,
        versionLabel: normalizedVersion.label,
        releasedAt,
        entityIds,
        ...(originUrl ? { originUrl } : {}),
        preparedAt,
        expiresAt,
    };
};

export function storeAnswerlatticeReleaseEvidenceHandoff(
    input: PrepareAnswerlatticeReleaseEvidenceHandoffInput,
    storage?: BrowserStorage,
    nowMs = Date.now(),
): boolean {
    const handoff = createAnswerlatticeReleaseEvidenceHandoff(input, nowMs);
    const targetStorage = resolveSessionStorage(storage);
    if (!targetStorage) return false;
    try {
        targetStorage.removeItem(ANSWERLATTICE_RELEASE_EVIDENCE_HANDOFF_STORAGE_KEY);
        if (!handoff) return false;
        const serialized = JSON.stringify(handoff);
        if (serialized.length > ANSWERLATTICE_RELEASE_EVIDENCE_MAX_SERIALIZED_CHARS) return false;
        targetStorage.setItem(ANSWERLATTICE_RELEASE_EVIDENCE_HANDOFF_STORAGE_KEY, serialized);
        return true;
    } catch {
        return false;
    }
}

export function consumeAnswerlatticeReleaseEvidenceHandoff(
    expectedScopeKey: string,
    storage?: BrowserStorage,
    nowMs = Date.now(),
): AnswerlatticeReleaseEvidenceHandoff | null {
    const targetStorage = resolveSessionStorage(storage);
    if (!targetStorage || !isValidScopeKey(expectedScopeKey) || !Number.isSafeInteger(nowMs) || nowMs <= 0) return null;

    let serialized: string | null = null;
    try {
        serialized = targetStorage.getItem(ANSWERLATTICE_RELEASE_EVIDENCE_HANDOFF_STORAGE_KEY);
        targetStorage.removeItem(ANSWERLATTICE_RELEASE_EVIDENCE_HANDOFF_STORAGE_KEY);
    } catch {
        return null;
    }
    if (!serialized || serialized.length > ANSWERLATTICE_RELEASE_EVIDENCE_MAX_SERIALIZED_CHARS) return null;

    try {
        const handoff = parseStoredHandoff(JSON.parse(serialized));
        if (!handoff || handoff.scopeKey !== expectedScopeKey) return null;
        const preparedAtMs = Date.parse(handoff.preparedAt);
        const expiresAtMs = Date.parse(handoff.expiresAt);
        if (preparedAtMs > nowMs + 60_000 || expiresAtMs <= nowMs) return null;
        if (expiresAtMs - preparedAtMs !== ANSWERLATTICE_RELEASE_EVIDENCE_HANDOFF_TTL_MS) return null;
        return handoff;
    } catch {
        return null;
    }
}

export function buildAnswerlatticeReleaseEvidenceDocument(contentText: string): JSONContent {
    const boundedText = String(contentText || '').trim().slice(0, ANSWERLATTICE_RELEASE_EVIDENCE_MAX_TEXT_CHARS);
    const sourceParagraphs = boundedText
        .split(/\n+/g)
        .map(paragraph => paragraph.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
    const groupSize = Math.max(1, Math.ceil(sourceParagraphs.length / ANSWERLATTICE_RELEASE_EVIDENCE_MAX_PARAGRAPHS));
    const paragraphs = Array.from(
        { length: Math.ceil(sourceParagraphs.length / groupSize) },
        (_, index) => sourceParagraphs.slice(index * groupSize, (index + 1) * groupSize).join(' '),
    );

    return {
        type: 'doc',
        content: (paragraphs.length ? paragraphs : ['']).map(paragraph => ({
            type: 'paragraph',
            ...(paragraph ? { content: [{ type: 'text', text: paragraph }] } : {}),
        })),
    };
}
