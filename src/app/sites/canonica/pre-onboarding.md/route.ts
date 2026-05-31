import { renderCanonicaPreOnboardingPrompt } from '@lib/canonica/preOnboardingPrompt';

export const dynamic = 'force-static';

export function GET() {
    return new Response(renderCanonicaPreOnboardingPrompt(), {
        headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
    });
}
