/**
 * Special Menus Hook
 *
 * SWR-based hook for fetching and managing special menus.
 * Uses client-side DAL functions (same pattern as useOwnerDashboard).
 * NO API routes — all operations via client-side Firestore.
 *
 * @see __docs__/special-menu-switching/special-menu-switching_impl.md
 */

import { FEATURE_FLAGS } from "@config/features";
import {
    activateSpecialMenu as dalActivate,
    cancelSpecialMenu as dalCancel,
    createSpecialMenuProject as dalCreate,
    deactivateSpecialMenu as dalDeactivate,
    getSpecialMenus,
    updateSpecialMenuProject as dalUpdate,
} from "@database/projects";
import { getBoundedHookStringContext, logHookFailure } from "./hookDiagnostics";
import type { SpecialMenuMode, SpecialMenuStatus } from "@template/main-app/projects/types";
import { useCallback } from "react";
import useSWR from "swr";

export interface SpecialMenuListItem {
    projectId: string;
    displayName: string;
    description?: string;
    status: SpecialMenuStatus;
    mode: SpecialMenuMode;
    startsAt: string;
    endsAt: string;
    baseProjectId?: string;
}

interface SpecialMenuListResponse {
    specialMenus: SpecialMenuListItem[];
    activeMenuId: string | null;
}

function sortSpecialMenus(specialMenus: SpecialMenuListItem[]): SpecialMenuListItem[] {
    const order: Record<SpecialMenuStatus, number> = {
        active: 0,
        scheduled: 1,
        expired: 2,
        cancelled: 3,
    };

    return [...specialMenus].sort((a, b) => {
        const diff = (order[a.status] ?? 4) - (order[b.status] ?? 4);
        if (diff !== 0) return diff;
        return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    });
}

const SPECIAL_MENU_CREATE_FAILED_MESSAGE = "Could not create special menu.";
const SPECIAL_MENU_UPDATE_FAILED_MESSAGE = "Could not update special menu.";
const SPECIAL_MENU_ACTIVATE_FAILED_MESSAGE = "Could not activate special menu.";
const SPECIAL_MENU_DEACTIVATE_FAILED_MESSAGE = "Could not end special menu.";
const SPECIAL_MENU_CANCEL_FAILED_MESSAGE = "Could not cancel special menu.";

type SpecialMenuCreateResult = {
    projectId: string;
    summaryData: Record<string, any>;
};

type SpecialMenuUpdateResult = {
    projectId: string;
    status: SpecialMenuStatus;
};

const isRecord = (value: unknown): value is Record<string, any> => (
    Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

function assertSpecialMenuCreateSucceeded(result: unknown): asserts result is SpecialMenuCreateResult {
    if (
        isRecord(result)
        && typeof result.projectId === "string"
        && result.projectId.trim().length > 0
        && isRecord(result.summaryData)
    ) {
        return;
    }
    throw new Error("special_menu_create_rejected");
}

function assertSpecialMenuUpdateSucceeded(
    result: unknown,
    expectedProjectId: string,
): asserts result is SpecialMenuUpdateResult {
    if (
        isRecord(result)
        && result.projectId === expectedProjectId
        && (result.status === "active" || result.status === "scheduled")
    ) {
        return;
    }
    throw new Error("special_menu_update_rejected");
}

function assertSpecialMenuLifecycleSucceeded(
    result: unknown,
    expectedProjectId: string,
    expectedStatus: Extract<SpecialMenuStatus, "active" | "cancelled" | "expired">,
    rejectionCode: string,
): asserts result is {
    projectId: string;
    status: Extract<SpecialMenuStatus, "active" | "cancelled" | "expired">;
    success: true;
} {
    if (
        isRecord(result)
        && result.success === true
        && result.projectId === expectedProjectId
        && result.status === expectedStatus
    ) {
        return;
    }
    throw new Error(rejectionCode);
}

export interface UseSpecialMenusReturn {
    specialMenus: SpecialMenuListItem[];
    activeMenuId: string | null;
    activeMenu: SpecialMenuListItem | null;
    scheduledMenus: SpecialMenuListItem[];
    expiredMenus: SpecialMenuListItem[];
    isLoading: boolean;
    error: any;
    refresh: () => void;
    createSpecialMenu: (data: {
        allowOverlap?: boolean;
        baseProjectId: string;
        displayName: string;
        localizedDisplayName?: Record<string, string>;
        mode: SpecialMenuMode;
        startsAt: string;
        endsAt: string;
    }) => Promise<{ success: boolean; projectId?: string; error?: string }>;
    updateSpecialMenu: (data: {
        allowOverlap?: boolean;
        projectId: string;
        description?: string;
        displayName: string;
        localizedDescription?: Record<string, string>;
        localizedDisplayName?: Record<string, string>;
        startsAt: string;
        endsAt: string;
    }) => Promise<{ success: boolean; error?: string }>;
    activateMenu: (projectId: string) => Promise<{ success: boolean; error?: string }>;
    deactivateMenu: (projectId: string) => Promise<{ success: boolean; error?: string }>;
    cancelMenu: (projectId: string) => Promise<{ success: boolean; error?: string }>;
}

export function useSpecialMenus(): UseSpecialMenusReturn {
    const enabled = FEATURE_FLAGS.ENABLE_SPECIAL_MENU_SWITCHING;

    const { data, error, isLoading, mutate } = useSWR<SpecialMenuListResponse>(
        enabled ? "special-menus-list" : null,
        () => getSpecialMenus(),
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        },
    );

    const specialMenus = (data?.specialMenus || []) as SpecialMenuListItem[];
    const activeMenuId = data?.activeMenuId || null;

    const activeMenu = specialMenus.find((m) => m.status === "active") || null;
    const scheduledMenus = specialMenus.filter((m) => m.status === "scheduled");
    const expiredMenus = specialMenus.filter(
        (m) => m.status === "expired" || m.status === "cancelled",
    );

    const refresh = useCallback(() => {
        mutate();
    }, [mutate]);

    const mutateSpecialMenus = useCallback(
        async (updater: (current: SpecialMenuListResponse) => SpecialMenuListResponse) => {
            await mutate((current) => {
                if (!current) return current;
                const next = updater(current);
                return {
                    ...next,
                    specialMenus: sortSpecialMenus(next.specialMenus),
                };
            }, { revalidate: false });
        },
        [mutate],
    );

    const createSpecialMenu = useCallback(
        async (data: {
            allowOverlap?: boolean;
            baseProjectId: string;
            displayName: string;
            localizedDisplayName?: Record<string, string>;
            mode: SpecialMenuMode;
            startsAt: string;
            endsAt: string;
        }) => {
            try {
                const result = await dalCreate(data);
                assertSpecialMenuCreateSucceeded(result);
                const nextStatus = (result.summaryData.specialMenuStatus || "scheduled") as SpecialMenuStatus;
                const nextMenu: SpecialMenuListItem = {
                    projectId: result.projectId,
                    displayName: result.summaryData.specialMenuDisplayName || data.displayName,
                    description: typeof result.summaryData.description === "string"
                        ? result.summaryData.description
                        : undefined,
                    status: nextStatus,
                    mode: result.summaryData.specialMenuMode || data.mode,
                    startsAt: result.summaryData.specialMenuStartsAt || data.startsAt,
                    endsAt: result.summaryData.specialMenuEndsAt || data.endsAt,
                    baseProjectId: result.summaryData.specialMenuBaseProjectId || data.baseProjectId,
                };

                await mutateSpecialMenus((current) => ({
                    activeMenuId: nextStatus === "active" ? result.projectId : current.activeMenuId,
                    specialMenus: [
                        ...current.specialMenus.map((menu) => (
                            nextStatus === "active" && menu.status === "active"
                                ? { ...menu, status: "expired" as SpecialMenuStatus }
                                : menu
                        )),
                        nextMenu,
                    ],
                }));
                return { success: true, projectId: result?.projectId };
            } catch (error) {
                logHookFailure('special_menu_create_failed', error, {
                    ...getBoundedHookStringContext('baseProjectId', data.baseProjectId),
                    ...getBoundedHookStringContext('displayName', data.displayName),
                    ...getBoundedHookStringContext('mode', data.mode),
                    allowOverlap: Boolean(data.allowOverlap),
                    localizedNameCount: Object.keys(data.localizedDisplayName || {}).length,
                });
                return { success: false, error: SPECIAL_MENU_CREATE_FAILED_MESSAGE };
            }
        },
        [mutate, mutateSpecialMenus],
    );

    const updateSpecialMenu = useCallback(
        async (data: {
            allowOverlap?: boolean;
            projectId: string;
            description?: string;
            displayName: string;
            localizedDescription?: Record<string, string>;
            localizedDisplayName?: Record<string, string>;
            startsAt: string;
            endsAt: string;
        }) => {
            try {
                const result = await dalUpdate(data);
                assertSpecialMenuUpdateSucceeded(result, data.projectId);
                const nextStatus = result.status;

                await mutateSpecialMenus((current) => ({
                    ...current,
                    activeMenuId: nextStatus === "active"
                        ? data.projectId
                        : current.activeMenuId === data.projectId
                            ? null
                            : current.activeMenuId,
                    specialMenus: current.specialMenus.map((menu) => (
                        menu.projectId === data.projectId
                            ? {
                                ...menu,
                                description: data.description,
                                displayName: data.displayName,
                                endsAt: data.endsAt,
                                startsAt: data.startsAt,
                                status: nextStatus,
                            }
                            : nextStatus === "active" && menu.status === "active"
                                ? { ...menu, status: "expired" }
                                : menu
                    )),
                }));
                return { success: true };
            } catch (error) {
                logHookFailure('special_menu_update_failed', error, {
                    ...getBoundedHookStringContext('projectId', data.projectId),
                    ...getBoundedHookStringContext('displayName', data.displayName),
                    allowOverlap: Boolean(data.allowOverlap),
                    localizedDescriptionCount: Object.keys(data.localizedDescription || {}).length,
                    localizedNameCount: Object.keys(data.localizedDisplayName || {}).length,
                });
                return { success: false, error: SPECIAL_MENU_UPDATE_FAILED_MESSAGE };
            }
        },
        [mutateSpecialMenus],
    );

    const activateMenu = useCallback(
        async (projectId: string) => {
            try {
                const result = await dalActivate(projectId);
                assertSpecialMenuLifecycleSucceeded(result, projectId, "active", "special_menu_activate_rejected");
                await mutateSpecialMenus((current) => ({
                    activeMenuId: projectId,
                    specialMenus: current.specialMenus.map((menu) => (
                        menu.projectId === projectId
                            ? { ...menu, status: "active" }
                            : menu.status === "active"
                                ? { ...menu, status: "expired" }
                                : menu
                    )),
                }));
                return { success: true };
            } catch (error) {
                logHookFailure('special_menu_activate_failed', error, {
                    ...getBoundedHookStringContext('projectId', projectId),
                });
                return { success: false, error: SPECIAL_MENU_ACTIVATE_FAILED_MESSAGE };
            }
        },
        [mutateSpecialMenus],
    );

    const deactivateMenu = useCallback(
        async (projectId: string) => {
            try {
                const result = await dalDeactivate(projectId);
                assertSpecialMenuLifecycleSucceeded(result, projectId, "expired", "special_menu_deactivate_rejected");
                await mutateSpecialMenus((current) => ({
                    activeMenuId: current.activeMenuId === projectId ? null : current.activeMenuId,
                    specialMenus: current.specialMenus.map((menu) => (
                        menu.projectId === projectId
                            ? { ...menu, status: "expired" }
                            : menu
                    )),
                }));
                return { success: true };
            } catch (error) {
                logHookFailure('special_menu_deactivate_failed', error, {
                    ...getBoundedHookStringContext('projectId', projectId),
                });
                return { success: false, error: SPECIAL_MENU_DEACTIVATE_FAILED_MESSAGE };
            }
        },
        [mutateSpecialMenus],
    );

    const cancelMenu = useCallback(
        async (projectId: string) => {
            try {
                const result = await dalCancel(projectId);
                assertSpecialMenuLifecycleSucceeded(result, projectId, "cancelled", "special_menu_cancel_rejected");
                await mutateSpecialMenus((current) => ({
                    ...current,
                    specialMenus: current.specialMenus.map((menu) => (
                        menu.projectId === projectId
                            ? { ...menu, status: "cancelled" }
                            : menu
                    )),
                }));
                return { success: true };
            } catch (error) {
                logHookFailure('special_menu_cancel_failed', error, {
                    ...getBoundedHookStringContext('projectId', projectId),
                });
                return { success: false, error: SPECIAL_MENU_CANCEL_FAILED_MESSAGE };
            }
        },
        [mutateSpecialMenus],
    );

    return {
        specialMenus,
        activeMenuId,
        activeMenu,
        scheduledMenus,
        expiredMenus,
        isLoading,
        error,
        refresh,
        createSpecialMenu,
        updateSpecialMenu,
        activateMenu,
        deactivateMenu,
        cancelMenu,
    };
}
