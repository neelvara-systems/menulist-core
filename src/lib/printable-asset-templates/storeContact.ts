import type { PrintableAssetRenderInput } from './types';

type PrintableStoreContactFields = Pick<
    PrintableAssetRenderInput,
    'contactAddress' | 'contactEmail' | 'contactName' | 'contactPhone' | 'contactRole' | 'socialHandle'
>;

const SOCIAL_KEYS = [
    'instagram',
    'facebook',
    'twitter',
    'x',
    'linkedin',
    'youtube',
    'website',
];

function cleanString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
}

function readOwnDataField(value: unknown, key: string): unknown {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    try {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return descriptor && 'value' in descriptor ? descriptor.value : undefined;
    } catch {
        return undefined;
    }
}

function normalizeSocialHandle(key: string, value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('@')) return trimmed;

    if (/^https?:\/\//i.test(trimmed)) {
        try {
            const url = new URL(trimmed);
            const host = url.hostname.replace(/^www\./i, '');
            const firstPathPart = url.pathname.split('/').filter(Boolean)[0];
            if (firstPathPart && /(instagram|facebook|twitter|x|linkedin|youtube)\./i.test(host)) {
                return `@${firstPathPart}`;
            }
            return host;
        } catch {
            return trimmed;
        }
    }

    if (['instagram', 'facebook', 'twitter', 'x', 'linkedin'].includes(key) && !trimmed.includes(' ')) {
        return `@${trimmed.replace(/^@/, '')}`;
    }

    return trimmed;
}

function buildSocialHandle(storeDetails: unknown): string | undefined {
    const socialMedia = readOwnDataField(storeDetails, 'socialMedia');
    if (!socialMedia || typeof socialMedia !== 'object') return undefined;

    for (const key of SOCIAL_KEYS) {
        const value = cleanString(readOwnDataField(socialMedia, key));
        if (value) return normalizeSocialHandle(key, value);
    }

    return undefined;
}

export function buildPrintableStoreContactFields(storeDetails: unknown): PrintableStoreContactFields {
    const addressParts = [
        cleanString(readOwnDataField(storeDetails, 'addressLine'))
            || cleanString(readOwnDataField(storeDetails, 'address')),
        readOwnDataField(storeDetails, 'city'),
        readOwnDataField(storeDetails, 'state'),
        readOwnDataField(storeDetails, 'country'),
    ].map(cleanString).filter(Boolean);

    return {
        contactAddress: addressParts.length ? addressParts.join(', ') : undefined,
        contactEmail: cleanString(readOwnDataField(storeDetails, 'email'))
            || cleanString(readOwnDataField(storeDetails, 'contactPersonEmail')),
        contactName: cleanString(readOwnDataField(storeDetails, 'contactPersonName')),
        contactPhone: cleanString(readOwnDataField(storeDetails, 'phoneNumber'))
            || cleanString(readOwnDataField(storeDetails, 'contactPersonNumber')),
        contactRole: cleanString(readOwnDataField(storeDetails, 'contactPersonRole'))
            || cleanString(readOwnDataField(storeDetails, 'designation'))
            || cleanString(readOwnDataField(storeDetails, 'jobTitle')),
        socialHandle: buildSocialHandle(storeDetails),
    };
}
