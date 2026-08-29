import getActiveSession from "@lib/auth/getActiveSession";
import { getProjectDeleteSafeUiMessage } from "@lib/errors/projectDeleteErrors";
import { getSafeUiErrorMessage } from "@lib/errors/uiErrorMessages";
import { secureError } from "@lib/security/secureLogger";
import { startLoader, stopLoader } from "@reduxSlices/loader";
import { showErrorToast } from "@reduxSlices/toast";
import { reduxStore } from "@reduxStore/index";
import { getBoundedErrorCode, getBoundedErrorName } from '@lib/monitoring/boundedLogContext';
import {
    createDalLoaderRequestId,
    getDalFunctionName,
    summarizeDalArgs,
} from './dalDiagnostics';

type DalOperation<T> = () => Promise<T> | T;

export const apiCallComposerClient = async <T>(fn: DalOperation<T>, ...args: unknown[]): Promise<T> => {
    const functionName = getDalFunctionName(args);
    const session = await getActiveSession();
    if (!Boolean(session?.user)) {
        reduxStore.dispatch(showErrorToast("User not logged in"));
        throw new Error('dal_client_session_required');
    }

    const requestId = createDalLoaderRequestId();
    try {
        reduxStore.dispatch(startLoader(requestId))
        const response = await fn();
        return response;
    } catch (error) {
        const fallbackMessage = 'Could not load data. Please try again.';
        const expectedProjectDeleteMessage = getProjectDeleteSafeUiMessage(getBoundedErrorCode(error));
        if (!expectedProjectDeleteMessage) {
            secureError('[DAL Client] API call failed', new Error('dal_client_call_failed'), {
                functionName,
                errorName: getBoundedErrorName(error) || typeof error,
                params: summarizeDalArgs(args),
                withLoader: true,
            });
        }
        reduxStore.dispatch(showErrorToast(getSafeUiErrorMessage(error, fallbackMessage)));
        throw error;
    } finally {
        reduxStore.dispatch(stopLoader(requestId));
    }
}
