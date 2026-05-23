import JsonLdScript from '@/components/seo/JsonLdScript';
import { PLATFORM_URL } from '@constant/urls';

const SITE_URL = PLATFORM_URL;
const SITE_DESCRIPTION = 'MenuList is a system that manages official menus and public business information across all customer-facing surfaces.';
const SITE_IMAGE = `${SITE_URL}/images/website/menulist-og-official-source.png`;
const SITE_LOGO = `${SITE_URL}/apple-touch-icon.png`;

const graph = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'MenuList',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: SITE_LOGO,
      },
      image: SITE_IMAGE,
      description: SITE_DESCRIPTION,
      foundingDate: '2024',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'IN',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: 'hello@menulist.ai',
      },
      sameAs: [
        'https://instagram.com/menulistai',
        'https://linkedin.com/company/menulistai',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'MenuList',
      url: SITE_URL,
      description: 'Official website for MenuList, a public menu and business information source for SMBs.',
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: ['en-IN', 'hi-IN'],
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: 'MenuList',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: 'Manage your official menu and business information from one owner-approved source across QR, screens, web, print, official pages, and saved customer menu shortcuts.',
      url: SITE_URL,
      image: SITE_IMAGE,
      publisher: { '@id': `${SITE_URL}/#organization` },
      offers: {
        '@type': 'AggregateOffer',
        lowPrice: '4990',
        highPrice: '39990',
        priceCurrency: 'INR',
        offerCount: '3',
        url: `${SITE_URL}/pricing`,
      },
    },
    {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: 'MenuList - One Official Menu Source for Customers',
      description: 'Upload your current menu. Review the prepared version. Publish one official menu, page, QR link, screen, PDF, and customer view from the same owner-approved source.',
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#software` },
      primaryImageOfPage: {
        '@type': 'ImageObject',
        url: SITE_IMAGE,
      },
      breadcrumb: { '@id': `${SITE_URL}/#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${SITE_URL}/#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: SITE_URL,
        },
      ],
    },
  ],
};

export default function SchemaMarkup() {
  return <JsonLdScript id="menulist-homepage-jsonld" data={graph} />;
}
