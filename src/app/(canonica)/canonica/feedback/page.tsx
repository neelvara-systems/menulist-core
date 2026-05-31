'use client';

import dynamic from 'next/dynamic';

const CanonicaFeedbackReview = dynamic(
    () => import('@/components/templates/canonica/feedback/CanonicaFeedbackReview'),
    { ssr: false }
);

export default function CanonicaFeedbackPage() {
    return <CanonicaFeedbackReview />;
}
