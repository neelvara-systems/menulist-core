import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError } from '@lib/security/secureLogger';

type HelpChatLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedHelpChatStringContext = (
    label: string,
    value: unknown,
): HelpChatLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getHelpChatErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getHelpChatErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getHelpChatErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

export const logHelpChatFailure = (
    failureCode: string,
    error?: unknown,
    context: HelpChatLogContext = {},
): void => {
    secureError('[Help Chat] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getHelpChatErrorName(error),
        sourceErrorCode: getHelpChatErrorCode(error),
        sourceStatusCode: getHelpChatErrorStatus(error),
    });
};
