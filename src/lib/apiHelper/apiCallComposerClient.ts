import getActiveSession from "@lib/auth/getActiveSession";
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
    return arg;
});

const DAL_LOG_BADGE = 'background: #ff8f1f; color: #111827; padding: 2px 6px; border-radius: 999px; font-weight: 700;';
const DAL_LOG_TEXT = 'color: #ff8f1f; font-weight: 700;';
const DAL_SUCCESS_TEXT = 'color: #16a34a; font-weight: 700;';
const DAL_ERROR_TEXT = 'color: #dc2626; font-weight: 700;';

export const apiCallComposerClient = async (fn, ...args) => {
    const functionName = args[args.length - 1];
    const isPublicApi = functionName;
    console.log(`%c🔥 Firebase%c ${functionName} called`, DAL_LOG_BADGE, DAL_LOG_TEXT, {
        params: summarizeDalArgs(args),
        withLoader: true,
    });
    const session = await getActiveSession();
    if (!Boolean(session?.user) && !isPublicApi) {
        reduxStore.dispatch(showErrorToast("User not logged in"));
        return null;
    }

    const requestId = `${args[0]}_${Date.now()}`;
    try {
        reduxStore.dispatch(startLoader(requestId))
        const response = await fn(...args);
        reduxStore.dispatch(stopLoader(requestId))
        console.log(`%c🔥 Firebase%c ${functionName} success`, DAL_LOG_BADGE, DAL_SUCCESS_TEXT);
        return response;
    } catch (error) {
        console.error(`%c🔥 Firebase%c ${functionName} failed`, DAL_LOG_BADGE, DAL_ERROR_TEXT, {
            error: error.message,
            params: summarizeDalArgs(args),
        });
        reduxStore.dispatch(stopLoader(requestId));
        reduxStore.dispatch(showErrorToast(`Error: ${error.message}`));
        
        // Return an empty array for data fetching operations to avoid 'not a function' errors
        // This makes sure components expecting arrays don't crash
        return [];
    }
}
