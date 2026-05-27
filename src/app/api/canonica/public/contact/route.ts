export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Canonica Public Contact API
 *
 * Anonymous buyer/contact submissions from canonica.app/contact.
 * Writes only to Canonica Firebase and does not reuse another product's
 * public enquiry storage so product boundaries stay separate.
 */

import { DB_COLLECTIONS } from '@constant/database';
import { canonicaFirestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { secureError, secureLog } from '@lib/security/secureLogger';
import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkPublicRateLimit, getClientIp, sanitizeString, validateHoneypot } from 'src/middleware/publicApi';

const ContactTopicSchema = z.enum(['setup', 'demo', 'pricing', 'partnership', 'security', 'other']);

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
});

const getCanonicaDb = () => {
    const db = canonicaFirestoreAdmin as any;
    return db && typeof db.collection === 'function' ? canonicaFirestoreAdmin : null;
};

const clean = (value?: string | null, max = 500): string | null => {
    const sanitized = sanitizeString(value || undefined);
    return sanitized ? sanitized.slice(0, max) : null;
};

const hashIp = (ip: string): string => (
    createHash('sha256').update(ip || 'unknown').digest('hex')
);

export async function POST(request: NextRequest) {
    const rateLimitResponse = await checkPublicRateLimit(request, 'CANONICA_CONTACT_FORM');
    if (rateLimitResponse) return rateLimitResponse;

    let payload: unknown;
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ accepted: false, error: 'Invalid request body.' }, { status: 400 });
    }

    const validation = ContactRequestSchema.safeParse(payload);
    if (!validation.success) {
        return NextResponse.json({ accepted: false, error: 'Please check the form and try again.' }, { status: 400 });
    }

    const body = validation.data;
    if (!validateHoneypot(body.website || undefined)) {
        return NextResponse.json({ accepted: true });
    }

    const db = getCanonicaDb();
    if (!db) {
        return NextResponse.json(
            { accepted: false, error: 'Contact form is unavailable. Please email hello@canonica.app.' },
            { status: 503 },
        );
    }

    try {
        const now = admin.firestore.Timestamp.now();
        const ip = getClientIp(request);
        const docRef = await db.collection(DB_COLLECTIONS.CANONICA_CONTACT_ENQUIRIES).add({
            pId: 'CN',
            source: 'canonica_public_contact',
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
            ipHash: hashIp(ip),
            createdAt: now,
            modifiedOn: now,
        });

        secureLog('[Canonica Contact] Submission accepted', {
            enquiryId: docRef.id,
            helpTopic: body.helpTopic,
            hasProductUrl: Boolean(body.productUrl),
        });

        return NextResponse.json({ accepted: true });
    } catch (error) {
        secureError('[Canonica Contact] Submission failed', error as Error, {
            helpTopic: body.helpTopic,
            hasProductUrl: Boolean(body.productUrl),
        });
        return NextResponse.json(
            { accepted: false, error: 'Could not send right now. Please email hello@canonica.app.' },
            { status: 500 },
        );
    }
}
