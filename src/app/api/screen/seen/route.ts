export const dynamic = 'force-dynamic';
/**
 * Bounded screen-open acknowledgement.
 * Current clients acknowledge one exact content version per screen mode and
 * UTC day. Legacy clients retain the previous store-level daily signal.
 */

import { DB_COLLECTIONS } from "@constant/database";
import { FEATURE_FLAGS } from "@config/features";
import { firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import { normalizeStorePermissionScopeDocumentId } from "@lib/permissions/scopeDocumentId";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { getBoundedScreenStringContext, logScreenDisplayFailure } from "@lib/screen/screenDiagnostics";
import { getPrivateScreenControlDocId } from "@lib/screen/privateScreenControl";
import {
    isDigitalScreenDisplayMode,
} from "@lib/screen/screenSeenAcknowledgement";
import { commitCurrentScreenSeen } from "@lib/screen/screenSeenServer";
import {
    resolveUniqueLegacyScreenSeenStoreId,
} from "@lib/screen/screenSeenScope";
import { readBoundedJsonBody, rejectInvalidOrOversizedDeclaredBody } from "@lib/security/boundedRequestBody";
import { NextRequest, NextResponse } from "next/server";
import { getClientIp, hashPublicRateLimitValue } from "src/middleware/publicApi";
import type { DigitalScreenDisplayMode } from "@type/campaigns";
import { z } from "zod";

const TOKEN_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
const TOKEN_RATE_LIMIT_ATTEMPTS = 12;
const SCREEN_TOKEN_PATTERN = /^[a-z0-9_-]{6,24}$/i;
const SCREEN_SEEN_MAX_BODY_BYTES = 1024;
const ScreenStoreIdSchema = z.union([z.string(), z.number()]);
const ScreenSeenRequestSchema = z.union([
    z.object({
        storeId: ScreenStoreIdSchema.optional(),
        token: z.string().regex(SCREEN_TOKEN_PATTERN),
    }).strict(),
    z.object({
        contentVersion: z.number().int().positive(),
        mode: z.enum(["menu_board", "highlights"]),
        storeId: ScreenStoreIdSchema.optional(),
        token: z.string().regex(SCREEN_TOKEN_PATTERN),
    }).strict(),
]);

const cachedSeenResponse = () => NextResponse.json({ ok: true, cached: true });
const rateLimitedSeenResponse = (reason: unknown) => NextResponse.json(
    { error: 'Temporarily unavailable' },
    {
        status: reason === 'provider_unavailable' ? 503 : 429,
        headers: { 'Retry-After': String(TOKEN_RATE_LIMIT_WINDOW_SECONDS) },
    },
);

export async function POST(request: NextRequest) {
    let logContext: Record<string, boolean | number | string | null | undefined> = {
        endpoint: '/api/screen/seen',
    };

    try {
        if (!FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED) {
            return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
        }

        const declaredBodyResponse = rejectInvalidOrOversizedDeclaredBody(request, SCREEN_SEEN_MAX_BODY_BYTES, {
            invalidRequestMessage: 'Invalid request',
            tooLargeMessage: 'Invalid request',
        });
        if (declaredBodyResponse) return declaredBodyResponse;

        const ipRateConfig = getRateLimitForFeature('SCREEN_SEEN_SIGNAL');
        const ipHash = hashPublicRateLimitValue(getClientIp(request));
        const ipRateLimit = await checkRateLimit({
            failClosedOnProviderError: true,
            key: `screen-seen:ip:${ipHash}`,
            ...ipRateConfig,
        });
        if (!ipRateLimit.allowed) {
            return rateLimitedSeenResponse(ipRateLimit.reason);
        }

        const bodyResult = await readBoundedJsonBody(request, SCREEN_SEEN_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid request',
            invalidRequestMessage: 'Invalid request',
            tooLargeMessage: 'Invalid request',
        });
        if (bodyResult.ok === false) return bodyResult.response;

        const parsedBody = ScreenSeenRequestSchema.safeParse(bodyResult.data);
        if (!parsedBody.success) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const parsedRequest = parsedBody.data;
        const token = parsedRequest.token;
        const mode = 'mode' in parsedRequest ? parsedRequest.mode : undefined;
        const requestedContentVersion = 'mode' in parsedRequest
            ? parsedRequest.contentVersion
            : undefined;
        const hasModeAcknowledgement = mode !== undefined;
        const rawStoreId = parsedRequest.storeId;
        const suppliedStoreScope = rawStoreId == null
            ? null
            : normalizeStorePermissionScopeDocumentId(rawStoreId);
        const normalizedStoreId = suppliedStoreScope?.documentId || '';
        logContext = {
            ...logContext,
            directStoreLookup: Boolean(normalizedStoreId),
            ...getBoundedScreenStringContext('screenToken', token),
            ...getBoundedScreenStringContext('storeId', normalizedStoreId),
            hasModeAcknowledgement,
        };

        // Validate token
        if (!SCREEN_TOKEN_PATTERN.test(token)) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }

        if (rawStoreId != null && !suppliedStoreScope) {
            return NextResponse.json({ error: 'Invalid store' }, { status: 400 });
        }

        if (hasModeAcknowledgement && !isDigitalScreenDisplayMode(mode)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const screenTokenHash = hashPublicRateLimitValue(token);
        const storeHashSegment = normalizedStoreId
            ? `store:${hashPublicRateLimitValue(normalizedStoreId)}`
            : 'legacy';
        const tokenRateLimit = await checkRateLimit({
            failClosedOnProviderError: true,
            key: `screen-seen:token:${storeHashSegment}:${screenTokenHash}`,
            limit: TOKEN_RATE_LIMIT_ATTEMPTS,
            window: TOKEN_RATE_LIMIT_WINDOW_SECONDS,
        });
        if (!tokenRateLimit.allowed) {
            return rateLimitedSeenResponse(tokenRateLimit.reason);
        }

        const summaryRef = firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY);
        let controlRef: FirebaseFirestore.DocumentReference;
        let docRef: FirebaseFirestore.DocumentReference;
        let targetStoreId: string;

        if (normalizedStoreId) {
            controlRef = summaryRef.doc(getPrivateScreenControlDocId(normalizedStoreId));
            docRef = summaryRef.doc(`campaigns_${normalizedStoreId}`);
            targetStoreId = normalizedStoreId;
        } else {
            const privateSnapshot = await summaryRef.where('screenToken', '==', token).limit(2).get();
            if (privateSnapshot.size === 1) {
                const match = privateSnapshot.docs[0].id.match(/^screenControl_(\d{1,20})$/);
                const privateStoreId = match?.[1] || "";
                if (
                    !privateStoreId
                    || String(privateSnapshot.docs[0].data()?.storeId || "") !== privateStoreId
                ) {
                    return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
                }
                controlRef = privateSnapshot.docs[0].ref;
                docRef = summaryRef.doc(`campaigns_${privateStoreId}`);
                targetStoreId = privateStoreId;
            } else if (privateSnapshot.empty) {
                // Compatibility window for token-bearing summaries not yet migrated.
                const legacySnapshot = await summaryRef
                    .where('screen.screenToken', '==', token)
                    .limit(2)
                    .get();
                const legacyStoreId = resolveUniqueLegacyScreenSeenStoreId(
                    legacySnapshot.docs.map((candidate) => candidate.id),
                );
                if (!legacyStoreId) {
                    return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
                }
                controlRef = summaryRef.doc(getPrivateScreenControlDocId(legacyStoreId));
                docRef = legacySnapshot.docs[0].ref;
                targetStoreId = legacyStoreId;
            } else {
                return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
            }
        }

        const commitResult = await commitCurrentScreenSeen({
            controlRef,
            screenRef: docRef,
            storeId: targetStoreId,
            token,
            ...(hasModeAcknowledgement
                ? {
                    mode: mode as DigitalScreenDisplayMode,
                    requestedContentVersion: Number(requestedContentVersion),
                }
                : {}),
        });
        if (commitResult === 'ineligible') {
            return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
        }
        if (commitResult === 'already_seen') return cachedSeenResponse();
        if (commitResult === 'stale_version') {
            return NextResponse.json(
                { error: 'Screen update changed' },
                { status: 409 },
            );
        }

        logger.info('[Screen Seen] Bounded signal recorded', {
            directStoreLookup: Boolean(normalizedStoreId),
            mode: hasModeAcknowledgement ? mode as DigitalScreenDisplayMode : 'legacy',
            ...getBoundedScreenStringContext('storeId', targetStoreId),
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        logScreenDisplayFailure('screen_seen_route_failed', error, logContext);
        // The display request is fire-and-forget, so a retryable response keeps
        // a transient failure from being cached as today's successful signal.
        return NextResponse.json({ error: 'Temporarily unavailable' }, { status: 503 });
    }
}
