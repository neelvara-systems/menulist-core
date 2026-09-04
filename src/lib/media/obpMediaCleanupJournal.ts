import { filterUnreferencedObpMediaUrls } from './obpMediaReferences';

const OBP_MEDIA_CLEANUP_JOURNAL_PREFIX = 'menulist:obp-media-cleanup:v1';
const MAX_JOURNAL_ENTRIES = 48;
const MAX_URL_LENGTH = 2048;

export interface ObpMediaCleanupJournalScope {
    storeId: string | number;
    tenantId: string | number;
}

export interface ObpMediaCleanupJournalStorage {
    getItem(key: string): string | null;
    removeItem(key: string): void;
    setItem(key: string, value: string): void;
}

function normalizeScopeId(value: string | number): string | null {
    const normalized = String(value).trim();
    return /^[A-Za-z0-9_-]{1,128}$/.test(normalized) ? normalized : null;
}

export function getObpMediaCleanupJournalKey(scope: ObpMediaCleanupJournalScope): string | null {
    const tenantId = normalizeScopeId(scope.tenantId);
    const storeId = normalizeScopeId(scope.storeId);
    if (!tenantId || !storeId) return null;
    return `${OBP_MEDIA_CLEANUP_JOURNAL_PREFIX}:${tenantId}:${storeId}`;
}

function normalizeJournalCandidates(value: unknown): string[] {
    return filterUnreferencedObpMediaUrls(value, [])
        .filter((candidate) => candidate.length <= MAX_URL_LENGTH)
        .slice(0, MAX_JOURNAL_ENTRIES);
}

export function readObpMediaCleanupJournal(
    storage: ObpMediaCleanupJournalStorage | null | undefined,
    scope: ObpMediaCleanupJournalScope,
): string[] {
    const key = getObpMediaCleanupJournalKey(scope);
    if (!storage || !key) return [];

    try {
        const serialized = storage.getItem(key);
        if (!serialized) return [];
        return normalizeJournalCandidates(JSON.parse(serialized));
    } catch {
        return [];
    }
}

export function writeObpMediaCleanupJournal(
    storage: ObpMediaCleanupJournalStorage | null | undefined,
    scope: ObpMediaCleanupJournalScope,
    candidates: unknown,
): void {
    const key = getObpMediaCleanupJournalKey(scope);
    if (!storage || !key) return;

    try {
        const normalized = normalizeJournalCandidates(candidates);
        if (normalized.length === 0) {
            storage.removeItem(key);
            return;
        }
        storage.setItem(key, JSON.stringify(normalized));
    } catch {
        // Cleanup remains best effort when browser storage is unavailable.
    }
}

export function enqueueObpMediaCleanupJournal(
    storage: ObpMediaCleanupJournalStorage | null | undefined,
    scope: ObpMediaCleanupJournalScope,
    candidates: unknown,
): string[] {
    const next = normalizeJournalCandidates([
        ...readObpMediaCleanupJournal(storage, scope),
        ...(Array.isArray(candidates) ? candidates : [candidates]),
    ]);
    writeObpMediaCleanupJournal(storage, scope, next);
    return next;
}
