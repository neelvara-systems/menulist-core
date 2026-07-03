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
import type { MessagingProvider } from "../types/messagingOnboarding.types";
import { FEATURE_FLAGS } from "./constants";
import { logOnboardingEvent } from "./eventLogger";
import {
  getProviderAdapter,
  getProviderFromWebhookPath,
} from "./providers/providerRegistry";
import {
  enqueueInboundMessage,
  getInboundMessageId,
} from "./inboundQueue";

const logger = functions.logger;
const WEBHOOK_QUEUE_FAILED_CODE = "WEBHOOK_QUEUE_FAILED";

function getWebhookBoundedStringContext(
  label: string,
  value: unknown,
): Record<string, boolean | number> {
  const normalized = value === undefined || value === null ? "" : String(value);
  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
}

function getWebhookErrorName(error: unknown): string {
  if (error instanceof Error) return (error.name || "Error").slice(0, 80);
  return typeof error;
}

function getWebhookErrorCode(error: Error): string | undefined {
  const code = (error as { code?: unknown }).code;
  if (code === undefined || code === null) return undefined;
  return String(code).slice(0, 64);
}

function getWebhookErrorStatus(error: Error): number | undefined {
  const status = Number((error as { status?: unknown; statusCode?: unknown }).status
    || (error as { statusCode?: unknown }).statusCode);
  return Number.isFinite(status) ? status : undefined;
}

function getWebhookErrorContext(error: unknown): {
  sourceErrorName: string;
  sourceErrorCode?: string;
  sourceErrorStatus?: number;
} {
  if (error instanceof Error) {
    return {
      sourceErrorName: getWebhookErrorName(error),
      sourceErrorCode: getWebhookErrorCode(error),
      sourceErrorStatus: getWebhookErrorStatus(error),
    };
  }

  return {
    sourceErrorName: getWebhookErrorName(error),
  };
}

function getWebhookRequestLogContext(
  req: functions.https.Request,
): Record<string, boolean | number | string> {
  return {
    method: req.method,
    ...getWebhookBoundedStringContext("path", req.path),
    ...getWebhookBoundedStringContext("ip", req.ip),
  };
}

function getWebhookInboundLogContext(
  provider: MessagingProvider,
  messageId: string,
  userId: string,
): Record<string, boolean | number | string> {
  return {
    provider,
    ...getWebhookBoundedStringContext("messageId", messageId),
    ...getWebhookBoundedStringContext("providerUserId", userId),
  };
}

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
    logger.info(
      "[Webhook] Unknown or disabled provider",
      getWebhookRequestLogContext(req),
    );
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
        ...getWebhookRequestLogContext(req),
      });

      logOnboardingEvent({
        sessionId: "no-session",
        provider,
        eventType: "WEBHOOK_SIGNATURE_INVALID",
        sessionState: "COLLECTING_INPUT",
        userIdMasked: "****",
        metadata: {
          ...getWebhookBoundedStringContext("ip", req.ip),
        },
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
        failureCode: WEBHOOK_QUEUE_FAILED_CODE,
        ...getWebhookInboundLogContext(
          provider,
          getInboundMessageId(normalizedMsg),
          normalizedMsg.userId,
        ),
        ...getWebhookErrorContext(queueError),
      });
      res.status(500).send("Queue unavailable");
      return;
    }

    // Respond only after durable persistence. Provider webhooks must not depend
    // on post-response work; Cloud Functions may freeze execution after ACK.
    // menulistMaintenanceScheduler.messaging_intake drains pending queue items
    // on the next schedule tick.
    res.status(200).send("OK");

    if (!queued.created) {
      logger.info("[Webhook] Duplicate inbound message acknowledged", {
        ...getWebhookInboundLogContext(
          provider,
          queued.messageId,
          normalizedMsg.userId,
        ),
      });
      return;
    }

    return;
  }

  // Unsupported method
  res.status(405).send("Method Not Allowed");
}
