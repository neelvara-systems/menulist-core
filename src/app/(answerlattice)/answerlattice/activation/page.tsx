'use client';

/**
 * Answerlattice Dashboard - Activation Command Center
 *
 * Thin page wrapper. The template owns the readiness read model and actions.
 */

import dynamic from 'next/dynamic';

const AnswerlatticeActivationCommandCenter = dynamic(
    () => import('@/components/templates/answerlattice/activation/AnswerlatticeActivationCommandCenter'),
    { ssr: false }
);

export default function AnswerlatticeActivationPage() {
    return <AnswerlatticeActivationCommandCenter />;
}
