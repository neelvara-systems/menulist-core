export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import {
    processKnowledgeIntakeMediaSource,
    serializeIntakeValue,
} from '@lib/answerlattice/knowledgeIntake';
import {
    getAnswerlatticeKnowledgeIntakeLogContext,
    logAnswerlatticeKnowledgeIntakeFailure,
} from '@lib/answerlattice/knowledgeIntakeDiagnostics';
import {
    getAnswerlatticeKnowledgeIntakeClientErrorMessage,
    getAnswerlatticeKnowledgeIntakeErrorStatus,
    requireAnswerlatticeKnowledgeIntakeContext,
} from '@lib/answerlattice/knowledgeIntakeApi';
import { readBoundedFormDataBody } from '@lib/security/boundedRequestBody';
import { secureLog } from '@lib/security/secureLogger';
import { ANSWERLATTICE_KNOWLEDGE_INTAKE_CONSTRAINTS } from '@type/answerlattice';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';

const MAX_UPLOAD_BYTES = Math.max(
    ANSWERLATTICE_KNOWLEDGE_INTAKE_CONSTRAINTS.MAX_IMAGE_OCR_BYTES,
    ANSWERLATTICE_KNOWLEDGE_INTAKE_CONSTRAINTS.MAX_MEDIA_TRANSCRIPTION_BYTES,
);
const MAX_UPLOAD_BODY_BYTES = MAX_UPLOAD_BYTES + (64 * 1024);

const FormFieldsSchema = z.object({
    title: z.string().trim().max(180).optional(),
    tags: z.array(z.string().trim().max(80)).max(20).optional(),
    contextKeys: z.array(z.string().trim().max(100)).max(20).optional(),
    entityIds: z.array(z.string().trim().max(160)).max(25).optional(),
});

const parseListField = (value: FormDataEntryValue | null): string[] | undefined => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
            return parsed.map(item => String(item || '').trim()).filter(Boolean);
        }
    } catch {
        // Fall back to comma/newline input.
    }
    return trimmed.split(/[\n,]/).map(item => item.trim()).filter(Boolean);
};

const inferMimeType = (fileName: string, providedType: string) => {
    const normalized = String(providedType || '').trim().toLowerCase();
    if (normalized) return normalized;
    const extension = fileName.toLowerCase().split('.').pop();
    const byExtension: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        gif: 'image/gif',
        mp3: 'audio/mpeg',
        m4a: 'audio/mp4',
        wav: 'audio/wav',
        ogg: 'audio/ogg',
        webm: 'video/webm',
        mp4: 'video/mp4',
        mov: 'video/quicktime',
    };
    return extension ? byExtension[extension] || '' : '';
};

export const POST = withAuth(async (request: NextRequest, session, params: { jobId: string }) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INTAKE_MEDIA_EXTRACTION) {
        return NextResponse.json({ error: 'Screenshot and media extraction is not enabled.' }, { status: 404 });
    }

    const access = await requireAnswerlatticeKnowledgeIntakeContext(request, session, {
        rateLimitKey: 'answerlattice-intake:media-source',
        rateLimit: 8,
        rateWindow: 60,
        requireActiveLicense: true,
    });
    if (access.response) return access.response;

    try {
        const formDataResult = await readBoundedFormDataBody(request, MAX_UPLOAD_BODY_BYTES, {
            invalidFormDataMessage: 'Upload a supported screenshot, audio, or video file.',
            tooLargeMessage: `File is too large. Maximum intake media size is ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.`,
        });
        if (formDataResult.ok === false) return formDataResult.response;

        const formData = formDataResult.formData;
        const file = formData.get('file');
        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'Upload a supported screenshot, audio, or video file.' }, { status: 400 });
        }

        if (file.size <= 0) {
            return NextResponse.json({ error: 'The uploaded file is empty.' }, { status: 400 });
        }
        if (file.size > MAX_UPLOAD_BYTES) {
            return NextResponse.json({ error: `File is too large. Maximum intake media size is ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.` }, { status: 413 });
        }

        const parsed = FormFieldsSchema.parse({
            title: formData.get('title') || undefined,
            tags: parseListField(formData.get('tags')),
            contextKeys: parseListField(formData.get('contextKeys')),
            entityIds: parseListField(formData.get('entityIds')),
        });

        const mimeType = inferMimeType(file.name, file.type);
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await processKnowledgeIntakeMediaSource(access.context.scope, params.jobId, {
            buffer,
            fileName: file.name,
            mimeType,
            title: parsed.title || file.name.replace(/\.[^.]+$/, ''),
            tags: parsed.tags,
            contextKeys: parsed.contextKeys,
            entityIds: parsed.entityIds,
            metadata: {
                originalFileSize: file.size,
                uploadKind: 'owner_media_source',
            },
        }, access.context.actor);

        secureLog('[Answerlattice Intake] Media source extracted', getAnswerlatticeKnowledgeIntakeLogContext({
            jobId: params.jobId,
            scope: access.context.scope,
            sourceId: result.source.id,
            sourceType: result.source.type,
            usageUnits: result.usage.unitsConsumed,
        }));

        return NextResponse.json({
            source: serializeIntakeValue(result.source),
            usage: result.usage,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid media source details.' }, { status: 400 });
        }
        const status = getAnswerlatticeKnowledgeIntakeErrorStatus(error);
        if (status >= 500) {
            logAnswerlatticeKnowledgeIntakeFailure('[Answerlattice Intake] Failed to extract media source', 'answerlattice_intake_media_source_extract_failed', error, {
                jobId: params.jobId,
                scope: access.context.scope,
            });
        }
        return NextResponse.json({ error: getAnswerlatticeKnowledgeIntakeClientErrorMessage(error, 'Failed to extract media source.') }, { status });
    }
});
