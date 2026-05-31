'use client';

import dynamic from 'next/dynamic';

const AnswerlatticeFaqManagement = dynamic(
    () => import('@/components/templates/answerlattice/faqManagement/AnswerlatticeFaqManagement'),
    { ssr: false },
);

export default function AnswerlatticeFaqsPage() {
    return <AnswerlatticeFaqManagement />;
}
