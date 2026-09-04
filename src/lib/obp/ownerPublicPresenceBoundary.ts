import {
    normalizeOBPExternalHttpsUrl,
    normalizeOBPGoogleMapsUrl,
    normalizeOBPReviewUrl,
} from './publicLinks';
import { toLocalizedText } from '../localization/text';
import { getStoreDeepDifference } from '../store/storeNestedUpdateProjection';

export type OwnerPublicPresenceLinkKey =
    | 'googleMapsUrl'
    | 'googleReviewUrl'
    | 'orderUrl'
    | 'reservationUrl';

type OwnerPublicPresenceLinkDraft = Partial<Record<OwnerPublicPresenceLinkKey, unknown>>;

type OwnerPublicPresenceDraft = OwnerPublicPresenceLinkDraft & {
    accentColor?: unknown;
};

const DEFAULT_TRUE_KEYS = new Set([
    'showCall',
    'showDirections',
    'showFeedback',
    'showGoogleReview',
    'showOrder',
    'showPrivacyLink',
    'showRefundLink',
    'showReservation',
    'showTermsLink',
    'showWhatsApp',
]);

const EMPTY_STRING_KEYS = new Set([
    'accentColor',
    'businessCover',
    'googleMapsUrl',
    'googleReviewUrl',
    'orderUrl',
    'pwaIconOverrideUrl',
    'reservationUrl',
    'whatsappNumber',
]);

const LOCALIZED_TEXT_KEYS = new Set([
    'descriptor',
    'knownFor',
    'specialNote',
]);

function normalizePublicPresenceEntry(key: string, value: unknown): unknown {
    if (value == null) return undefined;
    if (LOCALIZED_TEXT_KEYS.has(key)) return toLocalizedText(value, 'en');
    if (DEFAULT_TRUE_KEYS.has(key) && value === true) return undefined;
    if (key === 'iconVariant' && value === 'icons') return undefined;
    if (key === 'photos' && Array.isArray(value) && value.length === 0) return undefined;
    if (EMPTY_STRING_KEYS.has(key) && typeof value === 'string' && !value.trim()) return undefined;
    return value;
}

/**
 * Compares owner public truth by rendered meaning instead of draft shape.
 * The editor intentionally expands omitted defaults after the first input;
 * those defaults must not create a false publish state or a no-op write.
 */
export function hasOwnerPublicPresenceChanges(
    draftPresence: Record<string, unknown> | null | undefined,
    savedPresence: Record<string, unknown> | null | undefined,
): boolean {
    const normalize = (presence: Record<string, unknown> | null | undefined) => Object.fromEntries(
        Object.entries(presence || {})
            .map(([key, value]) => [key, normalizePublicPresenceEntry(key, value)] as const)
            .filter(([, value]) => value !== undefined),
    );
    const draft = normalize(draftPresence);
    const saved = normalize(savedPresence);

    return Object.keys(getStoreDeepDifference(draft, saved, { detectRemovedRootKeys: true })).length > 0;
}

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
