import { renderAnswerlatticePreOnboardingOwnerGuide } from '@lib/answerlattice/preOnboardingPrompt';

export const dynamic = 'force-static';

export function GET() {
    return new Response(renderAnswerlatticePreOnboardingOwnerGuide(), {
        headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
    });
}
