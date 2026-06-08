import type { IconType } from 'react-icons';
import {
  LuActivity,
  LuBuilding2,
  LuCamera,
  LuQrCode,
  LuSearch,
  LuSmartphone,
} from 'react-icons/lu';

export type WebsiteFeatureNavLink = {
  href: string;
  icon: IconType;
  key: string;
};

export const websiteFeatureNavLinks: WebsiteFeatureNavLink[] = [
  { href: '/features/menu-import', key: 'featureMenuImport', icon: LuCamera },
  { href: '/features/official-business-page', key: 'featureOfficialBusinessPage', icon: LuBuilding2 },
  { href: '/features/qr-menu-links', key: 'featureQrMenuLinks', icon: LuQrCode },
  { href: '/features/owner-phone-dashboard', key: 'featureOwnerPhoneDashboard', icon: LuSmartphone },
  { href: '/features/business-health', key: 'featureBusinessHealth', icon: LuActivity },
  { href: '/features/public-discovery', key: 'featurePublicDiscovery', icon: LuSearch },
];
