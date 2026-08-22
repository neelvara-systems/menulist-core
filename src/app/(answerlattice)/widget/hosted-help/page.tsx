'use client';

import dynamic from 'next/dynamic';

const AnswerlatticeWidgetManagement = dynamic(
    () => import('@/components/templates/answerlattice/widgetManagement/AnswerlatticeWidgetManagement'),
    { ssr: false },
);

export default function AnswerlatticeWidgetHostedHelpAliasPage() {
    return <AnswerlatticeWidgetManagement initialTab="hosted-help" />;
}
