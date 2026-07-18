import { DB_COLLECTIONS } from "@constant/database";
import { doc, runTransaction, Timestamp, type Transaction } from "@firebase/firestore";
import { FEATURE_FLAGS } from "@config/features";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import {
    isActiveRegularSummaryProject,
    isDefaultSummaryProject,
    parseSummaryProjects,
    withAuthoritativeSummaryProjectId,
} from "@lib/firestore/parseSummaryProjects";
import { extractScreenMenuItemsFromProject } from "@lib/screen/screenContent";
import { getPublicScreenStateDocRef, toPublicScreenState } from "@lib/screen/publicScreenState";
import { secureError } from "@lib/security/secureLogger";
import type { ScreenMenuProjection } from "@type/campaigns";

type ScreenContentTouchOptions = {
    projectId?: string | number | null;
};

type PendingScreenContentTouch = {
    context: string;
    options: ScreenContentTouchOptions;
    promise: Promise<void>;
    rerunRequested: boolean;
};

const pendingScreenTouches = new Map<string, PendingScreenContentTouch>();

const getLogErrorName = (error: unknown): string => (
    error instanceof Error ? error.name : typeof error
);

const logScreenInvalidationFailure = (
    failureCode: string,
    error: unknown,
    context: string,
    storeId: string,
    options: ScreenContentTouchOptions = {},
): void => {
    if (process.env.NODE_ENV === "production") {
        return;
    }

    const projectId = String(options.projectId ?? "").trim();
    secureError(
        "[Digital Screen] Invalidation failed",
        new Error(failureCode),
        {
            contextPresent: Boolean(String(context || "").trim()),
            contextLength: String(context || "").length,
            storeIdLength: storeId.length,
            hasProjectId: Boolean(projectId),
            projectIdLength: projectId.length,
            errorName: getLogErrorName(error),
        },
    );
};

const parseProjectPath = (projectId?: string | number | null) => {
    const value = String(projectId ?? "").trim();
    if (!value) return null;

    const parts = value.split("-").filter(Boolean);
    if (parts.length < 3) return null;

    return {
        projectId: value,
        tenantId: parts[0],
        storeId: parts[parts.length - 1],
    };
};

const buildScreenMenuProjectionInTransaction = async (
    transaction: Transaction,
    projectId: string | number | null | undefined,
    contentVersion: number,
    expectedStoreId: string,
): Promise<ScreenMenuProjection | null> => {
    const path = parseProjectPath(projectId);
    if (!path || !contentVersion) return null;
    if (path.storeId !== expectedStoreId) return null;

    const summaryRef = doc(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, `projects_${path.storeId}`);
    const summarySnap = await transaction.get(summaryRef);
    if (!summarySnap.exists()) return null;

    const projectMap = parseSummaryProjects(summarySnap.data() || {});
    const activeProjects = Object.entries(projectMap)
        .map(([summaryProjectId, projectData]) => withAuthoritativeSummaryProjectId(summaryProjectId, projectData))
        .filter(isActiveRegularSummaryProject);
    const baseProject = activeProjects.find(isDefaultSummaryProject) || activeProjects[0];
    const baseProjectId = baseProject?.projectId;
    if (!baseProjectId) return null;
    const baseProjectSlug = typeof baseProject?.slug === "string" && baseProject.slug.trim()
        ? baseProject.slug.trim()
        : undefined;

    const projectRef = doc(
        firebaseClient,
        `${DB_COLLECTIONS.PROJECTS}/${path.tenantId}/${path.storeId}`,
        baseProjectId,
    );
    const projectSnap = await transaction.get(projectRef);
    if (!projectSnap.exists()) return null;

    const projectData = projectSnap.data();
    if (
        projectData?.active === false
        || projectData?.deleted === true
        || projectData?.isSpecialMenu === true
        || projectData?._specialMenu
    ) {
        return null;
    }

    const items = extractScreenMenuItemsFromProject(projectData)
        .filter((item) => item.available !== false);
    if (items.length === 0) return null;

    return {
        items,
        baseProjectId,
        ...(baseProjectSlug ? { baseProjectSlug } : {}),
        activeSpecialMenuId: null,
        contentVersion,
        updatedAt: Timestamp.now(),
    };
};

const executeDigitalScreenContentVersionTouch = async (
    normalizedStoreId: string,
    context: string,
    options: ScreenContentTouchOptions = {},
): Promise<void> => {
    try {
        const screenRef = doc(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, `campaigns_${normalizedStoreId}`);
        const publicScreenRef = getPublicScreenStateDocRef(normalizedStoreId);

        await runTransaction(firebaseClient, async (transaction) => {
            const screenSnap = await transaction.get(screenRef);
            const screen = screenSnap.exists() ? screenSnap.data()?.screen : null;

            if (!screen?.screenToken) {
                return;
            }

            const nextContentVersion = Number(screen.contentVersion || 0) + 1;
            const now = Timestamp.now();
            const nextScreen = {
                ...screen,
                contentVersion: nextContentVersion,
                lastContentChangeAt: now,
            };
            const publicState = toPublicScreenState(normalizedStoreId, nextScreen);
            if (!publicState) {
                throw new Error("digital_screen_public_state_invalid");
            }

            const menuProjection = await buildScreenMenuProjectionInTransaction(
                transaction,
                options.projectId,
                nextContentVersion,
                normalizedStoreId,
            ).catch((error) => {
                logScreenInvalidationFailure(
                    "digital_screen_projection_build_failed",
                    error,
                    context,
                    normalizedStoreId,
                    options,
                );
                return null;
            });

            transaction.update(screenRef, {
                "screen.contentVersion": nextContentVersion,
                "screen.lastContentChangeAt": now,
                ...(menuProjection ? { "screen.menuProjection": menuProjection } : {}),
            });
            transaction.set(publicScreenRef, publicState, { merge: false });
        });
    } catch (error) {
        logScreenInvalidationFailure(
            "digital_screen_content_version_touch_failed",
            error,
            context,
            normalizedStoreId,
            options,
        );
    }
};

export const touchDigitalScreenContentVersion = async (
    storeId?: string | number | null,
    context = "screenInvalidation",
    options: ScreenContentTouchOptions = {},
): Promise<void> => {
    const normalizedStoreId = String(storeId ?? "").trim();
    if (!FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED || !normalizedStoreId || typeof window === "undefined") {
        return;
    }

    const pending = pendingScreenTouches.get(normalizedStoreId);
    if (pending) {
        pending.rerunRequested = true;
        pending.context = context;
        pending.options = options;
        return pending.promise;
    }

    const entry: PendingScreenContentTouch = {
        context,
        options,
        promise: Promise.resolve(),
        rerunRequested: false,
    };

    entry.promise = (async () => {
        try {
            do {
                const iterationContext = entry.context;
                const iterationOptions = entry.options;
                entry.rerunRequested = false;
                await executeDigitalScreenContentVersionTouch(
                    normalizedStoreId,
                    iterationContext,
                    iterationOptions,
                );
            } while (entry.rerunRequested);
        } finally {
            if (pendingScreenTouches.get(normalizedStoreId) === entry) {
                pendingScreenTouches.delete(normalizedStoreId);
            }
        }
    })();

    pendingScreenTouches.set(normalizedStoreId, entry);
    return entry.promise;
};
