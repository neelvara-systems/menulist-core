'use client';

/**
 * Canonica Dashboard — Widget Management Subroute
 * Keeps widget setup areas addressable from the grouped sidebar.
 */

import dynamic from 'next/dynamic';

const CanonicaWidgetManagement = dynamic(
    () => import('@/components/templates/canonica/widgetManagement/CanonicaWidgetManagement'),
    { ssr: false },
);

interface CanonicaWidgetTabPageProps {
    params: {
        tab: string;
    };
}

export default function CanonicaWidgetTabPage({ params }: CanonicaWidgetTabPageProps) {
    return <CanonicaWidgetManagement initialTab={params.tab} />;
}
