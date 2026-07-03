import { lookup } from 'dns/promises';
import { isBlockedPosSyncNetworkTarget } from './webhookUrl';

export interface PosSyncWebhookTargetValidationResult {
    valid: boolean;
    addressCount: number;
    error?: string;
    errorName?: string;
}

export async function validatePosSyncWebhookNetworkTarget(
    normalizedUrl: string,
): Promise<PosSyncWebhookTargetValidationResult> {
    let url: URL;
    try {
        url = new URL(normalizedUrl);
    } catch (error) {
        return {
            valid: false,
            addressCount: 0,
            error: 'invalid_url',
            errorName: error instanceof Error ? error.name : typeof error,
        };
    }

    const hostname = url.hostname.toLowerCase().replace(/^\[(.*)\]$/, '$1');
    if (isBlockedPosSyncNetworkTarget(hostname)) {
        return {
            valid: false,
            addressCount: 0,
            error: 'blocked_hostname',
        };
    }

    try {
        const addresses = await lookup(hostname, { all: true, verbatim: true });
        if (addresses.length === 0) {
            return {
                valid: false,
                addressCount: 0,
                error: 'dns_no_addresses',
            };
        }

        const hasBlockedAddress = addresses.some((address) => isBlockedPosSyncNetworkTarget(address.address));
        return {
            valid: !hasBlockedAddress,
            addressCount: addresses.length,
            ...(hasBlockedAddress ? { error: 'blocked_resolved_address' } : {}),
        };
    } catch (error) {
        return {
            valid: false,
            addressCount: 0,
            error: 'dns_lookup_failed',
            errorName: error instanceof Error ? error.name : typeof error,
        };
    }
}
