export const dynamic = 'force-dynamic';

import {
    discoverKnowledgeIntakeLinks,
    fetchPublicPageText,
    serializeIntakeValue,
} from '@lib/answerlattice/knowledgeIntake';
import {
    answerlatticeKnowledgeIntakeJson,
    getAnswerlatticeKnowledgeIntakeClientErrorMessage,
    getAnswerlatticeKnowledgeIntakeErrorStatus,
    requireAnswerlatticeKnowledgeIntakeContext,
    withAnswerlatticeKnowledgeIntakePrivateHeaders,
} from '@lib/answerlattice/knowledgeIntakeApi';
import { logAnswerlatticeKnowledgeIntakeFailure } from '@lib/answerlattice/knowledgeIntakeDiagnostics';
import { isAnswerlatticeKnowledgeIntakeHttpUrl } from '@lib/answerlattice/knowledgeIntakeUrlContracts';
import { readOptionalBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';

const DiscoverSchema = z.object({
    url: z.string().trim().min(8).max(500).url().refine(isAnswerlatticeKnowledgeIntakeHttpUrl),
    fetchText: z.boolean().optional().default(false),
}).strict();
const KNOWLEDGE_INTAKE_DISCOVER_MAX_BODY_BYTES = 4 * 1024;

export const POST = withAuth(async (request: NextRequest, session) => {
    const access = await requireAnswerlatticeKnowledgeIntakeContext(request, session, {
        rateLimitKey: 'answerlattice-intake:discover',
        rateLimit: 20,
        rateWindow: 60,
        requireActiveLicense: true,
    });
    if (access.response) return withAnswerlatticeKnowledgeIntakePrivateHeaders(access.response);

    try {
        const bodyResult = await readOptionalBoundedJsonBody(request, KNOWLEDGE_INTAKE_DISCOVER_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Enter a valid public URL.',
            tooLargeMessage: 'Request body too large.',
        });
        if (bodyResult.ok === false) {
            return answerlatticeKnowledgeIntakeJson(
                { error: bodyResult.response.status === 413 ? 'Request body too large.' : 'Enter a valid public URL.' },
                { status: bodyResult.response.status },
            );
        }

        const parsed = DiscoverSchema.parse(bodyResult.data);
        if (parsed.fetchText) {
            const page = await fetchPublicPageText(parsed.url);
            return answerlatticeKnowledgeIntakeJson({ page: serializeIntakeValue(page) });
        }
        const links = await discoverKnowledgeIntakeLinks(parsed.url);
        return answerlatticeKnowledgeIntakeJson({ links: serializeIntakeValue(links) });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return answerlatticeKnowledgeIntakeJson({ error: 'Enter a valid public URL.' }, { status: 400 });
        }
        const status = getAnswerlatticeKnowledgeIntakeErrorStatus(error);
        if (status >= 500) {
            logAnswerlatticeKnowledgeIntakeFailure('[Answerlattice Intake] URL discovery failed', 'answerlattice_intake_url_discovery_failed', error, {
                scope: access.context.scope,
            });
        }
        return answerlatticeKnowledgeIntakeJson({ error: getAnswerlatticeKnowledgeIntakeClientErrorMessage(error, 'Failed to inspect URL.') }, { status });
    }
});
