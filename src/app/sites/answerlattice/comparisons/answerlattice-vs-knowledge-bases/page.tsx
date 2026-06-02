import { Metadata } from 'next';
import AnswerlatticeComparisonDetailPage from '../ComparisonDetailPage';
import { getAnswerlatticeComparison } from '../../publicContent';

const comparisonPath = '/comparisons/answerlattice-vs-knowledge-bases';
const comparison = getAnswerlatticeComparison(comparisonPath);

export const metadata: Metadata = {
    title: comparison?.title || 'AnswerLattice vs Knowledge Bases',
    description: comparison?.metaDescription,
    alternates: { canonical: comparisonPath },
};

export default function AnswerlatticeVsKnowledgeBasesPage() {
    return <AnswerlatticeComparisonDetailPage comparisonPath={comparisonPath} />;
}
