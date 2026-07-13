import getActiveSession from "@lib/auth/getActiveSession";
import { getSafeUiErrorMessage } from "@lib/errors/uiErrorMessages";
import { secureError } from "@lib/security/secureLogger";
import { showErrorToast } from "@reduxSlices/toast";
import { reduxStore } from "@reduxStore/index";

type DalOperation<T> = () => Promise<T> | T;

const summarizeDalArgs = (args: unknown[]) => args.slice(0, -1).map((arg) => {
    if (arg === null || arg === undefined) return arg;
    if (Array.isArray(arg)) return { type: 'array', length: arg.length };
    if (typeof arg === 'object') {
        return {
            type: 'object',
            keys: Object.keys(arg).slice(0, 8),
        };
    }
    if (typeof arg === 'string') return { type: 'string', length: arg.length };
    return { type: typeof arg };
});

/**
 * API Call Composer for client-side WITHOUT global loader
 * Use this for operations that have their own local loading states
 * (e.g., chat sessions with skeleton UI)
 */
export const apiCallComposerClientWithoutLoader = async <T>(fn: DalOperation<T>, ...args: unknown[]): Promise<T> => {
    const functionName = typeof args[args.length - 1] === 'string' ? args[args.length - 1] : 'unknownDalCall';
    const session = await getActiveSession();
    
    if (!Boolean(session?.user)) {
        reduxStore.dispatch(showErrorToast("User not logged in"));
        throw new Error('dal_client_session_required');
    }

    try {
        // NO startLoader/stopLoader - component manages its own loading state
        const response = await fn();
        return response;
    } catch (error) {
        const fallbackMessage = 'Could not load data. Please try again.';
        secureError('[DAL Client] API call failed', new Error('dal_client_call_failed'), {
            functionName,
            errorName: error instanceof Error ? error.name : typeof error,
            params: summarizeDalArgs(args),
            withLoader: false,
        });
        reduxStore.dispatch(showErrorToast(getSafeUiErrorMessage(error, fallbackMessage)));
        throw error;
    }
}
