import { Metadata } from 'next';
import { getAnswerlatticeResourceArticle } from '@/content/answerlatticePublic';
import AnswerlatticeResourceArticlePage from '../ResourceArticlePage';

const articlePath = '/resources/hosted-help-setup';
const article = getAnswerlatticeResourceArticle(articlePath);

export const metadata: Metadata = {
    title: article?.metaTitle || 'Hosted Help Setup',
    description: article?.metaDescription,
    alternates: { canonical: articlePath },
};

export default function HostedHelpSetupPage() {
    return <AnswerlatticeResourceArticlePage articlePath={articlePath} />;
}

