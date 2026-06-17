import type { IconType } from 'react-icons';
import {
  LuActivity,
  LuBot,
  LuBuilding2,
  LuCamera,
  LuFileText,
  LuMessageSquare,
  LuPrinter,
  LuQrCode,
  LuSearch,
  LuSparkles,
  LuSmartphone,
} from 'react-icons/lu';

export type WebsiteFeatureNavLink = {
  href: string;
  icon: IconType;
  key: string;
};

export type WebsiteFeatureNavGroup = {
  key: string;
  links: WebsiteFeatureNavLink[];
};

export const websiteFeatureNavLinks: WebsiteFeatureNavLink[] = [
  { href: '/ai-menu-manager', key: 'featureAiMenuManager', icon: LuBot },
  { href: '/features/menu-import', key: 'featureMenuImport', icon: LuCamera },
  { href: '/features/menu-content-prep', key: 'featureMenuContentPrep', icon: LuFileText },
  { href: '/features/featured-choices', key: 'featureFeaturedChoices', icon: LuSparkles },
  { href: '/features/official-business-page', key: 'featureOfficialBusinessPage', icon: LuBuilding2 },
  { href: '/features/qr-menu-links', key: 'featureQrMenuLinks', icon: LuQrCode },
  { href: '/features/print-ready-kit', key: 'featurePrintReadyKit', icon: LuPrinter },
  { href: '/features/owner-phone-dashboard', key: 'featureOwnerPhoneDashboard', icon: LuSmartphone },
  { href: '/features/business-health', key: 'featureBusinessHealth', icon: LuActivity },
  { href: '/features/customer-feedback-loop', key: 'featureCustomerFeedbackLoop', icon: LuMessageSquare },
  { href: '/features/public-discovery', key: 'featurePublicDiscovery', icon: LuSearch },
];

const byHref = new Map(websiteFeatureNavLinks.map((link) => [link.href, link]));

function getFeatureLink(href: string) {
  const link = byHref.get(href);
  if (!link) {
    throw new Error(`Missing website feature nav link for ${href}`);
  }

  return link;
}

export const websiteFeatureNavGroups: WebsiteFeatureNavGroup[] = [
  {
    key: 'featureGroupStart',
    links: [
      getFeatureLink('/features/menu-import'),
      getFeatureLink('/features/menu-content-prep'),
      getFeatureLink('/features/featured-choices'),
    ],
  },
  {
    key: 'featureGroupPublish',
    links: [
      getFeatureLink('/features/official-business-page'),
      getFeatureLink('/features/qr-menu-links'),
      getFeatureLink('/features/print-ready-kit'),
    ],
  },
  {
    key: 'featureGroupOperate',
    links: [
      getFeatureLink('/ai-menu-manager'),
      getFeatureLink('/features/owner-phone-dashboard'),
      getFeatureLink('/features/business-health'),
      getFeatureLink('/features/customer-feedback-loop'),
      getFeatureLink('/features/public-discovery'),
    ],
  },
];
