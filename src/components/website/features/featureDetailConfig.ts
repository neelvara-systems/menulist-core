import type { IconType } from 'react-icons';
import {
  LuActivity,
  LuAlertTriangle,
  LuBadgeCheck,
  LuBuilding2,
  LuCamera,
  LuCheckCircle2,
  LuClipboardCheck,
  LuClock3,
  LuCreditCard,
  LuEye,
  LuFileText,
  LuGlobe,
  LuImage,
  LuInbox,
  LuLanguages,
  LuLink,
  LuMapPin,
  LuMessageSquare,
  LuMonitor,
  LuPackage,
  LuPhoneCall,
  LuPointer,
  LuSparkles,
  LuPrinter,
  LuQrCode,
  LuRefreshCw,
  LuSearch,
  LuShieldCheck,
  LuSmartphone,
  LuTags,
  LuUploadCloud,
  LuWalletCards,
  LuWrench,
} from 'react-icons/lu';

export type FeatureDetailSlug =
  | 'menu-import'
  | 'menu-content-prep'
  | 'featured-choices'
  | 'official-business-page'
  | 'qr-menu-links'
  | 'print-ready-kit'
  | 'owner-phone-dashboard'
  | 'menu-quality-validation'
  | 'customer-feedback-loop'
  | 'public-discovery';

export type FeatureDetailConfig = {
  heroIcon: IconType;
  journeyCardIcons: [
    [IconType, IconType, IconType],
    [IconType, IconType, IconType],
    [IconType, IconType, IconType],
    [IconType, IconType, IconType],
  ];
  journeyIcons: [IconType, IconType, IconType, IconType];
  key: string;
  proofIcons: [IconType, IconType, IconType, IconType];
  slug: FeatureDetailSlug;
  stripIcons: [IconType, IconType, IconType, IconType, IconType];
  supportIcons: [[IconType, IconType, IconType], [IconType, IconType, IconType]];
};

export const featureDetailConfigs: Record<FeatureDetailSlug, FeatureDetailConfig> = {
  'menu-import': {
    slug: 'menu-import',
    key: 'menuImport',
    heroIcon: LuUploadCloud,
    stripIcons: [LuCamera, LuFileText, LuLink, LuLanguages, LuEye],
    journeyIcons: [LuUploadCloud, LuEye, LuWrench, LuCheckCircle2],
    journeyCardIcons: [
      [LuCamera, LuFileText, LuLink],
      [LuEye, LuShieldCheck, LuRefreshCw],
      [LuWrench, LuLanguages, LuImage],
      [LuCheckCircle2, LuBadgeCheck, LuShieldCheck],
    ],
    supportIcons: [[LuCamera, LuFileText, LuLink], [LuEye, LuCheckCircle2, LuShieldCheck]],
    proofIcons: [LuCheckCircle2, LuEye, LuRefreshCw, LuShieldCheck],
  },
  'menu-content-prep': {
    slug: 'menu-content-prep',
    key: 'menuContentPrep',
    heroIcon: LuFileText,
    stripIcons: [LuFileText, LuImage, LuLanguages, LuSearch, LuEye],
    journeyIcons: [LuFileText, LuWrench, LuRefreshCw, LuCheckCircle2],
    journeyCardIcons: [
      [LuFileText, LuImage, LuLanguages],
      [LuClock3, LuEye, LuSearch],
      [LuWrench, LuBadgeCheck, LuRefreshCw],
      [LuCheckCircle2, LuSearch, LuShieldCheck],
    ],
    supportIcons: [[LuFileText, LuImage, LuLanguages], [LuSearch, LuBadgeCheck, LuShieldCheck]],
    proofIcons: [LuCheckCircle2, LuEye, LuSearch, LuShieldCheck],
  },
  'featured-choices': {
    slug: 'featured-choices',
    key: 'featuredChoices',
    heroIcon: LuSparkles,
    stripIcons: [LuSparkles, LuActivity, LuBadgeCheck, LuEye, LuShieldCheck],
    journeyIcons: [LuSparkles, LuEye, LuWrench, LuBadgeCheck],
    journeyCardIcons: [
      [LuSparkles, LuActivity, LuBadgeCheck],
      [LuEye, LuClock3, LuPointer],
      [LuWrench, LuRefreshCw, LuShieldCheck],
      [LuBadgeCheck, LuEye, LuCheckCircle2],
    ],
    supportIcons: [[LuSparkles, LuActivity, LuEye], [LuBadgeCheck, LuShieldCheck, LuCheckCircle2]],
    proofIcons: [LuCheckCircle2, LuEye, LuRefreshCw, LuShieldCheck],
  },
  'official-business-page': {
    slug: 'official-business-page',
    key: 'officialBusinessPage',
    heroIcon: LuBuilding2,
    stripIcons: [LuBuilding2, LuMapPin, LuPhoneCall, LuCreditCard, LuGlobe],
    journeyIcons: [LuBuilding2, LuEye, LuWrench, LuBadgeCheck],
    journeyCardIcons: [
      [LuBuilding2, LuMapPin, LuPhoneCall],
      [LuEye, LuCreditCard, LuSearch],
      [LuWrench, LuGlobe, LuShieldCheck],
      [LuBadgeCheck, LuPhoneCall, LuCheckCircle2],
    ],
    supportIcons: [[LuBuilding2, LuMapPin, LuPhoneCall], [LuCreditCard, LuTags, LuGlobe]],
    proofIcons: [LuBadgeCheck, LuGlobe, LuSearch, LuShieldCheck],
  },
  'qr-menu-links': {
    slug: 'qr-menu-links',
    key: 'qrMenuLinks',
    heroIcon: LuQrCode,
    stripIcons: [LuQrCode, LuLink, LuSmartphone, LuPrinter, LuPackage],
    journeyIcons: [LuQrCode, LuEye, LuRefreshCw, LuCheckCircle2],
    journeyCardIcons: [
      [LuQrCode, LuLink, LuSmartphone],
      [LuEye, LuFileText, LuPackage],
      [LuRefreshCw, LuPrinter, LuShieldCheck],
      [LuCheckCircle2, LuPhoneCall, LuBadgeCheck],
    ],
    supportIcons: [[LuLink, LuSmartphone, LuPackage], [LuQrCode, LuPrinter, LuCheckCircle2]],
    proofIcons: [LuCheckCircle2, LuRefreshCw, LuSmartphone, LuShieldCheck],
  },
  'print-ready-kit': {
    slug: 'print-ready-kit',
    key: 'printReadyKit',
    heroIcon: LuPrinter,
    stripIcons: [LuPrinter, LuPackage, LuQrCode, LuFileText, LuBadgeCheck],
    journeyIcons: [LuPrinter, LuEye, LuWrench, LuPackage],
    journeyCardIcons: [
      [LuPrinter, LuPackage, LuQrCode],
      [LuEye, LuFileText, LuClock3],
      [LuWrench, LuBadgeCheck, LuRefreshCw],
      [LuPackage, LuCheckCircle2, LuShieldCheck],
    ],
    supportIcons: [[LuPrinter, LuPackage, LuQrCode], [LuBadgeCheck, LuFileText, LuShieldCheck]],
    proofIcons: [LuQrCode, LuBadgeCheck, LuRefreshCw, LuShieldCheck],
  },
  'owner-phone-dashboard': {
    slug: 'owner-phone-dashboard',
    key: 'ownerPhoneDashboard',
    heroIcon: LuSmartphone,
    stripIcons: [LuSmartphone, LuActivity, LuRefreshCw, LuClock3, LuShieldCheck],
    journeyIcons: [LuSmartphone, LuClock3, LuWrench, LuCheckCircle2],
    journeyCardIcons: [
      [LuSmartphone, LuActivity, LuRefreshCw],
      [LuClock3, LuEye, LuMonitor],
      [LuWrench, LuShieldCheck, LuBadgeCheck],
      [LuCheckCircle2, LuActivity, LuSmartphone],
    ],
    supportIcons: [[LuSmartphone, LuActivity, LuRefreshCw], [LuClock3, LuBadgeCheck, LuShieldCheck]],
    proofIcons: [LuCheckCircle2, LuEye, LuShieldCheck, LuBadgeCheck],
  },
  'menu-quality-validation': {
    slug: 'menu-quality-validation',
    key: 'menuQualityValidation',
    heroIcon: LuClipboardCheck,
    stripIcons: [LuClipboardCheck, LuWalletCards, LuFileText, LuImage, LuBadgeCheck],
    journeyIcons: [LuClipboardCheck, LuEye, LuWrench, LuCheckCircle2],
    journeyCardIcons: [
      [LuWalletCards, LuFileText, LuImage],
      [LuEye, LuAlertTriangle, LuShieldCheck],
      [LuWrench, LuRefreshCw, LuBadgeCheck],
      [LuCheckCircle2, LuShieldCheck, LuEye],
    ],
    supportIcons: [[LuWalletCards, LuFileText, LuBadgeCheck], [LuQrCode, LuMonitor, LuShieldCheck]],
    proofIcons: [LuShieldCheck, LuEye, LuCheckCircle2, LuBadgeCheck],
  },
  'customer-feedback-loop': {
    slug: 'customer-feedback-loop',
    key: 'customerFeedbackLoop',
    heroIcon: LuMessageSquare,
    stripIcons: [LuQrCode, LuMessageSquare, LuInbox, LuAlertTriangle, LuShieldCheck],
    journeyIcons: [LuQrCode, LuMessageSquare, LuInbox, LuRefreshCw],
    journeyCardIcons: [
      [LuQrCode, LuLink, LuBuilding2],
      [LuMessageSquare, LuAlertTriangle, LuBadgeCheck],
      [LuInbox, LuSmartphone, LuShieldCheck],
      [LuRefreshCw, LuCheckCircle2, LuShieldCheck],
    ],
    supportIcons: [[LuQrCode, LuLink, LuBuilding2], [LuShieldCheck, LuInbox, LuActivity]],
    proofIcons: [LuShieldCheck, LuAlertTriangle, LuActivity, LuCheckCircle2],
  },
  'public-discovery': {
    slug: 'public-discovery',
    key: 'publicDiscovery',
    heroIcon: LuSearch,
    stripIcons: [LuBuilding2, LuGlobe, LuSearch, LuFileText, LuShieldCheck],
    journeyIcons: [LuSearch, LuEye, LuWrench, LuShieldCheck],
    journeyCardIcons: [
      [LuBuilding2, LuGlobe, LuFileText],
      [LuEye, LuSearch, LuRefreshCw],
      [LuWrench, LuBadgeCheck, LuShieldCheck],
      [LuCheckCircle2, LuSearch, LuShieldCheck],
    ],
    supportIcons: [[LuBuilding2, LuGlobe, LuFileText], [LuShieldCheck, LuSearch, LuEye]],
    proofIcons: [LuFileText, LuBadgeCheck, LuShieldCheck, LuEye],
  },
};
