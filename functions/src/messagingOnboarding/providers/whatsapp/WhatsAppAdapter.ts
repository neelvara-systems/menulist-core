/**
 * WhatsApp Adapter — Meta WhatsApp Cloud API Implementation
 *
 * Implements IMessagingProvider for Meta WhatsApp Cloud API v21.0
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §8.3
 */

import * as crypto from "crypto";
import * as functions from "firebase-functions";
import { NormalizedMessage } from "../../../types/messagingOnboarding.types";
import {
  isResponseBodyTooLargeError,
  readJsonResponseWithLimit,
  readResponseUint8ArrayWithLimit,
} from "../../../utils/boundedResponseBody";
import { validateNetworkTargetUrl } from "../../../utils/networkTarget";
import { UPLOAD_LIMITS } from "../../constants";
import { IMessagingProvider } from "../IMessagingProvider";

const logger = functions.logger;
const GRAPH_API_VERSION = "v21.0";
const WHATSAPP_SEND_TEXT_FAILED_CODE = "WHATSAPP_SEND_TEXT_FAILED";
const WHATSAPP_INTERACTIVE_SEND_FAILED_CODE = "WHATSAPP_INTERACTIVE_SEND_FAILED";
const WHATSAPP_MEDIA_URL_REJECTED_CODE = "WHATSAPP_MEDIA_URL_REJECTED";
const WHATSAPP_MEDIA_URL_LOOKUP_FAILED_CODE = "WHATSAPP_MEDIA_URL_LOOKUP_FAILED";
const WHATSAPP_MEDIA_URL_RESPONSE_PARSE_FAILED_CODE = "WHATSAPP_MEDIA_URL_RESPONSE_PARSE_FAILED";
const WHATSAPP_MEDIA_DOWNLOAD_FAILED_CODE = "WHATSAPP_MEDIA_DOWNLOAD_FAILED";
const WHATSAPP_MEDIA_TOO_LARGE_CODE = "WHATSAPP_MEDIA_TOO_LARGE";
const WHATSAPP_PROVIDER_JSON_MAX_BYTES = 64 * 1024;

function getWhatsAppStringLogContext(
  label: string,
  value: unknown,
): Record<string, boolean | number> {
  const normalized = value === undefined || value === null ? "" : String(value);
  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
}

function getWhatsAppErrorName(error: unknown): string {
  if (error instanceof Error) return (error.name || "Error").slice(0, 80);
  return typeof error;
}

function getWhatsAppErrorCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  const code = (error as { code?: unknown }).code;
  if (code === undefined || code === null) return undefined;
  return String(code).slice(0, 64);
}

function getWhatsAppErrorContext(error: unknown): Record<string, string | undefined> {
  return {
    errorName: getWhatsAppErrorName(error),
    errorCode: getWhatsAppErrorCode(error),
  };
}

function createWhatsAppProviderError(code: string, status?: number): Error {
  const error = new Error(code);
  (error as any).code = code;
  if (typeof status === "number") (error as any).status = status;
  return error;
}

async function readWhatsAppMediaUrlLookupPayload(metaResponse: Response): Promise<{ url?: unknown } | null> {
  try {
    return await readJsonResponseWithLimit<{ url?: unknown }>(metaResponse, WHATSAPP_PROVIDER_JSON_MAX_BYTES);
  } catch (error) {
    logger.warn("[WhatsApp] Failed to parse media URL response", {
      failureCode: WHATSAPP_MEDIA_URL_RESPONSE_PARSE_FAILED_CODE,
      responseStatus: metaResponse.status,
      ...getWhatsAppErrorContext(error),
    });
    return null;
  }
}

export class WhatsAppAdapter implements IMessagingProvider {
  readonly providerId = "whatsapp" as const;

  private get phoneNumberId(): string {
    return process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  }

  private get encodedPhoneNumberId(): string {
    return encodeURIComponent(this.phoneNumberId);
  }

  private get accessToken(): string {
    return process.env.WHATSAPP_ACCESS_TOKEN || "";
  }

  private get appSecret(): string {
    return process.env.WHATSAPP_APP_SECRET || "";
  }

  private get verifyToken(): string {
    return process.env.WHATSAPP_VERIFY_TOKEN || "";
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
   */
  verifyWebhook(req: functions.https.Request): boolean {
    const signature = req.headers["x-hub-signature-256"] as string;
    if (!signature || !this.appSecret) {
      logger.warn("[WhatsApp] Missing signature or app secret");
      return false;
    }

    // Use rawBody (original bytes) for signature verification — JSON.stringify(req.body)
    // would re-serialize the parsed JSON, potentially changing key order/whitespace/precision.
    // Firebase Functions provides req.rawBody as a Buffer with the original request bytes.
    const bodyForSignature = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
    const expectedSignature =
      "sha256=" +
      crypto
        .createHmac("sha256", this.appSecret)
        .update(bodyForSignature)
        .digest("hex");

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch {
      return false;
    }
  }

  /**
   * Handle webhook GET challenge for initial registration
   */
  handleWebhookChallenge(req: functions.https.Request): string | null {
    const mode = req.query["hub.mode"] as string;
    const token = req.query["hub.verify_token"] as string;
    const challenge = req.query["hub.challenge"] as string;

    if (mode === "subscribe" && token === this.verifyToken) {
      logger.info("[WhatsApp] Webhook verification successful");
      return challenge;
    }

    logger.warn("[WhatsApp] Webhook verification failed", {
      mode,
      tokenMatch: token === this.verifyToken,
    });
    return null;
  }

  /**
   * Parse incoming Meta webhook payload into NormalizedMessage
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
   */
  parseIncomingMessage(
    req: functions.https.Request,
  ): NormalizedMessage | null {
    try {
      const body = req.body;

      // Meta sends webhook events in this structure
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages?.length) {
        // Status update or other non-message webhook — ignore
        return null;
      }

      const message = value.messages[0];
      const phone = message.from; // E.164 format without +

      // Determine message type
      let messageType: NormalizedMessage["messageType"] = "unsupported";
      let media: NormalizedMessage["media"] = undefined;
      let text: string | undefined = undefined;

      if (message.type === "image") {
        messageType = "image";
        media = {
          providerMediaId: message.image.id,
          mimeType: message.image.mime_type || "image/jpeg",
          fileSize: message.image.file_size,
          fileName: message.image.caption || undefined,
        };
      } else if (message.type === "document") {
        const mime = message.document.mime_type || "";
        // Accept PDF and image documents
        if (mime === "application/pdf" || mime.startsWith("image/")) {
          messageType = "document";
          media = {
            providerMediaId: message.document.id,
            mimeType: mime,
            fileSize: message.document.file_size,
            fileName: message.document.filename || undefined,
          };
        } else {
          messageType = "unsupported";
        }
      } else if (message.type === "text") {
        messageType = "text";
        text = message.text?.body;
      } else {
        // video, audio, sticker, location, contact, etc.
        messageType = "unsupported";
      }

      return {
        provider: "whatsapp",
        providerMessageId: message.id,
        userId: phone,
        userDisplayId: `+${phone}`,
        messageType,
        text,
        media,
        timestamp: new Date(parseInt(message.timestamp) * 1000),
        rawPayload: body,
      };
    } catch (err) {
      logger.error("[WhatsApp] Failed to parse incoming message", {
        ...getWhatsAppErrorContext(err),
      });
      return null;
    }
  }

  /**
   * Download media from Meta Graph API
   * Two-step: get URL, then download binary
   * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §8.3
   */
  async downloadMedia(providerMediaId: string): Promise<Buffer> {
    // Step 1: Get media URL
    const encodedMediaId = encodeURIComponent(providerMediaId);
    const metaResponse = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodedMediaId}`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      },
    );

    if (!metaResponse.ok) {
      throw createWhatsAppProviderError(WHATSAPP_MEDIA_URL_LOOKUP_FAILED_CODE, metaResponse.status);
    }

    const metaPayload = await readWhatsAppMediaUrlLookupPayload(metaResponse);
    const url = typeof metaPayload?.url === "string" ? metaPayload.url : "";
    const urlValidation = await validateNetworkTargetUrl(url);
    if (!urlValidation.valid || !urlValidation.normalizedUrl) {
      logger.warn("[WhatsApp] Rejected media download URL", {
        failureCode: WHATSAPP_MEDIA_URL_REJECTED_CODE,
        addressCount: urlValidation.addressCount,
        ...getWhatsAppStringLogContext("mediaUrl", url),
        ...getWhatsAppStringLogContext("validationError", urlValidation.error),
      });
      throw createWhatsAppProviderError(WHATSAPP_MEDIA_URL_REJECTED_CODE);
    }

    // Step 2: Download media binary
    const mediaResponse = await fetch(urlValidation.normalizedUrl, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!mediaResponse.ok) {
      throw createWhatsAppProviderError(WHATSAPP_MEDIA_DOWNLOAD_FAILED_CODE, mediaResponse.status);
    }

    try {
      const mediaBytes = await readResponseUint8ArrayWithLimit(mediaResponse, UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES);
      return Buffer.from(mediaBytes);
    } catch (error) {
      if (isResponseBodyTooLargeError(error)) {
        throw createWhatsAppProviderError(WHATSAPP_MEDIA_TOO_LARGE_CODE);
      }
      throw error;
    }
  }

  /**
   * Send a text message via WhatsApp Cloud API
   */
  async sendTextMessage(userId: string, text: string): Promise<void> {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${this.encodedPhoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: userId,
          type: "text",
          text: { body: text },
        }),
      },
    );

    if (!response.ok) {
      logger.error("[WhatsApp] Failed to send text message", {
        failureCode: WHATSAPP_SEND_TEXT_FAILED_CODE,
        status: response.status,
        ...getWhatsAppStringLogContext("providerUserId", userId),
        providerResponseBodySkipped: true,
      });
      throw createWhatsAppProviderError(WHATSAPP_SEND_TEXT_FAILED_CODE, response.status);
    }
  }

  /**
   * Send a message with a link (CTA URL button)
   */
  async sendLinkMessage(
    userId: string,
    text: string,
    url: string,
    buttonLabel: string,
  ): Promise<void> {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${this.encodedPhoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: userId,
          type: "interactive",
          interactive: {
            type: "cta_url",
            body: { text },
            action: {
              name: "cta_url",
              parameters: {
                display_text: buttonLabel,
                url,
              },
            },
          },
        }),
      },
    );

    if (!response.ok) {
      // Fallback to plain text with URL if interactive fails
      logger.warn("[WhatsApp] Interactive message failed, falling back to text", {
        failureCode: WHATSAPP_INTERACTIVE_SEND_FAILED_CODE,
        status: response.status,
        ...getWhatsAppStringLogContext("providerUserId", userId),
      });
      await this.sendTextMessage(userId, `${text}\n\n${url}`);
    }
  }
}
