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
        baseProjectId: string;
        displayName: string;
        mode: SpecialMenuMode;
        startsAt: string;
        endsAt: string;
    }) => Promise<{ success: boolean; projectId?: string; error?: string }>;
    updateSpecialMenu: (data: {
        projectId: string;
        description?: string;
        displayName: string;
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

    const createSpecialMenu = useCallback(
        async (data: {
            baseProjectId: string;
            displayName: string;
            mode: SpecialMenuMode;
            startsAt: string;
            endsAt: string;
        }) => {
            try {
                const result = await dalCreate(data);
                mutate();
                return { success: true, projectId: result?.projectId };
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        },
        [mutate],
    );

    const updateSpecialMenu = useCallback(
        async (data: {
            projectId: string;
            description?: string;
            displayName: string;
            startsAt: string;
            endsAt: string;
        }) => {
            try {
                await dalUpdate(data);
                mutate();
                return { success: true };
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        },
        [mutate],
    );

    const activateMenu = useCallback(
        async (projectId: string) => {
            try {
                await dalActivate(projectId);
                mutate();
                return { success: true };
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        },
        [mutate],
    );

    const deactivateMenu = useCallback(
        async (projectId: string) => {
            try {
                await dalDeactivate(projectId);
                mutate();
                return { success: true };
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        },
        [mutate],
    );

    const cancelMenu = useCallback(
        async (projectId: string) => {
            try {
                await dalCancel(projectId);
                mutate();
                return { success: true };
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        },
        [mutate],
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
