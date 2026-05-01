'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LuRefreshCw, LuX } from 'react-icons/lu';

const DISMISSED_BUILD_KEY = 'menulist_owner_update_dismissed_build';

type VersionResponse = {
    buildId?: string;
    shortBuildId?: string;
    buildCreatedAt?: string;
};

function getCurrentBuildId(): string {
    return process.env.NEXT_PUBLIC_BUILD_ID || 'unknown';
}

function isComparableBuildId(value?: string): value is string {
    return Boolean(value && value !== 'unknown' && value !== 'local');
}

function formatBuildTime(value?: string): string {
    if (!value || value === 'unknown') return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleString();
}

export default function OwnerAppUpdatePrompt() {
    const [serverVersion, setServerVersion] = useState<VersionResponse | null>(null);
    const [isDismissed, setIsDismissed] = useState(false);
    const isCheckingRef = useRef(false);

    const currentBuildId = getCurrentBuildId();
    const serverBuildId = serverVersion?.buildId || '';
    const hasUpdate =
        isComparableBuildId(currentBuildId) &&
        isComparableBuildId(serverBuildId) &&
        currentBuildId !== serverBuildId &&
        !isDismissed;

    const checkVersion = useCallback(async () => {
        if (isCheckingRef.current) return;
        if (!isComparableBuildId(currentBuildId)) return;
        isCheckingRef.current = true;
        try {
            const response = await fetch('/api/version', { cache: 'no-store' });
            if (!response.ok) return;
            const data = await response.json() as VersionResponse;
            if (!isComparableBuildId(data.buildId)) return;

            const dismissedBuild =
                typeof window !== 'undefined'
                    ? window.sessionStorage.getItem(DISMISSED_BUILD_KEY)
                    : null;
            setIsDismissed(dismissedBuild === data.buildId);
            setServerVersion(data);
        } catch {
            // Version checks are best-effort. Never interrupt owner workflows.
        } finally {
            isCheckingRef.current = false;
        }
    }, [currentBuildId]);

    useEffect(() => {
        void checkVersion();

        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                void checkVersion();
            }
        };
        const onOnline = () => {
            void checkVersion();
        };

        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('online', onOnline);

        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('online', onOnline);
        };
    }, [checkVersion]);

    if (!hasUpdate) return null;

    const buildTime = formatBuildTime(serverVersion?.buildCreatedAt);

    const handleDismiss = () => {
        if (serverBuildId) {
            window.sessionStorage.setItem(DISMISSED_BUILD_KEY, serverBuildId);
        }
        setIsDismissed(true);
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    return (
        <div
            aria-live="polite"
            style={{
                position: 'fixed',
                left: '50%',
                bottom: 'calc(env(safe-area-inset-bottom) + 16px)',
                transform: 'translateX(-50%)',
                zIndex: 2147483000,
                width: 'min(520px, calc(100vw - 24px))',
                borderRadius: 18,
                border: '1px solid rgba(15, 23, 42, 0.12)',
                background: '#ffffff',
                boxShadow: '0 18px 50px rgba(15, 23, 42, 0.22)',
                padding: 14,
                color: '#0f172a',
                fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                    aria-hidden="true"
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: '#0054D0',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    <LuRefreshCw size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.25 }}>
                        Update available
                    </div>
                    <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.35, marginTop: 2 }}>
                        A newer MenuList version is ready. Refresh when you are not editing.
                        {buildTime ? ` Build: ${buildTime}.` : ''}
                    </div>
                </div>
                <button
                    onClick={handleRefresh}
                    style={{
                        border: 'none',
                        borderRadius: 999,
                        background: '#0054D0',
                        color: '#ffffff',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 700,
                        minHeight: 38,
                        padding: '0 14px',
                        whiteSpace: 'nowrap',
                    }}
                    type="button"
                >
                    Refresh now
                </button>
                <button
                    aria-label="Dismiss update prompt"
                    onClick={handleDismiss}
                    style={{
                        alignItems: 'center',
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        height: 38,
                        justifyContent: 'center',
                        padding: 0,
                        width: 34,
                    }}
                    type="button"
                >
                    <LuX size={18} />
                </button>
            </div>
        </div>
    );
}
