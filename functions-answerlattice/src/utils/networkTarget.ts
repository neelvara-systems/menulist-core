import { lookup } from 'dns/promises';
import { getBoundedFunctionsErrorName } from './boundedErrorContext';

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const BLOCKED_HOSTNAMES = new Set([
    'localhost',
    'localhost.localdomain',
    'metadata.google.internal',
]);

export interface NetworkTargetValidationResult {
    addressCount: number;
    error?: string;
    errorName?: string;
    normalizedUrl?: string;
    valid: boolean;
}

export interface NetworkTargetValidationOptions {
    allowLocalhostInEmulator?: boolean;
    allowedProtocols?: string[];
}

function isFunctionsEmulator(): boolean {
    return process.env.FUNCTIONS_EMULATOR === 'true';
}

function normalizeHostname(hostnameOrAddress: string): string {
    return hostnameOrAddress.toLowerCase().replace(/^\[(.*)\]$/, '$1');
}

export function isBlockedNetworkHostname(hostname: string): boolean {
    const normalized = normalizeHostname(hostname);
    if (BLOCKED_HOSTNAMES.has(normalized)) return true;
    if (normalized.endsWith('.localhost')) return true;
    if (normalized.endsWith('.local')) return true;
    return false;
}

export function isPrivateIpv4Address(value: string): boolean {
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
    if (a >= 224) return true;

    return false;
}

export function isPrivateIpv6Address(value: string): boolean {
    const normalized = normalizeHostname(value);
    if (!normalized.includes(':')) return false;
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    if (normalized.startsWith('fe80:')) return true;

    if (normalized.startsWith('::ffff:')) {
        return isPrivateIpv4Address(normalized.slice('::ffff:'.length));
    }

    return false;
}

export function isBlockedNetworkTarget(hostnameOrAddress: string): boolean {
    const normalized = normalizeHostname(hostnameOrAddress);
    return isBlockedNetworkHostname(normalized) ||
        isPrivateIpv4Address(normalized) ||
        isPrivateIpv6Address(normalized);
}

function isAllowedLocalhostForCurrentRuntime(hostname: string, options: NetworkTargetValidationOptions): boolean {
    if (!options.allowLocalhostInEmulator || !isFunctionsEmulator()) return false;
    const normalized = normalizeHostname(hostname);
    return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}

export async function validateNetworkTargetUrl(
    rawUrl: string,
    options: NetworkTargetValidationOptions = {},
): Promise<NetworkTargetValidationResult> {
    const allowedProtocols = options.allowedProtocols || ['https:'];

    let parsed: URL;
    try {
        parsed = new URL(rawUrl);
    } catch (error) {
        return {
            valid: false,
            addressCount: 0,
            error: 'invalid_url',
            errorName: getBoundedFunctionsErrorName(error) || typeof error,
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

    if (isBlockedNetworkTarget(hostname)) {
        return { valid: false, addressCount: 0, error: 'blocked_hostname' };
    }

    try {
        const addresses = await lookup(hostname, { all: true, verbatim: true });
        if (addresses.length === 0) {
            return { valid: false, addressCount: 0, error: 'dns_no_addresses' };
        }

        const hasBlockedAddress = addresses.some((address) => isBlockedNetworkTarget(address.address));
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
            errorName: getBoundedFunctionsErrorName(error) || typeof error,
        };
    }
}
