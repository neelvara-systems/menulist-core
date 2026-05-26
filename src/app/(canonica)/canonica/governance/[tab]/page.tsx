'use client'

/**
 * Canonica Dashboard — Governance Subroute
 * Keeps each governance area addressable from the sidebar while reusing the
 * same guarded GovernanceHub implementation.
 */

import { useClientAuthSession } from '@hook/useClientAuthSession';
import dynamic from 'next/dynamic';

const GovernanceHub = dynamic(
    () => import('@/components/templates/canonica/governance'),
    { ssr: false },
);

interface CanonicaGovernanceTabPageProps {
    params: {
        tab: string;
    };
}

export default function CanonicaGovernanceTabPage({ params }: CanonicaGovernanceTabPageProps) {
    const session = useClientAuthSession();
    const tId = session?.tId || 0;
    const sId = session?.sId || 0;

    return <GovernanceHub tId={tId} sId={sId} initialTab={params.tab} />;
}
