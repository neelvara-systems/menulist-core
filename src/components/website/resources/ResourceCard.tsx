import { buildWebsiteResourcePath } from '@/content/websiteResources';
import type {
    WebsiteResourceArticle,
    WebsiteResourceClusterLabels,
} from '@/content/websiteResources/types';
import { LuArrowRight } from 'react-icons/lu';
import ResourceTrackedLink from './ResourceTrackedLink';
import { ResourceFallbackIcon, resourceIconByCluster } from './resourceIcons';

interface ResourceCardProps {
    article: WebsiteResourceArticle;
    clusterLabels: WebsiteResourceClusterLabels;
    eventName?: string;
    linkLabel: string;
    locale?: string | null;
    sourcePage: string;
}

export default function ResourceCard({
    article,
    clusterLabels,
    eventName = 'resources_hub_card_click',
    linkLabel,
    locale,
    sourcePage,
}: ResourceCardProps) {
    const Icon = resourceIconByCluster[article.cluster] || ResourceFallbackIcon;
    const href = buildWebsiteResourcePath(article.slug, locale);

    return (
        <article className="ws-resource-card">
            <div className="ws-resource-card__icon" aria-hidden="true">
                <Icon size={22} />
            </div>
            <p className="ws-resource-card__cluster">{clusterLabels[article.cluster]}</p>
            <h3>{article.title}</h3>
            <p>{article.description}</p>
            <ResourceTrackedLink
                href={href}
                eventName={eventName}
                eventProps={{
                    cluster: article.cluster,
                    slug: article.slug,
                    source_page: sourcePage,
                }}
                className="ws-resource-card__link"
            >
                {linkLabel} <LuArrowRight size={16} />
            </ResourceTrackedLink>
        </article>
    );
}
