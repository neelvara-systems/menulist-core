'use client';

import dynamic from 'next/dynamic';

const CanonicaProductSurfaces = dynamic(
    () => import('@/components/templates/canonica/productSurfaces/CanonicaProductSurfaces'),
    { ssr: false },
);

export default function CanonicaProductSurfacesPage() {
    return <CanonicaProductSurfaces />;
}
