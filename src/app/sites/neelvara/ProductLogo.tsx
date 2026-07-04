'use client';

import { useId } from 'react';
import MenuListLogoMark from '@/components/website/shared/LogoMark';
import type { NEELVARA_PRODUCT_LINEUP } from './siteConfig';

export type NeelvaraProductName = typeof NEELVARA_PRODUCT_LINEUP[number]['name'];

function AnswerlatticeCompactLogo() {
    const uid = useId().replace(/:/g, '');
    const leftGradientId = `nv-al-left-${uid}`;
    const rightGradientId = `nv-al-right-${uid}`;

    return (
        <svg
            aria-hidden="true"
            className="nv-product-logo-svg nv-product-logo-svg-answerlattice"
            fill="none"
            focusable="false"
            height="28"
            viewBox="1120 860 6100 3430"
            width="44"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id={leftGradientId} x1="4892" y1="2542" x2="1308.5" y2="2542" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#1FCFC1" />
                    <stop offset="0.46" stopColor="#159E92" />
                    <stop offset="1" stopColor="#076B61" />
                </linearGradient>
                <linearGradient id={rightGradientId} x1="3264.5" y1="2573.55" x2="7055.92" y2="2573.63" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#18B9A9" />
                    <stop offset="0.48" stopColor="#0E877B" />
                    <stop offset="1" stopColor="#06483C" />
                </linearGradient>
            </defs>
            <path
                d="M3992 3384C3774.6 3609.64 3168.74 4024.3 2521.18 3846.04C1711.73 3623.22 1466.01 2981.63 1496 2465C1533.5 1819 2085.5 1256.5 2724 1229C3284.32 1204.87 3643.13 1335.44 4556.91 2363.7L4756 2581.06L4351.5 2982.5"
                stroke={`url(#${leftGradientId})`}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="610"
            />
            <path
                d="M4418.37 3434.12C4594.45 3638.77 4829.25 3787.14 5092.47 3860.1C5355.68 3933.05 5635.23 3927.24 5895.03 3843.41C6154.83 3759.58 6382.96 3601.58 6549.98 3389.8C6716.99 3178.02 6815.23 2922.19 6832 2655.32C6848.78 2388.44 6783.32 2122.78 6644.09 1892.62C6504.85 1662.45 6298.23 1478.35 6050.88 1364.08C5146.5 998.546 4635 1469 4353.5 1746M4433.68 3450.28L3988.16 3006.23L3552.5 2530.5L3960.5 2126.05"
                stroke={`url(#${rightGradientId})`}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="610"
            />
        </svg>
    );
}

export default function ProductLogo({ name }: { name: NeelvaraProductName }) {
    if (name === 'MenuList') {
        return <MenuListLogoMark height={28} className="nv-product-logo-svg" />;
    }

    if (name === 'Answerlattice') {
        return <AnswerlatticeCompactLogo />;
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            alt=""
            aria-hidden="true"
            className="nv-product-logo-img"
            height={38}
            src="/campaigncue-icon.svg"
            width={38}
        />
    );
}
