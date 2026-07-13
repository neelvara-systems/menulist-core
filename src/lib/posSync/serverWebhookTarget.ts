import { lookup } from 'dns/promises';
import { isBlockedPosSyncNetworkTarget } from './webhookUrl';

export type ApprovedPosSyncWebhookAddress = {
    address: string;
    family: 4 | 6;
};

export interface PosSyncWebhookTargetValidationResult {
    valid: boolean;
    addressCount: number;
    approvedAddresses?: ApprovedPosSyncWebhookAddress[];
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

        const approvedAddresses = addresses
            .filter((address): address is ApprovedPosSyncWebhookAddress => address.family === 4 || address.family === 6)
            .map((address) => ({ address: address.address, family: address.family }));
        const hasBlockedAddress = approvedAddresses.length !== addresses.length
            || approvedAddresses.some((address) => isBlockedPosSyncNetworkTarget(address.address));
        return {
            valid: !hasBlockedAddress,
            addressCount: addresses.length,
            ...(!hasBlockedAddress ? { approvedAddresses } : {}),
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
