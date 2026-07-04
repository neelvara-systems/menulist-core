import type { CSSProperties } from 'react';

export type AnswerlatticeLogoMarkPathClassNames = {
    leftStroke?: string;
    rightStroke?: string;
    overlap?: string;
};

export type AnswerlatticeLogoMarkProps = {
    height?: number | string;
    width?: number | string;
    idPrefix?: string;
    className?: string;
    pathClassNames?: AnswerlatticeLogoMarkPathClassNames;
    style?: CSSProperties;
    title?: string;
};

const ANSWERLATTICE_LOGO_ASPECT_RATIO = 8367 / 5131;

function cx(...values: Array<string | undefined>) {
    return values.filter(Boolean).join(' ');
}

export default function AnswerlatticeLogoMark({
    height = 28,
    width,
    idPrefix = 'answerlattice-logo-mark',
    className,
    pathClassNames,
    style,
    title,
}: AnswerlatticeLogoMarkProps) {
    const resolvedWidth = width ?? (typeof height === 'number' ? Math.round(height * ANSWERLATTICE_LOGO_ASPECT_RATIO) : '100%');
    const clipId = `${idPrefix}-clip0-1211-4`;
    const filter0Id = `${idPrefix}-filter0-d-1211-4`;
    const filter1Id = `${idPrefix}-filter1-d-1211-4`;
    const filter2Id = `${idPrefix}-filter2-f-1211-4`;
    const filter3Id = `${idPrefix}-filter3-f-1211-4`;
    const filter4Id = `${idPrefix}-filter4-f-1211-4`;
    const filter5Id = `${idPrefix}-filter5-f-1211-4`;
    const paint0Id = `${idPrefix}-paint0-linear-1211-4`;
    const paint1Id = `${idPrefix}-paint1-linear-1211-4`;

    return (
        <svg
            aria-hidden={title ? undefined : true}
            className={cx(className) || undefined}
            fill="none"
            focusable="false"
            height={height}
            role={title ? 'img' : undefined}
            style={{
                display: 'block',
                flexShrink: 0,
                height,
                width: resolvedWidth,
                ...style,
            }}
            viewBox="0 0 8367 5131"
            width={resolvedWidth}
            xmlns="http://www.w3.org/2000/svg"
        >
            {title ? <title>{title}</title> : null}
            <g clipPath={`url(#${clipId})`}>
                <g filter={`url(#${filter0Id})`}>
                    <path
                        className={pathClassNames?.leftStroke}
                        d="M3992 3384C3774.6 3609.64 3168.74 4024.3 2521.18 3846.04C1711.73 3623.22 1466.01 2981.63 1496 2465C1533.5 1819 2085.5 1256.5 2724 1229C3284.32 1204.87 3643.13 1335.44 4556.91 2363.7L4756 2581.06L4351.5 2982.5"
                        stroke={`url(#${paint0Id})`}
                        strokeWidth="545"
                    />
                </g>
                <g filter={`url(#${filter1Id})`}>
                    <path
                        className={pathClassNames?.rightStroke}
                        d="M4418.37 3434.12C4594.45 3638.77 4829.25 3787.14 5092.47 3860.1C5355.68 3933.05 5635.23 3927.24 5895.03 3843.41C6154.83 3759.58 6382.96 3601.58 6549.98 3389.8C6716.99 3178.02 6815.23 2922.19 6832 2655.32C6848.78 2388.44 6783.32 2122.78 6644.09 1892.62C6504.85 1662.45 6298.23 1478.35 6050.88 1364.08C5146.5 998.546 4635 1469 4353.5 1746M4433.68 3450.28L3988.16 3006.23L3552.5 2530.5L3960.5 2126.05"
                        stroke={`url(#${paint1Id})`}
                        strokeWidth="545"
                    />
                </g>
                <g className={pathClassNames?.overlap} filter={`url(#${filter2Id})`}>
                    <path d="M3995 3741.5C3964.6 3580.7 3750.17 3395 3647 3324L3797 3202L4183 3584L3995 3741.5Z" fill="#0D665A" />
                </g>
                <g className={pathClassNames?.overlap} filter={`url(#${filter3Id})`}>
                    <path d="M4291 2662.5L4162 2792L4547 3177L4749 2971.5C4515 2946.3 4350 2747 4291 2662.5Z" fill="#0D665A" />
                </g>
                <g className={pathClassNames?.overlap} filter={`url(#${filter4Id})`}>
                    <path d="M4155 2317L3769 1933L3589.5 2114C3767.1 2137.2 3961.67 2338.83 4034.5 2437.5L4155 2317Z" fill="#116957" />
                </g>
                <g className={pathClassNames?.overlap} filter={`url(#${filter5Id})`}>
                    <path d="M4299.5 1422C4263.5 1451.6 4184 1524.5 4155 1556.5L4537.5 1942.5L4652.5 1836.5C4532.9 1802.9 4367.33 1546.17 4299.5 1422Z" fill="#116957" />
                </g>
            </g>
            <defs>
                <filter id={filter0Id} x="1221.11" y="953.975" width="3961.77" height="3230.05" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                    <feOffset dx="42" dy="15" />
                    <feGaussianBlur stdDeviation="3.55" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0.0206459 0 0 0 0 0.325252 0 0 0 0 0.264331 0 0 0 0.64 0" />
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1211_4" />
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1211_4" result="shape" />
                </filter>
                <filter id={filter1Id} x="3170.64" y="957.904" width="3940.44" height="3233.45" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                    <feOffset dy="4" />
                    <feGaussianBlur stdDeviation="2" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" />
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1211_4" />
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1211_4" result="shape" />
                </filter>
                <filter id={filter2Id} x="3620.9" y="3175.9" width="588.2" height="591.7" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur stdDeviation="13.05" result="effect1_foregroundBlur_1211_4" />
                </filter>
                <filter id={filter3Id} x="4135.9" y="2636.4" width="639.2" height="566.7" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur stdDeviation="13.05" result="effect1_foregroundBlur_1211_4" />
                </filter>
                <filter id={filter4Id} x="3563.5" y="1907" width="617.5" height="556.5" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur stdDeviation="13" result="effect1_foregroundBlur_1211_4" />
                </filter>
                <filter id={filter5Id} x="4129" y="1396" width="549.5" height="572.5" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur stdDeviation="13" result="effect1_foregroundBlur_1211_4" />
                </filter>
                <linearGradient id={paint0Id} x1="4892" y1="2542" x2="1308.5" y2="2542" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#12847A" />
                    <stop offset="0.339195" stopColor="#25B9A6" />
                    <stop offset="0.671316" stopColor="#78F1E4" />
                    <stop offset="1" stopColor="#5EEAD4" />
                </linearGradient>
                <linearGradient id={paint1Id} x1="3264.5" y1="2573.55" x2="7055.92" y2="2573.63" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#42C0AB" />
                    <stop offset="0.321745" stopColor="#27C4B3" />
                    <stop offset="0.557865" stopColor="#12A396" />
                    <stop offset="0.773453" stopColor="#117670" />
                    <stop offset="1" stopColor="#08513E" />
                </linearGradient>
                <clipPath id={clipId}>
                    <rect width="8366.47" height="5130.15" fill="white" />
                </clipPath>
            </defs>
        </svg>
    );
}
