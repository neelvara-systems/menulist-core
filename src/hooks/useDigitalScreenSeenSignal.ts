"use client";

import {
    getBoundedScreenStringContext,
    logScreenDisplayFailure,
} from "@lib/screen/screenDiagnostics";
import type { DigitalScreenDisplayMode } from "@type/campaigns";
import { useEffect } from "react";

const SCREEN_SEEN_REQUEST_POLICY = {
    cache: "no-store" as RequestCache,
    credentials: "same-origin" as RequestCredentials,
    redirect: "manual" as RequestRedirect,
};

const activeSignals = new Set<string>();
const completedSignals = new Set<string>();

export function useDigitalScreenSeenSignal(input: {
    contentVersion: number;
    diagnosticPrefix: "digital_screen_display" | "digital_screen_menuboard";
    mode: DigitalScreenDisplayMode;
    storeId: string;
    token: string;
}): void {
    const {
        contentVersion,
        diagnosticPrefix,
        mode,
        storeId,
        token,
    } = input;

    useEffect(() => {
        if (!Number.isSafeInteger(contentVersion) || contentVersion < 1) return;

        const today = new Date().toISOString().slice(0, 10);
        const marker = `screen_seen_${token}_${mode}_${contentVersion}_${today}`;
        if (completedSignals.has(marker) || activeSignals.has(marker)) return;

        try {
            if (localStorage.getItem(marker) === "1") {
                completedSignals.add(marker);
                return;
            }
        } catch (error) {
            logScreenDisplayFailure(`${diagnosticPrefix}_seen_storage_read_failed`, error, {
                contentVersion,
                mode,
                ...getBoundedScreenStringContext("token", token),
                ...getBoundedScreenStringContext("storeId", storeId),
            });
        }

        activeSignals.add(marker);
        void fetch("/api/screen/seen", {
            ...SCREEN_SEEN_REQUEST_POLICY,
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contentVersion, mode, storeId, token }),
        })
            .then((response) => {
                if (!response.ok) {
                    logScreenDisplayFailure(
                        `${diagnosticPrefix}_seen_signal_rejected`,
                        new Error("screen_seen_signal_rejected"),
                        {
                            contentVersion,
                            mode,
                            responseStatus: response.status,
                            ...getBoundedScreenStringContext("token", token),
                            ...getBoundedScreenStringContext("storeId", storeId),
                        },
                    );
                    return;
                }

                completedSignals.add(marker);
                try {
                    localStorage.setItem(marker, "1");
                } catch (error) {
                    logScreenDisplayFailure(`${diagnosticPrefix}_seen_storage_write_failed`, error, {
                        contentVersion,
                        mode,
                        ...getBoundedScreenStringContext("token", token),
                        ...getBoundedScreenStringContext("storeId", storeId),
                    });
                }
            })
            .catch((error) => {
                logScreenDisplayFailure(`${diagnosticPrefix}_seen_signal_failed`, error, {
                    contentVersion,
                    mode,
                    ...getBoundedScreenStringContext("token", token),
                    ...getBoundedScreenStringContext("storeId", storeId),
                });
            })
            .finally(() => {
                activeSignals.delete(marker);
            });
    }, [contentVersion, diagnosticPrefix, mode, storeId, token]);
}
