'use client';

import { getActiveTempStatus } from '@lib/tempStatus/statusBoundary';
import { useEffect, useMemo, useState } from 'react';

const MAX_TIMEOUT_MS = 2_147_000_000;

export function useActiveTempStatus(value: unknown) {
    const [nowMs, setNowMs] = useState(() => Date.now());
    const activeStatus = useMemo(() => getActiveTempStatus(value, nowMs), [nowMs, value]);

    useEffect(() => {
        const expiresAtMs = activeStatus ? Date.parse(activeStatus.expiresAt) : null;
        if (expiresAtMs === null || !Number.isFinite(expiresAtMs)) return;
        const delay = Math.min(Math.max(expiresAtMs - Date.now(), 0), MAX_TIMEOUT_MS);
        const timeout = window.setTimeout(() => setNowMs(Date.now()), delay);
        return () => window.clearTimeout(timeout);
    }, [activeStatus]);

    return activeStatus;
}
