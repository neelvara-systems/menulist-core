import { Metadata } from 'next';
import { getAnswerlatticeResourceArticle } from '@/content/answerlatticePublic';
import AnswerlatticeResourceArticlePage from '../ResourceArticlePage';

const articlePath = '/resources/support-runtime-safety';
const article = getAnswerlatticeResourceArticle(articlePath);

export const metadata: Metadata = {
    title: article?.metaTitle || 'Support Runtime Safety',
    description: article?.metaDescription,
    alternates: { canonical: articlePath },
};

export default function SupportRuntimeSafetyPage() {
    return <AnswerlatticeResourceArticlePage articlePath={articlePath} />;
}

