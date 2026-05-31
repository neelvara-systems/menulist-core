'use client'

/**
 * Answerlattice Dashboard — Knowledge Base Management
 * Reuses existing platform KB component.
 */

import dynamic from 'next/dynamic';

const KnowledgeBaseManager = dynamic(
    () => import('@/components/templates/platform/knowledgeBase'),
    { ssr: false }
);

export default function AnswerlatticeKnowledgeBasePage() {
    return <KnowledgeBaseManager />;
}
