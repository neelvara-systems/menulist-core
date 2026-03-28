'use client'

/**
 * Canonica Dashboard — Settings
 *
 * Thin page wrapper — all logic lives in the template component.
 * Follows same pattern as all other Canonica pages.
 *
 * @see src/components/templates/canonica/CanonicaSettings.tsx
 */

import dynamic from 'next/dynamic';

const CanonicaSettings = dynamic(
    () => import('@/components/templates/canonica/CanonicaSettings'),
    { ssr: false }
);

export default function CanonicaSettingsPage() {
    return <CanonicaSettings />;
}
