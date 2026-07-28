export const dynamic = "force-dynamic";

import { logger } from "@lib/monitoring/logger";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { readBoundedTextBody } from "@lib/security/boundedRequestBody";
import {
    getSignalDeskOutcomeBridgeRequestErrorStatus,
    processSignalDeskOutcomeBridge,
} from "@lib/signaldesk/outcomeBridgeServer";
import { getClientIp, hashPublicRateLimitValue } from "src/middleware/publicApi";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const MAX_BODY_BYTES = 64 * 1024;
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
    try {
        const rateLimit = await checkRateLimit({
            failClosedOnProviderError: true,
            key: `signaldesk:outcome-bridge:${hashPublicRateLimitValue(getClientIp(request))}`,
            ...getRateLimitForFeature("DATA_WRITE"),
        });
        if (!rateLimit.allowed) {
            const providerUnavailable = rateLimit.reason === "provider_unavailable";
            const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
            return NextResponse.json({ error: providerUnavailable ? "Outcome bridge temporarily unavailable" : "Too many requests" }, {
                headers: { ...NO_STORE_HEADERS, "Retry-After": String(retryAfter) },
                status: providerUnavailable ? 503 : 429,
            });
        }
        const bodyResult = await readBoundedTextBody(request, MAX_BODY_BYTES, {
            invalidRequestMessage: "Invalid outcome request",
            tooLargeMessage: "Outcome request body too large",
        });
        if (bodyResult.ok === false) {
            bodyResult.response.headers.set("Cache-Control", "no-store");
            return bodyResult.response;
        }
        const result = await processSignalDeskOutcomeBridge({
            rawBody: bodyResult.body,
            requestHeaders: request.headers,
        });
        return NextResponse.json({ data: result }, { headers: NO_STORE_HEADERS });
    } catch (error) {
        const requestErrorStatus = getSignalDeskOutcomeBridgeRequestErrorStatus(error);
        const retryable = requestErrorStatus === null;
        logger.security("SignalDesk Outcome Bridge Rejected", {
            endpoint: request.nextUrl.pathname,
            error: "outcome_bridge_rejected",
            retryable,
        }, retryable ? "critical" : "high");
        return NextResponse.json({ error: retryable ? "Outcome bridge temporarily unavailable" : "Outcome bridge rejected" }, {
            headers: retryable ? { ...NO_STORE_HEADERS, "Retry-After": "30" } : NO_STORE_HEADERS,
            status: requestErrorStatus || 503,
        });
    }
}
