'use client';

/**
 * Answerlattice Dashboard — Install Center
 *
 * Single workspace route for agent packet, current widget setup, framework
 * snippets, and install verification.
 */

import dynamic from 'next/dynamic';

const AnswerlatticeInstallCenter = dynamic(
    () => import('@/components/templates/answerlattice/install/AnswerlatticeInstallCenter'),
    { ssr: false },
);

export default function AnswerlatticeInstallCenterPage() {
    return <AnswerlatticeInstallCenter />;
}
