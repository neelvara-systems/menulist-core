import { Metadata } from 'next';
import { getAnswerlatticeResourceArticle } from '@/content/answerlatticePublic';
import AnswerlatticeResourceArticlePage from '../ResourceArticlePage';

const articlePath = '/resources/widget-install-verification';
const article = getAnswerlatticeResourceArticle(articlePath);

export const metadata: Metadata = {
    title: article?.metaTitle || 'Widget Install Verification',
    description: article?.metaDescription,
    alternates: { canonical: articlePath },
};

export default function WidgetInstallVerificationPage() {
    return <AnswerlatticeResourceArticlePage articlePath={articlePath} />;
}

