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

import { getMoodWithBrandColor, resolveMenuDesignConfig } from "@config/designSystem";
import { FEATURE_FLAGS } from "@config/features";
import { APP_THEME_COLOR } from "@constant/common";
import { DB_COLLECTIONS } from "@constant/database";
import { PLATFORM_DOMAIN } from "@constant/urls";
import { firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { getBrandName, getStoreContextName, getStoreName } from "@lib/businessIdentity/names";
import { resolvePublicBusinessType } from "@lib/businessIdentity/publicBusinessType";
import {
    getStoreByCustomDomain,
    getStoreByOutletSlug,
    getStoreBySubdomain,
} from "@lib/firestore/clientStoreLookup";
import { isActiveRegularSummaryProject, parseSummaryProjects, withAuthoritativeSummaryProjectId } from "@lib/firestore/parseSummaryProjects";
import {
    appendPublicLanguageParam,
    buildPublicLanguageAlternates,
    getPublicLanguageOptions,
    normalizePublicLanguageCode,
    resolveProjectPublicLanguage,
    resolveStorePublicLanguage,
} from "@lib/localization/publicRenderLanguage";
import {
    createPublicCustomerTranslator,
    type PublicCustomerTranslator,
} from "@lib/localization/publicCustomerMessages";
import { getResolvedStoreKeywords } from "@lib/localization/storeContent";
import { getLocalizedText, getPrimaryLocalizedLanguage } from "@lib/localization/text";
import { projectPublicDecisionBlocks } from "@lib/decisionBlocks/publicProjection";
import { getDecisionFactArray, getDecisionFactNumber, getDecisionFactString, getNutritionFact } from "@lib/menu/itemDecisionFacts";
import { buildCanonicalItemUrl } from "@lib/menu/itemTruthUrls";
import { getPrimaryPublicMenuImage } from "@lib/menu/publicMenuImages";
import { attachPublicMenuSearchIndex } from "@lib/menu/publicMenuSearch";
import { getPublicMenuFreshness } from "@lib/menu/publicMenuStructuredData";
import { mergeSpecialMenuOverlayProjects } from "@lib/menu/specialMenuOverlay";
import { getPublicBusinessDescription } from "@lib/obp/getPublicBusinessDescription";
import { isStarterPublicSurfaceExpired } from "@lib/onboarding/starterActivation";
import { sanitizeForClient } from "@lib/mce/utils";
import { populateMasterCache, resolveProjectForRender } from "@lib/multiOutlet";
import { getTenantFromHeaders as sharedGetTenantFromHeaders } from "@lib/multiTenant/getTenantFromHeaders";
import {
    deriveCustomerAppShortName,
    getCustomerAppIconUrl,
    getCustomerAppIconVersion,
    getStaticCustomerAppleStartupImages,
} from "@lib/pwa/customerAppAssets";
import { buildMobileAppSchema } from "@lib/pwa/schemaJsonLd";
import { normalizePublicOutletSlug, normalizePublicProjectSlug } from "@lib/publicRouting/pathSegments";
import { projectPublicClientStore } from "@lib/publicTruth/clientStoreProjection";
import { DEFAULT_PUBLIC_PREVIEW_IMAGE } from "@lib/seo/publicMetadata";
import { buildPublicTruthRobots, evaluatePublicTruthIndexability } from "@lib/seo/publicTruthIndexing";
import {
    buildAddress,
    buildBreadcrumbList,
    buildGeoCoordinates,
    buildOpeningHours,
    buildSchemaPriceRange,
    buildSchemaTelephone,
    buildSameAs,
    buildTempStatusSchema,
    getMenuSchemaType,
    getOfferingItemSchemaType,
    isFoodBusinessCategory,
} from "@lib/schema";
import { secureError } from "@lib/security/secureLogger";
import { slugify } from "@lib/utils/slugify";
import ClientMenuRenderer from "@template/website/clientWebsite";
import JsonLdScript from "@/components/seo/JsonLdScript";
import StarterActivationHoldingPage from "@/components/customer/StarterActivationHoldingPage";
import { Metadata, Viewport } from "next";
import { unstable_cache } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import CompliancePageContent from "../compliance/CompliancePageContent";
import OBPContent from "../obp/OBPContent";
import OBPSkeleton from "../obp/OBPSkeleton";
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

type PublicMenuResolutionFailureType =
    | 'canonical_url_parse_failed'
    | 'linked_master_missing'
    | 'linked_master_scope_invalid'
    | 'linked_master_unresolved'
    | 'linked_resolution_failed'
    | 'metadata_outlet_lookup_failed'
    | 'metadata_project_lookup_failed'
    | 'outlet_lookup_failed'
    | 'special_project_missing'
    | 'special_resolution_failed';

type PublicMenuProjectDocumentScope = {
    projectId: string;
    storeDocumentId: string;
    tenantDocumentId: string;
};

const PUBLIC_MENU_PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{1,200}$/;
const PUBLIC_MENU_NUMERIC_DOCUMENT_ID_PATTERN = /^\d+$/;

function isPublicMenuPositiveNumericDocumentId(value: string): boolean {
    if (!PUBLIC_MENU_NUMERIC_DOCUMENT_ID_PATTERN.test(value) || !isValidFirestoreDocumentId(value)) return false;
    const numericId = Number(value);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === value;
}

function normalizePublicMenuProjectDocumentScope(value: unknown): PublicMenuProjectDocumentScope | null {
    if (typeof value !== 'string') return null;
    const projectId = value;
    if (!PUBLIC_MENU_PROJECT_ID_PATTERN.test(projectId) || !isValidFirestoreDocumentId(projectId)) return null;

    const parts = projectId.split("-");
    if (parts.length < 3) return null;

    const tenantDocumentId = parts[0];
    const storeDocumentId = parts[parts.length - 1];
    if (!isPublicMenuPositiveNumericDocumentId(tenantDocumentId) || !isPublicMenuPositiveNumericDocumentId(storeDocumentId)) {
        return null;
    }

    return { projectId, storeDocumentId, tenantDocumentId };
}

const buildPublicMenuResolutionLogContext = (
    failureType: PublicMenuResolutionFailureType,
    metadata: {
        projectId?: string | number | null;
        projectSlug?: string | number | null;
        masterProjectId?: string | number | null;
        specialMenuId?: string | number | null;
        tenantId?: string | number | null;
        storeId?: string | number | null;
        slug?: string | number | null;
        canonicalUrl?: string | number | null;
        error?: unknown;
    } = {},
) => {
    const projectId = String(metadata.projectId ?? '').trim();
    const projectSlug = String(metadata.projectSlug ?? '').trim();
    const masterProjectId = String(metadata.masterProjectId ?? '').trim();
    const specialMenuId = String(metadata.specialMenuId ?? '').trim();
    const tenantId = String(metadata.tenantId ?? '').trim();
    const storeId = String(metadata.storeId ?? '').trim();
    const slug = String(metadata.slug ?? '').trim();
    const canonicalUrl = String(metadata.canonicalUrl ?? '').trim();

    return {
        failureType,
        projectIdPresent: Boolean(projectId),
        projectIdLength: projectId.length,
        projectSlugPresent: Boolean(projectSlug),
        projectSlugLength: projectSlug.length,
        masterProjectIdPresent: Boolean(masterProjectId),
        masterProjectIdLength: masterProjectId.length,
        specialMenuIdPresent: Boolean(specialMenuId),
        specialMenuIdLength: specialMenuId.length,
        tenantIdPresent: Boolean(tenantId),
        tenantIdLength: tenantId.length,
        storeIdPresent: Boolean(storeId),
        storeIdLength: storeId.length,
        slugPresent: Boolean(slug),
        slugLength: slug.length,
        canonicalUrlPresent: Boolean(canonicalUrl),
        canonicalUrlLength: canonicalUrl.length,
        errorName: metadata.error instanceof Error ? metadata.error.name : typeof metadata.error,
    };
};

const logPublicMenuResolutionFailure = (
    failureType: PublicMenuResolutionFailureType,
    metadata?: Parameters<typeof buildPublicMenuResolutionLogContext>[1],
) => {
    secureError(
        '[Client Menu] Public menu resolution degraded',
        new Error(`public_menu_resolution_${failureType}`),
        buildPublicMenuResolutionLogContext(failureType, metadata),
    );
};

// Get project data by ID
async function getProjectData(projectId: string): Promise<any> {
    const projectScope = normalizePublicMenuProjectDocumentScope(projectId);
    if (!projectScope) return null;

    const docSnap = await firestoreAdmin
        .collection(DB_COLLECTIONS.PROJECTS)
        .doc(projectScope.tenantDocumentId)
        .collection(projectScope.storeDocumentId)
        .doc(projectScope.projectId)
        .get();
    if (!docSnap.exists) return null;
    return docSnap.data();
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
    const summarySnap = await firestoreAdmin
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(`projects_${storeId}`)
        .get();
    // Handles both storage formats: nested `{ projects: { id: {...} } }`
    // and legacy flat `{ "projects.id": {...} }` created by Admin SDK set() writes.
    const summaryProjects = summarySnap.exists ? parseSummaryProjects(summarySnap.data()) : {};

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
        .filter(([projectId, data]) => {
            const projectScope = normalizePublicMenuProjectDocumentScope(projectId);
            return isActiveRegularSummaryProject(data)
                && projectScope?.tenantDocumentId === String(tenantId)
                && projectScope.storeDocumentId === String(storeId);
        })
        .map(([projectId, data]) => ({
            ...withAuthoritativeSummaryProjectId(projectId, data),
            id: projectId,
        }));

    if (projects.length === 0) return null;

    let targetProject: (typeof projects)[number] | null = null;
    let redirectSlug: string | null = null; // For 301 redirect from old slug

    if (slug) {
        const normalizedSlug = normalizePublicProjectSlug(slug);
        if (!normalizedSlug) {
            return null;
        }

        // 1. Match by stored slug field (URL Routing Architecture — ADR-3)
        targetProject =
            projects.find((p) => normalizePublicProjectSlug(p.slug) === normalizedSlug) || null;

        // 2. Fallback: match by slugified name (backward compat for projects without stored slug)
        // normalizePublicProjectSlug already blocks reserved namespace bypasses.
        if (!targetProject) {
            targetProject =
                projects.find((p) => p.name && normalizePublicProjectSlug(slugify(p.name)) === normalizedSlug) ||
                null;
        }

        // 3. Check previousSlugs for 301 redirect (QR code permanence)
        if (!targetProject) {
            const oldSlugMatch = projects.find(
                (p) => p.previousSlugs && Array.isArray(p.previousSlugs) &&
                    p.previousSlugs.some((previousSlug: unknown) => normalizePublicProjectSlug(previousSlug) === normalizedSlug)
            );
            if (oldSlugMatch) {
                targetProject = oldSlugMatch;
                redirectSlug =
                    normalizePublicProjectSlug(oldSlugMatch.slug)
                    || (oldSlugMatch.name ? normalizePublicProjectSlug(slugify(oldSlugMatch.name)) : null);
            }
        }

        // A supplied customer path may only resolve to the project it names.
        // The sole compatibility exception is the literal `/menu` alias below;
        // an unknown slug must never silently display a different default menu.
        if (!targetProject && normalizedSlug !== 'menu') {
            return null;
        }
    }

    // G-05 / R5 Layer 2 detection (§9 + D-14 PUBLIC-ROUTING-DOCTRINE):
    // If slug was literal 'menu' AND all slug-match cascades above missed,
    // we are about to serve the default project as a universal alias.
    // Track this so MenuContent can emit `<link rel="canonical">` pointing
    // at the default project's real slug URL — Layer 2 must not SEO-index /menu.
    const isMenuAliasFallback = !targetProject && normalizePublicProjectSlug(slug) === 'menu';

    if (!targetProject) {
        // No slug or no match - find default project
        // (This is both the "no slug" path and R5 Layer 2 alias fallback for /menu)
        targetProject = projects.find((p) => p.isDefault === true) || null;
    }

    if (!targetProject && !slug && projects.length > 0) {
        // Compatibility fallback for the no-slug route when OBP is disabled.
        // `/menu` remains default-only and unknown supplied slugs fail closed.
        targetProject = projects[0];
    }

    if (!targetProject) return null;

    // Fetch full project data
    let projectData = await getProjectData(
        targetProject.projectId || targetProject.id,
    );
    if (!projectData) return null;
    if (projectData.active === false || projectData.deleted === true) return null;

    // Multi-outlet: Resolve linked store data by merging with master
    // This ensures customers see the complete menu with inherited items + local overrides
    if (FEATURE_FLAGS.ENABLE_MULTI_OUTLET && projectData.masterProjectId) {
        try {
            const outletProjectId = String(targetProject.projectId || targetProject.id || '');
            const outletProjectScope = normalizePublicMenuProjectDocumentScope(outletProjectId);
            const masterProjectScope = normalizePublicMenuProjectDocumentScope(projectData.masterProjectId);
            if (
                !outletProjectScope
                || !masterProjectScope
                || outletProjectScope.tenantDocumentId !== masterProjectScope.tenantDocumentId
                || outletProjectScope.storeDocumentId === masterProjectScope.storeDocumentId
            ) {
                logPublicMenuResolutionFailure('linked_master_scope_invalid', {
                    projectId: outletProjectId,
                    masterProjectId: projectData.masterProjectId,
                });
                return null;
            }
            const masterProjectData = await getProjectData(projectData.masterProjectId);
            if (
                !masterProjectData?.files?.length
                || masterProjectData.active === false
                || masterProjectData.deleted === true
            ) {
                logPublicMenuResolutionFailure('linked_master_missing', {
                    projectId: outletProjectId,
                    masterProjectId: projectData.masterProjectId,
                });
                return null;
            }
            populateMasterCache(projectData.masterProjectId, masterProjectData);
            const resolved = await resolveProjectForRender({
                storeProject: projectData,
            });
            if (resolved?._resolved?.isMasterLinked !== true) {
                logPublicMenuResolutionFailure('linked_master_unresolved', {
                    projectId: targetProject.projectId || targetProject.id,
                    masterProjectId: projectData.masterProjectId,
                });
                return null;
            }
            projectData = resolved;
        } catch (error) {
            logPublicMenuResolutionFailure('linked_resolution_failed', {
                projectId: targetProject.projectId || targetProject.id,
                masterProjectId: projectData.masterProjectId,
                error,
            });
            return null;
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
            logPublicMenuResolutionFailure('special_project_missing', {
                specialMenuId: storeData.activeSpecialMenuId,
            });
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
            const merged = mergeSpecialMenuOverlayProjects(baseResult.projectData, specialProjectData);
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
        logPublicMenuResolutionFailure('special_resolution_failed', {
            specialMenuId: storeData.activeSpecialMenuId,
            error,
        });
        return baseResult;
    }
}

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
    const projectSlug =
        normalizePublicProjectSlug(projectMetadata?.slug)
        || (projectName ? normalizePublicProjectSlug(slugify(projectName)) : null);
    if (!projectSlug) return baseUrl;

    const safeOutletSlug = normalizePublicOutletSlug(outletSlug);
    const outletPrefix = safeOutletSlug ? `/${safeOutletSlug}` : '';
    return `${baseUrl}${outletPrefix}/${projectSlug}`;
}

function getUrlHostname(
    value?: string | null,
    diagnosticContext?: {
        tenantId?: string | number | null;
        storeId?: string | number | null;
        slug?: string | number | null;
        failureType: Extract<PublicMenuResolutionFailureType, 'canonical_url_parse_failed'>;
    },
): string {
    if (!value || typeof value !== 'string') return '';
    try {
        return new URL(value).hostname.toLowerCase();
    } catch (error) {
        if (diagnosticContext) {
            logPublicMenuResolutionFailure(diagnosticContext.failureType, {
                tenantId: diagnosticContext.tenantId,
                storeId: diagnosticContext.storeId,
                slug: diagnosticContext.slug,
                canonicalUrl: value,
                error,
            });
        }
        return '';
    }
}

function resolveSafeStoreCanonicalUrl(
    storedCanonicalUrl: unknown,
    fallbackUrl: string,
    canonicalBase: string,
    diagnosticContext?: {
        tenantId?: string | number | null;
        storeId?: string | number | null;
        slug?: string | number | null;
    },
): string {
    if (typeof storedCanonicalUrl !== 'string') return fallbackUrl;
    const trimmed = storedCanonicalUrl.trim();
    if (!trimmed) return fallbackUrl;

    let parsedStoredUrl: URL;
    try {
        parsedStoredUrl = new URL(trimmed);
    } catch (error) {
        if (diagnosticContext) {
            logPublicMenuResolutionFailure('canonical_url_parse_failed', {
                tenantId: diagnosticContext.tenantId,
                storeId: diagnosticContext.storeId,
                slug: diagnosticContext.slug,
                canonicalUrl: trimmed,
                error,
            });
        }
        return fallbackUrl;
    }

    if (
        parsedStoredUrl.protocol !== 'https:'
        || parsedStoredUrl.username
        || parsedStoredUrl.password
    ) {
        return fallbackUrl;
    }

    const storedHost = parsedStoredUrl.hostname.toLowerCase();

    const allowedHosts = new Set([
        getUrlHostname(fallbackUrl),
        getUrlHostname(canonicalBase),
    ].filter(Boolean));

    return allowedHosts.has(storedHost) ? parsedStoredUrl.toString() : fallbackUrl;
}

function getComplianceMetadata(
    slug: string,
    t: PublicCustomerTranslator,
): { label: string; description: (storeName: string) => string } | undefined {
    const metadataBySlug: Record<string, { label: string; descriptionKey: Parameters<PublicCustomerTranslator>[0] }> = {
        privacy: {
            label: t('menu.privacyPolicy'),
            descriptionKey: 'menu.privacyPolicyDescription',
        },
        terms: {
            label: t('menu.termsConditions'),
            descriptionKey: 'menu.termsConditionsDescription',
        },
        refund: {
            label: t('menu.refundCancellationPolicy'),
            descriptionKey: 'menu.refundCancellationPolicyDescription',
        },
    };
    const metadata = metadataBySlug[slug];
    return metadata
        ? {
            label: metadata.label,
            description: (storeName) => t(metadata.descriptionKey, { businessName: storeName }),
        }
        : undefined;
}

// Generate metadata for SEO
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
    const { subdomain, customDomain, tenantType, origin } = await getTenantFromHeaders();
    const requestedLanguage = normalizePublicLanguageCode(searchParams?.lang);
    const requestedItemId = Array.isArray(searchParams?.item) ? searchParams?.item[0] : searchParams?.item;

    // Lookup store based on tenant type (with retry for transient failures - TASK 4)
    let storeData: any = null;
    if (tenantType === "subdomain" && subdomain) {
        storeData = await withRetry(() => getStoreBySubdomain(subdomain));
    } else if (tenantType === "custom" && customDomain) {
        storeData = await withRetry(() => getStoreByCustomDomain(customDomain));
    }

    if (!storeData) {
        const t = createPublicCustomerTranslator(requestedLanguage);
        return {
            title: t('menu.menuNotFound'),
            description: t('menu.publicLinkInactive'),
            robots: {
                index: false,
                follow: false,
            },
        };
    }

    const slugSegments = params?.slug || [];
    const isRootRequest = slugSegments.length === 0;
    const contentLanguage = resolveStorePublicLanguage(storeData, requestedLanguage);
    const publicCustomerT = createPublicCustomerTranslator(contentLanguage);
    const storeName = isRootRequest && FEATURE_FLAGS.ENABLE_OBP
        ? getBrandName(storeData, publicCustomerT('common.business'))
        : getStoreContextName(storeData, publicCustomerT('common.business'));
    if (isStarterPublicSurfaceExpired(storeData)) {
        const starterIndexDecision = evaluatePublicTruthIndexability(storeData, {
            surface: FEATURE_FLAGS.ENABLE_OBP && isRootRequest ? 'obp' : 'menu',
            hasPublishedMenu: Boolean(storeData?.lastPublishedAt || storeData?.primaryProjectId),
        });
        return {
            title: publicCustomerT('menu.notFinalizedYet', { businessName: storeName }),
            description: publicCustomerT('menu.contactBusinessCurrentMenu'),
            robots: buildPublicTruthRobots(starterIndexDecision),
        };
    }
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
    const slugLen = slugSegments.length;

    // AEO-optimized title: when OBP is enabled, emit entity-rich title for AI extraction
    // "Joe's Pizza — Menu, Hours, Contact" helps AI answer "What time does Joe's Pizza close?"
    let title = storeMetaTitle || (
        FEATURE_FLAGS.ENABLE_OBP
            ? publicCustomerT('menu.metadataObpTitle', { businessName: storeName })
            : publicCustomerT('menu.metadataMenuTitle', { businessName: storeName })
    );
    let description =
        storeMetaDescription ||
        storeTagline ||
        (FEATURE_FLAGS.ENABLE_OBP
            ? publicCustomerT('menu.metadataObpDescription', { businessName: storeName })
            : publicCustomerT('menu.metadataMenuDescription', { businessName: storeName })
        );
    const imageUrl = storeData.logo || DEFAULT_PUBLIC_PREVIEW_IMAGE;

    // Build canonical URL based on domain type
    const requestBase = origin || (subdomain ? `https://${subdomain}.${PLATFORM_DOMAIN}` : '');
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
    // The normal project resolver already returns `isMenuAliasFallback`, so
    // metadata derives this from the same project read instead of performing a
    // separate summary lookup for crawler hits.
    let menuAliasCanonical: string | undefined;

    // Customer App (PWA) — per-tenant apple-touch-icon + theme color.
    // Dynamic icon route handles override / logo / letter fallback.
    // iOS Safari uses apple-touch-icon when the customer taps "Add to Home Screen".
    const pwaEnabled =
        FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA &&
        storeData.pwaSettings?.enableInstallableApp !== false;
    const pwaIconVersion = getCustomerAppIconVersion(storeData);
    const appleTouchIconUrl = pwaEnabled
        ? getCustomerAppIconUrl(storeData.id, 180, pwaIconVersion)
        : undefined;
    const pwaShortName =
        getLocalizedText(
            storeData.pwaSettings?.pwaShortName,
            contentLanguage,
            getPrimaryLocalizedLanguage(storeData.pwaSettings?.pwaShortName, contentLanguage),
            '',
        ).trim();
    const appleWebAppTitle = deriveCustomerAppShortName(storeName, pwaShortName);
    const themeColor = storeData.publicPresence?.accentColor || APP_THEME_COLOR;

    const currentPath = params?.slug && params.slug.length > 0
        ? `/${params.slug.join('/')}`
        : '/';
    const manifestUrl = '/manifest.webmanifest';
    const currentUrl = `${canonicalBase}${currentPath === '/' ? '' : currentPath}`;
    const complianceMetadata = FEATURE_FLAGS.ENABLE_COMPLIANCE_PAGES && slugLen === 1
        ? getComplianceMetadata(firstSlug || '', publicCustomerT)
        : undefined;

    if (complianceMetadata) {
        const complianceTitle = `${complianceMetadata.label} | ${storeName}`;
        const complianceDescription = complianceMetadata.description(storeName);
        const complianceIndexDecision = evaluatePublicTruthIndexability(storeData, {
            surface: 'obp',
            hasPublishedMenu: Boolean(storeData?.lastPublishedAt || storeData?.primaryProjectId),
        });

        return {
            title: complianceTitle,
            description: complianceDescription,
            keywords: getResolvedStoreKeywords(
                storeData?.keywords,
                contentLanguage,
                [],
            ).join(", "),
            manifest: manifestUrl,
            alternates: {
                canonical: currentUrl,
            },
            openGraph: {
                title: complianceTitle,
                description: complianceDescription,
                type: "website",
                siteName: storeName,
                url: currentUrl,
                images: imageUrl ? [{ url: imageUrl }] : undefined,
            },
            twitter: {
                card: "summary_large_image",
                title: complianceTitle,
                description: complianceDescription,
                images: imageUrl ? [imageUrl] : undefined,
            },
            robots: buildPublicTruthRobots(complianceIndexDecision),
            ...(appleTouchIconUrl
                ? {
                    appleWebApp: {
                        capable: true,
                        startupImage: getStaticCustomerAppleStartupImages(),
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

    let metadataStore = storeData;
    let metadataProject: any = null;
    let metadataProjectRecord: any = null;
    let metadataProjectResult: Awaited<ReturnType<typeof getProjectBySlugOrDefault>> = null;
    let projectSlugForLookup: string | undefined = normalizePublicProjectSlug(slugSegments[0]) || undefined;
    let hasUnsafeProjectPath = Boolean(slugSegments[0] && !projectSlugForLookup);
    let metadataOutletSlug: string | undefined;
    let contextSegments: string[] = [];

    if (
        slugSegments.length > 0
        && storeData?.isMaster
        && FEATURE_FLAGS.ENABLE_MULTI_OUTLET
        && firstSlug
    ) {
        const requestedOutletSlug = normalizePublicOutletSlug(firstSlug);
        const outletStore = await withRetry(() =>
            requestedOutletSlug
                ? getStoreByOutletSlug(storeData.tenantId, requestedOutletSlug)
                : Promise.resolve(null),
        ).catch((error) => {
            logPublicMenuResolutionFailure('metadata_outlet_lookup_failed', {
                tenantId: storeData.tenantId,
                storeId: storeData.storeId,
                slug: firstSlug,
                error,
            });
            return null;
        });

        if (outletStore) {
            metadataStore = outletStore;
            metadataOutletSlug = normalizePublicOutletSlug(outletStore.outletSlug) || requestedOutletSlug || undefined;
            projectSlugForLookup = normalizePublicProjectSlug(slugSegments[1]) || undefined;
            hasUnsafeProjectPath = Boolean(slugSegments[1] && !projectSlugForLookup);
            contextSegments = requestedItemId ? ['item', requestedItemId] : slugSegments.slice(2);
        } else {
            contextSegments = requestedItemId ? ['item', requestedItemId] : slugSegments.slice(1);
        }
    } else {
        contextSegments = requestedItemId ? ['item', requestedItemId] : slugSegments.slice(1);
    }

    const shouldLoadProjectMetadata = !!projectSlugForLookup || (!FEATURE_FLAGS.ENABLE_OBP && slugSegments.length === 0);
    if (shouldLoadProjectMetadata && metadataStore?.tenantId && metadataStore?.storeId) {
        const getCachedMetadataProject = unstable_cache(
            getProjectBySlugOrDefault,
            ['client-menu-project'],
            { revalidate: 60, tags: [`menu-store-${metadataStore.storeId}`] }
        );

        const projectResult = await withRetry(() =>
            getCachedMetadataProject(
                metadataStore.tenantId,
                metadataStore.storeId,
                projectSlugForLookup,
            ),
        ).catch((error) => {
            logPublicMenuResolutionFailure('metadata_project_lookup_failed', {
                tenantId: metadataStore.tenantId,
                storeId: metadataStore.storeId,
                projectSlug: projectSlugForLookup,
                error,
            });
            return null;
        });

        if (projectResult) {
            metadataProjectResult = projectResult;
            metadataProject = projectResult.projectData;
            metadataProjectRecord = projectResult.projectMetadata;
        }
    }

    const resolvedStoreName = metadataStore?.name || storeName;
    const resolvedImageUrl = metadataStore?.logo || imageUrl;
    const metadataLanguage = metadataProject
        ? resolveProjectPublicLanguage(metadataProject, metadataStore, requestedLanguage)
        : resolveStorePublicLanguage(metadataStore, requestedLanguage);
    const metadataT = createPublicCustomerTranslator(metadataLanguage);
    const metadataLanguageOptions = metadataProject
        ? (Array.isArray(metadataProject?.languages) && metadataProject.languages.length > 0
            ? metadataProject.languages
            : getPublicLanguageOptions(metadataStore))
        : getPublicLanguageOptions(metadataStore);
    const languageAlternates = buildPublicLanguageAlternates(currentUrl, metadataLanguageOptions);
    const missingProjectPath = hasUnsafeProjectPath || (
        shouldLoadProjectMetadata
        && Boolean(projectSlugForLookup)
        && !metadataProjectResult
    );
    const isOBPMetadata = FEATURE_FLAGS.ENABLE_OBP && !metadataProject && !missingProjectPath;
    const publicTruthIndexDecision = missingProjectPath
        ? {
            index: false,
            follow: true,
            includeInSitemap: false,
            reason: 'missing_menu_content' as const,
        }
        : evaluatePublicTruthIndexability(metadataStore, {
            surface: isOBPMetadata ? 'obp' : 'menu',
            hasPublishedMenu: Boolean(metadataStore?.lastPublishedAt || metadataStore?.primaryProjectId || metadataProject),
            projectData: metadataProject,
            projectSummary: metadataProjectRecord,
        });
    const publicTruthRobots = buildPublicTruthRobots(publicTruthIndexDecision);
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
    if (metadataProjectResult?.isMenuAliasFallback && projectCanonicalUrl) {
        menuAliasCanonical = projectCanonicalUrl;
    }
    const missingProjectFallbackCanonical = metadataOutletSlug
        ? `${canonicalBase}/${metadataOutletSlug}`
        : canonicalBase;
    const canonicalWithoutLanguage = isOBPMetadata
        ? resolveSafeStoreCanonicalUrl(metadataStore.canonicalUrl, currentUrl, canonicalBase, {
            tenantId: metadataStore.tenantId,
            storeId: metadataStore.storeId,
            slug: metadataOutletSlug,
        })
        : missingProjectPath
            ? missingProjectFallbackCanonical
            : menuAliasCanonical || projectCanonicalUrl || canonicalBase;
    const canonicalWithLanguage = isOBPMetadata && requestedLanguage && metadataLanguageOptions.length > 1
        ? appendPublicLanguageParam(canonicalWithoutLanguage, metadataLanguage)
        : canonicalWithoutLanguage;

    if (missingProjectPath) {
        title = metadataT('menu.metadataUnavailableTitle', { businessName: resolvedStoreName });
        description = metadataT('menu.metadataUnavailableDescription', { businessName: resolvedStoreName });
    }
    let resolvedPublicTruthRobots = publicTruthRobots;

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
                || metadataT('menu.viewOfferingFrom', {
                    offering: projectTitle,
                    businessName: resolvedStoreName,
                });
        }

        const contextCanonicalWithoutLanguage = projectCanonicalUrl && contextSegments.length
            ? (contextSegments[0] === 'item' && contextSegments[1]
                ? buildCanonicalItemUrl(projectCanonicalUrl, contextSegments[1])
                : `${projectCanonicalUrl}/${contextSegments.join('/')}`)
            : projectCanonicalUrl;
        const contextCanonicalUrl = contextCanonicalWithoutLanguage && requestedLanguage
            ? appendPublicLanguageParam(contextCanonicalWithoutLanguage, metadataLanguage)
            : contextCanonicalWithoutLanguage;

        const contextMetadata = buildContextMetadata({
            storeName: resolvedStoreName,
            storeDescription: description,
            defaultImageUrl: resolvedImageUrl,
            currentUrl,
            canonicalUrl: contextCanonicalUrl,
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
                    url: contextMetadata.openGraph?.url || currentUrl,
                    images: contextMetadata.openGraph?.images,
                },
                twitter: {
                    card: "summary_large_image",
                    title,
                    description,
                    images: contextMetadata.twitter?.images,
                },
                robots: resolvedPublicTruthRobots,
                ...(appleTouchIconUrl
                    ? {
                        appleWebApp: {
                            capable: true,
                            startupImage: getStaticCustomerAppleStartupImages(),
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

        if (contextSegments.length >= 2) {
            title = `Menu detail not available | ${resolvedStoreName}`;
            description = `This menu detail link is no longer available. Use ${resolvedStoreName}'s current menu page for the latest information.`;
            resolvedPublicTruthRobots = buildPublicTruthRobots({
                index: false,
                follow: true,
            });
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
        robots: resolvedPublicTruthRobots,
        // Per-tenant PWA metadata — overrides defaults from client/layout.tsx
        ...(appleTouchIconUrl
            ? {
                appleWebApp: {
                    capable: true,
                    startupImage: getStaticCustomerAppleStartupImages(),
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
        width: 'device-width',
        initialScale: 1,
        viewportFit: 'cover',
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
    const categories = dedupeCategoriesById(
        projectData?.files?.flatMap(
            (file: any) => file?.extractedData?.data?.categories || [],
        ).filter((category: any) => category?.active !== false) || [],
    );
    const items =
        projectData?.files?.flatMap(
            (file: any) => file?.extractedData?.data?.items || [],
        ).filter((item: any) => item?.active !== false) || [];

    const address = buildAddress(storeData);
    const geo = buildGeoCoordinates(storeData);
    const openingHours = buildOpeningHours(storeData);
    const sameAs = buildSameAs(storeData);
    const telephone = buildSchemaTelephone({
        countryCode: storeData?.countryCode,
        dialCode: storeData?.dialCode,
        phoneNumber: storeData?.phoneNumber,
        phone: storeData?.phone,
    });
    const priceRange = buildSchemaPriceRange(storeData?.priceRange);
    const tempStatusHours = buildTempStatusSchema(storeData?.tempStatus, storeData?.timeZone);
    const effectiveBusinessType = resolvePublicBusinessType(
        storeData?.businessType,
        storeData?.businessIndustry,
    );
    const schemaType = getMenuSchemaType(effectiveBusinessType, storeData?.businessCategory);
    const publicDescription = getPublicBusinessDescription(storeData, contentLanguage);
    const showItemPrices = projectData?.config?.design?.menu?.showItemPrices ?? true;
    const showImages = projectData?.config?.design?.menu?.showImages ?? true;
    const freshness = getPublicMenuFreshness(projectData, storeData);
    const catalogSchema = buildPublicCatalogStructuredData({
        businessCategory: storeData?.businessCategory,
        businessType: effectiveBusinessType,
        canonicalUrl,
        categories,
        contentLanguage,
        currencyCode: storeData?.currencyCode || 'USD',
        freshness,
        items,
        projectData,
        showImages,
        showItemPrices,
    });

    return {
        "@context": "https://schema.org",
        "@type": schemaType,
        "@id": canonicalUrl,
        name: storeName,
        mainEntityOfPage: {
            "@type": "WebPage",
            "@id": canonicalUrl,
        },
        inLanguage: contentLanguage,
        ...(publicDescription && { description: publicDescription }),
        ...(storeData?.logo && { image: storeData.logo }),
        url: canonicalUrl,
        ...(telephone && { telephone }),
        ...(storeData?.email && { email: storeData.email }),
        ...(storeData?.currencyCode && {
            currenciesAccepted: storeData.currencyCode,
        }),
        ...(priceRange && { priceRange }),
        ...(address && { address }),
        ...(geo && { geo }),
        ...(openingHours && { openingHoursSpecification: openingHours }),
        ...(tempStatusHours && { specialOpeningHoursSpecification: tempStatusHours }),
        ...(sameAs && { sameAs }),
        ...(freshness.dateModified && { dateModified: freshness.dateModified }),
        ...(storeData?.cuisineTypes?.length && { servesCuisine: storeData.cuisineTypes }),
        ...catalogSchema,
        publisher: {
            "@type": "Organization",
            name: "MenuList",
            url: "https://www.menulist.ai",
        },
    };
}

function dedupeCategoriesById(categories: any[]): any[] {
    const seenIds = new Set<string>();
    const deduped: any[] = [];

    for (const category of categories) {
        const id = category?.id ? String(category.id) : '';
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);
        deduped.push(category);
    }

    return deduped;
}

function buildPublicCatalogStructuredData({
    businessCategory,
    businessType,
    canonicalUrl,
    categories,
    contentLanguage,
    currencyCode,
    freshness,
    items,
    projectData,
    showImages,
    showItemPrices,
}: {
    businessCategory?: string;
    businessType?: string;
    canonicalUrl: string;
    categories: any[];
    contentLanguage: string;
    currencyCode: string;
    freshness: ReturnType<typeof getPublicMenuFreshness>;
    items: any[];
    projectData: any;
    showImages: boolean;
    showItemPrices: boolean;
}): Record<string, any> {
    const isFoodCatalog = isFoodBusinessCategory(businessType, businessCategory);
    const t = createPublicCustomerTranslator(contentLanguage);
    const catalogAdditionalProperty = freshness.menuVersion
        ? [{
            "@type": "PropertyValue",
            name: "menuVersion",
            value: freshness.menuVersion,
        }]
        : undefined;

    const sections = categories.slice(0, 10).map((category: any) => {
        const sectionItems = items
            .filter((item: any) => item.category === category.id)
            .slice(0, 20)
            .map((item: any) => buildCatalogItemStructuredData({
                businessCategory,
                businessType,
                canonicalUrl,
                contentLanguage,
                currencyCode,
                isFoodCatalog,
                item,
                showImages,
                showItemPrices,
            }));

        if (isFoodCatalog) {
            return {
                "@type": "MenuSection",
                identifier: category.id,
                name: getLocalizedValue(category.name, contentLanguage) || t('menu.menuSection'),
                hasMenuItem: sectionItems,
            };
        }

        return {
            "@type": "OfferCatalog",
            identifier: category.id,
            name: getLocalizedValue(category.name, contentLanguage) || t('menu.offerCategory'),
            itemListElement: sectionItems,
        };
    });

    if (isFoodCatalog) {
        return {
            menu: canonicalUrl,
            hasMenu: {
                "@type": "Menu",
                "@id": `${canonicalUrl}#menu`,
                identifier: projectData?.projectId || canonicalUrl,
                name: getLocalizedValue(projectData?.metadata?.name, contentLanguage) || t('menu.menuOffering'),
                url: canonicalUrl,
                inLanguage: contentLanguage,
                ...(freshness.dateModified && { dateModified: freshness.dateModified }),
                ...(catalogAdditionalProperty && { additionalProperty: catalogAdditionalProperty }),
                hasMenuSection: sections,
            },
        };
    }

    return {
        hasOfferCatalog: {
            "@type": "OfferCatalog",
            "@id": `${canonicalUrl}#offer-catalog`,
            identifier: projectData?.projectId || canonicalUrl,
            name: getLocalizedValue(projectData?.metadata?.name, contentLanguage) || t('menu.offeringsOffering'),
            url: canonicalUrl,
            inLanguage: contentLanguage,
            ...(freshness.dateModified && { dateModified: freshness.dateModified }),
            ...(catalogAdditionalProperty && { additionalProperty: catalogAdditionalProperty }),
            itemListElement: sections,
        },
    };
}

function buildCatalogItemStructuredData({
    businessCategory,
    businessType,
    canonicalUrl,
    contentLanguage,
    currencyCode,
    isFoodCatalog,
    item,
    showImages,
    showItemPrices,
}: {
    businessCategory?: string;
    businessType?: string;
    canonicalUrl: string;
    contentLanguage: string;
    currencyCode: string;
    isFoodCatalog: boolean;
    item: any;
    showImages: boolean;
    showItemPrices: boolean;
}) {
    const t = createPublicCustomerTranslator(contentLanguage);
    const dietaryTags = getDecisionFactArray(item, "dietaryTags");
    const nutritionInfo = getNutritionFact(item);
    const itemName = getLocalizedValue(item.name, contentLanguage) || (
        isFoodCatalog ? t('menu.menuItem') : t('menu.offeringItem')
    );
    const itemId = item.id ? String(item.id) : '';
    const itemUrl = itemId ? buildCanonicalItemUrl(canonicalUrl, itemId) : undefined;
    const itemImage = showImages ? getPrimaryPublicMenuImage(item) : undefined;
    const schemaPrice = showItemPrices && item.price !== undefined && item.price !== null
        ? String(item.price).replace(/[^0-9.]/g, "")
        : "";
    const itemProperties = buildCatalogItemAdditionalProperties(item);
    const description = getLocalizedValue(item.description, contentLanguage) || "";

    if (isFoodCatalog) {
        const diets = buildDietSchemaValues(item, dietaryTags);

        return {
            "@type": "MenuItem",
            ...(itemId && { identifier: itemId }),
            name: itemName,
            ...(itemUrl && { url: itemUrl }),
            ...(itemImage && { image: itemImage }),
            description,
            ...(schemaPrice && {
                offers: {
                    "@type": "Offer",
                    price: schemaPrice,
                    priceCurrency: currencyCode,
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
    }

    return {
        "@type": "Offer",
        ...(schemaPrice && {
            price: schemaPrice,
            priceCurrency: currencyCode,
        }),
        availability: item.available === false
            ? "https://schema.org/OutOfStock"
            : "https://schema.org/InStock",
        itemOffered: {
            "@type": getOfferingItemSchemaType(businessType, businessCategory),
            ...(itemId && { identifier: itemId }),
            name: itemName,
            ...(itemUrl && { url: itemUrl }),
            ...(itemImage && { image: itemImage }),
            ...(description && { description }),
            // Owner-provided SMB metadata. AI generation is blocked from creating these fields.
            ...(itemProperties.length > 0 && { additionalProperty: itemProperties }),
        },
    };
}

function buildCatalogItemAdditionalProperties(item: any) {
    const duration = getDecisionFactNumber(item, "duration");
    const materials = getDecisionFactString(item, "materials");
    const warranty = getDecisionFactString(item, "warranty");
    const targetAudience = getDecisionFactString(item, "targetAudience");
    const skillLevel = getDecisionFactString(item, "skillLevel");
    const allergens = getDecisionFactArray(item, "allergens");
    const spiceLevel = getDecisionFactString(item, "spiceLevel");

    return [
        ...(duration ? [{ "@type": "PropertyValue", name: "duration", value: `${duration} minutes` }] : []),
        ...(materials ? [{ "@type": "PropertyValue", name: "material", value: materials }] : []),
        ...(warranty ? [{ "@type": "PropertyValue", name: "warranty", value: warranty }] : []),
        ...(targetAudience ? [{ "@type": "PropertyValue", name: "audience", value: targetAudience }] : []),
        ...(skillLevel ? [{ "@type": "PropertyValue", name: "skillLevel", value: skillLevel }] : []),
        ...(allergens.length ? [{ "@type": "PropertyValue", name: "allergens", value: allergens.join(", ") }] : []),
        ...(spiceLevel ? [{ "@type": "PropertyValue", name: "spiceLevel", value: spiceLevel }] : []),
    ].filter(Boolean);
}

function buildDietSchemaValues(item: any, dietaryTags: string[]) {
    const diets: string[] = [];
    if (item.tags?.includes("Vegetarian") || dietaryTags.includes("vegetarian")) diets.push("https://schema.org/VegetarianDiet");
    if (dietaryTags.includes("vegan")) diets.push("https://schema.org/VeganDiet");
    if (dietaryTags.includes("gluten-free")) diets.push("https://schema.org/GlutenFreeDiet");
    if (dietaryTags.includes("halal")) diets.push("https://schema.org/HalalDiet");
    if (dietaryTags.includes("kosher")) diets.push("https://schema.org/KosherDiet");
    return diets;
}

// #30: Public language payload guard
// The public menu can switch language client-side after arriving from OBP.
// Keep all item descriptions in the SSR payload so the visible menu remains
// consistent when the customer changes language without a server navigation.
function optimizeLanguagePayload(projectData: any, _requestedLanguage?: string | null): any {
    return projectData;
}

interface PageProps {
    params: { slug?: string[] };
    searchParams?: { lang?: string | string[]; item?: string | string[] };
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
    const t = createPublicCustomerTranslator(renderLanguage);
    const resolvedCanonicalUrl = canonicalUrl || currentUrl;
    const { categories, items } = flattenProjectMenu(projectData);
    const [contextType, contextValue] = contextSegments;

    if (contextType === 'item') {
        const item = findItemByUrlSegment(items, contextValue, renderLanguage);
        if (!item) return null;

        const itemName = getLocalizedValue(item.name, renderLanguage) || t('menu.menuItem');
        const itemDescription = getLocalizedValue(item.description, renderLanguage);
        const category = categories.find((entry: any) => entry?.id === item.category);
        const categoryName = getLocalizedValue(category?.name, renderLanguage);
        const imageUrl = getPrimaryPublicMenuImage(item) || defaultImageUrl;

        return {
            title: `${itemName} | ${storeName}`,
            description: itemDescription || (categoryName
                ? t('menu.itemInCategoryAt', {
                    itemName,
                    categoryName,
                    businessName: storeName,
                })
                : t('menu.itemAt', {
                    itemName,
                    businessName: storeName,
                })),
            alternates: {
                canonical: resolvedCanonicalUrl,
            },
            openGraph: {
                title: `${itemName} | ${storeName}`,
                description: itemDescription || (categoryName
                    ? t('menu.itemInCategoryAt', {
                        itemName,
                        categoryName,
                        businessName: storeName,
                    })
                    : t('menu.itemAt', {
                        itemName,
                        businessName: storeName,
                    })),
                url: resolvedCanonicalUrl,
                images: imageUrl ? [{ url: imageUrl }] : undefined,
            },
            twitter: {
                title: `${itemName} | ${storeName}`,
                description: itemDescription || (categoryName
                    ? t('menu.itemInCategoryAt', {
                        itemName,
                        categoryName,
                        businessName: storeName,
                    })
                    : t('menu.itemAt', {
                        itemName,
                        businessName: storeName,
                    })),
                images: imageUrl ? [imageUrl] : undefined,
            },
        };
    }

    if (contextType === 'category') {
        const category = findCategoryByUrlSegment(categories, contextValue, renderLanguage);
        if (!category) return null;

        const categoryName = getLocalizedValue(category.name, renderLanguage) || t('menu.category');
        const categoryItems = items.filter((item: any) => item?.category === category.id && item?.active !== false);
        const categoryDescription = t('menu.categoryFromBusiness', {
            categoryName,
            businessName: storeName,
            count: categoryItems.length,
            items: categoryItems.length === 1 ? t('menu.itemSingular') : t('menu.itemsPlural'),
        });

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

    const requestedPublicPath = slugSegments.length > 0
        ? `/${slugSegments.join('/')}`
        : '';

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
        const canonical = `https://${storeData.subdomain}.${PLATFORM_DOMAIN}${requestedPublicPath}`;
        redirect(appendPublicLanguageParam(canonical, requestedLanguage));
    }

    // URL Routing Architecture — Phase 2: Subdomain → custom domain 301 redirect
    // When store has a verified custom domain and visitor arrives via subdomain,
    // redirect to custom domain to consolidate SEO authority on the canonical URL
    if (tenantType === "subdomain" && storeData.customDomain && storeData.domainVerified) {
        const customUrl = `https://${storeData.customDomain}${requestedPublicPath}`;
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
    const requestedOutletSlug = normalizePublicOutletSlug(slug);
    if (requestedOutletSlug && storeData.isMaster && FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        const outletStore = await withRetry(() =>
            withTimeout(getStoreByOutletSlug(storeData.tenantId, requestedOutletSlug))
        ).catch((error) => {
            logPublicMenuResolutionFailure('outlet_lookup_failed', {
                tenantId: storeData.tenantId,
                storeId: storeData.storeId,
                slug,
                error,
            });
            return null;
        });

        if (outletStore) {
            // G-07 (§11 + §7 PUBLIC-ROUTING-DOCTRINE): outlet slug rename
            // chain. If the outlet was found via `previousOutletSlugs`
            // (i.e., its CURRENT outletSlug differs from what the customer
            // typed), 301 to the canonical outlet URL so physical QRs and
            // printed signage keep working across renames while SEO
            // consolidates on the canonical URL.
            const canonicalOutletSlug = normalizePublicOutletSlug(outletStore.outletSlug);
            if (canonicalOutletSlug && canonicalOutletSlug !== requestedOutletSlug) {
                const tail = slugSegments.slice(1).join('/');
                const canonicalPath = tail
                    ? `/${canonicalOutletSlug}/${tail}`
                    : `/${canonicalOutletSlug}`;
                redirect(appendPublicLanguageParam(canonicalPath, requestedLanguage));
            }

            storeData = outletStore;
            resolvedOutletSlug = canonicalOutletSlug || requestedOutletSlug;
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

    if (isStarterPublicSurfaceExpired(storeData)) {
        return (
            <StarterActivationHoldingPage
                activePlanType={storeData?.activePlanType || null}
                activeLanguage={contentLanguage}
                storeName={getStoreContextName(storeData, '') || masterBrandName || null}
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

    // Get project — cached + retry + timeout
    // Uses resolvedSlug (may differ from slug if outlet routing detected)
    const baseResult = await withRetry(() => withTimeout(getCachedProject(
        storeData.tenantId,
        storeData.storeId,
        resolvedSlug,
    )));

    if (!baseResult) {
        const safeStoreOutletSlug = normalizePublicOutletSlug(storeData.outletSlug);
        // T1-N-03 / A-12 PUBLIC-ROUTING-DOCTRINE: instead of a terminal 404,
        // degrade up the fallback ladder. The client component detects
        // standalone PWA mode and auto-redirects after a visible 2s hint,
        // while browser tabs show explicit navigation links. masterStoreName
        // is captured pre-outlet-switch (see G-09) so the brand link reads
        // correctly for multi-outlet tenants.
        return (
            <MenuNotFoundFallback
                activeLanguage={contentLanguage}
                requestedSlug={resolvedSlug || slug || ''}
                outletSlug={storeData.isMaster === false ? safeStoreOutletSlug : null}
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
    const projectId = String(projectMetadata.projectId || projectMetadata.id || '');

    // URL Routing Architecture — ADR-3: 301 redirect from old slug to current slug
    // Preserves QR codes and shared links when project is renamed
    const safeRedirectSlug = normalizePublicProjectSlug(redirectSlug);
    const requestedProjectSlug = normalizePublicProjectSlug(resolvedSlug);
    if (safeRedirectSlug && requestedProjectSlug && safeRedirectSlug !== requestedProjectSlug) {
        const baseUrl = tenantType === "custom" && customDomain
            ? `https://${customDomain}`
            : origin || `https://${subdomain}.${PLATFORM_DOMAIN}`;
        const outletPrefix = resolvedOutletSlug ? `/${resolvedOutletSlug}` : '';
        redirect(appendPublicLanguageParam(`${baseUrl}${outletPrefix}/${safeRedirectSlug}`, requestedLanguage));
    }

    // Strip internal metadata before any customer-facing usage (TASK 7)
    const embeddedDecisionBlocks = projectPublicDecisionBlocks(rawProjectData?.publicDecisionBlocks, {
        tId: String(storeData.tenantId),
        sId: String(storeData.storeId),
        projectId,
    });
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

    // Public menu language switching happens client-side after OBP/menu entry.
    // Keep the resolved initial language for metadata/schema, but do not strip
    // descriptions from other owner-enabled menu languages.
    const initialProjectLanguage = resolveProjectPublicLanguage(searchReadyProjectData, storeDetails, requestedLanguage);
    const projectData = optimizeLanguagePayload(searchReadyProjectData, initialProjectLanguage);
    const clientStoreDetails = serializeClientValue(projectPublicClientStore({
        ...storeDetails,
        ...(effectiveBusinessType && { businessType: effectiveBusinessType }),
    }));
    if (!clientStoreDetails) {
        notFound();
    }

    // Precomputed Decision Blocks are embedded in the already-loaded project read.
    const precomputedBlocks = serializeClientValue(embeddedDecisionBlocks);

    // Build canonical URL based on tenant type and slug
    const baseUrl =
        tenantType === "custom" && customDomain
            ? `https://${customDomain}`
            : origin || `https://${subdomain}.${PLATFORM_DOMAIN}`;

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
    const realDefaultSlug =
        normalizePublicProjectSlug(projectMetadata?.slug)
        || (canonicalProjectName ? normalizePublicProjectSlug(slugify(canonicalProjectName)) : null);
    const outletPrefix = resolvedOutletSlug ? `/${resolvedOutletSlug}` : '';
    const canonicalProjectSlug =
        normalizePublicProjectSlug(projectMetadata?.slug)
        || (canonicalProjectName ? normalizePublicProjectSlug(slugify(canonicalProjectName)) : null);
    const canonicalUrl = isMenuAliasFallback && realDefaultSlug
        ? `${baseUrl}${outletPrefix}/${realDefaultSlug}`
        : (projectMetadata?.isDefault && !resolvedSlug && !outletPrefix
            ? baseUrl
            : canonicalProjectSlug
            ? `${baseUrl}${outletPrefix}/${canonicalProjectSlug}`
            : baseUrl);

    const projectLanguage = resolveProjectPublicLanguage(projectData, storeDetails, initialProjectLanguage);
    const publicCustomerT = createPublicCustomerTranslator(projectLanguage);
    const schemaOrgJsonLd = generateSchemaOrgJsonLd(
        projectData,
        storeDetails,
        canonicalUrl,
        projectLanguage,
    );

    // BreadcrumbList for search engine navigation: Business → Menu
    const storeName = getStoreContextName(storeDetails, publicCustomerT('common.business'));
    const menuName = getLocalizedText(
        projectMetadata?.name,
        projectLanguage,
        getPrimaryLocalizedLanguage(projectMetadata?.name, projectLanguage),
        publicCustomerT('menu.menuOffering'),
    );
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
                    : publicCustomerT('menu.metadataMenuDescription', {
                        businessName: storeName,
                    }),
            baseUrl,
            themeColor: storeDetails?.publicPresence?.accentColor,
        })
        : null;
    const safeStoreOutletSlug = normalizePublicOutletSlug(storeData.outletSlug);

    return (
        <>
            {/* Schema.org JSON-LD for SEO */}
            <JsonLdScript id="client-menu-schema-jsonld" data={schemaOrgJsonLd} />
            {/* BreadcrumbList JSON-LD for search navigation */}
            <JsonLdScript id="client-menu-breadcrumb-jsonld" data={breadcrumbJsonLd} />
            {/* Customer App (PWA) — signals installability to search engines */}
            {pwaSchemaJsonLd ? (
                <JsonLdScript id="client-menu-pwa-jsonld" data={pwaSchemaJsonLd} />
            ) : null}
            {/*
              * G-09 (§11 + D-12 PUBLIC-ROUTING-DOCTRINE): visible breadcrumb.
              * Business → (Store →) Project. Outlet node appears only when
              * this render is scoped to an outlet store (not the master)
              * AND we have a real outletSlug to link to.
              */}
            <MenuBreadcrumb
                ariaLabel={publicCustomerT('menu.businessInformation')}
                businessName={masterBrandName || storeName}
                outletName={
                    !storeData.isMaster && safeStoreOutletSlug
                        ? (getStoreName(storeData, '') || undefined)
                        : undefined
                }
                outletSlug={
                    !storeData.isMaster && safeStoreOutletSlug
                        ? safeStoreOutletSlug
                        : undefined
                }
                projectName={menuName}
                homeHref={appendPublicLanguageParam('/', requestedLanguage)}
                outletHref={
                    !storeData.isMaster && safeStoreOutletSlug
                        ? appendPublicLanguageParam(`/${safeStoreOutletSlug}`, requestedLanguage)
                        : undefined
                }
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
        return (
            <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#fafafa' }} />}>
                <CompliancePageContent
                    type={slug as 'privacy' | 'terms' | 'refund'}
                    backHref={appendPublicLanguageParam('/', requestedLanguage)}
                    requestedLanguage={requestedLanguage}
                />
            </Suspense>
        );
    }

    // OBP: When enabled and no slug → show Official Business Page
    if (FEATURE_FLAGS.ENABLE_OBP && !slug) {
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
