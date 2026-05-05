import { PLATFORM_URL } from '@constant/urls';

interface PublicMenuListAttributionProps {
    mode?: 'full' | 'compact';
    surfaceLabel?: string;
    rightsLabel?: string;
    ctaLabel?: string | null;
    mutedColor?: string;
    accentColor?: string;
}

const ctaHref = `${PLATFORM_URL}/create-menu`;

export default function PublicMenuListAttribution({
    mode = 'full',
    surfaceLabel = 'Created with MenuList',
    rightsLabel = 'All rights reserved.',
    ctaLabel = 'Create your own menu in minutes',
    mutedColor = '#8a8f98',
    accentColor = '#111',
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
                {surfaceLabel}. {rightsLabel}
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
