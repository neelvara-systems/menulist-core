'use client';;
import { use } from "react";

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
    params: Promise<{
        tab: string;
    }>;
}

export default function AnswerlatticeTeamTabPage(props: AnswerlatticeTeamTabPageProps) {
    const params = use(props.params);
    return <AnswerlatticeTeamAccess initialTab={params.tab} />;
}
