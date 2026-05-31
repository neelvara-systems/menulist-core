'use client';

import dynamic from 'next/dynamic';

const AnswerlatticeFeedbackReview = dynamic(
    () => import('@/components/templates/answerlattice/feedback/AnswerlatticeFeedbackReview'),
    { ssr: false }
);

export default function AnswerlatticeFeedbackPage() {
    return <AnswerlatticeFeedbackReview />;
}
