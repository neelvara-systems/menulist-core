import { secureError } from '@lib/security/secureLogger';

export type ResellerLogContext = Record<string, boolean | number | string | null | undefined>;

export const RESELLER_CLIPBOARD_COPY_UNAVAILABLE = 'reseller_clipboard_copy_unavailable';
export const RESELLER_CLIPBOARD_COPY_FALLBACK_FAILED = 'reseller_clipboard_copy_fallback_failed';
export const RESELLER_REQUEST_POLICY = {
    cache: 'no-store' as RequestCache,
    credentials: 'same-origin' as RequestCredentials,
    redirect: 'manual' as RequestRedirect,
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
