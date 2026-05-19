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
                boxSizing: 'border-box',
                boxShadow: '0 18px 50px rgba(15, 23, 42, 0.22)',
                padding: 14,
                color: '#0f172a',
                fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
                <div
                    style={{
                        alignItems: 'flex-start',
                        display: 'grid',
                        gap: 12,
                        gridTemplateColumns: '44px minmax(0, 1fr) 44px',
                        width: '100%',
                    }}
                >
                    <div
                        aria-hidden="true"
                        style={{
                            alignItems: 'center',
                            background: '#0054D0',
                            borderRadius: 14,
                            color: '#ffffff',
                            display: 'flex',
                            height: 44,
                            justifyContent: 'center',
                            width: 44,
                        }}
                    >
                        <LuRefreshCw size={21} />
                    </div>
                    <div style={{ minWidth: 0, paddingTop: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.2 }}>
                            Update available
                        </div>
                        <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.35, marginTop: 4 }}>
                            A newer MenuList version is ready. Refresh when you are not editing.
                        </div>
                        {buildTime ? (
                            <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.35, marginTop: 3 }}>
                                Build: {buildTime}
                            </div>
                        ) : null}
                    </div>
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
                            height: 44,
                            justifyContent: 'center',
                            padding: 0,
                            width: 44,
                        }}
                        type="button"
                    >
                        <LuX size={19} />
                    </button>
                </div>
                <button
                    onClick={handleRefresh}
                    style={{
                        alignItems: 'center',
                        background: '#0054D0',
                        border: 'none',
                        borderRadius: 999,
                        boxSizing: 'border-box',
                        color: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        fontSize: 14,
                        fontWeight: 800,
                        justifyContent: 'center',
                        minHeight: 46,
                        padding: '0 18px',
                        width: '100%',
                    }}
                    type="button"
                >
                    Refresh now
                </button>
            </div>
        </div>
    );
}
