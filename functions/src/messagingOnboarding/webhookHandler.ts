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
import type { MessagingProvider, NormalizedMessage } from "../types/messagingOnboarding.types";
import { FEATURE_FLAGS } from "./constants";
import { logOnboardingEvent } from "./eventLogger";
import {
  getProviderAdapter,
  getProviderFromWebhookPath,
} from "./providers/providerRegistry";
import { isRetryableMessagingProviderError } from "./providers/IMessagingProvider";
import {
  enqueueInboundMessages,
  getInboundMessageId,
} from "./inboundQueue";
import { getBoundedFunctionsErrorName, getBoundedFunctionsErrorCode, getBoundedFunctionsErrorStatus } from '../utils/boundedErrorContext';

const logger = functions.logger;
const WEBHOOK_QUEUE_FAILED_CODE = "WEBHOOK_QUEUE_FAILED";
const WEBHOOK_PARSE_FAILED_CODE = "WEBHOOK_PARSE_FAILED";

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
    return getBoundedFunctionsErrorName(error) || 'Error';
}

function getWebhookErrorCode(error: Error): string | undefined {
    return getBoundedFunctionsErrorCode(error);
}

function getWebhookErrorStatus(error: Error): number | undefined {
    return getBoundedFunctionsErrorStatus(error);
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

    let normalizedMessages: NormalizedMessage[];
    try {
      normalizedMessages = adapter.parseIncomingMessages(req);
    } catch (parseError) {
      const retryable = isRetryableMessagingProviderError(parseError);
      logger.error("[Webhook] Failed to parse authenticated provider payload", {
        failureCode: WEBHOOK_PARSE_FAILED_CODE,
        provider,
        retryable,
        ...getWebhookRequestLogContext(req),
        ...getWebhookErrorContext(parseError),
      });
      res.status(retryable ? 500 : 200).send(
        retryable ? "Unable to process webhook" : "OK",
      );
      return;
    }

    if (normalizedMessages.length === 0) {
      // Not a user message (status update, etc.) — acknowledge
      res.status(200).send("OK");
      return;
    }

    let queuedMessages: Array<{ messageId: string; created: boolean; userId: string }>;
    try {
      queuedMessages = await enqueueInboundMessages(normalizedMessages);
    } catch (queueError) {
      const firstMessage = normalizedMessages[0];
      logger.error("[Webhook] Failed to persist inbound message batch", {
        failureCode: WEBHOOK_QUEUE_FAILED_CODE,
        batchSize: normalizedMessages.length,
        ...getWebhookInboundLogContext(
          provider,
          getInboundMessageId(firstMessage),
          firstMessage.userId,
        ),
        ...getWebhookErrorContext(queueError),
      });
      // Returning 500 causes the provider to retry the full batch. Deterministic
      // message IDs make any records created before a partial failure idempotent.
      res.status(500).send("Queue unavailable");
      return;
    }

    // Respond only after durable persistence. Provider webhooks must not depend
    // on post-response work; Cloud Functions may freeze execution after ACK.
    // menulistMaintenanceScheduler.messaging_intake drains pending queue items
    // on the next schedule tick.
    res.status(200).send("OK");

    for (const queued of queuedMessages) {
      if (!queued.created) {
        logger.info("[Webhook] Duplicate inbound message acknowledged", {
          ...getWebhookInboundLogContext(
            provider,
            queued.messageId,
            queued.userId,
          ),
        });
      }
    }

    return;
  }

  // Unsupported method
  res.status(405).send("Method Not Allowed");
}
