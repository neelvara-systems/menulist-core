import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { FUNCTION_FLAGS } from "./constants/features";
export { signaldeskMaintenanceScheduler } from "./schedulers/signaldeskMaintenanceScheduler";

export const signaldeskHealthCheck = onRequest(
  {
    region: "us-central1",
    timeoutSeconds: 30,
    memory: "256MiB",
    maxInstances: 1,
  },
  async (_req, res) => {
    if (!FUNCTION_FLAGS.ENABLE_SIGNALDESK_HEALTH_CHECK) {
      res.status(404).json({ error: "SignalDesk functions disabled" });
      return;
    }

    logger.info("[SignalDesk] Health check");
    res.status(200).json({
      ok: true,
      product: "menulist-signaldesk",
      providerWebhooksEnabled: FUNCTION_FLAGS.ENABLE_SIGNALDESK_PROVIDER_WEBHOOKS,
      aiWorkersEnabled: FUNCTION_FLAGS.ENABLE_SIGNALDESK_AI_WORKERS,
      scheduledSummariesEnabled: FUNCTION_FLAGS.ENABLE_SIGNALDESK_SCHEDULED_SUMMARIES,
      proofPermissionLifecycleEnabled: FUNCTION_FLAGS.ENABLE_SIGNALDESK_PROOF_PERMISSION_LIFECYCLE,
      sourceDataLifecycleEnabled: FUNCTION_FLAGS.ENABLE_SIGNALDESK_SOURCE_DATA_LIFECYCLE,
    });
  },
);
