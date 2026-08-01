export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Answerlattice Public Contact API
 *
 * Anonymous buyer/contact submissions from answerlattice.com/contact.
 * Writes only to Answerlattice Firebase and does not reuse another product's
 * public enquiry storage so product boundaries stay separate.
 */

import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { getAnswerlatticeRetentionFields } from '@lib/answerlattice/dataRetention';
import { AnswerlatticePublicContactRequestSchema } from '@lib/answerlattice/publicContactContracts';
import {
    answerlatticeAdminApp,
    answerlatticeFirestoreAdmin,
} from '@lib/firebase/answerlatticeFirebaseAdmin';
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import {
    normalizePublicContactReferrer,
    normalizePublicContactSourcePath,
} from '@lib/publicContact/contactBoundary';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { withCORS } from '@lib/security/corsValidation';
import { admin } from '@lib/firebase/firebaseAdminCompat';
import { NextRequest, NextResponse } from 'next/server';
import {
    checkPublicRateLimit,
    getClientIp,
    hashPublicRateLimitValue,
    sanitizeString,
    validateHoneypot,
    verifyTurnstileToken,
} from 'src/middleware/publicApi';

const ANSWERLATTICE_PUBLIC_CONTACT_MAX_BODY_BYTES = 8 * 1024;
const ANSWERLATTICE_PUBLIC_CONTACT_RESPONSE_HEADERS = {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
} as const;

const getAnswerlatticeDb = () => {
    return answerlatticeAdminApp ? answerlatticeFirestoreAdmin : null;
};

const clean = (value?: string | null, max = 500): string | null => {
    const sanitized = sanitizeString(value || undefined);
    return sanitized ? sanitized.slice(0, max) : null;
};

const contactJson = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
    headers: ANSWERLATTICE_PUBLIC_CONTACT_RESPONSE_HEADERS,
    status,
});

async function postAnswerlatticeContact(request: NextRequest) {
    const rateLimitResponse = await checkPublicRateLimit(request, 'ANSWERLATTICE_CONTACT_FORM', {
        failClosed: true,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const bodyResult = await readBoundedJsonBody(request, ANSWERLATTICE_PUBLIC_CONTACT_MAX_BODY_BYTES, {
        invalidJsonMessage: 'Invalid request body.',
        tooLargeMessage: 'Request body too large.',
    });
    if (bodyResult.ok === false) {
        return contactJson(
            {
                accepted: false,
                error: bodyResult.response.status === 413 ? 'Request body too large.' : 'Invalid request body.',
            },
            bodyResult.response.status,
        );
    }

    const validation = AnswerlatticePublicContactRequestSchema.safeParse(bodyResult.data);
    if (!validation.success) {
        return contactJson({ accepted: false, error: 'Please check the form and try again.' }, 400);
    }

    const body = validation.data;
    if (!validateHoneypot(body.website || undefined)) {
        return contactJson({ accepted: true });
    }

    const captchaResult = await verifyTurnstileToken(body.captchaToken, request);
    if (!captchaResult.ok) {
        return contactJson(
            { accepted: false, error: 'Could not verify request. Please try again.' },
            403,
        );
    }

    const db = getAnswerlatticeDb();
    if (!db) {
        return contactJson(
            { accepted: false, error: 'Contact form is unavailable. Please email hello@answerlattice.com.' },
            503,
        );
    }

    try {
        const now = admin.firestore.Timestamp.now();
        const ip = getClientIp(request);
        const docRef = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_CONTACT_ENQUIRIES).add({
            pId: PRODUCT_IDS.ANSWERLATTICE,
            source: 'answerlattice_public_contact',
            status: 'new',
            name: clean(body.name, 120),
            workEmail: clean(body.workEmail, 180),
            phoneNumber: clean(body.phoneNumber, 40),
            productUrl: clean(body.productUrl, 240),
            helpTopic: body.helpTopic,
            message: clean(body.message, 2000),
            consent: body.consent,
            sourcePath: normalizePublicContactSourcePath(body.sourcePath),
            referrer: normalizePublicContactReferrer(request.headers.get('referer')),
            userAgent: clean(request.headers.get('user-agent'), 300),
            ipHash: hashPublicRateLimitValue(ip),
            createdAt: now,
            modifiedOn: now,
            ...getAnswerlatticeRetentionFields('contactEnquiries', now),
        });

        logRuntimeDiagnostic('answerlattice_public_contact_submission_accepted', {
            ...getBoundedRuntimeStringContext('enquiryId', docRef.id),
            helpTopic: body.helpTopic,
            hasProductUrl: Boolean(body.productUrl),
        });

        return contactJson({ accepted: true });
    } catch (error) {
        logRuntimeFailure('answerlattice_public_contact_submission_failed', error, {
            helpTopic: body.helpTopic,
            hasProductUrl: Boolean(body.productUrl),
        });
        return contactJson(
            { accepted: false, error: 'Could not send right now. Please email hello@answerlattice.com.' },
            500,
        );
    }
}

export const POST = withCORS(postAnswerlatticeContact);
