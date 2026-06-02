import { buildWebsiteResourcePath } from '@/content/websiteResources';
import type { WebsiteResourceArticle } from '@/content/websiteResources/types';
import { LuArrowRight } from 'react-icons/lu';
import ResourceTrackedLink from './ResourceTrackedLink';

interface RelatedResourcesProps {
    articles: WebsiteResourceArticle[];
    currentSlug: string;
    linkLabel: string;
    locale?: string | null;
    title: string;
}

export default function RelatedResources({
    articles,
    currentSlug,
    linkLabel,
    locale,
    title,
}: RelatedResourcesProps) {
    if (!articles.length) return null;

    return (
        <section className="ws-resource-related" aria-labelledby="resource-related-title">
            <h2 id="resource-related-title">{title}</h2>
            <div className="ws-resource-related__grid">
                {articles.map((article) => (
                    <article key={article.slug} className="ws-resource-related__item">
                        <h3>{article.title}</h3>
                        <p>{article.description}</p>
                        <ResourceTrackedLink
                            href={buildWebsiteResourcePath(article.slug, locale)}
                            eventName="resource_related_click"
                            eventProps={{
                                slug: currentSlug,
                                related_slug: article.slug,
                                cluster: article.cluster,
                                cta_label: linkLabel,
                            }}
                            className="ws-resource-related__link"
                        >
                            {linkLabel} <LuArrowRight size={16} />
                        </ResourceTrackedLink>
                    </article>
                ))}
            </div>
        </section>
    );
}
