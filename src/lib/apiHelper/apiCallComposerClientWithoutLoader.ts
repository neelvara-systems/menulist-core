import getActiveSession from "@lib/auth/getActiveSession";
import { showErrorToast } from "@reduxSlices/toast";
import { reduxStore } from "@reduxStore/index";

/**
 * API Call Composer for client-side WITHOUT global loader
 * Use this for operations that have their own local loading states
 * (e.g., chat sessions with skeleton UI)
 */
export const apiCallComposerClientWithoutLoader = async (fn, ...args) => {
    console.log("apiCallComposerClientWithoutLoader called:", args);
    const isPublicApi = args[args.length - 1];
    const session = await getActiveSession();
    
    if (!Boolean(session?.user) && !isPublicApi) {
        reduxStore.dispatch(showErrorToast("User not logged in"));
        return null;
    }

    try {
        // NO startLoader/stopLoader - component manages its own loading state
        const response = await fn(...args);
        return response;
    } catch (error) {
        console.error(`Error in API call: ${args[args.length - 1]}, ${error.message}`);
        reduxStore.dispatch(showErrorToast(`Error: ${error.message}`));
        
        // Return an empty array for data fetching operations to avoid 'not a function' errors
        return [];
    }
}
