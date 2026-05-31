'use client';

import dynamic from 'next/dynamic';

const AnswerlatticeTeamAccess = dynamic(
    () => import('@/components/templates/answerlattice/AnswerlatticeTeamAccess'),
    { ssr: false }
);

export default function AnswerlatticeTeamAccessPage() {
    return <AnswerlatticeTeamAccess />;
}

