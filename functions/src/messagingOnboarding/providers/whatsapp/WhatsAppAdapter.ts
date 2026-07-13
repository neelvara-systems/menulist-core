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
import { RETENTION, UPLOAD_LIMITS } from "../../constants";
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
const WHATSAPP_CONFIGURATION_MISSING_CODE = "WHATSAPP_CONFIGURATION_MISSING";
const WHATSAPP_PROVIDER_JSON_MAX_BYTES = 64 * 1024;
const WHATSAPP_MAX_MESSAGES_PER_WEBHOOK = 100;
const WHATSAPP_API_TIMEOUT_MS = 15_000;
const WHATSAPP_MEDIA_DOWNLOAD_TIMEOUT_MS = 30_000;
const TRUSTED_WHATSAPP_MEDIA_HOST_SUFFIXES = [
  "facebook.com",
  "fbcdn.net",
  "fbsbx.com",
] as const;

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

class WhatsAppProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(code: string, status: number | undefined, retryable: boolean) {
    super(code);
    this.name = "WhatsAppProviderError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

function isTransientWhatsAppStatus(status: number | undefined): boolean {
  return status === undefined
    || status === 408
    || status === 409
    || status === 425
    || status === 429
    || status >= 500;
}

function createWhatsAppProviderError(
  code: string,
  status?: number,
  retryable = isTransientWhatsAppStatus(status),
): Error {
  return new WhatsAppProviderError(code, status, retryable);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function timingSafeStringEqual(left: string, right: string): boolean {
  const leftDigest = crypto.createHash("sha256").update(left).digest();
  const rightDigest = crypto.createHash("sha256").update(right).digest();
  return crypto.timingSafeEqual(leftDigest, rightDigest);
}

export function isTrustedWhatsAppMediaUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:" || parsed.username || parsed.password) return false;
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  return TRUSTED_WHATSAPP_MEDIA_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
  );
}

function boundedProviderText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, maxLength) : undefined;
}

function normalizeProviderFileSize(value: unknown): number | undefined {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : undefined;
}

function normalizeProviderTimestamp(value: unknown): Date | null {
  const seconds = typeof value === "number" ? value : Number(value);
  const now = Date.now();
  const millis = Number.isSafeInteger(seconds) ? seconds * 1000 : Number.NaN;
  return Number.isFinite(millis)
    && millis >= now - RETENTION.INBOUND_MESSAGE_TTL_MS
    && millis <= now + 24 * 60 * 60 * 1000
    ? new Date(millis)
    : null;
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

  private assertApiConfigured(): void {
    if (!this.phoneNumberId || !this.accessToken) {
      throw createWhatsAppProviderError(WHATSAPP_CONFIGURATION_MISSING_CODE, undefined, false);
    }
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
   */
  verifyWebhook(req: functions.https.Request): boolean {
    const rawSignature = req.headers["x-hub-signature-256"];
    const signature = typeof rawSignature === "string" ? rawSignature : "";
    if (
      !/^sha256=[a-f0-9]{64}$/.test(signature)
      || !this.appSecret
      || !Buffer.isBuffer(req.rawBody)
    ) {
      logger.warn("[WhatsApp] Missing or invalid signature configuration", {
        appSecretConfigured: Boolean(this.appSecret),
        rawBodyAvailable: Buffer.isBuffer(req.rawBody),
        signatureLength: signature.length,
      });
      return false;
    }

    const expectedSignature =
      "sha256=" +
      crypto
        .createHmac("sha256", this.appSecret)
        .update(req.rawBody)
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
    const mode = typeof req.query["hub.mode"] === "string" ? req.query["hub.mode"] : "";
    const token = typeof req.query["hub.verify_token"] === "string"
      ? req.query["hub.verify_token"]
      : "";
    const challenge = typeof req.query["hub.challenge"] === "string"
      ? req.query["hub.challenge"]
      : "";

    if (
      this.verifyToken
      && mode === "subscribe"
      && timingSafeStringEqual(token, this.verifyToken)
      && challenge.length > 0
      && challenge.length <= 512
    ) {
      logger.info("[WhatsApp] Webhook verification successful");
      return challenge;
    }

    logger.warn("[WhatsApp] Webhook verification failed", {
      modeIsSubscribe: mode === "subscribe",
      tokenConfigured: Boolean(this.verifyToken),
      tokenMatch: Boolean(this.verifyToken) && timingSafeStringEqual(token, this.verifyToken),
      challengeLength: challenge.length,
    });
    return null;
  }

  /**
   * Parse incoming Meta webhook payload into NormalizedMessage
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
   */
  parseIncomingMessages(
    req: functions.https.Request,
  ): NormalizedMessage[] {
    const body = asRecord(req.body);
    const entries = Array.isArray(body?.entry) ? body.entry : [];
    const rawMessages: unknown[] = [];

    for (const rawEntry of entries) {
      const entry = asRecord(rawEntry);
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const rawChange of changes) {
        const change = asRecord(rawChange);
        const value = asRecord(change?.value);
        const messages = Array.isArray(value?.messages) ? value.messages : [];
        rawMessages.push(...messages);
        if (rawMessages.length > WHATSAPP_MAX_MESSAGES_PER_WEBHOOK) {
          throw createWhatsAppProviderError(
            "WHATSAPP_WEBHOOK_MESSAGE_LIMIT_EXCEEDED",
            undefined,
            false,
          );
        }
      }
    }

    const normalized: NormalizedMessage[] = [];
    for (const rawMessage of rawMessages) {
      const message = asRecord(rawMessage);
      const providerMessageId = boundedProviderText(message?.id, 256);
      const phone = boundedProviderText(message?.from, 32);
      const timestamp = normalizeProviderTimestamp(message?.timestamp);
      if (
        !message
        || !providerMessageId
        || !phone
        || !/^\d{7,15}$/.test(phone)
        || !timestamp
      ) continue;

      let messageType: NormalizedMessage["messageType"] = "unsupported";
      let media: NormalizedMessage["media"];
      let text: string | undefined;

      if (message.type === "image") {
        const image = asRecord(message.image);
        const providerMediaId = boundedProviderText(image?.id, 256);
        const mimeType = boundedProviderText(image?.mime_type, 120);
        const fileSize = normalizeProviderFileSize(image?.file_size);
        if (!providerMediaId || !mimeType) continue;
        messageType = "image";
        text = boundedProviderText(image?.caption, 2000);
        media = {
          providerMediaId,
          mimeType,
          ...(fileSize !== undefined ? { fileSize } : {}),
        };
      } else if (message.type === "document") {
        const document = asRecord(message.document);
        const providerMediaId = boundedProviderText(document?.id, 256);
        const mimeType = boundedProviderText(document?.mime_type, 120) || "";
        const fileSize = normalizeProviderFileSize(document?.file_size);
        const fileName = boundedProviderText(document?.filename, 180);
        if (providerMediaId && (mimeType === "application/pdf" || mimeType.startsWith("image/"))) {
          messageType = "document";
          text = boundedProviderText(document?.caption, 2000);
          media = {
            providerMediaId,
            mimeType,
            ...(fileSize !== undefined ? { fileSize } : {}),
            ...(fileName ? { fileName } : {}),
          };
        } else continue;
      } else if (message.type === "text") {
        text = boundedProviderText(asRecord(message.text)?.body, 2000);
        if (!text) continue;
        messageType = "text";
      }

      normalized.push({
        provider: "whatsapp",
        providerMessageId,
        userId: phone,
        userDisplayId: `+${phone}`,
        messageType,
        ...(text ? { text } : {}),
        ...(media ? { media } : {}),
        timestamp,
        rawPayload: null,
      });
    }

    return normalized;
  }

  /**
   * Download media from Meta Graph API
   * Two-step: get URL, then download binary
   * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §8.3
   */
  async downloadMedia(providerMediaId: string): Promise<Buffer> {
    this.assertApiConfigured();
    // Step 1: Get media URL
    const encodedMediaId = encodeURIComponent(providerMediaId);
    const mediaLookupUrl = new URL(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodedMediaId}`,
    );
    mediaLookupUrl.searchParams.set("phone_number_id", this.phoneNumberId);
    const metaResponse = await fetch(
      mediaLookupUrl,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        signal: AbortSignal.timeout(WHATSAPP_API_TIMEOUT_MS),
      },
    );

    if (!metaResponse.ok) {
      throw createWhatsAppProviderError(WHATSAPP_MEDIA_URL_LOOKUP_FAILED_CODE, metaResponse.status);
    }

    const metaPayload = await readWhatsAppMediaUrlLookupPayload(metaResponse);
    if (!metaPayload) {
      throw createWhatsAppProviderError(
        WHATSAPP_MEDIA_URL_RESPONSE_PARSE_FAILED_CODE,
        metaResponse.status,
        true,
      );
    }
    const url = typeof metaPayload?.url === "string" ? metaPayload.url : "";
    if (!isTrustedWhatsAppMediaUrl(url)) {
      logger.warn("[WhatsApp] Rejected media download URL", {
        failureCode: WHATSAPP_MEDIA_URL_REJECTED_CODE,
        addressCount: 0,
        ...getWhatsAppStringLogContext("mediaUrl", url),
        ...getWhatsAppStringLogContext("validationError", "untrusted_provider_host"),
      });
      throw createWhatsAppProviderError(
        WHATSAPP_MEDIA_URL_REJECTED_CODE,
        undefined,
        false,
      );
    }
    const urlValidation = await validateNetworkTargetUrl(url);
    if (!urlValidation.valid || !urlValidation.normalizedUrl) {
      logger.warn("[WhatsApp] Rejected media download URL", {
        failureCode: WHATSAPP_MEDIA_URL_REJECTED_CODE,
        addressCount: urlValidation.addressCount,
        ...getWhatsAppStringLogContext("mediaUrl", url),
        ...getWhatsAppStringLogContext("validationError", urlValidation.error),
      });
      const retryableValidationFailure = urlValidation.error === "dns_lookup_failed"
        || urlValidation.error === "dns_no_addresses";
      throw createWhatsAppProviderError(
        WHATSAPP_MEDIA_URL_REJECTED_CODE,
        undefined,
        retryableValidationFailure,
      );
    }

    // Step 2: Download media binary
    const mediaResponse = await fetch(urlValidation.normalizedUrl, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
      signal: AbortSignal.timeout(WHATSAPP_MEDIA_DOWNLOAD_TIMEOUT_MS),
    });

    if (!mediaResponse.ok) {
      throw createWhatsAppProviderError(
        WHATSAPP_MEDIA_DOWNLOAD_FAILED_CODE,
        mediaResponse.status,
        mediaResponse.status === 404 || isTransientWhatsAppStatus(mediaResponse.status),
      );
    }

    try {
      const mediaBytes = await readResponseUint8ArrayWithLimit(mediaResponse, UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES);
      return Buffer.from(mediaBytes);
    } catch (error) {
      if (isResponseBodyTooLargeError(error)) {
        throw createWhatsAppProviderError(WHATSAPP_MEDIA_TOO_LARGE_CODE, undefined, false);
      }
      throw error;
    }
  }

  /**
   * Send a text message via WhatsApp Cloud API
   */
  async sendTextMessage(userId: string, text: string): Promise<void> {
    this.assertApiConfigured();
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
        signal: AbortSignal.timeout(WHATSAPP_API_TIMEOUT_MS),
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
    this.assertApiConfigured();
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
        signal: AbortSignal.timeout(WHATSAPP_API_TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      if (response.status !== 400 && response.status !== 422) {
        logger.warn("[WhatsApp] Interactive message failed", {
          failureCode: WHATSAPP_INTERACTIVE_SEND_FAILED_CODE,
          status: response.status,
          ...getWhatsAppStringLogContext("providerUserId", userId),
        });
        throw createWhatsAppProviderError(
          WHATSAPP_INTERACTIVE_SEND_FAILED_CODE,
          response.status,
        );
      }

      // A valid text fallback can recover provider content/format rejection,
      // but must not amplify throttling, auth, or transient server failures.
      logger.warn("[WhatsApp] Interactive content rejected, falling back to text", {
        failureCode: WHATSAPP_INTERACTIVE_SEND_FAILED_CODE,
        status: response.status,
        ...getWhatsAppStringLogContext("providerUserId", userId),
      });
      const fallbackText = text.includes(url) ? text : `${text}\n\n${url}`;
      await this.sendTextMessage(userId, fallbackText);
    }
  }
}
