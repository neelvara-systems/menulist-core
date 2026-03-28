import { DEFAULT_DARK_COLOR, DEFAULT_LIGHT_COLOR } from "@constant/common";
import { createSlice } from "@reduxjs/toolkit";
import { AppState } from "@reduxStore/index";
import { ReactNode } from "react";

export type BreadcrumbType = { key: number, icon: any, route: string, label: string | ReactNode, onClick: any, subNav: BreadcrumbSubpathsType[] }
export type BreadcrumbSubpathsType = { key: number, icon: any, route: string, label: string | ReactNode, onClick: any, active: boolean }

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
        toggleDarkMode(state, action) {
            state.darkMode = action.payload;
        },
        updateLightThemeColor(state, action) {
            state.lightColor = action.payload;
        },
        updateDarkThemeColor(state, action) {
            state.darkColor = action.payload;
        },
        toggleSidbar(state, action) {
            state.collapsedSidebar = action.payload;
        },
        toggleHeaderPosition(state, action) {
            state.stickyHeader = action.payload;
        },
        toggleHeaderBgBlur(state, action) {
            state.headerBgBlur = action.payload;
        },
        toggleAppSettingsPanel(state, action) {
            state.showSettingsPanel = action.payload;
        },
        toggleRTLDirection(state, action) {
            state.isRTLDirection = action.payload;
        },
        toggleShowDateInHeader(state, action) {
            state.showDateInHeader = action.payload;
        },
        toggleShowUserDetailsInHeader(state, action) {
            state.showUserDetailsInHeader = action.payload;
        },
        toggleFullscreenMode(state, action) {
            state.fullscreenMode = action.payload;
        },
        toggleSidebarLayout(state, action) {
            state.verticalSidebarLayout = action.payload;
        },
        toggleBreadcrumbLayout(state, action) {
            state.verticalBreadcrumbLayout = action.payload;
        },
    }
});

const { toggleDarkMode, updateLightThemeColor, updateDarkThemeColor, toggleSidbar, toggleSidebarLayout, toggleBreadcrumbLayout, toggleAppSettingsPanel, toggleHeaderPosition, toggleHeaderBgBlur, toggleRTLDirection, toggleShowDateInHeader, toggleShowUserDetailsInHeader, toggleFullscreenMode } = clientThemeConfig.actions;
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

export { getAppSettingsPanelStatus, getBreadcrumbLayoutState, getDarkColorState, getDarkModeState, getFullscreenModeState, getHeaderBgBlurState, getHeaderPositionState, getLightColorState, getRTLDirectionState, getShowDateInHeaderState, getShowUserDetailsInHeaderState, getSidebarLayoutState, getSidebarState, toggleAppSettingsPanel, toggleBreadcrumbLayout, toggleDarkMode, toggleFullscreenMode, toggleHeaderBgBlur, toggleHeaderPosition, toggleRTLDirection, toggleShowDateInHeader, toggleShowUserDetailsInHeader, toggleSidbar, toggleSidebarLayout, updateDarkThemeColor, updateLightThemeColor };

