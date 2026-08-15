import { onRequest } from 'firebase-functions/v2/https';
import { ANSWERLATTICE_SECRETS } from '../config/secrets';
import { handleAnswerlatticeEmailOsWebhook } from './webhook';

export const answerlatticeEmailOsWebhook = onRequest(
    {
        region: 'us-central1',
        timeoutSeconds: 30,
        memory: '256MiB',
        maxInstances: 3,
        secrets: [ANSWERLATTICE_SECRETS.RESEND_WEBHOOK_SECRET],
    },
    handleAnswerlatticeEmailOsWebhook,
);
