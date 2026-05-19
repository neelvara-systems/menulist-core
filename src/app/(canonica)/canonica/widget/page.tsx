'use client';

/**
 * Canonica Dashboard — Widget Management
 *
 * Thin page wrapper. The template owns dashboard state and runtime config UI.
 */

import dynamic from 'next/dynamic';

const CanonicaWidgetManagement = dynamic(
    () => import('@/components/templates/canonica/widgetManagement/CanonicaWidgetManagement'),
    { ssr: false }
);

export default function CanonicaWidgetPage() {
    return <CanonicaWidgetManagement />;
}
