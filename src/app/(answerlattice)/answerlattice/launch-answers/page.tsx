import { AnswerlatticeAnswerTestsClient } from '@/components/templates/answerlattice/clientOnly/AnswerlatticeClientOnlyPages';

export const metadata = {
    title: 'First 10 Answers | Answerlattice',
};

export default function AnswerlatticeLaunchAnswersPage() {
    return <AnswerlatticeAnswerTestsClient entryMode="launch" />;
}
