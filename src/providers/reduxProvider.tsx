'use client'
import { reduxStore } from "@reduxStore/index";
import React from "react";
import { Provider } from "react-redux";

type props = { children: React.ReactNode }

export function ReduxStoreProvider({ children }: props) {
    return <Provider store={reduxStore}>{children}</Provider>;
}
