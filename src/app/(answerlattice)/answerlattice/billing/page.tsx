'use client';

import dynamic from 'next/dynamic';

const AnswerlatticeBilling = dynamic(
    () => import('@/components/templates/answerlattice/billing/AnswerlatticeBilling'),
    { ssr: false },
);

export default function AnswerlatticeBillingPage() {
    return <AnswerlatticeBilling />;
}
