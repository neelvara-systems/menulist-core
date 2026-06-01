import { buildWebsiteResourcePath } from '@/content/websiteResources';
import type {
    WebsiteResourceArticle,
    WebsiteResourceClusterLabels,
    WebsiteResourcesLabels,
} from '@/content/websiteResources/types';
import { LuArrowLeft, LuArrowRight, LuCalendarDays, LuClock3 } from 'react-icons/lu';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import ArticleSection from './ArticleSection';
import FaqBlock from './FaqBlock';
import RelatedResources from './RelatedResources';
import ResourceAnalytics from './ResourceAnalytics';
import ResourceTrackedLink from './ResourceTrackedLink';
import { ResourceFallbackIcon, resourceIconByCluster } from './resourceIcons';

interface ArticleLayoutProps {
    article: WebsiteResourceArticle;
    clusterLabels: WebsiteResourceClusterLabels;
    labels: WebsiteResourcesLabels;
    locale?: string | null;
    relatedArticles: WebsiteResourceArticle[];
}

export default function ArticleLayout({
    article,
    clusterLabels,
    labels,
    locale,
    relatedArticles,
}: ArticleLayoutProps) {
    const Icon = resourceIconByCluster[article.cluster] || ResourceFallbackIcon;
    const hubPath = buildWebsiteResourcePath(null, locale);

    return (
        <main className="ws-resource-article-page">
            <ResourceAnalytics
                cluster={article.cluster}
                pageType="article"
                slug={article.slug}
            />
            <section className="ws-resource-article-hero">
                <div className="ws-container ws-resource-article-hero__inner">
                    <ResourceTrackedLink
                        href={hubPath}
                        eventName="resource_back_to_hub_click"
                        eventProps={{ slug: article.slug, cluster: article.cluster }}
                        className="ws-resource-back-link"
                    >
                        <LuArrowLeft size={16} /> {labels.backToHub}
                    </ResourceTrackedLink>

                    <div className="ws-resource-article-hero__meta">
                        <span><Icon size={15} /> {clusterLabels[article.cluster]}</span>
                        <span><LuClock3 size={15} /> {labels.readingTime}: {article.readingTime}</span>
                        <span><LuCalendarDays size={15} /> {labels.updated}: {article.updatedAt}</span>
                    </div>

                    <WebsiteHeadline as="h1" text={article.title} />
                    <p className="ws-resource-article-hero__description">{article.description}</p>

                    <div className="ws-resource-article-hero__actions">
                        <ResourceTrackedLink
                            href={article.primaryCta.href}
                            eventName="resource_primary_cta_click"
                            eventProps={{ slug: article.slug, cluster: article.cluster }}
                            className="ws-btn ws-btn--primary"
                        >
                            {article.primaryCta.label} <LuArrowRight size={16} />
                        </ResourceTrackedLink>
                    </div>

                    <div className="ws-resource-quick-answer" aria-label={labels.quickAnswer}>
                        <p>{labels.quickAnswer}</p>
                        <strong>{article.quickAnswer}</strong>
                    </div>
                </div>
            </section>

            <section className="ws-section">
                <div className="ws-container ws-resource-article-grid">
                    <aside className="ws-resource-toc" aria-label={labels.onThisPage}>
                        <p>{labels.onThisPage}</p>
                        <nav>
                            {article.sections.map((section) => (
                                <a key={section.id} href={`#${section.id}`}>
                                    {section.title}
                                </a>
                            ))}
                        </nav>
                    </aside>

                    <article className="ws-resource-article-body">
                        {article.sections.map((section) => (
                            <ArticleSection
                                key={section.id}
                                section={section}
                                labels={{
                                    checklist: labels.checklist,
                                    comparison: labels.comparison,
                                }}
                            />
                        ))}

                        <FaqBlock faq={article.faq || []} title={labels.faqTitle} />

                        <RelatedResources
                            articles={relatedArticles}
                            currentSlug={article.slug}
                            linkLabel={labels.readResource}
                            locale={locale}
                            title={labels.relatedResources}
                        />
                    </article>
                </div>
            </section>
        </main>
    );
}
