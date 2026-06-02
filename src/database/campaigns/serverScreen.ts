import { DB_COLLECTIONS } from "@constant/database";
import { getStoreContextName } from "@lib/businessIdentity/names";
import { firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { parseSummaryProjects } from "@lib/firestore/parseSummaryProjects";
import { getDefaultProjectUrl } from "@lib/obp/generateOBPUrl";
import {
    dedupeScreenMenuItems,
    normalizeScreenCategoryName,
    normalizeScreenImageUrl,
    normalizeScreenTags,
    parseScreenPrice,
    resolveScreenText,
} from "@lib/screen/screenContent";
import {
    CampaignsSummaryDocument,
    DigitalScreenState,
    ScreenStoreInfo,
} from "@type/campaigns";

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
        const snapshot = await firestoreAdmin
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .where("screen.screenToken", "==", token)
            .limit(1)
            .get();

        if (snapshot.empty) {
            console.log(`[getScreenDataByTokenServer] Token not found: ${token}`);
            return null;
        }

        const docSnap = snapshot.docs[0];
        const data = docSnap.data() as CampaignsSummaryDocument;
        if (!data.screen?.enabled) {
            console.log(`[getScreenDataByTokenServer] Screen disabled for token: ${token}`);
            return null;
        }

        const storeId = docSnap.id.replace("campaigns_", "");
        const storeDoc = await firestoreAdmin
            .collection(DB_COLLECTIONS.STORES)
            .doc(storeId)
            .get();
        const storeData = storeDoc.exists ? storeDoc.data() : null;

        if (storeData && (storeData.active === false || storeData.blocked === true)) {
            console.log(`[getScreenDataByTokenServer] Store inactive/blocked for token: ${token}`);
            return null;
        }

        let selectedProjectSlug: string | undefined;
        let baseProjectId: string | null = null;
        try {
            const summarySnap = await firestoreAdmin
                .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
                .doc(`projects_${storeId}`)
                .get();
            if (summarySnap.exists) {
                const projectMap = parseSummaryProjects(summarySnap.data() || {});
                const activeProjects = Object.entries(projectMap)
                    .map(([projectId, projectData]) => ({ projectId, ...(projectData || {}) }))
                    .filter((project: any) => (
                        project?.active !== false
                        && project?.deleted !== true
                        && project?.isSpecialMenu !== true
                    ));
                const fallbackProject = activeProjects.find((project: any) => project?.isDefault === true) || activeProjects[0];
                baseProjectId = fallbackProject?.projectId || null;
                selectedProjectSlug = fallbackProject?.slug;
            }
        } catch {
            // Silent fallback: alias URL still works through public routing.
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
        };

        return {
            screen: data.screen,
            today: data.today,
            storeId,
            tenantId: String(storeData?.tenantId || ""),
            baseProjectId,
            activeSpecialMenuId: storeData?.activeSpecialMenuId || null,
            storeInfo,
        };
    } catch (error) {
        console.error("[getScreenDataByTokenServer] Error:", error);
        return null;
    }
};

export const getMenuItemsForScreenServer = async (
    storeId: string,
    tenantId: string,
    activeSpecialMenuId?: string | null,
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

            if (merged.files[0]?.extractedData?.data) {
                const baseData = merged.files[0].extractedData.data;
                baseData.categories = [
                    ...(baseData.categories || []),
                    ...(specialData.categories || []).map((category: any) => ({
                        ...category,
                        _isSpecialSection: true,
                    })),
                ];
                baseData.items = [
                    ...(baseData.items || []),
                    ...(specialData.items || []).map((item: any) => ({
                        ...item,
                        _isSpecialSection: true,
                    })),
                ];
            }

            return merged;
        };

        const getProjectDoc = async (projectId: string) => {
            const projectDoc = await firestoreAdmin
                .collection(`${DB_COLLECTIONS.PROJECTS}/${tenantId}/${storeId}`)
                .doc(projectId)
                .get();
            return projectDoc.exists ? projectDoc : null;
        };

        const summarySnap = await firestoreAdmin
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(`projects_${storeId}`)
            .get();
        const projectMap = summarySnap.exists ? parseSummaryProjects(summarySnap.data() || {}) : {};
        const activeProjects = Object.entries(projectMap)
            .map(([projectId, projectData]) => ({ projectId, ...(projectData || {}) }))
            .filter((project: any) => (
                project?.active !== false
                && project?.deleted !== true
                && project?.isSpecialMenu !== true
            ));
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
                specialProject?._specialMenu?.status === "active"
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
                            const mergedItems = extractMenuItemsFromProject(mergeOverlayMenu(baseProject, specialProject));
                            if (mergedItems.length > 0) return mergedItems;
                        }
                    }
                }
            }
        }

        for (const projectId of orderedProjectIds) {
            const projectDoc = await getProjectDoc(projectId);
            if (!projectDoc) continue;

            const fallbackItems = extractMenuItemsFromProject(projectDoc.data());
            if (fallbackItems.length > 0) return fallbackItems;
        }

        return [];
    } catch (error) {
        console.error("[getMenuItemsForScreenServer] Error:", error);
        return [];
    }
};
