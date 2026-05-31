'use client'

/**
 * Answerlattice Dashboard — Settings
 *
 * Thin page wrapper — all logic lives in the template component.
 * Follows same pattern as all other Answerlattice pages.
 *
 * @see src/components/templates/answerlattice/AnswerlatticeSettings.tsx
 */

import dynamic from 'next/dynamic';

const AnswerlatticeSettings = dynamic(
    () => import('@/components/templates/answerlattice/AnswerlatticeSettings'),
    { ssr: false }
);

export default function AnswerlatticeSettingsPage() {
    return <AnswerlatticeSettings />;
}
