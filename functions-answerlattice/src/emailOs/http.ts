import { onRequest } from 'firebase-functions/v2/https';
import { ANSWERLATTICE_SECRET_GROUPS } from '../config/secrets';
import { handleAnswerlatticeEmailOsWebhook } from './webhook';

export const answerlatticeEmailOsWebhook = onRequest(
    {
        region: 'us-central1',
        timeoutSeconds: 30,
        memory: '256MiB',
        maxInstances: 3,
        // Resend must reach the transport endpoint; the handler authenticates every event signature.
        invoker: 'public',
        secrets: ANSWERLATTICE_SECRET_GROUPS.EMAIL_OS_WEBHOOK,
    },
    handleAnswerlatticeEmailOsWebhook,
);
