import JsonLdScript from '@/components/seo/JsonLdScript';
import {
    ANSWERLATTICE_RESOURCE_ARTICLES,
    getAnswerlatticeRelatedResourceArticles,
    type AnswerlatticeResourceArticle,
} from '@/content/answerlatticePublic';
import {
    ANSWERLATTICE_SITE_URL,
    buildAnswerlatticeUrl,
} from '../siteConfig';

type AnswerlatticeResourceStructuredDataProps =
    | {
        type: 'hub';
    }
    | {
        article: AnswerlatticeResourceArticle;
        type: 'article';
    };

function buildBreadcrumb(url: string, title: string, includeResourceParent = false) {
    const itemListElement: Array<Record<string, unknown>> = [
        {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: ANSWERLATTICE_SITE_URL,
        },
    ];

    if (includeResourceParent) {
        itemListElement.push({
            '@type': 'ListItem',
            position: 2,
            name: 'Resources',
            item: buildAnswerlatticeUrl('/resources'),
        });
    }

    itemListElement.push({
        '@type': 'ListItem',
        position: itemListElement.length + 1,
        name: title,
        item: url,
    });

    return {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement,
    };
}

function buildResourceHubSchema() {
    const url = buildAnswerlatticeUrl('/resources');

    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebPage',
                '@id': `${url}#webpage`,
                url,
                name: 'AnswerLattice Resources',
                description: 'AnswerLattice resources for launch setup, widget install, safe context, support control, pricing, and support review.',
                isPartOf: { '@id': `${ANSWERLATTICE_SITE_URL}/#website` },
                publisher: { '@id': `${ANSWERLATTICE_SITE_URL}/#organization` },
                breadcrumb: { '@id': `${url}#breadcrumb` },
            },
            buildBreadcrumb(url, 'Resources'),
            {
                '@type': 'ItemList',
                '@id': `${url}#resources`,
                name: 'AnswerLattice Resource Articles',
                itemListElement: ANSWERLATTICE_RESOURCE_ARTICLES.map((article, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    name: article.title,
                    url: buildAnswerlatticeUrl(article.path),
                })),
            },
        ],
    };
}

function buildResourceArticleSchema(article: AnswerlatticeResourceArticle) {
    const url = buildAnswerlatticeUrl(article.path);
    const relatedArticles = getAnswerlatticeRelatedResourceArticles(article);
    const graph: Array<Record<string, unknown>> = [
        {
            '@type': 'WebPage',
            '@id': `${url}#webpage`,
            url,
            name: article.metaTitle,
            description: article.metaDescription,
            isPartOf: { '@id': `${ANSWERLATTICE_SITE_URL}/#website` },
            publisher: { '@id': `${ANSWERLATTICE_SITE_URL}/#organization` },
            breadcrumb: { '@id': `${url}#breadcrumb` },
        },
        {
            '@type': 'Article',
            '@id': `${url}#article`,
            headline: article.title,
            description: article.metaDescription,
            datePublished: article.publishedAt,
            dateModified: article.updatedAt,
            mainEntityOfPage: { '@id': `${url}#webpage` },
            author: { '@id': `${ANSWERLATTICE_SITE_URL}/#organization` },
            publisher: { '@id': `${ANSWERLATTICE_SITE_URL}/#organization` },
            isPartOf: { '@id': `${ANSWERLATTICE_SITE_URL}/#website` },
            relatedLink: relatedArticles.map((related) => buildAnswerlatticeUrl(related.path)),
        },
        buildBreadcrumb(url, article.title, true),
    ];

    if (article.faq?.length) {
        graph.push({
            '@type': 'FAQPage',
            '@id': `${url}#faq`,
            mainEntity: article.faq.map((item) => ({
                '@type': 'Question',
                name: item.question,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: item.answer,
                },
            })),
        });
    }

    return {
        '@context': 'https://schema.org',
        '@graph': graph,
    };
}

export default function AnswerlatticeResourceStructuredData(props: AnswerlatticeResourceStructuredDataProps) {
    if (props.type === 'hub') {
        return (
            <JsonLdScript
                id="answerlattice-resources-jsonld"
                data={buildResourceHubSchema()}
            />
        );
    }

    return (
        <JsonLdScript
            id={`answerlattice-resource-jsonld-${props.article.slug}`}
            data={buildResourceArticleSchema(props.article)}
        />
    );
}
