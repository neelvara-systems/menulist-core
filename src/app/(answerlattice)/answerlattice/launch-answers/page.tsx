import dynamic from 'next/dynamic';

export const metadata = {
    title: 'First 10 Answers | Answerlattice',
};

const AnswerlatticeAnswerTests = dynamic(
    () => import('@/components/templates/answerlattice/answerTests/AnswerlatticeAnswerTests'),
    { ssr: false },
);

export default function AnswerlatticeLaunchAnswersPage() {
    return <AnswerlatticeAnswerTests entryMode="launch" />;
}
