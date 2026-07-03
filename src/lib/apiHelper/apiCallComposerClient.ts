import getActiveSession from "@lib/auth/getActiveSession";
import { getSafeUiErrorMessage } from "@lib/errors/uiErrorMessages";
import { secureError } from "@lib/security/secureLogger";
import { startLoader, stopLoader } from "@reduxSlices/loader";
import { showErrorToast } from "@reduxSlices/toast";
import { reduxStore } from "@reduxStore/index";

const summarizeDalArgs = (args: any[]) => args.slice(0, -1).map((arg) => {
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

export const apiCallComposerClient = async (fn, ...args) => {
    const functionName = typeof args[args.length - 1] === 'string' ? args[args.length - 1] : 'unknownDalCall';
    const session = await getActiveSession();
    if (!Boolean(session?.user)) {
        reduxStore.dispatch(showErrorToast("User not logged in"));
        return null;
    }

    const requestId = `${args[0]}_${Date.now()}`;
    try {
        reduxStore.dispatch(startLoader(requestId))
        const response = await fn(...args);
        reduxStore.dispatch(stopLoader(requestId))
        return response;
    } catch (error) {
        const fallbackMessage = 'Could not load data. Please try again.';
        secureError('[DAL Client] API call failed', new Error('dal_client_call_failed'), {
            functionName,
            errorName: error instanceof Error ? error.name : typeof error,
            params: summarizeDalArgs(args),
            withLoader: true,
        });
        reduxStore.dispatch(stopLoader(requestId));
        reduxStore.dispatch(showErrorToast(getSafeUiErrorMessage(error, fallbackMessage)));
        
        // Return an empty array for data fetching operations to avoid 'not a function' errors
        // This makes sure components expecting arrays don't crash
        return [];
    }
}
