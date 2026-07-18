'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LuRefreshCw, LuX } from 'react-icons/lu';
import { theme } from 'antd';
import { useFormatter } from 'next-intl';
import { formatDateTime } from '@util/dateTime';
import {
    DEPLOYMENT_VERSION_REQUEST_POLICY,
    readDeploymentVersionResponse,
    type DeploymentVersionResponse,
} from '@lib/deployment/versionResponse';

const DISMISSED_BUILD_KEY = 'menulist_owner_update_dismissed_build';

function getCurrentBuildId(): string {
    return process.env.NEXT_PUBLIC_BUILD_ID || 'unknown';
}

function isComparableBuildId(value?: string): value is string {
    return Boolean(value && value !== 'unknown' && value !== 'local');
}

function getDismissedBuildId(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return window.sessionStorage.getItem(DISMISSED_BUILD_KEY);
    } catch {
        return null;
    }
}

function formatBuildTime(value: string | undefined, formatter: ReturnType<typeof useFormatter>): string {
    if (!value || value === 'unknown') return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return formatDateTime(parsed, 'datetime', formatter);
}

export default function OwnerAppUpdatePrompt() {
    const { token } = theme.useToken();
    const formatter = useFormatter();
    const [serverVersion, setServerVersion] = useState<DeploymentVersionResponse | null>(null);
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
            const response = await fetch('/api/version', DEPLOYMENT_VERSION_REQUEST_POLICY);
            if (!response.ok) return;
            const data = await readDeploymentVersionResponse(response, 'owner_update_prompt');
            if (!data) return;
            if (!isComparableBuildId(data.buildId)) return;

            const dismissedBuild = getDismissedBuildId();
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

    const buildTime = formatBuildTime(serverVersion?.buildCreatedAt, formatter);

    const handleDismiss = () => {
        if (serverBuildId) {
            try {
                window.sessionStorage.setItem(DISMISSED_BUILD_KEY, serverBuildId);
            } catch {
                // Dismissal remains valid for this render when storage is unavailable.
            }
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
                border: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgElevated,
                boxSizing: 'border-box',
                boxShadow: token.boxShadowSecondary,
                padding: 14,
                color: token.colorText,
                fontFamily: token.fontFamily,
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
                            background: token.colorPrimary,
                            borderRadius: 14,
                            color: token.colorTextLightSolid,
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
                        <div style={{ color: token.colorTextSecondary, fontSize: 13, lineHeight: 1.35, marginTop: 4 }}>
                            A newer MenuList version is ready. Refresh when you are not editing.
                        </div>
                        {buildTime ? (
                            <div style={{ color: token.colorTextSecondary, fontSize: 12, lineHeight: 1.35, marginTop: 3 }}>
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
                            color: token.colorTextSecondary,
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
                        background: token.colorPrimary,
                        border: 'none',
                        borderRadius: 999,
                        boxSizing: 'border-box',
                        color: token.colorTextLightSolid,
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
