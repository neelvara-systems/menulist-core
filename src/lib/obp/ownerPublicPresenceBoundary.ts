import {
    normalizeOBPExternalHttpsUrl,
    normalizeOBPGoogleMapsUrl,
    normalizeOBPReviewUrl,
} from './publicLinks';

export type OwnerPublicPresenceLinkKey =
    | 'googleMapsUrl'
    | 'googleReviewUrl'
    | 'orderUrl'
    | 'reservationUrl';

type OwnerPublicPresenceLinkDraft = Partial<Record<OwnerPublicPresenceLinkKey, unknown>>;

type OwnerPublicPresenceDraft = OwnerPublicPresenceLinkDraft & {
    accentColor?: unknown;
};

const LINK_NORMALIZERS: Record<OwnerPublicPresenceLinkKey, (value: unknown) => string | null> = {
    googleMapsUrl: normalizeOBPGoogleMapsUrl,
    googleReviewUrl: normalizeOBPReviewUrl,
    orderUrl: normalizeOBPExternalHttpsUrl,
    reservationUrl: normalizeOBPExternalHttpsUrl,
};

/**
 * Applies the same allowlists used by the public OBP before owner link drafts
 * are persisted, so a successful save cannot silently produce a hidden link.
 */
export function normalizeOwnerPublicPresenceLinks<T extends OwnerPublicPresenceDraft>(
    presence: T,
): { invalidKeys: OwnerPublicPresenceLinkKey[]; presence: T } {
    const nextPresence = { ...presence } as T;
    const invalidKeys: OwnerPublicPresenceLinkKey[] = [];

    // An empty accent means "use the public default". Remove the nested key so
    // getStoreDeepDifference() emits the existing Firestore delete marker
    // instead of retaining a previously saved colour as hidden owner truth.
    if (
        Object.prototype.hasOwnProperty.call(nextPresence, 'accentColor')
        && (typeof nextPresence.accentColor !== 'string' || !nextPresence.accentColor.trim())
    ) {
        delete nextPresence.accentColor;
    }

    (Object.keys(LINK_NORMALIZERS) as OwnerPublicPresenceLinkKey[]).forEach((key) => {
        if (!(key in presence)) return;
        const rawValue = presence[key];
        const value = typeof rawValue === 'string' ? rawValue.trim() : '';
        if (!value) {
            nextPresence[key] = '' as T[OwnerPublicPresenceLinkKey];
            return;
        }

        const normalized = LINK_NORMALIZERS[key](value);
        if (!normalized) {
            invalidKeys.push(key);
            return;
        }
        nextPresence[key] = normalized as T[OwnerPublicPresenceLinkKey];
    });

    return { invalidKeys, presence: nextPresence };
}
