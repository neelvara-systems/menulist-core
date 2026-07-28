import { AppState } from "@reduxStore/index";
import { createSlice } from "@reduxjs/toolkit";

export interface Loader {
    activeRequests: number;
    requestCounts: Record<string, number>;
    requestIds: string[];
}

const initialState: Loader = {
    activeRequests: 0,
    requestCounts: {},
    requestIds: [],
};

export const loader = createSlice({
    name: "loader",
    initialState,
    reducers: {
        startLoader(state, action: { payload: string }) {
            const requestId = action.payload;
            const currentCount = state.requestCounts[requestId] || 0;
            state.requestCounts[requestId] = currentCount + 1;
            if (currentCount === 0) state.requestIds.push(requestId);
            state.activeRequests += 1;
        },
        stopLoader(state, action: { payload: string }) {
            const requestId = action.payload;
            const currentCount = state.requestCounts[requestId] || 0;
            if (currentCount <= 0) return;
            if (currentCount === 1) {
                delete state.requestCounts[requestId];
                state.requestIds = state.requestIds.filter(id => id !== requestId);
            } else {
                state.requestCounts[requestId] = currentCount - 1;
            }
            state.activeRequests = Math.max(0, state.activeRequests - 1);
        },
    },
});

export const { startLoader, stopLoader } = loader.actions;

export const getLoaderState = (state: AppState) => state.loader.activeRequests > 0;
export const getActiveRequestIds = (state: AppState) => state.loader?.requestIds;
