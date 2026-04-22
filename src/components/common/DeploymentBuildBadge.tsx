'use client';

import {
    DEPLOYMENT_BADGE_STORAGE_KEY,
    DEPLOYMENT_BADGE_TOGGLE_EVENT,
    DEPLOYMENT_IDENTITY_EVENT,
    DEPLOYMENT_IDENTITY_STORAGE_KEY,
} from '@constant/deploymentDebug';
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
    const [buildCreatedAt, setBuildCreatedAt] = useState<string>('');
    const [tenantId, setTenantId] = useState<string>('');
    const [tenantName, setTenantName] = useState<string>('');
    const [storeId, setStoreId] = useState<string>('');
    const [storeName, setStoreName] = useState<string>('');

    const loadIdentityFromStorage = () => {
        if (typeof window === 'undefined') return;
        try {
            const raw = window.sessionStorage.getItem(DEPLOYMENT_IDENTITY_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as {
                tenantId?: string | number | null;
                tenantName?: string;
                storeId?: string | number | null;
                storeName?: string;
            };
            setTenantId(parsed?.tenantId === null || parsed?.tenantId === undefined ? '' : String(parsed.tenantId));
            setTenantName(parsed?.tenantName || '');
            setStoreId(parsed?.storeId === null || parsed?.storeId === undefined ? '' : String(parsed.storeId));
            setStoreName(parsed?.storeName || '');
        } catch {
            setTenantId('');
            setTenantName('');
            setStoreId('');
            setStoreName('');
        }
    };

    useEffect(() => {
        const fromUrl = shouldShowBadge();
        const fromStorage = typeof window !== 'undefined' && window.sessionStorage.getItem(DEPLOYMENT_BADGE_STORAGE_KEY) === '1';
        setIsVisible(fromUrl || fromStorage);
        loadIdentityFromStorage();
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
        const onIdentityUpdated = () => {
            loadIdentityFromStorage();
        };

        window.addEventListener(DEPLOYMENT_BADGE_TOGGLE_EVENT, onToggle as EventListener);
        window.addEventListener(DEPLOYMENT_IDENTITY_EVENT, onIdentityUpdated as EventListener);
        return () => {
            window.removeEventListener(DEPLOYMENT_BADGE_TOGGLE_EVENT, onToggle as EventListener);
            window.removeEventListener(DEPLOYMENT_IDENTITY_EVENT, onIdentityUpdated as EventListener);
        };
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        let isMounted = true;
        const loadServerVersion = async () => {
            try {
                const res = await fetch('/api/version', { cache: 'no-store' });
                if (!res.ok) return;
                const data = await res.json() as { buildCreatedAt?: string };
                if (isMounted) {
                    setBuildCreatedAt(data?.buildCreatedAt || '');
                }
            } catch {
                if (isMounted) {
                    setBuildCreatedAt('');
                }
            }
        };

        loadIdentityFromStorage();
        void loadServerVersion();
        return () => {
            isMounted = false;
        };
    }, [isVisible]);

    const buildCreatedAtLabel = useMemo(() => {
        if (!buildCreatedAt || buildCreatedAt === 'unknown') return '';
        const parsed = new Date(buildCreatedAt);
        if (Number.isNaN(parsed.getTime())) return buildCreatedAt;
        return parsed.toLocaleString();
    }, [buildCreatedAt]);

    if (process.env.NEXT_PUBLIC_ENABLE_DEPLOYMENT_BUILD_BADGE === 'false' || !isVisible) {
        return null;
    }

    return (
        <div
            aria-live="polite"
            style={{
                position: 'fixed',
                left: '50%',
                top: 'calc(env(safe-area-inset-top) + 8px)',
                transform: 'translateX(-50%)',
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
                textAlign: 'center',
                maxWidth: 'calc(100vw - 16px)',
            }}
            title={process.env.NEXT_PUBLIC_DEPLOYMENT_URL || undefined}
        >
            <div>{buildLabel}</div>
            {buildCreatedAtLabel ? <div>Build: {buildCreatedAtLabel}</div> : null}
            {(tenantId || tenantName) ? <div>Tenant: {tenantId || '-'} · {tenantName || '-'}</div> : null}
            {(storeId || storeName) ? <div>Store: {storeId || '-'} · {storeName || '-'}</div> : null}
        </div>
    );
}
