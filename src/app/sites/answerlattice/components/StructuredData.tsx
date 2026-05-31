import JsonLdScript from '@/components/seo/JsonLdScript';
import {
    buildAnswerlatticeUrl,
    ANSWERLATTICE_PUBLIC_PAGES,
    ANSWERLATTICE_SITE_DESCRIPTION,
    ANSWERLATTICE_SITE_TITLE,
    ANSWERLATTICE_SITE_URL,
} from '../siteConfig';

function buildAnswerlatticePageId(path: string): string {
    return `${buildAnswerlatticeUrl(path)}${path === '/' ? '/' : ''}#webpage`;
}

export default function AnswerlatticeStructuredData() {
    const graph = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                '@id': `${ANSWERLATTICE_SITE_URL}/#organization`,
                name: 'Answerlattice',
                url: ANSWERLATTICE_SITE_URL,
                email: 'hello@answerlattice.com',
                logo: {
                    '@type': 'ImageObject',
                    url: buildAnswerlatticeUrl('/answerlattice-apple-touch-icon.png'),
                },
            },
            {
                '@type': 'WebSite',
                '@id': `${ANSWERLATTICE_SITE_URL}/#website`,
                name: 'Answerlattice',
                url: ANSWERLATTICE_SITE_URL,
                publisher: { '@id': `${ANSWERLATTICE_SITE_URL}/#organization` },
                hasPart: ANSWERLATTICE_PUBLIC_PAGES.map((page) => ({
                    '@type': 'WebPage',
                    '@id': buildAnswerlatticePageId(page.path),
                    url: buildAnswerlatticeUrl(page.path),
                    name: page.title,
                    description: page.description,
                })),
            },
            {
                '@type': 'SoftwareApplication',
                '@id': `${ANSWERLATTICE_SITE_URL}/#software`,
                name: 'Answerlattice',
                applicationCategory: 'CustomerSupportApplication',
                operatingSystem: 'Web',
                url: ANSWERLATTICE_SITE_URL,
                description: ANSWERLATTICE_SITE_DESCRIPTION,
                offers: {
                    '@type': 'Offer',
                    price: '999',
                    priceCurrency: 'INR',
                    category: 'Subscription',
                    url: `${ANSWERLATTICE_SITE_URL}/pricing`,
                },
            },
            {
                '@type': 'WebPage',
                '@id': `${ANSWERLATTICE_SITE_URL}/#webpage`,
                url: ANSWERLATTICE_SITE_URL,
                name: ANSWERLATTICE_SITE_TITLE,
                description: ANSWERLATTICE_SITE_DESCRIPTION,
                isPartOf: { '@id': `${ANSWERLATTICE_SITE_URL}/#website` },
                about: { '@id': `${ANSWERLATTICE_SITE_URL}/#software` },
                breadcrumb: { '@id': `${ANSWERLATTICE_SITE_URL}/#breadcrumb` },
            },
            {
                '@type': 'BreadcrumbList',
                '@id': `${ANSWERLATTICE_SITE_URL}/#breadcrumb`,
                itemListElement: [
                    {
                        '@type': 'ListItem',
                        position: 1,
                        name: 'Home',
                        item: ANSWERLATTICE_SITE_URL,
                    },
                ],
            },
        ],
    };

    return <JsonLdScript id="answerlattice-homepage-jsonld" data={graph} />;
}
