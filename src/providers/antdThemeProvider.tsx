'use client';

import AntdClient from "@lib/antd/antdClient";
import Loader from "@organisms/loader";
import Toast from "@organisms/toast";
import type { PropsWithChildren } from "react";

const AntdThemeProvider = ({ children }: PropsWithChildren) => {
    return (
        <AntdClient>
            <Toast />
            <Loader />
            {children}
        </AntdClient>
    );
};

export default AntdThemeProvider;
