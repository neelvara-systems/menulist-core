export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { PERMISSIONS, type PermissionKey } from '@constant/permissions';
import {
    createImageSubjectProfile,
    deleteImageSubjectProfile,
    ImageSubjectProfileError,
    listImageSubjectProfiles,
    readImageSubjectReference,
    renameImageSubjectProfile,
    replaceImageSubjectProfileReferences,
    withdrawImageSubjectProfile,
} from '@lib/ai/imageSubjectProfiles';
import { getAIRouteSecurityContext } from '@lib/google/genAi/diagnostics';
import { logger } from '@lib/monitoring/logger';
import { requireAnyStorePermission, resolveStorePermissionSessionScope } from '@lib/permissions/server';
import { checkAIRateLimit, checkDataWriteLimit } from '@lib/rateLimit/helpers';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import {
    IMAGE_SUBJECT_REFERENCE_MAX,
    IMAGE_SUBJECT_REFERENCE_MIN,
} from '@type/imageSubjectProfile';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../middleware/auth';

const MAX_BODY_BYTES = 20 * 1024 * 1024;
const dataUrlSchema = z.string().min(32).max(4 * 1024 * 1024).regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/i);
const profileIdSchema = z.string().uuid();
const createSchema = z.object({
    consent: z.object({
        adultConfirmed: z.literal(true),
        commercialUsePermissionConfirmed: z.literal(true),
        publicFigureConfirmedFalse: z.literal(true),
        rightsConfirmed: z.literal(true),
    }).strict(),
    label: z.string().trim().min(1).max(80),
    references: z.array(z.object({
        dataUrl: dataUrlSchema,
        name: z.string().trim().max(160).optional(),
    }).strict()).min(IMAGE_SUBJECT_REFERENCE_MIN).max(IMAGE_SUBJECT_REFERENCE_MAX),
}).strict();
const actionSchema = z.discriminatedUnion('action', [
    z.object({ profileId: profileIdSchema, action: z.literal('withdraw') }).strict(),
    z.object({
        action: z.literal('rename'),
        expectedVersion: z.number().int().positive().max(1_000_000),
        label: z.string().trim().min(1).max(80),
        profileId: profileIdSchema,
    }).strict(),
]);
const updateSchema = createSchema.extend({
    expectedVersion: z.number().int().positive().max(1_000_000),
    profileId: profileIdSchema,
}).strict();
const deleteSchema = z.object({ profileId: profileIdSchema }).strict();
const getQuerySchema = z.object({
    includeWithdrawn: z.enum(['true', 'false']).optional(),
    profileId: profileIdSchema.optional(),
    referenceId: z.string().uuid().optional(),
}).strict().refine(
    (value) => (Boolean(value.profileId) === Boolean(value.referenceId))
        && !(value.profileId && value.includeWithdrawn),
    { message: 'Invalid saved-person query' },
);

function errorResponse(error: unknown) {
    if (error instanceof ImageSubjectProfileError) {
        if (error.code === 'LIMIT_REACHED') {
            return NextResponse.json({ error: 'This store can keep up to 8 saved people. Delete one before adding another.' }, { status: 409 });
        }
        if (error.code === 'NOT_ACTIVE' || error.code === 'VERSION_MISMATCH') {
            return NextResponse.json({ error: 'The saved person profile is no longer available for this action.' }, { status: 409 });
        }
        const invalidInput = error.code === 'CONSENT_REQUIRED' || error.code === 'INVALID_INPUT';
        return NextResponse.json({ error: invalidInput ? 'Valid photos and all consent confirmations are required.' : 'Saved person profile not found.' }, { status: invalidInput ? 400 : 404 });
    }
    return NextResponse.json({ error: 'Unable to manage saved person profiles right now.' }, { status: 500 });
}

function getScope(session: any) {
    const scope = resolveStorePermissionSessionScope(session);
    return scope ? { sId: String(scope.storeScope.numericId), tId: String(scope.tenantScope.numericId) } : null;
}

function featureDisabledResponse() {
    if (!FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION || !FEATURE_FLAGS.ENABLE_AI_SUBJECT_PROFILES) {
        return NextResponse.json({ error: 'Feature disabled' }, { status: 404 });
    }
    return null;
}

function logInvalidInput(request: any, session: any, action: string, issueCount?: number) {
    logger.security('Saved Person Profile Input Validation Failed', {
        ...getAIRouteSecurityContext(session, request),
        action,
        endpoint: '/api/image-subject-profiles',
        issueCount,
    }, 'medium');
}

async function authorize(request: any, session: any, label: string, permissions: PermissionKey[] = [PERMISSIONS.GENERATE_IMAGES]) {
    const permissionError = await requireAnyStorePermission(request, session, permissions, label);
    if (permissionError) return permissionError;
    if (!getScope(session)) return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    return null;
}

export const GET = withAuth(async (request, session) => {
    const featureError = featureDisabledResponse();
    if (featureError) return featureError;
    const rateLimitError = await checkAIRateLimit('DATA_READ', 'subject-profile-read', { failClosedOnProviderError: true, session });
    if (rateLimitError) return rateLimitError;
    const rawQuery = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsedQuery = getQuerySchema.safeParse(rawQuery);
    const knownQueryKeys = new Set(['includeWithdrawn', 'profileId', 'referenceId']);
    const queryKeys = Array.from(request.nextUrl.searchParams.keys());
    if (
        !parsedQuery.success
        || queryKeys.some((key) => !knownQueryKeys.has(key))
        || new Set(queryKeys).size !== queryKeys.length
    ) {
        logInvalidInput(request, session, 'read', parsedQuery.success ? 1 : parsedQuery.error.issues.length);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const includeWithdrawn = parsedQuery.data.includeWithdrawn === 'true';
    const authError = await authorize(
        request,
        session,
        includeWithdrawn ? 'Manage saved person profiles' : 'Saved person profiles',
        includeWithdrawn ? [PERMISSIONS.MANAGE_STORE] : [PERMISSIONS.GENERATE_IMAGES],
    );
    if (authError) return authError;
    const scope = getScope(session)!;
    try {
        if (parsedQuery.data.profileId && parsedQuery.data.referenceId) {
            const image = await readImageSubjectReference({
                ...scope,
                profileId: parsedQuery.data.profileId,
                referenceId: parsedQuery.data.referenceId,
            });
            return new NextResponse(new Uint8Array(image.buffer), {
                headers: {
                    'Cache-Control': 'private, no-store, max-age=0',
                    'Content-Security-Policy': "default-src 'none'; sandbox",
                    'Content-Type': image.mimeType,
                    'X-Content-Type-Options': 'nosniff',
                },
            });
        }
        return NextResponse.json({
            profiles: await listImageSubjectProfiles(scope.tId, scope.sId, { includeWithdrawn }),
        }, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        logger.error('Saved person profile read failed', error, { ...getAIRouteSecurityContext(session, request), endpoint: '/api/image-subject-profiles' });
        return errorResponse(error);
    }
});

export const POST = withAuth(async (request, session) => {
    const featureError = featureDisabledResponse();
    if (featureError) return featureError;
    const rateLimitError = await checkAIRateLimit('FILE_UPLOAD', 'subject-profile-upload', { failClosedOnProviderError: true, session });
    if (rateLimitError) return rateLimitError;
    const body = await readBoundedJsonBody(request, MAX_BODY_BYTES);
    if (body.ok === false) {
        logInvalidInput(request, session, 'create');
        return body.response;
    }
    const parsed = createSchema.safeParse(body.data);
    if (!parsed.success) {
        logInvalidInput(request, session, 'create', parsed.error.issues.length);
        return NextResponse.json({ error: 'Add 2–4 valid photos and confirm every consent item.' }, { status: 400 });
    }
    const authError = await authorize(request, session, 'Create saved person profile', [PERMISSIONS.MANAGE_STORE]);
    if (authError) return authError;
    try {
        return NextResponse.json({ profile: await createImageSubjectProfile({ input: parsed.data, ...getScope(session)!, userId: session.user.id }) }, { status: 201 });
    } catch (error) {
        logger.error('Saved person profile creation failed', error, { ...getAIRouteSecurityContext(session, request), endpoint: '/api/image-subject-profiles' });
        return errorResponse(error);
    }
});

export const PATCH = withAuth(async (request, session) => {
    const featureError = featureDisabledResponse();
    if (featureError) return featureError;
    const rateLimitError = await checkDataWriteLimit({ session });
    if (rateLimitError) return rateLimitError;
    const body = await readBoundedJsonBody(request, 16 * 1024);
    if (body.ok === false) {
        logInvalidInput(request, session, 'profile-action');
        return body.response;
    }
    const parsed = actionSchema.safeParse(body.data);
    if (!parsed.success) {
        logInvalidInput(request, session, 'profile-action', parsed.error.issues.length);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const authError = await authorize(request, session, 'Manage saved person profile', [PERMISSIONS.MANAGE_STORE]);
    if (authError) return authError;
    try {
        const scope = getScope(session)!;
        const profile = parsed.data.action === 'rename'
            ? await renameImageSubjectProfile({
                ...scope,
                expectedVersion: parsed.data.expectedVersion,
                label: parsed.data.label,
                profileId: parsed.data.profileId,
                userId: session.user.id,
            })
            : await withdrawImageSubjectProfile({ ...scope, profileId: parsed.data.profileId, userId: session.user.id });
        return NextResponse.json({ profile });
    } catch (error) {
        logger.error('Saved person profile action failed', error, { ...getAIRouteSecurityContext(session, request), endpoint: '/api/image-subject-profiles' });
        return errorResponse(error);
    }
});

export const PUT = withAuth(async (request, session) => {
    const featureError = featureDisabledResponse();
    if (featureError) return featureError;
    const rateLimitError = await checkAIRateLimit('FILE_UPLOAD', 'subject-profile-update', { failClosedOnProviderError: true, session });
    if (rateLimitError) return rateLimitError;
    const body = await readBoundedJsonBody(request, MAX_BODY_BYTES);
    if (body.ok === false) {
        logInvalidInput(request, session, 'update');
        return body.response;
    }
    const parsed = updateSchema.safeParse(body.data);
    if (!parsed.success) {
        logInvalidInput(request, session, 'update', parsed.error.issues.length);
        return NextResponse.json({ error: 'Add 2–4 valid replacement photos and confirm every consent item.' }, { status: 400 });
    }
    const authError = await authorize(request, session, 'Update saved person profile', [PERMISSIONS.MANAGE_STORE]);
    if (authError) return authError;
    try {
        return NextResponse.json({
            profile: await replaceImageSubjectProfileReferences({
                input: parsed.data,
                ...getScope(session)!,
                userId: session.user.id,
            }),
        });
    } catch (error) {
        logger.error('Saved person profile update failed', error, { ...getAIRouteSecurityContext(session, request), endpoint: '/api/image-subject-profiles' });
        return errorResponse(error);
    }
});

export const DELETE = withAuth(async (request, session) => {
    const featureError = featureDisabledResponse();
    if (featureError) return featureError;
    const rateLimitError = await checkDataWriteLimit({ session });
    if (rateLimitError) return rateLimitError;
    const body = await readBoundedJsonBody(request, 16 * 1024);
    if (body.ok === false) {
        logInvalidInput(request, session, 'delete');
        return body.response;
    }
    const parsed = deleteSchema.safeParse(body.data);
    if (!parsed.success) {
        logInvalidInput(request, session, 'delete', parsed.error.issues.length);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const authError = await authorize(request, session, 'Delete saved person profile', [PERMISSIONS.MANAGE_STORE]);
    if (authError) return authError;
    try {
        await deleteImageSubjectProfile({ ...getScope(session)!, profileId: parsed.data.profileId, userId: session.user.id });
        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Saved person profile deletion failed', error, { ...getAIRouteSecurityContext(session, request), endpoint: '/api/image-subject-profiles' });
        return errorResponse(error);
    }
});
