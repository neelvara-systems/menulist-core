import { DB_COLLECTIONS } from "@constant/database";
import uploadBase64ToStorage from "@database/storage/uploadBase64ToStorage";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, Timestamp, where } from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { getDefaultProjectUrl } from "@lib/obp/generateOBPUrl";
import { generateScreenToken } from "@lib/screen/utils";
import { generateStoragePath } from "@lib/storage/pathGenerator";
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
    StaffPrompt,
    TodayCampaignSummary
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

/**
 * Sync today's campaigns to summary document
 * Called when campaigns are generated or status changes
 */
export const syncTodayCampaignsToSummary = async (
    primary?: TodayCampaignSummary,
    operational: TodayCampaignSummary[] = []
) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const docRef = getCampaignsSummaryDocRef(session);
            const today = new Date().toISOString().split('T')[0];

            await setDoc(docRef, {
                lastUpdated: serverTimestamp(),
                today: {
                    date: today,
                    primary: primary || null,
                    operational,
                    isEmpty: !primary && operational.length === 0
                }
            }, { merge: true });

            return { synced: true, date: today };
        },
        { primary, operational },
        "syncTodayCampaignsToSummary"
    );
};

// ═══════════════════════════════════════════════════════════════
// CAMPAIGN CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new campaign
 */
export const createCampaign = async (data: Partial<Campaign>): Promise<Campaign> => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();

            // Generate campaign ID
            const timestamp = Date.now().toString(36);
            const campaignId = data.id || `${session.tId}-${timestamp}-${session.sId}`;

            const campaignData = await requestBodyComposer({
                id: campaignId,
                tId: session.tId,
                sId: session.sId,
                ...data,
                status: data.status || 'suggested',
                skipCount: data.skipCount || 0,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            }) as Campaign;

            const docRef = getCampaignDocRef(session, campaignId);
            await setDoc(docRef, campaignData);

            console.log(`✅ [createCampaign] Created campaign: ${campaignId} (${data.type})`);
            return campaignData;
        },
        data,
        "createCampaign"
    );
};

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

/**
 * Update campaign status
 * This is the primary action from Today screen (complete or skip)
 */
export const updateCampaignStatus = async (
    campaignId: string,
    status: CampaignStatus,
    additionalData?: Partial<Campaign>
): Promise<Campaign> => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const docRef = getCampaignDocRef(session, campaignId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                throw new Error('Campaign not found');
            }

            const campaign = docSnap.data() as Campaign;
            const updateData: Partial<Campaign> = {
                status,
                updatedAt: Timestamp.now(),
                resolvedAt: ['completed', 'skipped'].includes(status) ? Timestamp.now() : undefined,
                ...additionalData
            };

            // Increment skip count if skipping
            if (status === 'skipped') {
                updateData.skipCount = (campaign.skipCount || 0) + 1;

                // Auto-suppress if skipped twice
                if (updateData.skipCount >= 2) {
                    updateData.status = 'suppressed';
                    updateData.suppressedUntil = Timestamp.fromDate(
                        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
                    );
                }
            }

            await setDoc(docRef, updateData, { merge: true });

            console.log(`✅ [updateCampaignStatus] Updated campaign ${campaignId} to ${status}`);
            return { ...campaign, ...updateData } as Campaign;
        },
        { campaignId, status, additionalData },
        "updateCampaignStatus"
    );
};

// ═══════════════════════════════════════════════════════════════
// CAMPAIGN QUERIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get campaigns for a specific date
 */
export const getCampaignsByDate = async (date: string): Promise<Campaign[]> => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const collectionRef = getCampaignsCollectionRef(session);
            const q = query(
                collectionRef,
                where("suggestedFor", "==", date),
                orderBy("confidence.total", "desc")
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => doc.data() as Campaign);
        },
        { date },
        "getCampaignsByDate"
    );
};

/**
 * Get campaign history (for Past Activity screen)
 * Paginated, chronological, no metrics
 */
export const getCampaignHistory = async (limitCount: number = 20): Promise<Campaign[]> => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const collectionRef = getCampaignsCollectionRef(session);
            const q = query(
                collectionRef,
                where("status", "in", ["completed", "skipped"]),
                orderBy("resolvedAt", "desc"),
                limit(limitCount)
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => doc.data() as Campaign);
        },
        { limitCount },
        "getCampaignHistory"
    );
};

/**
 * Get suppressed campaign types
 * Used to avoid suggesting suppressed types
 */
export const getSuppressedTypes = async (): Promise<CampaignType[]> => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const now = Timestamp.now();
            const collectionRef = getCampaignsCollectionRef(session);
            const q = query(
                collectionRef,
                where("status", "==", "suppressed"),
                where("suppressedUntil", ">", now)
            );

            const snapshot = await getDocs(q);
            const types = new Set<CampaignType>();

            snapshot.docs.forEach(doc => {
                const campaign = doc.data() as Campaign;
                types.add(campaign.type);
            });

            return Array.from(types);
        },
        null,
        "getSuppressedTypes"
    );
};

// Alias for API consistency
export const getSuppressedCampaignTypes = getSuppressedTypes;

// ═══════════════════════════════════════════════════════════════
// EXPORT TRACKING
// ═══════════════════════════════════════════════════════════════

/**
 * Record an export event (ground truth for campaign completion)
 * 
 * ⚠️ WARNING (ChatGPT Review Fix #5):
 * campaignExports are EXECUTION signals, NOT outcome signals.
 * Do NOT correlate exports with business performance (orders, revenue).
 * Do NOT build "ROI" or "effectiveness" features from this data.
 * 
 * This data answers: "Did owner share?"
 * It does NOT answer: "Did sharing work?"
 * 
 * Violating this creates fake causation and erodes trust.
 */
export const recordExport = async (data: Omit<CampaignExport, 'id' | 'tId' | 'sId' | 'exportedAt'>): Promise<CampaignExport> => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();

            const timestamp = Date.now().toString(36);
            const exportId = `${session.tId}-${timestamp}-${session.sId}`;

            const exportData = await requestBodyComposer({
                id: exportId,
                tId: session.tId,
                sId: session.sId,
                ...data,
                exportedAt: Timestamp.now()
            }) as CampaignExport;

            const collectionRef = getExportsCollectionRef(session);
            const docRef = doc(collectionRef, exportId);
            await setDoc(docRef, exportData);

            // Also update campaign status to completed
            await updateCampaignStatus(data.campaignId, 'completed');

            console.log(`✅ [recordExport] Recorded export for campaign ${data.campaignId} via ${data.surface}`);
            return exportData;
        },
        data,
        "recordExport"
    );
};

// ═══════════════════════════════════════════════════════════════
// SUPPRESSION STATS (For Summary Document)
// ═══════════════════════════════════════════════════════════════

/**
 * Update suppression stats in summary
 */
export const updateSuppressionStats = async (
    type: CampaignType,
    action: 'completed' | 'skipped'
) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const docRef = getCampaignsSummaryDocRef(session);
            const docSnap = await getDoc(docRef);

            const summaryDoc = docSnap.exists() ? (docSnap.data() as Partial<CampaignsSummaryDocument>) : null;
            const currentStats = summaryDoc?.stats ?? {
                totalCompleted: 0,
                totalSkipped: 0,
                typeSkipCounts: {}
            };

            const updatedStats = {
                ...currentStats,
                totalCompleted: action === 'completed'
                    ? (currentStats.totalCompleted || 0) + 1
                    : (currentStats.totalCompleted || 0),
                totalSkipped: action === 'skipped'
                    ? (currentStats.totalSkipped || 0) + 1
                    : (currentStats.totalSkipped || 0),
                lastCampaignDate: new Date().toISOString().split('T')[0],
                typeSkipCounts: {
                    ...(currentStats.typeSkipCounts || {}),
                    [type]: action === 'skipped'
                        ? (((currentStats.typeSkipCounts || {})[type] || 0) + 1)
                        : ((currentStats.typeSkipCounts || {})[type] || 0)
                }
            };

            await setDoc(docRef, {
                lastUpdated: serverTimestamp(),
                stats: updatedStats
            }, { merge: true });

            return updatedStats;
        },
        { type, action },
        "updateSuppressionStats"
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
                suppressedUntil: shouldSuppress
                    ? Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))
                    : undefined,
            };
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
        let defaultSlug: string | undefined;
        try {
            const summaryRef = doc(
                firebaseClient,
                DB_COLLECTIONS.PLATFORM_SUMMARY || 'platformSummary',
                `projects_${storeId}`,
            );
            const summarySnap = await getDoc(summaryRef);
            if (summarySnap.exists()) {
                const raw = summarySnap.data() || {};
                const projectsObj: any =
                    (raw.projects && typeof raw.projects === 'object') ? raw.projects : {};
                // Handle both nested { projects: {id: {...}} } and legacy flat
                // { "projects.id": {...} } formats — same pattern as the
                // parseSummaryProjects helper used on the client path.
                const entries: any[] = [];
                for (const [k, v] of Object.entries(raw)) {
                    if (k.startsWith('projects.')) entries.push(v);
                }
                for (const v of Object.values(projectsObj)) entries.push(v);
                const active = entries.filter(
                    (p: any) => p?.active !== false && !p?.isSpecialMenu,
                );
                const def = active.find((p: any) => p?.isDefault === true) || active[0];
                if (def?.slug) defaultSlug = def.slug;
            }
        } catch {
            // Silent fallback — alias URL still works via Layer 2.
        }

        const storeInfo = {
            name: storeData?.name || storeData?.businessName || 'Menu',
            logoUrl: storeData?.logo || undefined,
            menuQrUrl: getDefaultProjectUrl(
                storeData?.subdomain || storeId,
                storeData?.customDomain,
                defaultSlug,
            ),
        };

        return {
            screen: data.screen,
            today: data.today,
            storeId,
            tenantId: String(storeData?.tenantId || ''),
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
    tenantId: string
): Promise<Array<{
    id: string;
    name: string;
    imageUrl?: string;
    price?: number;
    available: boolean;
    isBestSeller?: boolean;
    categoryName?: string;
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
                description?: string;
                tags?: string[];
            }> = [];

            const resolveLocalizedText = (value: unknown): string => {
                if (typeof value === 'string') return value.trim();
                if (!value || typeof value !== 'object') return '';
                const localized = Object.values(value as Record<string, unknown>).find(
                    (entry) => typeof entry === 'string' && entry.trim().length > 0
                );
                return typeof localized === 'string' ? localized.trim() : '';
            };

            for (const file of (projectData?.files || [])) {
                const categories = Array.isArray(file?.extractedData?.data?.categories)
                    ? file.extractedData.data.categories
                    : [];
                const categoryMap = categories.reduce((acc: Record<string, string>, category: any) => {
                    const categoryName = resolveLocalizedText(category?.name);
                    if (category?.id && categoryName) {
                        acc[category.id] = categoryName;
                    }
                    return acc;
                }, {});

                const items = Array.isArray(file?.extractedData?.data?.items)
                    ? file.extractedData.data.items
                    : [];

                for (const item of items) {
                    const itemName = resolveLocalizedText(item?.name);
                    if (!itemName) continue;

                    const itemDesc = resolveLocalizedText(item?.description) || undefined;
                    const parsedPrice = typeof item?.price === 'string' ? parseFloat(item.price) : item?.price;

                    extractedItems.push({
                        id: item?.id || `item-${extractedItems.length}`,
                        name: itemName,
                        imageUrl: item?.images?.[0]?.url,
                        price: Number.isFinite(parsedPrice) ? parsedPrice : undefined,
                        available: item?.available !== false,
                        isBestSeller: item?.isBestSeller || false,
                        categoryName: categoryMap[item?.category] || item?.category || undefined,
                        description: itemDesc,
                        tags: item?.tags?.length ? item.tags : undefined,
                    });
                }
            }

            return extractedItems;
        };

        // T3-N-04: project docs live at the 3-segment path
        // `projects/{tenantId}/{storeId}` — querying that collection directly
        // replaces the prior invalid 4-segment `.../metadata` path that would
        // have thrown at runtime. Project data and the discriminators we
        // filter on (`isDefault`, `active`, `deleted`) live on the same doc,
        // so the former two-step "metadata lookup → data fetch" collapses
        // into a single query — saves one Firestore read per screen load.
        const projectsRef = collection(
            firebaseClient,
            `${DB_COLLECTIONS.PROJECTS}/${tenantId}/${storeId}`
        );
        const defaultQuery = query(
            projectsRef,
            where('deleted', '==', false),
            where('active', '==', true),
            where('isDefault', '==', true),
            limit(1)
        );
        let projectSnap = await getDocs(defaultQuery);

        // Fallback: first active project if default not found
        if (projectSnap.empty) {
            const activeQuery = query(
                projectsRef,
                where('deleted', '==', false),
                where('active', '==', true),
                limit(1)
            );
            projectSnap = await getDocs(activeQuery);
        }

        if (projectSnap.empty) return [];

        const chosenDoc = projectSnap.docs[0];
        const projectId = chosenDoc.id;

        // 2. Extract items from chosen project (data already in snapshot)
        const items = extractMenuItemsFromProject(chosenDoc.data());
        if (items.length > 0) {
            return items;
        }

        // 3. Defensive fallback: if chosen project has no items, try a few active projects
        // (prevents "Preparing your menu..." when default project is empty)
        const fallbackQuery = query(
            projectsRef,
            where('deleted', '==', false),
            where('active', '==', true),
            limit(5)
        );
        const fallbackSnap = await getDocs(fallbackQuery);

        for (const fallbackDoc of fallbackSnap.docs) {
            if (fallbackDoc.id === projectId) continue;

            const fallbackItems = extractMenuItemsFromProject(fallbackDoc.data());
            if (fallbackItems.length > 0) {
                console.log(`[getMenuItemsForScreen] Fallback project used: ${fallbackDoc.id}`);
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
                screen: settings
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

            // Upload to Firebase Storage if base64
            if (data.url?.includes('base64')) {
                const path = generateStoragePath({
                    collection: PLATFORM_SUMMARY,
                    fileType: 'screen_slides',
                    session,
                    fileId: slideId
                });

                imageUrl = await uploadBase64ToStorage({
                    fileId: slideId,
                    url: data.url,
                    path,
                    type: data.type
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
                caption,
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
