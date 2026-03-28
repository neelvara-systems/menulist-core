export const dynamic = 'force-dynamic';
import { checkAICapacity } from "@lib/ai/capacityCheck";
import { AI_ACTIONS_TYPES } from "@constant/common";
import { NextResponse } from "next/server";
import { withAuth } from "../../../../middleware/auth";

/**
 * AI Pack Status — Simple boolean capacity check
 *
 * Returns whether the store can run paid AI actions and whether
 * enhancement packs are available for purchase.
 *
 * NEVER returns unit counts, credit balances, or internal capacity data.
 * Doctrine: No credits, tokens, or units exposed to customers.
 *
 * @see __docs__/ai-enhancement-packs/ai-enhancement-packs_impl.md
 */
export const GET = withAuth(async (request, session) => {
    try {
        const tenantId = session.user.tenantId || session.tId;
        const storeId = session.user.storeId || session.sId;

        if (!tenantId || !storeId) {
            return NextResponse.json(
                { error: "User not onboarded." },
                { status: 400 }
            );
        }

        // Check capacity using a representative paid action (IMAGE_GENERATION is the most common)
        const capacityCheck = await checkAICapacity(
            Number(tenantId),
            Number(storeId),
            AI_ACTIONS_TYPES.IMAGE_GENERATION,
        );

        // Doctrine-compliant response: booleans only, no unit counts
        return NextResponse.json({
            canRunActions: capacityCheck.allowed,
            packAvailable: true, // Enhancement pack always available for purchase
            reason: capacityCheck.reason === "maintenance" ? "maintenance" : undefined,
        });
    } catch (error) {
        console.error("AI pack status check failed:", error);
        return NextResponse.json(
            { error: "Failed to check AI status" },
            { status: 500 }
        );
    }
});
