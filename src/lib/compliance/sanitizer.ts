/**
 * Compliance Pages — Content Sanitizer
 *
 * Strips HTML, scripts, links from custom compliance text overrides.
 *
 * @see __docs__/compliance-pages/compliance-pages_impl.md §7
 */

const MAX_LENGTH = 15000;
const MIN_LENGTH = 100;

/**
 * Sanitize user-provided compliance page content.
 * Returns cleaned plain text or null if invalid.
 */
export function sanitizeComplianceContent(raw: string): string | null {
    if (!raw || typeof raw !== 'string') return null;

    let text = raw;

    // Strip HTML tags
    text = text.replace(/<[^>]*>/g, '');

    // Strip script content
    text = text.replace(/<script[\s\S]*?<\/script>/gi, '');

    // Strip event handlers
    text = text.replace(/on\w+="[^"]*"/gi, '');

    // Strip URLs (convert to plain text domain)
    text = text.replace(/https?:\/\/[^\s)]+/g, (url) => {
        try {
            return new URL(url).hostname;
        } catch {
            return '';
        }
    });

    // Normalize whitespace — collapse multiple spaces/newlines
    text = text.replace(/[ \t]+/g, ' ');
    text = text.replace(/\n{3,}/g, '\n\n');

    // Trim
    text = text.trim();

    // Enforce length constraints
    if (text.length < MIN_LENGTH) return null;
    if (text.length > MAX_LENGTH) {
        text = text.slice(0, MAX_LENGTH);
    }

    return text;
}
