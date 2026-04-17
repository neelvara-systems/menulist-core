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
import TrustSignals from "@atoms/TrustSignals";
import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { isReservedProjectSlug } from "@constant/reservedSlugs";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { sanitizeForClient } from "@lib/mce/utils";
import { resolveProjectForRender } from "@lib/multiOutlet";
import { buildAddress, buildBreadcrumbList, buildGeoCoordinates, buildOpeningHours, buildSameAs, getMenuSchemaType } from "@lib/schema";
import { slugify } from "@lib/utils/slugify";
import ClientMenuRenderer from "@template/website/clientWebsite";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    query,
    where,
} from "firebase/firestore";
import { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache, Suspense } from "react";

// Get tenant info from headers (set by middleware)
async function getTenantFromHeaders() {
    const headersList = headers();
    const subdomain = headersList.get("x-tenant-subdomain");
    const customDomain = headersList.get("x-tenant-custom-domain");
    const tenantType = headersList.get("x-tenant-type");
    const requestHost =
        headersList.get("x-forwarded-host") ||
        headersList.get("host");
    const host = requestHost ? requestHost.split(':')[0].toLowerCase() : null;

    return { subdomain, customDomain, tenantType, host };
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

// Lookup store by subdomain
// React cache() = within-request dedup (TASK 2), unstable_cache = cross-request Vercel Data Cache (TASK 6)
const getStoreBySubdomain = cache(
    unstable_cache(
        async (subdomain: string) => {
            const storesRef = collection(firebaseClient, DB_COLLECTIONS.STORES);
            const q = query(
                storesRef,
                where("subdomain", "==", subdomain.toLowerCase()),
                where("active", "==", true),
                limit(1),
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;
            return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        },
        ['client-store-subdomain'],
        { revalidate: 60, tags: ['client-stores'] }
    )
);

// Lookup store by custom domain
// React cache() = within-request dedup (TASK 2), unstable_cache = cross-request Vercel Data Cache (TASK 6)
const getStoreByCustomDomain = cache(
    unstable_cache(
        async (domain: string) => {
            const storesRef = collection(firebaseClient, DB_COLLECTIONS.STORES);
            const q = query(
                storesRef,
                where("customDomain", "==", domain.toLowerCase()),
                where("domainVerified", "==", true),
                where("active", "==", true),
                limit(1),
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;
            return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        },
        ['client-store-custom-domain'],
        { revalidate: 60, tags: ['client-stores'] }
    )
);

// Lookup outlet store by outletSlug within a tenant (URL Routing Architecture — Gap 2)
// Used when first path segment matches an outlet slug instead of a project slug
const getStoreByOutletSlug = cache(
    unstable_cache(
        async (tenantId: number, outletSlug: string) => {
            const storesRef = collection(firebaseClient, DB_COLLECTIONS.STORES);
            const q = query(
                storesRef,
                where("tenantId", "==", tenantId),
                where("outletSlug", "==", outletSlug.toLowerCase()),
                where("active", "==", true),
                limit(1),
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;
            return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        },
        ['client-store-outlet-slug'],
        { revalidate: 60, tags: ['client-stores'] }
    )
);

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
        const docRef = doc(firebaseClient, DB_COLLECTIONS.DECISION_BLOCKS, docId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return null;
        return docSnap.data();
    } catch (error) {
        // Fail silently - Decision Blocks are optional enhancement
        console.warn("Failed to fetch precomputed Decision Blocks:", error);
        return null;
    }
}

// Get all projects for a store and find by slug or default
async function getProjectBySlugOrDefault(
    tenantId: number,
    storeId: number,
    slug?: string,
): Promise<{ projectData: any; projectMetadata: any; redirectSlug: string | null } | null> {
    // Read projectsSummary (1 read) — contains slug, previousSlugs, name, isDefault
    // This is the primary source for URL routing data (URL Routing Architecture — ADR-3)
    const summaryDocRef = doc(
        firebaseClient,
        DB_COLLECTIONS.PLATFORM_SUMMARY || "platformSummary",
        `projects_${storeId}`,
    );
    const summarySnap = await getDoc(summaryDocRef);
    const summaryProjects = summarySnap.exists() ? summarySnap.data()?.projects || {} : {};

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

    if (Object.keys(summaryProjects).length > 0) {
        // Use projectsSummary — has slug data + is 1 read instead of N
        // Filter out special menu projects — they are resolved separately via resolveSpecialMenuOverride
        projects = Object.entries(summaryProjects)
            .filter(([, data]: [string, any]) => data.active !== false && !data.isSpecialMenu)
            .map(([projectId, data]: [string, any]) => ({
                id: projectId,
                projectId,
                name: data.name,
                isDefault: data.isDefault,
                slug: data.slug,
                previousSlugs: data.previousSlugs,
                ...data,
            }));
    } else {
        // Fallback: read from project data collection (legacy — no slug data)
        const metadataRef = collection(
            firebaseClient,
            `${DB_COLLECTIONS.PROJECTS}/${tenantId}/${storeId}/metadata`,
        );
        const q = query(
            metadataRef,
            where("deleted", "==", false),
            where("active", "==", true),
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;

        projects = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        })) as typeof projects;
    }

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

    if (!targetProject) {
        // No slug or no match - find default project
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

    return { projectData, projectMetadata: targetProject, redirectSlug };
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
    baseResult: { projectData: any; projectMetadata: any; redirectSlug: string | null },
): Promise<{ projectData: any; projectMetadata: any; redirectSlug: string | null }> {
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
            // Full replacement — return special menu as the project
            return {
                projectData: specialProjectData,
                projectMetadata: {
                    ...baseResult.projectMetadata,
                    name: specialProjectData._specialMenu.displayName,
                    isSpecialMenu: true,
                },
                redirectSlug: baseResult.redirectSlug,
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

// Generate metadata for SEO
export async function generateMetadata(): Promise<Metadata> {
    const { subdomain, customDomain, tenantType, host } = await getTenantFromHeaders();

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

    const storeName = storeData.name || "Restaurant Menu";

    // AEO-optimized title: when OBP is enabled, emit entity-rich title for AI extraction
    // "Joe's Pizza — Menu, Hours, Contact" helps AI answer "What time does Joe's Pizza close?"
    const title = storeData.metaTitle || (
        FEATURE_FLAGS.ENABLE_OBP
            ? `${storeName} — Menu, Hours, Contact`
            : `${storeName} | Menu`
    );
    const description =
        storeData.metaDescription ||
        storeData.tagline ||
        (FEATURE_FLAGS.ENABLE_OBP
            ? `${storeName} — View menu, check hours, get directions, and contact details. Official business page.`
            : `View the digital menu for ${storeName}`
        );
    const imageUrl = storeData.logo || "/images/default-menu-preview.png";

    // Build canonical URL based on domain type
    const canonicalBase = customDomain
        ? `https://${customDomain}`
        : host
            ? `https://${host}`
            : `https://${subdomain}.menulist.ai`;

    return {
        title,
        description,
        keywords: storeData.keywords?.join(", "),
        alternates: {
            canonical: storeData.canonicalUrl || canonicalBase,
        },
        openGraph: {
            title,
            description,
            type: "website",
            siteName: storeName,
            url: canonicalBase,
            images: imageUrl ? [{ url: imageUrl }] : undefined,
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: imageUrl ? [imageUrl] : undefined,
        },
        robots: {
            index: true,
            follow: true,
        },
    };
}

// Generate Schema.org JSON-LD — uses shared utilities from @lib/schema
// @see __docs__/discovery-infrastructure/
function generateSchemaOrgJsonLd(
    projectData: any,
    storeData: any,
    canonicalUrl: string,
) {
    const storeName =
        storeData?.name || projectData?.metadata?.name || "Restaurant";
    const categories =
        projectData?.files?.flatMap(
            (file: any) => file?.extractedData?.data?.categories || [],
        ) || [];
    const items =
        projectData?.files?.flatMap(
            (file: any) => file?.extractedData?.data?.items || [],
        ) || [];

    const address = buildAddress(storeData);
    const geo = buildGeoCoordinates(storeData);
    const openingHours = buildOpeningHours(storeData);
    const sameAs = buildSameAs(storeData);
    const schemaType = getMenuSchemaType(storeData?.businessType);

    return {
        "@context": "https://schema.org",
        "@type": schemaType,
        name: storeName,
        ...(storeData?.description && { description: storeData.description }),
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
        ...(storeData?.modifiedOn && {
            dateModified: typeof storeData.modifiedOn === 'string'
                ? storeData.modifiedOn
                : storeData.modifiedOn?.toDate?.()?.toISOString?.() || undefined,
        }),
        ...(storeData?.cuisineTypes?.length && { servesCuisine: storeData.cuisineTypes }),
        menu: canonicalUrl,
        hasMenu: {
            "@type": "Menu",
            hasMenuSection: categories.slice(0, 10).map((category: any) => ({
                "@type": "MenuSection",
                name: category.name?.en || category.name?.default || "Menu Section",
                hasMenuItem: items
                    .filter((item: any) => item.category === category.id)
                    .slice(0, 20)
                    .map((item: any) => {
                        // #32: Build suitableForDiet from tags + dietaryTags
                        const diets: string[] = [];
                        if (item.tags?.includes("Vegetarian") || item.dietaryTags?.includes("vegetarian")) diets.push("https://schema.org/VegetarianDiet");
                        if (item.dietaryTags?.includes("vegan")) diets.push("https://schema.org/VeganDiet");
                        if (item.dietaryTags?.includes("gluten-free")) diets.push("https://schema.org/GlutenFreeDiet");
                        if (item.dietaryTags?.includes("halal")) diets.push("https://schema.org/HalalDiet");
                        if (item.dietaryTags?.includes("kosher")) diets.push("https://schema.org/KosherDiet");

                        return {
                            "@type": "MenuItem",
                            name: item.name?.en || item.name?.default || "Menu Item",
                            description:
                                item.description?.en || item.description?.default || "",
                            ...(item.price && {
                                offers: {
                                    "@type": "Offer",
                                    price: item.price.replace(/[^0-9.]/g, ""),
                                    priceCurrency: storeData?.currencyCode || "USD",
                                    availability: item.available === false
                                        ? "https://schema.org/OutOfStock"
                                        : "https://schema.org/InStock",
                                },
                            }),
                            ...(diets.length > 0 && {
                                suitableForDiet: diets.length === 1 ? diets[0] : diets,
                            }),
                            ...(item.nutritionInfo?.calories && {
                                nutrition: {
                                    "@type": "NutritionInformation",
                                    ...(item.nutritionInfo.calories && { calories: `${item.nutritionInfo.calories} calories` }),
                                    ...(item.nutritionInfo.protein && { proteinContent: `${item.nutritionInfo.protein} g` }),
                                    ...(item.nutritionInfo.carbs && { carbohydrateContent: `${item.nutritionInfo.carbs} g` }),
                                    ...(item.nutritionInfo.fat && { fatContent: `${item.nutritionInfo.fat} g` }),
                                    ...(item.nutritionInfo.servingSize && { servingSize: item.nutritionInfo.servingSize }),
                                },
                            }),
                            // SMB metadata: duration, materials, audience (schema.org additionalProperty)
                            ...((item.duration || item.materials || item.targetAudience || item.skillLevel) && {
                                additionalProperty: [
                                    ...(item.duration ? [{ "@type": "PropertyValue", name: "duration", value: `${item.duration} minutes` }] : []),
                                    ...(item.materials ? [{ "@type": "PropertyValue", name: "material", value: item.materials }] : []),
                                    ...(item.targetAudience ? [{ "@type": "PropertyValue", name: "audience", value: item.targetAudience }] : []),
                                    ...(item.skillLevel ? [{ "@type": "PropertyValue", name: "skillLevel", value: item.skillLevel }] : []),
                                ].filter(Boolean),
                            }),
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
function optimizeLanguagePayload(projectData: any): any {
    if (!projectData?.files?.length) return projectData;

    const languages = projectData.files[0]?.extractedData?.data?.languages || [];
    if (languages.length < 3) return projectData; // Not worth optimizing for 1-2 languages

    const primaryLang = languages.find((l: any) => l.isPrimary)?.code || languages[0]?.code || 'en';

    // Deep clone to avoid mutating cached data
    const optimized = JSON.parse(JSON.stringify(projectData));

    for (const file of optimized.files || []) {
        const items = file.extractedData?.data?.items || [];
        for (const item of items) {
            if (item.description && typeof item.description === 'object') {
                const primaryDesc = item.description[primaryLang];
                item.description = primaryDesc ? { [primaryLang]: primaryDesc } : {};
            }
        }
    }

    return optimized;
}

interface PageProps {
    params: { slug?: string[] };
}

// Branded loading skeleton — renders instantly while data streams (Customer Infra Hardening - TASK 5)
// Customer sees this instead of browser spinner during the 1-3s data fetch
function MenuSkeleton() {
    return (
        <div
            style={{
                minHeight: "100vh",
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
async function MenuContent({ slug, slugSegments = [] }: { slug?: string; slugSegments?: string[] }) {
    const { subdomain, customDomain, tenantType, host } = await getTenantFromHeaders();

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

    // URL Routing Architecture — Phase 2: Subdomain → custom domain 301 redirect
    // When store has a verified custom domain and visitor arrives via subdomain,
    // redirect to custom domain to consolidate SEO authority on the canonical URL
    if (tenantType === "subdomain" && storeData.customDomain && storeData.domainVerified) {
        const customUrl = `https://${storeData.customDomain}${slug ? `/${slug}` : ''}`;
        redirect(customUrl);
    }

    // URL Routing Architecture — Gap 2: Outlet routing via outletSlug
    // For multi-store brands: brand.menulist.ai/{outletSlug} or brand.menulist.ai/{outletSlug}/{projectSlug}
    // If the slug matches an outlet's outletSlug, switch storeData to that outlet
    // and use the remaining path segment as the project slug
    let resolvedSlug = slug;
    if (slug && storeData.isMaster && FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        const outletStore = await withRetry(() =>
            withTimeout(getStoreByOutletSlug(storeData.tenantId, slug))
        ).catch(() => null);

        if (outletStore) {
            // First slug was an outlet slug — switch to outlet store
            storeData = outletStore;
            // Use second slug segment as project slug (e.g., brand.menulist.ai/pune/food-menu)
            resolvedSlug = slugSegments.length > 1 ? slugSegments[1] : undefined;
        }
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
        return (
            <div style={{ padding: "40px", textAlign: "center" }}>
                <h1>Menu Not Found</h1>
                <p>
                    {resolvedSlug
                        ? `No menu found matching "${resolvedSlug}".`
                        : "This restaurant has not configured their menu yet."}
                </p>
            </div>
        );
    }

    // Special Menu Switching — resolve active special menu override
    // Zero extra reads when no special menu active (checks storeData.activeSpecialMenuId field)
    // When active: 1 read for special menu project (replace mode) or merge with base (overlay mode)
    const result = await resolveSpecialMenuOverride(storeData, baseResult);

    const { projectData: rawProjectData, projectMetadata, redirectSlug } = result;

    // URL Routing Architecture — ADR-3: 301 redirect from old slug to current slug
    // Preserves QR codes and shared links when project is renamed
    if (redirectSlug && slug && redirectSlug !== slug.toLowerCase()) {
        const baseUrl = tenantType === "custom" && customDomain
            ? `https://${customDomain}`
            : host
                ? `https://${host}`
                : `https://${subdomain}.menulist.ai`;
        redirect(`${baseUrl}/${redirectSlug}`);
    }

    // Strip internal metadata before any customer-facing usage (TASK 7)
    const sanitized = sanitizeForClient(rawProjectData);

    // #30: Lazy language loading — reduce SSR payload for multi-language menus (3+ languages)
    // Names kept in ALL languages (short strings, needed for instant language switching)
    // Descriptions stripped for non-primary languages (heavy text, gracefully omitted in UI if missing)
    const projectData = optimizeLanguagePayload(sanitized);

    // Fetch precomputed Decision Blocks (optional enhancement — cached)
    const projectId = projectMetadata.projectId || projectMetadata.id;
    const precomputedBlocks = await withTimeout(getCachedBlocks(
        storeData.tenantId,
        storeData.storeId,
        projectId,
    ));

    // Build canonical URL based on tenant type and slug
    const baseUrl =
        tenantType === "custom" && customDomain
            ? `https://${customDomain}`
            : host
                ? `https://${host}`
                : `https://${subdomain}.menulist.ai`;

    // Add slug to canonical if not default project
    const canonicalUrl =
        projectMetadata?.isDefault || !slug
            ? baseUrl
            : `${baseUrl}/${slugify(projectMetadata.name)}`;

    const schemaOrgJsonLd = generateSchemaOrgJsonLd(
        projectData,
        storeDetails,
        canonicalUrl,
    );

    // BreadcrumbList for search engine navigation: Business → Menu
    const storeName = storeDetails?.name || 'Business';
    const menuName = projectMetadata?.name || 'Menu';
    const breadcrumbJsonLd = buildBreadcrumbList(storeName, baseUrl, menuName);

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
            {/* ── Temporary Status Banner ── */}
            {FEATURE_FLAGS.ENABLE_TEMP_STATUS && storeDetails?.tempStatus && (
                <TempStatusBanner tempStatus={storeDetails.tempStatus} />
            )}
            {/* ── Menu Trust Signals — location · status · offering · freshness ── */}
            {FEATURE_FLAGS.ENABLE_MENU_TRUST_SIGNALS && (
                <TrustSignals
                    businessType={storeDetails?.businessType || ''}
                    lastPublishedAt={rawProjectData?.lastPublishedAt || null}
                    locationArea={storeDetails?.area || null}
                    city={storeDetails?.city || null}
                    workingHours={storeDetails?.workingHours}
                    timeZone={storeDetails?.timeZone}
                />
            )}
            <ClientMenuRenderer
                projectData={projectData}
                storeDetails={storeDetails}
                precomputedBlocks={precomputedBlocks}
                projectId={projectId}
            />
        </>
    );
}

// Page entry point — skeleton renders instantly, data streams when ready (Customer Infra Hardening - TASK 5)
// When ENABLE_OBP is true: root = OBP, "menu" slug = default project, other slugs = specific projects
export default function ClientMenuPage({ params }: PageProps) {
    const slug = params.slug?.[0];
    const allSlugs = params.slug || [];

    // Compliance pages: /privacy, /terms, /refund — static compliance artifacts
    // @see __docs__/compliance-pages/compliance-pages_impl.md
    if (FEATURE_FLAGS.ENABLE_COMPLIANCE_PAGES && (slug === 'privacy' || slug === 'terms' || slug === 'refund')) {
        const CompliancePageContent = require('../compliance/CompliancePageContent').default;
        return (
            <Suspense fallback={<div style={{ minHeight: '100vh', background: '#fafafa' }} />}>
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
                <OBPContent />
            </Suspense>
        );
    }

    // OBP: "menu" is a reserved slug — treat as default project (no slug)
    const menuSlug = (FEATURE_FLAGS.ENABLE_OBP && slug === 'menu') ? undefined : slug;

    return (
        <Suspense fallback={<MenuSkeleton />}>
            <MenuContent slug={menuSlug} slugSegments={allSlugs} />
        </Suspense>
    );
}
