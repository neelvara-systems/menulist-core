/**
 * Webhook Handler — Receives webhooks, routes to provider adapter
 *
 * Uses onRequest (first in codebase — §19.1).
 * Must respond with 200 within 5 seconds.
 *
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §4.1
 */

import type { Response } from "express";
import * as functions from "firebase-functions";
import { FEATURE_FLAGS } from "./constants";
import { logOnboardingEvent } from "./eventLogger";
import {
  getProviderAdapter,
  getProviderFromWebhookPath,
} from "./providers/providerRegistry";
import {
  enqueueInboundMessage,
  processQueuedInboundMessage,
} from "./inboundQueue";

const logger = functions.logger;

/**
 * Main webhook handler for all messaging providers.
 * Route: /messagingOnboarding/{provider}
 *
 * GET: Webhook verification challenge
 * POST: Incoming messages
 */
export async function messagingOnboardingWebhook(
  req: functions.https.Request,
  res: Response,
): Promise<void> {
  // Step 1: Feature flag check — FIRST line (impl.md §15)
  if (!FEATURE_FLAGS.ENABLE_MESSAGING_ONBOARDING) {
    res.status(200).send("OK");
    return;
  }

  // Resolve provider from URL path
  const provider = getProviderFromWebhookPath(req.path);

  // Step 2: Provider enabled check
  if (
    !provider ||
    !FEATURE_FLAGS.MESSAGING_ONBOARDING_PROVIDERS.includes(provider)
  ) {
    logger.info("[Webhook] Unknown or disabled provider", { path: req.path });
    res.status(200).send("OK");
    return;
  }

  const adapter = getProviderAdapter(provider);

  // Handle GET — webhook verification challenge
  if (req.method === "GET") {
    if (adapter.handleWebhookChallenge) {
      const challenge = adapter.handleWebhookChallenge(req);
      if (challenge) {
        res.status(200).send(challenge);
        return;
      }
    }
    res.status(403).send("Forbidden");
    return;
  }

  // Handle POST — incoming messages
  if (req.method === "POST") {
    // Verify webhook signature
    if (!adapter.verifyWebhook(req)) {
      logger.warn("[Webhook] Invalid signature", {
        provider,
        ip: req.ip,
      });

      logOnboardingEvent({
        sessionId: "no-session",
        provider,
        eventType: "WEBHOOK_SIGNATURE_INVALID",
        sessionState: "COLLECTING_INPUT",
        userIdMasked: "****",
        metadata: { ip: req.ip },
      });

      // Return 200 to prevent Meta from retrying invalid requests
      res.status(200).send("OK");
      return;
    }

    // Parse incoming message
    const normalizedMsg = adapter.parseIncomingMessage(req);

    if (!normalizedMsg) {
      // Not a user message (status update, etc.) — acknowledge
      res.status(200).send("OK");
      return;
    }

    let queued;
    try {
      queued = await enqueueInboundMessage(normalizedMsg);
    } catch (queueError) {
      logger.error("[Webhook] Failed to persist inbound message", {
        provider,
        userId: normalizedMsg.userId.slice(-4),
        error: (queueError as Error).message,
      });
      res.status(500).send("Queue unavailable");
      return;
    }

    // Respond only after durable persistence. Meta requires a quick response,
    // and the scheduled intake processor will retry pending messages if this
    // post-ack processing attempt is interrupted.
    res.status(200).send("OK");

    if (!queued.created) {
      logger.info("[Webhook] Duplicate inbound message acknowledged", {
        provider,
        messageId: queued.messageId,
        userId: normalizedMsg.userId.slice(-4),
      });
      return;
    }

    // Best-effort immediate drain after acknowledgement.
    try {
      await processQueuedInboundMessage(queued.messageId);
    } catch (err) {
      // INV-1: Safe-Ignore Principle — never crash on unexpected input
      logger.error("[Webhook] Error processing message", {
        provider,
        error: (err as Error).message,
        stack: (err as Error).stack?.slice(0, 500),
      });
    }

    return;
  }

  // Unsupported method
  res.status(405).send("Method Not Allowed");
}
