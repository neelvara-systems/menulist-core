import crypto from 'crypto';
import { FEATURE_FLAGS } from '@config/features';
import {
    BUSINESS_CATEGORIES,
    BUSINESS_TYPES,
    normalizeBusinessCategory,
    resolveBusinessCategory,
} from '@data/shared/businessTypes';
import {
    getBoundedMenuProcessingStringContext,
    logMenuProcessingFailure,
} from '@lib/firebase/menuProcessingDiagnostics';
import { spawn } from 'child_process';
import { lookup } from 'dns/promises';
import { constants as fsConstants } from 'fs';
import { access, mkdtemp, rm } from 'fs/promises';
import http, { IncomingMessage } from 'http';
import https from 'https';
import net from 'net';
import os from 'os';
import path from 'path';

const MAX_RESPONSE_BYTES = 12 * 1024 * 1024;
const MAX_TEXT_CHARS = 120_000;
const MAX_JSON_LD_CHARS = 20_000;
const DNS_TIMEOUT_MS = 3_000;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_ACQUISITION_MS = 20_000;
const MAX_REDIRECTS = 2;
const MIN_MENU_SOURCE_SCORE = 8;
const MENU_LINK_CANDIDATE_LIMIT = 6;
const MAX_COMBINED_HTML_SOURCES = 4;
const RENDER_FALLBACK_TIMEOUT_MS = 18_000;
const MAX_RENDERED_HTML_BYTES = 8 * 1024 * 1024;
const RENDER_DEPENDENCY_HOST_LIMIT = 16;
const RENDER_DISCOVERY_SCRIPT_LIMIT = 12;
const RENDER_DISCOVERY_SCRIPT_MAX_BYTES = 512 * 1024;
const MENU_LINK_IMPORT_RENDER_FALLBACK_FAILED = 'menu_link_import_render_fallback_failed';
const MENU_LINK_IMPORT_RENDER_TMP_CLEANUP_FAILED = 'menu_link_import_render_tmp_cleanup_failed';

const UNSAFE_HOSTNAMES = new Set([
    'localhost',
    'metadata.google.internal',
]);

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SUPPORTED_TEXT_TYPES = new Set([
    'application/json',
    'application/ld+json',
    'application/xhtml+xml',
    'text/html',
    'text/plain',
    'text/xml',
    'application/xml',
]);

type SourceKind = 'html_text' | 'rendered_html_text' | 'plain_text' | 'json_text' | 'pdf' | 'image';

export type MenuLinkAcquisitionContext = {
    businessCategory?: string | null;
    businessType?: string | null;
};

export type MenuLinkAcquisitionResult = {
    artifactBuffer: Buffer;
    artifactContentType: string;
    artifactExtension: string;
    contentHash: string;
    finalUrl: string;
    redirectCount: number;
    sourceContentType: string;
    sourceKind: SourceKind;
    sourceTextLength?: number;
    sourceTextPresent?: boolean;
    size: number;
};

type FetchedUrl = {
    buffer: Buffer;
    contentType: string;
    finalUrl: string;
    redirectCount: number;
};

type SafeUrl = {
    address: string;
    addresses: LookupAddress[];
    family: number;
    href: string;
    hostname: string;
    protocol: string;
};

function getSourceTextMetadata(sourceText: string): {
    sourceTextLength: number;
    sourceTextPresent: boolean;
} {
    return {
        sourceTextLength: sourceText.length,
        sourceTextPresent: sourceText.length > 0,
    };
}

type LookupAddress = {
    address: string;
    family: number;
};

type HtmlSourceCandidate = {
    finalUrl: string;
    jsonLd: string[];
    rawHtml: string;
    renderUrl?: string;
    redirectCount: number;
    score: number;
    sourceText: string;
};

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Link discovery is catalog-kind aware: food menus are only one supported SMB category.
const GENERIC_OFFERING_TERMS = [
    'menu',
    'menus',
    'catalog',
    'catalogue',
    'catalogs',
    'catalogues',
    'offer catalog',
    'offerings',
    'offering',
    'services',
    'service',
    'products',
    'product',
    'items',
    'item list',
    'pricing',
    'prices',
    'price',
    'price list',
    'rates',
    'rate',
    'rate card',
    'rate-card',
    'packages',
    'package',
    'plans',
    'plan',
    'specials',
    'offers',
    'deals',
];

const CATEGORY_OFFERING_TERMS: Record<string, string[]> = {
    food: [
        'starter',
        'starters',
        'appetizer',
        'appetizers',
        'main course',
        'pizza',
        'burger',
        'sandwich',
        'dessert',
        'beverage',
        'beverages',
        'coffee',
        'tea',
        'drinks',
        'salad',
        'soup',
        'order',
        'ordering',
    ],
    service: [
        'appointments',
        'appointment',
        'booking',
        'book now',
        'treatments',
        'treatment',
        'salon services',
        'spa services',
        'grooming',
        'cleaning services',
        'detailing',
        'landscaping',
    ],
    retail: [
        'shop',
        'store',
        'collection',
        'collections',
        'inventory',
        'merchandise',
        'new arrivals',
        'best sellers',
        'bestsellers',
    ],
    professional: [
        'consultation',
        'consultations',
        'fees',
        'service areas',
        'case studies',
    ],
    creative: [
        'portfolio',
        'commissions',
        'classes',
        'workshops',
        'gallery',
        'collections',
    ],
    health: [
        'classes',
        'class schedule',
        'sessions',
        'session',
        'treatments',
        'programs',
        'plans',
        'appointments',
        'booking',
    ],
    specialty: [
        'rentals',
        'rental',
        'repairs',
        'repair',
        'services',
        'products',
        'rooms',
        'plans',
        'membership',
        'memberships',
    ],
};

const SCHEMA_ORG_TYPES = Array.from(new Set([
    'Menu',
    'MenuItem',
    'Offer',
    'OfferCatalog',
    'ItemList',
    'Product',
    'Service',
    'Restaurant',
    ...BUSINESS_CATEGORIES.map(category => category.schemaOrgType),
    ...(BUSINESS_TYPES.map(type => type.schemaOrgType).filter(Boolean) as string[]),
]));
const SCHEMA_ORG_OFFERING_RE = new RegExp(
    `schema\\.org\\/(${SCHEMA_ORG_TYPES.map(escapeRegExp).join('|')})`,
    'i',
);
const PRICE_TEXT_RE = /(?:rs\.?|inr|₹|\$|usd|eur|£)\s?\d+|\d+(?:\.\d{2})?\s?(?:rs\.?|inr|₹|\$|usd|eur|£)/gi;
const CLIENT_RENDERED_TEMPLATE_RE = /(?:\bng-(?:app|repeat|view|controller|if|show|hide|include|class|model)\b|angular\.module|{{[\s\S]*?}}|<app-root\b|<router-outlet\b|id=["'](?:root|app)["']|data-reactroot|__next_data__|v-(?:for|if|show)=)/i;
const STRONG_LINKED_ASSET_RE = /(^|[^a-z0-9])(?:menu|menus|catalog|catalogue|price[\s/_-]*list|rate[\s/_-]*card|food[\s/_-]*menu|bar[\s/_-]*menu|service[\s/_-]*list|services[\s/_-]*list|product[\s/_-]*catalog)(?=$|[^a-z0-9])/i;
const UI_ASSET_RE = /(^|[\/_\s.-])(?:arrow|avatar|background|banner|cart|checkout|close|filter|favicon|icon|loader|logo|nav|no[\s_-]*image|online[\s_-]*order|payment|placeholder|qr|search|social|spinner)(?=$|[\/_\s.-])/i;
const CHROME_EXECUTABLE_CANDIDATES = [
    process.env.MENU_LINK_IMPORT_CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
].filter(Boolean) as string[];

let cachedChromeExecutable: string | null | undefined;

export class MenuLinkImportError extends Error {
    code: string;
    status: number;

    constructor(code: string, message: string, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

const OWNER_MENU_LINK_IMPORT_FALLBACK_MESSAGE = 'We could not read this menu link. Upload a photo/PDF or add the menu manually.';
const PUBLIC_MENU_LINK_IMPORT_FALLBACK_MESSAGE = 'We could not read this menu link. Upload a photo or try another public menu link.';

const MENU_LINK_IMPORT_CLIENT_MESSAGES: Record<string, string> = {
    CONTENT_TOO_LARGE: 'This menu link is too large to import.',
    INVALID_URL: 'Enter a valid public menu link.',
    UNSAFE_HOSTNAME: 'Use a public menu link.',
    UNSAFE_IP: 'Use a public menu link.',
    UNSAFE_PORT: 'Use a standard public website link.',
    UNSAFE_RESOLVED_IP: 'Use a public menu link.',
    UNSUPPORTED_PROTOCOL: 'Use a public http or https menu link.',
    URL_CREDENTIALS_BLOCKED: 'Use a public menu link without login details.',
};

export function getMenuLinkImportClientMessage(
    error: MenuLinkImportError,
    options: { publicEntry?: boolean } = {},
): string {
    const fallback = options.publicEntry
        ? PUBLIC_MENU_LINK_IMPORT_FALLBACK_MESSAGE
        : OWNER_MENU_LINK_IMPORT_FALLBACK_MESSAGE;

    return MENU_LINK_IMPORT_CLIENT_MESSAGES[error.code] || fallback;
}

function normalizeUrl(input: string): URL {
    const trimmed = input.trim().replace(/\\/g, '/');
    let url: URL;
    try {
        url = new URL(trimmed);
    } catch {
        throw new MenuLinkImportError('INVALID_URL', 'Enter a valid public menu link.');
    }

    if (url.username || url.password) {
        throw new MenuLinkImportError('URL_CREDENTIALS_BLOCKED', 'Use a public menu link without login details.');
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
        throw new MenuLinkImportError('UNSUPPORTED_PROTOCOL', 'Use a public http or https menu link.');
    }
    if (url.port && !((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443'))) {
        throw new MenuLinkImportError('UNSAFE_PORT', 'Use a standard public website link.');
    }

    url.hash = '';
    return url;
}

function buildRenderableUrl(input: string, safeHref: string): string {
    try {
        const original = new URL(input.trim().replace(/\\/g, '/'));
        const safe = new URL(safeHref);
        if (
            original.origin === safe.origin &&
            original.pathname === safe.pathname &&
            original.search === safe.search &&
            original.hash
        ) {
            safe.hash = original.hash;
        }
        return safe.href;
    } catch {
        return safeHref;
    }
}

function formatChromeHostPattern(hostname: string): string {
    return net.isIP(hostname) === 6 ? `[${hostname}]` : hostname;
}

function formatChromeResolverAddress(address: string): string {
    return net.isIP(address) === 6 ? `[${address}]` : address;
}

function buildChromeNetworkIsolationArgs(renderTargets: SafeUrl[]): string[] {
    const uniqueTargets = Array.from(new Map(
        renderTargets.map((target) => [target.hostname, target]),
    ).values());
    const hostPatterns = uniqueTargets.map((target) => formatChromeHostPattern(target.hostname));
    const hostResolverRules = [
        ...uniqueTargets.map((target) => (
            `MAP ${formatChromeHostPattern(target.hostname)} ${formatChromeResolverAddress(target.address)}`
        )),
        'MAP * ~NOTFOUND',
    ].join(', ');

    return [
        `--host-resolver-rules=${hostResolverRules}`,
        '--proxy-server=http://127.0.0.1:9',
        `--proxy-bypass-list=${[...hostPatterns, '<-loopback>'].join(';')}`,
    ];
}

function parseIpv4(address: string): number[] | null {
    const parts = address.split('.');
    if (parts.length !== 4) return null;
    const octets = parts.map(part => Number(part));
    if (octets.some(octet => !Number.isInteger(octet) || octet < 0 || octet > 255)) return null;
    return octets;
}

function isUnsafeIpv4(address: string): boolean {
    const octets = parseIpv4(address);
    if (!octets) return true;
    const [a, b, c] = octets;

    return (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 192 && b === 0) ||
        (a === 192 && b === 88 && c === 99) ||
        (a === 198 && (b === 18 || b === 19)) ||
        (a === 198 && b === 51 && c === 100) ||
        (a === 203 && b === 0 && c === 113) ||
        a >= 224 ||
        address === '255.255.255.255'
    );
}

function isUnsafeIpv6(address: string): boolean {
    const lower = address.toLowerCase();
    const firstHextet = Number.parseInt(lower.split(':', 1)[0] || '0', 16);
    // Link import has no reason to reach transition, translation, or other
    // special-purpose IPv6 space. Restrict direct IPv6 targets to global
    // unicast before applying the narrower exclusions below. This also blocks
    // IPv4-compatible forms such as ::127.0.0.1 and NAT64 literals that can
    // otherwise encode a private IPv4 destination.
    if (!Number.isFinite(firstHextet) || firstHextet < 0x2000 || firstHextet > 0x3fff) return true;
    if (lower === '::' || lower === '::1') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    // IPv6 link-local addresses occupy fe80::/10 (fe80:: through febf::), not
    // only the textual fe80: prefix.
    if (Number.isFinite(firstHextet) && (firstHextet & 0xffc0) === 0xfe80) return true;
    // Deprecated site-local space remains non-public and must not be fetched.
    if (Number.isFinite(firstHextet) && (firstHextet & 0xffc0) === 0xfec0) return true;
    if (lower.startsWith('ff')) return true;
    if (lower === '2001:db8::' || lower.startsWith('2001:db8:')) return true;
    if (lower.startsWith('2002:')) return true;
    if (lower.includes('169.254.169.254')) return true;
    if (lower.startsWith('::ffff:') && !/::ffff:(\d+\.\d+\.\d+\.\d+)$/i.test(lower)) return true;

    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isUnsafeIpv4(mapped[1]);

    return false;
}

function isUnsafeIp(address: string): boolean {
    const version = net.isIP(address);
    if (version === 4) return isUnsafeIpv4(address);
    if (version === 6) return isUnsafeIpv6(address);
    return true;
}

async function lookupWithTimeout(hostname: string, timeoutMs: number): Promise<LookupAddress[]> {
    let timeout: NodeJS.Timeout | null = null;
    try {
        return await Promise.race([
            lookup(hostname, { all: true, verbatim: true }) as Promise<LookupAddress[]>,
            new Promise<LookupAddress[]>((_, reject) => {
                timeout = setTimeout(() => {
                    reject(new MenuLinkImportError('DNS_FAILED', 'We could not read this menu link.'));
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timeout) clearTimeout(timeout);
    }
}

async function assertSafeUrl(input: string, deadlineMs = Date.now() + MAX_ACQUISITION_MS): Promise<SafeUrl> {
    const url = normalizeUrl(input);
    const hostname = url.hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');

    if (
        UNSAFE_HOSTNAMES.has(hostname) ||
        hostname.endsWith('.localhost') ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal')
    ) {
        throw new MenuLinkImportError('UNSAFE_HOSTNAME', 'Use a public menu link.');
    }

    if (net.isIP(hostname)) {
        if (isUnsafeIp(hostname)) {
            throw new MenuLinkImportError('UNSAFE_IP', 'Use a public menu link.');
        }
        const family = net.isIP(hostname);
        const addresses = [{ address: hostname, family }];
        return { address: hostname, addresses, family, href: url.href, hostname, protocol: url.protocol };
    }

    let addresses: LookupAddress[];
    try {
        addresses = await lookupWithTimeout(hostname, Math.min(DNS_TIMEOUT_MS, getRemainingTimeout(deadlineMs)));
    } catch {
        throw new MenuLinkImportError('DNS_FAILED', 'We could not read this menu link.');
    }

    if (!addresses.length || addresses.some(address => isUnsafeIp(address.address))) {
        throw new MenuLinkImportError('UNSAFE_RESOLVED_IP', 'Use a public menu link.');
    }

    const sortedAddresses = addresses
        .filter(address => address.family === 4 || address.family === 6)
        .sort((a, b) => (a.family === b.family ? 0 : a.family === 4 ? -1 : 1));
    const selectedAddress = sortedAddresses[0];
    if (!selectedAddress) {
        throw new MenuLinkImportError('DNS_FAILED', 'We could not read this menu link.');
    }

    return {
        address: selectedAddress.address,
        addresses: sortedAddresses,
        family: selectedAddress.family,
        href: url.href,
        hostname,
        protocol: url.protocol,
    };
}

async function readIncomingBody(response: IncomingMessage, maxBytes = MAX_RESPONSE_BYTES): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        let total = 0;

        response.on('data', (chunk: Buffer) => {
            total += chunk.byteLength;
            if (total > maxBytes) {
                reject(new MenuLinkImportError('CONTENT_TOO_LARGE', 'This menu link is too large to import.'));
                response.destroy();
                return;
            }
            chunks.push(Buffer.from(chunk));
        });
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
    });
}

function getRemainingTimeout(deadlineMs: number): number {
    const remainingMs = deadlineMs - Date.now();
    if (remainingMs <= 0) {
        throw new MenuLinkImportError('FETCH_TIMEOUT', 'We could not read this menu link.');
    }
    return Math.min(FETCH_TIMEOUT_MS, remainingMs);
}

async function requestPinnedUrl(safe: SafeUrl, timeoutMs: number, maxBytes = MAX_RESPONSE_BYTES): Promise<{
    buffer: Buffer;
    contentType: string;
    headers: http.IncomingHttpHeaders;
    statusCode: number;
    statusMessage: string;
}> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(safe.href);
        const transport = safe.protocol === 'https:' ? https : http;
        let timedOut = false;

        const request = transport.request({
            headers: {
                Accept: 'text/html,application/pdf,image/webp,image/png,image/jpeg,application/json,text/plain,*/*;q=0.5',
                'Accept-Encoding': 'identity',
                Host: parsed.host,
                'User-Agent': 'MenuListLinkImport/1.0 (+https://menulist.ai)',
            },
            hostname: safe.hostname,
            lookup: (_hostname, options, callback) => {
                const lookupCallback = typeof options === 'function' ? options : callback;
                if (!lookupCallback) return;

                if (typeof options === 'object' && options?.all) {
                    lookupCallback(null, [{ address: safe.address, family: safe.family }]);
                    return;
                }

                lookupCallback(null, safe.address, safe.family);
            },
            method: 'GET',
            path: `${parsed.pathname}${parsed.search}`,
            port: parsed.port || undefined,
            protocol: safe.protocol,
            ...(safe.protocol === 'https:' && !net.isIP(safe.hostname) ? { servername: safe.hostname } : {}),
        }, async (response) => {
            try {
                const contentLengthHeader = Array.isArray(response.headers['content-length'])
                    ? response.headers['content-length'][0]
                    : response.headers['content-length'];
                const contentLength = Number(contentLengthHeader || 0);
                if (contentLength > maxBytes) {
                    response.destroy();
                    reject(new MenuLinkImportError('CONTENT_TOO_LARGE', 'This menu link is too large to import.'));
                    return;
                }

                const buffer = await readIncomingBody(response, maxBytes);
                const contentTypeHeader = Array.isArray(response.headers['content-type'])
                    ? response.headers['content-type'][0]
                    : response.headers['content-type'];

                resolve({
                    buffer,
                    contentType: normalizeContentType(contentTypeHeader || ''),
                    headers: response.headers,
                    statusCode: response.statusCode || 0,
                    statusMessage: response.statusMessage || '',
                });
            } catch (error) {
                reject(error);
            }
        });

        request.setTimeout(timeoutMs, () => {
            timedOut = true;
            request.destroy(new MenuLinkImportError('FETCH_TIMEOUT', 'We could not read this menu link.'));
        });

        request.on('error', (error) => {
            if (error instanceof MenuLinkImportError) {
                reject(error);
                return;
            }
            reject(new MenuLinkImportError(timedOut ? 'FETCH_TIMEOUT' : 'FETCH_FAILED', 'We could not read this menu link.'));
        });

        request.end();
    });
}

async function fetchSafeUrl(
    input: string,
    redirectCount = 0,
    deadlineMs = Date.now() + MAX_ACQUISITION_MS,
    maxBytes = MAX_RESPONSE_BYTES,
): Promise<FetchedUrl> {
    const safe = await assertSafeUrl(input, deadlineMs);

    try {
        let response: Awaited<ReturnType<typeof requestPinnedUrl>> | null = null;
        let lastError: MenuLinkImportError | null = null;

        for (const candidate of safe.addresses) {
            try {
                response = await requestPinnedUrl(
                    { ...safe, address: candidate.address, family: candidate.family },
                    getRemainingTimeout(deadlineMs),
                    maxBytes,
                );
                break;
            } catch (error: any) {
                if (
                    error instanceof MenuLinkImportError &&
                    (error.code === 'FETCH_FAILED' || error.code === 'FETCH_TIMEOUT')
                ) {
                    lastError = error;
                    continue;
                }
                throw error;
            }
        }

        if (!response) {
            throw lastError || new MenuLinkImportError('FETCH_FAILED', 'We could not read this menu link.');
        }

        if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
            if (redirectCount >= MAX_REDIRECTS) {
                throw new MenuLinkImportError('TOO_MANY_REDIRECTS', 'We could not read this menu link.');
            }
            const locationHeader = response.headers.location;
            const location = Array.isArray(locationHeader) ? locationHeader[0] : locationHeader;
            if (!location) {
                throw new MenuLinkImportError('INVALID_REDIRECT', 'We could not read this menu link.');
            }
            const nextUrl = new URL(location, safe.href).href;
            return fetchSafeUrl(nextUrl, redirectCount + 1, deadlineMs, maxBytes);
        }

        if (response.statusCode < 200 || response.statusCode >= 300) {
            throw new MenuLinkImportError('FETCH_FAILED', 'We could not read this menu link.', response.statusCode === 404 ? 404 : 400);
        }

        return {
            buffer: response.buffer,
            contentType: response.contentType,
            finalUrl: safe.href,
            redirectCount,
        };
    } catch (error: any) {
        if (error instanceof MenuLinkImportError) throw error;
        throw new MenuLinkImportError('FETCH_FAILED', 'We could not read this menu link.');
    }
}

function normalizeContentType(value: string): string {
    return value.split(';')[0]?.trim().toLowerCase() || 'application/octet-stream';
}

function inferContentType(contentType: string, url: string): string {
    if (contentType && contentType !== 'application/octet-stream') return contentType;
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.endsWith('.pdf')) return 'application/pdf';
    if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'image/jpeg';
    if (pathname.endsWith('.png')) return 'image/png';
    if (pathname.endsWith('.webp')) return 'image/webp';
    if (pathname.endsWith('.json')) return 'application/json';
    if (pathname.endsWith('.txt')) return 'text/plain';
    return contentType || 'application/octet-stream';
}

export function isValidMenuLinkBinarySignature(buffer: Buffer, contentType: string): boolean {
    if (contentType === 'application/pdf') {
        return buffer.length >= 5 && buffer.subarray(0, 5).equals(Buffer.from('%PDF-'));
    }
    if (contentType === 'image/jpeg') {
        return buffer.length >= 3
            && buffer[0] === 0xff
            && buffer[1] === 0xd8
            && buffer[2] === 0xff;
    }
    if (contentType === 'image/png') {
        return buffer.length >= 8
            && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (contentType === 'image/webp') {
        return buffer.length >= 12
            && buffer.subarray(0, 4).equals(Buffer.from('RIFF'))
            && buffer.subarray(8, 12).equals(Buffer.from('WEBP'));
    }
    return false;
}

function assertSupportedBinarySignature(buffer: Buffer, contentType: string): void {
    if (!isValidMenuLinkBinarySignature(buffer, contentType)) {
        throw new MenuLinkImportError('CONTENT_TYPE_MISMATCH', 'We could not read this menu link.');
    }
}

function isLikelyHomepage(url: string): boolean {
    try {
        const pathname = new URL(url).pathname.replace(/\/+$/, '').toLowerCase();
        return pathname === '' || pathname === '/home' || pathname === '/index' || pathname === '/index.html';
    } catch {
        return false;
    }
}

function decodeHtmlEntities(input: string): string {
    return input
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>');
}

function extractJsonLd(html: string): string[] {
    const matches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    return Array.from(matches)
        .map(match => decodeHtmlEntities(match[1] || '').trim())
        .filter(Boolean)
        .map(value => value.slice(0, MAX_JSON_LD_CHARS))
        .slice(0, 8);
}

function extractVisibleText(html: string): string {
    const withoutNoise = html
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/{{[\s\S]*?}}/g, ' ')
        .replace(/<(br|\/p|\/li|\/tr|\/h[1-6]|\/div)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ');

    return decodeHtmlEntities(withoutNoise)
        .replace(/\r/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n[ \t]+/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, MAX_TEXT_CHARS);
}

function normalizeOfferingTerm(value: string): string {
    return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function addTerms(target: Set<string>, values: string[]) {
    for (const value of values) {
        const normalized = normalizeOfferingTerm(value);
        if (normalized.length >= 3) {
            target.add(normalized);
        }
    }
}

function resolveAcquisitionCategory(context?: MenuLinkAcquisitionContext): string | undefined {
    return (
        resolveBusinessCategory(
            context?.businessType || undefined,
            context?.businessCategory || undefined,
        ) ||
        normalizeBusinessCategory(context?.businessCategory || undefined)
    );
}

function buildOfferingTerms(context?: MenuLinkAcquisitionContext): string[] {
    const terms = new Set<string>();
    addTerms(terms, GENERIC_OFFERING_TERMS);

    const resolvedCategory = resolveAcquisitionCategory(context);
    if (resolvedCategory) {
        addTerms(terms, CATEGORY_OFFERING_TERMS[resolvedCategory] || []);
    } else {
        for (const categoryTerms of Object.values(CATEGORY_OFFERING_TERMS)) {
            addTerms(terms, categoryTerms);
        }
    }

    return Array.from(terms);
}

function buildOfferingTermRegex(context?: MenuLinkAcquisitionContext): RegExp {
    const patterns = buildOfferingTerms(context)
        .map(term => term.split(/\s+/).map(escapeRegExp).join('[\\s/_-]+'))
        .sort((left, right) => right.length - left.length);

    return new RegExp(`(^|[^a-z0-9])(?:${patterns.join('|')})(?=$|[^a-z0-9])`, 'gi');
}

function countOfferingTermMatches(text: string, context?: MenuLinkAcquisitionContext): number {
    const matches = text.match(buildOfferingTermRegex(context));
    return matches?.length || 0;
}

function looksOfferingRelated(text: string, context?: MenuLinkAcquisitionContext): boolean {
    return buildOfferingTermRegex(context).test(text);
}

function normalizeSameOriginCandidateUrl(
    value: string,
    baseUrl: string,
    options: { preserveHash?: boolean } = {},
): string | null {
    if (!value) return null;

    let url: URL;
    try {
        url = new URL(value, baseUrl);
    } catch {
        return null;
    }

    const base = new URL(baseUrl);
    if (url.origin !== base.origin) return null;
    if (!['http:', 'https:'].includes(url.protocol)) return null;

    if (!options.preserveHash) {
        url.hash = '';
    }
    return url.href;
}

function addStructuredUrlCandidate(candidates: Set<string>, value: string, baseUrl: string) {
    const normalized = normalizeSameOriginCandidateUrl(value, baseUrl);
    if (normalized) {
        candidates.add(normalized);
    }
}

function getStructuredTypeNames(value: Record<string, unknown>): string[] {
    const rawType = value['@type'];
    const typeValues = Array.isArray(rawType) ? rawType : rawType ? [rawType] : [];
    return typeValues.map((type) => String(type || '').toLowerCase());
}

function collectUrlLikeValue(value: unknown, baseUrl: string, candidates: Set<string>) {
    if (typeof value === 'string') {
        addStructuredUrlCandidate(candidates, value, baseUrl);
        return;
    }

    if (Array.isArray(value)) {
        value.forEach((entry) => collectUrlLikeValue(entry, baseUrl, candidates));
        return;
    }

    if (!value || typeof value !== 'object') return;

    const objectValue = value as Record<string, unknown>;
    for (const key of ['url', '@id']) {
        const nested = objectValue[key];
        if (typeof nested === 'string') {
            addStructuredUrlCandidate(candidates, nested, baseUrl);
        }
    }
}

function collectStructuredMenuUrls(node: unknown, baseUrl: string, candidates: Set<string>) {
    if (Array.isArray(node)) {
        node.forEach((entry) => collectStructuredMenuUrls(entry, baseUrl, candidates));
        return;
    }

    if (!node || typeof node !== 'object') return;

    const objectValue = node as Record<string, unknown>;
    const typeNames = getStructuredTypeNames(objectValue);
    const objectLooksLikeMenu = typeNames.some((type) => (
        type === 'menu' ||
        type === 'menusection' ||
        type === 'offercatalog' ||
        type === 'itemlist'
    ));

    for (const [key, value] of Object.entries(objectValue)) {
        const normalizedKey = key.toLowerCase();
        if (normalizedKey === 'hasmenu' || normalizedKey === 'menu') {
            collectUrlLikeValue(value, baseUrl, candidates);
        }

        if (objectLooksLikeMenu && (normalizedKey === 'url' || normalizedKey === '@id')) {
            collectUrlLikeValue(value, baseUrl, candidates);
        }

        if (value && typeof value === 'object') {
            collectStructuredMenuUrls(value, baseUrl, candidates);
        }
    }
}

function extractStructuredMenuUrls(jsonLd: string[], baseUrl: string): string[] {
    const candidates = new Set<string>();

    for (const value of jsonLd) {
        try {
            collectStructuredMenuUrls(JSON.parse(value), baseUrl, candidates);
        } catch {
            // Invalid JSON-LD should not block visible-page extraction.
        }
    }

    return Array.from(candidates).slice(0, MENU_LINK_CANDIDATE_LIMIT);
}

function extractCandidateMenuLinks(html: string, baseUrl: string, context?: MenuLinkAcquisitionContext): string[] {
    const base = new URL(baseUrl);
    const candidates = new Set<string>();
    const links = Array.from(html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi));

    for (const match of links) {
        const href = decodeHtmlEntities(match[1] || '').trim();
        const label = extractVisibleText(match[2] || '').toLowerCase();
        if (!href) continue;

        const normalizedUrl = normalizeSameOriginCandidateUrl(href, base.href, { preserveHash: true });
        if (!normalizedUrl) continue;
        const url = new URL(normalizedUrl);

        const haystack = `${url.pathname} ${url.search} ${url.hash} ${label}`.toLowerCase();
        if (looksOfferingRelated(haystack, context)) {
            candidates.add(url.href);
        }
    }

    return Array.from(candidates).slice(0, MENU_LINK_CANDIDATE_LIMIT);
}

function extractAttribute(tag: string, attribute: string): string {
    const match = tag.match(new RegExp(`${attribute}=["']([^"']+)["']`, 'i'));
    return decodeHtmlEntities(match?.[1] || '').trim();
}

function addCandidateUrl(
    candidates: Set<string>,
    value: string,
    baseUrl: string,
    labelContext: string,
    acquisitionContext?: MenuLinkAcquisitionContext,
) {
    if (!value) return;

    let url: URL;
    try {
        url = new URL(value, baseUrl);
    } catch {
        return;
    }

    const base = new URL(baseUrl);
    if (url.origin !== base.origin) return;

    const haystack = `${url.pathname} ${url.search} ${labelContext}`.toLowerCase();
    const isSupportedAsset = /\.(pdf|jpe?g|png|webp)(?:$|[?#])/i.test(url.href);
    const looksImportRelated = looksOfferingRelated(haystack, acquisitionContext);
    if (!isSupportedAsset || !looksImportRelated) return;

    const isImageAsset = /\.(jpe?g|png|webp)(?:$|[?#])/i.test(url.href);
    if (isImageAsset && (!STRONG_LINKED_ASSET_RE.test(haystack) || UI_ASSET_RE.test(haystack))) {
        return;
    }

    url.hash = '';
    candidates.add(url.href);
}

function extractCandidateAssetLinks(html: string, baseUrl: string, context?: MenuLinkAcquisitionContext): string[] {
    const candidates = new Set<string>();
    for (const candidate of extractStructuredMenuUrls(extractJsonLd(html), baseUrl)) {
        addCandidateUrl(candidates, candidate, baseUrl, 'structured menu catalog', context);
    }

    const anchorTags = Array.from(html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi));
    for (const match of anchorTags) {
        addCandidateUrl(
            candidates,
            match[1] || '',
            baseUrl,
            extractVisibleText(match[2] || ''),
            context,
        );
    }

    const imageTags = Array.from(html.matchAll(/<img\s+[^>]*>/gi));
    for (const match of imageTags) {
        const tag = match[0] || '';
        addCandidateUrl(
            candidates,
            extractAttribute(tag, 'src') || extractAttribute(tag, 'data-src'),
            baseUrl,
            `${extractAttribute(tag, 'alt')} ${extractAttribute(tag, 'title')}`,
            context,
        );
    }

    return Array.from(candidates).slice(0, MENU_LINK_CANDIDATE_LIMIT);
}

function scoreMenuText(text: string, context?: MenuLinkAcquisitionContext): number {
    let score = 0;
    score += Math.min(countOfferingTermMatches(text, context), 20);
    const priceMatches = text.match(PRICE_TEXT_RE);
    score += Math.min((priceMatches?.length || 0) * 2, 30);
    if (SCHEMA_ORG_OFFERING_RE.test(text)) score += 10;
    return score;
}

function countPriceMatches(text: string): number {
    return text.match(PRICE_TEXT_RE)?.length || 0;
}

function hasStructuredOffering(jsonLd: string[]): boolean {
    return jsonLd.some(value => SCHEMA_ORG_OFFERING_RE.test(value));
}

function isUsableHtmlSource(
    candidate: HtmlSourceCandidate,
    options: { isOriginal: boolean; originalIsHomepage: boolean },
): boolean {
    if (candidate.sourceText.length < 80 && candidate.jsonLd.length === 0) return false;
    if (candidate.score < MIN_MENU_SOURCE_SCORE) return false;

    if (options.isOriginal && options.originalIsHomepage) {
        return hasStructuredOffering(candidate.jsonLd) || countPriceMatches(candidate.sourceText) >= 2;
    }

    return true;
}

function getSourceTextFingerprint(text: string): string {
    return crypto
        .createHash('sha256')
        .update(text.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, MAX_TEXT_CHARS))
        .digest('hex');
}

function combineHtmlSources(sources: HtmlSourceCandidate[]): HtmlSourceCandidate {
    const selected: HtmlSourceCandidate[] = [];
    const seenText = new Set<string>();

    for (const source of sources) {
        const fingerprint = getSourceTextFingerprint(source.sourceText);
        if (seenText.has(fingerprint)) continue;

        selected.push(source);
        seenText.add(fingerprint);

        if (selected.length >= MAX_COMBINED_HTML_SOURCES) break;
    }

    if (selected.length === 1) return selected[0];

    const seenJsonLd = new Set<string>();
    const jsonLd: string[] = [];
    const sourceTexts: string[] = [];

    for (const source of selected) {
        sourceTexts.push(source.sourceText);
        for (const structuredData of source.jsonLd) {
            if (seenJsonLd.has(structuredData)) continue;
            seenJsonLd.add(structuredData);
            jsonLd.push(structuredData);
        }
    }

    return {
        finalUrl: selected[0].finalUrl,
        jsonLd: jsonLd.slice(0, 8),
        rawHtml: selected.map((source) => source.rawHtml).join('\n'),
        renderUrl: selected[0].renderUrl,
        redirectCount: Math.max(...selected.map((source) => source.redirectCount)),
        score: Math.max(...selected.map((source) => source.score)),
        sourceText: sourceTexts.join('\n\n').slice(0, MAX_TEXT_CHARS),
    };
}

function looksLikeUnresolvedClientRenderedShell(rawHtml: string, sourceText: string, jsonLd: string[]): boolean {
    if (!CLIENT_RENDERED_TEMPLATE_RE.test(rawHtml)) return false;
    if (hasStructuredOffering(jsonLd)) return false;
    if (countPriceMatches(sourceText) > 0) return false;

    const compactText = sourceText.replace(/\s+/g, ' ').trim().toLowerCase();
    const appShellTerms = [
        'toggle navigation',
        'cloud kitchen',
        'digital menu',
        'online ordering',
        'restaurant management software',
    ];
    const appShellTermMatches = appShellTerms.filter(term => compactText.includes(term)).length;

    return appShellTermMatches >= 2 || countOfferingTermMatches(sourceText) >= 12;
}

function buildTextArtifact(params: {
    finalUrl: string;
    jsonLd?: string[];
    sourceText: string;
    sourceUrl: string;
}): Buffer {
    const sections = [
        `MenuList source URL: ${params.sourceUrl}`,
        `MenuList fetched URL: ${params.finalUrl}`,
        '',
        params.jsonLd?.length ? `Structured data found:\n${params.jsonLd.join('\n\n')}` : '',
        '',
        'Visible source text:',
        params.sourceText,
    ];
    return Buffer.from(sections.filter(section => section !== '').join('\n'), 'utf8');
}

async function chooseBestHtmlSource(
    sourceUrl: string,
    fetched: FetchedUrl,
    deadlineMs: number,
    context?: MenuLinkAcquisitionContext,
): Promise<HtmlSourceCandidate> {
    const initialHtml = fetched.buffer.toString('utf8');
    const initialText = extractVisibleText(initialHtml);
    const initialJsonLd = extractJsonLd(initialHtml);
    const initialSource = {
        finalUrl: fetched.finalUrl,
        jsonLd: initialJsonLd,
        rawHtml: initialHtml,
        redirectCount: fetched.redirectCount,
        score: scoreMenuText(`${initialJsonLd.join('\n')} ${initialText}`, context),
        sourceText: initialText,
    };
    let best = initialSource;
    const htmlSources: HtmlSourceCandidate[] = [initialSource];

    const candidates = Array.from(new Set([
        ...extractStructuredMenuUrls(initialJsonLd, fetched.finalUrl),
        ...extractCandidateMenuLinks(initialHtml, fetched.finalUrl, context),
    ])).slice(0, MENU_LINK_CANDIDATE_LIMIT);
    if (candidates.length === 0) return best;

    for (const candidate of candidates) {
        if (candidate === sourceUrl || candidate === fetched.finalUrl) continue;
        try {
            const candidateFetch = await fetchSafeUrl(candidate, 0, deadlineMs);
            const candidateType = inferContentType(candidateFetch.contentType, candidateFetch.finalUrl);
            if (candidateType !== 'text/html') continue;
            const html = candidateFetch.buffer.toString('utf8');
            const sourceText = extractVisibleText(html);
            const jsonLd = extractJsonLd(html);
            const score = scoreMenuText(`${jsonLd.join('\n')} ${sourceText}`, context);
            const htmlSource = {
                finalUrl: candidateFetch.finalUrl,
                jsonLd,
                rawHtml: html,
                renderUrl: candidate,
                redirectCount: candidateFetch.redirectCount,
                score,
                sourceText,
            };
            htmlSources.push(htmlSource);
            if (score > best.score) {
                best = htmlSource;
            }
        } catch {
            // Ignore candidate failures; the original URL remains usable.
        }
    }

    const originalIsHomepage = isLikelyHomepage(fetched.finalUrl);
    const usableSources = htmlSources.filter((source, index) => (
        isUsableHtmlSource(source, { isOriginal: index === 0, originalIsHomepage })
    ));

    if (usableSources.length > 1) {
        return combineHtmlSources(usableSources.sort((left, right) => right.score - left.score));
    }

    return usableSources[0] || best;
}

async function resolveChromeExecutable(): Promise<string | null> {
    if (cachedChromeExecutable !== undefined) return cachedChromeExecutable;

    for (const candidate of CHROME_EXECUTABLE_CANDIDATES) {
        try {
            await access(candidate, fsConstants.X_OK);
            cachedChromeExecutable = candidate;
            return candidate;
        } catch {
            // Try the next known executable path.
        }
    }

    cachedChromeExecutable = null;
    return null;
}

function extractRenderScriptUrls(html: string, baseUrl: string): string[] {
    const urls = new Set<string>();
    const matches = Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi));
    for (const match of matches) {
        try {
            const url = new URL(decodeHtmlEntities(match[1] || ''), baseUrl);
            if (url.protocol === 'http:' || url.protocol === 'https:') {
                url.hash = '';
                urls.add(url.href);
            }
        } catch {
            // Ignore malformed script references from untrusted pages.
        }
    }
    return Array.from(urls);
}

function getRenderDiscoveryScriptPriority(url: string): number {
    try {
        const pathname = new URL(url).pathname.toLowerCase();
        if (/(?:^|[/._-])(?:app|bootstrap|config|index|main|runtime|service|services)(?:[/._-]|$)/.test(pathname)) {
            return 2;
        }
        if (/(?:bundle|chunk)/.test(pathname)) return 1;
    } catch {
        return 0;
    }
    return 0;
}

function extractEmbeddedHttpUrls(source: string): string[] {
    const urls = new Set<string>();
    const matches = Array.from(source.matchAll(/https?:\/\/[^\s"'`\\<>]+/gi));
    for (const match of matches) {
        const value = (match[0] || '').replace(/[),.;]+$/, '');
        if (value) urls.add(value);
    }
    return Array.from(urls);
}

async function discoverSafeRenderTargets(params: {
    deadlineMs: number;
    html: string;
    renderTarget: SafeUrl;
}): Promise<SafeUrl[]> {
    const scriptUrls = extractRenderScriptUrls(params.html, params.renderTarget.href);
    const sameOriginScripts = scriptUrls
        .filter((url) => new URL(url).origin === new URL(params.renderTarget.href).origin)
        .sort((left, right) => getRenderDiscoveryScriptPriority(right) - getRenderDiscoveryScriptPriority(left))
        .slice(0, RENDER_DISCOVERY_SCRIPT_LIMIT);

    const scriptFetches = await Promise.allSettled(sameOriginScripts.map((url) => (
        fetchSafeUrl(url, 0, params.deadlineMs, RENDER_DISCOVERY_SCRIPT_MAX_BYTES)
    )));
    const embeddedUrls = scriptFetches.flatMap((result) => (
        result.status === 'fulfilled'
            ? extractEmbeddedHttpUrls(result.value.buffer.toString('utf8'))
            : []
    ));

    const candidateUrls = [
        ...embeddedUrls,
        ...scriptUrls.filter((url) => new URL(url).origin !== new URL(params.renderTarget.href).origin),
    ];
    const uniqueHostUrls = new Map<string, string>();
    for (const candidate of candidateUrls) {
        try {
            const url = new URL(candidate);
            if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;
            if (net.isIP(url.hostname)) continue;
            if (url.hostname === params.renderTarget.hostname || uniqueHostUrls.has(url.hostname)) continue;
            uniqueHostUrls.set(url.hostname, url.href);
            if (uniqueHostUrls.size >= RENDER_DEPENDENCY_HOST_LIMIT - 1) break;
        } catch {
            // Ignore malformed URL-like strings from untrusted scripts.
        }
    }

    const resolved = await Promise.allSettled(
        Array.from(uniqueHostUrls.values()).map((url) => assertSafeUrl(url, params.deadlineMs)),
    );
    return [
        params.renderTarget,
        ...resolved.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []),
    ];
}

function runChromeDumpDom(params: {
    chromePath: string;
    renderTargets: SafeUrl[];
    renderUrl: string;
    timeoutMs: number;
    userDataDir: string;
}): Promise<string | null> {
    return new Promise((resolve) => {
        const stdoutChunks: Buffer[] = [];
        let stdoutBytes = 0;
        let settled = false;
        const virtualTimeBudget = Math.max(4_000, Math.min(params.timeoutMs - 1_000, 14_000));
        const args = [
            '--headless=new',
            '--disable-background-networking',
            '--disable-component-update',
            '--disable-default-apps',
            '--disable-extensions',
            '--disable-gpu',
            '--disable-sync',
            '--disable-translate',
            '--hide-scrollbars',
            '--no-default-browser-check',
            '--no-first-run',
            '--run-all-compositor-stages-before-draw',
            '--blink-settings=imagesEnabled=false',
            ...buildChromeNetworkIsolationArgs(params.renderTargets),
            `--user-data-dir=${params.userDataDir}`,
            `--virtual-time-budget=${virtualTimeBudget}`,
            '--dump-dom',
            params.renderUrl,
        ];

        if (process.env.MENU_LINK_IMPORT_CHROME_NO_SANDBOX === 'true') {
            args.unshift('--no-sandbox');
        }

        const child = spawn(params.chromePath, args, {
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        let timer: ReturnType<typeof setTimeout>;

        const finish = (value: string | null) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(value);
        };

        timer = setTimeout(() => {
            child.kill('SIGKILL');
            const html = Buffer.concat(stdoutChunks).toString('utf8');
            finish(html.trim() ? html : null);
        }, params.timeoutMs);

        child.stdout.on('data', (chunk: Buffer) => {
            if (stdoutBytes >= MAX_RENDERED_HTML_BYTES) return;
            const remaining = MAX_RENDERED_HTML_BYTES - stdoutBytes;
            const nextChunk = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk;
            stdoutChunks.push(nextChunk);
            stdoutBytes += nextChunk.length;
        });

        child.on('error', () => finish(null));
        child.on('close', () => {
            const html = Buffer.concat(stdoutChunks).toString('utf8');
            finish(html.trim() ? html : null);
        });
    });
}

async function tryRenderHtmlSource(
    originalSourceUrl: string,
    safeFinalUrl: string,
    sourceHtml: string,
    deadlineMs: number,
    context?: MenuLinkAcquisitionContext,
): Promise<MenuLinkAcquisitionResult | null> {
    if (!FEATURE_FLAGS.ENABLE_MENU_LINK_IMPORT_RENDER_FALLBACK) return null;

    const chromePath = await resolveChromeExecutable();
    if (!chromePath) return null;

    const renderUrl = buildRenderableUrl(originalSourceUrl, safeFinalUrl);
    const renderTarget = await assertSafeUrl(renderUrl, deadlineMs);
    if (net.isIP(renderTarget.hostname)) return null;
    const renderTargets = await discoverSafeRenderTargets({
        deadlineMs,
        html: sourceHtml,
        renderTarget,
    });
    const remainingMs = deadlineMs - Date.now();
    if (remainingMs < 5_000) return null;

    const timeoutMs = Math.max(5_000, Math.min(RENDER_FALLBACK_TIMEOUT_MS, remainingMs));

    let userDataDir: string | null = null;

    try {
        userDataDir = await mkdtemp(path.join(os.tmpdir(), 'menulist-link-render-'));
        const renderedHtml = await runChromeDumpDom({
            chromePath,
            renderTargets,
            renderUrl,
            timeoutMs,
            userDataDir,
        });
        if (!renderedHtml) return null;

        const sourceText = extractVisibleText(renderedHtml);
        const jsonLd = extractJsonLd(renderedHtml);
        const score = scoreMenuText(`${jsonLd.join('\n')} ${sourceText}`, context);
        const priceMatchCount = sourceText.match(PRICE_TEXT_RE)?.length || 0;
        if (sourceText.length < 80 || score < 8 || (!hasStructuredOffering(jsonLd) && priceMatchCount < 2)) {
            return null;
        }

        const artifactBuffer = buildTextArtifact({
            finalUrl: renderUrl,
            jsonLd,
            sourceText,
            sourceUrl: renderUrl,
        });

        return {
            artifactBuffer,
            artifactContentType: 'text/plain',
            artifactExtension: 'txt',
            contentHash: crypto.createHash('sha256').update(artifactBuffer).digest('hex'),
            finalUrl: renderUrl,
            redirectCount: 0,
            sourceContentType: 'text/html',
            sourceKind: 'rendered_html_text',
            ...getSourceTextMetadata(sourceText),
            size: artifactBuffer.byteLength,
        };
    } catch (error) {
        logMenuProcessingFailure(MENU_LINK_IMPORT_RENDER_FALLBACK_FAILED, error, {
            fallbackPolicy: 'skip_rendered_html',
            renderFallbackTimeoutMs: timeoutMs,
            renderDependencyHostCount: renderTargets.length,
            renderFallbackUserDataDirCreated: Boolean(userDataDir),
            ...getBoundedMenuProcessingStringContext('renderHostname', renderTarget.hostname),
            ...getBoundedMenuProcessingStringContext('businessCategory', context?.businessCategory),
            ...getBoundedMenuProcessingStringContext('businessType', context?.businessType),
        });
        return null;
    } finally {
        if (userDataDir) {
            try {
                await rm(userDataDir, { recursive: true, force: true });
            } catch (error) {
                logMenuProcessingFailure(MENU_LINK_IMPORT_RENDER_TMP_CLEANUP_FAILED, error, {
                    cleanupTarget: 'chrome_user_data_dir',
                    ...getBoundedMenuProcessingStringContext('renderHostname', renderTarget.hostname),
                    ...getBoundedMenuProcessingStringContext('businessCategory', context?.businessCategory),
                    ...getBoundedMenuProcessingStringContext('businessType', context?.businessType),
                });
            }
        }
    }
}

async function tryAcquireLinkedAsset(
    html: string,
    baseUrl: string,
    deadlineMs: number,
    context?: MenuLinkAcquisitionContext,
): Promise<MenuLinkAcquisitionResult | null> {
    const candidates = extractCandidateAssetLinks(html, baseUrl, context);
    for (const candidate of candidates) {
        try {
            const fetched = await fetchSafeUrl(candidate, 0, deadlineMs);
            const contentType = inferContentType(fetched.contentType, fetched.finalUrl);
            if (contentType === 'application/pdf') {
                assertSupportedBinarySignature(fetched.buffer, contentType);
                return buildBinaryResult(fetched, 'pdf', 'pdf', contentType);
            }
            if (SUPPORTED_IMAGE_TYPES.has(contentType)) {
                assertSupportedBinarySignature(fetched.buffer, contentType);
                const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
                return buildBinaryResult(fetched, 'image', extension, contentType);
            }
        } catch {
            // Keep trying bounded same-origin asset candidates.
        }
    }
    return null;
}

export async function validateMenuLinkImportUrl(input: string): Promise<string> {
    const safe = await assertSafeUrl(input);
    return safe.href;
}

export async function acquireMenuLinkSource(
    sourceUrl: string,
    context?: MenuLinkAcquisitionContext,
): Promise<MenuLinkAcquisitionResult> {
    const deadlineMs = Date.now() + MAX_ACQUISITION_MS;
    const normalizedSourceUrl = (await assertSafeUrl(sourceUrl, deadlineMs)).href;
    const fetched = await fetchSafeUrl(normalizedSourceUrl, 0, deadlineMs);
    const contentType = inferContentType(fetched.contentType, fetched.finalUrl);

    if (contentType === 'application/pdf') {
        assertSupportedBinarySignature(fetched.buffer, contentType);
        return buildBinaryResult(fetched, 'pdf', 'pdf', contentType);
    }

    if (SUPPORTED_IMAGE_TYPES.has(contentType)) {
        assertSupportedBinarySignature(fetched.buffer, contentType);
        const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
        return buildBinaryResult(fetched, 'image', extension, contentType);
    }

    if (!SUPPORTED_TEXT_TYPES.has(contentType)) {
        throw new MenuLinkImportError('UNSUPPORTED_CONTENT_TYPE', 'We could not read this menu link.');
    }

    if (contentType === 'text/html' || contentType === 'application/xhtml+xml') {
        const best = await chooseBestHtmlSource(normalizedSourceUrl, fetched, deadlineMs, context);
        const originalHtml = fetched.buffer.toString('utf8');
        const originalLinkedAsset = async () => (
            best.finalUrl === fetched.finalUrl
                ? null
                : tryAcquireLinkedAsset(originalHtml, fetched.finalUrl, deadlineMs, context)
        );

        if (
            isLikelyHomepage(fetched.finalUrl) &&
            best.finalUrl === fetched.finalUrl &&
            !hasStructuredOffering(best.jsonLd) &&
            countPriceMatches(best.sourceText) < 2
        ) {
            const linkedAsset = await tryAcquireLinkedAsset(originalHtml, fetched.finalUrl, deadlineMs, context);
            if (linkedAsset) return linkedAsset;

            const renderedSource = await tryRenderHtmlSource(
                best.renderUrl || sourceUrl,
                best.finalUrl,
                best.rawHtml,
                deadlineMs,
                context,
            );
            if (renderedSource) return renderedSource;

            throw new MenuLinkImportError(
                'NO_MENU_CONTENT_FOUND',
                'We could not read this menu link. Upload a photo/PDF or add the menu manually.',
            );
        }

        if (looksLikeUnresolvedClientRenderedShell(best.rawHtml, best.sourceText, best.jsonLd)) {
            const linkedAsset = await tryAcquireLinkedAsset(best.rawHtml, best.finalUrl, deadlineMs, context);
            if (linkedAsset) return linkedAsset;

            const linkedOriginalAsset = await originalLinkedAsset();
            if (linkedOriginalAsset) return linkedOriginalAsset;

            const renderedSource = await tryRenderHtmlSource(
                best.renderUrl || sourceUrl,
                best.finalUrl,
                best.rawHtml,
                deadlineMs,
                context,
            );
            if (renderedSource) return renderedSource;

            throw new MenuLinkImportError(
                'NO_MENU_CONTENT_FOUND',
                'We could not read this menu link. Upload a photo/PDF or add the menu manually.',
            );
        }
        if (best.score < MIN_MENU_SOURCE_SCORE) {
            const linkedAsset = await tryAcquireLinkedAsset(best.rawHtml, best.finalUrl, deadlineMs, context);
            if (linkedAsset) return linkedAsset;

            const linkedOriginalAsset = await originalLinkedAsset();
            if (linkedOriginalAsset) return linkedOriginalAsset;

            const renderedSource = await tryRenderHtmlSource(
                best.renderUrl || sourceUrl,
                best.finalUrl,
                best.rawHtml,
                deadlineMs,
                context,
            );
            if (renderedSource) return renderedSource;

            throw new MenuLinkImportError(
                'NO_MENU_CONTENT_FOUND',
                'We could not read this menu link. Upload a photo/PDF or add the menu manually.',
            );
        }
        if (best.sourceText.length < 80 && best.jsonLd.length === 0) {
            throw new MenuLinkImportError('NO_MENU_CONTENT_FOUND', 'We could not read this menu link.');
        }

        const artifactBuffer = buildTextArtifact({
            finalUrl: best.finalUrl,
            jsonLd: best.jsonLd,
            sourceText: best.sourceText,
            sourceUrl: normalizedSourceUrl,
        });

        return {
            artifactBuffer,
            artifactContentType: 'text/plain',
            artifactExtension: 'txt',
            contentHash: crypto.createHash('sha256').update(artifactBuffer).digest('hex'),
            finalUrl: best.finalUrl,
            redirectCount: best.redirectCount,
            sourceContentType: contentType,
            sourceKind: 'html_text',
            ...getSourceTextMetadata(best.sourceText),
            size: artifactBuffer.byteLength,
        };
    }

    const sourceText = fetched.buffer.toString('utf8').trim().slice(0, MAX_TEXT_CHARS);
    if (sourceText.length < 20) {
        throw new MenuLinkImportError('NO_MENU_CONTENT_FOUND', 'We could not read this menu link.');
    }

    const artifactBuffer = buildTextArtifact({
        finalUrl: fetched.finalUrl,
        sourceText,
        sourceUrl: normalizedSourceUrl,
    });

    return {
        artifactBuffer,
        artifactContentType: 'text/plain',
        artifactExtension: 'txt',
        contentHash: crypto.createHash('sha256').update(artifactBuffer).digest('hex'),
        finalUrl: fetched.finalUrl,
        redirectCount: fetched.redirectCount,
        sourceContentType: contentType,
        sourceKind: contentType.includes('json') ? 'json_text' : 'plain_text',
        ...getSourceTextMetadata(sourceText),
        size: artifactBuffer.byteLength,
    };
}

function buildBinaryResult(
    fetched: FetchedUrl,
    sourceKind: Extract<SourceKind, 'pdf' | 'image'>,
    extension: string,
    contentType: string,
): MenuLinkAcquisitionResult {
    return {
        artifactBuffer: fetched.buffer,
        artifactContentType: contentType,
        artifactExtension: extension,
        contentHash: crypto.createHash('sha256').update(fetched.buffer).digest('hex'),
        finalUrl: fetched.finalUrl,
        redirectCount: fetched.redirectCount,
        sourceContentType: contentType,
        sourceKind,
        size: fetched.buffer.byteLength,
    };
}
