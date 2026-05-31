'use client';

/**
 * Answerlattice Dashboard — Widget Management Subroute
 * Keeps widget setup areas addressable from the grouped sidebar.
 */

import dynamic from 'next/dynamic';

const AnswerlatticeWidgetManagement = dynamic(
    () => import('@/components/templates/answerlattice/widgetManagement/AnswerlatticeWidgetManagement'),
    { ssr: false },
);

interface AnswerlatticeWidgetTabPageProps {
    params: {
        tab: string;
    };
}

export default function AnswerlatticeWidgetTabPage({ params }: AnswerlatticeWidgetTabPageProps) {
    return <AnswerlatticeWidgetManagement initialTab={params.tab} />;
}
