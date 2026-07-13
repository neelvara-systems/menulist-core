import assert from "node:assert/strict";
import crypto from "node:crypto";
import { isRetryableMessagingProviderError } from "../../functions/src/messagingOnboarding/providers/IMessagingProvider";
import { getProviderFromWebhookPath } from "../../functions/src/messagingOnboarding/providers/providerRegistry";
import {
  isTrustedWhatsAppMediaUrl,
  WhatsAppAdapter,
} from "../../functions/src/messagingOnboarding/providers/whatsapp/WhatsAppAdapter";

type WhatsAppWebhookRequest = Parameters<WhatsAppAdapter["parseIncomingMessages"]>[0];

function requestWithBody(body: unknown): WhatsAppWebhookRequest {
  return { body } as WhatsAppWebhookRequest;
}

function asRequest(value: unknown): WhatsAppWebhookRequest {
  return value as WhatsAppWebhookRequest;
}

function message(id: string, from: string, type: string, value: Record<string, unknown>) {
  return {
    id,
    from,
    timestamp: "1783737000",
    type,
    [type]: value,
  };
}

async function testBatchedWebhookParsing(): Promise<void> {
  const adapter = new WhatsAppAdapter();
  const parsed = adapter.parseIncomingMessages(requestWithBody({
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                message("wamid.image", "919876543210", "image", {
                  id: "media-image",
                  mime_type: "image/jpeg",
                  file_size: "1234",
                  caption: "  Lunch\n menu  ",
                }),
                message("wamid.bad-phone", "+91 987", "text", { body: "ignored" }),
              ],
            },
          },
          {
            value: {
              messages: [
                message("wamid.document", "919876543211", "document", {
                  id: "media-document",
                  mime_type: "application/pdf",
                  file_size: 4567,
                  filename: " Menu\u0000 July.pdf ",
                  caption: "Current menu",
                }),
              ],
            },
          },
        ],
      },
      {
        changes: [
          {
            value: {
              messages: [
                message("wamid.text", "919876543212", "text", {
                  body: "  Please\tuse this menu  ",
                }),
                message("wamid.video", "919876543213", "video", { id: "video-id" }),
              ],
            },
          },
        ],
      },
    ],
  }));

  assert.equal(parsed.length, 4, "all valid messages across every entry/change must be retained");
  assert.deepEqual(parsed.map((item) => item.providerMessageId), [
    "wamid.image",
    "wamid.document",
    "wamid.text",
    "wamid.video",
  ]);
  assert.equal(parsed[0].text, "Lunch menu", "image captions must remain owner text");
  assert.equal(parsed[0].media?.fileName, undefined, "image captions must not become filenames");
  assert.equal(parsed[0].media?.fileSize, 1234);
  assert.equal(parsed[1].text, "Current menu", "document captions must remain owner text");
  assert.equal(parsed[1].media?.fileName, "Menu July.pdf");
  assert.equal(parsed[2].text, "Please use this menu");
  assert.equal(parsed[3].messageType, "unsupported");
  assert.equal(adapter.parseIncomingMessages(requestWithBody({ entry: [] })).length, 0);
}

async function testWebhookMessageLimit(): Promise<void> {
  const adapter = new WhatsAppAdapter();
  const messages = Array.from({ length: 101 }, (_, index) => (
    message(`wamid.${index}`, "919876543210", "text", { body: `message ${index}` })
  ));
  let limitError: unknown;
  try {
    adapter.parseIncomingMessages(requestWithBody({
      entry: [{ changes: [{ value: { messages } }] }],
    }));
  } catch (error) {
    limitError = error;
  }
  assert.match(String(limitError), /WHATSAPP_WEBHOOK_MESSAGE_LIMIT_EXCEEDED/);
  assert.equal(isRetryableMessagingProviderError(limitError), false);
}

function testProviderTimestampValidation(): void {
  const adapter = new WhatsAppAdapter();
  const validBase = message("wamid.valid", "919876543210", "text", { body: "valid" });
  const staleSeconds = Math.floor((Date.now() - 31 * 24 * 60 * 60 * 1000) / 1000);
  const futureSeconds = Math.floor((Date.now() + 25 * 60 * 60 * 1000) / 1000);
  const messages = [
    { ...validBase, id: "wamid.invalid", timestamp: "not-a-number" },
    { ...validBase, id: "wamid.stale", timestamp: String(staleSeconds) },
    { ...validBase, id: "wamid.future", timestamp: String(futureSeconds) },
  ];
  const parsed = adapter.parseIncomingMessages(requestWithBody({
    entry: [{ changes: [{ value: { messages } }] }],
  }));
  assert.deepEqual(parsed, [], "invalid, stale, and implausibly future timestamps must be rejected");
}

async function testLinkFallbackDoesNotDuplicateUrl(): Promise<void> {
  const originalFetch = globalThis.fetch;
  const originalPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const originalAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const requests: Array<{ body?: string; signal?: AbortSignal | null }> = [];

  process.env.WHATSAPP_PHONE_NUMBER_ID = "phone-id";
  process.env.WHATSAPP_ACCESS_TOKEN = "token";
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    requests.push({
      body: typeof init?.body === "string" ? init.body : undefined,
      signal: init?.signal,
    });
    return new Response(null, { status: requests.length === 1 ? 400 : 200 });
  }) as typeof fetch;

  try {
    const adapter = new WhatsAppAdapter();
    const url = "https://example.test/preview";
    await adapter.sendLinkMessage("919876543210", `Your preview: ${url}`, url, "View");

    assert.equal(requests.length, 2, "failed interactive delivery must fall back exactly once");
    const fallback = JSON.parse(requests[1].body || "{}") as { text?: { body?: string } };
    assert.equal(fallback.text?.body, `Your preview: ${url}`);
    assert.equal((fallback.text?.body?.match(new RegExp(url, "g")) || []).length, 1);
    assert.ok(requests.every((request) => request.signal instanceof AbortSignal));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalPhoneNumberId === undefined) delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    else process.env.WHATSAPP_PHONE_NUMBER_ID = originalPhoneNumberId;
    if (originalAccessToken === undefined) delete process.env.WHATSAPP_ACCESS_TOKEN;
    else process.env.WHATSAPP_ACCESS_TOKEN = originalAccessToken;
  }
}

async function testLinkDeliveryDoesNotAmplifyProviderFailures(): Promise<void> {
  const originalFetch = globalThis.fetch;
  const originalPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const originalAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  process.env.WHATSAPP_PHONE_NUMBER_ID = "phone-id";
  process.env.WHATSAPP_ACCESS_TOKEN = "token";

  try {
    for (const [status, expectedRetryable] of [[401, false], [429, true], [503, true]] as const) {
      let requestCount = 0;
      globalThis.fetch = (async () => {
        requestCount++;
        return new Response(null, { status });
      }) as typeof fetch;
      let providerError: unknown;
      try {
        await new WhatsAppAdapter().sendLinkMessage(
          "919876543210",
          "Your menu is ready",
          "https://example.test/menu",
          "View",
        );
      } catch (error) {
        providerError = error;
      }
      assert(providerError, `interactive status ${status} must fail`);
      assert.equal(requestCount, 1, `interactive status ${status} must not trigger a second provider call`);
      assert.equal(isRetryableMessagingProviderError(providerError), expectedRetryable);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalPhoneNumberId === undefined) delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    else process.env.WHATSAPP_PHONE_NUMBER_ID = originalPhoneNumberId;
    if (originalAccessToken === undefined) delete process.env.WHATSAPP_ACCESS_TOKEN;
    else process.env.WHATSAPP_ACCESS_TOKEN = originalAccessToken;
  }
}

async function testMissingConfigurationFailsBeforeFetch(): Promise<void> {
  const originalFetch = globalThis.fetch;
  const originalPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const originalAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  let fetchCalled = false;

  delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  delete process.env.WHATSAPP_ACCESS_TOKEN;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    return new Response(null, { status: 200 });
  }) as typeof fetch;

  try {
    const adapter = new WhatsAppAdapter();
    let configurationError: unknown;
    try {
      await adapter.sendTextMessage("919876543210", "Hello");
    } catch (error) {
      configurationError = error;
    }
    assert.match(String(configurationError), /WHATSAPP_CONFIGURATION_MISSING/);
    assert.equal(isRetryableMessagingProviderError(configurationError), false);
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalPhoneNumberId === undefined) delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    else process.env.WHATSAPP_PHONE_NUMBER_ID = originalPhoneNumberId;
    if (originalAccessToken === undefined) delete process.env.WHATSAPP_ACCESS_TOKEN;
    else process.env.WHATSAPP_ACCESS_TOKEN = originalAccessToken;
  }
}

async function testProviderStatusRetryClassification(): Promise<void> {
  const originalFetch = globalThis.fetch;
  const originalPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const originalAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  process.env.WHATSAPP_PHONE_NUMBER_ID = "phone-id";
  process.env.WHATSAPP_ACCESS_TOKEN = "token";

  try {
    for (const [status, expectedRetryable] of [[400, false], [429, true], [503, true]] as const) {
      globalThis.fetch = (async () => new Response(null, { status })) as typeof fetch;
      let providerError: unknown;
      try {
        await new WhatsAppAdapter().sendTextMessage("919876543210", "Hello");
      } catch (error) {
        providerError = error;
      }
      assert(providerError, `status ${status} must fail`);
      assert.equal(isRetryableMessagingProviderError(providerError), expectedRetryable);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalPhoneNumberId === undefined) delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    else process.env.WHATSAPP_PHONE_NUMBER_ID = originalPhoneNumberId;
    if (originalAccessToken === undefined) delete process.env.WHATSAPP_ACCESS_TOKEN;
    else process.env.WHATSAPP_ACCESS_TOKEN = originalAccessToken;
  }
}

function testMediaUrlTrustBoundary(): void {
  assert.equal(
    isTrustedWhatsAppMediaUrl("https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1"),
    true,
  );
  assert.equal(isTrustedWhatsAppMediaUrl("https://cdn.fbcdn.net/media/1"), true);
  assert.equal(isTrustedWhatsAppMediaUrl("https://graph.facebook.com/media/1"), true);
  assert.equal(isTrustedWhatsAppMediaUrl("https://fbsbx.com.evil.example/media/1"), false);
  assert.equal(isTrustedWhatsAppMediaUrl("https://evilfbsbx.com/media/1"), false);
  assert.equal(isTrustedWhatsAppMediaUrl("https://user@lookaside.fbsbx.com/media/1"), false);
  assert.equal(isTrustedWhatsAppMediaUrl("http://lookaside.fbsbx.com/media/1"), false);
  assert.equal(isTrustedWhatsAppMediaUrl("not-a-url"), false);
}

async function testMediaLookupBindsPhoneAndRejectsUntrustedHost(): Promise<void> {
  const originalFetch = globalThis.fetch;
  const originalPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const originalAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const requests: string[] = [];
  process.env.WHATSAPP_PHONE_NUMBER_ID = "phone/id";
  process.env.WHATSAPP_ACCESS_TOKEN = "token";
  globalThis.fetch = (async (input: string | URL | Request) => {
    requests.push(String(input));
    return new Response(JSON.stringify({ url: "https://attacker.example/media" }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  }) as typeof fetch;

  try {
    let providerError: unknown;
    try {
      await new WhatsAppAdapter().downloadMedia("media/id");
    } catch (error) {
      providerError = error;
    }
    assert.match(String(providerError), /WHATSAPP_MEDIA_URL_REJECTED/);
    assert.equal(isRetryableMessagingProviderError(providerError), false);
    assert.equal(requests.length, 1, "untrusted URLs must be rejected before a bearer-token download");
    const lookup = new URL(requests[0]);
    assert.equal(lookup.hostname, "graph.facebook.com");
    assert.equal(lookup.pathname, "/v21.0/media%2Fid");
    assert.equal(lookup.searchParams.get("phone_number_id"), "phone/id");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalPhoneNumberId === undefined) delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    else process.env.WHATSAPP_PHONE_NUMBER_ID = originalPhoneNumberId;
    if (originalAccessToken === undefined) delete process.env.WHATSAPP_ACCESS_TOKEN;
    else process.env.WHATSAPP_ACCESS_TOKEN = originalAccessToken;
  }
}

async function testWebhookVerificationFailsClosed(): Promise<void> {
  const originalAppSecret = process.env.WHATSAPP_APP_SECRET;
  const originalVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  const rawBody = Buffer.from('{"entry":[]}', "utf8");
  process.env.WHATSAPP_APP_SECRET = "app-secret";
  process.env.WHATSAPP_VERIFY_TOKEN = "verify-token";

  try {
    const adapter = new WhatsAppAdapter();
    const signature = `sha256=${crypto.createHmac("sha256", "app-secret").update(rawBody).digest("hex")}`;
    assert.equal(adapter.verifyWebhook(asRequest({
      body: { entry: [] },
      headers: { "x-hub-signature-256": signature },
      rawBody,
    })), true);
    assert.equal(adapter.verifyWebhook(asRequest({
      body: { entry: [] },
      headers: { "x-hub-signature-256": signature },
    })), false, "re-serialized JSON must never replace signed raw bytes");

    assert.equal(adapter.handleWebhookChallenge(asRequest({
      query: {
        "hub.challenge": "challenge-value",
        "hub.mode": "subscribe",
        "hub.verify_token": "verify-token",
      },
    })), "challenge-value");

    delete process.env.WHATSAPP_VERIFY_TOKEN;
    const unconfigured = new WhatsAppAdapter();
    assert.equal(unconfigured.handleWebhookChallenge(asRequest({
      query: {
        "hub.challenge": "challenge-value",
        "hub.mode": "subscribe",
        "hub.verify_token": "",
      },
    })), null);
  } finally {
    if (originalAppSecret === undefined) delete process.env.WHATSAPP_APP_SECRET;
    else process.env.WHATSAPP_APP_SECRET = originalAppSecret;
    if (originalVerifyToken === undefined) delete process.env.WHATSAPP_VERIFY_TOKEN;
    else process.env.WHATSAPP_VERIFY_TOKEN = originalVerifyToken;
  }
}

async function main(): Promise<void> {
  assert.equal(getProviderFromWebhookPath("/messagingOnboarding/whatsapp"), "whatsapp");
  assert.equal(getProviderFromWebhookPath("/constructor"), null);
  assert.equal(getProviderFromWebhookPath("/__proto__"), null);
  await testBatchedWebhookParsing();
  await testWebhookMessageLimit();
  testProviderTimestampValidation();
  await testLinkFallbackDoesNotDuplicateUrl();
  await testLinkDeliveryDoesNotAmplifyProviderFailures();
  await testMissingConfigurationFailsBeforeFetch();
  await testProviderStatusRetryClassification();
  testMediaUrlTrustBoundary();
  await testMediaLookupBindsPhoneAndRejectsUntrustedHost();
  await testWebhookVerificationFailsClosed();
  console.log("Messaging WhatsApp adapter behavior tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
