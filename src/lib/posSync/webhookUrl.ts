export interface PosSyncWebhookUrlValidationResult {
    valid: boolean;
    normalizedUrl?: string;
    error?: string;
}

const BLOCKED_HOSTNAMES = new Set([
    'localhost',
    'localhost.localdomain',
    '0.0.0.0',
]);

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

export function validatePosSyncWebhookUrl(value: string): PosSyncWebhookUrlValidationResult {
    const trimmed = value.trim();
    if (!trimmed) {
        return { valid: false, error: 'Enter a provider connection URL.' };
    }

    let url: URL;
    try {
        url = new URL(trimmed);
    } catch {
        return { valid: false, error: 'Enter a valid provider connection URL.' };
    }

    if (url.protocol !== 'https:') {
        return { valid: false, error: 'Provider connection URL must use HTTPS.' };
    }

    if (url.username || url.password) {
        return { valid: false, error: 'Provider connection URL cannot include a username or password.' };
    }

    if (url.hash) {
        return { valid: false, error: 'Provider connection URL cannot include a fragment.' };
    }

    const hostname = url.hostname.toLowerCase().replace(/^\[(.*)\]$/, '$1');
    if (isBlockedHostname(hostname) || isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) {
        return { valid: false, error: 'Provider connection URL must use a public HTTPS endpoint.' };
    }

    return { valid: true, normalizedUrl: url.toString() };
}

function isBlockedHostname(hostname: string): boolean {
    if (BLOCKED_HOSTNAMES.has(hostname)) return true;
    if (hostname.endsWith('.localhost')) return true;
    if (hostname.endsWith('.local')) return true;
    return false;
}

function isPrivateIpv4(hostname: string): boolean {
    const match = hostname.match(IPV4_PATTERN);
    if (!match) return false;

    const octets = match.slice(1).map(Number);
    if (octets.some((octet) => octet < 0 || octet > 255)) return true;

    const [first, second] = octets;
    if (first === 0) return true;
    if (first === 10) return true;
    if (first === 100 && second >= 64 && second <= 127) return true;
    if (first === 127) return true;
    if (first === 169 && second === 254) return true;
    if (first === 172 && second >= 16 && second <= 31) return true;
    if (first === 192 && second === 168) return true;
    if (first === 198 && (second === 18 || second === 19)) return true;
    if (first >= 224) return true;

    return false;
}

function isPrivateIpv6(hostname: string): boolean {
    const normalized = hostname.toLowerCase();
    if (!normalized.includes(':')) return false;
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    if (normalized.startsWith('fe80:')) return true;

    if (normalized.startsWith('::ffff:')) {
        return isPrivateIpv4(normalized.slice('::ffff:'.length));
    }

    return false;
}
