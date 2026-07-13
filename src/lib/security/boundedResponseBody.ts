export class ResponseBodyTooLargeError extends Error {
    readonly code = 'RESPONSE_BODY_TOO_LARGE';
    readonly maxBytes: number;
    readonly receivedBytes: number;

    constructor(maxBytes: number, receivedBytes: number) {
        super('Response body is too large.');
        this.name = 'ResponseBodyTooLargeError';
        this.maxBytes = maxBytes;
        this.receivedBytes = receivedBytes;
    }
}

export function isResponseBodyTooLargeError(error: unknown): error is ResponseBodyTooLargeError {
    return error instanceof ResponseBodyTooLargeError
        || Boolean(error && typeof error === 'object' && (error as { code?: unknown }).code === 'RESPONSE_BODY_TOO_LARGE');
}

function assertValidResponseBodyLimit(maxBytes: number): void {
    if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
        throw new RangeError('Response body limit must be a positive safe integer.');
    }
}

export async function readResponseUint8ArrayWithLimit(response: Response, maxBytes: number): Promise<Uint8Array> {
    assertValidResponseBodyLimit(maxBytes);
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
        throw new ResponseBodyTooLargeError(maxBytes, contentLength);
    }

    if (!response.body) {
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > maxBytes) {
            throw new ResponseBodyTooLargeError(maxBytes, arrayBuffer.byteLength);
        }
        return new Uint8Array(arrayBuffer);
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
            if (totalBytes > maxBytes) {
                await reader.cancel().catch(() => undefined);
                throw new ResponseBodyTooLargeError(maxBytes, totalBytes);
            }
            chunks.push(value);
        }
    } finally {
        reader.releaseLock();
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }

    return bytes;
}

export async function readJsonResponseWithLimit<T = unknown>(response: Response, maxBytes: number): Promise<T | null> {
    const bytes = await readResponseUint8ArrayWithLimit(response, maxBytes);
    if (!bytes.byteLength) return null;
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as T;
}
