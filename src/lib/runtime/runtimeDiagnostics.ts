import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError, secureLog } from '@lib/security/secureLogger';

type RuntimeLogContext = Record<string, boolean | number | string | null | undefined>;

export const RUNTIME_CLIPBOARD_COPY_UNAVAILABLE = 'runtime_clipboard_copy_unavailable';
export const RUNTIME_CLIPBOARD_COPY_FALLBACK_FAILED = 'runtime_clipboard_copy_fallback_failed';
const MAX_RUNTIME_DIAGNOSTIC_URL_LENGTH = 500;

export const normalizeRuntimeDiagnosticUrl = (
    value: unknown,
    currentOrigin: unknown,
): string | undefined => {
    if (typeof value !== 'string' || !value || typeof currentOrigin !== 'string' || !currentOrigin) {
        return undefined;
    }

    try {
        const baseUrl = new URL(currentOrigin);
        const url = new URL(value, baseUrl);
        if (
            (url.protocol !== 'https:' && url.protocol !== 'http:')
            || url.username
            || url.password
        ) {
            return undefined;
        }

        const minimized = url.origin === baseUrl.origin
            ? `${url.origin}${url.pathname || '/'}`
            : url.origin;
        return minimized.slice(0, MAX_RUNTIME_DIAGNOSTIC_URL_LENGTH);
    } catch {
        return undefined;
    }
};

export const getBoundedRuntimeStringContext = (
    label: string,
    value: unknown,
): RuntimeLogContext => {
    return getBoundedLogValueContext(label, value);
};

export const hasRuntimeClipboardWrite = (): boolean => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
);

export const hasRuntimeCopyFallback = (): boolean => (
    typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
    && Boolean(document.body)
);

export const copyRuntimeTextToClipboard = async (value: string): Promise<void> => {
    let clipboardWriteError: unknown;

    if (hasRuntimeClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
            // Continue to the acknowledged textarea fallback before surfacing failure.
        }
    }

    if (!hasRuntimeCopyFallback()) {
        throw clipboardWriteError || new Error(RUNTIME_CLIPBOARD_COPY_UNAVAILABLE);
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
            throw new Error(RUNTIME_CLIPBOARD_COPY_FALLBACK_FAILED);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

const getRuntimeErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getRuntimeErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getRuntimeErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

const shouldSkipRuntimeLog = (options: { developmentOnly?: boolean }): boolean => (
    Boolean(options.developmentOnly) && process.env.NODE_ENV !== 'development'
);

export const logRuntimeDiagnostic = (
    diagnosticCode: string,
    context: RuntimeLogContext = {},
    options: { developmentOnly?: boolean } = {},
): void => {
    if (shouldSkipRuntimeLog(options)) return;

    secureLog('[Runtime] Diagnostic', {
        diagnosticCode,
        ...context,
    });
};

export const logRuntimeFailure = (
    failureCode: string,
    error?: unknown,
    context: RuntimeLogContext = {},
    options: { developmentOnly?: boolean } = {},
): void => {
    if (shouldSkipRuntimeLog(options)) return;

    secureError('[Runtime] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getRuntimeErrorName(error),
        sourceErrorCode: getRuntimeErrorCode(error),
        sourceStatusCode: getRuntimeErrorStatus(error),
    });
};
