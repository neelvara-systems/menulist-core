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
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { withCORS } from '@lib/security/corsValidation';
import * as admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
    checkPublicRateLimit,
    getClientIp,
    hashPublicRateLimitValue,
    sanitizeString,
    validateHoneypot,
    verifyTurnstileToken,
} from 'src/middleware/publicApi';

const ContactTopicSchema = z.enum(['setup', 'demo', 'pricing', 'partnership', 'security', 'other']);
const ANSWERLATTICE_PUBLIC_CONTACT_MAX_BODY_BYTES = 8 * 1024;

const ContactRequestSchema = z.object({
    name: z.string().trim().min(2).max(120),
    workEmail: z.string().trim().email().max(180),
    phoneNumber: z.string().trim().max(40).optional().nullable(),
    productUrl: z.string().trim().max(240).optional().nullable(),
    helpTopic: ContactTopicSchema,
    message: z.string().trim().min(10).max(2000),
    consent: z.boolean().refine((value) => value === true),
    sourcePath: z.string().trim().max(240).optional().nullable(),
    website: z.string().optional().nullable(),
    captchaToken: z.string().max(2048).optional(),
}).strict();

const getAnswerlatticeDb = () => {
    const db = answerlatticeFirestoreAdmin as any;
    return db && typeof db.collection === 'function' ? answerlatticeFirestoreAdmin : null;
};

const clean = (value?: string | null, max = 500): string | null => {
    const sanitized = sanitizeString(value || undefined);
    return sanitized ? sanitized.slice(0, max) : null;
};

async function postAnswerlatticeContact(request: NextRequest) {
    const rateLimitResponse = await checkPublicRateLimit(request, 'ANSWERLATTICE_CONTACT_FORM');
    if (rateLimitResponse) return rateLimitResponse;

    const bodyResult = await readBoundedJsonBody(request, ANSWERLATTICE_PUBLIC_CONTACT_MAX_BODY_BYTES, {
        invalidJsonMessage: 'Invalid request body.',
        tooLargeMessage: 'Request body too large.',
    });
    if (bodyResult.ok === false) {
        return NextResponse.json(
            {
                accepted: false,
                error: bodyResult.response.status === 413 ? 'Request body too large.' : 'Invalid request body.',
            },
            { status: bodyResult.response.status },
        );
    }

    const validation = ContactRequestSchema.safeParse(bodyResult.data);
    if (!validation.success) {
        return NextResponse.json({ accepted: false, error: 'Please check the form and try again.' }, { status: 400 });
    }

    const body = validation.data;
    if (!validateHoneypot(body.website || undefined)) {
        return NextResponse.json({ accepted: true });
    }

    const captchaResult = await verifyTurnstileToken(body.captchaToken, request);
    if (!captchaResult.ok) {
        return NextResponse.json(
            { accepted: false, error: 'Could not verify request. Please try again.' },
            { status: 403 },
        );
    }

    const db = getAnswerlatticeDb();
    if (!db) {
        return NextResponse.json(
            { accepted: false, error: 'Contact form is unavailable. Please email hello@answerlattice.com.' },
            { status: 503 },
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
            sourcePath: clean(body.sourcePath, 240),
            referrer: clean(request.headers.get('referer'), 300),
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

        return NextResponse.json({ accepted: true });
    } catch (error) {
        logRuntimeFailure('answerlattice_public_contact_submission_failed', error, {
            helpTopic: body.helpTopic,
            hasProductUrl: Boolean(body.productUrl),
        });
        return NextResponse.json(
            { accepted: false, error: 'Could not send right now. Please email hello@answerlattice.com.' },
            { status: 500 },
        );
    }
}

export const POST = withCORS(postAnswerlatticeContact);
