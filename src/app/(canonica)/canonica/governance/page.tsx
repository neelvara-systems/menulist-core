'use client'

/**
 * Canonica Dashboard — Governance Hub
 * Reuses the Phase 3 governance components (answer editor, entities, drift, analytics, health).
 */

import { useClientAuthSession } from '@hook/useClientAuthSession';
import dynamic from 'next/dynamic';

const GovernanceHub = dynamic(
    () => import('@/components/templates/canonica/governance'),
    { ssr: false }
);

export default function CanonicaGovernancePage() {
    const session = useClientAuthSession();
    const tId = session?.tId || 0;
    const sId = session?.sId || 0;

    return <GovernanceHub tId={tId} sId={sId} />;
}
