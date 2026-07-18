import { secureError } from '@lib/security/secureLogger';
import { createRuntimeUuid } from '@lib/runtime/randomId';

export type ResellerLogContext = Record<string, boolean | number | string | null | undefined>;

export const RESELLER_CLIPBOARD_COPY_UNAVAILABLE = 'reseller_clipboard_copy_unavailable';
export const RESELLER_CLIPBOARD_COPY_FALLBACK_FAILED = 'reseller_clipboard_copy_fallback_failed';
export const RESELLER_REQUEST_POLICY = {
    cache: 'no-store' as RequestCache,
    credentials: 'same-origin' as RequestCredentials,
    redirect: 'manual' as RequestRedirect,
};

const RESELLER_OPERATION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const hashResellerOperationIntent = (value: string, seed: number): string => {
    let hash = seed >>> 0;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
};

/** Creates a non-PII session-storage key while keeping retries input-specific. */
export const getResellerOperationIntentKey = (namespace: string, input: unknown): string => {
    const serialized = JSON.stringify(input);
    return `${namespace}:${hashResellerOperationIntent(serialized, 0x811c9dc5)}${hashResellerOperationIntent(serialized, 0x9e3779b9)}`;
};

export const getOrCreateResellerOperationId = (intentKey: string): string => {
    const storageKey = `menulist:reseller-operation:${intentKey}`;
    if (typeof sessionStorage !== 'undefined') {
        const existing = sessionStorage.getItem(storageKey);
        if (existing && RESELLER_OPERATION_ID_PATTERN.test(existing)) return existing;
    }

    const operationId = createRuntimeUuid();
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(storageKey, operationId);
    return operationId;
};

export const clearResellerOperationId = (intentKey: string): void => {
    if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(`menulist:reseller-operation:${intentKey}`);
    }
};

export const getBoundedResellerStringContext = (
    label: string,
    value: unknown,
): ResellerLogContext => {
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

export const hasResellerClipboardWrite = (): boolean => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
);

export const hasResellerCopyFallback = (): boolean => (
    typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
    && Boolean(document.body)
);

export const copyResellerTextToClipboard = async (value: string): Promise<void> => {
    let clipboardWriteError: unknown;

    if (hasResellerClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
            // Continue to the acknowledged textarea fallback before showing failure copy.
        }
    }

    if (!hasResellerCopyFallback()) {
        throw clipboardWriteError || new Error(RESELLER_CLIPBOARD_COPY_UNAVAILABLE);
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
        const copied = document.execCommand('copy');
        if (!copied) {
            throw new Error(RESELLER_CLIPBOARD_COPY_FALLBACK_FAILED);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

const getResellerErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getResellerErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    const normalized = String(code).slice(0, 64);
    return /^[a-zA-Z0-9._:/-]+$/.test(normalized) ? normalized : 'non_standard_code';
};

const getResellerErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
};

export const createResellerStatusError = (
    failureCode: string,
    status?: number,
): Error & { code: string; status?: number } => Object.assign(new Error(failureCode), {
    code: failureCode,
    status,
});

export const logResellerFailure = (
    failureCode: string,
    error?: unknown,
    context: ResellerLogContext = {},
): void => {
    secureError('[Reseller] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getResellerErrorName(error),
        sourceErrorCode: getResellerErrorCode(error),
        sourceStatusCode: getResellerErrorStatus(error),
    });
};
