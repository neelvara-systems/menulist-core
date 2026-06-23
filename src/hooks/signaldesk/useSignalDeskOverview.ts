"use client";

import { getSignalDeskWorkspace, runSignalDeskAction, setSignalDeskKillSwitch, type SignalDeskAction } from "@database/signaldesk";
import type {
    SignalDeskKillSwitchScope,
    SignalDeskKillSwitchStatus,
    SignalDeskSection,
    SignalDeskWorkspaceResponse,
} from "@type/signaldesk";
import { useCallback, useEffect, useState } from "react";

export function useSignalDeskOverview(section: SignalDeskSection = "dashboard") {
    const [data, setData] = useState<SignalDeskWorkspaceResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setData(await getSignalDeskWorkspace(section));
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "SignalDesk unavailable");
        } finally {
            setLoading(false);
        }
    }, [section]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const runAction = useCallback(async <T = unknown>(action: SignalDeskAction, payload?: unknown) => {
        setSaving(true);
        setError(null);
        try {
            const result = await runSignalDeskAction<T>(action, payload);
            await refresh();
            return result;
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "SignalDesk action failed");
            return null;
        } finally {
            setSaving(false);
        }
    }, [refresh]);

    const updateKillSwitch = useCallback(async (input: {
        reason: string;
        scope: SignalDeskKillSwitchScope;
        status: SignalDeskKillSwitchStatus;
    }) => {
        setSaving(true);
        setError(null);
        try {
            await setSignalDeskKillSwitch(input);
            await refresh();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "SignalDesk update failed");
        } finally {
            setSaving(false);
        }
    }, [refresh]);

    return {
        data,
        error,
        loading,
        refresh,
        runAction,
        saving,
        updateKillSwitch,
    };
}
