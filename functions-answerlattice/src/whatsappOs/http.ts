import { onRequest } from 'firebase-functions/v2/https';
import { ANSWERLATTICE_SECRET_GROUPS } from '../config/secrets';
import { handleAnswerlatticeWhatsAppOsWebhook } from './webhook';

export const answerlatticeWhatsAppOsWebhook = onRequest(
    {
        region: 'us-central1',
        timeoutSeconds: 30,
        memory: '256MiB',
        maxInstances: 3,
        secrets: ANSWERLATTICE_SECRET_GROUPS.WHATSAPP_OS_WEBHOOK,
    },
    handleAnswerlatticeWhatsAppOsWebhook,
);
