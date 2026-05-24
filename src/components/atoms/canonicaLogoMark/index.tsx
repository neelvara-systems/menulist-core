import type { CSSProperties } from 'react';

type CanonicaLogoMarkProps = {
    height?: number | string;
    width?: number | string;
    idPrefix: string;
    className?: string;
    style?: CSSProperties;
    title?: string;
};

const VIEW_BOX = '1220 560 940 580';
const ASPECT_RATIO = 940 / 580;
const LEFT_PATH = 'M1664.9 725.404C1640.93 696.899 1608.97 676.232 1573.14 666.07C1537.31 655.908 1499.26 656.717 1463.89 668.394C1428.53 680.07 1397.48 702.078 1374.74 731.577C1352.01 761.076 1338.63 796.711 1336.35 833.884C1334.07 871.057 1342.98 908.061 1361.93 940.12C1380.88 972.18 1409.01 997.823 1442.68 1013.74C1476.35 1029.66 1514.02 1035.12 1550.82 1029.42C1587.63 1023.72 1627.82 1000.02 1655.09 974.66M1662.82 723.153L1784.28 847.619L1719.9 908.993';
const RIGHT_PATH = 'M1715.48 970.547C1739.76 999.424 1772.14 1020.36 1808.44 1030.66C1844.73 1040.95 1883.28 1040.13 1919.11 1028.3C1954.94 1016.47 1986.4 994.177 2009.43 964.294C2032.46 934.41 2046 898.31 2048.32 860.652C2050.63 822.995 2041.61 785.508 2022.4 753.03C2003.2 720.552 1974.71 694.575 1940.6 678.449C1906.49 662.324 1868.33 656.792 1831.05 662.567C1793.76 668.341 1752.25 692.743 1724.62 718.43M1717.59 972.827L1594.55 846.738L1658.1 784.526';

export default function CanonicaLogoMark({
    height = 28,
    width,
    idPrefix,
    className,
    style,
    title,
}: CanonicaLogoMarkProps) {
    const resolvedWidth = width ?? (typeof height === 'number' ? Math.round(height * ASPECT_RATIO) : '100%');
    const titleId = `${idPrefix}-title`;
    const shadowId = `${idPrefix}-shadow`;
    const edgeId = `${idPrefix}-edge-shadow`;
    const cutoutId = `${idPrefix}-cutout`;
    const leftGradientId = `${idPrefix}-left-band`;
    const rightGradientId = `${idPrefix}-right-band`;
    const frontGradientId = `${idPrefix}-front-band`;
    const lowerGradientId = `${idPrefix}-lower-band`;
    const highlightGradientId = `${idPrefix}-highlight`;

    return (
        <svg
            aria-hidden={title ? undefined : true}
            aria-labelledby={title ? titleId : undefined}
            className={className}
            focusable="false"
            height={height}
            role={title ? 'img' : undefined}
            style={{ display: 'block', flexShrink: 0, overflow: 'visible', ...style }}
            viewBox={VIEW_BOX}
            width={resolvedWidth}
            xmlns="http://www.w3.org/2000/svg"
        >
            {title ? <title id={titleId}>{title}</title> : null}
            <defs>
                <linearGradient id={leftGradientId} x1="1306" y1="836" x2="1792" y2="892" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#dbe7ff" />
                    <stop offset="0.34" stopColor="#aebcff" />
                    <stop offset="0.62" stopColor="#777cff" />
                    <stop offset="1" stopColor="#4b45dd" />
                </linearGradient>
                <linearGradient id={rightGradientId} x1="1608" y1="798" x2="2065" y2="920" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#7774ff" />
                    <stop offset="0.38" stopColor="#5550e3" />
                    <stop offset="0.72" stopColor="#352e9e" />
                    <stop offset="1" stopColor="#21186d" />
                </linearGradient>
                <linearGradient id={frontGradientId} x1="1578" y1="742" x2="1810" y2="922" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#9faaff" />
                    <stop offset="0.42" stopColor="#696dff" />
                    <stop offset="1" stopColor="#4b45db" />
                </linearGradient>
                <linearGradient id={lowerGradientId} x1="1594" y1="812" x2="1737" y2="982" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#8d98ef" />
                    <stop offset="0.52" stopColor="#6263df" />
                    <stop offset="1" stopColor="#352f9d" />
                </linearGradient>
                <linearGradient id={highlightGradientId} x1="1320" y1="694" x2="2020" y2="1050" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#ffffff" stopOpacity="0.62" />
                    <stop offset="0.34" stopColor="#dce6ff" stopOpacity="0.28" />
                    <stop offset="0.66" stopColor="#9698ff" stopOpacity="0.18" />
                    <stop offset="1" stopColor="#5b55ff" stopOpacity="0.2" />
                </linearGradient>
                <filter
                    id={shadowId}
                    x="1200"
                    y="540"
                    width="980"
                    height="630"
                    colorInterpolationFilters="sRGB"
                    filterUnits="userSpaceOnUse"
                >
                    <feDropShadow dx="0" dy="20" stdDeviation="18" floodColor="#050514" floodOpacity="0.48" />
                    <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#aebcff" floodOpacity="0.18" />
                </filter>
                <filter
                    id={edgeId}
                    x="1200"
                    y="540"
                    width="980"
                    height="630"
                    colorInterpolationFilters="sRGB"
                    filterUnits="userSpaceOnUse"
                >
                    <feDropShadow dx="-3" dy="-3" stdDeviation="2" floodColor="#ffffff" floodOpacity="0.22" />
                    <feDropShadow dx="4" dy="8" stdDeviation="5" floodColor="#070622" floodOpacity="0.45" />
                </filter>
                <mask id={cutoutId} x="1200" y="540" width="980" height="630" maskUnits="userSpaceOnUse">
                    <rect x="1200" y="540" width="980" height="630" fill="#ffffff" />
                    <path d="M1692 802L1737 846L1692 890L1648 846Z" fill="#000000" />
                </mask>
            </defs>

            <g filter={`url(#${shadowId})`} mask={`url(#${cutoutId})`}>
                <path d={RIGHT_PATH} fill="none" stroke={`url(#${rightGradientId})`} strokeLinecap="round" strokeLinejoin="round" strokeWidth="118" />
                <path d={LEFT_PATH} fill="none" stroke={`url(#${leftGradientId})`} strokeLinecap="round" strokeLinejoin="round" strokeWidth="118" />
                <path d="M1712 731L1594 847" fill="none" stroke="#191654" strokeLinecap="round" strokeWidth="34" opacity="0.34" />
                <path d="M1662.82 723.153L1784.28 847.619L1719.9 908.993" fill="none" stroke={`url(#${frontGradientId})`} strokeLinecap="round" strokeLinejoin="round" strokeWidth="118" />
                <path d="M1717.59 972.827L1594.55 846.738L1658.1 784.526" fill="none" stroke={`url(#${lowerGradientId})`} strokeLinecap="round" strokeLinejoin="round" strokeWidth="118" />
            </g>
            <g filter={`url(#${edgeId})`} mask={`url(#${cutoutId})`} opacity="0.64">
                <path d={LEFT_PATH} fill="none" stroke={`url(#${highlightGradientId})`} strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
                <path d={RIGHT_PATH} fill="none" stroke="#817dff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6" opacity="0.28" />
            </g>
            <path d="M1692 802L1737 846L1692 890L1648 846Z" fill="none" stroke="#141144" strokeWidth="5" opacity="0.46" />
        </svg>
    );
}
