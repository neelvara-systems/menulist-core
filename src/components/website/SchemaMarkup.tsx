import JsonLdScript from '@/components/seo/JsonLdScript';
import {
  MENULIST_ENTITY_DESCRIPTION,
  MENULIST_SITE_DESCRIPTION,
  MENULIST_SITE_IMAGE,
  MENULIST_SITE_TITLE,
  MENULIST_SITE_URL,
} from '@constant/menulist/website';
import { B2CplansList } from '@data/PlatformPlansList';
import { WEBSITE_LANGUAGES } from '@config/websiteLanguages';

const SITE_URL = MENULIST_SITE_URL;
const SITE_DESCRIPTION = MENULIST_ENTITY_DESCRIPTION;
const SITE_IMAGE = `${SITE_URL}${MENULIST_SITE_IMAGE}`;
const SITE_LOGO = `${SITE_URL}/apple-touch-icon.png`;
const monthlyWebsitePlans = B2CplansList.filter((plan) => plan.billingInterval === 'MONTH');
const monthlyInrPrices = monthlyWebsitePlans.map((plan) => plan.priceINR.price / 100);

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
      inLanguage: WEBSITE_LANGUAGES.map((language) => language.code),
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
        lowPrice: String(Math.min(...monthlyInrPrices)),
        highPrice: String(Math.max(...monthlyInrPrices)),
        priceCurrency: 'INR',
        offerCount: String(monthlyWebsitePlans.length),
        url: `${SITE_URL}/pricing`,
      },
    },
    {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: MENULIST_SITE_TITLE,
      description: MENULIST_SITE_DESCRIPTION,
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
