import { Metadata } from 'next';
import { getAnswerlatticeResourceArticle } from '@/content/answerlatticePublic';
import AnswerlatticeResourceArticlePage from '../ResourceArticlePage';

const articlePath = '/resources/support-board-workflow';
const article = getAnswerlatticeResourceArticle(articlePath);

export const metadata: Metadata = {
    title: article?.metaTitle || 'Support Board Workflow',
    description: article?.metaDescription,
    alternates: { canonical: articlePath },
};

export default function SupportBoardWorkflowPage() {
    return <AnswerlatticeResourceArticlePage articlePath={articlePath} />;
}

