import { Metadata } from 'next';
import { getAnswerlatticeResourceArticle } from '@/content/answerlatticePublic';
import AnswerlatticeResourceArticlePage from '../ResourceArticlePage';

const articlePath = '/resources/answerlattice-operating-guide';
const article = getAnswerlatticeResourceArticle(articlePath);

export const metadata: Metadata = {
    title: article?.metaTitle || 'AnswerLattice Operating Guide',
    description: article?.metaDescription,
    alternates: { canonical: articlePath },
};

export default function AnswerlatticeOperatingGuidePage() {
    return <AnswerlatticeResourceArticlePage articlePath={articlePath} />;
}
