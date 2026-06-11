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
import { logFeedbackMOLEventAdmin, submitGuestFeedbackAdmin } from '@database/guestFeedback/server';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';
import { secureError } from '@lib/security/secureLogger';
import { guestFeedbackSubmitSchema } from '@lib/validation/apiSchemas';
import { NextRequest, NextResponse } from 'next/server';
import { checkPublicRateLimit, sanitizeString, validateHoneypot } from 'src/middleware/publicApi';

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

function resolveFeedbackDefaults(raw: any): EffectiveFeedbackDefaults {
    return {
        collectComment: raw?.collectComment !== false,
        collectCommentRequired: raw?.collectCommentRequired === true,
        collectName: raw?.collectName === true,
        collectNameRequired: raw?.collectNameRequired === true,
        collectPhone: raw?.collectPhone !== false,
        collectPhoneRequired: raw?.collectPhoneRequired === true,
        collectEmail: raw?.collectEmail !== false,
        collectEmailRequired: raw?.collectEmailRequired === true,
    };
}

function requiredFieldError(field: string, message: string) {
    return NextResponse.json(
        {
            success: false,
            error: 'Validation failed.',
            details: [{ field, message }],
        },
        { status: 400 },
    );
}

/**
 * POST /api/public/feedback/submit
 * 
 * Submit guest feedback for a restaurant.
 * Public endpoint - no authentication required.
 */
export async function POST(req: NextRequest) {
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
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid JSON body.' },
            { status: 400 }
        );
    }

    // 4. Validate with Zod schema
    const validation = guestFeedbackSubmitSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json(
            {
                success: false,
                error: 'Validation failed.',
                details: validation.error.issues.map(i => ({
                    field: i.path.join('.'),
                    message: i.message,
                })),
            },
            { status: 400 }
        );
    }

    const data = validation.data;

    // 5. Honeypot check (bot detection)
    if (!validateHoneypot(data.website)) {
        // Silently reject - don't tell bots they've been caught
        return NextResponse.json(
            { success: true, feedbackId: 'submitted' },
            { status: 201 }
        );
    }

    // 6. Verify project exists and has feedback enabled
    // Uses correct nested path: projects/{tId}/{sId}/{projectId}
    let storeFeedbackDefaults: EffectiveFeedbackDefaults | null = null;
    let reviewUrl: string | null = null;

    try {
        const projectRef = firestoreAdmin
            .collection(DB_COLLECTIONS.PROJECTS)
            .doc(String(data.tId))
            .collection(String(data.sId))
            .doc(data.projectId);
        const storeRef = firestoreAdmin
            .collection(DB_COLLECTIONS.STORES)
            .doc(String(data.sId));

        const [projectDoc, storeDoc] = await Promise.all([
            projectRef.get(),
            storeRef.get(),
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
        const storeTenantId = Number(storeData?.tenantId ?? storeData?.tId ?? 0);
        if (storeTenantId !== Number(data.tId)) {
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

        if (storeData?.feedbackEnabled === false) {
            return NextResponse.json(
                { success: false, error: 'Feedback is disabled for this business.' },
                { status: 400 }
            );
        }

        storeFeedbackDefaults = resolveFeedbackDefaults(storeData?.feedbackDefaults || null);
        reviewUrl = storeData?.reviewUrl || storeData?.publicPresence?.googleReviewUrl || null;
    } catch (error) {
        secureError(
            '[PublicFeedback] Project/store verification error',
            error instanceof Error ? error : new Error(String(error)),
            { tId: data.tId, sId: data.sId, projectId: data.projectId },
        );
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

    if (defaults.collectCommentRequired && !effectiveMessage) return requiredFieldError('message', 'Comment is required.');
    if (defaults.collectNameRequired && !effectiveName) return requiredFieldError('customerName', 'Name is required.');
    if (defaults.collectPhoneRequired && !effectivePhone) return requiredFieldError('customerPhone', 'Phone is required.');
    if (defaults.collectEmailRequired && !effectiveEmail) return requiredFieldError('customerEmail', 'Email is required.');

    // 9. Submit feedback
    try {
        const feedback = await submitGuestFeedbackAdmin({
            tId: data.tId,
            sId: data.sId,
            projectId: data.projectId,
            rating: data.rating as 1 | 2 | 3 | 4 | 5,
            source: data.source,
            message: effectiveMessage,
            customerName: effectiveName,
            customerPhone: effectivePhone,
            customerEmail: effectiveEmail,
        });
        void logFeedbackMOLEventAdmin('FEEDBACK_SUBMITTED', data.tId, data.sId, data.projectId, data.rating);

        return NextResponse.json(
            {
                success: true,
                feedbackId: feedback.id,
                reviewUrl,
            },
            { status: 201 }
        );
    } catch (error) {
        secureError(
            '[PublicFeedback] Submit error',
            error instanceof Error ? error : new Error(String(error)),
            { tId: data.tId, sId: data.sId, projectId: data.projectId },
        );
        return NextResponse.json(
            { success: false, error: 'Failed to submit feedback.' },
            { status: 500 }
        );
    }
}

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        },
    });
}
