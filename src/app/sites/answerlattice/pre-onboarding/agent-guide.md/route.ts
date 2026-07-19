import {
    ANSWERLATTICE_PRE_ONBOARDING_MARKDOWN_RESPONSE_HEADERS,
    renderAnswerlatticePreOnboardingAgentGuide,
} from '@lib/answerlattice/preOnboardingPrompt';

export const dynamic = 'force-static';

export function GET() {
    return new Response(renderAnswerlatticePreOnboardingAgentGuide(), {
        headers: ANSWERLATTICE_PRE_ONBOARDING_MARKDOWN_RESPONSE_HEADERS,
    });
}
