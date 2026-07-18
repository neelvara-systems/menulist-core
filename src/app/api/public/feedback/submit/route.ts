export const dynamic = 'force-dynamic';
/**
 * Public Guest Feedback Submit Endpoint
 * 
 * POST /api/public/feedback/submit
 * 
 * PUBLIC ENDPOINT - No authentication required.
 * Rate limited by IP address using Upstash.
 * 
 * @see __docs__/projects/internal-feedback-system/
 */


import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { getBoundedGuestFeedbackStringContext, logGuestFeedbackFailure } from '@database/guestFeedback/guestFeedbackDiagnostics';
import { logFeedbackMOLEventAdmin, submitGuestFeedbackAdmin } from '@database/guestFeedback/server';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { normalizeGuestFeedbackNumericDocumentId, normalizeGuestFeedbackProjectId } from '@lib/feedback/guestFeedbackProjectIdBoundary';
import { normalizeGuestFeedbackReviewUrl } from '@lib/feedback/guestFeedbackSubmitResponse';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { withCORS } from '@lib/security/corsValidation';
import { guestFeedbackSubmitSchema } from '@lib/validation/apiSchemas';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
    checkPublicRateLimit,
    sanitizeString,
    validateHoneypot,
    verifyTurnstileToken,
} from 'src/middleware/publicApi';

const PUBLIC_FEEDBACK_SUBMIT_MAX_BODY_BYTES = 16 * 1024;

type EffectiveFeedbackDefaults = {
    collectComment: boolean;
    collectCommentRequired: boolean;
    collectName: boolean;
    collectNameRequired: boolean;
    collectPhone: boolean;
    collectPhoneRequired: boolean;
    collectEmail: boolean;
    collectEmailRequired: boolean;
};

function resolveFeedbackDefaults(raw: unknown): EffectiveFeedbackDefaults {
    const value = raw && typeof raw === 'object' && !Array.isArray(raw)
        ? raw as Record<string, unknown>
        : {};
    return {
        collectComment: value.collectComment !== false,
        collectCommentRequired: value.collectCommentRequired === true,
        collectName: value.collectName === true,
        collectNameRequired: value.collectNameRequired === true,
        collectPhone: value.collectPhone !== false,
        collectPhoneRequired: value.collectPhoneRequired === true,
        collectEmail: value.collectEmail !== false,
        collectEmailRequired: value.collectEmailRequired === true,
    };
}

function requiredFieldError() {
    return NextResponse.json(
        {
            success: false,
            error: 'Validation failed.',
        },
        { status: 400 },
    );
}

/**
 * POST /api/public/feedback/submit
 * 
 * Submit guest feedback for a business.
 * Public endpoint - no authentication required.
 */
async function postGuestFeedback(req: NextRequest) {
    // 1. Check feature flag
    if (!FEATURE_FLAGS.ENABLE_GUEST_FEEDBACK) {
        return NextResponse.json(
            { success: false, error: 'Feedback is currently disabled.' },
            { status: 503 }
        );
    }

    // 2. Rate limiting (uses existing Upstash)
    const rateLimitResponse = await checkPublicRateLimit(req, 'FEEDBACK_SUBMISSION');
    if (rateLimitResponse) return rateLimitResponse;

    // 3. Parse request body
    const bodyResult = await readBoundedJsonBody(req, PUBLIC_FEEDBACK_SUBMIT_MAX_BODY_BYTES);
    if (bodyResult.ok === false) {
        return NextResponse.json(
            {
                success: false,
                error: bodyResult.response.status === 413 ? 'Request body too large.' : 'Invalid JSON body.',
            },
            { status: bodyResult.response.status }
        );
    }

    // 4. Validate with Zod schema
    const validation = guestFeedbackSubmitSchema.safeParse(bodyResult.data);
    if (!validation.success) {
        return NextResponse.json(
            {
                success: false,
                error: 'Validation failed.',
            },
            { status: 400 }
        );
    }

    const data = validation.data;
    // Preserve compatibility with an already-open pre-deploy form. Current
    // clients always send a stable key; legacy omissions receive a unique key
    // and retain the prior one-request/one-record behavior.
    const submissionId = data.submissionId || randomUUID();
    const projectId = normalizeGuestFeedbackProjectId(data.projectId);
    const tenantScope = normalizeGuestFeedbackNumericDocumentId(data.tId);
    const storeScope = normalizeGuestFeedbackNumericDocumentId(data.sId);
    if (!projectId || !tenantScope || !storeScope) {
        return NextResponse.json(
            {
                success: false,
                error: 'Validation failed.',
            },
            { status: 400 }
        );
    }
    const tenantDocumentId = tenantScope.documentId;
    const storeDocumentId = storeScope.documentId;
    const tenantId = tenantScope.numericId;
    const storeId = storeScope.numericId;

    // 5. Honeypot check (bot detection)
    if (!validateHoneypot(data.website)) {
        // Silently reject - don't tell bots they've been caught
        return NextResponse.json(
            { success: true, feedbackId: 'submitted' },
            { status: 201 }
        );
    }

    const captchaResult = await verifyTurnstileToken(data.captchaToken, req);
    if (!captchaResult.ok) {
        return NextResponse.json(
            {
                success: false,
                error: 'Could not verify request. Please try again.',
            },
            { status: 403 },
        );
    }

    // 6. Verify project exists and has feedback enabled
    // Uses correct nested path: projects/{tId}/{sId}/{projectId}
    let storeFeedbackDefaults: EffectiveFeedbackDefaults | null = null;
    let reviewUrl: string | null = null;

    try {
        const projectRef = firestoreAdmin
            .collection(DB_COLLECTIONS.PROJECTS)
            .doc(tenantDocumentId)
            .collection(storeDocumentId)
            .doc(projectId);
        const storeRef = firestoreAdmin
            .collection(DB_COLLECTIONS.STORES)
            .doc(storeDocumentId);
        const tenantRef = firestoreAdmin
            .collection(DB_COLLECTIONS.TENANTS)
            .doc(tenantDocumentId);

        const [projectDoc, storeDoc, tenantDoc] = await Promise.all([
            projectRef.get(),
            storeRef.get(),
            tenantRef.get(),
        ]);

        if (!projectDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Invalid project.' },
                { status: 400 }
            );
        }

        const projectData = projectDoc.data();
        if (projectData?.active === false || projectData?.deleted === true) {
            return NextResponse.json(
                { success: false, error: 'Invalid project.' },
                { status: 400 }
            );
        }

        // Check if feedback is disabled for this project
        if (projectData?.menuSettings?.feedback === false) {
            return NextResponse.json(
                { success: false, error: 'Feedback is disabled for this menu.' },
                { status: 400 }
            );
        }

        if (!storeDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Invalid store.' },
                { status: 400 }
            );
        }

        const storeData = storeDoc.data();
        const storeTenantScope = normalizeGuestFeedbackNumericDocumentId(storeData?.tenantId ?? storeData?.tId);
        if (!storeTenantScope || storeTenantScope.numericId !== tenantId) {
            return NextResponse.json(
                { success: false, error: 'Invalid store.' },
                { status: 400 }
            );
        }

        if (storeData?.active === false || storeData?.deleted === true || isPlatformEntityBlocked(storeData)) {
            return NextResponse.json(
                { success: false, error: 'Invalid store.' },
                { status: 400 }
            );
        }

        const tenantData = tenantDoc.data();
        if (
            !tenantDoc.exists
            || tenantData?.active === false
            || tenantData?.deleted === true
            || isPlatformEntityBlocked(tenantData)
        ) {
            return NextResponse.json(
                { success: false, error: 'Invalid store.' },
                { status: 400 }
            );
        }

        if (storeData?.feedbackEnabled === false) {
            return NextResponse.json(
                { success: false, error: 'Feedback is disabled for this business.' },
                { status: 400 }
            );
        }

        storeFeedbackDefaults = resolveFeedbackDefaults(storeData?.feedbackDefaults || null);
        reviewUrl = normalizeGuestFeedbackReviewUrl(storeData?.reviewUrl, 'store_review_url')
            || normalizeGuestFeedbackReviewUrl(storeData?.publicPresence?.googleReviewUrl, 'public_presence_google_review_url')
            || null;
    } catch (error) {
        logGuestFeedbackFailure('public_guest_feedback_scope_verification_failed', error, {
            ...getBoundedGuestFeedbackStringContext('tenantId', tenantDocumentId),
            ...getBoundedGuestFeedbackStringContext('storeId', storeDocumentId),
            ...getBoundedGuestFeedbackStringContext('projectId', projectId),
            source: data.source,
            rating: data.rating,
            hasCaptchaToken: Boolean(data.captchaToken),
        });
        return NextResponse.json(
            { success: false, error: 'Unable to verify feedback settings.' },
            { status: 500 }
        );
    }

    // 7. Sanitize message (XSS prevention)
    const sanitizedMessage = sanitizeString(data.message);
    const sanitizedName = sanitizeString(data.customerName);
    const sanitizedPhone = sanitizeString(data.customerPhone);
    const sanitizedEmail = sanitizeString(data.customerEmail)?.toLowerCase();

    // 8. Validate store-level feedback defaults
    const defaults = storeFeedbackDefaults || resolveFeedbackDefaults(null);
    const effectiveMessage = defaults.collectComment ? sanitizedMessage : undefined;
    const effectiveName = defaults.collectName ? sanitizedName : undefined;
    const effectivePhone = defaults.collectPhone ? sanitizedPhone : undefined;
    const effectiveEmail = defaults.collectEmail ? sanitizedEmail : undefined;

    if (effectiveName && effectiveName.length < 2) return requiredFieldError();
    if (defaults.collectCommentRequired && !effectiveMessage) return requiredFieldError();
    if (defaults.collectNameRequired && !effectiveName) return requiredFieldError();
    if (defaults.collectPhoneRequired && !effectivePhone) return requiredFieldError();
    if (defaults.collectEmailRequired && !effectiveEmail) return requiredFieldError();

    // 9. Submit feedback
    try {
        const submission = await submitGuestFeedbackAdmin({
            tId: tenantId,
            sId: storeId,
            projectId,
            rating: data.rating as 1 | 2 | 3 | 4 | 5,
            source: data.source,
            submissionId,
            message: effectiveMessage,
            customerName: effectiveName,
            customerPhone: effectivePhone,
            customerEmail: effectiveEmail,
        });
        await logFeedbackMOLEventAdmin(
            'FEEDBACK_SUBMITTED',
            tenantId,
            storeId,
            projectId,
            data.rating,
            submission.feedback.id,
        );

        return NextResponse.json(
            {
                success: true,
                feedbackId: submission.feedback.id,
                reviewUrl,
            },
            { status: submission.created ? 201 : 200 }
        );
    } catch (error) {
        logGuestFeedbackFailure('public_guest_feedback_submit_failed', error, {
            ...getBoundedGuestFeedbackStringContext('tenantId', tenantDocumentId),
            ...getBoundedGuestFeedbackStringContext('storeId', storeDocumentId),
            ...getBoundedGuestFeedbackStringContext('projectId', projectId),
            source: data.source,
            rating: data.rating,
            hasComment: Boolean(effectiveMessage),
            hasName: Boolean(effectiveName),
            hasPhone: Boolean(effectivePhone),
            hasEmail: Boolean(effectiveEmail),
        });
        return NextResponse.json(
            { success: false, error: 'Failed to submit feedback.' },
            { status: 500 }
        );
    }
}

export const POST = withCORS(postGuestFeedback);
