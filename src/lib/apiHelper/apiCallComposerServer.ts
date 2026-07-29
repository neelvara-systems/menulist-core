import getActiveSession from "@lib/auth/getActiveSession";
import { secureError } from "@lib/security/secureLogger";
import { getBoundedErrorName } from '@lib/monitoring/boundedLogContext';
import { getDalFunctionName, summarizeDalArgs } from './dalDiagnostics';

type DalOperation<T> = () => Promise<T> | T;

export const apiCallComposerServer = async <T>(fn: DalOperation<T>, ...args: unknown[]): Promise<T> => {
    const functionName = getDalFunctionName(args);

    let session = null;
    try {
        session = await getActiveSession();
    } catch (sessionError) {
        secureError('[DAL Server] Session lookup failed', new Error('dal_server_session_lookup_failed'), {
            functionName,
            errorName: getBoundedErrorName(sessionError) || typeof sessionError,
            params: summarizeDalArgs(args),
        });
        throw sessionError;
    }

    if (!Boolean(session?.user)) {
        throw new Error('dal_server_session_required');
    }

    try {
        const response = await fn(); // actual api call
        return response;
    } catch (error) {
        secureError('[DAL Server] API call failed', new Error('dal_server_call_failed'), {
            functionName,
            errorName: getBoundedErrorName(error) || typeof error,
            params: summarizeDalArgs(args),
        });
        throw error;
    }
}
