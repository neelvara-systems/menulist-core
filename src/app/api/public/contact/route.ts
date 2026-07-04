export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { DB_COLLECTIONS } from '@constant/database';
import { admin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { withCORS } from '@lib/security/corsValidation';
import { getBoundedSecurityStringContext, logSecurityFailure } from '@lib/security/securityDiagnostics';
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

const MENULIST_PUBLIC_CONTACT_MAX_BODY_BYTES = 8 * 1024;
const ContactTopicSchema = z.enum(['general', 'demo', 'multi-location', 'pricing', 'other']);
const ShareableToolReportStatusSchema = z.enum([
    'ready',
    'missing_basics',
    'unclear',
    'not_checked',
    'manual_review_needed',
]);
const ShareableToolReportSetupJobSchema = z.object({
    id: z.string().trim().max(80).optional().nullable(),
    label: z.string().trim().min(1).max(160),
    reason: z.string().trim().min(1).max(260),
}).strict();

const ShareableToolReportSourceContextSchema = z.object({
    sourceKind: z.literal('shareable_tool_report'),
    toolId: z.string().trim().min(1).max(80).optional().nullable(),
    reportStatus: ShareableToolReportStatusSchema.optional().nullable(),
    businessName: z.string().trim().max(140).optional().nullable(),
    businessContext: z.string().trim().max(160).optional().nullable(),
    reportGeneratedAt: z.string().trim().max(80).optional().nullable(),
    missingCount: z.number().int().min(0).max(999).optional().nullable(),
    unclearCount: z.number().int().min(0).max(999).optional().nullable(),
    notCheckedCount: z.number().int().min(0).max(999).optional().nullable(),
    primaryNumber: z.number().int().min(0).max(999).optional().nullable(),
    setupJobList: z.array(ShareableToolReportSetupJobSchema).max(6).optional().nullable(),
}).strict();

const ContactRequestSchema = z.object({
    name: z.string().trim().min(2).max(120),
    workEmail: z.string().trim().email().max(180),
    phoneNumber: z.string().trim().max(40).optional().nullable(),
    helpTopic: ContactTopicSchema.optional().nullable(),
    message: z.string().trim().min(10).max(2000),
    agreeToTerms: z.boolean().refine((value) => value === true),
    sourcePath: z.string().trim().max(240).optional().nullable(),
    sourceContext: ShareableToolReportSourceContextSchema.optional().nullable(),
    website: z.string().optional().nullable(),
    captchaToken: z.string().max(2048).optional(),
});

type ShareableToolReportSourceContext = z.infer<typeof ShareableToolReportSourceContextSchema>;

const clean = (value?: string | null, max = 500): string | null => {
    const sanitized = sanitizeString(value || undefined);
    return sanitized ? sanitized.slice(0, max) : null;
};

const cleanNumber = (value?: number | null): number | null => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return Math.max(0, Math.min(999, Math.floor(value)));
};

const cleanShareableToolReportSetupJobList = (
    setupJobList?: ShareableToolReportSourceContext['setupJobList'],
) => {
    if (!Array.isArray(setupJobList)) return [];

    return setupJobList
        .slice(0, 6)
        .map((job, index) => ({
            id: clean(job.id, 80) || `job_${index + 1}`,
            label: clean(job.label, 160),
            reason: clean(job.reason, 260),
        }))
        .filter((job) => Boolean(job.label && job.reason));
};

const cleanShareableToolReportSourceContext = (
    sourceContext?: ShareableToolReportSourceContext | null,
) => {
    if (!sourceContext) return null;

    return {
        sourceKind: 'shareable_tool_report' as const,
        toolId: clean(sourceContext.toolId, 80),
        reportStatus: sourceContext.reportStatus || null,
        businessName: clean(sourceContext.businessName, 140),
        businessContext: clean(sourceContext.businessContext, 160),
        reportGeneratedAt: clean(sourceContext.reportGeneratedAt, 80),
        missingCount: cleanNumber(sourceContext.missingCount),
        unclearCount: cleanNumber(sourceContext.unclearCount),
        notCheckedCount: cleanNumber(sourceContext.notCheckedCount),
        primaryNumber: cleanNumber(sourceContext.primaryNumber),
        setupJobList: cleanShareableToolReportSetupJobList(sourceContext.setupJobList),
    };
};

const sanitizeForFirestore = (value: unknown): unknown => {
    if (value === undefined) return null;
    if (value === null) return null;
    if (value instanceof admin.firestore.Timestamp) return value;
    if (Array.isArray(value)) return value.map(sanitizeForFirestore);
    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
                key,
                sanitizeForFirestore(nestedValue),
            ]),
        );
    }
    return value;
};

async function postMenuListContact(request: NextRequest) {
    const rateLimitResponse = await checkPublicRateLimit(request, 'MENULIST_CONTACT_FORM');
    if (rateLimitResponse) return rateLimitResponse;

    const bodyResult = await readBoundedJsonBody(request, MENULIST_PUBLIC_CONTACT_MAX_BODY_BYTES, {
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
        return NextResponse.json({
            accepted: true,
            helpTopic: body.helpTopic || 'general',
            source: 'menulist_public_contact',
            status: 'ignored',
        });
    }

    const captchaResult = await verifyTurnstileToken(body.captchaToken, request);
    if (!captchaResult.ok) {
        return NextResponse.json(
            { accepted: false, error: 'Could not verify request. Please try again.' },
            { status: 403 },
        );
    }

    try {
        const now = admin.firestore.Timestamp.now();
        const ip = getClientIp(request);
        const helpTopic = body.helpTopic || 'general';
        const sourceContext = cleanShareableToolReportSourceContext(body.sourceContext);
        const enquiryPayload = sanitizeForFirestore({
            source: 'menulist_public_contact',
            sourceKind: sourceContext?.sourceKind || null,
            sourceToolId: sourceContext?.toolId || null,
            sourceReportStatus: sourceContext?.reportStatus || null,
            sourcePrimaryNumber: sourceContext?.primaryNumber || null,
            sourceContext,
            status: 'new',
            name: clean(body.name, 120),
            workEmail: clean(body.workEmail, 180)?.toLowerCase() || null,
            phoneNumber: clean(body.phoneNumber, 40),
            helpTopic,
            message: clean(body.message, 2000),
            agreeToTerms: body.agreeToTerms,
            sourcePath: clean(body.sourcePath, 240),
            referrer: clean(request.headers.get('referer'), 300),
            userAgent: clean(request.headers.get('user-agent'), 300),
            ipHash: hashPublicRateLimitValue(ip),
            createdOn: now,
            modifiedOn: now,
        }) as Record<string, unknown>;

        await firestoreAdmin.collection(DB_COLLECTIONS.LANDING_PAGE_ENQUIRIES).add(enquiryPayload);

        return NextResponse.json({
            accepted: true,
            helpTopic,
            source: 'menulist_public_contact',
            status: 'accepted',
        });
    } catch (error) {
        logSecurityFailure('menulist_contact_submission_failed', error, {
            helpTopic: body.helpTopic || 'general',
            hasPhoneNumber: Boolean(body.phoneNumber),
            messageLength: body.message.length,
            ...getBoundedSecurityStringContext('sourcePath', body.sourcePath),
            ...getBoundedSecurityStringContext('sourceKind', body.sourceContext?.sourceKind),
            ...getBoundedSecurityStringContext('sourceToolId', body.sourceContext?.toolId),
            ...getBoundedSecurityStringContext('referrer', request.headers.get('referer')),
        });
        return NextResponse.json(
            { accepted: false, error: 'Could not send right now. Please email hello@menulist.ai.' },
            { status: 500 },
        );
    }
}

export const POST = withCORS(postMenuListContact);
