import { DB_COLLECTIONS } from "@constant/database";
import { deleteFileByUrl } from "@database/storage/deleteFromStorage";
import { uploadPreparedMediaImageWithLedger } from "@database/storage/uploadPreparedMediaImage";
import { collection, deleteField, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, setDoc, Timestamp, type Transaction, where } from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { isDataUrl } from "@lib/media/mediaStorage";
import {
    buildCampaignCompletionState,
    buildCampaignSkipState,
    campaignTodayContains,
    getCampaignTodayState,
    removeCampaignFromToday,
} from "@lib/campaigns/campaignActionState";
import { normalizeOwnerSlideCaption } from "@lib/screen/screenContent";
import { getPublicScreenStateDocRef, toPublicScreenState } from "@lib/screen/publicScreenState";
import { generateScreenToken, isValidScreenToken } from "@lib/screen/utils";
import { secureError } from "@lib/security/secureLogger";
import { createRandomIdSegment } from "@lib/runtime/randomId";
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
    StaffPrompt
} from "@type/campaigns";
import { UserUploadedFileType } from "@type/common";
import type LoginUserType from "@type/loginUser";

const CAMPAIGNS_COLLECTION = DB_COLLECTIONS.CAMPAIGNS;
const EXPORTS_COLLECTION = DB_COLLECTIONS.CAMPAIGN_EXPORTS;
const PLATFORM_SUMMARY = DB_COLLECTIONS.PLATFORM_SUMMARY;

const getLogErrorName = (error: unknown): string => (
    error instanceof Error ? error.name : typeof error
);

const logCampaignScreenFailure = (
    failureCode: string,
    error: unknown,
    context: Record<string, unknown> = {},
): void => {
    secureError(
        "[Digital Screen] Campaign helper failed",
        new Error(failureCode),
        {
            ...context,
            errorName: getLogErrorName(error),
        },
    );
};

export type DigitalScreenMutationResult = {
    success: true;
    screen: DigitalScreenState;
};

const isFirestoreTimestampLike = (value: unknown): boolean => (
    Boolean(value && typeof value === 'object')
    && typeof (value as { toDate?: unknown }).toDate === 'function'
    && typeof (value as { toMillis?: unknown }).toMillis === 'function'
);

const isPinnedScreenSlide = (value: unknown): value is ScreenSlide => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const slide = value as Partial<ScreenSlide>;
    return typeof slide.id === 'string'
        && slide.id.length > 0
        && slide.id.length <= 128
        && slide.source === 'pinned'
        && slide.type === 'owner_upload'
        && typeof slide.imageUrl === 'string'
        && slide.imageUrl.length > 0
        && slide.imageUrl.length <= 4096
        && (slide.caption === undefined || (typeof slide.caption === 'string' && slide.caption.length <= 48))
        && typeof slide.confidenceScore === 'number'
        && Number.isFinite(slide.confidenceScore)
        && slide.confidenceScore >= 0
        && slide.confidenceScore <= 1
        && slide.availabilityLinked === false
        && slide.availabilityReliability === 'high'
        && isFirestoreTimestampLike(slide.validUntil);
};

export const isDigitalScreenState = (value: unknown): value is DigitalScreenState => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const screen = value as Partial<DigitalScreenState>;
    return typeof screen.enabled === 'boolean'
        && typeof screen.screenToken === 'string'
        && isValidScreenToken(screen.screenToken)
        && isFirestoreTimestampLike(screen.lastRefreshed)
        && Number.isInteger(screen.contentVersion)
        && Number(screen.contentVersion) >= 1
        && isFirestoreTimestampLike(screen.lastContentChangeAt)
        && typeof screen.currentMinConfidence === 'number'
        && Number.isFinite(screen.currentMinConfidence)
        && screen.currentMinConfidence >= 0
        && screen.currentMinConfidence <= 1
        && typeof screen.ownerOverrideEnabled === 'boolean'
        && Array.isArray(screen.pinnedSlides)
        && screen.pinnedSlides.length <= 3
        && screen.pinnedSlides.every(isPinnedScreenSlide)
        && (screen.screenLastSeenAt === undefined || isFirestoreTimestampLike(screen.screenLastSeenAt));
};

export const isDigitalScreenMutationResult = (result: unknown): result is DigitalScreenMutationResult => (
    Boolean(result && typeof result === 'object')
    && !Array.isArray(result)
    && (result as DigitalScreenMutationResult).success === true
    && isDigitalScreenState((result as DigitalScreenMutationResult).screen)
);

export function assertDigitalScreenMutationSucceeded(
    result: unknown,
    rejectionCode = 'digital_screen_mutation_rejected',
): asserts result is DigitalScreenMutationResult {
    if (isDigitalScreenMutationResult(result)) return;
    throw new Error(rejectionCode);
}

export const isDigitalScreenSlideUploadResult = (result: unknown): result is ScreenSlide => (
    isPinnedScreenSlide(result)
);

export function assertDigitalScreenSlideUploadSucceeded(
    result: unknown,
    rejectionCode = 'digital_screen_slide_upload_rejected',
): asserts result is ScreenSlide {
    if (isDigitalScreenSlideUploadResult(result)) return;
    throw new Error(rejectionCode);
}

type CampaignTodayState = CampaignsSummaryDocument['today'];

export type CampaignCompleteResult = {
    success: true;
    campaignId: string;
    campaignType: CampaignType;
    exportEvent: CampaignExport;
    exportId: string;
    method: CampaignExport['method'];
    projectId: string;
    status: 'completed';
    surface: ExecutionSurface;
    today: CampaignTodayState;
};

export type CampaignSkipResult = {
    success: true;
    campaignId: string;
    campaignType: CampaignType;
    skipCount: number;
    status: Extract<CampaignStatus, 'skipped' | 'suppressed'>;
    today: CampaignTodayState;
};

function isCampaignTodayState(value: unknown): value is CampaignTodayState {
    return Boolean(
        value
        && typeof value === 'object'
        && !Array.isArray(value)
        && typeof (value as CampaignTodayState).date === 'string'
        && Array.isArray((value as CampaignTodayState).operational)
        && typeof (value as CampaignTodayState).isEmpty === 'boolean',
    );
}

export function isCampaignCompleteResult(
    result: unknown,
    expected: {
        campaignId: string;
        campaignType: CampaignType;
        method: CampaignExport['method'];
        projectId: string;
        surface: ExecutionSurface;
    },
): result is CampaignCompleteResult {
    const data = result as CampaignCompleteResult;
    return Boolean(
        data
        && typeof data === 'object'
        && !Array.isArray(data)
        && data.success === true
        && data.status === 'completed'
        && data.campaignId === expected.campaignId
        && data.campaignType === expected.campaignType
        && data.projectId === expected.projectId
        && data.surface === expected.surface
        && data.method === expected.method
        && typeof data.exportId === 'string'
        && data.exportId.length > 0
        && data.exportEvent?.id === data.exportId
        && data.exportEvent?.campaignId === expected.campaignId
        && data.exportEvent?.projectId === expected.projectId
        && data.exportEvent?.surface === expected.surface
        && data.exportEvent?.method === expected.method
        && isCampaignTodayState(data.today),
    );
}

export function assertCampaignCompleteSucceeded(
    result: unknown,
    expected: {
        campaignId: string;
        campaignType: CampaignType;
        method: CampaignExport['method'];
        projectId: string;
        surface: ExecutionSurface;
    },
    rejectionCode = 'today_campaign_complete_acknowledgement_rejected',
): asserts result is CampaignCompleteResult {
    if (isCampaignCompleteResult(result, expected)) return;
    throw new Error(rejectionCode);
}

export function isCampaignSkipResult(
    result: unknown,
    expected: {
        campaignId: string;
        campaignType: CampaignType;
    },
): result is CampaignSkipResult {
    const data = result as CampaignSkipResult;
    return Boolean(
        data
        && typeof data === 'object'
        && !Array.isArray(data)
        && data.success === true
        && data.campaignId === expected.campaignId
        && data.campaignType === expected.campaignType
        && (data.status === 'skipped' || data.status === 'suppressed')
        && Number.isInteger(data.skipCount)
        && data.skipCount > 0
        && isCampaignTodayState(data.today),
    );
}

export function assertCampaignSkipSucceeded(
    result: unknown,
    expected: {
        campaignId: string;
        campaignType: CampaignType;
    },
    rejectionCode = 'today_campaign_skip_acknowledgement_rejected',
): asserts result is CampaignSkipResult {
    if (isCampaignSkipResult(result, expected)) return;
    throw new Error(rejectionCode);
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT REFERENCES
// ═══════════════════════════════════════════════════════════════

type CampaignSessionScope = Pick<LoginUserType, 'tId' | 'sId'>;

const requireCampaignSessionScope = (session: LoginUserType | null): LoginUserType => {
    if (
        !session
        || !Number.isSafeInteger(session.tId)
        || session.tId <= 0
        || !Number.isSafeInteger(session.sId)
        || session.sId <= 0
    ) {
        throw new Error('campaign_session_scope_invalid');
    }
    return session;
};

const getCampaignsCollectionRef = (session: CampaignSessionScope) => {
    return collection(firebaseClient, `${CAMPAIGNS_COLLECTION}/${session.tId}/${session.sId}`);
};

const getCampaignDocRef = (session: CampaignSessionScope, campaignId: string) => {
    return doc(firebaseClient, `${CAMPAIGNS_COLLECTION}/${session.tId}/${session.sId}`, campaignId);
};

const getExportsCollectionRef = (session: CampaignSessionScope) => {
    return collection(firebaseClient, `${EXPORTS_COLLECTION}/${session.tId}/${session.sId}`);
};

/**
 * Get reference to campaignsSummary document for current store
 * Document path: platformSummary/campaigns_{sId}
 * This is the Summary Document Pattern for 1-read Today screen
 */
const getCampaignsSummaryDocRef = (session: CampaignSessionScope) => {
    return doc(firebaseClient, PLATFORM_SUMMARY, `campaigns_${session.sId}`);
};

const setScreenStateInTransaction = (
    transaction: Transaction,
    session: CampaignSessionScope,
    screen: DigitalScreenState,
): void => {
    const publicState = toPublicScreenState(session.sId, screen);
    if (!publicState) throw new Error('digital_screen_public_state_invalid');

    transaction.set(getCampaignsSummaryDocRef(session), { screen }, { merge: true });
    transaction.set(getPublicScreenStateDocRef(session.sId), publicState, { merge: false });
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
            const session = requireCampaignSessionScope(await getActiveSession());
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
            const session = requireCampaignSessionScope(await getActiveSession());
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
                const session = requireCampaignSessionScope(await getActiveSession());
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
                secureError(
                    "[Campaigns] Campaign history load failed",
                    new Error("campaign_history_load_failed"),
                    {
                        limitCount,
                        hasProjectId: Boolean(projectId),
                        projectIdLength: String(projectId || "").length,
                        errorName: getLogErrorName(error),
                    },
                );
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
            const session = requireCampaignSessionScope(await getActiveSession());
            const now = Timestamp.now();
            const today = new Date().toISOString().split('T')[0];
            const campaignDocRef = getCampaignDocRef(session, campaignId);
            const campaignsSummaryRef = getCampaignsSummaryDocRef(session);
            const exportId = `complete_${campaignId}`;
            const exportRef = doc(getExportsCollectionRef(session), exportId);
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
            }, { isNew: true }) as CampaignExport;

            return runTransaction(firebaseClient, async (transaction) => {
                const campaignDocSnap = await transaction.get(campaignDocRef);
                const summarySnap = await transaction.get(campaignsSummaryRef);
                const existingExportSnap = await transaction.get(exportRef);

                if (!campaignDocSnap.exists()) {
                    throw new Error('campaign_not_found');
                }

                const campaign = campaignDocSnap.data() as Campaign;
                if (
                    campaign.id !== campaignId
                    || campaign.projectId !== projectId
                    || campaign.type !== campaignType
                    || Number(campaign.tId) !== session.tId
                    || Number(campaign.sId) !== session.sId
                ) {
                    throw new Error('campaign_action_identity_mismatch');
                }
                if (
                    campaign.primarySurface !== surface
                    && !(campaign.secondarySurfaces || []).includes(surface)
                ) {
                    throw new Error('campaign_action_surface_mismatch');
                }

                const summaryData = summarySnap.exists()
                    ? (summarySnap.data() as Partial<CampaignsSummaryDocument>)
                    : null;
                const currentToday = getCampaignTodayState(summaryData, today);

                if (campaign.status === 'completed') {
                    if (!existingExportSnap.exists()) {
                        throw new Error('campaign_completion_marker_missing');
                    }
                    const existingExport = existingExportSnap.data() as CampaignExport;
                    if (
                        existingExport.id !== exportId
                        || existingExport.campaignId !== campaignId
                        || existingExport.projectId !== projectId
                        || existingExport.surface !== surface
                        || existingExport.method !== method
                        || Number(existingExport.tId) !== session.tId
                        || Number(existingExport.sId) !== session.sId
                    ) {
                        throw new Error('campaign_completion_marker_mismatch');
                    }

                    const idempotentToday = removeCampaignFromToday(currentToday, campaignId);
                    if (campaignTodayContains(currentToday, campaignId)) {
                        transaction.set(campaignsSummaryRef, {
                            lastUpdated: serverTimestamp(),
                            today: {
                                ...idempotentToday,
                                primary: idempotentToday.primary || null,
                            },
                        }, { merge: true });
                    }

                    return {
                        campaignId,
                        campaignType,
                        exportEvent: existingExport,
                        exportId,
                        method,
                        projectId,
                        status: 'completed',
                        success: true,
                        surface,
                        today: idempotentToday,
                    } satisfies CampaignCompleteResult;
                }

                if (campaign.status !== 'suggested') {
                    throw new Error('campaign_completion_status_invalid');
                }
                if (existingExportSnap.exists()) {
                    throw new Error('campaign_completion_marker_conflict');
                }

                const nextState = buildCampaignCompletionState(summaryData, today, campaignId);
                transaction.set(campaignDocRef, {
                    status: 'completed',
                    updatedAt: now,
                    resolvedAt: now,
                }, { merge: true });
                transaction.set(exportRef, exportEvent);
                transaction.set(campaignsSummaryRef, {
                    lastUpdated: serverTimestamp(),
                    stats: nextState.stats,
                    today: {
                        ...nextState.today,
                        primary: nextState.today.primary || null,
                    },
                }, { merge: true });

                return {
                    campaignId,
                    campaignType,
                    exportEvent,
                    exportId,
                    method,
                    projectId,
                    status: 'completed',
                    success: true,
                    surface,
                    today: nextState.today,
                } satisfies CampaignCompleteResult;
            });
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
            const session = requireCampaignSessionScope(await getActiveSession());
            const now = Timestamp.now();
            const today = new Date().toISOString().split('T')[0];
            const campaignDocRef = getCampaignDocRef(session, campaignId);
            const campaignsSummaryRef = getCampaignsSummaryDocRef(session);

            return runTransaction(firebaseClient, async (transaction) => {
                const campaignDocSnap = await transaction.get(campaignDocRef);
                const summarySnap = await transaction.get(campaignsSummaryRef);

                if (!campaignDocSnap.exists()) {
                    throw new Error('campaign_not_found');
                }

                const campaign = campaignDocSnap.data() as Campaign;
                if (
                    campaign.id !== campaignId
                    || campaign.type !== campaignType
                    || Number(campaign.tId) !== session.tId
                    || Number(campaign.sId) !== session.sId
                ) {
                    throw new Error('campaign_action_identity_mismatch');
                }

                const summaryData = summarySnap.exists()
                    ? (summarySnap.data() as Partial<CampaignsSummaryDocument>)
                    : null;
                const currentToday = getCampaignTodayState(summaryData, today);

                if (campaign.status === 'skipped' || campaign.status === 'suppressed') {
                    const idempotentToday = removeCampaignFromToday(currentToday, campaignId);
                    if (campaignTodayContains(currentToday, campaignId)) {
                        transaction.set(campaignsSummaryRef, {
                            lastUpdated: serverTimestamp(),
                            today: {
                                ...idempotentToday,
                                primary: idempotentToday.primary || null,
                            },
                        }, { merge: true });
                    }
                    return {
                        campaignId,
                        campaignType,
                        skipCount: Number.isSafeInteger(Number(campaign.skipCount)) && Number(campaign.skipCount) > 0
                            ? Number(campaign.skipCount)
                            : 1,
                        status: campaign.status,
                        success: true,
                        today: idempotentToday,
                    } satisfies CampaignSkipResult;
                }

                if (campaign.status !== 'suggested') {
                    throw new Error('campaign_skip_status_invalid');
                }

                const persistedSkipCount = Number(campaign.skipCount);
                const nextSkipCount = (
                    Number.isSafeInteger(persistedSkipCount) && persistedSkipCount >= 0
                        ? persistedSkipCount
                        : 0
                ) + 1;
                const shouldSuppress = nextSkipCount >= 2;
                const status: CampaignStatus = shouldSuppress ? 'suppressed' : 'skipped';
                const updateData = {
                    status,
                    skipCount: nextSkipCount,
                    updatedAt: now,
                    resolvedAt: now,
                    suppressedUntil: shouldSuppress
                        ? Timestamp.fromMillis(now.toMillis() + 14 * 24 * 60 * 60 * 1000)
                        : deleteField(),
                };
                const nextState = buildCampaignSkipState(
                    summaryData,
                    today,
                    campaignId,
                    campaignType,
                );

                transaction.set(campaignDocRef, updateData, { merge: true });
                transaction.set(campaignsSummaryRef, {
                    lastUpdated: serverTimestamp(),
                    stats: nextState.stats,
                    today: {
                        ...nextState.today,
                        primary: nextState.today.primary || null,
                    },
                }, { merge: true });

                return {
                    campaignId,
                    campaignType,
                    skipCount: nextSkipCount,
                    status,
                    success: true,
                    today: nextState.today,
                } satisfies CampaignSkipResult;
            });
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
 * Get screen state for current store
 */
export const getScreenState = async (): Promise<DigitalScreenState | null> => {
    const result = await apiCallComposer(
        async () => {
            const session = requireCampaignSessionScope(await getActiveSession());
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
    return isDigitalScreenState(result) ? result : null;
};

/**
 * Initialize screen state for a store (first-time setup)
 * Per spec: Screen token generated on first access
 */
export const initializeScreenState = async (): Promise<DigitalScreenState> => {
    const result = await apiCallComposer(
        async () => {
            const session = requireCampaignSessionScope(await getActiveSession());
            const docRef = getCampaignsSummaryDocRef(session);
            return runTransaction(firebaseClient, async (transaction) => {
                const currentSnap = await transaction.get(docRef);
                const currentScreen = currentSnap.exists()
                    ? (currentSnap.data() as Partial<CampaignsSummaryDocument>).screen
                    : null;
                if (currentScreen) {
                    if (!isDigitalScreenState(currentScreen)) {
                        throw new Error('digital_screen_state_invalid');
                    }
                    setScreenStateInTransaction(transaction, session, currentScreen);
                    return currentScreen;
                }

                // Generate high-entropy screen token (22 chars, ~130-bit).
                // Transaction retries remain safe because only the committed token
                // is returned and the canonical/public documents commit together.
                const now = Timestamp.now();
                const screenState: DigitalScreenState = {
                    enabled: true,
                    screenToken: generateScreenToken(),
                    lastRefreshed: now,
                    contentVersion: 1,
                    lastContentChangeAt: now,
                    currentMinConfidence: 0,
                    ownerOverrideEnabled: false,
                    pinnedSlides: [],
                };

                setScreenStateInTransaction(transaction, session, screenState);
                return screenState;
            });
        },
        null,
        "initializeScreenState"
    );
    if (!isDigitalScreenState(result)) {
        throw new Error('digital_screen_initialization_rejected');
    }
    return result;
};

/**
 * Update screen settings (toggle override mode)
 * Per spec: Owner can toggle "Use my designs instead"
 */
export const updateScreenSettings = async (settings: { ownerOverrideEnabled?: boolean }): Promise<DigitalScreenMutationResult> => {
    return await apiCallComposer(
        async () => {
            const session = requireCampaignSessionScope(await getActiveSession());
            const docRef = getCampaignsSummaryDocRef(session);
            return runTransaction(firebaseClient, async (transaction) => {
                const docSnap = await transaction.get(docRef);
                const currentScreen = docSnap.exists()
                    ? (docSnap.data() as Partial<CampaignsSummaryDocument>).screen
                    : null;
                if (!isDigitalScreenState(currentScreen)) throw new Error("Screen not initialized");

                const ownerOverrideEnabled = typeof settings.ownerOverrideEnabled === "boolean"
                    ? settings.ownerOverrideEnabled
                    : currentScreen.ownerOverrideEnabled;
                if (ownerOverrideEnabled === currentScreen.ownerOverrideEnabled) {
                    return { success: true, screen: currentScreen } satisfies DigitalScreenMutationResult;
                }

                const nextScreen: DigitalScreenState = {
                    ...currentScreen,
                    ownerOverrideEnabled,
                    contentVersion: (currentScreen.contentVersion || 0) + 1,
                    lastContentChangeAt: Timestamp.now(),
                };
                setScreenStateInTransaction(transaction, session, nextScreen);
                return { success: true, screen: nextScreen } satisfies DigitalScreenMutationResult;
            });
        },
        settings,
        "updateScreenSettings"
    );
};

/**
 * Add pinned slide (owner upload)
 * Per spec: Max 3 pinned slides, 14-day expiry
 */
export const addPinnedSlide = async (slide: ScreenSlide): Promise<DigitalScreenMutationResult> => {
    return await apiCallComposer(
        async () => {
            const session = requireCampaignSessionScope(await getActiveSession());
            const docRef = getCampaignsSummaryDocRef(session);
            if (!isDigitalScreenSlideUploadResult(slide)) {
                throw new Error('digital_screen_slide_invalid');
            }

            return runTransaction(firebaseClient, async (transaction) => {
                const docSnap = await transaction.get(docRef);
                const currentScreen = docSnap.exists()
                    ? (docSnap.data() as Partial<CampaignsSummaryDocument>).screen
                    : null;
                if (!isDigitalScreenState(currentScreen)) throw new Error("Screen not initialized");

                const currentSlides = currentScreen.pinnedSlides || [];
                if (currentSlides.some((currentSlide) => currentSlide.id === slide.id)) {
                    return { success: true, screen: currentScreen } satisfies DigitalScreenMutationResult;
                }
                if (currentSlides.length >= 3) {
                    throw new Error("Maximum 3 pinned slides allowed");
                }

                const nextScreen: DigitalScreenState = {
                    ...currentScreen,
                    pinnedSlides: [...currentSlides, slide],
                    contentVersion: (currentScreen.contentVersion || 0) + 1,
                    lastContentChangeAt: Timestamp.now(),
                };
                setScreenStateInTransaction(transaction, session, nextScreen);
                return { success: true, screen: nextScreen } satisfies DigitalScreenMutationResult;
            });
        },
        { slideId: slide.id },
        "addPinnedSlide"
    );
};

/**
 * Remove pinned slide
 */
export const removePinnedSlide = async (slideId: string): Promise<DigitalScreenMutationResult> => {
    return await apiCallComposer(
        async () => {
            const session = requireCampaignSessionScope(await getActiveSession());
            const docRef = getCampaignsSummaryDocRef(session);
            return runTransaction(firebaseClient, async (transaction) => {
                const docSnap = await transaction.get(docRef);
                const currentScreen = docSnap.exists()
                    ? (docSnap.data() as Partial<CampaignsSummaryDocument>).screen
                    : null;
                if (!isDigitalScreenState(currentScreen)) throw new Error("Screen not initialized");

                const currentSlides = currentScreen.pinnedSlides || [];
                if (!currentSlides.some((slide) => slide.id === slideId)) {
                    return { success: true, screen: currentScreen } satisfies DigitalScreenMutationResult;
                }
                const nextScreen: DigitalScreenState = {
                    ...currentScreen,
                    pinnedSlides: currentSlides.filter((slide) => slide.id !== slideId),
                    contentVersion: (currentScreen.contentVersion || 0) + 1,
                    lastContentChangeAt: Timestamp.now(),
                };
                setScreenStateInTransaction(transaction, session, nextScreen);
                return { success: true, screen: nextScreen } satisfies DigitalScreenMutationResult;
            });
        },
        { slideId },
        "removePinnedSlide"
    );
};

/**
 * Update pinned slide caption without re-uploading image.
 */
export const updatePinnedSlideCaption = async (slideId: string, caption: string): Promise<DigitalScreenMutationResult> => {
    return await apiCallComposer(
        async () => {
            const session = requireCampaignSessionScope(await getActiveSession());
            const docRef = getCampaignsSummaryDocRef(session);
            const nextCaption = normalizeOwnerSlideCaption(caption);
            return runTransaction(firebaseClient, async (transaction) => {
                const docSnap = await transaction.get(docRef);
                const currentScreen = docSnap.exists()
                    ? (docSnap.data() as Partial<CampaignsSummaryDocument>).screen
                    : null;
                if (!isDigitalScreenState(currentScreen)) throw new Error("Screen not initialized");

                const currentSlides = currentScreen.pinnedSlides || [];
                const targetSlide = currentSlides.find((slide) => slide.id === slideId);
                if (!targetSlide) throw new Error('digital_screen_slide_not_found');
                if ((targetSlide.caption || '') === nextCaption) {
                    return { success: true, screen: currentScreen } satisfies DigitalScreenMutationResult;
                }

                const nextScreen: DigitalScreenState = {
                    ...currentScreen,
                    pinnedSlides: currentSlides.map((slide) => (
                        slide.id === slideId
                            ? { ...slide, caption: nextCaption }
                            : slide
                    )),
                    contentVersion: (currentScreen.contentVersion || 0) + 1,
                    lastContentChangeAt: Timestamp.now(),
                };
                setScreenStateInTransaction(transaction, session, nextScreen);
                return { success: true, screen: nextScreen } satisfies DigitalScreenMutationResult;
            });
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
            const session = requireCampaignSessionScope(await getActiveSession());
            const docRef = getCampaignsSummaryDocRef(session);
            await runTransaction(firebaseClient, async (transaction) => {
                const docSnap = await transaction.get(docRef);
                const currentScreen = docSnap.exists()
                    ? (docSnap.data() as Partial<CampaignsSummaryDocument>).screen
                    : null;
                if (!currentScreen) return;
                if (!isDigitalScreenState(currentScreen)) {
                    throw new Error('digital_screen_state_invalid');
                }

                const nextScreen: DigitalScreenState = {
                    ...currentScreen,
                    contentVersion: (currentScreen.contentVersion || 0) + 1,
                    lastContentChangeAt: Timestamp.now(),
                };
                setScreenStateInTransaction(transaction, session, nextScreen);
            });
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
    const result = await apiCallComposer(
        async () => {
            const session = requireCampaignSessionScope(await getActiveSession());

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
            const slideId = `upload-${Date.now()}-${createRandomIdSegment(9)}`;
            let imageUrl = data.url;
            let uploadedUrls: string[] = [];

            // Upload prepared media to immutable profile-aware Storage path
            if (data.blob || isDataUrl(data.url)) {
                const uploaded = await uploadPreparedMediaImageWithLedger({
                    blob: data.blob,
                    contentType: data.type,
                    dataUrl: data.url,
                    entityId: slideId,
                    mediaChecksum: data.mediaChecksum,
                    mediaId: data.mediaId,
                    prepared: data.preparedMedia,
                    profile: 'digitalScreenSlide',
                    storeId: session.sId,
                    tenantId: session.tId,
                    variant: 'full',
                });
                imageUrl = uploaded.primaryUrl;
                uploadedUrls = uploaded.uploadedUrls;
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
            try {
                const addResult = await addPinnedSlide(newSlide);
                assertDigitalScreenMutationSucceeded(
                    addResult,
                    'digital_screen_slide_upload_update_rejected',
                );
            } catch (error) {
                const cleanupResults = await Promise.all(uploadedUrls.map((url) => deleteFileByUrl(url)));
                if (cleanupResults.some((cleanup) => !cleanup.success)) {
                    logCampaignScreenFailure(
                        'digital_screen_slide_upload_cleanup_failed',
                        error,
                        {
                            uploadedVariantCount: uploadedUrls.length,
                            failedCleanupCount: cleanupResults.filter((cleanup) => !cleanup.success).length,
                        },
                    );
                }
                throw error;
            }

            return newSlide;
        },
        { caption },
        "uploadScreenSlide"
    );

    assertDigitalScreenSlideUploadSucceeded(
        result,
        'digital_screen_slide_upload_rejected',
    );
    return result;
};
