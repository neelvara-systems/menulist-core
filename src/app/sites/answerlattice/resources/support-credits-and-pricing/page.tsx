import { Metadata } from 'next';
import { getAnswerlatticeResourceArticle } from '@/content/answerlatticePublic';
import AnswerlatticeResourceArticlePage from '../ResourceArticlePage';

const articlePath = '/resources/support-credits-and-pricing';
const article = getAnswerlatticeResourceArticle(articlePath);

export const metadata: Metadata = {
    title: article?.metaTitle || 'Support Credits and Pricing',
    description: article?.metaDescription,
    alternates: { canonical: articlePath },
};

export default function SupportCreditsAndPricingPage() {
    return <AnswerlatticeResourceArticlePage articlePath={articlePath} />;
}

