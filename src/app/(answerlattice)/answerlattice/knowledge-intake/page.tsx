'use client';

import dynamic from 'next/dynamic';

const AnswerlatticeKnowledgeIntake = dynamic(
    () => import('@template/answerlattice/knowledgeIntake/AnswerlatticeKnowledgeIntake'),
    { ssr: false },
);

export default function AnswerlatticeKnowledgeIntakePage() {
    return <AnswerlatticeKnowledgeIntake />;
}
