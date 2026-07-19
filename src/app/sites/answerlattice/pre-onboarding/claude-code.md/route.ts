import {
    ANSWERLATTICE_PRE_ONBOARDING_MARKDOWN_RESPONSE_HEADERS,
    renderAnswerlatticePreOnboardingToolPrompt,
} from '@lib/answerlattice/preOnboardingPrompt';

export const dynamic = 'force-static';

export function GET() {
    return new Response(renderAnswerlatticePreOnboardingToolPrompt('claude-code'), {
        headers: ANSWERLATTICE_PRE_ONBOARDING_MARKDOWN_RESPONSE_HEADERS,
    });
}
