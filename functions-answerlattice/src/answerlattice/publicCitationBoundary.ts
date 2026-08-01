const MAX_PUBLIC_CITATIONS = 8;
const MAX_TITLE_LENGTH = 240;
const MAX_URL_LENGTH = 500;
const SENSITIVE_QUERY_KEY_SEGMENT_PATTERN = /(?:^|[_-])(auth|code|credential|key|secret|signature|sig|token)(?:$|[_-])/i;
const SENSITIVE_QUERY_KEY_COMPACT_PATTERN = /^(?:(?:access|api|auth|client|private|refresh|session|signed)(?:code|credential|credentials|key|secret|signature|sig|token)|code|credential|credentials|key|secret|signature|sig|token)$/i;
const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

const isSensitiveQueryKey = (value: string): boolean => {
    const segmented = value.replace(/([a-z0-9])([A-Z])/g, '$1_$2');
    return SENSITIVE_QUERY_KEY_SEGMENT_PATTERN.test(segmented)
        || SENSITIVE_QUERY_KEY_COMPACT_PATTERN.test(segmented.replace(/[^a-z0-9]/gi, ''));
};

const isBlockedHost = (hostname: string): boolean => {
    const normalized = hostname.toLowerCase().replace(/^\[(.*)\]$/, '$1');
    if (
        normalized === 'localhost'
        || normalized === 'localhost.localdomain'
        || normalized === 'metadata.google.internal'
        || normalized.endsWith('.localhost')
        || normalized.endsWith('.local')
        || normalized === '::1'
        || normalized === '::'
    ) return true;
    if (normalized.startsWith('::ffff:')) {
        const mappedAddress = normalized.slice('::ffff:'.length);
        const mappedHex = mappedAddress.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
        if (mappedHex) {
            const high = Number.parseInt(mappedHex[1], 16);
            const low = Number.parseInt(mappedHex[2], 16);
            return isBlockedHost([
                (high >>> 8) & 0xff,
                high & 0xff,
                (low >>> 8) & 0xff,
                low & 0xff,
            ].join('.'));
        }
        return isBlockedHost(mappedAddress);
    }
    if (normalized.includes(':')) {
        const firstHextet = normalized.split(':', 1)[0];
        if (!/^[0-9a-f]{1,4}$/i.test(firstHextet)) return true;
        const first = Number.parseInt(firstHextet, 16);
        if (
            (first & 0xfe00) === 0xfc00
            || (first & 0xffc0) === 0xfe80
            || (first & 0xffc0) === 0xfec0
            || (first & 0xff00) === 0xff00
            || normalized.startsWith('2001:db8:')
        ) return true;
    }

    const ipv4 = normalized.match(IPV4_PATTERN);
    if (!ipv4) return false;
    const octets = ipv4.slice(1).map(Number);
    if (octets.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return true;
    const [a, b, c] = octets;
    return a === 0
        || a === 10
        || a === 127
        || (a === 100 && b >= 64 && b <= 127)
        || (a === 169 && b === 254)
        || (a === 172 && b >= 16 && b <= 31)
        || (a === 192 && b === 0 && (c === 0 || c === 2))
        || (a === 192 && b === 168)
        || (a === 198 && (b === 18 || b === 19))
        || (a === 198 && b === 51 && c === 100)
        || (a === 203 && b === 0 && c === 113)
        || a >= 224;
};

const normalizeUrl = (value: unknown): string | null => {
    const rawUrl = typeof value === 'string' ? value.trim() : '';
    if (!rawUrl || rawUrl.length > MAX_URL_LENGTH) return null;
    try {
        const parsed = new URL(rawUrl);
        if (
            (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')
            || parsed.username
            || parsed.password
            || isBlockedHost(parsed.hostname)
            || Array.from(parsed.searchParams.keys()).some(isSensitiveQueryKey)
        ) return null;
        return parsed.toString();
    } catch {
        return null;
    }
};

export const normalizeAnswerlatticeFunctionPublicCitations = (value: unknown) => {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value.slice(0, MAX_PUBLIC_CITATIONS).flatMap((citation) => {
        if (!citation || typeof citation !== 'object' || Array.isArray(citation)) return [];
        const source = citation as Record<string, unknown>;
        const id = typeof source.id === 'string' ? source.id.trim() : '';
        const title = typeof source.title === 'string' ? source.title.trim() : '';
        const url = normalizeUrl(source.url);
        if (!id || id.length > 180 || !title || title.length > MAX_TITLE_LENGTH || !url || seen.has(url)) return [];
        seen.add(url);
        return [{ id, title, url }];
    });
};
