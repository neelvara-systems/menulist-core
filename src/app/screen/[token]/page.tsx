/**
 * Digital Screen Display Page
 * Per spec v2.0: Two rendering modes from one truth system
 * Per DAL pattern: Server-side data fetch, no API route needed
 * 
 * Route: /screen/[token]           → Menu Board (default)
 * Route: /screen/[token]?mode=highlights → Highlights (slideshow)
 * 
 * Mode routing:
 *   1. URL ?mode= parameter (highest priority)
 *   2. FEATURE_FLAGS.DIGITAL_SCREENS_MODE (fallback)
 *   3. Default: "menu_board"
 * 
 * Both modes use same data pipeline:
 *   getScreenDataByToken() [2-3+ reads] + projected menu items or getMenuItemsForScreen() fallback [0-2+ reads]
 *   Firebase cost: identical regardless of mode ($0.00 delta)
 */

import { FEATURE_FLAGS } from "@config/features";
import { getMenuItemsForScreenServer, getScreenDataByTokenServer, getUsableScreenMenuProjection } from "@database/campaigns/serverScreen";
import { getPrivateScreenTokenCacheTag } from "@lib/screen/privateScreenControl";
import { SCREEN_CONFIG } from "@lib/screen/screenRenderer";
import { generateScreenSlides } from "@lib/screen/slideGenerator";
import { isValidScreenToken } from "@lib/screen/utils";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import MenuBoardDisplay from "./MenuBoardDisplay";
import ScreenDisplay from "./ScreenDisplay";

// OPT-6: Cache screen data reads at Vercel edge (60s TTL)
// Eliminates redundant Firestore reads when multiple screens share a token
// or when the same screen refreshes within the cache window
async function getCachedScreenData(token: string) {
    const tokenTag = getPrivateScreenTokenCacheTag(token);
    return unstable_cache(
        () => getScreenDataByTokenServer(token),
        ['screen-data-by-token', tokenTag],
        { revalidate: 60, tags: [tokenTag] },
    )();
}

async function getCachedMenuItems(
    storeId: string,
    tenantId: string,
    activeSpecialMenuId: string | null,
    baseProjectId: string | null,
) {
    return unstable_cache(
        () => getMenuItemsForScreenServer(
            storeId,
            tenantId,
            activeSpecialMenuId,
            baseProjectId,
        ),
        [
            'screen-menu-items',
            storeId,
            tenantId,
            activeSpecialMenuId || 'no-special-menu',
            baseProjectId || 'no-base-project',
        ],
        { revalidate: 60, tags: [`menu-store-${storeId}`] },
    )();
}

interface PageProps {
    params: Promise<{ token: string }>;
    searchParams: Promise<{ mode?: string }>;
}

/**
 * Resolve screen mode from URL params and feature flag
 * Priority: URL param > feature flag > default ("menu_board")
 */
function resolveScreenMode(searchParams: { mode?: string }): "menu_board" | "highlights" {
    const urlMode = searchParams.mode?.toLowerCase();

    // URL parameter takes priority
    if (urlMode === "highlights") return "highlights";
    if (urlMode === "menu_board" || urlMode === "menuboard") return "menu_board";

    // Fall back to feature flag
    const flagMode = FEATURE_FLAGS.DIGITAL_SCREENS_MODE;
    if (flagMode === "highlights") return "highlights";

    // Default
    return "menu_board";
}

/**
 * Server Component - fetches data at render time
 * Per DAL pattern: Direct Firestore query, no API route
 */
export default async function ScreenPage(props: PageProps) {
    const searchParams = await props.searchParams;
    const params = await props.params;
    const { token } = params;

    if (!FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED) {
        notFound();
    }

    // Validate token format
    if (!isValidScreenToken(token)) {
        notFound();
    }

    // Resolve display mode
    const mode = resolveScreenMode(searchParams);

    // Fetch screen data using DAL (server-side) — OPT-6: cached at Vercel edge
    const screenData = await getCachedScreenData(token);

    if (!screenData) {
        notFound();
    }

    const projectedMenuItems = getUsableScreenMenuProjection(
        screenData.screen.menuProjection,
        {
            baseProjectId: screenData.baseProjectId,
            activeSpecialMenuId: screenData.activeSpecialMenuId || null,
            contentVersion: screenData.screen.contentVersion || 1,
        },
    );

    // Fetch menu items (used by BOTH modes — same cost) — OPT-6: cached at Vercel edge.
    // The generated projection is used only when it matches the current screen version;
    // otherwise this falls back to the existing project-doc reconstruction path.
    const menuItems = projectedMenuItems || (await getCachedMenuItems(
        screenData.storeId,
        screenData.tenantId,
        screenData.activeSpecialMenuId || null,
        screenData.baseProjectId || null
    ));

    // ─── MENU BOARD MODE ───────────────────────────────────────
    if (mode === "menu_board") {
        const menuBoardData = {
            menuItems,
            storeInfo: screenData.storeInfo,
            contentVersion: screenData.screen.contentVersion || 1,
            token,
            storeId: screenData.storeId,
        };

        return <MenuBoardDisplay initialData={menuBoardData} />;
    }

    // ─── HIGHLIGHTS MODE ───────────────────────────────────────
    // Only pass campaign if it targets digital_screen surface
    const todayCampaign = screenData.today?.primary?.primarySurface === 'digital_screen' &&
        (
            screenData.today?.primary?.projectId === (
                screenData.activeSpecialMenuId || screenData.baseProjectId
            )
        )
        ? screenData.today.primary
        : undefined;

    // Generate slides using the full 4-layer stack generator
    const slides = generateScreenSlides({
        screenState: screenData.screen,
        todayCampaign,
        menuItems,
        storeInfo: screenData.storeInfo
    });

    // Build initial data for highlights client component
    const initialData = {
        slides,
        storeInfo: screenData.storeInfo,
        contentVersion: screenData.screen.contentVersion || 1,
        config: {
            refreshIntervalMs: SCREEN_CONFIG.REFRESH_INTERVAL_MS,
            slideDurationMs: SCREEN_CONFIG.SLIDE_DURATION_MS
        },
        token,
        storeId: screenData.storeId,
    };

    return <ScreenDisplay initialData={initialData} />;
}
