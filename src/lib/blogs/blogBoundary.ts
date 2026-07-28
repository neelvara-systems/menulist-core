import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export const BLOG_QUERY_MAX_RESULTS = 100;

export function normalizeBlogDocumentId(value: unknown): string {
    const raw = typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : '';
    const normalized = raw.trim();
    if (
        normalized !== raw
        || normalized.length > 160
        || !isValidFirestoreDocumentId(normalized)
    ) {
        throw new Error('blog_document_id_invalid');
    }
    return normalized;
}

export function normalizeBlogStoreId(value: unknown): string | number {
    if (typeof value === 'number') {
        if (Number.isSafeInteger(value) && value > 0) return value;
        throw new Error('blog_store_id_invalid');
    }
    if (
        typeof value === 'string'
        && value === value.trim()
        && value.length > 0
        && value.length <= 160
    ) {
        return value;
    }
    throw new Error('blog_store_id_invalid');
}

export function assertBlogQueryWithinLimit(size: number): void {
    if (
        !Number.isSafeInteger(size)
        || size < 0
        || size > BLOG_QUERY_MAX_RESULTS
    ) {
        throw new Error('blog_query_limit_exceeded');
    }
}

export function normalizeBlogImageUrl(value: unknown): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string' || value !== value.trim() || value.length > 4096) {
        throw new Error('blog_image_url_invalid');
    }
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
            throw new Error('blog_image_url_invalid');
        }
        return value;
    } catch {
        throw new Error('blog_image_url_invalid');
    }
}
