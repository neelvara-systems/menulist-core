import { AppState } from "@reduxStore/index";
import { createSlice } from "@reduxjs/toolkit";

export interface Loader {
    activeRequests: number;
    requestIds: string[];
}

const initialState: Loader = {
    activeRequests: 0,
    requestIds: [],
};

export const loader = createSlice({
    name: "loader",
    initialState,
    reducers: {
        startLoader(state, action: { payload: string }) {
            state.activeRequests += 1;
            state.requestIds.push(action.payload);
        },
        stopLoader(state, action: { payload: string }) {
            state.activeRequests = Math.max(0, state.activeRequests - 1);
            state.requestIds = state.requestIds.filter(id => id !== action.payload);
        },
    },
});

export const { startLoader, stopLoader } = loader.actions;

export const getLoaderState = (state: AppState) => state.loader.activeRequests > 0;
export const getActiveRequestIds = (state: AppState) => state.loader?.requestIds;