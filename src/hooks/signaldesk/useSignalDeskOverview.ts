"use client";

import {
    getSignalDeskWorkspace,
    runSignalDeskAction,
    setSignalDeskKillSwitch,
    type SignalDeskAction,
    type SignalDeskActionResult,
} from "@database/signaldesk";
import type {
    SignalDeskAiVolumeRunSummary,
    SignalDeskContentSourceSummary,
    SignalDeskKillSwitchScope,
    SignalDeskKillSwitchStatus,
    SignalDeskSection,
    SignalDeskWorkspaceResponse,
} from "@type/signaldesk";
import { useCallback, useEffect, useRef, useState } from "react";

export type SignalDeskLatestRequest = {
    finish: () => void;
    isCurrent: () => boolean;
    signal: AbortSignal;
};

export const createSignalDeskLatestRequestCoordinator = () => {
    let activeController: AbortController | null = null;
    let disposed = false;
    let generation = 0;

    return {
        activate: () => {
            disposed = false;
        },
        dispose: () => {
            disposed = true;
            generation += 1;
            activeController?.abort();
            activeController = null;
        },
        start: (): SignalDeskLatestRequest => {
            activeController?.abort();
            const controller = new AbortController();
            const requestGeneration = ++generation;
            activeController = controller;
            return {
                finish: () => {
                    if (activeController === controller) activeController = null;
                },
                isCurrent: () => (
                    !disposed
                    && generation === requestGeneration
                    && activeController === controller
                    && !controller.signal.aborted
                ),
                signal: controller.signal,
            };
        },
    };
};

const isAbortError = (error: unknown): boolean => (
    error instanceof Error && error.name === "AbortError"
    || (
        typeof error === "object"
        && error !== null
        && "name" in error
        && error.name === "AbortError"
    )
);

export const isSignalDeskRefreshCurrentSection = (
    requestedSection: SignalDeskSection,
    currentSection: SignalDeskSection,
): boolean => requestedSection === currentSection;

export const canCommitSignalDeskRefresh = (
    requestIsCurrent: boolean,
    requestedSection: SignalDeskSection,
    currentSection: SignalDeskSection,
): boolean => (
    requestIsCurrent && isSignalDeskRefreshCurrentSection(requestedSection, currentSection)
);

export function useSignalDeskOverview(section: SignalDeskSection = "dashboard") {
    const [data, setData] = useState<SignalDeskWorkspaceResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const latestRequestRef = useRef(createSignalDeskLatestRequestCoordinator());
    const killSwitchRetryRef = useRef<{ idempotencyKey: string; requestKey: string } | null>(null);
    const mountedRef = useRef(true);
    const pendingActionCountRef = useRef(0);
    const currentSectionRef = useRef(section);
    currentSectionRef.current = section;

    useEffect(() => {
        mountedRef.current = true;
        latestRequestRef.current.activate();
        return () => {
            mountedRef.current = false;
            latestRequestRef.current.dispose();
        };
    }, []);

    const refresh = useCallback(async () => {
        if (
            !mountedRef.current
            || !isSignalDeskRefreshCurrentSection(section, currentSectionRef.current)
        ) return;
        const request = latestRequestRef.current.start();
        const canCommit = () => canCommitSignalDeskRefresh(
            request.isCurrent(),
            section,
            currentSectionRef.current,
        );
        if (canCommit()) {
            setLoading(true);
            setError(null);
        }
        try {
            const nextData = await getSignalDeskWorkspace(section, { signal: request.signal });
            if (canCommit()) setData(nextData);
        } catch (loadError) {
            if (canCommit() && !isAbortError(loadError)) {
                setError(loadError instanceof Error ? loadError.message : "SignalDesk unavailable");
            }
        } finally {
            if (canCommit()) setLoading(false);
            request.finish();
        }
    }, [section]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    type RequestedActionResult = SignalDeskAiVolumeRunSummary | SignalDeskContentSourceSummary | undefined;
    const runAction = useCallback(async <
        RequestedResult extends RequestedActionResult = undefined,
        Action extends SignalDeskAction = RequestedResult extends SignalDeskAiVolumeRunSummary
            ? "run-ai-volume-batch"
            : RequestedResult extends SignalDeskContentSourceSummary
                ? "upsert-content-source"
                : SignalDeskAction,
    >(
        action: Action,
        payload?: unknown,
    ): Promise<SignalDeskActionResult<Action> | null> => {
        pendingActionCountRef.current += 1;
        if (mountedRef.current) {
            setSaving(true);
            setError(null);
        }
        try {
            const result = await runSignalDeskAction(action, payload);
            await refresh();
            return result;
        } catch (saveError) {
            if (mountedRef.current) {
                setError(saveError instanceof Error ? saveError.message : "SignalDesk action failed");
            }
            return null;
        } finally {
            pendingActionCountRef.current = Math.max(0, pendingActionCountRef.current - 1);
            if (mountedRef.current) setSaving(pendingActionCountRef.current > 0);
        }
    }, [refresh]);

    const updateKillSwitch = useCallback(async (input: {
        reason: string;
        scope: SignalDeskKillSwitchScope;
        status: SignalDeskKillSwitchStatus;
    }) => {
        const requestKey = JSON.stringify({
            reason: input.reason.trim(),
            scope: input.scope,
            status: input.status,
        });
        const retry = killSwitchRetryRef.current?.requestKey === requestKey
            ? killSwitchRetryRef.current
            : { idempotencyKey: globalThis.crypto.randomUUID(), requestKey };
        killSwitchRetryRef.current = retry;
        pendingActionCountRef.current += 1;
        if (mountedRef.current) {
            setSaving(true);
            setError(null);
        }
        try {
            await setSignalDeskKillSwitch({ ...input, idempotencyKey: retry.idempotencyKey });
            await refresh();
            if (killSwitchRetryRef.current?.idempotencyKey === retry.idempotencyKey) {
                killSwitchRetryRef.current = null;
            }
        } catch (saveError) {
            if (mountedRef.current) {
                setError(saveError instanceof Error ? saveError.message : "SignalDesk update failed");
            }
        } finally {
            pendingActionCountRef.current = Math.max(0, pendingActionCountRef.current - 1);
            if (mountedRef.current) setSaving(pendingActionCountRef.current > 0);
        }
    }, [refresh]);

    return {
        data: data?.workspace.section === section ? data : null,
        error,
        loading,
        refresh,
        runAction,
        saving,
        updateKillSwitch,
    };
}
