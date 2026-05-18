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
 *   getScreenDataByToken() [2 reads] + getMenuItemsForScreen() [2 reads]
 *   Firebase cost: identical regardless of mode ($0.00 delta)
 */

import { FEATURE_FLAGS } from "@config/features";
import { getMenuItemsForScreenServer, getScreenDataByTokenServer } from "@database/campaigns/serverScreen";
import { SCREEN_CONFIG } from "@lib/screen/screenRenderer";
import { generateScreenSlides } from "@lib/screen/slideGenerator";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import MenuBoardDisplay from "./MenuBoardDisplay";
import ScreenDisplay from "./ScreenDisplay";

// OPT-6: Cache screen data reads at Vercel edge (60s TTL)
// Eliminates redundant Firestore reads when multiple screens share a token
// or when the same screen refreshes within the cache window
const getCachedScreenData = unstable_cache(
    getScreenDataByTokenServer,
    ['screen-data-by-token'],
    { revalidate: 60, tags: ['screen-data'] }
);

const getCachedMenuItems = unstable_cache(
    getMenuItemsForScreenServer,
    ['screen-menu-items'],
    { revalidate: 60, tags: ['screen-data'] }
);

interface PageProps {
    params: { token: string };
    searchParams: { mode?: string };
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
export default async function ScreenPage({ params, searchParams }: PageProps) {
    const { token } = params;

    // Validate token format
    if (!token || token.length < 6 || token.length > 24) {
        notFound();
    }

    // Resolve display mode
    const mode = resolveScreenMode(searchParams);

    // Fetch screen data using DAL (server-side) — OPT-6: cached at Vercel edge
    const screenData = await getCachedScreenData(token);

    if (!screenData) {
        notFound();
    }

    // Fetch menu items (used by BOTH modes — same cost) — OPT-6: cached at Vercel edge
    const menuItems = await getCachedMenuItems(
        screenData.storeId,
        screenData.tenantId,
        screenData.activeSpecialMenuId || null
    );

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
