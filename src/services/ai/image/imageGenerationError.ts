import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

const IMAGE_GENERATION_ERROR_RESPONSE_MAX_BYTES = 8 * 1024;

type ImageGenerationErrorPayload = {
    error?: unknown;
};

export type ImageGenerationRequestErrorCode =
    | 'feature-unavailable'
    | 'invalid-request'
    | 'invalid-response'
    | 'permission-denied'
    | 'provider-unavailable'
    | 'rate-limited'
    | 'saved-person-unavailable'
    | 'unknown';

export class ImageGenerationRequestError extends Error {
    constructor(
        readonly code: ImageGenerationRequestErrorCode,
        message: string,
        readonly statusCode: number | null,
    ) {
        super(message);
        this.name = 'ImageGenerationRequestError';
        Object.setPrototypeOf(this, ImageGenerationRequestError.prototype);
    }
}

function getSafeErrorCopy(statusCode: number, serverError: string): {
    code: ImageGenerationRequestErrorCode;
    message: string;
} {
    const normalizedServerError = serverError.toLowerCase();
    if (
        (statusCode === 404 || statusCode === 409)
        && normalizedServerError.includes('saved person')
    ) {
        return {
            code: 'saved-person-unavailable',
            message: 'This saved person changed or is no longer available. Choose the person again or continue without one.',
        };
    }
    if (statusCode === 400) {
        return { code: 'invalid-request', message: 'Review the image settings and try again.' };
    }
    if (statusCode === 403) {
        return { code: 'permission-denied', message: 'You do not have access to generate an image for this item.' };
    }
    if (statusCode === 404) {
        return { code: 'feature-unavailable', message: 'Image generation is not available right now.' };
    }
    if (statusCode === 429) {
        return { code: 'rate-limited', message: 'Too many image requests were started. Wait a moment, then try again.' };
    }
    if (statusCode === 502 || statusCode === 503 || statusCode === 504) {
        return { code: 'provider-unavailable', message: 'The image service is temporarily unavailable. Try again shortly.' };
    }
    return { code: 'unknown', message: 'The image could not be generated. Try again.' };
}

export async function createImageGenerationRequestError(response: Response): Promise<ImageGenerationRequestError> {
    let serverError = '';
    try {
        const payload = await readJsonResponseWithLimit<ImageGenerationErrorPayload>(
            response,
            IMAGE_GENERATION_ERROR_RESPONSE_MAX_BYTES,
        );
        serverError = typeof payload?.error === 'string' ? payload.error.slice(0, 240) : '';
    } catch {
        serverError = '';
    }
    const safe = getSafeErrorCopy(response.status, serverError);
    return new ImageGenerationRequestError(safe.code, safe.message, response.status);
}

export function createInvalidImageGenerationResponseError(statusCode: number | null): ImageGenerationRequestError {
    return new ImageGenerationRequestError(
        'invalid-response',
        'The image service returned an incomplete result. Try again.',
        statusCode,
    );
}

export function createUnknownImageGenerationRequestError(): ImageGenerationRequestError {
    return new ImageGenerationRequestError(
        'unknown',
        'The image could not be generated. Check your connection and try again.',
        null,
    );
}
