import JsonLdScript from '@/components/seo/JsonLdScript';
import {
    buildCanonicaUrl,
    CANONICA_PUBLIC_PAGES,
    CANONICA_SITE_URL,
} from '../siteConfig';

function buildCanonicaPageId(path: string): string {
    return `${buildCanonicaUrl(path)}${path === '/' ? '/' : ''}#webpage`;
}

export default function CanonicaStructuredData() {
    const graph = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                '@id': `${CANONICA_SITE_URL}/#organization`,
                name: 'Canonica',
                url: CANONICA_SITE_URL,
                email: 'hello@canonica.app',
                logo: {
                    '@type': 'ImageObject',
                    url: buildCanonicaUrl('/canonica-apple-touch-icon.png'),
                },
            },
            {
                '@type': 'WebSite',
                '@id': `${CANONICA_SITE_URL}/#website`,
                name: 'Canonica',
                url: CANONICA_SITE_URL,
                publisher: { '@id': `${CANONICA_SITE_URL}/#organization` },
                hasPart: CANONICA_PUBLIC_PAGES.map((page) => ({
                    '@type': 'WebPage',
                    '@id': buildCanonicaPageId(page.path),
                    url: buildCanonicaUrl(page.path),
                    name: page.title,
                    description: page.description,
                })),
            },
            {
                '@type': 'SoftwareApplication',
                '@id': `${CANONICA_SITE_URL}/#software`,
                name: 'Canonica',
                applicationCategory: 'CustomerSupportApplication',
                operatingSystem: 'Web',
                url: CANONICA_SITE_URL,
                description: 'Accurate page-aware support for SaaS founders: approved answers before fallback, hosted help, and reviewable fixes for missed questions.',
                offers: {
                    '@type': 'Offer',
                    price: '999',
                    priceCurrency: 'INR',
                    category: 'Subscription',
                    url: `${CANONICA_SITE_URL}/pricing`,
                },
            },
            {
                '@type': 'WebPage',
                '@id': `${CANONICA_SITE_URL}/#webpage`,
                url: CANONICA_SITE_URL,
                name: 'Canonica - Accurate Page-Aware Support for SaaS',
                description: 'Canonica helps SaaS founders ship fast without support chaos: approved page-aware answers before fallback, hosted help on their own domain, and reviewable fixes for missed questions.',
                isPartOf: { '@id': `${CANONICA_SITE_URL}/#website` },
                about: { '@id': `${CANONICA_SITE_URL}/#software` },
                breadcrumb: { '@id': `${CANONICA_SITE_URL}/#breadcrumb` },
            },
            {
                '@type': 'BreadcrumbList',
                '@id': `${CANONICA_SITE_URL}/#breadcrumb`,
                itemListElement: [
                    {
                        '@type': 'ListItem',
                        position: 1,
                        name: 'Home',
                        item: CANONICA_SITE_URL,
                    },
                ],
            },
        ],
    };

    return <JsonLdScript id="canonica-homepage-jsonld" data={graph} />;
}
