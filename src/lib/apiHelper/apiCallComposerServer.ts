import getActiveSession from "@lib/auth/getActiveSession";

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
            console.log(`API call ${functionName} requires a session but none found`);
            return null;
        }
    }

    try {
        console.log(`Executing API call: ${functionName}`);
        const response = await fn(...args); // actual api call
        console.log(`API call ${functionName} completed successfully`);
        return response;
    } catch (error) {
        console.error(`Error in API call: ${functionName}, ${error.message}`);
        console.error(error); // Log the full error for debugging

        // Return an empty array for data fetching operations to avoid 'not a function' errors
        // This makes sure components expecting arrays don't crash
        return [];
    }
}