'use client'

/**
 * Canonica Dashboard — KB Generation (AI-powered article creation)
 * Reuses existing platform KBGeneration component.
 */

import dynamic from 'next/dynamic';

const KBGeneration = dynamic(
    () => import('@/components/templates/platform/KBGeneration'),
    { ssr: false }
);

export default function CanonicaKBGenerationPage() {
    return <KBGeneration />;
}
