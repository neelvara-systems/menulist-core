export interface AnalyticsTrackingCategoryDisclosure {
  description: string;
  details: string[];
  key: string;
  note?: string;
  title: string;
}

export const ANALYTICS_SETTINGS_GROUPING_NOTE =
  'These switches control tracking categories, not individual events. Expand a category to see exactly what is included before you turn it on or off.';

export const EXTERNAL_ANALYTICS_INTEGRATION_NOTE =
  'Google Analytics and Meta Pixel are owner-provided external scripts. MenuList loads them only when you add the ID here. They may read the public page URL and intentional utm_source, utm_medium, utm_campaign, and utm_content parameters on campaign links. MenuList internal source reporting uses entry_source instead, and normal MenuList share links do not need a separate UTM toggle. Remove the ID to stop loading that external script.';

export const ANALYTICS_TRACKING_CATEGORY_DISCLOSURES: AnalyticsTrackingCategoryDisclosure[] = [
  {
    key: 'menu-activity',
    title: 'Menu activity',
    description:
      'Tracks customer activity inside the public menu and keeps those signals together under one switch.',
    details: [
      'Menu opens',
      'Item detail opens',
      'Anonymous session milestones for engaged, intent, and final-action sessions',
      'Category interest from item views and taps',
      'Menu language usage, including languages opened and switched languages that stayed active long enough to count',
      'De-duplicated search queries',
      'No-result searches',
      'Unavailable-item taps',
      'Final menu CTA clicks such as call, WhatsApp, directions, reserve, and order',
      'Entry source and action-rate-by-source reporting',
      'Session totals',
    ],
    note:
      'These signals stay grouped because they all describe customer activity inside the menu and are used together in reporting.',
  },
  {
    key: 'recommendation-analytics',
    title: 'Recommendation analytics',
    description: 'Tracks how recommendation and decision blocks perform when they appear on the customer menu.',
    details: [
      'Recommendation block impressions',
      'Recommendation block taps',
    ],
  },
  {
    key: 'official-business-page-activity',
    title: 'Official business page activity',
    description: 'Tracks traffic, customer actions, and owner sharing around the official business page.',
    details: [
      'Official business page views',
      'CTA taps such as call, WhatsApp, directions, reserve, and order',
      'View Menu clicks',
      'Google review, Instagram, Facebook, and website link taps',
      'Official business page language usage when the page has multiple public languages',
      'Owner share actions from the official business link card such as WhatsApp, copy link, and copy message',
    ],
  },
  {
    key: 'customer-app-activity',
    title: 'Customer app activity',
    description: 'Tracks installation and launch activity for the customer app experience.',
    details: [
      'Install prompt views',
      'Install events',
      'Standalone app opens',
      'Shortcut launches',
    ],
  },
  {
    key: 'approximate-location',
    title: 'Approximate location',
    description: 'Adds coarse location context to reports when region signals are available.',
    details: [
      'Rounded geolocation when available',
      'Timezone region fallback when geolocation is unavailable',
    ],
    note: 'This does not collect exact GPS coordinates in this analytics flow.',
  },
];
