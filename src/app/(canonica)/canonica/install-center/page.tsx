'use client';

/**
 * Canonica Dashboard — Install Center
 *
 * Single workspace route for agent packet, current widget setup, framework
 * snippets, and install verification.
 */

import dynamic from 'next/dynamic';

const CanonicaInstallCenter = dynamic(
    () => import('@/components/templates/canonica/install/CanonicaInstallCenter'),
    { ssr: false },
);

export default function CanonicaInstallCenterPage() {
    return <CanonicaInstallCenter />;
}
