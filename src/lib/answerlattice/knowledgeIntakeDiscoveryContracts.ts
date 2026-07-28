import { getAnswerlatticeKnowledgeIntakeTimestampMillis } from './knowledgeIntakeContracts';
import { normalizeAnswerlatticePublicCitationUrl } from './publicAnswerContracts';

export function normalizeAnswerlatticeKnowledgeIntakePublicUrl(value: unknown): string | null {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
        const url = new URL(value.trim());
        if (!['http:', 'https:'].includes(url.protocol)) return null;
        url.hash = '';
        Array.from(url.searchParams.keys()).forEach((key) => {
            if (/^(utm_|fbclid$|gclid$|msclkid$|yclid$)/i.test(key)) {
                url.searchParams.delete(key);
            }
        });
        url.searchParams.sort();
        return normalizeAnswerlatticePublicCitationUrl(url.toString());
    } catch {
        return null;
    }
}

export function resolveAnswerlatticeKnowledgeIntakeDiscoveredUrl(
    candidate: unknown,
    pageUrl: unknown,
    allowedOrigin: unknown,
): string | null {
    if (
        typeof candidate !== 'string'
        || typeof pageUrl !== 'string'
        || typeof allowedOrigin !== 'string'
    ) return null;
    try {
        const url = new URL(candidate, pageUrl);
        if (url.origin !== allowedOrigin) return null;
        return normalizeAnswerlatticeKnowledgeIntakePublicUrl(url.toString());
    } catch {
        return null;
    }
}

export function serializeAnswerlatticeKnowledgeIntakeValue(
    value: unknown,
    seen: WeakSet<object> = new WeakSet(),
): unknown {
    if (value === null || value === undefined) return value;
    if (
        typeof value === 'string'
        || typeof value === 'number'
        || typeof value === 'boolean'
    ) return value;
    if (typeof value !== 'object') return null;
    if (seen.has(value)) return null;

    seen.add(value);
    try {
        const toDate = Reflect.get(value, 'toDate');
        const toMillis = Reflect.get(value, 'toMillis');
        if (typeof toDate === 'function' || typeof toMillis === 'function') {
            const millis = getAnswerlatticeKnowledgeIntakeTimestampMillis(value);
            return millis === null ? null : new Date(millis).toISOString();
        }
        if (Array.isArray(value)) {
            return value.map(item => serializeAnswerlatticeKnowledgeIntakeValue(item, seen));
        }
        return Object.fromEntries(
            Object.entries(value).map(([key, nestedValue]) => [
                key,
                serializeAnswerlatticeKnowledgeIntakeValue(nestedValue, seen),
            ]),
        );
    } catch {
        return null;
    } finally {
        seen.delete(value);
    }
}
