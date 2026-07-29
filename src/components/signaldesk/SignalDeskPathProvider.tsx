"use client";

import {
    SIGNALDESK_BASE_PATH,
    SIGNALDESK_SHORT_ALIAS_PATH,
} from "@constant/signaldesk/routes";
import { createContext, useContext, useMemo } from "react";

const SignalDeskPathContext = createContext(SIGNALDESK_BASE_PATH);

const normalizeBasePath = (basePath?: string | null): string => {
    if (basePath === SIGNALDESK_SHORT_ALIAS_PATH) return basePath;
    return SIGNALDESK_BASE_PATH;
};

export const withSignalDeskBasePath = (href: string, basePath?: string | null): string => {
    const normalizedBasePath = normalizeBasePath(basePath);
    if (!href.startsWith(SIGNALDESK_BASE_PATH)) return href;
    if (normalizedBasePath === SIGNALDESK_BASE_PATH) return href;

    const suffix = href.slice(SIGNALDESK_BASE_PATH.length);
    return `${normalizedBasePath}${suffix || ""}`;
};

export const useSignalDeskPath = (href: string): string => {
    const basePath = useContext(SignalDeskPathContext);
    return useMemo(() => withSignalDeskBasePath(href, basePath), [basePath, href]);
};

export const useSignalDeskBasePath = (): string => useContext(SignalDeskPathContext);

interface SignalDeskPathProviderProps {
    basePath?: string | null;
    children: React.ReactNode;
}

export default function SignalDeskPathProvider({
    basePath,
    children,
}: SignalDeskPathProviderProps) {
    return (
        <SignalDeskPathContext.Provider value={normalizeBasePath(basePath)}>
            {children}
        </SignalDeskPathContext.Provider>
    );
}
