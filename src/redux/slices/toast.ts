import { ALERT_ERROR, ALERT_INFO, ALERT_SUCCESS, ALERT_WARNING } from "@constant/alert";
import { DEFAULT_ALERT_TIME } from "@constant/defaultValues";
import { createAction, createSlice } from "@reduxjs/toolkit";
import { AppState } from "@reduxStore/index";
// import { HYDRATE } from "next-redux-wrapper";
// const HYDRATE_ACTION = createAction(HYDRATE)

export interface Toast {
    toast: { type: string, title: string, message: string, time: number };
}

const initialState: Toast = {
    toast: { type: '', title: '', message: '', time: DEFAULT_ALERT_TIME }
};

export const toast = createSlice({
    name: "toast",
    initialState,
    reducers: {
        showSuccessToast(state, action) {
            state.toast = { ...initialState.toast, type: ALERT_SUCCESS, time: DEFAULT_ALERT_TIME, message: action.payload };
        },
        showErrorToast(state, action) {
            state.toast = { ...initialState.toast, type: ALERT_ERROR, time: DEFAULT_ALERT_TIME, message: action.payload };
        },
        showWarningToast(state, action) {
            state.toast = { ...initialState.toast, type: ALERT_WARNING, time: DEFAULT_ALERT_TIME, message: action.payload };
        },
        showToast(state, action) {
            state.toast = { ...initialState.toast, type: ALERT_INFO, time: DEFAULT_ALERT_TIME, message: action.payload };
        },
        clearToast(state, action) {
            state.toast = { ...initialState.toast, type: '', title: '', message: '', time: 0 };
        },
    },
    // extraReducers: (builder) => {
    //     builder
    //         .addCase(HYDRATE_ACTION, (state, action: any) => {
    //             return {
    //                 ...state,
    //                 ...action.payload.toast,
    //             };
    //         })
    // },
});

export const { showSuccessToast, showErrorToast, showWarningToast, showToast, clearToast } = toast.actions;

export const getToastState = (state: AppState) => state.toast?.toast;
