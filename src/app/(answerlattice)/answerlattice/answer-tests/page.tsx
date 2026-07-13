import dynamic from 'next/dynamic';

export const metadata = {
    title: 'Answer Tests | Answerlattice',
};

const AnswerlatticeAnswerTests = dynamic(
    () => import('@/components/templates/answerlattice/answerTests/AnswerlatticeAnswerTests'),
    { ssr: false },
);

export default function AnswerlatticeAnswerTestsPage() {
    return <AnswerlatticeAnswerTests />;
}
