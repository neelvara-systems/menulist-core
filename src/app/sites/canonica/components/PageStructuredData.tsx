import JsonLdScript from '@/components/seo/JsonLdScript';
import {
    buildCanonicaUrl,
    CANONICA_SITE_URL,
    getCanonicaPublicPage,
} from '../siteConfig';

function labelFromPath(path: string): string {
    if (path === '/') return 'Home';
    const finalSegment = path.split('/').filter(Boolean).pop() || path;
    return finalSegment
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function buildBreadcrumb(path: string, title: string) {
    const items = [
        {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: CANONICA_SITE_URL,
        },
    ];

    if (path !== '/') {
        items.push({
            '@type': 'ListItem',
            position: 2,
            name: title.replace(/\s+\|\s+Canonica$/, ''),
            item: buildCanonicaUrl(path),
        });
    }

    return items;
}

function buildPageId(path: string): string {
    return `${buildCanonicaUrl(path)}${path === '/' ? '/' : ''}#webpage`;
}

export default function CanonicaPageStructuredData({ path }: { path: string }) {
    const page = getCanonicaPublicPage(path);
    const title = page?.title || `${labelFromPath(path)} | Canonica`;
    const description = page?.description || 'Canonica public product page.';
    const url = buildCanonicaUrl(path);

    const graph = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebPage',
                '@id': buildPageId(path),
                url,
                name: title,
                description,
                isPartOf: { '@id': `${CANONICA_SITE_URL}/#website` },
                publisher: { '@id': `${CANONICA_SITE_URL}/#organization` },
                breadcrumb: { '@id': `${url}#breadcrumb` },
            },
            {
                '@type': 'BreadcrumbList',
                '@id': `${url}#breadcrumb`,
                itemListElement: buildBreadcrumb(path, title),
            },
        ],
    };

    return <JsonLdScript id={`canonica-page-jsonld-${path.replace(/[^a-z0-9]/gi, '-') || 'home'}`} data={graph} />;
}
