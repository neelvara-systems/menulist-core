'use client';

import dynamic from 'next/dynamic';

const CanonicaKnowledgeIntake = dynamic(
    () => import('@template/canonica/knowledgeIntake/CanonicaKnowledgeIntake'),
    { ssr: false },
);

export default function CanonicaKnowledgeIntakePage() {
    return <CanonicaKnowledgeIntake />;
}
