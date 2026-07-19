import {
    ANSWERLATTICE_PRE_ONBOARDING_MARKDOWN_RESPONSE_HEADERS,
    renderAnswerlatticePreOnboardingPrompt,
} from '@lib/answerlattice/preOnboardingPrompt';

export const dynamic = 'force-static';

export function GET() {
    return new Response(renderAnswerlatticePreOnboardingPrompt(), {
        headers: ANSWERLATTICE_PRE_ONBOARDING_MARKDOWN_RESPONSE_HEADERS,
    });
}
