'use client';

import dynamic from 'next/dynamic';

const CanonicaTeamAccess = dynamic(
    () => import('@/components/templates/canonica/CanonicaTeamAccess'),
    { ssr: false }
);

export default function CanonicaTeamAccessPage() {
    return <CanonicaTeamAccess />;
}

