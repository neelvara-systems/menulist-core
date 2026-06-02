import { Metadata } from 'next';
import { getAnswerlatticeResourceArticle } from '@/content/answerlatticePublic';
import AnswerlatticeResourceArticlePage from '../ResourceArticlePage';

const articlePath = '/resources/approved-answers-before-fallback';
const article = getAnswerlatticeResourceArticle(articlePath);

export const metadata: Metadata = {
    title: article?.metaTitle || 'Approved Answers Before Fallback',
    description: article?.metaDescription,
    alternates: { canonical: articlePath },
};

export default function ApprovedAnswersBeforeFallbackPage() {
    return <AnswerlatticeResourceArticlePage articlePath={articlePath} />;
}

