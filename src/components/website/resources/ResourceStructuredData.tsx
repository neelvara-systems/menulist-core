import JsonLdScript from '@/components/seo/JsonLdScript';
import type { WebsiteResourceArticle } from '@/content/websiteResources/types';
import { buildResourceArticleSchema, buildResourcesHubSchema } from '@/lib/website/resourceSchema';

type ResourceStructuredDataProps =
    | {
        articles: WebsiteResourceArticle[];
        locale?: string | null;
        type: 'hub';
    }
    | {
        article: WebsiteResourceArticle;
        locale?: string | null;
        type: 'article';
    };

export default function ResourceStructuredData(props: ResourceStructuredDataProps) {
    if (props.type === 'hub') {
        return (
            <JsonLdScript
                id="menulist-resources-jsonld"
                data={buildResourcesHubSchema(props.articles, props.locale)}
            />
        );
    }

    return (
        <JsonLdScript
            id={`menulist-resource-jsonld-${props.article.slug}`}
            data={buildResourceArticleSchema(props.article, props.locale)}
        />
    );
}
