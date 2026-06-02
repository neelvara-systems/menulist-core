import type { WebsiteResourcesCopy } from '@/content/websiteResources/types';
import { WEBSITE_RESOURCE_HUB_PATH, buildWebsiteResourcePath } from '@/content/websiteResources';
import WebsiteHeadline from '../shared/WebsiteHeadline';
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

interface ResourcesHubProps {
    copy: WebsiteResourcesCopy;
    locale?: string | null;
}

export default function ResourcesHub({ copy, locale }: ResourcesHubProps) {
    const toolArticles = toolSlugs
        .map((slug) => copy.articles.find((article) => article.slug === slug))
        .filter(Boolean) as typeof copy.articles;
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
                </div>
            </section>

            <section className="ws-section">
                <div className="ws-container">
                    <div className="ws-resources-section-heading">
                        <WebsiteHeadline
                            as="h2"
                            text={copy.hub.clusterTitle}
                        />
                        <p>{copy.hub.clusterSubtitle}</p>
                    </div>
                    <div className="ws-resource-card-grid">
                        {copy.articles.map((article) => (
                            <ResourceCard
                                key={article.slug}
                                article={article}
                                clusterLabels={copy.clusterLabels}
                                linkLabel={copy.labels.readResource}
                                locale={locale}
                                sourcePage="resources_hub"
                            />
                        ))}
                    </div>
                </div>
            </section>

            <section className="ws-section ws-section--subtle">
                <div className="ws-container">
                    <div className="ws-resources-section-heading">
                        <WebsiteHeadline as="h2" text={copy.hub.toolTitle} />
                        <p>{copy.hub.toolSubtitle}</p>
                    </div>
                    <div className="ws-resource-card-grid ws-resource-card-grid--tools">
                        {toolArticles.map((article) => (
                            <ResourceCard
                                key={article.slug}
                                article={article}
                                clusterLabels={copy.clusterLabels}
                                eventName="resources_tool_card_click"
                                linkLabel={copy.labels.readResource}
                                locale={locale}
                                sourcePage="resources_tools"
                            />
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
