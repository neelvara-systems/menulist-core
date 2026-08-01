import { getBoundedHookStringContext, logHookFailure } from '@hook/hookDiagnostics';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

const STORAGE_PREFIX = 'recentlyViewed-v1:AL:';
const LEGACY_STORAGE_PREFIX = 'recentlyViewed:';
export const RECENTLY_VIEWED_EVENT = 'recentlyViewed:update';
const STORAGE_VERSION = 1;
const MAX_ENTRIES = 10;
const MAX_ID_LENGTH = 180;
const MAX_TITLE_LENGTH = 240;
const MAX_HREF_LENGTH = 500;
const MAX_META_STRING_LENGTH = 180;
const MAX_TAGS = 20;

export type RecentlyViewedType = 'article' | 'changelog' | 'faq' | 'workflow';

export type RecentlyViewedStorageScope = {
    tId: number;
    sId: number;
};

type ArticleRecentlyViewedMeta = {
    categoryTitle?: string;
    sectionTitle?: string;
};

type ChangelogRecentlyViewedMeta = {
    version?: string;
    tags?: string[];
    pageId?: string;
};

type RecentlyViewedEntryBase<TType extends RecentlyViewedType, TMeta> = {
    id: string;
    type: TType;
    title: string;
    href: string;
    viewedAt: string;
    meta?: TMeta;
};

export type RecentlyViewedEntry =
    | RecentlyViewedEntryBase<'article', ArticleRecentlyViewedMeta>
    | RecentlyViewedEntryBase<'changelog', ChangelogRecentlyViewedMeta>
    | RecentlyViewedEntryBase<'faq' | 'workflow', undefined>;

type RecentlyViewedStorageEnvelope = {
    version: 1;
    pId: 'AL';
    tId: number;
    sId: number;
    userId: string;
    entries: RecentlyViewedEntry[];
};

const isBrowser = typeof window !== 'undefined';

const hasExactKeys = (value: Record<string, unknown>, allowed: readonly string[]) => (
    Object.keys(value).every(key => allowed.includes(key))
);

const normalizeScope = (scope: RecentlyViewedStorageScope): RecentlyViewedStorageScope | null => (
    Number.isSafeInteger(scope?.tId) && scope.tId > 0
    && Number.isSafeInteger(scope?.sId) && scope.sId > 0
        ? { tId: scope.tId, sId: scope.sId }
        : null
);

const normalizeDocumentId = (value: unknown): string | null => {
    const id = typeof value === 'string' ? value.trim() : '';
    return id
        && id.length <= MAX_ID_LENGTH
        && isValidFirestoreDocumentId(id)
        ? id
        : null;
};

const normalizeBoundedString = (value: unknown, maxLength: number): string | null => {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized && normalized.length <= maxLength ? normalized : null;
};

const normalizeOptionalBoundedString = (value: unknown): string | undefined | null => {
    if (value === undefined) return undefined;
    return normalizeBoundedString(value, MAX_META_STRING_LENGTH);
};

const normalizeTimestamp = (value: unknown): string | null => {
    if (typeof value !== 'string' || value.length > 40) return null;
    const timestamp = new Date(value);
    return Number.isFinite(timestamp.getTime()) && timestamp.toISOString() === value ? value : null;
};

const normalizeHref = (value: unknown): string | null => {
    if (typeof value !== 'string' || value.length === 0 || value.length > MAX_HREF_LENGTH) return null;
    if (!value.startsWith('/help-center') || value.startsWith('//') || /[\u0000-\u001f\u007f]/.test(value)) return null;

    try {
        const parsed = new URL(value, 'https://answerlattice.local');
        if (parsed.origin !== 'https://answerlattice.local') return null;
        if (parsed.pathname !== '/help-center' && !parsed.pathname.startsWith('/help-center/')) return null;
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        return null;
    }
};

const normalizeArticleMeta = (value: unknown): ArticleRecentlyViewedMeta | undefined | null => {
    if (value === undefined) return undefined;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const raw = value as Record<string, unknown>;
    if (!hasExactKeys(raw, ['categoryTitle', 'sectionTitle'])) return null;
    const categoryTitle = normalizeOptionalBoundedString(raw.categoryTitle);
    const sectionTitle = normalizeOptionalBoundedString(raw.sectionTitle);
    if (categoryTitle === null || sectionTitle === null) return null;
    return {
        ...(categoryTitle ? { categoryTitle } : {}),
        ...(sectionTitle ? { sectionTitle } : {}),
    };
};

const normalizeChangelogMeta = (value: unknown): ChangelogRecentlyViewedMeta | undefined | null => {
    if (value === undefined) return undefined;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const raw = value as Record<string, unknown>;
    if (!hasExactKeys(raw, ['version', 'tags', 'pageId'])) return null;
    const version = normalizeOptionalBoundedString(raw.version);
    const pageId = raw.pageId === undefined ? undefined : normalizeDocumentId(raw.pageId);
    if (version === null || pageId === null) return null;
    let tags: string[] | undefined;
    if (raw.tags !== undefined) {
        if (!Array.isArray(raw.tags) || raw.tags.length > MAX_TAGS) return null;
        const normalizedTags = raw.tags.map(tag => normalizeBoundedString(tag, MAX_META_STRING_LENGTH));
        if (normalizedTags.some(tag => tag === null)) return null;
        tags = normalizedTags.filter((tag): tag is string => tag !== null);
    }
    return {
        ...(version ? { version } : {}),
        ...(tags ? { tags } : {}),
        ...(pageId ? { pageId } : {}),
    };
};

const normalizeEntry = (value: unknown): RecentlyViewedEntry | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const raw = value as Record<string, unknown>;
    if (!hasExactKeys(raw, ['id', 'type', 'title', 'href', 'viewedAt', 'meta'])) return null;
    const id = normalizeDocumentId(raw.id);
    const title = normalizeBoundedString(raw.title, MAX_TITLE_LENGTH);
    const href = normalizeHref(raw.href);
    const viewedAt = normalizeTimestamp(raw.viewedAt);
    if (!id || !title || !href || !viewedAt) return null;

    if (raw.type === 'article') {
        const meta = normalizeArticleMeta(raw.meta);
        return meta === null ? null : { id, type: 'article', title, href, viewedAt, ...(meta ? { meta } : {}) };
    }
    if (raw.type === 'changelog') {
        const meta = normalizeChangelogMeta(raw.meta);
        return meta === null ? null : { id, type: 'changelog', title, href, viewedAt, ...(meta ? { meta } : {}) };
    }
    if ((raw.type === 'faq' || raw.type === 'workflow') && raw.meta === undefined) {
        return { id, type: raw.type, title, href, viewedAt };
    }
    return null;
};

export const getRecentlyViewedStorageKey = (
    scope: RecentlyViewedStorageScope,
    userId: string,
) => `${STORAGE_PREFIX}${scope.tId}:${scope.sId}:${encodeURIComponent(userId)}`;

export const normalizeRecentlyViewedEnvelope = (
    value: unknown,
    scope: RecentlyViewedStorageScope,
    userId: string,
): RecentlyViewedStorageEnvelope | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const envelope = value as Record<string, unknown>;
    if (!hasExactKeys(envelope, ['version', 'pId', 'tId', 'sId', 'userId', 'entries'])
        || envelope.version !== STORAGE_VERSION
        || envelope.pId !== 'AL'
        || envelope.tId !== scope.tId
        || envelope.sId !== scope.sId
        || envelope.userId !== userId
        || !Array.isArray(envelope.entries)
        || envelope.entries.length > MAX_ENTRIES) {
        return null;
    }
    const entries = envelope.entries.map(normalizeEntry);
    if (entries.some(entry => entry === null)) return null;
    return {
        version: STORAGE_VERSION,
        pId: 'AL',
        tId: scope.tId,
        sId: scope.sId,
        userId,
        entries: entries as RecentlyViewedEntry[],
    };
};

const normalizeStorageContext = (scope: RecentlyViewedStorageScope, userId: unknown) => {
    const normalizedScope = normalizeScope(scope);
    const normalizedUserId = normalizeDocumentId(userId);
    return normalizedScope && normalizedUserId
        ? { scope: normalizedScope, userId: normalizedUserId }
        : null;
};

const evictStoredValue = (key: string, userId: string, operation: string) => {
    try {
        window.localStorage.removeItem(key);
    } catch (error) {
        logHookFailure('recently_viewed_read_failed', error, {
            ...getBoundedHookStringContext('userId', userId),
            operation,
        });
    }
};

const evictLegacyEntries = (userId: string) => {
    evictStoredValue(`${LEGACY_STORAGE_PREFIX}${userId}`, userId, 'legacy_cache_eviction');
};

const writeEntries = (
    scope: RecentlyViewedStorageScope,
    userId: string,
    entries: RecentlyViewedEntry[],
) => {
    if (!isBrowser) return;
    const key = getRecentlyViewedStorageKey(scope, userId);
    const envelope: RecentlyViewedStorageEnvelope = {
        version: STORAGE_VERSION,
        pId: 'AL',
        tId: scope.tId,
        sId: scope.sId,
        userId,
        entries: entries.slice(0, MAX_ENTRIES),
    };
    try {
        window.localStorage.setItem(key, JSON.stringify(envelope));
        window.dispatchEvent(new CustomEvent(RECENTLY_VIEWED_EVENT, { detail: { storageKey: key } }));
    } catch (error) {
        logHookFailure('recently_viewed_write_failed', error, {
            ...getBoundedHookStringContext('userId', userId),
            entryCount: entries.length,
        });
    }
};

export const getRecentlyViewedEntries = (
    scope: RecentlyViewedStorageScope,
    userId: string,
): RecentlyViewedEntry[] => {
    if (!isBrowser) return [];
    const context = normalizeStorageContext(scope, userId);
    if (!context) return [];
    const key = getRecentlyViewedStorageKey(context.scope, context.userId);
    evictLegacyEntries(context.userId);
    let raw: string | null;
    try {
        raw = window.localStorage.getItem(key);
    } catch (error) {
        logHookFailure('recently_viewed_read_failed', error, {
            ...getBoundedHookStringContext('userId', context.userId),
        });
        return [];
    }
    if (!raw) return [];

    try {
        const envelope = normalizeRecentlyViewedEnvelope(JSON.parse(raw) as unknown, context.scope, context.userId);
        if (envelope) return envelope.entries;
        evictStoredValue(key, context.userId, 'invalid_cache_eviction');
    } catch (error) {
        evictStoredValue(key, context.userId, 'invalid_cache_eviction');
        logHookFailure('recently_viewed_parse_failed', error, {
            ...getBoundedHookStringContext('userId', context.userId),
            storedValueLength: raw.length,
        });
    }
    return [];
};

export const addRecentlyViewedEntry = (
    scope: RecentlyViewedStorageScope,
    userId: string,
    entry: RecentlyViewedEntry,
) => {
    if (!isBrowser) return;
    const context = normalizeStorageContext(scope, userId);
    const normalizedEntry = normalizeEntry(entry);
    if (!context || !normalizedEntry) return;
    const existing = getRecentlyViewedEntries(context.scope, context.userId);
    const filtered = existing.filter(item => !(item.id === normalizedEntry.id && item.type === normalizedEntry.type));
    writeEntries(context.scope, context.userId, [normalizedEntry, ...filtered].slice(0, MAX_ENTRIES));
};

export const clearRecentlyViewedEntries = (
    scope: RecentlyViewedStorageScope,
    userId: string,
) => {
    if (!isBrowser) return;
    const context = normalizeStorageContext(scope, userId);
    if (!context) return;
    try {
        const key = getRecentlyViewedStorageKey(context.scope, context.userId);
        window.localStorage.removeItem(key);
        evictLegacyEntries(context.userId);
        window.dispatchEvent(new CustomEvent(RECENTLY_VIEWED_EVENT, { detail: { storageKey: key } }));
    } catch (error) {
        logHookFailure('recently_viewed_clear_failed', error, {
            ...getBoundedHookStringContext('userId', context.userId),
        });
    }
};
