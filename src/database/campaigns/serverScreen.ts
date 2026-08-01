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
import { normalizePublicAccentColor } from "@lib/obp/accentColor";
import { normalizePublicProjectSlug } from "@lib/publicRouting/pathSegments";
import { normalizeMenuListPublicEntityIdentityAliases } from "@lib/publicTruth/entityEligibility";
import { mergeSpecialMenuOverlayProjects } from "@lib/menu/specialMenuOverlay";
import { resolveLiveSpecialMenuProject } from "@lib/menu/specialMenuRuntime";
import {
    extractScreenMenuItemsFromProject,
    normalizeCachedScreenMenuItems,
    resolveScreenNumberLocale,
} from "@lib/screen/screenContent";
import { getPrivateScreenControlDocId } from "@lib/screen/privateScreenControl";
import { isValidScreenToken } from "@lib/screen/utils";
import { secureError } from "@lib/security/secureLogger";
import {
    CampaignsSummaryDocument,
    DigitalScreenState,
    MenuItemForSlide,
    ScreenMenuProjection,
    ScreenStoreInfo,
} from "@type/campaigns";
import { getBoundedErrorName } from '@lib/monitoring/boundedLogContext';

const getLogErrorName = (error: unknown): string => getBoundedErrorName(error) || typeof error;

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
    if (!projection || !isValidFirestoreDocumentId(projection.baseProjectId)) {
        return null;
    }
    const normalizedItems = normalizeCachedScreenMenuItems(projection.items);
    if (normalizedItems.length === 0) {
        return null;
    }

    const selectedProjectSlug = normalizePublicProjectSlug(projection.baseProjectSlug);
    if (!selectedProjectSlug) {
        return null;
    }

    const expectedSpecialMenuId = params.activeSpecialMenuId || null;
    if ((projection.activeSpecialMenuId || null) !== expectedSpecialMenuId) {
        return null;
    }

    const expectedVersion = params.contentVersion;
    if (
        typeof expectedVersion !== "number"
        || !Number.isSafeInteger(expectedVersion)
        || expectedVersion <= 0
        || !Number.isSafeInteger(projection.contentVersion)
        || projection.contentVersion !== expectedVersion
    ) {
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

        let controlSnapshot = await firestoreAdmin
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .where("screenToken", "==", token)
            .limit(2)
            .get();

        let storeId = "";
        let privateControlTenantId = "";
        if (controlSnapshot.size === 1) {
            const controlDoc = controlSnapshot.docs[0];
            const controlMatch = controlDoc.id.match(/^screenControl_(\d{1,20})$/);
            const control = controlDoc.data();
            storeId = controlMatch?.[1] || "";
            privateControlTenantId = String(control.tenantId || "").trim();
            if (
                !storeId
                || control.screenToken !== token
                || String(control.storeId || "") !== storeId
                || !privateControlTenantId
            ) {
                return null;
            }
        } else if (controlSnapshot.empty) {
            // Compatibility window for token-bearing summaries that have not
            // yet been migrated by the ordered rollout/backfill.
            controlSnapshot = await firestoreAdmin
                .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
                .where("screen.screenToken", "==", token)
                .limit(2)
                .get();
            if (controlSnapshot.size !== 1) return null;
            const legacyMatch = controlSnapshot.docs[0].id.match(CAMPAIGN_SUMMARY_ID_PATTERN);
            storeId = legacyMatch?.[1] || "";
        } else {
            return null;
        }
        if (!storeId) return null;

        const screenSnap = await firestoreAdmin
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(`campaigns_${storeId}`)
            .get();
        if (!screenSnap.exists) return null;
        const data = screenSnap.data() as CampaignsSummaryDocument;
        const legacyToken = typeof data.screen?.screenToken === "string"
            ? data.screen.screenToken
            : "";
        const privateControlExists = (
            controlSnapshot.size === 1
            && controlSnapshot.docs[0].id === getPrivateScreenControlDocId(storeId)
        );
        if (
            !data.screen?.enabled
            || (!privateControlExists && legacyToken !== token)
        ) {
            return null;
        }

        const storeData = await getPublicStoreById(storeId);
        if (!storeData) return null;
        const tenantScope = normalizeMenuListPublicEntityIdentityAliases([
            storeData.tenantId,
            storeData.tId,
        ]);
        if (!tenantScope) return null;
        const tenantId = tenantScope.documentId;
        if (privateControlTenantId && privateControlTenantId !== tenantId) {
            return null;
        }

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

        const currencyCode = typeof storeData?.currencyCode === "string" && storeData.currencyCode.trim()
            ? storeData.currencyCode.trim().toUpperCase()
            : "INR";
        const storeInfo = {
            name: getStoreContextName(storeData, storeData?.businessName || "Menu"),
            logoUrl: storeData?.logo || undefined,
            menuQrUrl: getDefaultProjectUrl(
                storeData?.subdomain || storeId,
                storeData?.customDomain,
                selectedProjectSlug,
            ),
            currencyCode,
            currencySymbol: storeData?.currencySymbol || "₹",
            locale: resolveScreenNumberLocale(currencyCode, storeData?.defaultLanguage),
            accentColor: normalizePublicAccentColor(storeData?.publicPresence?.accentColor) || undefined,
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
    if (!projection) {
        return null;
    }

    const expectedBaseProjectId = params.baseProjectId;
    if (
        typeof expectedBaseProjectId !== "string"
        || !isValidFirestoreDocumentId(expectedBaseProjectId)
        || projection.baseProjectId !== expectedBaseProjectId
    ) {
        return null;
    }

    const expectedSpecialMenuId = params.activeSpecialMenuId || null;
    if ((projection.activeSpecialMenuId || null) !== expectedSpecialMenuId) {
        return null;
    }

    const expectedVersion = params.contentVersion;
    if (
        typeof expectedVersion !== "number"
        || !Number.isSafeInteger(expectedVersion)
        || expectedVersion <= 0
        || !Number.isSafeInteger(projection.contentVersion)
        || projection.contentVersion !== expectedVersion
    ) {
        return null;
    }

    const normalizedItems = normalizeCachedScreenMenuItems(projection.items);
    return normalizedItems.length > 0 ? normalizedItems : null;
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
        if (
            !storeData
            || normalizeMenuListPublicEntityIdentityAliases([
                storeData.tenantId,
                storeData.tId,
            ])?.documentId !== tenantId
        ) {
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
        const effectiveBaseProjectId = baseProjectId || orderedProjectIds[0] || null;

        if (activeSpecialMenuId) {
            const specialDoc = await getProjectDoc(activeSpecialMenuId);
            const specialProject = specialDoc?.data();
            const liveSpecialMenu = resolveLiveSpecialMenuProject(specialProject, {
                projectId: activeSpecialMenuId,
                sId: storeId,
                tId: tenantId,
            });

            if (
                liveSpecialMenu
                && effectiveBaseProjectId
                && liveSpecialMenu.metadata.baseProjectId === effectiveBaseProjectId
            ) {
                if (liveSpecialMenu.metadata.mode === "replace") {
                    // Replace mode is authoritative even when the owner has
                    // intentionally published an empty special menu.
                    return extractMenuItemsFromProject(liveSpecialMenu.project);
                }

                if (liveSpecialMenu.metadata.mode === "overlay") {
                    const overlayBaseProjectId = liveSpecialMenu.metadata.baseProjectId;
                    if (overlayBaseProjectId) {
                        const baseDoc = await getProjectDoc(overlayBaseProjectId);
                        const baseProject = baseDoc?.data();
                        if (
                            baseProject
                            && baseProject.active !== false
                            && baseProject.deleted !== true
                            && baseProject._specialMenu === undefined
                        ) {
                            const mergedItems = extractMenuItemsFromProject(
                                mergeSpecialMenuOverlayProjects(baseProject, liveSpecialMenu.project),
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
            if (
                projectData?.active === false
                || projectData?.deleted === true
                || projectData?._specialMenu !== undefined
                || projectData?.isSpecialMenu === true
            ) {
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
                if (
                    projectData?.active === false
                    || projectData?.deleted === true
                    || projectData?._specialMenu !== undefined
                    || projectData?.isSpecialMenu === true
                ) {
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
