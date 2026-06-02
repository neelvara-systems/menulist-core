import { Metadata } from 'next';
import { getAnswerlatticeResourceArticle } from '@/content/answerlatticePublic';
import AnswerlatticeResourceArticlePage from '../ResourceArticlePage';

const articlePath = '/resources/launch-support-checklist';
const article = getAnswerlatticeResourceArticle(articlePath);

export const metadata: Metadata = {
    title: article?.metaTitle || 'Launch Support Checklist',
    description: article?.metaDescription,
    alternates: { canonical: articlePath },
};

export default function LaunchSupportChecklistPage() {
    return <AnswerlatticeResourceArticlePage articlePath={articlePath} />;
}

