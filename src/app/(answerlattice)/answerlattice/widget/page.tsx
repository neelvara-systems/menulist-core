'use client';

/**
 * Answerlattice Dashboard — Widget Management
 *
 * Thin page wrapper. The template owns dashboard state and runtime config UI.
 */

import dynamic from 'next/dynamic';

const AnswerlatticeWidgetManagement = dynamic(
    () => import('@/components/templates/answerlattice/widgetManagement/AnswerlatticeWidgetManagement'),
    { ssr: false }
);

export default function AnswerlatticeWidgetPage() {
    return <AnswerlatticeWidgetManagement />;
}
