import { CANONICA_SITE_URL } from '../siteConfig';

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
            },
            {
                '@type': 'WebSite',
                '@id': `${CANONICA_SITE_URL}/#website`,
                name: 'Canonica',
                url: CANONICA_SITE_URL,
                publisher: { '@id': `${CANONICA_SITE_URL}/#organization` },
            },
            {
                '@type': 'SoftwareApplication',
                '@id': `${CANONICA_SITE_URL}/#software`,
                name: 'Canonica',
                applicationCategory: 'CustomerSupportApplication',
                operatingSystem: 'Web',
                url: CANONICA_SITE_URL,
                description: 'Support knowledge control plane for SaaS products with launch setup, page-aware widget, hosted help, canonical answers, and drift governance.',
                offers: {
                    '@type': 'Offer',
                    price: '999',
                    priceCurrency: 'INR',
                    category: 'Subscription',
                    url: `${CANONICA_SITE_URL}/pricing`,
                },
            },
        ],
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
        />
    );
}
