import {
    ANSWERLATTICE_PRE_ONBOARDING_MARKDOWN_RESPONSE_HEADERS,
    renderAnswerlatticePreOnboardingOwnerGuide,
} from '@lib/answerlattice/preOnboardingPrompt';

export const dynamic = 'force-static';

export function GET() {
    return new Response(renderAnswerlatticePreOnboardingOwnerGuide(), {
        headers: ANSWERLATTICE_PRE_ONBOARDING_MARKDOWN_RESPONSE_HEADERS,
    });
}
