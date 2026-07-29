import { NextResponse } from 'next/server';

type BoundedBodyOptions = {
    invalidFormDataMessage?: string;
    invalidJsonMessage?: string;
    invalidRequestMessage?: string;
    tooLargeMessage?: string;
};

export type BoundedTextBodyResult =
    | { ok: true; body: string }
    | { ok: false; response: NextResponse };

export type BoundedArrayBufferBodyResult =
    | { ok: true; body: ArrayBuffer }
    | { ok: false; response: NextResponse };

export type BoundedFormDataBodyResult =
    | { ok: true; formData: FormData }
    | { ok: false; response: NextResponse };

export type BoundedJsonBodyResult =
    | { ok: true; data: unknown }
    | { ok: false; response: NextResponse };

const defaultOptions: Required<BoundedBodyOptions> = {
    invalidFormDataMessage: 'Invalid form data.',
    invalidJsonMessage: 'Invalid JSON body.',
    invalidRequestMessage: 'Invalid request.',
    tooLargeMessage: 'Request body too large.',
};

const getOptions = (options?: BoundedBodyOptions): Required<BoundedBodyOptions> => ({
    ...defaultOptions,
    ...(options || {}),
});

export function rejectInvalidOrOversizedDeclaredBody(
    request: Request,
    maxBytes: number,
    options?: BoundedBodyOptions,
): NextResponse | null {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
        throw new RangeError('maxBytes must be a non-negative safe integer.');
    }

    const messages = getOptions(options);
    const contentLengthHeader = request.headers.get('content-length');
    if (!contentLengthHeader) return null;

    if (!/^\d+$/.test(contentLengthHeader)) {
        return NextResponse.json({ error: messages.invalidRequestMessage }, { status: 400 });
    }

    const contentLength = Number(contentLengthHeader);
    if (!Number.isSafeInteger(contentLength)) {
        return NextResponse.json({ error: messages.invalidRequestMessage }, { status: 400 });
    }

    if (contentLength > maxBytes) {
        return NextResponse.json({ error: messages.tooLargeMessage }, { status: 413 });
    }

    return null;
}

export async function readBoundedTextBody(
    request: Request,
    maxBytes: number,
    options?: BoundedBodyOptions,
): Promise<BoundedTextBodyResult> {
    const declaredBodyResponse = rejectInvalidOrOversizedDeclaredBody(request, maxBytes, options);
    if (declaredBodyResponse) {
        return { ok: false, response: declaredBodyResponse };
    }

    if (!request.body) {
        return { ok: true, body: '' };
    }

    const messages = getOptions(options);
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;

        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
            await reader.cancel().catch(() => undefined);
            return {
                ok: false,
                response: NextResponse.json({ error: messages.tooLargeMessage }, { status: 413 }),
            };
        }

        chunks.push(value);
    }

    return {
        ok: true,
        body: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), totalBytes).toString('utf8'),
    };
}

export async function readBoundedArrayBufferBody(
    request: Request,
    maxBytes: number,
    options?: BoundedBodyOptions,
): Promise<BoundedArrayBufferBodyResult> {
    const declaredBodyResponse = rejectInvalidOrOversizedDeclaredBody(request, maxBytes, options);
    if (declaredBodyResponse) {
        return { ok: false, response: declaredBodyResponse };
    }

    if (!request.body) {
        return { ok: true, body: new ArrayBuffer(0) };
    }

    const messages = getOptions(options);
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;

        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
            await reader.cancel().catch(() => undefined);
            return {
                ok: false,
                response: NextResponse.json({ error: messages.tooLargeMessage }, { status: 413 }),
            };
        }

        chunks.push(value);
    }

    const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), totalBytes);
    const body = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return { ok: true, body };
}

export async function readBoundedFormDataBody(
    request: Request,
    maxBytes: number,
    options?: BoundedBodyOptions,
): Promise<BoundedFormDataBodyResult> {
    const arrayBufferResult = await readBoundedArrayBufferBody(request, maxBytes, options);
    if (arrayBufferResult.ok === false) return arrayBufferResult;

    const messages = getOptions(options);
    const contentType = request.headers.get('content-type') || '';

    try {
        const formRequest = new Request(request.url, {
            body: arrayBufferResult.body,
            headers: { 'content-type': contentType },
            method: request.method,
        });
        return { ok: true, formData: await formRequest.formData() };
    } catch {
        return {
            ok: false,
            response: NextResponse.json({ error: messages.invalidFormDataMessage }, { status: 400 }),
        };
    }
}

export async function readBoundedJsonBody(
    request: Request,
    maxBytes: number,
    options?: BoundedBodyOptions,
): Promise<BoundedJsonBodyResult> {
    const textResult = await readBoundedTextBody(request, maxBytes, options);
    if (textResult.ok === false) return textResult;

    try {
        return { ok: true, data: JSON.parse(textResult.body) };
    } catch {
        const messages = getOptions(options);
        return {
            ok: false,
            response: NextResponse.json({ error: messages.invalidJsonMessage }, { status: 400 }),
        };
    }
}

export async function readOptionalBoundedJsonBody(
    request: Request,
    maxBytes: number,
    options?: BoundedBodyOptions,
): Promise<BoundedJsonBodyResult> {
    const textResult = await readBoundedTextBody(request, maxBytes, options);
    if (textResult.ok === false) return textResult;

    if (!textResult.body.trim()) {
        return { ok: true, data: {} };
    }

    try {
        return { ok: true, data: JSON.parse(textResult.body) };
    } catch {
        const messages = getOptions(options);
        return {
            ok: false,
            response: NextResponse.json({ error: messages.invalidJsonMessage }, { status: 400 }),
        };
    }
}
