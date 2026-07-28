import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
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
    return getBoundedErrorName(error);
};

const getExportErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getExportErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
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
