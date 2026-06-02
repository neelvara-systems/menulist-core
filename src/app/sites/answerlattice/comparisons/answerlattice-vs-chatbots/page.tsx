import { Metadata } from 'next';
import AnswerlatticeComparisonDetailPage from '../ComparisonDetailPage';
import { getAnswerlatticeComparison } from '../../publicContent';

const comparisonPath = '/comparisons/answerlattice-vs-chatbots';
const comparison = getAnswerlatticeComparison(comparisonPath);

export const metadata: Metadata = {
    title: comparison?.title || 'AnswerLattice vs Chatbots',
    description: comparison?.metaDescription,
    alternates: { canonical: comparisonPath },
};

export default function AnswerlatticeVsChatbotsPage() {
    return <AnswerlatticeComparisonDetailPage comparisonPath={comparisonPath} />;
}
