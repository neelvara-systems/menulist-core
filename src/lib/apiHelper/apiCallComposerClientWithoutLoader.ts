import getActiveSession from "@lib/auth/getActiveSession";
import { getSafeUiErrorMessage } from "@lib/errors/uiErrorMessages";
import { secureError } from "@lib/security/secureLogger";
import { showErrorToast } from "@reduxSlices/toast";
import { reduxStore } from "@reduxStore/index";
import { getBoundedErrorName } from '@lib/monitoring/boundedLogContext';
import { getDalFunctionName, summarizeDalArgs } from './dalDiagnostics';

type DalOperation<T> = () => Promise<T> | T;

/**
 * API Call Composer for client-side WITHOUT global loader
 * Use this for operations that have their own local loading states
 * (e.g., chat sessions with skeleton UI)
 */
export const apiCallComposerClientWithoutLoader = async <T>(fn: DalOperation<T>, ...args: unknown[]): Promise<T> => {
    const functionName = getDalFunctionName(args);
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
            errorName: getBoundedErrorName(error) || typeof error,
            params: summarizeDalArgs(args),
            withLoader: false,
        });
        reduxStore.dispatch(showErrorToast(getSafeUiErrorMessage(error, fallbackMessage)));
        throw error;
    }
}
