'use client';

/**
 * Answerlattice Dashboard — Team Access Subroute
 * Keeps members and roles addressable from the grouped sidebar.
 */

import dynamic from 'next/dynamic';

const AnswerlatticeTeamAccess = dynamic(
    () => import('@/components/templates/answerlattice/AnswerlatticeTeamAccess'),
    { ssr: false },
);

interface AnswerlatticeTeamTabPageProps {
    params: {
        tab: string;
    };
}

export default function AnswerlatticeTeamTabPage({ params }: AnswerlatticeTeamTabPageProps) {
    return <AnswerlatticeTeamAccess initialTab={params.tab} />;
}
