import { renderCanonicaLlmsTxt } from '@lib/canonica/installContract/contract';

export const dynamic = 'force-static';

export function GET() {
    return new Response(renderCanonicaLlmsTxt(), {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
    });
}
