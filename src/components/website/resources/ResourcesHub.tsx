import type { WebsiteResourcesCopy } from '@/content/websiteResources/types';
import { WEBSITE_RESOURCE_HUB_PATH, buildWebsiteResourcePath } from '@/content/websiteResources';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import ResourceAnalytics from './ResourceAnalytics';
import ResourceCard from './ResourceCard';

const toolSlugs = [
    'menu-source-audit',
    'menu-update-checklist',
    'qr-code-placement-checklist',
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
            <ResourceAnalytics pageType="hub" />
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
                        <WebsiteButton href={copy.hub.primaryCta.href}>{copy.hub.primaryCta.label}</WebsiteButton>
                        <WebsiteButton href={secondaryCtaHref} variant="ghost">
                            {copy.hub.secondaryCta.label}
                        </WebsiteButton>
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
