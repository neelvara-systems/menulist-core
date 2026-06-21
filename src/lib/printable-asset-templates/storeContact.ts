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

function buildSocialHandle(storeDetails: any): string | undefined {
    const socialMedia = storeDetails?.socialMedia;
    if (!socialMedia || typeof socialMedia !== 'object') return undefined;

    for (const key of SOCIAL_KEYS) {
        const value = cleanString((socialMedia as Record<string, unknown>)[key]);
        if (value) return normalizeSocialHandle(key, value);
    }

    return undefined;
}

export function buildPrintableStoreContactFields(storeDetails: any): PrintableStoreContactFields {
    const addressParts = [
        storeDetails?.addressLine || storeDetails?.address,
        storeDetails?.city,
        storeDetails?.state,
        storeDetails?.country,
    ].map(cleanString).filter(Boolean);

    return {
        contactAddress: addressParts.length ? addressParts.join(', ') : undefined,
        contactEmail: cleanString(storeDetails?.email) || cleanString(storeDetails?.contactPersonEmail),
        contactName: cleanString(storeDetails?.contactPersonName),
        contactPhone: cleanString(storeDetails?.phoneNumber) || cleanString(storeDetails?.contactPersonNumber),
        contactRole: cleanString(storeDetails?.contactPersonRole) || cleanString(storeDetails?.designation) || cleanString(storeDetails?.jobTitle),
        socialHandle: buildSocialHandle(storeDetails),
    };
}
