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
  LuImage,
  LuLanguages,
  LuLink,
  LuMapPin,
  LuPackage,
  LuPhoneCall,
  LuSparkles,
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
  | 'menu-content-prep'
  | 'featured-choices'
  | 'official-business-page'
  | 'qr-menu-links'
  | 'print-ready-kit'
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
  'menu-content-prep': {
    slug: 'menu-content-prep',
    key: 'menuContentPrep',
    heroIcon: LuFileText,
    storyIcons: [LuFileText, LuImage, LuLanguages],
    proofIcons: [LuCheckCircle2, LuEye, LuSearch, LuShieldCheck],
  },
  'featured-choices': {
    slug: 'featured-choices',
    key: 'featuredChoices',
    heroIcon: LuSparkles,
    storyIcons: [LuSparkles, LuActivity, LuBadgeCheck],
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
  'print-ready-kit': {
    slug: 'print-ready-kit',
    key: 'printReadyKit',
    heroIcon: LuPrinter,
    storyIcons: [LuPrinter, LuPackage, LuFileText],
    proofIcons: [LuQrCode, LuBadgeCheck, LuRefreshCw, LuShieldCheck],
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
