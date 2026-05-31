'use client'

/**
 * Answerlattice Dashboard — Conversations (Chat Session Monitoring)
 * Reuses existing platform chat management component.
 */

import dynamic from 'next/dynamic';

const ChatManagement = dynamic(
    () => import('@/components/templates/platform/chatManagement'),
    { ssr: false }
);

export default function AnswerlatticeConversationsPage() {
    return <ChatManagement />;
}
