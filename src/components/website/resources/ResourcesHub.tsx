import type { WebsiteResourceCluster, WebsiteResourcesCopy } from '@/content/websiteResources/types';
import { WEBSITE_RESOURCE_HUB_PATH, buildWebsiteResourcePath } from '@/content/websiteResources';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import ResourceAnalytics from './ResourceAnalytics';
import ResourceCard from './ResourceCard';
import ResourceTrackedLink from './ResourceTrackedLink';

const toolSlugs = [
    'menu-source-audit',
    'menu-update-checklist',
    'official-menu-url-checklist',
    'qr-code-placement-checklist',
    'restaurant-qr-menu-mistakes',
    'menu-engineering-worksheet',
];

const recommendedPathSlugs = [
    'menu-source-audit',
    'official-menu-source',
    'qr-menu-for-restaurants',
    'official-menu-url-checklist',
];

const clusterOrder: WebsiteResourceCluster[] = [
    'source-audit',
    'official-source',
    'qr-menu',
    'google-menu',
    'menu-engineering',
    'menu-seo',
    'ai-discovery',
    'multi-location',
    'checklists',
];

interface ResourcesHubProps {
    copy: WebsiteResourcesCopy;
    locale?: string | null;
}

export default function ResourcesHub({ copy, locale }: ResourcesHubProps) {
    const toolArticles = toolSlugs
        .map((slug) => copy.articles.find((article) => article.slug === slug))
        .filter(Boolean) as typeof copy.articles;
    const recommendedPathArticles = recommendedPathSlugs
        .map((slug) => copy.articles.find((article) => article.slug === slug))
        .filter(Boolean) as typeof copy.articles;
    const groupedArticles = clusterOrder
        .map((cluster) => ({
            cluster,
            label: copy.clusterLabels[cluster],
            articles: copy.articles.filter((article) => article.cluster === cluster),
        }))
        .filter((group) => group.articles.length > 0);
    const secondaryCtaHref = copy.hub.secondaryCta.href.startsWith(`${WEBSITE_RESOURCE_HUB_PATH}/`)
        ? buildWebsiteResourcePath(
            copy.hub.secondaryCta.href.replace(`${WEBSITE_RESOURCE_HUB_PATH}/`, ''),
            locale,
        )
        : copy.hub.secondaryCta.href;

    return (
        <main className="ws-resources-page">
            <ResourceAnalytics locale={locale} pageType="hub" />
            <section className="ws-resources-hero">
                <div className="ws-container ws-resources-hero__inner">
                    <AnimateOnScroll preset="hero">
                        <p className="ws-page-hero__eyebrow">{copy.hub.eyebrow}</p>
                        <WebsiteHeadline
                            as="h1"
                            text={copy.hub.title}
                            highlightedText={copy.hub.titleHighlight}
                        />
                        <p className="ws-resources-hero__subtitle">{copy.hub.subtitle}</p>
                        <div className="ws-resources-hero__actions">
                            <ResourceTrackedLink
                                href={copy.hub.primaryCta.href}
                                eventName="resource_primary_cta_click"
                                eventProps={{
                                    cta_label: copy.hub.primaryCta.label,
                                    source_page: 'resources_hub',
                                }}
                                className="ws-btn ws-btn--primary"
                            >
                                {copy.hub.primaryCta.label}
                            </ResourceTrackedLink>
                            <ResourceTrackedLink
                                href={secondaryCtaHref}
                                eventName="resource_secondary_cta_click"
                                eventProps={{
                                    cta_label: copy.hub.secondaryCta.label,
                                    source_page: 'resources_hub',
                                }}
                                className="ws-btn ws-btn--ghost"
                            >
                                {copy.hub.secondaryCta.label}
                            </ResourceTrackedLink>
                        </div>
                        <div className="ws-resources-proof" aria-label={copy.hub.eyebrow}>
                            {copy.hub.proofItems.map((item) => (
                                <span key={item}>{item}</span>
                            ))}
                        </div>
                    </AnimateOnScroll>
                </div>
            </section>

            <section className="ws-section">
                <div className="ws-container">
                    <AnimateOnScroll preset="card" className="ws-resources-section-heading">
                        <WebsiteHeadline
                            as="h2"
                            text={copy.hub.secondaryCta.label}
                        />
                        <p>{copy.hub.clusterSubtitle}</p>
                    </AnimateOnScroll>

                    <div className="ws-resource-path">
                        {recommendedPathArticles.map((article, index) => (
                            <AnimateStaggerChild key={article.slug} index={index} preset="card">
                                <ResourceTrackedLink
                                    href={buildWebsiteResourcePath(article.slug, locale)}
                                    eventName="resources_recommended_path_click"
                                    eventProps={{
                                        resource_slug: article.slug,
                                        source_page: 'resources_hub',
                                        step: index + 1,
                                    }}
                                    className="ws-resource-path__item"
                                >
                                    <span className="ws-resource-path__step">{String(index + 1).padStart(2, '0')}</span>
                                    <span className="ws-resource-path__copy">
                                        <span className="ws-resource-path__cluster">{copy.clusterLabels[article.cluster]}</span>
                                        <strong>{article.title}</strong>
                                        <span>{article.description}</span>
                                    </span>
                                </ResourceTrackedLink>
                            </AnimateStaggerChild>
                        ))}
                    </div>

                    <div className="ws-resource-cluster-list">
                        {groupedArticles.map((group, groupIndex) => (
                            <AnimateStaggerChild key={group.cluster} index={groupIndex} preset="card">
                                <section className="ws-resource-cluster-group">
                                    <div className="ws-resource-cluster-group__heading">
                                        <h3>{group.label}</h3>
                                        <span>{group.articles.length}</span>
                                    </div>
                                    <div className="ws-resource-card-grid ws-resource-card-grid--clustered">
                                        {group.articles.map((article, index) => (
                                            <AnimateStaggerChild key={article.slug} index={index} preset="card">
                                                <ResourceCard
                                                    article={article}
                                                    clusterLabels={copy.clusterLabels}
                                                    linkLabel={copy.labels.readResource}
                                                    locale={locale}
                                                    sourcePage="resources_hub"
                                                />
                                            </AnimateStaggerChild>
                                        ))}
                                    </div>
                                </section>
                            </AnimateStaggerChild>
                        ))}
                    </div>
                </div>
            </section>

            <section className="ws-section ws-section--subtle">
                <div className="ws-container">
                    <AnimateOnScroll preset="card" className="ws-resources-section-heading">
                        <WebsiteHeadline as="h2" text={copy.hub.toolTitle} />
                        <p>{copy.hub.toolSubtitle}</p>
                    </AnimateOnScroll>
                    <div className="ws-resource-card-grid ws-resource-card-grid--tools">
                        {toolArticles.map((article, index) => (
                            <AnimateStaggerChild key={article.slug} index={index} preset="card">
                                <ResourceCard
                                    article={article}
                                    clusterLabels={copy.clusterLabels}
                                    eventName="resources_tool_card_click"
                                    linkLabel={copy.labels.readResource}
                                    locale={locale}
                                    sourcePage="resources_tools"
                                />
                            </AnimateStaggerChild>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
