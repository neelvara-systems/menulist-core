'use client';

import dynamic from 'next/dynamic';

const AnswerlatticeWidgetManagement = dynamic(
    () => import('@/components/templates/answerlattice/widgetManagement/AnswerlatticeWidgetManagement'),
    { ssr: false },
);

export default function AnswerlatticeWidgetInstallAliasPage() {
    return <AnswerlatticeWidgetManagement initialTab="install" />;
}
