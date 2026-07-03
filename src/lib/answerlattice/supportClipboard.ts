export type AnswerlatticeSupportClipboardFailureCodes = {
    unavailable: string;
    fallbackFailed: string;
};

export const hasAnswerlatticeSupportClipboardWrite = (): boolean => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
);

export const hasAnswerlatticeSupportCopyFallback = (): boolean => (
    typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
    && Boolean(document.body)
);

export const copyAnswerlatticeSupportTextToClipboard = async (
    value: string,
    failureCodes: AnswerlatticeSupportClipboardFailureCodes,
): Promise<void> => {
    let clipboardWriteError: unknown;

    if (hasAnswerlatticeSupportClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
            // Continue to the acknowledged textarea fallback before reporting failure.
        }
    }

    if (!hasAnswerlatticeSupportCopyFallback()) {
        throw clipboardWriteError || new Error(failureCodes.unavailable);
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
            throw new Error(failureCodes.fallbackFailed);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};
