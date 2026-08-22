import { renderNeelvaraLlmsTxt } from '@lib/seo/neelvaraAgentReadiness';

export const dynamic = 'force-static';

export function GET() {
    return new Response(renderNeelvaraLlmsTxt(), {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
            'Vary': 'Accept-Encoding',
        },
    });
}
