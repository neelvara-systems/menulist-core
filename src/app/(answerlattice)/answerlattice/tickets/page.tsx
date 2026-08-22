'use client'

/**
 * Answerlattice Dashboard — Support Tickets
 * Reuses existing platform support tickets component.
 */

import dynamic from 'next/dynamic';

const SupportTickets = dynamic(
    () => import('@/components/templates/platform/supportTickets'),
    { ssr: false }
);

export default function AnswerlatticeTicketsPage() {
    return <SupportTickets initialView="queue" />;
}
