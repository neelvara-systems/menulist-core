export const dynamic = "force-dynamic";

import {
    processSignalDeskProviderWebhook,
    verifySignalDeskWebhookChallenge,
} from "@lib/signaldesk/webhookServer";
import { logger } from "@lib/monitoring/logger";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { readBoundedTextBody } from "@lib/security/boundedRequestBody";
import { getClientIp, hashPublicRateLimitValue } from "src/middleware/publicApi";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PROVIDERS = new Set(["email", "whatsapp", "instagram", "messenger", "apify"]);
const SIGNALDESK_WEBHOOK_MAX_BODY_BYTES = 256 * 1024;
const SIGNALDESK_WEBHOOK_REJECTED_REASON = "webhook_rejected";

const resolveProvider = (provider: string) => PROVIDERS.has(provider) ? provider as "email" | "whatsapp" | "instagram" | "messenger" | "apify" : null;

export async function GET(request: NextRequest, context: { params: { provider: string } }) {
    const provider = resolveProvider(context.params.provider);
    if (!provider) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });

    const challenge = verifySignalDeskWebhookChallenge(provider, request.nextUrl);
    if (challenge === null) return NextResponse.json({ error: "Invalid challenge" }, { status: 403 });
    return new NextResponse(challenge, { status: 200 });
}

export async function POST(request: NextRequest, context: { params: { provider: string } }) {
    const provider = resolveProvider(context.params.provider);
    if (!provider) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });

    try {
        const rateLimitConfig = getRateLimitForFeature("DATA_WRITE");
        const ipHash = hashPublicRateLimitValue(getClientIp(request));
        const rateLimit = await checkRateLimit({
            key: `signaldesk:webhook:${provider}:${ipHash}`,
            ...rateLimitConfig,
        });
        if (!rateLimit.allowed) {
            logger.security("SignalDesk Webhook Rate Limit Exceeded", {
                endpoint: request.nextUrl.pathname,
                provider,
            }, "medium");
            return NextResponse.json({ error: "Too many requests" }, { status: 429 });
        }
        const bodyResult = await readBoundedTextBody(request, SIGNALDESK_WEBHOOK_MAX_BODY_BYTES, {
            invalidRequestMessage: "Invalid webhook request",
            tooLargeMessage: "Webhook body too large",
        });
        if (bodyResult.ok === false) return bodyResult.response;

        const rawBody = bodyResult.body;
        const result = await processSignalDeskProviderWebhook({
            provider,
            rawBody,
            requestHeaders: request.headers,
        });
        return NextResponse.json({ data: result }, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    } catch {
        logger.security("SignalDesk Webhook Rejected", {
            endpoint: request.nextUrl.pathname,
            error: SIGNALDESK_WEBHOOK_REJECTED_REASON,
            provider,
        }, "high");
        return NextResponse.json({ error: "Webhook rejected" }, { status: 400 });
    }
}
