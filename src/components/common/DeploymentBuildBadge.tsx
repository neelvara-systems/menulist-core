'use client';

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

    useEffect(() => {
        setIsVisible(shouldShowBadge());
    }, []);

    const buildLabel = useMemo(() => {
        const buildId = process.env.NEXT_PUBLIC_BUILD_ID || 'unknown';
        const shortBuildId = buildId === 'unknown' ? buildId : buildId.slice(0, 7);
        const env = process.env.NEXT_PUBLIC_ENV || 'unknown';
        return `${shortBuildId} · ${env}`;
    }, []);

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
            {buildLabel}
        </div>
    );
}
