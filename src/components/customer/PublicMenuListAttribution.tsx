import { PLATFORM_URL } from '@constant/urls';
import type { CSSProperties } from 'react';

interface PublicMenuListAttributionProps {
    mode?: 'full' | 'compact';
    surfaceLabel?: string;
    rightsLabel?: string | null;
    ctaLabel?: string | null;
    mutedColor?: string;
    accentColor?: string;
    containerStyle?: CSSProperties;
}

const ctaHref = `${PLATFORM_URL}/create-menu`;

export default function PublicMenuListAttribution({
    mode = 'full',
    surfaceLabel = 'Powered by MenuList',
    rightsLabel = 'All rights reserved',
    ctaLabel = null,
    mutedColor = '#8a8f98',
    accentColor = '#111',
    containerStyle,
}: PublicMenuListAttributionProps) {
    const isCompact = mode === 'compact';

    return (
        <div
            style={{
                alignItems: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: isCompact ? 6 : 10,
                marginTop: isCompact ? 12 : 18,
                paddingBottom: 'env(safe-area-inset-bottom)',
                textAlign: 'center',
                ...containerStyle,
            }}
        >
            <p
                style={{
                    color: mutedColor,
                    fontSize: isCompact ? 11 : 12,
                    lineHeight: 1.4,
                    margin: 0,
                }}
            >
                {surfaceLabel}{rightsLabel ? `. ${rightsLabel}` : ''}
            </p>
            {ctaLabel ? (
                <a
                    href={ctaHref}
                    style={{
                        color: accentColor,
                        fontSize: isCompact ? 11 : 12,
                        fontWeight: 600,
                        lineHeight: 1.3,
                        minHeight: isCompact ? 0 : 36,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {ctaLabel}
                </a>
            ) : null}
        </div>
    );
}
