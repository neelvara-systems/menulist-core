'use client';

import dynamic from 'next/dynamic';

const AnswerlatticeProductSurfaces = dynamic(
    () => import('@/components/templates/answerlattice/productSurfaces/AnswerlatticeProductSurfaces'),
    { ssr: false },
);

export default function AnswerlatticeProductSurfacesPage() {
    return <AnswerlatticeProductSurfaces />;
}
