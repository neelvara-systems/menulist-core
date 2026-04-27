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
                if (result?.projectId && result?.summaryData) {
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
                } else {
                    mutate();
                }
                return { success: true, projectId: result?.projectId };
            } catch (e: any) {
                return { success: false, error: e.message };
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
                await dalUpdate(data);
                const nextStatus: SpecialMenuStatus = new Date(data.startsAt).getTime() <= Date.now()
                    ? "active"
                    : "scheduled";

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
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        },
        [mutateSpecialMenus],
    );

    const activateMenu = useCallback(
        async (projectId: string) => {
            try {
                await dalActivate(projectId);
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
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        },
        [mutateSpecialMenus],
    );

    const deactivateMenu = useCallback(
        async (projectId: string) => {
            try {
                await dalDeactivate(projectId);
                await mutateSpecialMenus((current) => ({
                    activeMenuId: current.activeMenuId === projectId ? null : current.activeMenuId,
                    specialMenus: current.specialMenus.map((menu) => (
                        menu.projectId === projectId
                            ? { ...menu, status: "expired" }
                            : menu
                    )),
                }));
                return { success: true };
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        },
        [mutateSpecialMenus],
    );

    const cancelMenu = useCallback(
        async (projectId: string) => {
            try {
                await dalCancel(projectId);
                await mutateSpecialMenus((current) => ({
                    ...current,
                    specialMenus: current.specialMenus.map((menu) => (
                        menu.projectId === projectId
                            ? { ...menu, status: "cancelled" }
                            : menu
                    )),
                }));
                return { success: true };
            } catch (e: any) {
                return { success: false, error: e.message };
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
