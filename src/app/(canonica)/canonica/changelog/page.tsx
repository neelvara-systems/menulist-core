'use client'

/**
 * Canonica Dashboard — Changelog Management
 * Reuses existing platform changelog component.
 */

import dynamic from 'next/dynamic';

const ChangelogManager = dynamic(
    () => import('@/components/templates/platform/changelog'),
    { ssr: false }
);

export default function CanonicaChangelogPage() {
    return <ChangelogManager />;
}
