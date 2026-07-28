import getActiveSession from "@lib/auth/getActiveSession";
import { secureError } from "@lib/security/secureLogger";
import { getBoundedErrorName } from '@lib/monitoring/boundedLogContext';

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

export const apiCallComposerServer = async <T>(fn: DalOperation<T>, ...args: unknown[]): Promise<T> => {
    // Get the function name (last argument)
    const functionName = args[args.length - 1];

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
