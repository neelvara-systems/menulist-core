import crypto from 'crypto';
import {
    BUSINESS_CATEGORIES,
    BUSINESS_TYPES,
    normalizeBusinessCategory,
    resolveBusinessCategory,
} from '@data/shared/businessTypes';
import { lookup } from 'dns/promises';
import http, { IncomingMessage } from 'http';
import https from 'https';
import net from 'net';

const MAX_RESPONSE_BYTES = 12 * 1024 * 1024;
const MAX_TEXT_CHARS = 120_000;
const MAX_JSON_LD_CHARS = 20_000;
const DNS_TIMEOUT_MS = 3_000;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_ACQUISITION_MS = 20_000;
const MAX_REDIRECTS = 2;
const MENU_LINK_CANDIDATE_LIMIT = 3;

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

type SourceKind = 'html_text' | 'plain_text' | 'json_text' | 'pdf' | 'image';

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
    sourceTextPreview?: string;
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

type LookupAddress = {
    address: string;
    family: number;
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

export class MenuLinkImportError extends Error {
    code: string;
    status: number;

    constructor(code: string, message: string, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
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

    url.hash = '';
    return url;
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
    if (lower === '::' || lower === '::1') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    if (lower.startsWith('fe80:')) return true;
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

async function readIncomingBody(response: IncomingMessage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        let total = 0;

        response.on('data', (chunk: Buffer) => {
            total += chunk.byteLength;
            if (total > MAX_RESPONSE_BYTES) {
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

async function requestPinnedUrl(safe: SafeUrl, timeoutMs: number): Promise<{
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
                if (contentLength > MAX_RESPONSE_BYTES) {
                    response.destroy();
                    reject(new MenuLinkImportError('CONTENT_TOO_LARGE', 'This menu link is too large to import.'));
                    return;
                }

                const buffer = await readIncomingBody(response);
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

async function fetchSafeUrl(input: string, redirectCount = 0, deadlineMs = Date.now() + MAX_ACQUISITION_MS): Promise<FetchedUrl> {
    const safe = await assertSafeUrl(input, deadlineMs);

    try {
        let response: Awaited<ReturnType<typeof requestPinnedUrl>> | null = null;
        let lastError: MenuLinkImportError | null = null;

        for (const candidate of safe.addresses) {
            try {
                response = await requestPinnedUrl(
                    { ...safe, address: candidate.address, family: candidate.family },
                    getRemainingTimeout(deadlineMs),
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
            return fetchSafeUrl(nextUrl, redirectCount + 1, deadlineMs);
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
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<(br|\/p|\/li|\/tr|\/h[1-6]|\/div)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ');

    return decodeHtmlEntities(withoutNoise)
        .replace(/\r/g, '\n')
        .replace(/[ \t]+/g, ' ')
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

function extractCandidateMenuLinks(html: string, baseUrl: string, context?: MenuLinkAcquisitionContext): string[] {
    const base = new URL(baseUrl);
    const candidates = new Set<string>();
    const links = Array.from(html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi));

    for (const match of links) {
        const href = decodeHtmlEntities(match[1] || '').trim();
        const label = extractVisibleText(match[2] || '').toLowerCase();
        if (!href) continue;

        let url: URL;
        try {
            url = new URL(href, base.href);
        } catch {
            continue;
        }

        if (url.origin !== base.origin) continue;

        const haystack = `${url.pathname} ${url.search} ${label}`.toLowerCase();
        if (looksOfferingRelated(haystack, context)) {
            url.hash = '';
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

    url.hash = '';
    candidates.add(url.href);
}

function extractCandidateAssetLinks(html: string, baseUrl: string, context?: MenuLinkAcquisitionContext): string[] {
    const candidates = new Set<string>();
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
    const priceMatches = text.match(/(?:rs\.?|inr|₹|\$|usd|eur|£)\s?\d+|\d+(?:\.\d{2})?\s?(?:rs\.?|inr|₹|\$|usd|eur|£)/gi);
    score += Math.min((priceMatches?.length || 0) * 2, 30);
    if (SCHEMA_ORG_OFFERING_RE.test(text)) score += 10;
    return score;
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
): Promise<{
    finalUrl: string;
    jsonLd: string[];
    rawHtml: string;
    redirectCount: number;
    score: number;
    sourceText: string;
}> {
    const initialHtml = fetched.buffer.toString('utf8');
    const initialText = extractVisibleText(initialHtml);
    const initialJsonLd = extractJsonLd(initialHtml);
    let best = {
        finalUrl: fetched.finalUrl,
        jsonLd: initialJsonLd,
        rawHtml: initialHtml,
        redirectCount: fetched.redirectCount,
        score: scoreMenuText(`${initialJsonLd.join('\n')} ${initialText}`, context),
        sourceText: initialText,
    };

    const candidates = extractCandidateMenuLinks(initialHtml, fetched.finalUrl, context);
    if ((best.score >= 8 && !isLikelyHomepage(fetched.finalUrl)) || candidates.length === 0) return best;

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
            if (score > best.score) {
                best = {
                    finalUrl: candidateFetch.finalUrl,
                    jsonLd,
                    rawHtml: html,
                    redirectCount: candidateFetch.redirectCount,
                    score,
                    sourceText,
                };
            }
        } catch {
            // Ignore candidate failures; the original URL remains usable.
        }
    }

    return best;
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
                return buildBinaryResult(fetched, 'pdf', 'pdf', contentType);
            }
            if (SUPPORTED_IMAGE_TYPES.has(contentType)) {
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
        return buildBinaryResult(fetched, 'pdf', 'pdf', contentType);
    }

    if (SUPPORTED_IMAGE_TYPES.has(contentType)) {
        const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
        return buildBinaryResult(fetched, 'image', extension, contentType);
    }

    if (!SUPPORTED_TEXT_TYPES.has(contentType)) {
        throw new MenuLinkImportError('UNSUPPORTED_CONTENT_TYPE', 'We could not read this menu link.');
    }

    if (contentType === 'text/html' || contentType === 'application/xhtml+xml') {
        const best = await chooseBestHtmlSource(normalizedSourceUrl, fetched, deadlineMs, context);
        if (best.score < 8) {
            const linkedAsset = await tryAcquireLinkedAsset(best.rawHtml, best.finalUrl, deadlineMs, context);
            if (linkedAsset) return linkedAsset;
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
            sourceTextPreview: best.sourceText.slice(0, 500),
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
        sourceTextPreview: sourceText.slice(0, 500),
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
