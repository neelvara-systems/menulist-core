import { getBoundedLogValueContext } from '@lib/monitoring/boundedLogContext';
import { secureError } from '@lib/security/secureLogger';

type ExportLogContext = Record<string, boolean | number | string | null | undefined>;

export const EXPORT_CLIPBOARD_COPY_UNAVAILABLE = 'export_clipboard_copy_unavailable';
export const EXPORT_CLIPBOARD_COPY_FALLBACK_FAILED = 'export_clipboard_copy_fallback_failed';

export const getBoundedExportStringContext = (
    label: string,
    value: unknown,
): ExportLogContext => {
    return getBoundedLogValueContext(label, value);
};

export const hasExportClipboardWrite = (): boolean => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
);

export const hasExportCopyFallback = (): boolean => (
    typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
    && Boolean(document.body)
);

export const copyExportTextToClipboard = async (value: string): Promise<void> => {
    let clipboardWriteError: unknown;

    if (hasExportClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
            // Continue to the acknowledged textarea fallback before reporting failure.
        }
    }

    if (!hasExportCopyFallback()) {
        throw clipboardWriteError || new Error(EXPORT_CLIPBOARD_COPY_UNAVAILABLE);
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
            throw new Error(EXPORT_CLIPBOARD_COPY_FALLBACK_FAILED);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

const getExportErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getExportErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getExportErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
};

export const logExportFailure = (
    failureCode: string,
    error?: unknown,
    context: ExportLogContext = {},
): void => {
    secureError('[Menu Export] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getExportErrorName(error),
        sourceErrorCode: getExportErrorCode(error),
        sourceStatusCode: getExportErrorStatus(error),
    });
};
