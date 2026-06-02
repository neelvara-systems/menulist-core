import { Metadata } from 'next';
import AnswerlatticeComparisonDetailPage from '../ComparisonDetailPage';
import { getAnswerlatticeComparison } from '../../publicContent';

const comparisonPath = '/comparisons/answerlattice-vs-helpdesks';
const comparison = getAnswerlatticeComparison(comparisonPath);

export const metadata: Metadata = {
    title: comparison?.title || 'AnswerLattice vs Helpdesks',
    description: comparison?.metaDescription,
    alternates: { canonical: comparisonPath },
};

export default function AnswerlatticeVsHelpdesksPage() {
    return <AnswerlatticeComparisonDetailPage comparisonPath={comparisonPath} />;
}
