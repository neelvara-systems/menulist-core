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

const BLOCKED_HOSTNAME_SUFFIXES = [
    '.example',
    '.home',
    '.internal',
    '.invalid',
    '.lan',
    '.local',
    '.localhost',
    '.onion',
    '.test',
];

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

export function isBlockedHostname(hostname: string): boolean {
    if (BLOCKED_HOSTNAMES.has(hostname)) return true;
    return BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

export function isPrivateIpv4(hostname: string): boolean {
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
    if (first === 192 && second === 0 && octets[2] === 0) return true;
    if (first === 192 && second === 0 && octets[2] === 2) return true;
    if (first === 192 && second === 31 && octets[2] === 196) return true;
    if (first === 192 && second === 52 && octets[2] === 193) return true;
    if (first === 192 && second === 88 && octets[2] === 99) return true;
    if (first === 192 && second === 175 && octets[2] === 48) return true;
    if (first === 198 && (second === 18 || second === 19)) return true;
    if (first === 198 && second === 51 && octets[2] === 100) return true;
    if (first === 203 && second === 0 && octets[2] === 113) return true;
    if (first >= 224) return true;

    return false;
}

export function isPrivateIpv6(hostname: string): boolean {
    const normalized = hostname.toLowerCase();
    if (!normalized.includes(':')) return false;
    const segments = parseIpv6Segments(normalized);
    if (!segments) return true;
    if (segments.every((segment) => segment === 0)) return true;
    if (segments.slice(0, 7).every((segment) => segment === 0) && segments[7] === 1) return true;

    const first = segments[0];
    if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link local
    if ((first & 0xff00) === 0xff00) return true; // ff00::/8 multicast

    const firstSixZero = segments.slice(0, 6).every((segment) => segment === 0);
    const ipv4Mapped = segments.slice(0, 5).every((segment) => segment === 0) && segments[5] === 0xffff;
    if (firstSixZero || ipv4Mapped) return true; // IPv4-compatible/mapped addresses

    if (first === 0x2001 && segments[1] <= 0x01ff) return true; // IETF protocol/special assignments
    if (first === 0x2001 && segments[1] === 0x0db8) return true; // documentation
    if (first === 0x2002) return true; // 6to4
    if (first === 0x3fff && segments[1] <= 0x0fff) return true; // documentation
    if ((first & 0xe000) !== 0x2000) return true; // outside current global-unicast 2000::/3
    return false;
}

function parseIpv6Segments(value: string): number[] | null {
    let normalized = value.replace(/^\[(.*)\]$/, '$1');
    const zoneIndex = normalized.indexOf('%');
    if (zoneIndex >= 0) normalized = normalized.slice(0, zoneIndex);

    const ipv4Match = normalized.match(/(?:^|:)((?:\d{1,3}\.){3}\d{1,3})$/);
    if (ipv4Match) {
        const octets = ipv4Match[1].split('.').map(Number);
        if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return null;
        normalized = `${normalized.slice(0, normalized.length - ipv4Match[1].length)}${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`;
    }

    const halves = normalized.split('::');
    if (halves.length > 2) return null;
    const left = halves[0] ? halves[0].split(':') : [];
    const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
    if (halves.length === 1 && left.length !== 8) return null;
    const missing = 8 - left.length - right.length;
    if (missing < 0 || (halves.length === 2 && missing < 1)) return null;
    const rawSegments = halves.length === 2
        ? [...left, ...Array(missing).fill('0'), ...right]
        : left;
    if (rawSegments.length !== 8 || rawSegments.some((segment) => !/^[0-9a-f]{1,4}$/.test(segment))) {
        return null;
    }
    return rawSegments.map((segment) => Number.parseInt(segment, 16));
}

export function isBlockedPosSyncNetworkTarget(hostnameOrAddress: string): boolean {
    const normalized = hostnameOrAddress.toLowerCase().replace(/^\[(.*)\]$/, '$1');
    return isBlockedHostname(normalized) || isPrivateIpv4(normalized) || isPrivateIpv6(normalized);
}
