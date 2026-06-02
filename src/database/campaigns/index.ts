import { DB_COLLECTIONS } from "@constant/database";
import { uploadPreparedMediaImage } from "@database/storage/uploadPreparedMediaImage";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, Timestamp, where } from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { getStoreContextName } from "@lib/businessIdentity/names";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { parseSummaryProjects } from "@lib/firestore/parseSummaryProjects";
import { isDataUrl } from "@lib/media/mediaStorage";
import { getDefaultProjectUrl } from "@lib/obp/generateOBPUrl";
import {
    dedupeScreenMenuItems,
    normalizeOwnerSlideCaption,
    normalizeScreenCategoryName,
    normalizeScreenImageUrl,
    normalizeScreenTags,
    parseScreenPrice,
    resolveScreenText,
} from "@lib/screen/screenContent";
import { generateScreenToken } from "@lib/screen/utils";
import {
    Campaign,
    CampaignExport,
    CampaignsSummaryDocument,
    CampaignStatus,
    CampaignType,
    DigitalScreenState,
    ExecutionSurface,
    PhysicalSurfaceEligibility,
    ScreenSlide,
    ScreenStoreInfo,
    StaffPrompt
} from "@type/campaigns";
import { UserUploadedFileType } from "@type/common";

const CAMPAIGNS_COLLECTION = DB_COLLECTIONS.CAMPAIGNS;
const EXPORTS_COLLECTION = DB_COLLECTIONS.CAMPAIGN_EXPORTS;
const PLATFORM_SUMMARY = DB_COLLECTIONS.PLATFORM_SUMMARY;

// ═══════════════════════════════════════════════════════════════
// DOCUMENT REFERENCES
// ═══════════════════════════════════════════════════════════════

const getCampaignsCollectionRef = (session: any) => {
    return collection(firebaseClient, `${CAMPAIGNS_COLLECTION}/${session.tId}/${session.sId}`);
};

const getCampaignDocRef = (session: any, campaignId: string) => {
    return doc(firebaseClient, `${CAMPAIGNS_COLLECTION}/${session.tId}/${session.sId}`, campaignId);
};

const getExportsCollectionRef = (session: any) => {
    return collection(firebaseClient, `${EXPORTS_COLLECTION}/${session.tId}/${session.sId}`);
};

/**
 * Get reference to campaignsSummary document for current store
 * Document path: platformSummary/campaigns_{sId}
 * This is the Summary Document Pattern for 1-read Today screen
 */
const getCampaignsSummaryDocRef = (session: any) => {
    return doc(firebaseClient, PLATFORM_SUMMARY, `campaigns_${session.sId}`);
};

// ═══════════════════════════════════════════════════════════════
// TODAY SCREEN (1 READ ONLY)
// ═══════════════════════════════════════════════════════════════

/**
 * Today screen data - includes campaigns, staff prompt, and physical surfaces
 */
export interface TodayScreenData {
    today: CampaignsSummaryDocument['today'];
    staffPrompt?: StaffPrompt;
    physicalSurfaces?: PhysicalSurfaceEligibility;
}

/**
 * Get today's campaigns summary (1 read)
 * This is what the Today screen uses
 * Now also returns staffPrompt for the Staff Prompt Mode feature
 */
export const getTodayCampaigns = async (): Promise<TodayScreenData | null> => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const docRef = getCampaignsSummaryDocRef(session);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                return null;
            }

            const data = docSnap.data() as CampaignsSummaryDocument;
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

            // Check if summary is for today
            if (data.today?.date !== today) {
                // Summary is stale, return empty
                return {
                    today: {
                        date: today,
                        primary: undefined,
                        operational: [],
                        isEmpty: true
                    },
                    staffPrompt: undefined
                };
            }

            return {
                today: data.today,
                staffPrompt: data.staffPrompt,
                physicalSurfaces: data.physicalSurfaces
            };
        },
        null,
        "getTodayCampaigns"
    );
};

// ═══════════════════════════════════════════════════════════════
// CAMPAIGN CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get a campaign by ID
 */
export const getCampaign = async (campaignId: string): Promise<Campaign | null> => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const docRef = getCampaignDocRef(session, campaignId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                return null;
            }

            return docSnap.data() as Campaign;
        },
        { campaignId },
        "getCampaign"
    );
};

// ═══════════════════════════════════════════════════════════════
// CAMPAIGN QUERIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get campaign history (for Past Activity screen)
 * Paginated, chronological, no metrics
 */
export const getCampaignHistory = async (
    limitCount: number = 20,
    projectId?: string | null,
): Promise<Campaign[]> => {
    return await apiCallComposer(
        async () => {
            try {
                const session = await getActiveSession();
                const collectionRef = getCampaignsCollectionRef(session);
                const q = projectId
                    ? query(
                        collectionRef,
                        where("projectId", "==", projectId),
                        orderBy("updatedAt", "desc"),
                        limit(limitCount)
                    )
                    : query(
                        collectionRef,
                        orderBy("updatedAt", "desc"),
                        limit(limitCount)
                    );

                const snapshot = await getDocs(q);
                return snapshot.docs
                    .map(doc => doc.data() as Campaign)
                    .filter(campaign => ["completed", "skipped", "suggested"].includes(campaign.status));
            } catch (error) {
                console.error("[getCampaignHistory] Failed to load campaign history:", error);
                return [];
            }
        },
        { limitCount, projectId: projectId || null },
        "getCampaignHistory"
    );
};

// ═══════════════════════════════════════════════════════════════
// CAMPAIGN ACTIONS (Today Screen)
// ═══════════════════════════════════════════════════════════════

/**
 * Complete a campaign (user acted on it)
 * Records export and updates status
 * 
 * OPTIMIZATION: Accepts projectId and campaignType as params to avoid refetching
 * campaign data we already have from useTodayCampaigns hook.
 */
export const completeCampaign = async (
    campaignId: string,
    projectId: string,
    campaignType: CampaignType,
    surface: ExecutionSurface,
    method: CampaignExport['method'],
    menuLinkWithTracking?: string
) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const now = Timestamp.now();
            const today = new Date().toISOString().split('T')[0];
            const campaignDocRef = getCampaignDocRef(session, campaignId);
            const campaignDocSnap = await getDoc(campaignDocRef);
            const campaignsSummaryRef = getCampaignsSummaryDocRef(session);
            const summarySnap = await getDoc(campaignsSummaryRef);

            if (!campaignDocSnap.exists()) {
                throw new Error('Campaign not found');
            }

            // Mark campaign completed
            await setDoc(campaignDocRef, {
                status: 'completed',
                updatedAt: now,
                resolvedAt: now,
            }, { merge: true });

            // Record export event
            const timestamp = Date.now().toString(36);
            const exportId = `${session.tId}-${timestamp}-${session.sId}`;
            const exportEvent = await requestBodyComposer({
                id: exportId,
                tId: session.tId,
                sId: session.sId,
                campaignId,
                projectId,
                surface,
                method,
                menuLinkWithTracking,
                exportedAt: now,
            }) as CampaignExport;
            await setDoc(doc(getExportsCollectionRef(session), exportId), exportEvent);

            const summaryData = summarySnap.exists()
                ? (summarySnap.data() as Partial<CampaignsSummaryDocument>)
                : null;
            const currentStats = summaryData?.stats ?? {
                totalCompleted: 0,
                totalSkipped: 0,
                typeSkipCounts: {},
            };
            const currentToday = summaryData?.today?.date === today
                ? summaryData.today
                : { date: today, primary: undefined, operational: [], isEmpty: true };
            const nextPrimary = currentToday.primary?.campaignId === campaignId
                ? undefined
                : currentToday.primary;
            const nextOperational = (currentToday.operational || []).filter(
                campaign => campaign.campaignId !== campaignId
            );
            const nextToday = {
                date: today,
                primary: nextPrimary,
                operational: nextOperational,
                isEmpty: !nextPrimary && nextOperational.length === 0,
            };
            const nextStats = {
                ...currentStats,
                totalCompleted: (currentStats.totalCompleted || 0) + 1,
                totalSkipped: currentStats.totalSkipped || 0,
                lastCampaignDate: today,
                typeSkipCounts: currentStats.typeSkipCounts || {},
            };

            await setDoc(campaignsSummaryRef, {
                lastUpdated: serverTimestamp(),
                stats: nextStats,
                today: {
                    ...nextToday,
                    primary: nextToday.primary || null,
                },
            }, { merge: true });

            return { exportEvent, today: nextToday };
        },
        { campaignId, projectId, campaignType, surface, method },
        "completeCampaign"
    );
};

/**
 * Skip a campaign (user chose not to act)
 * Updates campaign status and removes from today
 * 
 * OPTIMIZATION: Accepts campaignType as param to avoid refetching
 * campaign data we already have from useTodayCampaigns hook.
 */
export const skipCampaign = async (campaignId: string, campaignType: CampaignType) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const now = Timestamp.now();
            const today = new Date().toISOString().split('T')[0];
            const campaignDocRef = getCampaignDocRef(session, campaignId);
            const campaignDocSnap = await getDoc(campaignDocRef);
            const campaignsSummaryRef = getCampaignsSummaryDocRef(session);
            const summarySnap = await getDoc(campaignsSummaryRef);

            if (!campaignDocSnap.exists()) {
                throw new Error('Campaign not found');
            }

            const campaign = campaignDocSnap.data() as Campaign;
            const nextSkipCount = (campaign.skipCount || 0) + 1;
            const shouldSuppress = nextSkipCount >= 2;
            const status: CampaignStatus = shouldSuppress ? 'suppressed' : 'skipped';
            const updateData: Partial<Campaign> = {
                status,
                skipCount: nextSkipCount,
                updatedAt: now,
                resolvedAt: now,
            };
            if (shouldSuppress) {
                updateData.suppressedUntil = Timestamp.fromDate(
                    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
                );
            } else {
                delete updateData.suppressedUntil;
            }
            await setDoc(campaignDocRef, updateData, { merge: true });

            const summaryData = summarySnap.exists()
                ? (summarySnap.data() as Partial<CampaignsSummaryDocument>)
                : null;
            const currentStats = summaryData?.stats ?? {
                totalCompleted: 0,
                totalSkipped: 0,
                typeSkipCounts: {},
            };
            const currentToday = summaryData?.today?.date === today
                ? summaryData.today
                : { date: today, primary: undefined, operational: [], isEmpty: true };
            const nextPrimary = currentToday.primary?.campaignId === campaignId
                ? undefined
                : currentToday.primary;
            const nextOperational = (currentToday.operational || []).filter(
                current => current.campaignId !== campaignId
            );
            const nextToday = {
                date: today,
                primary: nextPrimary,
                operational: nextOperational,
                isEmpty: !nextPrimary && nextOperational.length === 0,
            };
            const currentTypeSkipCounts = currentStats.typeSkipCounts || {};
            const nextStats = {
                ...currentStats,
                totalCompleted: currentStats.totalCompleted || 0,
                totalSkipped: (currentStats.totalSkipped || 0) + 1,
                lastCampaignDate: today,
                typeSkipCounts: {
                    ...currentTypeSkipCounts,
                    [campaignType]: (currentTypeSkipCounts[campaignType] || 0) + 1,
                },
            };

            await setDoc(campaignsSummaryRef, {
                lastUpdated: serverTimestamp(),
                stats: nextStats,
                today: {
                    ...nextToday,
                    primary: nextToday.primary || null,
                },
            }, { merge: true });

            return { ...(campaign as Campaign), ...updateData, today: nextToday };
        },
        { campaignId, campaignType },
        "skipCampaign"
    );
};

// ═══════════════════════════════════════════════════════════════
// DIGITAL SCREEN STATE
// Per spec: Extends CampaignsSummaryDocument, no separate collection
// ═══════════════════════════════════════════════════════════════

/**
 * Get screen data by token (PUBLIC - no session required)
 * Used by /screen/[token] page for TV display
 * Per DAL pattern: Direct Firestore query, no API route needed
 * 
 * LICENSE CHECK: Returns null if store is inactive/blocked
 */
export const getScreenDataByToken = async (token: string): Promise<{
    screen: DigitalScreenState;
    today: CampaignsSummaryDocument['today'];
    storeId: string;
    tenantId: string;
    baseProjectId: string | null;
    activeSpecialMenuId: string | null;
    storeInfo: ScreenStoreInfo;
} | null> => {
    try {
        // Query platformSummary where screen.screenToken == token
        const summaryRef = collection(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY);
        const q = query(summaryRef, where('screen.screenToken', '==', token));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log(`[getScreenDataByToken] Token not found: ${token}`);
            return null;
        }

        const docSnap = snapshot.docs[0];
        const data = docSnap.data() as CampaignsSummaryDocument;

        if (!data.screen?.enabled) {
            console.log(`[getScreenDataByToken] Screen disabled for token: ${token}`);
            return null;
        }

        // Extract storeId from document ID (campaigns_{sId})
        const storeId = docSnap.id.replace('campaigns_', '');

        // Fetch store info (simple approach - 1 extra read, but no sync complexity)
        const storeDoc = await getDoc(doc(firebaseClient, DB_COLLECTIONS.STORES, storeId));
        const storeData = storeDoc.exists() ? storeDoc.data() : null;

        // LICENSE CHECK: Block if store is inactive or blocked
        if (storeData && (storeData.active === false || storeData.blocked === true)) {
            console.log(`[getScreenDataByToken] Store inactive/blocked for token: ${token}`);
            return null;
        }

        // R5 link-emitter audit (§9 PUBLIC-ROUTING-DOCTRINE): emit the real
        // canonical slug URL for the QR, not the /menu alias. If the QR
        // encoded /menu and an owner later named a project "Menu", Layer 1
        // would silently hijack what the physical QR resolves to. Canonical
        // URL is immutable (rename → previousSlugs 301 chain) and matches
        // the "internal emitters use canonical URL" rule.
        let selectedProjectSlug: string | undefined;
        let baseProjectId: string | null = null;
        try {
            const summaryRef = doc(
                firebaseClient,
                DB_COLLECTIONS.PLATFORM_SUMMARY,
                `projects_${storeId}`,
            );
            const summarySnap = await getDoc(summaryRef);
            if (summarySnap.exists()) {
                const projectMap = parseSummaryProjects(summarySnap.data() || {});
                const activeProjects = Object.entries(projectMap)
                    .map(([projectId, projectData]) => ({ projectId, ...(projectData || {}) }))
                    .filter((project: any) => project?.active !== false && project?.deleted !== true && project?.isSpecialMenu !== true);
                const fallbackProject = activeProjects.find((project: any) => project?.isDefault === true) || activeProjects[0];
                baseProjectId = fallbackProject?.projectId || null;
                selectedProjectSlug = fallbackProject?.slug;
            }
        } catch {
            // Silent fallback — alias URL still works via Layer 2.
        }

        const storeInfo = {
            name: getStoreContextName(storeData, storeData?.businessName || 'Menu'),
            logoUrl: storeData?.logo || undefined,
            menuQrUrl: getDefaultProjectUrl(
                storeData?.subdomain || storeId,
                storeData?.customDomain,
                selectedProjectSlug,
            ),
            currencySymbol: storeData?.currencySymbol || '₹',
        };

        return {
            screen: data.screen,
            today: data.today,
            storeId,
            tenantId: String(storeData?.tenantId || ''),
            baseProjectId,
            activeSpecialMenuId: storeData?.activeSpecialMenuId || null,
            storeInfo
        };
    } catch (error) {
        console.error('[getScreenDataByToken] Error:', error);
        return null;
    }
};

/**
 * Get menu items for screen display (PUBLIC - no session required)
 * Fetches top items from the store's default project for evergreen slides
 * Returns empty array on any failure (graceful fallback — screen still works with brand slides)
 * 
 * Cost: 2 reads (1 metadata query + 1 project data get)
 */
export const getMenuItemsForScreen = async (
    storeId: string,
    tenantId: string,
    activeSpecialMenuId?: string | null
): Promise<Array<{
    id: string;
    name: string;
    imageUrl?: string;
    price?: number;
    available: boolean;
    isBestSeller?: boolean;
    categoryName?: string;
    categoryOrderIndex?: number;
    orderIndex?: number;
    description?: string;
    tags?: string[];
}>> => {
    try {
        if (!tenantId) return [];

        const extractMenuItemsFromProject = (projectData: any) => {
            const extractedItems: Array<{
                id: string;
                name: string;
                imageUrl?: string;
                price?: number;
                available: boolean;
                isBestSeller?: boolean;
                categoryName?: string;
                categoryOrderIndex?: number;
                orderIndex?: number;
                description?: string;
                tags?: string[];
            }> = [];

            for (const file of (projectData?.files || [])) {
                const categories = Array.isArray(file?.extractedData?.data?.categories)
                    ? file.extractedData.data.categories
                    : [];
                const categoryMap = categories.reduce((acc: Record<string, { name: string; orderIndex: number }>, category: any, index: number) => {
                    const categoryName = normalizeScreenCategoryName(category?.name, "");
                    if (category?.id && categoryName) {
                        acc[category.id] = {
                            name: categoryName,
                            orderIndex: Number.isFinite(Number(category?.orderIndex)) ? Number(category.orderIndex) : index,
                        };
                    }
                    return acc;
                }, {});

                const items = Array.isArray(file?.extractedData?.data?.items)
                    ? file.extractedData.data.items
                    : [];

                for (const [index, item] of items.entries()) {
                    const itemName = resolveScreenText(item?.name);
                    if (!itemName) continue;

                    const itemDesc = resolveScreenText(item?.description) || undefined;
                    const parsedPrice = parseScreenPrice(item?.price);
                    const categoryInfo = item?.category ? categoryMap[item.category] : undefined;

                    extractedItems.push({
                        id: item?.id || `item-${extractedItems.length}`,
                        name: itemName,
                        imageUrl: normalizeScreenImageUrl(item?.images?.[0]?.url),
                        price: parsedPrice,
                        available: item?.available !== false,
                        isBestSeller: item?.isBestSeller || false,
                        categoryName: categoryInfo?.name || normalizeScreenCategoryName(item?.category),
                        categoryOrderIndex: categoryInfo?.orderIndex,
                        orderIndex: Number.isFinite(Number(item?.orderIndex)) ? Number(item.orderIndex) : index,
                        description: itemDesc,
                        tags: normalizeScreenTags(item?.tags),
                    });
                }
            }

            return dedupeScreenMenuItems(extractedItems);
        };

        const mergeOverlayMenu = (baseProject: any, specialProject: any) => {
            if (!specialProject?.files?.length) return baseProject;
            if (!baseProject?.files?.length) return specialProject;

            const merged = JSON.parse(JSON.stringify(baseProject));
            const specialData = specialProject.files[0]?.extractedData?.data;
            if (!specialData) return merged;

            const specialCategories = specialData.categories || [];
            const specialItems = specialData.items || [];

            if (merged.files[0]?.extractedData?.data) {
                const baseData = merged.files[0].extractedData.data;

                if (specialCategories.length > 0) {
                    baseData.categories = [
                        ...(baseData.categories || []),
                        ...specialCategories.map((category: any) => ({
                            ...category,
                            _isSpecialSection: true,
                        })),
                    ];
                }

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
        };

        const projectsRef = collection(
            firebaseClient,
            `${DB_COLLECTIONS.PROJECTS}/${tenantId}/${storeId}`
        );
        const getProjectDoc = async (projectId: string) => {
            const projectDoc = await getDoc(doc(projectsRef, projectId));
            return projectDoc.exists() ? projectDoc : null;
        };

        const summaryRef = doc(
            firebaseClient,
            DB_COLLECTIONS.PLATFORM_SUMMARY,
            `projects_${storeId}`,
        );
        const summarySnap = await getDoc(summaryRef);
        const projectMap = summarySnap.exists() ? parseSummaryProjects(summarySnap.data() || {}) : {};
        const activeProjects = Object.entries(projectMap)
            .map(([projectId, projectData]) => ({ projectId, ...(projectData || {}) }))
            .filter((project: any) => project?.active !== false && project?.deleted !== true && project?.isSpecialMenu !== true);
        const defaultProjectId = activeProjects.find((project: any) => project?.isDefault === true)?.projectId;
        const orderedProjectIds = [
            ...(defaultProjectId ? [defaultProjectId] : []),
            ...activeProjects
                .map((project: any) => project.projectId)
                .filter((projectId, index, allProjectIds) => allProjectIds.indexOf(projectId) === index),
        ];

        if (activeSpecialMenuId) {
            const specialDoc = await getProjectDoc(activeSpecialMenuId);
            const specialProject = specialDoc?.data();
            const specialEndsAt = specialProject?._specialMenu?.endsAt
                ? new Date(specialProject._specialMenu.endsAt).getTime()
                : null;

            if (
                specialProject?._specialMenu?.status === 'active' &&
                specialEndsAt != null &&
                Number.isFinite(specialEndsAt) &&
                specialEndsAt > Date.now()
            ) {
                if (specialProject._specialMenu.mode === 'replace') {
                    const specialItems = extractMenuItemsFromProject(specialProject);
                    if (specialItems.length > 0) {
                        return specialItems;
                    }
                }

                if (specialProject._specialMenu.mode === 'overlay') {
                    const baseProjectId = specialProject._specialMenu.baseProjectId || orderedProjectIds[0];
                    if (baseProjectId) {
                        const baseDoc = await getProjectDoc(baseProjectId);
                        const baseProject = baseDoc?.data();
                        if (baseProject) {
                            const mergedItems = extractMenuItemsFromProject(mergeOverlayMenu(baseProject, specialProject));
                            if (mergedItems.length > 0) {
                                return mergedItems;
                            }
                        }
                    }
                }
            }
        }

        for (const projectId of orderedProjectIds) {
            const projectDoc = await getProjectDoc(projectId);
            if (!projectDoc) continue;

            const fallbackItems = extractMenuItemsFromProject(projectDoc.data());
            if (fallbackItems.length > 0) {
                if (projectId !== orderedProjectIds[0]) {
                    console.log(`[getMenuItemsForScreen] Fallback project used: ${projectId}`);
                }
                return fallbackItems;
            }
        }

        return [];
    } catch (error) {
        console.error('[getMenuItemsForScreen] Error:', error);
        return [];
    }
};

/**
 * Get screen state for current store
 */
export const getScreenState = async (): Promise<DigitalScreenState | null> => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const docRef = getCampaignsSummaryDocRef(session);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                return null;
            }

            const data = docSnap.data() as CampaignsSummaryDocument;
            return data.screen || null;
        },
        null,
        "getScreenState"
    );
};

/**
 * Initialize screen state for a store (first-time setup)
 * Per spec: Screen token generated on first access
 */
export const initializeScreenState = async (): Promise<DigitalScreenState> => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const docRef = getCampaignsSummaryDocRef(session);

            // Generate high-entropy screen token (22 chars, ~130-bit)
            // Per ChatGPT review v3: 8-char tokens vulnerable to enumeration
            const screenToken = generateScreenToken();
            const now = Timestamp.now();

            const screenState: DigitalScreenState = {
                enabled: true,
                screenToken,
                lastRefreshed: now,
                contentVersion: 1,
                lastContentChangeAt: now,
                currentMinConfidence: 0,
                ownerOverrideEnabled: false,
                pinnedSlides: []
            };

            await setDoc(docRef, {
                screen: screenState
            }, { merge: true });

            console.log(`✅ [initializeScreenState] Created screen with token: ${screenToken}`);
            return screenState;
        },
        null,
        "initializeScreenState"
    );
};

/**
 * Update screen settings (toggle override mode)
 * Per spec: Owner can toggle "Use my designs instead"
 */
export const updateScreenSettings = async (settings: { ownerOverrideEnabled?: boolean }): Promise<void> => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const docRef = getCampaignsSummaryDocRef(session);

            await setDoc(docRef, {
                screen: {
                    ...settings,
                }
            }, { merge: true });

            console.log(`✅ [updateScreenSettings] Updated:`, settings);
        },
        settings,
        "updateScreenSettings"
    );
};

/**
 * Add pinned slide (owner upload)
 * Per spec: Max 3 pinned slides, 14-day expiry
 */
export const addPinnedSlide = async (slide: ScreenSlide): Promise<void> => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const docRef = getCampaignsSummaryDocRef(session);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                throw new Error("Screen not initialized");
            }

            const data = docSnap.data() as CampaignsSummaryDocument;
            const currentSlides = data.screen?.pinnedSlides || [];

            if (currentSlides.length >= 3) {
                throw new Error("Maximum 3 pinned slides allowed");
            }

            const updatedSlides = [...currentSlides, slide];

            await setDoc(docRef, {
                screen: {
                    pinnedSlides: updatedSlides,
                    contentVersion: (data.screen?.contentVersion || 0) + 1,
                    lastContentChangeAt: Timestamp.now()
                }
            }, { merge: true });

            console.log(`✅ [addPinnedSlide] Added slide: ${slide.id}`);
        },
        { slideId: slide.id },
        "addPinnedSlide"
    );
};

/**
 * Remove pinned slide
 */
export const removePinnedSlide = async (slideId: string): Promise<void> => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const docRef = getCampaignsSummaryDocRef(session);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                throw new Error("Screen not initialized");
            }

            const data = docSnap.data() as CampaignsSummaryDocument;
            const currentSlides = data.screen?.pinnedSlides || [];
            const updatedSlides = currentSlides.filter(s => s.id !== slideId);

            await setDoc(docRef, {
                screen: {
                    pinnedSlides: updatedSlides,
                    contentVersion: (data.screen?.contentVersion || 0) + 1,
                    lastContentChangeAt: Timestamp.now()
                }
            }, { merge: true });

            console.log(`✅ [removePinnedSlide] Removed slide: ${slideId}`);
        },
        { slideId },
        "removePinnedSlide"
    );
};

/**
 * Update pinned slide caption without re-uploading image.
 */
export const updatePinnedSlideCaption = async (slideId: string, caption: string): Promise<void> => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const docRef = getCampaignsSummaryDocRef(session);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                throw new Error("Screen not initialized");
            }

            const data = docSnap.data() as CampaignsSummaryDocument;
            const currentSlides = data.screen?.pinnedSlides || [];
            const nextCaption = normalizeOwnerSlideCaption(caption);
            const updatedSlides = currentSlides.map((slide) => (
                slide.id === slideId
                    ? { ...slide, caption: nextCaption }
                    : slide
            ));

            await setDoc(docRef, {
                screen: {
                    pinnedSlides: updatedSlides,
                    contentVersion: (data.screen?.contentVersion || 0) + 1,
                    lastContentChangeAt: Timestamp.now()
                }
            }, { merge: true });

            console.log(`✅ [updatePinnedSlideCaption] Updated slide: ${slideId}`);
        },
        { slideId },
        "updatePinnedSlideCaption"
    );
};

/**
 * Bump content version (for invalidation)
 * Called when availability or menu changes
 * Per spec: Event-based invalidation for trust
 */
export const bumpScreenContentVersion = async (): Promise<void> => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const docRef = getCampaignsSummaryDocRef(session);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists() || !docSnap.data().screen) {
                return; // Screen not initialized, nothing to bump
            }

            const data = docSnap.data() as CampaignsSummaryDocument;

            await setDoc(docRef, {
                screen: {
                    contentVersion: (data.screen?.contentVersion || 0) + 1,
                    lastContentChangeAt: Timestamp.now()
                }
            }, { merge: true });

            console.log(`✅ [bumpScreenContentVersion] Bumped to v${(data.screen?.contentVersion || 0) + 1}`);
        },
        null,
        "bumpScreenContentVersion"
    );
};

/**
 * Upload screen slide image to Firebase Storage (client-side)
 * Follows existing pattern from tickets/projects DAL
 * Per spec: Max 3 pinned slides, 14-day expiry
 * 
 * @param data - File data with base64 content
 * @param caption - Optional caption for the slide
 * @returns ScreenSlide object with Firebase Storage URL
 */
export const uploadScreenSlide = async (
    data: UserUploadedFileType,
    caption?: string
): Promise<ScreenSlide> => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();

            // Check screen state exists (initialize if not)
            let screenState = await getScreenState();
            if (!screenState) {
                screenState = await initializeScreenState();
            }

            // Check max slides limit (3)
            if (screenState.pinnedSlides.length >= 3) {
                throw new Error("Maximum 3 custom slides allowed");
            }

            // Generate unique slide ID
            const slideId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            let imageUrl = data.url;

            // Upload prepared media to immutable profile-aware Storage path
            if (data.blob || isDataUrl(data.url)) {
                imageUrl = await uploadPreparedMediaImage({
                    blob: data.blob,
                    contentType: data.type,
                    dataUrl: data.url,
                    entityId: data.mediaEntityId || slideId,
                    mediaChecksum: data.mediaChecksum,
                    mediaId: data.mediaId,
                    prepared: data.preparedMedia,
                    profile: 'digitalScreenSlide',
                    storeId: session.sId,
                    tenantId: session.tId,
                    variant: 'full',
                });
            }

            // Calculate expiry (14 days)
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 14);

            // Create slide object
            const newSlide: ScreenSlide = {
                id: slideId,
                source: "pinned",
                type: "owner_upload",
                imageUrl,
                caption: normalizeOwnerSlideCaption(caption),
                confidenceScore: 1.0, // Owner uploads always max confidence
                availabilityLinked: false,
                availabilityReliability: "high",
                validUntil: Timestamp.fromDate(expiryDate)
            };

            // Add to pinned slides
            await addPinnedSlide(newSlide);

            console.log(`✅ [uploadScreenSlide] Uploaded slide: ${slideId}`);
            return newSlide;
        },
        { caption },
        "uploadScreenSlide"
    );
};
