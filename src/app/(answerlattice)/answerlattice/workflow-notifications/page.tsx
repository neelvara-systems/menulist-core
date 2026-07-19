'use client';

import dynamic from 'next/dynamic';

const AnswerlatticeWorkflowNotifications = dynamic(
    () => import('@/components/templates/answerlattice/settings/AnswerlatticeWorkflowNotifications'),
    { ssr: false },
);

export default function AnswerlatticeWorkflowNotificationsPage() {
    return <AnswerlatticeWorkflowNotifications />;
}
