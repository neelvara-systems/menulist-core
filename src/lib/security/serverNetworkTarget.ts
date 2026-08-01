import { lookup } from 'dns/promises';
import { getBoundedErrorName } from '@lib/monitoring/boundedLogContext';

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const BLOCKED_HOSTNAMES = new Set([
    'localhost',
    'localhost.localdomain',
    'metadata.google.internal',
]);

export interface ServerNetworkTargetValidationResult {
    addressCount: number;
    error?: string;
    errorName?: string;
    normalizedUrl?: string;
    valid: boolean;
}

export interface ServerNetworkTargetValidationOptions {
    allowLocalhostInDevelopment?: boolean;
    allowedProtocols?: string[];
}

function normalizeHostname(hostnameOrAddress: string): string {
    return hostnameOrAddress.toLowerCase().replace(/^\[(.*)\]$/, '$1');
}

function isDevelopmentRuntime(): boolean {
    return process.env.NODE_ENV !== 'production';
}

export function isBlockedServerNetworkHostname(hostname: string): boolean {
    const normalized = normalizeHostname(hostname);
    if (BLOCKED_HOSTNAMES.has(normalized)) return true;
    if (normalized.endsWith('.localhost')) return true;
    if (normalized.endsWith('.local')) return true;
    return false;
}

export function isPrivateServerIpv4Address(value: string): boolean {
    const match = normalizeHostname(value).match(IPV4_PATTERN);
    if (!match) return false;

    const octets = match.slice(1).map(Number);
    if (octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;

    const [a, b] = octets;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 192 && b === 0 && octets[2] === 0) return true;
    if (a === 192 && b === 0 && octets[2] === 2) return true;
    if (a === 192 && b === 31 && octets[2] === 196) return true;
    if (a === 192 && b === 52 && octets[2] === 193) return true;
    if (a === 192 && b === 88 && octets[2] === 99) return true;
    if (a === 192 && b === 175 && octets[2] === 48) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a === 198 && b === 51 && octets[2] === 100) return true;
    if (a === 203 && b === 0 && octets[2] === 113) return true;
    if (a >= 224) return true;

    return false;
}

export function isPrivateServerIpv6Address(value: string): boolean {
    const normalized = normalizeHostname(value);
    if (!normalized.includes(':')) return false;
    const segments = parseServerIpv6Segments(normalized);
    if (!segments) return true;
    if (segments.every((segment) => segment === 0)) return true;
    if (segments.slice(0, 7).every((segment) => segment === 0) && segments[7] === 1) return true;

    const first = segments[0];
    if ((first & 0xfe00) === 0xfc00) return true;
    if ((first & 0xffc0) === 0xfe80) return true;
    if ((first & 0xff00) === 0xff00) return true;

    const firstSixZero = segments.slice(0, 6).every((segment) => segment === 0);
    const ipv4Mapped = segments.slice(0, 5).every((segment) => segment === 0)
        && segments[5] === 0xffff;
    if (firstSixZero || ipv4Mapped) return true;
    if (first === 0x2001 && segments[1] <= 0x01ff) return true;
    if (first === 0x2001 && segments[1] === 0x0db8) return true;
    if (first === 0x2002) return true;
    if (first === 0x3fff && segments[1] <= 0x0fff) return true;
    if ((first & 0xe000) !== 0x2000) return true;
    return false;
}

function parseServerIpv6Segments(value: string): number[] | null {
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

export function isBlockedServerNetworkTarget(hostnameOrAddress: string): boolean {
    const normalized = normalizeHostname(hostnameOrAddress);
    return isBlockedServerNetworkHostname(normalized) ||
        isPrivateServerIpv4Address(normalized) ||
        isPrivateServerIpv6Address(normalized);
}

function isAllowedLocalhostForCurrentRuntime(
    hostname: string,
    options: ServerNetworkTargetValidationOptions,
): boolean {
    if (!options.allowLocalhostInDevelopment || !isDevelopmentRuntime()) return false;
    const normalized = normalizeHostname(hostname);
    return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}

export async function validateServerNetworkTargetUrl(
    rawUrl: string,
    options: ServerNetworkTargetValidationOptions = {},
): Promise<ServerNetworkTargetValidationResult> {
    const allowedProtocols = options.allowedProtocols || ['https:'];

    let parsed: URL;
    try {
        parsed = new URL(rawUrl);
    } catch (error) {
        return {
            valid: false,
            addressCount: 0,
            error: 'invalid_url',
            errorName: getBoundedErrorName(error) || typeof error,
        };
    }

    if (!allowedProtocols.includes(parsed.protocol)) {
        return { valid: false, addressCount: 0, error: 'invalid_protocol' };
    }

    if (parsed.username || parsed.password) {
        return { valid: false, addressCount: 0, error: 'credentials_not_allowed' };
    }

    const hostname = normalizeHostname(parsed.hostname);
    if (isAllowedLocalhostForCurrentRuntime(hostname, options)) {
        return { valid: true, addressCount: 0, normalizedUrl: parsed.toString() };
    }

    if (isBlockedServerNetworkTarget(hostname)) {
        return { valid: false, addressCount: 0, error: 'blocked_hostname' };
    }

    try {
        const addresses = await lookup(hostname, { all: true, verbatim: true });
        if (addresses.length === 0) {
            return { valid: false, addressCount: 0, error: 'dns_no_addresses' };
        }

        const hasBlockedAddress = addresses.some((address) => isBlockedServerNetworkTarget(address.address));
        return {
            valid: !hasBlockedAddress,
            addressCount: addresses.length,
            normalizedUrl: parsed.toString(),
            ...(hasBlockedAddress ? { error: 'blocked_resolved_address' } : {}),
        };
    } catch (error) {
        return {
            valid: false,
            addressCount: 0,
            error: 'dns_lookup_failed',
            errorName: getBoundedErrorName(error) || typeof error,
        };
    }
}
