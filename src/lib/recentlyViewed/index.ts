import { Timestamp } from 'firebase/firestore';
import { getBoundedHookStringContext, logHookFailure } from '@hook/hookDiagnostics';

const STORAGE_PREFIX = 'recentlyViewed:';
export const RECENTLY_VIEWED_EVENT = 'recentlyViewed:update';
const MAX_ENTRIES = 10;

export type RecentlyViewedType = 'article' | 'changelog' | 'faq' | 'workflow';

export interface RecentlyViewedEntry {
    id: string;
    type: RecentlyViewedType;
    title: string;
    href: string;
    viewedAt: string; // ISO string for localStorage compatibility
    meta?: Record<string, any> | null;
}

/**
 * Recursively converts Firestore Timestamps to ISO strings for localStorage serialization
 */
const serializeTimestamps = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    
    // Check if it's a Firestore Timestamp
    if (obj instanceof Timestamp) {
        return obj.toDate().toISOString();
    }
    
    // Check if it's a plain object with seconds and nanoseconds (already serialized Timestamp)
    if (typeof obj === 'object' && 'seconds' in obj && 'nanoseconds' in obj) {
        return new Date(obj.seconds * 1000).toISOString();
    }
    
    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map(item => serializeTimestamps(item));
    }
    
    // Handle objects
    if (typeof obj === 'object') {
        const serialized: any = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                serialized[key] = serializeTimestamps(obj[key]);
            }
        }
        return serialized;
    }
    
    return obj;
};

const isBrowser = typeof window !== 'undefined';

const getStorageKey = (userId: string) => `${STORAGE_PREFIX}${userId}`;

const safeParse = (value: string | null, userId?: string): RecentlyViewedEntry[] => {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
            return parsed.filter((item): item is RecentlyViewedEntry =>
                item && typeof item.id === 'string' && typeof item.type === 'string' && typeof item.title === 'string' && typeof item.viewedAt === 'string'
            );
        }
    } catch (error) {
        logHookFailure('recently_viewed_parse_failed', error, {
            ...getBoundedHookStringContext('userId', userId),
            storedValueLength: value.length,
        });
    }
    return [];
};

const writeEntries = (key: string, entries: RecentlyViewedEntry[], userId: string) => {
    if (!isBrowser) return;
    try {
        window.localStorage.setItem(key, JSON.stringify(entries));
        window.dispatchEvent(new CustomEvent(RECENTLY_VIEWED_EVENT, { detail: { storageKey: key } }));
    } catch (error) {
        logHookFailure('recently_viewed_write_failed', error, {
            ...getBoundedHookStringContext('userId', userId),
            entryCount: entries.length,
        });
    }
};

export const getRecentlyViewedEntries = (userId: string): RecentlyViewedEntry[] => {
    if (!isBrowser) return [];
    try {
        const key = getStorageKey(userId);
        const raw = window.localStorage.getItem(key);
        return safeParse(raw, userId);
    } catch (error) {
        logHookFailure('recently_viewed_read_failed', error, {
            ...getBoundedHookStringContext('userId', userId),
        });
        return [];
    }
};

export const addRecentlyViewedEntry = (userId: string, entry: RecentlyViewedEntry) => {
    if (!isBrowser) return;
    const key = getStorageKey(userId);
    
    // Serialize all Timestamps to ISO strings before storing
    const serializedEntry = serializeTimestamps(entry);
    
    const existing = getRecentlyViewedEntries(userId);
    const filtered = existing.filter(item => !(item.id === entry.id && item.type === entry.type));
    const updated = [serializedEntry, ...filtered].slice(0, MAX_ENTRIES);
    writeEntries(key, updated, userId);
};

export const clearRecentlyViewedEntries = (userId: string) => {
    if (!isBrowser) return;
    try {
        const key = getStorageKey(userId);
        window.localStorage.removeItem(key);
        window.dispatchEvent(new CustomEvent(RECENTLY_VIEWED_EVENT, { detail: { storageKey: key } }));
    } catch (error) {
        logHookFailure('recently_viewed_clear_failed', error, {
            ...getBoundedHookStringContext('userId', userId),
        });
    }
};
