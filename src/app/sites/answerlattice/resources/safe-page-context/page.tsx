import { Metadata } from 'next';
import { getAnswerlatticeResourceArticle } from '@/content/answerlatticePublic';
import AnswerlatticeResourceArticlePage from '../ResourceArticlePage';

const articlePath = '/resources/safe-page-context';
const article = getAnswerlatticeResourceArticle(articlePath);

export const metadata: Metadata = {
    title: article?.metaTitle || 'Safe Page Context',
    description: article?.metaDescription,
    alternates: { canonical: articlePath },
};

export default function SafePageContextResourcePage() {
    return <AnswerlatticeResourceArticlePage articlePath={articlePath} />;
}

