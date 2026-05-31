export const dynamic = 'force-dynamic';

import {
    discoverKnowledgeIntakeLinks,
    fetchPublicPageText,
    serializeIntakeValue,
} from '@lib/canonica/knowledgeIntake';
import {
    getCanonicaKnowledgeIntakeErrorStatus,
    requireCanonicaKnowledgeIntakeContext,
} from '@lib/canonica/knowledgeIntakeApi';
import { secureError } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';

const DiscoverSchema = z.object({
    url: z.string().trim().min(8).max(500),
    fetchText: z.boolean().optional().default(false),
});

export const POST = withAuth(async (request: NextRequest, session) => {
    const access = await requireCanonicaKnowledgeIntakeContext(request, session, {
        rateLimitKey: 'canonica-intake:discover',
        rateLimit: 20,
        rateWindow: 60,
        requireActiveLicense: true,
    });
    if (access.response) return access.response;

    try {
        const body = await request.json().catch(() => ({}));
        const parsed = DiscoverSchema.parse(body);
        if (parsed.fetchText) {
            const page = await fetchPublicPageText(parsed.url);
            return NextResponse.json({ page: serializeIntakeValue(page) });
        }
        const links = await discoverKnowledgeIntakeLinks(parsed.url);
        return NextResponse.json({ links: serializeIntakeValue(links) });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Enter a valid public URL.' }, { status: 400 });
        }
        const status = getCanonicaKnowledgeIntakeErrorStatus(error);
        if (status >= 500) {
            secureError('[Canonica Intake] URL discovery failed', error as Error, access.context.scope);
        }
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to inspect URL.' }, { status });
    }
});
