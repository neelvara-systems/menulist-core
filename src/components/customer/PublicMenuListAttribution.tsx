import { getPublicBaseUrl } from '@constant/urls';
import { resolveMenuListAttributionPolicy } from '@lib/platform/menuListBranding';
import type { CSSProperties } from 'react';

interface PublicMenuListAttributionProps {
    activePlanType?: string | null;
    mode?: 'full' | 'compact';
    surfaceLabel?: string;
    rightsLabel?: string | null;
    ctaLabel?: string | null;
    mutedColor?: string;
    accentColor?: string;
    containerStyle?: CSSProperties;
}

function MenuListLogoMark({ height = 12 }: { height?: number }) {
    const width = Math.round(height * 1.749);

    return (
        <svg
            width={width}
            height={height}
            viewBox="1260 610 870 500"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
            style={{ display: 'block', flexShrink: 0 }}
        >
            <defs>
                <linearGradient id="public-menulist-logo-g1" x1="1335.95" y1="845.436" x2="1784.85" y2="845.436" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#29AAE3" />
                    <stop offset="0.498958" stopColor="#0071BD" />
                    <stop offset="1" stopColor="#0051D2" />
                </linearGradient>
                <linearGradient id="public-menulist-logo-g2" x1="1595.11" y1="848.904" x2="2048.63" y2="848.904" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#29AAE3" />
                    <stop offset="1" stopColor="#0054D0" />
                </linearGradient>
            </defs>
            <path
                d="M1664.9 725.404C1640.93 696.899 1608.97 676.232 1573.14 666.07C1537.31 655.908 1499.26 656.717 1463.89 668.394C1428.53 680.07 1397.48 702.078 1374.74 731.577C1352.01 761.076 1338.63 796.711 1336.35 833.884C1334.07 871.057 1342.98 908.061 1361.93 940.12C1380.88 972.18 1409.01 997.823 1442.68 1013.74C1476.35 1029.66 1514.02 1035.12 1550.82 1029.42C1587.63 1023.72 1627.82 1000.02 1655.09 974.66M1662.82 723.153L1784.28 847.619L1719.9 908.993"
                stroke="url(#public-menulist-logo-g1)"
                strokeWidth="63.6323"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M1715.48 970.547C1739.76 999.424 1772.14 1020.36 1808.44 1030.66C1844.73 1040.95 1883.28 1040.13 1919.11 1028.3C1954.94 1016.47 1986.4 994.177 2009.43 964.294C2032.46 934.41 2046 898.31 2048.32 860.652C2050.63 822.995 2041.61 785.508 2022.4 753.03C2003.2 720.552 1974.71 694.575 1940.6 678.449C1906.49 662.324 1868.33 656.792 1831.05 662.567C1793.76 668.341 1752.25 692.743 1724.62 718.43M1717.59 972.827L1594.55 846.738L1658.1 784.526"
                stroke="url(#public-menulist-logo-g2)"
                strokeWidth="63.6323"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export default function PublicMenuListAttribution({
    activePlanType,
    mode = 'full',
    surfaceLabel = 'Powered by MenuList',
    rightsLabel = 'All rights reserved',
    ctaLabel = null,
    mutedColor = '#8a8f98',
    accentColor = '#111',
    containerStyle,
}: PublicMenuListAttributionProps) {
    if (!resolveMenuListAttributionPolicy({ activePlanType }).showAttribution) {
        return null;
    }

    const isCompact = mode === 'compact';
    const markHeight = isCompact ? 12 : 14;
    const appUrl = getPublicBaseUrl();
    const poweredByHref = appUrl;
    const ctaHref = `${appUrl}/create-menu`;

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
            <a
                href={poweredByHref}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    alignItems: 'center',
                    color: mutedColor,
                    display: 'inline-flex',
                    flexWrap: 'wrap',
                    fontSize: isCompact ? 11 : 12,
                    gap: isCompact ? 5 : 6,
                    justifyContent: 'center',
                    lineHeight: 1.4,
                    margin: 0,
                    textDecoration: 'none',
                }}
                aria-label="Open MenuList app"
            >
                <MenuListLogoMark height={markHeight} />
                <span>{surfaceLabel}{rightsLabel ? `. ${rightsLabel}` : ''}</span>
            </a>
            {ctaLabel ? (
                <a
                    href={ctaHref}
                    target="_blank"
                    rel="noopener noreferrer"
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
