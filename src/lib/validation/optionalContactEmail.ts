const CONTACT_EMAIL_MAX_LENGTH = 254;
const CONTACT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeOptionalContactEmail(value: string): string {
    return value.trim();
}

export function isValidOptionalContactEmail(value: string): boolean {
    const normalized = normalizeOptionalContactEmail(value);
    return !normalized || (
        normalized.length <= CONTACT_EMAIL_MAX_LENGTH
        && CONTACT_EMAIL_PATTERN.test(normalized)
    );
}
