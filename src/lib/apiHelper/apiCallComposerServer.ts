import getActiveSession from "@lib/auth/getActiveSession";
import { secureError } from "@lib/security/secureLogger";

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

export const apiCallComposerServer = async (fn, ...args) => {
    // Get the function name (last argument)
    const functionName = args[args.length - 1];

    // List of webhook-related functions that don't require a user session
    const ignoredFunctionsList = [
        'createSubscriptionPayment',
        'getSubscriptionById',
        'cancelSubscription',
        'updateUserSubscription',
        'updateImageBatchProcessingJob',
        'getImageBatchProcessingJobById',
        'addPlatformUser',
        'updatePlatformUser',
        'updateTopupOrder',
        'getSubscriptionByProviderId',
        'updateSubscription',
        'getSubscriptionById',
        'getTopupByProviderOrderId',
        'createInitialTopupEntry',
        'getTopupById',
        'createInitialSubscription',
        'getSubscriptionById',
        'createPaymentTransaction'
    ];

    // Check if this is a webhook-related function call
    const isIgnoredFunctionCall = ignoredFunctionsList.includes(functionName);

    // Only require session for non-webhook calls
    if (!isIgnoredFunctionCall) {
        const session = await getActiveSession().catch(() => null);
        if (!Boolean(session?.user)) {
            return null;
        }
    }

    try {
        const response = await fn(...args); // actual api call
        return response;
    } catch (error) {
        secureError('[DAL Server] API call failed', new Error('dal_server_call_failed'), {
            functionName,
            errorName: error instanceof Error ? error.name : typeof error,
            params: summarizeDalArgs(args),
            ignoredSessionFunction: isIgnoredFunctionCall,
        });

        // Return an empty array for data fetching operations to avoid 'not a function' errors
        // This makes sure components expecting arrays don't crash
        return [];
    }
}
