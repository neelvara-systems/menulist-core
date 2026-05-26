'use client';

/**
 * Canonica Dashboard — Team Access Subroute
 * Keeps members and roles addressable from the grouped sidebar.
 */

import dynamic from 'next/dynamic';

const CanonicaTeamAccess = dynamic(
    () => import('@/components/templates/canonica/CanonicaTeamAccess'),
    { ssr: false },
);

interface CanonicaTeamTabPageProps {
    params: {
        tab: string;
    };
}

export default function CanonicaTeamTabPage({ params }: CanonicaTeamTabPageProps) {
    return <CanonicaTeamAccess initialTab={params.tab} />;
}
