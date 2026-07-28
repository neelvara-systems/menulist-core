import type { AppState } from "@reduxStore/index";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export const MODAL_PAGES_LIST = {
    ADD_WEBSITE_PAGE: "ADD_WEBSITE_PAGE",
    WEBSITE_BUILDER_ACTIONS_PAGE: "WEBSITE_BUILDER_ACTIONS_PAGE",
    WEBSITE_BUILDER_SHORTCUTS_PAGE: "WEBSITE_BUILDER_SHORTCUTS_PAGE",
    WEBSITE_BUILDER_HELP_PAGE: "WEBSITE_BUILDER_HELP_PAGE",
    WEBSITE_BUILDER_PAGE_SETTINGS: "WEBSITE_BUILDER_PAGE_SETTINGS",
    WEBSITE_BUILDER_SITE_PREVIEW: "WEBSITE_BUILDER_SITE_PREVIEW",
} as const;

export type ModalPage = typeof MODAL_PAGES_LIST[keyof typeof MODAL_PAGES_LIST];

//display any modal from anywhere
export interface ActiveModalPage {
    activeModalPage: ModalPage | null;
    modalData?: unknown;
}

const initialState: ActiveModalPage = {
    activeModalPage: null
};

export const activeModalPage = createSlice({
    name: "activeModalPage",
    initialState,
    reducers: {
        updateActiveModalPage(state, action: PayloadAction<ModalPage | null>) {
            state.activeModalPage = action.payload;
        },
    },
});

export const { updateActiveModalPage } = activeModalPage.actions;

export const getActiveModalPage = (state: AppState) => state.activeModalPage?.activeModalPage;
