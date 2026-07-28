import { secureError } from "@lib/security/secureLogger";
import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';

type ScreenLogContext = Record<string, boolean | number | string | null | undefined>;

export const SCREEN_CLIPBOARD_COPY_UNAVAILABLE = "screen_clipboard_copy_unavailable";
export const SCREEN_CLIPBOARD_COPY_FALLBACK_FAILED = "screen_clipboard_copy_fallback_failed";

export const getBoundedScreenStringContext = (
    label: string,
    value: unknown,
): ScreenLogContext => {
    return getBoundedLogValueContext(label, value);
};

export const hasScreenClipboardWrite = (): boolean => (
    typeof navigator !== "undefined"
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === "function"
);

export const hasScreenCopyFallback = (): boolean => (
    typeof document !== "undefined"
    && typeof document.createElement === "function"
    && typeof document.execCommand === "function"
    && Boolean(document.body)
);

export const copyScreenTextToClipboard = async (value: string): Promise<void> => {
    let clipboardWriteError: unknown;

    if (hasScreenClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
        }
    }

    if (!hasScreenCopyFallback()) {
        throw clipboardWriteError || new Error(SCREEN_CLIPBOARD_COPY_UNAVAILABLE);
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
        const copied = document.execCommand("copy");
        if (!copied) {
            throw new Error(SCREEN_CLIPBOARD_COPY_FALLBACK_FAILED);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

const getScreenErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getScreenErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getScreenErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

export const logScreenSettingsFailure = (
    failureCode: string,
    error?: unknown,
    context: ScreenLogContext = {},
): void => {
    secureError("[Digital Screen] Settings operation failed", new Error(failureCode), {
        ...context,
        sourceErrorName: getScreenErrorName(error),
        sourceErrorCode: getScreenErrorCode(error),
        sourceStatusCode: getScreenErrorStatus(error),
    });
};

export const logScreenDisplayFailure = (
    failureCode: string,
    error?: unknown,
    context: ScreenLogContext = {},
): void => {
    secureError("[Digital Screen] Display operation failed", new Error(failureCode), {
        ...context,
        sourceErrorName: getScreenErrorName(error),
        sourceErrorCode: getScreenErrorCode(error),
        sourceStatusCode: getScreenErrorStatus(error),
    });
};
