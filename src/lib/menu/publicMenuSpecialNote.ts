import {
    getLocalizedText,
    getPrimaryLocalizedLanguage,
} from '@lib/localization/text';

const LEGACY_SPECIAL_NOTE_HELPERS = new Set([
    'shown on the official business page. use for service charges, today-only notes, or important customer information.',
]);

const normalizeNote = (value: string): string => value.trim().replace(/\s+/g, ' ');

const isLegacyHelperText = (value: string): boolean =>
    LEGACY_SPECIAL_NOTE_HELPERS.has(normalizeNote(value).toLowerCase());

const getLocalizedNote = (
    value: unknown,
    language: string,
    primaryLanguage: string,
): string => {
    const localized = getLocalizedText(
        value,
        language,
        getPrimaryLocalizedLanguage(value, primaryLanguage),
        '',
    );

    const normalized = normalizeNote(localized);
    return normalized && !isLegacyHelperText(normalized) ? normalized : '';
};

interface PublicMenuSpecialNoteInput {
    projectData?: unknown;
    storeDetails?: unknown;
    language: string;
    primaryLanguage: string;
}

const safeRead = (value: unknown, key: string): unknown => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

    try {
        return Reflect.get(value, key);
    } catch {
        return undefined;
    }
};

const safeReadPath = (value: unknown, path: readonly string[]): unknown => (
    path.reduce<unknown>((current, key) => safeRead(current, key), value)
);

/**
 * Resolves the note that belongs on the public menu footer.
 *
 * Priority:
 * 1. Menu-specific pricing/special note (`project.menuSettings.specialNote`).
 * 2. Legacy project-level note fields, for older DB records.
 * 3. Store-level public note fallback, so an owner-authored note saved on the
 *    public presence still appears on the customer menu instead of vanishing.
 */
export function getPublicMenuSpecialNote({
    projectData,
    storeDetails,
    language,
    primaryLanguage,
}: PublicMenuSpecialNoteInput): string {
    const noteSources = [
        safeReadPath(projectData, ['menuSettings', 'specialNote']),
        safeRead(projectData, 'specialNote'),
        safeReadPath(projectData, ['metadata', 'specialNote']),
        safeRead(projectData, 'pricingNote'),
        safeRead(projectData, 'serviceChargeNote'),
        safeReadPath(storeDetails, ['publicPresence', 'specialNote']),
    ];

    for (const source of noteSources) {
        const note = getLocalizedNote(source, language, primaryLanguage);
        if (note) return note;
    }

    return '';
}
