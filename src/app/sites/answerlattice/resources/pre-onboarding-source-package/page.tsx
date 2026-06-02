import { Metadata } from 'next';
import { getAnswerlatticeResourceArticle } from '@/content/answerlatticePublic';
import AnswerlatticeResourceArticlePage from '../ResourceArticlePage';

const articlePath = '/resources/pre-onboarding-source-package';
const article = getAnswerlatticeResourceArticle(articlePath);

export const metadata: Metadata = {
    title: article?.metaTitle || 'Pre-Onboarding Source Package',
    description: article?.metaDescription,
    alternates: { canonical: articlePath },
};

export default function PreOnboardingSourcePackagePage() {
    return <AnswerlatticeResourceArticlePage articlePath={articlePath} />;
}

