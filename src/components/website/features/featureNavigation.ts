import type { IconType } from 'react-icons';
import {
  LuActivity,
  LuBuilding2,
  LuCamera,
  LuFileText,
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

export const websiteFeatureNavLinks: WebsiteFeatureNavLink[] = [
  { href: '/features/menu-import', key: 'featureMenuImport', icon: LuCamera },
  { href: '/features/menu-content-prep', key: 'featureMenuContentPrep', icon: LuFileText },
  { href: '/features/featured-choices', key: 'featureFeaturedChoices', icon: LuSparkles },
  { href: '/features/official-business-page', key: 'featureOfficialBusinessPage', icon: LuBuilding2 },
  { href: '/features/qr-menu-links', key: 'featureQrMenuLinks', icon: LuQrCode },
  { href: '/features/print-ready-kit', key: 'featurePrintReadyKit', icon: LuPrinter },
  { href: '/features/owner-phone-dashboard', key: 'featureOwnerPhoneDashboard', icon: LuSmartphone },
  { href: '/features/business-health', key: 'featureBusinessHealth', icon: LuActivity },
  { href: '/features/public-discovery', key: 'featurePublicDiscovery', icon: LuSearch },
];
