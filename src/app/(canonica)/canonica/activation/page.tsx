'use client';

/**
 * Canonica Dashboard - Activation Command Center
 *
 * Thin page wrapper. The template owns the readiness read model and actions.
 */

import dynamic from 'next/dynamic';

const CanonicaActivationCommandCenter = dynamic(
    () => import('@/components/templates/canonica/activation/CanonicaActivationCommandCenter'),
    { ssr: false }
);

export default function CanonicaActivationPage() {
    return <CanonicaActivationCommandCenter />;
}
