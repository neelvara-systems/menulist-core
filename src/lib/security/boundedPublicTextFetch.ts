import { lookup } from 'dns/promises';
import type { LookupAddress } from 'dns';
import http from 'http';
import https from 'https';
import { isBlockedServerNetworkTarget } from '@lib/security/serverNetworkTarget';

export type ResolvedPublicHttpTarget = {
    address: string;
    addressCount: number;
    family: 4 | 6;
    url: URL;
};

export type BoundedPublicTextFetchOptions = {
    accept: string;
    allowedContentType: (contentType: string) => boolean;
    maxBytes: number;
    maxRedirects: number;
    timeoutMs: number;
    userAgent: string;
};

export type BoundedPublicTextFetchResult = {
    contentType: string;
    finalUrl: string;
    text: string;
    truncated: boolean;
};

function normalizePublicHttpUrl(rawUrl: string): URL {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        throw new Error('Use a valid public http(s) URL.');
    }

    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
        throw new Error('Use a valid public http(s) URL.');
    }
    const expectedPort = url.protocol === 'https:' ? '443' : '80';
    if (url.port && url.port !== expectedPort) {
        throw new Error('Only standard public website ports can be imported.');
    }
    if (isBlockedServerNetworkTarget(url.hostname)) {
        throw new Error('Private or local URLs cannot be imported.');
    }
    return url;
}

export async function resolvePublicHttpTarget(rawUrl: string): Promise<ResolvedPublicHttpTarget> {
    const url = normalizePublicHttpUrl(rawUrl);
    let addresses: LookupAddress[];
    try {
        addresses = await lookup(url.hostname, { all: true, verbatim: true });
    } catch {
        throw new Error('Public URL could not be resolved.');
    }
    if (!addresses.length) throw new Error('Public URL could not be resolved.');
    if (addresses.some(item => isBlockedServerNetworkTarget(item.address))) {
        throw new Error('URL resolves to a private network address.');
    }

    const selected = addresses[0];
    if (selected.family !== 4 && selected.family !== 6) {
        throw new Error('Public URL returned an unsupported network address.');
    }
    return {
        address: selected.address,
        addressCount: addresses.length,
        family: selected.family,
        url,
    };
}

function requestPinnedPublicText(
    target: ResolvedPublicHttpTarget,
    options: BoundedPublicTextFetchOptions,
): Promise<BoundedPublicTextFetchResult & { location?: string; statusCode: number }> {
    return new Promise((resolve, reject) => {
        const transport = target.url.protocol === 'https:' ? https : http;
        let settled = false;
        const finish = (error?: Error, result?: BoundedPublicTextFetchResult & { location?: string; statusCode: number }) => {
            if (settled) return;
            settled = true;
            if (error) reject(error);
            else if (result) resolve(result);
        };

        const request = transport.request({
            protocol: target.url.protocol,
            hostname: target.url.hostname,
            port: target.url.port || undefined,
            path: `${target.url.pathname}${target.url.search}`,
            method: 'GET',
            headers: {
                Accept: options.accept,
                'Accept-Encoding': 'identity',
                'User-Agent': options.userAgent,
            },
            lookup: (_hostname, _lookupOptions, callback) => {
                callback(null, target.address, target.family);
            },
        }, (response) => {
            const remoteAddress = response.socket.remoteAddress || '';
            if (!remoteAddress || isBlockedServerNetworkTarget(remoteAddress)) {
                response.destroy();
                finish(new Error('URL connected to a private network address.'));
                return;
            }

            const statusCode = response.statusCode || 0;
            const location = typeof response.headers.location === 'string' ? response.headers.location : undefined;
            if (statusCode >= 300 && statusCode < 400) {
                response.resume();
                finish(undefined, {
                    contentType: '',
                    finalUrl: target.url.toString(),
                    location,
                    statusCode,
                    text: '',
                    truncated: false,
                });
                return;
            }
            if (statusCode < 200 || statusCode >= 300) {
                response.resume();
                finish(new Error(`URL returned ${statusCode}`));
                return;
            }

            const contentType = typeof response.headers['content-type'] === 'string'
                ? response.headers['content-type']
                : '';
            if (!options.allowedContentType(contentType)) {
                response.resume();
                finish(new Error('URL is not a text page that Answerlattice can import.'));
                return;
            }
            const contentEncoding = typeof response.headers['content-encoding'] === 'string'
                ? response.headers['content-encoding'].trim().toLowerCase()
                : '';
            if (contentEncoding && contentEncoding !== 'identity') {
                response.resume();
                finish(new Error('URL response encoding could not be processed safely.'));
                return;
            }
            const contentLengthHeader = response.headers['content-length'];
            const contentLength = typeof contentLengthHeader === 'string' ? Number(contentLengthHeader) : null;
            if (contentLength !== null && (!Number.isFinite(contentLength) || contentLength < 0)) {
                response.resume();
                finish(new Error('URL response body could not be streamed safely.'));
                return;
            }
            if (contentLength !== null && contentLength > options.maxBytes) {
                response.resume();
                finish(new Error('URL content is too large for bounded intake.'));
                return;
            }

            const chunks: Buffer[] = [];
            let totalBytes = 0;
            let truncated = false;
            const finishTruncated = () => {
                truncated = true;
                finish(undefined, {
                    contentType,
                    finalUrl: target.url.toString(),
                    statusCode,
                    text: Buffer.concat(chunks, totalBytes).toString('utf8'),
                    truncated: true,
                });
                response.destroy();
            };
            response.on('data', (chunk: Buffer | string) => {
                if (settled) return;
                const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                const remaining = options.maxBytes - totalBytes;
                if (remaining <= 0) {
                    finishTruncated();
                    return;
                }
                if (bytes.byteLength > remaining) {
                    chunks.push(bytes.subarray(0, remaining));
                    totalBytes += remaining;
                    finishTruncated();
                    return;
                }
                chunks.push(bytes);
                totalBytes += bytes.byteLength;
            });
            response.on('end', () => finish(undefined, {
                contentType,
                finalUrl: target.url.toString(),
                statusCode,
                text: Buffer.concat(chunks, totalBytes).toString('utf8'),
                truncated,
            }));
            response.on('error', (error) => {
                if (!truncated) finish(error);
            });
        });

        request.setTimeout(options.timeoutMs, () => {
            request.destroy(new Error('URL request timed out.'));
        });
        request.on('error', (error) => finish(error));
        request.end();
    });
}

export async function fetchBoundedPublicText(
    initialTarget: ResolvedPublicHttpTarget,
    options: BoundedPublicTextFetchOptions,
    redirectDepth = 0,
): Promise<BoundedPublicTextFetchResult> {
    const response = await requestPinnedPublicText(initialTarget, options);
    if (response.statusCode >= 300 && response.statusCode < 400) {
        if (redirectDepth >= options.maxRedirects) throw new Error('URL redirected too many times.');
        if (!response.location) throw new Error(`URL returned ${response.statusCode} without a redirect target.`);
        const nextUrl = new URL(response.location, initialTarget.url).toString();
        const nextTarget = await resolvePublicHttpTarget(nextUrl);
        return fetchBoundedPublicText(nextTarget, options, redirectDepth + 1);
    }
    return {
        contentType: response.contentType,
        finalUrl: response.finalUrl,
        text: response.text,
        truncated: response.truncated,
    };
}
