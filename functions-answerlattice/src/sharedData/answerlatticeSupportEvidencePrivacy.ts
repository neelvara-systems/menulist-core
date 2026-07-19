const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/g;
const WHITESPACE_PATTERN = /\s+/g;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BEARER_TOKEN_PATTERN = /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const PREFIXED_SECRET_PATTERN = /\b(?:sk|pk|rk|api)[-_](?:live|test)?[_-]?[A-Za-z0-9]{12,}\b/gi;
const LABELED_SECRET_PATTERN = /\b(api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret)\s*[:=]\s*["']?[^\s"',;]{6,}/gi;
const LABELED_PHONE_PATTERN = /\b(phone|mobile|tel(?:ephone)?)\s*[:=]\s*\+?[\d\s().-]{8,24}/gi;

export const redactAnswerlatticeSupportEvidenceText = (
    value: unknown,
    maxLength = 500,
): string => String(value || '')
    .replace(CONTROL_CHARACTER_PATTERN, ' ')
    .replace(EMAIL_PATTERN, '[redacted email]')
    .replace(BEARER_TOKEN_PATTERN, 'Bearer [redacted credential]')
    .replace(JWT_PATTERN, '[redacted credential]')
    .replace(PREFIXED_SECRET_PATTERN, '[redacted credential]')
    .replace(LABELED_SECRET_PATTERN, (_match, label: string) => `${label}=[redacted credential]`)
    .replace(LABELED_PHONE_PATTERN, (_match, label: string) => `${label}: [redacted phone]`)
    .replace(WHITESPACE_PATTERN, ' ')
    .trim()
    .slice(0, Math.max(0, maxLength));
