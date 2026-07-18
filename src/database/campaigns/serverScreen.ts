import { DB_COLLECTIONS } from "@constant/database";
import { getStoreContextName } from "@lib/businessIdentity/names";
import { firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { getPublicStoreById } from "@lib/firestore/clientStoreLookup";
import {
    isActiveRegularSummaryProject,
    isDefaultSummaryProject,
    parseSummaryProjects,
    withAuthoritativeSummaryProjectId,
} from "@lib/firestore/parseSummaryProjects";
import { getDefaultProjectUrl } from "@lib/obp/generateOBPUrl";
import { normalizePublicProjectSlug } from "@lib/publicRouting/pathSegments";
import { mergeSpecialMenuOverlayProjects } from "@lib/menu/specialMenuOverlay";
import { extractScreenMenuItemsFromProject } from "@lib/screen/screenContent";
import { isValidScreenToken } from "@lib/screen/utils";
import { secureError } from "@lib/security/secureLogger";
import {
    CampaignsSummaryDocument,
    DigitalScreenState,
    MenuItemForSlide,
    ScreenMenuProjection,
    ScreenStoreInfo,
} from "@type/campaigns";

const getLogErrorName = (error: unknown): string => (
    error instanceof Error ? error.name : typeof error
);

const CAMPAIGN_SUMMARY_ID_PATTERN = /^campaigns_(\d+)$/;
const NUMERIC_SCOPE_ID_PATTERN = /^\d+$/;

const logServerScreenFailure = (
    failureCode: string,
    error: unknown,
    context: Record<string, unknown> = {},
): void => {
    secureError(
        "[Digital Screen] Server resolver failed",
        new Error(failureCode),
        {
            ...context,
            errorName: getLogErrorName(error),
        },
    );
};

const getUsableScreenProjectionContext = (
    projection: ScreenMenuProjection | null | undefined,
    params: {
        activeSpecialMenuId?: string | null;
        contentVersion?: number | null;
    },
): { baseProjectId: string; selectedProjectSlug: string } | null => {
    if (!projection || !Array.isArray(projection.items) || projection.items.length === 0) {
        return null;
    }

    if (!projection.baseProjectId) {
        return null;
    }

    const selectedProjectSlug = typeof projection.baseProjectSlug === "string" && projection.baseProjectSlug.trim()
        ? projection.baseProjectSlug.trim()
        : null;
    if (!selectedProjectSlug) {
        return null;
    }

    const expectedSpecialMenuId = params.activeSpecialMenuId || null;
    if ((projection.activeSpecialMenuId || null) !== expectedSpecialMenuId) {
        return null;
    }

    const expectedVersion = Number(params.contentVersion || 0);
    if (!expectedVersion || Number(projection.contentVersion || 0) !== expectedVersion) {
        return null;
    }

    return {
        baseProjectId: projection.baseProjectId,
        selectedProjectSlug,
    };
};

export const getScreenDataByTokenServer = async (token: string): Promise<{
    screen: DigitalScreenState;
    today: CampaignsSummaryDocument["today"];
    storeId: string;
    tenantId: string;
    baseProjectId: string | null;
    activeSpecialMenuId: string | null;
    storeInfo: ScreenStoreInfo;
} | null> => {
    try {
        if (!isValidScreenToken(token)) return null;

        const snapshot = await firestoreAdmin
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .where("screen.screenToken", "==", token)
            .limit(2)
            .get();

        if (snapshot.size !== 1) return null;

        const docSnap = snapshot.docs[0];
        const data = docSnap.data() as CampaignsSummaryDocument;
        if (!data.screen?.enabled || data.screen.screenToken !== token) return null;

        const summaryIdMatch = docSnap.id.match(CAMPAIGN_SUMMARY_ID_PATTERN);
        const storeId = summaryIdMatch?.[1] || '';
        if (!storeId) return null;

        const storeData = await getPublicStoreById(storeId);
        if (!storeData) return null;
        const tenantId = String(storeData.tenantId ?? storeData.tId ?? '');
        if (!NUMERIC_SCOPE_ID_PATTERN.test(tenantId)) return null;

        const activeSpecialMenuId = storeData?.activeSpecialMenuId || null;
        const projectionContext = getUsableScreenProjectionContext(data.screen?.menuProjection, {
            activeSpecialMenuId,
            contentVersion: data.screen?.contentVersion,
        });

        let selectedProjectSlug = projectionContext?.selectedProjectSlug;
        let baseProjectId: string | null = projectionContext?.baseProjectId || null;
        if (!projectionContext) {
            try {
                const summarySnap = await firestoreAdmin
                    .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
                    .doc(`projects_${storeId}`)
                    .get();
                if (summarySnap.exists) {
                    const projectMap = parseSummaryProjects(summarySnap.data() || {});
                    const activeProjects = Object.entries(projectMap)
                        .map(([projectId, projectData]) => withAuthoritativeSummaryProjectId(projectId, projectData))
                        .filter(isActiveRegularSummaryProject);
                    const fallbackProject = activeProjects.find(isDefaultSummaryProject) || activeProjects[0];
                    baseProjectId = fallbackProject?.projectId || null;
                    selectedProjectSlug = normalizePublicProjectSlug(fallbackProject?.slug) || undefined;
                }
            } catch (error) {
                logServerScreenFailure(
                    "digital_screen_server_project_summary_failed",
                    error,
                    { storeIdLength: storeId.length },
                );
            }
        }

        const storeInfo = {
            name: getStoreContextName(storeData, storeData?.businessName || "Menu"),
            logoUrl: storeData?.logo || undefined,
            menuQrUrl: getDefaultProjectUrl(
                storeData?.subdomain || storeId,
                storeData?.customDomain,
                selectedProjectSlug,
            ),
            currencySymbol: storeData?.currencySymbol || "₹",
            activePlanType: storeData?.activePlanType || null,
        };

        return {
            screen: data.screen,
            today: data.today,
            storeId,
            tenantId,
            baseProjectId,
            activeSpecialMenuId,
            storeInfo,
        };
    } catch (error) {
        logServerScreenFailure(
            "digital_screen_server_token_resolver_failed",
            error,
            {
                tokenLength: token.length,
            },
        );
        return null;
    }
};

export const getUsableScreenMenuProjection = (
    projection: ScreenMenuProjection | null | undefined,
    params: {
        baseProjectId?: string | null;
        activeSpecialMenuId?: string | null;
        contentVersion?: number | null;
    },
) => {
    if (!projection || !Array.isArray(projection.items) || projection.items.length === 0) {
        return null;
    }

    const expectedBaseProjectId = String(params.baseProjectId || "");
    if (!expectedBaseProjectId || projection.baseProjectId !== expectedBaseProjectId) {
        return null;
    }

    const expectedSpecialMenuId = params.activeSpecialMenuId || null;
    if ((projection.activeSpecialMenuId || null) !== expectedSpecialMenuId) {
        return null;
    }

    const expectedVersion = Number(params.contentVersion || 0);
    if (!expectedVersion || Number(projection.contentVersion || 0) !== expectedVersion) {
        return null;
    }

    return projection.items;
};

export const getMenuItemsForScreenServer = async (
    storeId: string,
    tenantId: string,
    activeSpecialMenuId?: string | null,
    baseProjectId?: string | null,
): Promise<MenuItemForSlide[]> => {
    try {
        if (
            !NUMERIC_SCOPE_ID_PATTERN.test(storeId)
            || !NUMERIC_SCOPE_ID_PATTERN.test(tenantId)
        ) {
            return [];
        }

        const storeData = await getPublicStoreById(storeId);
        if (!storeData || String(storeData.tenantId ?? storeData.tId ?? '') !== tenantId) {
            return [];
        }
        const eligibleSpecialMenuId = String(storeData.activeSpecialMenuId || '') || null;
        if ((activeSpecialMenuId || null) !== eligibleSpecialMenuId) return [];
        if (baseProjectId && !isValidFirestoreDocumentId(baseProjectId)) return [];

        const extractMenuItemsFromProject = extractScreenMenuItemsFromProject;

        const getProjectDoc = async (projectId: string) => {
            if (!isValidFirestoreDocumentId(projectId)) return null;
            const projectDoc = await firestoreAdmin
                .collection(`${DB_COLLECTIONS.PROJECTS}/${tenantId}/${storeId}`)
                .doc(projectId)
                .get();
            return projectDoc.exists ? projectDoc : null;
        };

        let loadedOrderedProjectIds: string[] | null = null;
        const loadOrderedProjectIds = async () => {
            if (loadedOrderedProjectIds) return loadedOrderedProjectIds;

            const summarySnap = await firestoreAdmin
                .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
                .doc(`projects_${storeId}`)
                .get();
            const projectMap = summarySnap.exists ? parseSummaryProjects(summarySnap.data() || {}) : {};
            const activeProjects = Object.entries(projectMap)
                .map(([projectId, projectData]) => withAuthoritativeSummaryProjectId(projectId, projectData))
                .filter(isActiveRegularSummaryProject);
            const defaultProjectId = activeProjects.find(isDefaultSummaryProject)?.projectId;
            loadedOrderedProjectIds = [
                ...(defaultProjectId ? [defaultProjectId] : []),
                ...activeProjects
                    .map((project) => project.projectId)
                    .filter((projectId, index, allProjectIds) => allProjectIds.indexOf(projectId) === index),
            ];
            return loadedOrderedProjectIds;
        };

        const orderedProjectIds = baseProjectId ? [baseProjectId] : await loadOrderedProjectIds();

        if (activeSpecialMenuId) {
            const specialDoc = await getProjectDoc(activeSpecialMenuId);
            const specialProject = specialDoc?.data();
            const specialEndsAt = specialProject?._specialMenu?.endsAt
                ? new Date(specialProject._specialMenu.endsAt).getTime()
                : null;

            if (
                specialProject?.active !== false
                && specialProject?.deleted !== true
                && specialProject?.isSpecialMenu === true
                && specialProject?._specialMenu?.status === "active"
                && specialEndsAt != null
                && Number.isFinite(specialEndsAt)
                && specialEndsAt > Date.now()
            ) {
                if (specialProject._specialMenu.mode === "replace") {
                    const specialItems = extractMenuItemsFromProject(specialProject);
                    if (specialItems.length > 0) return specialItems;
                }

                if (specialProject._specialMenu.mode === "overlay") {
                    const baseProjectId = specialProject._specialMenu.baseProjectId || orderedProjectIds[0];
                    if (baseProjectId) {
                        const baseDoc = await getProjectDoc(baseProjectId);
                        const baseProject = baseDoc?.data();
                        if (baseProject) {
                            const mergedItems = extractMenuItemsFromProject(
                                mergeSpecialMenuOverlayProjects(baseProject, specialProject),
                            );
                            if (mergedItems.length > 0) return mergedItems;
                        }
                    }
                }
            }
        }

        for (const projectId of orderedProjectIds) {
            const projectDoc = await getProjectDoc(projectId);
            if (!projectDoc) continue;

            const projectData = projectDoc.data();
            if (projectData?.active === false || projectData?.deleted === true || projectData?.isSpecialMenu === true) {
                continue;
            }

            const fallbackItems = extractMenuItemsFromProject(projectData);
            if (fallbackItems.length > 0) return fallbackItems;
        }

        if (baseProjectId) {
            const fallbackProjectIds = (await loadOrderedProjectIds()).filter((projectId) => projectId !== baseProjectId);
            for (const projectId of fallbackProjectIds) {
                const projectDoc = await getProjectDoc(projectId);
                if (!projectDoc) continue;

                const projectData = projectDoc.data();
                if (projectData?.active === false || projectData?.deleted === true || projectData?.isSpecialMenu === true) {
                    continue;
                }

                const fallbackItems = extractMenuItemsFromProject(projectData);
                if (fallbackItems.length > 0) return fallbackItems;
            }
        }

        return [];
    } catch (error) {
        logServerScreenFailure(
            "digital_screen_server_menu_items_failed",
            error,
            {
                storeIdLength: storeId.length,
                tenantIdLength: tenantId.length,
                hasActiveSpecialMenuId: Boolean(activeSpecialMenuId),
                activeSpecialMenuIdLength: String(activeSpecialMenuId || "").length,
                hasBaseProjectId: Boolean(baseProjectId),
                baseProjectIdLength: String(baseProjectId || "").length,
            },
        );
        return [];
    }
};
