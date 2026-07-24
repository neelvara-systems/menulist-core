"use client";

import {
    getSignalDeskWorkspace,
    runSignalDeskAction,
    setSignalDeskKillSwitch,
    type SignalDeskAction,
    type SignalDeskActionResult,
} from "@database/signaldesk";
import { getSignalDeskAuditCursor, SIGNALDESK_AUDIT_PAGE_SIZE } from "@lib/signaldesk/auditContracts";
import { getSignalDeskTargetCursor, SIGNALDESK_TARGET_PAGE_SIZE } from "@lib/signaldesk/targetContracts";
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
    const [auditHasMore, setAuditHasMore] = useState(false);
    const [auditLoadingMore, setAuditLoadingMore] = useState(false);
    const [saving, setSaving] = useState(false);
    const [targetHasMore, setTargetHasMore] = useState(false);
    const [targetLoadingMore, setTargetLoadingMore] = useState(false);
    const latestRequestRef = useRef(createSignalDeskLatestRequestCoordinator());
    const auditLoadControllerRef = useRef<AbortController | null>(null);
    const targetLoadControllerRef = useRef<AbortController | null>(null);
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
            auditLoadControllerRef.current?.abort();
            targetLoadControllerRef.current?.abort();
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
            if (canCommit()) {
                setData(nextData);
                setAuditHasMore(
                    section === "audit"
                    && nextData.workspace.auditEvents.length === SIGNALDESK_AUDIT_PAGE_SIZE,
                );
                setTargetHasMore(
                    section === "targets"
                    && nextData.workspace.targets.length === SIGNALDESK_TARGET_PAGE_SIZE,
                );
            }
        } catch (loadError) {
            if (canCommit() && !isAbortError(loadError)) {
                setError(loadError instanceof Error ? loadError.message : "SignalDesk unavailable");
            }
        } finally {
            if (canCommit()) setLoading(false);
            request.finish();
        }
    }, [section]);

    const loadOlderAuditEvents = useCallback(async () => {
        if (
            section !== "audit"
            || auditLoadingMore
            || !auditHasMore
            || data?.workspace.section !== "audit"
        ) return;
        const auditCursor = getSignalDeskAuditCursor(data.workspace.auditEvents.at(-1));
        if (!auditCursor) {
            setAuditHasMore(false);
            return;
        }
        auditLoadControllerRef.current?.abort();
        const controller = new AbortController();
        auditLoadControllerRef.current = controller;
        setAuditLoadingMore(true);
        setError(null);
        try {
            const nextData = await getSignalDeskWorkspace("audit", {
                auditCursor,
                signal: controller.signal,
            });
            if (!mountedRef.current || controller.signal.aborted || currentSectionRef.current !== "audit") return;
            setData((current) => {
                if (!current || current.workspace.section !== "audit") return current;
                const events = new Map(current.workspace.auditEvents.map((event) => [event.auditEventId, event]));
                nextData.workspace.auditEvents.forEach((event) => events.set(event.auditEventId, event));
                return {
                    ...current,
                    workspace: {
                        ...current.workspace,
                        auditEvents: Array.from(events.values()),
                    },
                };
            });
            setAuditHasMore(nextData.workspace.auditEvents.length === SIGNALDESK_AUDIT_PAGE_SIZE);
        } catch (loadError) {
            if (mountedRef.current && !isAbortError(loadError)) {
                setError(loadError instanceof Error ? loadError.message : "SignalDesk audit unavailable");
            }
        } finally {
            if (auditLoadControllerRef.current === controller) auditLoadControllerRef.current = null;
            if (mountedRef.current) setAuditLoadingMore(false);
        }
    }, [auditHasMore, auditLoadingMore, data, section]);

    const loadOlderTargets = useCallback(async () => {
        if (
            section !== "targets"
            || targetLoadingMore
            || !targetHasMore
            || data?.workspace.section !== "targets"
        ) return;
        const targetCursor = getSignalDeskTargetCursor(data.workspace.targets.at(-1));
        if (!targetCursor) {
            setTargetHasMore(false);
            return;
        }
        targetLoadControllerRef.current?.abort();
        const controller = new AbortController();
        targetLoadControllerRef.current = controller;
        setTargetLoadingMore(true);
        setError(null);
        try {
            const nextData = await getSignalDeskWorkspace("targets", {
                signal: controller.signal,
                targetCursor,
            });
            if (!mountedRef.current || controller.signal.aborted || currentSectionRef.current !== "targets") return;
            setData((current) => {
                if (!current || current.workspace.section !== "targets") return current;
                const targets = new Map(current.workspace.targets.map((target) => [target.targetId, target]));
                nextData.workspace.targets.forEach((target) => targets.set(target.targetId, target));
                return {
                    ...current,
                    workspace: {
                        ...current.workspace,
                        targets: Array.from(targets.values()),
                    },
                };
            });
            setTargetHasMore(nextData.workspace.targets.length === SIGNALDESK_TARGET_PAGE_SIZE);
        } catch (loadError) {
            if (mountedRef.current && !isAbortError(loadError)) {
                setError(loadError instanceof Error ? loadError.message : "SignalDesk targets unavailable");
            }
        } finally {
            if (targetLoadControllerRef.current === controller) targetLoadControllerRef.current = null;
            if (mountedRef.current) setTargetLoadingMore(false);
        }
    }, [data, section, targetHasMore, targetLoadingMore]);

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
        auditHasMore,
        auditLoadingMore,
        data: data?.workspace.section === section ? data : null,
        error,
        loadOlderAuditEvents,
        loadOlderTargets,
        loading,
        refresh,
        runAction,
        saving,
        targetHasMore,
        targetLoadingMore,
        updateKillSwitch,
    };
}
