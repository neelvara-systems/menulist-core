import { request as httpsRequest } from 'node:https';
import { isIP, type LookupFunction } from 'node:net';
import { isBlockedPosSyncNetworkTarget } from './webhookUrl';
import type { ApprovedPosSyncWebhookAddress } from './serverWebhookTarget';

export const POS_SYNC_PINNED_REQUEST_TIMEOUT = 'pos_sync_pinned_request_timeout';
const POS_SYNC_PINNED_REQUEST_INVALID_TARGET = 'pos_sync_pinned_request_invalid_target';

export type PosSyncPinnedWebhookResult = {
    ok: boolean;
    statusCode: number;
};

function createPinnedRequestError(code: string): Error & { code: string } {
    return Object.assign(new Error(code), { code });
}

function normalizeLookupFamily(value: unknown): 4 | 6 | 0 {
    if (value === 4 || value === 'IPv4') return 4;
    if (value === 6 || value === 'IPv6') return 6;
    return 0;
}

export function createPosSyncPinnedLookup(
    expectedHostname: string,
    approvedAddresses: ApprovedPosSyncWebhookAddress[],
): LookupFunction {
    const normalizedHostname = expectedHostname.toLowerCase().replace(/\.$/, '');
    const frozenAddresses = approvedAddresses
        .filter((entry) => (
            (entry.family === 4 || entry.family === 6)
            && isIP(entry.address) === entry.family
            && !isBlockedPosSyncNetworkTarget(entry.address)
        ))
        .map((entry) => ({ ...entry }));

    return (hostname, options, callback) => {
        if (hostname.toLowerCase().replace(/\.$/, '') !== normalizedHostname || frozenAddresses.length === 0) {
            callback(createPinnedRequestError(POS_SYNC_PINNED_REQUEST_INVALID_TARGET), '', 0);
            return;
        }

        const requestedFamily = normalizeLookupFamily(options.family);
        const matchingAddresses = requestedFamily === 0
            ? frozenAddresses
            : frozenAddresses.filter((entry) => entry.family === requestedFamily);
        if (matchingAddresses.length === 0) {
            callback(createPinnedRequestError(POS_SYNC_PINNED_REQUEST_INVALID_TARGET), '', 0);
            return;
        }

        if (options.all) {
            callback(null, matchingAddresses);
            return;
        }

        const selected = matchingAddresses[0];
        callback(null, selected.address, selected.family);
    };
}

export function isPosSyncPinnedRequestTimeout(error: unknown): boolean {
    return Boolean(
        error
        && typeof error === 'object'
        && (error as { code?: unknown }).code === POS_SYNC_PINNED_REQUEST_TIMEOUT,
    );
}

export async function postPosSyncWebhook(params: {
    approvedAddresses: ApprovedPosSyncWebhookAddress[];
    body: string;
    headers: Record<string, string>;
    normalizedUrl: string;
    timeoutMs: number;
}): Promise<PosSyncPinnedWebhookResult> {
    const url = new URL(params.normalizedUrl);
    const hostname = url.hostname.toLowerCase().replace(/^\[(.*)\]$/, '$1').replace(/\.$/, '');
    if (
        url.protocol !== 'https:'
        || params.approvedAddresses.length === 0
        || params.approvedAddresses.some((entry) => (
            isIP(entry.address) !== entry.family
            || isBlockedPosSyncNetworkTarget(entry.address)
        ))
    ) {
        throw createPinnedRequestError(POS_SYNC_PINNED_REQUEST_INVALID_TARGET);
    }

    return new Promise((resolve, reject) => {
        const request = httpsRequest(url, {
            agent: false,
            headers: {
                ...params.headers,
                'Content-Length': String(Buffer.byteLength(params.body, 'utf8')),
            },
            lookup: createPosSyncPinnedLookup(hostname, params.approvedAddresses),
            maxHeaderSize: 16 * 1024,
            method: 'POST',
            ...(isIP(hostname) === 0 ? { servername: hostname } : {}),
        }, (response) => {
            response.resume();
            resolve({
                ok: Boolean(response.statusCode && response.statusCode >= 200 && response.statusCode < 300),
                statusCode: response.statusCode || 0,
            });
        });

        request.setTimeout(params.timeoutMs, () => {
            request.destroy(createPinnedRequestError(POS_SYNC_PINNED_REQUEST_TIMEOUT));
        });
        request.once('error', reject);
        request.end(params.body);
    });
}
