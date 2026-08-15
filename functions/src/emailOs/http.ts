import { onRequest } from 'firebase-functions/v2/https';
import { SECRETS } from '../config/secrets';
import { handleMenuListEmailOsWebhook } from './webhook';

export const menulistEmailOsWebhook = onRequest(
    {
        region: 'us-central1',
        timeoutSeconds: 30,
        memory: '256MiB',
        maxInstances: 3,
        secrets: [SECRETS.MENULIST_RESEND_WEBHOOK_SECRET],
    },
    handleMenuListEmailOsWebhook,
);
