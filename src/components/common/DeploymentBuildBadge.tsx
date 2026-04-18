'use client';

import { DEPLOYMENT_BADGE_STORAGE_KEY, DEPLOYMENT_BADGE_TOGGLE_EVENT } from '@constant/deploymentDebug';
import { useEffect, useMemo, useState } from 'react';

function shouldShowBadge(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    const params = new URLSearchParams(window.location.search);
    const value = params.get('v');
    return value === '1' || value === 'true';
}

export default function DeploymentBuildBadge() {
    const [isVisible, setIsVisible] = useState(false);
    const [serverTimestamp, setServerTimestamp] = useState<string>('');
    const [localNow, setLocalNow] = useState<string>('');

    useEffect(() => {
        const fromUrl = shouldShowBadge();
        const fromStorage = typeof window !== 'undefined' && window.sessionStorage.getItem(DEPLOYMENT_BADGE_STORAGE_KEY) === '1';
        setIsVisible(fromUrl || fromStorage);
    }, []);

    const buildLabel = useMemo(() => {
        const buildId = process.env.NEXT_PUBLIC_BUILD_ID || 'unknown';
        const shortBuildId = buildId === 'unknown' ? buildId : buildId.slice(0, 7);
        const env = process.env.NEXT_PUBLIC_ENV || 'unknown';
        return `${shortBuildId} · ${env}`;
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const onToggle = () => {
            setIsVisible((prev) => {
                const next = !prev;
                window.sessionStorage.setItem(DEPLOYMENT_BADGE_STORAGE_KEY, next ? '1' : '0');
                return next;
            });
        };

        window.addEventListener(DEPLOYMENT_BADGE_TOGGLE_EVENT, onToggle as EventListener);
        return () => {
            window.removeEventListener(DEPLOYMENT_BADGE_TOGGLE_EVENT, onToggle as EventListener);
        };
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        let isMounted = true;
        const loadServerVersion = async () => {
            try {
                const res = await fetch('/api/version', { cache: 'no-store' });
                if (!res.ok) return;
                const data = await res.json() as { timestamp?: string };
                if (isMounted) {
                    setServerTimestamp(data?.timestamp || '');
                }
            } catch {
                if (isMounted) {
                    setServerTimestamp('');
                }
            }
        };

        void loadServerVersion();
        return () => {
            isMounted = false;
        };
    }, [isVisible]);

    useEffect(() => {
        if (!isVisible) return;
        const update = () => {
            setLocalNow(new Date().toLocaleString());
        };
        update();
        const interval = window.setInterval(update, 1000);
        return () => {
            window.clearInterval(interval);
        };
    }, [isVisible]);

    const serverTimeLabel = useMemo(() => {
        if (!serverTimestamp) return '';
        const parsed = new Date(serverTimestamp);
        if (Number.isNaN(parsed.getTime())) return serverTimestamp;
        return parsed.toLocaleString();
    }, [serverTimestamp]);

    if (process.env.NEXT_PUBLIC_ENABLE_DEPLOYMENT_BUILD_BADGE === 'false' || !isVisible) {
        return null;
    }

    return (
        <div
            aria-live="polite"
            style={{
                position: 'fixed',
                right: 12,
                bottom: 12,
                zIndex: 2147483647,
                fontSize: 11,
                lineHeight: 1.2,
                color: '#334155',
                background: 'rgba(255,255,255,0.92)',
                border: '1px solid rgba(148,163,184,0.5)',
                borderRadius: 8,
                padding: '4px 8px',
                pointerEvents: 'none',
                userSelect: 'text',
                fontFamily: 'monospace',
            }}
            title={process.env.NEXT_PUBLIC_DEPLOYMENT_URL || undefined}
        >
            <div>{buildLabel}</div>
            {serverTimeLabel ? <div>Server: {serverTimeLabel}</div> : null}
            {localNow ? <div>Now: {localNow}</div> : null}
        </div>
    );
}
