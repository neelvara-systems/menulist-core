'use client';
import { use } from "react";

/**
 * Answerlattice Dashboard — Governance Subroute
 * Keeps each governance area addressable from the sidebar while reusing the
 * same guarded GovernanceHub implementation.
 */

import { useClientAuthSession } from '@hook/useClientAuthSession';
import dynamic from 'next/dynamic';

const GovernanceHub = dynamic(
    () => import('@/components/templates/answerlattice/governance'),
    { ssr: false },
);

interface AnswerlatticeGovernanceTabPageProps {
    params: Promise<{
        tab: string;
    }>;
}

export default function AnswerlatticeGovernanceTabPage(props: AnswerlatticeGovernanceTabPageProps) {
    const params = use(props.params);
    const session = useClientAuthSession();
    const tId = session?.tId || 0;
    const sId = session?.sId || 0;

    return <GovernanceHub tId={tId} sId={sId} initialTab={params.tab} />;
}
