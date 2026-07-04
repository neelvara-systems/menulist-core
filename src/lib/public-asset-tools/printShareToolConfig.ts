import type { CreativeEditorStarterTemplateId } from '@/modules/creative-editor/templates';

export const PRINT_SHARE_TOOL_SLUGS = [
  'qr-poster-maker',
  'whatsapp-menu-status-maker',
  'holiday-hours-poster-maker',
  'customer-link-card-maker',
  'feedback-qr-card-maker',
] as const;

export type PrintShareToolSlug = (typeof PRINT_SHARE_TOOL_SLUGS)[number];

export type PrintShareToolInputField =
  | 'headline'
  | 'body'
  | 'secondaryText'
  | 'hoursText'
  | 'whatsappNumber';

export type PrintShareToolFactField =
  | 'customerLinkCurrent'
  | 'customerActionClear'
  | 'readyToPrintOrShare'
  | 'ethicalFeedbackOnly';

export type PrintShareToolLayout = 'poster' | 'story' | 'card';

export interface PrintShareToolConfig {
  defaultBody: string;
  defaultHeadline: string;
  defaultSecondaryText: string;
  description: string;
  eventPrefix: string;
  featureFlag: string;
  fields: PrintShareToolInputField[];
  facts: PrintShareToolFactField[];
  height: number;
  layout: PrintShareToolLayout;
  localeKey: string;
  primaryActionLabel: string;
  route: `/tools/${PrintShareToolSlug}`;
  slug: PrintShareToolSlug;
  templateId: CreativeEditorStarterTemplateId;
  title: string;
  width: number;
}

export const PRINT_SHARE_TOOL_CONFIGS: Record<PrintShareToolSlug, PrintShareToolConfig> = {
  'qr-poster-maker': {
    defaultBody: 'Scan for the current menu, services, prices, hours, and contact options.',
    defaultHeadline: 'Scan for our current list',
    defaultSecondaryText: 'Use this before printing a counter, table, or entrance poster.',
    description: 'Make a simple QR poster for one current customer link.',
    eventPrefix: 'qr_poster_maker',
    featureFlag: 'ENABLE_PUBLIC_ASSET_QR_POSTER_MAKER',
    fields: ['headline', 'body', 'secondaryText'],
    facts: ['customerLinkCurrent', 'customerActionClear', 'readyToPrintOrShare'],
    height: 1754,
    layout: 'poster',
    localeKey: 'qrPosterMaker',
    primaryActionLabel: 'Scan for current details',
    route: '/tools/qr-poster-maker',
    slug: 'qr-poster-maker',
    templateId: 'poster',
    title: 'QR Poster Maker',
    width: 1240,
  },
  'whatsapp-menu-status-maker': {
    defaultBody: 'Open the current customer link, then message us on WhatsApp if you need help.',
    defaultHeadline: 'Current menu and services',
    defaultSecondaryText: 'Post this to WhatsApp Status or Instagram Story.',
    description: 'Make a WhatsApp Status image that points customers to one current link.',
    eventPrefix: 'whatsapp_menu_status_maker',
    featureFlag: 'ENABLE_PUBLIC_ASSET_WHATSAPP_MENU_STATUS_MAKER',
    fields: ['headline', 'body', 'whatsappNumber'],
    facts: ['customerLinkCurrent', 'customerActionClear', 'readyToPrintOrShare'],
    height: 1920,
    layout: 'story',
    localeKey: 'whatsappMenuStatusMaker',
    primaryActionLabel: 'Scan for current details',
    route: '/tools/whatsapp-menu-status-maker',
    slug: 'whatsapp-menu-status-maker',
    templateId: 'story',
    title: 'WhatsApp Menu Status Maker',
    width: 1080,
  },
  'holiday-hours-poster-maker': {
    defaultBody: 'Please check the current customer link before you visit, order, or book.',
    defaultHeadline: 'Holiday hours',
    defaultSecondaryText: 'Use this when hours change for a festival, holiday, event, or short break.',
    description: 'Make a poster for regular or special hours with one current customer link.',
    eventPrefix: 'holiday_hours_poster_maker',
    featureFlag: 'ENABLE_PUBLIC_ASSET_HOLIDAY_HOURS_POSTER_MAKER',
    fields: ['headline', 'hoursText', 'body'],
    facts: ['customerLinkCurrent', 'customerActionClear', 'readyToPrintOrShare'],
    height: 1754,
    layout: 'poster',
    localeKey: 'holidayHoursPosterMaker',
    primaryActionLabel: 'Scan before visiting',
    route: '/tools/holiday-hours-poster-maker',
    slug: 'holiday-hours-poster-maker',
    templateId: 'poster',
    title: 'Holiday Hours Poster Maker',
    width: 1240,
  },
  'customer-link-card-maker': {
    defaultBody: 'Keep this card at the counter, in takeaway bags, or with staff replies.',
    defaultHeadline: 'One current customer link',
    defaultSecondaryText: 'Good for counters, reception desks, service cards, and package inserts.',
    description: 'Make a small counter card or business-card style asset for a customer link.',
    eventPrefix: 'customer_link_card_maker',
    featureFlag: 'ENABLE_PUBLIC_ASSET_CUSTOMER_LINK_CARD_MAKER',
    fields: ['headline', 'body', 'secondaryText'],
    facts: ['customerLinkCurrent', 'customerActionClear', 'readyToPrintOrShare'],
    height: 720,
    layout: 'card',
    localeKey: 'customerLinkCardMaker',
    primaryActionLabel: 'Scan or save this link',
    route: '/tools/customer-link-card-maker',
    slug: 'customer-link-card-maker',
    templateId: 'wide-banner',
    title: 'Customer Link Card Maker',
    width: 1280,
  },
  'feedback-qr-card-maker': {
    defaultBody: 'Tell us what went wrong, what was missing, or what we should fix.',
    defaultHeadline: 'Share feedback',
    defaultSecondaryText: 'Use for feedback links only. Do not use this to ask for fake or pressured reviews.',
    description: 'Make an ethical feedback QR card for an owner-provided feedback or review link.',
    eventPrefix: 'feedback_qr_card_maker',
    featureFlag: 'ENABLE_PUBLIC_ASSET_FEEDBACK_QR_CARD_MAKER',
    fields: ['headline', 'body', 'secondaryText'],
    facts: ['customerLinkCurrent', 'customerActionClear', 'readyToPrintOrShare', 'ethicalFeedbackOnly'],
    height: 1754,
    layout: 'poster',
    localeKey: 'feedbackQrCardMaker',
    primaryActionLabel: 'Scan to share feedback',
    route: '/tools/feedback-qr-card-maker',
    slug: 'feedback-qr-card-maker',
    templateId: 'poster',
    title: 'Feedback QR Card Maker',
    width: 1240,
  },
};

export function getPrintShareToolConfig(slug: PrintShareToolSlug): PrintShareToolConfig {
  return PRINT_SHARE_TOOL_CONFIGS[slug];
}

export function isPrintShareToolSlug(value: string): value is PrintShareToolSlug {
  return PRINT_SHARE_TOOL_SLUGS.includes(value as PrintShareToolSlug);
}
