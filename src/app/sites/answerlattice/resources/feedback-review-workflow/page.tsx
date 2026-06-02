import { Metadata } from 'next';
import { getAnswerlatticeResourceArticle } from '@/content/answerlatticePublic';
import AnswerlatticeResourceArticlePage from '../ResourceArticlePage';

const articlePath = '/resources/feedback-review-workflow';
const article = getAnswerlatticeResourceArticle(articlePath);

export const metadata: Metadata = {
    title: article?.metaTitle || 'Feedback Review Workflow',
    description: article?.metaDescription,
    alternates: { canonical: articlePath },
};

export default function FeedbackReviewWorkflowPage() {
    return <AnswerlatticeResourceArticlePage articlePath={articlePath} />;
}

