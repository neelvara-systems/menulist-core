export const INTEGRATION_PROVIDER_JSON_MAX_BYTES = 64 * 1024;

export const INTEGRATION_PROVIDER_FETCH_POLICY: Pick<RequestInit, 'redirect'> = {
    // Provider calls must never follow a redirect away from the validated or
    // fixed provider origin.
    redirect: 'error',
};

export class IntegrationProviderResponseTooLargeError extends Error {
    readonly code = 'ANSWERLATTICE_INTEGRATION_PROVIDER_RESPONSE_TOO_LARGE';

    constructor() {
        super('Integration provider response exceeded the configured limit.');
        this.name = 'IntegrationProviderResponseTooLargeError';
    }
}

export function isIntegrationProviderRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export async function readIntegrationProviderJson(response: Response): Promise<unknown> {
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > INTEGRATION_PROVIDER_JSON_MAX_BYTES) {
        throw new IntegrationProviderResponseTooLargeError();
    }

    if (!response.body) {
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength > INTEGRATION_PROVIDER_JSON_MAX_BYTES) {
            throw new IntegrationProviderResponseTooLargeError();
        }
        return bytes.byteLength > 0
            ? JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
            : null;
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!value?.byteLength) continue;
            totalBytes += value.byteLength;
            if (totalBytes > INTEGRATION_PROVIDER_JSON_MAX_BYTES) {
                await reader.cancel().catch(() => undefined);
                throw new IntegrationProviderResponseTooLargeError();
            }
            chunks.push(value);
        }
    } finally {
        reader.releaseLock();
    }

    if (totalBytes === 0) return null;
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}
