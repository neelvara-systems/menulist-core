'use client';

import dynamic from 'next/dynamic';

const AnswerlatticePublicApiAccess = dynamic(
    () => import('@/components/templates/answerlattice/settings/AnswerlatticePublicApiAccess'),
    { ssr: false },
);

export default function AnswerlatticePublicApiPage() {
    return <AnswerlatticePublicApiAccess />;
}
