'use client';

import { useId } from 'react';
import AnswerlatticeLogoMark from '@/components/atoms/answerlatticeLogoMark';
import MenuListLogoMark from '@/components/website/shared/LogoMark';
import type { NEELVARA_PRODUCT_LINEUP } from './siteConfig';

export type NeelvaraProductName = typeof NEELVARA_PRODUCT_LINEUP[number]['name'];

export default function ProductLogo({ name }: { name: NeelvaraProductName }) {
    const logoInstanceId = useId().replace(/:/g, '');

    if (name === 'MenuList') {
        return <MenuListLogoMark height={28} className="nv-product-logo-svg" />;
    }

    return (
        <AnswerlatticeLogoMark
            className="nv-product-logo-svg nv-product-logo-svg-answerlattice"
            height={27}
            idPrefix={`neelvara-answerlattice-${logoInstanceId}`}
        />
    );
}
