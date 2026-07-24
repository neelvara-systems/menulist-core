'use client';

import {
    parseAnswerlatticePlatformWorkspaceOptionsResponse,
    type AnswerlatticePlatformWorkspaceOption,
} from '@lib/answerlattice/platformWorkspaceOptions';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const MAX_RESPONSE_BYTES = 512 * 1024;
let latestWorkspaceOptionsRequestId = 0;

export function useAnswerlatticePlatformWorkspaceOptions(enabled: boolean) {
    const [workspaces, setWorkspaces] = useState<AnswerlatticePlatformWorkspaceOption[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<number>();
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState(false);
    const mountedRef = useRef(true);
    const enabledRef = useRef(enabled);
    enabledRef.current = enabled;

    const loadWorkspaces = useCallback(async () => {
        if (!enabled) {
            setWorkspaces([]);
            setSelectedStoreId(undefined);
            setLoading(false);
            setError(false);
            return;
        }
        const requestId = ++latestWorkspaceOptionsRequestId;
        setLoading(true);
        setError(false);
        try {
            const response = await fetch('/api/answerlattice/platform/workspaces', {
                cache: 'no-store',
                credentials: 'same-origin',
                method: 'GET',
                redirect: 'manual',
            });
            const payload = await readJsonResponseWithLimit<unknown>(response, MAX_RESPONSE_BYTES);
            if (!response.ok) throw new Error('answerlattice_platform_workspaces_request_failed');
            const nextWorkspaces = parseAnswerlatticePlatformWorkspaceOptionsResponse(payload);
            if (!mountedRef.current || !enabledRef.current || latestWorkspaceOptionsRequestId !== requestId) return;
            setWorkspaces(nextWorkspaces);
            setSelectedStoreId((current) => (
                current && nextWorkspaces.some((workspace) => workspace.sId === current)
                    ? current
                    : nextWorkspaces[0]?.sId
            ));
        } catch (loadError) {
            if (!mountedRef.current || !enabledRef.current || latestWorkspaceOptionsRequestId !== requestId) return;
            setWorkspaces([]);
            setSelectedStoreId(undefined);
            setError(true);
            logRuntimeFailure('answerlattice_platform_workspaces_load_failed', loadError);
        } finally {
            if (mountedRef.current && latestWorkspaceOptionsRequestId === requestId) {
                setLoading(false);
            }
        }
    }, [enabled]);

    useEffect(() => {
        mountedRef.current = true;
        void loadWorkspaces();
        return () => {
            mountedRef.current = false;
            latestWorkspaceOptionsRequestId += 1;
        };
    }, [loadWorkspaces]);

    const selectedWorkspace = useMemo(
        () => workspaces.find((workspace) => workspace.sId === selectedStoreId),
        [selectedStoreId, workspaces],
    );
    const selectOptions = useMemo(
        () => workspaces.map((workspace) => ({ label: workspace.label, value: workspace.sId })),
        [workspaces],
    );

    return {
        error,
        loading,
        loadWorkspaces,
        selectedStoreId,
        selectedWorkspace,
        selectOptions,
        setSelectedStoreId,
    };
}
