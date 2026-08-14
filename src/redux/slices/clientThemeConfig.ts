import { DEFAULT_DARK_COLOR, DEFAULT_LIGHT_COLOR } from "@constant/common";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AppState } from "@reduxStore/index";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";

export type BreadcrumbType = {
    key: string | number;
    icon: IconType;
    route: string;
    label: string;
    subNav: BreadcrumbSubpathsType[];
};
export type BreadcrumbSubpathsType = {
    key: string | number;
    icon: ReactNode;
    route: string;
    label: string;
    active?: boolean;
};

export type ClientThemeConfigType = {
    darkMode: boolean;
    lightColor: string;
    darkColor: string;
    collapsedSidebar: boolean;
    showSettingsPanel: boolean;
    stickyHeader: boolean,
    verticalSidebarLayout: boolean,
    verticalBreadcrumbLayout: boolean,
    headerBgBlur: boolean,
    isRTLDirection: boolean,
    showDateInHeader: boolean,
    showUserDetailsInHeader: boolean,
    fullscreenMode: boolean,
}

export type PersistedClientThemePreferences = Pick<ClientThemeConfigType,
    | "darkMode"
    | "lightColor"
    | "darkColor"
    | "collapsedSidebar"
    | "stickyHeader"
    | "verticalSidebarLayout"
    | "verticalBreadcrumbLayout"
    | "headerBgBlur"
    | "isRTLDirection"
    | "showDateInHeader"
    | "showUserDetailsInHeader"
>;

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const initialState: ClientThemeConfigType = {
    darkMode: true,
    lightColor: DEFAULT_LIGHT_COLOR,
    darkColor: DEFAULT_DARK_COLOR,
    collapsedSidebar: false,
    showSettingsPanel: false,
    stickyHeader: true,
    headerBgBlur: true,
    isRTLDirection: false,
    showDateInHeader: false,
    showUserDetailsInHeader: false,
    fullscreenMode: false,
    verticalSidebarLayout: true,
    verticalBreadcrumbLayout: true
}

export const clientThemeConfig = createSlice({
    name: "clientThemeConfig",
    initialState,
    reducers: {
        toggleDarkMode(state, action: PayloadAction<boolean>) {
            state.darkMode = action.payload;
        },
        updateLightThemeColor(state, action: PayloadAction<string>) {
            state.lightColor = action.payload;
        },
        updateDarkThemeColor(state, action: PayloadAction<string>) {
            state.darkColor = action.payload;
        },
        toggleSidbar(state, action: PayloadAction<boolean>) {
            state.collapsedSidebar = action.payload;
        },
        toggleHeaderPosition(state, action: PayloadAction<boolean>) {
            state.stickyHeader = action.payload;
        },
        toggleHeaderBgBlur(state, action: PayloadAction<boolean>) {
            state.headerBgBlur = action.payload;
        },
        toggleAppSettingsPanel(state, action: PayloadAction<boolean>) {
            state.showSettingsPanel = action.payload;
        },
        toggleRTLDirection(state, action: PayloadAction<boolean>) {
            state.isRTLDirection = action.payload;
        },
        toggleShowDateInHeader(state, action: PayloadAction<boolean>) {
            state.showDateInHeader = action.payload;
        },
        toggleShowUserDetailsInHeader(state, action: PayloadAction<boolean>) {
            state.showUserDetailsInHeader = action.payload;
        },
        toggleFullscreenMode(state, action: PayloadAction<boolean>) {
            state.fullscreenMode = action.payload;
        },
        toggleSidebarLayout(state, action: PayloadAction<boolean>) {
            state.verticalSidebarLayout = action.payload;
        },
        toggleBreadcrumbLayout(state, action: PayloadAction<boolean>) {
            state.verticalBreadcrumbLayout = action.payload;
        },
        syncPersistedClientThemePreferences(
            state,
            action: PayloadAction<Partial<PersistedClientThemePreferences>>,
        ) {
            const next = action.payload;

            if (typeof next.darkMode === "boolean") state.darkMode = next.darkMode;
            if (typeof next.collapsedSidebar === "boolean") state.collapsedSidebar = next.collapsedSidebar;
            if (typeof next.stickyHeader === "boolean") state.stickyHeader = next.stickyHeader;
            if (typeof next.verticalSidebarLayout === "boolean") state.verticalSidebarLayout = next.verticalSidebarLayout;
            if (typeof next.verticalBreadcrumbLayout === "boolean") state.verticalBreadcrumbLayout = next.verticalBreadcrumbLayout;
            if (typeof next.headerBgBlur === "boolean") state.headerBgBlur = next.headerBgBlur;
            if (typeof next.isRTLDirection === "boolean") state.isRTLDirection = next.isRTLDirection;
            if (typeof next.showDateInHeader === "boolean") state.showDateInHeader = next.showDateInHeader;
            if (typeof next.showUserDetailsInHeader === "boolean") state.showUserDetailsInHeader = next.showUserDetailsInHeader;

            if (typeof next.lightColor === "string" && HEX_COLOR.test(next.lightColor.trim())) {
                state.lightColor = next.lightColor.trim();
            }
            if (typeof next.darkColor === "string" && HEX_COLOR.test(next.darkColor.trim())) {
                state.darkColor = next.darkColor.trim();
            }
        },
    }
});

const { toggleDarkMode, updateLightThemeColor, updateDarkThemeColor, toggleSidbar, toggleSidebarLayout, toggleBreadcrumbLayout, toggleAppSettingsPanel, toggleHeaderPosition, toggleHeaderBgBlur, toggleRTLDirection, toggleShowDateInHeader, toggleShowUserDetailsInHeader, toggleFullscreenMode, syncPersistedClientThemePreferences } = clientThemeConfig.actions;
const getDarkModeState = (state: AppState) => state.clientThemeConfig?.darkMode;
const getLightColorState = (state: AppState) => state.clientThemeConfig?.lightColor;
const getDarkColorState = (state: AppState) => state.clientThemeConfig?.darkColor;
const getSidebarState = (state: AppState) => state.clientThemeConfig?.collapsedSidebar;
const getSidebarLayoutState = (state: AppState) => state.clientThemeConfig?.verticalSidebarLayout;
const getBreadcrumbLayoutState = (state: AppState) => state.clientThemeConfig?.verticalBreadcrumbLayout;
const getAppSettingsPanelStatus = (state: AppState) => state.clientThemeConfig?.showSettingsPanel;
const getHeaderPositionState = (state: AppState) => state.clientThemeConfig?.stickyHeader;
const getHeaderBgBlurState = (state: AppState) => state.clientThemeConfig?.headerBgBlur;
const getRTLDirectionState = (state: AppState) => state.clientThemeConfig?.isRTLDirection;
const getShowDateInHeaderState = (state: AppState) => state.clientThemeConfig?.showDateInHeader;
const getShowUserDetailsInHeaderState = (state: AppState) => state.clientThemeConfig?.showUserDetailsInHeader;
const getFullscreenModeState = (state: AppState) => state.clientThemeConfig?.fullscreenMode;

export { getAppSettingsPanelStatus, getBreadcrumbLayoutState, getDarkColorState, getDarkModeState, getFullscreenModeState, getHeaderBgBlurState, getHeaderPositionState, getLightColorState, getRTLDirectionState, getShowDateInHeaderState, getShowUserDetailsInHeaderState, getSidebarLayoutState, getSidebarState, syncPersistedClientThemePreferences, toggleAppSettingsPanel, toggleBreadcrumbLayout, toggleDarkMode, toggleFullscreenMode, toggleHeaderBgBlur, toggleHeaderPosition, toggleRTLDirection, toggleShowDateInHeader, toggleShowUserDetailsInHeader, toggleSidbar, toggleSidebarLayout, updateDarkThemeColor, updateLightThemeColor };
