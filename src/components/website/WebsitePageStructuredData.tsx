import JsonLdScript from '@/components/seo/JsonLdScript';
import { MENULIST_SITE_URL } from '@constant/menulist/website';

const SITE_URL = MENULIST_SITE_URL;

function buildUrl(path: string): string {
  if (!path || path === '/') return SITE_URL;
  return `${SITE_URL}/${path.replace(/^\/+/, '')}`;
}

export default function WebsitePageStructuredData({
  description,
  path,
  title,
}: {
  description: string;
  path: string;
  title: string;
}) {
  const url = buildUrl(path);
  const isHome = path === '/';

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: title,
        description,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        publisher: { '@id': `${SITE_URL}/#organization` },
        breadcrumb: { '@id': `${url}#breadcrumb` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: isHome
          ? [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: SITE_URL,
              },
            ]
          : [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: SITE_URL,
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: title.replace(/\s+\|\s+MenuList$/, '').replace(/\s+\u2014\s+MenuList.*$/, ''),
                item: url,
              },
            ],
      },
    ],
  };

  return <JsonLdScript id={`menulist-page-jsonld-${path.replace(/[^a-z0-9]/gi, '-') || 'home'}`} data={graph} />;
}
