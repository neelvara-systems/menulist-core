/**
 * Client Page - Multi-Tenant Entry Point
 *
 * This page handles all client requests from:
 * - Subdomains: joespizza.menulist.ai
 * - Custom domains: joespizza.com
 *
 * The domain information is passed via headers set by middleware.
 *
 * URL Routing (when ENABLE_OBP = true):
 * - joespizza.menulist.ai/           → Official Business Page (OBP)
 * - joespizza.menulist.ai/menu        → Default menu (reserved slug)
 * - joespizza.menulist.ai/food-menu   → "Food Menu" project
 * - joespizza.com/                    → OBP (custom domain)
 * - joespizza.com/menu                → Default menu
 *
 * URL Routing (when ENABLE_OBP = false — current behavior):
 * - joespizza.menulist.ai/            → Default menu (isDefault=true or first project)
 * - joespizza.menulist.ai/food-menu   → "Food Menu" project
 * - joespizza.com/                    → Custom domain default menu
 */

import TempStatusBanner from "@atoms/TempStatusBanner";
import { getMoodWithBrandColor, resolveMenuDesignConfig } from "@config/designSystem";
import { FEATURE_FLAGS } from "@config/features";
import { APP_THEME_COLOR } from "@constant/common";
import { DB_COLLECTIONS } from "@constant/database";
import { isReservedProjectSlug } from "@constant/reservedSlugs";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { getBrandName, getStoreContextName, getStoreName } from "@lib/businessIdentity/names";
import { resolvePublicBusinessType } from "@lib/businessIdentity/publicBusinessType";
import {
    getStoreByCustomDomain,
    getStoreByOutletSlug,
    getStoreBySubdomain,
} from "@lib/firestore/clientStoreLookup";
import { parseSummaryProjects } from "@lib/firestore/parseSummaryProjects";
import {
    appendPublicLanguageParam,
    buildPublicLanguageAlternates,
    getPublicLanguageOptions,
    normalizePublicLanguageCode,
    resolveProjectPublicLanguage,
    resolveStorePublicLanguage,
} from "@lib/localization/publicRenderLanguage";
import { getResolvedStoreKeywords } from "@lib/localization/storeContent";
import { getLocalizedText, getPrimaryLocalizedLanguage } from "@lib/localization/text";
import { getDecisionFactArray, getDecisionFactNumber, getDecisionFactString, getNutritionFact } from "@lib/menu/itemDecisionFacts";
import { attachPublicMenuSearchIndex } from "@lib/menu/publicMenuSearch";
import { getPublicMenuFreshness } from "@lib/menu/publicMenuStructuredData";
import { getPublicBusinessDescription } from "@lib/obp/getPublicBusinessDescription";
import { sanitizeForClient } from "@lib/mce/utils";
import { resolveProjectForRender } from "@lib/multiOutlet";
import { getTenantFromHeaders as sharedGetTenantFromHeaders } from "@lib/multiTenant/getTenantFromHeaders";
import { buildMobileAppSchema } from "@lib/pwa/schemaJsonLd";
import { buildAddress, buildBreadcrumbList, buildGeoCoordinates, buildOpeningHours, buildSameAs, getMenuSchemaType } from "@lib/schema";
import { slugify } from "@lib/utils/slugify";
import ClientMenuRenderer from "@template/website/clientWebsite";
import {
    doc,
    getDoc
} from "firebase/firestore";
import { Metadata, Viewport } from "next";
import { unstable_cache } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import MenuBreadcrumb from "./MenuBreadcrumb";
import MenuNotFoundFallback from "./MenuNotFoundFallback";

// Get tenant info from headers (set by middleware)
// Shared helper used across client pages — see @lib/multiTenant/getTenantFromHeaders
async function getTenantFromHeaders() {
    return sharedGetTenantFromHeaders('ClientPage');
}

// Timeout wrapper — prevents infinite SSR hangs if Firestore is unresponsive (GPT FIX 4)
// Infra products cannot hang. 5s is generous for a Firestore read.
async function withTimeout<T>(promise: Promise<T>, ms: number = 5000): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Firestore read timed out after ${ms}ms`)), ms)
        ),
    ]);
}

// Retry wrapper for transient Firestore failures (Customer Infra Hardening - TASK 4)
// One retry with 1s delay handles 90% of transient network/Firestore issues
// Composes with withTimeout: withRetry(() => withTimeout(fn()))
async function withRetry<T>(
    fn: () => Promise<T>,
    retries: number = 1,
    delayMs: number = 1000,
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            return withRetry(fn, retries - 1, delayMs);
        }
        throw error;
    }
}

const serializeClientValue = (value: any): any => {
    if (value === null || value === undefined || typeof value !== 'object') {
        return value;
    }

    if (typeof value.toDate === 'function') {
        const date = value.toDate();
        return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
    }

    if (value instanceof Date) {
        return !Number.isNaN(value.getTime()) ? value.toISOString() : null;
    }

    if (Array.isArray(value)) {
        return value.map(serializeClientValue);
    }

    return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, serializeClientValue(entry)]),
    );
};

// Get project data by ID
async function getProjectData(projectId: string): Promise<any> {
    const [tId, , sId] = projectId.split("-");
    const docRef = doc(
        firebaseClient,
        `${DB_COLLECTIONS.PROJECTS}/${tId}/${sId}`,
        projectId,
    );
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return docSnap.data();
}

// Get precomputed Decision Blocks for a project
async function getPrecomputedDecisionBlocks(
    tId: string | number,
    sId: string | number,
    projectId: string,
): Promise<any | null> {
    try {
        const docId = `${tId}_${sId}_${projectId}`;
        const docSnap = await firestoreAdmin.collection(DB_COLLECTIONS.DECISION_BLOCKS).doc(docId).get();
        if (!docSnap.exists) return null;
        return docSnap.data();
    } catch (error) {
        // Fail silently - Decision Blocks are optional enhancement
        console.warn("Failed to fetch precomputed Decision Blocks:", error);
        return null;
    }
}

// Get all projects for a store and find by slug or default.
// G-05 / R5 (§9 + D-14 PUBLIC-ROUTING-DOCTRINE): when slug === 'menu' AND no
// project claims that slug (Layer 1 miss), the existing isDefault fallback
// serves the default project as a universal alias (Layer 2). The returned
// `isMenuAliasFallback` flag tells MenuContent to emit a canonical tag
// pointing at the default project's real slug URL — preserving SEO cleanliness.
async function getProjectBySlugOrDefault(
    tenantId: number,
    storeId: number,
    slug?: string,
): Promise<{ projectData: any; projectMetadata: any; redirectSlug: string | null; isMenuAliasFallback: boolean } | null> {
    // Read projectsSummary (1 read) — contains slug, previousSlugs, name, isDefault
    // This is the primary source for URL routing data (URL Routing Architecture — ADR-3)
    const summaryDocRef = doc(
        firebaseClient,
        DB_COLLECTIONS.PLATFORM_SUMMARY || "platformSummary",
        `projects_${storeId}`,
    );
    const summarySnap = await getDoc(summaryDocRef);
    // Handles both storage formats: nested `{ projects: { id: {...} } }`
    // and legacy flat `{ "projects.id": {...} }` created by Admin SDK set() writes.
    const summaryProjects = summarySnap.exists() ? parseSummaryProjects(summarySnap.data()) : {};

    // Build projects list from summary (preferred) or fallback to data collection
    let projects: Array<{
        id: string;
        name?: string;
        isDefault?: boolean;
        projectId?: string;
        slug?: string;
        previousSlugs?: string[];
        [key: string]: any;
    }> = [];

    if (Object.keys(summaryProjects).length === 0) {
        // No platformSummary/projects_{storeId} doc exists. The previous fallback
        // attempted to read `projects/{tId}/{sId}/metadata` as a collection — a
        // 4-segment path which Firestore rejects as an invalid collection
        // reference (collections require odd segment counts). There is no
        // `metadata` subcollection in our schema: projects are stored at
        // `projects/{tId}/{sId}/{projectId}` directly (see getProjectData).
        // Returning null here surfaces the "Menu Not Found" UI cleanly instead
        // of throwing — owners are expected to publish at least once, which
        // generates the summary document.
        return null;
    }

    // Use projectsSummary — has slug data + is 1 read instead of N
    // Filter out special menu projects — they are resolved separately via resolveSpecialMenuOverride
    projects = Object.entries(summaryProjects)
        .filter(([, data]: [string, any]) => data.active !== false && data.deleted !== true && !data.isSpecialMenu)
        .map(([projectId, data]: [string, any]) => ({
            id: projectId,
            projectId,
            name: data.name,
            isDefault: data.isDefault,
            slug: data.slug,
            previousSlugs: data.previousSlugs,
            ...data,
        }));

    if (projects.length === 0) return null;

    let targetProject: (typeof projects)[number] | null = null;
    let redirectSlug: string | null = null; // For 301 redirect from old slug

    if (slug) {
        const normalizedSlug = slug.toLowerCase();

        // 1. Match by stored slug field (URL Routing Architecture — ADR-3)
        targetProject =
            projects.find((p) => p.slug && p.slug === normalizedSlug) || null;

        // 2. Fallback: match by slugified name (backward compat for projects without stored slug)
        // Skip reserved slugs — prevents name-based match from bypassing reserved namespace
        if (!targetProject && !isReservedProjectSlug(normalizedSlug)) {
            targetProject =
                projects.find((p) => p.name && slugify(p.name) === normalizedSlug) ||
                null;
        }

        // 3. Check previousSlugs for 301 redirect (QR code permanence)
        if (!targetProject) {
            const oldSlugMatch = projects.find(
                (p) => p.previousSlugs && Array.isArray(p.previousSlugs) &&
                    p.previousSlugs.includes(normalizedSlug)
            );
            if (oldSlugMatch) {
                targetProject = oldSlugMatch;
                redirectSlug = oldSlugMatch.slug || (oldSlugMatch.name ? slugify(oldSlugMatch.name) : null);
            }
        }
    }

    // G-05 / R5 Layer 2 detection (§9 + D-14 PUBLIC-ROUTING-DOCTRINE):
    // If slug was literal 'menu' AND all slug-match cascades above missed,
    // we are about to serve the default project as a universal alias.
    // Track this so MenuContent can emit `<link rel="canonical">` pointing
    // at the default project's real slug URL — Layer 2 must not SEO-index /menu.
    const isMenuAliasFallback = !targetProject && slug?.toLowerCase() === 'menu';

    if (!targetProject) {
        // No slug or no match - find default project
        // (This is both the "no slug" path and R5 Layer 2 alias fallback for /menu)
        targetProject = projects.find((p) => p.isDefault === true) || null;
    }

    if (!targetProject && projects.length > 0) {
        // Still no match - use first project
        targetProject = projects[0];
    }

    if (!targetProject) return null;

    // Fetch full project data
    let projectData = await getProjectData(
        targetProject.projectId || targetProject.id,
    );
    if (!projectData) return null;

    // Multi-outlet: Resolve linked store data by merging with master
    // This ensures customers see the complete menu with inherited items + local overrides
    if (FEATURE_FLAGS.ENABLE_MULTI_OUTLET && projectData.masterProjectId) {
        try {
            const resolved = await resolveProjectForRender({
                storeProject: projectData,
            });
            projectData = resolved;
        } catch (error) {
            console.error(
                "[Multi-outlet] Failed to resolve project for customer view:",
                error,
            );
            // Graceful degradation: show raw store data if resolution fails
        }
    }

    return { projectData, projectMetadata: targetProject, redirectSlug, isMenuAliasFallback };
}

// ═══════════════════════════════════════════════════════════════
// SPECIAL MENU SWITCHING — Resolver Integration
// When a store has an active special menu, override the resolved project.
// @see __docs__/special-menu-switching/special-menu-switching_impl.md
// ═══════════════════════════════════════════════════════════════

/**
 * Resolve special menu override for a store.
 *
 * Called AFTER getProjectBySlugOrDefault — checks if the store has an
 * active special menu and returns the override project instead.
 *
 * - mode=replace: Return special menu project entirely
 * - mode=overlay: Merge special menu categories/items onto base project
 *
 * Zero extra reads when no special menu is active (uses storeData fields).
 * When active: 1 cached read for the special menu project.
 */
async function resolveSpecialMenuOverride(
    storeData: any,
    baseResult: { projectData: any; projectMetadata: any; redirectSlug: string | null; isMenuAliasFallback: boolean },
): Promise<{ projectData: any; projectMetadata: any; redirectSlug: string | null; isMenuAliasFallback: boolean }> {
    if (!FEATURE_FLAGS.ENABLE_SPECIAL_MENU_SWITCHING) return baseResult;
    if (!storeData?.activeSpecialMenuId) return baseResult;

    try {
        const specialProjectData = await getProjectData(storeData.activeSpecialMenuId);
        if (!specialProjectData) {
            console.warn("[SpecialMenu] Active special menu project not found:", storeData.activeSpecialMenuId);
            return baseResult;
        }

        // Verify it's actually active (guard against stale store field)
        if (specialProjectData._specialMenu?.status !== "active") {
            return baseResult;
        }

        // Check expiry — if past endsAt, skip (nightly scheduler will clean up)
        const endsAt = new Date(specialProjectData._specialMenu.endsAt).getTime();
        if (endsAt <= Date.now()) {
            return baseResult;
        }

        const mode = specialProjectData._specialMenu.mode;

        if (mode === "replace") {
            // Full replacement — return special menu as the project.
            // isMenuAliasFallback preserved: Layer 2 alias canonical still
            // points at the base default project's real slug URL (not the
            // special menu's URL), matching user expectations for /menu.
            return {
                projectData: specialProjectData,
                projectMetadata: {
                    ...baseResult.projectMetadata,
                    name: specialProjectData._specialMenu.displayName,
                    isSpecialMenu: true,
                },
                redirectSlug: baseResult.redirectSlug,
                isMenuAliasFallback: baseResult.isMenuAliasFallback,
            };
        }

        if (mode === "overlay") {
            // Overlay — merge special menu categories/items onto base
            const merged = mergeOverlayMenu(baseResult.projectData, specialProjectData);
            return {
                projectData: merged,
                projectMetadata: {
                    ...baseResult.projectMetadata,
                    isSpecialMenu: true,
                    specialMenuOverlay: true,
                },
                redirectSlug: baseResult.redirectSlug,
                isMenuAliasFallback: baseResult.isMenuAliasFallback,
            };
        }

        return baseResult;
    } catch (error) {
        console.error("[SpecialMenu] Resolver error (graceful degradation):", error);
        return baseResult;
    }
}

/**
 * Merge overlay: Append special menu categories and items onto base project.
 * Special sections are marked with _isSpecialSection for potential UI styling.
 */
function mergeOverlayMenu(baseProject: any, specialProject: any): any {
    if (!specialProject?.files?.length) return baseProject;
    if (!baseProject?.files?.length) return specialProject;

    // Deep clone base to avoid mutation
    const merged = JSON.parse(JSON.stringify(baseProject));

    // Extract special menu data from first file
    const specialData = specialProject.files[0]?.extractedData?.data;
    if (!specialData) return merged;

    const specialCategories = specialData.categories || [];
    const specialItems = specialData.items || [];

    // Append to base menu's first file
    if (merged.files[0]?.extractedData?.data) {
        const baseData = merged.files[0].extractedData.data;

        // Append special categories with marker
        if (specialCategories.length > 0) {
            baseData.categories = [
                ...(baseData.categories || []),
                ...specialCategories.map((cat: any) => ({
                    ...cat,
                    _isSpecialSection: true,
                })),
            ];
        }

        // Append special items with marker
        if (specialItems.length > 0) {
            baseData.items = [
                ...(baseData.items || []),
                ...specialItems.map((item: any) => ({
                    ...item,
                    _isSpecialSection: true,
                })),
            ];
        }
    }

    return merged;
}

// G-05 / R5 (§9 PUBLIC-ROUTING-DOCTRINE): Layer 2 canonical override helper.
// Returns the default project's real slug URL when visitor arrived via /menu
// AND no project on this store claims slug 'menu'. Cached via unstable_cache
// so generateMetadata and MenuContent share the same summary read — no extra
// Firestore cost vs. pre-R5 (D-15 performance bound: no additional reads).
const getMenuAliasCanonicalSlug = unstable_cache(
    async (storeId: number): Promise<string | null> => {
        try {
            const summaryRef = doc(
                firebaseClient,
                DB_COLLECTIONS.PLATFORM_SUMMARY || "platformSummary",
                `projects_${storeId}`,
            );
            const summarySnap = await getDoc(summaryRef);
            if (!summarySnap.exists()) return null;
            const projects = parseSummaryProjects(summarySnap.data());
            const activeProjects = Object.values(projects).filter(
                (p: any) => p.active !== false && p.deleted !== true && !p.isSpecialMenu
            );
            // Layer 1 check: if any active project claims slug 'menu', /menu IS
            // that project's canonical URL — no override needed.
            const claimed = activeProjects.some((p: any) => p.slug === 'menu');
            if (claimed) return null;
            // Layer 2: return the default project's real slug for canonical.
            const defaultProject: any =
                activeProjects.find((p: any) => p.isDefault === true) ||
                activeProjects[0] ||
                null;
            if (!defaultProject) return null;
            const realSlug =
                defaultProject.slug ||
                (defaultProject.name ? slugify(defaultProject.name) : '');
            return realSlug || null;
        } catch {
            return null;
        }
    },
    ['menu-alias-canonical-slug'],
    { revalidate: 60, tags: ['client-stores'] },
);

function buildProjectCanonicalUrl({
    baseUrl,
    outletSlug,
    projectMetadata,
    projectData,
    language,
}: {
    baseUrl: string;
    outletSlug?: string | null;
    projectMetadata?: any;
    projectData?: any;
    language?: string;
}): string {
    const projectNameSource = projectMetadata?.name || projectData?.metadata?.name;
    const projectName = getLocalizedText(
        projectNameSource,
        language || projectData?.languages?.[0] || 'en',
        getPrimaryLocalizedLanguage(projectNameSource, language || projectData?.languages?.[0] || 'en'),
        '',
    );
    const projectSlug = projectMetadata?.slug || (projectName ? slugify(projectName) : '');
    if (!projectSlug) return baseUrl;

    const outletPrefix = outletSlug ? `/${outletSlug}` : '';
    return `${baseUrl}${outletPrefix}/${projectSlug}`;
}

// Generate metadata for SEO
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
    const { subdomain, customDomain, tenantType, origin } = await getTenantFromHeaders();
    const requestedLanguage = normalizePublicLanguageCode(searchParams?.lang);

    // Lookup store based on tenant type (with retry for transient failures - TASK 4)
    let storeData: any = null;
    if (tenantType === "subdomain" && subdomain) {
        storeData = await withRetry(() => getStoreBySubdomain(subdomain));
    } else if (tenantType === "custom" && customDomain) {
        storeData = await withRetry(() => getStoreByCustomDomain(customDomain));
    }

    if (!storeData) {
        return {
            title: "Menu Not Found",
            description: "The requested menu could not be found.",
        };
    }

    const slugSegments = params?.slug || [];
    const isRootRequest = slugSegments.length === 0;
    const contentLanguage = resolveStorePublicLanguage(storeData, requestedLanguage);
    const storeName = isRootRequest && FEATURE_FLAGS.ENABLE_OBP
        ? getBrandName(storeData, "Restaurant Menu")
        : getStoreContextName(storeData, "Restaurant Menu");
    const storeMetaTitle = getLocalizedText(
        storeData?.metaTitle,
        contentLanguage,
        getPrimaryLocalizedLanguage(storeData?.metaTitle, contentLanguage),
        '',
    );
    const storeMetaDescription = getLocalizedText(
        storeData?.metaDescription,
        contentLanguage,
        getPrimaryLocalizedLanguage(storeData?.metaDescription, contentLanguage),
        '',
    );
    const storeTagline = getLocalizedText(
        storeData?.tagline,
        contentLanguage,
        getPrimaryLocalizedLanguage(storeData?.tagline, contentLanguage),
        '',
    );
    const firstSlug = slugSegments[0]?.toLowerCase();
    const secondSlug = slugSegments[1]?.toLowerCase();
    const slugLen = slugSegments.length;

    // AEO-optimized title: when OBP is enabled, emit entity-rich title for AI extraction
    // "Joe's Pizza — Menu, Hours, Contact" helps AI answer "What time does Joe's Pizza close?"
    let title = storeMetaTitle || (
        FEATURE_FLAGS.ENABLE_OBP
            ? `${storeName} — Menu, Hours, Contact`
            : `${storeName} | Menu`
    );
    let description =
        storeMetaDescription ||
        storeTagline ||
        (FEATURE_FLAGS.ENABLE_OBP
            ? `${storeName} — View menu, check hours, get directions, and contact details. Official business page.`
            : `View the digital menu for ${storeName}`
        );
    const imageUrl = storeData.logo || "/images/default-menu-preview.png";

    // Build canonical URL based on domain type
    const requestBase = origin || (subdomain ? `https://${subdomain}.menulist.ai` : '');
    const canonicalBase = customDomain
        ? `https://${customDomain}`
        : requestBase;

    // G-05 + G-14 / R5 Layer 2 canonical override (§9 + §8 + §11 PUBLIC-ROUTING-DOCTRINE):
    // When the request path is `/menu` or `/{outletSlug}/menu` AND no project
    // on the target store claims slug `menu`, the page serves the default
    // project as a universal alias. Emit a canonical tag pointing at the
    // default project's real slug URL so Google indexes one URL per project
    // — `/menu` is a functional alias only, not an indexed duplicate.
    //
    //   - Non-outlet `/menu`         → master store's default project slug.
    //   - Outlet `/{outletSlug}/menu` → outlet store's default project slug,
    //                                   URL kept rooted at `/{outletSlug}/...`.
    //
    // Both branches share the same cached helper reads as the render path, so
    // D-15 (no extra Firestore reads on the alias path) holds.
    let menuAliasCanonical: string | undefined;

    if (slugLen === 1 && firstSlug === 'menu' && storeData?.storeId) {
        // Layer 2 alias on the master / single-store tenant.
        const realDefaultSlug = await getMenuAliasCanonicalSlug(storeData.storeId).catch(() => null);
        if (realDefaultSlug) {
            menuAliasCanonical = `${canonicalBase}/${realDefaultSlug}`;
        }
    } else if (
        // G-14: outlet Layer 2 alias. Only fires for master tenants with
        // multi-outlet enabled — matches the MenuContent outlet-switch gating.
        slugLen === 2
        && secondSlug === 'menu'
        && storeData?.isMaster
        && FEATURE_FLAGS.ENABLE_MULTI_OUTLET
        && firstSlug
    ) {
        const outletStore = await withRetry(() =>
            getStoreByOutletSlug(storeData.tenantId, firstSlug),
        ).catch(() => null);
        if (outletStore?.storeId) {
            const realDefaultSlug = await getMenuAliasCanonicalSlug(outletStore.storeId).catch(() => null);
            if (realDefaultSlug) {
                // Use the outlet's CURRENT canonical slug, not whatever the
                // customer typed — this also auto-consolidates rename-chain
                // hits on the outlet side.
                const canonicalOutletSlug = (outletStore.outletSlug || firstSlug).toLowerCase();
                menuAliasCanonical = `${canonicalBase}/${canonicalOutletSlug}/${realDefaultSlug}`;
            }
        }
    }

    // Customer App (PWA) — per-tenant apple-touch-icon + theme color.
    // Dynamic icon route handles override / logo / letter fallback.
    // iOS Safari uses apple-touch-icon when the customer taps "Add to Home Screen".
    const pwaEnabled =
        FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA &&
        storeData.pwaSettings?.enableInstallableApp !== false;
    const appleTouchIconUrl = pwaEnabled
        ? `/api/app-icons/${storeData.id}/180`
        : undefined;
    const appleWebAppTitle =
        getLocalizedText(
            storeData.pwaSettings?.pwaShortName,
            contentLanguage,
            getPrimaryLocalizedLanguage(storeData.pwaSettings?.pwaShortName, contentLanguage),
            '',
        ).trim() ||
        storeName;
    const themeColor = storeData.publicPresence?.accentColor || APP_THEME_COLOR;

    const currentPath = params?.slug && params.slug.length > 0
        ? `/${params.slug.join('/')}`
        : '/';
    const manifestUrl = '/manifest.webmanifest';
    const currentUrl = `${canonicalBase}${currentPath === '/' ? '' : currentPath}`;

    let metadataStore = storeData;
    let metadataProject: any = null;
    let metadataProjectRecord: any = null;
    let projectSlugForLookup: string | undefined = slugSegments[0];
    let metadataOutletSlug: string | undefined;
    let contextSegments: string[] = [];

    if (
        slugSegments.length > 0
        && storeData?.isMaster
        && FEATURE_FLAGS.ENABLE_MULTI_OUTLET
        && firstSlug
    ) {
        const outletStore = await withRetry(() =>
            getStoreByOutletSlug(storeData.tenantId, firstSlug),
        ).catch(() => null);

        if (outletStore) {
            metadataStore = outletStore;
            metadataOutletSlug = (outletStore.outletSlug || firstSlug || '').toLowerCase() || undefined;
            projectSlugForLookup = slugSegments[1];
            contextSegments = slugSegments.slice(2);
        } else {
            contextSegments = slugSegments.slice(1);
        }
    } else {
        contextSegments = slugSegments.slice(1);
    }

    const shouldLoadProjectMetadata = !!projectSlugForLookup || (!FEATURE_FLAGS.ENABLE_OBP && slugSegments.length === 0);
    if (shouldLoadProjectMetadata && metadataStore?.tenantId && metadataStore?.storeId) {
        const projectResult = await withRetry(() =>
            getProjectBySlugOrDefault(
                metadataStore.tenantId,
                metadataStore.storeId,
                projectSlugForLookup,
            ),
        ).catch(() => null);

        if (projectResult) {
            metadataProject = projectResult.projectData;
            metadataProjectRecord = projectResult.projectMetadata;
        }
    }

    const resolvedStoreName = metadataStore?.name || storeName;
    const resolvedImageUrl = metadataStore?.logo || imageUrl;
    const metadataLanguage = metadataProject
        ? resolveProjectPublicLanguage(metadataProject, metadataStore, requestedLanguage)
        : resolveStorePublicLanguage(metadataStore, requestedLanguage);
    const metadataLanguageOptions = metadataProject
        ? (Array.isArray(metadataProject?.languages) && metadataProject.languages.length > 0
            ? metadataProject.languages
            : getPublicLanguageOptions(metadataStore))
        : getPublicLanguageOptions(metadataStore);
    const languageAlternates = buildPublicLanguageAlternates(currentUrl, metadataLanguageOptions);
    const isOBPMetadata = FEATURE_FLAGS.ENABLE_OBP && !metadataProject;
    const projectCanonicalUrl = metadataProject
        ? (metadataProjectRecord?.isDefault && !projectSlugForLookup && !metadataOutletSlug && !FEATURE_FLAGS.ENABLE_OBP
            ? canonicalBase
            : buildProjectCanonicalUrl({
                baseUrl: canonicalBase,
                outletSlug: metadataOutletSlug,
                projectMetadata: metadataProjectRecord,
                projectData: metadataProject,
                language: metadataLanguage,
            }))
        : undefined;
    const canonicalWithoutLanguage = isOBPMetadata
        ? (metadataStore.canonicalUrl || currentUrl)
        : menuAliasCanonical || projectCanonicalUrl || canonicalBase;
    const canonicalWithLanguage = isOBPMetadata && requestedLanguage && metadataLanguageOptions.length > 1
        ? appendPublicLanguageParam(canonicalWithoutLanguage, metadataLanguage)
        : canonicalWithoutLanguage;

    if (metadataProject) {
        const projectTitle = getLocalizedText(
            metadataProjectRecord?.name || metadataProject?.metadata?.name,
            metadataLanguage,
            getPrimaryLocalizedLanguage(metadataProjectRecord?.name || metadataProject?.metadata?.name, metadataLanguage),
            '',
        );
        if (projectTitle && !contextSegments.length) {
            title = `${projectTitle} | ${resolvedStoreName}`;
            description = getLocalizedText(
                metadataStore.metaDescription,
                metadataLanguage,
                getPrimaryLocalizedLanguage(metadataStore.metaDescription, metadataLanguage),
                getLocalizedText(
                    metadataStore.tagline,
                    metadataLanguage,
                    getPrimaryLocalizedLanguage(metadataStore.tagline, metadataLanguage),
                    '',
                ),
            )
                || `View ${projectTitle} from ${resolvedStoreName}.`;
        }

        const contextMetadata = buildContextMetadata({
            storeName: resolvedStoreName,
            storeDescription: description,
            defaultImageUrl: resolvedImageUrl,
            currentUrl,
            canonicalUrl: projectCanonicalUrl && contextSegments.length
                ? `${projectCanonicalUrl}/${contextSegments.join('/')}`
                : projectCanonicalUrl,
            projectData: metadataProject,
            contextSegments,
            language: metadataLanguage,
        });

        if (contextMetadata) {
            title = typeof contextMetadata.title === 'string' ? contextMetadata.title : title;
            description = contextMetadata.description || description;
            return {
                title,
                description,
                keywords: getResolvedStoreKeywords(
                    metadataStore?.keywords,
                    metadataLanguage,
                    [],
                ).join(", "),
                manifest: manifestUrl,
                alternates: {
                    ...contextMetadata.alternates,
                    ...(languageAlternates ? { languages: languageAlternates } : {}),
                },
                openGraph: {
                    title,
                    description,
                    type: "website",
                    siteName: resolvedStoreName,
                    url: currentUrl,
                    images: contextMetadata.openGraph?.images,
                },
                twitter: {
                    card: "summary_large_image",
                    title,
                    description,
                    images: contextMetadata.twitter?.images,
                },
                robots: {
                    index: true,
                    follow: true,
                },
                ...(appleTouchIconUrl
                    ? {
                        appleWebApp: {
                            capable: true,
                            statusBarStyle: "default",
                            title: appleWebAppTitle,
                        },
                        icons: {
                            apple: [
                                { url: appleTouchIconUrl, sizes: "180x180" },
                            ],
                        },
                    }
                    : {}),
            };
        }
    }

    return {
        title,
        description,
        keywords: getResolvedStoreKeywords(
            metadataStore?.keywords,
            metadataLanguage,
            [],
        ).join(", "),
        manifest: manifestUrl,
        alternates: {
            // Precedence: owner-supplied custom canonical (rare) > R5 Layer 2
            // alias override (when /menu serves default project) > tenant base.
            // OBP language variants use their current public URL so `?lang=xx`
            // pages canonicalize to their own localized URL when requested.
            canonical: canonicalWithLanguage,
            ...(languageAlternates ? { languages: languageAlternates } : {}),
        },
        openGraph: {
            title,
            description,
            type: "website",
            siteName: resolvedStoreName,
            url: currentUrl,
            images: resolvedImageUrl ? [{ url: resolvedImageUrl }] : undefined,
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: resolvedImageUrl ? [resolvedImageUrl] : undefined,
        },
        robots: {
            index: true,
            follow: true,
        },
        // Per-tenant PWA metadata — overrides defaults from client/layout.tsx
        ...(appleTouchIconUrl
            ? {
                appleWebApp: {
                    capable: true,
                    statusBarStyle: "default",
                    title: appleWebAppTitle,
                },
                icons: {
                    apple: [
                        { url: appleTouchIconUrl, sizes: "180x180" },
                    ],
                },
            }
            : {}),
    };
}

export async function generateViewport(): Promise<Viewport> {
    const { subdomain, customDomain, tenantType } = await getTenantFromHeaders();

    let storeData: any = null;
    if (tenantType === "subdomain" && subdomain) {
        storeData = await withRetry(() => getStoreBySubdomain(subdomain));
    } else if (tenantType === "custom" && customDomain) {
        storeData = await withRetry(() => getStoreByCustomDomain(customDomain));
    }

    return {
        themeColor: storeData?.publicPresence?.accentColor || APP_THEME_COLOR,
    };
}

// Generate Schema.org JSON-LD — uses shared utilities from @lib/schema
// @see __docs__/discovery-infrastructure/
function generateSchemaOrgJsonLd(
    projectData: any,
    storeData: any,
    canonicalUrl: string,
    renderLanguage?: string,
) {
    const contentLanguage = renderLanguage || resolveProjectPublicLanguage(projectData, storeData);
    const storeName = getStoreContextName(
        storeData,
        getLocalizedText(projectData?.metadata?.name, projectData?.languages?.[0] || contentLanguage, getPrimaryLocalizedLanguage(projectData?.metadata?.name, projectData?.languages?.[0] || contentLanguage), "Restaurant"),
    );
    const categories =
        projectData?.files?.flatMap(
            (file: any) => file?.extractedData?.data?.categories || [],
        ).filter((category: any) => category?.active !== false) || [];
    const items =
        projectData?.files?.flatMap(
            (file: any) => file?.extractedData?.data?.items || [],
        ).filter((item: any) => item?.active !== false) || [];

    const address = buildAddress(storeData);
    const geo = buildGeoCoordinates(storeData);
    const openingHours = buildOpeningHours(storeData);
    const sameAs = buildSameAs(storeData);
    const effectiveBusinessType = resolvePublicBusinessType(
        storeData?.businessType,
        storeData?.businessIndustry,
    );
    const schemaType = getMenuSchemaType(effectiveBusinessType);
    const publicDescription = getPublicBusinessDescription(storeData, contentLanguage);
    const showItemPrices = projectData?.config?.design?.menu?.showItemPrices ?? true;
    const showImages = projectData?.config?.design?.menu?.showImages ?? true;
    const freshness = getPublicMenuFreshness(projectData, storeData);

    return {
        "@context": "https://schema.org",
        "@type": schemaType,
        name: storeName,
        ...(publicDescription && { description: publicDescription }),
        ...(storeData?.logo && { image: storeData.logo }),
        url: canonicalUrl,
        ...(storeData?.phoneNumber && { telephone: storeData.phoneNumber }),
        ...(storeData?.email && { email: storeData.email }),
        ...(storeData?.currencyCode && {
            currenciesAccepted: storeData.currencyCode,
        }),
        ...(storeData?.priceRange && { priceRange: storeData.priceRange }),
        ...(address && { address }),
        ...(geo && { geo }),
        ...(openingHours && { openingHoursSpecification: openingHours }),
        ...(sameAs && { sameAs }),
        ...(freshness.dateModified && { dateModified: freshness.dateModified }),
        ...(storeData?.cuisineTypes?.length && { servesCuisine: storeData.cuisineTypes }),
        menu: canonicalUrl,
        hasMenu: {
            "@type": "Menu",
            identifier: projectData?.projectId || canonicalUrl,
            ...(freshness.dateModified && { dateModified: freshness.dateModified }),
            ...(freshness.menuVersion && {
                additionalProperty: [
                    {
                        "@type": "PropertyValue",
                        name: "menuVersion",
                        value: freshness.menuVersion,
                    },
                ],
            }),
            hasMenuSection: categories.slice(0, 10).map((category: any) => ({
                "@type": "MenuSection",
                identifier: category.id,
                name: getLocalizedValue(category.name, contentLanguage) || "Menu Section",
                hasMenuItem: items
                    .filter((item: any) => item.category === category.id)
                    .slice(0, 20)
                    .map((item: any) => {
                        // #32: Build suitableForDiet from tags + dietaryTags
                        const diets: string[] = [];
                        const dietaryTags = getDecisionFactArray(item, "dietaryTags");
                        const nutritionInfo = getNutritionFact(item);
                        const duration = getDecisionFactNumber(item, "duration");
                        const materials = getDecisionFactString(item, "materials");
                        const warranty = getDecisionFactString(item, "warranty");
                        const targetAudience = getDecisionFactString(item, "targetAudience");
                        const skillLevel = getDecisionFactString(item, "skillLevel");
                        const allergens = getDecisionFactArray(item, "allergens");
                        const spiceLevel = getDecisionFactString(item, "spiceLevel");
                        const itemName = getLocalizedValue(item.name, contentLanguage) || "Menu Item";
                        const itemId = item.id ? String(item.id) : '';
                        const itemUrl = itemId
                            ? `${canonicalUrl}/item/${slugify(itemName)}-${itemId.slice(-6)}`
                            : undefined;
                        const itemImage = showImages ? item.images?.[0]?.url : undefined;
                        const schemaPrice = showItemPrices && item.price !== undefined && item.price !== null
                            ? String(item.price).replace(/[^0-9.]/g, "")
                            : "";
                        const itemProperties = [
                            ...(duration ? [{ "@type": "PropertyValue", name: "duration", value: `${duration} minutes` }] : []),
                            ...(materials ? [{ "@type": "PropertyValue", name: "material", value: materials }] : []),
                            ...(warranty ? [{ "@type": "PropertyValue", name: "warranty", value: warranty }] : []),
                            ...(targetAudience ? [{ "@type": "PropertyValue", name: "audience", value: targetAudience }] : []),
                            ...(skillLevel ? [{ "@type": "PropertyValue", name: "skillLevel", value: skillLevel }] : []),
                            ...(allergens.length ? [{ "@type": "PropertyValue", name: "allergens", value: allergens.join(", ") }] : []),
                            ...(spiceLevel ? [{ "@type": "PropertyValue", name: "spiceLevel", value: spiceLevel }] : []),
                        ].filter(Boolean);
                        if (item.tags?.includes("Vegetarian") || dietaryTags.includes("vegetarian")) diets.push("https://schema.org/VegetarianDiet");
                        if (dietaryTags.includes("vegan")) diets.push("https://schema.org/VeganDiet");
                        if (dietaryTags.includes("gluten-free")) diets.push("https://schema.org/GlutenFreeDiet");
                        if (dietaryTags.includes("halal")) diets.push("https://schema.org/HalalDiet");
                        if (dietaryTags.includes("kosher")) diets.push("https://schema.org/KosherDiet");

                        return {
                            "@type": "MenuItem",
                            ...(itemId && { identifier: itemId }),
                            name: itemName,
                            ...(itemUrl && { url: itemUrl }),
                            ...(itemImage && { image: itemImage }),
                            description:
                                getLocalizedValue(item.description, contentLanguage) || "",
                            ...(schemaPrice && {
                                offers: {
                                    "@type": "Offer",
                                    price: schemaPrice,
                                    priceCurrency: storeData?.currencyCode || "USD",
                                    availability: item.available === false
                                        ? "https://schema.org/OutOfStock"
                                        : "https://schema.org/InStock",
                                },
                            }),
                            ...(diets.length > 0 && {
                                suitableForDiet: diets.length === 1 ? diets[0] : diets,
                            }),
                            ...(nutritionInfo?.calories && {
                                nutrition: {
                                    "@type": "NutritionInformation",
                                    ...(nutritionInfo.calories && { calories: `${nutritionInfo.calories} calories` }),
                                    ...(nutritionInfo.protein && { proteinContent: `${nutritionInfo.protein} g` }),
                                    ...(nutritionInfo.carbs && { carbohydrateContent: `${nutritionInfo.carbs} g` }),
                                    ...(nutritionInfo.fat && { fatContent: `${nutritionInfo.fat} g` }),
                                    ...(nutritionInfo.servingSize && { servingSize: nutritionInfo.servingSize }),
                                },
                            }),
                            // Owner-provided SMB metadata. AI generation is blocked from creating these fields.
                            ...(itemProperties.length > 0 && { additionalProperty: itemProperties }),
                        };
                    }),
            })),
        },
        publisher: {
            "@type": "Organization",
            name: "MenuList",
            url: "https://www.menulist.ai",
        },
    };
}

// #30: Lazy language loading — reduce SSR payload for multi-language menus
// Strips non-primary language descriptions (heavy text) while keeping all language names (short strings).
// Menus with <3 languages are untouched (optimization not worth the clone cost).
// UI gracefully handles missing descriptions — they simply don't render.
function optimizeLanguagePayload(projectData: any, requestedLanguage?: string | null): any {
    if (!projectData?.files?.length) return projectData;

    const languages = projectData.files[0]?.extractedData?.data?.languages || [];
    if (languages.length < 3) return projectData; // Not worth optimizing for 1-2 languages

    const primaryLang = languages.find((l: any) => l.isPrimary)?.code || languages[0]?.code || 'en';
    const descriptionLanguages = new Set(
        [primaryLang, requestedLanguage].filter((language): language is string =>
            typeof language === 'string' && language.trim().length > 0,
        ),
    );

    // Deep clone to avoid mutating cached data
    const optimized = JSON.parse(JSON.stringify(projectData));

    for (const file of optimized.files || []) {
        const items = file.extractedData?.data?.items || [];
        for (const item of items) {
            if (item.description && typeof item.description === 'object') {
                const nextDescription: Record<string, string> = {};
                descriptionLanguages.forEach((language) => {
                    const description = item.description[language];
                    if (description) nextDescription[language] = description;
                });
                item.description = nextDescription;
            }
        }
    }

    return optimized;
}

interface PageProps {
    params: { slug?: string[] };
    searchParams?: { lang?: string | string[] };
}

function getLocalizedValue(
    value: Record<string, string> | string | undefined,
    preferredLanguage: string = 'en',
): string {
    if (!value) return '';
    if (typeof value === 'string') return value;

    return value[preferredLanguage]
        || value.en
        || value.default
        || Object.values(value).find(Boolean)
        || '';
}

function getProjectLanguage(projectData: any): string {
    const languages = projectData?.files?.[0]?.extractedData?.data?.languages || [];
    return languages.find((language: any) => language?.isPrimary)?.code
        || languages[0]?.code
        || 'en';
}

function flattenProjectMenu(projectData: any): { categories: any[]; items: any[] } {
    const categories = projectData?.files?.flatMap(
        (file: any) => file?.extractedData?.data?.categories || [],
    ) || [];
    const items = projectData?.files?.flatMap(
        (file: any) => file?.extractedData?.data?.items || [],
    ) || [];

    return { categories, items };
}

function findItemByUrlSegment(items: any[], urlSegment?: string, language: string = 'en'): any | null {
    if (!urlSegment) return null;

    const directMatch = items.find((item: any) => item?.id === urlSegment);
    if (directMatch) return directMatch;

    if (urlSegment.length > 7) {
        const shortId = urlSegment.slice(-6);
        const shortIdMatch = items.find((item: any) => item?.id?.endsWith?.(shortId));
        if (shortIdMatch) return shortIdMatch;
    }

    return items.find((item: any) => {
        const name = getLocalizedValue(item?.name, language);
        const itemSlug = slugify(name);
        return itemSlug === urlSegment || urlSegment.startsWith(`${itemSlug}-`);
    }) || null;
}

function findCategoryByUrlSegment(categories: any[], urlSegment?: string, language: string = 'en'): any | null {
    if (!urlSegment) return null;

    const directMatch = categories.find((category: any) => category?.id === urlSegment);
    if (directMatch) return directMatch;

    return categories.find((category: any) => {
        const name = getLocalizedValue(category?.name, language);
        const categorySlug = slugify(name);
        return categorySlug === urlSegment || urlSegment.startsWith(`${categorySlug}-`);
    }) || null;
}

function buildContextMetadata({
    storeName,
    storeDescription,
    defaultImageUrl,
    currentUrl,
    canonicalUrl,
    projectData,
    contextSegments,
    language,
}: {
    storeName: string;
    storeDescription?: string;
    defaultImageUrl: string;
    currentUrl: string;
    canonicalUrl?: string;
    projectData: any;
    contextSegments: string[];
    language?: string;
}): Pick<Metadata, 'title' | 'description' | 'openGraph' | 'twitter' | 'alternates'> | null {
    if (contextSegments.length < 2) return null;

    const renderLanguage = language || getProjectLanguage(projectData);
    const resolvedCanonicalUrl = canonicalUrl || currentUrl;
    const { categories, items } = flattenProjectMenu(projectData);
    const [contextType, contextValue] = contextSegments;

    if (contextType === 'item') {
        const item = findItemByUrlSegment(items, contextValue, renderLanguage);
        if (!item) return null;

        const itemName = getLocalizedValue(item.name, renderLanguage) || 'Menu Item';
        const itemDescription = getLocalizedValue(item.description, renderLanguage);
        const category = categories.find((entry: any) => entry?.id === item.category);
        const categoryName = getLocalizedValue(category?.name, renderLanguage);
        const imageUrl = item?.images?.[0]?.url || defaultImageUrl;

        return {
            title: `${itemName} | ${storeName}`,
            description: itemDescription
                || (categoryName
                    ? `${itemName} in ${categoryName} at ${storeName}.`
                    : `${itemName} at ${storeName}.`),
            alternates: {
                canonical: resolvedCanonicalUrl,
            },
            openGraph: {
                title: `${itemName} | ${storeName}`,
                description: itemDescription
                    || (categoryName
                        ? `${itemName} in ${categoryName} at ${storeName}.`
                        : `${itemName} at ${storeName}.`),
                url: resolvedCanonicalUrl,
                images: imageUrl ? [{ url: imageUrl }] : undefined,
            },
            twitter: {
                title: `${itemName} | ${storeName}`,
                description: itemDescription
                    || (categoryName
                        ? `${itemName} in ${categoryName} at ${storeName}.`
                        : `${itemName} at ${storeName}.`),
                images: imageUrl ? [imageUrl] : undefined,
            },
        };
    }

    if (contextType === 'category') {
        const category = findCategoryByUrlSegment(categories, contextValue, renderLanguage);
        if (!category) return null;

        const categoryName = getLocalizedValue(category.name, renderLanguage) || 'Category';
        const categoryItems = items.filter((item: any) => item?.category === category.id && item?.active !== false);
        const categoryDescription = `${categoryName} from ${storeName}. ${categoryItems.length} ${categoryItems.length === 1 ? 'item' : 'items'} available.`;

        return {
            title: `${categoryName} | ${storeName}`,
            description: storeDescription || categoryDescription,
            alternates: {
                canonical: resolvedCanonicalUrl,
            },
            openGraph: {
                title: `${categoryName} | ${storeName}`,
                description: storeDescription || categoryDescription,
                url: resolvedCanonicalUrl,
                images: defaultImageUrl ? [{ url: defaultImageUrl }] : undefined,
            },
            twitter: {
                title: `${categoryName} | ${storeName}`,
                description: storeDescription || categoryDescription,
                images: defaultImageUrl ? [defaultImageUrl] : undefined,
            },
        };
    }

    return null;
}

// Branded loading skeleton — renders instantly while data streams (Customer Infra Hardening - TASK 5)
// Customer sees this instead of browser spinner during the 1-3s data fetch
function MenuSkeleton() {
    return (
        <div
            style={{
                minHeight: "100dvh",
                background: "#fafafa",
                fontFamily: "system-ui, -apple-system, sans-serif",
            }}
        >
            {/* Header / Logo placeholder */}
            <div
                style={{
                    height: "56px",
                    background: "#fff",
                    borderBottom: "1px solid #eee",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <div
                    style={{
                        width: "120px",
                        height: "28px",
                        background: "#e8e8e8",
                        borderRadius: "6px",
                        animation: "menuSkeletonPulse 1.5s ease-in-out infinite",
                    }}
                />
            </div>
            {/* Category tabs placeholder */}
            <div
                style={{
                    display: "flex",
                    gap: "8px",
                    padding: "16px 16px 12px",
                    overflowX: "hidden",
                }}
            >
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        style={{
                            height: "32px",
                            width: `${60 + i * 10}px`,
                            background: "#e8e8e8",
                            borderRadius: "16px",
                            flexShrink: 0,
                            animation: "menuSkeletonPulse 1.5s ease-in-out infinite",
                            animationDelay: `${i * 0.1}s`,
                        }}
                    />
                ))}
            </div>
            {/* Menu item cards placeholder */}
            <div style={{ padding: "0 16px" }}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        style={{
                            height: "88px",
                            background: "#fff",
                            marginBottom: "10px",
                            borderRadius: "12px",
                            border: "1px solid #f0f0f0",
                            display: "flex",
                            alignItems: "center",
                            padding: "12px",
                            gap: "12px",
                            animation: "menuSkeletonPulse 1.5s ease-in-out infinite",
                            animationDelay: `${i * 0.1}s`,
                        }}
                    >
                        {/* Item image placeholder */}
                        <div
                            style={{
                                width: "64px",
                                height: "64px",
                                background: "#e8e8e8",
                                borderRadius: "8px",
                                flexShrink: 0,
                            }}
                        />
                        {/* Item text placeholder */}
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    width: "60%",
                                    height: "14px",
                                    background: "#e8e8e8",
                                    borderRadius: "4px",
                                    marginBottom: "8px",
                                }}
                            />
                            <div
                                style={{
                                    width: "35%",
                                    height: "12px",
                                    background: "#e8e8e8",
                                    borderRadius: "4px",
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
            {/* #35: Text-first fallback — appears after 3s delay for slow networks */}
            <div
                style={{
                    textAlign: "center",
                    padding: "24px 16px",
                    color: "#888",
                    fontSize: "14px",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    animation: "menuSkeletonFadeIn 0.3s ease-in 3s both",
                }}
            >
                Loading menu...
            </div>
            <style>{`
                @keyframes menuSkeletonPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                @keyframes menuSkeletonFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
}

// Async data fetcher — streams after skeleton (Customer Infra Hardening - TASK 5)
// All Firestore reads happen here so Suspense boundary can show skeleton instantly
async function MenuContent({
    slug,
    slugSegments = [],
    requestedLanguage,
}: {
    slug?: string;
    slugSegments?: string[];
    requestedLanguage?: string | null;
}) {
    const { subdomain, customDomain, tenantType, origin } = await getTenantFromHeaders();

    // Lookup store — withTimeout prevents infinite SSR hang (GPT FIX 4), withRetry handles transients (TASK 4)
    let storeData: any = null;
    if (tenantType === "subdomain" && subdomain) {
        storeData = await withRetry(() => withTimeout(getStoreBySubdomain(subdomain)));
    } else if (tenantType === "custom" && customDomain) {
        storeData = await withRetry(() => withTimeout(getStoreByCustomDomain(customDomain)));
    }

    if (!storeData) {
        notFound();
    }

    // T1-N-05 / A-03 PUBLIC-ROUTING-DOCTRINE: admin-tier rename chain.
    // If the customer arrived via a legacy subdomain that differs from the
    // store's current subdomain, 301 to the canonical subdomain. This is
    // ONLY reachable via the admin rename endpoint (owner-facing rename is
    // still blocked after first publish by G-08).
    if (
        tenantType === 'subdomain'
        && subdomain
        && storeData.subdomain
        && storeData.subdomain.toLowerCase() !== subdomain.toLowerCase()
    ) {
        const canonical = `https://${storeData.subdomain}.menulist.ai${slug ? `/${slug}` : ''}`;
        redirect(appendPublicLanguageParam(canonical, requestedLanguage));
    }

    // URL Routing Architecture — Phase 2: Subdomain → custom domain 301 redirect
    // When store has a verified custom domain and visitor arrives via subdomain,
    // redirect to custom domain to consolidate SEO authority on the canonical URL
    if (tenantType === "subdomain" && storeData.customDomain && storeData.domainVerified) {
        const customUrl = `https://${storeData.customDomain}${slug ? `/${slug}` : ''}`;
        redirect(appendPublicLanguageParam(customUrl, requestedLanguage));
    }

    // URL Routing Architecture — Gap 2: Outlet routing via outletSlug.
    // For multi-store brands: brand.menulist.ai/{outletSlug} or
    // brand.menulist.ai/{outletSlug}/{projectSlug}. When the first slug matches
    // an outlet's outletSlug, switch storeData to that outlet and use the
    // remaining path segment as the project slug.
    //
    // G-01 (§11 + D-07 PUBLIC-ROUTING-DOCTRINE): when only the outlet segment is
    // present (`/{outletSlug}` with no further path), render the outlet's OBP
    // surface — NOT the outlet's default project. This matches D-07: the Store
    // surface IS the OBP for that outlet.
    // Capture master origin context before any outlet switch — outlets don't
    // carry subdomain/customDomain of their own, so outlet OBP rendering
    // (G-01) needs these preserved from the pre-switch master store.
    const masterSubdomain: string | undefined = storeData?.subdomain ?? undefined;
    const masterCustomDomain: string | undefined = storeData?.customDomain ?? undefined;
    const contentLanguage = resolveStorePublicLanguage(storeData, requestedLanguage);
    // G-09 (§11 + D-12 PUBLIC-ROUTING-DOCTRINE): capture the master brand name
    // BEFORE the outlet switch so the breadcrumb's "Business" node on outlet
    // project pages can show the tenant-level brand, not the outlet's name.
    const masterBrandName: string | undefined = storeData ? getBrandName(storeData, '') || undefined : undefined;

    let resolvedSlug = slug;
    let resolvedOutletSlug: string | null = null;
    let outletRenderedAsObp = false;
    if (slug && storeData.isMaster && FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        const outletStore = await withRetry(() =>
            withTimeout(getStoreByOutletSlug(storeData.tenantId, slug))
        ).catch(() => null);

        if (outletStore) {
            // G-07 (§11 + §7 PUBLIC-ROUTING-DOCTRINE): outlet slug rename
            // chain. If the outlet was found via `previousOutletSlugs`
            // (i.e., its CURRENT outletSlug differs from what the customer
            // typed), 301 to the canonical outlet URL so physical QRs and
            // printed signage keep working across renames while SEO
            // consolidates on the canonical URL.
            const canonicalOutletSlug = (outletStore.outletSlug || '').toLowerCase();
            if (canonicalOutletSlug && canonicalOutletSlug !== slug.toLowerCase()) {
                const tail = slugSegments.slice(1).join('/');
                const canonicalPath = tail
                    ? `/${canonicalOutletSlug}/${tail}`
                    : `/${canonicalOutletSlug}`;
                redirect(appendPublicLanguageParam(canonicalPath, requestedLanguage));
            }

            storeData = outletStore;
            resolvedOutletSlug = canonicalOutletSlug || slug.toLowerCase();
            if (slugSegments.length === 1) {
                // G-01: `/{outletSlug}` alone → outlet OBP surface.
                outletRenderedAsObp = true;
            } else {
                // `/{outletSlug}/{projectSlug}` → project resolution.
                resolvedSlug = slugSegments[1];
            }
        }
    }

    if (outletRenderedAsObp) {
        // G-01: defer to OBPContent with the outlet as an explicit override so
        // the OBP render code path is single-sourced — no duplicated identity
        // block, CTA, or analytics wiring in MenuContent. OBPContent knows to
        // skip the BrandOBP selector branch when storeOverride is supplied.
        // masterSubdomain / masterCustomDomain give OBPContent the origin
        // context it needs to build absolute URLs for the outlet surface.
        const OBPContent = require('../obp/OBPContent').default;
        return (
            <OBPContent
                storeOverride={storeData}
                masterSubdomain={masterSubdomain}
                masterCustomDomain={masterCustomDomain}
                // T2-N-05 / D-12: lets the outlet OBP render the
                // Business → Outlet breadcrumb with the correct brand name.
                masterBrandName={masterBrandName}
                requestedLanguage={requestedLanguage}
            />
        );
    }

    // Per-store cached wrappers — tags enable precise per-store invalidation (GPT FIX 2)
    // When owner saves menu → revalidateTag(`menu-store-${sId}`) clears only their cache
    const getCachedProject = unstable_cache(
        getProjectBySlugOrDefault,
        ['client-menu-project'],
        { revalidate: 60, tags: [`menu-store-${storeData.storeId}`] }
    );

    // OPT-5: storeData already contains full store document from subdomain/custom domain lookup
    // Eliminated redundant getStoreById() — saves 1 Firestore read per menu page visit
    const storeDetails = storeData;

    const getCachedBlocks = unstable_cache(
        getPrecomputedDecisionBlocks,
        ['client-decision-blocks'],
        { revalidate: 60, tags: [`menu-store-${storeData.storeId}`] }
    );

    // Get project — cached + retry + timeout
    // Uses resolvedSlug (may differ from slug if outlet routing detected)
    const baseResult = await withRetry(() => withTimeout(getCachedProject(
        storeData.tenantId,
        storeData.storeId,
        resolvedSlug,
    )));

    if (!baseResult) {
        // T1-N-03 / A-12 PUBLIC-ROUTING-DOCTRINE: instead of a terminal 404,
        // degrade up the fallback ladder. The client component detects
        // standalone PWA mode and auto-redirects after a visible 2s hint,
        // while browser tabs show explicit navigation links. masterStoreName
        // is captured pre-outlet-switch (see G-09) so the brand link reads
        // correctly for multi-outlet tenants.
        return (
            <MenuNotFoundFallback
                requestedSlug={resolvedSlug || slug || ''}
                outletSlug={storeData.isMaster === false ? storeData.outletSlug || null : null}
                storeName={getStoreContextName(storeData, '') || null}
                brandName={masterBrandName || getBrandName(storeData, '') || null}
            />
        );
    }

    // Special Menu Switching — resolve active special menu override
    // Zero extra reads when no special menu active (checks storeData.activeSpecialMenuId field)
    // When active: 1 read for special menu project (replace mode) or merge with base (overlay mode)
    const result = await resolveSpecialMenuOverride(storeData, baseResult);

    const { projectData: rawProjectData, projectMetadata, redirectSlug, isMenuAliasFallback } = result;

    // URL Routing Architecture — ADR-3: 301 redirect from old slug to current slug
    // Preserves QR codes and shared links when project is renamed
    if (redirectSlug && slug && redirectSlug !== slug.toLowerCase()) {
        const baseUrl = tenantType === "custom" && customDomain
            ? `https://${customDomain}`
            : origin || `https://${subdomain}.menulist.ai`;
        const outletPrefix = resolvedOutletSlug ? `/${resolvedOutletSlug}` : '';
        redirect(appendPublicLanguageParam(`${baseUrl}${outletPrefix}/${redirectSlug}`, requestedLanguage));
    }

    // Strip internal metadata before any customer-facing usage (TASK 7)
    const sanitized = serializeClientValue(sanitizeForClient(rawProjectData));
    const effectiveBusinessType = resolvePublicBusinessType(
        storeDetails?.businessType,
        storeDetails?.businessIndustry,
    );
    const searchReadyProjectData = FEATURE_FLAGS.ENABLE_PUBLIC_MENU_RETRIEVAL_FOUNDATION
        ? attachPublicMenuSearchIndex(sanitized, {
            includePrices: sanitized?.config?.design?.menu?.showItemPrices ?? true,
            businessType: effectiveBusinessType,
            businessCategory: storeDetails?.businessCategory,
        })
        : sanitized;

    // #30: Lazy language loading — reduce SSR payload for multi-language menus (3+ languages)
    // Names kept in ALL languages (short strings, needed for instant language switching)
    // Descriptions keep primary + initially requested language. Search uses compact terms for all languages.
    const projectData = optimizeLanguagePayload(searchReadyProjectData, requestedLanguage);
    const clientStoreDetails = serializeClientValue({
        ...storeDetails,
        ...(effectiveBusinessType && { businessType: effectiveBusinessType }),
    });

    // Fetch precomputed Decision Blocks (optional enhancement — cached)
    const projectId = projectMetadata.projectId || projectMetadata.id;
    const precomputedBlocks = serializeClientValue(await withTimeout(getCachedBlocks(
        storeData.tenantId,
        storeData.storeId,
        projectId,
    )));

    // Build canonical URL based on tenant type and slug
    const baseUrl =
        tenantType === "custom" && customDomain
            ? `https://${customDomain}`
            : origin || `https://${subdomain}.menulist.ai`;

    // Add slug to canonical if not default project.
    // G-05 / R5 Layer 2 canonical (§9 + §8 PUBLIC-ROUTING-DOCTRINE):
    // When the visitor arrived at /menu AND no project claimed slug `menu`
    // (isMenuAliasFallback === true), we are serving the default project as
    // a universal alias. The canonical must point at the default project's
    // real slug URL (e.g., /food-menu, /services, /carta) so Google indexes
    // one URL per project and /menu is not indexed as a duplicate.
    // Layer 1 case (project slug === 'menu') does NOT trip this branch
    // because the slug-match cascade resolved the project directly — in that
    // case /menu IS the canonical URL and no override is needed.
    const canonicalProjectName = getLocalizedText(
        projectMetadata?.name,
        projectData?.languages?.[0] || contentLanguage,
        getPrimaryLocalizedLanguage(projectMetadata?.name, projectData?.languages?.[0] || contentLanguage),
        '',
    );
    const realDefaultSlug = projectMetadata?.slug
        || (canonicalProjectName ? slugify(canonicalProjectName) : '');
    const outletPrefix = resolvedOutletSlug ? `/${resolvedOutletSlug}` : '';
    const canonicalProjectSlug = projectMetadata?.slug || (canonicalProjectName ? slugify(canonicalProjectName) : '');
    const canonicalUrl = isMenuAliasFallback && realDefaultSlug
        ? `${baseUrl}${outletPrefix}/${realDefaultSlug}`
        : (projectMetadata?.isDefault && !resolvedSlug && !outletPrefix
            ? baseUrl
            : canonicalProjectSlug
            ? `${baseUrl}${outletPrefix}/${canonicalProjectSlug}`
            : baseUrl);

    const projectLanguage = resolveProjectPublicLanguage(projectData, storeDetails, requestedLanguage);
    const schemaOrgJsonLd = generateSchemaOrgJsonLd(
        projectData,
        storeDetails,
        canonicalUrl,
        projectLanguage,
    );

    // BreadcrumbList for search engine navigation: Business → Menu
    const storeName = getStoreContextName(storeDetails, 'Business');
    const menuName = getLocalizedText(projectMetadata?.name, projectLanguage, getPrimaryLocalizedLanguage(projectMetadata?.name, projectLanguage), 'Menu');
    const breadcrumbJsonLd = buildBreadcrumbList(storeName, baseUrl, menuName);
    const menuDesign = resolveMenuDesignConfig(projectData?.config?.design?.menu);
    const menuMoodConfig = getMoodWithBrandColor(
        menuDesign.mood,
        projectData?.config?.design?.brand?.accentColor,
    );
    const menuHeaderTheme = {
        background: menuMoodConfig.background,
        textColor: menuMoodConfig.bodyColor,
        headingColor: menuMoodConfig.headingColor,
        mutedColor: menuMoodConfig.descriptionColor || menuMoodConfig.bodyColor,
        accentColor: menuMoodConfig.accentColor,
        borderColor:
            menuMoodConfig.categoryStyle.dividerColor ||
            menuMoodConfig.categoryStyle.borderColor ||
            menuMoodConfig.itemStyle.borderColor,
        fontFamily: menuMoodConfig.bodyFont,
    };

    // Customer App (PWA) schema — tells search engines this menu is also an
    // installable WebApplication. Gated on the global + per-store PWA flag so
    // disabled tenants don't falsely signal installability.
    const pwaEnabled =
        FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA &&
        storeDetails?.pwaSettings?.enableInstallableApp !== false;
    const pwaSchemaJsonLd = pwaEnabled
        ? buildMobileAppSchema({
            name: storeName,
            description:
                getLocalizedText(
                    storeDetails?.tagline,
                    contentLanguage,
                    getPrimaryLocalizedLanguage(storeDetails?.tagline, contentLanguage),
                    '',
                ).trim().length > 0
                    ? getLocalizedText(
                        storeDetails?.tagline,
                        contentLanguage,
                        getPrimaryLocalizedLanguage(storeDetails?.tagline, contentLanguage),
                        '',
                    ).trim().slice(0, 160)
                    : `${storeName} — digital menu`,
            baseUrl,
            themeColor: storeDetails?.publicPresence?.accentColor,
        })
        : null;

    return (
        <>
            {/* Schema.org JSON-LD for SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrgJsonLd) }}
            />
            {/* BreadcrumbList JSON-LD for search navigation */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />
            {/* Customer App (PWA) — signals installability to search engines */}
            {pwaSchemaJsonLd ? (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(pwaSchemaJsonLd) }}
                />
            ) : null}
            {/* ── Temporary Status Banner ── */}
            {FEATURE_FLAGS.ENABLE_TEMP_STATUS && clientStoreDetails?.tempStatus && (
                <TempStatusBanner tempStatus={clientStoreDetails.tempStatus} />
            )}
            {/*
              * G-09 (§11 + D-12 PUBLIC-ROUTING-DOCTRINE): visible breadcrumb.
              * Business → (Store →) Project. Outlet node appears only when
              * this render is scoped to an outlet store (not the master)
              * AND we have a real outletSlug to link to.
              */}
            <MenuBreadcrumb
                businessName={masterBrandName || storeName}
                outletName={
                    !storeData.isMaster && storeData.outletSlug
                        ? (getStoreName(storeData, '') || undefined)
                        : undefined
                }
                outletSlug={
                    !storeData.isMaster && storeData.outletSlug
                        ? storeData.outletSlug
                        : undefined
                }
                projectName={menuName}
                logoUrl={storeDetails?.logo || null}
                variant="identity"
                theme={menuHeaderTheme}
            />
            <ClientMenuRenderer
                projectData={projectData}
                storeDetails={clientStoreDetails}
                precomputedBlocks={precomputedBlocks}
                projectId={projectId}
                initialLanguage={requestedLanguage || undefined}
                // T5-N-01: R5 Layer resolution analytics — passed through to
                // AnalyticsContext so trackMenuView can tag Layer 1 vs Layer 2.
                menuResolutionLayer={isMenuAliasFallback ? 'layer2' : 'layer1'}
            />
        </>
    );
}

// Page entry point — skeleton renders instantly, data streams when ready (Customer Infra Hardening - TASK 5)
// When ENABLE_OBP is true: root = OBP, "menu" slug = default project, other slugs = specific projects
export default function ClientMenuPage({ params, searchParams }: PageProps) {
    const slug = params.slug?.[0];
    const allSlugs = params.slug || [];
    const requestedLanguage = normalizePublicLanguageCode(searchParams?.lang);

    // Compliance pages: /privacy, /terms, /refund — static compliance artifacts
    // @see __docs__/compliance-pages/compliance-pages_impl.md
    if (FEATURE_FLAGS.ENABLE_COMPLIANCE_PAGES && (slug === 'privacy' || slug === 'terms' || slug === 'refund')) {
        const CompliancePageContent = require('../compliance/CompliancePageContent').default;
        return (
            <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#fafafa' }} />}>
                <CompliancePageContent type={slug as 'privacy' | 'terms' | 'refund'} />
            </Suspense>
        );
    }

    // OBP: When enabled and no slug → show Official Business Page
    if (FEATURE_FLAGS.ENABLE_OBP && !slug) {
        const OBPContent = require('../obp/OBPContent').default;
        const OBPSkeleton = require('../obp/OBPSkeleton').default;
        return (
            <Suspense fallback={<OBPSkeleton />}>
                <OBPContent requestedLanguage={requestedLanguage} />
            </Suspense>
        );
    }

    // G-05 / R5 two-layer /menu resolution (§9 + D-14 PUBLIC-ROUTING-DOCTRINE):
    // Pass slug as-is. The resolver function handles both layers:
    //   Layer 1 — if a project has slug `menu`, normal slug match resolves it
    //             (owner-claimed canonical URL).
    //   Layer 2 — otherwise, the existing isDefault fallback inside
    //             getProjectBySlugOrDefault serves the default project as an
    //             alias. MenuContent detects this case and emits a canonical
    //             tag pointing at the default project's real slug URL.
    return (
        <Suspense fallback={<MenuSkeleton />}>
            <MenuContent slug={slug} slugSegments={allSlugs} requestedLanguage={requestedLanguage} />
        </Suspense>
    );
}
