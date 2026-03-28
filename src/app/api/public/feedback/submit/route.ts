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
import { submitGuestFeedback } from '@database/guestFeedback';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { guestFeedbackSubmitSchema } from '@lib/validation/apiSchemas';
import { NextRequest, NextResponse } from 'next/server';
import { checkPublicRateLimit, sanitizeString, validateHoneypot } from 'src/middleware/publicApi';

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
    try {
        const projectDoc = await firestoreAdmin
            .collection('projects')
            .doc(String(data.tId))
            .collection(String(data.sId))
            .doc(data.projectId)
            .get();

        if (!projectDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Invalid project.' },
                { status: 400 }
            );
        }

        const projectData = projectDoc.data();

        // Check if feedback is disabled for this project
        if (projectData?.menuSettings?.feedback === false) {
            return NextResponse.json(
                { success: false, error: 'Feedback is disabled for this menu.' },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('[PublicFeedback] Project verification error:', error);
        return NextResponse.json(
            { success: false, error: 'Unable to verify project.' },
            { status: 500 }
        );
    }

    // 7. Sanitize message (XSS prevention)
    const sanitizedMessage = sanitizeString(data.message);

    // 8. Submit feedback
    try {
        const feedback = await submitGuestFeedback({
            tId: data.tId,
            sId: data.sId,
            projectId: data.projectId,
            rating: data.rating as 1 | 2 | 3 | 4 | 5,
            source: data.source,
            message: sanitizedMessage,
            customerName: sanitizeString(data.customerName),
            customerPhone: data.customerPhone,
            customerEmail: data.customerEmail?.toLowerCase(),
        });

        // 9. Get store's Google Review URL (if available)
        // Direct doc fetch - storeId is the document ID
        let reviewUrl: string | null = null;
        try {
            const storeDoc = await firestoreAdmin
                .collection(DB_COLLECTIONS.STORES)
                .doc(String(data.sId))
                .get();

            if (storeDoc.exists) {
                reviewUrl = storeDoc.data()?.reviewUrl || null;
            }
        } catch {
            // Don't fail if we can't get review URL
        }

        return NextResponse.json(
            {
                success: true,
                feedbackId: feedback.id,
                reviewUrl,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('[PublicFeedback] Submit error:', error);
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
