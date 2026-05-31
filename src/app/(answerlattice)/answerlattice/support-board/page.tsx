import dynamic from 'next/dynamic';

export const metadata = {
    title: 'Support Board | Answerlattice',
};

const AnswerlatticeSupportBoard = dynamic(
    () => import('@/components/templates/answerlattice/supportBoard/AnswerlatticeSupportBoard'),
    { ssr: false },
);

export default function AnswerlatticeSupportBoardPage() {
    return <AnswerlatticeSupportBoard />;
}
