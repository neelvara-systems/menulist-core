'use client';;
import { use } from "react";

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
    params: Promise<{
        tab: string;
    }>;
}

export default function AnswerlatticeWidgetTabPage(props: AnswerlatticeWidgetTabPageProps) {
    const params = use(props.params);
    return <AnswerlatticeWidgetManagement initialTab={params.tab} />;
}
