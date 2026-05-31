import JsonLdScript from '@/components/seo/JsonLdScript';
import {
    buildAnswerlatticeUrl,
    ANSWERLATTICE_SITE_URL,
    getAnswerlatticePublicPage,
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
            item: ANSWERLATTICE_SITE_URL,
        },
    ];

    if (path !== '/') {
        items.push({
            '@type': 'ListItem',
            position: 2,
            name: title.replace(/\s+\|\s+Answerlattice$/, ''),
            item: buildAnswerlatticeUrl(path),
        });
    }

    return items;
}

function buildPageId(path: string): string {
    return `${buildAnswerlatticeUrl(path)}${path === '/' ? '/' : ''}#webpage`;
}

export default function AnswerlatticePageStructuredData({ path }: { path: string }) {
    const page = getAnswerlatticePublicPage(path);
    const title = page?.title || `${labelFromPath(path)} | Answerlattice`;
    const description = page?.description || 'Answerlattice public product page.';
    const url = buildAnswerlatticeUrl(path);

    const graph = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebPage',
                '@id': buildPageId(path),
                url,
                name: title,
                description,
                isPartOf: { '@id': `${ANSWERLATTICE_SITE_URL}/#website` },
                publisher: { '@id': `${ANSWERLATTICE_SITE_URL}/#organization` },
                breadcrumb: { '@id': `${url}#breadcrumb` },
            },
            {
                '@type': 'BreadcrumbList',
                '@id': `${url}#breadcrumb`,
                itemListElement: buildBreadcrumb(path, title),
            },
        ],
    };

    return <JsonLdScript id={`answerlattice-page-jsonld-${path.replace(/[^a-z0-9]/gi, '-') || 'home'}`} data={graph} />;
}
