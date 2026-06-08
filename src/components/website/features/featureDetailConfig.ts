import type { IconType } from 'react-icons';
import {
  LuActivity,
  LuBadgeCheck,
  LuBuilding2,
  LuCamera,
  LuCheckCircle2,
  LuEye,
  LuFileText,
  LuGlobe,
  LuLanguages,
  LuLink,
  LuMapPin,
  LuPhoneCall,
  LuPrinter,
  LuQrCode,
  LuRefreshCw,
  LuSearch,
  LuShieldCheck,
  LuSmartphone,
  LuUploadCloud,
} from 'react-icons/lu';

export type FeatureDetailSlug =
  | 'menu-import'
  | 'official-business-page'
  | 'qr-menu-links'
  | 'owner-phone-dashboard'
  | 'public-discovery';

export type FeatureDetailConfig = {
  heroIcon: IconType;
  key: string;
  proofIcons: [IconType, IconType, IconType, IconType];
  slug: FeatureDetailSlug;
  storyIcons: [IconType, IconType, IconType];
};

export const featureDetailConfigs: Record<FeatureDetailSlug, FeatureDetailConfig> = {
  'menu-import': {
    slug: 'menu-import',
    key: 'menuImport',
    heroIcon: LuUploadCloud,
    storyIcons: [LuCamera, LuFileText, LuLanguages],
    proofIcons: [LuCheckCircle2, LuEye, LuRefreshCw, LuShieldCheck],
  },
  'official-business-page': {
    slug: 'official-business-page',
    key: 'officialBusinessPage',
    heroIcon: LuBuilding2,
    storyIcons: [LuBuilding2, LuMapPin, LuPhoneCall],
    proofIcons: [LuBadgeCheck, LuGlobe, LuSearch, LuShieldCheck],
  },
  'qr-menu-links': {
    slug: 'qr-menu-links',
    key: 'qrMenuLinks',
    heroIcon: LuQrCode,
    storyIcons: [LuQrCode, LuLink, LuPrinter],
    proofIcons: [LuCheckCircle2, LuRefreshCw, LuSmartphone, LuShieldCheck],
  },
  'owner-phone-dashboard': {
    slug: 'owner-phone-dashboard',
    key: 'ownerPhoneDashboard',
    heroIcon: LuSmartphone,
    storyIcons: [LuSmartphone, LuActivity, LuRefreshCw],
    proofIcons: [LuCheckCircle2, LuEye, LuShieldCheck, LuBadgeCheck],
  },
  'public-discovery': {
    slug: 'public-discovery',
    key: 'publicDiscovery',
    heroIcon: LuSearch,
    storyIcons: [LuBuilding2, LuGlobe, LuSearch],
    proofIcons: [LuFileText, LuBadgeCheck, LuShieldCheck, LuEye],
  },
};
